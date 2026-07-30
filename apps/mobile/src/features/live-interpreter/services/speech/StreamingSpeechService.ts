import {
  ExpoSpeechRecognitionModule,
  RecognizerIntentExtraLanguageModel,
} from "expo-speech-recognition";
import { Platform } from "react-native";

import {
  type SpeechErrorListener,
  type SpeechLanguage,
  type SpeechRecognitionError,
  type SpeechResultListener,
  type SpeechServiceInterface,
  type SpeechSubscription,
} from "./SpeechTypes";

/**
 * Streaming recognition locked to the language selected by the user.
 *
 * The platform recognizer provides partial text immediately. QuickVoice uses
 * the selected source locale for the whole turn, ends the sentence after a
 * short silence, and sends only that completed sentence to translation.
 * There is no second transcription upload or language auto-detection pass.
 */

// Silence that ends a sentence. Shorter than the recognizer's own endpointing
// so turn-taking stays snappy; Japanese clause pauses run ~300-400ms.
const SENTENCE_END_SILENCE_MS = 700;
// A sentence must have at least this much before silence can end it, so a
// cough or a single syllable does not close the turn.
const MIN_SENTENCE_MS = 400;
// Nothing spoken at all — give up and let the caller open a fresh window.
const NO_SPEECH_TIMEOUT_MS = 6_000;
// Hard ceiling on one sentence.
const MAX_SENTENCE_MS = 15_000;

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

class StreamingSpeechService implements SpeechServiceInterface {
  private turnId = 0;
  private listening = false;
  private startedAt = 0;
  private lastSpeechAt = 0;
  private latestPartial = "";
  private expectedLanguage: "en" | "ja" | undefined;
  private silenceTimer: ReturnType<typeof setInterval> | null = null;
  private subscriptions: Array<{ remove: () => void }> = [];
  /** Set once a turn is closing, so it cannot be submitted twice. */
  private settled = false;
  private completedTurnId = 0;

  async startListening(
    _language: SpeechLanguage,
    expectedLanguage?: "en" | "ja",
  ): Promise<void> {
    await this.stopListening();

    const turnId = ++this.turnId;
    this.expectedLanguage = expectedLanguage;
    this.latestPartial = "";
    this.settled = false;
    this.completedTurnId = 0;
    this.startedAt = Date.now();
    this.lastSpeechAt = 0;

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Microphone permission is required for live interpretation.");
    }

    this.attachListeners(turnId);

    ExpoSpeechRecognitionModule.start({
      // Recognition is deliberately pinned to the selected source language.
      // Auto-detection made Japanese speech pass through the English model.
      lang: this.expectedLanguage === "ja" ? "ja-JP" : "en-US",
      interimResults: true,
      maxAlternatives: 1,
      // Keep the stream open — sentence boundaries are decided here, from
      // silence, rather than by the recognizer closing the session.
      continuous: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
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
      const changed = transcript !== this.latestPartial;
      this.latestPartial = transcript;

      if (changed) {
        // Straight to the screen. No translation or storage while text is
        // changing; this is the live preview.
        partialListeners.forEach((listener) =>
          listener({ transcript, language: this.expectedLanguage }),
        );
      }
      if (event.isFinal) this.finishSentence(turnId);
    });

    add("end", () => this.finishSentence(turnId));

    add("error", (event: { error?: string; message?: string }) => {
      if (turnId !== this.turnId) return;
      if (event.error === "aborted") return;
      // An empty window is normal mid-conversation; let the caller reopen.
      if (event.error === "no-speech" || event.error === "speech-timeout") {
        void this.abandon(turnId);
        return;
      }
      this.teardown();
      emitError({
        code: event.error ?? "recognition_failed",
        message: event.message || "Speech recognition failed.",
      });
    });
  }

  /** Silence-based sentence boundary — requirement (3). */
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
      // Stopping promotes the latest partial/final native transcript.
      this.settled = true;
      this.clearTimer();
      ExpoSpeechRecognitionModule.stop();
      // Some recognizers do not emit `end` after an explicit stop.
      setTimeout(() => this.finishSentence(turnId), 120);
    }
  }

  /** Publish one completed sentence; only this result is translated. */
  private finishSentence(turnId: number): void {
    if (turnId !== this.turnId || this.completedTurnId === turnId) return;
    this.completedTurnId = turnId;
    this.clearTimer();
    this.listening = false;
    const transcript = this.latestPartial.trim();
    this.teardown();
    if (!transcript) {
      emitError({ code: "no_speech", message: "" });
      return;
    }
    finalListeners.forEach((listener) =>
      listener({ transcript, language: this.expectedLanguage }),
    );
  }

  private async abandon(turnId: number): Promise<void> {
    if (turnId !== this.turnId || this.settled) return;
    this.settled = true;
    this.teardown();
    emitError({ code: "no_speech", message: "" });
  }

  async stopListening(): Promise<void> {
    if (!this.listening && !this.silenceTimer) {
      this.teardown();
      return;
    }
    // A sentence already in flight finishes on its own; otherwise close up.
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

export const SpeechService: SpeechServiceInterface = new StreamingSpeechService();
export default SpeechService;
