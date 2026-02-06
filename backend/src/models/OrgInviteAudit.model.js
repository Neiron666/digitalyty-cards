import mongoose from "mongoose";

const OrgInviteAuditSchema = new mongoose.Schema(
    {
        eventType: {
            type: String,
            required: true,
            enum: ["INVITE_CREATED", "INVITE_REVOKED", "INVITE_ACCEPTED"],
            index: true,
        },
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        inviteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrgInvite",
            required: true,
            index: true,
        },
        emailNormalized: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        actorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    { timestamps: true },
);

export default mongoose.model("OrgInviteAudit", OrgInviteAuditSchema);
