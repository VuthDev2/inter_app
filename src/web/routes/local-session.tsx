import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createRecognizer, isSpeechRecognitionSupported, speakText } from "@/lib/speech";
import { translateUtterance } from "@/lib/translate.functions";
import {
  ArrowLeftRight,
  ChevronDown,
  Headphones,
  Menu,
  MoreHorizontal,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  source: z.string().default("en"),
  target: z.string().default("ja"),
});

export const Route = createFileRoute("/local-session")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "QuickVoice — Instant Interpretation" },
      { name: "description", content: "Instant voice interpretation." },
    ],
  }),
  component: LocalSessionPage,
});

const LANGS = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "zh", label: "Chinese", flag: "🇨🇳" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
  { code: "kh", label: "Khmer", flag: "🇰🇭" },
];

function getFlag(c: string) {
  return LANGS.find((l) => l.code === c)?.flag ?? "🌐";
}
function getLabel(c: string) {
  return LANGS.find((l) => l.code === c)?.label ?? c;
}

/* ─── Language dropdown pill ──────────────────────────────────── */
function LangDropdown({
  value,
  onChange,
  disabled,
  showDot = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  showDot?: boolean;
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
        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm transition-all select-none
          ${
            disabled
              ? "opacity-40 cursor-not-allowed bg-[#252836]"
              : "bg-[#252836] hover:bg-[#2e3147] active:scale-95 cursor-pointer"
          } text-white`}
        style={{ minWidth: 88 }}
      >
        {showDot ? (
          <span className="h-3.5 w-3.5 rounded-full bg-red-500 flex-shrink-0" />
        ) : (
          <span className="text-lg leading-none flex-shrink-0">{getFlag(value)}</span>
        )}
        <span className="text-xs font-medium text-white/80">{getLabel(value)}</span>
        <ChevronDown
          className={`h-3 w-3 text-white/35 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 min-w-[155px] rounded-2xl overflow-hidden border border-white/8 shadow-2xl bg-[#1c1f2e] py-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                onChange(l.code);
                setOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-xs hover:bg-white/6 transition-colors text-left
                ${l.code === value ? "text-white font-semibold" : "text-white/55"}`}
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

/* ─── Waveform ────────────────────────────────────────────────── */
const NUM_BARS = 44;
const BAR_H = Array.from({ length: NUM_BARS }, (_, i) => {
  const dist = Math.abs(i - NUM_BARS / 2) / (NUM_BARS / 2);
  return Math.max(
    0.06,
    Math.min(1, 0.15 + dist * 0.6 + Math.sin(i * 1.9) * 0.22 + Math.sin(i * 0.7) * 0.12),
  );
});
const BAR_D = Array.from({ length: NUM_BARS }, (_, i) => (i * 0.038) % 0.78);

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[2px] w-full h-full px-2">
      {BAR_H.map((h, i) => {
        const isGap = i >= NUM_BARS / 2 - 3 && i <= NUM_BARS / 2 + 2;
        return (
          <div
            key={i}
            className={`flex-1 rounded-full ${active ? "visualizer-bar" : ""}`}
            style={{
              height: `${Math.round(h * 100)}%`,
              animationDelay: `${BAR_D[i]}s`,
              animationDuration: active ? `${0.65 + (i % 7) * 0.1}s` : "0s",
              opacity: isGap ? 0 : active ? 0.88 : 0.28,
              background: active
                ? "linear-gradient(to top, rgba(20,184,166,0.9), rgba(79,70,229,0.9))"
                : "rgba(255,255,255,0.22)",
              transform: active ? undefined : "scaleY(0.3)",
              transition: "opacity 0.4s ease, background 0.4s ease, transform 0.4s ease",
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */
function LocalSessionPage() {
  const router = useRouter();
  const search = Route.useSearch();

  const [sourceLang, setSourceLang] = useState(search.source);
  const [targetLang, setTargetLang] = useState(search.target);
  const [mode, setMode] = useState<"one-way" | "two-way">("one-way");

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [interimTranslation, setInterimTranslation] = useState<string | null>(null);
  const [finalTranslation, setFinalTranslation] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [translationKey, setTranslationKey] = useState(0);

  const recognizerRef = useRef<ReturnType<typeof createRecognizer> | null>(null);

  /* debounced interim translation */
  useEffect(() => {
    if (!interim.trim()) {
      setInterimTranslation(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { translation } = await translateUtterance({
          data: { text: interim, sourceLang, targetLang },
        });
        setInterimTranslation(translation);
      } catch {
        /* silent */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [interim, sourceLang, targetLang]);

  const stopRecognizer = () => {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    setListening(false);
    setInterim("");
    setInterimTranslation(null);
  };

  const toggleListen = () => {
    if (listening) {
      stopRecognizer();
      return;
    }
    if (!isSpeechRecognitionSupported()) {
      toast.error("Speech recognition isn't supported. Use Chrome, Edge, or Safari.");
      return;
    }

    setInterim("");
    setInterimTranslation(null);
    setFinalTranslation(null);
    setOriginalText(null);

    try {
      recognizerRef.current = createRecognizer(sourceLang, {
        onInterim: (text) => {
          setInterim(text);
        },
        onFinal: async (text) => {
          const activeSourceLang = sourceLang;
          const activeTargetLang = targetLang;
          setInterim("");
          setInterimTranslation(null);
          setOriginalText(text);
          try {
            const { translation } = await translateUtterance({
              data: { text, sourceLang: activeSourceLang, targetLang: activeTargetLang },
            });
            setFinalTranslation(translation);
            setTranslationKey((k) => k + 1);
            if (autoSpeak) speakText(translation, activeTargetLang);
            if (mode === "two-way") {
              setSourceLang(activeTargetLang);
              setTargetLang(activeSourceLang);
            }
          } catch {
            setFinalTranslation("[Translation failed]");
          }
        },
        onError: (m) => {
          if (m !== "no-speech" && m !== "aborted") toast.error(`Mic: ${m}`);
        },
        onEnd: () => {
          setListening(false);
          setInterim("");
        },
      });
      recognizerRef.current.start();
      setListening(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start microphone");
    }
  };

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    stopRecognizer();
    setFinalTranslation(null);
    setOriginalText(null);
  };

  useEffect(
    () => () => {
      recognizerRef.current?.stop();
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    },
    [],
  );

  /* what text to show */
  const displayText = interimTranslation ?? finalTranslation ?? null;
  const isInterim = !!interimTranslation && !finalTranslation;

  return (
    <div
      className="flex flex-col bg-[#0c0e17] text-white overflow-hidden select-none"
      style={{ height: "100dvh" }}
    >
      {/* ══ TOP BAR ══ */}
      <header className="flex items-center justify-between px-5 pt-6 pb-2 shrink-0">
        <button
          onClick={() => router.navigate({ to: "/home" })}
          className="flex h-9 w-9 items-center justify-center text-white/55 hover:text-white/85 transition-colors"
          aria-label="Back"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div
          className={`grid grid-cols-2 rounded-full bg-white/8 p-1 text-xs font-semibold ${
            listening ? "opacity-40" : ""
          }`}
          role="group"
          aria-label="Interpretation mode"
        >
          <button
            type="button"
            onClick={() => !listening && setMode("one-way")}
            disabled={listening}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              mode === "one-way" ? "bg-white text-[#0c0e17]" : "text-white/55 hover:text-white"
            }`}
          >
            1-way
          </button>
          <button
            type="button"
            onClick={() => !listening && setMode("two-way")}
            disabled={listening}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              mode === "two-way" ? "bg-indigo-500 text-white" : "text-white/55 hover:text-white"
            }`}
          >
            2-way
          </button>
        </div>

        <button className="flex h-9 w-9 items-center justify-center text-white/35 hover:text-white/65 transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      {/* ══ MAIN TEXT AREA ══ */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 px-5 pt-3 overflow-y-auto">
          {displayText ? (
            <p
              key={translationKey}
              className={`text-[1.75rem] leading-[1.45] font-normal tracking-tight fade-in-up text-left
                ${isInterim ? "text-white/40" : "text-white"}`}
            >
              {displayText}
            </p>
          ) : interim ? (
            <p className="text-[1.75rem] leading-[1.45] font-normal text-white/25 text-left">
              {interim}
            </p>
          ) : (
            <p className="text-sm font-medium tracking-[0.2em] uppercase text-white/18 text-left mt-1">
              {listening ? "Listening…" : "Tap \u25cf to speak"}
            </p>
          )}
        </div>
      </div>

      {/* ══ WAVEFORM + BIG RED BUTTON ══ */}
      <div
        className="shrink-0 relative flex items-center justify-center"
        style={{ height: 80, paddingLeft: 16, paddingRight: 16 }}
      >
        {/* Waveform behind the button */}
        <div
          className="absolute inset-0 flex items-center"
          style={{ paddingLeft: 16, paddingRight: 16 }}
        >
          <Waveform active={listening} />
        </div>

        {/* Big red button, centred on top */}
        <button
          onClick={toggleListen}
          className={`relative z-10 rounded-full shadow-2xl transition-all duration-200 active:scale-90 flex items-center justify-center
            ${listening ? "glow-pulse" : "opacity-92 hover:opacity-100"}`}
          style={{ width: 60, height: 60, background: "#c0392b" }}
          aria-label={listening ? "Stop" : "Record"}
        >
          {listening ? (
            /* Pause: two bars */
            <div className="flex gap-[5px]">
              <div className="w-[4.5px] h-[20px] rounded-full bg-white" />
              <div className="w-[4.5px] h-[20px] rounded-full bg-white" />
            </div>
          ) : (
            /* Record: filled circle */
            <div className="h-[18px] w-[18px] rounded-full bg-white" />
          )}
        </button>
      </div>

      {/* ══ BOTTOM CONTROL BAR ══ */}
      <div className="shrink-0 flex items-center justify-center gap-3 px-5 pb-9 pt-2">
        {/* Source pill */}
        <LangDropdown
          value={sourceLang}
          onChange={(v) => {
            setSourceLang(v);
            stopRecognizer();
            setFinalTranslation(null);
            setOriginalText(null);
          }}
          disabled={listening}
          showDot={true}
        />

        {/* Swap */}
        <button
          onClick={handleSwap}
          disabled={listening}
          className={`flex h-[44px] w-[44px] items-center justify-center rounded-full transition-all active:scale-90
            ${listening ? "opacity-30 cursor-not-allowed bg-[#252836]" : "bg-[#252836] hover:bg-[#2e3147] cursor-pointer"}`}
          aria-label="Swap"
        >
          <ArrowLeftRight className="h-[18px] w-[18px] text-white/65" />
        </button>

        {/* Target pill */}
        <LangDropdown
          value={targetLang}
          onChange={(v) => {
            setTargetLang(v);
            stopRecognizer();
            setFinalTranslation(null);
            setOriginalText(null);
          }}
          disabled={listening}
          showDot={false}
        />

        {/* Audio/headphones */}
        <button
          onClick={() => setAutoSpeak((s) => !s)}
          className={`flex h-[44px] w-[44px] items-center justify-center rounded-full transition-all active:scale-90
            bg-[#252836] hover:bg-[#2e3147]
            ${autoSpeak ? "text-white/75" : "text-white/25"}`}
          aria-label={autoSpeak ? "Mute voice" : "Enable voice"}
        >
          {autoSpeak ? (
            <Headphones className="h-[18px] w-[18px]" />
          ) : (
            <VolumeX className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
    </div>
  );
}
