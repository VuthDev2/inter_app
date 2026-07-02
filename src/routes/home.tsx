import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Mic, Users } from "lucide-react";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — Live-Interpret" },
      { name: "description", content: "Start a new interpretation session or join one with a code." },
    ],
  }),
  component: () => (
    <AppShell>
      <HomePage />
    </AppShell>
  ),
});

type SessionRow = {
  id: string;
  code: string;
  name: string | null;
  source_lang: string;
  target_lang: string;
  status: string;
  created_at: string;
};

const LANGS = [
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
  { code: "kh", label: "Khmer" },
];

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [source, setSource] = useState("en");
  const [target, setTarget] = useState("ja");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("sessions")
      .select("*")
      .eq("host_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecent(data ?? []));
  }, [user]);

  const createSession = async () => {
    if (!user) return;
    setBusy(true);
    const code = randomCode();
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        host_id: user.id,
        code,
        name: name || null,
        source_lang: source,
        target_lang: target,
      })
      .select()
      .single();
    if (error || !data) {
      setBusy(false);
      toast.error(error?.message ?? "Could not create session");
      return;
    }
    await supabase.from("session_participants").insert({ session_id: data.id, user_id: user.id });
    router.navigate({ to: "/session/$id", params: { id: data.id } });
  };

  const joinSession = async () => {
    if (!user || !joinCode.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("sessions")
      .select("id")
      .eq("code", joinCode.trim().toUpperCase())
      .maybeSingle();
    setBusy(false);
    if (error || !data) {
      toast.error("No session found for that code");
      return;
    }
    await supabase
      .from("session_participants")
      .upsert({ session_id: data.id, user_id: user.id }, { onConflict: "session_id,user_id" });
    router.navigate({ to: "/session/$id", params: { id: data.id } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Start interpreting</h1>
        <p className="mt-1 text-muted-foreground">
          Host a live conversation or join one with a 6-character code.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Mic className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-semibold">New session</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Session name (optional)</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Team meeting" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={createSession} disabled={busy || source === target}>
              Start session <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {source === target && <p className="text-xs text-destructive">Pick two different languages.</p>}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-semibold">Join a session</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="j-code">Session code</Label>
              <Input
                id="j-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="uppercase tracking-widest text-center text-xl font-display"
                maxLength={6}
              />
            </div>
            <Button variant="secondary" className="w-full" onClick={joinSession} disabled={busy || joinCode.length < 4}>
              Join session
            </Button>
          </div>
        </div>
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">Your recent sessions</h2>
          <div className="grid gap-2">
            {recent.map((s) => (
              <Link
                key={s.id}
                to="/session/$id"
                params={{ id: s.id }}
                className="glass-card flex items-center justify-between p-4 transition-colors hover:bg-secondary/40"
              >
                <div>
                  <div className="font-medium">{s.name ?? `Session ${s.code}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.source_lang.toUpperCase()} → {s.target_lang.toUpperCase()} · {new Date(s.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-md bg-secondary px-2 py-1 font-mono text-xs">{s.code}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
