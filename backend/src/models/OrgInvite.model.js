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

export default mongoose.model("OrgInvite", OrgInviteSchema);
