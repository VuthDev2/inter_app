export type QuickVoiceLanguage = "en" | "ja";

function configuredBaseUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_AI_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  return value?.replace(/\/$/, "") || null;
}

/**
 * Use the configured QuickVoice server when supplied. Otherwise, use the same
 * hostname that served the website with the Python model port. The latter is
 * important when the site is opened from another phone/computer: `localhost`
 * would point at that device instead of the Mac running Whisper/NLLB/Kokoro.
 */
export function quickVoiceApiBase(): string {
  const configured = configuredBaseUrl();
  if (configured && !configured.includes("localhost")) return configured;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return configured || "http://localhost:8000";
}

export function quickVoiceWsUrl(): string {
  return quickVoiceApiBase().replace(/^http/, "ws") + "/ws/live";
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return new Error(body.detail);
  } catch {
    // The model server may return a plain-text proxy error.
  }
  return new Error(fallback);
}

/**
 * Names and organisations held intact through translation. NLLB translates
 * most proper nouns correctly on its own; this list is for the ones that are
 * also ordinary words, where "Hello, Nana" became こんにちは おばあちゃん.
 */
export async function loadProtectedNames(): Promise<string[]> {
  const response = await fetch(`${quickVoiceApiBase()}/glossary`);
  if (!response.ok) throw await responseError(response, "Could not load protected names.");
  const body = await response.json();
  return Array.isArray(body?.terms) ? body.terms.filter((t: unknown) => typeof t === "string") : [];
}

export async function saveProtectedNames(terms: string[]): Promise<string[]> {
  const response = await fetch(`${quickVoiceApiBase()}/glossary`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ terms }),
  });
  if (!response.ok) throw await responseError(response, "Could not save protected names.");
  const body = await response.json();
  return Array.isArray(body?.terms) ? body.terms.filter((t: unknown) => typeof t === "string") : [];
}

export async function translateWithQuickVoice(
  text: string,
  source: QuickVoiceLanguage,
  target: QuickVoiceLanguage,
): Promise<string> {
  const response = await fetch(`${quickVoiceApiBase()}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.trim(), source, target }),
  });
  if (!response.ok) throw await responseError(response, "Translation failed.");
  const body = await response.json();
  if (!body?.ok || typeof body.text !== "string") throw new Error("No translation was returned.");
  return body.text;
}

export async function speakWithQuickVoice(
  text: string,
  language: QuickVoiceLanguage,
): Promise<void> {
  const response = await fetch(`${quickVoiceApiBase()}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.trim(), language, speed: 1 }),
  });
  if (!response.ok) throw await responseError(response, "Voice generation failed.");

  const url = URL.createObjectURL(await response.blob());
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  audio.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
  await audio.play();
}
