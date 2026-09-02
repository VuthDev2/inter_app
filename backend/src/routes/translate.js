import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { translate } from "../controllers/modelController.js";
import { validate } from "../middleware/validate.js";
import { translateSchema } from "../schemas/modelSchemas.js";

const router = Router();

router.post("/translate", requireAuth, validate(translateSchema), translate);

export default router;
