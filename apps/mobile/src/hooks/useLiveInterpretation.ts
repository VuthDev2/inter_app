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

const echoKey = (text: string) =>
  text.toLowerCase().replace(/[\s\u3000.,!?、。・！？"'"'"]/g, "");

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
  // Consecutive turns where the microphone produced nothing usable. One is
  // ordinary -- a pause, a cough. Several in a row means no sound is reaching
  // the app at all, and saying so beats leaving someone talking to a screen
  // that answers with silence, which is what it used to do.
  const emptyTurnsRef = useRef(0);
  // What the app last said out loud. A microphone in the same room as the
  // speaker hears it, and without this the conversation talks to itself:
  // "Hello" becomes こんにちは, the app speaks こんにちは, hears it, and
  // answers "Hi, how are you?" -- forever, with nobody saying anything.
  const spokenAloudRef = useRef("");

  // Both languages stay active for every turn. The pills define the two sides
  // of the conversation; they are not a hidden recognition lock. Passing the
  // selected side as an `expected` prior biased short Japanese words (先生,
  // はい, etc.) toward the English decoder, so automatic EN/JA mode deliberately
  // sends no prior and lets the audio choose.
  const listenWithLanguage = useCallback(
    async (language: LanguageCode) => {
      listeningLanguageRef.current = language;
      // Still no decoder prior (second argument) — that is what biased short
      // Japanese words toward English. The third is the preview locale only,
      // so the on-device recognizer shows Japanese as Japanese while the
      // speaker talks instead of romanising it, without touching how the
      // transcript is actually decoded.
      const preview = language === "en" || language === "ja" ? language : undefined;
      await speech.startListening("en-ja", undefined, preview);
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
    // A turn that arrives while the microphone is meant to be closed is the app
    // hearing its own translation played back.
    if (suspendedRef.current) return;

    // The same thing, caught by content rather than by timing: the speaker is
    // still audible for a moment after playback reports finishing, and no delay
    // is reliable on every device. If what came back is what we just said, it
    // did not come from a person.
    // Containment, not equality: the microphone often catches only part of the
    // sentence the app spoke -- "こんにちは" out of "こんにちは。お元気ですか" --
    // and an exact match lets that through to be translated as if a person had
    // said it. Guarded by a length floor so a genuine short reply ("はい") is
    // not mistaken for an echo of a long one.
    const spoken = echoKey(spokenAloudRef.current);
    const heard = echoKey(transcript);
    if (spoken && heard && (spoken.includes(heard) || heard.includes(spoken)) && heard.length >= 3) {
      setRecognitionTurn((turn) => turn + 1);
      return;
    }

    handledFinalRef.current = transcript;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    // Route the turn by what was actually spoken, not by which pill happens to
    // be selected. Whisper already decided between the only two languages this
    // app supports, so the detected language IS the source and the other one is
    // the target. Trusting the pill instead is what made Japanese speech get
    // labelled ENGLISH and "translated" ja->ja, coming back unchanged.
    const detected = speech.finalLanguage;
    const turnSource: LanguageCode =
      detected === "en" || detected === "ja" ? detected : segmentSourceRef.current;
    const turnTarget: LanguageCode =
      turnSource === segmentSourceRef.current
        ? segmentTargetRef.current
        : segmentSourceRef.current;
    const nextListeningLanguage = segmentSourceRef.current;

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

    // The server usually sends the translation back with the transcript now
    // (one /interpret request instead of transcribe-then-translate), so the
    // common path has nothing left to wait for. The call below stays for an
    // older server, which answers 404 and makes the client do it the long way.
    const readyTranslation = speech.finalTranslation?.trim();
    const readyTarget = speech.finalTargetLanguage;

    void (async () => {
      try {
        emptyTurnsRef.current = 0;
        setTranslationError(null);
        const translation = readyTranslation
          ? readyTranslation
          : await translateTextViaApi(transcript, turnSource, turnTarget);
        setLiveTranslation(translation);
        spokenAloudRef.current = translation;
        setEntries((previous) => [
          ...previous,
          {
            id: `utterance-${Date.now()}-${requestId}`,
            original: transcript,
            translation,
            sourceLang: turnSource,
            targetLang: readyTranslation && (readyTarget === "en" || readyTarget === "ja")
              ? readyTarget
              : turnTarget,
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
      (speech.error.code === "no_speech" ||
        speech.error.code === "no_input" ||
        speech.error.code === "recoverable_interruption") &&
      sessionActiveRef.current
    ) {
      if (continuous) {
        emptyTurnsRef.current = speech.error.code === "no_input" ? emptyTurnsRef.current + 1 : 0;
        if (emptyTurnsRef.current >= 3) {
          setTranslationError(
            "No sound is reaching the microphone. Check that no other app is using it, " +
            "and that QuickVoice has microphone access in Settings.",
          );
        }
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
    // Whisper's own text throughout: the growing live transcription while the
    // sentence is still being spoken, replaced by the confirmed turn when it
    // ends. Nothing here comes from a platform recogniser.
    //
    // `speech.partialTranscript` (the on-device live preview) used to lead
    // here, and it cannot be trusted to name a language: iOS pins its
    // recogniser to exactly one locale, while this is a two-way interpreter
    // where either side may speak next. Whichever locale is chosen, the
    // other speaker's turns come back transliterated — Japanese speech
    // rendering as "Konnichiwa" inside the *English* card, which reads as
    // the app mishearing the language entirely. No locale choice fixes
    // that; only Whisper knows what was actually spoken.
    //
    // So the preview no longer reaches the screen. The recogniser is still
    // what makes turn-taking feel instant (it detects speech start/stop far
    // faster than a round trip), it just no longer supplies displayed text.
    // Empty here means the cards show their "Listening…" placeholder, and
    // `displayLanguage` resolves via processingLanguage — the *detected*
    // language — so confirmed text always lands in the correct card.
    //
    // Deliberately no `speech.finalTranscript` fallback either: it holds the
    // last completed turn indefinitely, so the card kept showing the
    // previous sentence instead of returning to the placeholder — that turn
    // is already in `entries`.
    interimText: processingText || speech.partialTranscript,
    liveTranslation,
    entries,
    volume: 0,
    // `||` not `??`: no_speech carries an empty message, and with `??` that
    // empty string won and the screen showed a blank error.
    error: (speech.error?.message || translationError) ?? null,
    start,
    stop,
    pauseForSpeech,
    resumeAfterSpeech,
    // `entries` only ever appends (see the handler above) — nothing clears
    // it, not even starting a new session, so a bad turn (a server hiccup
    // echoing the wrong text) stays on screen indefinitely with no way to
    // dismiss it short of restarting the app. This is that way.
    clearEntries: () => setEntries([]),
  } satisfies LiveInterpretationState & {
    start: () => Promise<void>;
    stop: () => void;
    pauseForSpeech: (durationMs: number) => void;
    resumeAfterSpeech: () => void;
    clearEntries: () => void;
  };
}
