import { Router } from "express";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import {
    getCompanyCardByOrgSlugAndSlug,
    getSelfThemeCssByOrgSlugAndSlug,
} from "../controllers/card.controller.js";

const router = Router();

// Public company self-theme CSS (public slug-based; SSR data island carries no _id)
router.get(
    "/:orgSlug/:slug/self-theme.css",
    optionalAuth,
    getSelfThemeCssByOrgSlugAndSlug,
);

// Public company cards: GET /api/c/:orgSlug/:slug
router.get("/:orgSlug/:slug", optionalAuth, getCompanyCardByOrgSlugAndSlug);

export default router;
