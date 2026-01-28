import { getUtm } from "./analytics.client";

const OPT_OUT_KEY = "siteAnalyticsOptOut";

const EXCLUDED_PREFIXES = Object.freeze([
    "/admin",
    "/api",
    "/assets/",
    "/.netlify/",
    "/edit",
]);

const EXCLUDED_EXACT = new Set([
    "/login",
    "/register",
    "/editor",
    "/dashboard",
    "/account",
    "/billing",
    "/settings",
    "/robots.txt",
    "/service-worker.js",
]);

function isExcludedPagePath(pagePath) {
    const p = String(pagePath || "");
    if (!p || !p.startsWith("/")) return true;

    if (EXCLUDED_EXACT.has(p)) return true;
    if (p.startsWith("/sitemap")) return true;
    if (p.startsWith("/manifest")) return true;
    if (p.startsWith("/favicon")) return true;
    if (p === "/assets") return true;

    for (const prefix of EXCLUDED_PREFIXES) {
        if (p === prefix) return true;
        if (p.startsWith(prefix)) return true;
    }

    return false;
}

export function shouldTrackSitePagePath(pagePath) {
    const p = String(pagePath || "");
    if (!p) return false;

    if (p === "/card" || p.startsWith("/card/")) return false;
    if (isExcludedPagePath(p)) return false;
    return true;
}

function send(payload) {
    try {
        const body = JSON.stringify(payload);
        const url = "/api/site-analytics/track";

        if (
            typeof navigator !== "undefined" &&
            typeof navigator.sendBeacon === "function"
        ) {
            const blob = new Blob([body], { type: "application/json" });
            const ok = navigator.sendBeacon(url, blob);
            if (ok) return;
        }

        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
        }).catch(() => {
            // ignore
        });
    } catch {
        // ignore
    }
}

export function trackSitePageView({ siteKey = "main" } = {}) {
    try {
        try {
            if (
                typeof window !== "undefined" &&
                window.localStorage?.getItem(OPT_OUT_KEY) === "1"
            ) {
                return;
            }
        } catch {
            // ignore
        }

        const pagePath = window.location?.pathname || "";
        if (!shouldTrackSitePagePath(pagePath)) return;

        send({
            event: "view",
            siteKey,
            pagePath,
            utm: getUtm(),
            ref: document.referrer || "",
        });
    } catch {
        // ignore
    }
}
