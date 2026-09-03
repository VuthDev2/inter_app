import { Router } from "express";
import multer from "multer";
import os from "node:os";
import { requireAuth } from "../middleware/auth.js";
import { transcribe } from "../controllers/modelController.js";
import { validate } from "../middleware/validate.js";
import { transcribeSchema } from "../schemas/modelSchemas.js";

const upload = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.post("/transcribe", requireAuth, upload.single("file"), validate(transcribeSchema), transcribe);

export default router;
