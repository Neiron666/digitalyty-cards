/**
 * Narrow public projection helpers for the future deterministic public card
 * renderer (/og/card/:slug and /og/c/:orgSlug/:slug).
 *
 * Phase 2B1 — contract only. NO route wiring, NO HTML emission.
 *
 * Input contract:
 *   These helpers accept ONLY the public DTO shape produced by:
 *     toCardDTO(card, now, { includePrivate: false })
 *   They MUST NOT receive raw Mongoose Card documents and MUST NOT
 *   reimplement the safety gates of toCardDTO. They are a second-stage
 *   narrowing on top of an already-public DTO.
 *
 * Security:
 *   - Defense-in-depth: throw TypeError if the input still carries any
 *     includePrivate-only or nested-private field.
 *   - Canonical/og URLs are derived ONLY from ctx.publicUrl. The helper
 *     ignores any user-editable dto.seo.canonicalUrl.
 *   - ctx.publicUrl must be absolute https on the same host as ctx.siteUrl.
 *
 * Purity:
 *   - No DB calls, no network, no env reads, no Date / new Date / Date.now,
 *     no Express req/res, no React imports, no Vite imports.
 *   - Input is never mutated.
 */

import { robotsContainsNoindex } from "./seoIndexability.js";
import {
    buildCardFaqJsonLd,
    getCardFaqJsonLdId,
} from "./cardFaqJsonLd.util.js";

// TEMP MIRROR of og.routes.js DEFAULT_OG_IMAGE_SUFFIX.
// Must be consolidated when og.routes.js is wired to this projection
// (Phase 2B3). Keep in sync manually until then.
const DEFAULT_OG_IMAGE_SUFFIX =
    "/images/og/cardigo-home-og-1200x630.jpg?v=20260519";

const TITLE_MAX = 65;
const DESCRIPTION_MAX = 160;
const OG_IMAGE_ALT_MAX = 120;

const GENERIC_CARD_OG_TITLES = new Set([
    "כרטיס ביקור דיגיטלי",
    "כרטיס ביקור דיגיטלי – Cardigo",
    "כרטיס ביקור דיגיטלי | Cardigo",
    "Cardigo",
]);

// Forbidden top-level keys: their presence means the caller passed a
// non-public (includePrivate=true) DTO, an admin DTO, or a raw model doc.
const FORBIDDEN_TOP_LEVEL_KEYS = Object.freeze([
    "billing",
    "adminOverride",
    "uploads",
    "anonymousId",
    "adminTier",
    "adminTierUntil",
    "adminTierByAdmin",
    "adminTierReason",
    "adminTierCreatedAt",
    "ownerAdminTier",
    "ownerAdminTierUntil",
    "trialDeleteAt",
    "plan",
    // Payment / provider surface — must never appear in a public DTO.
    "tranzila",
    "yeshinvoice",
    "receipt",
    "receipts",
    "providerTransactionId",
    "providerRefundId",
    "providerCustomerId",
    "paymentMethod",
    "paymentToken",
    "apiToken",
    "secret",
    // Computed billing/tier residue: present in default toCardDTO output but
    // must never appear in a public OG/SSR projection DTO. Added in
    // SSR_P2_OG_DTO_SERIALIZATION_GUARD so assertPublicDto structurally
    // rejects any DTO that still carries these fields.
    "effectiveBilling",
    "effectiveTier",
    "tierSource",
    "tierUntil",
]);

/* ── pure text helpers ─────────────────────────────────────────── */

function isPlainObject(v) {
    return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function stripHtmlTags(s) {
    // Defensive only — input is expected to be plain text. We do not emit
    // HTML; this just removes obvious tag-like sequences if accidentally
    // present so SEO meta values do not carry markup.
    return String(s).replace(/<\/?[^>]+>/g, "");
}

function collapseWhitespace(s) {
    return String(s).replace(/\s+/g, " ").trim();
}

function safeText(value) {
    if (value === null || value === undefined) return "";
    if (typeof value !== "string") return "";
    return collapseWhitespace(stripHtmlTags(value));
}

function clip(s, max) {
    const t = safeText(s);
    if (!max || t.length <= max) return t;
    return t.slice(0, max);
}

/* ── input/ctx validation ──────────────────────────────────────── */

function assertPublicDto(dto) {
    if (!isPlainObject(dto)) {
        throw new TypeError(
            "cardPublicProjection: input dto must be a plain object",
        );
    }
    for (const key of FORBIDDEN_TOP_LEVEL_KEYS) {
        if (Object.prototype.hasOwnProperty.call(dto, key)) {
            throw new TypeError(
                `cardPublicProjection: forbidden private field "${key}" present in input dto — caller must pass the public DTO from toCardDTO(card, now, { includePrivate: false })`,
            );
        }
    }
    // user must not be present as a populated object; null is acceptable
    // since toCardDTO sometimes sets dto.user = null only under includePrivate,
    // but a public DTO should not carry the key at all. Tolerate explicit null.
    if (
        Object.prototype.hasOwnProperty.call(dto, "user") &&
        dto.user !== null &&
        dto.user !== undefined
    ) {
        throw new TypeError(
            'cardPublicProjection: forbidden private field "user" populated in input dto',
        );
    }
    // Nested dormant private slot: seo.headSnippets must be stripped by
    // toCardDTO. If it survived, refuse — the DTO is not the public shape.
    if (
        isPlainObject(dto.seo) &&
        Object.prototype.hasOwnProperty.call(dto.seo, "headSnippets")
    ) {
        throw new TypeError(
            'cardPublicProjection: forbidden nested field "seo.headSnippets" present in input dto',
        );
    }
}

function assertCtx(ctx) {
    if (!isPlainObject(ctx)) {
        throw new TypeError("cardPublicProjection: ctx must be a plain object");
    }
    const siteUrl = typeof ctx.siteUrl === "string" ? ctx.siteUrl.trim() : "";
    const publicUrl =
        typeof ctx.publicUrl === "string" ? ctx.publicUrl.trim() : "";
    if (!siteUrl || !publicUrl) {
        throw new TypeError(
            "cardPublicProjection: ctx.siteUrl and ctx.publicUrl are required absolute https URLs",
        );
    }
    let siteHost;
    try {
        const u = new URL(siteUrl);
        if (u.protocol !== "https:") {
            throw new TypeError(
                "cardPublicProjection: ctx.siteUrl must use https",
            );
        }
        siteHost = u.host;
    } catch (e) {
        if (e instanceof TypeError) throw e;
        throw new TypeError(
            "cardPublicProjection: ctx.siteUrl is not a valid absolute URL",
        );
    }
    try {
        const u = new URL(publicUrl);
        if (u.protocol !== "https:") {
            throw new TypeError(
                "cardPublicProjection: ctx.publicUrl must use https",
            );
        }
        if (u.host !== siteHost) {
            throw new TypeError(
                "cardPublicProjection: ctx.publicUrl host must equal ctx.siteUrl host",
            );
        }
    } catch (e) {
        if (e instanceof TypeError) throw e;
        throw new TypeError(
            "cardPublicProjection: ctx.publicUrl is not a valid absolute URL",
        );
    }
    return { siteUrl, publicUrl };
}

/* ── SEO derivation ────────────────────────────────────────────── */

function isGenericTitle(value) {
    return GENERIC_CARD_OG_TITLES.has(safeText(value));
}

function deriveDisplayName(dto) {
    const b = isPlainObject(dto.business) ? dto.business : {};
    return (
        safeText(b.name) ||
        safeText(b.businessName) ||
        safeText(b.ownerName) ||
        ""
    );
}

function deriveTitle(dto) {
    const seoTitle = safeText(dto.seo?.title);
    const displayName = deriveDisplayName(dto);
    if (seoTitle && !isGenericTitle(seoTitle)) {
        return clip(seoTitle, TITLE_MAX);
    }
    if (displayName) {
        return clip(displayName + " – כרטיס ביקור דיגיטלי", TITLE_MAX);
    }
    return clip("כרטיס ביקור דיגיטלי", TITLE_MAX);
}

function deriveDescription(dto) {
    const content = isPlainObject(dto.content) ? dto.content : {};
    const candidates = [
        dto.seo?.description,
        content.description,
        content.aboutText,
    ];
    for (const c of candidates) {
        const t = clip(c, DESCRIPTION_MAX);
        if (t) return t;
    }
    return clip("כרטיס ביקור דיגיטלי לעסקים – Cardigo", DESCRIPTION_MAX);
}

function deriveOgImage(dto, siteUrl) {
    const design = isPlainObject(dto.design) ? dto.design : {};
    const candidates = [design.coverImage, design.logo, design.avatarImage];
    for (const c of candidates) {
        if (typeof c === "string" && c.trim()) {
            // Pass through as-is; toCardDTO already produced a public-safe value.
            return { image: c.trim(), isFallback: false };
        }
    }
    return { image: siteUrl + DEFAULT_OG_IMAGE_SUFFIX, isFallback: true };
}

/* Remove Cardigo / כרדיגו platform suffix or prefix from an alt string.
   Only strips exact boundary patterns; internal occurrences are preserved. */
function cleanPlatformBrandFromAlt(value) {
    if (!value) return "";
    let s = String(value).replace(/\s+/g, " ").trim();
    // Trailing suffix variants: " – Cardigo", " - Cardigo", " | Cardigo" and כרדיגו equivalents
    s = s.replace(/\s+[-–]\s*(?:Cardigo|כרדיגו)\s*$/i, "").trim();
    s = s.replace(/\s*\|\s*(?:Cardigo|כרדיגו)\s*$/i, "").trim();
    // Leading prefix variants: "Cardigo – ", "Cardigo - " and כרדיגו equivalents
    s = s.replace(/^(?:Cardigo|כרדיגו)\s*[-–]\s*/i, "").trim();
    return s;
}

/* Returns true when the candidate is too generic to use as imageAlt:
   either a known generic page title or the compound fallback "X – כרטיס ביקור דיגיטלי". */
function isGenericAltCandidate(value) {
    if (!value) return true;
    if (GENERIC_CARD_OG_TITLES.has(value)) return true;
    // Reject the derived compound fallback produced by deriveTitle when seo.title is absent
    if (/\s[-–]\s*כרטיס ביקור דיגיטלי$/.test(value)) return true;
    return false;
}

function deriveOgImageAlt(dto) {
    // Prefer the resolved card title (same value used for <title>/og:title/twitter:title),
    // cleaned of any platform brand suffix or prefix. Fall back to display name only,
    // never appending Cardigo as a platform marker.
    const title = cleanPlatformBrandFromAlt(deriveTitle(dto));
    if (title && !isGenericAltCandidate(title)) {
        return clip(title, OG_IMAGE_ALT_MAX);
    }
    const displayName = cleanPlatformBrandFromAlt(deriveDisplayName(dto));
    if (displayName) return clip(displayName, OG_IMAGE_ALT_MAX);
    return "כרטיס ביקור דיגיטלי";
}

function deriveRobots(dto) {
    const raw = typeof dto.seo?.robots === "string" ? dto.seo.robots : "";
    const trimmed = collapseWhitespace(raw).toLowerCase();
    if (!trimmed) return "index, follow";
    // Pass through known-safe directives only.
    if (robotsContainsNoindex(raw)) {
        return trimmed.includes("nofollow")
            ? "noindex, nofollow"
            : "noindex, follow";
    }
    if (trimmed === "index" || trimmed === "index, follow") {
        return "index, follow";
    }
    // Unknown/unsafe shape — default to safe indexable.
    return "index, follow";
}

/* ── JSON-LD normalization ─────────────────────────────────────── */

function containsScriptToken(s) {
    if (typeof s !== "string") return false;
    const lower = s.toLowerCase();
    return lower.includes("<script") || lower.includes("</script");
}

function deepStringContainsScript(value) {
    if (typeof value === "string") return containsScriptToken(value);
    if (Array.isArray(value)) {
        for (const v of value) if (deepStringContainsScript(v)) return true;
        return false;
    }
    if (isPlainObject(value)) {
        for (const k of Object.keys(value)) {
            if (containsScriptToken(k)) return true;
            if (deepStringContainsScript(value[k])) return true;
        }
        return false;
    }
    return false;
}

function isAcceptableJsonLdItem(item) {
    if (!isPlainObject(item)) return false;
    // Block @graph at the top of any item — flatten policy.
    if (Object.prototype.hasOwnProperty.call(item, "@graph")) return false;
    if (deepStringContainsScript(item)) return false;
    return true;
}

function normalizeJsonLd(rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
        return [];
    }
    let parsed = rawValue;
    if (typeof rawValue === "string") {
        // Block raw script tokens before parsing.
        if (containsScriptToken(rawValue)) return [];
        try {
            parsed = JSON.parse(rawValue);
        } catch {
            return [];
        }
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items.filter(isAcceptableJsonLdItem);
}

/* ── render-DTO narrowing ──────────────────────────────────────── */

function narrowGalleryItem(item) {
    if (!isPlainObject(item)) return null;
    const out = {};
    // Accept only public-safe URL-like keys; raw storage paths are dropped.
    if (typeof item.url === "string" && item.url.trim()) {
        out.url = item.url.trim();
    } else if (typeof item.src === "string" && item.src.trim()) {
        out.url = item.src.trim();
    } else {
        return null;
    }
    if (typeof item.alt === "string") out.alt = safeText(item.alt);
    if (Number.isFinite(item.width)) out.width = item.width;
    if (Number.isFinite(item.height)) out.height = item.height;
    return out;
}

function narrowServiceItem(item) {
    if (!isPlainObject(item)) return null;
    const out = {};
    const title = safeText(item.title) || safeText(item.name);
    if (!title) return null;
    out.title = clip(title, 120);
    const description = safeText(item.description);
    if (description) out.description = clip(description, 400);
    return out;
}

function narrowFaqItem(item) {
    if (!isPlainObject(item)) return null;
    const question = safeText(item.question);
    const answer = safeText(item.answer);
    if (!question || !answer) return null;
    return { question: clip(question, 200), answer: clip(answer, 1000) };
}

// Adapts on-disk public FAQ shape { faq: { items: [{q,a}] } } (also tolerant
// of a raw array or pre-narrowed { question, answer } items) into the
// { question, answer } contract narrowFaqItem enforces. Single SSoT used by
// both SEO and Render DTOs to prevent shape drift.
function extractPublicFaqItems(dto) {
    const faq = dto ? dto.faq : null;
    let rawItems;
    if (Array.isArray(faq)) {
        rawItems = faq;
    } else if (isPlainObject(faq) && Array.isArray(faq.items)) {
        rawItems = faq.items;
    } else {
        return [];
    }
    return rawItems
        .map((it) => {
            if (!isPlainObject(it)) return null;
            const question =
                typeof it.question === "string" ? it.question : it.q;
            const answer = typeof it.answer === "string" ? it.answer : it.a;
            return { question, answer };
        })
        .map(narrowFaqItem)
        .filter((f) => f !== null);
}

function narrowContactLinks(dto) {
    const c = isPlainObject(dto.contact) ? dto.contact : {};
    const out = {};
    const passthrough = ["phone", "whatsapp", "email", "website"];
    for (const k of passthrough) {
        if (typeof c[k] === "string" && c[k].trim()) {
            out[k] = c[k].trim();
        }
    }
    return out;
}

function narrowSocialLinks(dto) {
    const c = isPlainObject(dto.contact) ? dto.contact : {};
    const out = {};
    const social = ["instagram", "facebook", "tiktok", "youtube", "linkedin"];
    for (const k of social) {
        if (typeof c[k] === "string" && c[k].trim()) {
            out[k] = c[k].trim();
        }
    }
    return out;
}

const BUSINESS_HOURS_DAY_KEYS = Object.freeze([
    "sun",
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
]);

// Validates "HH:mm" with minutes pinned to :00 or :30 — mirrors the model
// validator at backend/src/models/Card.model.js (BusinessHoursIntervalSchema).
// Anything else is dropped from the public projection.
function isSafeTimeOfDay(v) {
    return typeof v === "string" && /^([01]\d|2[0-3]):(00|30)$/.test(v);
}

function narrowBusinessHoursInterval(item) {
    if (!isPlainObject(item)) return null;
    const start = isSafeTimeOfDay(item.start) ? item.start : "";
    const end = isSafeTimeOfDay(item.end) ? item.end : "";
    if (!start || !end) return null;
    return { start, end };
}

function narrowBusinessHoursDay(day) {
    if (!isPlainObject(day)) return { open: false, intervals: [] };
    const open = day.open === true;
    const rawIntervals = Array.isArray(day.intervals) ? day.intervals : [];
    // Cap at 4 intervals — mirrors BusinessHoursDaySchema validator.
    const intervals = rawIntervals
        .slice(0, 4)
        .map(narrowBusinessHoursInterval)
        .filter((i) => i !== null);
    return { open, intervals };
}

// Non-premium privacy guard: strip location-specific fields from a parsed
// JSON-LD item object so free/downgraded cards cannot expose
// address.streetAddress, geo, latitude, or longitude in OG HTML.
// Does not mutate the input object. Non-LocalBusiness items pass through.
function sanitizeLocationFieldsForNonPremiumJsonLdItem(item) {
    if (!isPlainObject(item)) return item;
    const t = item["@type"];
    const isLocalBusiness =
        t === "LocalBusiness" ||
        (Array.isArray(t) && t.includes("LocalBusiness"));
    if (!isLocalBusiness) return item;

    const {
        geo: _geo,
        latitude: _lat,
        longitude: _lng,
        address: rawAddress,
        ...rest
    } = item;
    const result = { ...rest };

    if (
        rawAddress &&
        typeof rawAddress === "object" &&
        !Array.isArray(rawAddress)
    ) {
        const { streetAddress: _sa, ...addressRest } = rawAddress;
        if (Object.keys(addressRest).length > 0) {
            result.address = addressRest;
        }
    }

    return result;
}

function narrowBusinessHours(dto) {
    // toCardDTO sets businessHours = null when entitlement absent.
    const bh = dto.businessHours;
    if (bh === null || bh === undefined) return null;
    if (!isPlainObject(bh)) return null;

    // Strict allowlist projection. ANY key not listed here is dropped,
    // including internal ids, owner ids, admin fields, timestamps, raw
    // provider/storage/payment fields, unexpected nested objects, and
    // functions. Defense-in-depth in case a future model adds fields.
    const week = isPlainObject(bh.week) ? bh.week : {};
    const projectedWeek = {};
    for (const dayKey of BUSINESS_HOURS_DAY_KEYS) {
        projectedWeek[dayKey] = narrowBusinessHoursDay(week[dayKey]);
    }
    return {
        enabled: bh.enabled === true,
        week: projectedWeek,
    };
}

/* ── public exports ────────────────────────────────────────────── */

export function toCardPublicSeoDTO(dto, ctx) {
    assertPublicDto(dto);
    const { siteUrl, publicUrl } = assertCtx(ctx);

    const title = deriveTitle(dto);
    const description = deriveDescription(dto);
    const { image, isFallback } = deriveOgImage(dto, siteUrl);
    const ogImageAlt = deriveOgImageAlt(dto);
    const robotsResolved = deriveRobots(dto);
    const indexable = !robotsContainsNoindex(robotsResolved);

    const seoBlock = isPlainObject(dto.seo) ? dto.seo : {};
    const rawUserJsonLdItems = normalizeJsonLd(seoBlock.jsonLd);
    const canUseServices = dto?.entitlements?.canUseServices === true;
    const userJsonLdItems = canUseServices
        ? rawUserJsonLdItems
        : rawUserJsonLdItems.map(sanitizeLocationFieldsForNonPremiumJsonLdItem);

    // Phase 2A: auto-build FAQPage JSON-LD from already-public FAQ items.
    // Canonical is the backend self-public URL (publicUrl); user-editable
    // seo.canonicalUrl is never used. Owner-provided JSON-LD with the same
    // FAQPage @id (${publicUrl}#faq) is suppressed so the auto item wins.
    const publicFaqItems = extractPublicFaqItems(dto);
    const autoFaqJsonLd = buildCardFaqJsonLd(publicFaqItems, publicUrl);
    const autoFaqId = getCardFaqJsonLdId(publicUrl);
    const filteredUserItems = autoFaqJsonLd
        ? userJsonLdItems.filter(
              (it) =>
                  !(
                      isPlainObject(it) &&
                      it["@type"] === "FAQPage" &&
                      typeof it["@id"] === "string" &&
                      it["@id"] === autoFaqId
                  ),
          )
        : userJsonLdItems;
    const jsonLdItems = autoFaqJsonLd
        ? [autoFaqJsonLd, ...filteredUserItems]
        : filteredUserItems;

    return {
        canonicalUrl: publicUrl,
        ogUrl: publicUrl,
        title,
        description,
        robotsResolved,
        indexable,
        ogImage: image,
        ogImageAlt,
        // Phase 2B1: use "website" by default for cards. "profile" is reserved
        // for og.routes.js future decision after schema mapping policy lands
        // in Phase 2B2/2B3; using "website" avoids semantic drift now.
        ogType: "website",
        twitterCard: isFallback ? "summary" : "summary_large_image",
        jsonLdItems,
    };
}

export function toCardPublicRenderDTO(dto, ctx) {
    assertPublicDto(dto);
    assertCtx(ctx);

    const business = isPlainObject(dto.business) ? dto.business : {};
    const content = isPlainObject(dto.content) ? dto.content : {};

    const displayName = deriveDisplayName(dto);
    const subtitle = safeText(business.category);
    const slogan = safeText(business.slogan);

    const aboutParagraphs = Array.isArray(content.aboutParagraphs)
        ? content.aboutParagraphs
              .map((p) => safeText(p))
              .filter((p) => p.length > 0)
        : [];
    const aboutText = aboutParagraphs.join("\n\n");

    const rawServices = Array.isArray(content.services) ? content.services : [];
    const services = rawServices
        .map(narrowServiceItem)
        .filter((s) => s !== null);

    const faqItems = extractPublicFaqItems(dto);

    const rawGallery = Array.isArray(dto.gallery) ? dto.gallery : [];
    const gallery = rawGallery.map(narrowGalleryItem).filter((g) => g !== null);

    return {
        displayName,
        subtitle,
        slogan,
        aboutText,
        aboutParagraphs,
        contactLinks: narrowContactLinks(dto),
        services,
        faqItems,
        businessHours: narrowBusinessHours(dto),
        gallery,
        socialLinks: narrowSocialLinks(dto),
    };
}
