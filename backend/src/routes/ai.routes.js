import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
    suggestAbout,
    suggestSeo,
    suggestFaq,
    getAiQuota,
} from "../controllers/ai.controller.js";

const router = Router();

// POST /api/cards/:id/ai/about-suggestion
// Authenticated users only. No anonymous flow in V1.
router.post("/:id/ai/about-suggestion", requireAuth, suggestAbout);

// POST /api/cards/:id/ai/seo-suggestion
// Authenticated users only. Generates SEO title + description.
router.post("/:id/ai/seo-suggestion", requireAuth, suggestSeo);

// POST /api/cards/:id/ai/faq-suggestion
// Authenticated users only. Generates FAQ Q&A pairs (V1: full only).
router.post("/:id/ai/faq-suggestion", requireAuth, suggestFaq);

// GET /api/cards/:id/ai/quota?feature=ai_about_generation
// Authenticated users only. Returns current monthly usage + limit.
router.get("/:id/ai/quota", requireAuth, getAiQuota);

export default router;
