import { z } from "zod";

export const translateSchema = z.object({
  text: z.string().min(1, "Text is required."),
  source: z.string().min(1, "Source language is required."),
  target: z.string().min(1, "Target language is required."),
});

// For transcribe, we use multer so validation of the file happens in controller.
// But we can validate the body if needed.
export const transcribeSchema = z.object({
  language: z.string().default("auto"),
});
