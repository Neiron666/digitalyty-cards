import crypto from "crypto";

import Card from "../models/Card.model.js";
import User from "../models/User.model.js";
import CardAnalyticsDaily from "../models/CardAnalyticsDaily.model.js";
import { toCardDTO } from "../utils/cardDTO.js";
import {
    normalizeSocialSource,
    SOCIAL_SOURCE_BUCKETS,
} from "../utils/analyticsSource.util.js";
import {
    makeCompositeKey,
    normalizeCampaignKey,
    parseCompositeKey,
    safeCompositeKey,
} from "../utils/analyticsCampaign.util.js";
import {
    DEFAULT_TENANT_KEY,
    resolveTenantKeyFromRequest,
} from "../utils/tenant.util.js";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 120;
const inMemoryRate = new Map();

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
    // Keep conservative charset to avoid pathological keys.
    // IMPORTANT: do not allow '.' to avoid dotted-path injection via $inc updates.
    const cleaned = v.replace(/[^a-zA-Z0-9_\-]/g, "_");
    return cleaned.slice(0, maxLen);
}

function normalizeAction(value) {
    const a = String(value || "")
        .trim()
        .toLowerCase();
    if (!a) return "";
    // Keep limited set and treat everything else as "other" to avoid unbounded keys.
    const allowed = new Set([
        "call",
        "whatsapp",
        "email",
        "navigate",
        "website",
        "instagram",
        "facebook",
        "tiktok",
        "linkedin",
        "lead",
        "other",
    ]);
    return allowed.has(a) ? a : "other";
}

function normalizeEvent(value) {
    const e = String(value || "")
        .trim()
        .toLowerCase();
    return e === "view" || e === "click" ? e : "";
}

function normalizeReferrer(ref) {
    const raw = typeof ref === "string" ? ref.trim() : "";
    if (!raw) return "direct";

    try {
        const u = new URL(raw);
        const host = (u.hostname || "").toLowerCase();
        if (!host) return "other";
        if (host.includes("google.")) return "google";
        if (host.includes("instagram.")) return "instagram";
        if (host.includes("facebook.")) return "facebook";
        if (host.includes("tiktok.")) return "tiktok";
        return host.slice(0, 64);
    } catch {
        return "other";
    }
}

function bumpMapUpdate(mapField, key) {
    const k = safeKey(key);
    if (!k) return null;
    return { [`${mapField}.${k}`]: 1 };
}

async function capMapKeys({ cardId, day, mapField, maxKeys }) {
    try {
        const doc = await CardAnalyticsDaily.findOne({ cardId, day })
            .select(mapField)
            .lean();
        const m = doc?.[mapField];
        // When stored as Map, lean returns a plain object.
        const keys = m ? Object.keys(m) : [];
        return keys.length <= maxKeys;
    } catch {
        return true;
    }
}

function buildDemoPremiumPayload({ rangeDays }) {
    const today = utcDayKey(new Date());

    // Hard-coded, premium-looking, stable-ish numbers.
    const series = Array.from({ length: rangeDays }, (_, i) => {
        const dt = new Date();
        dt.setUTCDate(dt.getUTCDate() - (rangeDays - 1 - i));
        const day = utcDayKey(dt);
        const views = 120 + Math.floor(20 * Math.sin(i / 2));
        const clicksTotal = 18 + Math.floor(5 * Math.cos(i / 3));
        return { day, views, clicksTotal };
    });

    const views = series.reduce((s, x) => s + x.views, 0);
    const clicksTotal = series.reduce((s, x) => s + x.clicksTotal, 0);

    return {
        isDemo: true,
        label: "דוגמה של לקוח פרימיום",
        rangeDays,
        kpi: {
            views,
            clicksTotal,
            conversion: views > 0 ? clicksTotal / views : 0,
            uniqueVisitors: 320,
            uniqueVisitorsIsApprox: true,
        },
        today: {
            day: today,
            views: series[series.length - 1]?.views || 0,
            clicksTotal: series[series.length - 1]?.clicksTotal || 0,
        },
        series,
        actions: {
            whatsapp: 120,
            call: 46,
            website: 39,
            navigate: 28,
            email: 15,
            instagram: 22,
            other: 9,
        },
        sources: {
            google: 180,
            instagram: 140,
            facebook: 80,
            direct: 220,
            other: 60,
        },
        campaigns: {
            top: [
                { key: "winter_sale", count: 190 },
                { key: "qr_store", count: 140 },
                { key: "instagram_bio", count: 110 },
            ],
        },
        compare: {
            last7: { views: 980, clicksTotal: 160 },
            prev7: { views: 840, clicksTotal: 132 },
        },
    };
}

async function loadOwnedCardOrThrow(cardId, req) {
    const card = await Card.findById(cardId);
    if (!card) return { card: null, status: 404 };
    if (!card?.user) return { card: null, status: 403 };
    if (String(card.user) !== String(req.userId))
        return { card: null, status: 403 };
    return { card, status: 200 };
}

function parseRange(req, { fallback, allowed }) {
    const raw = req.query?.range;
    const n = Number.parseInt(String(raw || ""), 10);
    if (!Number.isFinite(n)) return fallback;
    if (!allowed.includes(n)) return fallback;
    return n;
}

function dayKeysBack(rangeDays) {
    const keys = [];
    const now = new Date();
    for (let i = rangeDays - 1; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - i);
        keys.push(utcDayKey(d));
    }
    return keys;
}

function pickTop(obj, limit = 10) {
    const entries = Object.entries(obj || {})
        .map(([k, v]) => ({ key: k, count: Number(v) || 0 }))
        .filter((x) => x.key && x.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    return entries;
}

function mapToObj(m) {
    if (!m) return {};
    if (m instanceof Map) return Object.fromEntries(m.entries());
    if (typeof m === "object") return m;
    return {};
}

async function bumpSocialCampaignAttribution({
    cardId,
    day,
    mapField,
    compositeKey,
    sourceBucket,
}) {
    // Best-effort only; tracking must never fail.
    try {
        const safeKeyPath = safeCompositeKey(compositeKey);
        if (!safeKeyPath) return;

        const overflowKey = safeCompositeKey(
            makeCompositeKey(sourceBucket, "other_campaign"),
        );
        if (!overflowKey) return;

        // Phase 1: if key exists in either map, just increment (no keyCount bump)
        const existsFilter = {
            cardId,
            day,
            $or: [
                { [`socialCampaignViews.${safeKeyPath}`]: { $exists: true } },
                { [`socialCampaignClicks.${safeKeyPath}`]: { $exists: true } },
            ],
        };

        const incExisting = await CardAnalyticsDaily.updateOne(existsFilter, {
            $inc: { [`${mapField}.${safeKeyPath}`]: 1 },
        });

        if (incExisting?.matchedCount) return;

        // Phase 2: create new key only if still under the global cap.
        const cap = CardAnalyticsDaily.MAX_SOCIAL_CAMPAIGN_KEYS;
        const createRes = await CardAnalyticsDaily.updateOne(
            {
                cardId,
                day,
                $or: [
                    { socialCampaignKeyCount: { $lt: cap } },
                    { socialCampaignKeyCount: { $exists: false } },
                ],
            },
            {
                $inc: {
                    [`${mapField}.${safeKeyPath}`]: 1,
                    socialCampaignKeyCount: 1,
                },
            },
        );

        if (createRes?.matchedCount) return;

        // Phase 3: overflow bucket (no keyCount bump)
        await CardAnalyticsDaily.updateOne(
            { cardId, day },
            { $inc: { [`${mapField}.${overflowKey}`]: 1 } },
        );
    } catch {
        // ignore
    }
}

export async function trackAnalytics(req, res) {
    // Never help enumeration; always 204 for most failures.
    try {
        if (!rateLimit(req)) return res.sendStatus(204);

        const slug =
            typeof req.body?.slug === "string"
                ? req.body.slug.trim().toLowerCase()
                : "";
        const event = normalizeEvent(req.body?.event);
        const action = normalizeAction(req.body?.action);

        if (!slug || !event) return res.sendStatus(204);
        if (event === "click" && !action) return res.sendStatus(204);

        const tenant = resolveTenantKeyFromRequest(req);
        if (tenant?.ok === false) return res.sendStatus(204);
        const tenantKey = tenant?.tenantKey || DEFAULT_TENANT_KEY;

        const card = await Card.findOne({
            slug,
            $or: [
                { tenantKey },
                { tenantKey: { $exists: false } },
                { tenantKey: null },
            ],
        }).lean();
        if (!card) return res.sendStatus(204);

        const isActive = Boolean(card?.flags?.isActive ?? card?.isActive);
        const isPublished = card?.status === "published";
        const isUserOwned = Boolean(card?.user);
        if (!isActive || !isPublished || !isUserOwned)
            return res.sendStatus(204);

        const now = new Date();
        const day = utcDayKey(now);

        const utm =
            req.body?.utm && typeof req.body.utm === "object"
                ? req.body.utm
                : {};

        // Keep existing UTM/referrer keying behavior intact for legacy maps.
        const utmSource = safeKey(utm?.source);
        const utmCampaign = safeKey(utm?.campaign);
        const utmMedium = safeKey(utm?.medium);
        const ref = normalizeReferrer(req.body?.ref);

        // Canonical inbound source bucket for bounded social metrics.
        // Do NOT use safeKey() output here; normalize from raw inputs.
        const sourceBucket = normalizeSocialSource({
            utmSource: utm?.source,
            utmMedium: utm?.medium,
            utmCampaign: utm?.campaign,
            referrer: req.body?.ref,
        });

        const $inc = {};
        const campaignKey = normalizeCampaignKey(utm?.campaign);
        const compositeKey = campaignKey
            ? makeCompositeKey(sourceBucket, campaignKey)
            : null;

        if (event === "view") {
            $inc.views = 1;

            // Bounded canonical bucket (fixed allowlist keys only)
            $inc[`socialViewsBySource.${sourceBucket}`] = 1;

            // Caps: if map already too large, push into "other".
            if (utmSource) {
                const ok = await capMapKeys({
                    cardId: card._id,
                    day,
                    mapField: "utmSourceCounts",
                    maxKeys: CardAnalyticsDaily.MAX_BUCKET_KEYS,
                });
                const key = ok ? utmSource : "other";
                Object.assign(
                    $inc,
                    bumpMapUpdate("utmSourceCounts", key) || {},
                );
            }

            if (utmCampaign) {
                const ok = await capMapKeys({
                    cardId: card._id,
                    day,
                    mapField: "utmCampaignCounts",
                    maxKeys: CardAnalyticsDaily.MAX_BUCKET_KEYS,
                });
                const key = ok ? utmCampaign : "other";
                Object.assign(
                    $inc,
                    bumpMapUpdate("utmCampaignCounts", key) || {},
                );
            }

            if (utmMedium) {
                const ok = await capMapKeys({
                    cardId: card._id,
                    day,
                    mapField: "utmMediumCounts",
                    maxKeys: CardAnalyticsDaily.MAX_BUCKET_KEYS,
                });
                const key = ok ? utmMedium : "other";
                Object.assign(
                    $inc,
                    bumpMapUpdate("utmMediumCounts", key) || {},
                );
            }

            if (ref) {
                const ok = await capMapKeys({
                    cardId: card._id,
                    day,
                    mapField: "referrerCounts",
                    maxKeys: CardAnalyticsDaily.MAX_BUCKET_KEYS,
                });
                const key = ok ? ref : "other";
                Object.assign($inc, bumpMapUpdate("referrerCounts", key) || {});
            }
        }

        if (event === "click") {
            $inc.clicksTotal = 1;
            $inc[`clicksByAction.${action}`] = 1;

            // Bounded canonical bucket (fixed allowlist keys only)
            $inc[`socialClicksBySource.${sourceBucket}`] = 1;
        }

        const update = {
            $setOnInsert: {
                cardId: card._id,
                day,
                socialCampaignKeyCount: 0,
            },
            $inc,
        };

        await CardAnalyticsDaily.updateOne({ cardId: card._id, day }, update, {
            upsert: true,
        });

        // Campaign attribution (best-effort): bounded, no reads.
        if (compositeKey) {
            await bumpSocialCampaignAttribution({
                cardId: card._id,
                day,
                mapField:
                    event === "click"
                        ? "socialCampaignClicks"
                        : "socialCampaignViews",
                compositeKey,
                sourceBucket,
            });
        }

        // Premium-only uniques (best effort): do NOT break tracking.
        try {
            // Avoid an extra DB read unless user-tier override could matter.
            const dtoNoUser = toCardDTO(card, now);
            let dto = dtoNoUser;

            const needsUserTier =
                (dtoNoUser?.entitlements?.analyticsLevel || "none") !==
                    "premium" && Boolean(card?.user);
            if (needsUserTier) {
                const userTier = await User.findById(String(card.user))
                    .select("adminTier adminTierUntil")
                    .lean();
                dto = toCardDTO(card, now, { user: userTier });
            }

            const level = dto?.entitlements?.analyticsLevel || "none";

            if (level === "premium") {
                const deviceId =
                    typeof req.body?.deviceId === "string"
                        ? req.body.deviceId.trim()
                        : "";
                if (deviceId) {
                    const hash = crypto
                        .createHash("sha256")
                        .update(`${String(card._id)}|${day}|${deviceId}`)
                        .digest("hex")
                        .slice(0, 16);

                    const daily = await CardAnalyticsDaily.findOne({
                        cardId: card._id,
                        day,
                    })
                        .select("uniqueHashes uniqueVisitors uniqueCapReached")
                        .lean();

                    const alreadyReached = Boolean(daily?.uniqueCapReached);
                    const hashes = Array.isArray(daily?.uniqueHashes)
                        ? daily.uniqueHashes
                        : [];
                    if (alreadyReached) {
                        await CardAnalyticsDaily.updateOne(
                            { cardId: card._id, day },
                            {
                                $set: {
                                    uniqueVisitors: null,
                                    uniqueMode: null,
                                },
                            },
                        );
                    } else if (
                        hashes.length >= CardAnalyticsDaily.MAX_UNIQUE_HASHES
                    ) {
                        await CardAnalyticsDaily.updateOne(
                            { cardId: card._id, day },
                            {
                                $set: {
                                    uniqueCapReached: true,
                                    uniqueVisitors: null,
                                    uniqueMode: null,
                                },
                            },
                        );
                    } else {
                        const addRes = await CardAnalyticsDaily.updateOne(
                            { cardId: card._id, day },
                            {
                                $addToSet: { uniqueHashes: hash },
                            },
                        );

                        // If modified, hash was new -> increment uniques.
                        if (addRes?.modifiedCount) {
                            await CardAnalyticsDaily.updateOne(
                                { cardId: card._id, day },
                                {
                                    $set: { uniqueMode: "approx_device" },
                                    $inc: { uniqueVisitors: 1 },
                                },
                            );
                        }
                    }
                }
            }
        } catch {
            // ignore
        }

        return res.sendStatus(204);
    } catch {
        return res.sendStatus(204);
    }
}

async function loadRangeDocs({
    cardId,
    rangeDays,
    includeCampaignAttribution,
}) {
    const days = dayKeysBack(rangeDays);
    const selectFields = [
        "cardId",
        "day",
        "views",
        "clicksTotal",
        "clicksByAction",
        "utmSourceCounts",
        "utmCampaignCounts",
        "utmMediumCounts",
        "referrerCounts",
        "socialViewsBySource",
        "socialClicksBySource",
        "uniqueVisitors",
        "uniqueCapReached",
        "uniqueMode",
    ];

    if (includeCampaignAttribution) {
        selectFields.push("socialCampaignViews");
        selectFields.push("socialCampaignClicks");
    }

    const docs = await CardAnalyticsDaily.find({
        cardId,
        day: { $in: days },
    })
        .select(selectFields.join(" "))
        .lean();

    const byDay = new Map();
    for (const d of docs) {
        byDay.set(d.day, d);
    }

    const series = days.map((day) => {
        const d = byDay.get(day);
        return {
            day,
            views: Number(d?.views) || 0,
            clicksTotal: Number(d?.clicksTotal) || 0,
        };
    });

    return { days, docs, byDay, series };
}

function sumMapField(docs, field) {
    const out = {};
    for (const doc of docs) {
        const obj = mapToObj(doc?.[field]);
        for (const [k, v] of Object.entries(obj)) {
            const n = Number(v) || 0;
            if (!k || n <= 0) continue;
            out[k] = (out[k] || 0) + n;
        }
    }
    return out;
}

export async function getSummary(req, res) {
    const { card, status } = await loadOwnedCardOrThrow(req.params.cardId, req);
    if (!card) return res.status(status).json({ message: "Forbidden" });

    const now = new Date();
    const userTier = await User.findById(String(req.userId))
        .select("adminTier adminTierUntil")
        .lean();
    const dto = toCardDTO(card, now, { includePrivate: false, user: userTier });
    const level = dto?.entitlements?.analyticsLevel || "none";

    let rangeDays = parseRange(req, { fallback: 30, allowed: [7, 30] });

    if (level === "demo") {
        return res.json(buildDemoPremiumPayload({ rangeDays: 30 }));
    }

    if (level === "basic") {
        rangeDays = 7;
    }

    if (level !== "premium" && level !== "basic") {
        return res.status(403).json({ message: "Not allowed" });
    }

    const { series: fullSeries, byDay } = await loadRangeDocs({
        cardId: card._id,
        rangeDays,
        includeCampaignAttribution: false,
    });

    const views = fullSeries.reduce((s, x) => s + x.views, 0);
    const clicksTotal = fullSeries.reduce((s, x) => s + x.clicksTotal, 0);

    const series =
        level === "basic"
            ? fullSeries.map((x) => ({ day: x.day, views: x.views }))
            : fullSeries;

    const todayKey = utcDayKey(now);
    const todayDoc = byDay.get(todayKey);

    const uniqueVisitors =
        level === "premium"
            ? typeof todayDoc?.uniqueVisitors === "number"
                ? todayDoc.uniqueVisitors
                : null
            : null;

    const uniqueVisitorsIsApprox =
        level === "premium"
            ? Boolean(
                  todayDoc?.uniqueMode === "approx_device" &&
                  uniqueVisitors !== null,
              )
            : false;

    const payload = {
        rangeDays,
        kpi: {
            views,
            clicksTotal: level === "premium" ? clicksTotal : null,
            conversion:
                level === "premium" && views > 0 ? clicksTotal / views : null,
            uniqueVisitors,
            uniqueVisitorsIsApprox,
        },
        today: {
            day: todayKey,
            views: Number(todayDoc?.views) || 0,
            clicksTotal:
                level === "premium" ? Number(todayDoc?.clicksTotal) || 0 : null,
            uniqueVisitors,
        },
        series,
    };

    // Premium-only compare: last7 vs prev7 (based on series)
    if (level === "premium") {
        const last7 = fullSeries.slice(-7);
        const prev7 = fullSeries.slice(-14, -7);
        const sum = (arr, field) =>
            arr.reduce((s, x) => s + (Number(x?.[field]) || 0), 0);
        payload.compare = {
            last7: {
                views: sum(last7, "views"),
                clicksTotal: sum(last7, "clicksTotal"),
            },
            prev7: {
                views: sum(prev7, "views"),
                clicksTotal: sum(prev7, "clicksTotal"),
            },
        };
    }

    return res.json(payload);
}

export async function getActions(req, res) {
    const { card, status } = await loadOwnedCardOrThrow(req.params.cardId, req);
    if (!card) return res.status(status).json({ message: "Forbidden" });

    const now = new Date();
    const userTier = await User.findById(String(req.userId))
        .select("adminTier adminTierUntil")
        .lean();
    const dto = toCardDTO(card, now, { user: userTier });
    const level = dto?.entitlements?.analyticsLevel || "none";

    if (level === "demo") {
        const demo = buildDemoPremiumPayload({ rangeDays: 30 });
        return res.json({ isDemo: true, rangeDays: 30, actions: demo.actions });
    }

    if (level !== "premium") {
        return res.status(403).json({ message: "Not allowed" });
    }

    const rangeDays = parseRange(req, { fallback: 30, allowed: [7, 30] });
    const { docs } = await loadRangeDocs({
        cardId: card._id,
        rangeDays,
        includeCampaignAttribution: false,
    });

    const out = {};
    for (const doc of docs) {
        const m = mapToObj(doc?.clicksByAction);
        for (const [k, v] of Object.entries(m)) {
            const n = Number(v) || 0;
            if (!k || n <= 0) continue;
            out[k] = (out[k] || 0) + n;
        }
    }

    return res.json({ rangeDays, actions: out });
}

export async function getSources(req, res) {
    const { card, status } = await loadOwnedCardOrThrow(req.params.cardId, req);
    if (!card) return res.status(status).json({ message: "Forbidden" });

    const now = new Date();
    const userTier = await User.findById(String(req.userId))
        .select("adminTier adminTierUntil")
        .lean();
    const dto = toCardDTO(card, now, { user: userTier });
    const level = dto?.entitlements?.analyticsLevel || "none";

    if (level === "demo") {
        const demo = buildDemoPremiumPayload({ rangeDays: 30 });
        // Provide premium-shaped socialSources for demo UI.
        const socialSources = SOCIAL_SOURCE_BUCKETS.map((source) => {
            const views = Number(demo?.sources?.[source]) || 0;
            // Demo doesn't have per-source clicks; use a stable synthetic ratio.
            const clicks = Math.round(views * 0.18);
            return {
                source,
                views,
                clicks,
                conversion: views > 0 ? clicks / views : 0,
            };
        }).filter((x) => x.views > 0 || x.clicks > 0);

        return res.json({
            isDemo: true,
            rangeDays: 30,
            sources: demo.sources,
            // Demo referrers are synthetic (demo-only), not inferred from campaigns.
            referrers: {
                direct: 220,
                google: 180,
                instagram: 90,
                facebook: 60,
                other: 40,
            },
            socialSources,
            socialCampaignSources: SOCIAL_SOURCE_BUCKETS.map((source) => {
                const views = Number(demo?.sources?.[source]) || 0;
                const clicks = Math.round(views * 0.18);
                const campaigns = demo?.campaigns?.top
                    ? demo.campaigns.top.slice(0, 2).map((c, i) => {
                          const cv = Math.round(
                              (Number(c?.count) || 0) * (i === 0 ? 0.6 : 0.3),
                          );
                          const ck = Math.round(cv * 0.2);
                          return {
                              name: String(c?.key || "campaign").trim(),
                              views: cv,
                              clicks: ck,
                              conversion: cv > 0 ? ck / cv : 0,
                          };
                      })
                    : [];
                return {
                    source,
                    views,
                    clicks,
                    conversion: views > 0 ? clicks / views : 0,
                    campaigns,
                };
            }).filter((x) => x.views > 0 || x.clicks > 0),
        });
    }

    let rangeDays = parseRange(req, { fallback: 30, allowed: [7, 30] });
    if (level === "basic") {
        rangeDays = 7;
    }

    if (level !== "premium" && level !== "basic") {
        return res.status(403).json({ message: "Not allowed" });
    }

    const { docs, series } = await loadRangeDocs({
        cardId: card._id,
        rangeDays,
        includeCampaignAttribution: level === "premium",
    });

    const viewsTotal = series.reduce((s, x) => s + (Number(x?.views) || 0), 0);
    const clicksTotal = series.reduce(
        (s, x) => s + (Number(x?.clicksTotal) || 0),
        0,
    );

    const socialViews = sumMapField(docs, "socialViewsBySource");
    const socialClicks = sumMapField(docs, "socialClicksBySource");

    const socialSources = SOCIAL_SOURCE_BUCKETS.map((source) => {
        const views = Number(socialViews?.[source]) || 0;
        const clicks =
            level === "premium" ? Number(socialClicks?.[source]) || 0 : null;
        return {
            source,
            views,
            clicks,
            conversion:
                level === "premium" && views > 0 && clicks !== null
                    ? clicks / views
                    : null,
        };
    })
        .filter((x) => x.views > 0 || (x.clicks || 0) > 0)
        .sort((a, b) => (b.views || 0) - (a.views || 0));

    // Keep existing UTM/referrer breakdown premium-only (backward-compatible).
    if (level === "premium") {
        // MVP: sources derived from utm_source + referrerCounts (already bucketed in track)
        const utmSources = sumMapField(docs, "utmSourceCounts");
        const referrers = sumMapField(docs, "referrerCounts");

        const campaignViews = sumMapField(docs, "socialCampaignViews");
        const campaignClicks = sumMapField(docs, "socialCampaignClicks");

        const bySource = new Map();
        const ensure = (source) => {
            if (!bySource.has(source)) {
                bySource.set(source, new Map());
            }
            return bySource.get(source);
        };

        for (const [composite, count] of Object.entries(campaignViews)) {
            const parsed = parseCompositeKey(composite);
            if (!parsed) continue;
            const campaigns = ensure(parsed.source);
            const entry = campaigns.get(parsed.campaign) || {
                views: 0,
                clicks: 0,
            };
            entry.views += Number(count) || 0;
            campaigns.set(parsed.campaign, entry);
        }

        for (const [composite, count] of Object.entries(campaignClicks)) {
            const parsed = parseCompositeKey(composite);
            if (!parsed) continue;
            const campaigns = ensure(parsed.source);
            const entry = campaigns.get(parsed.campaign) || {
                views: 0,
                clicks: 0,
            };
            entry.clicks += Number(count) || 0;
            campaigns.set(parsed.campaign, entry);
        }

        const TOP_CAMPAIGNS_PER_SOURCE = 10;
        const socialCampaignSources = SOCIAL_SOURCE_BUCKETS.map((source) => {
            const views = Number(socialViews?.[source]) || 0;
            const clicks = Number(socialClicks?.[source]) || 0;

            const campaignsMap = bySource.get(source) || new Map();
            const rows = Array.from(campaignsMap.entries())
                .map(([name, v]) => ({
                    name,
                    views: Number(v?.views) || 0,
                    clicks: Number(v?.clicks) || 0,
                }))
                .filter((x) => x.name && (x.views > 0 || x.clicks > 0));

            rows.sort((a, b) => {
                if (b.clicks !== a.clicks) return b.clicks - a.clicks;
                return b.views - a.views;
            });

            const top = rows.slice(0, TOP_CAMPAIGNS_PER_SOURCE);
            const rest = rows.slice(TOP_CAMPAIGNS_PER_SOURCE);

            let otherViews = 0;
            let otherClicks = 0;
            for (const r of rest) {
                otherViews += r.views;
                otherClicks += r.clicks;
            }

            const campaigns = top
                .map((r) => ({
                    name: r.name,
                    views: r.views,
                    clicks: r.clicks,
                    conversion: r.views > 0 ? r.clicks / r.views : 0,
                }))
                .concat(
                    otherViews > 0 || otherClicks > 0
                        ? [
                              {
                                  name: "other_campaign",
                                  views: otherViews,
                                  clicks: otherClicks,
                                  conversion:
                                      otherViews > 0
                                          ? otherClicks / otherViews
                                          : 0,
                              },
                          ]
                        : [],
                );

            return {
                source,
                views,
                clicks,
                conversion: views > 0 ? clicks / views : 0,
                campaigns,
            };
        }).filter((x) => x.views > 0 || x.clicks > 0 || x.campaigns.length > 0);

        return res.json({
            rangeDays,
            totals: { viewsTotal, clicksTotal },
            socialSources,
            socialCampaignSources,
            utmSources,
            referrers,
            utmSourcesTop: pickTop(utmSources, 10),
        });
    }

    // Basic: views-only, 7 days.
    const referrers = sumMapField(docs, "referrerCounts");
    return res.json({
        rangeDays,
        totals: { viewsTotal },
        referrers,
        socialSources: socialSources.map((x) => ({
            source: x.source,
            views: x.views,
        })),
    });
}

export async function getCampaigns(req, res) {
    const { card, status } = await loadOwnedCardOrThrow(req.params.cardId, req);
    if (!card) return res.status(status).json({ message: "Forbidden" });

    const now = new Date();
    const userTier = await User.findById(String(req.userId))
        .select("adminTier adminTierUntil")
        .lean();
    const dto = toCardDTO(card, now, { user: userTier });
    const level = dto?.entitlements?.analyticsLevel || "none";

    if (level === "demo") {
        const demo = buildDemoPremiumPayload({ rangeDays: 30 });
        return res.json({
            isDemo: true,
            rangeDays: 30,
            campaigns: demo.campaigns,
        });
    }

    if (level !== "premium") {
        return res.status(403).json({ message: "Not allowed" });
    }

    const rangeDays = parseRange(req, { fallback: 30, allowed: [7, 30] });
    const { docs } = await loadRangeDocs({ cardId: card._id, rangeDays });

    const campaigns = sumMapField(docs, "utmCampaignCounts");
    const mediums = sumMapField(docs, "utmMediumCounts");

    return res.json({
        rangeDays,
        campaignsTop: pickTop(campaigns, 10),
        mediumsTop: pickTop(mediums, 10),
    });
}
