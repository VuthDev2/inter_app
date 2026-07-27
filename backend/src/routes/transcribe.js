import { Router } from "express";
import multer from "multer";
import { transcribeAudio } from "../services/gemini.js";
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

    const language = req.body.language || "en";
    const text = await transcribeAudio(file.buffer, file.originalname, language);

    if (!text) {
      const keyMissing = !process.env.GEMINI_API_KEY;
      return res.json({
        ok: false,
        text: "",
        error: keyMissing ? "Gemini API key not configured on the server." : "Transcription failed.",
      });
    }

    res.json({ ok: true, text });
  } catch {
    res.status(500).json({ ok: false, text: "", error: "Transcription failed." });
  }
});

export default router;
