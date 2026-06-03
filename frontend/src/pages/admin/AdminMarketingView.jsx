import { useEffect, useMemo, useState } from "react";
import {
    listAdminMarketingRecipients,
    previewMarketingCampaign,
    testSendMarketingCampaign,
    dryRunMarketingCampaign,
} from "../../services/admin.service";
import MarketingComposerForm from "./marketing/MarketingComposerForm";
import MarketingPreviewPanel from "./marketing/MarketingPreviewPanel";
import MarketingTestSendConfirm from "./marketing/MarketingTestSendConfirm";
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

    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewResult, setPreviewResult] = useState(null);
    const [previewError, setPreviewError] = useState("");
    const [previewStale, setPreviewStale] = useState(false);
    const [previewSubmittedAt, setPreviewSubmittedAt] = useState(null);

    // Test-send state (admin_self only; production flag may be disabled).
    const [sendLoading, setSendLoading] = useState(false);
    const [sendError, setSendError] = useState("");
    const [sendResult, setSendResult] = useState(null);
    const [sendDisabledByFlag, setSendDisabledByFlag] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [lastSentAt, setLastSentAt] = useState(null);
    const [pendingForm, setPendingForm] = useState(null);

    // Local recipient selection (v1: current visible page only).
    // Keyed by userId only - never stores raw emails as a send payload.
    // Selection is NOT send / NOT dry-run / NOT campaign; causes no requests.
    const [selectedRecipientIds, setSelectedRecipientIds] = useState(
        () => new Set(),
    );

    // Dry-run eligibility check (read-only). Revalidates visible-selected
    // userIds backend-side. NOT send / NOT campaign / NOT token.
    const [dryRunLoading, setDryRunLoading] = useState(false);
    const [dryRunError, setDryRunError] = useState("");
    const [dryRunResult, setDryRunResult] = useState(null);
    const [dryRunStale, setDryRunStale] = useState(false);

    function handleToggleRecipient(userId) {
        // A prior dry-run result no longer matches the new selection. Read the
        // current result from closure; never inspect it via a setter updater.
        if (dryRunResult) {
            setDryRunStale(true);
        }
        setSelectedRecipientIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    }

    function handleClearSelection() {
        setSelectedRecipientIds(new Set());
        setDryRunResult(null);
        setDryRunError("");
        setDryRunStale(false);
    }

    async function handlePreview(form) {
        setPreviewError("");
        setPreviewLoading(true);
        try {
            const res = await previewMarketingCampaign(form);
            const payload = res?.data || {};
            setPreviewResult({
                text: typeof payload.text === "string" ? payload.text : "",
                warnings: Array.isArray(payload.warnings)
                    ? payload.warnings
                    : [],
                formSnapshot: { ...form },
            });
            setPreviewSubmittedAt(Date.now());
            setPreviewStale(false);
        } catch (e) {
            const status = e?.response?.status;
            let msg;
            if (status === 400) {
                msg =
                    typeof e?.response?.data?.message === "string"
                        ? e.response.data.message
                        : "\u05D1\u05E7\u05E9\u05EA \u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4 \u05E9\u05D2\u05D5\u05D9\u05D4";
            } else if (status === 403 || status === 404) {
                msg =
                    "\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D4 \u05DC\u05D1\u05D9\u05E6\u05D5\u05E2 \u05D4\u05E4\u05E2\u05D5\u05DC\u05D4";
            } else {
                msg =
                    "\u05D0\u05D9\u05E8\u05E2\u05D4 \u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D4\u05DE\u05E7\u05D3\u05D9\u05DE\u05D4";
            }
            setPreviewError(msg);
        } finally {
            setPreviewLoading(false);
        }
    }

    // Open the confirmation dialog. Capture the form snapshot at open time so
    // the dialog confirms and sends exactly what the admin saw. No endpoint.
    function handleOpenTestSendConfirm(form) {
        setPendingForm({ ...form });
        setConfirmOpen(true);
    }

    function handleCancelTestSend() {
        if (sendLoading) return;
        setConfirmOpen(false);
        setPendingForm(null);
    }

    async function handleConfirmTestSend() {
        if (sendLoading) return;
        if (!pendingForm) {
            setConfirmOpen(false);
            setSendError("שליחת המבחן נכשלה. נסו שוב מאוחר יותר.");
            return;
        }
        setSendError("");
        setSendLoading(true);
        try {
            const res = await testSendMarketingCampaign(pendingForm);
            const data = res?.data || {};
            const providerStatus = data.providerStatus;
            const deliveredToMasked =
                typeof data.deliveredToMasked === "string"
                    ? data.deliveredToMasked
                    : "";
            const warnings = Array.isArray(data.warnings) ? data.warnings : [];
            if (providerStatus === "accepted" && data.sent === true) {
                setSendResult({
                    kind: "success",
                    message: "הבקשה התקבלה אצל ספק המייל. בדקו את תיבת הדואר.",
                    deliveredToMasked,
                    warnings,
                    providerStatus,
                });
                setLastSentAt(Date.now());
            } else if (providerStatus === "skipped") {
                setSendResult({
                    kind: "warning",
                    message: "שליחת מיילים אינה מוגדרת בסביבה זו.",
                    deliveredToMasked,
                    warnings,
                    providerStatus,
                });
            } else {
                setSendResult({
                    kind: "error",
                    message: "שליחת המבחן נכשלה. נסו שוב מאוחר יותר.",
                    deliveredToMasked: "",
                    warnings,
                    providerStatus,
                });
            }
        } catch (e) {
            const status = e?.response?.status;
            if (status === 409) {
                // Single source of truth: the persistent lock banner renders
                // from sendDisabledByFlag. Clear sendError so the same lock copy
                // is not shown twice.
                setSendDisabledByFlag(true);
                setSendError("");
            } else if (status === 400) {
                setSendError(
                    typeof e?.response?.data?.message === "string"
                        ? e.response.data.message
                        : "בקשת שליחת מבחן שגויה",
                );
            } else if (status === 403 || status === 404) {
                setSendError("אין הרשאה לביצוע הפעולה");
            } else if (status === 429) {
                setSendError(
                    "בוצעו יותר מדי שליחות מבחן. נסו שוב בעוד מספר דקות.",
                );
            } else {
                setSendError("שליחת המבחן נכשלה. נסו שוב מאוחר יותר.");
            }
        } finally {
            setSendLoading(false);
            setConfirmOpen(false);
            setPendingForm(null);
        }
    }

    function handleComposerChange() {
        setPreviewResult((prev) => {
            if (prev) setPreviewStale(true);
            return prev;
        });
        // Clear stale send status/error on edit; keep the flag lock sticky.
        setSendResult(null);
        setSendError("");
    }

    function handleComposerReset() {
        setPreviewResult(null);
        setPreviewError("");
        setPreviewStale(false);
        setPreviewSubmittedAt(null);
        // Clear send state on reset; keep sendDisabledByFlag sticky.
        setSendResult(null);
        setSendError("");
        setConfirmOpen(false);
        setLastSentAt(null);
        setPendingForm(null);
    }

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

    // Clear selection whenever the filter cohort or applied search changes.
    // v1 selection is scoped to the currently visible page; this prevents any
    // hidden selection carrying across filters/search (no select-all-across).
    useEffect(() => {
        setSelectedRecipientIds(new Set());
        // A programmatic selection reset invalidates any dry-run result; this is
        // NOT a user toggle, so stale must be false (not a "rerun" hint).
        setDryRunResult(null);
        setDryRunError("");
        setDryRunStale(false);
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

    // Count only currently visible items that are selected. Never render the
    // raw Set size, so the number can never exceed the visible recipients.
    const selectedVisibleCount = items.reduce(
        (acc, u) => acc + (selectedRecipientIds.has(u.userId) ? 1 : 0),
        0,
    );

    // Dry-run sends ONLY visible-selected userIds. Re-derived from current
    // items at call time so hidden cross-filter ids can never be submitted and
    // no raw email array is ever built.
    async function handleDryRun() {
        if (dryRunLoading) return;
        const ids = items
            .filter((u) => selectedRecipientIds.has(u.userId))
            .map((u) => u.userId);
        if (ids.length === 0) {
            setDryRunError(
                "\u05D1\u05D7\u05E8\u05D5 \u05DC\u05E4\u05D7\u05D5\u05EA \u05E0\u05DE\u05E2\u05DF \u05D0\u05D7\u05D3 \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4",
            );
            return;
        }
        setDryRunError("");
        setDryRunLoading(true);
        try {
            const res = await dryRunMarketingCampaign(ids);
            const data = res?.data || {};
            const num = (v) => (typeof v === "number" ? v : null);
            const reasons =
                data.skippedByReason &&
                typeof data.skippedByReason === "object" &&
                !Array.isArray(data.skippedByReason)
                    ? data.skippedByReason
                    : {};
            setDryRunResult({
                selectedCount: num(data.selectedCount),
                uniqueCount: num(data.uniqueCount),
                duplicateCount: num(data.duplicateCount),
                eligibleCount: num(data.eligibleCount),
                skippedCount: num(data.skippedCount),
                skippedByReason: reasons,
                warnings: Array.isArray(data.warnings) ? data.warnings : [],
            });
            setDryRunStale(false);
        } catch (e) {
            const status = e?.response?.status;
            let msg;
            if (status === 400) {
                msg =
                    typeof e?.response?.data?.message === "string"
                        ? e.response.data.message
                        : "\u05D1\u05E7\u05E9\u05EA \u05D1\u05D3\u05D9\u05E7\u05EA \u05D6\u05DB\u05D0\u05D5\u05EA \u05E9\u05D2\u05D5\u05D9\u05D4";
            } else if (status === 403 || status === 404) {
                msg =
                    "\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D4 \u05DC\u05D1\u05D9\u05E6\u05D5\u05E2 \u05D4\u05E4\u05E2\u05D5\u05DC\u05D4";
            } else {
                msg =
                    "\u05D0\u05D9\u05E8\u05E2\u05D4 \u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05D6\u05DB\u05D0\u05D5\u05EA";
            }
            setDryRunError(msg);
        } finally {
            setDryRunLoading(false);
        }
    }

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
                        את כתובת האימייל שלהם. הכנת תוכן למיילים זמינה כעת;
                        תצוגה מקדימה, שליחת מבחן ושליחה לרשימה יופעלו בשלבים
                        הבאים.
                    </p>
                </div>
            </header>

            <p className={styles.note}>
                המספר הכולל (<span className={styles.noteStrong}>מועמדים</span>)
                מחושב לפני סינון הסרות דיוור. הרשימה המוצגת היא לאחר סינון הסרות
                ברמת העמוד, ולכן ייתכן שמספר השורות קטן מהמספר הכולל.
            </p>

            <MarketingComposerForm
                onPreview={handlePreview}
                isPreviewing={previewLoading}
                isPreviewStale={previewStale}
                onComposerChange={handleComposerChange}
                onComposerReset={handleComposerReset}
                onTestSend={handleOpenTestSendConfirm}
                isSending={sendLoading}
                sendDisabled={false}
                sendResult={sendResult}
                sendError={sendError}
                sendDisabledByFlag={sendDisabledByFlag}
            />

            <MarketingPreviewPanel
                result={previewResult}
                error={previewError}
                isLoading={previewLoading}
                isStale={previewStale}
                submittedAt={previewSubmittedAt}
            />

            <MarketingTestSendConfirm
                open={confirmOpen}
                isSending={sendLoading}
                onConfirm={handleConfirmTestSend}
                onCancel={handleCancelTestSend}
            />

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
                <>
                    <div className={styles.selectionBar}>
                        <span className={styles.selectionCount}>
                            נבחרו {selectedVisibleCount} נמענים
                        </span>
                        <button
                            type="button"
                            className={styles.clearBtn}
                            onClick={handleClearSelection}
                            disabled={selectedVisibleCount === 0}
                        >
                            נקה בחירה
                        </button>
                        <span className={styles.selectionNote}>
                            בחירת נמענים היא להכנה בלבד. שליחה לרשימה תתווסף
                            בשלב נפרד לאחר בדיקת זכאות.
                        </span>
                    </div>
                    <div className={styles.dryRunActions}>
                        <button
                            type="button"
                            className={styles.dryRunButton}
                            onClick={handleDryRun}
                            disabled={
                                selectedVisibleCount === 0 || dryRunLoading
                            }
                        >
                            {dryRunLoading
                                ? "\u05D1\u05D5\u05D3\u05E7 \u05D6\u05DB\u05D0\u05D5\u05EA\u2026"
                                : "\u05D1\u05D3\u05D9\u05E7\u05EA \u05D6\u05DB\u05D0\u05D5\u05EA \u05DC\u05E0\u05DE\u05E2\u05E0\u05D9\u05DD"}
                        </button>
                        <span className={styles.dryRunBoundaryNote}>
                            הבדיקה אינה שולחת מיילים ואינה יוצרת קמפיין.
                        </span>
                    </div>
                    <div className={styles.dryRunRegion} aria-live="polite">
                        {dryRunError ? (
                            <p className={styles.error} role="alert">
                                {dryRunError}
                            </p>
                        ) : null}
                        {dryRunStale ? (
                            <p className={styles.dryRunStaleHint}>
                                התוצאה אינה מעודכנת לאחר שינוי בחירה. הריצו
                                בדיקה מחדש.
                            </p>
                        ) : null}
                        {dryRunResult ? (
                            <div className={styles.dryRunPanel}>
                                <div className={styles.dryRunStats}>
                                    <span className={styles.dryRunStat}>
                                        נבחרו:{" "}
                                        {dryRunResult.selectedCount ?? "\u2014"}
                                    </span>
                                    <span className={styles.dryRunStat}>
                                        ייחודיים:{" "}
                                        {dryRunResult.uniqueCount ?? "\u2014"}
                                    </span>
                                    <span className={styles.dryRunStat}>
                                        כפולים:{" "}
                                        {dryRunResult.duplicateCount ??
                                            "\u2014"}
                                    </span>
                                    <span className={styles.dryRunStat}>
                                        זכאים:{" "}
                                        {dryRunResult.eligibleCount ?? "\u2014"}
                                    </span>
                                    <span className={styles.dryRunStat}>
                                        נפסלו:{" "}
                                        {dryRunResult.skippedCount ?? "\u2014"}
                                    </span>
                                </div>
                                {Object.keys(dryRunResult.skippedByReason)
                                    .length > 0 ? (
                                    <ul className={styles.dryRunReasons}>
                                        {Object.entries(
                                            dryRunResult.skippedByReason,
                                        ).map(([reason, count]) => (
                                            <li
                                                key={reason}
                                                className={
                                                    styles.dryRunReasonRow
                                                }
                                            >
                                                <span>
                                                    {skipReasonLabel(reason)}
                                                </span>
                                                <span>
                                                    {typeof count === "number"
                                                        ? count
                                                        : "\u2014"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                                {dryRunResult.warnings.length > 0 ? (
                                    <ul className={styles.dryRunWarnings}>
                                        {dryRunResult.warnings.map((w, i) => (
                                            <li
                                                key={`${i}-${String(w)}`}
                                                className={styles.dryRunWarning}
                                            >
                                                {String(w)}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    <ul className={styles.list}>
                        <li className={`${styles.row} ${styles.rowHead}`}>
                            <span className={styles.checkboxCell}>בחירה</span>
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
                                <span className={styles.checkboxCell}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={selectedRecipientIds.has(
                                            u.userId,
                                        )}
                                        onChange={() =>
                                            handleToggleRecipient(u.userId)
                                        }
                                        aria-label={`בחר נמען ${u.email}`}
                                    />
                                </span>
                                <span className={styles.cellEmail}>
                                    {u.email}
                                </span>
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
                </>
            )}
        </section>
    );
}
