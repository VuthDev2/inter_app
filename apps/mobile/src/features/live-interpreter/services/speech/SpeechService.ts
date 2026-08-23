import {
  ExpoSpeechRecognitionModule,
  RecognizerIntentEnableLanguageSwitch,
  RecognizerIntentExtraLanguageModel,
} from "expo-speech-recognition";
import { Platform } from "react-native";

import {
  type SpeechErrorListener,
  type SpeechLanguage,
  type SpeechRecognitionError,
  type SpeechResult,
  type SpeechResultListener,
  type SpeechServiceInterface,
  type SpeechSubscription,
} from "./SpeechTypes";

// Endpointing — how long the recognizer waits on silence before deciding the
// speaker is finished. This is the single biggest source of "why is it so slow
// to notice I stopped talking", and it bites Japanese hardest: the JS-side
// turn timer only runs once a partial transcript exists, and the ja-JP model
// emits partials later and less often than en-US, so Japanese turns routinely
// fell through to the recognizer's own (much longer) timeout.
//
// Lower means snappier turn-taking but a higher chance of cutting someone off
// mid-sentence — Japanese speakers in particular pause between clauses. These
// are the tuning knobs if it ever feels clipped.
const MIN_UTTERANCE_MS = 700;
const SILENCE_COMPLETE_MS = 1_500;
const SILENCE_POSSIBLY_COMPLETE_MS = 1_000;

const partialListeners = new Set<SpeechResultListener>();
const finalListeners = new Set<SpeechResultListener>();
const errorListeners = new Set<SpeechErrorListener>();

let activeLanguage: SpeechLanguage = "en-US";
let recognizing = false;
let latestTranscript = "";
let finalDelivered = false;
// Populated by Android's mid-session language detection (when supported by the
// device/OS), which knows the actual spoken language even when it differs from
// the locale recognition was started with. Falls back to script sniffing below.
let detectedLanguage: { code: "en" | "ja"; confidence: number } | null = null;

function localeToCode(locale: string): "en" | "ja" | null {
  if (locale.toLowerCase().startsWith("ja")) return "ja";
  if (locale.toLowerCase().startsWith("en")) return "en";
  return null;
}

function createSubscription<T>(listeners: Set<T>, listener: T): SpeechSubscription {
  listeners.add(listener);
  return { remove: () => listeners.delete(listener) };
}

function languageLocale(language: SpeechLanguage): string {
  if (language === "ja-JP") return "ja-JP";
  // Native recognizers require a real locale. The caller changes this locale
  // when the selected conversation language changes.
  return "en-US";
}

/**
 * Language of a transcript, judged by script. Returns null when the text
 * carries no signal either way (digits, punctuation, symbols) so the caller
 * can keep the locale recognition was started with instead of defaulting to
 * English and translating the turn in the wrong direction.
 */
function scriptLanguage(transcript: string): "en" | "ja" | null {
  if (
    /[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uff66-\uff9f]/u.test(transcript)
  ) {
    return "ja";
  }
  return /[A-Za-z]/u.test(transcript) ? "en" : null;
}

/**
 * Prefer the recognizer's own mid-session language detection — it knows the
 * true spoken language even when that differs from the locale recognition was
 * started with — over sniffing the transcript's script, which cannot see a
 * transcript that the wrong locale's model already rendered in its own script.
 */
function resolveLanguage(transcript: string): Pick<SpeechResult, "language"> {
  if (detectedLanguage && detectedLanguage.confidence >= 0.5) {
    return { language: detectedLanguage.code };
  }
  const script = scriptLanguage(transcript);
  return script ? { language: script } : {};
}

function emitError(error: SpeechRecognitionError): void {
  errorListeners.forEach((listener) => listener(error));
}

ExpoSpeechRecognitionModule.addListener("start", () => {
  recognizing = true;
  detectedLanguage = null;
  latestTranscript = "";
  finalDelivered = false;
});

ExpoSpeechRecognitionModule.addListener("end", () => {
  recognizing = false;
  // Some platform recognizers end after emitting only an interim result.
  // Promote the text already shown in the language card so translation is not
  // left waiting forever for an isFinal event that will never arrive.
  if (latestTranscript && !finalDelivered) {
    finalDelivered = true;
    const transcript = latestTranscript;
    finalListeners.forEach((listener) =>
      listener({ transcript, ...resolveLanguage(transcript) }),
    );
  }
});

ExpoSpeechRecognitionModule.addListener("languagedetection", (event) => {
  const code = localeToCode(event.detectedLanguage);
  if (!code) return;
  // A later, less confident reading shouldn't overwrite an earlier confident one.
  if (detectedLanguage && detectedLanguage.confidence > event.confidence) return;
  detectedLanguage = { code, confidence: event.confidence };
});

ExpoSpeechRecognitionModule.addListener("result", (event) => {
  const transcript = event.results[0]?.transcript?.trim() ?? "";
  if (!transcript) return;
  latestTranscript = transcript;

  const result: SpeechResult = {
    transcript,
    ...resolveLanguage(transcript),
  };

  if (event.isFinal) {
    recognizing = false;
    finalDelivered = true;
    finalListeners.forEach((listener) => listener(result));
  } else {
    partialListeners.forEach((listener) => listener(result));
  }
});

ExpoSpeechRecognitionModule.addListener("error", (event) => {
  recognizing = false;
  if (event.error === "aborted") return;

  const quietError =
    event.error === "no-speech" || event.error === "speech-timeout";
  emitError({
    code: quietError ? "no_speech" : event.error,
    message: quietError ? "" : event.message || "Speech recognition failed.",
  });
});

class NativeSpeechService implements SpeechServiceInterface {
  async startListening(language: SpeechLanguage, _expectedLanguage?: "en" | "ja"): Promise<void> {
    if (Platform.OS === "web") {
      throw new Error("Speech recognition is unavailable on web.");
    }

    activeLanguage = language;
    if (recognizing) {
      // Clear the previous turn before aborting so its end event cannot submit
      // a stale transcript as a second translation.
      latestTranscript = "";
      finalDelivered = true;
      ExpoSpeechRecognitionModule.abort();
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Microphone permission is required for live interpretation.");
    }

    // The native module resolves each androidIntentOptions key via reflection
    // against this device's actual android.speech.RecognizerIntent class, so
    // a key that doesn't exist on this OS version throws instead of no-op'ing.
    // Language detection/switch was only added in Android 14 (API 34).
    const supportsLanguageSwitch =
      Platform.OS === "android" && Platform.Version >= 34;

    ExpoSpeechRecognitionModule.start({
      lang: languageLocale(activeLanguage),
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
      androidIntentOptions: {
        // free_form (the default) is tuned for dictating longer sentences and
        // often fails to recognize a single short word like "hello". web_search
        // is tuned for short command/query-style utterances.
        EXTRA_LANGUAGE_MODEL: RecognizerIntentExtraLanguageModel.LANGUAGE_MODEL_WEB_SEARCH,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: MIN_UTTERANCE_MS,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: SILENCE_COMPLETE_MS,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: SILENCE_POSSIBLY_COMPLETE_MS,
        // The conversation can switch between English and Japanese speakers
        // mid-session, but recognition is locked to a single locale (`lang`
        // above). Where supported, this lets the recognizer notice the actual
        // spoken language and switch instead of forcing everything through
        // the wrong locale's model.
        ...(supportsLanguageSwitch
          ? {
              EXTRA_ENABLE_LANGUAGE_DETECTION: true,
              EXTRA_ENABLE_LANGUAGE_SWITCH: RecognizerIntentEnableLanguageSwitch.LANGUAGE_SWITCH_BALANCED,
              EXTRA_LANGUAGE_SWITCH_ALLOWED_LANGUAGES: ["en-US", "ja-JP"],
            }
          : null),
      },
      // "dictation" is tuned for long-form continuous speech and can miss a
      // single short word like "hello". "search" is tuned for short utterances.
      iosTaskHint: "search",
    });
  }

  async stopListening(): Promise<void> {
    if (recognizing) ExpoSpeechRecognitionModule.stop();
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

export const SpeechService: SpeechServiceInterface = new NativeSpeechService();
export default SpeechService;
