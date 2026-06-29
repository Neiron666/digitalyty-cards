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
import {
    getAdminShowcaseItemById,
    listAdminShowcaseItems,
    createShowcaseItem,
    updateShowcaseItem,
    activateShowcaseItem,
    deactivateShowcaseItem,
    deleteShowcaseItem,
    uploadShowcaseImage,
    removeShowcaseImage,
} from "../controllers/adminCardsShowcase.controller.js";
import { listMarketingRecipients } from "../controllers/adminMarketing.controller.js";
import {
    previewMarketingCampaign,
    testSendMarketingCampaign,
    dryRunMarketingCampaign,
    createMarketingCampaignDraft,
    listMarketingCampaignDrafts,
    getMarketingCampaignDraft,
    cancelMarketingCampaignDraft,
    getMarketingCampaignSendReadiness,
    startMarketingCampaignSend,
    cancelMarketingCampaignSend,
    getMarketingCampaignSendStatus,
    deleteMarketingCampaign,
} from "../controllers/adminMarketingCampaign.controller.js";
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

// Marketing emails — read-only recipient foundation (no send, no campaign).
router.get("/marketing/recipients", listMarketingRecipients);
// Marketing emails — non-mutating preview render (no send, no DB write, no Mailjet, no token).
router.post("/marketing/campaigns/preview", previewMarketingCampaign);
// Marketing emails — feature-flagged single test-send to admin_self only.
router.post("/marketing/campaigns/test-send", testSendMarketingCampaign);
// Marketing emails — read-only dry-run revalidation of selected userIds (no send, no DB write, no Mailjet, no token).
router.post("/marketing/campaigns/dry-run", dryRunMarketingCampaign);
// Marketing emails — feature-flagged create-draft (one MarketingCampaign doc; no send, no Mailjet, no token).
router.post("/marketing/campaigns/drafts", createMarketingCampaignDraft);
// Marketing emails — draft management v1 (own-admin scope; read + cancel only; NOT gated by the create flag; no send, no Mailjet, no token).
router.get("/marketing/campaigns/drafts", listMarketingCampaignDrafts);
router.get(
    "/marketing/campaigns/drafts/:campaignId",
    getMarketingCampaignDraft,
);
router.patch(
    "/marketing/campaigns/drafts/:campaignId/cancel",
    cancelMarketingCampaignDraft,
);
// Marketing emails — feature-flagged READ-ONLY send-readiness probe (live
// eligibility revalidation of a draft's stored selection; no send, no enqueue,
// no DB write, no Mailjet, no token).
router.post(
    "/marketing/campaigns/:campaignId/send-readiness",
    getMarketingCampaignSendReadiness,
);
// Marketing emails — feature-flagged (MARKETING_SEND_TO_LIST_ENABLED) MUTATING
// start/enqueue: draft -> queued + one pending recipient row per eligible user,
// in a single transaction. Idempotent on startRequestId. No send, no Mailjet,
// no token, no worker.
router.post(
    "/marketing/campaigns/:campaignId/start",
    startMarketingCampaignSend,
);
// Marketing emails — MUTATING cancel-send (NOT gated by the start flag, so
// rollback works even when start is disabled): queued -> canceled + pending
// recipient rows -> canceled, in a single transaction. No send, no Mailjet,
// no token, no worker.
router.patch(
    "/marketing/campaigns/:campaignId/cancel-send",
    cancelMarketingCampaignSend,
);
// Marketing emails — READ-ONLY counts-only send-status rollup of the recipient
// ledger for one owned campaign (recipient rows are the source of truth; no
// campaign counters, no DB write, no User lookup, no Mailjet, no token, no
// worker).
router.get(
    "/marketing/campaigns/:campaignId/send-status",
    getMarketingCampaignSendStatus,
);
// Marketing emails — two-branch hard-delete (own-admin scope):
//   (1) status:"draft" campaign with ZERO recipient rows — no cascade.
//   (2) status:"canceled" campaign only when ALL recipient rows are canceled
//       and carry no send-evidence fields (providerMessageId/providerStatus/
//       providerErrorSafe/unsubscribeTokenId/sentAt/failedAt/lockedAt/claimedBy).
// Never deletes queued/sending/completed/failed campaigns. Never deletes
// sent/sending/provider/token/evidence rows. Fail-closed AdminAudit in
// transaction before each destructive branch. No send, no Mailjet, no token,
// no worker. Backend controller is the SSoT.
router.delete("/marketing/campaigns/:campaignId", deleteMarketingCampaign);

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

// Cards showcase admin CRUD
router.get("/cards-showcase", listAdminShowcaseItems);
router.get("/cards-showcase/:id", getAdminShowcaseItemById);
router.post("/cards-showcase", createShowcaseItem);
router.patch("/cards-showcase/:id", updateShowcaseItem);
router.post("/cards-showcase/:id/activate", activateShowcaseItem);
router.post("/cards-showcase/:id/deactivate", deactivateShowcaseItem);
router.post(
    "/cards-showcase/:id/upload-image",
    upload.single("image"),
    uploadShowcaseImage,
);
router.post("/cards-showcase/:id/remove-image", removeShowcaseImage);
router.post("/cards-showcase/:id/delete", deleteShowcaseItem);

export default router;
