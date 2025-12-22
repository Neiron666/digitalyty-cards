import mongoose from "mongoose";

const AdminAuditSchema = new mongoose.Schema(
    {
        adminUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        action: { type: String, required: true, index: true },
        targetType: {
            type: String,
            enum: ["user", "card"],
            required: true,
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        reason: { type: String, required: true },
        meta: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    { timestamps: true }
);

export default mongoose.model("AdminAudit", AdminAuditSchema);
