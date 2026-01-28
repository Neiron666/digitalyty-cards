import { Router } from "express";
import { trackSiteAnalytics } from "../controllers/siteAnalytics.controller.js";

const router = Router();

// Public write-only endpoint (no JWT)
router.post("/track", trackSiteAnalytics);

export default router;
