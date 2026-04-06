import { useEffect, useMemo, useState } from "react";
import {
    getAdminSiteAnalyticsSources,
    getAdminSiteAnalyticsSummary,
    getAdminSiteAnalyticsVisits,
} from "../../services/admin.service";
import styles from "./AdminAnalyticsView.module.css";

const RANGE_OPTIONS = [1, 7, 30, 90];
const OPT_OUT_KEY = "siteAnalyticsOptOut";

/** Hebrew display labels for channel machine keys. */
const CHANNEL_LABELS = {
    direct: "ישיר",
    social: "רשתות חברתיות",
    referral: "הפניה",
    search: "חיפוש",
    email: "אימייל",
    paid: "ממומן",
    ai: "בינה מלאכותית (AI)",
    other: "אחר",
};

/** Human-readable labels for normalized source keys returned by sourceTop. */
const SOURCE_LABELS = {
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    x: "X",
    linkedin: "LinkedIn",
    youtube: "YouTube",
    google: "Google",
    bing: "Bing",
    duckduckgo: "DuckDuckGo",
    yahoo: "Yahoo",
    direct: "ישיר",
    ai: "בינה מלאכותית",
    other_source: "מקור אחר",
};

function sourceLabel(key) {
    const k = String(key || "");
    if (SOURCE_LABELS[k]) return SOURCE_LABELS[k];
    if (k.startsWith("ext_")) return k.slice(4);
    if (k.startsWith("utm_")) return `UTM: ${k.slice(4)}`;
    return k;
}

/** Local human-readable Hebrew labels for analytics action keys. */
const ACTION_LABELS = {
    home_hero_primary_register: "לחיצה על הכפתור הראשי בכותרת הבית",
    home_hero_secondary_examples: "לחיצה על כפתור הדוגמאות בכותרת הבית",
    home_templates_cta: "לחיצה על בחירת תבנית בעמוד הבית",
    home_bottom_cta: "לחיצה על הכפתור התחתון בעמוד הבית",
    pricing_trial_start: "לחיצה על התחלת ניסיון בעמוד המחירים",
    pricing_premium_upgrade: "לחיצה על שדרוג לפרימיום",
    pricing_monthly_start: "לחיצה על בחירת מסלול חודשי",
    pricing_annual_start: "לחיצה על בחירת מסלול שנתי",
    contact_email_click: "לחיצה על קישור אימייל",
    contact_form_submit: "שליחת טופס יצירת קשר",
    contact_whatsapp_click: "לחיצה על קישור WhatsApp",
    cards_hero_cta: "לחיצה על הכפתור הראשי בכותרת עמוד הדוגמאות",
    cards_templates_cta: "לחיצה על בחירת תבנית בעמוד הדוגמאות",
    cards_showcase_card_cta: "לחיצה על התחלה מכרטיס תבנית",
    cards_showcase_view_all_cta: "לחיצה על צפייה בכל התבניות",
    cards_bottom_cta: "לחיצה על הכפתור התחתון בעמוד הדוגמאות",
};

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
    const [visits, setVisits] = useState(null);

    const rangeLabel = useMemo(() => {
        if (rangeDays === 1) return "היום (UTC)";
        if (rangeDays === 7) return "7 ימים";
        if (rangeDays === 30) return "30 ימים";
        if (rangeDays === 90) return "90 ימים";
        return `${rangeDays} ימים`;
    }, [rangeDays]);

    useEffect(() => {
        let alive = true;

        // Primary path: summary + sources. Failure here surfaces a page-level error.
        async function runBase() {
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
                        : "לא הצלחנו לטעון את נתוני האנליטיקה";
                setError(msg);
                setSummary(null);
                setSources(null);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        // Secondary path: visit intelligence. Failure is isolated - only the
        // visits block degrades; summary/sources are unaffected.
        async function runVisits() {
            try {
                const s3 = await getAdminSiteAnalyticsVisits({
                    range: rangeDays,
                });
                if (!alive) return;
                setVisits(s3?.data || null);
            } catch {
                if (!alive) return;
                setVisits(null);
            }
        }

        runBase();
        runVisits();

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
    const sourceTopRows = Array.isArray(sources?.sourceTop)
        ? sources.sourceTop
        : [];
    const topPages = Array.isArray(sources?.topPages) ? sources.topPages : [];
    const topActions = Array.isArray(sources?.topActions)
        ? sources.topActions
        : [];

    // Visit intelligence (C4/C5) - derived from /admin/site-analytics/visits
    const totalUniqueVisitors =
        typeof visits?.totalUniqueVisitors === "number"
            ? visits.totalUniqueVisitors
            : null;
    const topActionsBySource =
        visits?.topActionsBySource &&
        typeof visits.topActionsBySource === "object" &&
        !Array.isArray(visits.topActionsBySource)
            ? visits.topActionsBySource
            : {};
    const topLandingsBySource =
        visits?.topLandingsBySource &&
        typeof visits.topLandingsBySource === "object" &&
        !Array.isArray(visits.topLandingsBySource)
            ? visits.topLandingsBySource
            : {};
    const visitSourceRows = useMemo(() => {
        const vbs = Array.isArray(visits?.visitsBySource)
            ? visits.visitsBySource
            : [];
        const ubs = Array.isArray(visits?.uniquesBySource)
            ? visits.uniquesBySource
            : [];
        const uniquesMap = {};
        for (const r of ubs) {
            uniquesMap[r.source] = r.uniqueVisitors;
        }
        return vbs.map((r) => ({
            source: r.source,
            visits: r.visits,
            uniqueVisitors:
                uniquesMap[r.source] !== undefined
                    ? uniquesMap[r.source]
                    : null,
        }));
    }, [visits]);

    const formatPct = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return "-";
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
                        מציג נתונים מכל הדפים הציבוריים השיווקיים · לא כולל דפי
                        כרטיסים, ניהול, הרשמה ואימות
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
                                {d === 1 ? "היום (UTC)" : d}
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
                    ? "איסוף נתונים מושבת: הביקורים שלך מהמכשיר הזה לא נספרים."
                    : "איסוף נתונים פעיל: הביקורים שלך בדפים הציבוריים נספרים."}
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
                    <div className={styles.blockTitle}>מדדי מפתח</div>
                    <div className={styles.kpis}>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>צפיות</div>
                            <div className={styles.kpiValue}>
                                {typeof kpi?.views === "number"
                                    ? kpi.views
                                    : "-"}
                            </div>
                        </div>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>קליקים</div>
                            <div className={styles.kpiValue}>
                                {typeof kpi?.clicksTotal === "number"
                                    ? kpi.clicksTotal
                                    : "-"}
                            </div>
                        </div>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>יחס המרה</div>
                            <div className={styles.kpiValue}>
                                {typeof kpi?.conversion === "number"
                                    ? formatPct(kpi.conversion)
                                    : "-"}
                            </div>
                        </div>
                    </div>
                    {today && rangeDays !== 1 ? (
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
                            <div className={styles.sourceTitle}>
                                ערוצי תנועה
                            </div>
                            {channelsRows.length ? (
                                <div className={styles.rows}>
                                    {channelsRows.map((r) => (
                                        <div key={r.key} className={styles.row}>
                                            <span className={styles.rowKey}>
                                                {CHANNEL_LABELS[r.key] || r.key}
                                            </span>
                                            <span className={styles.rowVal}>
                                                {r.count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.muted}>-</p>
                            )}
                        </div>

                        <div className={styles.sourceCard}>
                            <div className={styles.sourceTitle}>
                                מקורות מנורמלים
                            </div>
                            {sourceTopRows.length ? (
                                <div className={styles.rows}>
                                    {sourceTopRows.map((r) => (
                                        <div
                                            key={r.source}
                                            className={styles.row}
                                        >
                                            <span className={styles.rowKey}>
                                                {sourceLabel(r.source)}
                                            </span>
                                            <span className={styles.rowVal}>
                                                {Number(r.count) || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.muted}>-</p>
                            )}
                        </div>

                        <div className={styles.sourceCard}>
                            <div className={styles.sourceTitle}>
                                מקורות הפניה
                            </div>
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
                                <p className={styles.muted}>-</p>
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
                                <p className={styles.muted}>-</p>
                            )}
                        </div>

                        <div className={styles.sourceCard}>
                            <div className={styles.sourceTitle}>
                                מקורות בינה מלאכותית
                            </div>
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
                                <p className={styles.muted}>-</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.block}>
                    <div className={styles.blockTitle}>פופולרי</div>
                    <div className={styles.campaignsGrid}>
                        <div className={styles.campaignCard}>
                            <div className={styles.campaignTitle}>
                                עמודים מובילים
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
                                <p className={styles.muted}>-</p>
                            )}
                        </div>

                        <div className={styles.campaignCard}>
                            <div className={styles.campaignTitle}>
                                פעולות מובילות
                            </div>
                            {topActions.length ? (
                                <div className={styles.rows}>
                                    {topActions.map((a) => (
                                        <div
                                            key={a.action}
                                            className={styles.row}
                                        >
                                            <span className={styles.rowKey}>
                                                {ACTION_LABELS[a.action] ||
                                                    a.action}
                                            </span>
                                            <span className={styles.rowVal}>
                                                {Number(a.count) || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.muted}>-</p>
                            )}
                        </div>

                        <div className={styles.campaignCard}>
                            <div className={styles.campaignTitle}>
                                קמפיינים (UTM)
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
                                <p className={styles.muted}>-</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.block}>
                    <div className={styles.blockTitle}>ביקורים לפי מקור</div>

                    <div className={styles.kpis}>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>
                                מבקרים (בקירוב)
                            </div>
                            <div className={styles.kpiValue}>
                                {totalUniqueVisitors !== null
                                    ? totalUniqueVisitors
                                    : "-"}
                            </div>
                            <p className={styles.visitApproxNote}>
                                כפיל דפדפן בלבד · לא מייצג אנשים · ביקורים
                                ממקורות שונים עשויים לחפוף
                            </p>
                        </div>
                    </div>

                    {visitSourceRows.length > 0 ? (
                        <div>
                            <div className={styles.visitTableHead}>
                                <span className={styles.visitCellSource}>
                                    מקור
                                </span>
                                <span className={styles.visitCellNum}>
                                    ביקורים
                                </span>
                                <span className={styles.visitCellNum}>
                                    מבקרים ייחודיים (בקירוב)
                                </span>
                            </div>
                            {visitSourceRows.map((r) => (
                                <div
                                    key={r.source}
                                    className={styles.visitTableRow}
                                >
                                    <span className={styles.visitCellSource}>
                                        {sourceLabel(r.source)}
                                    </span>
                                    <span className={styles.visitCellNum}>
                                        {r.visits}
                                    </span>
                                    <span className={styles.visitCellNum}>
                                        {r.uniqueVisitors !== null
                                            ? r.uniqueVisitors
                                            : "-"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : !loading && !error ? (
                        <p className={styles.muted}>
                            אין נתוני ביקורים לתקופה זו.
                        </p>
                    ) : null}

                    {Object.keys(topLandingsBySource).length > 0 && (
                        <div>
                            <p className={styles.visitSubTitle}>
                                עמודי כניסה לפי מקור
                            </p>
                            <div className={styles.sourcesGrid}>
                                {Object.entries(topLandingsBySource).map(
                                    ([src, pages]) => (
                                        <div
                                            key={src}
                                            className={styles.sourceCard}
                                        >
                                            <div className={styles.sourceTitle}>
                                                {sourceLabel(src)}
                                            </div>
                                            <div className={styles.rows}>
                                                {pages.map((p) => (
                                                    <div
                                                        key={p.landingPage}
                                                        className={styles.row}
                                                    >
                                                        <span
                                                            className={
                                                                styles.rowKey
                                                            }
                                                        >
                                                            {p.landingPage}
                                                        </span>
                                                        <span
                                                            className={
                                                                styles.rowVal
                                                            }
                                                        >
                                                            {Number(p.count) ||
                                                                0}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    )}

                    {Object.keys(topActionsBySource).length > 0 && (
                        <div>
                            <p className={styles.visitSubTitle}>
                                פעולות לפי מקור
                            </p>
                            <div className={styles.sourcesGrid}>
                                {Object.entries(topActionsBySource).map(
                                    ([src, actions]) => (
                                        <div
                                            key={src}
                                            className={styles.sourceCard}
                                        >
                                            <div className={styles.sourceTitle}>
                                                {sourceLabel(src)}
                                            </div>
                                            <div className={styles.rows}>
                                                {actions.map((a) => (
                                                    <div
                                                        key={a.action}
                                                        className={styles.row}
                                                    >
                                                        <span
                                                            className={
                                                                styles.rowKey
                                                            }
                                                        >
                                                            {ACTION_LABELS[
                                                                a.action
                                                            ] || a.action}
                                                        </span>
                                                        <span
                                                            className={
                                                                styles.rowVal
                                                            }
                                                        >
                                                            {Number(a.count) ||
                                                                0}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
