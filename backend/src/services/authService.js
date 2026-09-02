import crypto from "node:crypto";
import { userRepository } from "../repositories/userRepository.js";
import { sendOTPEmail, sendWelcomeEmail } from "./email.js";

const otpStore = new Map(); // email -> { otpHash, expiresAt, attempts }
const resetTokenStore = new Map(); // email -> { tokenHash, userId, expiresAt }

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (now > val.expiresAt) otpStore.delete(key);
  }
  for (const [key, val] of resetTokenStore.entries()) {
    if (now > val.expiresAt) resetTokenStore.delete(key);
  }
}, 5 * 60 * 1000);

function safeCompare(strA, strB) {
  const bufA = Buffer.from(String(strA));
  const bufB = Buffer.from(String(strB));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

class AuthService {
  async signup({ email, password, displayName }) {
    if (!userRepository.isConfigured) {
      throw Object.assign(new Error("Server configuration incomplete."), { status: 500 });
    }
    const name = (displayName || email.split("@")[0]).trim();
    await userRepository.createUser(email, password, name);
    sendWelcomeEmail({ to: email, name }).catch((err) => console.error("Welcome email failed", err));
  }

  async sendOtp(email) {
    const otp = String(crypto.randomInt(100000, 1000000));
    const result = await sendOTPEmail({ to: email, otp });
    if (!result.ok) {
      throw Object.assign(new Error("Failed to send verification code."), { status: 500 });
    }
    otpStore.set(email, {
      otpHash: hashToken(otp),
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });
  }

  async verifyOtp(email, token) {
    const stored = otpStore.get(email);
    if (!stored) {
      throw Object.assign(new Error("No code requested or code expired. Please request a new code."), { status: 400 });
    }
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      throw Object.assign(new Error("Verification code has expired."), { status: 400 });
    }

    const inputHash = hashToken(String(token).trim());
    if (!safeCompare(stored.otpHash, inputHash)) {
      stored.attempts = (stored.attempts || 0) + 1;
      if (stored.attempts >= 5) {
        otpStore.delete(email);
        throw Object.assign(new Error("Too many failed attempts. Code invalidated. Please request a new code."), { status: 400 });
      }
      throw Object.assign(new Error("Invalid verification code."), { status: 400 });
    }

    const user = await userRepository.findUserByEmail(email);
    const userId = user ? user.id : null;

    otpStore.delete(email);
    const resetToken = crypto.randomBytes(32).toString("hex");
    resetTokenStore.set(email, {
      tokenHash: hashToken(resetToken),
      userId,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    return resetToken;
  }

  async resetPassword(email, password, resetToken) {
    const storedToken = resetTokenStore.get(email);
    if (!storedToken) {
      throw Object.assign(new Error("Invalid or expired authorization token. Please verify code again."), { status: 401 });
    }

    const inputTokenHash = hashToken(resetToken);
    if (!safeCompare(storedToken.tokenHash, inputTokenHash)) {
      throw Object.assign(new Error("Invalid authorization token. Please verify code again."), { status: 401 });
    }

    if (Date.now() > storedToken.expiresAt) {
      resetTokenStore.delete(email);
      throw Object.assign(new Error("Authorization token has expired. Please verify code again."), { status: 401 });
    }

    let userId = storedToken.userId;
    if (!userId) {
      const user = await userRepository.findUserByEmail(email);
      if (!user) {
        throw Object.assign(new Error("User not found."), { status: 404 });
      }
      userId = user.id;
    }

    await userRepository.updateUserPassword(userId, password);
    resetTokenStore.delete(email);
  }
}

export const authService = new AuthService();
