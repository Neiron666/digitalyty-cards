import mongoose from "mongoose";

// Index declaration for documentation and manual migration.
// autoIndex is OFF globally (db.js); this index is NOT created at runtime.
// To create: run backend/scripts/migrate-receipt-indexes.mjs --apply
const receiptSchema = new mongoose.Schema(
    {
        paymentTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentTransaction",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        provider: {
            type: String,
            enum: ["yeshinvoice"],
            required: true,
        },
        providerDocId: {
            type: Number,
            default: null,
        },
        providerDocNumber: {
            type: Number,
            default: null,
        },
        // Stored explicitly for audit trail — do not hardcode in queries.
        documentType: {
            type: Number,
            default: 6,
        },
        pdfUrl: {
            type: String,
            default: null,
        },
        documentUrl: {
            type: String,
            default: null,
        },
        amountAgorot: {
            type: Number,
            default: null,
        },
        plan: {
            type: String,
            enum: ["monthly", "yearly"],
            required: false,
            default: null,
        },
        status: {
            type: String,
            enum: ["created", "failed", "skipped"],
            required: true,
        },
        failReason: {
            type: String,
            maxlength: 200,
            default: null,
        },
        // Value sent to YeshInvoice as DocumentUniqueKey — stored for audit and dedup confirmation.
        documentUniqueKey: {
            type: String,
            maxlength: 20,
            default: null,
        },
        // YeshInvoice-confirmed document issuance time — distinct from Mongoose createdAt.
        issuedAt: {
            type: Date,
            default: null,
        },
        // Tracks shareDocument (email send) outcome independently from document creation.
        shareStatus: {
            type: String,
            enum: ["pending", "sent", "failed", "skipped"],
            default: "pending",
        },
        shareFailReason: {
            type: String,
            maxlength: 200,
            default: null,
        },
        sharedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

// Index declaration for documentation and manual migration.
// autoIndex is OFF globally (db.js); this index is NOT created at runtime.
// To create: run backend/scripts/migrate-receipt-indexes.mjs --apply
receiptSchema.index({ paymentTransactionId: 1 }, { unique: true });

const Receipt = mongoose.model("Receipt", receiptSchema);

export default Receipt;
