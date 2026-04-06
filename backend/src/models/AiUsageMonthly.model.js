import mongoose from "mongoose";

const { Schema } = mongoose;

const AiUsageMonthlySchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Feature bucket - extensible to "ai_faq_generation", "ai_seo_generation", etc.
        feature: {
            type: String,
            required: true,
        },
        // UTC month bucket: "YYYY-MM"
        periodKey: {
            type: String,
            required: true,
        },
        count: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true },
);

// Intent: unique compound index { userId, feature, periodKey }.
// Must be applied manually per project index governance (autoIndex off).
AiUsageMonthlySchema.index(
    { userId: 1, feature: 1, periodKey: 1 },
    { unique: true },
);

export default mongoose.model("AiUsageMonthly", AiUsageMonthlySchema);
