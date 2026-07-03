import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

const openAiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
const provider = createOpenAICompatible({
  name: "openai",
  baseURL: "https://api.openai.com/v1",
  headers: {
    Authorization: openAiKey ? `Bearer ${openAiKey}` : "",
    "Content-Type": "application/json",
  },
});

type TranslateUtterancePayload = {
  data: {
    text: string;
    sourceLang: string;
    targetLang: string;
  };
};

export async function translateUtterance({ data }: TranslateUtterancePayload) {
  const { text, sourceLang, targetLang } = data;

  if (!text.trim()) {
    return { translation: "" };
  }

  if (sourceLang === targetLang) {
    return { translation: text };
  }

  const prompt = `Translate the following text from ${sourceLang.toUpperCase()} to ${targetLang.toUpperCase()}:\n\n${text}\n\nRespond only with the translated text.`;

  if (!openAiKey) {
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`);
      const json = await response.json();
      if (json?.responseData?.translatedText) {
        return { translation: json.responseData.translatedText };
      }
    } catch (e) {
      console.error("Translation API failed", e);
    }
    return { translation: `[${sourceLang} → ${targetLang}] ${text}` };
  }

  const result = await generateText({
    model: provider("gpt-4o-mini"),
    prompt: prompt,
  });

  return { translation: result.text.trim() };
}
