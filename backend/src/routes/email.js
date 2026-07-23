import { createClient } from "@supabase/supabase-js";
import { Router } from "express";

import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from "../config.js";
import { sendOTPEmail, sendWelcomeEmail } from "../services/email.js";

const router = Router();

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes("your_")
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const supabasePublic =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

router.post("/api/signup", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ ok: false, error: "Valid email is required." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ ok: false, error: "Password must be at least 6 characters." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const name = displayName || cleanEmail.split("@")[0];

    // Try admin API first (no confirmation email sent by Supabase)
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: { display_name: name },
      });
      if (!error) {
        sendWelcomeEmail({ to: cleanEmail, name }).catch(() => {});
        return res.json({ ok: true });
      }
      console.error("[signup] Admin API error:", error);
    }

    // Fallback: regular signUp (may send Supabase confirmation email)
    if (supabasePublic) {
      const { error } = await supabasePublic.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { display_name: name } },
      });
      if (error) {
        console.error("[signup] Public API error:", error);
        return res.status(400).json({ ok: false, error: error.message });
      }
      // Fire-and-forget welcome email
      sendWelcomeEmail({ to: cleanEmail, name }).catch(() => {});
      return res.json({ ok: true });
    }

    return res.status(500).json({ ok: false, error: "Server configuration incomplete." });
  } catch (err) {
    console.error("[signup] Error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error." });
  }
});

router.post("/api/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ ok: false, error: "Valid email is required." });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    const result = await sendOTPEmail({ to: email.trim().toLowerCase(), otp });

    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error || "Failed to send email." });
    }

    return res.json({ ok: true, otp });
  } catch (err) {
    console.error("[send-otp] Error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error." });
  }
});

router.post("/api/reset-password", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email and password are required." });
    }
    if (!supabaseAdmin) {
      return res.status(500).json({ ok: false, error: "Server configuration incomplete." });
    }
    const cleanEmail = email.trim().toLowerCase();
    
    // Look up the user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    
    const user = users.find(u => u.email === cleanEmail);
    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found." });
    }
    
    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
    if (updateError) throw updateError;
    
    return res.json({ ok: true });
  } catch (err) {
    console.error("[reset-password] Error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error." });
  }
});

export default router;
