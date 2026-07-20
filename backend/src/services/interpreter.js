import { GoogleGenAI, createPartFromBase64 } from "@google/genai";
import { GEMINI_API_KEY } from "../config.js";

const client = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
const MODEL = "gemini-2.0-flash";


export async function* streamInterpretation(
  audioBase64,
  mimeType,
  sourceLang,
  targetLang,
) {
  if (!client) {
    yield JSON.stringify({ original: "", translation: "", error: "Gemini API key not configured" });
    return;
  }

  const systemInstruction = `You are a real-time interpreter. The user is speaking in ${sourceLang}. Transcribe their speech and translate it to ${targetLang}. Respond with JSON only — no other text, no markdown:

{"original":"<transcribed text>","translation":"<translated text>"}`;

  try {
    const resp = await client.models.generateContentStream({
      model: MODEL,
      config: {
        systemInstruction: {
          role: "system",
          parts: [{ text: systemInstruction }],
        },
      },
      contents: [
        {
          role: "user",
          parts: [createPartFromBase64(audioBase64, mimeType)],
        },
      ],
    });

    for await (const chunk of resp) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (err) {
    yield JSON.stringify({ original: "", translation: "", error: err.message });
  }
}
