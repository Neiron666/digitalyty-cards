/* global Netlify */

// Cardigo — Social Preview Edge Function
// Dual-mode: (1) static OG HTML generated directly here for marketing listing pages
// (/cards, /pricing, /contact, /blog listing, /guides listing);
// (2) transparent backend proxy via /og/* for public card, org-card, blog-post,
// and guide-post detail routes.
// Normal browsers are excluded at config level via user-agent header matching —
// they never invoke this function and continue through _redirects to the SPA as today.
// Googlebot and bingbot enter via the search-crawler branch which injects route-specific
// head tags into the SPA shell without serving backend /og HTML directly.
// Fail-open is intentional: unexpected backend failures or runtime errors fall through
// to context.next(), which serves the existing SPA shell rather than breaking the route.

import {
    CARDIGO_OG_IMAGE_URL,
    buildMarketingUrl,
    getMarketingMeta,
} from "../../src/seo/marketingMeta.config.js";

const BACKEND_ORIGIN = "https://cardigo-backend.onrender.com";
const PROXY_SECRET_HEADER = "x-cardigo-proxy-secret";
const SECRET_ENV_KEY = "CARDIGO_PROXY_SHARED_SECRET";
const SLUG_RE = /^[A-Za-z0-9_-]+$/;

// UA classification — determines social vs. search-crawler vs. browser routing
const SOCIAL_UA_RE =
    /facebookexternalhit|Facebot|WhatsApp|whatsapp|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Slack-ImgProxy|Discordbot|discordbot|Pinterest|pinterest|vkShare/;
const CRAWLER_UA_RE = /Googlebot|Googlebot-Image|bingbot/;

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildStaticMarketingOgHtml({
    title,
    description,
    url,
    imageAlt,
    includeCanonical = false,
}) {
    const t = escapeHtml(title);
    const d = escapeHtml(description);
    const u = escapeHtml(url);
    const a = escapeHtml(imageAlt);
    const img = CARDIGO_OG_IMAGE_URL;
    return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
${includeCanonical ? `<link rel="canonical" href="${u}">\n` : ``}<title>${t}</title>
<meta name="description" content="${d}">
<meta property="og:locale" content="he_IL">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Cardigo">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${img}">
<meta property="og:image:secure_url" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="${a}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
<meta name="twitter:image:alt" content="${a}">
</head>
<body></body>
</html>`;
}
// JSON-LD whitelist bounds — defense-in-depth caps on Edge-injected trusted scripts
const MAX_LD_SCRIPTS = 4;
const MAX_LD_BODY_BYTES = 65536;
// Reject any script tag carrying these attributes — application/ld+json must be pure inline data
const FORBIDDEN_SCRIPT_ATTRS_RE =
    /\b(?:src|nonce|crossorigin|integrity|referrerpolicy|defer|async)\b/i;
const LD_TYPE_ATTR_RE = /\btype\s*=\s*["']application\/ld\+json["']/i;

function injectMetadataIntoShell(ogHtml, shellHtml) {
    // Scope extraction to ogHtml head block only — never read body content
    const headBlockMatch = ogHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const ogHead = headBlockMatch ? headBlockMatch[1] : "";

    // Whitelist-only extraction — never extract http-equiv, refresh, body
    const titleMatch = ogHead.match(/<title[^>]*>[\s\S]*?<\/title>/i);
    const extractedTitle = titleMatch ? titleMatch[0] : null;

    const descMatch = ogHead.match(
        /<meta\s[^>]*name=["']description["'][^>]*>/i,
    );
    const extractedDesc = descMatch ? descMatch[0] : null;

    const canonicalMatch = ogHead.match(
        /<link\s[^>]*rel=["']canonical["'][^>]*>/i,
    );
    const extractedCanonical = canonicalMatch ? canonicalMatch[0] : null;

    // Extract canonical href for JSON-LD marker attr; skip JSON-LD entirely if absent
    let canonicalHref = null;
    if (extractedCanonical) {
        const hrefMatch = extractedCanonical.match(
            /href\s*=\s*["']([^"']+)["']/i,
        );
        if (hrefMatch) canonicalHref = hrefMatch[1];
    }

    // robots may be absent for indexed cards — do not insert if not present in ogHtml
    const robotsMatch = ogHead.match(/<meta\s[^>]*name=["']robots["'][^>]*>/i);
    const extractedRobots = robotsMatch ? robotsMatch[0] : null;

    const ogMetaTags = [
        ...ogHead.matchAll(/<meta\s[^>]*property=["']og:[^"']*["'][^>]*>/gi),
    ]
        .map((m) => m[0])
        .join("\n");

    const twitterMetaTags = [
        ...ogHead.matchAll(/<meta\s[^>]*name=["']twitter:[^"']*["'][^>]*>/gi),
    ]
        .map((m) => m[0])
        .join("\n");

    // Trusted application/ld+json whitelist — scoped to ogHead only.
    // Body is preserved byte-for-byte from backend serializer (already escapes
    // </script, <!--, U+2028, U+2029). Each rebuilt with P2B-1 marker attrs.
    const jsonLdRebuilt = [];
    if (canonicalHref) {
        const canonicalAttr = escapeHtml(canonicalHref);
        const scriptMatches = [
            ...ogHead.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi),
        ];
        for (const m of scriptMatches) {
            if (jsonLdRebuilt.length >= MAX_LD_SCRIPTS) break;
            const attrs = m[1] || "";
            const body = m[2] || "";
            if (!LD_TYPE_ATTR_RE.test(attrs)) continue;
            if (FORBIDDEN_SCRIPT_ATTRS_RE.test(attrs)) continue;
            if (body.length > MAX_LD_BODY_BYTES) continue;
            jsonLdRebuilt.push(
                `<script type="application/ld+json" data-cardigo-edge-ld="1" data-cardigo-edge-ld-canonical="${canonicalAttr}">${body}</script>`,
            );
        }
    }

    // Build injection block to insert before </head>
    const injectionParts = [];
    if (extractedCanonical) injectionParts.push(extractedCanonical);
    if (extractedRobots) injectionParts.push(extractedRobots);
    if (ogMetaTags) injectionParts.push(ogMetaTags);
    if (twitterMetaTags) injectionParts.push(twitterMetaTags);
    if (jsonLdRebuilt.length) injectionParts.push(jsonLdRebuilt.join("\n"));
    const injection = injectionParts.join("\n");

    let result = shellHtml;

    // Replace title in-place to preserve head ordering
    if (extractedTitle) {
        result = result.replace(
            /<title[^>]*>[\s\S]*?<\/title>/i,
            extractedTitle,
        );
    }

    // Replace meta description in-place
    if (extractedDesc) {
        result = result.replace(
            /<meta\s[^>]*name=["']description["'][^>]*>/i,
            extractedDesc,
        );
    }

    // Remove existing canonical (shell has none currently; guard is future-safe)
    result = result.replace(/<link\s[^>]*rel=["']canonical["'][^>]*>/gi, "");

    // Remove existing robots (shell has none currently; guard is future-safe)
    result = result.replace(/<meta\s[^>]*name=["']robots["'][^>]*>/gi, "");

    // Remove all existing og:* metas wholesale
    result = result.replace(
        /<meta\s[^>]*property=["']og:[^"']*["'][^>]*>/gi,
        "",
    );

    // Remove all existing twitter:* metas wholesale
    result = result.replace(
        /<meta\s[^>]*name=["']twitter:[^"']*["'][^>]*>/gi,
        "",
    );

    // Remove pre-existing application/ld+json scripts from shell (none today; future-safe).
    // Non-JSON-LD scripts are preserved intact.
    result = result.replace(
        /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
        "",
    );

    // Insert extracted route-specific tags before </head>
    if (injection) {
        result = result.replace(/<\/head>/i, injection + "\n</head>");
    }

    return result;
}

function extractOgMainContent(ogHtml) {
    try {
        const mainMatch = ogHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
        if (mainMatch) return mainMatch[1];
        const bodyMatch = ogHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) return bodyMatch[1];
        return null;
    } catch {
        return null;
    }
}

function sanitizeOgBody(raw) {
    if (!raw || typeof raw !== "string") return null;
    try {
        let s = raw;
        s = s.replace(/<script\b[\s\S]*?<\/script>/gi, "");
        s = s.replace(/<style\b[\s\S]*?<\/style>/gi, "");
        s = s.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "");
        s = s.replace(/<object\b[\s\S]*?<\/object>/gi, "");
        s = s.replace(/<embed\b[^>]*>/gi, "");
        s = s.replace(/<form\b[\s\S]*?<\/form>/gi, "");
        s = s.replace(/<meta\b[^>]*>/gi, "");
        s = s.replace(/<link\b[^>]*>/gi, "");
        s = s.replace(/<title\b[\s\S]*?<\/title>/gi, "");
        s = s.replace(/\bon\w+\s*=\s*"[^"]*"/gi, "");
        s = s.replace(/\bon\w+\s*=\s*'[^']*'/gi, "");
        s = s.replace(/\bon\w+\s*=\s*[^\s"'>]*/gi, "");
        s = s.replace(/\bstyle\s*=\s*"[^"]*"/gi, "");
        s = s.replace(/\bstyle\s*=\s*'[^']*'/gi, "");
        s = s.replace(/\bstyle\s*=\s*[^\s"'>]*/gi, "");
        s = s.replace(/\bhref\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
        s = s.replace(/\bhref\s*=\s*'javascript:[^']*'/gi, "href='#'");
        s = s.replace(/\bsrc\s*=\s*"javascript:[^"]*"/gi, 'src=""');
        s = s.replace(/\bsrc\s*=\s*'javascript:[^']*'/gi, "src=''");
        s = s.replace(/\bdata-cardigo-edge-ld(?:-[\w-]*)?\s*=\s*"[^"]*"/gi, "");
        s = s.replace(/\bdata-cardigo-edge-ld(?:-[\w-]*)?\s*=\s*'[^']*'/gi, "");
        s = s.replace(
            /\bdata-cardigo-edge-ld(?:-[\w-]*)?\s*=\s*[^\s"'>]*/gi,
            "",
        );
        s = s.trim();
        if (!s) return null;
        return s;
    } catch {
        return null;
    }
}

function injectBodyFallback(sanitizedBody, shellHtml) {
    if (!sanitizedBody) return shellHtml;
    const ROOT_MARKER = '<div id="root"></div>';
    if (!shellHtml.includes(ROOT_MARKER)) return shellHtml;
    return shellHtml.replace(
        ROOT_MARKER,
        '<div id="cardigo-body-fallback" data-cardigo-body-fallback="1">\n' +
            sanitizedBody +
            "\n</div>\n" +
            ROOT_MARKER,
    );
}

// Unified browser+crawler enriched-shell helper for /card and /c routes.
// Behavior parity: both UA classes receive the same enriched SPA shell body
// for 200 backend responses. Differs only on 404/410: crawlers get propagated
// status with no-store; browsers fail-open to context.next() to preserve the
// existing browser route-status contract (unknown slug = SPA shell 200).
async function serveCardEnrichedShell(backendPath, context, { isCrawler }) {
    const proxySecret = Netlify.env.get(SECRET_ENV_KEY) || "";
    if (!proxySecret) {
        return context.next();
    }

    let ogResponse;
    try {
        ogResponse = await fetch(backendPath, {
            method: "GET",
            headers: {
                [PROXY_SECRET_HEADER]: proxySecret,
                accept: "text/html",
            },
        });
    } catch (_fetchErr) {
        return context.next();
    }

    const ogStatus = ogResponse.status;

    if (ogStatus === 404) {
        if (isCrawler) {
            return new Response("Not found", {
                status: 404,
                headers: {
                    "content-type": "text/html; charset=utf-8",
                    "cache-control": "no-store",
                },
            });
        }
        // Browser route-status contract: do not propagate 404 to browser
        return context.next();
    }

    if (ogStatus === 410) {
        if (isCrawler) {
            return new Response("Gone", {
                status: 410,
                headers: {
                    "content-type": "text/html; charset=utf-8",
                    "cache-control": "no-store",
                },
            });
        }
        // Browser route-status contract: do not propagate 410 to browser
        return context.next();
    }

    if (ogStatus !== 200) {
        // 401, 403, 5xx, or any unexpected status — fail open for both UA classes
        return context.next();
    }

    const ogCt = ogResponse.headers.get("content-type") || "";
    if (!ogCt.startsWith("text/html")) {
        return context.next();
    }

    const ogHtml = await ogResponse.text();

    // context.next() called exactly once — only after backend fetch succeeds
    const shellResponse = await context.next();

    if (shellResponse.status !== 200) {
        return shellResponse;
    }

    const shellCt = shellResponse.headers.get("content-type") || "";
    if (!shellCt.startsWith("text/html")) {
        return shellResponse;
    }

    try {
        const shellClone = shellResponse.clone();
        const shellHtml = await shellClone.text();
        const headInjectedHtml = injectMetadataIntoShell(ogHtml, shellHtml);
        let finalHtml = headInjectedHtml;
        try {
            const rawBody = extractOgMainContent(ogHtml);
            const safeBody = sanitizeOgBody(rawBody);
            finalHtml = injectBodyFallback(safeBody, headInjectedHtml);
        } catch (_bodyErr) {
            finalHtml = headInjectedHtml;
        }
        return new Response(finalHtml, {
            status: 200,
            headers: {
                "content-type": "text/html; charset=utf-8",
                // Unified cache policy for browser + crawler enriched shell.
                // Vary: User-Agent is REQUIRED because the same URL returns a
                // different body to social UAs (backend OG body verbatim).
                "cache-control":
                    "public, max-age=60, stale-while-revalidate=300",
                vary: "User-Agent",
            },
        });
    } catch (_injErr) {
        // Injection failed — return original shell unchanged
        // Do NOT call context.next() again
        return shellResponse;
    }
}
// P2B-2: header.user-agent gate removed so browser UA can enter for /card/:slug
// and /c/:orgSlug/:slug. Browser UA on non-card/c paths fast-passes via
// context.next() inside the handler. UA classification (social/crawler/browser)
// is performed inside the handler via SOCIAL_UA_RE / CRAWLER_UA_RE.
export const config = {
    path: [
        "/card/*",
        "/c/*",
        "/blog/*",
        "/guides/*",
        "/cards",
        "/pricing",
        "/contact",
        "/blog",
        "/guides",
    ],
    method: ["GET"],
};

export default async function ogPreview(request, context) {
    try {
        // Defense-in-depth: config already limits to GET, but guard here too
        if (request.method !== "GET") {
            return context.next();
        }

        const { pathname } = new URL(request.url);
        const segments = pathname.split("/").filter(Boolean);

        const ua = request.headers.get("user-agent") || "";
        const isSocial = SOCIAL_UA_RE.test(ua);
        const isCrawler = !isSocial && CRAWLER_UA_RE.test(ua);

        if (isSocial) {
            // Social bot branch — all existing behavior unchanged

            // Static OG for marketing listing routes — no backend call needed
            if (segments.length === 1 && segments[0] === "cards") {
                const meta = getMarketingMeta("cards");
                if (!meta) return context.next();
                return new Response(
                    buildStaticMarketingOgHtml({
                        title: meta.title,
                        description: meta.description,
                        url: buildMarketingUrl(meta.path),
                        imageAlt: meta.imageAlt,
                    }),
                    {
                        status: 200,
                        headers: {
                            "content-type": "text/html; charset=utf-8",
                            "cache-control":
                                "public, max-age=3600, stale-while-revalidate=300",
                        },
                    },
                );
            }

            if (segments.length === 1 && segments[0] === "pricing") {
                const meta = getMarketingMeta("pricing");
                if (!meta) return context.next();
                return new Response(
                    buildStaticMarketingOgHtml({
                        title: meta.title,
                        description: meta.description,
                        url: buildMarketingUrl(meta.path),
                        imageAlt: meta.imageAlt,
                    }),
                    {
                        status: 200,
                        headers: {
                            "content-type": "text/html; charset=utf-8",
                            "cache-control":
                                "public, max-age=3600, stale-while-revalidate=300",
                        },
                    },
                );
            }

            if (segments.length === 1 && segments[0] === "contact") {
                const meta = getMarketingMeta("contact");
                if (!meta) return context.next();
                return new Response(
                    buildStaticMarketingOgHtml({
                        title: meta.title,
                        description: meta.description,
                        url: buildMarketingUrl(meta.path),
                        imageAlt: meta.imageAlt,
                    }),
                    {
                        status: 200,
                        headers: {
                            "content-type": "text/html; charset=utf-8",
                            "cache-control":
                                "public, max-age=3600, stale-while-revalidate=300",
                        },
                    },
                );
            }

            if (segments[0] === "blog" && segments.length === 1) {
                const meta = getMarketingMeta("blog");
                if (!meta) return context.next();
                return new Response(
                    buildStaticMarketingOgHtml({
                        title: meta.title,
                        description: meta.description,
                        url: buildMarketingUrl(meta.path),
                        imageAlt: meta.imageAlt,
                    }),
                    {
                        status: 200,
                        headers: {
                            "content-type": "text/html; charset=utf-8",
                            "cache-control":
                                "public, max-age=3600, stale-while-revalidate=300",
                        },
                    },
                );
            }

            if (segments[0] === "guides" && segments.length === 1) {
                const meta = getMarketingMeta("guides");
                if (!meta) return context.next();
                return new Response(
                    buildStaticMarketingOgHtml({
                        title: meta.title,
                        description: meta.description,
                        url: buildMarketingUrl(meta.path),
                        imageAlt: meta.imageAlt,
                    }),
                    {
                        status: 200,
                        headers: {
                            "content-type": "text/html; charset=utf-8",
                            "cache-control":
                                "public, max-age=3600, stale-while-revalidate=300",
                        },
                    },
                );
            }

            let backendPath;

            if (segments[0] === "card" && segments.length === 2) {
                const slug = segments[1];
                if (!SLUG_RE.test(slug)) return context.next();
                backendPath =
                    BACKEND_ORIGIN + "/og/card/" + encodeURIComponent(slug);
            } else if (segments[0] === "c" && segments.length === 3) {
                const orgSlug = segments[1];
                const slug = segments[2];
                if (!SLUG_RE.test(orgSlug) || !SLUG_RE.test(slug))
                    return context.next();
                backendPath =
                    BACKEND_ORIGIN +
                    "/og/c/" +
                    encodeURIComponent(orgSlug) +
                    "/" +
                    encodeURIComponent(slug);
            } else if (segments[0] === "blog" && segments.length === 2) {
                const slug = segments[1];
                if (!SLUG_RE.test(slug)) return context.next();
                backendPath =
                    BACKEND_ORIGIN + "/og/blog/" + encodeURIComponent(slug);
            } else if (segments[0] === "guides" && segments.length === 2) {
                const slug = segments[1];
                if (!SLUG_RE.test(slug)) return context.next();
                backendPath =
                    BACKEND_ORIGIN + "/og/guides/" + encodeURIComponent(slug);
            } else {
                return context.next();
            }

            const proxySecret = Netlify.env.get(SECRET_ENV_KEY) || "";
            if (!proxySecret) {
                return context.next();
            }

            const backendResponse = await fetch(backendPath, {
                method: "GET",
                headers: {
                    [PROXY_SECRET_HEADER]: proxySecret,
                    accept: "text/html",
                },
            });

            const status = backendResponse.status;

            if (status === 200) {
                const body = await backendResponse.text();
                return new Response(body, {
                    status: 200,
                    headers: {
                        "content-type": "text/html; charset=utf-8",
                        "cache-control":
                            "public, max-age=300, stale-while-revalidate=60",
                        // P2B-2: Vary required — browser/crawler UA now receive
                        // an enriched SPA shell for the same URL.
                        vary: "User-Agent",
                    },
                });
            }

            if (status === 404) {
                return new Response("Not found", {
                    status: 404,
                    headers: {
                        "content-type": "text/html; charset=utf-8",
                        "cache-control": "no-store",
                    },
                });
            }

            if (status === 410) {
                return new Response("Gone", {
                    status: 410,
                    headers: {
                        "content-type": "text/html; charset=utf-8",
                        "cache-control": "no-store",
                    },
                });
            }

            // 401, 403, 5xx, or any unexpected status — fail open
            return context.next();
        } else if (isCrawler) {
            // Search crawler branch — /card/:slug and /c/:orgSlug/:slug only
            // All other routes for crawler UA fall through to SPA shell
            let crawlerBackendPath;

            if (segments[0] === "card" && segments.length === 2) {
                const slug = segments[1];
                if (!SLUG_RE.test(slug)) return context.next();
                crawlerBackendPath =
                    BACKEND_ORIGIN + "/og/card/" + encodeURIComponent(slug);
            } else if (segments[0] === "c" && segments.length === 3) {
                const orgSlug = segments[1];
                const slug = segments[2];
                if (!SLUG_RE.test(orgSlug) || !SLUG_RE.test(slug))
                    return context.next();
                crawlerBackendPath =
                    BACKEND_ORIGIN +
                    "/og/c/" +
                    encodeURIComponent(orgSlug) +
                    "/" +
                    encodeURIComponent(slug);
            } else {
                // Top-level marketing routes — inject route-specific metadata for crawlers
                if (segments.length === 1) {
                    const marketingMeta = getMarketingMeta(segments[0]);
                    if (marketingMeta) {
                        const routeUrl = buildMarketingUrl(marketingMeta.path);
                        const sourceHtml = buildStaticMarketingOgHtml({
                            title: marketingMeta.title,
                            description: marketingMeta.description,
                            url: routeUrl,
                            imageAlt: marketingMeta.imageAlt,
                            includeCanonical: true,
                        });
                        const shellResponse = await context.next();
                        if (shellResponse.status !== 200) {
                            return shellResponse;
                        }
                        const shellCt =
                            shellResponse.headers.get("content-type") || "";
                        if (!shellCt.startsWith("text/html")) {
                            return shellResponse;
                        }
                        try {
                            const shellClone = shellResponse.clone();
                            const shellHtml = await shellClone.text();
                            const injectedHtml = injectMetadataIntoShell(
                                sourceHtml,
                                shellHtml,
                            );
                            return new Response(injectedHtml, {
                                status: 200,
                                headers: {
                                    "content-type": "text/html; charset=utf-8",
                                    "cache-control": "no-store",
                                    vary: "User-Agent",
                                },
                            });
                        } catch (_injErr) {
                            // Injection failed — return original shell unchanged
                            return shellResponse;
                        }
                    }
                }
                // All other non-card, non-marketing crawler routes fall through to SPA shell
                return context.next();
            }

            // P2B-2: crawler card/c 200 cache policy changed from no-store to
            // public, max-age=60, stale-while-revalidate=300 (inside helper).
            // Browser and crawler now share the same enriched body; Vary:
            // User-Agent in helper response keeps social bucket separate.
            return await serveCardEnrichedShell(crawlerBackendPath, context, {
                isCrawler: true,
            });
        } else {
            // Browser or unclassified UA branch.
            // Fast-pass non-card/c routes BEFORE any backend fetch or proxy-secret
            // access — marketing browser traffic (/cards, /pricing, /contact,
            // /blog, /guides, /blog/*, /guides/*) costs one Edge invocation only.
            if (segments[0] === "card" && segments.length === 2) {
                const slug = segments[1];
                if (!SLUG_RE.test(slug)) return context.next();
                const backendPath =
                    BACKEND_ORIGIN + "/og/card/" + encodeURIComponent(slug);
                return await serveCardEnrichedShell(backendPath, context, {
                    isCrawler: false,
                });
            }
            if (segments[0] === "c" && segments.length === 3) {
                const orgSlug = segments[1];
                const slug = segments[2];
                if (!SLUG_RE.test(orgSlug) || !SLUG_RE.test(slug))
                    return context.next();
                const backendPath =
                    BACKEND_ORIGIN +
                    "/og/c/" +
                    encodeURIComponent(orgSlug) +
                    "/" +
                    encodeURIComponent(slug);
                return await serveCardEnrichedShell(backendPath, context, {
                    isCrawler: false,
                });
            }
            return context.next();
        }
    } catch (_err) {
        // Network failure, DNS error, URL parse error, or unexpected runtime error — fail open
        // Error is intentionally discarded: do not expose to users, do not log secrets
        return context.next();
    }
}
