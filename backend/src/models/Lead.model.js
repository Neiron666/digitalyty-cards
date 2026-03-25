import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
    {
        card: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Card",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 254,
        },

        phone: {
            type: String,
            trim: true,
            maxlength: 20,
        },

        message: {
            type: String,
            trim: true,
            maxlength: 1000,
        },

        // null = unread; Date = when the owner read this lead.
        readAt: {
            type: Date,
            default: null,
        },

        isImportant: {
            type: Boolean,
            default: false,
        },

        // null = active; Date = when archived by owner.
        archivedAt: {
            type: Date,
            default: null,
        },

        // null = not deleted; Date = soft-deleted (trash).
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

// ── Governed index declarations (autoIndex OFF — migration is manual) ──

// Mailbox views: active / archived / trash filtered lists + cursor pagination.
leadSchema.index(
    { card: 1, deletedAt: 1, archivedAt: 1, createdAt: -1 },
    { name: "idx_leads_mailbox" },
);

// TTL: auto-purge soft-deleted leads after 90 days (7 776 000 s).
// MongoDB TTL skips documents where the field is null/missing — safe for active leads.
leadSchema.index(
    { deletedAt: 1 },
    { name: "idx_leads_deletedAt_ttl", expireAfterSeconds: 7_776_000 },
);

// Unread-count: supports countDocuments({ card, readAt:null, archivedAt:null, deletedAt:null }).
leadSchema.index(
    { card: 1, deletedAt: 1, archivedAt: 1, readAt: 1 },
    { name: "idx_leads_unread_count" },
);

export default mongoose.model("Lead", leadSchema);
