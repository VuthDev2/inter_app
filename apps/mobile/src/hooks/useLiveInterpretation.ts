import { useCallback, useEffect, useRef, useState } from "react";

import type { LanguageCode } from "../constants/data";
import { useSpeechRecognition } from "../features/live-interpreter/hooks/useSpeechRecognition";
import { translateTextViaApi } from "../services/api";

const MIN_TRANSCRIPT_PREVIEW_MS = 850;
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

function detectConversationLanguage(
  transcript: string,
  fallback: LanguageCode,
): "en" | "ja" {
  // Hiragana, katakana, CJK ideographs, and Japanese punctuation reliably
  // identify a Japanese recognition result. Latin-script results are English.
  const containsJapanese =
    /[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uff66-\uff9f]/u.test(
      transcript,
    );
  if (containsJapanese) return "ja";
  if (/[A-Za-z]/u.test(transcript)) return "en";
  return fallback === "ja" ? "ja" : "en";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingStartedAtRef = useRef(0);
  const segmentSourceRef = useRef<LanguageCode>(sourceLang);
  const segmentTargetRef = useRef<LanguageCode>(targetLang);
  const listeningLanguageRef = useRef<LanguageCode>(sourceLang);
  const suspendedRef = useRef(false);

  const listenWithLanguage = useCallback(
    async (language: LanguageCode) => {
      listeningLanguageRef.current = language;
      await speech.startListening("en-ja");
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
      await listenWithLanguage(sourceLang);
    },
    [listenWithLanguage, sourceLang, targetLang],
  );

  const stop = useCallback(() => {
    sessionActiveRef.current = false;
    suspendedRef.current = false;
    setSessionActive(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    void speech.stopListening();
  }, [speech.stopListening]);

  const pauseForSpeech = useCallback((durationMs: number) => {
    if (!sessionActiveRef.current) return;

    suspendedRef.current = true;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
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
    if (suspendedRef.current) return;

    handledFinalRef.current = transcript;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const configuredSource = listeningLanguageRef.current;
    const detectedSource =
      speech.finalLanguage ?? detectConversationLanguage(transcript, configuredSource);
    const turnSource: LanguageCode = detectedSource;
    const turnTarget: LanguageCode =
      detectedSource === segmentSourceRef.current
        ? segmentTargetRef.current
        : segmentSourceRef.current;

    setProcessingText(transcript);
    setProcessingLanguage(turnSource);
    setListeningLanguage(turnSource);
    listeningLanguageRef.current = turnSource;
    processingStartedAtRef.current = Date.now();
    if (processingClearTimerRef.current) {
      clearTimeout(processingClearTimerRef.current);
      processingClearTimerRef.current = null;
    }

    // Open the next recognition window immediately. The UI language positions
    // remain fixed; each final transcript determines its own translation
    // direction instead of alternating languages after every sentence.
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
        const elapsed = Date.now() - processingStartedAtRef.current;
        if (elapsed < MIN_TRANSCRIPT_PREVIEW_MS) {
          await delay(MIN_TRANSCRIPT_PREVIEW_MS - elapsed);
        }

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
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (processingClearTimerRef.current) clearTimeout(processingClearTimerRef.current);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);

  return {
    isListening: sessionActive,
    listeningLanguage: processingText ? processingLanguage : listeningLanguage,
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
