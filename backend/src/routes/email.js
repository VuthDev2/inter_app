import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Router } from "express";
import rateLimit from "express-rate-limit";

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

const signupLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  message: { ok: false, error: "Too many sign-up attempts. Wait a moment." },
});

const otpLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { ok: false, error: "Too many OTP requests. Wait a moment." },
});

const verifyLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { ok: false, error: "Too many verification attempts. Please wait a moment." },
});

const resetLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  message: { ok: false, error: "Too many reset attempts. Wait a moment." },
});

router.post("/api/signup", signupLimiter, async (req, res) => {
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

    if (supabasePublic) {
      const { error } = await supabasePublic.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { display_name: name } },
      });
      if (error) {
        return res.status(400).json({ ok: false, error: error.message });
      }
      sendWelcomeEmail({ to: cleanEmail, name }).catch(() => {});
      return res.json({ ok: true });
    }

    return res.status(500).json({ ok: false, error: "Server configuration incomplete." });
  } catch {
    return res.status(500).json({ ok: false, error: "Internal server error." });
  }
});

const otpStore = new Map(); // cleanEmail -> { otp, expiresAt, attempts }
const resetTokenStore = new Map(); // cleanEmail -> { resetToken, expiresAt }

// Periodic cleanup of expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (now > val.expiresAt) otpStore.delete(key);
  }
  for (const [key, val] of resetTokenStore.entries()) {
    if (now > val.expiresAt) resetTokenStore.delete(key);
  }
}, 5 * 60 * 1000);

router.post("/api/send-otp", otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ ok: false, error: "Valid email is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const result = await sendOTPEmail({ to: cleanEmail, otp });

    if (!result.ok) {
      return res.status(500).json({ ok: false, error: "Failed to send verification code." });
    }

    otpStore.set(cleanEmail, { otp, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: "Internal server error." });
  }
});

router.post("/api/verify-otp", verifyLimiter, async (req, res) => {
  try {
    const { email, token } = req.body;
    if (!email || !token) {
      return res.status(400).json({ ok: false, error: "Email and verification code are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const stored = otpStore.get(cleanEmail);

    if (!stored) {
      return res.status(400).json({ ok: false, error: "No code requested or code expired. Please request a new code." });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ ok: false, error: "Verification code has expired." });
    }

    if (stored.otp !== String(token).trim()) {
      stored.attempts = (stored.attempts || 0) + 1;
      if (stored.attempts >= 5) {
        otpStore.delete(cleanEmail);
        return res.status(400).json({ ok: false, error: "Too many failed attempts. Code invalidated. Please request a new code." });
      }
      return res.status(400).json({ ok: false, error: "Invalid verification code." });
    }

    // OTP verified successfully - issue authorization resetToken for password reset
    otpStore.delete(cleanEmail);
    const resetToken = crypto.randomBytes(32).toString("hex");
    resetTokenStore.set(cleanEmail, { resetToken, expiresAt: Date.now() + 15 * 60 * 1000 });

    return res.json({ ok: true, resetToken });
  } catch {
    return res.status(500).json({ ok: false, error: "Internal server error." });
  }
});

router.post("/api/reset-password", resetLimiter, async (req, res) => {
  try {
    const { email, password, resetToken } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email and password are required." });
    }
    if (!resetToken) {
      return res.status(401).json({ ok: false, error: "Authorization token is missing. Please verify code first." });
    }
    if (!supabaseAdmin) {
      return res.status(500).json({ ok: false, error: "Server configuration incomplete." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const storedToken = resetTokenStore.get(cleanEmail);

    if (!storedToken || storedToken.resetToken !== resetToken) {
      return res.status(401).json({ ok: false, error: "Invalid or expired authorization token. Please verify code again." });
    }

    if (Date.now() > storedToken.expiresAt) {
      resetTokenStore.delete(cleanEmail);
      return res.status(401).json({ ok: false, error: "Authorization token has expired. Please verify code again." });
    }

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const user = users.find(u => u.email === cleanEmail);
    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found." });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
    if (updateError) throw updateError;

    resetTokenStore.delete(cleanEmail);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: "Internal server error." });
  }
});

export default router;
