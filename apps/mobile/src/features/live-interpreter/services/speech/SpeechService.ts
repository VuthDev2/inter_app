import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
} from "@react-native-voice/voice";
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

const partialListeners = new Set<SpeechResultListener>();
const finalListeners = new Set<SpeechResultListener>();
const errorListeners = new Set<SpeechErrorListener>();
let handlersInstalled = false;

function createSubscription<T>(listeners: Set<T>, listener: T): SpeechSubscription {
  listeners.add(listener);
  return { remove: () => listeners.delete(listener) };
}

function parseResult(event: SpeechResultsEvent): SpeechResult | null {
  const transcript = event.value?.[0]?.trim();
  return transcript ? { transcript } : null;
}

function parseError(event: SpeechErrorEvent): SpeechRecognitionError {
  const nativeMessage = event.error?.message ?? "Speech recognition failed.";
  const normalizedMessage = nativeMessage.toLowerCase();

  // Silence, an accidental tap, or audio that contains no recognizable words
  // is a normal empty turn—not an error the user needs to see.
  if (
    normalizedMessage.includes("no speech") ||
    normalizedMessage.includes("no match") ||
    normalizedMessage.includes("retry") ||
    normalizedMessage.includes("connection invalidated") ||
    normalizedMessage.includes("recognition request was canceled") ||
    /^(1101|1107|1110|216)\//.test(nativeMessage)
  ) {
    return {
      code: "recoverable_interruption",
      message: "",
    };
  }

  if (nativeMessage.includes("300/") || normalizedMessage.includes("failed to initialize recognizer")) {
    return {
      code: "recognizer_unavailable",
      message: "Speech recognition is unavailable in this iOS Simulator. Please test on a physical iPhone.",
    };
  }

  return {
    code: event.error?.code ?? "recognition_failed",
    message: nativeMessage,
  };
}

function installEventHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;

  Voice.onSpeechPartialResults = (event) => {
    const result = parseResult(event);
    if (result) partialListeners.forEach((listener) => listener(result));
  };

  Voice.onSpeechResults = (event) => {
    const result = parseResult(event);
    if (result) finalListeners.forEach((listener) => listener(result));
  };

  Voice.onSpeechError = (event) => {
    const error = parseError(event);
    errorListeners.forEach((listener) => listener(error));
  };
}

class ReactNativeVoiceSpeechService implements SpeechServiceInterface {
  async startListening(language: SpeechLanguage): Promise<void> {
    if (Platform.OS === "web") throw new Error("Speech recognition is unavailable on web.");
    installEventHandlers();

    const available = await Voice.isAvailable();
    if (!available) throw new Error("Speech recognition is unavailable on this device.");

    // react-native-voice keeps its NativeEventEmitter subscriptions across
    // Fast Refreshes. Recreate them before every session so results are sent to
    // this module's current listeners instead of stale callbacks.
    await Voice.destroy();
    installEventHandlers();

    await Voice.start(language, {
      EXTRA_PARTIAL_RESULTS: true,
      REQUEST_PERMISSIONS_AUTO: true,
    });
  }

  async stopListening(): Promise<void> {
    await Voice.stop();
  }

  onPartialResult(listener: SpeechResultListener): SpeechSubscription {
    installEventHandlers();
    return createSubscription(partialListeners, listener);
  }

  onFinalResult(listener: SpeechResultListener): SpeechSubscription {
    installEventHandlers();
    return createSubscription(finalListeners, listener);
  }

  onError(listener: SpeechErrorListener): SpeechSubscription {
    installEventHandlers();
    return createSubscription(errorListeners, listener);
  }
}

export const SpeechService: SpeechServiceInterface = new ReactNativeVoiceSpeechService();
export default SpeechService;
