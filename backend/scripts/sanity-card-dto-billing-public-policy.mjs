/**
 * Fixture-only sanity for SSR_P2_EFFECTIVE_BILLING_POLICY_LOCK.
 *
 * Proves that toCardDTO(card, now, { stripBillingDetails: true }) removes
 * effectiveBilling, effectiveTier, tierSource, and tierUntil from the returned
 * DTO while preserving entitlements and all other public fields.
 *
 * Also proves default behavior (stripBillingDetails absent / false) is unchanged
 * for backward compatibility and for authenticated owner/admin paths.
 *
 * No DB, no Express, no network, no env. Direct in-process assertions on
 * synthetic card fixtures. Exits 0 on all pass, non-zero on first failure.
 *
 * Run: node backend/scripts/sanity-card-dto-billing-public-policy.mjs
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

// ── fixtures ─────────────────────────────────────────────────────────────────

// Fixture A: paid user-owned card (billing.status=active, paidUntil in the future).
// This is the highest-sensitivity case: effectiveBilling.source="billing",
// plan="monthly", until=<paidUntil ISO> must NOT appear in the public DTO.
function makePaidUserCard() {
    return {
        _id: "aaa000000000000000000001",
        slug: "paid-user-card",
        status: "published",
        isActive: true,
        user: "bbb000000000000000000001",
        billing: {
            status: "active",
            plan: "monthly",
            paidUntil: new Date("2026-12-31T23:59:59.000Z"),
        },
        business: { name: "Paid User Co" },
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

// Fixture B: admin-override card. Exposes source="adminOverride" and an until date.
// tierSource would be "cardAdminTier" if card.adminTier is set — also sensitive.
function makeAdminOverrideCard() {
    return {
        _id: "aaa000000000000000000002",
        slug: "admin-override-card",
        status: "published",
        isActive: true,
        user: "bbb000000000000000000002",
        adminOverride: {
            plan: "monthly",
            until: new Date("2027-06-01T00:00:00.000Z"),
        },
        adminTier: "premium",
        adminTierUntil: new Date("2027-06-01T00:00:00.000Z"),
        billing: { status: "free", plan: "free", paidUntil: null },
        business: { name: "Admin Override Co" },
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

// Fixture C: free user-owned card. effectiveBilling.source="free".
// Least sensitive, but stripping still applies when stripBillingDetails=true.
function makeFreeUserCard() {
    return {
        _id: "aaa000000000000000000003",
        slug: "free-user-card",
        status: "published",
        isActive: true,
        user: "bbb000000000000000000003",
        billing: { status: "free", plan: "free", paidUntil: null },
        business: { name: "Free User Co" },
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

// ── Fixture 1: default behavior — billing details present ────────────────────
// Proves backward compat: existing callers that do not pass stripBillingDetails
// still receive effectiveBilling, effectiveTier, tierSource, tierUntil.
{
    const dto = toCardDTO(makePaidUserCard(), NOW);

    assert(
        "default: effectiveBilling is present",
        Object.prototype.hasOwnProperty.call(dto, "effectiveBilling"),
    );
    assert(
        "default: effectiveTier is present",
        Object.prototype.hasOwnProperty.call(dto, "effectiveTier"),
    );
    assert(
        "default: tierSource is present",
        Object.prototype.hasOwnProperty.call(dto, "tierSource"),
    );
    assert(
        "default: tierUntil present (may be null for paid card w/ no adminTier)",
        Object.prototype.hasOwnProperty.call(dto, "tierUntil"),
    );
    assert(
        "default: effectiveBilling.source is billing for paid card",
        dto.effectiveBilling?.source === "billing",
    );
    assert(
        "default: entitlements is present",
        Object.prototype.hasOwnProperty.call(dto, "entitlements"),
    );
}

// ── Fixture 2: stripBillingDetails:false — same as default ──────────────────
{
    const dto = toCardDTO(makePaidUserCard(), NOW, {
        stripBillingDetails: false,
    });

    assert(
        "stripBillingDetails:false — effectiveBilling present",
        Object.prototype.hasOwnProperty.call(dto, "effectiveBilling"),
    );
    assert(
        "stripBillingDetails:false — effectiveTier present",
        Object.prototype.hasOwnProperty.call(dto, "effectiveTier"),
    );
    assert(
        "stripBillingDetails:false — tierSource present",
        Object.prototype.hasOwnProperty.call(dto, "tierSource"),
    );
    assert(
        "stripBillingDetails:false — tierUntil present",
        Object.prototype.hasOwnProperty.call(dto, "tierUntil"),
    );
    assert(
        "stripBillingDetails:false — entitlements present",
        Object.prototype.hasOwnProperty.call(dto, "entitlements"),
    );
}

// ── Fixture 3: paid card — stripBillingDetails:true strips all four fields ──
{
    const dto = toCardDTO(makePaidUserCard(), NOW, {
        stripBillingDetails: true,
    });

    assert(
        "paid + strip: effectiveBilling absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveBilling"),
    );
    assert(
        "paid + strip: effectiveTier absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveTier"),
    );
    assert(
        "paid + strip: tierSource absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierSource"),
    );
    assert(
        "paid + strip: tierUntil absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierUntil"),
    );
    assert(
        "paid + strip: entitlements retained",
        Object.prototype.hasOwnProperty.call(dto, "entitlements"),
    );
    assert(
        "paid + strip: entitlements has canUseGallery",
        Object.prototype.hasOwnProperty.call(
            dto.entitlements || {},
            "canUseGallery",
        ),
    );
    assert(
        "paid + strip: entitlements has canUseServices",
        Object.prototype.hasOwnProperty.call(
            dto.entitlements || {},
            "canUseServices",
        ),
    );
    // paidUntil must not leak through any remaining field
    const dtoStr = JSON.stringify(dto);
    assert(
        "paid + strip: paidUntil date string not in public DTO JSON",
        !dtoStr.includes("2026-12-31"),
    );
    assert(
        "paid + strip: source:billing string not in public DTO JSON",
        !dtoStr.includes('"source":"billing"'),
    );
    assert(
        "paid + strip: slug and business.name retained",
        dto.slug === "paid-user-card" && dto.business?.name === "Paid User Co",
    );
}

// ── Fixture 4: admin override card — stripBillingDetails:true ───────────────
{
    const dto = toCardDTO(makeAdminOverrideCard(), NOW, {
        stripBillingDetails: true,
    });

    assert(
        "admin-override + strip: effectiveBilling absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveBilling"),
    );
    assert(
        "admin-override + strip: effectiveTier absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveTier"),
    );
    assert(
        "admin-override + strip: tierSource absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierSource"),
    );
    assert(
        "admin-override + strip: tierUntil absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierUntil"),
    );
    assert(
        "admin-override + strip: entitlements retained",
        Object.prototype.hasOwnProperty.call(dto, "entitlements"),
    );
    // Override expiry must not leak through any remaining field
    const dtoStr = JSON.stringify(dto);
    assert(
        "admin-override + strip: override until date not in public DTO JSON",
        !dtoStr.includes("2027-06-01"),
    );
    assert(
        "admin-override + strip: adminOverride string not in public DTO JSON",
        !dtoStr.includes('"source":"adminOverride"'),
    );
}

// ── Fixture 5: includePrivate:true + no stripBillingDetails ─────────────────
// Admin/debug path must still receive all detailed billing fields.
{
    const dto = toCardDTO(makePaidUserCard(), NOW, { includePrivate: true });

    assert(
        "includePrivate:true — effectiveBilling present (admin path preserved)",
        Object.prototype.hasOwnProperty.call(dto, "effectiveBilling"),
    );
    assert(
        "includePrivate:true — effectiveTier present",
        Object.prototype.hasOwnProperty.call(dto, "effectiveTier"),
    );
    assert(
        "includePrivate:true — tierSource present",
        Object.prototype.hasOwnProperty.call(dto, "tierSource"),
    );
    assert(
        "includePrivate:true — tierUntil present",
        Object.prototype.hasOwnProperty.call(dto, "tierUntil"),
    );
    assert(
        "includePrivate:true — raw billing present (private block)",
        Object.prototype.hasOwnProperty.call(dto, "billing"),
    );
    assert(
        "includePrivate:true — entitlements present",
        Object.prototype.hasOwnProperty.call(dto, "entitlements"),
    );
}

// ── Fixture 6: free user card — stripBillingDetails:true still strips ───────
{
    const dto = toCardDTO(makeFreeUserCard(), NOW, {
        stripBillingDetails: true,
    });

    assert(
        "free + strip: effectiveBilling absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveBilling"),
    );
    assert(
        "free + strip: effectiveTier absent",
        !Object.prototype.hasOwnProperty.call(dto, "effectiveTier"),
    );
    assert(
        "free + strip: tierSource absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierSource"),
    );
    assert(
        "free + strip: tierUntil absent",
        !Object.prototype.hasOwnProperty.call(dto, "tierUntil"),
    );
    assert(
        "free + strip: entitlements retained",
        Object.prototype.hasOwnProperty.call(dto, "entitlements"),
    );
    assert("free + strip: slug retained", dto.slug === "free-user-card");
}

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`\nTOTAL ${total} | FAILED ${failed}`);
