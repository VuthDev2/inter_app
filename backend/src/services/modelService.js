import fs from "node:fs/promises";
import { PYTHON_SERVER_URL } from "../config.js";

class ModelService {
  async transcribe(file, language) {
    try {
      const formData = new FormData();
      const buffer = await fs.readFile(file.path);
      const blob = new Blob([buffer], { type: file.mimetype || "audio/m4a" });
      formData.append("file", blob, file.originalname || "recording.m4a");
      formData.append("language", language);

      const response = await fetch(`${PYTHON_SERVER_URL}/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw Object.assign(new Error(errData.detail || "Transcription failed on local model server."), { status: response.status });
      }

      const data = await response.json();
      return data.text || "";
    } finally {
      await fs.unlink(file.path).catch(() => {});
    }
  }

  async translate({ text, source, target }) {
    const response = await fetch(`${PYTHON_SERVER_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source, target }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw Object.assign(new Error(errData.detail || "Translation failed on local model server."), { status: response.status });
    }

    const data = await response.json();
    return data.text;
  }
}

export const modelService = new ModelService();
