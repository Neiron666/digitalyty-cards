/* global Netlify */

// Cardigo — Social Preview Edge Function
// Dual-mode: (1) static OG HTML generated directly here for marketing listing pages
// (/cards, /pricing, /contact, /blog listing, /guides listing);
// (2) transparent backend proxy via /og/* for public card, org-card, blog-post,
// and guide-post detail routes.
// Normal browsers are excluded at config level via user-agent header matching —
// they never invoke this function and continue through _redirects to the SPA as today.
// Googlebot, bingbot, and generic bot catch-all are intentionally excluded from this
// contour. They are handled in a separate Technical SEO contour.
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

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildStaticMarketingOgHtml({ title, description, url, imageAlt }) {
    const t = escapeHtml(title);
    const d = escapeHtml(description);
    const u = escapeHtml(url);
    const a = escapeHtml(imageAlt);
    const img = CARDIGO_OG_IMAGE_URL;
    return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>${t}</title>
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
    header: {
        "user-agent":
            "(facebookexternalhit|Facebot|WhatsApp|whatsapp|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Slack-ImgProxy|Discordbot|discordbot|Pinterest|pinterest|vkShare)",
    },
};

export default async function ogPreview(request, context) {
    try {
        // Defense-in-depth: config already limits to GET, but guard here too
        if (request.method !== "GET") {
            return context.next();
        }

        const { pathname } = new URL(request.url);
        const segments = pathname.split("/").filter(Boolean);

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
    } catch (_err) {
        // Network failure, DNS error, URL parse error, or unexpected runtime error — fail open
        // Error is intentionally discarded: do not expose to users, do not log secrets
        return context.next();
    }
}
