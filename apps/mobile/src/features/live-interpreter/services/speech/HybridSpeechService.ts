import {
  AVAudioSessionCategory,
  AVAudioSessionCategoryOptions,
  AVAudioSessionMode,
  ExpoSpeechRecognitionModule,
  RecognizerIntentExtraLanguageModel,
} from "expo-speech-recognition";
import { Platform } from "react-native";

import { transcribeAudioResult } from "../../../../services/api";
import WhisperSpeechService from "./WhisperSpeechService";
import {
  type SpeechErrorListener,
  type SpeechLanguage,
  type SpeechRecognitionError,
  type SpeechResultListener,
  type SpeechServiceInterface,
  type SpeechSubscription,
} from "./SpeechTypes";

/**
 * Instant preview from the platform recognizer, authoritative text from Whisper.
 *
 * Neither engine alone does what this screen needs. Whisper is batch: nothing
 * appears until the speaker stops, so a short reply sat invisible for about
 * half a second. The platform recognizer streams words as they are spoken, but
 * has to be pinned to one locale and cannot tell which language was used — the
 * failure that made Japanese come back as "Konnichiwa" and translate to
 * nonsense.
 *
 * Running both off a *single* microphone session gets both properties.
 * `recordingOptions.persist` makes the recognizer write the same audio it is
 * streaming to a WAV file, so there is no second capture, no contention over
 * the microphone, and no extra battery cost. Words appear while talking; when
 * the sentence ends, that WAV goes to Whisper and the confirmed text — with the
 * language it actually detected — replaces the preview.
 *
 * WAV is also what the server prefers: it skips the ~100ms m4a decode that the
 * recorder-based path pays on every turn.
 */

// Silence that ends a sentence, matched to the streaming service so turn-taking
// feels the same. Japanese clause pauses run ~300-400ms, so this sits above them.
const SENTENCE_END_SILENCE_MS = 700;
// A sentence needs at least this much speech before silence can close it, so a
// cough or single syllable does not end the turn.
const MIN_SENTENCE_MS = 400;
// Nothing spoken at all — give up and let the caller open a fresh window.
const NO_SPEECH_TIMEOUT_MS = 6_000;
// Hard ceiling on one sentence.
const MAX_SENTENCE_MS = 15_000;
// The recognizer reports audioend slightly after stop(); if it never arrives,
// fall back to whatever the platform already transcribed rather than hanging.
const AUDIO_END_GRACE_MS = 1_200;
const AUDIO_ENGINE_RESET_MS = 180;

const partialListeners = new Set<SpeechResultListener>();
const finalListeners = new Set<SpeechResultListener>();
const errorListeners = new Set<SpeechErrorListener>();

function createSubscription<T>(listeners: Set<T>, listener: T): SpeechSubscription {
  listeners.add(listener);
  return { remove: () => listeners.delete(listener) };
}

function emitError(error: SpeechRecognitionError): void {
  errorListeners.forEach((listener) => listener(error));
}

class HybridSpeechService implements SpeechServiceInterface {
  private turnId = 0;
  private listening = false;
  private startedAt = 0;
  private lastSpeechAt = 0;
  private latestPartial = "";
  private expectedLanguage: "en" | "ja" | undefined;
  /** Locale for the live preview only; never used as a decoder prior. */
  private previewLanguage: "en" | "ja" | undefined;
  private silenceTimer: ReturnType<typeof setInterval> | null = null;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: Array<{ remove: () => void }> = [];
  /** Set once a turn is closing, so it cannot be submitted twice. */
  private settled = false;
  private completedTurnId = 0;
  /** WAV written by the recognizer; handed to Whisper once audio ends. */
  private audioUri: string | null = null;
  /**
   * Set when the platform recognizer cannot run — the Mac build and Android 10
   * both lack it. Everything is then handed to the recorder-based Whisper
   * service, which needs no recognizer: the turn loses its live preview but
   * still transcribes and translates. Without this the turn simply hung at
   * "Listening…", because no recognizer means no preview *and* no audio file.
   */
  private usingFallback = false;
  private fallbackBridged = false;

  /** Re-publish the fallback service's events through this service's own
   *  listeners, so callers never need to know which engine answered. */
  private bridgeFallback(): void {
    if (this.fallbackBridged) return;
    this.fallbackBridged = true;
    WhisperSpeechService.onPartialResult((result) =>
      partialListeners.forEach((listener) => listener(result)),
    );
    WhisperSpeechService.onFinalResult((result) =>
      finalListeners.forEach((listener) => listener(result)),
    );
    WhisperSpeechService.onError((error) =>
      errorListeners.forEach((listener) => listener(error)),
    );
  }

  async startListening(
    _language: SpeechLanguage,
    expectedLanguage?: "en" | "ja",
    previewLanguage?: "en" | "ja",
  ): Promise<void> {
    await this.stopListening();

    const turnId = ++this.turnId;
    this.expectedLanguage = expectedLanguage;
    this.previewLanguage = previewLanguage;
    this.latestPartial = "";
    this.settled = false;
    this.completedTurnId = 0;
    this.audioUri = null;
    this.startedAt = Date.now();
    this.lastSpeechAt = 0;

    // No platform recognizer means no preview *and* no persisted audio, so the
    // turn would wait forever. Detect that here and hand the whole turn to the
    // recorder-based service instead.
    let recognizerUsable = false;
    try {
      recognizerUsable = ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      recognizerUsable = false;
    }

    if (recognizerUsable) {
      try {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        recognizerUsable = permission.granted;
      } catch {
        recognizerUsable = false;
      }
    }

    if (!recognizerUsable) {
      this.usingFallback = true;
      this.bridgeFallback();
      await WhisperSpeechService.startListening(_language, expectedLanguage);
      return;
    }
    this.usingFallback = false;

    // A previous recognition window may still be winding down when continuous
    // mode opens the next one. Starting a second AVAudioEngine during that
    // transition produces iOS' "audio route changed / restart audio engine"
    // failure. Wait for the native recognizer to become inactive and
    // re-assert the recording route before installing the next tap.
    await this.prepareAudioEngine();
    if (turnId !== this.turnId) return;

    this.attachListeners(turnId);

    ExpoSpeechRecognitionModule.start({
      // The locale here only shapes the *preview*. Whisper still decides the
      // real language from the audio, so picking wrong costs a rougher preview
      // rather than a wrong translation. It reads previewLanguage, not
      // expectedLanguage: automatic EN/JA mode sends no decoder prior, which
      // used to leave this pinned to en-US and render every Japanese turn as
      // romaji while the speaker was still talking.
      lang: (this.previewLanguage ?? this.expectedLanguage) === "ja" ? "ja-JP" : "en-US",
      interimResults: true,
      maxAlternatives: 1,
      // Keep the stream open — the sentence boundary is decided here, from
      // silence, not by the recognizer closing the session.
      continuous: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
      // The whole point: keep the audio the recognizer is already capturing.
      recordingOptions: { persist: true },
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: RecognizerIntentExtraLanguageModel.LANGUAGE_MODEL_FREE_FORM,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 4_000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 4_000,
      },
      iosTaskHint: "dictation",
    });

    this.listening = true;
    this.silenceTimer = setInterval(() => this.checkSentenceEnd(turnId), 100);
  }

  private attachListeners(turnId: number): void {
    const add = <T extends Parameters<typeof ExpoSpeechRecognitionModule.addListener>[0]>(
      event: T,
      handler: Parameters<typeof ExpoSpeechRecognitionModule.addListener>[1],
    ) => {
      this.subscriptions.push(ExpoSpeechRecognitionModule.addListener(event, handler as never));
    };

    add("result", (event: { isFinal?: boolean; results?: Array<{ transcript?: string }> }) => {
      if (turnId !== this.turnId) return;
      const transcript = event.results?.[0]?.transcript?.trim() ?? "";
      if (!transcript) return;

      this.lastSpeechAt = Date.now();
      if (transcript !== this.latestPartial) {
        this.latestPartial = transcript;
        // Straight to the screen while the words are still being spoken. This
        // is a preview only: nothing is translated or stored from it.
        partialListeners.forEach((listener) =>
          listener({ transcript, language: this.previewLanguage ?? this.expectedLanguage }),
        );
      }
    });

    // Where the persisted WAV becomes available. Whisper runs from here, so the
    // confirmed text and the real language land as the final result.
    add("audioend", (event: { uri?: string | null }) => {
      if (turnId !== this.turnId) return;
      this.audioUri = event?.uri ?? null;
      void this.finishSentence(turnId);
    });

    add("end", () => {
      if (turnId !== this.turnId) return;
      // Only settle here if audioend never came; otherwise it already ran.
      if (this.settled && this.audioUri === null) void this.finishSentence(turnId);
    });

    add("error", (event: { error?: string; message?: string }) => {
      if (turnId !== this.turnId) return;
      if (event.error === "aborted") return;
      if (event.error === "no-speech" || event.error === "speech-timeout") {
        void this.abandon(turnId);
        return;
      }
      const routeFailure =
        event.error === "audio-capture" ||
        event.error === "interrupted" ||
        event.error === "busy" ||
        /audio\s*(route|engine|input)|route\s*change/i.test(event.message ?? "");

      this.teardown();
      if (routeFailure) {
        // Tell the conversation controller to keep the session alive only
        // after the native audio session has been reset. Its normal retry path
        // will then open a fresh recognition window.
        void this.resetAudioEngine().finally(() => {
          if (turnId !== this.turnId) return;
          emitError({
            code: "recoverable_interruption",
            message: "",
          });
        });
        return;
      }
      emitError({
        code: event.error ?? "recognition_failed",
        message: event.message || "Speech recognition failed.",
      });
    });
  }

  private async prepareAudioEngine(): Promise<void> {
    try {
      const state = await ExpoSpeechRecognitionModule.getStateAsync();
      if (state !== "inactive") {
        ExpoSpeechRecognitionModule.abort();
        await new Promise((resolve) => setTimeout(resolve, AUDIO_ENGINE_RESET_MS));
      }
    } catch {
      // The native recognizer may already have disposed its request.
    }

    if (Platform.OS !== "ios") return;
    ExpoSpeechRecognitionModule.setCategoryIOS({
      category: AVAudioSessionCategory.playAndRecord,
      categoryOptions: [
        AVAudioSessionCategoryOptions.defaultToSpeaker,
        AVAudioSessionCategoryOptions.allowBluetooth,
      ],
      mode: AVAudioSessionMode.measurement,
    });
    ExpoSpeechRecognitionModule.setAudioSessionActiveIOS(true, {
      notifyOthersOnDeactivation: true,
    });
  }

  private async resetAudioEngine(): Promise<void> {
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // The failed engine may already be stopped.
    }

    if (Platform.OS === "ios") {
      try {
        ExpoSpeechRecognitionModule.setAudioSessionActiveIOS(false, {
          notifyOthersOnDeactivation: true,
        });
      } catch {
        // A route failure can leave the session inactive already.
      }
    }

    await new Promise((resolve) => setTimeout(resolve, AUDIO_ENGINE_RESET_MS));
    await this.prepareAudioEngine();
  }

  /** Silence-based sentence boundary. */
  private checkSentenceEnd(turnId: number): void {
    if (turnId !== this.turnId || this.settled) return;

    const now = Date.now();
    const elapsed = now - this.startedAt;

    if (!this.lastSpeechAt) {
      if (elapsed >= NO_SPEECH_TIMEOUT_MS) void this.abandon(turnId);
      return;
    }

    const spoken = this.lastSpeechAt - this.startedAt;
    const silent = now - this.lastSpeechAt;
    if ((spoken >= MIN_SENTENCE_MS && silent >= SENTENCE_END_SILENCE_MS) || elapsed >= MAX_SENTENCE_MS) {
      this.settled = true;
      this.clearTimer();
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // Already stopped.
      }
      // If the recognizer never reports audioend, publish what it already has
      // rather than leaving the turn hanging.
      this.graceTimer = setTimeout(() => void this.finishSentence(turnId), AUDIO_END_GRACE_MS);
    }
  }

  /**
   * Publish the confirmed sentence. Whisper is asked first, because it is the
   * only source that knows which language was actually spoken; the platform
   * transcript stands in when Whisper has nothing to add.
   */
  private async finishSentence(turnId: number): Promise<void> {
    if (turnId !== this.turnId || this.completedTurnId === turnId) return;
    this.completedTurnId = turnId;
    this.clearTimer();
    this.listening = false;

    const preview = this.latestPartial.trim();
    const uri = this.audioUri;
    this.teardown();

    if (uri) {
      try {
        const result = await transcribeAudioResult(uri, "en-ja", this.expectedLanguage);
        if (turnId !== this.turnId) return;
        const confirmed = result.text.trim();
        if (confirmed) {
          finalListeners.forEach((listener) =>
            listener({
              transcript: confirmed,
              // Whisper heard the audio; the locale the recognizer was pinned
              // to is only ever a guess.
              language: result.language === "unknown" ? undefined : result.language,
            }),
          );
          return;
        }
      } catch {
        // Server unreachable, the request timed out, or the clip was
        // rejected — in every case, Whisper never confirmed what was said.
        // This used to fall through to the preview below, on the reasoning
        // that a rough guess beats losing the turn to a network blip. In
        // practice that preview is pinned to a single locale (see
        // startListening), so promoting it is exactly how spoken Japanese
        // surfaced as the English text "Konnichiwa" and stayed there,
        // permanently confirmed, once transcribeAudioResult's timeout made
        // "the request took too long" indistinguishable from "unreachable".
        // A turn Whisper could not confirm is a turn we do not have.
      }

      // Whisper never confirmed this turn — timed out, errored, or heard
      // nothing. Say so instead of guessing from a single-locale preview.
      if (turnId !== this.turnId) return;
      emitError({ code: "no_speech", message: "" });
      return;
    }

    if (turnId !== this.turnId) return;
    if (!preview) {
      emitError({ code: "no_speech", message: "" });
      return;
    }
    finalListeners.forEach((listener) =>
      listener({ transcript: preview, language: this.expectedLanguage }),
    );
  }

  private async abandon(turnId: number): Promise<void> {
    if (turnId !== this.turnId || this.settled) return;
    this.settled = true;
    this.teardown();
    emitError({ code: "no_speech", message: "" });
  }

  async stopListening(): Promise<void> {
    if (this.usingFallback) {
      await WhisperSpeechService.stopListening();
      return;
    }
    if (!this.listening && !this.silenceTimer) {
      this.teardown();
      return;
    }
    if (!this.settled) {
      this.settled = true;
      this.clearTimer();
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // Already stopped.
      }
    }
  }

  private clearTimer(): void {
    if (this.silenceTimer) {
      clearInterval(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
  }

  private teardown(): void {
    this.clearTimer();
    this.listening = false;
    this.subscriptions.forEach((subscription) => {
      try {
        subscription.remove();
      } catch {
        // Listener already detached.
      }
    });
    this.subscriptions = [];
  }

  onPartialResult(listener: SpeechResultListener): SpeechSubscription {
    return createSubscription(partialListeners, listener);
  }

  onFinalResult(listener: SpeechResultListener): SpeechSubscription {
    return createSubscription(finalListeners, listener);
  }

  onError(listener: SpeechErrorListener): SpeechSubscription {
    return createSubscription(errorListeners, listener);
  }
}

export const SpeechService: SpeechServiceInterface = new HybridSpeechService();
export default SpeechService;
