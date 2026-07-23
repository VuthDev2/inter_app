import { NativeModules, Platform } from "react-native";

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
export function liveWsUrl(): string {
  return baseUrl().replace(/^http/, "ws") + "/ws/live";
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

    const res = await fetch(`${baseUrl()}/transcribe`, {
      method: "POST",
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
    const res = await fetch(`${baseUrl()}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
 * Translate through the configured QuickVoice backend only.
 *
 * This is used by live interpretation so a missing local translation server is
 * surfaced to the user instead of silently changing providers.
 */
export async function translateTextViaApi(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  const normalizedText = text.trim();
  if (!normalizedText) return "";
  if (sourceLang === targetLang) return normalizedText;

  const translated = await translateViaBackend(
    normalizedText,
    sourceLang,
    targetLang,
  );
  if (!translated) {
    throw new Error("Translation server unavailable. Start the QuickVoice Python server and try again.");
  }
  return translated;
}

export async function synthesizeSpeechViaApi(
  text: string,
  language: "en" | "ja",
  speed = 1,
): Promise<Uint8Array> {
  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new Error("Speech text cannot be blank.");
  }

  const response = await fetch(`${baseUrl()}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: normalizedText, language, speed }),
  });

  if (!response.ok) {
    let message = "Text-to-speech server unavailable.";
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") message = body.detail;
    } catch {
      // Keep the stable fallback error when the server returns no JSON body.
    }
    throw new Error(message);
  }

  return new Uint8Array(await response.arrayBuffer());
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
