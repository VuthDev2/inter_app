import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Download, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Kotoba" },
      { name: "description", content: "Review and export past interpretation sessions." },
    ],
  }),
  component: () => (
    <AppShell>
      <HistoryPage />
    </AppShell>
  ),
});

type SessionWithCount = {
  id: string;
  code: string;
  name: string | null;
  source_lang: string;
  target_lang: string;
  status: string;
  created_at: string;
};

function HistoryPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // sessions where user was host or participant
    const load = async () => {
      const hosted = await supabase.from("sessions").select("*").eq("host_id", user.id);
      const joined = await supabase
        .from("session_participants")
        .select("session_id, sessions(*)")
        .eq("user_id", user.id);
      const map = new Map<string, SessionWithCount>();
      (hosted.data ?? []).forEach((s) => map.set(s.id, s));
      (joined.data ?? []).forEach((row) => {
        const s = row.sessions as SessionWithCount | null;
        if (s) map.set(s.id, s);
      });
      const list = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setSessions(list);
      setLoading(false);
    };
    load();
  }, [user]);

  const exportSession = async (s: SessionWithCount) => {
    const { data } = await supabase
      .from("transcripts")
      .select("*")
      .eq("session_id", s.id)
      .order("created_at", { ascending: true });
    const lines = [
      `# ${s.name ?? `Session ${s.code}`}`,
      `Date: ${new Date(s.created_at).toLocaleString()}`,
      `Languages: ${s.source_lang} ⇄ ${s.target_lang}`,
      "",
      ...((data ?? []).map(
        (t) =>
          `[${new Date(t.created_at).toLocaleTimeString()}] (${t.source_lang}→${t.target_lang})\n  ${t.original_text}\n  → ${t.translated_text ?? ""}\n`,
      )),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kotoba-${s.code}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Session history</h1>
        <p className="mt-1 text-muted-foreground">All conversations you hosted or joined.</p>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No sessions yet. Start one from the home page.
        </div>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <div key={s.id} className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
              <Link to="/session/$id" params={{ id: s.id }} className="flex-1">
                <div className="font-medium">{s.name ?? `Session ${s.code}`}</div>
                <div className="text-xs text-muted-foreground">
                  {s.source_lang.toUpperCase()} → {s.target_lang.toUpperCase()} ·{" "}
                  {new Date(s.created_at).toLocaleString()} ·{" "}
                  <span className={s.status === "ended" ? "text-muted-foreground" : "text-primary"}>{s.status}</span>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-secondary px-2 py-1 font-mono text-xs">{s.code}</div>
                <Button variant="ghost" size="sm" onClick={() => exportSession(s)}>
                  <Download className="mr-1.5 h-4 w-4" /> Export
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
