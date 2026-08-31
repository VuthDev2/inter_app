import { File } from "expo-file-system";
import { NativeModules, Platform } from "react-native";

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

const translationCache = new Map<string, string>();
const ttsCache = new Map<string, Uint8Array>();
const MAX_CACHE_ITEMS = 128;

/**
 * fetch() with a hard ceiling. Plain fetch has no timeout of its own, so a
 * server that accepts the connection and then never answers — which the
 * Whisper model server has done, wedged behind a full swap — leaves the
 * caller waiting forever with no error and no way to recover. A live
 * interpretation turn showed "TRANSLATING…" for the better part of an hour
 * because of exactly this. Every call on the live-interpreter path goes
 * through this instead of a bare fetch so a stuck server surfaces as a
 * timely error the UI can react to, not a silent, permanent freeze.
 */
async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${input} did not respond within ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function remember<K, V>(cache: Map<K, V>, key: K, value: V): V {
  if (cache.size >= MAX_CACHE_ITEMS) {
    const firstKey = cache.keys().next().value as K | undefined;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
  return value;
}


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

function configuredUrl(variable: "EXPO_PUBLIC_AI_BASE_URL" | "EXPO_PUBLIC_API_BASE_URL"): URL | null {
  const configured =
    variable === "EXPO_PUBLIC_AI_BASE_URL"
      ? process.env.EXPO_PUBLIC_AI_BASE_URL
      : process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!configured) return null;

  try {
    return new URL(configured);
  } catch {
    return null;
  }
}

const HEALTH_TIMEOUT_MS = 4_000;
const resolvedBases = new Map<number, string>();
const probesInFlight = new Map<number, Promise<string>>();

/**
 * Every address this device might reach the server on, best guess first.
 *
 * There is no single right answer: a Wi-Fi phone needs the dev machine's LAN
 * IP, a USB Android device needs "localhost" (via `adb reverse`), an emulator
 * needs 10.0.2.2, and a device on another network needs the tunnel. Metro's
 * own host covers most of those, but not when Metro itself is tunnelled — the
 * bundle then arrives from a host that serves no API.
 */
function candidateBaseUrls(
  variable: "EXPO_PUBLIC_AI_BASE_URL" | "EXPO_PUBLIC_API_BASE_URL",
  port: number,
): string[] {
  const candidates: string[] = [];

  const devHost = devHostFromMetro();
  if (devHost && devHost !== "localhost" && devHost !== "127.0.0.1") {
    candidates.push(`http://${devHost}:${port}`);
  }

  // Used verbatim — scheme, host and port all come from the env value, so an
  // HTTPS tunnel is not rewritten into a plain-HTTP URL on a port it never
  // listens on.
  const configured = configuredUrl(variable);
  if (configured) candidates.push(configured.toString().replace(/\/+$/, ""));

  candidates.push(`http://localhost:${port}`);
  if (Platform.OS === "android") candidates.push(`http://10.0.2.2:${port}`);

  return [...new Set(candidates)];
}

async function probeHealth(base: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}/health`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return base;
  } finally {
    clearTimeout(timer);
  }
}

/** First candidate to answer /health wins. Written out rather than using
 *  Promise.any so it does not depend on that being present in the JS engine. */
function firstReachable(candidates: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let outstanding = candidates.length;
    let settled = false;

    if (outstanding === 0) {
      reject(new Error("no candidate addresses"));
      return;
    }

    candidates.forEach((base) => {
      probeHealth(base).then(
        (winner) => {
          if (settled) return;
          settled = true;
          resolve(winner);
        },
        () => {
          outstanding -= 1;
          if (outstanding === 0 && !settled) {
            reject(new Error(`none of these answered: ${candidates.join(", ")}`));
          }
        },
      );
    });
  });
}

/**
 * Resolve — and remember — the address that actually answers.
 *
 * Guessing a single host is why the app worked in one setup and failed in
 * another: a wrong guess had no fallback. Probing every candidate at once
 * costs one round trip on first use and then nothing.
 */
function serverBaseUrl(
  variable: "EXPO_PUBLIC_AI_BASE_URL" | "EXPO_PUBLIC_API_BASE_URL",
  port: number,
): Promise<string> {
  const cached = resolvedBases.get(port);
  if (cached) return Promise.resolve(cached);

  const running = probesInFlight.get(port);
  if (running) return running;

  const candidates = candidateBaseUrls(variable, port);
  const probe = firstReachable(candidates)
    .then((winner) => {
      resolvedBases.set(port, winner);
      probesInFlight.delete(port);
      return winner;
    })
    .catch((reason: unknown) => {
      probesInFlight.delete(port);
      const detail = reason instanceof Error ? reason.message : String(reason);
      throw new Error(`no QuickVoice server reachable on port ${port} — ${detail}`);
    });

  probesInFlight.set(port, probe);
  return probe;
}

/**
 * Drop the remembered addresses so the next call probes again. Worth calling
 * when the device changes network, since the old winner is then unreachable.
 */
export function forgetResolvedServers(): void {
  resolvedBases.clear();
}

/**
 * Base URL for the AI server (transcribe/translate/tts), port 8000.
 *
 * QuickVoice runs ONE python-server that serves speech, translation and TTS
 * alongside the rest of the API — there is no second service on 8001. The port
 * matters more than it looks: the first address tried is Metro's own host,
 * which is by definition the machine the bundle just came from, so pairing it
 * with the right port makes the app find the server on any network without
 * anyone editing .env. With the wrong port that automatic path can never win
 * and every device falls back to a hard-coded IP that goes stale the moment
 * the laptop reconnects to Wi-Fi.
 */
function baseUrl(): Promise<string> {
  return serverBaseUrl("EXPO_PUBLIC_AI_BASE_URL", 8000);
}

/** Base URL for the Node backend (auth, signup, etc.), port 8000. */
export function apiBaseUrl(): Promise<string> {
  return serverBaseUrl("EXPO_PUBLIC_API_BASE_URL", 8000);
}

/** WebSocket URL for the live interpretation endpoint. */
export async function liveWsUrl(): Promise<string> {
  const url = (await baseUrl()).replace(/^http/, "ws") + "/ws/live";
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  const token = data.session?.access_token;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

async function authHeaders(base: Record<string, string> = {}): Promise<Record<string, string>> {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  const token = data.session?.access_token;
  return token ? { ...base, Authorization: `Bearer ${token}` } : base;
}


// ─── Health ───────────────────────────────────────────────────────────────────

export async function getBackendHealth(): Promise<BackendHealth> {
  try {
    const res = await fetch(`${await baseUrl()}/health`);
    if (res.ok) return { ok: true, message: "All systems normal" };
  } catch { /* ignore */ }
  return { ok: false, error: "unreachable" };
}


// ─── Protected names ─────────────────────────────────────────────────────────
// Names and organisations held intact through translation. NLLB renders most
// proper nouns correctly on its own; this list is for the ones that are also
// ordinary words, where "Hello, Nana" came back as こんにちは おばあちゃん.

export async function loadProtectedNames(): Promise<string[]> {
  try {
    const res = await fetch(`${await baseUrl()}/glossary`, { headers: await authHeaders() });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.terms) ? json.terms.filter((t: unknown): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

/** Returns the stored list, or null when the server could not be reached. */
export async function saveProtectedNames(terms: string[]): Promise<string[] | null> {
  try {
    const res = await fetch(`${await baseUrl()}/glossary`, {
      method: "PUT",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ terms }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json?.terms) ? json.terms.filter((t: unknown): t is string => typeof t === "string") : [];
  } catch {
    return null;
  }
}


// ─── Transcription (via backend ASR) ─────────────────────────────────────────

export async function transcribeAudio(
  audioUri: string,
  language: string,
): Promise<string> {
  const result = await transcribeAudioResult(audioUri, language);
  return result.text;
}

export async function transcribeAudioResult(
  audioUri: string,
  language: string,
  /**
   * Which language the caller expects next. Used by the server *only* to break
   * a genuine acoustic tie (Japanese "はい" against English "Hi", which score
   * almost identically); a confident detection always overrides it.
   */
  expectedLanguage?: "en" | "ja",
): Promise<{ text: string; language: "en" | "ja" | "unknown" }> {
  try {
    const ext = audioUri.split(".").pop()?.toLowerCase() ?? "wav";
    const audioFile = new File(audioUri);
    const form = new FormData();
    form.append("file", audioFile as unknown as Blob, `recording.${ext}`);
    form.append("language", language);
    if (expectedLanguage) form.append("expected", expectedLanguage);

    const res = await fetchWithTimeout(`${await baseUrl()}/transcribe`, {
      method: "POST",
      headers: await authHeaders(),
      body: form,
    }, 15_000);

    if (res.ok) {
      const json = await res.json();
      if (json.ok) {
        return {
          text: typeof json.text === "string" ? json.text : "",
          language: json.language === "ja" || json.language === "en" ? json.language : "unknown",
        };
      }
    }

    let message = "Speech server unavailable.";
    try {
      const json = await res.json();
      message = typeof json.detail === "string" ? json.detail : message;
    } catch { /* ignore */ }
    throw new Error(message);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Speech server unavailable.");
  }
}


// ─── Translation (backend preferred, MyMemory fallback) ──────────────────────

/**
 * Result of a backend translation attempt. On failure it carries why it failed
 * so callers can surface something more actionable than "server unavailable" —
 * an unreachable host and a rejected request need very different fixes.
 */
type BackendTranslation =
  | { ok: true; text: string }
  | { ok: false; reason: string };

async function translateViaBackend(
  text: string,
  source: string,
  target: string,
): Promise<BackendTranslation> {
  // Resolving the base URL is itself a network step that can fail, so it lives
  // inside the try and reports through the same `reason` channel.
  let url = "the translation server";
  try {
    url = `${await baseUrl()}/translate`;
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ text, source, target }),
    }, 15_000);

    if (!res.ok) {
      let detail = "";
      try {
        const json = await res.json();
        if (typeof json?.detail === "string") detail = ` — ${json.detail}`;
      } catch { /* body was not JSON */ }
      return { ok: false, reason: `${url} returned HTTP ${res.status}${detail}` };
    }

    const json = await res.json();
    if (json.ok && json.text) return { ok: true, text: json.text };
    return { ok: false, reason: `${url} returned no translation` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `could not reach ${url} (${message})` };
  }
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
  const cacheKey = `${sourceLang}->${targetLang}:${normalizedText}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const result = await translateViaBackend(normalizedText, sourceLang, targetLang);
  if (!result.ok) {
    throw new Error(`Translation unavailable: ${result.reason}`);
  }
  return remember(translationCache, cacheKey, result.text);
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
  const cacheKey = `${language}:${speed.toFixed(2)}:${normalizedText}`;
  const cached = ttsCache.get(cacheKey);
  if (cached) return cached;

  const response = await fetchWithTimeout(`${await baseUrl()}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: normalizedText, language, speed }),
  }, 20_000);

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

  return remember(ttsCache, cacheKey, new Uint8Array(await response.arrayBuffer()));
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
  if (backend.ok) return backend.text;

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
