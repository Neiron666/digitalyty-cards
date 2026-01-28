import SiteAnalyticsDaily from "../models/SiteAnalyticsDaily.model.js";
import {
    detectChannel,
    parseReferrerHost,
    SITE_CHANNEL_SET,
} from "../utils/siteAnalyticsSource.util.js";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 240;
const inMemoryRate = new Map();

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

function getClientIp(req) {
    const xf = req.headers["x-forwarded-for"];
    if (typeof xf === "string" && xf.trim()) {
        return xf.split(",")[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || "";
}

function rateLimit(req) {
    const ip = getClientIp(req);
    if (!ip) return true;

    const now = Date.now();
    const key = ip;
    const entry = inMemoryRate.get(key);
    if (!entry || entry.resetAt <= now) {
        inMemoryRate.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return true;
    }

    entry.count += 1;
    if (entry.count > RATE_LIMIT) return false;
    return true;
}

function utcDayKey(now = new Date()) {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function safeKey(value, { maxLen = 80 } = {}) {
    const v = String(value || "").trim();
    if (!v) return "";
    const cleaned = v.replace(/[^a-zA-Z0-9_\-/]/g, "_");
    if (cleaned.includes(".") || cleaned.includes("$")) return "";
    return cleaned.slice(0, maxLen);
}

function normalizeEvent(value) {
    const e = String(value || "")
        .trim()
        .toLowerCase();
    return e === "view" || e === "click" ? e : "";
}

function normalizeSiteKey(value) {
    const v = String(value || "").trim();
    if (!v) return "main";
    const k = safeKey(v, { maxLen: 32 });
    return k || "main";
}

function normalizePagePath(value) {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!raw) return "";

    const pathOnly = raw.split("?")[0].split("#")[0];
    if (!pathOnly.startsWith("/")) return "";

    return pathOnly.slice(0, 120);
}

function normalizeAction(value) {
    const v = String(value || "")
        .trim()
        .toLowerCase();
    if (!v) return "";

    const cleaned = v.replace(/[^a-z0-9_\-]/g, "_").slice(0, 64);
    if (!cleaned) return "";
    return cleaned;
}

function bumpMapUpdate(mapField, key) {
    const k = safeKey(key);
    if (!k) return null;
    return { [`${mapField}.${k}`]: 1 };
}

async function capMapKeys({ siteKey, day, mapField, maxKeys }) {
    try {
        const doc = await SiteAnalyticsDaily.findOne({ siteKey, day })
            .select(mapField)
            .lean();
        const m = doc?.[mapField];
        const keys = m ? Object.keys(m) : [];
        return keys.length <= maxKeys;
    } catch {
        return true;
    }
}

function makePageChannelKey(pagePath, channel) {
    const pageKey = safeKey(pagePath, { maxLen: 80 });
    if (!pageKey) return null;

    const ch = String(channel || "").trim();
    if (!SITE_CHANNEL_SET.has(ch)) return null;

    return `${pageKey}__${ch}`;
}

async function bumpPageChannelCount({ siteKey, day, pagePath, channel }) {
    const compositeKey = makePageChannelKey(pagePath, channel);
    if (!compositeKey) return;

    const safeKeyPath = compositeKey;
    const mapField = "pageChannelCounts";

    // Phase 1: inc existing key without consuming cap.
    const existsFilter = {
        siteKey,
        day,
        $or: [{ [`${mapField}.${safeKeyPath}`]: { $exists: true } }],
    };

    try {
        const incExisting = await SiteAnalyticsDaily.updateOne(existsFilter, {
            $inc: { [`${mapField}.${safeKeyPath}`]: 1 },
        });

        if (incExisting?.matchedCount) return;

        // Phase 2: create new key only if still under cap.
        const cap = SiteAnalyticsDaily.MAX_PAGE_CHANNEL_KEYS;
        const createRes = await SiteAnalyticsDaily.updateOne(
            {
                siteKey,
                day,
                $or: [
                    { pageChannelKeyCount: { $lt: cap } },
                    { pageChannelKeyCount: { $exists: false } },
                ],
            },
            {
                $inc: {
                    [`${mapField}.${safeKeyPath}`]: 1,
                    pageChannelKeyCount: 1,
                },
            },
        );

        if (createRes?.matchedCount) return;

        // Phase 3: overflow
        const overflow = `other_page__${channel}`;
        await SiteAnalyticsDaily.updateOne(
            { siteKey, day },
            { $inc: { [`${mapField}.${overflow}`]: 1 } },
        );
    } catch {
        // ignore
    }
}

export async function trackSiteAnalytics(req, res) {
    // Never help enumeration; always 204 for most failures.
    try {
        if (!rateLimit(req)) return res.sendStatus(204);

        const event = normalizeEvent(req.body?.event);
        if (!event) return res.sendStatus(204);

        const siteKey = normalizeSiteKey(req.body?.siteKey);

        const pagePath = normalizePagePath(req.body?.pagePath);
        if (!pagePath) return res.sendStatus(204);

        // Strict server-side exclude: never mix /card/* traffic into site analytics.
        if (pagePath === "/card" || pagePath.startsWith("/card/")) {
            return res.sendStatus(204);
        }

        // Strict server-side enforcement: exclude internal/auth/admin/app pages.
        // Everything else is treated as public site traffic.
        if (isExcludedPagePath(pagePath)) return res.sendStatus(204);

        const action =
            event === "click" ? normalizeAction(req.body?.action) : "";
        if (event === "click" && !action) return res.sendStatus(204);

        const now = new Date();
        const day = utcDayKey(now);

        const utm =
            req.body?.utm && typeof req.body.utm === "object"
                ? req.body.utm
                : {};

        const utmSource = safeKey(utm?.source);
        const utmCampaign = safeKey(utm?.campaign);
        const utmMedium = safeKey(utm?.medium);

        const refRaw = typeof req.body?.ref === "string" ? req.body.ref : "";
        const referrerHost = parseReferrerHost(refRaw);
        const refKey = safeKey(referrerHost, { maxLen: 80 });

        const { channel } = detectChannel({
            utmSource: utm?.source,
            utmMedium: utm?.medium,
            utmCampaign: utm?.campaign,
            referrerHost,
        });

        const $inc = {};
        $inc[`channelCounts.${channel}`] = 1;

        if (event === "view") {
            $inc.views = 1;

            // pagePathCounts (capped)
            {
                const ok = await capMapKeys({
                    siteKey,
                    day,
                    mapField: "pagePathCounts",
                    maxKeys: SiteAnalyticsDaily.MAX_BUCKET_KEYS,
                });
                const key = ok ? pagePath : "other_page";
                Object.assign($inc, bumpMapUpdate("pagePathCounts", key) || {});
            }

            // pageChannelCounts (capped by global key-count)
            await bumpPageChannelCount({ siteKey, day, pagePath, channel });
        }

        if (event === "click") {
            $inc.clicksTotal = 1;

            {
                const ok = await capMapKeys({
                    siteKey,
                    day,
                    mapField: "actionCounts",
                    maxKeys: SiteAnalyticsDaily.MAX_BUCKET_KEYS,
                });
                const key = ok ? action : "other";
                Object.assign($inc, bumpMapUpdate("actionCounts", key) || {});
            }
        }

        // UTM + referrer maps (capped)
        if (utmSource) {
            const ok = await capMapKeys({
                siteKey,
                day,
                mapField: "utmSourceCounts",
                maxKeys: SiteAnalyticsDaily.MAX_BUCKET_KEYS,
            });
            const key = ok ? utmSource : "other_utm_source";
            Object.assign($inc, bumpMapUpdate("utmSourceCounts", key) || {});
        }

        if (utmCampaign) {
            const ok = await capMapKeys({
                siteKey,
                day,
                mapField: "utmCampaignCounts",
                maxKeys: SiteAnalyticsDaily.MAX_BUCKET_KEYS,
            });
            const key = ok ? utmCampaign : "other_campaign";
            Object.assign($inc, bumpMapUpdate("utmCampaignCounts", key) || {});
        }

        if (utmMedium) {
            const ok = await capMapKeys({
                siteKey,
                day,
                mapField: "utmMediumCounts",
                maxKeys: SiteAnalyticsDaily.MAX_BUCKET_KEYS,
            });
            const key = ok ? utmMedium : "other_utm_medium";
            Object.assign($inc, bumpMapUpdate("utmMediumCounts", key) || {});
        }

        if (refKey) {
            const ok = await capMapKeys({
                siteKey,
                day,
                mapField: "referrerCounts",
                maxKeys: SiteAnalyticsDaily.MAX_BUCKET_KEYS,
            });
            const key = ok ? referrerHost : "other_referrer";
            Object.assign($inc, bumpMapUpdate("referrerCounts", key) || {});
        }

        const update = {
            $setOnInsert: {
                siteKey,
                day,
                pageChannelKeyCount: 0,
            },
            $inc,
        };

        await SiteAnalyticsDaily.updateOne({ siteKey, day }, update, {
            upsert: true,
        });

        return res.sendStatus(204);
    } catch {
        return res.sendStatus(204);
    }
}
