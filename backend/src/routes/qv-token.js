import { Router } from "express";

import { PYTHON_SERVER_URL } from "../config.js";

/**
 * Hand the caller a short-lived QuickVoice token.
 *
 * Mirrors apps/web/src/app/api/qv-token/route.ts exactly. The master key
 * (QUICKVOICE_API_KEY) stays in this process; a mobile build cannot hold it
 * the way the web page cannot — anything shipped in an app bundle is
 * extractable, same as anything in a browser's JS. Mobile previously sent its
 * own Supabase session token as the model server's credential, which the
 * model server was never checking for — it verifies this short-lived token,
 * not a Supabase JWT — so every call to the AI server (transcribe, translate,
 * tts, glossary, and the live-interpreter WebSocket) was rejected with 401
 * the moment QUICKVOICE_API_KEY got set.
 */
const router = Router();

router.post("/api/qv-token", async (_req, res) => {
  const key = (process.env.QUICKVOICE_API_KEY || "").trim();
  if (!key) {
    // No key configured means the model server is unauthenticated too — the
    // normal local-development case. Say so plainly rather than fail.
    return res.json({ token: null, unauthenticated: true });
  }

  try {
    const response = await fetch(`${PYTHON_SERVER_URL}/auth/token`, {
      method: "POST",
      headers: { "x-api-key": key },
    });
    if (!response.ok) {
      return res.status(502).json({ error: "Could not obtain a QuickVoice token." });
    }
    const body = await response.json();
    res.json({ token: body.token, expiresAt: body.expiresAt });
  } catch {
    res.status(502).json({ error: "QuickVoice server is unreachable." });
  }
});

export default router;
