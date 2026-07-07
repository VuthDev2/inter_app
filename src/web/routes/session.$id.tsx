import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createRecognizer, isSpeechRecognitionSupported, speakText } from "@/lib/speech";
import { translateUtterance } from "@/lib/translate.functions";
import { ArrowLeftRight, ChevronDown, Headphones, LayoutList, Menu, MoreHorizontal, Pause, Volume2, VolumeX, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/session/$id")({
  head: () => ({
    meta: [
      { title: "Kotoba — Live Interpretation" },
      { name: "description", content: "Live AI-interpreted conversation." },
    ],
  }),
  component: SessionPage,
});

type SessionRow = {
  id: string;
  host_id: string;
  code: string;
  name: string | null;
  source_lang: string;
  target_lang: string;
  status: string;
  created_at: string;
  ended_at: string | null;
};

type TranscriptRow = {
  id: string;
  session_id: string;
  speaker_id: string;
  source_lang: string;
  target_lang: string;
  original_text: string;
  translated_text: string | null;
  created_at: string;
};

const LANGS = [
  { code: "en", label: "English",  flag: "🇺🇸" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "es", label: "Spanish",  flag: "🇪🇸" },
  { code: "fr", label: "French",   flag: "🇫🇷" },
  { code: "de", label: "German",   flag: "🇩🇪" },
  { code: "zh", label: "Chinese",  flag: "🇨🇳" },
  { code: "ko", label: "Korean",   flag: "🇰🇷" },
  { code: "kh", label: "Khmer",    flag: "🇰🇭" },
];

function getFlag(code: string) { return LANGS.find((l) => l.code === code)?.flag ?? "🌐"; }
function getLabel(code: string) { return LANGS.find((l) => l.code === code)?.label ?? code; }

/* ─── Inline dropdown pill ────────────────────────────────────── */
function LangDropdown({
  value,
  onChange,
  disabled,
  showRecordDot = false,
  dropUp = true,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  showRecordDot?: boolean;
  dropUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all select-none
          ${disabled
            ? "opacity-40 cursor-not-allowed bg-[#2a2d3a] text-white/40"
            : "bg-[#2a2d3a] hover:bg-[#33364a] active:scale-95 text-white cursor-pointer"
          }`}
        style={{ minWidth: 90 }}
      >
        {showRecordDot ? (
          /* source pill — shows record circle dot */
          <span className="h-4 w-4 rounded-full bg-red-500 flex-shrink-0" />
        ) : (
          <span className="text-lg leading-none flex-shrink-0">{getFlag(value)}</span>
        )}
        <span className="text-xs font-medium text-white/80">{getLabel(value)}</span>
        <ChevronDown className={`h-3 w-3 text-white/40 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute z-50 min-w-[160px] rounded-2xl overflow-hidden border border-white/8 shadow-2xl bg-[#1e2130] py-1
            ${dropUp ? "bottom-full mb-2" : "top-full mt-2"} left-0`}
        >
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => { onChange(l.code); setOpen(false); }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-white/6 transition-colors text-left
                ${l.code === value ? "text-white font-semibold" : "text-white/60"}`}
            >
              <span className="text-base">{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Waveform bars ───────────────────────────────────────────── */
const NUM_BARS = 40;
const BAR_PATTERN = Array.from({ length: NUM_BARS }, (_, i) => {
  // Simulate a real waveform – bars are shorter near centre (where button sits) and taller toward edges
  const distFromCenter = Math.abs(i - NUM_BARS / 2) / (NUM_BARS / 2);
  const base = 0.2 + distFromCenter * 0.5;
  const noise = Math.sin(i * 1.7) * 0.25 + Math.sin(i * 0.9) * 0.15;
  return Math.max(0.08, Math.min(1, base + noise));
});
const BAR_DELAYS = Array.from({ length: NUM_BARS }, (_, i) => (i * 0.04) % 0.8);

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[2px] w-full h-full px-1">
      {BAR_PATTERN.map((h, i) => {
        const isCenterGap = i >= NUM_BARS / 2 - 2 && i <= NUM_BARS / 2 + 2;
        return (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all ${active ? "visualizer-bar" : ""}`}
            style={{
              height: `${Math.round(h * 100)}%`,
              animationDelay: `${BAR_DELAYS[i]}s`,
              animationDuration: active ? `${0.7 + (i % 7) * 0.09}s` : "0s",
              opacity: isCenterGap ? 0 : active ? 0.9 : 0.3,
              background: active
                ? `linear-gradient(to top, rgba(20,184,166,0.85), rgba(99,102,241,0.85))`
                : `rgba(255,255,255,0.25)`,
              transform: active ? undefined : "scaleY(0.35)",
              transition: "opacity 0.5s ease, background 0.5s ease, transform 0.5s ease",
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
function SessionPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState<SessionRow | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptRow[]>([]);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [liveTranslation, setLiveTranslation] = useState<string | null>(null);
  const [interimTranslation, setInterimTranslation] = useState<string | null>(null);

  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("ja");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [viewMode, setViewMode] = useState<"live" | "timeline">("live");

  const recognizerRef = useRef<ReturnType<typeof createRecognizer> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenTranscriptsRef = useRef<Set<string>>(new Set());
  const [translationKey, setTranslationKey] = useState(0);

  /* load session */
  useEffect(() => {
    supabase.from("sessions").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) { toast.error("Session not found"); router.navigate({ to: "/home" }); return; }
      setSession(data);
      setSourceLang(data.source_lang);
      setTargetLang(data.target_lang);
    });
  }, [id, router]);

  /* debounced interim translation */
  useEffect(() => {
    if (!interim.trim()) { setInterimTranslation(null); return; }
    const t = setTimeout(async () => {
      try {
        const { translation } = await translateUtterance({ data: { text: interim, sourceLang, targetLang } });
        setInterimTranslation(translation);
      } catch { /* silent */ }
    }, 600);
    return () => clearTimeout(t);
  }, [interim, sourceLang, targetLang]);

  /* load + subscribe transcripts */
  useEffect(() => {
    supabase.from("transcripts").select("*").eq("session_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setTranscripts(data ?? []));

    const ch = supabase.channel(`transcripts:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transcripts", filter: `session_id=eq.${id}` }, (p) => {
        setTranscripts((prev) => {
          const row = p.new as TranscriptRow;
          return prev.find((r) => r.id === row.id) ? prev : [...prev, row];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "transcripts", filter: `session_id=eq.${id}` }, (p) => {
        setTranscripts((prev) => prev.map((r) => r.id === (p.new as TranscriptRow).id ? (p.new as TranscriptRow) : r));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [id]);

  /* auto-speak incoming */
  useEffect(() => {
    if (!autoSpeak || transcripts.length === 0) return;
    transcripts.forEach((t) => {
      if (t.translated_text && !spokenTranscriptsRef.current.has(t.id)) {
        spokenTranscriptsRef.current.add(t.id);
        if (Date.now() - new Date(t.created_at).getTime() < 10000) {
          speakText(t.translated_text, t.target_lang);
        }
      }
    });
  }, [transcripts, autoSpeak]);

  /* scroll to bottom in timeline */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcripts, interim]);

  /* handle final utterance */
  const handleFinal = async (text: string) => {
    if (!session || !user || !text.trim()) return;
    setInterim("");
    const { data, error } = await supabase.from("transcripts").insert({
      session_id: session.id, speaker_id: user.id,
      source_lang: sourceLang, target_lang: targetLang,
      original_text: text, translated_text: null,
    }).select().single();
    if (error || !data) { toast.error(error?.message ?? "Failed to save"); return; }

    try {
      const { translation } = await translateUtterance({ data: { text, sourceLang, targetLang } });
      setLiveTranslation(translation);
      setTranslationKey((k) => k + 1);
      if (autoSpeak) { speakText(translation, targetLang); spokenTranscriptsRef.current.add(data.id); }
      await supabase.from("transcripts").update({ translated_text: translation }).eq("id", data.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Translation failed";
      toast.error(msg);
      await supabase.from("transcripts").update({ translated_text: `[error: ${msg}]` }).eq("id", data.id);
    }
  };

  /* toggle mic */
  const toggleListen = () => {
    if (!session) return;
    if (listening) {
      recognizerRef.current?.stop(); recognizerRef.current = null;
      setListening(false); setInterim(""); return;
    }
    if (!isSpeechRecognitionSupported()) {
      toast.error("Speech recognition isn't supported here. Use Chrome, Edge, or Safari on desktop."); return;
    }
    try {
      recognizerRef.current = createRecognizer(sourceLang, {
        onFinal: async (text) => { await handleFinal(text); },
        onInterim: (text) => { setInterim(text); setLiveTranslation(null); },
        onError: (m) => { if (m !== "no-speech" && m !== "aborted") toast.error(`Mic: ${m}`); },
        onEnd: () => { setListening(false); setInterim(""); },
      });
      recognizerRef.current.start();
      setListening(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start microphone");
    }
  };

  const handleSwap = () => { setSourceLang(targetLang); setTargetLang(sourceLang); };

  useEffect(() => () => { recognizerRef.current?.stop(); }, []);

  /* derived text */
  const mostRecentComplete = transcripts.slice().reverse().find((t) => t.translated_text);
  const displayText =
    liveTranslation ??
    (interim ? (interimTranslation ?? null) : null) ??
    mostRecentComplete?.translated_text ??
    null;
  const isInterim = !liveTranslation && !!interim && !interimTranslation;
  const displayOriginal =
    interim ||
    (liveTranslation ? transcripts[transcripts.length - 1]?.original_text ?? "" : mostRecentComplete?.original_text ?? "");

  /* ─── LOADING ─── */
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0e17]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  /* ─── RENDER ─── */
  return (
    <div
      className="flex flex-col bg-[#0c0e17] text-white overflow-hidden select-none"
      style={{ height: "100dvh" }}
    >
      {/* ══ TOP BAR ══ */}
      <header className="flex items-center justify-between px-5 pt-6 pb-2 shrink-0">
        <button
          onClick={() => router.navigate({ to: "/home" })}
          className="flex h-9 w-9 items-center justify-center text-white/60 hover:text-white/90 transition-colors"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="text-white/90 font-medium text-base tracking-wide">
          {session.name || "Kotoba"}
        </span>

        <div className="flex items-center gap-1">
          {/* Timeline toggle */}
          <button
            onClick={() => setViewMode((v) => (v === "live" ? "timeline" : "live"))}
            className="flex h-9 w-9 items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          >
            {viewMode === "live" ? <LayoutList className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          </button>
          <button className="flex h-9 w-9 items-center justify-center text-white/40 hover:text-white/70 transition-colors">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ══ MAIN CONTENT ══ */}
      {viewMode === "live" ? (
        /* Live immersive view — text top-left like Kotoba */
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 px-5 pt-3 overflow-y-auto">
            {displayText ? (
              <p
                key={translationKey}
                className={`font-sans text-[1.65rem] leading-[1.45] font-normal tracking-tight fade-in-up
                  ${isInterim ? "text-white/45" : "text-white"}`}
              >
                {displayText}
              </p>
            ) : (
              <p className="text-white/18 text-lg font-normal leading-relaxed">
                {listening ? "Listening…" : "Tap \u25cf to begin speaking"}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Timeline view */
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" ref={scrollRef}>
          <div className="max-w-xl mx-auto space-y-3">
            {transcripts.length === 0 && !interim && (
              <p className="text-center text-white/20 text-sm mt-8">No transcripts yet</p>
            )}
            {transcripts.map((t) => {
              const isMe = t.speaker_id === user?.id;
              return (
                <div key={t.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-5 py-4
                      ${isMe
                        ? "bg-gradient-to-br from-indigo-600/80 to-violet-700/80 rounded-br-sm border border-indigo-400/20"
                        : "bg-white/6 rounded-bl-sm border border-white/8"
                      } text-white`}
                  >
                    <p className="text-base font-medium leading-snug">
                      {t.translated_text || <span className="opacity-40 italic text-sm">Translating…</span>}
                    </p>
                    <p className="mt-1.5 text-xs text-white/35 leading-snug">{t.original_text}</p>
                  </div>
                </div>
              );
            })}
            {interim && (
              <div className="flex flex-col items-end animate-in fade-in">
                <div className="max-w-[88%] rounded-2xl px-5 py-4 bg-indigo-600/25 rounded-br-sm border border-indigo-400/15 text-white">
                  <p className="text-base font-medium leading-snug opacity-65">{interimTranslation || "…"}</p>
                  <p className="mt-1.5 text-xs text-indigo-300/50 animate-pulse">{interim}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ WAVEFORM + RECORD BUTTON ══ */}
      <div
        className="shrink-0 relative flex items-center justify-center px-4"
        style={{ height: 76 }}
      >
        {/* Waveform fills the full row */}
        <div className="absolute inset-x-0 inset-y-0 flex items-center px-4">
          <Waveform active={listening} />
        </div>

        {/* Big red record/pause button centred ON the waveform */}
        <button
          onClick={toggleListen}
          className={`relative z-10 flex h-[58px] w-[58px] items-center justify-center rounded-full shadow-2xl transition-all duration-200 active:scale-90
            ${listening ? "bg-red-600 glow-pulse" : "bg-red-600 opacity-90 hover:opacity-100"}`}
          aria-label={listening ? "Stop" : "Record"}
        >
          {listening ? (
            /* pause icon — two vertical bars */
            <div className="flex gap-[5px]">
              <div className="w-[4px] h-[20px] rounded-full bg-white" />
              <div className="w-[4px] h-[20px] rounded-full bg-white" />
            </div>
          ) : (
            /* record dot */
            <div className="h-5 w-5 rounded-full bg-white" />
          )}
        </button>
      </div>

      {/* ══ BOTTOM CONTROL BAR ══ */}
      <div
        className="shrink-0 flex items-center justify-center gap-3 px-5 pb-8 pt-1"
      >
        {/* Source language pill — record dot + label */}
        <LangDropdown
          value={sourceLang}
          onChange={setSourceLang}
          disabled={listening}
          showRecordDot={true}
          dropUp={true}
        />

        {/* Swap button */}
        <button
          onClick={handleSwap}
          disabled={listening}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90
            ${listening ? "opacity-30 cursor-not-allowed" : "bg-[#2a2d3a] hover:bg-[#33364a] cursor-pointer"}`}
          aria-label="Swap languages"
        >
          <ArrowLeftRight className="h-4 w-4 text-white/70" />
        </button>

        {/* Target language pill — flag + label */}
        <LangDropdown
          value={targetLang}
          onChange={setTargetLang}
          disabled={listening}
          showRecordDot={false}
          dropUp={true}
        />

        {/* Audio/headphones toggle */}
        <button
          onClick={() => setAutoSpeak((s) => !s)}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90
            ${autoSpeak
              ? "bg-[#2a2d3a] text-white/80 hover:bg-[#33364a]"
              : "bg-[#2a2d3a] text-white/25 hover:bg-[#33364a]"
            }`}
          title={autoSpeak ? "Mute voice output" : "Enable voice output"}
          aria-label="Toggle audio"
        >
          {autoSpeak
            ? <Headphones className="h-4 w-4" />
            : <VolumeX className="h-4 w-4" />
          }
        </button>
      </div>
    </div>
  );
}
