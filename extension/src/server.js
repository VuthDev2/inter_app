/**
 * Where the QuickVoice model server is, and how to be allowed to talk to it.
 *
 * Both answers come from one place: the website's /api/qv-token route, which
 * replies with a short-lived token *and* the model server's current public
 * address. That matters because neither is a constant:
 *
 *   - The address was hard-coded to localhost:8000, which is only ever correct
 *     on the machine running the server. Anyone else got their own laptop.
 *   - The server tunnel is re-issued on every restart, so a URL written into
 *     the source is stale by the next morning.
 *   - The extension used to send the signed-in user's Supabase access token.
 *     The model server has no idea what that is -- it verifies a token it
 *     minted itself -- so every request came back 401 against a server with a
 *     key configured. It only ever appeared to work against a server started
 *     without one, where the check is skipped entirely.
 *
 * So the only thing anyone configures is the QuickVoice website address, and
 * everything else is discovered from it at runtime.
 */

(function () {
  const cfg = globalThis.QUICKVOICE_CONFIG || {};
  const SITE_KEY = "quickvoiceSiteUrl";

  /** Tokens last an hour; renew early so a request is never sent with one that
   *  expires mid-flight. */
  const RENEW_BEFORE_MS = 60_000;

  let cached = null; // { token, aiBaseUrl, expiresAtMs }

  const trim = (url) => String(url || "").replace(/\/+$/, "");

  /** The website this extension talks to. Stored, so it can be changed from the
   *  popup without editing and reloading the extension. */
  async function getSiteUrl() {
    const stored = await chrome.storage.local.get(SITE_KEY);
    return trim(stored[SITE_KEY] || cfg.webUrl || "http://localhost:3000");
  }

  async function setSiteUrl(url) {
    cached = null;
    await chrome.storage.local.set({ [SITE_KEY]: trim(url) });
  }

  /** Ask the website for a token and the model server's address. */
  async function resolve({ force = false } = {}) {
    if (!force && cached && cached.expiresAtMs - RENEW_BEFORE_MS > Date.now()) {
      return cached;
    }

    const site = await getSiteUrl();
    const response = await fetch(`${site}/api/qv-token`, { method: "POST" });
    if (!response.ok) {
      throw new Error(`QuickVoice website did not answer (${response.status}). Is it running at ${site}?`);
    }
    const data = await response.json();

    cached = {
      // A server started without a key needs no token, and says so. Sending
      // nothing is correct there rather than an error.
      token: data.token || null,
      // Falls back to the configured address for a purely local setup, where
      // the site has no public URL to hand out.
      aiBaseUrl: trim(data.aiBaseUrl) || trim(cfg.apiBaseUrl),
      // expiresAt is in seconds, and only a hint; treat a missing one as short.
      expiresAtMs: (Number(data.expiresAt) || 0) * 1000 || Date.now() + 300_000,
    };
    return cached;
  }

  /**
   * Call the model server. Resolves the address and credential first, and
   * retries once on 401 -- the token may simply have aged out between two
   * translations, and asking for a fresh one is cheaper than making the user
   * work out why a working extension stopped.
   */
  async function apiFetch(path, init = {}, retrying = false) {
    const { token, aiBaseUrl } = await resolve();
    if (!aiBaseUrl) throw new Error("No QuickVoice server address available.");

    const headers = { ...(init.headers || {}) };
    if (token) headers["X-API-Key"] = token;

    const response = await fetch(`${aiBaseUrl}${path}`, { ...init, headers });
    if (response.status === 401 && !retrying) {
      await resolve({ force: true });
      return apiFetch(path, init, true);
    }
    return response;
  }

  globalThis.QuickVoiceServer = { getSiteUrl, setSiteUrl, resolve, apiFetch };
})();
