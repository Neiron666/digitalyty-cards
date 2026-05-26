/**
 * Phase 2B: Optional FULL-mode listing-fullness gate.
 *
 * Parses dist/blog/index.html and dist/guides/index.html, asserts that each
 * carries a data island, that data island items[] is non-empty, and that the
 * first item's slug appears in the HTML body as a detail-page href.
 *
 * Exit 0 ONLY when both blog and guides are FULL.
 * Exit 1 if either is DEGRADED or files are missing.
 *
 * NOT wired into `npm run build`. Used for Phase 3B production-SEO closure only.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const DATA_ISLAND_ELEMENT_ID = "cardigo-initial-listing-data";

const ROUTES = [
    {
        label: "blog",
        file: "blog/index.html",
        key: "blog",
        detailHrefPrefix: "/blog/",
    },
    {
        label: "guides",
        file: "guides/index.html",
        key: "guides",
        detailHrefPrefix: "/guides/",
    },
];

const status = { blog: "MISSING", guides: "MISSING" };
const errors = [];

for (const route of ROUTES) {
    const filePath = path.join(DIST, route.file);
    if (!fs.existsSync(filePath)) {
        errors.push(`[${route.label}] file not found: ${filePath}`);
        continue;
    }
    const html = fs.readFileSync(filePath, "utf8");

    const islandRe = new RegExp(
        `<script[^>]+type=["']application/json["'][^>]+id=["']${DATA_ISLAND_ELEMENT_ID}["'][^>]*>([\\s\\S]*?)</script>`,
        "gi",
    );
    const matches = [...html.matchAll(islandRe)];
    if (matches.length !== 1) {
        errors.push(
            `[${route.label}] data island count = ${matches.length}, expected 1`,
        );
        status[route.key] = "DEGRADED";
        continue;
    }

    let parsed = null;
    try {
        parsed = JSON.parse(matches[0][1]);
    } catch {
        errors.push(`[${route.label}] data island JSON.parse failed`);
        status[route.key] = "DEGRADED";
        continue;
    }

    const keyed =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed[route.key]
            : null;
    if (!keyed || typeof keyed !== "object" || !Array.isArray(keyed.items)) {
        errors.push(
            `[${route.label}] data island missing key "${route.key}" with items[]`,
        );
        status[route.key] = "DEGRADED";
        continue;
    }

    if (keyed.items.length === 0) {
        errors.push(`[${route.label}] items[] is empty (DEGRADED)`);
        status[route.key] = "DEGRADED";
        continue;
    }

    const first = keyed.items[0];
    const slug = first && typeof first.slug === "string" ? first.slug : "";
    if (!slug) {
        errors.push(`[${route.label}] first item missing string slug`);
        status[route.key] = "DEGRADED";
        continue;
    }

    const hrefNeedle = `href="${route.detailHrefPrefix}${slug}"`;
    if (!html.includes(hrefNeedle)) {
        errors.push(`[${route.label}] body missing detail link ${hrefNeedle}`);
        status[route.key] = "DEGRADED";
        continue;
    }

    status[route.key] = "FULL";
}

const ok = status.blog === "FULL" && status.guides === "FULL";
if (!ok) {
    for (const e of errors) console.error(`FAIL: ${e}`);
    console.error(
        `LISTING_FULLNESS: blog=${status.blog} guides=${status.guides} → NOT FULL`,
    );
    process.exit(1);
}

console.log(
    `PASS: LISTING_FULLNESS blog=${status.blog} guides=${status.guides}`,
);
