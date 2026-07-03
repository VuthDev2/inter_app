import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createRecognizer, isSpeechRecognitionSupported } from "@/lib/speech";
import { translateUtterance } from "@/lib/translate.functions";
import { Menu, MoreHorizontal, Pause, Mic, ArrowRightLeft, Headphones } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "zh", label: "Chinese", flag: "🇨🇳" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
  { code: "kh", label: "Khmer", flag: "🇰🇭" },
];

function getFlag(code: string) {
  return LANGS.find((l) => l.code === code)?.flag || "🌐";
}

function SessionPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptRow[]>([]);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [liveTranscript, setLiveTranscript] = useState<{ text: string; lang: string } | null>(null);
  const [liveTranslation, setLiveTranslation] = useState<{ text: string; lang: string } | null>(null);
  const [interimTranslation, setInterimTranslation] = useState<string | null>(null);
  
  // Local state for active languages, initializing from session
  const [sourceLang, setSourceLang] = useState<string>("en");
  const [targetLang, setTargetLang] = useState<string>("ja");

  const recognizerRef = useRef<ReturnType<typeof createRecognizer> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load session
  useEffect(() => {
    supabase.from("sessions").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) {
        toast.error("Session not found");
        router.navigate({ to: "/home" });
        return;
      }
      setSession(data);
      setSourceLang(data.source_lang);
      setTargetLang(data.target_lang);
    });
  }, [id, router]);

  // Debounced interim translation for faster feeling
  useEffect(() => {
    if (!interim.trim()) {
      setInterimTranslation(null);
      return;
    }
    
    const handler = setTimeout(async () => {
      try {
        const { translation } = await translateUtterance({
          data: { text: interim, sourceLang, targetLang },
        });
        setInterimTranslation(translation);
      } catch (e) {
        // ignore interim translation errors
      }
    }, 800);
    
    return () => clearTimeout(handler);
  }, [interim, sourceLang, targetLang]);

  // Load transcripts + subscribe
  useEffect(() => {
    supabase
      .from("transcripts")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setTranscripts(data ?? []));

    const channel = supabase
      .channel(`transcripts:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transcripts", filter: `session_id=eq.${id}` },
        (payload) => {
          setTranscripts((prev) => {
            const row = payload.new as TranscriptRow;
            if (prev.find((r) => r.id === row.id)) return prev;
            return [...prev, row];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transcripts", filter: `session_id=eq.${id}` },
        (payload) => {
          setTranscripts((prev) =>
            prev.map((r) => (r.id === (payload.new as TranscriptRow).id ? (payload.new as TranscriptRow) : r)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, interim, liveTranslation, liveTranscript]);

  const handleFinal = async (text: string) => {
    if (!session || !user || !text.trim()) return;
    setInterim("");
    setLiveTranscript(null);
    
    // Optimistic insert
    const { data, error } = await supabase
      .from("transcripts")
      .insert({
        session_id: session.id,
        speaker_id: user.id,
        source_lang: sourceLang,
        target_lang: targetLang,
        original_text: text,
        translated_text: null,
      })
      .select()
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Failed to save utterance");
      return;
    }

    try {
      const { translation } = await translateUtterance({
        data: { text, sourceLang, targetLang },
      });
      setLiveTranslation({ text: translation, lang: targetLang.toUpperCase() });
      await supabase
        .from("transcripts")
        .update({ translated_text: translation })
        .eq("id", data.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Translation failed";
      toast.error(msg);
      setLiveTranslation({ text: `[error: ${msg}]`, lang: targetLang.toUpperCase() });
      await supabase
        .from("transcripts")
        .update({ translated_text: `[error: ${msg}]` })
        .eq("id", data.id);
    }
  };

  const toggleListen = () => {
    if (!session) return;
    if (listening) {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
      setListening(false);
      setInterim("");
      return;
    }
    if (!isSpeechRecognitionSupported()) {
      toast.error("Speech recognition isn't supported here. Use Chrome, Edge, or Safari on desktop.");
      return;
    }
    try {
      recognizerRef.current = createRecognizer(sourceLang, {
        onFinal: async (text) => {
          setLiveTranscript({ text, lang: sourceLang.toUpperCase() });
          await handleFinal(text);
        },
        onInterim: (text) => {
          setInterim(text);
          setLiveTranscript({ text, lang: sourceLang.toUpperCase() });
          setLiveTranslation(null);
        },
        onError: (m) => {
          if (m !== "no-speech" && m !== "aborted") toast.error(`Mic: ${m}`);
        },
        onEnd: () => {
          setListening(false);
          setInterim("");
          setLiveTranscript(null);
          // Do not clear liveTranslation here so it stays on screen until next speech
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
  };

  useEffect(() => () => recognizerRef.current?.stop(), []);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1017]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Get most recent transcript that has a translation if liveTranslation is null
  const mostRecentComplete = transcripts.slice().reverse().find(t => t.translated_text);
  
  const displayTargetText = liveTranslation 
    ? liveTranslation.text 
    : (interim ? (interimTranslation ?? mostRecentComplete?.translated_text ?? "Listening...") : (mostRecentComplete?.translated_text ?? "Say something to start translating..."));
    
  const displaySourceText = interim || liveTranscript?.text || (liveTranslation ? (transcripts[transcripts.length - 1]?.original_text ?? "") : mostRecentComplete?.original_text ?? "");


  return (
    <div className="flex h-screen flex-col bg-[#0d1017] text-white">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <button className="rounded-full p-2 hover:bg-white/10 transition-colors" aria-label="Menu" onClick={() => router.navigate({ to: "/home" })}>
          <Menu className="h-6 w-6" />
        </button>
        <span className="font-display text-lg font-semibold tracking-wide">Kotoba</span>
        <button className="rounded-full p-2 hover:bg-white/10 transition-colors" aria-label="Options">
          <MoreHorizontal className="h-6 w-6" />
        </button>
      </header>

      {/* Main Translation Display Area */}
      <div className="flex flex-1 flex-col justify-center px-8 py-6 pb-20 relative">
        <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-end">
          
          <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-4 scrollbar-hide" ref={scrollRef}>
            {/* The primary translated text (Target Language) */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="font-sans text-[2.5rem] leading-tight font-medium tracking-tight text-white/95">
                {displayTargetText}
              </p>
            </div>

            {/* The original text (Source Language) */}
            {displaySourceText && (
              <div className="animate-in fade-in duration-500 delay-100 mt-8">
                <p className="font-sans text-xl leading-relaxed text-white/60">
                  {displaySourceText}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="relative pb-10 pt-16 flex flex-col items-center">
        {/* Visualizer (absolute positioned slightly above the controls) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 h-16 pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => {
            const isCenter = Math.abs(i - 7) < 3;
            const height = isCenter ? "h-12" : "h-6";
            const delay = `${Math.random() * 0.5}s`;
            const duration = `${0.8 + Math.random() * 0.8}s`;
            return (
              <div
                key={i}
                className={`w-1.5 rounded-full bg-gradient-to-t from-cyan-400 to-indigo-500 transition-opacity ${listening ? 'opacity-100 visualizer-bar' : 'opacity-20'}`}
                style={{ 
                  animationDelay: listening ? delay : '0s',
                  animationDuration: listening ? duration : '0s',
                  height: listening ? '100%' : '1.5rem',
                  opacity: listening ? undefined : 0.2
                }}
              />
            );
          })}
        </div>

        {/* Record Button (overlapping visualizer) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={toggleListen}
            className={`flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full shadow-xl transition-transform active:scale-95 ${
              listening 
                ? "bg-red-500/20 text-red-500 backdrop-blur-md border border-red-500/50" 
                : "bg-[#1c212b] text-white hover:bg-[#252b36]"
            }`}
          >
            {listening ? <Pause className="h-8 w-8 fill-current" /> : <Mic className="h-8 w-8" />}
          </button>
        </div>

        {/* Control Bar Pill */}
        <div className="mt-8 flex items-center gap-4 rounded-[2rem] bg-[#1c212b]/80 px-6 py-4 backdrop-blur-xl border border-white/5 shadow-2xl">
          {/* Source Lang */}
          <Select value={sourceLang} onValueChange={setSourceLang} disabled={listening}>
            <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 p-0 h-auto flex items-center gap-2 hover:opacity-80 transition-opacity [&>svg]:hidden">
               <span className="text-xl">{getFlag(sourceLang)}</span>
               <span className="text-sm font-medium text-white/70">
                 {LANGS.find(l => l.code === sourceLang)?.label || sourceLang.toUpperCase()}
               </span>
            </SelectTrigger>
            <SelectContent className="bg-[#1c212b] text-white border-white/10">
              {LANGS.map((l) => (
                <SelectItem key={l.code} value={l.code} className="focus:bg-white/10 focus:text-white cursor-pointer">
                  <span className="mr-2">{l.flag}</span>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Swap */}
          <button 
            onClick={handleSwap}
            disabled={listening}
            className="rounded-full p-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all disabled:opacity-30"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>

          {/* Target Lang */}
          <Select value={targetLang} onValueChange={setTargetLang} disabled={listening}>
            <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 p-0 h-auto flex items-center gap-2 hover:opacity-80 transition-opacity [&>svg]:hidden">
               <span className="text-xl">{getFlag(targetLang)}</span>
               <span className="text-sm font-medium text-white/70">
                 {LANGS.find(l => l.code === targetLang)?.label || targetLang.toUpperCase()}
               </span>
            </SelectTrigger>
            <SelectContent className="bg-[#1c212b] text-white border-white/10">
              {LANGS.map((l) => (
                <SelectItem key={l.code} value={l.code} className="focus:bg-white/10 focus:text-white cursor-pointer">
                  <span className="mr-2">{l.flag}</span>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="w-px h-6 bg-white/10 mx-2" />

          {/* Headphones */}
          <button className="p-2 text-white/50 hover:text-white transition-colors">
            <Headphones className="h-5 w-5" />
          </button>
        </div>
      </div>
      
    </div>
  );
}
