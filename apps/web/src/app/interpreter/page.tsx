"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Mic, Volume2, FileText, Square, Pause, Play, MicOff, X, Copy, Download, ArrowLeftRight, Clock, Calendar, ArrowLeft, ArrowRight, Folder, ChevronDown, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const LANGUAGES = [
    "English (US)",
    "Japanese",
    "Spanish",
    "French",
    "German",
    "Mandarin",
    "Korean",
];

type TranscriptLine = {
    id: number;
    source: string;
    translated: string;
};

const DEMO_LINES: Omit<TranscriptLine, "id">[] = [
    {
        source: "Hello, I'd like to discuss the project timeline for the upcoming launch.",
        translated: "こんにちは、今後の打ち合わせのプロジェクトのタイムラインについて話し合いたいと思います。",
    },
    {
        source: "Can we push the review to next Tuesday?",
        translated: "レビューを来週の火曜日に延期できますか？",
    },
    {
        source: "That works for me, I'll update the calendar.",
        translated: "それで大丈夫です。カレンダーを更新します。",
    },
];

export default function InterpreterPage() {
    const [inputLang, setInputLang] = useState("English (US)");
    const [outputLang, setOutputLang] = useState("Japanese");
    const [isListening, setIsListening] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isTwoWay, setIsTwoWay] = useState(true);
    const [saveModalState, setSaveModalState] = useState<'hidden' | 'loading' | 'saved'>('hidden');
    const [lines, setLines] = useState<TranscriptLine[]>([
        { id: 0, ...DEMO_LINES[0] },
    ]);
    const [showTranscript, setShowTranscript] = useState(false);
    const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const MOCK_FOLDERS = ["ok", "ik", "IL", "Po"];
    const nextIndex = useRef(1);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // Read initial mode and folder from URL
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('mode') === 'oneway') {
                setIsTwoWay(false);
            } else {
                setIsTwoWay(true);
            }
            
            const folderParam = params.get('folder');
            if (folderParam) {
                setSelectedFolder(folderParam);
            }
        }
    }, []);

    // Simulate incoming interpreted speech while listening & not paused
    useEffect(() => {
        if (!isListening || isPaused) return;
        const interval = setInterval(() => {
            const demo = DEMO_LINES[nextIndex.current % DEMO_LINES.length];
            setLines((prev) => [...prev, { id: Date.now(), ...demo }]);
            nextIndex.current += 1;
        }, 6000);
        return () => clearInterval(interval);
    }, [isListening, isPaused]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [lines, showTranscript]);

    const handleSaveSession = () => {
        setIsListening(false);
        setSaveModalState('loading');
        setTimeout(() => {
            setSaveModalState('saved');
        }, 2000);
    };

    const handleTogglePause = () => {
        setIsPaused((p) => !p);
    };

    return (
        <div className="h-screen bg-[#0a0e1a] text-white flex flex-col overflow-hidden">
            <Navbar />
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 flex flex-col px-6 py-8 min-h-0">
                    <div className="w-full max-w-[1600px] mx-auto flex flex-col h-full gap-8 flex-1 min-h-0">
                    <div className="text-center mb-6 flex flex-col items-center flex-shrink-0">
                        <h1 className="text-3xl font-semibold tracking-tight">Start Interpreting</h1>
                        <p className="text-white/40 mt-2 text-sm mb-6">
                            Instantly get live interpreter
                        </p>

                        {/* Two-way toggle */}
                        <button
                            onClick={() => setIsTwoWay(!isTwoWay)}
                            className="flex items-center gap-3 cursor-pointer focus:outline-none group"
                            aria-label="Toggle two way conversation"
                        >
                            <div className="w-11 h-6 rounded-full border border-white/10 bg-[#141b2e] flex items-center px-1 transition-all relative">
                                <div className={`w-4 h-4 rounded-full bg-blue-500 shadow-sm transition-transform duration-200 ease-in-out absolute left-1 ${isTwoWay ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                            <span className={`text-sm font-medium transition-colors ${isTwoWay ? 'text-blue-400' : 'text-white/50 group-hover:text-white/70'}`}>
                                Two way Conversation
                            </span>
                        </button>
                    </div>

                    {/* Language rows / Panels */}
                    <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                        {/* Input side */}
                        <div className="rounded-[1.5rem] bg-[#141b2e] border border-white/5 p-6 flex flex-col relative shadow-lg min-h-0">
                            <div className="flex flex-col gap-2 mb-6 flex-shrink-0">
                                <div className="flex items-center gap-2 text-white/60">
                                    <Mic size={14} />
                                    <select
                                        value={inputLang}
                                        onChange={(e) => setInputLang(e.target.value)}
                                        className="bg-transparent text-[13px] font-medium text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
                                    >
                                        {LANGUAGES.map((l) => (
                                            <option key={l} value={l} className="bg-[#141b2e]">
                                                Input: {l}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 pl-6">
                                    <Waveform active={isListening && !isPaused} />
                                    <span className="text-[11px] font-medium text-blue-400/80 tracking-wide">
                                        {isPaused
                                            ? "Paused"
                                            : isListening
                                                ? "Active Listening..."
                                                : "Idle"}
                                    </span>
                                </div>
                            </div>
                            <TranscriptCard lines={lines} langKey="source" />
                        </div>

                        {/* Output side */}
                        <div className="rounded-[1.5rem] bg-[#141b2e] border border-white/5 p-6 flex flex-col relative shadow-lg min-h-0">
                            <div className="flex flex-col gap-2 mb-6 items-end flex-shrink-0">
                                <div className="flex items-center justify-end gap-2 text-white/60">
                                    <select
                                        value={outputLang}
                                        onChange={(e) => setOutputLang(e.target.value)}
                                        className="bg-transparent text-[13px] font-medium text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer text-right"
                                    >
                                        {LANGUAGES.map((l) => (
                                            <option key={l} value={l} className="bg-[#141b2e]">
                                                Output: {l}
                                            </option>
                                        ))}
                                    </select>
                                    <Volume2 size={14} />
                                </div>
                                <div className="flex items-center justify-end gap-2 pr-6">
                                    <span className="text-[11px] font-medium text-blue-400/80 tracking-wide">
                                        {isMuted ? "Muted" : "Synthesizing Voice..."}
                                    </span>
                                    <Waveform active={isListening && !isPaused && !isMuted} />
                                </div>
                            </div>
                            <TranscriptCard lines={lines} langKey="translated" align="right" />
                        </div>
                    </div>

                    {/* Center mic + status */}
                    <div className="flex flex-col items-center justify-center mt-2 flex-shrink-0">
                        <button
                            onClick={() => setIsListening((l) => !l)}
                            className="h-16 w-16 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                            aria-label={isListening ? "Stop session" : "Start session"}
                        >
                            {isListening ? <Mic size={26} /> : <MicOff size={26} />}
                        </button>
                        <div className="flex items-center gap-2 mt-4 text-xs font-medium text-emerald-400">
                            <span
                                className={`h-2 w-2 rounded-full ${isListening && !isPaused
                                    ? "bg-emerald-400 animate-pulse"
                                    : "bg-white/20"
                                    }`}
                            />
                            {isListening && !isPaused ? "AI Live Sync Enabled" : "Sync Paused"}
                        </div>
                    </div>

                    {/* Bottom control bar */}
                    <div className="mx-auto w-full max-w-3xl rounded-full bg-[#0f1524] border border-white/5 px-6 py-4 flex items-center justify-between shadow-xl mt-4 flex-shrink-0">
                        <ControlButton
                            icon={<FileText size={18} />}
                            label="View Transcript"
                            onClick={() => setShowTranscript((s) => !s)}
                        />
                        <div className="w-px h-6 bg-white/5" />
                        <ControlButton
                            icon={<Square size={16} className="fill-current" />}
                            label="Save Session"
                            onClick={handleSaveSession}
                            variant="danger"
                        />
                        <div className="w-px h-6 bg-white/5" />
                        <ControlButton
                            icon={isPaused ? <Play size={18} /> : <Pause size={18} />}
                            label={isPaused ? "Resume Session" : "Pause Session"}
                            onClick={handleTogglePause}
                        />
                        <div className="w-px h-6 bg-white/5" />
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
                    <div className="w-[400px] border-l border-white/5 bg-[#0f1524] flex flex-col h-full shadow-2xl shrink-0 absolute right-0 top-0 bottom-0 z-50 md:relative">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                            <h2 className="text-[15px] font-semibold text-white/90 tracking-wide">Live Interpreting</h2>
                            <button onClick={() => setShowTranscript(false)} className="text-white/40 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                            {lines.map((line) => (
                                <div key={line.id} className="flex flex-col gap-5 border-b border-white/5 pb-8 last:border-0 last:pb-0">
                                    <div className="flex flex-col gap-2 relative group">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">{inputLang}</span>
                                            <span className="text-[10px] text-white/30">10:42:01</span>
                                        </div>
                                        <p className="text-[14px] text-white/80 leading-relaxed pr-4">{line.source}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 relative group">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold tracking-wider text-white/50 uppercase">{outputLang}</span>
                                            <span className="text-[10px] text-white/30">10:42:03</span>
                                        </div>
                                        <p className="text-[14px] text-white/80 leading-relaxed pr-4">{line.translated}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={transcriptEndRef} />
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 shrink-0 flex gap-4">
                            <button className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 transition-colors py-2.5 rounded-lg text-[13px] font-medium border border-white/5">
                                <Copy size={16} /> Copy
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 transition-colors py-2.5 rounded-lg text-[13px] font-medium border border-white/5">
                                <Download size={16} /> Download
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Save Session Modal Overlay */}
            {saveModalState !== 'hidden' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-[#0f1524] border border-white/5 rounded-[1.5rem] p-6 w-full max-w-lg shadow-2xl flex flex-col gap-6">
                        {saveModalState === 'loading' ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-5">
                                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                <p className="text-white/60 font-medium tracking-wide">Saving session...</p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-[16px] font-semibold text-white/90 tracking-wide">Saved Session</h2>
                                
                                <div className="flex flex-col border border-white/10 rounded-2xl bg-[#131928] overflow-hidden mt-2">
                                    {/* Top half: Languages */}
                                    <div className="p-5 flex items-center justify-center border-b border-white/10 px-8">
                                        <div className="flex items-center gap-3 flex-1 justify-end pr-8">
                                            <img src="/jp.png" alt="Japanese Flag" className="h-5 object-contain" />
                                            <span className="text-[14px] font-medium text-white/90">Japanese</span>
                                        </div>
                                        <ArrowLeftRight size={16} className="text-white/40 shrink-0" />
                                        <div className="flex items-center gap-3 flex-1 justify-start pl-8">
                                            <img src="/us.png" alt="US Flag" className="h-5 object-contain scale-[1.6]" />
                                            <span className="text-[14px] font-medium text-white/90">English(US)</span>
                                        </div>
                                    </div>

                                    {/* Bottom half: Time & Date */}
                                    <div className="flex items-center">
                                        <div className="flex-1 flex items-center justify-center gap-2 p-4 border-r border-white/10">
                                            <Clock size={16} className="text-white/40" />
                                            <span className="text-[13px] font-medium text-white/90">12:03</span>
                                        </div>
                                        <div className="flex-[1.5] flex items-center justify-center gap-2 p-4">
                                            <Calendar size={16} className="text-white/40" />
                                            <span className="text-[13px] font-medium text-white/90">July 8, 2026 &nbsp;&nbsp; 03:42 pm</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Folder Picker */}
                                <div className="relative mt-2">
                                    <button 
                                        onClick={() => setIsFolderPickerOpen(!isFolderPickerOpen)}
                                        className="w-full flex items-center justify-between p-4 bg-[#131928] border border-white/10 rounded-2xl hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Folder size={18} className="text-white/40" />
                                            <span className={`text-[14px] font-medium ${selectedFolder ? 'text-white/90' : 'text-white/40'}`}>
                                                {selectedFolder || "Move to Folder (Optional)"}
                                            </span>
                                        </div>
                                        <ChevronDown size={16} className={`text-white/40 transition-transform ${isFolderPickerOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isFolderPickerOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#131928] border border-white/10 rounded-2xl overflow-hidden z-10 shadow-xl">
                                            <div className="flex flex-col max-h-[200px] overflow-y-auto">
                                                {MOCK_FOLDERS.map((folder) => (
                                                    <button
                                                        key={folder}
                                                        onClick={() => {
                                                            setSelectedFolder(folder);
                                                            setIsFolderPickerOpen(false);
                                                        }}
                                                        className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/5 text-left"
                                                    >
                                                        <Folder size={16} className="text-white/40" />
                                                        <span className="text-[14px] font-medium text-white/90">{folder}</span>
                                                    </button>
                                                ))}
                                                <button className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left text-[#3b82f6]">
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
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-transparent hover:bg-white/5 transition-colors text-[13px] font-medium border border-white/10 text-white/80"
                                    >
                                        <ArrowLeft size={16} /> Go Back
                                    </button>
                                    <Link href="/allrecords" className="flex-[1.2] flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3b82f6] hover:bg-blue-600 transition-colors text-[13px] font-medium text-white">
                                        Recordings <ArrowRight size={16} />
                                    </Link>
                                    <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-transparent hover:bg-white/5 transition-colors text-[13px] font-medium border border-white/10 text-white/80">
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
                        className={`w-[3px] rounded-full bg-blue-400 ${active ? "animate-pulse" : "opacity-20"
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
                lines,
                langKey,
                align = "left",
}: {
                lines: TranscriptLine[];
            langKey: "source" | "translated";
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
    }, [lines]);

                return (
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 flex flex-col"
                >
                    <div className="flex-1 flex flex-col justify-end">
                        <div className="flex flex-col space-y-5 pt-10">
                            {lines.map((line) => (
                                <p
                                    key={line.id}
                                    className={`text-[15px] leading-relaxed tracking-wide ${align === "right" ? "text-right text-white/60" : "text-white/90"
                                        }`}
                                >
                                    {line[langKey]}
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
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                </button>
                );
}
