import { Router } from "express";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import {
    getPreviewCardBySlug,
    getPreviewCompanyCardByOrgSlugAndSlug,
} from "../controllers/card.controller.js";

const router = Router();

// Preview routes (owner-only; anti-enumeration: all denials are 404)
// GET /api/preview/cards/:slug
router.get("/cards/:slug", optionalAuth, getPreviewCardBySlug);

// GET /api/preview/c/:orgSlug/:slug
router.get(
    "/c/:orgSlug/:slug",
    optionalAuth,
    getPreviewCompanyCardByOrgSlugAndSlug,
);

export default router;
