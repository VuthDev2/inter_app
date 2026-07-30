import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  type AudioRecorder,
} from "expo-audio";

import { transcribeAudioResult } from "../../../../services/api";
import {
  type SpeechErrorListener,
  type SpeechLanguage,
  type SpeechRecognitionError,
  type SpeechResultListener,
  type SpeechServiceInterface,
  type SpeechSubscription,
} from "./SpeechTypes";

/**
 * Server-side speech recognition.
 *
 * The on-device recognizer has to be locked to a single locale, and this
 * project's target devices (Android 10) cannot detect the spoken language —
 * so every turn was a coin flip between en-US and ja-JP, and a recognizer on
 * the wrong locale returns confident nonsense rather than an error. Whisper
 * decides the language from the audio itself, which removes the guess.
 *
 * The trade is that Whisper is batch, not streaming: nothing is transcribed
 * until the speaker stops, so there is no word-by-word preview. End of turn is
 * therefore detected here, from the recorder's own audio level.
 */

// Voice activity is judged against a *calibrated* noise floor, never a fixed
// dB value, because the two platforms do not report the same quantity:
//
//   Android — 20·log10(MediaRecorder.getMaxAmplitude() / 32767), a PEAK
//   iOS     — AVAudioRecorder.averagePower(forChannel:), an AVERAGE
//
// Peak runs 10-20 dB hotter than average for the same voice, so any single
// threshold that works on one platform misfires on the other: too eager on
// Android (room noise reads as speech), too deaf on iOS (speech never trips
// it). Judging speech as a *rise above the room* rather than an absolute
// level sidesteps the difference, and adapts to a quiet room versus a noisy
// street at the same time.
// How far above the room a level must rise to count as speech onset, and the
// lower bar for *staying* in speech. The gap is hysteresis: without it, the
// natural dips between syllables end the turn mid-sentence.
const SPEECH_MARGIN_DB = 9;
const RELEASE_MARGIN_DB = 5;
// Speech must hold above the gate for this many consecutive polls. A single
// loud frame is a door slam, not a word.
const SPEECH_CONFIRM_FRAMES = 3;
// The floor chases the room: quickly downward when it gets quieter, slowly
// upward as noise persists. A running minimum (the previous approach) pinned
// the floor to the quietest instant ever heard, so steady room noise sat
// permanently above the gate, "speech" never ended, and turns ran to the hard
// cap — 20 seconds of noise, which is precisely what Whisper hallucinates on.
const FLOOR_FALL_RATE = 0.25;
const FLOOR_RISE_RATE = 0.02;
// A much lower bar, used only to decide whether a turn the gate *rejected* is
// still worth sending to Whisper.
const WORTH_SENDING_MARGIN_DB = 4;
// Guard rails. The ceiling matters most on iOS, where averaged speech sits
// near -25dB and anything higher would never register as talking.
const MIN_THRESHOLD_DB = -55;
const MAX_THRESHOLD_DB = -28;
// Clips shorter than this are not worth a round trip; Whisper needs a moment
// of audio to work with.
const MIN_TURN_MS = 600;
const POLL_INTERVAL_MS = 100;
// Silence after speech that ends the turn. This is dead time on every single
// turn — nothing is computed during it — so it is the cheapest latency to buy
// back. The floor is set by how long a speaker pauses mid-sentence; Japanese
// clause breaks run ~300-400ms, so 600ms leaves headroom without feeling slow.
const TRAILING_SILENCE_MS = 600;
// Give up (and report an empty turn) if nobody starts speaking.
const NO_SPEECH_TIMEOUT_MS = 6_000;
// Hard ceiling so a noisy room cannot record forever.
const MAX_UTTERANCE_MS = 12_000;
// Used only when the device reports no metering at all, so voice activity
// cannot be measured and the turn has to be ended on a timer.
const FALLBACK_UTTERANCE_MS = 6_000;

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

class WhisperSpeechService implements SpeechServiceInterface {
  private recorder: AudioRecorder | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  /** Bumped on every start/stop so a late upload from an abandoned turn is dropped. */
  private turnId = 0;
  private heardSpeech = false;
  private lastLoudAt = 0;
  private noiseFloorDb: number | null = null;
  private peakDb = Number.NEGATIVE_INFINITY;
  private aboveGateFrames = 0;
  private startedAt = 0;
  private finishing = false;
  /** The locale hint sent to Whisper; "en-ja" lets it choose. */
  private languageHint: SpeechLanguage = "en-ja";
  /** Tiebreaker for acoustically ambiguous turns; see transcribeAudioResult. */
  private expectedLanguage: "en" | "ja" | undefined;

  async startListening(
    language: SpeechLanguage,
    expectedLanguage?: "en" | "ja",
  ): Promise<void> {
    await this.stopListening();

    const turnId = ++this.turnId;
    this.languageHint = language;
    this.expectedLanguage = expectedLanguage;
    this.heardSpeech = false;
    this.finishing = false;
    this.noiseFloorDb = null;
    this.peakDb = Number.NEGATIVE_INFINITY;
    this.aboveGateFrames = 0;
    this.startedAt = Date.now();
    this.lastLoudAt = 0;

    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Microphone permission is required for live interpretation.");
    }

    // allowsRecording must be re-asserted every turn: playing the previous
    // translation switches the session to a playback-shaped mode.
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

    const recorder = new AudioModule.AudioRecorder({
      ...RecordingPresets.HIGH_QUALITY,
      // Whisper resamples to 16 kHz mono regardless, so recording there
      // directly cuts upload size and removes one more difference between
      // what the two platforms send.
      sampleRate: 16_000,
      numberOfChannels: 1,
      isMeteringEnabled: true,
    });
    await recorder.prepareToRecordAsync();
    if (turnId !== this.turnId) {
      recorder.release();
      return;
    }

    this.recorder = recorder;
    recorder.record();
    this.pollTimer = setInterval(() => this.pollLevel(turnId), POLL_INTERVAL_MS);
  }

  /** Voice activity detection: watch the level, end the turn on trailing silence. */
  private pollLevel(turnId: number): void {
    if (turnId !== this.turnId || !this.recorder || this.finishing) return;

    const status = this.recorder.getStatus();
    const now = Date.now();
    const level = status.metering;
    const elapsed = now - this.startedAt;

    if (typeof level !== "number" || !Number.isFinite(level)) {
      // No metering on this device — fall back to a fixed window so the turn
      // still ends instead of running to the hard cap.
      if (elapsed >= FALLBACK_UTTERANCE_MS) void this.finishTurn(turnId);
      return;
    }

    this.peakDb = Math.max(this.peakDb, level);

    // Track the room only while nobody is talking. Freezing the floor during
    // speech stops a long utterance from slowly raising the bar and cutting
    // itself off. There is deliberately no calibration window: a short word
    // like 「はい」 can be over before one would even end.
    if (this.noiseFloorDb === null) {
      this.noiseFloorDb = level;
    } else if (!this.heardSpeech) {
      const rate = level < this.noiseFloorDb ? FLOOR_FALL_RATE : FLOOR_RISE_RATE;
      this.noiseFloorDb += rate * (level - this.noiseFloorDb);
    }

    const gate = (margin: number) => Math.min(
      MAX_THRESHOLD_DB,
      Math.max(MIN_THRESHOLD_DB, (this.noiseFloorDb ?? MIN_THRESHOLD_DB) + margin),
    );

    if (!this.heardSpeech) {
      if (level > gate(SPEECH_MARGIN_DB)) {
        this.aboveGateFrames += 1;
        if (this.aboveGateFrames >= SPEECH_CONFIRM_FRAMES) {
          if (__DEV__) {
            console.log(
              `[QuickVoice VAD] speech at ${level.toFixed(1)}dB ` +
                `(floor ${(this.noiseFloorDb ?? 0).toFixed(1)}, gate ${gate(SPEECH_MARGIN_DB).toFixed(1)}) after ${elapsed}ms`,
            );
          }
          this.heardSpeech = true;
          this.lastLoudAt = now;
        }
      } else {
        this.aboveGateFrames = 0;
      }
    } else if (level > gate(RELEASE_MARGIN_DB)) {
      this.lastLoudAt = now;
    }

    if (this.heardSpeech) {
      if (this.lastLoudAt && now - this.lastLoudAt >= TRAILING_SILENCE_MS) {
        void this.finishTurn(turnId);
        return;
      }
      if (elapsed >= MAX_UTTERANCE_MS) {
        void this.finishTurn(turnId);
      }
      return;
    }

    if (elapsed >= NO_SPEECH_TIMEOUT_MS) {
      // Detecting no speech is not the same as there being none — the gate can
      // miss a quiet or very short utterance. Whisper returns empty text for
      // real silence, so anything with a plausible rise above the floor gets
      // sent rather than discarded. Missing a word is far worse than spending
      // one wasted request on a quiet room.
      if (elapsed >= MIN_TURN_MS && this.peakDb > this.noiseFloorDb + WORTH_SENDING_MARGIN_DB) {
        void this.finishTurn(turnId);
      } else {
        void this.abandonTurn(turnId);
      }
    }
  }

  /** Stop, upload, and publish the transcript. */
  private async finishTurn(turnId: number): Promise<void> {
    if (turnId !== this.turnId || this.finishing) return;
    this.finishing = true;
    this.clearPolling();

    const recorder = this.recorder;
    if (!recorder) return;

    let uri: string | null = null;
    try {
      await recorder.stop();
      uri = recorder.uri;
    } catch {
      // Fall through to the empty-turn path below.
    } finally {
      recorder.release();
      if (turnId === this.turnId) this.recorder = null;
    }

    if (!uri) {
      if (turnId === this.turnId) emitError({ code: "no_speech", message: "" });
      return;
    }

    try {
      const result = await transcribeAudioResult(uri, this.languageHint, this.expectedLanguage);
      if (turnId !== this.turnId) return;

      const transcript = result.text.trim();
      if (!transcript) {
        emitError({ code: "no_speech", message: "" });
        return;
      }

      finalListeners.forEach((listener) =>
        listener({
          transcript,
          // Whisper decided this from the audio, so it is authoritative —
          // unlike the locale the recorder happened to be hinted with.
          language: result.language === "unknown" ? undefined : result.language,
        }),
      );
    } catch (reason: unknown) {
      if (turnId !== this.turnId) return;
      emitError({
        code: "transcription_failed",
        message: reason instanceof Error ? reason.message : "Could not reach the speech server.",
      });
    }
  }

  /** Nobody spoke — close the recorder without troubling the server. */
  private async abandonTurn(turnId: number): Promise<void> {
    if (turnId !== this.turnId || this.finishing) return;
    this.finishing = true;
    this.clearPolling();
    await this.releaseRecorder();
    if (turnId === this.turnId) emitError({ code: "no_speech", message: "" });
  }

  /**
   * Called when the user stops the session, or before a new turn opens. A turn
   * that already captured speech is transcribed rather than thrown away, so
   * tapping stop mid-sentence still yields the sentence.
   */
  async stopListening(): Promise<void> {
    if (!this.recorder) {
      this.clearPolling();
      return;
    }

    if (this.heardSpeech && !this.finishing) {
      await this.finishTurn(this.turnId);
      return;
    }

    this.turnId += 1;
    this.clearPolling();
    await this.releaseRecorder();
  }

  private clearPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async releaseRecorder(): Promise<void> {
    const recorder = this.recorder;
    this.recorder = null;
    if (!recorder) return;
    try {
      await recorder.stop();
    } catch {
      // Already stopped, or never started.
    }
    recorder.release();
  }

  /** Whisper is batch — there is no partial transcript to publish. */
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

export const SpeechService: SpeechServiceInterface = new WhisperSpeechService();
export default SpeechService;
