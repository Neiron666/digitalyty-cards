import SiteAnalyticsDaily from "../models/SiteAnalyticsDaily.model.js";
import { SITE_CHANNELS } from "../utils/siteAnalyticsSource.util.js";

const RANGE_ALLOWLIST = new Set([7, 30, 90]);

function utcDayKey(now = new Date()) {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function addUtcDays(date, days) {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

function parseRangeDays(value) {
    const n = Number.parseInt(String(value ?? ""), 10);
    if (RANGE_ALLOWLIST.has(n)) return n;
    return 30;
}

function safePageKey(pagePath) {
    const v = String(pagePath || "").trim();
    if (!v) return "";
    const cleaned = v.replace(/[^a-zA-Z0-9_\-/]/g, "_");
    if (cleaned.includes(".") || cleaned.includes("$")) return "";
    return cleaned.slice(0, 80);
}

function toPlainObjectMap(maybeMap) {
    if (!maybeMap) return {};
    if (maybeMap instanceof Map) return Object.fromEntries(maybeMap.entries());
    if (typeof maybeMap === "object") return maybeMap;
    return {};
}

function sumInto(target, source) {
    const src = toPlainObjectMap(source);
    for (const [key, value] of Object.entries(src)) {
        const n = Number(value) || 0;
        if (!n) continue;
        target[key] = (Number(target[key]) || 0) + n;
    }
}

function topN(counts, limit) {
    return Object.entries(counts)
        .map(([key, count]) => ({ key, count: Number(count) || 0 }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

function kpiFromTotals({ views, clicksTotal }) {
    const v = Number(views) || 0;
    const c = Number(clicksTotal) || 0;
    const conversion = v > 0 ? c / v : 0;
    return { views: v, clicksTotal: c, conversion };
}

export async function getAdminSiteAnalyticsSummary(req, res) {
    const rangeDays = parseRangeDays(req.query?.range);
    const siteKey = "main";

    const today = new Date();
    const endDay = utcDayKey(today);
    const startDate = addUtcDays(today, -(rangeDays - 1));
    const startDay = utcDayKey(startDate);

    const docs = await SiteAnalyticsDaily.find({
        siteKey,
        day: { $gte: startDay, $lte: endDay },
    })
        .select("day views clicksTotal")
        .sort({ day: 1 })
        .lean();

    const byDay = new Map();
    let viewsTotal = 0;
    let clicksTotal = 0;

    for (const doc of docs) {
        const day = doc?.day;
        const views = Number(doc?.views) || 0;
        const clicks = Number(doc?.clicksTotal) || 0;
        if (day) byDay.set(day, { views, clicksTotal: clicks });
        viewsTotal += views;
        clicksTotal += clicks;
    }

    const series = [];
    for (let i = 0; i < rangeDays; i += 1) {
        const d = addUtcDays(startDate, i);
        const day = utcDayKey(d);
        const row = byDay.get(day) || { views: 0, clicksTotal: 0 };
        series.push({ day, views: row.views, clicksTotal: row.clicksTotal });
    }

    const todayRow = byDay.get(endDay) || { views: 0, clicksTotal: 0 };

    return res.json({
        rangeDays,
        kpi: kpiFromTotals({ views: viewsTotal, clicksTotal }),
        today: kpiFromTotals(todayRow),
        series,
    });
}

export async function getAdminSiteAnalyticsSources(req, res) {
    const rangeDays = parseRangeDays(req.query?.range);
    const siteKey = "main";

    const today = new Date();
    const endDay = utcDayKey(today);
    const startDate = addUtcDays(today, -(rangeDays - 1));
    const startDay = utcDayKey(startDate);

    const docs = await SiteAnalyticsDaily.find({
        siteKey,
        day: { $gte: startDay, $lte: endDay },
    })
        .select(
            "channelCounts referrerCounts utmSourceCounts utmCampaignCounts utmMediumCounts pagePathCounts actionCounts pageChannelCounts",
        )
        .lean();

    const channelCounts = {};
    const referrerCounts = {};
    const utmSourceCounts = {};
    const utmCampaignCounts = {};
    const utmMediumCounts = {};
    const pagePathCounts = {};
    const actionCounts = {};
    const pageChannelCounts = {};

    for (const doc of docs) {
        sumInto(channelCounts, doc?.channelCounts);
        sumInto(referrerCounts, doc?.referrerCounts);
        sumInto(utmSourceCounts, doc?.utmSourceCounts);
        sumInto(utmCampaignCounts, doc?.utmCampaignCounts);
        sumInto(utmMediumCounts, doc?.utmMediumCounts);
        sumInto(pagePathCounts, doc?.pagePathCounts);
        sumInto(actionCounts, doc?.actionCounts);
        sumInto(pageChannelCounts, doc?.pageChannelCounts);
    }

    const channels = Object.fromEntries(SITE_CHANNELS.map((ch) => [ch, 0]));
    for (const ch of SITE_CHANNELS) {
        channels[ch] = Number(channelCounts[ch]) || 0;
    }

    const topPages = topN(pagePathCounts, 10).map((x) => ({
        pagePath: x.key,
        count: x.count,
    }));

    const topActions = topN(actionCounts, 10).map((x) => ({
        action: x.key,
        count: x.count,
    }));

    const referrersTop = topN(referrerCounts, 10).map((x) => ({
        referrer: x.key,
        count: x.count,
    }));

    const utmSourcesTop = topN(utmSourceCounts, 10).map((x) => ({
        source: x.key,
        count: x.count,
    }));

    const campaignsTop = topN(utmCampaignCounts, 10).map((x) => ({
        campaign: x.key,
        count: x.count,
    }));

    // Best-effort AI sources: derive breakdown from utm_source, reconcile with ai channel total.
    const aiFromUtm = topN(utmSourceCounts, 10)
        .filter((x) => x.key && x.key !== "other_utm_source")
        .filter((x) =>
            [
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
            ].includes(String(x.key).toLowerCase()),
        );
    const aiFromUtmSum = aiFromUtm.reduce((acc, x) => acc + x.count, 0);
    const aiTotal = Number(channels.ai) || 0;
    const otherAi = Math.max(aiTotal - aiFromUtmSum, 0);
    const aiSourcesTop = [
        ...aiFromUtm.map((x) => ({ source: x.key, count: x.count })),
        ...(otherAi > 0 ? [{ source: "other_ai", count: otherAi }] : []),
    ].slice(0, 10);

    const topPageKeys = new Map(
        topPages.map((p) => [safePageKey(p.pagePath), p.pagePath]),
    );

    const channelsByTopPages = [];
    for (const [pageKey, pagePath] of topPageKeys.entries()) {
        if (!pageKey) continue;
        const totalsByChannel = Object.fromEntries(
            SITE_CHANNELS.map((ch) => [ch, 0]),
        );

        for (const [compositeKey, countRaw] of Object.entries(
            pageChannelCounts,
        )) {
            if (typeof compositeKey !== "string") continue;
            const idx = compositeKey.lastIndexOf("__");
            if (idx <= 0) continue;

            const kPage = compositeKey.slice(0, idx);
            if (kPage !== pageKey) continue;

            const ch = compositeKey.slice(idx + 2);
            if (!SITE_CHANNELS.includes(ch)) continue;
            totalsByChannel[ch] += Number(countRaw) || 0;
        }

        const total = SITE_CHANNELS.reduce(
            (acc, ch) => acc + (totalsByChannel[ch] || 0),
            0,
        );
        channelsByTopPages.push({ pagePath, totalsByChannel, total });
    }

    channelsByTopPages.sort((a, b) => b.total - a.total);

    return res.json({
        rangeDays,
        channels,
        referrersTop,
        utmSourcesTop,
        campaignsTop,
        aiSourcesTop,
        topPages,
        topActions,
        channelsByTopPages,
    });
}
