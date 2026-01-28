import { Router } from "express";
import {
    getAdminStats,
    listUsers,
    listCards,
    getUserById,
    getCardById,
    deactivateCard,
    reactivateCard,
    extendTrial,
    overridePlan,
    setAnalyticsPremium,
    setCardTier,
    setUserTier,
} from "../controllers/admin.controller.js";
import {
    getAdminAnalyticsSources,
    getAdminAnalyticsSummary,
} from "../controllers/adminAnalytics.controller.js";
import {
    getAdminSiteAnalyticsSources,
    getAdminSiteAnalyticsSummary,
} from "../controllers/adminSiteAnalytics.controller.js";

const router = Router();

// read
router.get("/stats", getAdminStats);
router.get("/users", listUsers);
router.get("/cards", listCards);
router.get("/users/:id", getUserById);
router.get("/cards/:id", getCardById);
router.get("/analytics/summary", getAdminAnalyticsSummary);
router.get("/analytics/sources", getAdminAnalyticsSources);
router.get("/site-analytics/summary", getAdminSiteAnalyticsSummary);
router.get("/site-analytics/sources", getAdminSiteAnalyticsSources);

// safe write actions (no generic patch)
router.post("/cards/:id/deactivate", deactivateCard);
router.post("/cards/:id/reactivate", reactivateCard);
router.post("/cards/:id/trial/extend", extendTrial);
router.post("/cards/:id/plan/override", overridePlan);
router.post("/cards/:id/analytics-premium", setAnalyticsPremium);
router.post("/cards/:id/tier", setCardTier);
router.post("/users/:id/tier", setUserTier);

export default router;
