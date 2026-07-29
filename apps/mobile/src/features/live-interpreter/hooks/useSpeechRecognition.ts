import { useCallback, useEffect, useState } from "react";

import SpeechService from "../services/speech/SpeechService";
import type {
  SpeechLanguage,
  SpeechRecognitionError,
} from "../services/speech/SpeechTypes";

export type SpeechRecognitionState = {
  isListening: boolean;
  partialTranscript: string;
  finalTranscript: string;
  finalLanguage?: "en" | "ja";
  finalResultId: number;
  error: SpeechRecognitionError | null;
  startListening: (language: SpeechLanguage) => Promise<void>;
  stopListening: () => Promise<void>;
};

export function useSpeechRecognition(): SpeechRecognitionState {
  const [isListening, setIsListening] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [finalLanguage, setFinalLanguage] = useState<"en" | "ja" | undefined>();
  const [finalResultId, setFinalResultId] = useState(0);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);

  useEffect(() => {
    const partialSubscription = SpeechService.onPartialResult(({ transcript }) => {
      setPartialTranscript(transcript);
    });
    const finalSubscription = SpeechService.onFinalResult(({ language, transcript }) => {
      setFinalTranscript(transcript);
      setFinalLanguage(language);
      setFinalResultId((current) => current + 1);
      setPartialTranscript("");
      setIsListening(false);
    });
    const errorSubscription = SpeechService.onError((recognitionError) => {
      setError(recognitionError);
      setIsListening(false);
    });

    return () => {
      partialSubscription.remove();
      finalSubscription.remove();
      errorSubscription.remove();
      SpeechService.stopListening().catch(() => undefined);
    };
  }, []);

  const startListening = useCallback(async (language: SpeechLanguage) => {
    setError(null);
    setPartialTranscript("");
    setFinalTranscript("");
    setFinalLanguage(undefined);

    try {
      await SpeechService.startListening(language);
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
    finalTranscript,
    finalLanguage,
    finalResultId,
    error,
    startListening,
    stopListening,
  };
}
