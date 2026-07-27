import "dotenv/config";

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const SUPABASE_URL = process.env.SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
export const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || "";
export const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";
export const SMTP_FROM = process.env.SMTP_FROM || "QuickVoice <noreply@quickvoice.app>";

export const HOST = process.env.HOST || "0.0.0.0";
export const PORT = parseInt(process.env.PORT || "8000", 10);

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:3000", "http://localhost:8081"];
