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
  if (runtimeApiBase) return runtimeApiBase;
  const configured = configuredBaseUrl();
  if (configured && !configured.includes("localhost")) return configured;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return configured || "http://localhost:8000";
}

/**
 * Short-lived access token, fetched from this site's own server.
 *
 * The master key never reaches the browser: /api/qv-token holds it server-side
 * and trades it for a token that expires. Cached here and renewed a minute
 * before expiry so a long recording never stalls on a refresh.
 */
let tokenCache: { token: string; expiresAt: number } | null = null;
let tokenInFlight: Promise<string> | null = null;
// Where the model server lives, learned at runtime rather than compiled in.
// The tunnel address changes every time it restarts; without this the whole
// site had to be rebuilt to pick up a new one.
let runtimeApiBase: string | null = null;

async function fetchToken(): Promise<string> {
  const response = await fetch("/api/qv-token", { method: "POST", cache: "no-store" });
  if (!response.ok) throw new Error("Could not authenticate with the QuickVoice server.");
  const body = await response.json();
  if (typeof body?.aiBaseUrl === "string" && body.aiBaseUrl) {
    runtimeApiBase = body.aiBaseUrl.replace(/\/$/, "");
  }
  if (!body?.token) {
    // Server runs without authentication (local development).
    tokenCache = { token: "", expiresAt: Number.MAX_SAFE_INTEGER };
    return "";
  }
  tokenCache = { token: body.token, expiresAt: (body.expiresAt ?? 0) * 1000 };
  return body.token;
}

/** A usable token, reusing the cached one until it is nearly expired. */
export async function quickVoiceToken(): Promise<string> {
  if (typeof window === "undefined") return "";
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.token;
  // Collapse concurrent callers onto one request so starting a session does
  // not mint several tokens at once.
  if (!tokenInFlight) {
    tokenInFlight = fetchToken().finally(() => { tokenInFlight = null; });
  }
  return tokenInFlight;
}

/** Headers every QuickVoice call needs, including the token when required. */
export async function quickVoiceHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const token = await quickVoiceToken();
  return token ? { ...extra, "x-api-key": token } : { ...extra };
}

export async function quickVoiceWsUrl(): Promise<string> {
  // Token first: fetching it is what teaches this module the runtime base URL.
  const token = await quickVoiceToken();
  const base = quickVoiceApiBase().replace(/^http/, "ws") + "/ws/live";
  // A browser cannot set headers on a WebSocket, so the token goes in the query.
  return token ? `${base}?key=${encodeURIComponent(token)}` : base;
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
  const headers = await quickVoiceHeaders();
  const response = await fetch(`${quickVoiceApiBase()}/glossary`, { headers });
  if (!response.ok) throw await responseError(response, "Could not load protected names.");
  const body = await response.json();
  return Array.isArray(body?.terms) ? body.terms.filter((t: unknown) => typeof t === "string") : [];
}

export async function saveProtectedNames(terms: string[]): Promise<string[]> {
  const headers = await quickVoiceHeaders({ "Content-Type": "application/json" });
  const response = await fetch(`${quickVoiceApiBase()}/glossary`, {
    method: "PUT",
    headers,
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
  const headers = await quickVoiceHeaders({ "Content-Type": "application/json" });
  const response = await fetch(`${quickVoiceApiBase()}/translate`, {
    method: "POST",
    headers,
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
  const headers = await quickVoiceHeaders({ "Content-Type": "application/json" });
  const response = await fetch(`${quickVoiceApiBase()}/tts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text: text.trim(), language, speed: 1 }),
  });
  if (!response.ok) throw await responseError(response, "Voice generation failed.");

  const url = URL.createObjectURL(await response.blob());
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  audio.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
  await audio.play();
}
