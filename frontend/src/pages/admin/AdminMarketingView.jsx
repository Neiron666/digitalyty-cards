import { useEffect, useMemo, useState } from "react";
import { listAdminMarketingRecipients } from "../../services/admin.service";
import styles from "./AdminMarketingView.module.css";

const FILTERS = [
    { key: "all", cohort: "", label: "הכל" },
    { key: "trial", cohort: "trial", label: "ניסיון" },
    { key: "paying", cohort: "paying", label: "משלמים" },
    { key: "non-paying", cohort: "non-paying", label: "לא משלמים" },
];

const PLAN_LABELS = {
    free: "חינם",
    monthly: "חודשי",
    yearly: "שנתי",
};

const SUB_STATUS_LABELS = {
    active: "פעיל",
    inactive: "לא פעיל",
    expired: "פג תוקף",
};

const CONSENT_SOURCE_LABELS = {
    register: "הרשמה",
    signup_consume: "השלמת הרשמה",
    invite_accept: "קבלת הזמנה",
    editor_sidebar: "עורך הכרטיס",
    settings_panel: "הגדרות",
    unsubscribe_link: "קישור ביטול",
};

function planLabel(plan) {
    return PLAN_LABELS[String(plan || "")] || (plan ? String(plan) : "—");
}

function subStatusLabel(status) {
    return (
        SUB_STATUS_LABELS[String(status || "")] ||
        (status ? String(status) : "—")
    );
}

function consentSourceLabel(source) {
    if (!source) return "—";
    return CONSENT_SOURCE_LABELS[String(source)] || String(source);
}

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("he-IL");
}

export default function AdminMarketingView() {
    const [filterKey, setFilterKey] = useState("all");
    const [searchInput, setSearchInput] = useState("");
    const [appliedQuery, setAppliedQuery] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [data, setData] = useState(null);

    const activeCohort = useMemo(() => {
        const found = FILTERS.find((f) => f.key === filterKey);
        return found ? found.cohort : "";
    }, [filterKey]);

    useEffect(() => {
        let alive = true;

        async function run() {
            setLoading(true);
            setError("");
            try {
                const params = { page: 1, limit: 100 };
                if (activeCohort) params.cohort = activeCohort;
                if (appliedQuery) params.q = appliedQuery;

                const res = await listAdminMarketingRecipients(params);
                if (!alive) return;
                setData(res?.data || null);
            } catch (e) {
                if (!alive) return;
                const msg =
                    typeof e?.response?.data?.message === "string"
                        ? e.response.data.message
                        : "לא הצלחנו לטעון את רשימת הנמענים";
                setError(msg);
                setData(null);
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        run();

        return () => {
            alive = false;
        };
    }, [activeCohort, appliedQuery]);

    const items = Array.isArray(data?.items) ? data.items : [];
    const totalCandidates =
        typeof data?.totalCandidates === "number" ? data.totalCandidates : null;
    const returnedCount =
        typeof data?.returnedCount === "number" ? data.returnedCount : null;
    const suppressedOnPage =
        typeof data?.suppressedOnPage === "number"
            ? data.suppressedOnPage
            : null;

    function onSubmitSearch(e) {
        e.preventDefault();
        setAppliedQuery(searchInput.trim());
    }

    return (
        <section className={styles.root} aria-label="שליחת אימיילים">
            <header className={styles.header}>
                <div className={styles.titleWrap}>
                    <h2 className={styles.title}>שליחת אימיילים</h2>
                    <p className={styles.subtitle}>
                        מסך זה מציג רק משתמשים שאישרו קבלת דיוור שיווקי ואימתו
                        את כתובת האימייל שלהם. שליחת קמפיינים אינה פעילה עדיין.
                    </p>
                </div>
            </header>

            <p className={styles.note}>
                המספר הכולל (<span className={styles.noteStrong}>מועמדים</span>)
                מחושב לפני סינון הסרות דיוור. הרשימה המוצגת היא לאחר סינון הסרות
                ברמת העמוד, ולכן ייתכן שמספר השורות קטן מהמספר הכולל.
            </p>

            <div className={styles.controls}>
                <div
                    className={styles.filters}
                    role="group"
                    aria-label="סינון נמענים"
                >
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            className={`${styles.chip} ${
                                filterKey === f.key ? styles.chipActive : ""
                            }`}
                            aria-pressed={filterKey === f.key}
                            onClick={() => setFilterKey(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <form className={styles.searchForm} onSubmit={onSubmitSearch}>
                    <label className={styles.searchLabel} htmlFor="mkt-search">
                        חפש
                    </label>
                    <input
                        id="mkt-search"
                        type="search"
                        className={styles.searchInput}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="חיפוש לפי אימייל"
                        maxLength={64}
                    />
                    <button type="submit" className={styles.searchBtn}>
                        חפש
                    </button>
                </form>
            </div>

            <div className={styles.summary} aria-live="polite">
                <span className={styles.summaryItem}>
                    מועמדים: {totalCandidates ?? "—"}
                </span>
                <span className={styles.summaryItem}>
                    מוצגים: {returnedCount ?? "—"}
                </span>
                <span className={styles.summaryItem}>
                    הוסרו בעמוד: {suppressedOnPage ?? "—"}
                </span>
            </div>

            {error ? (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            ) : null}

            {loading ? (
                <p className={styles.muted}>טוען…</p>
            ) : items.length === 0 ? (
                <p className={styles.muted}>אין נמענים זמינים לסינון הנוכחי.</p>
            ) : (
                <ul className={styles.list}>
                    <li className={`${styles.row} ${styles.rowHead}`}>
                        <span className={styles.cellEmail}>אימייל</span>
                        <span className={styles.cell}>שם</span>
                        <span className={styles.cell}>מסלול</span>
                        <span className={styles.cell}>מנוי</span>
                        <span className={styles.cell}>ניסיון</span>
                        <span className={styles.cell}>אימות</span>
                        <span className={styles.cell}>הסכמה</span>
                    </li>
                    {items.map((u) => (
                        <li className={styles.row} key={u.userId}>
                            <span className={styles.cellEmail}>{u.email}</span>
                            <span className={styles.cell}>
                                {u.firstName || "—"}
                            </span>
                            <span className={styles.cell}>
                                {planLabel(u.plan)}
                            </span>
                            <span className={styles.cell}>
                                {subStatusLabel(u.subscriptionStatus)}
                            </span>
                            <span className={styles.cell}>
                                {u.isTrialActive ? "פעיל" : "—"}
                            </span>
                            <span className={styles.cell}>
                                {u.isVerified ? "מאומת" : "לא מאומת"}
                            </span>
                            <span className={styles.cell}>
                                {consentSourceLabel(
                                    u.emailMarketingConsentSource,
                                )}
                                {u.emailMarketingConsentAt
                                    ? ` · ${formatDate(
                                          u.emailMarketingConsentAt,
                                      )}`
                                    : ""}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
