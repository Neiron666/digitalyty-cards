import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
    trackAnalytics,
    getSummary,
    getActions,
    getSources,
    getCampaigns,
} from "../controllers/analytics.controller.js";

const router = Router();

// Public write-only endpoint (no JWT)
router.post("/track", trackAnalytics);

// Owner-only reads
router.get("/summary/:cardId", requireAuth, getSummary);
router.get("/actions/:cardId", requireAuth, getActions);
router.get("/sources/:cardId", requireAuth, getSources);
router.get("/campaigns/:cardId", requireAuth, getCampaigns);

export default router;
