import { Router } from "express";
import { PYTHON_SERVER_URL } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/translate", requireAuth, async (req, res) => {
  try {
    const { text, source, target } = req.body;

    if (!text || !source || !target) {
      return res.status(400).json({ ok: false, text: "", source, target });
    }

    const response = await fetch(`${PYTHON_SERVER_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source, target }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        ok: false,
        text: "",
        error: errData.detail || "Translation failed on local model server.",
      });
    }

    const data = await response.json();
    res.json({ ok: true, text: data.text, source, target });
  } catch (err) {
    console.error("[Translate Route] Error calling local model server:", err);
    res.status(500).json({ ok: false, text: "", error: "Translation service unavailable." });
  }
});

export default router;
