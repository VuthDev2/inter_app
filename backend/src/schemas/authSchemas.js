import { z } from "zod";

const gmailEmail = z
  .string()
  .email("Valid email is required.")
  .endsWith("@gmail.com", { message: "Only @gmail.com email addresses are allowed." })
  .transform((val) => val.trim().toLowerCase());

export const signupSchema = z.object({
  email: gmailEmail,
  password: z.string().min(6, "Password must be at least 6 characters."),
  displayName: z.string().optional(),
});

export const sendOtpSchema = z.object({
  email: gmailEmail,
});

export const verifyOtpSchema = z.object({
  email: gmailEmail,
  token: z.string().min(1, "Verification code is required.").transform((val) => val.trim()),
});

export const resetPasswordSchema = z.object({
  email: gmailEmail,
  password: z.string().min(6, "Password must be at least 6 characters."),
  resetToken: z.string().min(1, "Authorization token is missing. Please verify code first."),
});
