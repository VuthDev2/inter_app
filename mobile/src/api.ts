export type BackendHealth = {
  ok: boolean;
  service?: string;
  message?: string;
  timestamp?: string;
  error?: string;
};

export type TranslateResult = {
  ok: boolean;
  translation: string;
  error?: string;
};

const DEFAULT_API_BASE_URL = "http://127.0.0.1:3001";

export function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
}

export async function getBackendHealth(): Promise<BackendHealth> {
  const response = await fetch(`${getApiBaseUrl()}/api/health`);
  if (!response.ok) return { ok: false, error: `Backend returned ${response.status}` };
  return response.json();
}

/**
 * Translate text via the Node.js backend (/api/translate).
 * Falls back to MyMemory directly if the backend is unreachable.
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  if (!text.trim()) return "";
  if (sourceLang === targetLang) return text;

  // ── Try local backend first ──
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sourceLang, targetLang }),
    });
    if (res.ok) {
      const json: TranslateResult = await res.json();
      if (json.translation) return json.translation;
    }
  } catch {
    // backend unreachable — fall through to direct MyMemory call
  }

  // ── Direct MyMemory fallback (no key needed) ──
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${sourceLang}|${targetLang}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      let t = json?.responseData?.translatedText as string | undefined;
      
      // If MyMemory returns an empty string for the main translation, check its matches array
      if (!t && json?.matches && Array.isArray(json.matches)) {
        const validMatch = json.matches.find((m: any) => m.translation && m.translation.trim().length > 0);
        if (validMatch) t = validMatch.translation;
      }
      
      if (t && !t.toLowerCase().includes("mymemory warning")) return t;
    }
  } catch {
    // ignore
  }

  return `[${sourceLang}→${targetLang}] ${text}`;
}
