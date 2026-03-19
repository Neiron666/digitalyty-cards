import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { suggestAbout, getAiQuota } from "../controllers/ai.controller.js";

const router = Router();

// POST /api/cards/:id/ai/about-suggestion
// Authenticated users only. No anonymous flow in V1.
router.post("/:id/ai/about-suggestion", requireAuth, suggestAbout);

// GET /api/cards/:id/ai/quota?feature=ai_about_generation
// Authenticated users only. Returns current monthly usage + limit.
router.get("/:id/ai/quota", requireAuth, getAiQuota);

export default router;
