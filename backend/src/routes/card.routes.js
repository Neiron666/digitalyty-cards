import { Router } from "express";
import { requireAuth, optionalAuth } from "../middlewares/auth.middleware.js";
import {
    getMyCard,
    createCard,
    updateCard,
    getCardBySlug,
    deleteCard,
    claimCard,
    updateSlug,
} from "../controllers/card.controller.js";

const router = Router();

function requireAuthOrAnonymous(req, res, next) {
    // Keep existing JWT auth middleware intact, but allow access when anonymousId exists.
    // If caller provides an Authorization header, keep current behavior (requireAuth decides).
    const hasAuthHeader = Boolean(req.headers?.authorization);
    if (hasAuthHeader) return requireAuth(req, res, next);

    if (req.anonymousId) return next();

    return requireAuth(req, res, next);
}

router.get("/mine", requireAuthOrAnonymous, getMyCard);
router.post("/", requireAuthOrAnonymous, createCard);
router.put("/:id", requireAuthOrAnonymous, updateCard);
router.patch("/slug", requireAuthOrAnonymous, updateSlug);

router.patch("/:id", requireAuthOrAnonymous, updateCard);

router.post("/claim", requireAuth, claimCard);

router.delete("/:id", requireAuthOrAnonymous, deleteCard);

// Public route (optional auth allows owner-only preview access)
router.get("/:slug", optionalAuth, getCardBySlug);

/*
Route access summary:
- Auth required (JWT): POST /cards/claim
- Auth OR anonymousId: DELETE /cards/:id
- Auth OR anonymousId: GET /cards/mine, POST /cards, PUT /cards/:id, PATCH /cards/:id
- Public: GET /cards/:slug
*/
export default router;
