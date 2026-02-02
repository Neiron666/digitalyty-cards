import mongoose from "mongoose";

const OrganizationMemberSchema = new mongoose.Schema(
    {
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        role: {
            type: String,
            enum: ["member", "admin"],
            default: "member",
            index: true,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
            index: true,
        },
    },
    { timestamps: true },
);

OrganizationMemberSchema.index(
    { orgId: 1, userId: 1 },
    { unique: true, name: "orgId_1_userId_1" },
);

export default mongoose.model("OrganizationMember", OrganizationMemberSchema);
