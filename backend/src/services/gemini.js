import { GoogleGenAI, createPartFromBase64 } from "@google/genai";
import { GEMINI_API_KEY } from "../config.js";

const client = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
const MODEL = "gemini-2.0-flash";

export async function transcribeAudio(audioBuffer, filename, language) {
  if (!client) return "";

  const mimeType = filename?.endsWith(".mp3")
    ? "audio/mp3"
    : filename?.endsWith(".ogg")
      ? "audio/ogg"
      : filename?.endsWith(".m4a")
        ? "audio/mp4"
        : "audio/wav";

  try {
    const resp = await client.models.generateContent({
      model: MODEL,
      contents: [
        `Transcribe the speech in this audio file to plain text. The spoken language is ${language}. Return only the transcribed text, no explanations.`,
        createPartFromBase64(audioBuffer.toString("base64"), mimeType),
      ],
    });

    return resp?.text?.trim() || "";
  } catch {
    return "";
  }
}

export async function translateText(text, source, target) {
  if (!client) return "";

  try {
    const resp = await client.models.generateContent({
      model: MODEL,
      contents: [
        `Translate the following text from ${source} to ${target}. Return only the translated text, no explanations.\n\n${text}`,
      ],
    });

    return resp?.text?.trim() || "";
  } catch {
    return "";
  }
}
