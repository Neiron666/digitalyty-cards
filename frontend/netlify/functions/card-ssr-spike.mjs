/**
 * card-ssr-spike.mjs — SSR_P3_NETLIFY_FUNCTION_SSR_RUNTIME_SPIKE_DIAGNOSTIC_MINIMAL
 *
 * Phase 2C: Added stage-based diagnostics to identify which operation fails at runtime.
 * Stages: init → compute_paths → read_spa_shell → import_entry_server →
 *         validate_render_for_route → render_for_route → collect_helmet →
 *         inject_html → return_success
 *
 * On failure:
 *   - Netlify log receives stage + sanitized error (no stack traces, no abs paths, no secrets).
 *   - HTTP response carries x-cardigo-ssr-spike-failed-stage header.
 *   - Body is SSR_RUNTIME_SPIKE_FAILED_STAGE:<stage>.
 *
 * NOT real card SSR. NOT production rollout. NOT Edge handoff. Diagnostic only.
 * Route: /__ssr-runtime-spike (outside /card/*, /c/*, og-preview.js Edge coverage).
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { pathToFileURL } from "url";

// Sanitize an error message for safe logging/response:
// - redacts process.cwd(), Windows absolute paths (C:\...), Unix abs paths (/var/..., /opt/..., etc.)
// - limits message length to 240 chars
function sanitizeMessage(raw) {
    if (typeof raw !== "string") return String(raw ?? "").slice(0, 240);
    const cwd = process.cwd();
    let s = raw;
    // Redact literal cwd first (most specific)
    if (cwd) s = s.split(cwd).join("[cwd]");
    // Redact Windows absolute paths C:\... or D:\...
    s = s.replace(/[A-Za-z]:\\[^\s,"'<>)]+/g, "[path]");
    // Redact Unix absolute paths (/ followed by var/, opt/, tmp/, home/, usr/, proc/, etc.)
    s = s.replace(
        /\/(?:var|opt|tmp|home|usr|proc|etc|app|lambda)[^\s,"'<>)]+/g,
        "[path]",
    );
    return s.slice(0, 240);
}

// Paths relative to Lambda working directory (process.cwd()).
// With Netlify esbuild bundler + included_files = ["dist_ssr/**", "dist/spa-shell.html"],
// these files are deployed at these paths from the function package root.
const SPA_SHELL_PATH = join(process.cwd(), "dist/spa-shell.html");
const SSR_ENTRY_PATH = join(process.cwd(), "dist_ssr/entry-server.js");

export const handler = async (event, context) => {
    let stage = "init";
    try {
        // Stage: compute_paths
        stage = "compute_paths";
        // (paths already computed above as module-level constants — stage is a checkpoint)

        // Stage: read_spa_shell
        stage = "read_spa_shell";
        const shellHtml = await readFile(SPA_SHELL_PATH, "utf-8");

        // Stage: import_entry_server
        stage = "import_entry_server";
        const entryModule = await import(pathToFileURL(SSR_ENTRY_PATH).href);

        // Stage: validate_render_for_route
        stage = "validate_render_for_route";
        const { renderForRoute } = entryModule;
        if (typeof renderForRoute !== "function") {
            throw new Error("renderForRoute is not a function");
        }

        // Stage: render_for_route
        stage = "render_for_route";
        const { html: appHtml, helmetContext } = await renderForRoute(
            "/pricing/",
            {},
        );

        // Stage: collect_helmet
        stage = "collect_helmet";
        const { helmet } = helmetContext ?? {};
        const headTags = [
            helmet?.title?.toString() ?? "",
            helmet?.meta?.toString() ?? "",
            helmet?.link?.toString() ?? "",
        ]
            .map((s) => s.trim())
            .filter(Boolean)
            .join("\n    ");

        // Stage: inject_html
        stage = "inject_html";
        let finalHtml = shellHtml;
        if (headTags) {
            finalHtml = finalHtml.replace(
                "</head>",
                `    ${headTags}\n</head>`,
            );
        }
        finalHtml = finalHtml.replace(
            '<div id="root"></div>',
            `<div id="root">${appHtml}</div>`,
        );
        finalHtml = finalHtml.replace(
            "</body>",
            "<!-- cardigo-ssr-runtime-spike -->\n</body>",
        );

        // Stage: return_success
        stage = "return_success";
        return {
            statusCode: 200,
            headers: {
                "content-type": "text/html; charset=utf-8",
                "x-cardigo-ssr": "1",
                "cache-control": "no-store, max-age=0",
            },
            body: finalHtml,
        };
    } catch (err) {
        // Safe payload for Netlify log — no stack traces, no abs paths, no env vars.
        const safePayload = {
            stage,
            errorName: err?.name ?? "UnknownError",
            ...(err?.code ? { errorCode: String(err.code) } : {}),
            message: sanitizeMessage(err?.message ?? ""),
        };
        console.error("SSR_RUNTIME_SPIKE_FAILED", safePayload);

        return {
            statusCode: 500,
            headers: {
                "content-type": "text/plain; charset=utf-8",
                "cache-control": "no-store",
                "x-cardigo-ssr-spike-failed-stage": stage,
            },
            body: `SSR_RUNTIME_SPIKE_FAILED_STAGE:${stage}`,
        };
    }
};
