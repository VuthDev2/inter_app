import { useCallback, useEffect, useRef, useState } from "react";

import type { LanguageCode } from "../constants/data";
import { useSpeechRecognition } from "../features/live-interpreter/hooks/useSpeechRecognition";
import { getBackendHealth, translateTextViaApi } from "../services/api";

const TRANSCRIPT_CLEAR_AFTER_OUTPUT_MS = 900;

export type InterpretationEntry = {
  id: string;
  original: string;
  translation: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
};

export type LiveInterpretationState = {
  isListening: boolean;
  listeningLanguage: LanguageCode;
  interimText: string;
  liveTranslation: string;
  entries: InterpretationEntry[];
  volume: number;
  error: string | null;
};

export function useLiveInterpretation(
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  continuous = true,
  pauseForAutoSpeak = false,
) {
  const speech = useSpeechRecognition();
  const [sessionActive, setSessionActive] = useState(false);
  const [liveTranslation, setLiveTranslation] = useState("");
  const [entries, setEntries] = useState<InterpretationEntry[]>([]);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [recognitionTurn, setRecognitionTurn] = useState(0);
  const [listeningLanguage, setListeningLanguage] = useState<LanguageCode>(sourceLang);
  const [processingText, setProcessingText] = useState("");
  const [processingLanguage, setProcessingLanguage] = useState<LanguageCode>(sourceLang);
  const handledFinalRef = useRef("");
  const requestIdRef = useRef(0);
  const sessionActiveRef = useRef(false);
  const processingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segmentSourceRef = useRef<LanguageCode>(sourceLang);
  const segmentTargetRef = useRef<LanguageCode>(targetLang);
  const listeningLanguageRef = useRef<LanguageCode>(sourceLang);
  const suspendedRef = useRef(false);

  // Pin recognition to the selected source language. This keeps Japanese on
  // the ja-JP recognizer and avoids a slower auto-detection/transcription pass.
  const listenWithLanguage = useCallback(
    async (language: LanguageCode) => {
      listeningLanguageRef.current = language;
      await speech.startListening(
        language === "ja" ? "ja-JP" : "en-US",
        language === "ja" ? "ja" : "en",
      );
    },
    [speech.startListening],
  );

  const start = useCallback(
    async () => {
      sessionActiveRef.current = true;
      suspendedRef.current = false;
      setSessionActive(true);
      segmentSourceRef.current = sourceLang;
      segmentTargetRef.current = targetLang;
      listeningLanguageRef.current = sourceLang;
      setListeningLanguage(sourceLang);
      handledFinalRef.current = "";
      setLiveTranslation("");
      setProcessingText("");
      setProcessingLanguage(sourceLang);
      if (processingClearTimerRef.current) {
        clearTimeout(processingClearTimerRef.current);
        processingClearTimerRef.current = null;
      }
      setTranslationError(null);
      // Open the connection (and resolve which address answers) before the
      // first sentence needs it, so that cost is not paid mid-conversation.
      void getBackendHealth();
      await listenWithLanguage(sourceLang);
    },
    [listenWithLanguage, sourceLang, targetLang],
  );

  const stop = useCallback(() => {
    sessionActiveRef.current = false;
    suspendedRef.current = false;
    setSessionActive(false);
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    void speech.stopListening();
  }, [speech.stopListening]);

  const pauseForSpeech = useCallback((durationMs: number) => {
    if (!sessionActiveRef.current) return;

    suspendedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);

    void speech.stopListening();
    resumeTimerRef.current = setTimeout(() => {
      resumeTimerRef.current = null;
      if (!sessionActiveRef.current) return;

      suspendedRef.current = false;
      handledFinalRef.current = "";
      void listenWithLanguage(listeningLanguageRef.current);
    }, durationMs);
  }, [listenWithLanguage, speech.stopListening]);

  const resumeAfterSpeech = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    if (!sessionActiveRef.current) return;

    suspendedRef.current = false;
    handledFinalRef.current = "";
    setRecognitionTurn((turn) => turn + 1);
  }, []);

  // Sentence boundaries are detected inside the speech service now, from the
  // audio itself rather than from how long a partial transcript has sat
  // unchanged. Running a second timer here only raced the first.

  useEffect(() => {
    const transcript = speech.finalTranscript.trim();
    if (!transcript || handledFinalRef.current === transcript) return;
    if (suspendedRef.current) return;

    handledFinalRef.current = transcript;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const turnSource = segmentSourceRef.current;
    const turnTarget = segmentTargetRef.current;
    const nextListeningLanguage = turnSource;

    setProcessingText(transcript);
    setProcessingLanguage(turnSource);
    setListeningLanguage(nextListeningLanguage);
    listeningLanguageRef.current = nextListeningLanguage;
    if (processingClearTimerRef.current) {
      clearTimeout(processingClearTimerRef.current);
      processingClearTimerRef.current = null;
    }

    // Open the next recognition window immediately — it does not wait for the
    // translation of this turn. The UI language positions stay fixed; only the
    // recognition locale moves.
    if (sessionActiveRef.current && continuous) {
      if (pauseForAutoSpeak) {
        // Keep recognition closed while translation and automatic playback run.
        // The screen resumes it after the audio has actually finished.
        suspendedRef.current = true;
      } else {
        setRecognitionTurn((turn) => turn + 1);
      }
    } else {
      sessionActiveRef.current = false;
      setSessionActive(false);
    }

    setLiveTranslation("");
    setTranslationError(null);

    void (async () => {
      try {
        const translation = await translateTextViaApi(transcript, turnSource, turnTarget);
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
        processingClearTimerRef.current = setTimeout(() => {
          setProcessingText("");
          processingClearTimerRef.current = null;
        }, TRANSCRIPT_CLEAR_AFTER_OUTPUT_MS);
      } catch (reason: unknown) {
        setTranslationError(
          reason instanceof Error ? reason.message : "Translation failed.",
        );
        if (pauseForAutoSpeak && sessionActiveRef.current) {
          suspendedRef.current = false;
          setRecognitionTurn((turn) => turn + 1);
        }
      }
    })();
  }, [continuous, pauseForAutoSpeak, speech.finalResultId]);

  // Recognition restarts as soon as a turn ends; it does not wait for NLLB.
  useEffect(() => {
    if (!sessionActive || recognitionTurn === 0 || speech.isListening) return;
    if (suspendedRef.current) return;

    const restartTimer = setTimeout(() => {
      if (!sessionActiveRef.current) return;
      handledFinalRef.current = "";
      void listenWithLanguage(listeningLanguageRef.current);
    }, 300);

    return () => clearTimeout(restartTimer);
  }, [listenWithLanguage, recognitionTurn, sessionActive, speech.isListening]);

  useEffect(() => {
    if (!speech.error) return;
    if (suspendedRef.current) return;

    // An empty recognition window is normal in a live conversation. Keep the
    // overall session active and immediately open another listening segment
    // instead of silently leaving person two with a stopped microphone.
    if (
      (speech.error.code === "no_speech" || speech.error.code === "recoverable_interruption") &&
      sessionActiveRef.current
    ) {
      if (continuous) {
        // An empty window just means nobody spoke. Recognition is no longer
        // locked to a locale, so there is nothing to switch — simply open the
        // next window and keep waiting.
        setRecognitionTurn((turn) => turn + 1);
      } else {
        sessionActiveRef.current = false;
        setSessionActive(false);
      }
      return;
    }

    sessionActiveRef.current = false;
    setSessionActive(false);
  }, [continuous, speech.error]);

  useEffect(() => () => {
    sessionActiveRef.current = false;
    suspendedRef.current = false;
    if (processingClearTimerRef.current) clearTimeout(processingClearTimerRef.current);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);

  // Keep partial words in the explicitly selected source-language card.
  const displayLanguage: LanguageCode = processingText
    ? processingLanguage
    : listeningLanguage;

  return {
    isListening: sessionActive,
    listeningLanguage: displayLanguage,
    interimText: speech.partialTranscript || processingText || speech.finalTranscript,
    liveTranslation,
    entries,
    volume: 0,
    error: speech.error?.message ?? translationError,
    start,
    stop,
    pauseForSpeech,
    resumeAfterSpeech,
  } satisfies LiveInterpretationState & {
    start: () => Promise<void>;
    stop: () => void;
    pauseForSpeech: (durationMs: number) => void;
    resumeAfterSpeech: () => void;
  };
}
