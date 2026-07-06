import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

// P2B-1 cross-phase contract: P2B-2 Edge function MUST emit JSON-LD scripts
// carrying both attributes below. Do not rename; do not remove as dead code.
export const EDGE_LD_MARKER_SELECTOR =
    'script[type="application/ld+json"][data-cardigo-edge-ld="1"]';
export const EDGE_LD_CANONICAL_ATTR = "data-cardigo-edge-ld-canonical";

function hasTrustedEdgeJsonLd(canonicalUrl) {
    try {
        if (typeof document === "undefined") return false;
        const head = document.head;
        if (!head) return false;
        const nodes = head.querySelectorAll(EDGE_LD_MARKER_SELECTOR);
        if (!nodes || nodes.length === 0) return false;
        const current =
            typeof canonicalUrl === "string" ? canonicalUrl.trim() : "";
        let sawCanonicalAttr = false;
        for (const n of nodes) {
            if (n.hasAttribute(EDGE_LD_CANONICAL_ATTR)) {
                sawCanonicalAttr = true;
                if (n.getAttribute(EDGE_LD_CANONICAL_ATTR) === current) {
                    return true;
                }
            }
        }
        if (sawCanonicalAttr) return false;
        return true;
    } catch {
        return false;
    }
}

const EXACT_PLACEHOLDERS = new Set(["GTM-XXXXXXX", "G-XXXXXXX"]);

// Platform-owned IDs that must never be accepted as per-card owner trackers.
// Using these would load Cardigo's own GTM container or Meta Pixel on card routes,
// contaminating site-level retargeting audiences with third-party card visitors.
const BLOCKED_GTM_IDS = new Set(["GTM-W6Q8DP6R"]);
const BLOCKED_PIXEL_IDS = new Set(["1901625820558020"]);

function toTrimmedString(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function containsAngleBrackets(value) {
    return /[<>]/.test(value);
}

export function getAllowTracking() {
    return import.meta.env.PROD || import.meta.env.VITE_SEO_DEBUG === "1";
}

export function normalizeRobots(value) {
    const raw = toTrimmedString(value);
    if (!raw) return "";
    if (containsAngleBrackets(raw)) return "";
    return raw;
}

export function normalizeVerificationToken(value) {
    const raw = toTrimmedString(value);
    if (!raw) return "";
    if (containsAngleBrackets(raw)) return "";
    return raw;
}

export function normalizeGtmId(value) {
    const raw = toTrimmedString(value);
    if (!raw) return "";
    if (EXACT_PLACEHOLDERS.has(raw)) return "";
    const normalized = raw.toUpperCase();
    if (!/^GTM-[A-Z0-9]+$/.test(normalized)) return "";
    if (BLOCKED_GTM_IDS.has(normalized)) return "";
    return normalized;
}

export function normalizeGaMeasurementId(value) {
    const raw = toTrimmedString(value);
    if (!raw) return "";
    if (EXACT_PLACEHOLDERS.has(raw)) return "";
    const normalized = raw.toUpperCase();
    if (!/^G-[A-Z0-9]+$/.test(normalized)) return "";
    return normalized;
}

export function normalizeMetaPixelId(value) {
    const raw = toTrimmedString(value);
    if (!raw) return "";
    if (!/^[0-9]{5,20}$/.test(raw)) return "";
    if (BLOCKED_PIXEL_IDS.has(raw)) return "";
    return raw;
}

function buildGtmSnippet(gtmId) {
    return (
        "(function(w,d,s,l,i){" +
        "w[l]=w[l]||[];" +
        "w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});" +
        "var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';" +
        "j.async=true;" +
        "j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;" +
        "f.parentNode.insertBefore(j,f);" +
        `})(window,document,'script','dataLayer','${gtmId}');`
    );
}

function buildGtagInitSnippet(gaMeasurementId) {
    return (
        "window.dataLayer = window.dataLayer || [];" +
        "function gtag(){dataLayer.push(arguments);}" +
        "gtag('js', new Date());" +
        `gtag('config', '${gaMeasurementId}');`
    );
}

function buildMetaPixelSnippet(metaPixelId) {
    return (
        "!function(f,b,e,v,n,t,s){" +
        "if(f.fbq)return;" +
        "n=f.fbq=function(){n.callMethod?" +
        "n.callMethod.apply(n,arguments):n.queue.push(arguments)};" +
        "if(!f._fbq)f._fbq=n;" +
        "n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];" +
        "t=b.createElement(e);t.async=!0;" +
        "t.src=v;" +
        "s=b.getElementsByTagName(e)[0];" +
        "s.parentNode.insertBefore(t,s)" +
        "}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');" +
        `fbq('init','${metaPixelId}');` +
        "fbq('track','PageView');"
    );
}

function safeJsonParse(value) {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed === null) return null;
        if (typeof parsed !== "object" && !Array.isArray(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
}

function normalizeJsonLdItems(jsonLd, jsonLdItems) {
    const items = [];

    const existing = safeJsonParse(jsonLd);
    if (existing) items.push(existing);

    const extra = Array.isArray(jsonLdItems) ? jsonLdItems : [];
    for (const item of extra) {
        if (!item) continue;
        items.push(item);
    }

    return items;
}

export default function SeoHelmet({
    title,
    description,
    robots,
    googleSiteVerification,
    facebookDomainVerification,
    canonicalUrl,
    url,
    image,
    ogType = "website",
    jsonLd,
    jsonLdItems,
    gtmId,
    gaMeasurementId,
    metaPixelId,
    articlePublishedTime,
    articleModifiedTime,
    articleAuthor,
    imageAlt,
    ogLocale = "he_IL",
    suppressSiteName = false,
}) {
    const scripts = normalizeJsonLdItems(jsonLd, jsonLdItems);

    const robotsNormalized = normalizeRobots(robots);
    const googleSiteVerificationNormalized = normalizeVerificationToken(
        googleSiteVerification,
    );
    const facebookDomainVerificationNormalized = normalizeVerificationToken(
        facebookDomainVerification,
    );

    const allowTracking = getAllowTracking();
    const gtmIdNormalized = normalizeGtmId(gtmId);
    const gaMeasurementIdNormalized = normalizeGaMeasurementId(gaMeasurementId);
    const metaPixelIdNormalized = normalizeMetaPixelId(metaPixelId);

    const trackingMode = allowTracking
        ? gtmIdNormalized
            ? "gtm"
            : gaMeasurementIdNormalized
              ? "ga"
              : metaPixelIdNormalized
                ? "pixel"
                : "none"
        : "none";

    const [suppressJsonLd, setSuppressJsonLd] = useState(() =>
        hasTrustedEdgeJsonLd(canonicalUrl),
    );
    useEffect(() => {
        setSuppressJsonLd(hasTrustedEdgeJsonLd(canonicalUrl));
    }, [canonicalUrl]);
    // P2B-3: reuse the same canonical-matched trusted Edge signal for non-JSON-LD meta.
    // No new DOM query or useEffect needed — same condition, same contract.
    const suppressEdgeManagedMeta = suppressJsonLd;

    return (
        <Helmet>
            {title ? <title>{title}</title> : null}
            {!suppressEdgeManagedMeta && description ? (
                <meta name="description" content={description} />
            ) : null}

            {!suppressEdgeManagedMeta && canonicalUrl ? (
                <link rel="canonical" href={canonicalUrl} />
            ) : null}

            {robotsNormalized ? (
                <meta name="robots" content={robotsNormalized} />
            ) : null}
            {googleSiteVerificationNormalized ? (
                <meta
                    name="google-site-verification"
                    content={googleSiteVerificationNormalized}
                />
            ) : null}
            {facebookDomainVerificationNormalized ? (
                <meta
                    name="facebook-domain-verification"
                    content={facebookDomainVerificationNormalized}
                />
            ) : null}

            {/* OpenGraph */}
            {!suppressEdgeManagedMeta ? (
                <meta property="og:locale" content={ogLocale} />
            ) : null}
            {!suppressSiteName ? (
                <meta property="og:site_name" content="Cardigo" />
            ) : null}
            <meta property="og:type" content={ogType} />
            {!suppressEdgeManagedMeta && title ? (
                <meta property="og:title" content={title} />
            ) : null}
            {!suppressEdgeManagedMeta && description ? (
                <meta property="og:description" content={description} />
            ) : null}
            {!suppressEdgeManagedMeta && image ? (
                <meta property="og:image" content={image} />
            ) : null}
            {!suppressEdgeManagedMeta && image && imageAlt ? (
                <meta property="og:image:alt" content={imageAlt} />
            ) : null}
            {!suppressEdgeManagedMeta && url ? (
                <meta property="og:url" content={url} />
            ) : null}
            {articlePublishedTime ? (
                <meta
                    property="article:published_time"
                    content={articlePublishedTime}
                />
            ) : null}
            {articleModifiedTime ? (
                <meta
                    property="article:modified_time"
                    content={articleModifiedTime}
                />
            ) : null}
            {articleAuthor ? (
                <meta property="article:author" content={articleAuthor} />
            ) : null}

            {/* Twitter */}
            <meta
                name="twitter:card"
                content={image ? "summary_large_image" : "summary"}
            />
            {!suppressEdgeManagedMeta && title ? (
                <meta name="twitter:title" content={title} />
            ) : null}
            {!suppressEdgeManagedMeta && description ? (
                <meta name="twitter:description" content={description} />
            ) : null}
            {!suppressEdgeManagedMeta && image ? (
                <meta name="twitter:image" content={image} />
            ) : null}
            {image && imageAlt ? (
                <meta name="twitter:image:alt" content={imageAlt} />
            ) : null}

            {trackingMode === "gtm" ? (
                <script key="gtm-inline">
                    {buildGtmSnippet(gtmIdNormalized)}
                </script>
            ) : null}

            {trackingMode === "ga" ? (
                <script
                    key="gtag-src"
                    async
                    src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementIdNormalized}`}
                />
            ) : null}
            {trackingMode === "ga" ? (
                <script key="gtag-inline">
                    {buildGtagInitSnippet(gaMeasurementIdNormalized)}
                </script>
            ) : null}

            {trackingMode === "pixel" ? (
                <script key="pixel-inline">
                    {buildMetaPixelSnippet(metaPixelIdNormalized)}
                </script>
            ) : null}

            {!suppressJsonLd &&
                scripts.map((obj, index) => (
                    <script
                        // eslint-disable-next-line react/no-array-index-key
                        key={`jsonld-${index}`}
                        type="application/ld+json"
                    >
                        {JSON.stringify(obj).replace(
                            /<\/script>/gi,
                            "<\\/script>",
                        )}
                    </script>
                ))}
        </Helmet>
    );
}

export function SeoHelmetDebugMeta({ canonicalUrl }) {
    if (import.meta.env.VITE_SEO_DEBUG !== "1") return null;

    return (
        <>
            <meta
                name="x-debug-publicOrigin"
                content={import.meta.env.VITE_PUBLIC_ORIGIN || ""}
            />
            <meta
                name="x-debug-canonicalResolved"
                content={canonicalUrl || ""}
            />
        </>
    );
}
