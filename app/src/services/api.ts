import { supabase } from "./supabase";

export type TranslateResult = {
  ok: boolean;
  translation: string;
  error?: string;
};

export type BackendHealth = {
  ok: boolean;
  status?: string;
  message?: string;
  error?: string;
};


function devHostFromMetro(): string | null {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.hostname || null;
  }

  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;
  if (!scriptUrl) return null;

  try {
    return new URL(scriptUrl).hostname;
  } catch {
    return null;
  }
}

/**
 * Get the backend base URL from environment or the current Expo dev host.
 */
function baseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const devHost = devHostFromMetro();
  if (devHost && devHost !== "localhost" && devHost !== "127.0.0.1") {
    return `http://${devHost}:8000`;
  }

  if (Platform.OS === "android") return "http://10.0.2.2:8000";
  return "http://localhost:8000";
}

/** WebSocket URL for the live interpretation endpoint. */
export async function liveWsUrl(): Promise<string> {
  let url = baseUrl().replace(/^http/, "ws") + "/ws/live";
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      url += `?token=${encodeURIComponent(data.session.access_token)}`;
    }
  }
  return url;
}


// ─── Health ───────────────────────────────────────────────────────────────────

export async function getBackendHealth(): Promise<BackendHealth> {
  try {
    const res = await fetch(`${baseUrl()}/health`);
    if (res.ok) return { ok: true, message: "All systems normal" };
  } catch { /* ignore */ }
  return { ok: false, error: "unreachable" };
}


// ─── Transcription (via backend → Gemini) ────────────────────────────────────

const MIME_MAP: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mp3",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  caf: "audio/x-caf",
  aac: "audio/aac",
};

function mimeFromUri(uri: string): string {
  const ext = uri.split(".").pop()?.toLowerCase() ?? "wav";
  return MIME_MAP[ext] ?? "audio/wav";
}

export async function transcribeAudio(
  audioUri: string,
  language: string,
): Promise<string> {
  try {
    const ext = audioUri.split(".").pop()?.toLowerCase() ?? "wav";
    const form = new FormData();
    form.append("file", {
      uri: audioUri,
      name: `recording.${ext}`,
      type: mimeFromUri(audioUri),
    } as any);
    form.append("language", language);

    const headers: Record<string, string> = {};
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        headers["Authorization"] = `Bearer ${data.session.access_token}`;
      }
    }

    const res = await fetch(`${baseUrl()}/transcribe`, {
      method: "POST",
      headers,
      body: form,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.ok && json.text) return json.text;
    }
  } catch { /* ignore */ }
  return "";
}


// ─── Translation (backend preferred, MyMemory fallback) ──────────────────────

async function translateViaBackend(
  text: string,
  source: string,
  target: string,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        headers["Authorization"] = `Bearer ${data.session.access_token}`;
      }
    }

    const res = await fetch(`${baseUrl()}/translate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, source, target }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.ok && json.text) return json.text;
    }
  } catch { /* ignore */ }
  return null;
}


/**
 * Translate text — tries the backend first, falls back to MyMemory.
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  if (!text.trim()) return "";
  if (sourceLang === targetLang) return text;

  // Try backend first
  const backend = await translateViaBackend(text, sourceLang, targetLang);
  if (backend) return backend;

  // ── MyMemory fallback (free, no key needed) ──
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${sourceLang}|${targetLang}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      let t = json?.responseData?.translatedText as string | undefined;
      if (!t && json?.matches && Array.isArray(json.matches)) {
        const validMatch = json.matches.find((m: any) => m.translation && m.translation.trim().length > 0);
        if (validMatch) t = validMatch.translation;
      }
      if (t && !t.toLowerCase().includes("mymemory warning")) return t;
    }
  } catch { /* ignore */ }
  return `[${sourceLang}→${targetLang}] ${text}`;
}
import { NativeModules, Platform } from "react-native";
