import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            unique: true,
            index: true,
            trim: true,
            lowercase: true,
        },
        passwordHash: String,

        // Email verification status: false until user clicks verification link.
        isVerified: { type: Boolean, default: false },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
            index: true,
        },

        plan: {
            type: String,
            enum: ["free", "monthly", "yearly"],
            default: "free",
        },

        // Admin-only feature tier override (does NOT affect billing/payment).
        // Acts as a default for the user's card(s), but card.adminTier wins.
        adminTier: {
            type: String,
            enum: ["free", "basic", "premium"],
            default: null,
            index: true,
        },
        adminTierUntil: { type: Date, default: null },
        adminTierByAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        adminTierReason: { type: String, default: null },
        adminTierCreatedAt: { type: Date, default: null },

        cardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Card",
            unique: true,
            sparse: true,
        },
        subscription: {
            status: {
                type: String,
                enum: ["inactive", "active", "expired"],
                default: "inactive",
            },
            expiresAt: Date,
            provider: {
                type: String,
                default: "mock", // позже "tranzila"
            },
        },

        // Consent / legal acceptance (additive, null-safe for existing users).
        termsAcceptedAt: { type: Date, default: null },
        privacyAcceptedAt: { type: Date, default: null },
        termsVersion: { type: String, default: null },
        privacyVersion: { type: String, default: null },

        // Post-password-change JWT invalidation.
        // Stamped to now() on every successful password reset or change-password.
        // Null means no password event has occurred — all existing tokens are treated as fresh.
        passwordChangedAt: { type: Date, default: null },

        // --- User-premium-trial lifecycle (Foundation Batch) ---
        // When the 10-day premium trial was actually activated (first card creation).
        // One-time stamp, never resets. Null = trial never started.
        trialActivatedAt: { type: Date, default: null },
        // When the trial ends (denormalized for admin/support/future downgrade queries).
        // Null = no active/past trial.
        trialEndsAt: { type: Date, default: null },
        // When trial eligibility was permanently closed WITHOUT activation.
        // Set by claim-flow (anonymous card ownership transfer) to prevent
        // future trial eligibility after card deletion + re-creation.
        // Null = eligibility not closed externally.
        trialEligibilityClosedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

export default mongoose.model("User", UserSchema);
