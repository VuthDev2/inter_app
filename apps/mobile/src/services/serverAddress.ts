import { appStorage } from "./nativeStorage";

/**
 * The address of the QuickVoice model server, as typed in by the person using
 * the app.
 *
 * Everything else about finding the server is a guess: Metro's host, the value
 * baked into .env at build time, localhost. Those guesses cover the normal
 * cases, and then the laptop reconnects to Wi-Fi on a new IP, or the session
 * moves to a Cloudflare tunnel whose URL changes every run, and the app is dead
 * until somebody rebuilds it -- which on a real device means Xcode, a cable and
 * ten minutes. Typing the address in takes seconds and survives a restart.
 *
 * Stored, not synced: it describes how *this* handset reaches the server right
 * now, which is a fact about the network it is on, not about the account.
 */
const KEY = "quickvoice.serverUrl.v1";
// The model server (transcribe/translate/tts, port 8000) and the backend that
// mints its login token (auth/signup, port 5001) are two separate processes
// with two separate tunnels once either one leaves the laptop's own LAN --
// fixing one address never fixes the other, so each needs its own override.
const BACKEND_KEY = "quickvoice.backendUrl.v1";

let manual: string | null = null;
let loading: Promise<string | null> | null = null;
let manualBackend: string | null = null;
let loadingBackend: Promise<string | null> | null = null;

/** Trim a pasted address into something fetch can use, or null if it cannot be
 *  one. A bare host is assumed to be plain HTTP on the model server's port,
 *  since that is what a LAN address pasted off the start script looks like. */
export function normalizeServerUrl(raw: string): string | null {
  const text = raw.trim().replace(/\/+$/, "");
  if (!text) return null;

  const withScheme = /^https?:\/\//i.test(text) ? text : `http://${text}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname) return null;
    // A host with no port is only a guess on a LAN; a tunnel is served on 443
    // and must be left alone.
    if (!url.port && url.protocol === "http:" && !/^localhost$/i.test(url.hostname)) {
      url.port = "8000";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/** Read it from storage once, then answer from memory. */
export function loadManualServerUrl(): Promise<string | null> {
  if (manual !== null) return Promise.resolve(manual);
  if (!loading) {
    loading = appStorage.getItem(KEY).then((value) => {
      manual = value ?? "";
      return manual || null;
    });
  }
  return loading.then(() => manual || null);
}

/** What the last load found, without waiting. Null until `loadManualServerUrl`
 *  has resolved at least once. */
export function manualServerUrlSync(): string | null {
  return manual || null;
}

/** Save (or, with null, forget) the address. */
export async function setManualServerUrl(url: string | null): Promise<void> {
  manual = url ?? "";
  loading = Promise.resolve(manual || null);
  if (url) await appStorage.setItem(KEY, url);
  else await appStorage.removeItem(KEY);
}

/** Same three functions, for the backend (auth/signup) address instead of the
 *  model server. Kept as a parallel set rather than a parameter so neither
 *  Settings row can accidentally overwrite the other's saved value. */
export function loadManualBackendUrl(): Promise<string | null> {
  if (manualBackend !== null) return Promise.resolve(manualBackend);
  if (!loadingBackend) {
    loadingBackend = appStorage.getItem(BACKEND_KEY).then((value) => {
      manualBackend = value ?? "";
      return manualBackend || null;
    });
  }
  return loadingBackend.then(() => manualBackend || null);
}

export function manualBackendUrlSync(): string | null {
  return manualBackend || null;
}

export async function setManualBackendUrl(url: string | null): Promise<void> {
  manualBackend = url ?? "";
  loadingBackend = Promise.resolve(manualBackend || null);
  if (url) await appStorage.setItem(BACKEND_KEY, url);
  else await appStorage.removeItem(BACKEND_KEY);
}
