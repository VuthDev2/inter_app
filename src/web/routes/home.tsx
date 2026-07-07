import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Mic, Languages } from "lucide-react";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — QuickVoice" },
      { name: "description", content: "Start a face-to-face interpretation session." },
    ],
  }),
  component: () => (
    <AppShell>
      <HomePage />
    </AppShell>
  ),
});

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

function HomePage() {
  const router = useRouter();
  const [source, setSource] = useState("en");
  const [target, setTarget] = useState("ja");

  const startLocalSession = () => {
    router.navigate({ to: "/local-session", search: { source, target } });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="text-center space-y-3 pt-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 mb-4">
          <Languages className="h-8 w-8" />
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Instant Interpretation</h1>
        <p className="text-lg text-muted-foreground mx-auto max-w-xl">
          Talk with someone sitting right across from you. Works offline with a seamless split-screen interface.
        </p>
      </div>

      <div className="glass-card p-8 shadow-xl shadow-primary/5 ring-1 ring-border/50 rounded-2xl border-t border-t-white/10 dark:border-t-white/5">
        <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Face-to-Face Mode</h2>
            <p className="text-sm text-muted-foreground">Select languages for both speakers</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your Language</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-12 bg-background/50 focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Their Language</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="h-12 bg-background/50 focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {source === target && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              Please select two different languages for face-to-face interpretation.
            </div>
          )}

          <Button 
            className="w-full h-14 text-lg font-medium shadow-lg hover:shadow-xl transition-all mt-4" 
            size="lg"
            onClick={startLocalSession} 
            disabled={source === target}
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.15 255), oklch(0.55 0.15 255))",
              color: "white",
              border: "none",
            }}
          >
            Start Conversation <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
