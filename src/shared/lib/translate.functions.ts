import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";

type TranslateUtterancePayload = {
  text: string;
  sourceLang: string;
  targetLang: string;
};

export const translateUtterance = createServerFn({ method: "POST" })
  .validator((data: TranslateUtterancePayload) => data)
  .handler(async ({ data }) => {
    const { text, sourceLang, targetLang } = data;

    if (!text.trim()) {
      return { translation: "" };
    }

    if (sourceLang === targetLang) {
      return { translation: text };
    }

    const prompt = `Translate the following text from ${sourceLang.toUpperCase()} to ${targetLang.toUpperCase()}:\n\n${text}\n\nRespond only with the translated text.`;
    const openAiKey = process.env.OPENAI_API_KEY || "";

    if (!openAiKey) {
      try {
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`,
        );
        const json = await response.json();
        if (json?.responseData?.translatedText) {
          return { translation: json.responseData.translatedText };
        }
      } catch (e) {
        console.error("Translation API failed", e);
      }
      return { translation: `[${sourceLang} → ${targetLang}] ${text}` };
    }

    const provider = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
    });

    const result = await generateText({
      model: provider("gpt-4o-mini"),
      prompt: prompt,
    });

    return { translation: result.text.trim() };
  });
