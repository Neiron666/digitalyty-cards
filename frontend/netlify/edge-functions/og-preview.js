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
    const img =
        "https://cardigo.co.il/images/og/cardigo-home-og-1200x630.jpg?v=20260506";
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
            return new Response(
                buildStaticMarketingOgHtml({
                    title: "דוגמאות לכרטיסי ביקור דיגיטליים | Cardigo",
                    description:
                        "דוגמאות ויזואליות לכרטיסי ביקור דיגיטליים בסגנונות שונים - ראו איך Cardigo מציג עסקים, קישורים ודרכי יצירת קשר לפני שיוצרים כרטיס משלכם.",
                    url: "https://cardigo.co.il/cards",
                    imageAlt: "Cardigo \u2013 דוגמאות לכרטיסי ביקור דיגיטליים",
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
            return new Response(
                buildStaticMarketingOgHtml({
                    title: "מחירים לכרטיס ביקור דיגיטלי | Cardigo",
                    description:
                        "המחירים של Cardigo לכרטיס ביקור דיגיטלי מקצועי: מסלול חינמי לתמיד, 10 ימי פרימיום לכל משתמש חדש, מסלול חודשי גמיש ומסלול שנתי משתלם לעסקים שרוצים נוכחות דיגיטלית מקצועית.",
                    url: "https://cardigo.co.il/pricing",
                    imageAlt: "Cardigo \u2013 מחירים לכרטיס ביקור דיגיטלי",
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
            return new Response(
                buildStaticMarketingOgHtml({
                    title: "צור קשר | Cardigo",
                    description:
                        "צרו קשר עם Cardigo לשאלות על כרטיס ביקור דיגיטלי לעסקים - מחירים, התאמה ודרכי התחלה.",
                    url: "https://cardigo.co.il/contact",
                    imageAlt: "Cardigo \u2013 צור קשר",
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
            return new Response(
                buildStaticMarketingOgHtml({
                    title: "בלוג | Cardigo",
                    description:
                        "מאמרים, מדריכים ותובנות בנושא כרטיסי ביקור דיגיטליים, נוכחות עסקית, SEO ותקשורת חכמה עם לקוחות.",
                    url: "https://cardigo.co.il/blog",
                    imageAlt: "Cardigo \u2013 בלוג",
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
            return new Response(
                buildStaticMarketingOgHtml({
                    title: "מדריכים | Cardigo",
                    description:
                        "מדריכים מעשיים, צעד אחרי צעד, על כרטיסי ביקור דיגיטליים, עיצוב כרטיס, SEO, נוכחות עסקית ושימוש בכלים הדיגיטליים של Cardigo.",
                    url: "https://cardigo.co.il/guides",
                    imageAlt: "Cardigo \u2013 מדריכים",
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
