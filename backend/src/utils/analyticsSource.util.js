const BUCKETS = Object.freeze([
    "facebook",
    "instagram",
    "tiktok",
    "linkedin",
    "youtube",
    "x",
    "search",
    "direct",
    "other_social",
    "other",
]);

const BUCKET_SET = new Set(BUCKETS);

const UTM_ALIASES = new Map([
    ["fb", "facebook"],
    ["facebook", "facebook"],
    ["meta", "facebook"],

    ["ig", "instagram"],
    ["insta", "instagram"],
    ["instagram", "instagram"],

    ["tt", "tiktok"],
    ["tiktok", "tiktok"],

    ["ln", "linkedin"],
    ["linkedin", "linkedin"],

    ["yt", "youtube"],
    ["youtube", "youtube"],

    ["twitter", "x"],
    ["x", "x"],

    ["google", "search"],
    ["bing", "search"],
    ["duckduckgo", "search"],
    ["yahoo", "search"],
]);

function cleanInput(value, { maxLen = 64 } = {}) {
    const v = String(value || "")
        .trim()
        .toLowerCase();
    if (!v) return "";

    // Strip path separators and characters that can break Mongo keys.
    // We only use this as an intermediate for matching; it never becomes a DB key.
    const stripped = v.replace(/[.$\s\u0000-\u001f]/g, "");
    return stripped.slice(0, maxLen);
}

function cleanHost(value, { maxLen = 128 } = {}) {
    const v = String(value || "")
        .trim()
        .toLowerCase();
    if (!v) return "";

    // Hostnames rely on dots; do not strip '.' here.
    // Still strip characters that could be used for injection or weird keys.
    const noCtl = v.replace(/[$\s\u0000-\u001f]/g, "");
    const hostOnly = noCtl.split(":")[0];
    return hostOnly.slice(0, maxLen);
}

function parseReferrerHost(referrer) {
    const raw = typeof referrer === "string" ? referrer.trim() : "";
    if (!raw) return "";

    // Accept both full URL (preferred) and host-only inputs for forward-compat.
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

function mapHostToBucket(host) {
    const h = cleanHost(host, { maxLen: 128 });
    if (!h) return "";

    // Social
    if (h === "facebook.com" || h.endsWith(".facebook.com")) return "facebook";
    if (h === "instagram.com" || h.endsWith(".instagram.com"))
        return "instagram";
    if (h === "tiktok.com" || h.endsWith(".tiktok.com")) return "tiktok";
    if (h === "linkedin.com" || h.endsWith(".linkedin.com")) return "linkedin";
    if (h === "youtube.com" || h.endsWith(".youtube.com") || h === "youtu.be")
        return "youtube";
    if (h === "x.com" || h.endsWith(".x.com") || h === "t.co") return "x";
    if (h === "twitter.com" || h.endsWith(".twitter.com")) return "x";

    // Search
    if (h.includes("google.")) return "search";
    if (h === "bing.com" || h.endsWith(".bing.com")) return "search";
    if (h === "duckduckgo.com" || h.endsWith(".duckduckgo.com"))
        return "search";
    if (h === "search.yahoo.com" || h.endsWith(".yahoo.com")) return "search";

    return "other";
}

function utmToBucket({ utmSource, utmMedium }) {
    const source = cleanInput(utmSource);
    if (!source) return "";

    const direct = UTM_ALIASES.get(source);
    if (direct) return direct;

    // If source is unknown but medium looks social, keep it in social family.
    const medium = cleanInput(utmMedium);
    if (medium === "social" || medium === "social-media" || medium === "smm") {
        return "other_social";
    }

    return "other";
}

export function normalizeSocialSource({
    utmSource,
    utmMedium,
    utmCampaign, // currently unused, kept for future
    referrer,
} = {}) {
    // Priority: UTM > referrer > direct
    const fromUtm = utmToBucket({ utmSource, utmMedium, utmCampaign });
    if (fromUtm && BUCKET_SET.has(fromUtm)) return fromUtm;

    const host = parseReferrerHost(referrer);
    if (host) {
        const fromRef = mapHostToBucket(host);
        if (fromRef && BUCKET_SET.has(fromRef)) return fromRef;
        return "other";
    }

    return "direct";
}

export const SOCIAL_SOURCE_BUCKETS = BUCKETS;
