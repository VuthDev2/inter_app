import { createClient } from "@supabase/supabase-js";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Missing or invalid authorization header." });
  }

  const token = header.slice(7);
  if (!supabase) {
    return res.status(500).json({ ok: false, error: "Auth service not configured." });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid or expired token." });
    }
    req.user = data.user;
    next();
  } catch {
    return res.status(500).json({ ok: false, error: "Authentication service unavailable." });
  }
}
