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
  const pendingOTP = useRef<{ otp: string; expiresAt: number; email?: string; resetToken?: string } | null>(null);
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
        const cleanEmail = email.trim().toLowerCase();
        try {
          const res = await fetch(`${apiBase()}/api/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail }),
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            pendingOTP.current = { otp: "", expiresAt: Date.now() + 10 * 60 * 1000, email: cleanEmail };
            useSupabaseOTP.current = true;
            return {};
          }
          if (data && data.error && res.status < 500) {
            return { error: data.error };
          }
        } catch {
          // Backend not reachable, fallback to Supabase
        }

        if (!supabase) return { error: "Supabase is not configured." };
        const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail });
        if (!error) {
          pendingOTP.current = { otp: "", expiresAt: Date.now() + 10 * 60 * 1000, email: cleanEmail };
          return {};
        }
        return { error: typeof error === "string" ? error : error?.message || "Failed to send verification code." };
      },
      verifyOTP: async (email, token) => {
        const cleanEmail = (email || pendingOTP.current?.email || "").trim().toLowerCase();
        if (!cleanEmail) return { error: "Email is required." };

        if (useSupabaseOTP.current) {
          try {
            const res = await fetch(`${apiBase()}/api/verify-otp`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: cleanEmail, token: token.trim() }),
            });
            const data = await res.json();
            if (res.ok && data.ok) {
              pendingOTP.current = { otp: token.trim(), expiresAt: Date.now() + 10 * 60 * 1000, email: cleanEmail, resetToken: data.resetToken };
              return {};
            }
            return { error: data.error || "Invalid verification code." };
          } catch {
            return { error: "Failed to connect to backend for verification." };
          }
        }

        if (!supabase) return { error: "Supabase is not configured." };
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: token.trim(),
            type: "email",
          });
          if (error || !data.session) {
            return { error: error?.message || "Invalid code." };
          }
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

        if (pendingOTP.current && pendingOTP.current.email && useSupabaseOTP.current) {
          try {
            const res = await fetch(`${apiBase()}/api/reset-password`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                email: pendingOTP.current.email, 
                password,
                resetToken: pendingOTP.current.resetToken
              }),
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
