import mongoose from "mongoose";

// MarketingCampaign — durable draft/snapshot record for an admin marketing
// email campaign. This is the campaign-draft persistence layer ONLY.
//
// SCOPE / SAFETY (Phase 2A model-governance slice):
//   - No send logic, no Mailjet, no unsubscribe token, no worker, no provider.
//   - No rendered html/text parts are ever stored — only raw authored text
//     fields in contentSnapshot. Rendering happens at send time elsewhere.
//   - selectionSnapshot stores userId-only targeting plus a backend-revalidated
//     summary. No raw emails, no masked emails, no emailKey, no token fields.
//
// INDEX GOVERNANCE:
//   - autoIndex/autoCreate are OFF globally (see backend/src/config/db.js); the
//     index declarations below are for governance/documentation only and are
//     NOT created at runtime.
//   - Indexes must be created manually via
//     backend/scripts/migrate-marketing-campaign-indexes.mjs.
//   - Drift is verified read-only via
//     backend/scripts/sanity-marketing-campaign-index-drift.mjs.

const MarketingCampaignSchema = new mongoose.Schema(
    {
        // Admin who authored/owns this campaign draft.
        createdByAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Lifecycle status. Full enum is declared for forward-compatibility;
        // only "draft" (and later "canceled") are reachable in this slice.
        // No transition logic lives in this model.
        status: {
            type: String,
            enum: [
                "draft",
                "ready",
                "queued",
                "sending",
                "completed",
                "failed",
                "canceled",
            ],
            default: "draft",
            required: true,
        },

        // Origin discriminator. Single value today; declared as an enum so a
        // future source can be added without a schema-shape change.
        source: {
            type: String,
            enum: ["admin_marketing"],
            default: "admin_marketing",
            required: true,
        },

        // Authored content snapshot — RAW text fields only.
        // No rendered html, no rendered text part, no provider body,
        // no token, no unsubscribe URL.
        contentSnapshot: {
            subject: { type: String },
            previewText: { type: String },
            topImageUrl: { type: String },
            heading: { type: String },
            bodyText: { type: String },
            ctaLabel: { type: String },
            ctaUrl: { type: String },
        },

        // Backend-revalidated targeting snapshot — userId-only.
        // No raw emails, no masked emails, no emailKey, no token/provider fields.
        selectionSnapshot: {
            selectedUserIds: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
            ],
            selectedCount: { type: Number },
            duplicateCount: { type: Number },
            uniqueCount: { type: Number },
            eligibleCount: { type: Number },
            skippedCount: { type: Number },
            // Bounded per-reason counters keyed by the frozen skip-reason enum.
            // Map<String, Number> keeps keys bounded and avoids a Mixed bag that
            // could absorb user-derived keys (dotted-path/$ injection safety).
            skippedByReason: {
                type: Map,
                of: Number,
            },
        },

        // Timestamp of the backend eligibility revalidation that produced
        // selectionSnapshot (set by the future create-draft endpoint).
        dryRunAt: { type: Date },

        // Optional client-supplied idempotency key. No default — must remain
        // absent (not empty string) when unused so the unique+sparse index
        // does not collide across draft creations.
        requestId: { type: String, trim: true },

        // Set when a draft is canceled (future slice). No transition logic here.
        canceledAt: { type: Date },

        // Operator-safe error label only — never a raw provider response body.
        errorSafeMessage: { type: String },

        // Separate from draft requestId; used ONLY by future send-start
        // idempotency. No default — must remain absent (not empty string) when
        // unused so the unique+sparse index does not collide across campaigns.
        startRequestId: { type: String, trim: true },

        // Future start/enqueue acceptance timestamp (set by the future
        // start-send endpoint when a draft is accepted for enqueue). No default.
        queuedAt: { type: Date },

        // Future admin actor who accepted/started the campaign send (set by the
        // future start-send endpoint). No default.
        sendStartedByAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    // Explicit collection pin so the runtime collection name is part of the
    // model contract (not left to Mongoose pluralization). Matches the literal
    // collection targeted by the migration and drift-sanity scripts.
    { timestamps: true, collection: "marketingcampaigns" },
);

// ── Governed index declarations (autoIndex OFF — migration is manual) ──
// These are declared for governance/documentation only; they are applied
// exclusively via migrate-marketing-campaign-indexes.mjs.
MarketingCampaignSchema.index(
    { createdByAdminId: 1, createdAt: -1 },
    { name: "marketing_campaign_admin_created_v1" },
);
MarketingCampaignSchema.index(
    { status: 1, createdAt: -1 },
    { name: "marketing_campaign_status_created_v1" },
);
MarketingCampaignSchema.index(
    { requestId: 1 },
    { name: "marketing_campaign_request_id_v1", unique: true, sparse: true },
);
MarketingCampaignSchema.index(
    { startRequestId: 1 },
    {
        name: "marketing_campaign_start_request_id_v1",
        unique: true,
        sparse: true,
    },
);

export default mongoose.model("MarketingCampaign", MarketingCampaignSchema);
