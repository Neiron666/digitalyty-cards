import mongoose from "mongoose";

// Marketing email opt-out suppression tombstone.
// Keyed by HMAC-SHA256 of the normalized email (see marketingOptOut.util.js).
// Write-once on opt-out; deleted on explicit re-opt-in.
// Separate from DeletedEmailBlock (account-deletion tombstones) — different
// lifecycle and semantics. Do NOT merge these collections.
const MarketingOptOutSchema = new mongoose.Schema(
    {
        // HMAC-SHA256("cardigo-email-opt-out-v1:" + normalizedEmail)
        // using EMAIL_BLOCK_SECRET. Domain-separated from DeletedEmailBlock.
        emailKey: {
            type: String,
            required: true,
            unique: true,
        },
        // Optional: the User _id at time of opt-out (for audit; may be null
        // if opt-out arrives via unsubscribe link after account deletion).
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        // No updatedAt — tombstones are write-once. Deleted on re-opt-in.
        timestamps: false,
    },
);

export default mongoose.model("MarketingOptOut", MarketingOptOutSchema);
