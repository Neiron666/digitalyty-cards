/**
 * card-ssr-spike.mjs — SSR_P3_NETLIFY_FUNCTION_SSR_RUNTIME_SPIKE_PATH_RESOLUTION_DIAGNOSTIC
 *
 * Phase 2D: Added safe path-resolution diagnostics.
 * ENOENT at read_spa_shell confirmed in Deploy Preview.
 * This version probes multiple candidate paths to find where included_files land.
 *
 * Candidates probed (spa-shell + entry-server):
 *   cwd_dist            — process.cwd()/dist/...
 *   import_meta_rel     — import.meta.url relative ../../dist/...
 *   import_meta_dir     — __dirname equivalent + dist/...
 *   var_task_dist       — /var/task/dist/...
 *   var_task_fe_dist    — /var/task/frontend/dist/...
 *
 * Logs: SSR_RUNTIME_SPIKE_PATH_DIAGNOSTIC (safe, no abs paths, no secrets)
 * Success: 200 + x-cardigo-ssr: 1 + marker
 * Failure: 500 + x-cardigo-ssr-spike-failed-stage + safe body only
 *
 * NOT real card SSR. Diagnostic only. Route: /__ssr-runtime-spike.
 */

import { readFile, access, stat } from "fs/promises";
import { constants as fsConstants } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

// Sanitize error messages for safe logging — no abs paths, no env vars, no secrets.
function sanitizeMessage(raw) {
    if (typeof raw !== "string") return String(raw ?? "").slice(0, 240);
    const cwd = process.cwd();
    let s = raw;
    if (cwd) s = s.split(cwd).join("[cwd]");
    s = s.replace(/[A-Za-z]:\\[^\s,"'<>)]+/g, "[path]");
    s = s.replace(
        /\/(?:var|opt|tmp|home|usr|proc|etc|app|lambda)[^\s,"'<>)]+/g,
        "[path]",
    );
    return s.slice(0, 240);
}

// Probe a single file path candidate safely. Returns existence + file size.
// Logs nothing by itself — caller logs the aggregated result.
async function probeCandidate(absPath) {
    try {
        await access(absPath, fsConstants.R_OK);
        const info = await stat(absPath);
        return { exists: true, isFile: info.isFile(), size: info.size };
    } catch {
        return { exists: false, isFile: false, size: 0 };
    }
}

// Build candidate absolute paths for a relative suffix like "dist/spa-shell.html".
// Returns an object: { key: absPath, ... }
function buildCandidates(relSuffix) {
    const cwd = process.cwd();
    // import.meta.url points to this .mjs file in the Lambda bundle.
    // From there: ../../<relSuffix> navigates up through netlify/functions/ to base.
    const metaDir = dirname(fileURLToPath(import.meta.url));
    return {
        cwd_dist: join(cwd, relSuffix),
        import_meta_rel: join(metaDir, "../..", relSuffix),
        import_meta_dir: join(metaDir, relSuffix),
        var_task_dist: "/var/task/" + relSuffix,
        var_task_fe_dist: "/var/task/frontend/" + relSuffix,
    };
}

// Probe all candidates and log safe diagnostics. Returns first existing abs path or null.
async function findExistingCandidate(relSuffix, logLabel) {
    const candidates = buildCandidates(relSuffix);
    const results = {};
    let firstFound = null;

    for (const [key, absPath] of Object.entries(candidates)) {
        const probe = await probeCandidate(absPath);
        // Safe log entry: key and result only — no absolute path in payload.
        results[key] = {
            exists: probe.exists,
            isFile: probe.isFile,
            ...(probe.exists ? { size: probe.size } : {}),
        };
        if (probe.exists && probe.isFile && firstFound === null) {
            firstFound = absPath;
        }
    }

    console.log("SSR_RUNTIME_SPIKE_PATH_DIAGNOSTIC", {
        label: logLabel,
        candidates: results,
    });
    return firstFound;
}

export const handler = async (event, context) => {
    let stage = "init";
    try {
        stage = "compute_paths";
        // (module-level constants retained as reference; resolution now dynamic)

        // Stage: read_spa_shell — probe candidates first, use first found
        stage = "read_spa_shell";
        const spaShellPath = await findExistingCandidate(
            "dist/spa-shell.html",
            "spa_shell",
        );
        if (!spaShellPath) {
            throw Object.assign(
                new Error("spa-shell.html not found in any candidate path"),
                {
                    code: "ENOENT_ALL_CANDIDATES",
                },
            );
        }
        const shellHtml = await readFile(spaShellPath, "utf-8");

        // Stage: import_entry_server — probe candidates, use first found
        stage = "import_entry_server";
        const ssrEntryPath = await findExistingCandidate(
            "dist_ssr/entry-server.js",
            "ssr_entry",
        );
        if (!ssrEntryPath) {
            throw Object.assign(
                new Error(
                    "dist_ssr/entry-server.js not found in any candidate path",
                ),
                {
                    code: "ENOENT_ALL_CANDIDATES",
                },
            );
        }
        const entryModule = await import(pathToFileURL(ssrEntryPath).href);

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
