import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

const openAiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
const provider = createOpenAICompatible({
  provider: "openai",
  url: ({ path }) => `https://api.openai.com/v1/${path}`,
  headers: () => ({
    Authorization: openAiKey ? `Bearer ${openAiKey}` : undefined,
    "Content-Type": "application/json",
  }),
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
    return { translation: `[${sourceLang} → ${targetLang}] ${text}` };
  }

  const result = await generateText({
    model: "gpt-4o-mini",
    provider,
    input: prompt,
    max_length: 1024,
  });

  return { translation: result.text.trim() };
}
