import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Kotoba" },
      { name: "description", content: "Sign in or create an account to host and join live AI interpretation sessions." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/home" });
  }, [loading, user, router]);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Account created — you can start interpreting now.");
  };

  const google = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Google sign-in failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Languages className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-semibold">Kotoba</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Real-time AI interpretation between two languages.
          </p>
        </div>

        <div className="glass-card p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4 space-y-4">
              <Field id="si-email" label="Email">
                <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </Field>
              <Field id="si-pw" label="Password">
                <Input id="si-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Button className="w-full" disabled={busy} onClick={signIn}>Sign in</Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-4 space-y-4">
              <Field id="su-name" label="Display name">
                <Input id="su-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
              </Field>
              <Field id="su-email" label="Email">
                <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </Field>
              <Field id="su-pw" label="Password">
                <Input id="su-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Button className="w-full" disabled={busy} onClick={signUp}>Create account</Button>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="secondary" className="w-full" disabled={busy} onClick={google}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
