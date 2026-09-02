"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

/**
 * Coerce whatever an API or SDK put in an `error` field into text safe to
 * render. These values reach the form's error box directly, and a non-string
 * (an error object, a validation map) renders as a bare "{}" — which is what
 * the signup form showed while the auth backend was unreachable, telling the
 * user nothing at all about what went wrong.
 */
function errorText(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

type AuthContextValue = {
  initialized: boolean;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  sendOTP: (email: string) => Promise<{ error?: string }>;
  verifyOTP: (_email: string, token: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const pendingOTP = useRef<{ expiresAt: number; email: string } | null>(null);

  const [initialized, setInitialized] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      initialized,
      session,
      user: session?.user ?? null,
      signIn: async (email, password) => {
        if (!supabase) return { error: "Supabase is not configured." };
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (data?.session) {
            setSession(data.session);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return error ? { error: error.message } : {};
      },
      signUp: async (email, password, displayName) => {
        if (!supabase) return { error: "Supabase is not configured." };
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (data?.session) {
          setSession(data.session);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        return error ? { error: error.message } : {};
      },
      signOut: async () => {
        await supabase?.auth.signOut();
        router.push("/login");
      },
      signInWithGoogle: async () => {
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
      },
      signInWithFacebook: async () => {
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({
          provider: "facebook",
          options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
        });
      },
      updateProfile: async (displayName) => {
        if (!supabase) return { error: "Supabase is not configured." };
        const { data, error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
        if (data.user) setSession((current) => current ? { ...current, user: data.user } : current);
        return error ? { error: error.message } : {};
      },
      sendOTP: async (email) => {
        if (!supabase) return { error: "Supabase is not configured." };
        const cleanEmail = email.trim().toLowerCase();
        const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail });
        if (!error) {
          pendingOTP.current = { expiresAt: Date.now() + 10 * 60 * 1000, email: cleanEmail };
          return {};
        }
        return { error: errorText(error, "Failed to send verification code.") };
      },
      verifyOTP: async (email, token) => {
        if (!supabase) return { error: "Supabase is not configured." };
        const cleanEmail = (email || pendingOTP.current?.email || "").trim().toLowerCase();
        if (!cleanEmail) return { error: "Email is required." };
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: token.trim(),
            type: "email",
          });
          if (error || !data.session) {
            return { error: error?.message || "Invalid code." };
          }
          setSession(data.session);
          pendingOTP.current = null;
          return {};
        } catch {
          return { error: "Verification failed." };
        }
      },
      updatePassword: async (password) => {
        if (!supabase) return { error: "Supabase is not configured." };

        if (session) {
          const { error } = await supabase.auth.updateUser({ password });
          return error ? { error: error.message } : {};
        }

        return { error: "No active session and no verified OTP." };
      },
    }),
    [initialized, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
