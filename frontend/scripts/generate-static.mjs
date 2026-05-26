/**
 * Phase 2A-5: SSG static page generator.
 *
 * Pre-conditions:
 *   1. `vite build` has run → dist/ exists with dist/index.html.
 *   2. `vite build --ssr src/entry-server.jsx` has run → dist_ssr/entry-server.js exists.
 *
 * What this script does:
 *   - Saves dist/index.html as dist/spa-shell.html (SPA fallback shell).
 *   - For each SSG route: renders via SSR, injects Helmet head + HTML body,
 *     writes to dist/{route}/index.html (dist/index.html for /).
 *
 * Not yet wired into the build pipeline (Phase 2A-8).
 * _redirects not yet updated (Phase 2A-7).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fetchListingForSsg } from "./lib/fetchListingForSsg.mjs";
import { fetchAllSlugsForSsg } from "./lib/fetchAllSlugsForSsg.mjs";
import { fetchDetailForSsg } from "./lib/fetchDetailForSsg.mjs";
import { serializeJsonForHtml } from "./lib/jsonForHtml.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const DIST_SSR_ENTRY = path.resolve(
    __dirname,
    "..",
    "dist_ssr",
    "entry-server.js",
);

// Phase 2B: build-time public-API origin for /blog/ and /guides/ initial listing data.
// Env override → VITE_PUBLIC_ORIGIN → canonical production origin.
const SSG_LISTING_API_ORIGIN =
    process.env.SSG_LISTING_API_ORIGIN ||
    process.env.VITE_PUBLIC_ORIGIN ||
    "https://cardigo.co.il";

const DATA_ISLAND_ELEMENT_ID = "cardigo-initial-listing-data";
const DETAIL_DATA_ISLAND_ELEMENT_ID = "cardigo-initial-detail-data";

const SSG_ROUTES = [
    { url: "/", out: path.join(DIST, "index.html") },
    { url: "/cards/", out: path.join(DIST, "cards", "index.html") },
    { url: "/pricing/", out: path.join(DIST, "pricing", "index.html") },
    { url: "/contact/", out: path.join(DIST, "contact", "index.html") },
    {
        url: "/blog/",
        out: path.join(DIST, "blog", "index.html"),
        listingKey: "blog",
        listingEndpoint: "/api/blog",
    },
    {
        url: "/guides/",
        out: path.join(DIST, "guides", "index.html"),
        listingKey: "guides",
        listingEndpoint: "/api/guides",
    },
];

const listingStatus = { blog: "N/A", guides: "N/A" };

// Validate pre-conditions before starting.
if (!fs.existsSync(DIST)) {
    console.error("ERROR: dist/ not found. Run `vite build` first.");
    process.exit(1);
}
if (!fs.existsSync(DIST_SSR_ENTRY)) {
    console.error(
        "ERROR: dist_ssr/entry-server.js not found. Run `vite build --ssr src/entry-server.jsx` first.",
    );
    process.exit(1);
}

// Dynamic import must use file URL for cross-platform compatibility (Windows backslash).
const { renderForRoute } = await import(pathToFileURL(DIST_SSR_ENTRY).href);

// Read base template from dist (Vite-processed — has hashed asset references).
const templatePath = path.join(DIST, "index.html");
const template = fs.readFileSync(templatePath, "utf8");

// Guard: template must contain the expected structural markers before any processing begins.
// Recovery: this script is idempotent after a clean Vite build. If generation fails midway,
// rerun: (1) vite build, (2) vite build --ssr src/entry-server.jsx, (3) node scripts/generate-static.mjs.
// Atomic temp+rename writes can be considered before CI/build pipeline wiring if required.
if (!template.includes('<div id="root"></div>')) {
    console.error(
        `ERROR: dist/index.html is missing the #root marker '<div id="root"></div>'. Run vite build first.`,
    );
    process.exit(1);
}
if (!template.includes("</head>")) {
    console.error(
        "ERROR: dist/index.html is missing </head>. Run vite build first.",
    );
    process.exit(1);
}

// Save SPA shell BEFORE dist/index.html is overwritten for the "/" route.
const spaShellPath = path.join(DIST, "spa-shell.html");
fs.writeFileSync(spaShellPath, template, "utf8");
console.log("WROTE: dist/spa-shell.html (SPA fallback shell)");

for (const route of SSG_ROUTES) {
    const { url, out, listingKey, listingEndpoint } = route;
    try {
        // Phase 2B: build-time fetch (fail-open) for listing routes only.
        let initialListingData = {};
        let dataIslandPayload = null;
        if (listingKey) {
            const result = await fetchListingForSsg({
                key: listingKey,
                endpoint: listingEndpoint,
                origin: SSG_LISTING_API_ORIGIN,
                limit: 12,
                timeoutMs: 8000,
                logger: console,
            });
            if (result.ok) {
                const payload = {
                    page: result.page,
                    total: result.total,
                    items: result.items,
                };
                initialListingData = { [listingKey]: payload };
                dataIslandPayload = { [listingKey]: payload };
                listingStatus[listingKey] =
                    result.items.length > 0 ? "FULL" : "DEGRADED";
            } else {
                console.warn(
                    `[ssg] WARN: ${url} initial listing fetch failed — emitting DEGRADED data island`,
                );
                const empty = { page: 1, total: 0, items: [] };
                initialListingData = { [listingKey]: empty };
                dataIslandPayload = { [listingKey]: empty };
                listingStatus[listingKey] = "DEGRADED";
            }
        }

        const { html, helmetContext } = await renderForRoute(url, {
            initialListingData,
        });
        const { title, meta, link, script } = helmetContext.helmet;

        // Build the <head> injection string from all Helmet sections.
        const helmetHead = [title, meta, link, script]
            .map((h) => h.toString().trim())
            .filter(Boolean)
            .join("\n  ");

        let page = template;

        // Strip static <title> (has no data-rh attribute; Helmet title replaces it).
        page = page.replace(/<title>[^<]*<\/title>/, "");

        // Strip all static data-rh meta tags ([^>]* matches multiline tag content).
        page = page.replace(/<meta[^>]+data-rh="true"[^>]*>/g, "");

        // Collapse runs of 3+ blank lines left by the strip.
        page = page.replace(/(\r?\n){3,}/g, "\n\n");

        // Inject Helmet head tags immediately before </head>.
        page = page.replace("</head>", `  ${helmetHead}\n</head>`);

        // Inject SSR-rendered HTML into the root element.
        page = page.replace(
            '<div id="root"></div>',
            `<div id="root">${html}</div>`,
        );

        // Phase 2B: Inject non-executable JSON data island immediately before </body>
        // for listing routes only. Lives outside #root; consumed at hydrate time by
        // readInitialListingDataFromDocument(). Never executable JS.
        if (dataIslandPayload) {
            const safeJson = serializeJsonForHtml(dataIslandPayload);
            const dataIsland = `<script type="application/json" id="${DATA_ISLAND_ELEMENT_ID}">${safeJson}</script>`;
            page = page.replace("</body>", `  ${dataIsland}\n</body>`);
        }

        // Ensure output directory exists (handles /cards, /pricing, /contact subdirs).
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, page, "utf8");

        const relOut = path.relative(path.dirname(DIST), out);
        const titleText = title
            .toString()
            .replace(/<[^>]+>/g, "")
            .trim();
        console.log(
            `WROTE: ${relOut} (html=${html.length}, title="${titleText}")`,
        );
    } catch (err) {
        console.error(
            `ERROR: SSG generation failed for route "${url}" \u2192 ${out}`,
        );
        console.error(err?.message ?? err);
        process.exit(1);
    }
}

console.log("SSG_DONE: all routes complete");
console.log(
    `SSG_LISTING_STATUS: blog=${listingStatus.blog} guides=${listingStatus.guides}`,
);

/* ------------------------------------------------------------------ */
/* Phase 2C: detail SSG for /blog/<slug>/ and /guides/<slug>/         */
/* ------------------------------------------------------------------ */

const DETAIL_FAMILIES = [
    { key: "blog", endpoint: "/api/blog", urlPrefix: "/blog/", outDir: "blog" },
    {
        key: "guides",
        endpoint: "/api/guides",
        urlPrefix: "/guides/",
        outDir: "guides",
    },
];

const detailStatus = { blog: "N/A", guides: "N/A" };
const detailCounts = { blog: 0, guides: 0 };

for (const family of DETAIL_FAMILIES) {
    const slugRes = await fetchAllSlugsForSsg({
        key: family.key,
        endpoint: family.endpoint,
        origin: SSG_LISTING_API_ORIGIN,
        limit: 50,
        timeoutMs: 8000,
        logger: console,
    });
    if (!slugRes.ok) {
        console.warn(
            `[ssg] WARN: detail slug enumeration for ${family.key} failed (${slugRes.reason}) — skipping detail generation for this family`,
        );
        detailStatus[family.key] = "DEGRADED";
        continue;
    }
    const slugs = slugRes.slugs || [];
    if (slugs.length === 0) {
        detailStatus[family.key] = "DEGRADED";
        continue;
    }

    let written = 0;
    for (const slug of slugs) {
        const detailRes = await fetchDetailForSsg({
            key: family.key,
            slug,
            origin: SSG_LISTING_API_ORIGIN,
            timeoutMs: 8000,
            logger: console,
        });
        if (!detailRes.ok) {
            console.warn(
                `[ssg] WARN: detail fetch failed for ${family.key}/${slug} — skipping`,
            );
            continue;
        }
        const detail = detailRes.detail;
        const url = `${family.urlPrefix}${detail.slug}/`;
        const outFile = path.join(
            DIST,
            family.outDir,
            detail.slug,
            "index.html",
        );

        try {
            const { html, helmetContext } = await renderForRoute(url, {
                initialDetailData: { [family.key]: detail },
            });
            const { title, meta, link, script } = helmetContext.helmet;
            const helmetHead = [title, meta, link, script]
                .map((h) => h.toString().trim())
                .filter(Boolean)
                .join("\n  ");

            let page = template;
            page = page.replace(/<title>[^<]*<\/title>/, "");
            page = page.replace(/<meta[^>]+data-rh="true"[^>]*>/g, "");
            page = page.replace(/(\r?\n){3,}/g, "\n\n");
            page = page.replace("</head>", `  ${helmetHead}\n</head>`);
            page = page.replace(
                '<div id="root"></div>',
                `<div id="root">${html}</div>`,
            );
            const safeJson = serializeJsonForHtml({ [family.key]: detail });
            const dataIsland = `<script type="application/json" id="${DETAIL_DATA_ISLAND_ELEMENT_ID}">${safeJson}</script>`;
            page = page.replace("</body>", `  ${dataIsland}\n</body>`);

            fs.mkdirSync(path.dirname(outFile), { recursive: true });
            fs.writeFileSync(outFile, page, "utf8");
            written += 1;
        } catch (err) {
            console.warn(
                `[ssg] WARN: render failed for ${url} → ${err?.message || err}`,
            );
        }
    }

    detailCounts[family.key] = written;
    if (written === 0) {
        detailStatus[family.key] = "DEGRADED";
    } else if (written < slugs.length) {
        detailStatus[family.key] = "DEGRADED";
    } else {
        detailStatus[family.key] = "FULL";
    }
}

console.log(
    `SSG_DETAIL_STATUS: blog=${detailStatus.blog} count=${detailCounts.blog} guides=${detailStatus.guides} count=${detailCounts.guides}`,
);
