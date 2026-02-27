import mongoose from "mongoose";
import {
    BLOG_TITLE_MAX,
    BLOG_EXCERPT_MAX,
    BLOG_SECTION_HEADING_MAX,
    BLOG_SECTION_BODY_MAX,
    BLOG_SECTIONS_MAX,
    BLOG_SEO_TITLE_MAX,
    BLOG_SEO_DESC_MAX,
    BLOG_HERO_ALT_MAX,
    BLOG_SLUG_MAX,
    BLOG_AUTHOR_NAME_MAX,
    BLOG_AUTHOR_BIO_MAX,
    BLOG_AUTHOR_IMAGE_ALT_MAX,
} from "../config/blog.js";

/* ── Sub-schemas ──────────────────────────────────────────────── */

const BlogSectionSchema = new mongoose.Schema(
    {
        heading: {
            type: String,
            trim: true,
            maxlength: BLOG_SECTION_HEADING_MAX,
            default: "",
        },
        body: {
            type: String,
            trim: true,
            maxlength: BLOG_SECTION_BODY_MAX,
            default: "",
        },
    },
    { _id: false },
);

const BlogHeroImageSchema = new mongoose.Schema(
    {
        storagePath: { type: String, trim: true, default: "" },
        alt: {
            type: String,
            trim: true,
            maxlength: BLOG_HERO_ALT_MAX,
            default: "",
        },
    },
    { _id: false },
);

const BlogSeoSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            maxlength: BLOG_SEO_TITLE_MAX,
            default: "",
        },
        description: {
            type: String,
            trim: true,
            maxlength: BLOG_SEO_DESC_MAX,
            default: "",
        },
    },
    { _id: false },
);

/* ── Main schema ──────────────────────────────────────────────── */

const BlogPostSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: BLOG_SLUG_MAX,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: BLOG_TITLE_MAX,
        },
        excerpt: {
            type: String,
            required: true,
            trim: true,
            maxlength: BLOG_EXCERPT_MAX,
        },
        heroImage: {
            type: BlogHeroImageSchema,
            default: () => ({}),
        },
        sections: {
            type: [BlogSectionSchema],
            default: [],
            validate: {
                validator(arr) {
                    return arr.length <= BLOG_SECTIONS_MAX;
                },
                message: `sections cannot exceed ${BLOG_SECTIONS_MAX} items`,
            },
        },
        seo: {
            type: BlogSeoSchema,
            default: () => ({}),
        },

        /* Author (all optional — card renders only when authorName is set) */
        authorName: {
            type: String,
            trim: true,
            maxlength: BLOG_AUTHOR_NAME_MAX,
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
            maxlength: BLOG_AUTHOR_IMAGE_ALT_MAX,
            default: "",
        },
        authorBio: {
            type: String,
            trim: true,
            maxlength: BLOG_AUTHOR_BIO_MAX,
            default: "",
        },

        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },
        publishedAt: { type: Date, default: null },
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
// Compound index for public listing: published posts sorted by publishedAt desc.
BlogPostSchema.index({ status: 1, publishedAt: -1 });

export default mongoose.model("BlogPost", BlogPostSchema);
