import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  setAudioModeAsync,
  type AudioRecorder,
} from "expo-audio";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { interpretAudioResult, transcribeAudioResult } from "../../../../services/api";
import { noiseCancellationOn } from "../../../../services/audioSettings";
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
// The same two margins with noise cancellation switched off in Settings. The
// gate still exists -- something has to decide when a turn ends -- but it sits
// close enough to the room that a quiet voice, a distant speaker, or someone
// talking over a fan still opens it. The cost is the other direction: steady
// noise now reaches Whisper, which is exactly the trade the switch offers.
const RAW_SPEECH_MARGIN_DB = 5;
const RAW_RELEASE_MARGIN_DB = 3;
// Start on the first clear rise above the calibrated room level. Requiring
// three 100 ms samples caused short words such as "hello" and Japanese
// acknowledgements to finish before the gate opened, leaving the UI looking
// unresponsive until the no-speech timeout.
const SPEECH_CONFIRM_FRAMES = 1;
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
// Measured against real speech: "hello" is 446ms, "yes" 442ms, はい 287ms.
// At 600ms every one-word reply was discarded silently, with no transcript and
// no error. Whisper transcribes all of them correctly at this length, and the
// peak-dB check alongside this is what actually keeps room noise out.
const MIN_TURN_MS = 250;
const POLL_INTERVAL_MS = 100;
// Silence after speech that ends the turn. This is dead time on every single
// turn — nothing is computed during it — so it is the cheapest latency to buy
// back. The floor is set by how long a speaker pauses mid-sentence; Japanese
// clause breaks run ~300-400ms, so this sits just above them: low enough to
// feel immediate, high enough that a mid-sentence pause does not cut the turn
// short. Raise it back toward 600 if sentences start getting chopped in half.
// A speaker pausing to think mid sentence can go quiet for 400-500ms, so this
// has to clear that comfortably or one sentence arrives as several fragments.
//
// There used to be a shorter exit (240ms) for utterances under 1.2s, on the
// theory that short replies finish when they stop. It cut people off midway:
// spokenMs measures speech *so far*, so the first word of a long sentence and
// a complete one-word reply are indistinguishable at that moment. Every
// sentence got cut at its first breath. One threshold, wide enough for both.
const TRAILING_SILENCE_MS = 700;
// Give up (and report an empty turn) if nobody starts speaking.
const NO_SPEECH_TIMEOUT_MS = 6_000;
// Hard ceiling so a noisy room cannot record forever.
const MAX_UTTERANCE_MS = 12_000;
// Used only when the device reports no metering at all, so voice activity
// cannot be measured and the turn has to be ended on a timer.
const FALLBACK_UTTERANCE_MS = 6_000;

/** How often to transcribe what has been said so far, while it is still being
 *  said. Short enough that words appear as you speak, long enough that each
 *  request has something new to work with. */
const INTERIM_INTERVAL_MS = 900;

/** Below this there is not enough audio to be worth a round trip. */
const INTERIM_MIN_BYTES = 44 + 16_000;

/**
 * Turn the half-written recording into a WAV a decoder will accept.
 *
 * The file on disk is real audio with a header that still says the recording is
 * empty, and iOS does not always put the samples at byte 44 -- it writes its own
 * chunks first. Assuming that offset fed the header to Whisper as if it were
 * sound, which is why every live transcription came back blank while the
 * finished turns read perfectly. So walk the chunks, take the format and the
 * samples from where they actually are, and write a plain canonical header in
 * front of them.
 */
function wavFromPartialRecording(bytes: Uint8Array): Uint8Array | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) =>
    String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);

  if (bytes.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") return null;

  let channels = 1;
  let sampleRate = 44_100;
  let bitsPerSample = 16;
  let dataAt = 0;

  for (let at = 12; at + 8 <= bytes.length; ) {
    const id = tag(at);
    const declared = view.getUint32(at + 4, true);
    const body = at + 8;
    if (id === "fmt ") {
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (id === "data") {
      dataAt = body;
      break;
    }
    // A chunk that claims nothing (the header is still being written) would
    // spin here forever.
    at = body + (declared > 0 ? declared + (declared & 1) : 0);
    if (declared === 0 && id !== "data") return null;
  }

  if (!dataAt || bitsPerSample !== 16) return null;

  const blockAlign = channels * 2;
  const available = bytes.length - dataAt;
  const dataLength = available - (available % blockAlign);
  if (dataLength <= 0) return null;

  const out = new Uint8Array(44 + dataLength);
  const header = new DataView(out.buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) out[offset + i] = text.charCodeAt(i);
  };
  write(0, "RIFF");
  header.setUint32(4, 36 + dataLength, true);
  write(8, "WAVEfmt ");
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);                              // PCM
  header.setUint16(22, channels, true);
  header.setUint32(24, sampleRate, true);
  header.setUint32(28, sampleRate * blockAlign, true);
  header.setUint16(32, blockAlign, true);
  header.setUint16(34, 16, true);
  write(36, "data");
  header.setUint32(40, dataLength, true);
  out.set(bytes.subarray(dataAt, dataAt + dataLength), 44);
  return out;
}

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
  /** When speech was first confirmed this turn, for the short-reply rule. */
  private speechStartedAt = 0;
  private noiseFloorDb: number | null = null;
  private peakDb = Number.NEGATIVE_INFINITY;
  private interimBusy = false;
  private interimTimer: ReturnType<typeof setInterval> | null = null;
  /** Read once when the turn starts, so flipping the switch mid-sentence cannot
   *  move the gate under a turn that is already being judged against it. */
  private speechMarginDb = SPEECH_MARGIN_DB;
  private releaseMarginDb = RELEASE_MARGIN_DB;

  /** Above this, the microphone was at least picking up a room. Below it for a
   *  whole turn means the input is dead, not that the speaker was quiet: a
   *  silent iPad clip measured 0.3% of full scale, about -50 dB. */
  private static readonly LIVE_INPUT_DB = -45;

  /** "nobody spoke" if the microphone heard the room, "no input at all" if it
   *  did not. Only the second is worth warning someone about. */
  private get emptyTurnCode(): string {
    return Number.isFinite(this.peakDb) && this.peakDb > WhisperSpeechService.LIVE_INPUT_DB
      ? "no_speech"
      : "no_input";
  }
  private aboveGateFrames = 0;
  private startedAt = 0;
  private finishing = false;
  /** The locale hint sent to Whisper; "en-ja" lets it choose. */
  private languageHint: SpeechLanguage = "en-ja";
  /** The two sides of the conversation, as the language pills have them. Only a
   *  hint: the server routes by the language it actually heard. */
  private get sessionSource(): "en" | "ja" {
    return this.expectedLanguage ?? "en";
  }

  private get sessionTarget(): "en" | "ja" {
    return this.sessionSource === "en" ? "ja" : "en";
  }

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
    this.speechStartedAt = 0;

    const suppressNoise = noiseCancellationOn();
    this.speechMarginDb = suppressNoise ? SPEECH_MARGIN_DB : RAW_SPEECH_MARGIN_DB;
    this.releaseMarginDb = suppressNoise ? RELEASE_MARGIN_DB : RAW_RELEASE_MARGIN_DB;

    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Microphone permission is required for live interpretation.");
    }

    // expo-audio owns the audio session, and nothing else configures it.
    // Re-asserted every turn: playing the previous translation switches the
    // session to a playback-shaped mode.
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

    // iOS records Linear PCM (a .wav), Android keeps the preset's AAC — the
    // MediaRecorder pipeline there has no uncompressed option. Every target
    // device on this project is an iPhone, so the iOS path is what matters.
    const isIOS = Platform.OS === "ios";
    const recorder = new AudioModule.AudioRecorder({
      ...RecordingPresets.HIGH_QUALITY,
      // No forced sample rate. Asking an iPad for 16 kHz when its input runs
      // at 48 kHz produced a file of pure silence -- right length, 0.3% of full
      // scale -- rather than an error, while the same microphone worked in
      // Safari, which records at whatever the hardware gives it. The server
      // resamples for Whisper anyway and is told the real rate in the WAV
      // header, so recording at the hardware rate costs nothing but bytes.
      extension: isIOS ? ".wav" : RecordingPresets.HIGH_QUALITY.extension,
      numberOfChannels: 1,
      isMeteringEnabled: true,
      // The HIGH_QUALITY preset records AAC on iOS. AAC at 16 kHz is a hard
      // case for the encoder — it smears fricatives and plosives — and it
      // then has to be decoded back before Whisper sees it. The web client
      // never pays that: it streams raw PCM. Recording Linear PCM here hands
      // Whisper the same clean signal, which is the single biggest reason
      // phone transcripts read worse than the website's.
      ios: {
        ...RecordingPresets.HIGH_QUALITY.ios,
        outputFormat: IOSOutputFormat.LINEARPCM,
        audioQuality: AudioQuality.MAX,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    });
    await recorder.prepareToRecordAsync();
    if (turnId !== this.turnId) {
      recorder.release();
      return;
    }

    this.recorder = recorder;
    recorder.record();
    this.pollTimer = setInterval(() => this.pollLevel(turnId), POLL_INTERVAL_MS);
    this.interimTimer = setInterval(() => void this.runInterim(turnId), INTERIM_INTERVAL_MS);
  }

  /**
   * Transcribe the recording so far and show it while the person is still
   * talking.
   *
   * The file the recorder is writing is a real WAV whose header still claims
   * zero length, so the bytes flushed to disk are copied out and given a
   * correct header before being sent. Every request is the whole turn from the
   * beginning, so the text grows the way speech does -- "hello", then "hello
   * how are you" -- instead of arriving in disconnected fragments.
   *
   * This is QuickVoice's own Whisper doing it, the same model that produces the
   * final text; there is no platform recogniser involved and nothing here is
   * ever translated or saved. The confirmed turn replaces it when the sentence
   * ends.
   */
  private async runInterim(turnId: number): Promise<void> {
    // Nothing said yet means the file holds room tone, and Whisper answers a
    // second of room tone with nothing at all.
    if (this.interimBusy || turnId !== this.turnId || this.finishing || !this.heardSpeech) return;
    const uri = this.recorder?.uri;
    if (!uri) return;

    this.interimBusy = true;
    try {
      const source = new File(uri);
      const bytes = await source.bytes();
      if (bytes.length < INTERIM_MIN_BYTES) return;

      const wav = wavFromPartialRecording(bytes);
      if (!wav) return;

      const partial = new File(Paths.cache, `quickvoice-partial-${turnId}.wav`);
      if (partial.exists) partial.delete();
      partial.write(wav);

      const heard = await transcribeAudioResult(partial.uri, this.languageHint, this.expectedLanguage);
      partial.delete();

      const text = heard.text.trim();
      if (text && turnId === this.turnId && !this.finishing) {
        partialListeners.forEach((listener) =>
          listener({
            transcript: text,
            language: heard.language === "unknown" ? undefined : heard.language,
          }),
        );
      }
    } catch {
      // A partial that fails changes nothing: the confirmed turn still runs.
    } finally {
      this.interimBusy = false;
    }
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
      // still ends instead of running to the hard cap. Mark it as speech too:
      // without that flag the stop path treats the turn as empty and abandons
      // the upload that is about to carry a perfectly good transcript.
      if (elapsed >= FALLBACK_UTTERANCE_MS) {
        this.heardSpeech = true;
        void this.finishTurn(turnId);
      }
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
      if (level > gate(this.speechMarginDb)) {
        this.aboveGateFrames += 1;
        if (this.aboveGateFrames >= SPEECH_CONFIRM_FRAMES) {
          if (__DEV__) {
            console.log(
              `[QuickVoice VAD] speech at ${level.toFixed(1)}dB ` +
                `(floor ${(this.noiseFloorDb ?? 0).toFixed(1)}, gate ${gate(this.speechMarginDb).toFixed(1)}) after ${elapsed}ms`,
            );
          }
          this.heardSpeech = true;
          this.speechStartedAt = now;
          this.lastLoudAt = now;
        }
      } else {
        this.aboveGateFrames = 0;
      }
    } else if (level > gate(this.releaseMarginDb)) {
      this.lastLoudAt = now;
    }

    if (this.heardSpeech) {
      const spokenMs = this.speechStartedAt ? now - this.speechStartedAt : 0;
      const requiredSilence = TRAILING_SILENCE_MS;
      if (this.lastLoudAt && now - this.lastLoudAt >= requiredSilence) {
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
      if (turnId === this.turnId) emitError({ code: this.emptyTurnCode, message: "" });
      return;
    }

    try {
      // Transcript and translation in one request. Asking for them separately
      // put a whole round trip between the two halves of every turn -- the
      // website never pays that, because the websocket hands back both at once.
      const combined = await interpretAudioResult(
        uri,
        this.languageHint,
        this.expectedLanguage,
        this.sessionSource,
        this.sessionTarget,
      );
      const result = combined ?? await transcribeAudioResult(uri, this.languageHint, this.expectedLanguage);
      if (turnId !== this.turnId) return;

      const transcript = result.text.trim();
      if (!transcript) {
        emitError({ code: this.emptyTurnCode, message: "" });
        return;
      }

      finalListeners.forEach((listener) =>
        listener({
          transcript,
          // Whisper decided this from the audio, so it is authoritative —
          // unlike the locale the recorder happened to be hinted with.
          language: result.language === "unknown" ? undefined : result.language,
          translation: combined?.translation || undefined,
          targetLanguage: combined?.target || undefined,
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
    if (turnId === this.turnId) emitError({ code: this.emptyTurnCode, message: "" });
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

    // A turn that is already uploading owns this turnId: bumping it here would
    // make finishTurn discard its own result as stale, which is how a correct
    // transcript could be fetched and then silently thrown away. It happens on
    // any device without audio metering (the Mac build), where heardSpeech is
    // never set and this path used to be the only one taken.
    if (this.finishing) {
      this.clearPolling();
      return;
    }

    if (this.heardSpeech) {
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
    // The live transcription stops with the recording it was reading.
    if (this.interimTimer) {
      clearInterval(this.interimTimer);
      this.interimTimer = null;
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
