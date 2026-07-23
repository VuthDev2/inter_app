import { GoogleGenAI, Modality } from "@google/genai";

import { GEMINI_API_KEY } from "../config.js";

const MODEL = "gemini-live-2.5-flash-preview";
const INPUT_AUDIO_MIME = "audio/pcm;rate=16000";
const client = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

function sendJson(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

function textFromParts(parts = []) {
  return parts.map((part) => part.text ?? "").join("");
}

function languageInstruction(sourceLang, targetLang) {
  return [
    "You are a low-latency live interpreter.",
    `The speaker is using ${sourceLang}. Translate their speech into ${targetLang}.`,
    "Return only the translated speech as plain text.",
    "Keep phrases natural and concise. Do not explain, label, or wrap output in JSON.",
    "Respond as soon as a phrase is understandable so the translation updates continuously.",
  ].join(" ");
}

export function handleLiveConnection(ws) {
  let sourceLang = "en";
  let targetLang = "ja";
  let session = null;
  let sessionReady = false;
  let closed = false;
  const pendingAudio = [];

  let currentOriginal = "";
  let currentTranslation = "";

  async function connectLiveSession() {
    if (!client) {
      sendJson(ws, { type: "error", text: "Gemini API key not configured" });
      return;
    }

    try {
      session = await client.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.TEXT],
          temperature: 0.2,
          systemInstruction: languageInstruction(sourceLang, targetLang),
          inputAudioTranscription: {
            languageHints: { languageCodes: [sourceLang] },
          },
          realtimeInputConfig: {
            automaticActivityDetection: {},
          },
        },
        callbacks: {
          onopen: () => {
            sessionReady = true;
            sendJson(ws, { type: "ready" });
            while (pendingAudio.length > 0 && session) {
              session.sendRealtimeInput({ audio: pendingAudio.shift() });
            }
          },
          onmessage: (message) => {
            const content = message.serverContent;
            if (!content) return;

            const interim = content.interimInputTranscription?.text;
            if (interim) {
              sendJson(ws, { type: "transcript", text: interim, final: false });
            }

            const input = content.inputTranscription;
            if (input?.text) {
              currentOriginal = input.text.trim();
              sendJson(ws, {
                type: "transcript",
                text: currentOriginal,
                final: Boolean(input.finished),
              });
            }

            const delta = textFromParts(content.modelTurn?.parts);
            if (delta) {
              currentTranslation += delta;
              sendJson(ws, {
                type: "translation",
                text: currentTranslation.trim(),
                delta,
                final: false,
              });
            }

            if (content.turnComplete || content.generationComplete) {
              const original = currentOriginal.trim();
              const translation = currentTranslation.trim();
              if (original || translation) {
                sendJson(ws, {
                  type: "utterance",
                  original,
                  translation,
                });
              }
              currentOriginal = "";
              currentTranslation = "";
              sendJson(ws, { type: "translation", text: "", delta: "", final: true });
            }
          },
          onerror: (error) => {
            sendJson(ws, {
              type: "error",
              text: error?.message ?? "Live interpretation failed",
            });
          },
          onclose: () => {
            sessionReady = false;
            if (!closed) sendJson(ws, { type: "closed" });
          },
        },
      });
    } catch (error) {
      sendJson(ws, {
        type: "error",
        text: error?.message ?? "Could not start live interpretation",
      });
    }
  }

  function sendAudio(data) {
    const audio = { data, mimeType: INPUT_AUDIO_MIME };
    if (session && sessionReady) {
      session.sendRealtimeInput({ audio });
    } else {
      pendingAudio.push(audio);
    }
  }

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "config") {
        sourceLang = msg.sourceLang || sourceLang;
        targetLang = msg.targetLang || targetLang;
        connectLiveSession();
      } else if (msg.type === "audio" && msg.data) {
        sendAudio(msg.data);
      } else if (msg.type === "stop") {
        pendingAudio.length = 0;
        session?.sendRealtimeInput({ audioStreamEnd: true });
      }
    } catch {
      sendJson(ws, { type: "error", text: "Invalid live message" });
    }
  });

  ws.on("close", () => {
    closed = true;
    pendingAudio.length = 0;
    sessionReady = false;
    session?.close();
    session = null;
  });

  ws.on("error", () => {
    closed = true;
    sessionReady = false;
    session?.close();
    session = null;
  });
}
