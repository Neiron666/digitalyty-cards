import mongoose from "mongoose";

// MarketingCampaignRecipient — per-recipient send ledger for an admin
// marketing campaign. This is the durable per-recipient state layer ONLY.
//
// SCOPE / SAFETY (Phase 2A model-governance slice):
//   - No send logic, no Mailjet, no unsubscribe token minting, no worker,
//     no provider transport. This slice is the data model + index governance
//     foundation only.
//   - userId-only targeting. The recipient email is resolved at send time from
//     the User document; it is NEVER stored here.
//   - HARD prohibition: no raw email, no masked email, no emailKey/HMAC, no raw
//     token, no unsubscribeUrl, no rendered html/text, no provider response
//     body. Only opaque/safe provider labels (providerMessageId/providerStatus)
//     and an operator-safe error label (providerErrorSafe) are stored.
//
// INDEX GOVERNANCE:
//   - autoIndex/autoCreate are OFF globally (see backend/src/config/db.js); the
//     index declarations below are for governance/documentation only and are
//     NOT created at runtime.
//   - Indexes must be created manually via
//     backend/scripts/migrate-marketing-campaign-recipient-indexes.mjs.
//   - Drift is verified read-only via
//     backend/scripts/sanity-marketing-campaign-recipient-index-drift.mjs.
//
// nextAttemptAt CONTRACT (R2):
//   - This model layer does NOT schedule sends. nextAttemptAt defaults to null,
//     which means "not scheduled by this model layer".
//   - Future enqueue/start logic MUST set nextAttemptAt = now() when it creates
//     a pending row, otherwise a worker claim query of the form
//     { status: "pending", nextAttemptAt: { $lte: now } } would never select
//     pending rows whose nextAttemptAt is still null. Worker scheduling/retry
//     semantics are deferred to the worker contour.

// Lifecycle statuses for a single recipient row. Frozen to keep the enum bounded.
const RECIPIENT_STATUSES = Object.freeze([
    "pending",
    "sending",
    "sent",
    "failed",
    "skipped",
    "suppressed",
    "canceled",
]);

// Local mirror of the skip-reason vocabulary. Coarse status codes only — never
// PII. Must mirror MARKETING_RECIPIENT_SKIP_REASONS from
// marketingRecipientEligibility.util.js. Kept local to avoid model->util
// coupling (importing the util would pull User/opt-out models into the model
// layer and risk cyclic imports). Phase 3 verifies parity by grep/manual proof.
const RECIPIENT_SKIP_REASONS = Object.freeze([
    "DUPLICATE",
    "INVALID_ID",
    "USER_NOT_FOUND",
    "EMAIL_MISSING",
    "NOT_CONSENTED",
    "NOT_VERIFIED",
    "OPTED_OUT",
    "UNKNOWN",
]);

const MarketingCampaignRecipientSchema = new mongoose.Schema(
    {
        // Parent campaign this recipient row belongs to.
        campaignId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MarketingCampaign",
            required: true,
        },

        // Target user. Email is resolved at send time — never stored here.
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Per-recipient lifecycle status. No transition logic lives in this model.
        status: {
            type: String,
            required: true,
            enum: RECIPIENT_STATUSES,
            default: "pending",
        },

        // Coarse skip/suppression reason code (when status skipped/suppressed).
        // Bounded enum — never PII.
        skipReason: {
            type: String,
            enum: RECIPIENT_SKIP_REASONS,
            trim: true,
            maxlength: 80,
            default: null,
        },

        // Opaque provider message identifier (safe to store; no PII, no body).
        providerMessageId: {
            type: String,
            trim: true,
            maxlength: 200,
            default: null,
        },

        // Coarse provider status label (safe to store).
        providerStatus: {
            type: String,
            trim: true,
            maxlength: 80,
            default: null,
        },

        // Operator-safe error label ONLY — never a raw provider response body.
        providerErrorSafe: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },

        // Link to the hashed unsubscribe token row (EmailUnsubscribeToken).
        // NEVER the raw token and NEVER the unsubscribe URL.
        unsubscribeTokenId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmailUnsubscribeToken",
            default: null,
        },

        // Number of delivery attempts made by the future worker.
        attempts: {
            type: Number,
            default: 0,
            min: 0,
            max: 20,
        },

        // Scheduled next attempt time. See nextAttemptAt CONTRACT above.
        nextAttemptAt: {
            type: Date,
            default: null,
        },

        // Timestamp of the most recent worker attempt.
        lastAttemptAt: {
            type: Date,
            default: null,
        },

        sentAt: {
            type: Date,
            default: null,
        },

        failedAt: {
            type: Date,
            default: null,
        },

        // Atomic-claim lease timestamp (set when a worker claims the row).
        lockedAt: {
            type: Date,
            default: null,
        },

        // Opaque worker identifier that claimed the row. No host secrets.
        claimedBy: {
            type: String,
            trim: true,
            maxlength: 120,
            default: null,
        },

        // Coarse error code (distinct from the human-facing providerErrorSafe).
        lastErrorCode: {
            type: String,
            trim: true,
            maxlength: 80,
            default: null,
        },

        // Rehearsal flag for a future dry-run-only send path (no provider call).
        dryRunOnly: {
            type: Boolean,
            default: false,
        },

        canceledAt: {
            type: Date,
            default: null,
        },
    },
    // Explicit collection pin so the runtime collection name is part of the
    // model contract (not left to Mongoose pluralization). Matches the literal
    // collection targeted by the migration and drift-sanity scripts.
    { timestamps: true, collection: "marketingcampaignrecipients" },
);

// ── Governed index declarations (autoIndex OFF — migration is manual) ──
// These are declared for governance/documentation only; they are applied
// exclusively via migrate-marketing-campaign-recipient-indexes.mjs.

// Idempotency / duplicate-send prevention: one row per (campaign, recipient).
MarketingCampaignRecipientSchema.index(
    { campaignId: 1, userId: 1 },
    { unique: true, name: "marketing_campaign_recipient_campaign_user_v1" },
);

// Per-campaign status rollups / cancel-send bulk transitions.
MarketingCampaignRecipientSchema.index(
    { campaignId: 1, status: 1 },
    { name: "marketing_campaign_recipient_campaign_status_v1" },
);

// Worker claim ordering by status + scheduled next attempt.
MarketingCampaignRecipientSchema.index(
    { status: 1, nextAttemptAt: 1 },
    { name: "marketing_campaign_recipient_status_next_attempt_v1" },
);

export default mongoose.model(
    "MarketingCampaignRecipient",
    MarketingCampaignRecipientSchema,
);
