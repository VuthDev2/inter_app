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


/**
 * Get the backend base URL from environment or local dev default.
 */
function baseUrl(): string {
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
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

export async function transcribeAudio(
  audioUri: string,
  language: string,
): Promise<string> {
  try {
    const form = new FormData();
    form.append("file", {
      uri: audioUri,
      name: "recording.wav",
      type: "audio/wav",
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
