import { Router } from "express";
import multer from "multer";
import { PYTHON_SERVER_URL } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const router = Router();

router.post("/transcribe", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ ok: false, text: "", error: "No audio file provided" });
    }

    const language = req.body.language || "auto";

    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype || "audio/m4a" });
    formData.append("file", blob, file.originalname || "recording.m4a");
    formData.append("language", language);

    const response = await fetch(`${PYTHON_SERVER_URL}/transcribe`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        ok: false,
        text: "",
        error: errData.detail || "Transcription failed on local model server.",
      });
    }

    const data = await response.json();
    res.json({ ok: true, text: data.text || "" });
  } catch (err) {
    console.error("[Transcribe Route] Error calling local model server:", err);
    res.status(500).json({ ok: false, text: "", error: "Transcription service unavailable." });
  }
});

export default router;
