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

        // User's first name. Optional at schema level; required at input-validation
        // layer for all new-account creation flows. Null for existing users.
        firstName: { type: String, trim: true, default: null },

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

        // [BATCH-0] Tranzila recurring token — populated on first successful paid notify.
        // Used by Batch 1 (STO create). Never stored in logs or audit payload.
        tranzilaToken: { type: String, default: null },

        // [BATCH-1] Tranzila payment token expiry metadata — server-only.
        // Populated during first-payment notify alongside tranzilaToken.
        // Required for STO create (card.expire_month, card.expire_year).
        // Must NEVER appear in client DTOs, logs, or audit payloads.
        // Explicitly excluded from getUserById admin endpoint.
        tranzilaTokenMeta: {
            expMonth: { type: Number, default: null }, // integer 1–12
            expYear: { type: Number, default: null }, // integer full year e.g. 2030
        },

        // [BATCH-2] Tranzila STO schedule lifecycle — server-side operational data only.
        // Populated by runtime STO create service (NOT implemented in this batch — Batch 3).
        // Visible to admin via getUserById (operational, non-credential data).
        // Excluded from self/account DTOs by existing explicit allowlist selects.
        //
        // Idempotency guard (runtime, Batch 3):
        //   tranzilaSto.stoId && tranzilaSto.status === "created" → skip duplicate create.
        //
        // Write-ahead pattern (runtime, Batch 3):
        //   set status = "pending" before API call;
        //   set status = "failed" + error fields on non-zero error_code;
        //   set stoId + status = "created" only on confirmed error_code === 0.
        //
        // Retry policy (runtime, Batch 3):
        //   status === "failed" → allow retry; overwrite lastAttemptAt/lastError* fields.
        //   status === "pending" older than threshold → treat as stale, allow retry.
        //
        // Security: Do NOT store tokens, keys, HMACs, passwords, or secrets here.
        // lastErrorMessage MUST be sanitized and truncated (≤500 chars) at the service write path.
        // stoId is a provider schedule reference — not a secret, safe for operator visibility.
        tranzilaSto: {
            stoId: { type: String, default: null }, // sto_id returned by Tranzila /v2/sto/create
            status: {
                type: String,
                enum: [null, "pending", "created", "failed", "cancelled"],
                default: null,
            },
            createdAt: { type: Date, default: null }, // when first successfully created
            lastAttemptAt: { type: Date, default: null }, // when last attempt was made (any outcome)
            lastErrorCode: { type: Number, default: null }, // error_code from failed response
            lastErrorMessage: { type: String, default: null, maxlength: 500 }, // sanitized at write path
            lastErrorAt: { type: Date, default: null }, // when last error was recorded
        },

        // Consent / legal acceptance (additive, null-safe for existing users).
        termsAcceptedAt: { type: Date, default: null },
        privacyAcceptedAt: { type: Date, default: null },
        termsVersion: { type: String, default: null },
        privacyVersion: { type: String, default: null },

        // Post-password-change JWT invalidation.
        // Stamped to now() on every successful password reset or change-password.
        // Null means no password event has occurred - all existing tokens are treated as fresh.
        passwordChangedAt: { type: Date, default: null },

        // Auth-activity signal for retention/inactivity policy.
        // Stamped on every successful credential issuance (login, signup-consume, invite-accept).
        // NOT used in auth validation. NOT used for token freshness. Signal only.
        // Null = user predates this field or has not logged in since rollout.
        lastLoginAt: { type: Date, default: null },

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

        // --- Trial reminder email lifecycle (pre-expiry reminder contour) ---
        // Atomically stamped by the reminder job when it claims a candidate
        // for sending. Guards against concurrent duplicate sends.
        // Null = not yet claimed. Stale claims (older than threshold) are
        // treated as abandoned and re-eligible.
        trialReminderClaimedAt: { type: Date, default: null },
        // Stamped after the reminder email was successfully delivered.
        // Once set, reminder is permanently consumed — job skips this user.
        // Null = reminder not yet sent.
        trialReminderSentAt: { type: Date, default: null },

        // --- B2 warning lifecycle (warning-first inactivity retention contour) ---
        // Atomically stamped by the warn pass when it claims a candidate for sending.
        // Guards against concurrent duplicate sends. Stale claims (older than threshold)
        // are treated as abandoned and re-eligible on the next sweep.
        // Null = not yet claimed.
        b2WarningClaimedAt: { type: Date, default: null },
        // Stamped after the B2 warning email was successfully delivered.
        // Once set, warn pass skips this user permanently.
        // Cleanup pass uses this together with b2GraceUntil and lastLoginAt
        // to determine deletion eligibility. Null = warning not yet sent.
        b2WarningSentAt: { type: Date, default: null },
        // Grace deadline stored explicitly at send time (= sentAt + GRACE_DAYS).
        // Prevents env-drift between warn and cleanup runs.
        // Null = warning not yet sent.
        b2GraceUntil: { type: Date, default: null },

        // --- Marketing email consent ---
        // Explicit opt-in/opt-out for marketing/trial-reminder emails.
        // null = undecided (never asked, or skipped).  true = opted in.  false = opted out.
        // null is NOT consent — reminder sending requires emailMarketingConsent === true.
        emailMarketingConsent: { type: Boolean, default: null },
        // Timestamp of the last consent state change.
        emailMarketingConsentAt: { type: Date, default: null },
        // Version of the consent copy that was active when the user chose.
        // Known values: "2026-04-12" (initial). Bump CURRENT_MARKETING_CONSENT_VERSION when copy changes.
        emailMarketingConsentVersion: { type: String, default: null },
        // How the consent was recorded.
        // Known values: "register" | "signup_consume" | "invite_accept" |
        //               "editor_sidebar" | "settings_panel" | "unsubscribe_link"
        emailMarketingConsentSource: { type: String, default: null },
    },
    { timestamps: true },
);

export default mongoose.model("User", UserSchema);
