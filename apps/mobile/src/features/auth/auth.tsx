import type { Session, User } from "@supabase/supabase-js";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Crypto from 'expo-crypto';

import { supabase } from "../../services/supabase";

type AuthContextValue = {
  initialized: boolean;
  session: Session | null;
  user: User | null;
  authReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
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
      signInWithGoogle: async () => {
        if (!supabase) return { error: "Supabase mobile environment is not configured." };
        try {
          // Configure Google Sign-In
          GoogleSignin.configure({
            scopes: ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"],
            webClientId: "827497311574-enhqj6mclo70mnc8gmosadsrvno19hfa.apps.googleusercontent.com",
            iosClientId: "827497311574-b27csvqgvc22sam3jfg21ien8ug2vd3v.apps.googleusercontent.com",
          });

          await GoogleSignin.hasPlayServices();
          try {
            await GoogleSignin.signOut(); // Wipes cached tokens
          } catch (e) {
            // Ignore
          }
          const response = await GoogleSignin.signIn();
          const idToken = response.data?.idToken || (response as any).idToken;
          
          if (idToken) {
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: idToken,
            });
            return error ? { error: error.message } : {};
          } else {
            return { error: "No ID token present!" };
          }
        } catch (error: any) {
          if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            return { error: "User cancelled the login flow" };
          } else if (error.code === statusCodes.IN_PROGRESS) {
            return { error: "Sign in is in progress already" };
          } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            return { error: "Play services not available or outdated" };
          } else {
            return { error: error.message || "An unknown error occurred" };
          }
        }
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
