import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages, Mic } from "lucide-react";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live - QuickVoice" },
      {
        name: "description",
        content: "Real-time English and Japanese conversation interpretation.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <LivePage />
    </AppShell>
  ),
});

const LANGS = [
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese" },
];

function LivePage() {
  const router = useRouter();
  const [source, setSource] = useState("en");
  const [target, setTarget] = useState("ja");

  const startLocalSession = () => {
    router.navigate({ to: "/local-session", search: { source, target } });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section>
        <h1 className="font-display text-4xl text-primary font-semibold tracking-tight">
          Welcome!
        </h1>
        <p className="text-sm font-medium text-primary"> </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight"></h1>
        <p className="mt-2 text-muted-foreground">Real-time interpretation</p>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Language Pair</h2>
            <p className="text-sm text-muted-foreground">
              English to Japanese or Japanese to English.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Your Language</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGS.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Their Language</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGS.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="mt-6 h-12 w-full"
          onClick={startLocalSession}
          disabled={source === target}
        >
          <Mic className="mr-2 h-4 w-4" />
          Start Interpret
        </Button>
      </section>
    </div>
  );
}
