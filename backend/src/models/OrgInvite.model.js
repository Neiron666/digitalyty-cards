import mongoose from "mongoose";

const OrgInviteSchema = new mongoose.Schema(
    {
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        role: {
            type: String,
            enum: ["member", "admin"],
            default: "member",
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        createdByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        revokedAt: {
            type: Date,
            default: null,
        },
        usedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

// Runtime-shaped compound indexes (managed by migrate-orginvites-indexes.mjs).
OrgInviteSchema.index({ orgId: 1, createdAt: -1 });
OrgInviteSchema.index({ orgId: 1, revokedAt: 1, usedAt: 1, expiresAt: 1 });
OrgInviteSchema.index({
    orgId: 1,
    email: 1,
    revokedAt: 1,
    usedAt: 1,
    expiresAt: 1,
});
OrgInviteSchema.index({ createdByUserId: 1, revokedAt: 1, usedAt: 1 });

export default mongoose.model("OrgInvite", OrgInviteSchema);
