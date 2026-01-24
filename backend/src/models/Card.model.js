import mongoose from "mongoose";

import { normalizeReviews } from "../utils/reviews.util.js";
import { ABOUT_PARAGRAPHS_MAX } from "../config/about.js";
import { REVIEWS_MAX } from "../config/reviews.js";

const UploadItemSchema = new mongoose.Schema(
    {
        kind: { type: String, default: null, trim: true },
        url: { type: String, required: true, trim: true },
        path: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false },
);

const ReviewSchema = new mongoose.Schema(
    {
        text: { type: String, required: true, trim: true },
        name: { type: String, trim: true, default: "" },
        role: { type: String, trim: true, default: "" },
        rating: { type: Number, default: null },
        // Stored as ISO string for simplicity/compat.
        date: { type: String, default: null, trim: true },
    },
    { _id: false },
);

const FaqItemSchema = new mongoose.Schema(
    {
        q: { type: String, trim: true, default: "", maxlength: 200 },
        a: { type: String, trim: true, default: "", maxlength: 4000 },
    },
    { _id: false },
);

const FaqSchema = new mongoose.Schema(
    {
        title: { type: String, trim: true, default: null, maxlength: 120 },
        lead: { type: String, trim: true, default: null, maxlength: 400 },
        items: {
            type: [FaqItemSchema],
            default: undefined,
            validate: {
                validator: (arr) => {
                    if (arr === undefined || arr === null) return true;
                    if (!Array.isArray(arr)) return false;
                    return arr.length <= 10;
                },
                message: "faq.items must contain at most 10 items",
            },
        },
    },
    { _id: false },
);

const CardSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            // Optional to support anonymous cards; keeps existing user-owned docs valid.
            required: false,
            index: true,
        },

        // One anonymous card per browser. Sparse+unique allows many docs without anonymousId.
        anonymousId: {
            type: String,
            trim: true,
            index: true,
            unique: true,
            sparse: true,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        plan: {
            type: String,
            enum: ["free", "monthly", "yearly"],
            default: "free",
        },

        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
            index: true,
        },

        // Plain trial fields (no automatic behavior in the model).
        trialStartedAt: { type: Date, default: null },
        trialEndsAt: { type: Date, default: null },
        trialDeleteAt: { type: Date, default: null, index: true },

        // Authoritative billing (server-controlled only; client must NOT set directly).
        billing: {
            status: {
                type: String,
                enum: ["free", "trial", "active", "past_due", "canceled"],
                default: "free",
            },
            plan: {
                type: String,
                enum: ["free", "monthly", "yearly"],
                default: "free",
            },
            paidUntil: { type: Date, default: null },
            // Server-controlled feature flags (support/admin only).
            features: {
                analyticsPremium: { type: Boolean, default: false },
            },
        },

        // Support tool: temporary access override (not a billing source of truth).
        adminOverride: {
            plan: {
                type: String,
                enum: ["free", "monthly", "yearly"],
                default: null,
            },
            until: { type: Date, default: null },
            // Optional feature flags for temporary support overrides.
            features: {
                analyticsPremium: { type: Boolean, default: false },
            },
            byAdmin: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null,
            },
            reason: { type: String, default: "" },
            createdAt: { type: Date, default: null },
        },

        // Admin-only feature tier override (does NOT affect billing/payment).
        // Precedence: card.adminTier > user.adminTier > effectiveBilling-derived tier > default.
        adminTier: {
            type: String,
            enum: ["free", "basic", "premium"],
            default: null,
            index: true,
        },
        adminTierUntil: { type: Date, default: null },
        adminTierByAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        adminTierReason: { type: String, default: null },
        adminTierCreatedAt: { type: Date, default: null },

        business: {
            // required minimal fields
            name: String,
            category: String,
            address: String,
            city: String,
            lat: Number,
            lng: Number,

            // legacy fields (kept for backward compatibility)
            businessName: String,
            ownerName: String,
            occupation: String,
            slogan: String,
        },

        contact: {
            // required minimal fields
            phone: String,
            whatsapp: String,
            email: String,
            website: String,

            // extended social/contact links (additive; backward compatible)
            twitter: String,
            tiktok: String,
            waze: String,

            // legacy fields (kept for backward compatibility)
            mobile: String,
            officePhone: String,
            fax: String,
            facebook: String,
            instagram: String,
            linkedin: String,
            extraLines: [String],
        },

        content: {
            // required minimal fields
            title: String,
            description: String,

            // legacy fields (kept for backward compatibility)
            aboutTitle: String,
            aboutParagraphs: {
                type: [String],
                default: undefined,
                validate: {
                    validator: (arr) => {
                        if (arr === undefined || arr === null) return true;
                        if (!Array.isArray(arr)) return false;
                        return arr.length <= ABOUT_PARAGRAPHS_MAX;
                    },
                    message: `content.aboutParagraphs must contain at most ${ABOUT_PARAGRAPHS_MAX} items`,
                },
            },
            aboutText: String,
            videoUrl: String,
        },

        faq: { type: FaqSchema, default: null },

        seo: {
            title: String,
            description: String,

            // Advanced SEO:
            canonicalUrl: {
                type: String,
                trim: true,
                default: null,
                validate: {
                    validator: (v) => {
                        if (!v) return true;
                        try {
                            // Allow absolute URLs only
                            const u = new URL(v);
                            return Boolean(u.protocol && u.host);
                        } catch {
                            return false;
                        }
                    },
                    message: "seo.canonicalUrl must be a valid absolute URL",
                },
            },
            robots: {
                type: String,
                trim: true,
                default: null,
                // Keep flexible; validate only for obviously dangerous chars
                validate: {
                    validator: (v) => !v || !/[<>]/.test(v),
                    message: "seo.robots contains invalid characters",
                },
            },

            // Verification:
            googleSiteVerification: { type: String, trim: true, default: null },
            facebookDomainVerification: {
                type: String,
                trim: true,
                default: null,
            },

            // Structured data:
            jsonLd: {
                type: String,
                trim: true,
                default: null,
                validate: {
                    validator: (v) => {
                        if (!v) return true;
                        try {
                            const parsed = JSON.parse(v);
                            return (
                                parsed !== null &&
                                (typeof parsed === "object" ||
                                    Array.isArray(parsed))
                            );
                        } catch {
                            return false;
                        }
                    },
                    message: "seo.jsonLd must be a valid JSON string",
                },
            },

            // Analytics & pixels (white-list):
            gtmId: {
                type: String,
                trim: true,
                default: null,
                uppercase: true,
                validate: {
                    validator: (v) => !v || /^GTM-[A-Z0-9]+$/.test(v),
                    message: "seo.gtmId must match GTM-XXXX",
                },
            },
            gaMeasurementId: {
                type: String,
                trim: true,
                default: null,
                uppercase: true,
                validate: {
                    validator: (v) => !v || /^G-[A-Z0-9]+$/.test(v),
                    message: "seo.gaMeasurementId must match G-XXXX",
                },
            },
            metaPixelId: {
                type: String,
                trim: true,
                default: null,
                validate: {
                    validator: (v) => !v || /^[0-9]{5,20}$/.test(v),
                    message: "seo.metaPixelId must be a numeric string",
                },
            },

            // Custom scripts: запрещаем произвольный HTML на первом этапе
            // Instead allow safe snippets from a small whitelist (future-extensible)
            headSnippets: [
                new mongoose.Schema(
                    {
                        type: {
                            type: String,
                            required: true,
                            enum: ["meta", "link"],
                        },
                        value: {
                            type: String,
                            required: true,
                            trim: true,
                            maxlength: 2048,
                            validate: {
                                validator: (v) => !/[<>]/.test(v),
                                message:
                                    "seo.headSnippets.value must not contain HTML",
                            },
                        },
                    },
                    { _id: false },
                ),
            ],
        },

        // Backward compatible: old cards store string URLs; new uploads store objects.
        gallery: [{ type: mongoose.Schema.Types.Mixed, default: [] }],
        reviews: {
            type: [ReviewSchema],
            default: [],
            set: (arr) => normalizeReviews(arr),
            validate: {
                validator: (arr) => {
                    if (arr === undefined || arr === null) return true;
                    if (!Array.isArray(arr)) return false;
                    return arr.length <= REVIEWS_MAX;
                },
                message: `reviews must contain at most ${REVIEWS_MAX} items`,
            },
        },

        design: {
            templateId: { type: String, default: null },
            // CustomV1 palette selection (class-based; persisted in design)
            customPaletteKey: { type: String, default: null, trim: true },
            primaryColor: String,
            accentColor: String,
            backgroundColor: String,
            buttonTextColor: String,
            font: String,

            // new template assets
            backgroundImage: String,
            backgroundOverlay: { type: Number, default: 40 },
            avatarImage: String,

            // optional Supabase storage paths (for deletion)
            backgroundImagePath: String,
            avatarImagePath: String,

            // legacy fields
            coverImage: String,
            logo: String,

            // optional Supabase storage paths (for deletion)
            coverImagePath: String,
            logoPath: String,
        },

        // Tracks all uploaded objects (useful for deletion/cleanup even if client only stores URL fields).
        uploads: { type: [UploadItemSchema], default: [] },

        flags: {
            isTemplateSeeded: { type: Boolean, default: false },
            seededMap: { type: mongoose.Schema.Types.Mixed, default: {} },
        },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, runSettersOnQuery: true },
);

// Model intentionally contains no product logic/middleware.
// Trial start/expiry and ownership flows are handled outside the schema (e.g., controller/service).

export default mongoose.model("Card", CardSchema);
