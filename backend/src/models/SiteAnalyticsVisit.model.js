import mongoose from "mongoose";

const { Schema } = mongoose;

// ---------------------------------------------------------------------------
// Retention constants — must match sanity-site-analytics-visit-index-drift.mjs
// ---------------------------------------------------------------------------
const MIN_RETENTION_DAYS = 30;
const DEFAULT_RETENTION_DAYS = 90;

export function parseVisitRetentionDays() {
    const raw = process.env.SITE_ANALYTICS_VISIT_RETENTION_DAYS;
    const n = Number.parseInt(String(raw ?? ""), 10);
    const days = Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
    return Math.max(days, MIN_RETENTION_DAYS);
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const SiteAnalyticsVisitSchema = new Schema(
    {
        // --- Identity ---
        // Partition key + unique visit key.
        // Raw deviceId / visitId are NEVER stored; only hashed values.
        siteKey: {
            type: String,
            required: true,
            trim: true,
        },
        // visitHash = sha256(siteKey + "|" + visitId).slice(0, 16)
        visitHash: {
            type: String,
            required: true,
            trim: true,
        },
        // deviceHash = sha256(siteKey + "|" + deviceId).slice(0, 16)
        // Day-agnostic: same browser → same hash across all dates.
        // Used for DISTINCT unique-visitor aggregation.
        deviceHash: {
            type: String,
            required: true,
            trim: true,
        },

        // --- Time ---
        // UTC day key: YYYY-MM-DD (day of visit start; used in query index)
        day: {
            type: String,
            required: true,
            trim: true,
        },
        // Set on first insert; never mutated ($setOnInsert).
        startedAt: {
            type: Date,
            required: true,
        },
        // Updated on every event belonging to this visit ($set).
        lastSeenAt: {
            type: Date,
            required: true,
        },

        // --- First-touch attribution (immutable after insert) ---
        // All attribution fields below are written via $setOnInsert only.
        channel: {
            type: String,
            trim: true,
            default: "",
        },
        source: {
            type: String,
            trim: true,
            default: "",
        },
        landingPage: {
            type: String,
            trim: true,
            default: "",
        },
        referrerHost: {
            type: String,
            trim: true,
            default: "",
        },
        utmSource: {
            type: String,
            trim: true,
            default: "",
        },
        utmMedium: {
            type: String,
            trim: true,
            default: "",
        },
        utmCampaign: {
            type: String,
            trim: true,
            default: "",
        },
        utmContent: {
            type: String,
            trim: true,
            default: "",
        },

        // --- Mutable visit summary ---
        pageViewsCount: {
            type: Number,
            default: 0,
        },
        clicksCount: {
            type: Number,
            default: 0,
        },
        // Allowlisted business-relevant action keys only; deduplicated by $addToSet.
        // Raw / unknown action strings are never appended.
        importantActions: {
            type: [String],
            default: [],
        },
    },
    {
        // timestamps: true adds createdAt/updatedAt — not needed for
        // visit-layer truth; startedAt/lastSeenAt serve this role explicitly.
        timestamps: false,
        minimize: false,
    },
);

// Indexes are NOT declared on the schema.
// Canonical index governance lives in:
//   migrate-site-analytics-visit-indexes.mjs  (apply)
//   sanity-site-analytics-visit-index-drift.mjs  (verify)
// Never rely on schema index declarations as operational truth.

export default mongoose.model("SiteAnalyticsVisit", SiteAnalyticsVisitSchema);
