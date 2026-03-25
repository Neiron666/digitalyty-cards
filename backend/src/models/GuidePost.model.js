import mongoose from "mongoose";
import {
    GUIDE_TITLE_MAX,
    GUIDE_EXCERPT_MAX,
    GUIDE_SECTION_HEADING_MAX,
    GUIDE_SECTION_BODY_MAX,
    GUIDE_SECTIONS_MAX,
    GUIDE_SEO_TITLE_MAX,
    GUIDE_SEO_DESC_MAX,
    GUIDE_HERO_ALT_MAX,
    GUIDE_SECTION_IMAGE_ALT_MAX,
    GUIDE_SLUG_MAX,
    GUIDE_PREVIOUS_SLUGS_MAX,
    GUIDE_AUTHOR_NAME_MAX,
    GUIDE_AUTHOR_BIO_MAX,
    GUIDE_AUTHOR_IMAGE_ALT_MAX,
} from "../config/guide.js";

/* ── Sub-schemas ──────────────────────────────────────────────── */

const GuideSectionImageSchema = new mongoose.Schema(
    {
        storagePath: { type: String, trim: true, default: "" },
        alt: {
            type: String,
            trim: true,
            maxlength: GUIDE_SECTION_IMAGE_ALT_MAX,
            default: "",
        },
    },
    { _id: false },
);

const GuideSectionSchema = new mongoose.Schema(
    {
        heading: {
            type: String,
            trim: true,
            maxlength: GUIDE_SECTION_HEADING_MAX,
            default: "",
        },
        body: {
            type: String,
            trim: true,
            maxlength: GUIDE_SECTION_BODY_MAX,
            default: "",
        },
        image: {
            type: GuideSectionImageSchema,
            default: () => ({}),
        },
    },
    { _id: false },
);

const GuideHeroImageSchema = new mongoose.Schema(
    {
        storagePath: { type: String, trim: true, default: "" },
        alt: {
            type: String,
            trim: true,
            maxlength: GUIDE_HERO_ALT_MAX,
            default: "",
        },
    },
    { _id: false },
);

const GuideSeoSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            maxlength: GUIDE_SEO_TITLE_MAX,
            default: "",
        },
        description: {
            type: String,
            trim: true,
            maxlength: GUIDE_SEO_DESC_MAX,
            default: "",
        },
    },
    { _id: false },
);

/* ── Main schema ──────────────────────────────────────────────── */

const GuidePostSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: GUIDE_SLUG_MAX,
        },
        previousSlugs: {
            type: [
                {
                    type: String,
                    trim: true,
                    lowercase: true,
                    maxlength: GUIDE_SLUG_MAX,
                },
            ],
            default: [],
            validate: {
                validator(arr) {
                    return arr.length <= GUIDE_PREVIOUS_SLUGS_MAX;
                },
                message: `previousSlugs cannot exceed ${GUIDE_PREVIOUS_SLUGS_MAX} items`,
            },
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: GUIDE_TITLE_MAX,
        },
        excerpt: {
            type: String,
            required: true,
            trim: true,
            maxlength: GUIDE_EXCERPT_MAX,
        },
        heroImage: {
            type: GuideHeroImageSchema,
            default: () => ({}),
        },
        sections: {
            type: [GuideSectionSchema],
            default: [],
            validate: {
                validator(arr) {
                    return arr.length <= GUIDE_SECTIONS_MAX;
                },
                message: `sections cannot exceed ${GUIDE_SECTIONS_MAX} items`,
            },
        },
        seo: {
            type: GuideSeoSchema,
            default: () => ({}),
        },

        /* Author (all optional — card renders only when authorName is set) */
        authorName: {
            type: String,
            trim: true,
            maxlength: GUIDE_AUTHOR_NAME_MAX,
            default: "",
        },
        authorImageUrl: {
            type: String,
            trim: true,
            default: "",
        },
        authorImageAlt: {
            type: String,
            trim: true,
            maxlength: GUIDE_AUTHOR_IMAGE_ALT_MAX,
            default: "",
        },
        authorBio: {
            type: String,
            trim: true,
            maxlength: GUIDE_AUTHOR_BIO_MAX,
            default: "",
        },

        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },
        publishedAt: { type: Date, default: null },
        firstPublishedAt: { type: Date, default: null },
        createdByAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true },
);

/* ── Indexes ──────────────────────────────────────────────────── */
// slug is already unique (implicit unique index).
// Compound index for public listing: published guides sorted by publishedAt desc.
GuidePostSchema.index({ status: 1, publishedAt: -1 });
// Multikey index for alias resolution on public endpoint.
GuidePostSchema.index({ previousSlugs: 1 });

export default mongoose.model("GuidePost", GuidePostSchema);
