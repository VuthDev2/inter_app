import nodemailer from "nodemailer";

import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } from "../config.js";

let transporter = null;

if (SMTP_USER && SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } catch (e) {
    console.error("[Email] Failed to create transporter:", e);
  }
}

function devLog(label, details) {
  console.log(`[DEV] ${label}:`, JSON.stringify(details));
}

async function trySend({ to, subject, html, label, logPayload }) {
  if (!transporter) {
    devLog(label, logPayload);
    return { ok: true };
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent ${label} to ${to} (id: ${info.messageId})`);
    return { ok: true };
  } catch (err) {
    console.error(`[Email] Nodemailer error (${label}):`, err.message);
    devLog(label, logPayload);
    return { ok: true }; // fall back to dev mode
  }
}

export async function sendWelcomeEmail({ to, name }) {
  return trySend({
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
    label: "Welcome email",
    logPayload: { to, name },
  });
}

export async function sendOTPEmail({ to, otp }) {
  return trySend({
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
    label: "OTP email",
    logPayload: { to, otp },
  });
}
