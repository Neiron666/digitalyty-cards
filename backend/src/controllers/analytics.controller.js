import crypto from "crypto";

import Card from "../models/Card.model.js";
import User from "../models/User.model.js";
import CardAnalyticsDaily from "../models/CardAnalyticsDaily.model.js";
import { toCardDTO } from "../utils/cardDTO.js";

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
    const cleaned = v.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
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

        const card = await Card.findOne({ slug }).lean();
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
        const utmSource = safeKey(utm?.source);
        const utmCampaign = safeKey(utm?.campaign);
        const utmMedium = safeKey(utm?.medium);
        const ref = normalizeReferrer(req.body?.ref);

        const $inc = {};

        if (event === "view") {
            $inc.views = 1;

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
                    bumpMapUpdate("utmSourceCounts", key) || {}
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
                    bumpMapUpdate("utmCampaignCounts", key) || {}
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
                    bumpMapUpdate("utmMediumCounts", key) || {}
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
        }

        const update = {
            $setOnInsert: {
                cardId: card._id,
                day,
            },
            $inc,
        };

        await CardAnalyticsDaily.updateOne({ cardId: card._id, day }, update, {
            upsert: true,
        });

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
                            }
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
                            }
                        );
                    } else {
                        const addRes = await CardAnalyticsDaily.updateOne(
                            { cardId: card._id, day },
                            {
                                $addToSet: { uniqueHashes: hash },
                            }
                        );

                        // If modified, hash was new -> increment uniques.
                        if (addRes?.modifiedCount) {
                            await CardAnalyticsDaily.updateOne(
                                { cardId: card._id, day },
                                {
                                    $set: { uniqueMode: "approx_device" },
                                    $inc: { uniqueVisitors: 1 },
                                }
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

async function loadRangeDocs({ cardId, rangeDays }) {
    const days = dayKeysBack(rangeDays);
    const docs = await CardAnalyticsDaily.find({
        cardId,
        day: { $in: days },
    })
        .select(
            "cardId day views clicksTotal clicksByAction utmSourceCounts utmCampaignCounts utmMediumCounts referrerCounts uniqueVisitors uniqueCapReached uniqueMode"
        )
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
                      uniqueVisitors !== null
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
    const { docs } = await loadRangeDocs({ cardId: card._id, rangeDays });

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
        return res.json({ isDemo: true, rangeDays: 30, sources: demo.sources });
    }

    if (level !== "premium") {
        return res.status(403).json({ message: "Not allowed" });
    }

    const rangeDays = parseRange(req, { fallback: 30, allowed: [7, 30] });
    const { docs } = await loadRangeDocs({ cardId: card._id, rangeDays });

    // MVP: sources derived from utm_source + referrerCounts (already bucketed in track)
    const utmSources = sumMapField(docs, "utmSourceCounts");
    const referrers = sumMapField(docs, "referrerCounts");

    // Present combined (keep keys separate to avoid guessing).
    return res.json({
        rangeDays,
        utmSources,
        referrers,
        utmSourcesTop: pickTop(utmSources, 10),
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
