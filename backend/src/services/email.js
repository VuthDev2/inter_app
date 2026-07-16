import { Resend } from "resend";

import { RESEND_API_KEY } from "../config.js";

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

/**
 * Send a welcome email after sign-up.
 * Falls back to logging in development.
 */
export async function sendWelcomeEmail({ to, name }) {
  if (!resend) {
    console.log(`[DEV] Welcome email for ${to} (${name})`);
    return { ok: true };
  }

  const { error } = await resend.emails.send({
    from: "QuickVoice <noreply@quickvoice.app>",
    to,
    subject: "Welcome to QuickVoice",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#161B2E;font-size:20px;margin:0 0 8px;">Welcome to QuickVoice!</h2>
      <p style="color:#4A536B;font-size:14px;line-height:1.5;margin:0 0 20px;">
        Hi ${name}, your account is ready. Start interpreting in real-time.
      </p>
      <div style="background:#F7F8FB;border-radius:12px;padding:16px;text-align:center;">
        <span style="color:#4B71C4;font-size:18px;font-weight:600;">Real-time AI interpretation</span>
      </div>
    </div>`,
  });

  if (error) {
    console.error("[Email] Resend error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Send a 6-digit OTP code via email.
 * Falls back to logging to console in development if Resend is not configured.
 */
export async function sendOTPEmail({ to, otp }) {
  if (!resend) {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    return { ok: true };
  }

  const { error } = await resend.emails.send({
    from: "QuickVoice <noreply@quickvoice.app>",
    to,
    subject: "Your QuickVoice verification code",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#161B2E;font-size:20px;margin:0 0 8px;">QuickVoice</h2>
      <p style="color:#4A536B;font-size:14px;line-height:1.5;margin:0 0 20px;">
        Use the code below to reset your password. It expires in 10 minutes.
      </p>
      <div style="background:#F7F8FB;border-radius:12px;padding:16px;text-align:center;">
        <span style="color:#4B71C4;font-size:32px;font-weight:700;letter-spacing:6px;">${otp}</span>
      </div>
      <p style="color:#7B8299;font-size:12px;margin-top:20px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>`,
  });

  if (error) {
    console.error("[Email] Resend error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
