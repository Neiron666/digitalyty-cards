import { useEffect, useMemo, useState } from "react";
import {
    getAdminSiteAnalyticsSources,
    getAdminSiteAnalyticsSummary,
} from "../../services/admin.service";
import styles from "./AdminAnalyticsView.module.css";

const RANGE_OPTIONS = [7, 30, 90];
const OPT_OUT_KEY = "siteAnalyticsOptOut";

function readOptOut() {
    try {
        if (typeof window === "undefined") return false;
        return window.localStorage?.getItem(OPT_OUT_KEY) === "1";
    } catch {
        return false;
    }
}

function writeOptOut(nextValue) {
    try {
        if (typeof window === "undefined") return;
        window.localStorage?.setItem(OPT_OUT_KEY, nextValue ? "1" : "0");
    } catch {
        // ignore
    }
}

export default function AdminAnalyticsView({ refreshKey = 0 } = {}) {
    const [rangeDays, setRangeDays] = useState(7);
    const [optOut, setOptOut] = useState(() => readOptOut());

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [summary, setSummary] = useState(null);
    const [sources, setSources] = useState(null);

    const rangeLabel = useMemo(() => {
        if (rangeDays === 7) return "7 ימים";
        if (rangeDays === 30) return "30 ימים";
        if (rangeDays === 90) return "90 ימים";
        return `${rangeDays} ימים`;
    }, [rangeDays]);

    useEffect(() => {
        let alive = true;
        async function run() {
            setLoading(true);
            setError("");
            try {
                const [s1, s2] = await Promise.all([
                    getAdminSiteAnalyticsSummary({ range: rangeDays }),
                    getAdminSiteAnalyticsSources({ range: rangeDays }),
                ]);
                if (!alive) return;
                setSummary(s1?.data || null);
                setSources(s2?.data || null);
            } catch (e) {
                if (!alive) return;
                const msg =
                    typeof e?.response?.data?.message === "string"
                        ? e.response.data.message
                        : "Failed to load analytics";
                setError(msg);
                setSummary(null);
                setSources(null);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }
        run();
        return () => {
            alive = false;
        };
    }, [rangeDays, refreshKey]);

    const kpi = summary?.kpi || null;
    const today = summary?.today || null;

    const channelsObj =
        sources?.channels && typeof sources.channels === "object"
            ? sources.channels
            : {};
    const channelsRows = useMemo(() => {
        return Object.entries(channelsObj)
            .map(([key, value]) => ({ key, count: Number(value) || 0 }))
            .filter((x) => x.key && x.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [channelsObj]);

    const referrersTop = Array.isArray(sources?.referrersTop)
        ? sources.referrersTop
        : [];
    const utmTop = Array.isArray(sources?.utmSourcesTop)
        ? sources.utmSourcesTop
        : [];
    const campaignsTop = Array.isArray(sources?.campaignsTop)
        ? sources.campaignsTop
        : [];
    const aiSourcesTop = Array.isArray(sources?.aiSourcesTop)
        ? sources.aiSourcesTop
        : [];
    const topPages = Array.isArray(sources?.topPages) ? sources.topPages : [];
    const topActions = Array.isArray(sources?.topActions)
        ? sources.topActions
        : [];

    const formatPct = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return "—";
        return `${Math.round(n * 1000) / 10}%`;
    };

    const onToggleOptOut = () => {
        setOptOut((prev) => {
            const next = !prev;
            writeOptOut(next);
            return next;
        });
    };

    return (
        <section
            className={styles.root}
            dir="rtl"
            aria-label="אנליטיקת אתר (שיווק)"
        >
            <header className={styles.header}>
                <div className={styles.titleWrap}>
                    <h2 className={styles.title}>אנליטיקת אתר (שיווק)</h2>
                    <p className={styles.subtitle}>
                        כולל את כל הדפים הציבוריים (Marketing) · לא כולל
                        /card/:slug · לא כולל admin/auth/internal
                    </p>
                </div>

                <div className={styles.controls}>
                    <div
                        className={styles.rangeTabs}
                        role="tablist"
                        aria-label="Range"
                    >
                        {RANGE_OPTIONS.map((d) => (
                            <button
                                key={d}
                                type="button"
                                className={`${styles.tab} ${
                                    rangeDays === d ? styles.tabActive : ""
                                }`}
                                role="tab"
                                aria-selected={rangeDays === d}
                                onClick={() => setRangeDays(d)}
                            >
                                {d}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className={`${styles.optOutBtn} ${
                            optOut ? styles.optOutBtnActive : ""
                        }`}
                        aria-pressed={optOut}
                        onClick={onToggleOptOut}
                    >
                        אל תעקוב אחרי הביקורים שלי
                    </button>
                </div>
            </header>

            <p className={styles.optOutHint}>
                {optOut
                    ? "Opt-out פעיל: הטרקר לא ישלח אירועים מהמכשיר הזה."
                    : "Opt-out כבוי: הטרקר ישלח אירועי צפייה בדפים ציבוריים."}
            </p>

            {loading ? (
                <p className={styles.muted}>טוען…</p>
            ) : error ? (
                <p className={styles.errorText}>{error}</p>
            ) : !summary || !sources ? (
                <p className={styles.muted}>מצב {rangeLabel}: אין נתונים.</p>
            ) : null}

            <div className={styles.blocks}>
                <div className={styles.block}>
                    <div className={styles.blockTitle}>KPIs</div>
                    <div className={styles.kpis}>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>צפיות</div>
                            <div className={styles.kpiValue}>
                                {typeof kpi?.views === "number"
                                    ? kpi.views
                                    : "—"}
                            </div>
                        </div>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>קליקים</div>
                            <div className={styles.kpiValue}>
                                {typeof kpi?.clicksTotal === "number"
                                    ? kpi.clicksTotal
                                    : "—"}
                            </div>
                        </div>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>יחס המרה</div>
                            <div className={styles.kpiValue}>
                                {typeof kpi?.conversion === "number"
                                    ? formatPct(kpi.conversion)
                                    : "—"}
                            </div>
                        </div>
                    </div>
                    {today ? (
                        <p className={styles.muted}>
                            היום: צפיות {Number(today.views) || 0} · קליקים{" "}
                            {Number(today.clicksTotal) || 0}
                        </p>
                    ) : null}
                </div>

                <div className={styles.block}>
                    <div className={styles.blockTitle}>מקורות</div>
                    <div className={styles.sourcesGrid}>
                        <div className={styles.sourceCard}>
                            <div className={styles.sourceTitle}>Channels</div>
                            {channelsRows.length ? (
                                <div className={styles.rows}>
                                    {channelsRows.map((r) => (
                                        <div key={r.key} className={styles.row}>
                                            <span className={styles.rowKey}>
                                                {r.key}
                                            </span>
                                            <span className={styles.rowVal}>
                                                {r.count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.muted}>—</p>
                            )}
                        </div>

                        <div className={styles.sourceCard}>
                            <div className={styles.sourceTitle}>Referrers</div>
                            {referrersTop.length ? (
                                <div className={styles.rows}>
                                    {referrersTop.map((r) => (
                                        <div
                                            key={r.referrer}
                                            className={styles.row}
                                        >
                                            <span className={styles.rowKey}>
                                                {r.referrer}
                                            </span>
                                            <span className={styles.rowVal}>
                                                {Number(r.count) || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.muted}>—</p>
                            )}
                        </div>

                        <div className={styles.sourceCard}>
                            <div className={styles.sourceTitle}>UTM</div>
                            {utmTop.length ? (
                                <div className={styles.rows}>
                                    {utmTop.map((r) => (
                                        <div
                                            key={r.source}
                                            className={styles.row}
                                        >
                                            <span className={styles.rowKey}>
                                                {r.source}
                                            </span>
                                            <span className={styles.rowVal}>
                                                {Number(r.count) || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.muted}>—</p>
                            )}
                        </div>

                        <div className={styles.sourceCard}>
                            <div className={styles.sourceTitle}>AI Sources</div>
                            {aiSourcesTop.length ? (
                                <div className={styles.rows}>
                                    {aiSourcesTop.map((r) => (
                                        <div
                                            key={r.source}
                                            className={styles.row}
                                        >
                                            <span className={styles.rowKey}>
                                                {r.source}
                                            </span>
                                            <span className={styles.rowVal}>
                                                {Number(r.count) || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.muted}>—</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.block}>
                    <div className={styles.blockTitle}>פופולרי</div>
                    <div className={styles.campaignsGrid}>
                        <div className={styles.campaignCard}>
                            <div className={styles.campaignTitle}>
                                Top Pages
                            </div>
                            {topPages.length ? (
                                <div className={styles.rows}>
                                    {topPages.slice(0, 10).map((p) => (
                                        <div
                                            key={p.pagePath}
                                            className={styles.row}
                                        >
                                            <span className={styles.rowKey}>
                                                {p.pagePath}
                                            </span>
                                            <span className={styles.rowVal}>
                                                {Number(p.count) || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.muted}>—</p>
                            )}
                        </div>

                        <div className={styles.campaignCard}>
                            <div className={styles.campaignTitle}>
                                Top Actions
                            </div>
                            {topActions.length ? (
                                <div className={styles.rows}>
                                    {topActions.slice(0, 10).map((a) => (
                                        <div
                                            key={a.action}
                                            className={styles.row}
                                        >
                                            <span className={styles.rowKey}>
                                                {a.action}
                                            </span>
                                            <span className={styles.rowVal}>
                                                {Number(a.count) || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.muted}>—</p>
                            )}
                        </div>

                        <div className={styles.campaignCard}>
                            <div className={styles.campaignTitle}>
                                Campaigns (UTM)
                            </div>
                            {campaignsTop.length ? (
                                <div className={styles.rows}>
                                    {campaignsTop.slice(0, 10).map((c) => (
                                        <div
                                            key={c.campaign}
                                            className={styles.row}
                                        >
                                            <span className={styles.rowKey}>
                                                {c.campaign}
                                            </span>
                                            <span className={styles.rowVal}>
                                                {Number(c.count) || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.muted}>—</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
