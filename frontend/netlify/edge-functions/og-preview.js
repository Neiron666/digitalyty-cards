/* global Netlify */

// Cardigo — Social Preview Edge Function
// Intercepts /card/:slug, /c/:orgSlug/:slug, /blog/:slug, and /guides/:slug for social preview bots only.
// Normal browsers are excluded at config level via user-agent header matching —
// they never invoke this function and continue through _redirects to the SPA as today.
// Googlebot, bingbot, and generic bot catch-all are intentionally excluded from this
// contour. They are handled in a separate Technical SEO contour.
// OG HTML generation remains the backend /og/* SSoT (og.routes.js). This function
// is a transparent proxy only — it never generates OG tags itself.
// Fail-open is intentional: unexpected backend failures or runtime errors fall through
// to context.next(), which serves the existing SPA shell rather than breaking the route.

const BACKEND_ORIGIN = "https://cardigo-backend.onrender.com";
const PROXY_SECRET_HEADER = "x-cardigo-proxy-secret";
const SECRET_ENV_KEY = "CARDIGO_PROXY_SHARED_SECRET";
const SLUG_RE = /^[A-Za-z0-9_-]+$/;

export const config = {
    path: ["/card/*", "/c/*", "/blog/*", "/guides/*"],
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
