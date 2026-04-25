import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
    {
        providerTxnId: {
            type: String,
            required: true,
        },
        provider: {
            type: String,
            enum: ["tranzila", "mock", "admin"],
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        cardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Card",
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
            default: "ILS",
        },
        payloadAllowlisted: {
            type: Object,
            default: null,
        },
        rawPayloadHash: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            required: true,
        },
        idempotencyNote: {
            type: String,
            default: null,
        },
        receiptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Receipt",
            default: null,
        },
        paymentIntentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentIntent",
            default: null,
        },
        failReason: {
            type: String,
            default: null,
        },
    },
    { timestamps: true },
);

// Index declaration for documentation and manual migration.
// autoIndex is OFF globally (db.js); this index is NOT created at runtime.
// To create: run manual migration script with --apply --create-index.
paymentTransactionSchema.index({ providerTxnId: 1 }, { unique: true });

const PaymentTransaction = mongoose.model(
    "PaymentTransaction",
    paymentTransactionSchema,
);

export default PaymentTransaction;
