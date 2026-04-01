import { Router } from "express";
import { requireAuth, optionalAuth } from "../middlewares/auth.middleware.js";
import {
    getMyCard,
    createCard,
    updateCard,
    getCardBySlug,
    getSelfThemeCssById,
    deleteCard,
    deleteDesignAsset,
    claimCard,
    updateSlug,
} from "../controllers/card.controller.js";

const router = Router();

function requireAuthOrAnonymous(req, res, next) {
    // Prefer cookie/header auth when present, then fall back to anonymous.
    // This prevents logged-in users from being silently treated as anonymous
    // just because the frontend sends x-anonymous-id alongside its auth cookie.
    const hasAuthHeader = Boolean(req.headers?.authorization);
    if (hasAuthHeader) return requireAuth(req, res, next);

    // Try cookie-based auth first (non-blocking). If it resolves a userId,
    // proceed as an authenticated user even when anonymousId is also present.
    return optionalAuth(req, res, () => {
        if (req.userId) return next();
        if (req.anonymousId) return next();
        return requireAuth(req, res, next);
    });
}

router.get("/mine", requireAuthOrAnonymous, getMyCard);
router.post("/", requireAuthOrAnonymous, createCard);
router.put("/:id", requireAuthOrAnonymous, updateCard);
router.patch("/slug", requireAuthOrAnonymous, updateSlug);

router.patch("/:id", requireAuthOrAnonymous, updateCard);

router.post("/claim", requireAuth, claimCard);

router.delete(
    "/:id/design-asset/:kind",
    requireAuthOrAnonymous,
    deleteDesignAsset,
);

router.delete("/:id", requireAuthOrAnonymous, deleteCard);

// Self theme stylesheet (id-based; must be above /:slug)
router.get("/:id/self-theme.css", optionalAuth, getSelfThemeCssById);

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
