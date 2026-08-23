import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
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
  signInWithProvider: (provider: SocialProvider) => Promise<{ error?: string }>;
};

export type SocialProvider = "google" | "facebook";

/**
 * Social sign-in on a device cannot use a plain web redirect: there is no page
 * to come back to. Supabase is asked for the provider URL without redirecting,
 * the system browser handles the login, and the app is reopened through its
 * own scheme ("quickvoice://") with the tokens in the URL, which are then
 * installed as the session.
 */
async function openProviderSession(provider: SocialProvider): Promise<{ error?: string }> {
  if (!supabase) return { error: "Supabase mobile environment is not configured." };

  const redirectTo = Linking.createURL("auth-callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { error: error.message };
  if (!data?.url) return { error: `Could not start ${provider} sign-in.` };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    // The user dismissed the browser; that is a cancellation, not a failure.
    return result.type === "cancel" || result.type === "dismiss" ? {} : { error: "Sign-in was interrupted." };
  }

  // Supabase returns the tokens in the URL fragment.
  const fragment = result.url.split("#")[1] ?? "";
  const params = new URLSearchParams(fragment);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) {
    return { error: params.get("error_description") ?? "Sign-in did not return a session." };
  }

  const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
  return sessionError ? { error: sessionError.message } : {};
}

const AuthContext = createContext<AuthContextValue | null>(null);

function apiBase(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:8000";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const authReady = Boolean(supabase);
  const pendingOTP = useRef<{ expiresAt: number; email: string; resetToken?: string } | null>(null);
  const useSupabaseOTP = useRef(false);

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
      signInWithProvider: (provider) => openProviderSession(provider),
      signIn: async (email, password) => {
        if (!supabase) return { error: "Supabase mobile environment is not configured." };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      },
      signUp: async (email, password, displayName) => {
        if (!supabase) return { error: "Supabase mobile environment is not configured." };
        try {
          const res = await fetch(`${apiBase()}/api/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, displayName }),
          });
          if (res.ok) {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            return error ? { error: error.message } : {};
          }
          const data = await res.json();
          return { error: data.error || "Failed to create account." };
        } catch {
          // Backend unreachable — fall back to Supabase signUp directly
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: displayName || email.split("@")[0] },
            },
          });
          return error ? { error: error.message } : {};
        }
      },
      signOut: async () => {
        await supabase?.auth.signOut();
      },
      sendOTP: async (email) => {
        if (!supabase) return { error: "Supabase mobile environment is not configured." };
        useSupabaseOTP.current = false;
        try {
          const res = await fetch(`${apiBase()}/api/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          if (res.ok) {
            const data = await res.json();
            pendingOTP.current = { expiresAt: Date.now() + 10 * 60 * 1000, email: email.trim().toLowerCase() };
            return {};
          }
          if (res.status >= 500) throw new Error("Server error");
          const data = await res.json();
          return { error: data.error || "Failed to send code." };
        } catch {
          return { error: "Backend server unreachable or failed to send OTP." };
        }
      },
      verifyOTP: async (email, token) => {
        const stored = pendingOTP.current;
        if (!stored || Date.now() > stored.expiresAt) {
          pendingOTP.current = null;
          return { error: "Code expired. Request a new one." };
        }
        try {
          const res = await fetch(`${apiBase()}/api/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim().toLowerCase(), token: token.trim() }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) return { error: data.error || "Incorrect code. Try again." };
          pendingOTP.current = { ...stored, resetToken: data.resetToken };
        } catch {
          return { error: "Failed to verify code with the backend." };
        }
        useSupabaseOTP.current = true;
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

        // Otherwise, if they just verified OTP via backend
        if (pendingOTP.current && pendingOTP.current.email && useSupabaseOTP.current) {
          try {
            const res = await fetch(`${apiBase()}/api/reset-password`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: pendingOTP.current.email,
                password,
                resetToken: pendingOTP.current.resetToken,
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
    [authReady, initialized, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
