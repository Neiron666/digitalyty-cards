import mongoose from "mongoose";
import { isValidOrgSlug } from "../utils/orgSlug.util.js";

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
        isActive: { type: Boolean, default: true, index: true },
        seatLimit: {
            type: Number,
            default: null,
            validate: {
                validator: (v) => v === null || (Number.isInteger(v) && v > 0),
                message: "seatLimit must be a positive integer",
            },
        },
    },
    { timestamps: true },
);

OrganizationSchema.index({ slug: 1 }, { unique: true, name: "slug_1" });

export default mongoose.model("Organization", OrganizationSchema);
