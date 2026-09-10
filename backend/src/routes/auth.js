import { Router } from "express";
import rateLimit from "express-rate-limit";
import { signup, sendOtp, verifyOtp, resetPassword } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { signupSchema, sendOtpSchema, verifyOtpSchema, resetPasswordSchema } from "../schemas/authSchemas.js";

const router = Router();

const signupLimiter = rateLimit({ windowMs: 60_000, max: 3 });
const otpLimiter = rateLimit({ windowMs: 60_000, max: 5 });
const verifyLimiter = rateLimit({ windowMs: 60_000, max: 5 });
const resetLimiter = rateLimit({ windowMs: 60_000, max: 3 });

router.post("/api/signup", signupLimiter, validate(signupSchema), signup);
router.post("/api/send-otp", otpLimiter, validate(sendOtpSchema), sendOtp);
router.post("/api/verify-otp", verifyLimiter, validate(verifyOtpSchema), verifyOtp);
router.post("/api/reset-password", resetLimiter, validate(resetPasswordSchema), resetPassword);

export default router;
