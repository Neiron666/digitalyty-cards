import { Router } from "express";
import {
    getAdminStats,
    listUsers,
    listCards,
    getUserById,
    getCardById,
    deleteCardPermanently,
    deactivateCard,
    reactivateCard,
    extendTrial,
    overridePlan,
    setAnalyticsPremium,
    setCardTier,
    setUserTier,
} from "../controllers/admin.controller.js";
import {
    adminCreateOrgInvite,
    adminCreateOrganization,
    adminDeleteOrgMember,
    adminGetOrganizationById,
    adminListOrgInvites,
    adminListOrgMembers,
    adminListOrganizations,
    adminPatchOrgMember,
    adminPatchOrganization,
    adminRevokeOrgInvite,
} from "../controllers/adminOrganizations.controller.js";
import {
    getAdminAnalyticsSources,
    getAdminAnalyticsSummary,
} from "../controllers/adminAnalytics.controller.js";
import {
    getAdminSiteAnalyticsSources,
    getAdminSiteAnalyticsSummary,
    getAdminSiteAnalyticsDiagnostics,
} from "../controllers/adminSiteAnalytics.controller.js";

const router = Router();

// read
router.get("/stats", getAdminStats);
router.get("/users", listUsers);
router.get("/cards", listCards);
router.get("/orgs", adminListOrganizations);
router.get("/users/:id", getUserById);
router.get("/cards/:id", getCardById);
router.get("/orgs/:id", adminGetOrganizationById);
router.get("/orgs/:id/members", adminListOrgMembers);
router.get("/orgs/:id/invites", adminListOrgInvites);
router.get("/analytics/summary", getAdminAnalyticsSummary);
router.get("/analytics/sources", getAdminAnalyticsSources);
router.get("/site-analytics/summary", getAdminSiteAnalyticsSummary);
router.get("/site-analytics/sources", getAdminSiteAnalyticsSources);
router.get("/site-analytics/diagnostics", getAdminSiteAnalyticsDiagnostics);

// safe write actions (no generic patch)
router.post("/orgs", adminCreateOrganization);
router.patch("/orgs/:id", adminPatchOrganization);
router.post("/orgs/:id/invites", adminCreateOrgInvite);
router.post("/orgs/:id/invites/:inviteId/revoke", adminRevokeOrgInvite);
router.patch("/orgs/:id/members/:memberId", adminPatchOrgMember);
router.delete("/orgs/:id/members/:memberId", adminDeleteOrgMember);
router.post("/cards/:id/delete", deleteCardPermanently);
router.post("/cards/:id/deactivate", deactivateCard);
router.post("/cards/:id/reactivate", reactivateCard);
router.post("/cards/:id/trial/extend", extendTrial);
router.post("/cards/:id/plan/override", overridePlan);
router.post("/cards/:id/analytics-premium", setAnalyticsPremium);
router.post("/cards/:id/tier", setCardTier);
router.post("/users/:id/tier", setUserTier);

export default router;
