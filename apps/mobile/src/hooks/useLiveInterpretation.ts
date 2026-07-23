import { useCallback, useEffect, useRef, useState } from "react";

import type { LanguageCode } from "../constants/data";
import { useSpeechRecognition } from "../features/live-interpreter/hooks/useSpeechRecognition";
import { translateTextViaApi } from "../services/api";

export type InterpretationEntry = {
  id: string;
  original: string;
  translation: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
};

export type LiveInterpretationState = {
  isListening: boolean;
  interimText: string;
  liveTranslation: string;
  entries: InterpretationEntry[];
  volume: number;
  error: string | null;
};

export function useLiveInterpretation(sourceLang: LanguageCode, targetLang: LanguageCode) {
  const speech = useSpeechRecognition();
  const [sessionActive, setSessionActive] = useState(false);
  const [liveTranslation, setLiveTranslation] = useState("");
  const [entries, setEntries] = useState<InterpretationEntry[]>([]);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [recognitionTurn, setRecognitionTurn] = useState(0);
  const handledFinalRef = useRef("");
  const requestIdRef = useRef(0);
  const sessionActiveRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segmentSourceRef = useRef<LanguageCode>(sourceLang);
  const segmentTargetRef = useRef<LanguageCode>(targetLang);

  const start = useCallback(
    async () => {
      sessionActiveRef.current = true;
      setSessionActive(true);
      segmentSourceRef.current = sourceLang;
      segmentTargetRef.current = targetLang;
      handledFinalRef.current = "";
      setLiveTranslation("");
      setTranslationError(null);
      await speech.startListening(sourceLang === "ja" ? "ja-JP" : "en-US");
    },
    [sourceLang, speech.startListening, targetLang],
  );

  const stop = useCallback(() => {
    sessionActiveRef.current = false;
    setSessionActive(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    void speech.stopListening();
  }, [speech.stopListening]);

  // Treat a short pause as the end of one person's turn. The continuous
  // session remains active while this recognition segment is finalized.
  useEffect(() => {
    if (!sessionActive || !speech.isListening || !speech.partialTranscript.trim()) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      if (sessionActiveRef.current) void speech.stopListening();
    }, 1000);

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [sessionActive, speech.isListening, speech.partialTranscript, speech.stopListening]);

  useEffect(() => {
    const transcript = speech.finalTranscript.trim();
    if (!transcript || handledFinalRef.current === transcript) return;

    handledFinalRef.current = transcript;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const turnSource = segmentSourceRef.current;
    const turnTarget = segmentTargetRef.current;

    // Open the next speaker's microphone immediately. Translation continues in
    // parallel and no longer creates a several-second dead zone.
    segmentSourceRef.current = turnTarget;
    segmentTargetRef.current = turnSource;
    if (sessionActiveRef.current) setRecognitionTurn((turn) => turn + 1);

    setLiveTranslation("");
    setTranslationError(null);

    void translateTextViaApi(transcript, turnSource, turnTarget)
      .then((translation) => {
        setLiveTranslation(translation);
        setEntries((previous) => [
          ...previous,
          {
            id: `utterance-${Date.now()}-${requestId}`,
            original: transcript,
            translation,
            sourceLang: turnSource,
            targetLang: turnTarget,
          },
        ]);
      })
      .catch((reason: unknown) => {
        setTranslationError(
          reason instanceof Error ? reason.message : "Translation failed.",
        );
      });
  }, [speech.finalTranscript]);

  // Recognition restarts as soon as a turn ends; it does not wait for NLLB.
  useEffect(() => {
    if (!sessionActive || recognitionTurn === 0 || speech.isListening) return;

    const restartTimer = setTimeout(() => {
      if (!sessionActiveRef.current) return;
      handledFinalRef.current = "";
      const nextLanguage = segmentSourceRef.current === "ja" ? "ja-JP" : "en-US";
      void speech.startListening(nextLanguage);
    }, 300);

    return () => clearTimeout(restartTimer);
  }, [recognitionTurn, sessionActive, speech.isListening, speech.startListening]);

  useEffect(() => {
    if (!speech.error) return;

    // An empty recognition window is normal in a live conversation. Keep the
    // overall session active and immediately open another listening segment
    // instead of silently leaving person two with a stopped microphone.
    if (
      (speech.error.code === "no_speech" || speech.error.code === "recoverable_interruption") &&
      sessionActiveRef.current
    ) {
      setRecognitionTurn((turn) => turn + 1);
      return;
    }

    sessionActiveRef.current = false;
    setSessionActive(false);
  }, [speech.error]);

  useEffect(() => () => {
    sessionActiveRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  return {
    isListening: sessionActive,
    interimText: speech.partialTranscript || speech.finalTranscript,
    liveTranslation,
    entries,
    volume: 0,
    error: speech.error?.message ?? translationError,
    start,
    stop,
  } satisfies LiveInterpretationState & {
    start: () => Promise<void>;
    stop: () => void;
  };
}
