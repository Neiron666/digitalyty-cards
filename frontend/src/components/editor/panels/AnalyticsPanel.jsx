import { useEffect, useMemo, useState } from "react";

import api from "../../../services/api";
import Panel from "./Panel";
import Button from "../../ui/Button";

import styles from "./AnalyticsPanel.module.css";

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

export default function AnalyticsPanel({ card }) {
    const analyticsLevel = card?.entitlements?.analyticsLevel || "none";
    const canViewAnalytics = Boolean(card?.entitlements?.canViewAnalytics);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [summary, setSummary] = useState(null);
    const [actions, setActions] = useState(null);
    const [sources, setSources] = useState(null);
    const [campaigns, setCampaigns] = useState(null);

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
            const s = await api.get(
                `/analytics/summary/${card._id}?range=${rangeDays}`
            );
            setSummary(s?.data || null);

            if (analyticsLevel === "premium") {
                const [a, so, c] = await Promise.all([
                    api.get(
                        `/analytics/actions/${card._id}?range=${rangeDays}`
                    ),
                    api.get(
                        `/analytics/sources/${card._id}?range=${rangeDays}`
                    ),
                    api.get(
                        `/analytics/campaigns/${card._id}?range=${rangeDays}`
                    ),
                ]);
                setActions(a?.data || null);
                setSources(so?.data || null);
                setCampaigns(c?.data || null);
            } else {
                setActions(null);
                setSources(null);
                setCampaigns(null);
            }
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
                <div style={{ opacity: 0.85 }}>
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

    const actionRows = toRows(actions?.actions || summary?.actions || {}, {
        limit: 12,
    });

    const utmSourcesTop =
        sources?.utmSourcesTop ||
        toRows(sources?.utmSources || {}, { limit: 10 });
    const refTop = toRows(sources?.referrers || {}, { limit: 10 });

    const campaignsTop =
        campaigns?.campaignsTop || summary?.campaigns?.top || [];

    return (
        <Panel title="Analytics">
            <div className={styles.grid}>
                {Boolean(summary?.isDemo) && (
                    <div className={styles.banner}>דוגמה של לקוח פרימיום</div>
                )}

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ fontWeight: 800 }}>
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

                {error && (
                    <div style={{ color: "var(--danger, inherit)" }}>
                        {error}
                    </div>
                )}

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
                                        className={styles.dot}
                                        style={{ opacity: 0.85 }}
                                    />{" "}
                                    Views
                                </span>
                                <span>
                                    <span
                                        className={styles.dot}
                                        style={{ opacity: 0.35 }}
                                    />{" "}
                                    Clicks
                                </span>
                            </div>
                        </div>

                        <div>
                            <div style={{ fontWeight: 800, marginBottom: 8 }}>
                                Actions
                            </div>
                            {actionRows.length ? (
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Action</th>
                                            <th>Clicks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {actionRows.map((r) => (
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

                        <div>
                            <div style={{ fontWeight: 800, marginBottom: 8 }}>
                                Sources (UTM)
                            </div>
                            {utmSourcesTop?.length ? (
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Source</th>
                                            <th>Views</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {utmSourcesTop.map((r) => (
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

                        <div>
                            <div style={{ fontWeight: 800, marginBottom: 8 }}>
                                Referrers
                            </div>
                            {refTop?.length ? (
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Referrer</th>
                                            <th>Views</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {refTop.map((r) => (
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

                        <div>
                            <div style={{ fontWeight: 800, marginBottom: 8 }}>
                                Campaigns
                            </div>
                            {Array.isArray(campaignsTop) &&
                            campaignsTop.length ? (
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Campaign</th>
                                            <th>Views</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campaignsTop.map((r) => (
                                            <tr
                                                key={
                                                    r.key ||
                                                    r.campaign ||
                                                    JSON.stringify(r)
                                                }
                                            >
                                                <td>{r.key || r.campaign}</td>
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
                                <div
                                    style={{ fontWeight: 800, marginBottom: 8 }}
                                >
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

                {loading && <div style={{ opacity: 0.8 }}>טוען…</div>}
            </div>
        </Panel>
    );
}
