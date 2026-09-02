"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, MessageSquare, Volume2, FileText, Square, Pause, Play, MicOff, X, Copy, Download, ArrowLeftRight, Clock, Calendar, ArrowLeft, ArrowRight, Folder, ChevronDown, Plus, Send, LoaderCircle, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useLiveInterpretation } from "@/hooks/useLiveInterpretation";
import { speakWithQuickVoice, translateWithQuickVoice, type QuickVoiceLanguage } from "@/lib/quickvoice-api";
import { clearDraft, loadDraft, loadFolders, saveDraft, saveSession } from "@/lib/session-store";

const LANGUAGES = ["English (US)", "Japanese"];
const LANGUAGE_CODE: Record<string, QuickVoiceLanguage> = {
    "English (US)": "en",
    Japanese: "ja",
};

type InterpreterMode = "oneway" | "twoway";

function readModeFromUrl(): InterpreterMode | null {
    if (typeof window === "undefined") return null;
    const param = new URLSearchParams(window.location.search).get("mode");
    return param === "oneway" || param === "twoway" ? param : null;
}

export default function InterpreterPage() {
    const router = useRouter();
    const [inputLang, setInputLang] = useState("English (US)");
    const [outputLang, setOutputLang] = useState("Japanese");
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [typedText, setTypedText] = useState("");
    const [manualEntries, setManualEntries] = useState<Array<{ id: string; original: string; translation: string }>>([]);
    // Anything recovered from a recording that was cut short before it was saved.
    const [recoveredEntries, setRecoveredEntries] = useState<Array<{ id: string; original: string; translation: string }>>([]);
    const [showRecoveryNotice, setShowRecoveryNotice] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    // The mode is chosen once (on the Home page, or on the gate below) and
    // carried in the URL. It is never toggled from inside the interpreter.
    // Starts null on both server and first client render (avoids a
    // hydration mismatch from reading the URL before mount) and is filled
    // in immediately after mount.
    const [mode, setMode] = useState<InterpreterMode | null>(null);
    useEffect(() => {
        setMode(readModeFromUrl());
    }, []);
    const isTwoWay = mode === "twoway";
    const [saveModalState, setSaveModalState] = useState<'hidden' | 'loading' | 'saved'>('hidden');
    const [showTranscript, setShowTranscript] = useState(false);
    const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('folder');
        }
        return null;
    });
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
    // Mirrors the mobile SessionScreen status line: same wording, same order of
    // precedence. The web build used to show only "AI Live Sync Enabled" /
    // "Sync Paused", which described the microphone but read as data sync.
    const statusLabel = isSpeaking
        ? "SPEAKING…"
        : isTranslating || (!isListening && interimText.trim())
            ? "TRANSLATING…"
            : isListening && !isPaused
                ? "LISTENING…"
                : isListening && isPaused
                    ? "PAUSED"
                    : "TAP ● TO SPEAK";
    const lastOutput = liveTranslation || allEntries.at(-1)?.translation || "";

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [allEntries.length, showTranscript]);

    // Offer back a recording that ended without being saved. A session can run
    // for half an hour, and until now a reload threw all of it away.
    useEffect(() => {
        const draft = loadDraft();
        if (!draft) return;
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
            utterances: allEntries.map(({ id, original, translation }) => ({ id, original, translation })),
        });
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
        try {
            const translation = await translateWithQuickVoice(
                text,
                LANGUAGE_CODE[inputLang],
                LANGUAGE_CODE[outputLang],
            );
            setManualEntries((current) => [...current, { id: `typed-${Date.now()}`, original: text, translation }]);
            setTypedText("");
            if (!isMuted) {
                setIsSpeaking(true);
                try {
                    await speakWithQuickVoice(translation, LANGUAGE_CODE[outputLang]);
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

    const handleSaveSession = () => {
        if (isListening) stop();
        setSaveModalState('loading');
        const createdAt = new Date(sessionStartedAtRef.current).toISOString();
        const endedAt = new Date().toISOString();
        saveSession({
            id: crypto.randomUUID(),
            title: `${inputLang.replace(" (US)", "")} ↔ ${outputLang.replace(" (US)", "")} Session`,
            mode: isTwoWay ? "two-way" : "one-way",
            sourceLang: LANGUAGE_CODE[inputLang],
            targetLang: LANGUAGE_CODE[outputLang],
            folder: selectedFolder,
            utterances: allEntries.map((entry) => ({
                ...entry,
                sourceLang: LANGUAGE_CODE[inputLang],
                targetLang: LANGUAGE_CODE[outputLang],
                createdAt: new Date().toISOString(),
            })),
            createdAt,
            endedAt,
            durationSeconds: Math.max(1, Math.round((Date.now() - sessionStartedAtRef.current) / 1000)),
            deletedAt: null,
        });
        clearDraft();
        setRecoveredEntries([]);
        setManualEntries([]);
        setShowRecoveryNotice(false);
        reset();
        sessionStartedAtRef.current = Date.now();
        setSaveModalState('saved');
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

    const chooseMode = (chosen: InterpreterMode) => {
        setMode(chosen);
        const params = new URLSearchParams(window.location.search);
        params.set("mode", chosen);
        router.replace(`/interpreter?${params.toString()}`);
    };

    // No mode was passed in from the Home page (e.g. the navbar's "Live
    // Interpreter" link, or an old bookmark) — ask once, up front, instead of
    // defaulting silently. This keeps mode selection a single pre-entry step
    // for every path into the interpreter, not just the dashboard cards.
    if (mode === null) {
        return (
            <div className="h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col overflow-hidden">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                    <h1 className="text-2xl font-semibold tracking-tight">Choose Interpreter Mode</h1>
                    <p className="text-[rgba(var(--muted),1)] mt-1 text-sm mb-8 text-center max-w-sm">
                        Select how you&apos;d like to interpret. You won&apos;t need to switch modes once you start.
                    </p>
                    <div className="w-full max-w-[680px] grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <button
                            onClick={() => chooseMode("oneway")}
                            className="flex flex-col items-center text-center gap-4 p-8 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl hover:border-[rgb(var(--primary))]/50 hover:bg-[rgba(var(--text),0.03)] transition-colors group"
                        >
                            <div className="h-14 w-14 rounded-full bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] flex items-center justify-center">
                                <Mic size={24} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[16px] font-semibold text-[rgba(var(--text),0.9)]">One-Way Interpreter</span>
                                <span className="text-[13px] text-[rgba(var(--muted),1)]">Speeches and uninterrupted listening</span>
                            </div>
                            <span className="flex items-center gap-1 text-[13px] font-medium text-[rgb(var(--primary))] opacity-0 group-hover:opacity-100 transition-opacity">
                                Select <ChevronRight size={14} />
                            </span>
                        </button>
                        <button
                            onClick={() => chooseMode("twoway")}
                            className="flex flex-col items-center text-center gap-4 p-8 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl hover:border-[rgb(var(--emerald))]/50 hover:bg-[rgba(var(--text),0.03)] transition-colors group"
                        >
                            <div className="h-14 w-14 rounded-full bg-[rgb(var(--emerald))]/10 text-[rgb(var(--emerald))] flex items-center justify-center">
                                <MessageSquare size={24} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[16px] font-semibold text-[rgba(var(--text),0.9)]">Two-Way Conversation</span>
                                <span className="text-[13px] text-[rgba(var(--muted),1)]">Real-time bilingual conversation</span>
                            </div>
                            <span className="flex items-center gap-1 text-[13px] font-medium text-[rgb(var(--emerald))] opacity-0 group-hover:opacity-100 transition-opacity">
                                Select <ChevronRight size={14} />
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col overflow-hidden">
            <Navbar />
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 flex flex-col px-6 py-4 min-h-0">
                    <div className="w-full max-w-[1600px] mx-auto flex flex-col h-full gap-4 flex-1 min-h-0">
                    <div className="text-center mb-2 flex flex-col items-center flex-shrink-0">
                        <h1 className="text-2xl font-semibold tracking-tight">Start Interpreting</h1>
                        <p className="text-[rgba(var(--muted),1)] mt-1 text-sm mb-3">
                            {isTwoWay ? "Real-time bilingual conversation" : "Speeches and uninterrupted listening"}
                        </p>

                        {/* Mode indicator — set on the Home page, fixed for this session */}
                        <div
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${isTwoWay
                                ? "border-[rgb(var(--emerald))]/30 bg-[rgb(var(--emerald))]/10 text-[rgb(var(--emerald))]"
                                : "border-[rgb(var(--primary))]/30 bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
                                }`}
                        >
                            {isTwoWay ? <MessageSquare size={14} /> : <Mic size={14} />}
                            {isTwoWay ? "Two-Way Conversation" : "One-Way Interpreter"}
                        </div>
                    </div>

                    {/* Language rows / Panels */}
                    <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                        {/* Input side */}
                        <div className="rounded-[1.5rem] bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] p-6 flex flex-col relative shadow-lg min-h-0">
                            <div className="flex flex-col gap-2 mb-6 flex-shrink-0">
                                <div className="flex items-center gap-2 text-[rgba(var(--text-secondary),1)]">
                                    <Mic size={14} />
                                    <select
                                        aria-label="Input language"
                                        value={inputLang}
                                        onChange={(e) => chooseInputLanguage(e.target.value)}
                                        className="bg-transparent text-[13px] font-medium text-[rgba(var(--text),0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
                                    >
                                        {LANGUAGES.map((l) => (
                                            <option key={l} value={l} className="bg-[rgb(var(--surface-muted))]">
                                                Input: {l}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 pl-6">
                                    <Waveform active={isListening && !isPaused} />
                                    <span className="text-[11px] font-medium text-[rgb(var(--primary))]/80 tracking-wide">
                                        {isPaused
                                            ? "Paused"
                                            : isListening
                                                ? "Active Listening..."
                                                : "Idle"}
                                    </span>
                                </div>
                            </div>
                            {isTwoWay ? (
                                <div className="flex-1 min-h-0 flex items-center justify-center">
                                    <p className="text-[13px] text-[rgba(var(--muted),0.6)] italic text-center px-6">
                                        Only the translated conversation is shown
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <TranscriptCard entries={allEntries} langKey="original" />
                                    {interimText && isListening && (
                                        <div className="mt-3 text-[14px] text-[rgba(var(--text-secondary),0.7)] italic pl-6 border-l-2 border-[rgb(var(--primary))]/40">
                                            {interimText}
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="mt-4 flex items-end gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 focus-within:border-[rgb(var(--primary))]/60">
                                <textarea
                                    value={typedText}
                                    onChange={(event) => setTypedText(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && !event.shiftKey) {
                                            event.preventDefault();
                                            void handleTypedTranslation();
                                        }
                                    }}
                                    placeholder={`Type in ${inputLang}…`}
                                    rows={2}
                                    className="min-h-12 flex-1 resize-none bg-transparent text-sm text-[rgb(var(--text))] outline-none placeholder:text-[rgba(var(--muted),0.8)]"
                                />
                                <button
                                    onClick={() => void handleTypedTranslation()}
                                    disabled={!typedText.trim() || isTranslating}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary))] text-white transition disabled:cursor-not-allowed disabled:opacity-35"
                                    aria-label="Translate typed text with QuickVoice"
                                >
                                    {isTranslating ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Output side */}
                        <div className="rounded-[1.5rem] bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] p-6 flex flex-col relative shadow-lg min-h-0">
                            <div className="flex flex-col gap-2 mb-6 items-end flex-shrink-0">
                                <div className="flex items-center justify-end gap-2 text-[rgba(var(--text-secondary),1)]">
                                    <select
                                        aria-label="Output language"
                                        value={outputLang}
                                        onChange={(e) => chooseOutputLanguage(e.target.value)}
                                        className="bg-transparent text-[13px] font-medium text-[rgba(var(--text),0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer text-right"
                                    >
                                        {LANGUAGES.map((l) => (
                                            <option key={l} value={l} className="bg-[rgb(var(--surface-muted))]">
                                                Output: {l}
                                            </option>
                                        ))}
                                    </select>
                                    <button onClick={() => void handleSpeak()} disabled={!lastOutput} className="rounded-full p-1.5 transition hover:bg-[rgba(var(--text),0.08)] disabled:opacity-30" aria-label="Play translation using QuickVoice voice">
                                        <Volume2 size={16} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-end gap-2 pr-6">
                                    <span className="text-[11px] font-medium text-[rgb(var(--primary))]/80 tracking-wide">
                                        {isMuted ? "Muted" : "Synthesizing Voice..."}
                                    </span>
                                    <Waveform active={isListening && !isPaused && !isMuted} />
                                </div>
                            </div>
                            <TranscriptCard entries={allEntries} langKey="translation" align="right" />
                            {liveTranslation && isListening && (
                                <div className="mt-3 text-[14px] text-right text-[rgba(var(--text-secondary),0.7)] italic pr-6 border-r-2 border-[rgb(var(--primary))]/40">
                                    {liveTranslation}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center mic + status */}
                    <div className="flex flex-col items-center justify-center mt-2 flex-shrink-0">
                        <button
                            onClick={() => {
                                if (isListening) {
                                    stop();
                                } else {
                                    setIsPaused(false);
                                    void start();
                                }
                            }}
                            className={`relative h-16 w-16 rounded-full transition-colors flex items-center justify-center text-white ${isListening ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.35)] before:absolute before:inset-0 before:rounded-full before:border-2 before:border-red-400 before:animate-ping" : "bg-[rgb(var(--primary))] shadow-[0_0_30px_rgba(var(--primary),0.3)]"}`}
                            aria-label={isListening ? "Stop session" : "Start session"}
                        >
                            {isListening ? <Square size={20} className="relative z-10 fill-current" /> : <Mic size={26} />}
                        </button>
                        {showRecoveryNotice && (
                            <div className="mt-3 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[13px] text-amber-500 text-center max-w-sm">
                                Recovered {recoveredEntries.length} line{recoveredEntries.length === 1 ? "" : "s"} from a session that was never saved. Press Save Session to keep them.
                                <button
                                    onClick={() => { clearDraft(); setRecoveredEntries([]); setShowRecoveryNotice(false); }}
                                    className="ml-2 underline underline-offset-2 hover:opacity-80"
                                >
                                    Discard
                                </button>
                            </div>
                        )}
                        {(error || actionError) && (
                            <div className="mt-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[13px] text-red-400 text-center max-w-sm">
                                {error || actionError}
                            </div>
                        )}
                        {!error && !actionError && (
                            <div className="mt-4 text-[12px] font-semibold tracking-[0.08em] text-[#6E7785] dark:text-[rgba(var(--text),0.55)]">
                                {statusLabel}
                            </div>
                        )}
                    </div>

                    {/* Bottom control bar */}
                    <div className="mx-auto w-full max-w-3xl rounded-full bg-[rgb(var(--surface))] border border-[rgb(var(--border))] px-6 py-4 flex items-center justify-between shadow-xl mt-4 flex-shrink-0">
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
                    <div className="w-[400px] border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] flex flex-col h-full shadow-2xl shrink-0 absolute right-0 top-0 bottom-0 z-50 md:relative">
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
                                    {!isTwoWay && (
                                        <div className="flex flex-col gap-2 relative group">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold tracking-wider text-[rgb(var(--primary))] uppercase">{inputLang}</span>
                                                <span className="text-[10px] text-[rgba(var(--muted),0.8)]">10:42:01</span>
                                            </div>
                                            <p className="text-[14px] text-[rgba(var(--text),0.8)] leading-relaxed pr-4">{entry.original}</p>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2 relative group">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold tracking-wider text-[rgba(var(--muted),1)] uppercase">{outputLang}</span>
                                            <span className="text-[10px] text-[rgba(var(--muted),0.8)]">10:42:03</span>
                                        </div>
                                        <p className="text-[14px] text-[rgba(var(--text),0.8)] leading-relaxed pr-4">{entry.translation}</p>
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

            function Waveform({active}: {active: boolean }) {
    const bars = [6, 12, 18, 12, 6];
            return (
            <div className="flex items-end gap-[3px] h-4">
                {bars.map((h, i) => (
                    <span
                        key={i}
                        className={`w-[3px] rounded-full bg-[rgb(var(--primary))] ${active ? "animate-pulse" : "opacity-20"
                            }`}
                        style={{
                            height: `${h}px`,
                            animationDelay: `${i * 100}ms`,
                        }}
                    />
                ))}
            </div>
            );
}

            function TranscriptCard({
                entries,
                langKey,
                align = "left",
}: {
                entries: { id: string; original: string; translation: string }[];
            langKey: "original" | "translation";
            align?: "left" | "right";
}) {
    const scrollRef = useRef<HTMLDivElement>(null);

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
                                <p
                                    key={entry.id}
                                    className={`text-[15px] leading-relaxed tracking-wide ${align === "right" ? "text-right text-[rgba(var(--text-secondary),1)]" : "text-[rgba(var(--text),0.9)]"
                                        }`}
                                >
                                    {entry[langKey]}
                                </p>
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
