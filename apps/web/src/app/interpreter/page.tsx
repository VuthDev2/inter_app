"use client";

import { Fragment, useState, useRef, useEffect } from "react";
import { Mic, Volume2, FileText, Square, Pause, Play, MicOff, X, Copy, Download, ArrowLeftRight, Clock, Calendar, ArrowLeft, ArrowRight, Folder, ChevronDown, Plus, Send, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useLiveInterpretation } from "@/hooks/useLiveInterpretation";
import { speakWithQuickVoice, translateWithQuickVoice, type QuickVoiceLanguage } from "@/lib/quickvoice-api";
import { clearDraft, loadDraft, loadFolders, loadTwoWayMode, saveDraft, saveSession, saveTwoWayMode, type DraftScope } from "@/lib/session-store";
import { alertInBackground, compactViewOn, playCue } from "@/lib/ui-feedback";

const LANGUAGES = ["English (US)", "Japanese"];
/** Narrow a language the server reported to the two this app supports. Anything
 *  unrecognised falls back rather than being stored as a bogus language code. */
const asLanguage = (
    value: string | undefined,
    fallback: QuickVoiceLanguage,
): QuickVoiceLanguage => (value === "en" || value === "ja" ? value : fallback);

/** Which language some typed text is actually in.
 *
 *  Two-way accepts either language in one box, so assuming it matches the
 *  configured input language mislabelled every reply: typing こんにちは while the
 *  input said English filed it as English, asked for an en->ja translation of
 *  Japanese text (which came back as 春), and put it on the English side.
 *  Kana and kanji are unambiguous for the two languages this app supports. */
const detectLanguage = (text: string): QuickVoiceLanguage =>
    /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text) ? "ja" : "en";

/** Prefer the text itself over stale language metadata from recovered sessions. */
const sourceLanguageOf = (entry: { original: string; sourceLang?: string }): QuickVoiceLanguage =>
    detectLanguage(entry.original) === "ja" ? "ja" : asLanguage(entry.sourceLang, "en");

const LANGUAGE_CODE: Record<string, QuickVoiceLanguage> = {
    "English (US)": "en",
    Japanese: "ja",
};

/**
 * The live screen, shared by two routes.
 *
 * /interpreter is the full thing: one-way or two-way, with a box for typing.
 * /record is the same screen for dictation only -- always one-way, no typed
 * input, because recording is a voice activity. Sharing the component keeps the
 * two from drifting apart the way a copied page would.
 */
export default function InterpreterPage({ recordMode = false }: { recordMode?: boolean } = {}) {
    const [inputLang, setInputLang] = useState("English (US)");
    const [outputLang, setOutputLang] = useState("Japanese");
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [typedText, setTypedText] = useState("");
    const [manualEntries, setManualEntries] = useState<Array<{ id: string; original: string; translation: string; sourceLang?: string; targetLang?: string; nuances?: { text: string; color: string }[] }>>([]);
    // Anything recovered from a recording that was cut short before it was saved.
    const [recoveredEntries, setRecoveredEntries] = useState<Array<{ id: string; original: string; translation: string; sourceLang?: string; targetLang?: string; nuances?: { text: string; color: string }[] }>>([]);
    const [showRecoveryNotice, setShowRecoveryNotice] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    // ?mode=oneway still wins for a link that asks for it; otherwise the mode
    // is whatever you last chose, because leaving the page and coming back
    // used to silently drop you into one-way.
    const [isTwoWayRaw, setIsTwoWayRaw] = useState(() =>
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('mode') !== 'oneway' && loadTwoWayMode()
            : true
    );
    const setIsTwoWay = (next: boolean) => {
        setIsTwoWayRaw(next);
        saveTwoWayMode(next);
    };
    // Recording is dictation: one speaker, one direction. The toggle is hidden
    // in that mode, so force the value rather than trusting stale state.
    const isTwoWay = recordMode ? false : isTwoWayRaw;
    // Recording and interpreting keep their own unsaved work; one screen's
    // draft is not the other's, and Discard on one must not wipe the other.
    const draftScope: DraftScope = recordMode ? "record" : "live";

    const [saveModalState, setSaveModalState] = useState<'hidden' | 'loading' | 'saved'>('hidden');
    const [showTranscript, setShowTranscript] = useState(false);
    const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('folder');
        }
        return null;
    });
    // The language row floats over the conversation, so the conversation needs
    // to know how tall it is. Measured rather than hard-coded: the row shrinks
    // on a short window and the long language names wrap on a narrow one.
    const langRowRef = useRef<HTMLDivElement>(null);
    const [langRowHeight, setLangRowHeight] = useState(0);
    useEffect(() => {
        const row = langRowRef.current;
        if (!row) return;
        // offsetHeight, not contentRect: contentRect is the *content* box, so
        // it left out the bar's own padding and the conversation cleared only
        // part of it. And measure once here rather than waiting for the first
        // observer callback -- until that arrives the inset is zero and the
        // panels start underneath the bar, hiding their top corners.
        const measure = () => setLangRowHeight(row.offsetHeight);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(row);
        return () => observer.disconnect();
    }, []);

    const recordScrollRef = useRef<HTMLDivElement>(null);
    const bottomBarRef = useRef<HTMLDivElement>(null);
    const [bottomBarHeight, setBottomBarHeight] = useState(0);
    useEffect(() => {
        const bar = bottomBarRef.current;
        if (!bar) return;
        const measure = () => setBottomBarHeight(bar.offsetHeight);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(bar);
        return () => observer.disconnect();
    }, []);

    const sessionStartedAtRef = useRef(Date.now());
    const folders = typeof window === "undefined" ? [] : loadFolders().map((folder) => folder.name);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    const {
        isListening,
        interimText,
        liveTranslation,
        entries,
        error,
        start,
        stop,
        reset,
    } = useLiveInterpretation(inputLang, outputLang);
    const allEntries = [...recoveredEntries, ...entries, ...manualEntries];
    const lastOutput = liveTranslation || allEntries.at(-1)?.translation || "";

    // Recording writes straight into the split view, so it scrolls itself.
    useEffect(() => {
        if (!recordMode) return;
        recordScrollRef.current?.scrollTo({
            top: recordScrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [recordMode, allEntries.length, interimText, liveTranslation]);

    // Sound cues and background alerts, the readers for the two switches in
    // Settings that used to store a value nothing acted on.
    const [compactView, setCompactView] = useState(false);
    useEffect(() => setCompactView(compactViewOn()), []);
    const cuedEntryRef = useRef<string | null>(null);
    useEffect(() => {
        const latest = allEntries.at(-1);
        if (!latest || cuedEntryRef.current === latest.id) return;
        // Skip the ones already on screen when the page opened.
        if (cuedEntryRef.current !== null) playCue("turn");
        cuedEntryRef.current = latest.id;
    }, [allEntries]);
    const alertedErrorRef = useRef<string | null>(null);
    useEffect(() => {
        const message = error || actionError;
        if (!message) { alertedErrorRef.current = null; return; }
        if (alertedErrorRef.current === message) return;
        alertedErrorRef.current = message;
        playCue("error");
        alertInBackground("QuickVoice stopped", message);
    }, [error, actionError]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [allEntries.length, showTranscript]);

    // Offer back a recording that ended without being saved. A session can run
    // for half an hour, and until now a reload threw all of it away.
    useEffect(() => {
        const draft = loadDraft(draftScope);
        if (!draft) return;
        // Only interrupt when there is something worth recovering. A single
        // stray line from a moment ago is noise -- the point of this prompt is
        // a long conversation that was cut short, or one abandoned earlier.
        const ageMs = Date.now() - new Date(draft.savedAt).getTime();
        const worthRecovering = draft.utterances.length > 1 || ageMs > 5 * 60_000;
        if (!worthRecovering) return;
        // Offer a given draft once. Previously an ignored draft came back on
        // every page load, so the banner followed you around the app until you
        // pressed Save or Discard -- which read as a bug, not an offer.
        const OFFERED_KEY = `quickvoice.web.draftOffered.v1.${draftScope}`;
        try {
            if (localStorage.getItem(OFFERED_KEY) === draft.savedAt) return;
            localStorage.setItem(OFFERED_KEY, draft.savedAt);
        } catch {
            // Storage unavailable (private window): still offer, just without
            // remembering that we did.
        }
        setRecoveredEntries(draft.utterances);
        sessionStartedAtRef.current = draft.startedAt;
        setShowRecoveryNotice(true);
    }, []);

    // Write the running session to storage as it grows, so a crash, a reload or
    // a closed tab costs at most the last utterance instead of the whole hour.
    useEffect(() => {
        if (!allEntries.length) return;
        saveDraft({
            startedAt: sessionStartedAtRef.current,
            savedAt: new Date().toISOString(),
            utterances: allEntries.map(({ id, original, translation, sourceLang, targetLang }) => (
                { id, original, translation, sourceLang, targetLang }
            )),
        }, draftScope);
    }, [allEntries.length]);

    // A long recording dies when the screen sleeps, which suspends the mic.
    useEffect(() => {
        if (!isListening) return;
        let lock: WakeLockSentinel | null = null;
        let released = false;
        const acquire = async () => {
            try {
                lock = await navigator.wakeLock?.request("screen");
            } catch {
                // Unsupported or refused; the recording still works, the screen
                // is just free to sleep. Not worth interrupting the user over.
            }
        };
        const reacquire = () => {
            if (document.visibilityState === "visible" && !released) void acquire();
        };
        void acquire();
        document.addEventListener("visibilitychange", reacquire);
        return () => {
            released = true;
            document.removeEventListener("visibilitychange", reacquire);
            void lock?.release().catch(() => {});
        };
    }, [isListening]);

    const chooseInputLanguage = (language: string) => {
        setInputLang(language);
        if (language === outputLang) setOutputLang(language === "Japanese" ? "English (US)" : "Japanese");
    };

    const chooseOutputLanguage = (language: string) => {
        setOutputLang(language);
        if (language === inputLang) setInputLang(language === "Japanese" ? "English (US)" : "Japanese");
    };

    const handleTypedTranslation = async () => {
        const text = typedText.trim();
        if (!text || isTranslating) return;
        setIsTranslating(true);
        setActionError(null);
        // In two-way the box takes either language, so read the text rather than
        // trusting the input selector. One-way is a fixed direction, so it keeps
        // using the configured languages even if the typing does not match.
        const detected = detectLanguage(text);
        // One-way runs in a fixed direction, so text that is already in the
        // output language has nothing to translate into: sending it anyway asked
        // the model to turn Japanese into Japanese and it answered with
        // something else entirely. Keep it as it is and say why.
        const alreadyOutput = !isTwoWay && detected === LANGUAGE_CODE[outputLang]
            && LANGUAGE_CODE[outputLang] !== LANGUAGE_CODE[inputLang];
        const spoken = isTwoWay || alreadyOutput ? detected : LANGUAGE_CODE[inputLang];
        const into: QuickVoiceLanguage =
            isTwoWay
                ? (spoken === LANGUAGE_CODE[inputLang] ? LANGUAGE_CODE[outputLang] : LANGUAGE_CODE[inputLang])
                : LANGUAGE_CODE[outputLang];
        try {
            const translation = alreadyOutput
                ? text
                : await translateWithQuickVoice(text, spoken, into);
            setManualEntries((current) => [...current, {
                id: `typed-${Date.now()}`,
                original: text,
                translation,
                sourceLang: spoken,
                targetLang: into,
                nuances: alreadyOutput
                    ? [{
                        text: `Already ${outputLang.replace(" (US)", "")} — not translated`,
                        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                    }]
                    : undefined,
            }]);
            setTypedText("");
            if (!isMuted) {
                setIsSpeaking(true);
                try {
                    await speakWithQuickVoice(translation, into);
                } finally {
                    setIsSpeaking(false);
                }
            }
        } catch (reason) {
            setActionError(reason instanceof Error ? reason.message : "QuickVoice could not translate that text.");
        } finally {
            setIsTranslating(false);
        }
    };

    const speakText = async (text: string, language: QuickVoiceLanguage) => {
        if (!text) return;
        setActionError(null);
        try {
            setIsSpeaking(true);
            await speakWithQuickVoice(text, language);
        } catch (reason) {
            setActionError(reason instanceof Error ? reason.message : "QuickVoice could not generate speech.");
        } finally {
            setIsSpeaking(false);
        }
    };

    const handleSpeak = async () => {
        if (!lastOutput) return;
        setActionError(null);
        try {
            setIsSpeaking(true);
            await speakWithQuickVoice(lastOutput, LANGUAGE_CODE[outputLang]);
        } catch (reason) {
            setActionError(reason instanceof Error ? reason.message : "QuickVoice could not generate speech.");
        } finally {
            setIsSpeaking(false);
        }
    };

    // Shown on the card and used when the session is saved, so the name you
    // see while talking is the name it is filed under.
    const sessionTitle = recordMode
        ? `${inputLang.replace(" (US)", "")} Recording`
        : `${inputLang.replace(" (US)", "")} \u2194 ${outputLang.replace(" (US)", "")} Session`;

    const handleSaveSession = () => {
        if (isListening) stop();
        setSaveModalState('loading');
        const createdAt = new Date(sessionStartedAtRef.current).toISOString();
        const endedAt = new Date().toISOString();
        saveSession({
            id: crypto.randomUUID(),
            title: sessionTitle,
            // Recorded dictation and interpreted conversation are different
            // things and History lists them separately, so say which this was.
            // Before this they all went in as one-way/two-way and the two piles
            // could only be told apart by the title.
            mode: recordMode ? "recording" : isTwoWay ? "two-way" : "one-way",
            sourceLang: LANGUAGE_CODE[inputLang],
            targetLang: LANGUAGE_CODE[outputLang],
            folder: selectedFolder,
            utterances: allEntries.map((entry) => ({
                ...entry,
                // Two-way sessions contain turns in both languages. Stamping
                // them all with the configured input language mislabelled every
                // reply; fall back to it only when the turn has none of its own.
                sourceLang: asLanguage(entry.sourceLang, LANGUAGE_CODE[inputLang]),
                targetLang: asLanguage(entry.targetLang, LANGUAGE_CODE[outputLang]),
                createdAt: new Date().toISOString(),
            })),
            createdAt,
            endedAt,
            durationSeconds: Math.max(1, Math.round((Date.now() - sessionStartedAtRef.current) / 1000)),
            deletedAt: null,
        });
        clearDraft(draftScope);
        try { localStorage.removeItem(`quickvoice.web.draftOffered.v1.${draftScope}`); } catch { /* ignore */ }
        setRecoveredEntries([]);
        setManualEntries([]);
        setShowRecoveryNotice(false);
        reset();
        sessionStartedAtRef.current = Date.now();
        setSaveModalState('saved');
        alertInBackground("Session saved", "Your QuickVoice conversation is in History.");
    };

    const handleTogglePause = () => {
        if (isPaused) {
            void start();
            setIsPaused(false);
        } else if (isListening) {
            stop();
            setIsPaused(true);
        }
    };

    // One input, shared by both modes. In two-way it sits between the two
    // language columns rather than inside one of them: the turn it produces
    // is filed by language, so it does not belong to either side.
    const typedInput = (
                            <div className="flex items-end gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 focus-within:border-[rgb(var(--primary))]/60">
                                <textarea
                                    // While the microphone is open this shows what is being
                                    // heard right now, so you can see the words land before
                                    // the turn is finished.
                                    value={isListening && interimText ? interimText : typedText}
                                    readOnly={isListening && Boolean(interimText)}
                                    onChange={(event) => setTypedText(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && !event.shiftKey) {
                                            event.preventDefault();
                                            void handleTypedTranslation();
                                        }
                                    }}
                                    // Two-way accepts either language and files the turn by whichever it
                                        // detects, so naming one language here would be wrong.
                                        placeholder={isListening ? "Listening…" : isTwoWay ? "Type something…" : `Type in ${inputLang}…`}
                                    rows={1}
                                    className="min-h-9 max-h-24 flex-1 resize-none bg-transparent text-sm text-[rgb(var(--text))] outline-none placeholder:text-[rgba(var(--muted),0.8)]"
                                />
                                <button
                                    onClick={() => void handleTypedTranslation()}
                                    disabled={!typedText.trim() || isTranslating}
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary))] text-white transition disabled:cursor-not-allowed disabled:opacity-35"
                                    aria-label="Translate typed text with QuickVoice"
                                >
                                    {isTranslating ? <LoaderCircle size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
    );

    return (
        <div className="flex-1 min-h-0 bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 flex flex-col px-3 sm:px-6 py-4 [@media(max-height:700px)]:py-2 min-h-0">
                    <div className="w-full max-w-[1600px] mx-auto flex flex-col h-full gap-4 [@media(max-height:700px)]:gap-2 flex-1 min-h-0">
                    {/* Language rows / Panels */}
                    <div className="relative flex flex-col flex-1 min-h-0 rounded-[1.5rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] shadow-lg overflow-hidden">
                        {/* The two language headers stay side by side; the
                            conversation below runs as one sequence so a turn
                            and its translation stay together.

                            The row floats over the conversation on frosted
                            glass: a turn scrolling past is blurred out under it
                            instead of being chopped off at a hard edge. */}
                        <div
                            ref={langRowRef}
                            className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-[rgb(var(--surface-muted))]/70 px-4 pt-4 pb-2 sm:px-6 [@media(max-height:700px)]:pt-2 [@media(max-height:700px)]:pb-1.5 backdrop-blur-xl backdrop-saturate-150"
                        >
                            {/* One row: language in, how it is running, and
                                language out. Stacking these took a third of the
                                card for six words. */}
                            <div className="flex min-w-0 flex-1 items-center gap-2 text-[rgba(var(--text-secondary),1)]">
                                {isTwoWay
                                    ? <ArrowLeftRight size={14} className="shrink-0" />
                                    : <Mic size={14} className="shrink-0" />}
                                <select
                                    aria-label="Input language"
                                    value={inputLang}
                                    onChange={(e) => chooseInputLanguage(e.target.value)}
                                    className="min-w-0 max-w-full truncate bg-transparent text-[13px] font-medium text-[rgba(var(--text),0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
                                >
                                    {LANGUAGES.map((l) => (
                                        <option key={l} value={l} className="bg-[rgb(var(--surface-muted))]">
                                            {isTwoWay ? l : `Input: ${l}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {!recordMode && (
                                <button
                                    onClick={() => setIsTwoWay(!isTwoWay)}
                                    className="flex shrink-0 items-center gap-2 cursor-pointer focus:outline-none group"
                                    aria-label="Toggle two way conversation"
                                >
                                    <div className="w-11 h-6 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] flex items-center px-1 transition-all relative">
                                        {/* Inline transform on purpose: Tailwind's
                                            translate utility resolves through
                                            --tw-translate-y, which this route's CSS
                                            chunk never registers, so the declaration
                                            was dropped and the knob sat on the left
                                            in both modes. */}
                                        <div
                                            className="w-4 h-4 rounded-full bg-[rgb(var(--primary))] shadow-sm transition-transform duration-200 ease-in-out absolute left-1"
                                            style={{ transform: isTwoWay ? "translateX(20px)" : "translateX(0)" }}
                                        />
                                    </div>
                                    <span className={`hidden md:inline text-[13px] font-medium transition-colors ${isTwoWay ? 'text-[rgb(var(--primary))]' : 'text-[rgba(var(--muted),1)] group-hover:text-[rgba(var(--text-secondary),1)]'}`}>
                                        {isTwoWay ? "Two way" : "One way"}
                                    </span>
                                </button>
                            )}

                            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-[rgba(var(--text-secondary),1)]">
                                <select
                                    aria-label="Output language"
                                    value={outputLang}
                                    onChange={(e) => chooseOutputLanguage(e.target.value)}
                                    className="min-w-0 max-w-full truncate bg-transparent text-[13px] font-medium text-[rgba(var(--text),0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer text-right"
                                >
                                    {LANGUAGES.map((l) => (
                                        <option key={l} value={l} className="bg-[rgb(var(--surface-muted))]">
                                            {isTwoWay ? l : `Output: ${l}`}
                                        </option>
                                    ))}
                                </select>
                                <button onClick={() => void handleSpeak()} disabled={!lastOutput} className="shrink-0 rounded-full p-1.5 transition hover:bg-[rgba(var(--text),0.08)] disabled:opacity-30" aria-label="Play translation using QuickVoice voice">
                                    <Volume2 size={16} />
                                </button>
                            </div>
                        </div>

                        {recordMode ? (
                            /* Recording is dictation, not a conversation: one
                               microphone, one direction, running the whole time.

                               Two areas, and the split is the point. The blocks
                               hold only confirmed turns -- what was actually
                               heard and kept, and what History will show. The
                               strip underneath is the live transcript, still
                               being written and not yet accepted. Mixing the two
                               made it impossible to tell which lines were real. */
                            <div
                                style={{ paddingTop: langRowHeight + 16, paddingBottom: bottomBarHeight + 16 }}
                                className="flex min-h-0 flex-1 flex-col gap-3 px-5 sm:px-8 lg:px-10"
                            >
                                <div className="relative min-h-0 flex-1">
                                    {/* The two panels are drawn behind the text
                                        rather than wrapping each column, because
                                        two independent scrollers drift apart the
                                        moment one line wraps and the other does
                                        not -- and then nothing sits beside its
                                        own translation. One grid on top keeps
                                        every pair locked to the same row. */}
                                    <div className="pointer-events-none absolute inset-0 grid grid-cols-2 gap-6">
                                        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]/50" />
                                        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]/50" />
                                    </div>

                                    <div
                                        ref={recordScrollRef}
                                        className="relative h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(var(--text),0.1)]"
                                    >
                                        <div className="flex min-h-full flex-col justify-end">
                                            <div className={`grid grid-cols-2 gap-x-6 py-5 ${compactView ? "gap-y-3" : "gap-y-5"}`}>
                                                {allEntries.map((entry) => (
                                                    <Fragment key={entry.id}>
                                                        <p className="px-5 text-[15px] leading-relaxed tracking-wide text-[rgba(var(--text),0.9)]">
                                                            {entry.original}
                                                        </p>
                                                        <p className="px-5 text-right text-[15px] leading-relaxed tracking-wide text-[rgba(var(--text),0.85)]">
                                                            {entry.translation}
                                                        </p>
                                                    </Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Being heard right now. It moves up into the
                                    blocks when the turn is confirmed, and it is
                                    never saved: History holds accepted turns
                                    only. */}
                                {(interimText || liveTranslation) && (
                                    <div className="grid shrink-0 grid-cols-2 gap-x-6 rounded-2xl border border-dashed border-[rgb(var(--primary))]/35 bg-[rgb(var(--surface))]/30 py-2.5">
                                        <p className="px-5 text-[14px] leading-relaxed text-[rgba(var(--text),0.55)]">
                                            {interimText}
                                            {isListening && (
                                                <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] animate-pulse rounded-full bg-[rgb(var(--primary))] align-baseline" />
                                            )}
                                        </p>
                                        <p className="px-5 text-right text-[14px] leading-relaxed text-[rgba(var(--text-secondary),0.45)]">
                                            {liveTranslation}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <ConversationFlow
                                entries={allEntries}
                                leftLang={LANGUAGE_CODE[inputLang]}
                                interimText={interimText}
                                liveTranslation={liveTranslation}
                                isListening={isListening}
                                compact={compactView}
                                onPlay={speakText}
                                topInset={langRowHeight}
                                bottomInset={bottomBarHeight}
                            />
                        )}

                        {/* The typing box and the microphone sit on the card
                            itself, on the same frosted glass as the language
                            row. They used to take that height from the page
                            underneath, which is what kept the conversation
                            short. */}

                        {/* A slim line in the corner. As a paragraph-sized card
                            it covered the conversation it was talking about. */}
                        {showRecoveryNotice && (
                            <div
                                style={{ bottom: bottomBarHeight + 10 }}
                                className="absolute right-3 z-30 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-amber-500/30 bg-[rgb(var(--surface))] py-1.5 pl-3 pr-2 text-[12px] shadow-lg"
                            >
                                <span className="truncate text-[rgba(var(--text),0.85)]">
                                    {recoveredEntries.length} unsaved line{recoveredEntries.length === 1 ? "" : "s"} recovered — Save Session to keep {recoveredEntries.length === 1 ? "it" : "them"}
                                </span>
                                <button
                                    onClick={() => { clearDraft(draftScope); setRecoveredEntries([]); setShowRecoveryNotice(false); }}
                                    className="shrink-0 text-[rgba(var(--muted),1)] underline underline-offset-2 transition hover:text-[rgb(var(--text))]"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={() => setShowRecoveryNotice(false)}
                                    aria-label="Dismiss"
                                    className="shrink-0 rounded-full p-0.5 text-[rgba(var(--muted),1)] transition hover:text-[rgb(var(--text))]"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        )}

                        <div
                            ref={bottomBarRef}
                            className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center bg-[rgb(var(--surface-muted))]/70 px-4 pb-2 backdrop-blur-xl backdrop-saturate-150"
                        >
                        {/* One row: type, or press the microphone. The status
                            line under it said "TAP TO SPEAK" next to a button
                            that already says so. */}
                        <div className="flex w-full max-w-3xl items-end gap-2 pt-2">
                            {!recordMode && (
                                <div className="min-w-0 flex-1">
                                    {!isTwoWay && (
                                        <div className="mb-1.5 pl-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgba(var(--muted),1)]">
                                            Input · {inputLang}
                                        </div>
                                    )}
                                    {typedInput}
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    if (isListening) {
                                        playCue("stop");
                                        stop();
                                    } else {
                                        playCue("start");
                                        setIsPaused(false);
                                        void start();
                                    }
                                }}
                                className={`relative ${recordMode ? "h-16 w-16" : "h-12 w-12"} shrink-0 rounded-full ${!recordMode ? "mb-2" : "mx-auto"} transition-colors flex items-center justify-center text-white ${isListening ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.35)] before:absolute before:inset-0 before:rounded-full before:border-2 before:border-red-400 before:animate-ping" : "bg-[rgb(var(--primary))] shadow-[0_0_30px_rgba(var(--primary),0.3)]"}`}
                                aria-label={isListening ? "Stop session" : "Start session"}
                            >
                                {isListening
                                    ? <Square size={recordMode ? 22 : 18} className="relative z-10 fill-current" />
                                    : <Mic size={recordMode ? 26 : 20} />}
                            </button>
                        </div>
                        {/* Only while something is actually happening. The
                            old line said "Idle" at rest, which was noise; with
                            nothing at all there was no way to tell whether it
                            had heard you. */}
                        {(isListening || interimText) && !error && !actionError && (
                            <p className="pt-1.5 text-[11px] font-medium tracking-wide text-[rgb(var(--primary))]/80">
                                {interimText && !isListening ? "Translating…" : "Listening…"}
                            </p>
                        )}
                        {(error || actionError) && (
                            <div className="mt-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-400 text-center max-w-sm">
                                {error || actionError}
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Bottom control bar */}
                    <div className="mx-auto w-full max-w-3xl rounded-full bg-[rgb(var(--surface))] border border-[rgb(var(--border))] px-3 sm:px-6 py-3 [@media(max-height:700px)]:py-2 flex items-center justify-between shadow-xl mt-3 [@media(max-height:700px)]:mt-1 flex-shrink-0">
                        <ControlButton
                            icon={<FileText size={18} />}
                            label="View Transcript"
                            onClick={() => setShowTranscript((s) => !s)}
                        />
                        <div className="w-px h-6 bg-[rgba(var(--text),0.05)]" />
                        <ControlButton
                            icon={<Square size={16} className="fill-current" />}
                            label="Save Session"
                            onClick={handleSaveSession}
                            variant="danger"
                        />
                        <div className="w-px h-6 bg-[rgba(var(--text),0.05)]" />
                        <ControlButton
                            icon={isPaused ? <Play size={18} /> : <Pause size={18} />}
                            label={isPaused ? "Resume Session" : "Pause Session"}
                            onClick={handleTogglePause}
                        />
                        <div className="w-px h-6 bg-[rgba(var(--text),0.05)]" />
                        <ControlButton
                            icon={isMuted ? <MicOff size={18} /> : <Mic size={18} className="opacity-40" />}
                            label={isMuted ? "Unmute" : "Mute"}
                            onClick={() => setIsMuted((m) => !m)}
                        />
                    </div>

                    </div>
                </div>

                {/* Transcript Sidebar */}
                {showTranscript && (
                    <div className="w-full max-w-[400px] border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] flex flex-col h-full shadow-2xl shrink-0 absolute right-0 top-0 bottom-0 z-50 md:relative">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border))] shrink-0">
                            <h2 className="text-[15px] font-semibold text-[rgba(var(--text),0.9)] tracking-wide">Live Interpreting</h2>
                            <button onClick={() => setShowTranscript(false)} className="text-[rgba(var(--muted),1)] hover:text-[rgb(var(--text))] transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(var(--text),0.1)] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(var(--text),0.2)]">
                            {allEntries.map((entry) => (
                                <div key={entry.id} className="flex flex-col gap-5 border-b border-[rgb(var(--border))] pb-8 last:border-0 last:pb-0">
                                    <div className="flex flex-col gap-2 relative group">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold tracking-wider text-[rgb(var(--primary))] uppercase">{inputLang}</span>
                                            <span className="text-[10px] text-[rgba(var(--muted),0.8)]">10:42:01</span>
                                        </div>
                                        <p className="text-[14px] text-[rgba(var(--text),0.8)] leading-relaxed pr-4">{entry.original}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 relative group">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold tracking-wider text-[rgba(var(--muted),1)] uppercase">{outputLang}</span>
                                            <span className="text-[10px] text-[rgba(var(--muted),0.8)]">10:42:03</span>
                                        </div>
                                        <p className="text-[14px] text-[rgba(var(--text),0.8)] leading-relaxed pr-4">{entry.translation}</p>
                                        {entry.nuances && entry.nuances.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {entry.nuances.map((nuance, i) => (
                                                    <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${nuance.color}`}>
                                                        {nuance.text}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={transcriptEndRef} />
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-[rgb(var(--border))] shrink-0 flex gap-4">
                            <button className="flex-1 flex items-center justify-center gap-2 bg-[rgba(var(--text),0.05)] hover:bg-[rgba(var(--text),0.1)] text-[rgba(var(--text),0.8)] transition-colors py-2.5 rounded-lg text-[13px] font-medium border border-[rgb(var(--border))]">
                                <Copy size={16} /> Copy
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 bg-[rgba(var(--text),0.05)] hover:bg-[rgba(var(--text),0.1)] text-[rgba(var(--text),0.8)] transition-colors py-2.5 rounded-lg text-[13px] font-medium border border-[rgb(var(--border))]">
                                <Download size={16} /> Download
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Save Session Modal Overlay */}
            {saveModalState !== 'hidden' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-[1.5rem] p-6 w-full max-w-lg shadow-2xl flex flex-col gap-6">
                        {saveModalState === 'loading' ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-5">
                                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                <p className="text-[rgba(var(--text-secondary),1)] font-medium tracking-wide">Saving session...</p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-[16px] font-semibold text-[rgba(var(--text),0.9)] tracking-wide">Saved Session</h2>
                                
                                <div className="flex flex-col border border-[rgb(var(--border))] rounded-2xl bg-[rgb(var(--surface))] overflow-hidden mt-2">
                                    {/* Top half: Languages */}
                                    <div className="p-5 flex items-center justify-center border-b border-[rgb(var(--border))] px-8">
                                        <div className="flex items-center gap-3 flex-1 justify-end pr-8">
                                            <img src="/jp.png" alt="Japanese Flag" className="h-5 object-contain" />
                                            <span className="text-[14px] font-medium text-[rgba(var(--text),0.9)]">Japanese</span>
                                        </div>
                                        <ArrowLeftRight size={16} className="text-[rgba(var(--muted),1)] shrink-0" />
                                        <div className="flex items-center gap-3 flex-1 justify-start pl-8">
                                            <img src="/us.png" alt="US Flag" className="h-5 object-contain scale-[1.6]" />
                                            <span className="text-[14px] font-medium text-[rgba(var(--text),0.9)]">English(US)</span>
                                        </div>
                                    </div>

                                    {/* Bottom half: Time & Date */}
                                    <div className="flex items-center">
                                        <div className="flex-1 flex items-center justify-center gap-2 p-4 border-r border-[rgb(var(--border))]">
                                            <Clock size={16} className="text-[rgba(var(--muted),1)]" />
                                            <span className="text-[13px] font-medium text-[rgba(var(--text),0.9)]">12:03</span>
                                        </div>
                                        <div className="flex-[1.5] flex items-center justify-center gap-2 p-4">
                                            <Calendar size={16} className="text-[rgba(var(--muted),1)]" />
                                            <span className="text-[13px] font-medium text-[rgba(var(--text),0.9)]">July 8, 2026 &nbsp;&nbsp; 03:42 pm</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Folder Picker */}
                                <div className="relative mt-2">
                                    <button 
                                        onClick={() => setIsFolderPickerOpen(!isFolderPickerOpen)}
                                        className="w-full flex items-center justify-between p-4 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl hover:bg-[rgba(var(--text),0.05)] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Folder size={18} className="text-[rgba(var(--muted),1)]" />
                                            <span className={`text-[14px] font-medium ${selectedFolder ? 'text-[rgba(var(--text),0.9)]' : 'text-[rgba(var(--muted),1)]'}`}>
                                                {selectedFolder || "Move to Folder (Optional)"}
                                            </span>
                                        </div>
                                        <ChevronDown size={16} className={`text-[rgba(var(--muted),1)] transition-transform ${isFolderPickerOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isFolderPickerOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl overflow-hidden z-10 shadow-xl">
                                            <div className="flex flex-col max-h-[200px] overflow-y-auto">
                                                {folders.map((folder) => (
                                                    <button
                                                        key={folder}
                                                        onClick={() => {
                                                            setSelectedFolder(folder);
                                                            setIsFolderPickerOpen(false);
                                                        }}
                                                        className="flex items-center gap-3 p-4 hover:bg-[rgba(var(--text),0.05)] transition-colors border-b border-[rgb(var(--border))] text-left"
                                                    >
                                                        <Folder size={16} className="text-[rgba(var(--muted),1)]" />
                                                        <span className="text-[14px] font-medium text-[rgba(var(--text),0.9)]">{folder}</span>
                                                    </button>
                                                ))}
                                                <button className="flex items-center gap-3 p-4 hover:bg-[rgba(var(--text),0.05)] transition-colors text-left text-[rgb(var(--primary))]">
                                                    <Plus size={16} />
                                                    <span className="text-[14px] font-medium">New Folder</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 mt-4">
                                    <button 
                                        onClick={() => setSaveModalState('hidden')}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-transparent hover:bg-[rgba(var(--text),0.05)] transition-colors text-[13px] font-medium border border-[rgb(var(--border))] text-[rgba(var(--text),0.8)]"
                                    >
                                        <ArrowLeft size={16} /> Go Back
                                    </button>
                                    <Link href="/allrecords" className="flex-[1.2] flex items-center justify-center gap-2 py-3 rounded-xl bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-pressed))] transition-colors text-[13px] font-medium text-[rgb(var(--text))]">
                                        Recordings <ArrowRight size={16} />
                                    </Link>
                                    <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-transparent hover:bg-[rgba(var(--text),0.05)] transition-colors text-[13px] font-medium border border-[rgb(var(--border))] text-[rgba(var(--text),0.8)]">
                                        <Download size={16} /> Download
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

            /**
             * The conversation, in the order it happened.
             *
             * Mirrors the mobile session screen: one list, and each turn sits on
             * the side of the language it was spoken in. The turn carries its own
             * translation, so "this line became that line" is visible without
             * having to match up two columns that scroll independently -- which
             * is what made the old two-column view confusing.
             */
            function ConversationFlow({
                entries,
                leftLang,
                interimText,
                liveTranslation,
                isListening,
                compact,
                onPlay,
                topInset,
                bottomInset,
}: {
                entries: { id: string; original: string; translation: string; sourceLang?: string; targetLang?: string; nuances?: { text: string; color: string }[] }[];
            leftLang: string;
            interimText: string;
            liveTranslation: string;
            isListening: boolean;
            /** Denser cards, from the Compact view switch in Settings. */
            compact: boolean;
            /** Speak one turn's translation, the way the phone's cards do. */
            onPlay: (text: string, language: QuickVoiceLanguage) => void;
            /** Height of the floating language row, so the first turn starts
             *  below it instead of underneath it. */
            topInset: number;
            /** Same for the typing box and microphone floating at the bottom. */
            bottomInset: number;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const liveSourceLanguage = interimText ? detectLanguage(interimText) : asLanguage(leftLang, "en");
    const liveOnLeft = liveSourceLanguage === leftLang;

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [entries.length, interimText, liveTranslation]);

    const label = (code?: string) =>
                    code === "ja" ? "Japanese" : code === "en" ? "English" : "";

    return (
                    <div
                        ref={scrollRef}
                        style={{ paddingTop: topInset + 28, paddingBottom: bottomInset + 72 }}
                        className="flex-1 overflow-y-auto min-h-0 px-5 sm:px-8 lg:px-10 flex flex-col [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(var(--text),0.1)] [&::-webkit-scrollbar-thumb]:rounded-full"
                    >
                        {/* The turns sit at the bottom of the card and grow
                            upward, the way a conversation does. Stacked from the
                            top instead, the first line landed tight under the
                            language row with a page of emptiness beneath it.
                            The auto margin does it rather than justify-end,
                            which makes the top of an overflowing list
                            unreachable in some browsers. */}
                        <div className={`mt-auto flex flex-col ${compact ? "gap-3" : "gap-6"}`}>
                        {entries.map((entry) => {
                            const sourceLanguage = sourceLanguageOf(entry);
                            const targetLanguage: QuickVoiceLanguage = sourceLanguage === "ja" ? "en" : "ja";
                            const onLeft = sourceLanguage === leftLang;
                            return (
                                // A fixed half-width, rather than shrink-to-fit,
                                // so a short turn still fills its language side
                                // instead of leaving the column mostly empty.
                                <div key={entry.id} className={`flex ${onLeft ? "justify-start sm:pl-[4%] conversation-turn-left" : "justify-end sm:pr-[4%] conversation-turn-right"}`}>
                                    <div className={`w-[88%] sm:w-[44%] lg:w-[40%] max-w-[640px] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm transition-[border-color,box-shadow,transform] duration-300 ease-out ${compact ? "px-3 py-2 sm:px-4 sm:py-2.5" : "px-4 py-3 sm:px-5 sm:py-3.5"}`}>
                                        {/* Same header as the phone's cards: the
                                            language on the inside, a round play
                                            button on the outer edge, so any turn
                                            can be heard again -- not only the
                                            most recent one. */}
                                        <div className={`mb-1.5 flex items-center gap-2 ${onLeft ? "" : "flex-row-reverse"}`}>
                                            <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgba(var(--muted),1)]">
                                                {label(sourceLanguage)}
                                            </span>
                                            {entry.translation && (
                                                <button
                                                    onClick={() => onPlay(entry.translation, targetLanguage)}
                                                    aria-label={`Play the ${label(targetLanguage)} translation`}
                                                    title="Play translation"
                                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary))] text-white shadow-sm transition hover:opacity-90"
                                                >
                                                    <Play size={12} className="fill-current" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[15px] leading-relaxed text-[rgba(var(--text),0.95)]">
                                            {entry.original}
                                        </p>
                                        {entry.translation && (
                                            <>
                                                <div className="my-2 border-t border-[rgb(var(--border))]" />
                                                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgba(var(--muted),1)] mb-1">
                                                    {label(targetLanguage)}
                                                </div>
                                                <p className="text-[15px] leading-relaxed text-[rgba(var(--text-secondary),1)]">
                                                    {entry.translation}
                                                </p>
                                            </>
                                        )}
                                        {entry.nuances && entry.nuances.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {entry.nuances.map((n, i) => (
                                                    <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${n.color}`}>
                                                        {n.text}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* What is being said right now, before the turn is final. */}
                        {(interimText || liveTranslation) && (
                            <div className={`flex ${liveOnLeft ? "justify-start sm:pl-[4%] conversation-turn-left" : "justify-end sm:pr-[4%] conversation-turn-right"}`}>
                                <div className="w-[88%] sm:w-[44%] lg:w-[40%] max-w-[640px] rounded-2xl border border-dashed border-[rgb(var(--primary))]/40 px-4 py-3 sm:px-5 sm:py-3.5">
                                    {interimText && (
                                        <p className="text-[15px] italic text-[rgba(var(--text-secondary),0.75)]">{interimText}</p>
                                    )}
                                    {liveTranslation && (
                                        <p className="mt-1 text-[15px] italic text-[rgba(var(--text-secondary),0.55)]">{liveTranslation}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
    );
}

            function TranscriptCard({
                entries,
                langKey,
                align = "left",
                columnLang,
}: {
                entries: { id: string; original: string; translation: string; sourceLang?: string; targetLang?: string; nuances?: { text: string; color: string }[] }[];
            langKey: "original" | "translation";
            align?: "left" | "right";
            /** In two-way mode each column belongs to one language. A turn puts
             *  its original in the language it was spoken and its translation in
             *  the other, so a column shows whichever half is in its language --
             *  the same rule the mobile app uses to pick a lane. Undefined keeps
             *  the one-way behaviour: originals left, translations right. */
            columnLang?: string;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // A turn with no reported language (an older saved session) falls back to
    // the one-way split rather than vanishing from both columns.
    const textFor = (entry: { original: string; translation: string; sourceLang?: string }) =>
        columnLang && entry.sourceLang
            ? (entry.sourceLang === columnLang ? entry.original : entry.translation)
            : entry[langKey];
    const isTranslation = (entry: { sourceLang?: string }) =>
        columnLang && entry.sourceLang ? entry.sourceLang !== columnLang : langKey === "translation";

    useEffect(() => {
        if (scrollRef.current) {
                    scrollRef.current.scrollTo({
                        top: scrollRef.current.scrollHeight,
                        behavior: "smooth",
                    });
        }
    }, [entries]);

                return (
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(var(--text),0.1)] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(var(--text),0.2)] flex flex-col"
                >
                    <div className="flex-1 flex flex-col justify-end">
                        <div className="flex flex-col space-y-5 pt-10">
                            {entries.map((entry) => (
                                <div key={entry.id} className="flex flex-col gap-1">
                                    <p
                                        className={`text-[15px] leading-relaxed tracking-wide ${align === "right" ? "text-right text-[rgba(var(--text-secondary),1)]" : "text-[rgba(var(--text),0.9)]"
                                            }`}
                                    >
                                        {textFor(entry)}
                                    </p>
                                    {isTranslation(entry) && entry.nuances && entry.nuances.length > 0 && (
                                        <div className={`mt-1 flex flex-wrap gap-2 ${align === "right" ? "justify-end" : "justify-start"}`}>
                                            {entry.nuances.map((nuance, i) => (
                                                <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${nuance.color}`}>
                                                    {nuance.text}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                );
}

                function ControlButton({
                    icon,
                    label,
                    onClick,
                    variant = "default",
}: {
                    icon: React.ReactNode;
                label: string;
    onClick: () => void;
                variant?: "default" | "danger";
}) {
    return (
                <button
                    onClick={onClick}
                    className={`flex items-center gap-3 px-4 py-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${variant === "danger"
                        ? "text-red-400 hover:bg-red-500/10"
                        : "text-[rgba(var(--text-secondary),1)] hover:bg-[rgba(var(--text),0.05)] hover:text-[rgb(var(--text))]"
                        }`}
                >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                </button>
                );
}
