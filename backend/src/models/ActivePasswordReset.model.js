import mongoose from "mongoose";

// One-active-per-user reset intent carrier.
// The unique userId index (applied via migration script) enforces the one-active guarantee.
// tokenHash is intentionally absent until the mail worker generates it at delivery time;
// it must NEVER be stored with a plaintext raw token - only SHA-256(rawToken) is written.
const ActivePasswordResetSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        // Absent until worker sets it at delivery time.
        // The unique partial index on tokenHash (applied via migration) covers only documents
        // where tokenHash is present - this avoids duplicate-key errors on the absent/undefined state.
        tokenHash: {
            type: String,
        },
        // pending-delivery: handler wrote intent; worker has not yet generated/delivered token
        // active:           worker wrote tokenHash and delivered the email; token usable by /reset
        // used:             /reset atomically consumed this record (usedAt set)
        status: {
            type: String,
            enum: ["pending-delivery", "active", "used"],
            default: "pending-delivery",
            index: true,
        },
        // Overall TTL for this reset intent - set by /forgot handler.
        // Both the cooldown check and the /reset handler gate on this field.
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        // Null until atomically set by /reset on successful token consumption.
        usedAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    { timestamps: true },
);

export default mongoose.model("ActivePasswordReset", ActivePasswordResetSchema);
