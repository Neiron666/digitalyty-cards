/**
 * card-ssr-spike.mjs — SSR_P3_NETLIFY_FUNCTION_SSR_RUNTIME_SPIKE_MINIMAL
 *
 * Runtime spike to prove Netlify Function SSR platform feasibility.
 * Proves:
 *   1. .mjs function deploys from frontend/netlify/functions (ESM, no exports.handler).
 *   2. dist/spa-shell.html is readable via included_files.
 *   3. dist_ssr/entry-server.js is importable via included_files (ESM dynamic import).
 *   4. renderForRoute("/pricing/") renders React SSR inside Lambda (non-lazy, no async data).
 *   5. Response includes x-cardigo-ssr: 1 header.
 *
 * NOT real card SSR. NOT production rollout. NOT Edge handoff. Diagnostic only.
 * Route: /__ssr-runtime-spike (outside /card/*, /c/*, og-preview.js Edge coverage).
 * Error response: plain text "SSR_RUNTIME_SPIKE_FAILED" — no stack traces, no paths.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { pathToFileURL } from "url";

// Paths relative to Lambda working directory (process.cwd()).
// With Netlify esbuild bundler + included_files = ["dist_ssr/**", "dist/spa-shell.html"],
// these files are deployed at these paths from the function package root.
const SPA_SHELL_PATH = join(process.cwd(), "dist/spa-shell.html");
const SSR_ENTRY_PATH = join(process.cwd(), "dist_ssr/entry-server.js");

export const handler = async (event, context) => {
    try {
        // Step 1: Prove included_files file access — read dist/spa-shell.html
        const shellHtml = await readFile(SPA_SHELL_PATH, "utf-8");

        // Step 2: Prove ESM dynamic import — load dist_ssr/entry-server.js
        const { renderForRoute } = await import(
            pathToFileURL(SSR_ENTRY_PATH).href
        );

        // Step 3: Prove React SSR render — /pricing/ is non-lazy, no async data deps,
        // already proven by generate-static.mjs SSG pipeline.
        const { html: appHtml, helmetContext } = await renderForRoute(
            "/pricing/",
            {},
        );

        // Step 4: Collect head tags from react-helmet-async server context
        const { helmet } = helmetContext ?? {};
        const headTags = [
            helmet?.title?.toString() ?? "",
            helmet?.meta?.toString() ?? "",
            helmet?.link?.toString() ?? "",
        ]
            .map((s) => s.trim())
            .filter(Boolean)
            .join("\n    ");

        // Step 5: Inject into spa-shell.html template
        let finalHtml = shellHtml;
        // Inject Helmet head tags before </head>
        if (headTags) {
            finalHtml = finalHtml.replace(
                "</head>",
                `    ${headTags}\n</head>`,
            );
        }
        // Inject React-rendered app HTML into #root
        finalHtml = finalHtml.replace(
            '<div id="root"></div>',
            `<div id="root">${appHtml}</div>`,
        );
        // Add visible spike marker comment immediately before </body>
        finalHtml = finalHtml.replace(
            "</body>",
            "<!-- cardigo-ssr-runtime-spike -->\n</body>",
        );

        return {
            statusCode: 200,
            headers: {
                "content-type": "text/html; charset=utf-8",
                "x-cardigo-ssr": "1",
                "cache-control": "no-store, max-age=0",
            },
            body: finalHtml,
        };
    } catch {
        // No stack traces, no file paths, no env vars in error response.
        return {
            statusCode: 500,
            headers: {
                "content-type": "text/plain; charset=utf-8",
                "cache-control": "no-store",
            },
            body: "SSR_RUNTIME_SPIKE_FAILED",
        };
    }
};
