import mongoose from "mongoose";

const { Schema } = mongoose;

const MAX_BUCKET_KEYS = 25;
const MAX_UNIQUE_HASHES = 2500;

const CardAnalyticsDailySchema = new Schema(
    {
        cardId: {
            type: Schema.Types.ObjectId,
            ref: "Card",
            required: true,
            index: true,
        },
        // UTC day key: YYYY-MM-DD
        day: { type: String, required: true, index: true, trim: true },

        views: { type: Number, default: 0 },

        clicksTotal: { type: Number, default: 0 },

        // Map<string, number>
        clicksByAction: {
            type: Map,
            of: Number,
            default: {},
        },

        // Aggregate maps (capped in controller to avoid unbounded growth)
        utmSourceCounts: { type: Map, of: Number, default: {} },
        utmCampaignCounts: { type: Map, of: Number, default: {} },
        utmMediumCounts: { type: Map, of: Number, default: {} },
        referrerCounts: { type: Map, of: Number, default: {} },

        // Premium-only uniques (best-effort)
        uniqueVisitors: { type: Number, default: 0 },
        uniqueMode: { type: String, default: null },
        uniqueCapReached: { type: Boolean, default: false },

        // Optional best-effort hashed set to dedupe within the day.
        // Stored values must be short hashes; controller enforces a cap.
        uniqueHashes: { type: [String], default: undefined },
    },
    {
        timestamps: true,
        minimize: false,
    }
);

CardAnalyticsDailySchema.index({ cardId: 1, day: 1 }, { unique: true });

// Constants exported for controller caps.
CardAnalyticsDailySchema.statics.MAX_BUCKET_KEYS = MAX_BUCKET_KEYS;
CardAnalyticsDailySchema.statics.MAX_UNIQUE_HASHES = MAX_UNIQUE_HASHES;

export default mongoose.model("CardAnalyticsDaily", CardAnalyticsDailySchema);
