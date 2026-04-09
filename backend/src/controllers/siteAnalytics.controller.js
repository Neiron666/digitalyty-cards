import { createHash } from "node:crypto";
import SiteAnalyticsDaily from "../models/SiteAnalyticsDaily.model.js";
import SiteAnalyticsVisit from "../models/SiteAnalyticsVisit.model.js";
import {
    detectChannel,
    normalizeSource,
    parseReferrerHost,
    SITE_CHANNEL_SET,
} from "../utils/siteAnalyticsSource.util.js";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 240;
const inMemoryRate = new Map();

const DIAGNOSTIC_REASONS = Object.freeze([
    "disabled",
    "rate_limited",
    "invalid_event",
    "invalid_pagePath",
    "excluded_pagePath",
    "card_denied",
    "missing_action",
    "db_error",
]);

const DIAGNOSTICS_START_AT = new Date();
let diagnosticsLastResetAt = DIAGNOSTICS_START_AT;
const diagnosticsCounters = Object.fromEntries(
    DIAGNOSTIC_REASONS.map((k) => [k, 0]),
);

function incDiagnostics(reason) {
    if (!reason || typeof reason !== "string") return;
    if (!Object.prototype.hasOwnProperty.call(diagnosticsCounters, reason))
        return;
    diagnosticsCounters[reason] += 1;
}

export function getSiteAnalyticsDiagnosticsSnapshot() {
    return {
        since: DIAGNOSTICS_START_AT.toISOString(),
        lastResetAt: diagnosticsLastResetAt.toISOString(),
        counters: { ...diagnosticsCounters },
    };
}

const RATE_MAX_KEYS = Number.parseInt(
    process.env.SITE_ANALYTICS_RATE_MAX_KEYS || "5000",
    10,
);
const RATE_SWEEP_EVERY = 200;
let rateSweepTick = 0;

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
    // Trust-proxy gate: we rely on Express's req.ip.
    // When trust proxy is disabled, req.ip is the direct peer IP.
    // When trust proxy is enabled, Express already resolves XFF into req.ip.
    return req.ip || req.connection?.remoteAddress || "";
}

function sweepRateMap(now) {
    // Remove expired windows first
    for (const [key, entry] of inMemoryRate.entries()) {
        if (!entry || entry.resetAt <= now) inMemoryRate.delete(key);
    }

    // Hard cap to prevent unbounded growth
    const maxKeys =
        Number.isFinite(RATE_MAX_KEYS) && RATE_MAX_KEYS > 0
            ? RATE_MAX_KEYS
            : 5000;
    if (inMemoryRate.size <= maxKeys) return;

    const overflow = inMemoryRate.size - maxKeys;
    let removed = 0;
    for (const key of inMemoryRate.keys()) {
        inMemoryRate.delete(key);
        removed += 1;
        if (removed >= overflow) break;
    }
}

function isSiteAnalyticsEnabled() {
    const raw = String(process.env.SITE_ANALYTICS_ENABLED ?? "").trim();
    if (!raw) return true;
    const v = raw.toLowerCase();
    if (["0", "false", "off", "no"].includes(v)) return false;
    if (["1", "true", "on", "yes"].includes(v)) return true;
    return true;
}

function rateLimit(req) {
    const ip = getClientIp(req);
    if (!ip) return true;

    const now = Date.now();

    rateSweepTick += 1;
    if (rateSweepTick % RATE_SWEEP_EVERY === 0) {
        sweepRateMap(now);
    }

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

// ---------------------------------------------------------------------------
// Visit-layer helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic SHA-256 prefix used for hashing raw client IDs before storage.
 * Returns the first 16 hex characters of sha256(siteKey + "|" + rawId).
 * Raw deviceId / visitId are NEVER stored in any collection.
 */
function hashHex16(siteKey, rawId) {
    return createHash("sha256")
        .update(`${siteKey}|${rawId}`)
        .digest("hex")
        .slice(0, 16);
}

/**
 * Action keys allowed to accumulate in SiteAnalyticsVisit.importantActions.
 * Must mirror frontend SITE_ACTIONS in siteAnalytics.actions.js.
 * Raw / unknown action strings are never written to visit documents.
 */
const IMPORTANT_ACTIONS_SET = new Set([
    "home_hero_primary_register",
    "home_hero_secondary_examples",
    "home_templates_cta",
    "home_templates_see_all",
    "home_bottom_cta",
    "pricing_trial_start",
    "pricing_premium_upgrade",
    "pricing_monthly_start",
    "pricing_annual_start",
    "cards_hero_cta",
    "cards_templates_cta",
    "cards_bottom_cta",
    "cards_showcase_card_cta",
    "cards_showcase_view_all_cta",
    "blog_article_click",
    "guide_article_click",
    "contact_email_click",
    "contact_form_submit",
    "contact_whatsapp_click",
]);

/**
 * Non-blocking visit-layer upsert.
 * - Skips silently when deviceId or visitId are absent/empty.
 * - First-touch attribution (channel, source, landingPage, UTM) is immutable
 *   via $setOnInsert - never overwritten on subsequent events.
 * - pageViewsCount / clicksCount are incremented per event.
 * - importantActions accumulates only allowlisted action keys via $addToSet.
 * - Any failure is swallowed; it must not affect the 204 response.
 */
async function tryUpsertVisit({
    siteKey,
    day,
    now,
    event,
    action,
    pagePath,
    channel,
    source,
    referrerHost,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    deviceIdRaw,
    visitIdRaw,
}) {
    try {
        const deviceId = String(deviceIdRaw || "").trim();
        const visitId = String(visitIdRaw || "").trim();
        if (!deviceId || !visitId) return; // missing identity → skip gracefully

        const deviceHash = hashHex16(siteKey, deviceId);
        const visitHash = hashHex16(siteKey, visitId);

        const $inc = {};
        if (event === "view") $inc.pageViewsCount = 1;
        if (event === "click") $inc.clicksCount = 1;

        const update = {
            $setOnInsert: {
                siteKey,
                visitHash,
                deviceHash,
                day,
                startedAt: now,
                channel: channel || "",
                source: source || "",
                landingPage: pagePath || "",
                referrerHost: referrerHost || "",
                utmSource: utmSource || "",
                utmMedium: utmMedium || "",
                utmCampaign: utmCampaign || "",
                utmContent: utmContent || "",
            },
            $set: { lastSeenAt: now },
            ...(Object.keys($inc).length ? { $inc } : {}),
        };

        // Accumulate allowlisted click actions only.
        if (event === "click" && action && IMPORTANT_ACTIONS_SET.has(action)) {
            update.$addToSet = { importantActions: action };
        }

        await SiteAnalyticsVisit.updateOne({ siteKey, visitHash }, update, {
            upsert: true,
        });
    } catch {
        // Fail-safe: visit-layer failure must never surface to the caller.
    }
}

export async function trackSiteAnalytics(req, res) {
    // Never help enumeration; always 204 for most failures.
    try {
        if (!isSiteAnalyticsEnabled()) {
            incDiagnostics("disabled");
            return res.sendStatus(204);
        }
        if (!rateLimit(req)) {
            incDiagnostics("rate_limited");
            return res.sendStatus(204);
        }

        const event = normalizeEvent(req.body?.event);
        if (!event) {
            incDiagnostics("invalid_event");
            return res.sendStatus(204);
        }

        const siteKey = normalizeSiteKey(req.body?.siteKey);

        const pagePath = normalizePagePath(req.body?.pagePath);
        if (!pagePath) {
            incDiagnostics("invalid_pagePath");
            return res.sendStatus(204);
        }

        // Strict server-side exclude: never mix /card/* traffic into site analytics.
        if (pagePath === "/card" || pagePath.startsWith("/card/")) {
            incDiagnostics("card_denied");
            return res.sendStatus(204);
        }

        // Strict server-side enforcement: exclude internal/auth/admin/app pages.
        // Everything else is treated as public site traffic.
        if (isExcludedPagePath(pagePath)) {
            incDiagnostics("excluded_pagePath");
            return res.sendStatus(204);
        }

        const action =
            event === "click" ? normalizeAction(req.body?.action) : "";
        if (event === "click" && !action) {
            incDiagnostics("missing_action");
            return res.sendStatus(204);
        }

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

        const userAgent = String(req.headers?.["user-agent"] || "");
        const normalizedSource = normalizeSource({
            utmSource: utm?.source,
            utmMedium: utm?.medium,
            referrerHost,
            userAgent,
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

        // sourceCounts (capped) - normalized source attribution
        {
            const sourceKey = safeKey(normalizedSource, { maxLen: 40 });
            if (sourceKey) {
                const ok = await capMapKeys({
                    siteKey,
                    day,
                    mapField: "sourceCounts",
                    maxKeys: SiteAnalyticsDaily.MAX_BUCKET_KEYS,
                });
                const key = ok ? sourceKey : "other_source";
                Object.assign($inc, bumpMapUpdate("sourceCounts", key) || {});
            }
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

        // --- Visit-layer upsert: fire-and-forget, truly non-blocking. ---
        // 204 is sent immediately; the secondary write races independently.
        // .catch() is mandatory to prevent unhandled promise rejection.
        tryUpsertVisit({
            siteKey,
            day,
            now,
            event,
            action,
            pagePath,
            channel,
            source: normalizedSource,
            referrerHost,
            utmSource,
            utmMedium,
            utmCampaign,
            utmContent: safeKey(utm?.content),
            deviceIdRaw: req.body?.deviceId,
            visitIdRaw: req.body?.visitId,
        }).catch(() => {
            /* swallowed - visit layer must never surface */
        });

        return res.sendStatus(204);
    } catch {
        incDiagnostics("db_error");
        return res.sendStatus(204);
    }
}
