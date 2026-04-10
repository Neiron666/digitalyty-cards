import { isKnownSiteAction } from "./siteAnalytics.actions";
import {
    getOrCreateDeviceId,
    getOrCreateVisitId,
} from "./siteAnalyticsIdentity.util";
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
    if (p === "/c" || p.startsWith("/c/")) return false;
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

function pushToDataLayer(eventName, pagePath) {
    try {
        if (typeof window === "undefined") return;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "cardigo_event",
            event_name: eventName,
            page_path: pagePath,
        });
    } catch {
        // ignore — non-fatal
    }
}

/**
 * Emits a registration_complete event directly to GTM dataLayer.
 * This is a product completion event — it is intentionally NOT routed through
 * shouldTrackSitePagePath or the site action registry, because it must fire
 * from auth routes (/verify-email, /signup) which are excluded from marketing
 * page tracking. Non-fatal: safe if window or dataLayer is unavailable.
 *
 * The payload includes cardigo_consent_optional_tracking read directly from
 * localStorage so that GTM can consent-gate the Meta CompleteRegistration tag
 * on auth routes where Layout.jsx never pushes a cardigo_consent_update event.
 * Emits null if consent has never been acknowledged (banner not yet interacted).
 */
export function trackRegistrationComplete() {
    try {
        if (typeof window === "undefined") return;

        let consentOptionalTracking = null;
        try {
            const raw = window.localStorage?.getItem(
                "cardigo_cookie_consent_v1",
            );
            if (raw) {
                const parsed = JSON.parse(raw);
                if (
                    parsed &&
                    typeof parsed === "object" &&
                    parsed.version === 1
                ) {
                    consentOptionalTracking = Boolean(
                        parsed.optionalTrackingAllowed,
                    );
                }
            }
        } catch {
            // storage blocked or corrupted — emit null
        }

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "cardigo_event",
            event_name: "registration_complete",
            cardigo_consent_optional_tracking: consentOptionalTracking,
        });
    } catch {
        // ignore — non-fatal
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
            deviceId: getOrCreateDeviceId(),
            visitId: getOrCreateVisitId(),
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
                deviceId: getOrCreateDeviceId(),
                visitId: getOrCreateVisitId(),
            },
            { preferFetch: true },
        );
        pushToDataLayer(a, pagePath);
    } catch {
        // ignore
    }
}
