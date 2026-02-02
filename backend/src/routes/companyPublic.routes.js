import { Router } from "express";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { getCompanyCardByOrgSlugAndSlug } from "../controllers/card.controller.js";

const router = Router();

// Public company cards: GET /api/c/:orgSlug/:slug
router.get("/:orgSlug/:slug", optionalAuth, getCompanyCardByOrgSlugAndSlug);

export default router;
