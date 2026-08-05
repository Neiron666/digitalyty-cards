import mongoose from "mongoose";

/**
 * PaymentEventInbox — Phase 2A.
 *
 * Durable, minimal evidence of an authenticated provider (Tranzila) event
 * captured BEFORE the existing PaymentIntent / PaymentTransaction / entitlement
 * flow runs.
 *
 * This collection is NOT PaymentTransaction. A row here:
 *   - does NOT grant entitlement;
 *   - does NOT mean User/Card fulfillment succeeded;
 *   - is purely authenticated-event evidence + identity/correlation state.
 *
 * Hard exclusions (never stored): Tranzila token, PAN / partial PAN, CVV,
 * card expiry, national ID, email/contact payload, raw provider payload,
 * raw json_purchase_data, provider credentials, receipt number, STO ID as a
 * standalone field. (The STO external id may only ever appear indirectly inside
 * legacyProviderTxnId, which is the unchanged ledger identity derivation.)
 *
 * autoIndex is OFF globally (db.js). Indexes below are declared for the manual
 * governed migration only and are NOT created at runtime.
 */
const paymentEventInboxSchema = new mongoose.Schema(
    {
        // Deterministic, immutable idempotency key. Never logged.
        eventKey: {
            type: String,
            required: true,
            immutable: true,
            maxlength: 128,
        },
        provider: {
            type: String,
            enum: ["tranzila"],
            required: true,
        },
        // Exact validated configured terminal, stored verbatim. No maxlength:
        // startup config validation (services/payment/index.js) enforces only
        // presence, not length, so a maxlength bound could reject a valid
        // configured terminal. required rejects empty string (Mongoose String).
        providerTerminal: {
            type: String,
            required: true,
        },
        // When present, equals the EXACT UNCHANGED providerTxnId derivation
        // (deriveProviderTxnId / deriveStoProviderTxnId). Stored verbatim — no
        // truncation/normalization — so no valid derivation is ever rejected.
        // Never logged.
        legacyProviderTxnId: {
            type: String,
            default: null,
        },
        // SHA-256(exact legacyProviderTxnId) when present. Fixed 64-hex length.
        // Backs the UNIQUE PARTIAL index for atomic cross-terminal identity
        // collision protection. Never logged.
        legacyProviderTxnIdHash: {
            type: String,
            default: null,
            maxlength: 64,
        },
        eventType: {
            type: String,
            enum: ["first_payment", "sto_recurring"],
            required: true,
        },
        identityStatus: {
            type: String,
            enum: ["stable", "manual_review", "integrity_collision"],
            required: true,
        },
        providerPaymentStatus: {
            type: String,
            enum: ["paid", "failed", "unknown"],
            required: true,
        },
        providerResponseCode: {
            type: String,
            default: null,
            maxlength: 16,
        },
        // Strict positive-allowlist safe object only (no token/card/PII).
        payloadAllowlisted: {
            type: Object,
            default: null,
        },
        // Authoritative canonical duplicate-integrity fingerprint. SHA-256 over
        // a fixed normalized scalar tuple (see computeInboxEvidenceFingerprint).
        // Immune to payload key order, unrelated optional fields, nested content
        // and token/card/PII. Required. Never logged.
        evidenceFingerprint: {
            type: String,
            required: true,
            maxlength: 128,
        },
        // Optional insert-only forensic metadata only — NOT authoritative for
        // duplicate-integrity decisions (evidenceFingerprint is).
        rawPayloadHash: {
            type: String,
            default: null,
            maxlength: 128,
        },
        firstObservedAt: {
            type: Date,
            required: true,
            immutable: true,
        },
        correlationStatus: {
            type: String,
            enum: [
                "correlation_pending",
                "correlated",
                "manual_review",
                "terminal_failed",
            ],
            required: true,
        },
        correlatedUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        correlatedCardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Card",
            default: null,
        },
        paymentIntentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentIntent",
            default: null,
        },
        plan: {
            type: String,
            enum: ["monthly", "yearly"],
            default: null,
        },
        amountAgorot: {
            type: Number,
            default: null,
        },
        currency: {
            type: String,
            default: null,
            maxlength: 8,
        },
        captureVersion: {
            type: Number,
            required: true,
            default: 1,
        },
        safeErrorCode: {
            type: String,
            default: null,
            maxlength: 64,
        },
        // Optional durable collision-review marker. Set only when a duplicate
        // delivery is classified as an integrity/identity collision. Never
        // overwrites immutable identity/financial evidence.
        collisionObservedAt: {
            type: Date,
            default: null,
        },
    },
    // createdAt is insert-only. updatedAt is DISABLED so a duplicate-delivery
    // upsert can never mutate evidence via generic timestamp behavior;
    // firstObservedAt (immutable, $setOnInsert) is the sole economic capture
    // anchor.
    { timestamps: { createdAt: true, updatedAt: false } },
);

// Unique idempotency index on the required, always-present eventKey.
// NOT created at runtime (autoIndex OFF); governed manual migration only.
paymentEventInboxSchema.index(
    { eventKey: 1 },
    { unique: true, name: "payment_event_inbox_eventKey_unique" },
);

// UNIQUE PARTIAL index on legacyProviderTxnIdHash for ATOMIC cross-terminal
// identity-collision protection: the same exact legacyProviderTxnId under a
// different terminal produces a different eventKey but the same hash, so the
// second insert deterministically raises E11000 (PROVIDER_IDENTITY_COLLISION).
// Partial: skips null so keyed-only events participate; unkeyed events never
// trip a unique-null trap.
paymentEventInboxSchema.index(
    { legacyProviderTxnIdHash: 1 },
    {
        unique: true,
        name: "payment_event_inbox_legacyProviderTxnIdHash_unique",
        partialFilterExpression: {
            legacyProviderTxnIdHash: { $type: "string" },
        },
    },
);

const PaymentEventInbox = mongoose.model(
    "PaymentEventInbox",
    paymentEventInboxSchema,
);

export default PaymentEventInbox;
