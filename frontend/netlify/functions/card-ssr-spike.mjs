/**
 * card-ssr-spike.mjs — SSR_P3_NETLIFY_FUNCTION_SSR_RUNTIME_SPIKE_PATH_RESOLUTION_DIAGNOSTIC
 *
 * Phase 2E: Robust path diagnostic — fixes ERR_INVALID_ARG_TYPE from undefined import.meta.url.
 *
 * Root cause (Phase 2D): buildCandidates called fileURLToPath(import.meta.url) at module scope.
 * In esbuild-bundled Netlify Lambda, import.meta.url may be undefined, causing
 * fileURLToPath(undefined) → TypeError: ERR_INVALID_ARG_TYPE before any probing occurred.
 *
 * Fix: candidate array with explicit type guards. isUsablePathValue() checks before any
 * fs.access/stat/readFile/import call. Unsafe candidates logged as { invalid: true }.
 * SSR_RUNTIME_SPIKE_PATH_DIAGNOSTIC always logged before any throw.
 *
 * Candidates probed:
 *   cwd           — process.cwd() / relSuffix   (always safe)
 *   var_task      — /var/task/ relSuffix         (always safe)
 *   var_task_fe   — /var/task/frontend/ relSuffix (always safe)
 *   meta_rel      — import.meta.url up 2 levels  (guarded — may be undefined in Lambda)
 *   meta_dir      — import.meta.url same dir     (guarded — may be undefined in Lambda)
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

// Guard: only non-empty strings or URL instances are safe path arguments.
function isUsablePathValue(value) {
    if (value instanceof URL) return true;
    if (typeof value === "string" && value.length > 0) return true;
    return false;
}

// Probe a single candidate safely. Returns safe result or invalid marker.
// Never throws. Never exposes absolute path in result.
async function probeCandidate(candidate) {
    const { key, pathValue } = candidate;
    // Guard: skip fs calls entirely for invalid path values.
    if (!isUsablePathValue(pathValue)) {
        return {
            key,
            exists: false,
            isFile: false,
            invalid: true,
            type: typeof pathValue,
        };
    }
    try {
        await access(pathValue, fsConstants.R_OK);
        const info = await stat(pathValue);
        return {
            key,
            exists: true,
            isFile: info.isFile(),
            size: info.size,
        };
    } catch {
        return { key, exists: false, isFile: false };
    }
}

// Safely compute import.meta.url-relative path without throwing.
// Returns null if import.meta.url is not a valid string URL.
function safeMetaRelPath(relSuffix) {
    try {
        if (typeof import.meta.url !== "string" || !import.meta.url) {
            return null;
        }
        const metaDir = dirname(fileURLToPath(import.meta.url));
        return join(metaDir, relSuffix);
    } catch {
        return null;
    }
}

// Build candidate array. Each element has { key, pathValue }.
// pathValue may be null/undefined if computation failed — guarded by isUsablePathValue.
function buildCandidates(relSuffix) {
    return [
        { key: "cwd", pathValue: join(process.cwd(), relSuffix) },
        { key: "var_task", pathValue: "/var/task/" + relSuffix },
        { key: "var_task_fe", pathValue: "/var/task/frontend/" + relSuffix },
        {
            key: "meta_rel",
            pathValue: safeMetaRelPath("../.." + "/" + relSuffix),
        },
        { key: "meta_dir", pathValue: safeMetaRelPath(relSuffix) },
    ];
}

// Probe all candidates and log safe diagnostics. Returns first existing abs path or null.
// Always logs SSR_RUNTIME_SPIKE_PATH_DIAGNOSTIC before returning or throwing.
async function findExistingCandidate(relSuffix, logLabel) {
    const candidates = buildCandidates(relSuffix);
    const results = {};
    let firstFoundPath = null;

    for (const candidate of candidates) {
        const probe = await probeCandidate(candidate);
        // Safe log entry: key and result only — no absolute path in payload.
        results[candidate.key] = {
            exists: probe.exists,
            isFile: probe.isFile,
            ...(probe.exists ? { size: probe.size } : {}),
            ...(probe.invalid ? { invalid: true, type: probe.type } : {}),
        };
        if (probe.exists && probe.isFile && firstFoundPath === null) {
            firstFoundPath = candidate.pathValue;
        }
    }

    console.log("SSR_RUNTIME_SPIKE_PATH_DIAGNOSTIC", {
        label: logLabel,
        candidates: results,
    });
    return firstFoundPath;
}

export const handler = async (event, context) => {
    let stage = "init";
    try {
        stage = "compute_paths";

        // Stage: read_spa_shell — probe candidates, use first found
        stage = "read_spa_shell";
        const spaShellPath = await findExistingCandidate(
            "dist/spa-shell.html",
            "spa_shell",
        );
        if (!isUsablePathValue(spaShellPath)) {
            throw Object.assign(
                new Error("spa-shell.html not found in any candidate path"),
                { code: "ENOENT_ALL_CANDIDATES" },
            );
        }
        const shellHtml = await readFile(spaShellPath, "utf-8");

        // Stage: import_entry_server — probe candidates, use first found
        stage = "import_entry_server";
        const ssrEntryPath = await findExistingCandidate(
            "dist_ssr/entry-server.js",
            "ssr_entry",
        );
        if (!isUsablePathValue(ssrEntryPath)) {
            throw Object.assign(
                new Error(
                    "dist_ssr/entry-server.js not found in any candidate path",
                ),
                { code: "ENOENT_ALL_CANDIDATES" },
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
