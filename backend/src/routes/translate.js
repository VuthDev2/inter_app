import { Router } from "express";
import { translate as mymemoryTranslate } from "../services/mymemory.js";
import { translateText as geminiTranslate } from "../services/gemini.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/translate", requireAuth, async (req, res) => {
  try {
    const { text, source, target } = req.body;

    if (!text || !source || !target) {
      return res.status(400).json({ ok: false, text: "", source, target });
    }

    const mymemoryResult = await mymemoryTranslate(text, source, target);
    if (mymemoryResult) {
      return res.json({ ok: true, text: mymemoryResult, source, target });
    }

    const geminiResult = await geminiTranslate(text, source, target);
    if (geminiResult) {
      return res.json({ ok: true, text: geminiResult, source, target });
    }

    res.json({ ok: false, text: `[${source}->${target}] ${text}`, source, target });
  } catch {
    res.status(500).json({ ok: false, text: "", error: "Translation failed." });
  }
});

export default router;
