import { GoogleGenAI, createPartFromBase64 } from "@google/genai";
import { GEMINI_API_KEY } from "../config.js";

const client = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
const MODEL = "gemini-2.0-flash";

const LANGUAGE_NAMES = { en: "English", ja: "Japanese" };

// A 429 here means the API key's quota is exhausted, not a brief rate spike
// (Google reports "limit: 0" until billing/quota is fixed) — every retry
// wastes a full round trip before falling back. Skip Gemini for a cooldown
// window after a quota error instead of eating that latency on every call.
const QUOTA_COOLDOWN_MS = 60_000;
let quotaCooldownUntil = 0;

function isQuotaError(err) {
  return err?.status === 429;
}

export async function transcribeAudio(audioBuffer, filename, language) {
  if (!client || Date.now() < quotaCooldownUntil) return { text: "", language: null };

  const mimeType = filename?.endsWith(".mp3")
    ? "audio/mp3"
    : filename?.endsWith(".ogg")
      ? "audio/ogg"
      : filename?.endsWith(".m4a")
        ? "audio/mp4"
        : "audio/wav";

  const isBilingual = language === "en-ja";
  const prompt = isBilingual
    ? 'Listen to this audio and determine whether the speaker is speaking English or Japanese. ' +
      'Transcribe exactly what was said, verbatim, in that language\'s native script (do not translate ' +
      'or romanize Japanese speech). Respond with strict JSON only, no markdown fences: ' +
      '{"language": "en" or "ja", "text": "<transcript>"}'
    : `Transcribe the speech in this audio file to plain text. The spoken language is ${LANGUAGE_NAMES[language] || language}. Return only the transcribed text, no explanations.`;

  try {
    const resp = await client.models.generateContent({
      model: MODEL,
      contents: [
        prompt,
        createPartFromBase64(audioBuffer.toString("base64"), mimeType),
      ],
    });

    const raw = resp?.text?.trim() || "";
    if (!isBilingual) return { text: raw, language: null };

    try {
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, "");
      const parsed = JSON.parse(cleaned);
      return {
        text: typeof parsed.text === "string" ? parsed.text : "",
        language: parsed.language === "ja" || parsed.language === "en" ? parsed.language : null,
      };
    } catch {
      return { text: raw, language: null };
    }
  } catch (err) {
    if (isQuotaError(err)) quotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
    return { text: "", language: null };
  }
}

export async function translateText(text, source, target) {
  if (!client || Date.now() < quotaCooldownUntil) return "";

  try {
    const resp = await client.models.generateContent({
      model: MODEL,
      contents: [
        `Translate the following text from ${source} to ${target}. Return only the translated text, no explanations.\n\n${text}`,
      ],
    });

    return resp?.text?.trim() || "";
  } catch (err) {
    if (isQuotaError(err)) quotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
    return "";
  }
}
