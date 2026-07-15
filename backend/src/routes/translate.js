import { Router } from "express";
import { translate as mymemoryTranslate } from "../services/mymemory.js";
import { translateText as geminiTranslate } from "../services/gemini.js";

const router = Router();

router.post("/translate", async (req, res) => {
  try {
    const { text, source, target } = req.body;

    if (!text || !source || !target) {
      return res.status(400).json({ ok: false, text: "", source, target });
    }

    // Try MyMemory first (free, no key needed)
    const mymemoryResult = await mymemoryTranslate(text, source, target);
    if (mymemoryResult) {
      return res.json({ ok: true, text: mymemoryResult, source, target });
    }

    // Fallback to Gemini
    const geminiResult = await geminiTranslate(text, source, target);
    if (geminiResult) {
      return res.json({ ok: true, text: geminiResult, source, target });
    }

    // Last-resort passthrough
    res.json({ ok: false, text: `[${source}->${target}] ${text}`, source, target });
  } catch (err) {
    res.status(500).json({ ok: false, text: "", error: err.message });
  }
});

export default router;
