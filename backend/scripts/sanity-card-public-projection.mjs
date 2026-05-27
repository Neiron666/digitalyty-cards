/**
 * Phase 2B1 fixture-only sanity for cardPublicProjection helpers.
 *
 * No DB, no Express, no network, no env. Direct in-process assertions on
 * synthetic public-DTO fixtures. Exits 0 on pass, non-zero on first failure.
 *
 * Run: node backend/scripts/sanity-card-public-projection.mjs
 */

import {
    toCardPublicSeoDTO,
    toCardPublicRenderDTO,
} from "../src/utils/cardPublicProjection.util.js";

const SITE_URL = "https://cardigo.co.il";
const PUBLIC_URL = "https://cardigo.co.il/card/example-slug";
const CTX = { siteUrl: SITE_URL, publicUrl: PUBLIC_URL };

let failed = 0;
let total = 0;

function isPlain(v) {
    return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function assert(cond, label) {
    total += 1;
    if (cond) {
        console.log("PASS  " + label);
    } else {
        failed += 1;
        console.log("FAIL  " + label);
    }
}

function expectThrow(fn, label) {
    total += 1;
    try {
        fn();
        failed += 1;
        console.log("FAIL  " + label + " (expected throw)");
    } catch (e) {
        if (e instanceof TypeError) {
            console.log("PASS  " + label + " — " + e.message.slice(0, 80));
        } else {
            failed += 1;
            console.log(
                "FAIL  " +
                    label +
                    " (expected TypeError, got " +
                    (e?.constructor?.name || typeof e) +
                    ")",
            );
        }
    }
}

/* ───────── Fixture 1: nested seo.headSnippets → TypeError ───────── */
expectThrow(
    () =>
        toCardPublicSeoDTO(
            {
                business: { name: "Acme" },
                seo: { title: "x", headSnippets: ["<meta name=evil>"] },
            },
            CTX,
        ),
    "F1 seo.headSnippets present → TypeError",
);

/* ───────── Fixture 2: forbidden top-level billing → TypeError ───── */
expectThrow(
    () =>
        toCardPublicSeoDTO(
            {
                business: { name: "Acme" },
                billing: { provider: "tranzila", isPaid: true },
            },
            CTX,
        ),
    "F2 top-level billing present → TypeError",
);

/* ───────── Fixture 2b: provider field tranzila → TypeError ──────── */
expectThrow(
    () =>
        toCardPublicSeoDTO(
            { business: { name: "Acme" }, tranzila: { token: "secret" } },
            CTX,
        ),
    "F2b top-level tranzila present → TypeError",
);

/* ───────── Fixture 3: free/noindex robots ───────────────────────── */
{
    const dto = {
        slug: "free-card",
        business: { name: "Free Biz" },
        seo: { robots: "noindex" },
    };
    const out = toCardPublicSeoDTO(dto, CTX);
    assert(
        out.robotsResolved.includes("noindex"),
        "F3 free → robotsResolved contains noindex",
    );
    assert(out.indexable === false, "F3 free → indexable === false");
}

/* ───────── Fixture 4: premium/index → canonical/og parity ───────── */
{
    const dto = {
        slug: "premium-card",
        business: { name: "Premium Biz", category: "Consulting" },
        seo: { title: "Premium Biz – Consulting", robots: "index, follow" },
        design: { coverImage: "https://cdn.example.com/cover.jpg" },
    };
    const out = toCardPublicSeoDTO(dto, CTX);
    assert(out.canonicalUrl === PUBLIC_URL, "F4 canonicalUrl === publicUrl");
    assert(out.ogUrl === PUBLIC_URL, "F4 ogUrl === publicUrl");
    assert(out.indexable === true, "F4 indexable === true");
    assert(
        out.robotsResolved === "index, follow",
        "F4 robotsResolved === 'index, follow'",
    );
    assert(
        out.twitterCard === "summary_large_image",
        "F4 twitterCard === summary_large_image (non-fallback image)",
    );
    assert(
        out.ogImage === "https://cdn.example.com/cover.jpg",
        "F4 ogImage uses design.coverImage",
    );
    assert(out.ogType === "website", "F4 ogType === 'website' (Phase 2B1)");
}

/* ───────── Fixture 4b: ignore user-supplied seo.canonicalUrl ────── */
{
    const dto = {
        slug: "phish",
        business: { name: "Phisher" },
        seo: {
            title: "Legit",
            canonicalUrl: "https://attacker.example.com/owned",
        },
    };
    const out = toCardPublicSeoDTO(dto, CTX);
    assert(
        out.canonicalUrl === PUBLIC_URL,
        "F4b canonicalUrl ignores dto.seo.canonicalUrl",
    );
}

/* ───────── Fixture 5: valid LocalBusiness JSON-LD ───────────────── */
{
    const dto = {
        business: { name: "LB Biz" },
        seo: {
            jsonLd: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                name: "LB Biz",
            }),
        },
    };
    const out = toCardPublicSeoDTO(dto, CTX);
    assert(
        Array.isArray(out.jsonLdItems) && out.jsonLdItems.length === 1,
        "F5 jsonLdItems length === 1",
    );
    assert(
        out.jsonLdItems[0]?.["@type"] === "LocalBusiness",
        "F5 jsonLdItems[0] is LocalBusiness",
    );
}

/* ───────── Fixture 6: bad jsonLd (@graph + script) rejected ─────── */
{
    const dto = {
        business: { name: "Bad" },
        seo: {
            jsonLd: [
                { "@context": "https://schema.org", "@graph": [{}] },
                {
                    "@context": "https://schema.org",
                    "@type": "Person",
                    name: "x</script><script>alert(1)</script>",
                },
            ],
        },
    };
    const out = toCardPublicSeoDTO(dto, CTX);
    assert(
        Array.isArray(out.jsonLdItems) && out.jsonLdItems.length === 0,
        "F6 jsonLdItems excludes @graph and <script payloads (length 0)",
    );
}

/* ───────── Fixture 6b: unparseable string → [] ──────────────────── */
{
    const dto = {
        business: { name: "Bad" },
        seo: { jsonLd: "{not json" },
    };
    const out = toCardPublicSeoDTO(dto, CTX);
    assert(
        Array.isArray(out.jsonLdItems) && out.jsonLdItems.length === 0,
        "F6b unparseable jsonLd string → []",
    );
}

/* ───────── Fixture 7: gallery raw storage keys dropped ──────────── */
{
    const dto = {
        business: { name: "Gallery Biz" },
        gallery: [
            {
                url: "https://cdn.example.com/i1.jpg",
                alt: "one",
                width: 800,
                height: 600,
                storagePath: "anon/abc/i1.jpg",
                bucket: "private-bucket",
                internalId: "img_xyz",
                path: "anon/abc/i1.jpg",
                thumbPath: "anon/abc/i1-thumb.jpg",
            },
            { storagePath: "anon/abc/i2.jpg" }, // no url → dropped
        ],
    };
    const out = toCardPublicRenderDTO(dto, CTX);
    assert(out.gallery.length === 1, "F7 gallery length === 1 (no-url dropped)");
    const g0 = out.gallery[0];
    assert(g0.url === "https://cdn.example.com/i1.jpg", "F7 gallery[0].url");
    assert(g0.alt === "one", "F7 gallery[0].alt");
    assert(g0.width === 800 && g0.height === 600, "F7 gallery[0] w/h preserved");
    for (const k of [
        "storagePath",
        "bucket",
        "internalId",
        "path",
        "thumbPath",
    ]) {
        assert(
            !Object.prototype.hasOwnProperty.call(g0, k),
            "F7 gallery[0] excludes key " + k,
        );
    }
}

/* ───────── Fixture 8: ctx validation ────────────────────────────── */
expectThrow(
    () =>
        toCardPublicSeoDTO(
            { business: { name: "A" } },
            { siteUrl: SITE_URL, publicUrl: "http://cardigo.co.il/card/x" },
        ),
    "F8 ctx.publicUrl non-https → TypeError",
);
expectThrow(
    () =>
        toCardPublicSeoDTO(
            { business: { name: "A" } },
            { siteUrl: SITE_URL, publicUrl: "https://evil.example.com/x" },
        ),
    "F8 ctx.publicUrl host mismatch → TypeError",
);
expectThrow(
    () =>
        toCardPublicSeoDTO(
            { business: { name: "A" } },
            { siteUrl: SITE_URL, publicUrl: "/card/x" },
        ),
    "F8 ctx.publicUrl relative → TypeError",
);

/* ───────── Fixture 9: render DTO does not leak forbidden keys ───── */
{
    const dto = {
        business: { name: "Render Biz", category: "Plumbing" },
        content: {
            aboutParagraphs: ["Para one.", "Para two."],
            aboutText: "Para one.\n\nPara two.",
            services: [
                { title: "Service A", description: "Desc A" },
                { name: "Service B" },
                { invalid: true }, // dropped (no title/name)
            ],
        },
        faq: [
            { question: "Q1", answer: "A1" },
            { question: "", answer: "x" }, // dropped
        ],
        contact: { phone: "050", email: "a@b.co", website: "https://x" },
    };
    const out = toCardPublicRenderDTO(dto, CTX);
    assert(out.displayName === "Render Biz", "F9 displayName");
    assert(out.subtitle === "Plumbing", "F9 subtitle from business.category");
    assert(out.aboutParagraphs.length === 2, "F9 aboutParagraphs length 2");
    assert(out.services.length === 2, "F9 services length 2 (invalid dropped)");
    assert(out.faqItems.length === 1, "F9 faqItems length 1 (empty dropped)");
    assert(out.contactLinks.phone === "050", "F9 contactLinks.phone");
    // Phase 2B1: render DTO must NOT expose skin/theme/palette/templateId.
    for (const k of ["skin", "theme", "palette", "templateId"]) {
        assert(
            !Object.prototype.hasOwnProperty.call(out, k),
            "F9 render DTO excludes key " + k,
        );
    }
}

/* ───────── Fixture 10: businessHours strict narrowing ──────────── */
{
    const dto = {
        business: { name: "BH Biz" },
        businessHours: {
            v: 1,
            enabled: true,
            // Forbidden / unexpected keys that MUST NOT pass through.
            _id: "65fakeid",
            ownerId: "user_secret",
            internalNote: "private admin note",
            __v: 7,
            providerToken: "tranzila_secret",
            week: {
                sun: { open: false, intervals: [] },
                mon: {
                    open: true,
                    intervals: [
                        { start: "09:00", end: "13:00" },
                        { start: "16:00", end: "19:30" },
                        { start: "20:00", end: "21:15" }, // not :00/:30 → dropped
                        { start: "22:00", end: "23:00" },
                        { start: "23:30", end: "23:30" }, // 5th → cap drops it
                    ],
                    // Unexpected day-level keys must be dropped.
                    adminFlag: true,
                    notes: "internal",
                },
                tue: { open: false, intervals: [] },
                wed: { open: false, intervals: [] },
                thu: { open: false, intervals: [] },
                fri: { open: false, intervals: [] },
                sat: { open: false, intervals: [] },
                // Unexpected day key must not appear in projection.
                holiday: { open: true, intervals: [{ start: "10:00", end: "12:00" }] },
            },
        },
    };
    const out = toCardPublicRenderDTO(dto, CTX);
    const bh = out.businessHours;
    assert(isPlain(bh), "F10 businessHours is plain object");
    assert(bh.enabled === true, "F10 enabled passthrough");
    // Forbidden top-level keys dropped.
    for (const k of [
        "v",
        "_id",
        "ownerId",
        "internalNote",
        "__v",
        "providerToken",
    ]) {
        assert(
            !Object.prototype.hasOwnProperty.call(bh, k),
            "F10 businessHours excludes key " + k,
        );
    }
    // Week contains exactly the 7 weekday keys.
    const weekKeys = Object.keys(bh.week);
    assert(weekKeys.length === 7, "F10 week has exactly 7 day keys");
    assert(!weekKeys.includes("holiday"), "F10 week excludes unexpected 'holiday'");
    for (const d of ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]) {
        assert(weekKeys.includes(d), "F10 week has key " + d);
    }
    // mon: cap to 4, drop :15 interval, drop unexpected day-level keys.
    const mon = bh.week.mon;
    assert(mon.open === true, "F10 mon.open === true");
    assert(Array.isArray(mon.intervals), "F10 mon.intervals is array");
    assert(
        mon.intervals.length === 3,
        "F10 mon.intervals length 3 (4-cap then invalid HH:mm dropped)",
    );
    for (const k of ["adminFlag", "notes"]) {
        assert(
            !Object.prototype.hasOwnProperty.call(mon, k),
            "F10 mon excludes key " + k,
        );
    }
    // Each interval has only start/end.
    for (const iv of mon.intervals) {
        const ks = Object.keys(iv).sort();
        assert(
            ks.length === 2 && ks[0] === "end" && ks[1] === "start",
            "F10 interval has only {start,end}",
        );
    }
}

/* ───────── Fixture 10b: businessHours scalar/invalid → null ─────── */
{
    const dto1 = { business: { name: "x" }, businessHours: "not an object" };
    assert(
        toCardPublicRenderDTO(dto1, CTX).businessHours === null,
        "F10b scalar businessHours → null",
    );
    const dto2 = { business: { name: "x" }, businessHours: [1, 2, 3] };
    assert(
        toCardPublicRenderDTO(dto2, CTX).businessHours === null,
        "F10b array businessHours → null (not a plain BH object)",
    );
    const dto3 = { business: { name: "x" }, businessHours: null };
    assert(
        toCardPublicRenderDTO(dto3, CTX).businessHours === null,
        "F10b null businessHours → null",
    );
}

/* ───────── Summary ──────────────────────────────────────────────── */
console.log("\n----------------------------------------");
console.log("Total: " + total + "  Failed: " + failed);
if (failed > 0) {
    process.exitCode = 1;
}
