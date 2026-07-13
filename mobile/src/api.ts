export type TranslateResult = {
  ok: boolean;
  translation: string;
  error?: string;
};

/**
 * Translate text directly on-device via the free MyMemory API.
 * No backend server needed.
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  if (!text.trim()) return "";
  if (sourceLang === targetLang) return text;

  // ── MyMemory translation (free, no key needed) ──
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
