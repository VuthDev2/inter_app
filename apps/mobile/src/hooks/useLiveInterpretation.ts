import { useCallback, useEffect, useRef, useState } from "react";

import type { LanguageCode } from "../constants/data";
import { useSpeechRecognition } from "../features/live-interpreter/hooks/useSpeechRecognition";
import { translateTextViaApi } from "../services/api";

export type InterpretationEntry = {
  id: string;
  original: string;
  translation: string;
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
  const [completedTurn, setCompletedTurn] = useState(0);
  const handledFinalRef = useRef("");
  const requestIdRef = useRef(0);
  const sessionActiveRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechLanguage = sourceLang === "ja" ? "ja-JP" : "en-US";

  const start = useCallback(
    async () => {
      sessionActiveRef.current = true;
      setSessionActive(true);
      handledFinalRef.current = "";
      requestIdRef.current += 1;
      setLiveTranslation("");
      setTranslationError(null);
      await speech.startListening(speechLanguage);
    },
    [speech.startListening, speechLanguage],
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
    }, 1500);

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
    setLiveTranslation("");
    setTranslationError(null);

    void translateTextViaApi(transcript, sourceLang, targetLang)
      .then((translation) => {
        if (requestIdRef.current !== requestId) return;

        setLiveTranslation(translation);
        setEntries((previous) => [
          ...previous,
          {
            id: `utterance-${Date.now()}-${requestId}`,
            original: transcript,
            translation,
          },
        ]);
      })
      .catch((reason: unknown) => {
        if (requestIdRef.current !== requestId) return;
        setTranslationError(
          reason instanceof Error ? reason.message : "Translation failed.",
        );
      })
      .finally(() => {
        if (requestIdRef.current === requestId && sessionActiveRef.current) {
          setCompletedTurn((turn) => turn + 1);
        }
      });
  }, [sourceLang, speech.finalTranscript, targetLang]);

  // After translating a completed turn, begin a fresh recognition segment.
  // In two-way mode the parent swaps source/target first, so the cleanup below
  // cancels the old timer and restarts with the next speaker's locale.
  useEffect(() => {
    if (!sessionActive || completedTurn === 0 || speech.isListening) return;

    const restartTimer = setTimeout(() => {
      if (!sessionActiveRef.current) return;
      handledFinalRef.current = "";
      void speech.startListening(speechLanguage);
    }, 350);

    return () => clearTimeout(restartTimer);
  }, [completedTurn, sessionActive, sourceLang, speech.isListening, speech.startListening, speechLanguage]);

  useEffect(() => {
    if (!speech.error) return;
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
