import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { supabase } from "../../services/supabase";

type AuthContextValue = {
  initialized: boolean;
  session: Session | null;
  user: User | null;
  authReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  sendOTP: (email: string) => Promise<{ error?: string }>;
  verifyOTP: (_email: string, token: string) => Promise<{ error?: string }>;
  updateEmail: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const authReady = Boolean(supabase);
  const pendingOTP = useRef<{ expiresAt: number; email: string } | null>(null);

  useEffect(() => {
    if (!supabase) {
      setInitialized(true);
      return;
    }

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
      authReady,
      signIn: async (email, password) => {
        if (!supabase) return { error: "Supabase mobile environment is not configured." };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      },
      signUp: async (email, password, displayName) => {
        if (!supabase) return { error: "Supabase mobile environment is not configured." };
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        return error ? { error: error.message } : {};
      },
      signOut: async () => {
        await supabase?.auth.signOut();
      },
      sendOTP: async (email) => {
        if (!supabase) return { error: "Supabase mobile environment is not configured." };
        const cleanEmail = email.trim().toLowerCase();
        const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail });
        if (error) return { error: error.message };
        pendingOTP.current = { expiresAt: Date.now() + 10 * 60 * 1000, email: cleanEmail };
        return {};
      },
      verifyOTP: async (email, token) => {
        const stored = pendingOTP.current;
        if (!stored || Date.now() > stored.expiresAt) {
          pendingOTP.current = null;
          return { error: "Code expired. Request a new one." };
        }
        if (!supabase) return { error: "Supabase mobile environment is not configured." };
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: token.trim(),
          type: "email",
        });
        if (error || !data.session) return { error: error?.message || "Incorrect code. Try again." };
        setSession(data.session);
        pendingOTP.current = null;
        return {};
      },
      updateEmail: async (email) => {
        if (!supabase) return { error: "Supabase mobile environment is not configured." };
        if (!session) return { error: "No active session." };

        const { error } = await supabase.auth.updateUser({ email });
        return error ? { error: error.message } : {};
      },
      updatePassword: async (password) => {
        if (!supabase) return { error: "Supabase mobile environment is not configured." };
        
        // If they have a session, update normally
        if (session) {
          const { error } = await supabase.auth.updateUser({ password });
          return error ? { error: error.message } : {};
        }

        return { error: "No active session and no verified OTP." };
      },
    }),
    [authReady, initialized, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
