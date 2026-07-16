import "dotenv/config";

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
export const SUPABASE_URL = process.env.SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const HOST = process.env.HOST || "0.0.0.0";
export const PORT = parseInt(process.env.PORT || "8000", 10);
