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
import { ArrowRight, Users, MonitorSmartphone } from "lucide-react";

export const Route = createFileRoute("/remote")({
  head: () => ({
    meta: [
      { title: "Remote Interpretation — QuickVoice" },
      { name: "description", content: "Host a remote interpretation session for meetings." },
    ],
  }),
  component: () => (
    <AppShell>
      <RemotePage />
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

function RemotePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  
  const [remoteSource, setRemoteSource] = useState("en");
  const [remoteTarget, setRemoteTarget] = useState("ja");

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
        source_lang: remoteSource,
        target_lang: remoteTarget,
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

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="text-center space-y-3 pt-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/20 mb-4">
          <MonitorSmartphone className="h-8 w-8" />
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Remote Meetings</h1>
        <p className="text-lg text-muted-foreground mx-auto max-w-xl">
          Host a live translated caption feed. Perfect for Google Meet or Zoom calls with international teams.
        </p>
      </div>

      <div className="glass-card p-8 shadow-xl shadow-accent/5 ring-1 ring-border/50 rounded-2xl border-t border-t-white/10 dark:border-t-white/5">
        <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">New Session</h2>
            <p className="text-sm text-muted-foreground">Setup the meeting translation details</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="s-name" className="text-sm font-medium">Session Name (Optional)</Label>
            <Input 
              id="s-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Weekly Global Sync" 
              className="h-11 bg-background/50 focus-visible:ring-accent"
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Primary Room Language</Label>
              <Select value={remoteSource} onValueChange={setRemoteSource}>
                <SelectTrigger className="h-11 bg-background/50 focus:ring-accent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your Default Translation</Label>
              <Select value={remoteTarget} onValueChange={setRemoteTarget}>
                <SelectTrigger className="h-11 bg-background/50 focus:ring-accent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            className="w-full h-12 text-base font-medium shadow-md hover:shadow-lg transition-all" 
            variant="default" 
            size="lg"
            onClick={createSession} 
            disabled={busy}
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.25 260), oklch(0.55 0.25 260))",
              color: "white",
              border: "none",
            }}
          >
            Start Remote Session <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="pt-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Your Recent Sessions</h2>
          </div>
          <div className="grid gap-3">
            {recent.map((s) => (
              <Link
                key={s.id}
                to="/session/$id"
                params={{ id: s.id }}
                className="group relative flex items-center justify-between rounded-xl border border-border/50 bg-card/40 p-4 transition-all hover:bg-card/80 hover:shadow-md hover:ring-1 hover:ring-accent/30"
              >
                <div>
                  <div className="font-medium group-hover:text-accent transition-colors">{s.name ?? `Session ${s.code}`}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-secondary/80 px-1.5 py-0.5 font-medium">{s.source_lang.toUpperCase()}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="rounded-md bg-secondary/80 px-1.5 py-0.5 font-medium">{s.target_lang.toUpperCase()}</span>
                    <span className="opacity-50">·</span>
                    <span>{new Date(s.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/60 px-3 py-1.5 font-mono text-sm shadow-sm ring-1 ring-inset ring-border/50">
                  {s.code}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
