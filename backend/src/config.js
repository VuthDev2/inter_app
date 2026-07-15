import "dotenv/config";

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const HOST = process.env.HOST || "0.0.0.0";
export const PORT = parseInt(process.env.PORT || "8000", 10);
