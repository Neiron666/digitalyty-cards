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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const DIST_SSR_ENTRY = path.resolve(
    __dirname,
    "..",
    "dist_ssr",
    "entry-server.js",
);

const SSG_ROUTES = [
    { url: "/", out: path.join(DIST, "index.html") },
    { url: "/cards/", out: path.join(DIST, "cards", "index.html") },
    { url: "/pricing/", out: path.join(DIST, "pricing", "index.html") },
    { url: "/contact/", out: path.join(DIST, "contact", "index.html") },
];

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

for (const { url, out } of SSG_ROUTES) {
    try {
        const { html, helmetContext } = await renderForRoute(url);
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
