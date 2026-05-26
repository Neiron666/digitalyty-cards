/**
 * Phase 2A-6: SSG output validation.
 *
 * Validates the 5 files produced by generate-static.mjs:
 *   dist/spa-shell.html
 *   dist/index.html
 *   dist/cards/index.html
 *   dist/pricing/index.html
 *   dist/contact/index.html
 *
 * Run after:
 *   1. vite build
 *   2. vite build --ssr src/entry-server.jsx
 *   3. node scripts/generate-static.mjs
 *
 * Reads dist/ only. No writes. No network. No subprocesses.
 * Collects all errors and exits 1 on any failure.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");

const ROUTES = [
    {
        label: "spa-shell",
        file: "spa-shell.html",
        expectRootFilled: false,
        sizeMin: 2000,
        sizeMax: 8000,
        canonicalCount: 0,
        canonicalValue: null,
        ogUrlCount: 1,
        ogUrlValue: "https://cardigo.co.il/",
        homepageLeakCheck: false,
        // jsonLdExpected: 0  → exact count; null → min >= 1
        jsonLdExpected: 0,
        requireHebrew: false,
    },
    {
        label: "home",
        file: "index.html",
        expectRootFilled: true,
        sizeMin: 10001,
        sizeMax: null,
        canonicalCount: 1,
        canonicalValue: "https://cardigo.co.il/",
        ogUrlCount: 1,
        ogUrlValue: "https://cardigo.co.il/",
        homepageLeakCheck: false,
        jsonLdExpected: null,
        requireHebrew: true,
    },
    {
        label: "cards",
        file: "cards/index.html",
        expectRootFilled: true,
        sizeMin: 10001,
        sizeMax: null,
        canonicalCount: 1,
        canonicalValue: "https://cardigo.co.il/cards/",
        ogUrlCount: 1,
        ogUrlValue: "https://cardigo.co.il/cards/",
        homepageLeakCheck: true,
        jsonLdExpected: null,
        requireHebrew: true,
        jsonLdMustInclude: [
            "https://cardigo.co.il/cards/",
            "https://cardigo.co.il/cards/#faq",
        ],
        jsonLdMustNotInclude: [
            "https://cardigo.co.il/cards#faq",
            '"https://cardigo.co.il/cards"',
        ],
    },
    {
        label: "pricing",
        file: "pricing/index.html",
        expectRootFilled: true,
        sizeMin: 10001,
        sizeMax: null,
        canonicalCount: 1,
        canonicalValue: "https://cardigo.co.il/pricing/",
        ogUrlCount: 1,
        ogUrlValue: "https://cardigo.co.il/pricing/",
        homepageLeakCheck: true,
        jsonLdExpected: null,
        requireHebrew: true,
        jsonLdMustInclude: [
            "https://cardigo.co.il/pricing/",
            "https://cardigo.co.il/pricing/#faq",
        ],
        jsonLdMustNotInclude: [
            "https://cardigo.co.il/pricing#faq",
            '"https://cardigo.co.il/pricing"',
        ],
    },
    {
        label: "contact",
        file: "contact/index.html",
        expectRootFilled: true,
        sizeMin: 10001,
        sizeMax: null,
        canonicalCount: 1,
        canonicalValue: "https://cardigo.co.il/contact/",
        ogUrlCount: 1,
        ogUrlValue: "https://cardigo.co.il/contact/",
        homepageLeakCheck: true,
        jsonLdExpected: null,
        requireHebrew: true,
        jsonLdMustInclude: [
            "https://cardigo.co.il/contact/",
            "https://cardigo.co.il/contact/#faq",
        ],
        jsonLdMustNotInclude: [
            "https://cardigo.co.il/contact#faq",
            '"https://cardigo.co.il/contact"',
        ],
    },
    {
        label: "blog",
        file: "blog/index.html",
        expectRootFilled: true,
        sizeMin: 10001,
        sizeMax: null,
        canonicalCount: 1,
        canonicalValue: "https://cardigo.co.il/blog/",
        ogUrlCount: 1,
        ogUrlValue: "https://cardigo.co.il/blog/",
        homepageLeakCheck: true,
        jsonLdExpected: null,
        requireHebrew: true,
        jsonLdMustInclude: [
            "https://cardigo.co.il/blog/",
            "https://cardigo.co.il/blog/#faq",
        ],
        jsonLdMustNotInclude: [
            "https://cardigo.co.il/blog#faq",
            '"https://cardigo.co.il/blog"',
        ],
        dataIslandRequired: true,
        dataIslandKey: "blog",
        detailHrefPrefix: "/blog/",
    },
    {
        label: "guides",
        file: "guides/index.html",
        expectRootFilled: true,
        sizeMin: 10001,
        sizeMax: null,
        canonicalCount: 1,
        canonicalValue: "https://cardigo.co.il/guides/",
        ogUrlCount: 1,
        ogUrlValue: "https://cardigo.co.il/guides/",
        homepageLeakCheck: true,
        jsonLdExpected: null,
        requireHebrew: true,
        jsonLdMustInclude: [
            "https://cardigo.co.il/guides/",
            "https://cardigo.co.il/guides/#faq",
        ],
        jsonLdMustNotInclude: [
            "https://cardigo.co.il/guides#faq",
            '"https://cardigo.co.il/guides"',
        ],
        dataIslandRequired: true,
        dataIslandKey: "guides",
        detailHrefPrefix: "/guides/",
    },
];

const DATA_ISLAND_ELEMENT_ID = "cardigo-initial-listing-data";
const listingFullness = { blog: "N/A", guides: "N/A" };

// ---- helpers ----

/**
 * Return all opening tags matching tagName (e.g. "link", "meta", "title").
 * Uses \b to avoid matching e.g. <titled> for tagName "title".
 */
function getTags(html, tagName) {
    return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

/**
 * Extract a single attribute value from an already-matched tag string.
 * Handles both double and single quotes. Attribute order independent.
 */
function getAttr(tag, attrName) {
    const match = tag.match(new RegExp(`${attrName}=["']([^"']+)["']`, "i"));
    return match?.[1] ?? "";
}

/** Extract the inner text of the first <title> element. */
function getTitle(html) {
    return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "";
}

/** Count <script type="application/ld+json"> blocks. */
function countJsonLd(html) {
    return (html.match(/<script[^>]+application\/ld\+json/gi) ?? []).length;
}

// ---- validation ----

const errors = [];

function fail(label, msg) {
    errors.push(`[${label}] ${msg}`);
}

for (const route of ROUTES) {
    const filePath = path.join(DIST, route.file);
    const { label } = route;

    // 1. Existence
    if (!fs.existsSync(filePath)) {
        fail(label, `file not found: ${filePath}`);
        // Skip further checks — nothing to read.
        continue;
    }

    const html = fs.readFileSync(filePath, "utf8");
    const size = html.length;

    // 2. File size bounds
    if (size < route.sizeMin) {
        fail(label, `file size ${size} < minimum ${route.sizeMin}`);
    }
    if (route.sizeMax !== null && size > route.sizeMax) {
        fail(label, `file size ${size} > maximum ${route.sizeMax}`);
    }

    // 3. Root state
    const rootEmpty = html.includes('<div id="root"></div>');
    if (!route.expectRootFilled) {
        // spa-shell: root must be empty
        if (!rootEmpty) {
            fail(
                label,
                `expected empty root '<div id="root"></div>' but it is absent`,
            );
        }
    } else {
        // SSG route: root must be filled
        if (rootEmpty) {
            fail(
                label,
                `expected filled root but found empty '<div id="root"></div>'`,
            );
        } else if (!html.includes('<div id="root">')) {
            fail(label, `root element '<div id="root">' missing entirely`);
        } else if (html.length <= 10000) {
            fail(
                label,
                `root appears filled but file size ${html.length} <= 10000 (suspiciously small for SSG output)`,
            );
        }
    }

    // 4. Title
    const titleTags = getTags(html, "title");
    if (titleTags.length !== 1) {
        fail(label, `title count = ${titleTags.length}, expected 1`);
    }
    const titleText = getTitle(html);
    if (route.requireHebrew && !/[^\x00-\x7F]/.test(titleText)) {
        fail(label, `title has no non-ASCII/Hebrew text: "${titleText}"`);
    }

    // 5. Canonical
    const linkTags = getTags(html, "link");
    const canonicalTags = linkTags.filter(
        (t) => getAttr(t, "rel").toLowerCase() === "canonical",
    );
    if (canonicalTags.length !== route.canonicalCount) {
        fail(
            label,
            `canonical count = ${canonicalTags.length}, expected ${route.canonicalCount}`,
        );
    }
    const canonicalHref = canonicalTags[0]
        ? getAttr(canonicalTags[0], "href")
        : "";
    if (
        route.canonicalValue !== null &&
        canonicalHref !== route.canonicalValue
    ) {
        fail(
            label,
            `canonical href = "${canonicalHref}", expected "${route.canonicalValue}"`,
        );
    }

    // 6. og:url
    const metaTags = getTags(html, "meta");
    const ogUrlTags = metaTags.filter(
        (t) => getAttr(t, "property").toLowerCase() === "og:url",
    );
    if (ogUrlTags.length !== route.ogUrlCount) {
        fail(
            label,
            `og:url count = ${ogUrlTags.length}, expected ${route.ogUrlCount}`,
        );
    }
    const ogUrlContent = ogUrlTags[0] ? getAttr(ogUrlTags[0], "content") : "";
    if (route.ogUrlValue !== null && ogUrlContent !== route.ogUrlValue) {
        fail(
            label,
            `og:url content = "${ogUrlContent}", expected "${route.ogUrlValue}"`,
        );
    }

    // 7. Homepage canonical / og:url leak (applies to /cards, /pricing, /contact only)
    if (route.homepageLeakCheck) {
        if (canonicalHref === "https://cardigo.co.il/") {
            fail(label, `homepage canonical leak: href = "${canonicalHref}"`);
        }
        if (ogUrlContent === "https://cardigo.co.il/") {
            fail(label, `homepage og:url leak: content = "${ogUrlContent}"`);
        }
    }

    // 8. JSON-LD
    const jldCount = countJsonLd(html);
    if (route.jsonLdExpected === 0) {
        if (jldCount !== 0) {
            fail(
                label,
                `JSON-LD count = ${jldCount}, expected 0 (spa-shell must be JSON-LD-free)`,
            );
        }
    } else {
        // null → min >= 1
        if (jldCount < 1) {
            fail(label, `JSON-LD count = ${jldCount}, expected >= 1`);
        }
    }

    // 9. Vite module script
    if (!html.includes('type="module"')) {
        fail(label, `Vite module script missing (type="module" not found)`);
    }

    // 10. Netlify hidden form
    if (!html.includes('data-netlify="true"')) {
        fail(
            label,
            `Netlify hidden form missing (data-netlify="true" not found)`,
        );
    }

    // 11. JSON-LD URL identity guard (trailing-slash canonical policy).
    if (Array.isArray(route.jsonLdMustInclude)) {
        for (const needle of route.jsonLdMustInclude) {
            if (!html.includes(needle)) {
                fail(
                    label,
                    `JSON-LD must include "${needle}" but it is absent`,
                );
            }
        }
    }
    if (Array.isArray(route.jsonLdMustNotInclude)) {
        for (const needle of route.jsonLdMustNotInclude) {
            if (html.includes(needle)) {
                fail(
                    label,
                    `JSON-LD must NOT include "${needle}" but it is present`,
                );
            }
        }
    }

    // 12. Data island (listing routes only — blog, guides).
    if (route.dataIslandRequired) {
        const islandRe = new RegExp(
            `<script[^>]+type=["']application/json["'][^>]+id=["']${DATA_ISLAND_ELEMENT_ID}["'][^>]*>([\\s\\S]*?)</script>`,
            "gi",
        );
        const matches = [...html.matchAll(islandRe)];
        if (matches.length !== 1) {
            fail(
                label,
                `data island count = ${matches.length}, expected exactly 1 (id="${DATA_ISLAND_ELEMENT_ID}")`,
            );
            if (route.dataIslandKey) {
                listingFullness[route.dataIslandKey] = "DEGRADED";
            }
        } else {
            let parsed = null;
            try {
                parsed = JSON.parse(matches[0][1]);
            } catch {
                fail(label, `data island JSON.parse failed`);
            }
            const keyed =
                parsed && typeof parsed === "object" && !Array.isArray(parsed)
                    ? parsed[route.dataIslandKey]
                    : null;
            if (
                !keyed ||
                typeof keyed !== "object" ||
                !Array.isArray(keyed.items)
            ) {
                fail(
                    label,
                    `data island missing key "${route.dataIslandKey}" with items[] array`,
                );
                if (route.dataIslandKey) {
                    listingFullness[route.dataIslandKey] = "DEGRADED";
                }
            } else if (keyed.items.length === 0) {
                listingFullness[route.dataIslandKey] = "DEGRADED";
            } else {
                const first = keyed.items[0];
                const slug =
                    first && typeof first.slug === "string" ? first.slug : "";
                if (!slug) {
                    fail(label, `data island first item missing string slug`);
                    listingFullness[route.dataIslandKey] = "DEGRADED";
                } else {
                    const hrefNeedle = `href="${route.detailHrefPrefix}${slug}/"`;
                    if (!html.includes(hrefNeedle)) {
                        fail(
                            label,
                            `body missing detail link ${hrefNeedle} for first data-island item`,
                        );
                        listingFullness[route.dataIslandKey] = "DEGRADED";
                    } else {
                        listingFullness[route.dataIslandKey] = "FULL";
                    }
                }
            }
        }
    }
}

// ---- _redirects contract ----

const redirectsPath = path.join(DIST, "_redirects");

if (!fs.existsSync(redirectsPath)) {
    fail("_redirects", `file not found: ${redirectsPath}`);
} else {
    const redirectsContent = fs.readFileSync(redirectsPath, "utf8");
    const normLines = redirectsContent
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("#"))
        .map((l) => l.replace(/\s+/g, " "));

    const REQUIRED_RULES = [
        "/card/* /spa-shell.html 200",
        "/c/* /spa-shell.html 200",
        "/gate.html /spa-shell.html 404",
        "/* /spa-shell.html 200",
    ];

    for (const rule of REQUIRED_RULES) {
        if (!normLines.includes(rule)) {
            fail("_redirects", `required rule missing: "${rule}"`);
        }
    }

    // Reject old /index.html fallback only for the 4 SPA fallback source paths.
    const SPA_SOURCES = ["/card/*", "/c/*", "/gate.html", "/*"];
    for (const line of normLines) {
        const parts = line.split(" ");
        if (
            parts.length >= 3 &&
            SPA_SOURCES.includes(parts[0]) &&
            parts[1] === "/index.html"
        ) {
            fail(
                "_redirects",
                `old SPA fallback targeting /index.html found for source "${parts[0]}": "${line}"`,
            );
        }
    }

    // 4 = current SPA fallback rule count; update in lockstep with
    // frontend/public/_redirects when adding/removing spa-shell fallback rules.
    const spaShellCount = normLines.filter((l) =>
        l.includes("/spa-shell.html"),
    ).length;
    if (spaShellCount !== 4) {
        fail(
            "_redirects",
            `/spa-shell.html rule count = ${spaShellCount}, expected 4`,
        );
    }
}

// ---- detail family guard (Phase 2C) ----

const DETAIL_FAMILIES = [
    { dir: "blog", urlPrefix: "/blog/", jsonLdType: "BlogPosting" },
    { dir: "guides", urlPrefix: "/guides/", jsonLdType: "Article" },
];

const detailStatus = { blog: "N/A", guides: "N/A" };
const detailCounts = { blog: 0, guides: 0 };
const DETAIL_ISLAND_ID = "cardigo-initial-detail-data";

for (const fam of DETAIL_FAMILIES) {
    const famDir = path.join(DIST, fam.dir);
    if (!fs.existsSync(famDir) || !fs.statSync(famDir).isDirectory()) {
        detailStatus[fam.dir] = "DEGRADED";
        continue;
    }
    const slugDirs = fs
        .readdirSync(famDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);

    if (slugDirs.length === 0) {
        detailStatus[fam.dir] = "DEGRADED";
        continue;
    }

    let valid = 0;
    for (const slug of slugDirs) {
        const file = path.join(famDir, slug, "index.html");
        const label = `${fam.dir}/${slug}`;
        if (!fs.existsSync(file)) {
            fail(label, `missing ${path.relative(DIST, file)}`);
            continue;
        }
        const html = fs.readFileSync(file, "utf8");
        const size = html.length;
        if (size < 10000) {
            fail(label, `size ${size} < 10000`);
            continue;
        }

        const rootMatch = html.match(
            /<div id="root">([\s\S]*?)<\/div>\s*<script/,
        );
        if (!rootMatch || rootMatch[1].trim().length === 0) {
            fail(label, `#root is empty (spa-shell leak)`);
            continue;
        }

        const titleCount = (html.match(/<title[^>]*>[\s\S]*?<\/title>/g) || [])
            .length;
        if (titleCount !== 1) {
            fail(label, `title count = ${titleCount}, expected 1`);
            continue;
        }

        const expectedCanonical = `https://cardigo.co.il${fam.urlPrefix}${slug}/`;
        const canonicalMatches = [
            ...html.matchAll(
                /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/g,
            ),
        ];
        if (canonicalMatches.length !== 1) {
            fail(
                label,
                `canonical count = ${canonicalMatches.length}, expected 1`,
            );
            continue;
        }
        if (canonicalMatches[0][1] !== expectedCanonical) {
            fail(
                label,
                `canonical = "${canonicalMatches[0][1]}", expected "${expectedCanonical}"`,
            );
            continue;
        }

        const ogUrlMatches = [
            ...html.matchAll(
                /<meta\b[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["'][^>]*>/g,
            ),
        ];
        if (ogUrlMatches.length !== 1) {
            fail(label, `og:url count = ${ogUrlMatches.length}, expected 1`);
            continue;
        }
        if (ogUrlMatches[0][1] !== expectedCanonical) {
            fail(
                label,
                `og:url = "${ogUrlMatches[0][1]}", expected "${expectedCanonical}"`,
            );
            continue;
        }

        const ogTypeMatches = [
            ...html.matchAll(
                /<meta\b[^>]*property=["']og:type["'][^>]*content=["']([^"']+)["'][^>]*>/g,
            ),
        ];
        if (ogTypeMatches.length === 0 || ogTypeMatches[0][1] !== "article") {
            fail(label, `og:type missing or not "article"`);
            continue;
        }

        const jsonLdBlocks = [
            ...html.matchAll(
                /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g,
            ),
        ].map((m) => m[1]);
        if (jsonLdBlocks.length < 2) {
            fail(
                label,
                `JSON-LD blocks = ${jsonLdBlocks.length}, expected >= 2`,
            );
            continue;
        }
        const ldText = jsonLdBlocks.join("\n");
        if (!ldText.includes("#article")) {
            fail(label, `JSON-LD missing "#article" anchor`);
            continue;
        }
        if (!ldText.includes("BreadcrumbList")) {
            fail(label, `JSON-LD missing BreadcrumbList`);
            continue;
        }
        if (!ldText.includes(fam.jsonLdType)) {
            fail(label, `JSON-LD missing ${fam.jsonLdType} type`);
            continue;
        }

        // No homepage canonical leak
        if (
            canonicalMatches[0][1] === "https://cardigo.co.il/" ||
            ogUrlMatches[0][1] === "https://cardigo.co.il/"
        ) {
            fail(label, `homepage canonical/og:url leak`);
            continue;
        }

        // Detail data island
        const islandRe = new RegExp(
            `<script[^>]+type=["']application/json["'][^>]+id=["']${DETAIL_ISLAND_ID}["'][^>]*>([\\s\\S]*?)</script>`,
            "gi",
        );
        const islandMatches = [...html.matchAll(islandRe)];
        if (islandMatches.length !== 1) {
            fail(
                label,
                `detail data island count = ${islandMatches.length}, expected 1`,
            );
            continue;
        }
        let parsedIsland = null;
        try {
            parsedIsland = JSON.parse(islandMatches[0][1]);
        } catch {
            fail(label, `detail data island JSON.parse failed`);
            continue;
        }
        const islandDetail =
            parsedIsland &&
            typeof parsedIsland === "object" &&
            !Array.isArray(parsedIsland)
                ? parsedIsland[fam.dir]
                : null;
        if (
            !islandDetail ||
            typeof islandDetail !== "object" ||
            islandDetail.slug !== slug
        ) {
            fail(
                label,
                `detail data island missing key "${fam.dir}" with matching slug`,
            );
            continue;
        }

        valid += 1;
    }

    detailCounts[fam.dir] = valid;
    detailStatus[fam.dir] =
        valid === slugDirs.length && valid > 0 ? "FULL" : "DEGRADED";
}

// ---- report ----

if (errors.length > 0) {
    for (const e of errors) {
        console.error(`FAIL: ${e}`);
    }
    console.error(
        `\nSSG output invalid. ${errors.length} failure(s) above. Run the full build pipeline first.`,
    );
    process.exit(1);
}

console.log("PASS: SSG output valid. Checked 7 files and _redirects contract.");
console.log(
    `LISTING_FULLNESS: blog=${listingFullness.blog} guides=${listingFullness.guides}`,
);
console.log(
    `SSG_DETAIL_STATUS: blog=${detailStatus.blog} count=${detailCounts.blog} guides=${detailStatus.guides} count=${detailCounts.guides}`,
);
