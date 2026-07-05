/**
 * Fixture-only sanity for public card DTO design-path and gallery-path safety
 * (toCardDTO).
 *
 * No DB, no Express, no network, no env. Direct in-process assertions on
 * synthetic card fixtures. Exits 0 on pass, non-zero on first failure.
 *
 * Invariants under test:
 *   - Public (includePrivate=false) DTOs must NOT expose internal raw
 *     storage-path design fields (backgroundImagePath, coverImagePath,
 *     avatarImagePath, logoPath) for either user-owned or anonymous cards.
 *   - Public (includePrivate=false) DTOs must NOT expose raw internal gallery
 *     storage-path fields (path, thumbPath) for any card type.
 *   - Public DTOs MUST preserve the public URL design fields used for
 *     rendering (backgroundImage, coverImage, avatarImage, logo).
 *   - Public DTOs MUST preserve the public URL gallery fields used for
 *     rendering (url, thumbUrl).
 *   - Private (includePrivate=true) DTOs retain all raw path fields for
 *     admin/debug.
 *
 * Run: node backend/scripts/sanity-card-dto-design-paths.mjs
 */

import { toCardDTO } from "../src/utils/cardDTO.js";

const NOW = new Date("2025-01-01T00:00:00.000Z");

const INTERNAL_DESIGN_PATH_FIELDS = [
    "backgroundImagePath",
    "coverImagePath",
    "avatarImagePath",
    "logoPath",
];

const PUBLIC_DESIGN_URL_FIELDS = [
    "backgroundImage",
    "coverImage",
    "avatarImage",
    "logo",
];

const INTERNAL_GALLERY_PATH_FIELDS = ["path", "thumbPath"];
const PUBLIC_GALLERY_URL_FIELDS = ["url", "thumbUrl"];

let failed = 0;
let total = 0;

function assert(cond, label) {
    total += 1;
    if (cond) {
        console.log("PASS  " + label);
    } else {
        failed += 1;
        console.log("FAIL  " + label);
    }
}

function makeDesign() {
    return {
        templateId: "classic",
        backgroundOverlay: 40,
        backgroundImage:
            "https://x.supabase.co/storage/v1/object/public/cards-images/cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/background/bg.webp",
        coverImage:
            "https://x.supabase.co/storage/v1/object/public/cards-images/cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/background/bg.webp",
        avatarImage:
            "https://x.supabase.co/storage/v1/object/public/cards-images/cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/avatar/av.webp",
        logo: "https://x.supabase.co/storage/v1/object/public/cards-images/cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/avatar/av.webp",
        backgroundImagePath:
            "cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/background/bg.webp",
        coverImagePath:
            "cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/background/bg.webp",
        avatarImagePath:
            "cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/avatar/av.webp",
        logoPath:
            "cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/avatar/av.webp",
    };
}

function makeGallery() {
    return [
        {
            url: "https://x.supabase.co/storage/v1/object/public/cards-images/cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/gallery/g1.webp",
            path: "cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/gallery/g1.webp",
            thumbUrl:
                "https://x.supabase.co/storage/v1/object/public/cards-images/cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/gallery/g1-thumb.webp",
            thumbPath:
                "cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/gallery/g1-thumb.webp",
        },
    ];
}

function makeUserCard() {
    return {
        _id: "bbbbbbbbbbbbbbbbbbbbbbbb",
        user: "aaaaaaaaaaaaaaaaaaaaaaaa",
        slug: "user-card",
        status: "published",
        isActive: true,
        business: { name: "Acme" },
        design: makeDesign(),
        gallery: makeGallery(),
        createdAt: NOW,
        updatedAt: NOW,
    };
}

// Premium user card: billing gives gallery entitlement so the gallery
// entitlement gate does NOT empty gallery before the strip runs.
function makePremiumUserCard() {
    return {
        _id: "bbbbbbbbbbbbbbbbbbbbbbbc",
        user: "aaaaaaaaaaaaaaaaaaaaaaaa",
        slug: "premium-user-card",
        status: "published",
        isActive: true,
        business: { name: "PremiumCo" },
        billing: {
            status: "active",
            plan: "monthly",
            paidUntil: new Date("2030-01-01T00:00:00.000Z"),
        },
        design: makeDesign(),
        gallery: makeGallery(),
        createdAt: NOW,
        updatedAt: NOW,
    };
}

function makeAnonCard() {
    return {
        _id: "cccccccccccccccccccccccc",
        user: null,
        anonymousId: "anon-123",
        slug: "anon-card",
        status: "published",
        isActive: true,
        business: { name: "Anon" },
        design: makeDesign(),
        gallery: makeGallery(),
        createdAt: NOW,
        updatedAt: NOW,
    };
}

function designOf(dto) {
    return dto && typeof dto.design === "object" && dto.design
        ? dto.design
        : {};
}

/* ───────── Fixture 1: user-owned public DTO ───────── */
{
    const dto = toCardDTO(makeUserCard(), NOW, { includePrivate: false });
    const design = designOf(dto);
    for (const key of INTERNAL_DESIGN_PATH_FIELDS) {
        assert(
            !Object.prototype.hasOwnProperty.call(design, key),
            "user public DTO: design has no " + key,
        );
    }
    for (const key of PUBLIC_DESIGN_URL_FIELDS) {
        assert(
            typeof design[key] === "string" && design[key].length > 0,
            "user public DTO: design preserves " + key,
        );
    }
}

/* ───────── Fixture 2: anonymous public DTO ───────── */
{
    const dto = toCardDTO(makeAnonCard(), NOW, { includePrivate: false });
    const design = designOf(dto);
    for (const key of INTERNAL_DESIGN_PATH_FIELDS) {
        assert(
            !Object.prototype.hasOwnProperty.call(design, key),
            "anon public DTO: design has no " + key,
        );
    }
    for (const key of PUBLIC_DESIGN_URL_FIELDS) {
        assert(
            typeof design[key] === "string" && design[key].length > 0,
            "anon public DTO: design preserves " + key,
        );
    }
}

/* ───────── Fixture 3: user-owned private DTO retains raw paths ───────── */
{
    const dto = toCardDTO(makeUserCard(), NOW, { includePrivate: true });
    const design = designOf(dto);
    for (const key of INTERNAL_DESIGN_PATH_FIELDS) {
        assert(
            typeof design[key] === "string" && design[key].length > 0,
            "user private DTO: design retains " + key,
        );
    }
    // Gallery entitlement gate is bypassed for includePrivate=true, so items appear.
    const gallery = Array.isArray(dto?.gallery) ? dto.gallery : [];
    assert(gallery.length === 1, "user private DTO: gallery length preserved");
    const g0 = gallery[0] || {};
    for (const key of INTERNAL_GALLERY_PATH_FIELDS) {
        assert(
            typeof g0[key] === "string" && g0[key].length > 0,
            "user private DTO: gallery item retains " + key,
        );
    }
    for (const key of PUBLIC_GALLERY_URL_FIELDS) {
        assert(
            typeof g0[key] === "string" && g0[key].length > 0,
            "user private DTO: gallery item preserves " + key,
        );
    }
}

/* ───────── Fixture 4: premium user public DTO gallery strip ───────── */
// Gallery entitlement gate passes because billing.status = "active" +
// future paidUntil, while plan = "monthly".
// Items must be present so the strip assertion is not vacuous.
{
    const dto = toCardDTO(makePremiumUserCard(), NOW, {
        includePrivate: false,
    });
    const gallery = Array.isArray(dto?.gallery) ? dto.gallery : [];
    assert(
        gallery.length > 0,
        "premium user public DTO: gallery not emptied by entitlement gate",
    );
    const g0 = gallery[0] || {};
    for (const key of INTERNAL_GALLERY_PATH_FIELDS) {
        assert(
            !Object.prototype.hasOwnProperty.call(g0, key),
            "premium user public DTO: gallery item has no " + key,
        );
    }
    for (const key of PUBLIC_GALLERY_URL_FIELDS) {
        assert(
            typeof g0[key] === "string" && g0[key].length > 0,
            "premium user public DTO: gallery item preserves " + key,
        );
    }
}

console.log("");
console.log("TOTAL " + total + " | FAILED " + failed);
process.exitCode = failed === 0 ? 0 : 1;
