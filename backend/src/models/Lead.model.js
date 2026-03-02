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

// Index for list-by-card queries + cascade deleteMany performance.
// autoIndex is NOT enabled — migration is manual (project index governance).
leadSchema.index({ card: 1, createdAt: -1 });

// Compound index for inbox read path: unread-count + filtered list.
// Additive — does NOT replace the index above (removal is a separate ops ticket).
leadSchema.index({ card: 1, readAt: 1, createdAt: -1 });

// Compound index for mailbox views: active / archived / trash filtered lists.
// Additive — does NOT replace the indexes above.
leadSchema.index({ card: 1, deletedAt: 1, archivedAt: 1, createdAt: -1 });

// TTL index: auto-purge soft-deleted leads after 90 days (7 776 000 s).
// MongoDB TTL skips documents where the field is null/missing — safe for active leads.
// autoIndex is OFF — create manually: db.leads.createIndex({ deletedAt: 1 }, { expireAfterSeconds: 7776000 })
leadSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 7_776_000 });

export default mongoose.model("Lead", leadSchema);
