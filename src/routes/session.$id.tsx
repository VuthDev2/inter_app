import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { translateUtterance } from "@/lib/translate.functions";
import { createRecognizer, isSpeechRecognitionSupported } from "@/lib/speech";
import { ArrowLeft, Mic, MicOff, StopCircle, Copy, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/session/$id")({
  head: () => ({
    meta: [
      { title: "Live session — Kotoba" },
      { name: "description", content: "Live AI-interpreted conversation." },
    ],
  }),
  component: () => (
    <AppShell>
      <SessionPage />
    </AppShell>
  ),
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

function SessionPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptRow[]>([]);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speakLang, setSpeakLang] = useState<"source" | "target">("source");
  const [participantCount, setParticipantCount] = useState(1);
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
    });
  }, [id, router]);

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

  // Participant count
  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from("session_participants")
        .select("*", { count: "exact", head: true })
        .eq("session_id", id);
      setParticipantCount(count ?? 1);
    };
    load();
    const channel = supabase
      .channel(`participants:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcripts, interim]);

  const handleFinal = async (text: string) => {
    if (!session || !user || !text.trim()) return;
    setInterim("");
    const sourceLang = speakLang === "source" ? session.source_lang : session.target_lang;
    const targetLang = speakLang === "source" ? session.target_lang : session.source_lang;

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
      await supabase
        .from("transcripts")
        .update({ translated_text: translation })
        .eq("id", data.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Translation failed";
      toast.error(msg);
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
    const lang = speakLang === "source" ? session.source_lang : session.target_lang;
    try {
      recognizerRef.current = createRecognizer(lang, {
        onFinal: handleFinal,
        onInterim: setInterim,
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

  const endSession = async () => {
    if (!session || !user || session.host_id !== user.id) return;
    await supabase.from("sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", session.id);
    recognizerRef.current?.stop();
    router.navigate({ to: "/history" });
  };

  const copyCode = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.code);
    toast.success("Code copied");
  };

  useEffect(() => () => recognizerRef.current?.stop(), []);

  if (!session) {
    return <div className="text-muted-foreground">Loading session…</div>;
  }

  const isHost = user?.id === session.host_id;
  const activeLang = speakLang === "source" ? session.source_lang : session.target_lang;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/home"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-semibold">{session.name ?? "Live session"}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="uppercase">{session.source_lang} ⇄ {session.target_lang}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {participantCount}</span>
              {session.status === "ended" && <span className="text-destructive">Ended</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="glass-card inline-flex items-center gap-2 px-3 py-2 font-mono text-sm hover:bg-secondary/40"
          >
            {session.code} <Copy className="h-3.5 w-3.5" />
          </button>
          {isHost && session.status !== "ended" && (
            <Button variant="destructive" size="sm" onClick={endSession}>
              <StopCircle className="mr-1.5 h-4 w-4" /> End
            </Button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="glass-card h-[52vh] overflow-y-auto p-6 space-y-4">
        {transcripts.length === 0 && !interim && (
          <div className="flex h-full items-center justify-center text-center text-muted-foreground">
            <div>
              <Mic className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>Press the microphone to start speaking.</p>
              <p className="text-xs mt-1">Everything you say is transcribed and translated in real time.</p>
            </div>
          </div>
        )}
        {transcripts.map((t) => {
          const isSelf = t.speaker_id === user?.id;
          const accent = t.source_lang === session.source_lang ? "text-speaker-a" : "text-speaker-b";
          return (
            <div key={t.id} className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl bg-secondary/50 p-4 ${isSelf ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                <div className={`text-xs font-medium uppercase tracking-wider ${accent}`}>
                  {t.source_lang} → {t.target_lang}
                </div>
                <p className="mt-1 text-lg leading-snug">{t.original_text}</p>
                <p className="mt-2 border-t border-border/60 pt-2 text-lg leading-snug text-muted-foreground">
                  {t.translated_text ?? <span className="inline-flex gap-1"><Dot /><Dot delay={150} /><Dot delay={300} /></span>}
                </p>
              </div>
            </div>
          );
        })}
        {interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl border border-dashed border-border p-4 opacity-70">
              <p className="text-lg italic">{interim}</p>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card flex flex-col items-center gap-4 p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Speaking</span>
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              onClick={() => !listening && setSpeakLang("source")}
              disabled={listening}
              className={`px-3 py-1.5 text-xs font-medium uppercase ${speakLang === "source" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
            >
              {session.source_lang}
            </button>
            <button
              onClick={() => !listening && setSpeakLang("target")}
              disabled={listening}
              className={`px-3 py-1.5 text-xs font-medium uppercase ${speakLang === "target" ? "bg-accent text-accent-foreground" : "hover:bg-secondary"}`}
            >
              {session.target_lang}
            </button>
          </div>
        </div>

        <button
          onClick={toggleListen}
          disabled={session.status === "ended"}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-40 ${
            listening ? "bg-destructive text-destructive-foreground pulse-ring" : "bg-primary text-primary-foreground"
          }`}
          aria-label={listening ? "Stop listening" : "Start listening"}
        >
          {listening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </button>
        <p className="text-xs text-muted-foreground">
          {listening ? `Listening in ${activeLang.toUpperCase()}…` : "Tap to speak"}
        </p>
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
