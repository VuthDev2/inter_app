import asyncHandler from "express-async-handler";
import { modelService } from "../services/modelService.js";

export const transcribe = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ ok: false, text: "", error: "No audio file provided" });
  }

  const language = req.body.language || "auto";
  const text = await modelService.transcribe(file, language);
  res.json({ ok: true, text });
});

export const translate = asyncHandler(async (req, res) => {
  const text = await modelService.translate(req.body);
  res.json({ ok: true, text, source: req.body.source, target: req.body.target });
});
