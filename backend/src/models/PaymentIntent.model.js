import mongoose from "mongoose";

// autoIndex and autoCreate are OFF globally (see backend/src/config/db.js).
// Indexes declared here are NOT created at runtime.
// To apply: run backend/scripts/migrate-paymentintent-indexes.mjs --apply --i-understand-index-downtime

const receiptProfileSnapshotSchema = new mongoose.Schema(
    {
        recipientType: { type: String, default: null },
        name: { type: String, maxlength: 200, default: null },
        nameInvoice: { type: String, maxlength: 200, default: null },
        fullName: { type: String, maxlength: 200, default: null },
        numberId: { type: String, maxlength: 32, default: null },
        email: { type: String, maxlength: 200, default: null },
        address: { type: String, maxlength: 300, default: null },
        city: { type: String, maxlength: 100, default: null },
        zipCode: { type: String, maxlength: 20, default: null },
        countryCode: { type: String, maxlength: 5, default: null },
        snapshotSource: {
            type: String,
            enum: [null, "receiptProfile", "fallback"],
            default: null,
        },
        capturedAt: { type: Date, default: null },
    },
    { _id: false },
);

const paymentIntentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        plan: {
            type: String,
            enum: ["monthly", "yearly"],
            required: true,
        },
        mode: {
            type: String,
            enum: ["external", "iframe"],
            default: "external",
        },
        status: {
            type: String,
            enum: ["pending", "consuming", "completed", "failed", "cancelled"],
            default: "pending",
        },
        amountAgorot: {
            type: Number,
            required: true,
        },
        receiptProfileSnapshot: {
            type: receiptProfileSnapshotSchema,
            default: () => ({}),
        },
        checkoutExpiresAt: {
            type: Date,
            required: true,
        },
        purgeAt: {
            type: Date,
            required: true,
        },

        // Handshake audit evidence. sha256(thtk) — plaintext token is never stored.
        // Enables future notify thtk-echo comparison without sensitive field exposure.
        // No index: lookup is always by _id. Purged with the intent via TTL.
        handshakeThtkHash: { type: String, default: null },
        handshakeCreatedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

// TTL index — purge only. NOT on checkoutExpiresAt.
// autoIndex is OFF globally; applied via migrate-paymentintent-indexes.mjs.
paymentIntentSchema.index(
    { purgeAt: 1 },
    { expireAfterSeconds: 0, name: "paymentintents_purgeAt_ttl" },
);

// Lookup compound index for notify reconciliation.
// autoIndex is OFF globally; applied via migrate-paymentintent-indexes.mjs.
paymentIntentSchema.index(
    { userId: 1, createdAt: -1 },
    { name: "paymentintents_userId_createdAt" },
);

// Pending checkout reuse lookup index. autoIndex/autoCreate are OFF;
// apply via migrate-paymentintent-indexes.mjs.
paymentIntentSchema.index(
    { userId: 1, plan: 1, mode: 1, status: 1, checkoutExpiresAt: 1 },
    { name: "paymentintents_userId_plan_mode_status_checkoutExpiresAt" },
);

export default mongoose.model("PaymentIntent", paymentIntentSchema);
