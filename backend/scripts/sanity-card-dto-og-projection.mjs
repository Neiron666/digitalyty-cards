/**
 * Fixture-only sanity for SSR_P2_OG_DTO_SERIALIZATION_GUARD.
 *
 * Proves that:
 * 1. OG-style toCardDTO with both flags (stripBillingDetails+publicEntitlementsOnly)
 *    removes billing residue fields effectiveBilling/effectiveTier/tierSource/tierUntil.
 * 2. assertPublicDto (via toCardPublicSeoDTO / toCardPublicRenderDTO) now
 *    structurally rejects any DTO that carries those four computed residue keys.
 * 3. Both projection helpers return the correct narrow output shapes.
 * 4. JSON-LD location sanitization behaves correctly for free vs paid cards.
 * 5. renderCardOgHtml output is HTML-only and contains no private DTO fields
 *    or hydration payloads.
 *
 * No DB, no Express, no network, no env. Direct in-process assertions on
 * synthetic fixtures. Exits 0 on all pass, non-zero on first failure.
 *
 * Run: node backend/scripts/sanity-card-dto-og-projection.mjs
 */

import { toCardDTO } from "../src/utils/cardDTO.js";
import {
    toCardPublicSeoDTO,
    toCardPublicRenderDTO,
} from "../src/utils/cardPublicProjection.util.js";
import { renderCardOgHtml } from "../src/services/cardOgHtml.service.js";

const NOW = new Date("2025-06-01T12:00:00.000Z");
const SITE_URL = "https://cardigo.co.il";
const PUBLIC_URL_PERSONAL = "https://cardigo.co.il/card/og-sanity";
const PUBLIC_URL_ORG = "https://cardigo.co.il/c/sanity-org/og-sanity";

// ── helpers ──────────────────────────────────────────────────────────────────

let total = 0;
let failed = 0;

function assert(label, condition) {
    total += 1;
    if (condition) {
        console.log(`PASS  ${label}`);
    } else {
        console.error(`FAIL  ${label}`);
        failed += 1;
        process.exitCode = 1;
    }
}

function assertExactKeys(label, obj, expectedKeys) {
    const actual = Object.keys(obj || {}).sort();
    const expected = [...expectedKeys].sort();
    assert(`${label}: exact key count`, actual.length === expected.length);
    assert(
        `${label}: exact keys`,
        JSON.stringify(actual) === JSON.stringify(expected),
    );
}

function assertThrows(label, fn) {
    total += 1;
    try {
        fn();
        console.error(`FAIL  ${label}: expected TypeError but did not throw`);
        failed += 1;
        process.exitCode = 1;
    } catch (e) {
        if (e instanceof TypeError) {
            console.log(`PASS  ${label}`);
        } else {
            console.error(
                `FAIL  ${label}: threw unexpected error type — ${e.message}`,
            );
            failed += 1;
            process.exitCode = 1;
        }
    }
}

// ── expected output shapes ────────────────────────────────────────────────────

const SEO_KEYS = Object.freeze([
    "canonicalUrl",
    "description",
    "indexable",
    "jsonLdItems",
    "ogImage",
    "ogImageAlt",
    "ogType",
    "ogUrl",
    "robotsResolved",
    "title",
    "twitterCard",
]);

const RENDER_KEYS = Object.freeze([
    "aboutParagraphs",
    "aboutText",
    "businessHours",
    "contactLinks",
    "displayName",
    "faqItems",
    "gallery",
    "services",
    "slogan",
    "socialLinks",
    "subtitle",
]);

const PUBLIC_ENTITLEMENT_KEYS = Object.freeze([
    "canUseBooking",
    "canUseBusinessHours",
    "canUseLeads",
    "canUseServices",
    "canUseVideo",
    "maxContentParagraphs",
]);

// ── fixtures ──────────────────────────────────────────────────────────────────

function makePaidCard() {
    return {
        _id: "aaa000000000000000000001",
        slug: "og-sanity",
        status: "published",
        isActive: true,
        user: "bbb000000000000000000001",
        billing: {
            status: "active",
            plan: "monthly",
            paidUntil: new Date("2030-12-31T23:59:59.000Z"),
        },
        business: { name: "Test Business OG", category: "Technology" },
        contact: {},
        content: {},
        design: {},
        gallery: [],
        reviews: [],
        faq: null,
        seo: {},
        flags: {},
    };
}

function makeFreeCard() {
    return {
        _id: "aaa000000000000000000002",
        slug: "og-sanity-free",
        status: "published",
        isActive: true,
        user: "bbb000000000000000000002",
        billing: { status: "free", plan: "free", paidUntil: null },
        business: { name: "Free Business OG" },
        contact: {},
        content: {},
        design: {},
        gallery: [],
        reviews: [],
        faq: null,
        seo: {},
        flags: {},
    };
}

function makeOrgCard() {
    return {
        _id: "aaa000000000000000000003",
        slug: "og-sanity",
        status: "published",
        isActive: true,
        user: "bbb000000000000000000003",
        orgId: "ccc000000000000000000001",
        billing: { status: "free", plan: "free", paidUntil: null },
        business: { name: "Org Business OG" },
        contact: {},
        content: {},
        design: {},
        gallery: [],
        reviews: [],
        faq: null,
        seo: {},
        flags: {},
    };
}

function makePremiumOrg() {
    return {
        _id: "ccc000000000000000000001",
        isActive: true,
        slug: "sanity-org",
        orgEntitlement: {
            status: "active",
            expiresAt: new Date("2030-12-31T23:59:59.000Z"),
            startsAt: new Date("2020-01-01T00:00:00.000Z"),
        },
    };
}

// ── Suite 1: Personal OG DTO — both flags strip billing residue ───────────────

console.log(
    "\n── Suite 1: Personal OG DTO — billing residue stripped ──────────────────",
);
{
    const dto = toCardDTO(makePaidCard(), NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });

    assert(
        "S1: effectiveBilling absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveBilling"),
    );
    assert(
        "S1: effectiveTier absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveTier"),
    );
    assert(
        "S1: tierSource absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierSource"),
    );
    assert(
        "S1: tierUntil absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierUntil"),
    );
    assert(
        "S1: entitlements present",
        dto.entitlements !== null && typeof dto.entitlements === "object",
    );
    assertExactKeys(
        "S1: entitlements shape",
        dto.entitlements,
        PUBLIC_ENTITLEMENT_KEYS,
    );
    assert(
        "S1: canUseServices is boolean",
        typeof dto.entitlements.canUseServices === "boolean",
    );
    assert(
        "S1: paid card → canUseServices true",
        dto.entitlements.canUseServices === true,
    );
    // Private entitlement keys must be absent after publicEntitlementsOnly
    assert(
        "S1: canEdit absent",
        !Object.prototype.hasOwnProperty.call(dto.entitlements, "canEdit"),
    );
    assert(
        "S1: analyticsLevel absent",
        !Object.prototype.hasOwnProperty.call(
            dto.entitlements,
            "analyticsLevel",
        ),
    );
    assert(
        "S1: lockedReason absent",
        !Object.prototype.hasOwnProperty.call(dto.entitlements, "lockedReason"),
    );
    assert(
        "S1: galleryLimit absent",
        !Object.prototype.hasOwnProperty.call(dto.entitlements, "galleryLimit"),
    );
    assert(
        "S1: canUploadGallery absent",
        !Object.prototype.hasOwnProperty.call(
            dto.entitlements,
            "canUploadGallery",
        ),
    );
    assert(
        "S1: canUseAnalyticsPremium absent",
        !Object.prototype.hasOwnProperty.call(
            dto.entitlements,
            "canUseAnalyticsPremium",
        ),
    );
}

// ── Suite 2: Org OG DTO — both flags + org context ───────────────────────────

console.log(
    "\n── Suite 2: Org OG DTO — org context + both flags ───────────────────────",
);
{
    const org = makePremiumOrg();
    const dto = toCardDTO(makeOrgCard(), NOW, {
        includePrivate: false,
        org,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });

    assert(
        "S2: effectiveBilling absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveBilling"),
    );
    assert(
        "S2: effectiveTier absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveTier"),
    );
    assert(
        "S2: tierSource absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierSource"),
    );
    assert(
        "S2: tierUntil absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierUntil"),
    );
    assertExactKeys(
        "S2: entitlements shape",
        dto.entitlements,
        PUBLIC_ENTITLEMENT_KEYS,
    );
    assert(
        "S2: org premium → canUseServices true",
        dto.entitlements.canUseServices === true,
    );
    assert(
        "S2: canEdit absent (org context, publicEntitlementsOnly)",
        !Object.prototype.hasOwnProperty.call(dto.entitlements, "canEdit"),
    );
}

// ── Suite 3: assertPublicDto guard rejects billing residue keys ───────────────

console.log(
    "\n── Suite 3: assertPublicDto guard rejects billing residue ───────────────",
);
{
    const validDto = toCardDTO(makePaidCard(), NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const CTX = { siteUrl: SITE_URL, publicUrl: PUBLIC_URL_PERSONAL };

    assertThrows("S3: toCardPublicSeoDTO throws on effectiveBilling", () =>
        toCardPublicSeoDTO(
            { ...validDto, effectiveBilling: { source: "test" } },
            CTX,
        ),
    );
    assertThrows("S3: toCardPublicSeoDTO throws on effectiveTier", () =>
        toCardPublicSeoDTO(
            { ...validDto, effectiveTier: { tier: "premium" } },
            CTX,
        ),
    );
    assertThrows("S3: toCardPublicSeoDTO throws on tierSource", () =>
        toCardPublicSeoDTO({ ...validDto, tierSource: "billing" }, CTX),
    );
    assertThrows("S3: toCardPublicSeoDTO throws on tierUntil", () =>
        toCardPublicSeoDTO({ ...validDto, tierUntil: "2030-01-01" }, CTX),
    );
    assertThrows("S3: toCardPublicRenderDTO throws on effectiveBilling", () =>
        toCardPublicRenderDTO(
            { ...validDto, effectiveBilling: { source: "test" } },
            CTX,
        ),
    );
    assertThrows("S3: toCardPublicRenderDTO throws on effectiveTier", () =>
        toCardPublicRenderDTO(
            { ...validDto, effectiveTier: { tier: "premium" } },
            CTX,
        ),
    );
    assertThrows("S3: toCardPublicRenderDTO throws on tierSource", () =>
        toCardPublicRenderDTO({ ...validDto, tierSource: "billing" }, CTX),
    );
    assertThrows("S3: toCardPublicRenderDTO throws on tierUntil", () =>
        toCardPublicRenderDTO({ ...validDto, tierUntil: "2030-01-01" }, CTX),
    );
}

// ── Suite 4: Projection output shapes ────────────────────────────────────────

console.log(
    "\n── Suite 4: Projection output shapes ────────────────────────────────────",
);
{
    const dto = toCardDTO(makePaidCard(), NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const CTX = { siteUrl: SITE_URL, publicUrl: PUBLIC_URL_PERSONAL };

    const seo = toCardPublicSeoDTO(dto, CTX);
    const render = toCardPublicRenderDTO(dto, CTX);

    assertExactKeys("S4: seo exact keys", seo, SEO_KEYS);
    assertExactKeys("S4: render exact keys", render, RENDER_KEYS);

    // Residue keys absent from seo output
    assert(
        "S4: seo no effectiveBilling",
        !Object.prototype.hasOwnProperty.call(seo, "effectiveBilling"),
    );
    assert(
        "S4: seo no effectiveTier",
        !Object.prototype.hasOwnProperty.call(seo, "effectiveTier"),
    );
    assert(
        "S4: seo no tierSource",
        !Object.prototype.hasOwnProperty.call(seo, "tierSource"),
    );
    assert(
        "S4: seo no tierUntil",
        !Object.prototype.hasOwnProperty.call(seo, "tierUntil"),
    );
    assert(
        "S4: seo no entitlements",
        !Object.prototype.hasOwnProperty.call(seo, "entitlements"),
    );

    // Residue and private keys absent from render output
    assert(
        "S4: render no effectiveBilling",
        !Object.prototype.hasOwnProperty.call(render, "effectiveBilling"),
    );
    assert(
        "S4: render no effectiveTier",
        !Object.prototype.hasOwnProperty.call(render, "effectiveTier"),
    );
    assert(
        "S4: render no tierSource",
        !Object.prototype.hasOwnProperty.call(render, "tierSource"),
    );
    assert(
        "S4: render no tierUntil",
        !Object.prototype.hasOwnProperty.call(render, "tierUntil"),
    );
    assert(
        "S4: render no entitlements",
        !Object.prototype.hasOwnProperty.call(render, "entitlements"),
    );
    assert(
        "S4: render no analyticsLevel",
        !Object.prototype.hasOwnProperty.call(render, "analyticsLevel"),
    );
    assert(
        "S4: render no canEdit",
        !Object.prototype.hasOwnProperty.call(render, "canEdit"),
    );
    assert(
        "S4: render no lockedReason",
        !Object.prototype.hasOwnProperty.call(render, "lockedReason"),
    );
    assert(
        "S4: render no galleryLimit",
        !Object.prototype.hasOwnProperty.call(render, "galleryLimit"),
    );
    assert(
        "S4: render no canUploadGallery",
        !Object.prototype.hasOwnProperty.call(render, "canUploadGallery"),
    );
    assert(
        "S4: render no canUseAnalyticsPremium",
        !Object.prototype.hasOwnProperty.call(render, "canUseAnalyticsPremium"),
    );
}

// ── Suite 5: JSON-LD location sanitization ────────────────────────────────────

console.log(
    "\n── Suite 5: JSON-LD location sanitization ───────────────────────────────",
);
{
    const localBusinessJsonLd = {
        "@type": "LocalBusiness",
        "@id": "https://cardigo.co.il/card/og-sanity#business",
        name: "Test Business OG",
        geo: {
            "@type": "GeoCoordinates",
            latitude: "32.0",
            longitude: "34.8",
        },
        latitude: "32.0",
        longitude: "34.8",
        address: {
            "@type": "PostalAddress",
            streetAddress: "123 Test St",
            addressLocality: "Tel Aviv",
            addressCountry: "IL",
        },
    };

    // Free card → canUseServices=false → location fields sanitized
    const freeCardWithJsonLd = {
        ...makeFreeCard(),
        seo: { jsonLd: [localBusinessJsonLd] },
    };
    const freeDtoOG = toCardDTO(freeCardWithJsonLd, NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    assert(
        "S5: free canUseServices is false",
        freeDtoOG.entitlements.canUseServices === false,
    );

    const freeSeo = toCardPublicSeoDTO(freeDtoOG, {
        siteUrl: SITE_URL,
        publicUrl: PUBLIC_URL_PERSONAL,
    });

    // jsonLdItems is an array of plain objects at this stage (serialized inside renderer)
    const freeUserItem = freeSeo.jsonLdItems.find(
        (it) =>
            it &&
            typeof it === "object" &&
            (it["@type"] === "LocalBusiness" ||
                (Array.isArray(it["@type"]) &&
                    it["@type"].includes("LocalBusiness"))),
    );
    assert(
        "S5: free → LocalBusiness item found in seo",
        freeUserItem !== undefined,
    );
    assert(
        "S5: free → geo stripped",
        freeUserItem !== undefined &&
            !Object.prototype.hasOwnProperty.call(freeUserItem, "geo"),
    );
    assert(
        "S5: free → latitude stripped",
        freeUserItem !== undefined &&
            !Object.prototype.hasOwnProperty.call(freeUserItem, "latitude"),
    );
    assert(
        "S5: free → longitude stripped",
        freeUserItem !== undefined &&
            !Object.prototype.hasOwnProperty.call(freeUserItem, "longitude"),
    );
    const freeAddr = freeUserItem?.address;
    assert(
        "S5: free → address object preserved",
        freeAddr !== undefined &&
            freeAddr !== null &&
            typeof freeAddr === "object",
    );
    assert(
        "S5: free → streetAddress stripped",
        freeAddr !== undefined &&
            !Object.prototype.hasOwnProperty.call(freeAddr, "streetAddress"),
    );
    assert(
        "S5: free → addressLocality preserved",
        freeAddr !== undefined &&
            Object.prototype.hasOwnProperty.call(freeAddr, "addressLocality"),
    );
    assert(
        "S5: free → addressCountry preserved",
        freeAddr !== undefined &&
            Object.prototype.hasOwnProperty.call(freeAddr, "addressCountry"),
    );
    assert(
        "S5: free → name preserved",
        freeUserItem !== undefined &&
            Object.prototype.hasOwnProperty.call(freeUserItem, "name"),
    );

    // Paid card → canUseServices=true → location fields preserved as-is
    const paidCardWithJsonLd = {
        ...makePaidCard(),
        seo: { jsonLd: [localBusinessJsonLd] },
    };
    const paidDtoOG = toCardDTO(paidCardWithJsonLd, NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    assert(
        "S5: paid canUseServices is true",
        paidDtoOG.entitlements.canUseServices === true,
    );

    const paidSeo = toCardPublicSeoDTO(paidDtoOG, {
        siteUrl: SITE_URL,
        publicUrl: PUBLIC_URL_PERSONAL,
    });
    const paidUserItem = paidSeo.jsonLdItems.find(
        (it) =>
            it &&
            typeof it === "object" &&
            (it["@type"] === "LocalBusiness" ||
                (Array.isArray(it["@type"]) &&
                    it["@type"].includes("LocalBusiness"))),
    );
    assert(
        "S5: paid → LocalBusiness item found in seo",
        paidUserItem !== undefined,
    );
    assert(
        "S5: paid → geo preserved",
        paidUserItem !== undefined &&
            Object.prototype.hasOwnProperty.call(paidUserItem, "geo"),
    );
    assert(
        "S5: paid → latitude preserved",
        paidUserItem !== undefined &&
            Object.prototype.hasOwnProperty.call(paidUserItem, "latitude"),
    );
    assert(
        "S5: paid → longitude preserved",
        paidUserItem !== undefined &&
            Object.prototype.hasOwnProperty.call(paidUserItem, "longitude"),
    );
    const paidAddr = paidUserItem?.address;
    assert(
        "S5: paid → streetAddress preserved",
        paidAddr !== undefined &&
            Object.prototype.hasOwnProperty.call(paidAddr, "streetAddress"),
    );
}

// ── Suite 6: renderCardOgHtml output ─────────────────────────────────────────

console.log(
    "\n── Suite 6: renderCardOgHtml output ─────────────────────────────────────",
);
{
    const paidCardForHtml = {
        ...makePaidCard(),
        business: {
            name: "HTML Sanity Business",
            category: "Tech",
            slogan: "Sanity Slogan",
        },
        content: {
            aboutParagraphs: ["About this sanity business."],
        },
    };
    const dto = toCardDTO(paidCardForHtml, NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const CTX = { siteUrl: SITE_URL, publicUrl: PUBLIC_URL_PERSONAL };
    const seo = toCardPublicSeoDTO(dto, CTX);
    const render = toCardPublicRenderDTO(dto, CTX);
    const html = renderCardOgHtml({ seo, render, lang: "he", dir: "rtl" });

    assert("S6: html is a string", typeof html === "string" && html.length > 0);
    assert("S6: html starts with doctype", html.startsWith("<!doctype html>"));
    assert(
        "S6: html contains canonical link",
        html.includes('rel="canonical"'),
    );
    assert("S6: html contains og:url", html.includes("og:url"));
    assert("S6: html contains og:title", html.includes("og:title"));
    assert("S6: html contains og:description", html.includes("og:description"));
    assert("S6: html contains publicUrl", html.includes(PUBLIC_URL_PERSONAL));
    assert(
        "S6: html contains business name",
        html.includes("HTML Sanity Business"),
    );
    assert(
        "S6: html contains about text",
        html.includes("About this sanity business."),
    );

    // Private DTO fields must not appear in HTML output
    assert(
        "S6: no effectiveBilling in html",
        !html.includes("effectiveBilling"),
    );
    assert("S6: no effectiveTier in html", !html.includes("effectiveTier"));
    assert("S6: no tierSource in html", !html.includes("tierSource"));
    assert("S6: no tierUntil in html", !html.includes("tierUntil"));
    assert("S6: no analyticsLevel in html", !html.includes("analyticsLevel"));
    assert("S6: no canEdit in html", !html.includes("canEdit"));
    assert("S6: no lockedReason in html", !html.includes("lockedReason"));
    assert("S6: no galleryLimit in html", !html.includes("galleryLimit"));
    assert(
        "S6: no canUploadGallery in html",
        !html.includes("canUploadGallery"),
    );
    assert(
        "S6: no canUseAnalyticsPremium in html",
        !html.includes("canUseAnalyticsPremium"),
    );
    assert("S6: no window.__ hydration marker", !html.includes("window.__"));
    assert(
        "S6: no raw DTO JSON blob (effectiveBilling key literal)",
        !html.includes('"effectiveBilling"'),
    );
}

// ── Suite 7: seoResolved contract — no jsonLdItems exposure ──────────────────

console.log(
    "\n── Suite 7: seoResolved contract — no jsonLdItems exposure ──────────────",
);
{
    // Mirror the controller assembly pattern exactly.
    function buildPublicSeoResolved(dto, siteUrl, publicUrl) {
        const {
            jsonLdItems: _ld,
            robotsResolved,
            ...rest
        } = toCardPublicSeoDTO(dto, { siteUrl, publicUrl });
        return { ...rest, robots: robotsResolved };
    }

    const SEO_RESOLVED_KEYS = Object.freeze([
        "canonicalUrl",
        "description",
        "indexable",
        "ogImage",
        "ogImageAlt",
        "ogType",
        "ogUrl",
        "robots",
        "title",
        "twitterCard",
    ]);

    const paidDto = toCardDTO(makePaidCard(), NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const personalPublicPath = "/card/og-sanity";
    const resolved = buildPublicSeoResolved(
        paidDto,
        SITE_URL,
        SITE_URL + personalPublicPath,
    );

    // S7-1/2: exact key shape
    assertExactKeys("S7: seoResolved exact keys", resolved, SEO_RESOLVED_KEYS);

    // S7-3: jsonLdItems intentionally excluded
    assert(
        "S7: jsonLdItems absent from seoResolved",
        !Object.prototype.hasOwnProperty.call(resolved, "jsonLdItems"),
    );

    // S7-4: robotsResolved renamed to robots, original name absent
    assert(
        "S7: robotsResolved absent from seoResolved",
        !Object.prototype.hasOwnProperty.call(resolved, "robotsResolved"),
    );

    // S7-5..11: no private/billing/entitlement leakage
    for (const key of [
        "effectiveBilling",
        "effectiveTier",
        "tierSource",
        "tierUntil",
        "entitlements",
        "analyticsLevel",
        "canEdit",
        "lockedReason",
        "galleryLimit",
    ]) {
        assert(
            `S7: seoResolved no ${key}`,
            !Object.prototype.hasOwnProperty.call(resolved, key),
        );
    }

    // S7-12/13: generic title rejection
    const genericTitleCard = {
        ...makePaidCard(),
        seo: { title: "כרטיס ביקור דיגיטלי" },
        business: { name: "Test Business OG" },
    };
    const genericTitleDto = toCardDTO(genericTitleCard, NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const resolvedGeneric = buildPublicSeoResolved(
        genericTitleDto,
        SITE_URL,
        SITE_URL + personalPublicPath,
    );
    assert(
        "S7: generic seo.title rejected — not equal to generic string",
        resolvedGeneric.title !== "כרטיס ביקור דיגיטלי",
    );
    assert(
        "S7: generic seo.title rejected — falls back to business name compound",
        resolvedGeneric.title === "Test Business OG \u2013 כרטיס ביקור דיגיטלי",
    );

    // S7-14: title clipping at TITLE_MAX=65
    const longTitleCard = {
        ...makePaidCard(),
        seo: { title: "א".repeat(70) },
    };
    const longTitleDto = toCardDTO(longTitleCard, NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const resolvedLongTitle = buildPublicSeoResolved(
        longTitleDto,
        SITE_URL,
        SITE_URL + personalPublicPath,
    );
    assert(
        "S7: long seo.title clipped to 65 chars",
        resolvedLongTitle.title.length === 65,
    );

    // S7-15: description clipping at DESCRIPTION_MAX=160
    const longDescCard = {
        ...makePaidCard(),
        seo: { description: "ב".repeat(200) },
    };
    const longDescDto = toCardDTO(longDescCard, NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const resolvedLongDesc = buildPublicSeoResolved(
        longDescDto,
        SITE_URL,
        SITE_URL + personalPublicPath,
    );
    assert(
        "S7: long seo.description clipped to 160 chars",
        resolvedLongDesc.description.length === 160,
    );

    // S7-16: avatarImage fallback (current backend SSoT — third candidate)
    const avatarCard = {
        ...makePaidCard(),
        design: { avatarImage: "https://cardigo.co.il/img/av.jpg" },
    };
    const avatarDto = toCardDTO(avatarCard, NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const resolvedAvatar = buildPublicSeoResolved(
        avatarDto,
        SITE_URL,
        SITE_URL + personalPublicPath,
    );
    assert(
        "S7: avatarImage used as ogImage when coverImage and logo absent",
        resolvedAvatar.ogImage === "https://cardigo.co.il/img/av.jpg",
    );

    // S7-17: custom robots normalization — noarchive stripped, noindex preserved
    const customRobotsCard = {
        ...makePaidCard(),
        seo: { robots: "noindex, noarchive" },
    };
    const customRobotsDto = toCardDTO(customRobotsCard, NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const resolvedCustomRobots = buildPublicSeoResolved(
        customRobotsDto,
        SITE_URL,
        SITE_URL + personalPublicPath,
    );
    assert(
        "S7: custom robots noindex+noarchive normalized to noindex, follow",
        resolvedCustomRobots.robots === "noindex, follow",
    );

    // S7-18: free card forced noindex → robots = noindex, follow
    const freeDto = toCardDTO(makeFreeCard(), NOW, {
        includePrivate: false,
        org: null,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const resolvedFree = buildPublicSeoResolved(
        freeDto,
        SITE_URL,
        SITE_URL + "/card/og-sanity-free",
    );
    assert(
        "S7: free card forced noindex → robots = noindex, follow",
        resolvedFree.robots === "noindex, follow",
    );

    // S7-19: paid card no explicit robots → index, follow
    assert(
        "S7: paid card no seo.robots → robots = index, follow",
        resolved.robots === "index, follow",
    );

    // S7-20: canonicalUrl equals siteUrl + publicPath
    assert(
        "S7: canonicalUrl equals siteUrl + publicPath",
        resolved.canonicalUrl === SITE_URL + personalPublicPath,
    );

    // S7-21: ogUrl equals canonicalUrl
    assert(
        "S7: ogUrl equals canonicalUrl",
        resolved.ogUrl === resolved.canonicalUrl,
    );

    // S7-22: indexable is boolean
    assert("S7: indexable is boolean", typeof resolved.indexable === "boolean");

    // S7-23: paid card is indexable
    assert("S7: paid card is indexable", resolved.indexable === true);

    // S7-24: free card is not indexable
    assert("S7: free card is not indexable", resolvedFree.indexable === false);

    // S7-25: ogType is always "website"
    assert('S7: ogType is "website"', resolved.ogType === "website");
}

// ── Suite 8: JSON-LD SSoT / duplication baseline ──────────────────────────────

console.log(
    "\n── Suite 8: JSON-LD SSoT / duplication baseline ─────────────────────────",
);
{
    const S8_PUBLIC_URL = SITE_URL + "/card/og-sanity";
    const S8_PUBLIC_URL_FREE = SITE_URL + "/card/og-sanity-free";

    // ── S8-1..4: auto FAQPage identity ─────────────────────────────────────
    const cardBasicFaq = {
        ...makePaidCard(),
        faq: { items: [{ q: "What is this?", a: "A digital business card." }] },
    };
    const dtoBasicFaq = toCardDTO(cardBasicFaq, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seoBasicFaq = toCardPublicSeoDTO(dtoBasicFaq, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    const s8AutoFaqPages = seoBasicFaq.jsonLdItems.filter(
        (it) => it && it["@type"] === "FAQPage",
    );

    // S8-1
    assert(
        "S8: auto FAQPage exists when card has faq items",
        s8AutoFaqPages.length >= 1,
    );
    const s8AutoFaq = s8AutoFaqPages[0];
    // S8-2
    assert(
        "S8: auto FAQPage @id equals publicUrl#faq",
        s8AutoFaq?.["@id"] === S8_PUBLIC_URL + "#faq",
    );
    // S8-3
    assert(
        "S8: auto FAQPage url equals publicUrl",
        s8AutoFaq?.url === S8_PUBLIC_URL,
    );
    // S8-4
    assert(
        "S8: auto FAQPage isPartOf.@id equals publicUrl",
        s8AutoFaq?.isPartOf?.["@id"] === S8_PUBLIC_URL,
    );

    // ── S8-5: mainEntity count capped at FAQ_ITEMS_MAX (5) ────────────────
    const sevenItems = Array.from({ length: 7 }, (_, i) => ({
        q: `Question ${i + 1}`,
        a: `Answer ${i + 1}`,
    }));
    const card7Faq = { ...makePaidCard(), faq: { items: sevenItems } };
    const dto7Faq = toCardDTO(card7Faq, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seo7Faq = toCardPublicSeoDTO(dto7Faq, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    const s8FaqCapped = seo7Faq.jsonLdItems.find(
        (it) => it && it["@type"] === "FAQPage",
    );
    // S8-5
    assert(
        "S8: auto FAQPage mainEntity capped at 5 when card has 7 items",
        Array.isArray(s8FaqCapped?.mainEntity) &&
            s8FaqCapped.mainEntity.length === 5,
    );

    // ── S8-6: FAQ question clipped to 200 chars ────────────────────────────
    const cardLongQ = {
        ...makePaidCard(),
        faq: { items: [{ q: "Q".repeat(250), a: "Short answer" }] },
    };
    const dtoLongQ = toCardDTO(cardLongQ, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seoLongQ = toCardPublicSeoDTO(dtoLongQ, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    const s8FaqLongQ = seoLongQ.jsonLdItems.find(
        (it) => it && it["@type"] === "FAQPage",
    );
    // S8-6
    assert(
        "S8: FAQ question clipped to 200 chars",
        typeof s8FaqLongQ?.mainEntity?.[0]?.name === "string" &&
            s8FaqLongQ.mainEntity[0].name.length === 200,
    );

    // ── S8-7: FAQ answer clipped to 1000 chars ─────────────────────────────
    const cardLongA = {
        ...makePaidCard(),
        faq: { items: [{ q: "Short question", a: "A".repeat(1200) }] },
    };
    const dtoLongA = toCardDTO(cardLongA, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seoLongA = toCardPublicSeoDTO(dtoLongA, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    const s8FaqLongA = seoLongA.jsonLdItems.find(
        (it) => it && it["@type"] === "FAQPage",
    );
    // S8-7
    assert(
        "S8: FAQ answer clipped to 1000 chars",
        typeof s8FaqLongA?.mainEntity?.[0]?.acceptedAnswer?.text === "string" &&
            s8FaqLongA.mainEntity[0].acceptedAnswer.text.length === 1000,
    );

    // ── S8-8/9: user FAQPage with same @id is deduplicated; backend auto wins
    const s8AutoFaqId = S8_PUBLIC_URL + "#faq";
    const cardDedup = {
        ...makePaidCard(),
        faq: { items: [{ q: "Auto question", a: "Auto answer" }] },
        seo: {
            jsonLd: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "@id": s8AutoFaqId,
                mainEntity: [
                    {
                        "@type": "Question",
                        name: "User duplicate question",
                        acceptedAnswer: {
                            "@type": "Answer",
                            text: "User duplicate answer",
                        },
                    },
                ],
            }),
        },
    };
    const dtoDedup = toCardDTO(cardDedup, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seoDedup = toCardPublicSeoDTO(dtoDedup, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    const s8AllFaqPages = seoDedup.jsonLdItems.filter(
        (it) => it && it["@type"] === "FAQPage",
    );
    // S8-8
    assert(
        "S8: exactly one FAQPage after dedup when user FAQPage has same @id",
        s8AllFaqPages.length === 1,
    );
    // S8-9
    assert(
        "S8: backend auto FAQPage wins after dedup — question is backend-derived",
        s8AllFaqPages[0]?.mainEntity?.[0]?.name === "Auto question",
    );

    // ── S8-10: user seo.jsonLd with top-level @graph rejected ─────────────
    const cardGraph = {
        ...makePaidCard(),
        seo: {
            jsonLd: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [{ "@type": "WebSite", url: SITE_URL }],
            }),
        },
    };
    const dtoGraph = toCardDTO(cardGraph, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seoGraph = toCardPublicSeoDTO(dtoGraph, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    // S8-10
    assert(
        "S8: user seo.jsonLd with @graph at top level is rejected from jsonLdItems",
        !seoGraph.jsonLdItems.some(
            (it) => it && Object.prototype.hasOwnProperty.call(it, "@graph"),
        ),
    );

    // ── S8-11: <script in string value rejected (pre-parse token check) ────
    const cardScriptVal = {
        ...makePaidCard(),
        seo: {
            jsonLd: JSON.stringify({
                "@type": "WebSite",
                name: "<script>alert(1)</script>",
                url: SITE_URL,
            }),
        },
    };
    const dtoScriptVal = toCardDTO(cardScriptVal, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seoScriptVal = toCardPublicSeoDTO(dtoScriptVal, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    // S8-11
    assert(
        "S8: user seo.jsonLd with <script in value is rejected from jsonLdItems",
        !seoScriptVal.jsonLdItems.some(
            (it) => it && JSON.stringify(it).toLowerCase().includes("<script"),
        ),
    );

    // ── S8-12: <script in key rejected (containsScriptToken on raw string) ─
    const cardScriptKey = {
        ...makePaidCard(),
        seo: { jsonLd: JSON.stringify({ "<script>": "value" }) },
    };
    const dtoScriptKey = toCardDTO(cardScriptKey, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seoScriptKey = toCardPublicSeoDTO(dtoScriptKey, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    // S8-12
    assert(
        "S8: user seo.jsonLd with <script in key is rejected from jsonLdItems",
        !seoScriptKey.jsonLdItems.some(
            (it) => it && JSON.stringify(it).toLowerCase().includes("<script"),
        ),
    );

    // ── S8-13..16: free card LocalBusiness location sanitization ───────────
    const s8LocalBizJsonLd = JSON.stringify({
        "@type": "LocalBusiness",
        name: "Free Shop",
        geo: {
            "@type": "GeoCoordinates",
            latitude: 32.08,
            longitude: 34.78,
        },
        latitude: 32.08,
        longitude: 34.78,
        address: {
            "@type": "PostalAddress",
            streetAddress: "123 Main St",
            addressLocality: "Tel Aviv",
            addressCountry: "IL",
        },
    });
    const cardFreeLb = {
        ...makeFreeCard(),
        seo: { jsonLd: s8LocalBizJsonLd },
    };
    const dtoFreeLb = toCardDTO(cardFreeLb, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seoFreeLb = toCardPublicSeoDTO(dtoFreeLb, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL_FREE,
    });
    const s8FreeLbItem = seoFreeLb.jsonLdItems.find(
        (it) => it && it["@type"] === "LocalBusiness",
    );
    // S8-13
    assert(
        "S8: free card LocalBusiness geo stripped",
        s8FreeLbItem !== undefined &&
            !Object.prototype.hasOwnProperty.call(s8FreeLbItem, "geo"),
    );
    // S8-14
    assert(
        "S8: free card LocalBusiness latitude stripped",
        s8FreeLbItem !== undefined &&
            !Object.prototype.hasOwnProperty.call(s8FreeLbItem, "latitude"),
    );
    assert(
        "S8: free card LocalBusiness longitude stripped",
        s8FreeLbItem !== undefined &&
            !Object.prototype.hasOwnProperty.call(s8FreeLbItem, "longitude"),
    );
    // S8-15
    assert(
        "S8: free card LocalBusiness address.streetAddress stripped",
        s8FreeLbItem !== undefined &&
            (!s8FreeLbItem.address ||
                !Object.prototype.hasOwnProperty.call(
                    s8FreeLbItem.address,
                    "streetAddress",
                )),
    );
    // S8-16a
    assert(
        "S8: free card LocalBusiness address.addressLocality preserved",
        s8FreeLbItem !== undefined &&
            s8FreeLbItem.address?.addressLocality === "Tel Aviv",
    );
    // S8-16b
    assert(
        "S8: free card LocalBusiness address.addressCountry preserved",
        s8FreeLbItem !== undefined &&
            s8FreeLbItem.address?.addressCountry === "IL",
    );

    // ── S8-17: paid card LocalBusiness NOT sanitized ───────────────────────
    const cardPaidLb = {
        ...makePaidCard(),
        seo: { jsonLd: s8LocalBizJsonLd },
    };
    const dtoPaidLb = toCardDTO(cardPaidLb, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seoPaidLb = toCardPublicSeoDTO(dtoPaidLb, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    const s8PaidLbItem = seoPaidLb.jsonLdItems.find(
        (it) => it && it["@type"] === "LocalBusiness",
    );
    // S8-17a
    assert(
        "S8: paid card LocalBusiness geo preserved",
        s8PaidLbItem !== undefined &&
            Object.prototype.hasOwnProperty.call(s8PaidLbItem, "geo"),
    );
    // S8-17b
    assert(
        "S8: paid card LocalBusiness address.streetAddress preserved",
        s8PaidLbItem !== undefined &&
            s8PaidLbItem.address?.streetAddress === "123 Main St",
    );

    // ── S8-18: jsonLdItems JSON contains no private/billing field keys ─────
    const cardPrivacyFaq = {
        ...makePaidCard(),
        faq: { items: [{ q: "Privacy Q", a: "Privacy A" }] },
    };
    const dtoPrivacyFaq = toCardDTO(cardPrivacyFaq, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seoPrivacyFaq = toCardPublicSeoDTO(dtoPrivacyFaq, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    const s8JsonLdStr = JSON.stringify(seoPrivacyFaq.jsonLdItems);
    for (const key of [
        "effectiveBilling",
        "effectiveTier",
        "tierSource",
        "tierUntil",
        "entitlements",
        "analyticsLevel",
        "canEdit",
        "lockedReason",
        "galleryLimit",
        "billing",
        "adminOverride",
        "user",
        "anonymousId",
    ]) {
        assert(
            `S8: jsonLdItems JSON has no private key "${key}"`,
            !s8JsonLdStr.includes(`"${key}"`),
        );
    }

    // ── S8-19: renderCardOgHtml — no duplicate FAQPage @id in HTML ─────────
    // Card with auto FAQ and user FAQPage with same @id → dedup → one FAQPage in HTML
    const cardHtmlDedup = {
        ...makePaidCard(),
        faq: { items: [{ q: "HTML Q", a: "HTML A" }] },
        seo: {
            jsonLd: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "@id": S8_PUBLIC_URL + "#faq",
                mainEntity: [
                    {
                        "@type": "Question",
                        name: "Duplicate user Q",
                        acceptedAnswer: { "@type": "Answer", text: "Dup A" },
                    },
                ],
            }),
        },
    };
    const dtoHtmlDedup = toCardDTO(cardHtmlDedup, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const seoHtmlDedup = toCardPublicSeoDTO(dtoHtmlDedup, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    const renderHtmlDedup = toCardPublicRenderDTO(dtoHtmlDedup, {
        siteUrl: SITE_URL,
        publicUrl: S8_PUBLIC_URL,
    });
    const s8HtmlDedup = renderCardOgHtml({
        seo: seoHtmlDedup,
        render: renderHtmlDedup,
        lang: "he",
        dir: "rtl",
    });
    // Count occurrences of the #faq @id as a JSON string value — must be exactly 1
    const s8FaqIdToken = JSON.stringify(S8_PUBLIC_URL + "#faq");
    const s8FaqIdCount = s8HtmlDedup.split(s8FaqIdToken).length - 1;
    // S8-19
    assert(
        "S8: renderCardOgHtml emits exactly one FAQPage @id after dedup",
        s8FaqIdCount === 1,
    );

    // ── S8-20: renderCardOgHtml contains no private/billing field strings ──
    assert(
        "S8: renderCardOgHtml no effectiveBilling",
        !s8HtmlDedup.includes("effectiveBilling"),
    );
    assert(
        "S8: renderCardOgHtml no analyticsLevel",
        !s8HtmlDedup.includes("analyticsLevel"),
    );
    assert(
        "S8: renderCardOgHtml no lockedReason",
        !s8HtmlDedup.includes("lockedReason"),
    );
    assert("S8: renderCardOgHtml no canEdit", !s8HtmlDedup.includes("canEdit"));
    assert(
        "S8: renderCardOgHtml no galleryLimit",
        !s8HtmlDedup.includes("galleryLimit"),
    );
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(
    "\n── Summary ──────────────────────────────────────────────────────────────",
);
console.log(`Total: ${total}, Passed: ${total - failed}, Failed: ${failed}`);
if (failed > 0) {
    console.error(`SANITY FAILED: ${failed} assertion(s) failed.`);
    process.exitCode = 1;
} else {
    console.log("SANITY PASS: all assertions passed.");
}
