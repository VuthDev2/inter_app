import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { Platform } from "react-native";

import { transcribeAudioResult } from "../../../../services/api";
import {
  type SpeechErrorListener,
  type SpeechLanguage,
  type SpeechRecognitionError,
  type SpeechResult,
  type SpeechResultListener,
  type SpeechServiceInterface,
  type SpeechSubscription,
} from "./SpeechTypes";

const TURN_RECORDING_MS = 1450;

const partialListeners = new Set<SpeechResultListener>();
const finalListeners = new Set<SpeechResultListener>();
const errorListeners = new Set<SpeechErrorListener>();

let recorder: InstanceType<typeof AudioModule.AudioRecorder> | null = null;
let recordingTimer: ReturnType<typeof setTimeout> | null = null;
let activeTurnId = 0;
let recorderOperation: Promise<void> = Promise.resolve();

function runRecorderOperation(operation: () => Promise<void>): Promise<void> {
  const next = recorderOperation.catch(() => undefined).then(operation);
  recorderOperation = next.catch(() => undefined);
  return next;
}

function createSubscription<T>(listeners: Set<T>, listener: T): SpeechSubscription {
  listeners.add(listener);
  return { remove: () => listeners.delete(listener) };
}

function emitFinal(result: SpeechResult): void {
  finalListeners.forEach((listener) => listener(result));
}

function emitError(error: SpeechRecognitionError): void {
  errorListeners.forEach((listener) => listener(error));
}

function languageHint(language: SpeechLanguage): string {
  if (language === "en-ja") return "en-ja";
  if (language === "ja-JP") return "ja";
  if (language === "en-US") return "en";
  return "en-ja";
}

async function stopCurrentRecorder(): Promise<string | null> {
  if (recordingTimer) {
    clearTimeout(recordingTimer);
    recordingTimer = null;
  }

  const activeRecorder = recorder;
  recorder = null;

  if (!activeRecorder) return null;

  try {
    if (activeRecorder.isRecording) await activeRecorder.stop();
    return activeRecorder.uri;
  } catch {
    return activeRecorder.uri;
  }
}

class BackendSpeechService implements SpeechServiceInterface {
  async startListening(language: SpeechLanguage): Promise<void> {
    if (Platform.OS === "web") throw new Error("Speech recognition is unavailable on web.");

    activeTurnId += 1;
    const turnId = activeTurnId;

    await runRecorderOperation(async () => {
      await stopCurrentRecorder();
      if (turnId !== activeTurnId) return;

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Microphone permission is required for live interpretation.");
      }
      if (turnId !== activeTurnId) return;

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      if (turnId !== activeTurnId) return;

      const nextRecorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      try {
        await nextRecorder.prepareToRecordAsync();
        if (turnId !== activeTurnId) {
          if (nextRecorder.isRecording) await nextRecorder.stop();
          return;
        }
        recorder = nextRecorder;
        nextRecorder.record();
      } catch {
        if (recorder === nextRecorder) recorder = null;
        throw new Error("The microphone was busy. Tap the microphone and try again.");
      }

      recordingTimer = setTimeout(() => {
        void runRecorderOperation(() => this.finishTurn(turnId, language));
      }, TURN_RECORDING_MS);
    });
  }

  async stopListening(): Promise<void> {
    activeTurnId += 1;
    await runRecorderOperation(async () => {
      await stopCurrentRecorder();
    });
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

  private async finishTurn(turnId: number, language: SpeechLanguage): Promise<void> {
    const audioUri = await stopCurrentRecorder();
    if (turnId !== activeTurnId || !audioUri) return;

    try {
      const result = await transcribeAudioResult(audioUri, languageHint(language));
      if (!result.text.trim()) {
        emitError({ code: "no_speech", message: "" });
        return;
      }

      emitFinal({
        transcript: result.text.trim(),
        language: result.language === "unknown" ? undefined : result.language,
      });
    } catch (reason) {
      emitError({
        code: "transcription_failed",
        message: reason instanceof Error ? reason.message : "Speech transcription failed.",
      });
    }
  }
}

export const SpeechService: SpeechServiceInterface = new BackendSpeechService();
export default SpeechService;
