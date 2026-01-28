import CardAnalyticsDaily from "../models/CardAnalyticsDaily.model.js";
import { SOCIAL_SOURCE_BUCKETS } from "../utils/analyticsSource.util.js";
import { parseCompositeKey } from "../utils/analyticsCampaign.util.js";

function utcDayKey(now = new Date()) {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
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
    return Object.entries(obj || {})
        .map(([k, v]) => ({ key: k, count: Number(v) || 0 }))
        .filter((x) => x.key && x.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

function capTopObject(obj, { maxKeys, otherKey }) {
    const top = pickTop(obj, maxKeys);
    const keep = new Set(top.map((x) => x.key));
    const out = {};

    let otherCount = 0;
    for (const [k, v] of Object.entries(obj || {})) {
        const n = Number(v) || 0;
        if (!k || n <= 0) continue;
        if (keep.has(k)) out[k] = n;
        else otherCount += n;
    }

    if (otherKey && otherCount > 0) out[otherKey] = otherCount;
    return out;
}

async function aggregateMapSums({ days, mapField }) {
    const rows = await CardAnalyticsDaily.aggregate([
        { $match: { day: { $in: days } } },
        { $project: { pairs: { $objectToArray: `$${mapField}` } } },
        { $unwind: "$pairs" },
        {
            $group: {
                _id: "$pairs.k",
                count: { $sum: "$pairs.v" },
            },
        },
        { $sort: { count: -1 } },
    ]);

    const out = {};
    for (const r of rows) {
        const k = String(r?._id || "");
        const n = Number(r?.count) || 0;
        if (!k || n <= 0) continue;
        out[k] = n;
    }
    return out;
}

export async function getAdminAnalyticsSummary(req, res) {
    const rangeDays = parseRange(req, { fallback: 7, allowed: [7, 30] });
    const days = dayKeysBack(rangeDays);

    const rows = await CardAnalyticsDaily.aggregate([
        { $match: { day: { $in: days } } },
        {
            $group: {
                _id: "$day",
                views: { $sum: "$views" },
                clicksTotal: { $sum: "$clicksTotal" },
            },
        },
    ]);

    const byDay = new Map();
    for (const r of rows) {
        byDay.set(String(r?._id || ""), {
            views: Number(r?.views) || 0,
            clicksTotal: Number(r?.clicksTotal) || 0,
        });
    }

    const series = days.map((day) => {
        const d = byDay.get(day);
        return {
            day,
            views: Number(d?.views) || 0,
            clicksTotal: Number(d?.clicksTotal) || 0,
        };
    });

    const views = series.reduce((s, x) => s + (Number(x?.views) || 0), 0);
    const clicksTotal = series.reduce(
        (s, x) => s + (Number(x?.clicksTotal) || 0),
        0,
    );

    const todayKey = utcDayKey(new Date());
    const todayDoc = byDay.get(todayKey);

    const payload = {
        rangeDays,
        kpi: {
            views,
            clicksTotal,
            conversion: views > 0 ? clicksTotal / views : 0,
            uniqueVisitors: null,
            uniqueVisitorsIsApprox: true,
        },
        today: {
            day: todayKey,
            views: Number(todayDoc?.views) || 0,
            clicksTotal: Number(todayDoc?.clicksTotal) || 0,
            uniqueVisitors: null,
        },
        series,
        compare: null,
    };

    const last7 = series.slice(-7);
    const prev7 = series.slice(-14, -7);
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

    return res.json(payload);
}

export async function getAdminAnalyticsSources(req, res) {
    const rangeDays = parseRange(req, { fallback: 7, allowed: [7, 30] });
    const days = dayKeysBack(rangeDays);

    const totalsRows = await CardAnalyticsDaily.aggregate([
        { $match: { day: { $in: days } } },
        {
            $group: {
                _id: null,
                viewsTotal: { $sum: "$views" },
                clicksTotal: { $sum: "$clicksTotal" },
            },
        },
    ]);

    const totals = totalsRows?.[0] || {};
    const viewsTotal = Number(totals?.viewsTotal) || 0;
    const clicksTotal = Number(totals?.clicksTotal) || 0;

    const socialViews = await aggregateMapSums({
        days,
        mapField: "socialViewsBySource",
    });
    const socialClicks = await aggregateMapSums({
        days,
        mapField: "socialClicksBySource",
    });

    const socialSources = SOCIAL_SOURCE_BUCKETS.map((source) => {
        const views = Number(socialViews?.[source]) || 0;
        const clicks = Number(socialClicks?.[source]) || 0;
        return {
            source,
            views,
            clicks,
            conversion: views > 0 ? clicks / views : 0,
        };
    })
        .filter((x) => x.views > 0 || x.clicks > 0)
        .sort((a, b) => (b.views || 0) - (a.views || 0));

    // Potentially large key spaces across the whole site: cap response keys.
    const rawUtmSources = await aggregateMapSums({
        days,
        mapField: "utmSourceCounts",
    });
    const rawReferrers = await aggregateMapSums({
        days,
        mapField: "referrerCounts",
    });

    const utmSources = capTopObject(rawUtmSources, {
        maxKeys: 25,
        otherKey: "other_utm_source",
    });

    const referrers = capTopObject(rawReferrers, {
        maxKeys: 25,
        otherKey: "other_referrer",
    });

    const utmSourcesTop = pickTop(utmSources, 10);

    const campaignViews = await aggregateMapSums({
        days,
        mapField: "socialCampaignViews",
    });
    const campaignClicks = await aggregateMapSums({
        days,
        mapField: "socialCampaignClicks",
    });

    const bySource = new Map();
    const ensure = (source) => {
        if (!bySource.has(source)) bySource.set(source, new Map());
        return bySource.get(source);
    };

    for (const [composite, count] of Object.entries(campaignViews)) {
        const parsed = parseCompositeKey(composite);
        if (!parsed) continue;
        const campaigns = ensure(parsed.source);
        const entry = campaigns.get(parsed.campaign) || { views: 0, clicks: 0 };
        entry.views += Number(count) || 0;
        campaigns.set(parsed.campaign, entry);
    }

    for (const [composite, count] of Object.entries(campaignClicks)) {
        const parsed = parseCompositeKey(composite);
        if (!parsed) continue;
        const campaigns = ensure(parsed.source);
        const entry = campaigns.get(parsed.campaign) || { views: 0, clicks: 0 };
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
                                  otherViews > 0 ? otherClicks / otherViews : 0,
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
        utmSourcesTop,
        uniqueVisitorsIsApprox: true,
    });
}
