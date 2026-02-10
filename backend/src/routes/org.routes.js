import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
    getMyOrganizations,
    getOrCreateMyOrgCard,
    updateMyOrgCardSlug,
} from "../controllers/card.controller.js";

const router = Router();

// User org surface (auth required):
router.get("/mine", requireAuth, getMyOrganizations);
router.get("/:orgSlug/cards/mine", requireAuth, getOrCreateMyOrgCard);
router.patch("/:orgSlug/cards/mine/slug", requireAuth, updateMyOrgCardSlug);

export default router;
