import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
    getMyOrganizations,
    getOrCreateMyOrgCard,
} from "../controllers/card.controller.js";

const router = Router();

// User org surface (auth required):
router.get("/mine", requireAuth, getMyOrganizations);
router.get("/:orgSlug/cards/mine", requireAuth, getOrCreateMyOrgCard);

export default router;
