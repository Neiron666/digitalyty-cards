import mongoose from "mongoose";
import { isValidOrgSlug } from "../utils/orgSlug.util.js";

const orgEntitlementSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["none", "active", "revoked"],
            default: "none",
        },
        plan: {
            type: String,
            enum: [null, "org"],
            default: null,
        },
        startsAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
        grantedByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        grantedAt: { type: Date, default: null },
        lastModifiedByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        lastModifiedAt: { type: Date, default: null },
        source: {
            type: String,
            enum: [null, "admin-manual"],
            default: null,
        },
        paymentReference: {
            type: String,
            trim: true,
            maxlength: 120,
            default: null,
        },
        adminNote: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
    },
    { _id: false },
);

const OrganizationSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            validate: {
                validator: (v) => isValidOrgSlug(v),
                message: "slug is invalid",
            },
        },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        note: { type: String, default: "", trim: true, maxlength: 500 },
        isActive: { type: Boolean, default: true },
        seatLimit: {
            type: Number,
            default: null,
            validate: {
                validator: (v) => v === null || (Number.isInteger(v) && v > 0),
                message: "seatLimit must be a positive integer",
            },
        },
        orgEntitlement: { type: orgEntitlementSchema, default: () => ({}) },
    },
    { timestamps: true },
);

OrganizationSchema.index({ slug: 1 }, { unique: true, name: "slug_1" });

export default mongoose.model("Organization", OrganizationSchema);
