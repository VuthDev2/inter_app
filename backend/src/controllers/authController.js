import asyncHandler from "express-async-handler";
import { authService } from "../services/authService.js";

export const signup = asyncHandler(async (req, res) => {
  await authService.signup(req.body);
  res.json({ ok: true });
});

export const sendOtp = asyncHandler(async (req, res) => {
  await authService.sendOtp(req.body.email);
  res.json({ ok: true });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const resetToken = await authService.verifyOtp(req.body.email, req.body.token);
  res.json({ ok: true, resetToken });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.email, req.body.password, req.body.resetToken);
  res.json({ ok: true });
});
