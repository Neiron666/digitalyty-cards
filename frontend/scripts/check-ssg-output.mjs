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
        dataIslandRequired: true,
        dataIslandKey: "cards-showcase",
        dataIslandNoSlug: true,
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
const listingFullness = { "cards-showcase": "N/A", blog: "N/A", guides: "N/A" };

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

    // 12. Data island (listing routes only — blog, guides, cards-showcase).
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
            } else if (route.dataIslandNoSlug) {
                // cards-showcase: no slug, no detail-href check.
                // Empty items = SSG built with no active examples (fallback to
                // SHOWCASE_CARDS constant). Not a build failure.
                if (keyed.items.length === 0) {
                    listingFullness[route.dataIslandKey] = "EMPTY_FALLBACK";
                } else {
                    const first = keyed.items[0];
                    if (
                        !first ||
                        (typeof first.id !== "string" &&
                            typeof first.id !== "number") ||
                        typeof first.imageUrl !== "string" ||
                        !first.imageUrl
                    ) {
                        fail(
                            label,
                            `data island first item missing id or imageUrl`,
                        );
                        listingFullness[route.dataIslandKey] = "DEGRADED";
                    } else {
                        listingFullness[route.dataIslandKey] = "FULL";
                    }
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
        "/blog/page/* /404.html 404",
        "/blog/* /404.html 404",
        "/guides/page/* /404.html 404",
        "/guides/* /404.html 404",
        "/* /spa-shell.html 200",
    ];

    for (const rule of REQUIRED_RULES) {
        if (!normLines.includes(rule)) {
            fail("_redirects", `required rule missing: "${rule}"`);
        }
    }

    // Reject old /index.html fallback for any SPA fallback source path.
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

    // Exact-set verification of every source whose target is /spa-shell.html.
    // Antidrift: any extra/missing source vs the expected set fails the gate.
    const EXPECTED_SPA_SHELL_SOURCES = new Set([
        "/card/*",
        "/c/*",
        "/gate.html",
        "/*",
    ]);
    const actualSpaShellSources = new Set();
    for (const line of normLines) {
        const parts = line.split(" ");
        if (parts.length >= 3 && parts[1] === "/spa-shell.html") {
            actualSpaShellSources.add(parts[0]);
        }
    }
    for (const src of EXPECTED_SPA_SHELL_SOURCES) {
        if (!actualSpaShellSources.has(src)) {
            fail("_redirects", `missing /spa-shell.html source: "${src}"`);
        }
    }
    for (const src of actualSpaShellSources) {
        if (!EXPECTED_SPA_SHELL_SOURCES.has(src)) {
            fail("_redirects", `unexpected /spa-shell.html source: "${src}"`);
        }
    }

    // Anti-force invariant: no Netlify force flag (!) on /blog/ or /guides/
    // rules. Static-file precedence must continue to protect published SSG
    // detail pages from the /blog/* and /guides/* 404 fallback rules.
    for (const line of normLines) {
        const parts = line.split(" ");
        const source = parts[0] || "";
        if (!source.startsWith("/blog/") && !source.startsWith("/guides/")) {
            continue;
        }
        if (line.includes("!")) {
            fail(
                "_redirects",
                `force flag "!" not allowed on /blog/ or /guides/ rule: "${line}"`,
            );
        }
        const last = parts[parts.length - 1] || "";
        if (last.toLowerCase() === "force") {
            fail(
                "_redirects",
                `force flag not allowed on /blog/ or /guides/ rule: "${line}"`,
            );
        }
    }

    // ---- alias redirect block (previousSlugs) ----
    {
        const ALIAS_MARKER_START = "# cardigo-generated-alias-redirects:start";
        const ALIAS_MARKER_END = "# cardigo-generated-alias-redirects:end";
        const ALIAS_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
        const ALIAS_RESERVED = new Set(["page", "aliases"]);
        const WILDCARD_404_RULES = [
            "/blog/page/*",
            "/blog/*",
            "/guides/page/*",
            "/guides/*",
        ];

        const rawLines = redirectsContent.split("\n");
        const startIdxs = [];
        const endIdxs = [];
        for (let i = 0; i < rawLines.length; i++) {
            const t = rawLines[i].trim();
            if (t === ALIAS_MARKER_START) startIdxs.push(i);
            if (t === ALIAS_MARKER_END) endIdxs.push(i);
        }
        if (startIdxs.length !== 1) {
            fail(
                "_redirects:alias",
                `alias-block start marker count = ${startIdxs.length}, expected exactly 1`,
            );
        }
        if (endIdxs.length !== 1) {
            fail(
                "_redirects:alias",
                `alias-block end marker count = ${endIdxs.length}, expected exactly 1`,
            );
        }
        if (startIdxs.length === 1 && endIdxs.length === 1) {
            const startIdx = startIdxs[0];
            const endIdx = endIdxs[0];
            if (startIdx >= endIdx) {
                fail(
                    "_redirects:alias",
                    `alias-block start marker (line ${startIdx + 1}) must come before end marker (line ${endIdx + 1})`,
                );
            }

            // Marker block must appear before the first /blog/page/* or /blog/*
            // or /guides/page/* or /guides/* 404 wildcard rule.
            let firstWildcardIdx = -1;
            for (let i = 0; i < rawLines.length; i++) {
                const norm = rawLines[i].trim().replace(/\s+/g, " ");
                if (!norm || norm.startsWith("#")) continue;
                const src = norm.split(" ")[0] || "";
                if (WILDCARD_404_RULES.includes(src)) {
                    firstWildcardIdx = i;
                    break;
                }
            }
            if (firstWildcardIdx === -1) {
                fail(
                    "_redirects:alias",
                    `no bucket 404 wildcard rule found; alias block has nothing to anchor before`,
                );
            } else if (endIdx >= firstWildcardIdx) {
                fail(
                    "_redirects:alias",
                    `alias-block end marker (line ${endIdx + 1}) must come before first bucket 404 wildcard rule (line ${firstWildcardIdx + 1})`,
                );
            }

            // Validate each alias line strictly.
            const seenSources = new Set();
            const targetByPair = new Map(); // bucket+from -> target
            const writtenDetailCache = new Map();
            function detailExists(bucket, slug) {
                const key = `${bucket}/${slug}`;
                if (writtenDetailCache.has(key))
                    return writtenDetailCache.get(key);
                const exists = fs.existsSync(
                    path.join(DIST, bucket, slug, "index.html"),
                );
                writtenDetailCache.set(key, exists);
                return exists;
            }

            for (let i = startIdx + 1; i < endIdx; i++) {
                const raw = rawLines[i];
                if (raw.includes("!")) {
                    fail(
                        "_redirects:alias",
                        `force flag "!" not allowed inside alias block: "${raw}"`,
                    );
                }
                const trimmed = raw.trim();
                if (trimmed.length === 0) continue;
                if (trimmed.startsWith("#")) {
                    fail(
                        "_redirects:alias",
                        `comment lines not allowed inside alias block: "${raw}"`,
                    );
                    continue;
                }
                const parts = trimmed.split(/\s+/);
                if (parts.length !== 3) {
                    fail(
                        "_redirects:alias",
                        `alias line must have exactly 3 tokens: "${raw}"`,
                    );
                    continue;
                }
                const [source, target, status] = parts;
                if (status !== "301") {
                    fail(
                        "_redirects:alias",
                        `alias status must be 301: "${raw}"`,
                    );
                }
                // Source: /blog/<slug> or /blog/<slug>/ ; same for guides.
                const sourceRe = /^\/(blog|guides)\/([a-z0-9][a-z0-9-]*)(\/)?$/;
                const sm = source.match(sourceRe);
                if (!sm) {
                    fail(
                        "_redirects:alias",
                        `alias source has invalid shape: "${source}"`,
                    );
                    continue;
                }
                const [, srcBucket, srcSlug] = sm;
                // Target: /blog/<slug>/ or /guides/<slug>/ (trailing slash required).
                const targetRe = /^\/(blog|guides)\/([a-z0-9][a-z0-9-]*)\/$/;
                const tm = target.match(targetRe);
                if (!tm) {
                    fail(
                        "_redirects:alias",
                        `alias target has invalid shape (trailing slash mandatory): "${target}"`,
                    );
                    continue;
                }
                const [, tgtBucket, tgtSlug] = tm;
                if (srcBucket !== tgtBucket) {
                    fail(
                        "_redirects:alias",
                        `alias bucket mismatch: source="${source}" target="${target}"`,
                    );
                }
                if (!ALIAS_SLUG_RE.test(srcSlug)) {
                    fail(
                        "_redirects:alias",
                        `alias source slug fails regex: "${srcSlug}"`,
                    );
                }
                if (!ALIAS_SLUG_RE.test(tgtSlug)) {
                    fail(
                        "_redirects:alias",
                        `alias target slug fails regex: "${tgtSlug}"`,
                    );
                }
                if (ALIAS_RESERVED.has(srcSlug)) {
                    fail(
                        "_redirects:alias",
                        `alias source slug is reserved: "${srcSlug}"`,
                    );
                }
                if (ALIAS_RESERVED.has(tgtSlug)) {
                    fail(
                        "_redirects:alias",
                        `alias target slug is reserved: "${tgtSlug}"`,
                    );
                }
                if (srcSlug === tgtSlug) {
                    fail(
                        "_redirects:alias",
                        `alias source and target slug are identical: "${srcSlug}"`,
                    );
                }
                // Forbidden chars/sequences anywhere in source/target.
                for (const v of [source, target]) {
                    if (
                        /\/\//.test(v) ||
                        /[\s?#:\\]/.test(v) ||
                        /^https?:\/\//.test(v) ||
                        // eslint-disable-next-line no-control-regex
                        /[\u0000-\u001F\u007F]/.test(v)
                    ) {
                        fail(
                            "_redirects:alias",
                            `alias path contains forbidden characters/sequence: "${v}"`,
                        );
                    }
                }
                // Anti-overlap with pagination wildcards.
                if (srcSlug === "page" || tgtSlug === "page") {
                    fail(
                        "_redirects:alias",
                        `alias slug must not equal pagination segment "page"`,
                    );
                }
                // Duplicate source guard.
                if (seenSources.has(source)) {
                    fail(
                        "_redirects:alias",
                        `duplicate alias source: "${source}"`,
                    );
                } else {
                    seenSources.add(source);
                }
                // Pair invariant: from+target must be the same on both /<from>
                // and /<from>/ variants.
                const pairKey = `${srcBucket}/${srcSlug}`;
                if (targetByPair.has(pairKey)) {
                    if (targetByPair.get(pairKey) !== target) {
                        fail(
                            "_redirects:alias",
                            `alias variant target mismatch for "${pairKey}": "${target}" vs "${targetByPair.get(pairKey)}"`,
                        );
                    }
                } else {
                    targetByPair.set(pairKey, target);
                }
                // Target detail page must exist on disk.
                if (!detailExists(tgtBucket, tgtSlug)) {
                    fail(
                        "_redirects:alias",
                        `alias target detail page missing on disk: dist/${tgtBucket}/${tgtSlug}/index.html`,
                    );
                }
                // Source detail page must NOT exist (anti-shadow).
                if (detailExists(srcBucket, srcSlug)) {
                    fail(
                        "_redirects:alias",
                        `alias source slug shadows a real detail page: dist/${srcBucket}/${srcSlug}/index.html`,
                    );
                }
            }
            // Pairing invariant: every from must appear with BOTH slash and
            // no-slash source variants.
            for (const pairKey of targetByPair.keys()) {
                const [bucket, fromSlug] = pairKey.split("/");
                const a = `/${bucket}/${fromSlug}`;
                const b = `/${bucket}/${fromSlug}/`;
                if (!seenSources.has(a) || !seenSources.has(b)) {
                    fail(
                        "_redirects:alias",
                        `alias "${pairKey}" missing one of the slash variants (expected both "${a}" and "${b}")`,
                    );
                }
            }
        }
    }
}

// ---- 404.html shape guard ----

const fourOhFourPath = path.join(DIST, "404.html");
if (!fs.existsSync(fourOhFourPath)) {
    fail("404.html", `file not found: ${fourOhFourPath}`);
} else {
    const html = fs.readFileSync(fourOhFourPath, "utf8");
    if (
        !/<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i.test(
            html,
        )
    ) {
        fail(
            "404.html",
            `missing <meta name="robots" content="noindex, nofollow">`,
        );
    }
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!titleMatch) {
        fail("404.html", `missing <title>`);
    } else {
        const titleText = titleMatch[1];
        if (!titleText.includes("404")) {
            fail("404.html", `<title> missing "404"`);
        }
        if (!titleText.includes("Cardigo")) {
            fail("404.html", `<title> missing "Cardigo"`);
        }
    }
    if (/rel=["']canonical["']/i.test(html)) {
        fail("404.html", `must not contain rel="canonical"`);
    }
    if (/property=["']og:url["']/i.test(html)) {
        fail("404.html", `must not contain property="og:url"`);
    }
    if (/application\/ld\+json/i.test(html)) {
        fail("404.html", `must not contain application/ld+json`);
    }
    if (html.includes("cardigo-initial-listing-data")) {
        fail("404.html", `must not contain cardigo-initial-listing-data`);
    }
    if (html.includes("cardigo-initial-detail-data")) {
        fail("404.html", `must not contain cardigo-initial-detail-data`);
    }
    if (html.includes("כרטיס ביקור דיגיטלי לעסק | Cardigo")) {
        fail("404.html", `must not contain homepage title`);
    }
    if (/<script\b/i.test(html)) {
        fail("404.html", `must not contain <script>`);
    }
    if (/<style\b/i.test(html)) {
        fail("404.html", `must not contain <style>`);
    }
    if (/\sstyle=/i.test(html)) {
        fail("404.html", `must not contain inline style= attribute`);
    }
    // Homepage canonical/og value must not appear as a canonical or og:url value.
    if (
        /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/cardigo\.co\.il\/?["']/i.test(
            html,
        )
    ) {
        fail("404.html", `homepage URL must not appear as canonical`);
    }
    if (
        /<meta[^>]+property=["']og:url["'][^>]+content=["']https:\/\/cardigo\.co\.il\/?["']/i.test(
            html,
        )
    ) {
        fail("404.html", `homepage URL must not appear as og:url`);
    }
}

// ---- pagination guard (READY_FOR_PAGINATION_VALID_SSG_INVALID_404) ----

const PAGINATION_PAGE_LIMIT = 12;
const HOMEPAGE_TITLE_LITERAL = "כרטיס ביקור דיגיטלי לעסק | Cardigo";
const HOMEPAGE_CANONICAL = "https://cardigo.co.il/";
const PAGINATION_FAMILIES = [{ dir: "blog" }, { dir: "guides" }];
const paginationStatus = { blog: "N/A", guides: "N/A" };
const paginationCounts = { blog: 0, guides: 0 };

function readListingIslandTotal(filePath, key) {
    if (!fs.existsSync(filePath)) return null;
    const html = fs.readFileSync(filePath, "utf8");
    const islandRe = new RegExp(
        `<script[^>]+type=["']application/json["'][^>]+id=["']${DATA_ISLAND_ELEMENT_ID}["'][^>]*>([\\s\\S]*?)</script>`,
        "gi",
    );
    const m = [...html.matchAll(islandRe)];
    if (m.length !== 1) return null;
    let parsed = null;
    try {
        parsed = JSON.parse(m[0][1]);
    } catch {
        return null;
    }
    const keyed =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed[key]
            : null;
    if (!keyed || typeof keyed.total !== "number") return null;
    return keyed.total;
}

for (const fam of PAGINATION_FAMILIES) {
    const rootListingFile = path.join(DIST, fam.dir, "index.html");
    const total = readListingIslandTotal(rootListingFile, fam.dir);
    if (total === null) {
        // listing root guard already failed above if missing/malformed; skip here.
        paginationStatus[fam.dir] = "DEGRADED";
        continue;
    }
    const totalPages = Math.ceil(total / PAGINATION_PAGE_LIMIT);

    // No pagination expected: assert dist/<dir>/page/2/index.html does NOT exist.
    if (totalPages < 2) {
        const guard = path.join(DIST, fam.dir, "page", "2", "index.html");
        if (fs.existsSync(guard)) {
            fail(
                `${fam.dir}/page/2`,
                `must not exist when totalPages<2 (total=${total}) but file is present`,
            );
        }
        paginationStatus[fam.dir] = "FULL";
        continue;
    }

    let valid = 0;
    let degraded = false;
    for (let n = 2; n <= totalPages; n++) {
        const file = path.join(DIST, fam.dir, "page", String(n), "index.html");
        const label = `${fam.dir}/page/${n}`;
        if (!fs.existsSync(file)) {
            fail(label, `missing ${path.relative(DIST, file)}`);
            degraded = true;
            continue;
        }
        const html = fs.readFileSync(file, "utf8");
        const size = html.length;
        if (size < 10000) {
            fail(label, `size ${size} < 10000`);
            degraded = true;
            continue;
        }

        // Root filled.
        const rootMatch = html.match(
            /<div id="root">([\s\S]*?)<\/div>\s*<script/,
        );
        if (!rootMatch || rootMatch[1].trim().length === 0) {
            fail(label, `#root is empty (spa-shell leak)`);
            degraded = true;
            continue;
        }

        // Exactly one <title>.
        const titleCount = (html.match(/<title[^>]*>[\s\S]*?<\/title>/g) || [])
            .length;
        if (titleCount !== 1) {
            fail(label, `title count = ${titleCount}, expected 1`);
            degraded = true;
            continue;
        }

        const expectedSelf = `https://cardigo.co.il/${fam.dir}/page/${n}/`;

        // Canonical = self trailing-slash.
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
            degraded = true;
            continue;
        }
        if (canonicalMatches[0][1] !== expectedSelf) {
            fail(
                label,
                `canonical = "${canonicalMatches[0][1]}", expected "${expectedSelf}"`,
            );
            degraded = true;
            continue;
        }

        // og:url = self trailing-slash.
        const ogUrlMatches = [
            ...html.matchAll(
                /<meta\b[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["'][^>]*>/g,
            ),
        ];
        if (ogUrlMatches.length !== 1) {
            fail(label, `og:url count = ${ogUrlMatches.length}, expected 1`);
            degraded = true;
            continue;
        }
        if (ogUrlMatches[0][1] !== expectedSelf) {
            fail(
                label,
                `og:url = "${ogUrlMatches[0][1]}", expected "${expectedSelf}"`,
            );
            degraded = true;
            continue;
        }

        // robots = noindex, follow (flexible whitespace/case).
        const robotsMatches = [
            ...html.matchAll(
                /<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
            ),
        ];
        const robotsValue = robotsMatches[0]?.[1] || "";
        if (!/noindex\s*,\s*follow/i.test(robotsValue)) {
            fail(
                label,
                `robots = "${robotsValue}", expected /noindex,\\s*follow/i`,
            );
            degraded = true;
            continue;
        }

        // No JSON-LD (thin paginated archives must not carry FAQ/Article schema).
        const jldCount = countJsonLd(html);
        if (jldCount !== 0) {
            fail(label, `JSON-LD count = ${jldCount}, expected 0`);
            degraded = true;
            continue;
        }

        // Homepage leak guards.
        if (html.includes(HOMEPAGE_TITLE_LITERAL)) {
            fail(label, `homepage title literal leak`);
            degraded = true;
            continue;
        }
        if (canonicalMatches[0][1] === HOMEPAGE_CANONICAL) {
            fail(label, `homepage canonical leak`);
            degraded = true;
            continue;
        }
        if (ogUrlMatches[0][1] === HOMEPAGE_CANONICAL) {
            fail(label, `homepage og:url leak`);
            degraded = true;
            continue;
        }

        // Listing data island = exactly 1, page===n, total matches root, items length matches expected.
        const islandRe = new RegExp(
            `<script[^>]+type=["']application/json["'][^>]+id=["']${DATA_ISLAND_ELEMENT_ID}["'][^>]*>([\\s\\S]*?)</script>`,
            "gi",
        );
        const islandMatches = [...html.matchAll(islandRe)];
        if (islandMatches.length !== 1) {
            fail(
                label,
                `listing data island count = ${islandMatches.length}, expected 1`,
            );
            degraded = true;
            continue;
        }
        let parsedIsland = null;
        try {
            parsedIsland = JSON.parse(islandMatches[0][1]);
        } catch {
            fail(label, `listing data island JSON.parse failed`);
            degraded = true;
            continue;
        }
        const keyed =
            parsedIsland &&
            typeof parsedIsland === "object" &&
            !Array.isArray(parsedIsland)
                ? parsedIsland[fam.dir]
                : null;
        if (
            !keyed ||
            typeof keyed !== "object" ||
            !Array.isArray(keyed.items)
        ) {
            fail(
                label,
                `listing data island missing key "${fam.dir}" with items[] array`,
            );
            degraded = true;
            continue;
        }
        if (keyed.page !== n) {
            fail(
                label,
                `listing data island page = ${keyed.page}, expected ${n}`,
            );
            degraded = true;
            continue;
        }
        if (keyed.total !== total) {
            fail(
                label,
                `listing data island total = ${keyed.total}, expected ${total} (root)`,
            );
            degraded = true;
            continue;
        }
        const expectedItems = Math.min(
            PAGINATION_PAGE_LIMIT,
            total - (n - 1) * PAGINATION_PAGE_LIMIT,
        );
        if (keyed.items.length !== expectedItems) {
            fail(
                label,
                `listing data island items.length = ${keyed.items.length}, expected ${expectedItems}`,
            );
            degraded = true;
            continue;
        }
        const firstSlug =
            keyed.items[0] && typeof keyed.items[0].slug === "string"
                ? keyed.items[0].slug
                : "";
        if (!firstSlug) {
            fail(label, `listing data island first item missing string slug`);
            degraded = true;
            continue;
        }
        const hrefNeedle = `href="/${fam.dir}/${firstSlug}/"`;
        if (!html.includes(hrefNeedle)) {
            fail(
                label,
                `body missing detail link ${hrefNeedle} for first data-island item`,
            );
            degraded = true;
            continue;
        }

        valid += 1;
    }

    // Assert dist/<dir>/page/<totalPages+1>/index.html does NOT exist.
    const overshoot = path.join(
        DIST,
        fam.dir,
        "page",
        String(totalPages + 1),
        "index.html",
    );
    if (fs.existsSync(overshoot)) {
        fail(
            `${fam.dir}/page/${totalPages + 1}`,
            `must not exist (totalPages=${totalPages}) but file is present`,
        );
        degraded = true;
    }

    paginationCounts[fam.dir] = valid;
    paginationStatus[fam.dir] = degraded ? "DEGRADED" : "FULL";
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
        .map((e) => e.name)
        .filter((name) => name !== "page");

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
    `LISTING_FULLNESS: cards-showcase=${listingFullness["cards-showcase"]} blog=${listingFullness.blog} guides=${listingFullness.guides}`,
);
console.log(
    `SSG_PAGINATION_STATUS: blog=${paginationStatus.blog} count=${paginationCounts.blog} guides=${paginationStatus.guides} count=${paginationCounts.guides}`,
);
console.log(
    `SSG_DETAIL_STATUS: blog=${detailStatus.blog} count=${detailCounts.blog} guides=${detailStatus.guides} count=${detailCounts.guides}`,
);
