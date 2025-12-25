import { SOCIAL_SOURCE_BUCKETS } from "./analyticsSource.util.js";

const MAX_CAMPAIGN_KEY_LEN = 64;

export function normalizeCampaignKey(raw) {
    const v = String(raw || "")
        .trim()
        .toLowerCase();
    if (!v) return null;

    const underscored = v.replace(/\s+/g, "_");
    const cleaned = underscored.replace(/[^a-z0-9_-]/g, "");
    const out = cleaned.slice(0, MAX_CAMPAIGN_KEY_LEN);
    if (!out) return null;
    return out;
}

export function makeCompositeKey(sourceBucket, campaignKey) {
    return `${String(sourceBucket || "").trim()}__${String(
        campaignKey || ""
    ).trim()}`;
}

export function safeCompositeKey(key) {
    const v = String(key || "").trim();
    if (!v) return null;
    if (v.includes(".") || v.includes("$")) return null;
    if (v.length > 128) return null;
    return v;
}

export function parseCompositeKey(key) {
    const v = String(key || "").trim();
    if (!v) return null;

    for (const source of SOCIAL_SOURCE_BUCKETS) {
        const prefix = `${source}__`;
        if (v.startsWith(prefix)) {
            const campaign = v.slice(prefix.length);
            if (!campaign) return null;
            return { source, campaign };
        }
    }

    return null;
}
