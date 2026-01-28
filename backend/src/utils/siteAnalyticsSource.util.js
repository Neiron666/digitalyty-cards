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

export const SITE_CHANNELS = CHANNELS;
export const SITE_CHANNEL_SET = CHANNEL_SET;
