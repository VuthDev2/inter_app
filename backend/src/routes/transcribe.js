import { Router } from "express";
import multer from "multer";
import { transcribeAudio } from "../services/gemini.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ ok: false, text: "", error: "No audio file provided" });
    }

    const language = req.body.language || "en";
    const text = await transcribeAudio(file.buffer, file.originalname, language);

    if (!text) {
      return res.json({ ok: false, text: "", error: "Transcription failed or Gemini key not configured" });
    }

    res.json({ ok: true, text });
  } catch (err) {
    res.status(500).json({ ok: false, text: "", error: err.message });
  }
});

export default router;
