const CHANNELS = Object.freeze([
    "direct",
    "social",
    "search",
    "ai",
    "referral",
    "email",
    "paid",
    "other",
]);

const CHANNEL_SET = new Set(CHANNELS);

const AI_HOST_ALLOWLIST = new Set([
    "chat.openai.com",
    "chatgpt.com",
    "perplexity.ai",
    "copilot.microsoft.com",
    "gemini.google.com",
    "claude.ai",
    "poe.com",
]);

const AI_UTM_SOURCE_ALLOWLIST = new Set([
    "openai",
    "chatgpt",
    "perplexity",
    "copilot",
    "microsoft",
    "gemini",
    "google",
    "claude",
    "anthropic",
    "poe",
]);

function cleanInput(value, { maxLen = 64 } = {}) {
    const v = String(value || "")
        .trim()
        .toLowerCase();
    if (!v) return "";

    const stripped = v.replace(/[.$\s\u0000-\u001f]/g, "");
    return stripped.slice(0, maxLen);
}

function cleanHost(value, { maxLen = 128 } = {}) {
    const v = String(value || "")
        .trim()
        .toLowerCase();
    if (!v) return "";

    const noCtl = v.replace(/[$\s\u0000-\u001f]/g, "");
    const hostOnly = noCtl.split(":")[0];
    return hostOnly.slice(0, maxLen);
}

export function parseReferrerHost(referrer) {
    const raw = typeof referrer === "string" ? referrer.trim() : "";
    if (!raw) return "";

    try {
        const url = new URL(raw);
        return cleanHost(url.hostname || "");
    } catch {
        const hostOnly = raw
            .replace(/^https?:\/\//i, "")
            .split("/")[0]
            .trim()
            .toLowerCase();
        return cleanHost(hostOnly);
    }
}

function isSearchHost(host) {
    const h = cleanHost(host);
    if (!h) return false;

    if (h.includes("google.")) return true;
    if (h === "bing.com" || h.endsWith(".bing.com")) return true;
    if (h === "duckduckgo.com" || h.endsWith(".duckduckgo.com")) return true;
    if (h === "search.yahoo.com" || h.endsWith(".yahoo.com")) return true;

    return false;
}

function isSocialHost(host) {
    const h = cleanHost(host);
    if (!h) return false;

    if (h === "facebook.com" || h.endsWith(".facebook.com")) return true;
    if (h === "instagram.com" || h.endsWith(".instagram.com")) return true;
    if (h === "tiktok.com" || h.endsWith(".tiktok.com")) return true;
    if (h === "linkedin.com" || h.endsWith(".linkedin.com")) return true;
    if (h === "youtube.com" || h.endsWith(".youtube.com") || h === "youtu.be")
        return true;
    if (h === "x.com" || h.endsWith(".x.com") || h === "t.co") return true;
    if (h === "twitter.com" || h.endsWith(".twitter.com")) return true;

    return false;
}

function detectAiSource({ utmSource, utmMedium, referrerHost } = {}) {
    const medium = cleanInput(utmMedium);
    if (medium === "ai") return "other_ai";

    const source = cleanInput(utmSource);
    if (source && AI_UTM_SOURCE_ALLOWLIST.has(source)) return source;

    const host = cleanHost(referrerHost);
    if (host && AI_HOST_ALLOWLIST.has(host)) {
        if (host === "chat.openai.com" || host === "chatgpt.com")
            return "chatgpt";
        if (host === "perplexity.ai") return "perplexity";
        if (host === "copilot.microsoft.com") return "copilot";
        if (host === "gemini.google.com") return "gemini";
        if (host === "claude.ai") return "claude";
        if (host === "poe.com") return "poe";
        return "other_ai";
    }

    return "";
}

export function detectChannel({
    utmSource,
    utmMedium,
    utmCampaign, // currently unused; reserved
    referrerHost,
} = {}) {
    const aiSource = detectAiSource({ utmSource, utmMedium, referrerHost });
    if (aiSource) return { channel: "ai", aiSource };

    const medium = cleanInput(utmMedium);
    if (medium === "email" || medium === "newsletter") {
        return { channel: "email", aiSource: "" };
    }

    if (
        medium === "cpc" ||
        medium === "ppc" ||
        medium === "paid" ||
        medium === "ads" ||
        medium === "ad" ||
        medium === "paid-social" ||
        medium === "paid_social"
    ) {
        return { channel: "paid", aiSource: "" };
    }

    const source = cleanInput(utmSource);
    if (source) {
        if (
            source === "google" ||
            source === "bing" ||
            source === "duckduckgo"
        ) {
            return { channel: "search", aiSource: "" };
        }
        if (
            source === "facebook" ||
            source === "instagram" ||
            source === "tiktok"
        ) {
            return { channel: "social", aiSource: "" };
        }
        if (source === "linkedin" || source === "youtube" || source === "x") {
            return { channel: "social", aiSource: "" };
        }
    }

    const host = cleanHost(referrerHost);
    if (host) {
        if (isSearchHost(host)) return { channel: "search", aiSource: "" };
        if (isSocialHost(host)) return { channel: "social", aiSource: "" };
        return { channel: "referral", aiSource: "" };
    }

    return { channel: "direct", aiSource: "" };
}

// ---------------------------------------------------------------------------
// Normalized site-level source attribution
// ---------------------------------------------------------------------------

/**
 * UTM source alias map: normalizes known utm_source variants → canonical key.
 * Kept internal; used only by normalizeSource().
 */
const UTM_SOURCE_ALIASES = new Map([
    // Facebook / Meta
    ["facebook", "facebook"],
    ["fb", "facebook"],
    ["meta", "facebook"],

    // Instagram
    ["instagram", "instagram"],
    ["ig", "instagram"],
    ["insta", "instagram"],

    // TikTok
    ["tiktok", "tiktok"],
    ["tt", "tiktok"],

    // X / Twitter
    ["x", "x"],
    ["twitter", "x"],

    // LinkedIn
    ["linkedin", "linkedin"],
    ["ln", "linkedin"],

    // YouTube
    ["youtube", "youtube"],
    ["yt", "youtube"],

    // Search engines
    ["google", "google"],
    ["bing", "bing"],
    ["duckduckgo", "duckduckgo"],
    ["yahoo", "yahoo"],
]);

/**
 * Known IAB (in-app browser) UA substrings → canonical platform key.
 * Checked in order — first match wins.
 * Uses substring matching only (no regex — DoS-safe).
 */
const IAB_UA_PATTERNS = Object.freeze([
    // Facebook (must appear before generic social checks)
    ["FBAN/", "facebook"],
    ["FBAV/", "facebook"],
    ["FB_IAB/", "facebook"],
    ["FBSV/", "facebook"],
    ["MessengerForiOS", "facebook"],
    // Instagram (trailing space avoids false positives)
    ["Instagram ", "instagram"],
    // TikTok
    ["TikTok/", "tiktok"],
    ["BytedanceWebview", "tiktok"],
    ["musical_ly", "tiktok"],
    // X / Twitter
    ["TwitterAndroid", "x"],
    ["TwitteriPhone", "x"],
]);

/**
 * Map a cleaned referrer hostname to a canonical source key.
 * Returns "" for unknown / empty hosts.
 * Unknown non-empty hosts return an "ext_"-prefixed safe key for
 * bounded external attribution.
 */
function hostToSourceKey(rawHost) {
    const h = cleanHost(rawHost);
    if (!h) return "";

    // Social platforms
    if (h === "facebook.com" || h.endsWith(".facebook.com")) return "facebook";
    if (h === "instagram.com" || h.endsWith(".instagram.com"))
        return "instagram";
    if (h === "tiktok.com" || h.endsWith(".tiktok.com")) return "tiktok";
    if (h === "linkedin.com" || h.endsWith(".linkedin.com")) return "linkedin";
    if (h === "youtube.com" || h.endsWith(".youtube.com") || h === "youtu.be")
        return "youtube";
    if (h === "x.com" || h.endsWith(".x.com") || h === "t.co") return "x";
    if (h === "twitter.com" || h.endsWith(".twitter.com")) return "x";

    // Search engines
    if (h.includes("google.")) return "google";
    if (h === "bing.com" || h.endsWith(".bing.com")) return "bing";
    if (h === "duckduckgo.com" || h.endsWith(".duckduckgo.com"))
        return "duckduckgo";
    if (h === "search.yahoo.com" || h.endsWith(".yahoo.com")) return "yahoo";

    // AI referrers — coalesced to channel-level key (no per-platform split here)
    if (AI_HOST_ALLOWLIST.has(h)) return "ai";

    // Unknown external host — bounded key, safe for Mongo Map field.
    // Replace dots with underscores (no dots allowed in Mongo map keys via $inc).
    const safe = h
        .replace(/\./g, "_")
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 32);
    if (!safe) return "";
    return `ext_${safe}`;
}

/**
 * Compute a single normalized source key for a site analytics event.
 *
 * Priority:
 *   1. utm.source (canonicalized via alias map; unknown sources sanitized as
 *      "utm_<safeValue>" to preserve declared intent without raw DB injection)
 *   2. Known referrer-host normalization
 *   3. Known IAB user-agent fallback (only when referrer was suppressed)
 *   4. Fallback → "direct"
 *
 * The returned key is always:
 *   - lowercase
 *   - no dots or $ (safe for MongoDB Map key via $inc)
 *   - max 40 chars
 */
export function normalizeSource({
    utmSource,
    utmMedium, // reserved; unused — mirrors detectChannel() signature convention
    referrerHost,
    userAgent,
} = {}) {
    // 1. UTM source wins when present.
    const rawUtm = cleanInput(utmSource, { maxLen: 40 });
    if (rawUtm) {
        const canonical = UTM_SOURCE_ALIASES.get(rawUtm);
        if (canonical) return canonical;
        // Unknown declared utm_source: preserve intent as bounded safe key.
        // Prefix "utm_" signals it is user-declared, not a normalized platform.
        const safe = rawUtm.replace(/[^a-z0-9_-]/g, "").slice(0, 30);
        if (safe) return `utm_${safe}`;
    }

    // 2. Referrer host normalization.
    const host = cleanHost(referrerHost);
    if (host) {
        const fromHost = hostToSourceKey(host);
        if (fromHost) return fromHost;
    }

    // 3. IAB user-agent fallback (only meaningful when host was empty, i.e.
    //    referrer suppressed — as is typical in in-app browsers).
    if (!host) {
        const ua = String(userAgent || "");
        if (ua) {
            for (const [pattern, key] of IAB_UA_PATTERNS) {
                if (ua.includes(pattern)) return key;
            }
        }
    }

    // 4. Direct — no attributable signal.
    return "direct";
}

export const SITE_CHANNELS = CHANNELS;
export const SITE_CHANNEL_SET = CHANNEL_SET;
