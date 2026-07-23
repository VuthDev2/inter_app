"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

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
};

const AuthContext = createContext<AuthContextValue | null>(null);

function apiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:8000";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const pendingOTP = useRef<{ otp: string; expiresAt: number; email?: string } | null>(null);
  const useSupabaseOTP = useRef(false);

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
        try {
          const res = await fetch(`${apiBase()}/api/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, displayName }),
          });
          if (res.ok) {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (data?.session) {
                setSession(data.session);
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            return error ? { error: error.message } : {};
          }
          const resData = await res.json();
          return { error: resData.error || "Failed to create account." };
        } catch {
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
        }
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
      sendOTP: async (email) => {
        if (!supabase) return { error: "Supabase is not configured." };
        useSupabaseOTP.current = false;
        try {
          const res = await fetch(`${apiBase()}/api/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          if (res.ok) {
            const data = await res.json();
            pendingOTP.current = { otp: data.otp, expiresAt: Date.now() + 10 * 60 * 1000, email };
            return {};
          }
          if (res.status >= 500) throw new Error("Server error");
          const data = await res.json();
          return { error: data.error || "Failed to send code." };
        } catch {
          return { error: "Backend server unreachable or failed to send OTP." };
        }
      },
      verifyOTP: async (_email, token) => {
        const stored = pendingOTP.current;
        if (!stored || Date.now() > stored.expiresAt) {
          pendingOTP.current = null;
          return { error: "Code expired. Request a new one." };
        }
        if (stored.otp !== token) {
          return { error: "Incorrect code. Try again." };
        }
        useSupabaseOTP.current = true;
        pendingOTP.current = stored;
        return {};
      },
      updatePassword: async (password) => {
        if (!supabase) return { error: "Supabase is not configured." };

        if (session) {
          const { error } = await supabase.auth.updateUser({ password });
          return error ? { error: error.message } : {};
        }

        if (pendingOTP.current && pendingOTP.current.email && useSupabaseOTP.current) {
          try {
            const res = await fetch(`${apiBase()}/api/reset-password`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: pendingOTP.current.email, password }),
            });
            if (res.ok) {
              pendingOTP.current = null;
              useSupabaseOTP.current = false;
              return {};
            }
            const data = await res.json();
            return { error: data.error || "Failed to reset password." };
          } catch {
            return { error: "Failed to connect to backend to reset password." };
          }
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
