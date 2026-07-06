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
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-secondary/20 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <button className="rounded-full p-2 hover:bg-secondary transition-colors" aria-label="Leave" onClick={() => router.navigate({ to: "/home" })}>
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display font-semibold">{session.name || "Remote Meeting"}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Code: <span className="font-mono tracking-widest">{session.code}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={targetLang} onValueChange={setTargetLang} disabled={listening}>
            <SelectTrigger className="h-9 border-border bg-background shadow-sm">
               <span className="mr-2">{getFlag(targetLang)}</span>
               <span className="hidden sm:inline text-sm">
                 Translate to: {LANGS.find(l => l.code === targetLang)?.label}
               </span>
            </SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  <span className="mr-2">{l.flag}</span>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Translation Display Area (Chat Feed) */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scrollbar-hide" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-6">
          {transcripts.length === 0 && !interim && !liveTranscript && (
            <div className="flex flex-col items-center justify-center h-40 text-center opacity-50">
              <Headphones className="h-12 w-12 mb-4" />
              <p>Waiting for someone to speak...</p>
            </div>
          )}

          {transcripts.map((t) => {
            const isMe = t.speaker_id === user?.id;
            return (
              <div key={t.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 ${
                  isMe 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-secondary text-secondary-foreground rounded-bl-sm border border-border/50'
                }`}>
                  <p className="font-display text-lg sm:text-xl font-medium leading-snug">
                    {t.translated_text || <span className="opacity-70 italic">Translating...</span>}
                  </p>
                  <p className={`mt-2 text-sm ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {t.original_text}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Live Interim Transcript */}
          {(interim || liveTranscript) && (
            <div className="flex flex-col items-end animate-in fade-in">
              <div className="max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 bg-primary/20 text-foreground rounded-br-sm border border-primary/30">
                <p className="font-display text-lg sm:text-xl font-medium leading-snug opacity-80">
                  {interimTranslation || "..."}
                </p>
                <p className="mt-2 text-sm text-primary/70 animate-pulse">
                  {interim || liveTranscript?.text}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-md flex justify-center pb-8">
        <div className="flex items-center gap-4 max-w-lg w-full bg-secondary/30 p-2 rounded-full border border-border/50">
          <Select value={sourceLang} onValueChange={setSourceLang} disabled={listening}>
            <SelectTrigger className="border-0 bg-transparent shadow-none w-auto focus:ring-0">
               <span className="mr-2 text-xl">{getFlag(sourceLang)}</span>
            </SelectTrigger>
            <SelectContent side="top">
              {LANGS.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex-1 text-center text-sm text-muted-foreground">
            {listening ? (
              <span className="text-primary animate-pulse flex items-center justify-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Listening...
              </span>
            ) : "Tap to speak"}
          </div>

          <button
            onClick={toggleListen}
            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all active:scale-95 flex-shrink-0 ${
              listening 
                ? "bg-destructive text-destructive-foreground animate-pulse" 
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {listening ? <Pause className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
