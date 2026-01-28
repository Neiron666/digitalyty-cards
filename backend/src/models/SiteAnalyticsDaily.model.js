import mongoose from "mongoose";

const { Schema } = mongoose;

const MAX_BUCKET_KEYS = 25;
const MAX_PAGE_CHANNEL_KEYS = 200;

const SiteAnalyticsDailySchema = new Schema(
    {
        siteKey: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        // UTC day key: YYYY-MM-DD
        day: { type: String, required: true, index: true, trim: true },

        views: { type: Number, default: 0 },
        clicksTotal: { type: Number, default: 0 },

        // Map<string, number>
        channelCounts: { type: Map, of: Number, default: {} },

        // Aggregate maps (capped in controller to avoid unbounded growth)
        utmSourceCounts: { type: Map, of: Number, default: {} },
        utmCampaignCounts: { type: Map, of: Number, default: {} },
        utmMediumCounts: { type: Map, of: Number, default: {} },
        referrerCounts: { type: Map, of: Number, default: {} },

        // Site-specific
        pagePathCounts: { type: Map, of: Number, default: {} },
        actionCounts: { type: Map, of: Number, default: {} },

        // Key format: <safePageKey>__<channel>
        pageChannelCounts: { type: Map, of: Number, default: {} },
        pageChannelKeyCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        minimize: false,
    },
);

SiteAnalyticsDailySchema.index({ siteKey: 1, day: 1 }, { unique: true });

// Constants exported for controller caps.
SiteAnalyticsDailySchema.statics.MAX_BUCKET_KEYS = MAX_BUCKET_KEYS;
SiteAnalyticsDailySchema.statics.MAX_PAGE_CHANNEL_KEYS = MAX_PAGE_CHANNEL_KEYS;

export default mongoose.model("SiteAnalyticsDaily", SiteAnalyticsDailySchema);
