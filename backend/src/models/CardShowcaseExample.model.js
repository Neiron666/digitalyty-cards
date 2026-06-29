import mongoose from "mongoose";
import {
    SHOWCASE_INTERNAL_NAME_MAX,
    SHOWCASE_IMAGE_ALT_MAX,
    SHOWCASE_TITLE_MAX,
    SHOWCASE_DESC_MAX,
    SHOWCASE_CTA_LABEL_MAX,
    SHOWCASE_CTA_URL_MAX,
    SHOWCASE_SORT_ORDER_MIN,
    SHOWCASE_SORT_ORDER_MAX,
} from "../config/cardsShowcase.js";

const CardShowcaseExampleSchema = new mongoose.Schema(
    {
        internalName: {
            type: String,
            trim: true,
            maxlength: SHOWCASE_INTERNAL_NAME_MAX,
            default: "",
        },
        imageStoragePath: {
            type: String,
            trim: true,
            default: "",
        },
        imageAlt: {
            type: String,
            trim: true,
            maxlength: SHOWCASE_IMAGE_ALT_MAX,
            default: "",
        },
        title: {
            type: String,
            trim: true,
            maxlength: SHOWCASE_TITLE_MAX,
            default: "",
        },
        description: {
            type: String,
            trim: true,
            maxlength: SHOWCASE_DESC_MAX,
            default: "",
        },
        ctaLabel: {
            type: String,
            trim: true,
            maxlength: SHOWCASE_CTA_LABEL_MAX,
            default: "",
        },
        ctaUrl: {
            type: String,
            trim: true,
            maxlength: SHOWCASE_CTA_URL_MAX,
            default: "",
        },
        isActive: {
            type: Boolean,
            default: false,
        },
        sortOrder: {
            type: Number,
            default: 0,
            min: SHOWCASE_SORT_ORDER_MIN,
            max: SHOWCASE_SORT_ORDER_MAX,
        },
        createdByAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true },
);

// ── Governed index declarations (autoIndex OFF — migration is manual) ──
// Applied via: npm run migrate:cardshowcase-indexes:apply
// Public listing index: active items sorted by sortOrder asc, createdAt asc tie-breaker.
CardShowcaseExampleSchema.index({ isActive: 1, sortOrder: 1, createdAt: 1 });

export default mongoose.model(
    "CardShowcaseExample",
    CardShowcaseExampleSchema,
);
