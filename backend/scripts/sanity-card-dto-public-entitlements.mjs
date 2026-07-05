/**
 * Fixture-only sanity for SSR_P2_PUBLIC_DTO_ENTITLEMENT_MINIMIZATION.
 *
 * Proves that toCardDTO(card, now, { publicEntitlementsOnly: true }) replaces
 * the full entitlements object with a 6-key public allowlist projection and
 * that editor/admin/subscription-tier fields do not appear in the result.
 *
 * Also proves default behavior (publicEntitlementsOnly absent / false) keeps
 * full entitlements unchanged, and that combining with stripBillingDetails:true
 * works correctly.
 *
 * No DB, no Express, no network, no env. Direct in-process assertions on
 * synthetic card fixtures. Exits 0 on all pass, non-zero on first failure.
 *
 * Run: node backend/scripts/sanity-card-dto-public-entitlements.mjs
 */

import { toCardDTO } from "../src/utils/cardDTO.js";

const NOW = new Date("2025-06-01T12:00:00.000Z");

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

const PUBLIC_KEYS = Object.freeze([
    "canUseServices",
    "canUseLeads",
    "canUseBooking",
    "canUseVideo",
    "canUseBusinessHours",
    "maxContentParagraphs",
]);

const PRIVATE_KEYS = Object.freeze([
    "canEdit",
    "lockedReason",
    "canUseGallery",
    "galleryLimit",
    "canUploadGallery",
    "canUseReviews",
    "canPublish",
    "canEditSeo",
    "canChangeSlug",
    "canUseAnalyticsPremium",
    "canUseCustomActions",
    "analyticsLevel",
    "canViewAnalytics",
    "analyticsRetentionDays",
    "design",
]);

// ── fixtures ─────────────────────────────────────────────────────────────────

// Fixture A: paid (active billing) user-owned card.
function makePaidCard() {
    return {
        _id: "aaa000000000000000000001",
        slug: "paid-card",
        status: "published",
        isActive: true,
        user: "bbb000000000000000000001",
        billing: {
            status: "active",
            plan: "monthly",
            paidUntil: new Date("2026-12-31T23:59:59.000Z"),
        },
        business: { name: "Paid Co" },
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

// Fixture B: free user-owned card.
function makeFreeCard() {
    return {
        _id: "aaa000000000000000000002",
        slug: "free-card",
        status: "published",
        isActive: true,
        user: "bbb000000000000000000002",
        billing: { status: "free", plan: "free", paidUntil: null },
        business: { name: "Free Co" },
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

// Fixture C: admin-override card (premium via adminTier).
function makeAdminTierCard() {
    return {
        _id: "aaa000000000000000000003",
        slug: "admin-tier-card",
        status: "published",
        isActive: true,
        user: "bbb000000000000000000003",
        adminTier: "premium",
        adminTierUntil: new Date("2027-06-01T00:00:00.000Z"),
        billing: { status: "free", plan: "free", paidUntil: null },
        business: { name: "Admin Tier Co" },
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

// ── Fixture 1: default behavior keeps full entitlements ──────────────────────
{
    const dto = toCardDTO(makePaidCard(), NOW);

    assert(
        "default: entitlements object present",
        dto.entitlements !== null && typeof dto.entitlements === "object",
    );
    // Private keys must be present with default (no publicEntitlementsOnly).
    assert(
        "default: canEdit present",
        Object.prototype.hasOwnProperty.call(dto.entitlements, "canEdit"),
    );
    assert(
        "default: analyticsLevel present",
        Object.prototype.hasOwnProperty.call(
            dto.entitlements,
            "analyticsLevel",
        ),
    );
    assert(
        "default: lockedReason present",
        Object.prototype.hasOwnProperty.call(dto.entitlements, "lockedReason"),
    );
    assert(
        "default: galleryLimit present",
        Object.prototype.hasOwnProperty.call(dto.entitlements, "galleryLimit"),
    );
    assert(
        "default: design sub-object present",
        Object.prototype.hasOwnProperty.call(dto.entitlements, "design"),
    );
    for (const key of PUBLIC_KEYS) {
        assert(
            `default: public key ${key} present`,
            Object.prototype.hasOwnProperty.call(dto.entitlements, key),
        );
    }
}

// ── Fixture 2: publicEntitlementsOnly:false — same as default ────────────────
{
    const dto = toCardDTO(makePaidCard(), NOW, {
        publicEntitlementsOnly: false,
    });

    assert(
        "publicEntitlementsOnly:false — canEdit present",
        Object.prototype.hasOwnProperty.call(dto.entitlements, "canEdit"),
    );
    assert(
        "publicEntitlementsOnly:false — analyticsLevel present",
        Object.prototype.hasOwnProperty.call(
            dto.entitlements,
            "analyticsLevel",
        ),
    );
    assert(
        "publicEntitlementsOnly:false — 6 public keys present",
        PUBLIC_KEYS.every((k) =>
            Object.prototype.hasOwnProperty.call(dto.entitlements, k),
        ),
    );
}

// ── Fixture 3: paid card — publicEntitlementsOnly:true ───────────────────────
// Primary assertion: exactly the 6 public keys, none of the private keys.
{
    const dto = toCardDTO(makePaidCard(), NOW, {
        publicEntitlementsOnly: true,
    });

    assert(
        "paid + publicEntitlementsOnly: entitlements object present",
        dto.entitlements !== null && typeof dto.entitlements === "object",
    );
    assertExactKeys(
        "paid + publicEntitlementsOnly",
        dto.entitlements,
        PUBLIC_KEYS,
    );

    // All 6 public keys must be present.
    for (const key of PUBLIC_KEYS) {
        assert(
            `paid + publicEntitlementsOnly: public key ${key} present`,
            Object.prototype.hasOwnProperty.call(dto.entitlements, key),
        );
    }

    // All private/internal keys must be absent.
    for (const key of PRIVATE_KEYS) {
        assert(
            `paid + publicEntitlementsOnly: private key ${key} absent`,
            !Object.prototype.hasOwnProperty.call(dto.entitlements, key),
        );
    }

    // Paid card: premium features true.
    assert(
        "paid + publicEntitlementsOnly: canUseServices true",
        dto.entitlements.canUseServices === true,
    );
    assert(
        "paid + publicEntitlementsOnly: canUseLeads true",
        dto.entitlements.canUseLeads === true,
    );
    assert(
        "paid + publicEntitlementsOnly: canUseBooking true",
        dto.entitlements.canUseBooking === true,
    );
    assert(
        "paid + publicEntitlementsOnly: canUseVideo true",
        dto.entitlements.canUseVideo === true,
    );
    assert(
        "paid + publicEntitlementsOnly: canUseBusinessHours true",
        dto.entitlements.canUseBusinessHours === true,
    );
    assert(
        "paid + publicEntitlementsOnly: maxContentParagraphs 3",
        dto.entitlements.maxContentParagraphs === 3,
    );
}

// ── Fixture 4: free card — publicEntitlementsOnly:true ───────────────────────
{
    const dto = toCardDTO(makeFreeCard(), NOW, {
        publicEntitlementsOnly: true,
    });

    assert(
        "free + publicEntitlementsOnly: entitlements object present",
        dto.entitlements !== null && typeof dto.entitlements === "object",
    );
    assertExactKeys(
        "free + publicEntitlementsOnly",
        dto.entitlements,
        PUBLIC_KEYS,
    );

    // All 6 public keys must be present.
    for (const key of PUBLIC_KEYS) {
        assert(
            `free + publicEntitlementsOnly: public key ${key} present`,
            Object.prototype.hasOwnProperty.call(dto.entitlements, key),
        );
    }

    // All private/internal keys must be absent.
    for (const key of PRIVATE_KEYS) {
        assert(
            `free + publicEntitlementsOnly: private key ${key} absent`,
            !Object.prototype.hasOwnProperty.call(dto.entitlements, key),
        );
    }

    // Free card: premium features false.
    assert(
        "free + publicEntitlementsOnly: canUseServices false",
        dto.entitlements.canUseServices === false,
    );
    assert(
        "free + publicEntitlementsOnly: canUseLeads false",
        dto.entitlements.canUseLeads === false,
    );
    assert(
        "free + publicEntitlementsOnly: canUseBooking false",
        dto.entitlements.canUseBooking === false,
    );
    assert(
        "free + publicEntitlementsOnly: maxContentParagraphs 1",
        dto.entitlements.maxContentParagraphs === 1,
    );
}

// ── Fixture 5: combined with stripBillingDetails:true ────────────────────────
{
    const dto = toCardDTO(makePaidCard(), NOW, {
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });

    // Billing fields must be absent (from stripBillingDetails).
    assert(
        "combined: effectiveBilling absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveBilling"),
    );
    assert(
        "combined: effectiveTier absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveTier"),
    );
    assert(
        "combined: tierSource absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierSource"),
    );
    assert(
        "combined: tierUntil absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierUntil"),
    );

    // Public entitlements must be present (from publicEntitlementsOnly).
    assert(
        "combined: entitlements object present",
        dto.entitlements !== null && typeof dto.entitlements === "object",
    );
    assertExactKeys("combined", dto.entitlements, PUBLIC_KEYS);
    for (const key of PUBLIC_KEYS) {
        assert(
            `combined: public key ${key} present`,
            Object.prototype.hasOwnProperty.call(dto.entitlements, key),
        );
    }
    for (const key of PRIVATE_KEYS) {
        assert(
            `combined: private key ${key} absent`,
            !Object.prototype.hasOwnProperty.call(dto.entitlements, key),
        );
    }
}

// ── Fixture 6: includePrivate:true — full entitlements preserved ─────────────
{
    const dto = toCardDTO(makePaidCard(), NOW, { includePrivate: true });

    assert(
        "includePrivate:true — canEdit present (admin path preserved)",
        Object.prototype.hasOwnProperty.call(dto.entitlements, "canEdit"),
    );
    assert(
        "includePrivate:true — analyticsLevel present",
        Object.prototype.hasOwnProperty.call(
            dto.entitlements,
            "analyticsLevel",
        ),
    );
    assert(
        "includePrivate:true — design sub-object present",
        Object.prototype.hasOwnProperty.call(dto.entitlements, "design"),
    );
    assert(
        "includePrivate:true — raw billing present",
        Object.prototype.hasOwnProperty.call(dto, "billing"),
    );
}

// ── Fixture 7: admin-tier card — publicEntitlementsOnly:true ─────────────────
{
    const dto = toCardDTO(makeAdminTierCard(), NOW, {
        publicEntitlementsOnly: true,
    });

    assertExactKeys(
        "admin-tier + publicEntitlementsOnly",
        dto.entitlements,
        PUBLIC_KEYS,
    );

    // Private keys absent even for admin-tier card.
    for (const key of PRIVATE_KEYS) {
        assert(
            `admin-tier + publicEntitlementsOnly: private key ${key} absent`,
            !Object.prototype.hasOwnProperty.call(dto.entitlements, key),
        );
    }

    // Premium features should be true (adminTier grants premium).
    assert(
        "admin-tier + publicEntitlementsOnly: canUseServices true",
        dto.entitlements.canUseServices === true,
    );
    assert(
        "admin-tier + publicEntitlementsOnly: canUseLeads true",
        dto.entitlements.canUseLeads === true,
    );
}

// ── Fixture 8: no sensitive strings in JSON.stringify when publicEntitlementsOnly
{
    const dto = toCardDTO(makePaidCard(), NOW, {
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
    });
    const s = JSON.stringify(dto);

    assert("JSON: TRIAL_EXPIRED absent", !s.includes("TRIAL_EXPIRED"));
    assert('JSON: "analyticsLevel" absent', !s.includes('"analyticsLevel"'));
    assert('JSON: "canEdit" absent', !s.includes('"canEdit"'));
    assert('JSON: "galleryLimit" absent', !s.includes('"galleryLimit"'));
    assert(
        'JSON: "canUploadGallery" absent',
        !s.includes('"canUploadGallery"'),
    );
    assert('JSON: "lockedReason" absent', !s.includes('"lockedReason"'));
    assert(
        'JSON: "analyticsRetentionDays" absent',
        !s.includes('"analyticsRetentionDays"'),
    );
    assert(
        'JSON: "canUseAnalyticsPremium" absent',
        !s.includes('"canUseAnalyticsPremium"'),
    );
    assert("JSON: slug still present", s.includes('"slug":"paid-card"'));
    assert(
        "JSON: canUseServices still present",
        s.includes('"canUseServices"'),
    );
}

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`\nTOTAL ${total} | FAILED ${failed}`);
