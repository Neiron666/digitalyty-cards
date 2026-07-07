/**
 * card-ssr.mjs — SSR_P3_CARD_SSR_FUNCTION_ISOLATED_PREVIEW_MINIMAL
 *
 * Isolated card SSR preview function.
 * Route: /__card-ssr-preview?path=/card/:slug or ?path=/c/:orgSlug/:slug
 *
 * Does NOT serve /card/* or /c/* production routes.
 * Does NOT hardcode backend origin — requires CARDIGO_SSR_BACKEND_ORIGIN env.
 * Returns x-cardigo-ssr: 1 only on successful SSR render.
 *
 * Status contract:
 *   200 + x-cardigo-ssr:1   — card rendered as SSR HTML
 *   301/302                  — slug moved (validated redirectTo only)
 *   400                      — invalid path parameter
 *   404                      — card not found (no x-cardigo-ssr)
 *   410                      — card trial expired (no x-cardigo-ssr)
 *   503                      — backend origin not configured (no x-cardigo-ssr)
 *   fallback spa-shell       — backend error/timeout (no x-cardigo-ssr)
 */

import { readFile, access } from "fs/promises";
import { constants as fsConstants } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

// ── Path validation ───────────────────────────────────────────────────────────

const SLUG_PART_RE = /^[A-Za-z0-9_-]+$/;
const PERSONAL_PATH_RE = /^\/card\/([A-Za-z0-9_-]+)$/;
const ORG_PATH_RE = /^\/c\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)$/;

// ── Real-route mode detection ─────────────────────────────────────────────────
// Follows the same path-forwarding pattern as proxy.js:
// _redirects: /card/*  /.netlify/functions/card-ssr/card/:splat  200
// Netlify sets event.path = "/.netlify/functions/card-ssr/card/:slug"
// (destination path including the function prefix and forwarded splat).

const CARD_SSR_FUNCTION_PREFIX = "/.netlify/functions/card-ssr";

function getString(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function stripFunctionPrefix(eventPath) {
    const raw = getString(eventPath);
    if (raw.startsWith(CARD_SSR_FUNCTION_PREFIX)) {
        const sliced = raw.slice(CARD_SSR_FUNCTION_PREFIX.length);
        return sliced.startsWith("/") ? sliced : `/${sliced}`;
    }
    return raw;
}

// Returns { cardPath, isRealRoute, source }.
// Priority:
//   1. Real route (A): event.path starts with function prefix + "/card/" or "/c/"
//      (Netlify path-forwarding destination — defensive, may not trigger in practice).
//   2. Real route (B): event.path is the original public path matching PERSONAL/ORG regex
//      (actual Netlify behavior: event.path = "/card/:slug" or "/c/:org/:slug").
//   3. Preview: event.queryStringParameters.path (explicit ?path= query param).
// Never reads rawUrl, referer, host, or user-supplied mode param.
function resolveRequestedCardPath(event) {
    const eventPath = getString(event?.path);
    const prefix = CARD_SSR_FUNCTION_PREFIX;

    // Branch A: function-prefix-forwarded (defensive, preserved for correctness)
    const isForwardedCard = eventPath.startsWith(prefix + "/card/");
    const isForwardedOrg = eventPath.startsWith(prefix + "/c/");
    if (isForwardedCard || isForwardedOrg) {
        const stripped = stripFunctionPrefix(eventPath);
        return {
            cardPath: stripped,
            isRealRoute: true,
            source: "event.path.prefixed",
        };
    }

    // Branch B: original public path (actual Netlify event.path for real routes).
    // PERSONAL_PATH_RE and ORG_PATH_RE enforce strict slug-only validation.
    // Any path with extra segments, traversal, or non-slug chars is rejected here.
    const isPublicPersonal = PERSONAL_PATH_RE.test(eventPath);
    const isPublicOrg = ORG_PATH_RE.test(eventPath);
    if (isPublicPersonal || isPublicOrg) {
        return {
            cardPath: eventPath,
            isRealRoute: true,
            source: "event.path.public",
        };
    }

    // Branch C: preview mode via explicit query string parameter.
    const qsPath = getString(event?.queryStringParameters?.path);
    return {
        cardPath: qsPath,
        isRealRoute: false,
        source: "queryStringParameters",
    };
}

// Also used to validate SLUG_MOVED redirectTo.
function isSafePersonalOrOrgPath(value) {
    if (typeof value !== "string") return false;
    return PERSONAL_PATH_RE.test(value) || ORG_PATH_RE.test(value);
}

// ── Safe message sanitizer (no stack traces, no abs paths, no env vars) ──────

function sanitizeMessage(raw) {
    if (typeof raw !== "string") return String(raw ?? "").slice(0, 240);
    let s = raw;
    const cwd = process.cwd();
    if (cwd) s = s.split(cwd).join("[cwd]");
    s = s.replace(/[A-Za-z]:\\[^\s,"'<>)]+/g, "[path]");
    s = s.replace(
        /\/(?:var|opt|tmp|home|usr|proc|etc|app|lambda)[^\s,"'<>)]+/g,
        "[path]",
    );
    return s.slice(0, 240);
}

// ── File candidate resolution (robust, same approach as spike) ────────────────

async function findFile(relPath) {
    const candidates = [
        join(process.cwd(), relPath),
        "/var/task/" + relPath,
        "/var/task/frontend/" + relPath,
    ];
    for (const p of candidates) {
        try {
            await access(p, fsConstants.R_OK);
            return p;
        } catch {
            // try next
        }
    }
    return null;
}

// Simplified version using try-catch directly.
async function tryReadFile(relPath) {
    const candidates = [
        join(process.cwd(), relPath),
        "/var/task/" + relPath,
        "/var/task/frontend/" + relPath,
    ];
    for (const p of candidates) {
        try {
            const content = await readFile(p, "utf-8");
            return content;
        } catch {
            // try next
        }
    }
    return null;
}

// ── HTML assembly helpers ─────────────────────────────────────────────────────

function assembleHtml(shellHtml, appHtml, headTags, dataIslandHtml) {
    let page = shellHtml;

    // Strip static title (no data-rh; Helmet replaces it).
    page = page.replace(/<title>[\s\S]*?<\/title>/i, "");

    // Strip all Helmet-managed static tags (data-rh="true") — meta, link, script.
    page = page.replace(/<meta[^>]+data-rh="true"[^>]*>/gi, "");
    page = page.replace(/<link[^>]+data-rh="true"[^>]*>/gi, "");
    page = page.replace(
        /<script\b[^>]*data-rh="true"[^>]*>[\s\S]*?<\/script>/gi,
        "",
    );

    // Inject SSR Helmet head before </head>.
    if (headTags) {
        page = page.replace("</head>", `  ${headTags}\n</head>`);
    }

    // Inject SSR body into #root.
    page = page.replace(
        '<div id="root"></div>',
        `<div id="root">${appHtml}</div>`,
    );

    // Inject data island before </body>.
    if (dataIslandHtml) {
        page = page.replace("</body>", `  ${dataIslandHtml}\n</body>`);
    }

    return page;
}

// ── SSR DTO sanitizer ─────────────────────────────────────────────────────────

const FORBIDDEN_TOP_LEVEL = new Set([
    "_id",
    "user",
    "owner",
    "userId",
    "anonymousId",
    "billing",
    "adminOverride",
    "uploads",
    "headSnippets",
    "adminTier",
    "effectiveBilling",
    "effectiveTier",
    "tierSource",
    "tierUntil",
    "trialStartedAt",
    "trialEndsAt",
    "trialEndsAtIsrael",
    "trialDeleteAt",
    "createdAt",
    "updatedAt",
    "flags",
]);

const ENTITLEMENTS_ALLOWLIST = new Set([
    "canUseGallery",
    "galleryLimit",
    "canUseLeads",
    "canUseBooking",
    "canUseVideo",
    "canUseReviews",
    "canUseBusinessHours",
    "canUseServices",
    "maxContentParagraphs",
]);

const DESIGN_PATH_SUFFIX_RE = /Path$/;

const PUBLIC_CARD_SSR_TOP_LEVEL_ALLOWLIST = new Set([
    "slug",
    "status",
    "language",
    "isActive",
    "business",
    "contact",
    "content",
    "businessHours",
    "bookingSettings",
    "faq",
    "design",
    "gallery",
    "reviews",
    "seo",
    "seoResolved",
    "publicPath",
    "ogPath",
    "selfThemeCssHref",
    "entitlements",
]);

function sanitizePublicCardForSsr(rawCard) {
    if (!rawCard || typeof rawCard !== "object") return rawCard;
    // Build from explicit allowlist only — unknown top-level keys are never copied
    const card = {};
    for (const key of PUBLIC_CARD_SSR_TOP_LEVEL_ALLOWLIST) {
        if (key in rawCard) card[key] = rawCard[key];
    }
    // Belt-and-suspenders: also remove known-forbidden keys in case allowlist changes
    for (const key of FORBIDDEN_TOP_LEVEL) {
        delete card[key];
    }
    // Remove internal storage path fields from design
    if (card.design && typeof card.design === "object") {
        const design = { ...card.design };
        for (const key of Object.keys(design)) {
            if (DESIGN_PATH_SUFFIX_RE.test(key)) {
                delete design[key];
            }
        }
        card.design = design;
    }
    // Remove internal storage path fields from gallery items
    if (Array.isArray(card.gallery)) {
        card.gallery = card.gallery.map((item) => {
            if (!item || typeof item !== "object") return item;
            const g = { ...item };
            delete g.path;
            delete g.thumbPath;
            delete g.storagePath;
            delete g.internalPath;
            delete g.createdAt;
            return g;
        });
    }
    // Replace entitlements with public allowlist only
    if (card.entitlements && typeof card.entitlements === "object") {
        const pub = {};
        for (const key of ENTITLEMENTS_ALLOWLIST) {
            if (key in card.entitlements) pub[key] = card.entitlements[key];
        }
        card.entitlements = pub;
    }
    return card;
}

const FORBIDDEN_SSR_MARKERS = [
    "effectiveBilling",
    "effectiveTier",
    "tierSource",
    "tierUntil",
    "adminOverride",
    "billing",
    "headSnippets",
    "adminTier",
    "trialDeleteAt",
    "anonymousId",
    "canEdit",
    "lockedReason",
    "analyticsLevel",
    "canViewAnalytics",
    "analyticsRetentionDays",
    "canUploadGallery",
    "canPublish",
    "canEditSeo",
    "canChangeSlug",
    "canUseAnalyticsPremium",
    "backgroundImagePath",
    "coverImagePath",
    "avatarImagePath",
    "logoPath",
    "thumbPath",
    "flags",
    "isTemplateSeeded",
];

function assertNoForbiddenSsrPayloadFields(card) {
    const json = JSON.stringify(card);
    for (const marker of FORBIDDEN_SSR_MARKERS) {
        if (json.includes(`"${marker}"`)) {
            throw Object.assign(new Error(`Forbidden SSR field: ${marker}`), {
                code: "FORBIDDEN_SSR_FIELD",
            });
        }
    }
    if (json.includes('"path":"cards/') || json.includes('"path": "cards/')) {
        throw Object.assign(
            new Error("Forbidden storage path in SSR payload"),
            { code: "FORBIDDEN_SSR_FIELD" },
        );
    }
}

// ── Server-Timing helpers ─────────────────────────────────────────────────────
// _fmtDur: formats start→end as ms with 1 decimal, or returns null on any failure.
// Never throws. Both parameters must be finite numbers and end >= start.
function _fmtDur(start, end) {
    try {
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
        const d = end - start;
        if (d < 0) return null;
        return d.toFixed(1);
    } catch {
        return null;
    }
}

// _buildLambdaServerTiming: builds the server-timing string for the Lambda 200 path.
// Returns a comma-separated string of lambda_* metrics, or null if all fail.
// Never throws.
function _buildLambdaServerTiming(tL0, tL1, tA0, tA1, tR0, tR1, tAs0, tAs1) {
    try {
        const parts = [];
        const api = _fmtDur(tA0, tA1);
        const render = _fmtDur(tR0, tR1);
        const assemble = _fmtDur(tAs0, tAs1);
        const total = _fmtDur(tL0, tL1);
        if (api !== null) parts.push(`lambda_api;dur=${api}`);
        if (render !== null) parts.push(`lambda_render;dur=${render}`);
        if (assemble !== null) parts.push(`lambda_assemble;dur=${assemble}`);
        if (total !== null) parts.push(`lambda_total;dur=${total}`);
        return parts.length ? parts.join(", ") : null;
    } catch {
        return null;
    }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export const handler = async (event, context) => {
    let stage = "init";
    const _tLambda0 = performance.now();
    try {
        // Stage: validate_env
        stage = "validate_env";
        const backendOrigin = process.env.CARDIGO_SSR_BACKEND_ORIGIN ?? "";
        if (!backendOrigin || !backendOrigin.startsWith("https://")) {
            console.error("CARD_SSR_PREVIEW_FAILED", {
                stage,
                reason: "CARDIGO_SSR_BACKEND_ORIGIN missing or invalid",
            });
            return {
                statusCode: 503,
                headers: {
                    "content-type": "text/plain; charset=utf-8",
                    "cache-control": "no-store",
                    "x-robots-tag": "noindex",
                },
                body: "SSR_PREVIEW_UNAVAILABLE: backend origin not configured",
            };
        }
        const proxySecret = process.env.CARDIGO_PROXY_SHARED_SECRET ?? "";
        if (!proxySecret) {
            console.error("CARD_SSR_PREVIEW_FAILED", {
                stage,
                reason: "CARDIGO_PROXY_SHARED_SECRET missing",
            });
            return {
                statusCode: 503,
                headers: {
                    "content-type": "text/plain; charset=utf-8",
                    "cache-control": "no-store",
                    "x-robots-tag": "noindex",
                },
                body: "SSR_PREVIEW_UNAVAILABLE: proxy secret not configured",
            };
        }

        // Stage: validate_path
        stage = "validate_path";
        const { cardPath: rawPath, isRealRoute } =
            resolveRequestedCardPath(event);
        const personalMatch = rawPath.match(PERSONAL_PATH_RE);
        const orgMatch = rawPath.match(ORG_PATH_RE);
        if (!personalMatch && !orgMatch) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "text/plain; charset=utf-8",
                    "cache-control": "no-store",
                    "x-robots-tag": "noindex",
                },
                body: "SSR_PREVIEW_INVALID_PATH: allowed patterns: /card/<slug> or /c/<orgSlug>/<slug>",
            };
        }
        const isOrg = Boolean(orgMatch);
        const slug = isOrg ? orgMatch[2] : personalMatch[1];
        const orgSlug = isOrg ? orgMatch[1] : null;
        const cardPath = rawPath; // already validated

        // Stage: read_spa_shell
        stage = "read_spa_shell";
        const shellHtml = await tryReadFile("dist/spa-shell.html");
        if (!shellHtml) {
            throw Object.assign(
                new Error("spa-shell.html not found in any candidate path"),
                { code: "ENOENT_SPA_SHELL" },
            );
        }

        // Stage: import_entry
        stage = "import_entry";
        const entryServerCardPath = await (async () => {
            const candidates = [
                join(process.cwd(), "dist_ssr_card/entry-server-card.js"),
                "/var/task/dist_ssr_card/entry-server-card.js",
                "/var/task/frontend/dist_ssr_card/entry-server-card.js",
            ];
            for (const p of candidates) {
                try {
                    await readFile(p, "utf-8"); // just access-check
                    return p;
                } catch {
                    // try next
                }
            }
            return null;
        })();
        if (!entryServerCardPath) {
            throw Object.assign(
                new Error(
                    "dist_ssr_card/entry-server-card.js not found in any candidate path",
                ),
                { code: "ENOENT_ENTRY" },
            );
        }
        const { renderCardRoute } = await import(
            pathToFileURL(entryServerCardPath).href
        );
        if (typeof renderCardRoute !== "function") {
            throw new Error("renderCardRoute is not a function");
        }

        // Stage: import_serializer
        stage = "import_serializer";
        const serializerPath = await (async () => {
            const candidates = [
                join(process.cwd(), "scripts/lib/jsonForHtml.mjs"),
                "/var/task/scripts/lib/jsonForHtml.mjs",
                "/var/task/frontend/scripts/lib/jsonForHtml.mjs",
            ];
            for (const p of candidates) {
                try {
                    await readFile(p, "utf-8");
                    return p;
                } catch {
                    // try next
                }
            }
            return null;
        })();
        let serializeJsonForHtml;
        if (serializerPath) {
            const serializerMod = await import(
                pathToFileURL(serializerPath).href
            );
            serializeJsonForHtml = serializerMod.serializeJsonForHtml;
        } else {
            // Inline fallback if included_files didn't land serializer.
            serializeJsonForHtml = (value) => {
                const json = JSON.stringify(value);
                if (typeof json !== "string") return "null";
                return json
                    .replace(/</g, "\\u003c")
                    .replace(/>/g, "\\u003e")
                    .replace(/&/g, "\\u0026")
                    .replace(/\u2028/g, "\\u2028")
                    .replace(/\u2029/g, "\\u2029");
            };
        }

        // Stage: fetch_card
        stage = "fetch_card";
        const _tApi0 = performance.now();
        const apiPath = isOrg
            ? `/api/c/${encodeURIComponent(orgSlug)}/${encodeURIComponent(slug)}`
            : `/api/cards/${encodeURIComponent(slug)}`;
        const apiUrl = backendOrigin + apiPath;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        let apiResponse;
        try {
            apiResponse = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "x-cardigo-proxy-secret": proxySecret,
                },
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeoutId);
        }

        const apiStatus = apiResponse.status;

        // 404 handling: check for SLUG_MOVED
        if (apiStatus === 404) {
            let body404;
            try {
                body404 = await apiResponse.json();
            } catch {
                body404 = null;
            }
            if (
                body404?.code === "SLUG_MOVED" &&
                typeof body404?.redirectTo === "string" &&
                isSafePersonalOrOrgPath(body404.redirectTo)
            ) {
                return {
                    statusCode: 301,
                    headers: {
                        location:
                            "/__card-ssr-preview?path=" +
                            encodeURIComponent(body404.redirectTo),
                        "cache-control": "no-store",
                        "x-robots-tag": "noindex",
                    },
                    body: "",
                };
            }
            // Plain 404 — card not found
            return {
                statusCode: 404,
                headers: {
                    "content-type": "text/plain; charset=utf-8",
                    "cache-control": "no-store",
                    "x-robots-tag": "noindex",
                },
                body: "SSR_PREVIEW_NOT_FOUND",
            };
        }

        // 410 handling
        if (apiStatus === 410) {
            return {
                statusCode: 410,
                headers: {
                    "content-type": "text/plain; charset=utf-8",
                    "cache-control": "no-store",
                    "x-robots-tag": "noindex",
                },
                body: "SSR_PREVIEW_CARD_EXPIRED",
            };
        }

        // Non-200 backend errors
        if (apiStatus !== 200) {
            console.error("CARD_SSR_PREVIEW_FAILED", {
                stage: "fetch_card",
                backendStatus: apiStatus,
            });
            return {
                statusCode: 200,
                headers: {
                    "content-type": "text/html; charset=utf-8",
                    "cache-control": "no-store",
                    "x-robots-tag": "noindex",
                },
                body: shellHtml,
            };
        }

        // Stage: parse_dto
        stage = "parse_dto";
        let dto;
        try {
            dto = await apiResponse.json();
        } catch {
            dto = null;
        }
        if (!dto || typeof dto.slug !== "string" || !dto.slug) {
            throw Object.assign(new Error("DTO missing or invalid slug"), {
                code: "INVALID_DTO",
            });
        }
        const _tApi1 = performance.now();

        // Stage: sanitize_dto
        stage = "sanitize_dto";
        const safeCard = sanitizePublicCardForSsr(dto);
        assertNoForbiddenSsrPayloadFields(safeCard);

        // Stage: render_ssr
        stage = "render_ssr";
        const routeKey = isOrg ? `c/${orgSlug}/${slug}` : `card/${slug}`;
        const initialDetailData = { [routeKey]: safeCard };
        const _tRender0 = performance.now();
        const { html: appHtml, helmetContext } = await renderCardRoute(
            cardPath,
            { initialDetailData },
        );
        const _tRender1 = performance.now();

        // Stage: assemble_html
        stage = "assemble_html";
        const _tAssemble0 = performance.now();
        const { helmet } = helmetContext ?? {};
        const headParts = [
            helmet?.title?.toString() ?? "",
            helmet?.meta?.toString() ?? "",
            helmet?.link?.toString() ?? "",
            helmet?.script?.toString() ?? "",
        ]
            .map((s) => s.trim())
            .filter(Boolean)
            .join("\n  ");

        const safeDataIsland = serializeJsonForHtml(initialDetailData);
        const dataIslandHtml = `<script type="application/json" id="cardigo-initial-detail-data">${safeDataIsland}</script>`;

        const finalHtml = assembleHtml(
            shellHtml,
            appHtml,
            headParts,
            dataIslandHtml,
        );
        const _tAssemble1 = performance.now();

        const _lambdaSt = (() => {
            try {
                return _buildLambdaServerTiming(
                    _tLambda0,
                    _tAssemble1,
                    _tApi0,
                    _tApi1,
                    _tRender0,
                    _tRender1,
                    _tAssemble0,
                    _tAssemble1,
                );
            } catch {
                return null;
            }
        })();

        return {
            statusCode: 200,
            headers: {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store, max-age=0",
                "x-cardigo-ssr": "1",
                ...(!isRealRoute ? { "x-robots-tag": "noindex" } : {}),
                ...(_lambdaSt ? { "server-timing": _lambdaSt } : {}),
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
        console.error("CARD_SSR_PREVIEW_FAILED", safePayload);

        return {
            statusCode: 500,
            headers: {
                "content-type": "text/plain; charset=utf-8",
                "cache-control": "no-store",
                "x-robots-tag": "noindex",
            },
            body: `SSR_PREVIEW_FAILED_STAGE:${stage}`,
        };
    }
};
