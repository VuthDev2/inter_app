import { useCallback, useEffect, useState } from "react";

// Our own pipeline, end to end: the device supplies the microphone and nothing
// else. The recording goes straight to QuickVoice's Whisper and translation on
// the server, exactly as the website's audio does.
//
// This used to run Apple's recognizer alongside Whisper, for a live word-by-word
// preview. That recognizer insisted on configuring the iOS audio session with
// `.measurement` mode -- which strips automatic gain and noise suppression --
// and on an iPad it handed back recordings at 0.2% of full scale: the right
// length, silent to every model. The same microphone worked in Safari, which
// never touches that mode. The preview was not worth an input path we do not
// control, so it is gone.
import SpeechService from "../services/speech/WhisperSpeechService";
import type {
  SpeechLanguage,
  SpeechRecognitionError,
} from "../services/speech/SpeechTypes";

export type SpeechRecognitionState = {
  isListening: boolean;
  partialTranscript: string;
  partialLanguage?: "en" | "ja";
  finalTranscript: string;
  finalLanguage?: "en" | "ja";
  /** Present when the server translated the turn in the same request. */
  finalTranslation?: string;
  finalTargetLanguage?: "en" | "ja";
  finalResultId: number;
  error: SpeechRecognitionError | null;
  startListening: (
    language: SpeechLanguage,
    expectedLanguage?: "en" | "ja",
    previewLanguage?: "en" | "ja",
  ) => Promise<void>;
  stopListening: () => Promise<void>;
};

export function useSpeechRecognition(): SpeechRecognitionState {
  const [isListening, setIsListening] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [partialLanguage, setPartialLanguage] = useState<"en" | "ja" | undefined>();
  const [finalTranscript, setFinalTranscript] = useState("");
  const [finalLanguage, setFinalLanguage] = useState<"en" | "ja" | undefined>();
  const [finalTranslation, setFinalTranslation] = useState<string | undefined>();
  const [finalTargetLanguage, setFinalTargetLanguage] = useState<"en" | "ja" | undefined>();
  const [finalResultId, setFinalResultId] = useState(0);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);

  useEffect(() => {
    const partialSubscription = SpeechService.onPartialResult(({ language, transcript }) => {
      setPartialTranscript(transcript);
      setPartialLanguage(language);
    });
    const finalSubscription = SpeechService.onFinalResult(({ language, transcript, translation, targetLanguage }) => {
      setFinalTranscript(transcript);
      setFinalLanguage(language);
      setFinalTranslation(translation);
      setFinalTargetLanguage(targetLanguage);
      setFinalResultId((current) => current + 1);
      setPartialTranscript("");
      setPartialLanguage(undefined);
      setIsListening(false);
    });
    const errorSubscription = SpeechService.onError((recognitionError) => {
      setError(recognitionError);
      setIsListening(false);
      // A turn that errored produced no usable transcript, so the live
      // preview it left behind is not "in progress" — it is stale. Only the
      // final-result and start paths cleared it, so an errored turn (the
      // no_speech HybridSpeechService now reports when Whisper cannot
      // confirm a turn) stranded the preview on screen permanently, and the
      // status line read "TRANSLATING…" forever because that state is
      // derived from a non-empty preview with listening already stopped.
      setPartialTranscript("");
      setPartialLanguage(undefined);
    });

    return () => {
      partialSubscription.remove();
      finalSubscription.remove();
      errorSubscription.remove();
      SpeechService.stopListening().catch(() => undefined);
    };
  }, []);

  const startListening = useCallback(async (
    language: SpeechLanguage,
    expectedLanguage?: "en" | "ja",
    previewLanguage?: "en" | "ja",
  ) => {
    setError(null);
    setPartialTranscript("");
    setPartialLanguage(undefined);
    setFinalTranscript("");
    setFinalLanguage(undefined);

    try {
      await SpeechService.startListening(language, expectedLanguage, previewLanguage);
      setIsListening(true);
    } catch (reason) {
      setIsListening(false);
      setError({
        code: "start_failed",
        message: reason instanceof Error ? reason.message : "Unable to start speech recognition.",
      });
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await SpeechService.stopListening();
    } finally {
      setIsListening(false);
    }
  }, []);

  return {
    isListening,
    partialTranscript,
    partialLanguage,
    finalTranscript,
    finalLanguage,
    finalTranslation,
    finalTargetLanguage,
    finalResultId,
    error,
    startListening,
    stopListening,
  };
}
