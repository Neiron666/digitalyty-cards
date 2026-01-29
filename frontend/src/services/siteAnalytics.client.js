import { isKnownSiteAction } from "./siteAnalytics.actions";
import { getUtm } from "./utm.util";

const OPT_OUT_KEY = "siteAnalyticsOptOut";

const DEDUPE_WINDOW_MS = 2500;
let lastSent = { key: "", ts: 0 };

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

function isOptedOut() {
    try {
        return (
            typeof window !== "undefined" &&
            window.localStorage?.getItem(OPT_OUT_KEY) === "1"
        );
    } catch {
        return false;
    }
}

function send(payload, { preferFetch = false } = {}) {
    try {
        const body = JSON.stringify(payload);
        const url = "/api/site-analytics/track";

        if (!preferFetch) {
            if (
                typeof navigator !== "undefined" &&
                typeof navigator.sendBeacon === "function"
            ) {
                const blob = new Blob([body], { type: "application/json" });
                const ok = navigator.sendBeacon(url, blob);
                if (ok) return;
            }
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
        if (isOptedOut()) return;

        const pagePath = window.location?.pathname || "";
        if (!shouldTrackSitePagePath(pagePath)) return;

        const now = Date.now();
        const key = `view::${pagePath}`;
        if (lastSent.key === key && now - lastSent.ts < DEDUPE_WINDOW_MS)
            return;
        lastSent = { key, ts: now };

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

export function trackSiteClick({
    action,
    siteKey = "main",
    pagePath: providedPagePath,
} = {}) {
    try {
        if (isOptedOut()) return;

        const pagePath =
            typeof providedPagePath === "string" && providedPagePath
                ? providedPagePath
                : window.location?.pathname || "";
        if (!shouldTrackSitePagePath(pagePath)) return;

        const a = String(action || "").trim();
        if (!a) return;

        try {
            if (import.meta?.env?.DEV && !isKnownSiteAction(a)) {
                console.warn("[site-analytics] unknown action", a);
            }
        } catch {
            // ignore
        }

        const now = Date.now();
        const key = `click::${pagePath}::${a}`;
        if (lastSent.key === key && now - lastSent.ts < DEDUPE_WINDOW_MS)
            return;
        lastSent = { key, ts: now };

        send(
            {
                event: "click",
                action: a,
                siteKey,
                pagePath,
                utm: getUtm(),
                ref: document.referrer || "",
            },
            { preferFetch: true },
        );
    } catch {
        // ignore
    }
}
