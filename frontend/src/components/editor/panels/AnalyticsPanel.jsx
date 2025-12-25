import { useEffect, useMemo, useState } from "react";

import api from "../../../services/api";
import Panel from "./Panel";
import Button from "../../ui/Button";

import styles from "./AnalyticsPanel.module.css";

const SECTION_COPY = {
    platforms: {
        title: "מאיפה הגיעו מבקרים",
        subtitle: "מאילו פלטפורמות הגיעו המבקרים",
        tooltip: "מקור כללי של התנועה (אינסטגרם, פייסבוק, גוגל)",
    },
    campaigns: {
        title: "קמפיינים ופרסומות",
        subtitle: "ביצועי פרסומות לפי פלטפורמה",
        tooltip: "קמפיינים כפי שנמדדו דרך תגיות UTM",
    },
    transitions: {
        title: "איך הם הגיעו",
        subtitle: "כניסה ישירה או דרך הפניה",
        tooltip: "אופן ההגעה לעמוד",
    },
};

function SectionHeader({ title, subtitle, tooltip }) {
    return (
        <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
                <div className={styles.sectionTitle}>{title}</div>
                {tooltip ? (
                    <span
                        className={styles.tooltip}
                        tabIndex={0}
                        role="button"
                        aria-label={tooltip}
                    >
                        i<span className={styles.tooltipText}>{tooltip}</span>
                    </span>
                ) : null}
            </div>
            {subtitle ? (
                <div className={styles.sectionSubtitle}>{subtitle}</div>
            ) : null}
        </div>
    );
}

function formatInt(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat().format(Math.round(n));
}

function formatPct(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `${(n * 100).toFixed(1)}%`;
}

function sumSeries(series, field) {
    return (series || []).reduce((s, x) => s + (Number(x?.[field]) || 0), 0);
}

function buildLinePoints(series, field, { width, height, padding }) {
    const data = (series || []).map((x) => Number(x?.[field]) || 0);
    if (!data.length) return "";

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);

    const dx = (width - 2 * padding) / Math.max(1, data.length - 1);
    const scaleY = (v) => {
        const t = (v - min) / Math.max(1e-9, max - min);
        return height - padding - t * (height - 2 * padding);
    };

    return data
        .map((v, i) => {
            const x = padding + i * dx;
            const y = scaleY(v);
            return `${x},${y}`;
        })
        .join(" ");
}

function toRows(obj, { limit = 10 } = {}) {
    return Object.entries(obj || {})
        .map(([k, v]) => ({ key: k, count: Number(v) || 0 }))
        .filter((x) => x.key && x.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

function sortCampaignRows(rows) {
    const list = Array.isArray(rows) ? rows.slice() : [];
    list.sort((a, b) => {
        const ac = Number(a?.clicks) || 0;
        const bc = Number(b?.clicks) || 0;
        if (bc !== ac) return bc - ac;
        const av = Number(a?.views) || 0;
        const bv = Number(b?.views) || 0;
        return bv - av;
    });
    return list;
}

export default function AnalyticsPanel({ card }) {
    const analyticsLevel = card?.entitlements?.analyticsLevel || "none";
    const canViewAnalytics = Boolean(card?.entitlements?.canViewAnalytics);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [summary, setSummary] = useState(null);
    const [sources, setSources] = useState(null);

    const [showNoClickSources, setShowNoClickSources] = useState(false);
    const [expandedPlatforms, setExpandedPlatforms] = useState({});

    const rangeDays = useMemo(() => {
        if (analyticsLevel === "basic") return 7;
        if (analyticsLevel === "premium") return 30;
        if (analyticsLevel === "demo") return 30;
        return 7;
    }, [analyticsLevel]);

    async function load() {
        if (!card?._id || !canViewAnalytics) return;

        setLoading(true);
        setError("");

        try {
            const [s, so] = await Promise.all([
                api.get(`/analytics/summary/${card._id}?range=${rangeDays}`),
                api.get(`/analytics/sources/${card._id}?range=${rangeDays}`),
            ]);
            setSummary(s?.data || null);
            setSources(so?.data || null);
        } catch (err) {
            console.error(
                "analytics load failed",
                err?.response?.status,
                err?.response?.data || err
            );
            setError("שגיאה בטעינת אנליטיקה");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [card?._id, analyticsLevel, rangeDays, canViewAnalytics]);

    if (!canViewAnalytics || analyticsLevel === "none") {
        return (
            <Panel title="Analytics">
                <div className={styles.mutedText}>
                    Analytics זמינה למנויים בלבד.
                </div>
            </Panel>
        );
    }

    const series = summary?.series || [];

    const views30 = sumSeries(series, "views");
    const clicks30 = sumSeries(series, "clicksTotal");

    const last7 = series.slice(-7);
    const views7 = sumSeries(last7, "views");
    const clicks7 = sumSeries(last7, "clicksTotal");

    const today = summary?.today || null;
    const uniqueToday = today?.uniqueVisitors;

    const conversion30 = views30 > 0 ? clicks30 / views30 : 0;

    const chartWidth = 800;
    const chartHeight = 140;
    const padding = 10;

    const viewPoints = buildLinePoints(series, "views", {
        width: chartWidth,
        height: chartHeight,
        padding,
    });

    const clickPoints = buildLinePoints(series, "clicksTotal", {
        width: chartWidth,
        height: chartHeight,
        padding,
    });

    const isPremiumLike =
        analyticsLevel === "premium" || analyticsLevel === "demo";

    const platformRows = useMemo(() => {
        const raw = Array.isArray(sources?.socialSources)
            ? sources.socialSources
            : [];
        const rows = raw
            .map((r) => {
                const source = String(r?.source || "").trim();
                const views = Number(r?.views) || 0;
                const clicks =
                    r?.clicks === null || r?.clicks === undefined
                        ? null
                        : Number(r?.clicks) || 0;
                return {
                    source,
                    views,
                    clicks,
                    conversion:
                        r?.conversion === null || r?.conversion === undefined
                            ? null
                            : Number(r?.conversion) || 0,
                };
            })
            .filter((r) => r.source && (r.views > 0 || (r.clicks || 0) > 0));

        rows.sort((a, b) => {
            if (isPremiumLike) {
                const ac = Number(a?.clicks) || 0;
                const bc = Number(b?.clicks) || 0;
                if (bc !== ac) return bc - ac;
            }
            return (b.views || 0) - (a.views || 0);
        });

        if (isPremiumLike && !showNoClickSources) {
            return rows.filter((r) => (Number(r?.clicks) || 0) > 0);
        }

        return rows;
    }, [sources, isPremiumLike, showNoClickSources]);

    const transitionRows = useMemo(() => {
        return toRows(sources?.referrers || {}, { limit: 20 });
    }, [sources]);

    const campaignsByPlatform = useMemo(() => {
        const raw = Array.isArray(sources?.socialCampaignSources)
            ? sources.socialCampaignSources
            : [];

        const rows = raw
            .map((p) => {
                const source = String(p?.source || "").trim();
                const views = Number(p?.views) || 0;
                const clicks = Number(p?.clicks) || 0;
                const campaignsRaw = Array.isArray(p?.campaigns)
                    ? p.campaigns
                    : [];
                const campaigns = sortCampaignRows(
                    campaignsRaw
                        .map((c) => ({
                            name: String(c?.name || "").trim(),
                            views: Number(c?.views) || 0,
                            clicks: Number(c?.clicks) || 0,
                        }))
                        .filter((c) => c.name && (c.views > 0 || c.clicks > 0))
                );
                return { source, views, clicks, campaigns };
            })
            .filter((x) => x.source);

        rows.sort((a, b) => {
            const ac = Number(a?.clicks) || 0;
            const bc = Number(b?.clicks) || 0;
            if (bc !== ac) return bc - ac;
            const av = Number(a?.views) || 0;
            const bv = Number(b?.views) || 0;
            return bv - av;
        });

        return rows;
    }, [sources]);

    function togglePlatform(source) {
        setExpandedPlatforms((prev) => ({
            ...prev,
            [source]: !prev?.[source],
        }));
    }

    return (
        <Panel title="Analytics">
            <div className={styles.grid}>
                {Boolean(summary?.isDemo) && (
                    <div className={styles.banner}>דוגמה של לקוח פרימיום</div>
                )}

                <div className={styles.headerRow}>
                    <div className={styles.headerTitle}>
                        רמת אנליטיקה: {analyticsLevel}
                    </div>
                    <Button
                        variant="secondary"
                        onClick={load}
                        disabled={loading}
                    >
                        רענון
                    </Button>
                </div>

                {error && <div className={styles.errorText}>{error}</div>}

                {/* Basic: only views last 7 days */}
                {analyticsLevel === "basic" && (
                    <>
                        <div className={styles.kpis}>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiLabel}>
                                    Views (7 ימים)
                                </div>
                                <div className={styles.kpiValue}>
                                    {formatInt(views7)}
                                </div>
                                <div className={styles.small}>
                                    נתונים אמיתיים
                                </div>
                            </div>
                        </div>

                        <div className={styles.chart}>
                            <div className={styles.chartHeader}>
                                Views לפי יום (7 ימים)
                            </div>
                            <svg
                                className={styles.svg}
                                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                preserveAspectRatio="none"
                            >
                                {viewPoints && (
                                    <polyline
                                        points={viewPoints}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        opacity="0.85"
                                    />
                                )}
                            </svg>
                        </div>
                    </>
                )}

                {/* Demo + Premium: full layout */}
                {(analyticsLevel === "demo" ||
                    analyticsLevel === "premium") && (
                    <>
                        <div className={styles.kpis}>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiLabel}>Today</div>
                                <div className={styles.kpiValue}>
                                    {formatInt(today?.views)}
                                </div>
                                <div className={styles.small}>Views</div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiLabel}>Today</div>
                                <div className={styles.kpiValue}>
                                    {analyticsLevel === "premium"
                                        ? formatInt(today?.clicksTotal)
                                        : formatInt(today?.clicksTotal)}
                                </div>
                                <div className={styles.small}>Clicks</div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiLabel}>7 ימים</div>
                                <div className={styles.kpiValue}>
                                    {formatInt(views7)}
                                </div>
                                <div className={styles.small}>Views</div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiLabel}>30 ימים</div>
                                <div className={styles.kpiValue}>
                                    {formatInt(views30)}
                                </div>
                                <div className={styles.small}>Views</div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiLabel}>
                                    Unique (Today)
                                </div>
                                <div className={styles.kpiValue}>
                                    {uniqueToday === null ||
                                    uniqueToday === undefined
                                        ? "—"
                                        : formatInt(uniqueToday)}
                                </div>
                                <div className={styles.small}>
                                    {summary?.kpi?.uniqueVisitorsIsApprox
                                        ? "Approx"
                                        : ""}
                                </div>
                            </div>
                            <div className={styles.kpiCard}>
                                <div className={styles.kpiLabel}>
                                    Conversion (30 ימים)
                                </div>
                                <div className={styles.kpiValue}>
                                    {formatPct(conversion30)}
                                </div>
                                <div className={styles.small}>
                                    Clicks / Views
                                </div>
                            </div>
                        </div>

                        <div className={styles.chart}>
                            <div className={styles.chartHeader}>
                                Activity (Views + Clicks)
                            </div>
                            <svg
                                className={styles.svg}
                                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                preserveAspectRatio="none"
                            >
                                {viewPoints && (
                                    <polyline
                                        points={viewPoints}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        opacity="0.85"
                                    />
                                )}
                                {clickPoints && (
                                    <polyline
                                        points={clickPoints}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        opacity="0.35"
                                        strokeDasharray="6 4"
                                    />
                                )}
                            </svg>
                            <div className={styles.legend}>
                                <span>
                                    <span
                                        className={`${styles.dot} ${styles.dotViews}`}
                                    />{" "}
                                    Views
                                </span>
                                <span>
                                    <span
                                        className={`${styles.dot} ${styles.dotClicks}`}
                                    />{" "}
                                    Clicks
                                </span>
                            </div>
                        </div>

                        <div className={styles.section}>
                            <SectionHeader {...SECTION_COPY.platforms} />
                            {isPremiumLike && (
                                <label className={styles.toggleRow}>
                                    <input
                                        type="checkbox"
                                        checked={showNoClickSources}
                                        onChange={(e) =>
                                            setShowNoClickSources(
                                                e.target.checked
                                            )
                                        }
                                    />
                                    <span>הצג מקורות ללא קליקים</span>
                                </label>
                            )}
                            {platformRows.length ? (
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>פלטפורמה</th>
                                            {isPremiumLike ? (
                                                <th>קליקים</th>
                                            ) : null}
                                            <th>צפיות</th>
                                            {isPremiumLike ? (
                                                <th>המרה</th>
                                            ) : null}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {platformRows.map((r) => {
                                            const clicks =
                                                Number(r?.clicks) || 0;
                                            const isMuted =
                                                isPremiumLike && clicks === 0;
                                            return (
                                                <tr
                                                    key={r.source}
                                                    className={
                                                        isMuted
                                                            ? styles.rowMuted
                                                            : undefined
                                                    }
                                                >
                                                    <td>
                                                        <span
                                                            className={
                                                                styles.rowKey
                                                            }
                                                        >
                                                            {r.source}
                                                        </span>
                                                        {isMuted ? (
                                                            <span
                                                                className={
                                                                    styles.inlineTooltip
                                                                }
                                                                tabIndex={0}
                                                                role="button"
                                                                aria-label="עדיין ללא קליקים"
                                                            >
                                                                i
                                                                <span
                                                                    className={
                                                                        styles.tooltipText
                                                                    }
                                                                >
                                                                    עדיין ללא
                                                                    קליקים
                                                                </span>
                                                            </span>
                                                        ) : null}
                                                    </td>
                                                    {isPremiumLike ? (
                                                        <td>
                                                            {formatInt(
                                                                r.clicks
                                                            )}
                                                        </td>
                                                    ) : null}
                                                    <td>
                                                        {formatInt(r.views)}
                                                    </td>
                                                    {isPremiumLike ? (
                                                        <td>
                                                            {r.conversion ===
                                                            null
                                                                ? "—"
                                                                : formatPct(
                                                                      r.conversion
                                                                  )}
                                                        </td>
                                                    ) : null}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className={styles.small}>
                                    אין נתונים עדיין
                                </div>
                            )}
                        </div>

                        <div className={styles.divider} />

                        {isPremiumLike ? (
                            <div className={styles.section}>
                                <SectionHeader {...SECTION_COPY.campaigns} />
                                {campaignsByPlatform.length ? (
                                    <div className={styles.accordion}>
                                        {campaignsByPlatform.map((p) => {
                                            const expanded = Boolean(
                                                expandedPlatforms?.[p.source]
                                            );
                                            return (
                                                <div
                                                    key={p.source}
                                                    className={
                                                        styles.accordionItem
                                                    }
                                                >
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.accordionHeader
                                                        }
                                                        onClick={() =>
                                                            togglePlatform(
                                                                p.source
                                                            )
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.accordionTitle
                                                            }
                                                        >
                                                            {p.source}
                                                        </span>
                                                        <span
                                                            className={
                                                                styles.badges
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.badge
                                                                }
                                                            >
                                                                {formatInt(
                                                                    p.clicks
                                                                )}{" "}
                                                                clicks
                                                            </span>
                                                            <span
                                                                className={
                                                                    styles.badge
                                                                }
                                                            >
                                                                {formatInt(
                                                                    p.views
                                                                )}{" "}
                                                                views
                                                            </span>
                                                            <span
                                                                className={
                                                                    styles.chevron
                                                                }
                                                                aria-hidden="true"
                                                            >
                                                                {expanded
                                                                    ? "▾"
                                                                    : "▸"}
                                                            </span>
                                                        </span>
                                                    </button>
                                                    {expanded ? (
                                                        <div
                                                            className={
                                                                styles.accordionContent
                                                            }
                                                        >
                                                            {p.campaigns
                                                                .length ? (
                                                                <table
                                                                    className={
                                                                        styles.table
                                                                    }
                                                                >
                                                                    <thead>
                                                                        <tr>
                                                                            <th>
                                                                                קמפיין
                                                                            </th>
                                                                            <th>
                                                                                קליקים
                                                                            </th>
                                                                            <th>
                                                                                צפיות
                                                                            </th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {p.campaigns.map(
                                                                            (
                                                                                c
                                                                            ) => (
                                                                                <tr
                                                                                    key={`${p.source}__${c.name}`}
                                                                                    className={
                                                                                        styles.campaignRow
                                                                                    }
                                                                                >
                                                                                    <td>
                                                                                        {
                                                                                            c.name
                                                                                        }
                                                                                    </td>
                                                                                    <td>
                                                                                        {formatInt(
                                                                                            c.clicks
                                                                                        )}
                                                                                    </td>
                                                                                    <td>
                                                                                        {formatInt(
                                                                                            c.views
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            )
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                <div
                                                                    className={
                                                                        styles.small
                                                                    }
                                                                >
                                                                    אין נתוני
                                                                    קמפיינים
                                                                    לפלטפורמה זו
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={styles.small}>
                                        אין נתונים עדיין
                                    </div>
                                )}
                            </div>
                        ) : null}

                        <div className={styles.divider} />

                        <div className={styles.section}>
                            <SectionHeader {...SECTION_COPY.transitions} />
                            {transitionRows.length ? (
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>מקור</th>
                                            <th>צפיות</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transitionRows.map((r) => (
                                            <tr key={r.key}>
                                                <td>{r.key}</td>
                                                <td>{formatInt(r.count)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className={styles.small}>
                                    אין נתונים עדיין
                                </div>
                            )}
                        </div>

                        {analyticsLevel === "premium" && summary?.compare && (
                            <div>
                                <div className={styles.sectionTitlePlain}>
                                    Comparison
                                </div>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Period</th>
                                            <th>Views</th>
                                            <th>Clicks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Last 7</td>
                                            <td>
                                                {formatInt(
                                                    summary?.compare?.last7
                                                        ?.views
                                                )}
                                            </td>
                                            <td>
                                                {formatInt(
                                                    summary?.compare?.last7
                                                        ?.clicksTotal
                                                )}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Prev 7</td>
                                            <td>
                                                {formatInt(
                                                    summary?.compare?.prev7
                                                        ?.views
                                                )}
                                            </td>
                                            <td>
                                                {formatInt(
                                                    summary?.compare?.prev7
                                                        ?.clicksTotal
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {loading && <div className={styles.loadingText}>טוען…</div>}
            </div>
        </Panel>
    );
}
