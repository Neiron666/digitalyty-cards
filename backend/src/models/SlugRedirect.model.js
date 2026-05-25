/**
 * SlugRedirect.model.js
 *
 * Routing metadata for the Cardigo card slug lifecycle quarantine system.
 *
 * Purpose:
 *   Records old slugs that are under quarantine after a slug change, card deletion,
 *   account deletion, or admin reservation. Enables redirect resolution and
 *   prevents slug squatting during the quarantine window.
 *
 * Scope:
 *   Routing metadata only. Does NOT store card content, user PII, email, phone,
 *   billing data, tokens, provider IDs, or private profile data.
 *
 * Runtime reads/writes:
 *   None in Phase 2A. This file is schema + index definition only.
 *   Reads and writes will be added in Phase 2B (write path) and Phase 2C (read path).
 *
 * Index governance:
 *   No auto-index reliance. MONGOOSE_AUTO_INDEX=false in production.
 *   Indexes must be applied manually via:
 *     node scripts/migrate-slug-redirect-index.mjs --apply
 *   Verified via:
 *     node scripts/sanity-slug-redirect-index-drift.mjs
 */

import mongoose from "mongoose";

const SlugRedirectSchema = new mongoose.Schema(
    {
        // Route namespace discriminator: "card" = /card/:slug, "orgCard" = /c/:orgSlug/:slug.
        routeType: {
            type: String,
            enum: ["card", "orgCard"],
            required: true,
        },

        // Namespace anchor.
        // For "card" routes: personalOrgId of the card owner.
        // For "orgCard" routes: the actual orgId.
        // Required so that slug uniqueness is scoped per-org/namespace rather than globally.
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },

        // The old slug being protected from squatting.
        // Stored lowercase+trimmed. Must be a valid card slug.
        slug: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            minlength: 3,
            maxlength: 60,
            match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        },

        // The card that owned this slug when the quarantine record was created.
        // Null for platform_slug and admin_reserved reasons where no source card exists.
        sourceCardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Card",
            default: null,
        },

        // The card that should receive redirected traffic during the quarantine window.
        // Null for card_deleted / account_deleted / trial_expired tombstone records
        // (no redirect target — these produce a 404 or a "card no longer available" response).
        targetCardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Card",
            default: null,
        },

        // Audit-only snapshot of targetCardId's slug at the time of record creation.
        // NOT used as a routing source of truth; live targetCardId lookup is authoritative.
        targetSlugSnapshot: {
            type: String,
            lowercase: true,
            trim: true,
            maxlength: 60,
            default: null,
        },

        // Audit-only snapshot of the org slug for orgCard records.
        // Org slugs are immutable (SLUG_IMMUTABLE policy) so this value is permanently stable.
        // Max 60 mirrors isValidOrgSlug (orgSlug.util.js:26: s.length <= 60).
        targetOrgSlugSnapshot: {
            type: String,
            lowercase: true,
            trim: true,
            maxlength: 60,
            default: null,
        },

        // Lifecycle state of this quarantine record.
        status: {
            type: String,
            enum: ["redirect_quarantine", "released", "reclaimed"],
            required: true,
            default: "redirect_quarantine",
        },

        // Why this quarantine record was created.
        reason: {
            type: String,
            enum: [
                "slug_change",
                "card_deleted",
                "account_deleted",
                "trial_expired",
                "admin_reserved",
                "platform_slug",
            ],
            required: true,
        },

        // When the quarantine window expires and the slug may be claimed by another card.
        // Not a TTL index: records are kept for audit after expiry, not auto-deleted.
        expiresAt: {
            type: Date,
            required: true,
        },

        // Timestamp set when status transitions to "released".
        releasedAt: {
            type: Date,
            default: null,
        },

        // Timestamp set when a new card reclaims this slug (status → "reclaimed").
        reclaimedAt: {
            type: Date,
            default: null,
        },

        // When true, the quarantine does not expire automatically.
        // Used for admin_reserved and platform_slug records.
        permanentQuarantine: {
            type: Boolean,
            default: false,
        },

        // When true, a human operator must explicitly release this quarantine.
        // An expired expiresAt alone is not sufficient to allow reclaim.
        manualReleaseRequired: {
            type: Boolean,
            default: false,
        },

        // Who initiated this quarantine. ObjectId ref only — no PII stored here.
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        strict: true,
        timestamps: true,
    },
);

// ---------------------------------------------------------------------------
// Index A — Active quarantine uniqueness
// Enforces: at most one active redirect_quarantine record per (routeType, orgId, slug).
// Partial filter: only documents with status "redirect_quarantine" are covered.
// When status transitions to "released" or "reclaimed" the constraint is lifted,
// allowing a new quarantine record to be created for the same slug in the future.
// ---------------------------------------------------------------------------
SlugRedirectSchema.index(
    { routeType: 1, orgId: 1, slug: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "redirect_quarantine" },
        name: "routeType_1_orgId_1_slug_1_status_redirect_quarantine",
    },
);

// ---------------------------------------------------------------------------
// Index B — Redirect lookup
// Supports read-path query: find the active quarantine record for a given slug.
// Query pattern: { routeType, orgId, slug, status: "redirect_quarantine", expiresAt: { $gt: now } }
// ---------------------------------------------------------------------------
SlugRedirectSchema.index(
    { routeType: 1, orgId: 1, slug: 1, status: 1, expiresAt: 1 },
    {
        name: "routeType_1_orgId_1_slug_1_status_1_expiresAt_1",
    },
);

// ---------------------------------------------------------------------------
// Index C — Release scan
// Supports batch expiry sweep: find all records where quarantine has expired.
// Query pattern: { status: "redirect_quarantine", expiresAt: { $lt: now } }
// ---------------------------------------------------------------------------
SlugRedirectSchema.index(
    { status: 1, expiresAt: 1 },
    {
        name: "status_1_expiresAt_1",
    },
);

// ---------------------------------------------------------------------------
// Index D — Target card audit (sparse)
// Supports reverse lookup: find quarantine records targeting a specific card.
// Used for cascade operations (card deleted → find and update its redirect records).
// Sparse: targetCardId is null for tombstone records — exclude them from the index.
// ---------------------------------------------------------------------------
SlugRedirectSchema.index(
    { targetCardId: 1, status: 1 },
    {
        sparse: true,
        name: "targetCardId_1_status_1",
    },
);

// ---------------------------------------------------------------------------
// Index E — Source card audit (sparse)
// Supports slug change history view per card: all quarantine records created by a card.
// Sorted descending by createdAt for reverse-chronological history display.
// Sparse: sourceCardId is null for admin_reserved and platform_slug records.
// ---------------------------------------------------------------------------
SlugRedirectSchema.index(
    { sourceCardId: 1, createdAt: -1 },
    {
        sparse: true,
        name: "sourceCardId_1_createdAt_-1",
    },
);

// ---------------------------------------------------------------------------
// Index F — Org audit
// Supports org-level view: all slug lifecycle events for a given org.
// Sorted descending by createdAt for reverse-chronological admin dashboard.
// ---------------------------------------------------------------------------
SlugRedirectSchema.index(
    { orgId: 1, createdAt: -1 },
    {
        name: "orgId_1_createdAt_-1",
    },
);

export default mongoose.model("SlugRedirect", SlugRedirectSchema);
