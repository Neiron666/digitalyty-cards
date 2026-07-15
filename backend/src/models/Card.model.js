import mongoose from "mongoose";

import { normalizeReviews } from "../utils/reviews.util.js";
import { BOOKING_HORIZON_ALLOWED } from "../utils/bookingHorizon.util.js";
import {
    ABOUT_PARAGRAPHS_MAX,
    ABOUT_PARAGRAPH_ITEM_MAX,
} from "../config/about.js";
import {
    REVIEWS_MAX,
    REVIEWS_NAME_MAX,
    REVIEWS_ROLE_MAX,
    REVIEWS_RATING_MIN,
    REVIEWS_RATING_MAX,
} from "../config/reviews.js";
import {
    BUSINESS_NAME_MAX,
    BUSINESS_SLOGAN_MAX,
    BUSINESS_SUBTITLE_MAX,
    BUSINESS_ADDRESS_MAX,
    BUSINESS_LAT_MIN,
    BUSINESS_LAT_MAX,
    BUSINESS_LNG_MIN,
    BUSINESS_LNG_MAX,
} from "../utils/business.util.js";
import {
    SERVICES_TITLE_MAX,
    SERVICES_ITEMS_MAX,
    SERVICES_ITEM_MAX,
} from "../config/services.js";

// --- Private URL validator helpers (not exported) ---
// Mirrors the scheme-blocking logic of frontend ensureHttpUrl for storage-level safety.
// Does NOT normalize or mutate the stored value — protocol-less values are accepted
// for backward compatibility and validated by internally prepending https://.

function isValidContactUrl(v) {
    if (!v) return true;
    const s = String(v).trim();
    if (!s) return true;
    // Reject inner whitespace (e.g. "not a url").
    if (/\s/.test(s)) return false;
    const lower = s.toLowerCase();
    // Reject dangerous schemes.
    if (
        lower.startsWith("javascript:") ||
        lower.startsWith("data:") ||
        lower.startsWith("vbscript:")
    ) {
        return false;
    }
    // Reject any other non-http(s) scheme (ftp:, file:, chrome:, mailto:, etc.).
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
        return lower.startsWith("http://") || lower.startsWith("https://");
    }
    // Protocol-less: prepend https:// internally for validation only.
    const candidate =
        lower.startsWith("http://") || lower.startsWith("https://")
            ? s
            : `https://${s}`;
    try {
        const u = new URL(candidate);
        return (
            (u.protocol === "http:" || u.protocol === "https:") &&
            Boolean(u.hostname)
        );
    } catch {
        return false;
    }
}

function isValidWazeOrHttpUrl(v) {
    if (!v) return true;
    const s = String(v).trim();
    if (!s) return true;
    const lower = s.toLowerCase();
    // Allow waze:// (native app deep-link) — pass through after whitespace check.
    if (lower.startsWith("waze://")) {
        return !/\s/.test(s);
    }
    // All other values: delegate to the standard http(s) validator.
    return isValidContactUrl(v);
}

function isValidSelfThemeHexColor(value) {
    if (value == null) return true;
    if (typeof value !== "string") return false;
    const v = value.trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(v) || /^#[0-9a-f]{3}$/.test(v);
}

function isValidVideoUrl(value) {
    // Allow null/undefined — clearing the optional field.
    if (value == null) return true;
    // Reject non-string (booleans, objects, arrays, etc.).
    if (typeof value !== "string") return false;
    const input = value.trim();
    // Allow explicit empty or whitespace-only — represents clearing the field.
    if (!input) return true;
    // Build candidate URL: normalise protocol-less inputs for validation only.
    // The stored value is never mutated.
    const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    let url;
    try {
        url = new URL(candidate);
    } catch {
        return false;
    }
    const hostname = url.hostname.toLowerCase();
    // Exact hostname whitelist — mirrors frontend pre-filter (VideoSection.jsx:10-12).
    // Do NOT use hostname.endsWith(".youtube.com") — that would accept m.youtube.com,
    // music.youtube.com, etc. which the frontend pre-filter rejects.
    const isYouTubeCom =
        hostname === "youtube.com" || hostname === "www.youtube.com";
    const isYoutuBe = hostname === "youtu.be";
    if (!isYouTubeCom && !isYoutuBe) return false;
    // Extract videoId exactly as frontend toYouTubeEmbedUrl does.
    let videoId = null;
    if (isYoutuBe) {
        // https://youtu.be/{id}
        const parts = url.pathname.split("/").filter(Boolean);
        videoId = parts[0] || null;
    } else {
        const path = url.pathname;
        // https://www.youtube.com/watch?v={id}
        if (path === "/watch") {
            videoId = url.searchParams.get("v");
        }
        // https://www.youtube.com/shorts/{id}
        if (!videoId && path.startsWith("/shorts/")) {
            videoId = path.split("/shorts/")[1]?.split("/")[0] || null;
        }
        // https://www.youtube.com/embed/{id}
        if (!videoId && path.startsWith("/embed/")) {
            videoId = path.split("/embed/")[1]?.split("/")[0] || null;
        }
        // All other youtube.com paths (/live, /playlist, /channel, /@handle, etc.) → no videoId → reject.
    }
    if (!videoId) return false;
    // YouTube video IDs are exactly 11 chars: [A-Za-z0-9_-]
    return /^[A-Za-z0-9_-]{11}$/.test(videoId);
}

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
        name: {
            type: String,
            trim: true,
            default: "",
            maxlength: [
                REVIEWS_NAME_MAX,
                `reviews[].name must not exceed ${REVIEWS_NAME_MAX} characters`,
            ],
        },
        role: {
            type: String,
            trim: true,
            default: "",
            maxlength: [
                REVIEWS_ROLE_MAX,
                `reviews[].role must not exceed ${REVIEWS_ROLE_MAX} characters`,
            ],
        },
        rating: {
            type: Number,
            default: null,
            validate: {
                validator: (v) =>
                    v == null ||
                    (Number.isFinite(v) &&
                        Number.isInteger(v) &&
                        v >= REVIEWS_RATING_MIN &&
                        v <= REVIEWS_RATING_MAX),
                message:
                    "reviews[].rating must be null or an integer from 1 to 5",
            },
        },
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
                    return arr.length <= 5;
                },
                message: "faq.items must contain at most 5 items",
            },
        },
    },
    { _id: false },
);

// ─── Custom Contact Action (premium-only) ──────────────────────────────────
// Allowed actionTypes (MVP): phone, whatsapp, address, email, facebook, website, url.
// navigation/waze/maps are intentionally NOT included.
// "address" stores plain text (a business address), not a Waze/maps URL.
// "url" is a generic safe http/https link (booking, menu, catalog, form, etc.).
// "website" is specifically for the business website.
// "facebook" is specifically for a Facebook page/profile.
const CUSTOM_ACTION_TYPES = new Set([
    "phone",
    "whatsapp",
    "address",
    "email",
    "facebook",
    "website",
    "url",
]);
const CUSTOM_ACTION_ADDRESS_MAX = 200;
const CARD_IMAGE_ALT_MAX = 200;

// isValidAddressText: safe plain-text validator for the address actionType target.
// Allows any printable text (Hebrew, English, digits, punctuation).
// Rejects control characters. Caps at CUSTOM_ACTION_ADDRESS_MAX chars.
function isValidAddressText(v) {
    if (!v) return false;
    const s = String(v).trim();
    if (!s) return false;
    if (/[\x00-\x1F\x7F]/.test(s)) return false;
    if (s.length > CUSTOM_ACTION_ADDRESS_MAX) return false;
    return true;
}

const CustomActionItemSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            trim: true,
            required: [true, "contact.customActions[*].label is required"],
            maxlength: [
                80,
                "contact.customActions[*].label must not exceed 80 characters",
            ],
        },
        actionType: {
            type: String,
            required: [true, "contact.customActions[*].actionType is required"],
            enum: {
                values: [
                    "phone",
                    "whatsapp",
                    "address",
                    "email",
                    "facebook",
                    "website",
                    "url",
                ],
                message:
                    "contact.customActions[*].actionType must be one of: phone, whatsapp, address, email, facebook, website, url",
            },
        },
        target: {
            type: String,
            trim: true,
            required: [true, "contact.customActions[*].target is required"],
            maxlength: [
                2048,
                "contact.customActions[*].target must not exceed 2048 characters",
            ],
            validate: {
                // Type-sensitive validator: delegates to the per-type rule matching
                // the same patterns used by the existing built-in contact fields.
                // Arrow function cannot be used here — 'this' must refer to the item document.
                validator: function (v) {
                    if (!v) return false;
                    const type = this.actionType;
                    switch (type) {
                        case "phone":
                            return /^\+?[\d\s\-()+.*#,]+(?:\s*(?:x|ext\.?)\s*\d{1,6})?$/i.test(
                                v,
                            );
                        case "whatsapp":
                            return /^\+?[\d\s\-()+]{4,20}$/.test(v);
                        case "address":
                            return isValidAddressText(v);
                        case "email":
                            return /^[^\s@<>?&][^@<>?&]*@[^@<>?&]+\.[^@<>?&\s]+$/.test(
                                v,
                            );
                        case "facebook":
                        case "website":
                        case "url":
                            return isValidContactUrl(v);
                        default:
                            return false;
                    }
                },
                message:
                    "contact.customActions[*].target is invalid for the given actionType",
            },
        },
    },
    { _id: false },
);
// ─── End Custom Contact Action ─────────────────────────────────────────────

const ServicesSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            default: null,
            maxlength: [
                SERVICES_TITLE_MAX,
                "content.services.title must not exceed 120 characters",
            ],
        },
        items: {
            type: [
                {
                    type: String,
                    trim: true,
                    maxlength: [
                        SERVICES_ITEM_MAX,
                        "content.services.items[*] must not exceed 120 characters",
                    ],
                },
            ],
            default: undefined,
            validate: {
                validator: (arr) => {
                    if (arr === undefined || arr === null) return true;
                    if (!Array.isArray(arr)) return false;
                    return arr.length <= SERVICES_ITEMS_MAX;
                },
                message: "content.services.items must contain at most 10 items",
            },
        },
    },
    { _id: false },
);

const BusinessHoursIntervalSchema = new mongoose.Schema(
    {
        start: {
            type: String,
            trim: true,
            default: "",
            validate: {
                validator: (v) => !v || /^([01]\d|2[0-3]):(00|30)$/.test(v),
                message:
                    "businessHours.week.*.intervals.start must be HH:mm (00|30)",
            },
        },
        end: {
            type: String,
            trim: true,
            default: "",
            validate: {
                validator: (v) => !v || /^([01]\d|2[0-3]):(00|30)$/.test(v),
                message:
                    "businessHours.week.*.intervals.end must be HH:mm (00|30)",
            },
        },
    },
    { _id: false },
);

const BusinessHoursDaySchema = new mongoose.Schema(
    {
        open: { type: Boolean, default: false },
        intervals: {
            type: [BusinessHoursIntervalSchema],
            default: undefined,
            validate: {
                validator: (arr) => {
                    if (arr === undefined || arr === null) return true;
                    if (!Array.isArray(arr)) return false;
                    return arr.length <= 4;
                },
                message:
                    "businessHours.week.*.intervals must contain at most 4 intervals",
            },
        },
    },
    { _id: false },
);

const BusinessHoursSchema = new mongoose.Schema(
    {
        v: { type: Number, default: 1 },
        enabled: { type: Boolean, default: false },
        week: {
            sun: { type: BusinessHoursDaySchema, default: () => ({}) },
            mon: { type: BusinessHoursDaySchema, default: () => ({}) },
            tue: { type: BusinessHoursDaySchema, default: () => ({}) },
            wed: { type: BusinessHoursDaySchema, default: () => ({}) },
            thu: { type: BusinessHoursDaySchema, default: () => ({}) },
            fri: { type: BusinessHoursDaySchema, default: () => ({}) },
            sat: { type: BusinessHoursDaySchema, default: () => ({}) },
        },
    },
    { _id: false },
);

const PayerSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["none", "user", "org"],
            default: "none",
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null,
        },
        note: {
            type: String,
            trim: true,
            default: null,
            maxlength: 80,
        },
        source: {
            type: String,
            enum: ["admin", "sync", "provider"],
            default: null,
        },
        updatedAt: { type: Date, default: null },
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
        },

        // One anonymous card per browser. Sparse+unique allows many docs without anonymousId.
        anonymousId: {
            type: String,
            trim: true,
            index: true,
            unique: true,
            sparse: true,
        },

        // Enterprise: tenant-scoped slugs.
        // NOTE: existing docs may have tenantKey missing/null until backfill.
        tenantKey: {
            type: String,
            trim: true,
            lowercase: true,
            default: null,
            index: true,
        },

        // Path-tenancy: organization-scoped cards.
        // NOTE: existing docs may have orgId missing/null until backfill.
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null,
            index: true,
        },

        slug: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        // Enterprise slug-change policy (2 per Israel calendar month).
        // Server-controlled only.
        slugChange: {
            monthKey: { type: String, default: null, trim: true },
            count: { type: Number, default: 0 },
            updatedAt: { type: Date, default: null },
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

        // Card-level display language (public render + SEO metadata only).
        // Existing docs without this field resolve to "he" via the schema default.
        language: {
            type: String,
            enum: ["he", "ru"],
            default: "he",
        },

        // Plain trial fields (no automatic behavior in the model).
        trialStartedAt: { type: Date, default: null },
        trialEndsAt: { type: Date, default: null },
        trialDeleteAt: { type: Date, default: null, index: true },

        // Lifecycle reconciliation: stamped when an expired user-premium trial
        // is detected and billing is normalized back to free.
        // Null = not yet downgraded (or never had a trial).
        downgradedAt: { type: Date, default: null },

        // Retention purge: stamped when premium-only surplus data is purged
        // after the retention grace window expires post-downgrade.
        // Null = not yet purged (or never downgraded).
        retentionPurgedAt: { type: Date, default: null },

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
            // Admin-only attribution (who pays for this card). Must not leak via public DTO.
            payer: {
                type: PayerSchema,
                default: null,
                // IMPORTANT: `validate` must be a path option on billing.payer.
                // If placed inside the subdocument shape, Mongoose treats it as data paths
                // (billing.payer.validate.validator) and tries to interpret `validator` as a type.
                validate: {
                    validator: (payer) => {
                        if (payer === undefined || payer === null) return true;
                        if (typeof payer !== "object") return false;

                        const t = payer.type;
                        if (t === "org") {
                            return Boolean(payer.orgId) && !payer.userId;
                        }
                        if (t === "user") {
                            return Boolean(payer.userId) && !payer.orgId;
                        }
                        // none (or legacy/unknown) => both null.
                        return !payer.userId && !payer.orgId;
                    },
                    message:
                        "billing.payer invalid: org requires orgId only; user requires userId only; none requires both null",
                },
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
            name: {
                type: String,
                trim: true,
                default: "",
                maxlength: BUSINESS_NAME_MAX,
            },
            category: {
                type: String,
                trim: true,
                default: "",
                maxlength: BUSINESS_SUBTITLE_MAX,
            },
            address: {
                type: String,
                trim: true,
                maxlength: [
                    BUSINESS_ADDRESS_MAX,
                    "business.address must not exceed 300 characters",
                ],
            },
            city: String,
            lat: {
                type: Number,
                validate: {
                    validator: (v) =>
                        v == null ||
                        (Number.isFinite(v) &&
                            v >= BUSINESS_LAT_MIN &&
                            v <= BUSINESS_LAT_MAX),
                    message:
                        "business.lat must be null or a valid latitude (-90 to 90)",
                },
            },
            lng: {
                type: Number,
                validate: {
                    validator: (v) =>
                        v == null ||
                        (Number.isFinite(v) &&
                            v >= BUSINESS_LNG_MIN &&
                            v <= BUSINESS_LNG_MAX),
                    message:
                        "business.lng must be null or a valid longitude (-180 to 180)",
                },
            },

            // legacy fields (kept for backward compatibility)
            businessName: String,
            ownerName: String,
            occupation: {
                type: String,
                trim: true,
                default: "",
                maxlength: BUSINESS_SUBTITLE_MAX,
            },
            slogan: {
                type: String,
                trim: true,
                default: "",
                maxlength: BUSINESS_SLOGAN_MAX,
            },
        },

        contact: {
            // required minimal fields
            phone: {
                type: String,
                trim: true,
                maxlength: 30,
                validate: {
                    // Base: digits + safe formatting chars (spaces, -, parens, +, ., *, #, ,).
                    // Optional structured extension suffix: "x42" or "ext 42" or "ext.42" (digits only).
                    // No free-form letters allowed anywhere outside the tightly scoped ext suffix.
                    validator: (v) =>
                        !v ||
                        /^\+?[\d\s\-()+.*#,]+(?:\s*(?:x|ext\.?)\s*\d{1,6})?$/i.test(
                            v,
                        ),
                    message: "contact.phone contains invalid characters",
                },
            },
            whatsapp: {
                type: String,
                trim: true,
                maxlength: 20,
                validate: {
                    // Digits, optional leading +. No query/path characters allowed.
                    // Blocks ?text=, /path, &param injection into wa.me/<value>
                    validator: (v) => !v || /^\+?[\d\s\-()+]{4,20}$/.test(v),
                    message:
                        "contact.whatsapp must be a phone number (digits, +, spaces, dashes, parens)",
                },
            },
            email: {
                type: String,
                trim: true,
                maxlength: 254,
                validate: {
                    // Rejects mailto-injection vectors: ?, &, <, >, whitespace in address.
                    // Allows user+tag@domain.com (+ NOT excluded).
                    validator: (v) =>
                        !v ||
                        /^[^\s@<>?&][^@<>?&]*@[^@<>?&]+\.[^@<>?&\s]+$/.test(v),
                    message:
                        "contact.email must be a valid email address without query parameters",
                },
            },
            website: {
                type: String,
                trim: true,
                maxlength: 2048,
                validate: {
                    validator: isValidContactUrl,
                    message:
                        "contact.website must be a valid http:// or https:// URL",
                },
            },

            // extended social/contact links (additive; backward compatible)
            twitter: {
                type: String,
                trim: true,
                maxlength: 2048,
                validate: {
                    validator: isValidContactUrl,
                    message:
                        "contact.twitter must be a valid http:// or https:// URL",
                },
            },
            tiktok: {
                type: String,
                trim: true,
                maxlength: 2048,
                validate: {
                    validator: isValidContactUrl,
                    message:
                        "contact.tiktok must be a valid http:// or https:// URL",
                },
            },
            waze: {
                type: String,
                trim: true,
                maxlength: 2048,
                validate: {
                    validator: isValidWazeOrHttpUrl,
                    message:
                        "contact.waze must be a valid http://, https://, or waze:// URL",
                },
            },

            // legacy fields (kept for backward compatibility)
            mobile: String,
            officePhone: String,
            fax: String,
            facebook: {
                type: String,
                trim: true,
                maxlength: 2048,
                validate: {
                    validator: isValidContactUrl,
                    message:
                        "contact.facebook must be a valid http:// or https:// URL",
                },
            },
            instagram: {
                type: String,
                trim: true,
                maxlength: 2048,
                validate: {
                    validator: isValidContactUrl,
                    message:
                        "contact.instagram must be a valid http:// or https:// URL",
                },
            },
            linkedin: {
                type: String,
                trim: true,
                maxlength: 2048,
                validate: {
                    validator: isValidContactUrl,
                    message:
                        "contact.linkedin must be a valid http:// or https:// URL",
                },
            },
            extraLines: [String],

            // Premium-only: up to 5 custom contact/action buttons.
            // navigation/waze/maps are intentionally excluded from the allowed types.
            // default: undefined preserves backward compatibility — existing documents
            // without this field remain valid and are unaffected by schema addition.
            customActions: {
                type: [CustomActionItemSchema],
                default: undefined,
                validate: {
                    validator: (arr) => {
                        if (arr === undefined || arr === null) return true;
                        if (!Array.isArray(arr)) return false;
                        return arr.length <= 5;
                    },
                    message:
                        "contact.customActions must contain at most 5 items",
                },
            },
        },

        content: {
            // required minimal fields
            title: {
                type: String,
                maxlength: [
                    200,
                    "content.title must not exceed 200 characters",
                ],
            },
            description: {
                type: String,
                maxlength: [
                    500,
                    "content.description must not exceed 500 characters",
                ],
            },

            // legacy fields (kept for backward compatibility)
            aboutTitle: {
                type: String,
                maxlength: [
                    300,
                    "content.aboutTitle must not exceed 300 characters",
                ],
            },
            aboutParagraphs: {
                type: [String],
                default: undefined,
                validate: [
                    {
                        validator: (arr) => {
                            if (arr === undefined || arr === null) return true;
                            if (!Array.isArray(arr)) return false;
                            return arr.length <= ABOUT_PARAGRAPHS_MAX;
                        },
                        message: `content.aboutParagraphs must contain at most ${ABOUT_PARAGRAPHS_MAX} items`,
                    },
                    {
                        validator: (arr) => {
                            if (!Array.isArray(arr)) return true;
                            return arr.every(
                                (item) =>
                                    typeof item !== "string" ||
                                    item.length <= ABOUT_PARAGRAPH_ITEM_MAX,
                            );
                        },
                        message: `Each item in content.aboutParagraphs must not exceed ${ABOUT_PARAGRAPH_ITEM_MAX} characters`,
                    },
                ],
            },
            aboutText: {
                type: String,
                maxlength: [
                    6500,
                    "content.aboutText must not exceed 6500 characters",
                ],
            },
            videoUrl: {
                type: String,
                validate: {
                    validator: isValidVideoUrl,
                    message:
                        "content.videoUrl must be a valid YouTube video URL",
                },
            },

            // Additive (V1): descriptive services list.
            services: { type: ServicesSchema, default: null },
        },

        // Additive (V1): operational business hours config (display-only).
        businessHours: { type: BusinessHoursSchema, default: null },

        // Additive: booking feature enablement (separate from businessHours).
        bookingSettings: {
            type: new mongoose.Schema(
                {
                    enabled: { type: Boolean, default: false },
                    horizonDays: {
                        type: Number,
                        default: null,
                        validate: {
                            validator: (v) =>
                                v == null ||
                                BOOKING_HORIZON_ALLOWED.includes(v),
                            message:
                                "horizonDays must be null or one of 7, 14, 30, 60",
                        },
                    },
                },
                { _id: false },
            ),
            default: null,
        },

        faq: { type: FaqSchema, default: null },

        seo: {
            title: {
                type: String,
                maxlength: [200, "seo.title must not exceed 200 characters"],
            },
            description: {
                type: String,
                maxlength: [
                    500,
                    "seo.description must not exceed 500 characters",
                ],
            },

            // Advanced SEO:
            canonicalUrl: {
                type: String,
                trim: true,
                default: null,
                validate: {
                    validator: (v) => {
                        if (!v) return true;
                        try {
                            // Allow only http/https absolute URLs (aligns with frontend isValidAbsoluteHttpUrl)
                            const u = new URL(v);
                            return (
                                u.protocol === "http:" ||
                                u.protocol === "https:"
                            );
                        } catch {
                            return false;
                        }
                    },
                    message:
                        "seo.canonicalUrl must be an absolute http:// or https:// URL",
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
                        const MAX_JSONLD_LENGTH = 5000;
                        if (v.length > MAX_JSONLD_LENGTH) return false;
                        try {
                            const parsed = JSON.parse(v);
                            if (
                                parsed === null ||
                                (typeof parsed !== "object" &&
                                    !Array.isArray(parsed))
                            )
                                return false;

                            const JSONLD_ALLOWED_TYPES = new Set([
                                "LocalBusiness",
                                "Organization",
                                "Person",
                                "Service",
                            ]);
                            const JSONLD_NESTED_BLOCKED_TYPES = new Set([
                                "Review",
                                "AggregateRating",
                                "Rating",
                            ]);
                            const MAX_NESTING_DEPTH = 10;

                            function isAllowedTypeValue(typeVal) {
                                if (typeof typeVal === "string")
                                    return JSONLD_ALLOWED_TYPES.has(typeVal);
                                if (Array.isArray(typeVal)) {
                                    if (typeVal.length === 0) return false;
                                    return typeVal.every(
                                        (t) =>
                                            typeof t === "string" &&
                                            JSONLD_ALLOWED_TYPES.has(t),
                                    );
                                }
                                return false;
                            }

                            function containsBlockedNestedType(val, depth) {
                                if (depth > MAX_NESTING_DEPTH) return true;
                                if (val === null || typeof val !== "object")
                                    return false;
                                if (Array.isArray(val)) {
                                    return val.some((item) =>
                                        containsBlockedNestedType(
                                            item,
                                            depth + 1,
                                        ),
                                    );
                                }
                                if ("@graph" in val) return true;
                                const typeVal = val["@type"];
                                if (typeVal !== undefined) {
                                    const types = Array.isArray(typeVal)
                                        ? typeVal
                                        : [typeVal];
                                    if (
                                        types.some(
                                            (t) =>
                                                typeof t === "string" &&
                                                JSONLD_NESTED_BLOCKED_TYPES.has(
                                                    t,
                                                ),
                                        )
                                    )
                                        return true;
                                }
                                return Object.values(val).some((child) =>
                                    containsBlockedNestedType(child, depth + 1),
                                );
                            }

                            function isValidJsonLdRootNode(node) {
                                if (
                                    !node ||
                                    typeof node !== "object" ||
                                    Array.isArray(node)
                                )
                                    return false;
                                if ("@graph" in node) return false;
                                if (!isAllowedTypeValue(node["@type"]))
                                    return false;
                                if (containsBlockedNestedType(node, 0))
                                    return false;
                                return true;
                            }

                            if (Array.isArray(parsed)) {
                                return parsed.every(
                                    (item) =>
                                        item !== null &&
                                        typeof item === "object" &&
                                        !Array.isArray(item) &&
                                        isValidJsonLdRootNode(item),
                                );
                            }
                            return isValidJsonLdRootNode(parsed);
                        } catch {
                            return false;
                        }
                    },
                    message:
                        "seo.jsonLd must be a valid JSON object or array up to 5000 characters with an allowed @type",
                },
            },

            // Analytics & pixels (white-list):
            gtmId: {
                type: String,
                trim: true,
                default: null,
                uppercase: true,
                validate: {
                    validator: (v) =>
                        !v ||
                        (/^GTM-[A-Z0-9]+$/.test(v) && v !== "GTM-W6Q8DP6R"),
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
                    validator: (v) =>
                        !v ||
                        (/^[0-9]{5,20}$/.test(v) && v !== "1901625820558020"),
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

            // Self theme (token-levers v1)
            // Optional, backward compatible. Values are sanitized at read/generation time.
            selfThemeV1: {
                bg: {
                    type: String,
                    trim: true,
                    default: null,
                    validate: {
                        validator: isValidSelfThemeHexColor,
                        message: "Invalid hex color value",
                    },
                },
                text: {
                    type: String,
                    trim: true,
                    default: null,
                    validate: {
                        validator: isValidSelfThemeHexColor,
                        message: "Invalid hex color value",
                    },
                },
                primary: {
                    type: String,
                    trim: true,
                    default: null,
                    validate: {
                        validator: isValidSelfThemeHexColor,
                        message: "Invalid hex color value",
                    },
                },
                secondary: {
                    type: String,
                    trim: true,
                    default: null,
                    validate: {
                        validator: isValidSelfThemeHexColor,
                        message: "Invalid hex color value",
                    },
                },
                onPrimary: {
                    type: String,
                    trim: true,
                    default: null,
                    validate: {
                        validator: isValidSelfThemeHexColor,
                        message: "Invalid hex color value",
                    },
                },
                version: { type: Number, default: 1 },
            },

            // Provenance: which regular template this custom design was created from.
            // Set when shouldForceSelfThemeTemplate fires and source was a non-selfTheme template.
            // Cleared when card returns to a regular template. Non-indexed, nullable.
            selfThemeBaseTemplateId: {
                type: String,
                default: null,
                trim: true,
            },

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

            // optional custom alt text for public image accessibility/SEO.
            // Sanitized on write in card.controller.js (sanitizeCardImageAlt).
            backgroundImageAlt: {
                type: String,
                trim: true,
                default: "",
                maxlength: CARD_IMAGE_ALT_MAX,
            },
            avatarImageAlt: {
                type: String,
                trim: true,
                default: "",
                maxlength: CARD_IMAGE_ALT_MAX,
            },
        },

        // Tracks all uploaded objects (useful for deletion/cleanup even if client only stores URL fields).
        uploads: { type: [UploadItemSchema], default: [] },

        flags: {
            isTemplateSeeded: { type: Boolean, default: false },
            seededMap: { type: mongoose.Schema.Types.Mixed, default: {} },
        },

        isActive: { type: Boolean, default: true },

        // Anonymous consent evidence (additive, null-safe).
        // Persisted only for anonymous card creation after explicit consent.
        anonConsentAcceptedAt: { type: Date, default: null },
        anonTermsVersion: { type: String, default: null, trim: true },
        anonPrivacyVersion: { type: String, default: null, trim: true },
    },
    { timestamps: true, runSettersOnQuery: true },
);

// Indexes (enterprise migration):
// - Keep a non-unique slug index for existing query patterns.
// - Enforce uniqueness on (orgId, slug) once orgId is backfilled.
// - Keep legacy uniqueness on (tenantKey, slug) for now (backward compat).
CardSchema.index({ user: 1 }, { name: "user_1", sparse: true });
CardSchema.index({ slug: 1 }, { name: "slug_1" });
// Enterprise bounded policy: one card per (orgId, user).
// - Applies to all org-scoped cards (including PERSONAL_ORG).
// - Does NOT apply to anonymous cards (user missing) or legacy docs where orgId is null/missing.
CardSchema.index(
    { orgId: 1, user: 1 },
    {
        unique: true,
        name: "orgId_1_user_1",
        partialFilterExpression: {
            orgId: { $type: "objectId" },
            user: { $type: "objectId" },
        },
    },
);
CardSchema.index(
    { orgId: 1, slug: 1 },
    {
        unique: true,
        name: "orgId_1_slug_1",
        partialFilterExpression: {
            orgId: { $type: "objectId" },
            slug: { $type: "string" },
        },
    },
);
CardSchema.index(
    { tenantKey: 1, slug: 1 },
    {
        unique: true,
        name: "tenantKey_1_slug_1",
        partialFilterExpression: {
            // MongoDB partial indexes do not support `$exists: false` on this cluster.
            // `orgId: null` matches BOTH null and missing fields.
            orgId: null,
            tenantKey: { $type: "string" },
            slug: { $type: "string" },
        },
    },
);

// Model intentionally contains no product logic/middleware.
// Trial start/expiry and ownership flows are handled outside the schema (e.g., controller/service).

export default mongoose.model("Card", CardSchema);
