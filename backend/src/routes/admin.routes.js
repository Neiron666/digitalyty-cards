import { Router } from "express";
import {
    getAdminStats,
    listUsers,
    listCards,
    listAdminAudit,
    getUserById,
    getCardById,
    deleteCardPermanently,
    deleteUserPermanently,
    deactivateCard,
    reactivateCard,
    extendTrial,
    overridePlan,
    adminSetUserSubscription,
    adminRevokeUserSubscription,
    adminSetCardBilling,
    adminRevokeCardBilling,
    adminSyncCardBillingFromUser,
    adminClearCardAdminOverride,
    adminSimulatePayment,
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
    adminGrantOrgEntitlement,
    adminRevokeOrgEntitlement,
    adminExtendOrgEntitlement,
} from "../controllers/adminOrganizations.controller.js";
import {
    getAdminAnalyticsSources,
    getAdminAnalyticsSummary,
} from "../controllers/adminAnalytics.controller.js";
import {
    getAdminSiteAnalyticsSources,
    getAdminSiteAnalyticsSummary,
    getAdminSiteAnalyticsDiagnostics,
    getAdminSiteAnalyticsVisits,
} from "../controllers/adminSiteAnalytics.controller.js";
import {
    getAdminBlogPostById,
    listAdminBlogPosts,
    createBlogPost,
    updateBlogPost,
    publishBlogPost,
    unpublishBlogPost,
    deleteBlogPost,
    uploadBlogHeroImage,
    uploadBlogSectionImage,
    removeBlogSectionImage,
} from "../controllers/adminBlog.controller.js";
import {
    getAdminGuidePostById,
    listAdminGuidePosts,
    createGuidePost,
    updateGuidePost,
    publishGuidePost,
    unpublishGuidePost,
    deleteGuidePost,
    uploadGuideHeroImage,
    uploadGuideSectionImage,
    removeGuideSectionImage,
} from "../controllers/adminGuide.controller.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

// read
router.get("/stats", getAdminStats);
router.get("/users", listUsers);
router.get("/cards", listCards);
router.get("/audit", listAdminAudit);
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
router.get("/site-analytics/visits", getAdminSiteAnalyticsVisits);

// safe write actions (no generic patch)
router.post("/orgs", adminCreateOrganization);
router.patch("/orgs/:id", adminPatchOrganization);
router.post("/orgs/:id/invites", adminCreateOrgInvite);
router.post("/orgs/:id/invites/:inviteId/revoke", adminRevokeOrgInvite);
// Org entitlement — platform-admin-only B2B/offline grant lifecycle
router.post("/orgs/:id/entitlement/grant", adminGrantOrgEntitlement);
router.post("/orgs/:id/entitlement/revoke", adminRevokeOrgEntitlement);
router.post("/orgs/:id/entitlement/extend", adminExtendOrgEntitlement);
router.patch("/orgs/:id/members/:memberId", adminPatchOrgMember);
router.delete("/orgs/:id/members/:memberId", adminDeleteOrgMember);
router.post("/cards/:id/delete", deleteCardPermanently);
router.post("/cards/:id/deactivate", deactivateCard);
router.post("/cards/:id/reactivate", reactivateCard);
router.post("/cards/:id/trial/extend", extendTrial);
router.post("/cards/:id/plan/override", overridePlan);
// Enterprise billing CRUD (admin-only; reason + audit required)
router.post(
    "/billing/users/:userId/subscription/set",
    adminSetUserSubscription,
);
router.post(
    "/billing/users/:userId/subscription/revoke",
    adminRevokeUserSubscription,
);
router.post("/billing/cards/:cardId/billing/set", adminSetCardBilling);
router.post("/billing/cards/:cardId/billing/revoke", adminRevokeCardBilling);
router.post(
    "/billing/cards/:cardId/billing/sync-from-user",
    adminSyncCardBillingFromUser,
);
router.post("/billing/simulate-payment", adminSimulatePayment);
router.post("/cards/:cardId/admin-override/clear", adminClearCardAdminOverride);
router.post("/cards/:id/analytics-premium", setAnalyticsPremium);
router.post("/cards/:id/tier", setCardTier);
router.post("/users/:id/tier", setUserTier);
router.post("/users/:id/delete", deleteUserPermanently);

// Blog admin CRUD
router.get("/blog/posts", listAdminBlogPosts);
router.get("/blog/posts/:id", getAdminBlogPostById);
router.post("/blog/posts", createBlogPost);
router.patch("/blog/posts/:id", updateBlogPost);
router.post("/blog/posts/:id/publish", publishBlogPost);
router.post("/blog/posts/:id/unpublish", unpublishBlogPost);
router.post(
    "/blog/posts/:id/upload-hero",
    upload.single("image"),
    uploadBlogHeroImage,
);
router.post(
    "/blog/posts/:id/sections/:sectionIdx/upload-image",
    upload.single("image"),
    uploadBlogSectionImage,
);
router.post(
    "/blog/posts/:id/sections/:sectionIdx/remove-image",
    removeBlogSectionImage,
);
router.post("/blog/posts/:id/delete", deleteBlogPost);

// Guides admin CRUD
router.get("/guides/posts", listAdminGuidePosts);
router.get("/guides/posts/:id", getAdminGuidePostById);
router.post("/guides/posts", createGuidePost);
router.patch("/guides/posts/:id", updateGuidePost);
router.post("/guides/posts/:id/publish", publishGuidePost);
router.post("/guides/posts/:id/unpublish", unpublishGuidePost);
router.post(
    "/guides/posts/:id/upload-hero",
    upload.single("image"),
    uploadGuideHeroImage,
);
router.post(
    "/guides/posts/:id/sections/:sectionIdx/upload-image",
    upload.single("image"),
    uploadGuideSectionImage,
);
router.post(
    "/guides/posts/:id/sections/:sectionIdx/remove-image",
    removeGuideSectionImage,
);
router.post("/guides/posts/:id/delete", deleteGuidePost);

export default router;
