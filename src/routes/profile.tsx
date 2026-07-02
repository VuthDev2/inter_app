import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Languages, Mail, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Kotoba" },
      { name: "description", content: "Manage your display name and preferred language." },
    ],
  }),
  component: () => (
    <AppShell>
      <ProfilePage />
    </AppShell>
  ),
});

const LANGS = [
  { code: "kh", label: "Khmer"},
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
];

function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [preferred, setPreferred] = useState("en");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, preferred_language")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? "");
        setPreferred(data?.preferred_language ?? "en");
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName, preferred_language: preferred });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const initials = useMemo(() => {
    const base = displayName.trim() || user?.email || "U";
    return base
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U";
  }, [displayName, user?.email]);

  const selectedLang = LANGS.find((lang) => lang.code === preferred)?.label ?? "English";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="glass-card overflow-hidden p-0">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground shadow-lg shadow-primary/20">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  Personal profile
                </div>
                <h1 className="mt-1 font-display text-3xl font-semibold">Make the experience feel like yours</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Update your display name and default language so your sessions feel more personal and easier to follow.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Account ready
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Your preferences sync automatically for future sessions.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dn">Display name</Label>
              <Input
                id="dn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Add your name"
              />
              <p className="text-xs text-muted-foreground">This name appears to other participants in your sessions.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Preferred language</Label>
              <Select value={preferred} onValueChange={setPreferred}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Set your default language for interpretation and captions.</p>
            </div>

            <Button onClick={save} disabled={busy} className="w-full sm:w-auto">
              {busy ? "Saving..." : "Save changes"}
            </Button>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Languages className="h-4 w-4 text-primary" />
              Your profile preview
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{user?.email ?? "Signed in"}</div>
                  <div className="text-xs text-muted-foreground">Primary email</div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-border/70 bg-background/70 p-3">
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Preview</div>
                <div className="mt-2 font-medium">{displayName.trim() || "Your display name"}</div>
                <div className="text-sm text-muted-foreground">Default language: {selectedLang}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
