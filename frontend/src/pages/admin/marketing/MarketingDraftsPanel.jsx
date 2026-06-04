import { useCallback, useEffect, useState } from "react";
import {
    listMarketingCampaignDrafts,
    getMarketingCampaignDraft,
    cancelMarketingCampaignDraft,
    checkMarketingCampaignSendReadiness,
    getMarketingCampaignSendStatus,
    deleteMarketingCampaign,
} from "../../../services/admin.service";
import styles from "./MarketingDraftsPanel.module.css";

// Allowlisted list-filter statuses (mirrors the backend allowlist). No "all".
const DRAFT_STATUS_OPTIONS = ["draft", "canceled"];
const PAGE_LIMIT = 20;

// Local skip-reason label map. Unknown keys fall back to String(reason) so a
// new backend reason can never break rendering and is never treated as HTML.
const SKIP_REASON_LABELS = {
    DUPLICATE: "כפול",
    INVALID_ID: "מזהה לא תקין",
    USER_NOT_FOUND: "משתמש לא נמצא",
    NOT_VERIFIED: "לא מאומת",
    NOT_CONSENTED: "חסרה הסכמת דיוור",
    OPTED_OUT: "הסרת דיוור",
    EMAIL_MARKETING_CONSENT_MISSING: "חסרה הסכמת דיוור",
    MARKETING_OPT_OUT: "הסרת דיוור",
    EMAIL_MISSING: "חסר אימייל",
    UNKNOWN: "לא ידוע",
};

const STATUS_LABELS = {
    draft: "טיוטה",
    canceled: "בוטלה",
};

// Local fixed campaign-status label map for the read-only send-status block.
// Unknown statuses fall back to String(status) so a new backend status can
// never break rendering and is never treated as HTML.
const SEND_STATUS_CAMPAIGN_LABELS = {
    draft: "טיוטה",
    ready: "מוכן",
    queued: "בתור",
    sending: "בשליחה",
    completed: "הושלם",
    failed: "נכשל",
    canceled: "בוטל",
};

function sendStatusCampaignLabel(status) {
    return (
        SEND_STATUS_CAMPAIGN_LABELS[String(status || "")] ||
        (status ? String(status) : "—")
    );
}

function skipReasonLabel(reason) {
    return SKIP_REASON_LABELS[String(reason)] || String(reason);
}

function statusLabel(status) {
    return (
        STATUS_LABELS[String(status || "")] || (status ? String(status) : "—")
    );
}

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("he-IL");
}

function countOrDash(value) {
    return typeof value === "number" ? value : "—";
}

export default function MarketingDraftsPanel() {
    const [draftsLoading, setDraftsLoading] = useState(false);
    const [draftsError, setDraftsError] = useState("");
    const [draftsStatus, setDraftsStatus] = useState("draft");
    const [draftsPage, setDraftsPage] = useState(1);
    const [draftsResult, setDraftsResult] = useState(null);

    const [selectedDraftId, setSelectedDraftId] = useState(null);
    const [selectedDraftLoading, setSelectedDraftLoading] = useState(false);
    const [selectedDraftError, setSelectedDraftError] = useState("");
    const [selectedDraft, setSelectedDraft] = useState(null);

    const [cancelLoadingId, setCancelLoadingId] = useState(null);
    const [cancelError, setCancelError] = useState("");
    const [cancelResult, setCancelResult] = useState("");
    const [confirmingCancelId, setConfirmingCancelId] = useState(null);

    // Read-only send-readiness probe state (draft detail only). Never stores
    // selectedUserIds/emails/tokens/provider — counts + coarse reasons only.
    const [readinessLoading, setReadinessLoading] = useState(false);
    const [readinessError, setReadinessError] = useState("");
    const [readinessResult, setReadinessResult] = useState(null);
    const [readinessDisabledByFlag, setReadinessDisabledByFlag] =
        useState(false);
    const [readinessCheckedDraftId, setReadinessCheckedDraftId] =
        useState(null);

    // Drop any readiness probe state so a stale result is never shown for a
    // different draft (detail switch / filter change / reload / cancel).
    function clearReadinessState() {
        setReadinessLoading(false);
        setReadinessError("");
        setReadinessResult(null);
        setReadinessDisabledByFlag(false);
        setReadinessCheckedDraftId(null);
    }

    // Read-only send-status rollup state (draft detail only). Never stores
    // selectedUserIds/emails/tokens/provider — counts + coarse flags only.
    const [sendStatusLoading, setSendStatusLoading] = useState(false);
    const [sendStatusError, setSendStatusError] = useState("");
    const [sendStatusResult, setSendStatusResult] = useState(null);
    const [sendStatusCheckedDraftId, setSendStatusCheckedDraftId] =
        useState(null);

    // Drop any send-status state so a stale rollup is never shown for a
    // different draft (detail switch / filter change / reload / cancel).
    function clearSendStatusState() {
        setSendStatusLoading(false);
        setSendStatusError("");
        setSendStatusResult(null);
        setSendStatusCheckedDraftId(null);
    }

    // Draft hard-delete state (draft detail only). Two-step confirm; the
    // backend is SSoT for deletability (404/409). Stores nothing from the
    // response except a fixed success/error string.
    const [deleteLoadingId, setDeleteLoadingId] = useState(null);
    const [deleteError, setDeleteError] = useState("");
    const [deleteResult, setDeleteResult] = useState("");
    const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

    // Drop any delete flow state (confirm/loading/error). The success result
    // is reset separately so it can persist on the panel status line after the
    // detail unmounts.
    function clearDeleteState() {
        setDeleteLoadingId(null);
        setDeleteError("");
        setConfirmingDeleteId(null);
    }

    // Load the list for the current status + page. Read-only GET. Never renders
    // a backend message verbatim — a single fixed Hebrew error string is used.
    const loadDrafts = useCallback(async () => {
        setDraftsLoading(true);
        setDraftsError("");
        try {
            const res = await listMarketingCampaignDrafts({
                status: draftsStatus,
                page: draftsPage,
                limit: PAGE_LIMIT,
            });
            const data = res?.data || {};
            setDraftsResult({
                page: typeof data.page === "number" ? data.page : draftsPage,
                limit: typeof data.limit === "number" ? data.limit : PAGE_LIMIT,
                total: typeof data.total === "number" ? data.total : 0,
                items: Array.isArray(data.items) ? data.items : [],
            });
        } catch {
            setDraftsResult(null);
            setDraftsError("טעינת הטיוטות נכשלה.");
        } finally {
            setDraftsLoading(false);
        }
    }, [draftsStatus, draftsPage]);

    useEffect(() => {
        loadDrafts();
    }, [loadDrafts]);

    function handleSelectStatus(nextStatus) {
        if (nextStatus === draftsStatus) return;
        // Changing the filter invalidates any open detail + cancel state, and
        // resets pagination to the first page.
        setSelectedDraftId(null);
        setSelectedDraft(null);
        setSelectedDraftError("");
        setCancelError("");
        setCancelResult("");
        setConfirmingCancelId(null);
        clearReadinessState();
        clearSendStatusState();
        clearDeleteState();
        setDeleteResult("");
        setDraftsPage(1);
        setDraftsStatus(nextStatus);
    }

    async function loadDetail(campaignId) {
        setSelectedDraftId(campaignId);
        setSelectedDraft(null);
        setSelectedDraftError("");
        setCancelError("");
        setCancelResult("");
        setConfirmingCancelId(null);
        clearReadinessState();
        clearSendStatusState();
        clearDeleteState();
        setDeleteResult("");
        setSelectedDraftLoading(true);
        try {
            const res = await getMarketingCampaignDraft(campaignId);
            const data = res?.data || {};
            setSelectedDraft(data.draft || null);
            if (!data.draft) {
                setSelectedDraftError("טעינת פרטי הטיוטה נכשלה.");
            }
        } catch {
            setSelectedDraft(null);
            setSelectedDraftError("טעינת פרטי הטיוטה נכשלה.");
        } finally {
            setSelectedDraftLoading(false);
        }
    }

    async function handleConfirmCancel(campaignId) {
        if (cancelLoadingId) return;
        setCancelError("");
        setCancelResult("");
        setCancelLoadingId(campaignId);
        try {
            await cancelMarketingCampaignDraft(campaignId);
            setConfirmingCancelId(null);
            setCancelResult("הטיוטה בוטלה.");
            // Refresh list + detail so the now-canceled draft reflects state.
            await loadDrafts();
            if (selectedDraftId === campaignId) {
                await loadDetail(campaignId);
            }
        } catch (e) {
            const status = e?.response?.status;
            setConfirmingCancelId(null);
            if (status === 409) {
                setCancelError("הטיוטה אינה ניתנת לביטול.");
            } else {
                setCancelError("ביטול הטיוטה נכשל.");
            }
            // A 404/409 means the open detail is stale: refresh list, and
            // refresh the open detail if it is the one we tried to cancel.
            await loadDrafts();
            if (selectedDraftId === campaignId) {
                await loadDetail(campaignId);
            }
        } finally {
            setCancelLoadingId(null);
        }
    }

    // Draft hard-delete. Two-step confirm gated by the caller. The backend is
    // SSoT for deletability — a 404/409 means the open detail is stale, so the
    // list (and, where relevant, the detail) is refreshed. The backend message
    // is never rendered; only fixed Hebrew strings are shown.
    async function handleConfirmDelete(campaignId) {
        if (deleteLoadingId) return;
        setDeleteError("");
        setDeleteResult("");
        setDeleteLoadingId(campaignId);
        try {
            await deleteMarketingCampaign(campaignId);
            // Success: the campaign is gone. Clear the (now-stale) detail and
            // any probe state, surface a fixed success string on the panel
            // status line, and refresh the list.
            setConfirmingDeleteId(null);
            setSelectedDraftId(null);
            setSelectedDraft(null);
            setSelectedDraftError("");
            clearReadinessState();
            clearSendStatusState();
            setDeleteResult("הטיוטה נמחקה בהצלחה.");
            await loadDrafts();
        } catch (e) {
            const status = e?.response?.status;
            setConfirmingDeleteId(null);
            // A 404/409 means the open detail is stale: refresh the list, and
            // refresh the open detail if it is the one we tried to delete.
            // loadDetail resets delete state, so the fixed error is set AFTER
            // the refresh so it remains visible. The backend message is never
            // rendered — only fixed Hebrew strings.
            await loadDrafts();
            if (selectedDraftId === campaignId) {
                await loadDetail(campaignId);
            }
            if (status === 409 || status === 404) {
                setDeleteError("לא ניתן למחוק את הטיוטה במצב הנוכחי.");
            } else {
                setDeleteError("מחיקת הטיוטה נכשלה. נסו שוב.");
            }
        } finally {
            setDeleteLoadingId(null);
        }
    }
    async function handleCheckReadiness(campaignId) {
        if (readinessLoading) return;
        setReadinessError("");
        setReadinessResult(null);
        setReadinessDisabledByFlag(false);
        setReadinessCheckedDraftId(null);
        setReadinessLoading(true);
        try {
            const res = await checkMarketingCampaignSendReadiness(campaignId);
            const data = res?.data || {};
            setReadinessResult({
                selectedCount: data.selectedCount,
                duplicateCount: data.duplicateCount,
                eligibleCount: data.eligibleCount,
                skippedCount: data.skippedCount,
                skippedByReason:
                    data.skippedByReason &&
                    typeof data.skippedByReason === "object"
                        ? data.skippedByReason
                        : null,
                warnings: Array.isArray(data.warnings) ? data.warnings : [],
                ready: data.ready === true,
            });
            setReadinessCheckedDraftId(campaignId);
        } catch (e) {
            const status = e?.response?.status;
            // Classification only — the backend message is never displayed.
            const message = String(
                e?.response?.data?.message || "",
            ).toLowerCase();
            if (status === 409) {
                if (message.includes("disabled")) {
                    setReadinessDisabledByFlag(true);
                    setReadinessError("בדיקת מוכנות לשליחה אינה פעילה כרגע.");
                } else {
                    setReadinessError("ניתן לבדוק מוכנות רק לטיוטה פעילה.");
                }
            } else if (status === 422) {
                if (message.includes("recipient")) {
                    setReadinessError("אין נמענים שנבחרו בטיוטה.");
                } else {
                    setReadinessError("תוכן הטיוטה אינו מוכן לשליחה.");
                }
            } else {
                setReadinessError("בדיקת המוכנות נכשלה.");
            }
            setReadinessCheckedDraftId(campaignId);
        } finally {
            setReadinessLoading(false);
        }
    }

    // Read-only send-status rollup. Manual refresh only (no polling). Stores
    // ONLY whitelisted counts/flags; never stores the raw response object and
    // never renders a backend message verbatim. This does NOT send email and
    // does NOT start a campaign.
    async function handleLoadSendStatus(campaignId) {
        if (!campaignId) return;
        if (sendStatusLoading) return;
        setSendStatusError("");
        setSendStatusLoading(true);
        try {
            const res = await getMarketingCampaignSendStatus(campaignId);
            const data = res?.data || {};
            const counts =
                data.counts && typeof data.counts === "object"
                    ? data.counts
                    : {};
            setSendStatusResult({
                ok: data.ok === true,
                campaignId: data.campaignId,
                campaignStatus: data.campaignStatus,
                queuedAt: data.queuedAt ?? null,
                canceledAt: data.canceledAt ?? null,
                updatedAt: data.updatedAt ?? null,
                counts: {
                    pending: counts.pending,
                    sending: counts.sending,
                    sent: counts.sent,
                    failed: counts.failed,
                    skipped: counts.skipped,
                    suppressed: counts.suppressed,
                    canceled: counts.canceled,
                    total: counts.total,
                },
                hasActiveRows: data.hasActiveRows === true,
                isTerminal: data.isTerminal === true,
            });
            setSendStatusCheckedDraftId(campaignId);
        } catch (e) {
            const status = e?.response?.status;
            if (status === 404) {
                setSendStatusError("סטטוס השליחה אינו זמין כרגע.");
            } else {
                setSendStatusError("טעינת סטטוס השליחה נכשלה.");
            }
            setSendStatusResult(null);
            setSendStatusCheckedDraftId(campaignId);
        } finally {
            setSendStatusLoading(false);
        }
    }

    const result = draftsResult;
    const items = Array.isArray(result?.items) ? result.items : [];
    const total = typeof result?.total === "number" ? result.total : 0;
    const prevDisabled = draftsPage <= 1 || draftsLoading;
    const nextDisabled =
        draftsLoading ||
        draftsPage * PAGE_LIMIT >= total ||
        items.length < PAGE_LIMIT;

    return (
        <section className={styles.panel} aria-label="טיוטות קמפיינים">
            <header className={styles.header}>
                <h3 className={styles.title}>טיוטות קמפיינים</h3>
                <p className={styles.helper}>
                    כאן ניתן לצפות בטיוטות שנשמרו ולבטל טיוטות לפני שימוש עתידי.
                </p>
            </header>

            <div className={styles.toolbar}>
                <div
                    className={styles.filterGroup}
                    role="group"
                    aria-label="סינון טיוטות"
                >
                    {DRAFT_STATUS_OPTIONS.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            className={`${styles.filterButton} ${
                                draftsStatus === opt
                                    ? styles.filterButtonActive
                                    : ""
                            }`}
                            aria-pressed={draftsStatus === opt}
                            onClick={() => handleSelectStatus(opt)}
                        >
                            {opt === "draft"
                                ? "טיוטות פעילות"
                                : "טיוטות שבוטלו"}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className={styles.reloadButton}
                    onClick={loadDrafts}
                    disabled={draftsLoading}
                >
                    רענון טיוטות
                </button>
            </div>

            <div className={styles.statusLine} aria-live="polite">
                {draftsLoading ? (
                    <span className={styles.muted}>טוען…</span>
                ) : null}
                {cancelResult ? (
                    <span className={styles.success}>{cancelResult}</span>
                ) : null}
                {deleteResult ? (
                    <span className={styles.success}>{deleteResult}</span>
                ) : null}
            </div>

            {draftsError ? (
                <p className={styles.error} role="alert">
                    {draftsError}
                </p>
            ) : null}

            {!draftsLoading && !draftsError && items.length === 0 ? (
                <p className={styles.empty}>אין טיוטות להצגה.</p>
            ) : null}

            {items.length > 0 ? (
                <ul className={styles.list}>
                    {items.map((draft) => (
                        <li className={styles.row} key={draft.campaignId}>
                            <div className={styles.rowMain}>
                                <span className={styles.rowSubject}>
                                    {draft.subject || "—"}
                                </span>
                                <span className={styles.rowHeading}>
                                    {draft.heading || "—"}
                                </span>
                            </div>
                            <div className={styles.rowMeta}>
                                <span className={styles.metaItem}>
                                    {statusLabel(draft.status)}
                                </span>
                                <span className={styles.metaItem}>
                                    {formatDate(draft.createdAt)}
                                </span>
                                <span className={styles.metaItem}>
                                    נבחרו: {countOrDash(draft.selectedCount)}
                                </span>
                                <span className={styles.metaItem}>
                                    זכאים: {countOrDash(draft.eligibleCount)}
                                </span>
                                <span className={styles.metaItem}>
                                    נפסלו: {countOrDash(draft.skippedCount)}
                                </span>
                            </div>
                            <div className={styles.rowActions}>
                                <button
                                    type="button"
                                    className={styles.viewButton}
                                    onClick={() => loadDetail(draft.campaignId)}
                                    disabled={
                                        selectedDraftLoading &&
                                        selectedDraftId === draft.campaignId
                                    }
                                >
                                    צפייה
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}

            {items.length > 0 ? (
                <div className={styles.pager}>
                    <button
                        type="button"
                        className={styles.pagerButton}
                        onClick={() => setDraftsPage((p) => Math.max(1, p - 1))}
                        disabled={prevDisabled}
                    >
                        הקודם
                    </button>
                    <span className={styles.pagerInfo}>עמוד {draftsPage}</span>
                    <button
                        type="button"
                        className={styles.pagerButton}
                        onClick={() => setDraftsPage((p) => p + 1)}
                        disabled={nextDisabled}
                    >
                        הבא
                    </button>
                </div>
            ) : null}

            {selectedDraftId ? (
                <div className={styles.detail} aria-live="polite">
                    {selectedDraftLoading ? (
                        <p className={styles.muted}>טוען…</p>
                    ) : null}

                    {selectedDraftError ? (
                        <p className={styles.error} role="alert">
                            {selectedDraftError}
                        </p>
                    ) : null}

                    {selectedDraft ? (
                        <>
                            <div className={styles.detailBlock}>
                                <h4 className={styles.detailTitle}>
                                    תוכן הטיוטה
                                </h4>
                                <dl className={styles.detailList}>
                                    <div className={styles.detailRow}>
                                        <dt className={styles.detailKey}>
                                            נושא
                                        </dt>
                                        <dd className={styles.detailText}>
                                            {selectedDraft.contentSnapshot
                                                ?.subject || "—"}
                                        </dd>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <dt className={styles.detailKey}>
                                            טקסט תצוגה
                                        </dt>
                                        <dd className={styles.detailText}>
                                            {selectedDraft.contentSnapshot
                                                ?.previewText || "—"}
                                        </dd>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <dt className={styles.detailKey}>
                                            כותרת
                                        </dt>
                                        <dd className={styles.detailText}>
                                            {selectedDraft.contentSnapshot
                                                ?.heading || "—"}
                                        </dd>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <dt className={styles.detailKey}>
                                            גוף הודעה
                                        </dt>
                                        <dd className={styles.detailText}>
                                            {selectedDraft.contentSnapshot
                                                ?.bodyText || "—"}
                                        </dd>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <dt className={styles.detailKey}>
                                            תמונה עליונה (כתובת)
                                        </dt>
                                        <dd className={styles.detailText}>
                                            {selectedDraft.contentSnapshot
                                                ?.topImageUrl || "—"}
                                        </dd>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <dt className={styles.detailKey}>
                                            כיתוב כפתור
                                        </dt>
                                        <dd className={styles.detailText}>
                                            {selectedDraft.contentSnapshot
                                                ?.ctaLabel || "—"}
                                        </dd>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <dt className={styles.detailKey}>
                                            כתובת כפתור
                                        </dt>
                                        <dd className={styles.detailText}>
                                            {selectedDraft.contentSnapshot
                                                ?.ctaUrl || "—"}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <div className={styles.detailBlock}>
                                <h4 className={styles.detailTitle}>
                                    סיכום זכאות
                                </h4>
                                <ul className={styles.countList}>
                                    <li className={styles.countItem}>
                                        נבחרו:{" "}
                                        {countOrDash(
                                            selectedDraft.selectionSummary
                                                ?.selectedCount,
                                        )}
                                    </li>
                                    <li className={styles.countItem}>
                                        כפולים:{" "}
                                        {countOrDash(
                                            selectedDraft.selectionSummary
                                                ?.duplicateCount,
                                        )}
                                    </li>
                                    <li className={styles.countItem}>
                                        ייחודיים:{" "}
                                        {countOrDash(
                                            selectedDraft.selectionSummary
                                                ?.uniqueCount,
                                        )}
                                    </li>
                                    <li className={styles.countItem}>
                                        זכאים:{" "}
                                        {countOrDash(
                                            selectedDraft.selectionSummary
                                                ?.eligibleCount,
                                        )}
                                    </li>
                                    <li className={styles.countItem}>
                                        נפסלו:{" "}
                                        {countOrDash(
                                            selectedDraft.selectionSummary
                                                ?.skippedCount,
                                        )}
                                    </li>
                                </ul>
                                {selectedDraft.selectionSummary
                                    ?.skippedByReason &&
                                typeof selectedDraft.selectionSummary
                                    .skippedByReason === "object" &&
                                Object.keys(
                                    selectedDraft.selectionSummary
                                        .skippedByReason,
                                ).length > 0 ? (
                                    <ul className={styles.reasonList}>
                                        {Object.entries(
                                            selectedDraft.selectionSummary
                                                .skippedByReason,
                                        ).map(([reason, count]) => (
                                            <li
                                                key={reason}
                                                className={styles.reasonRow}
                                            >
                                                <span>
                                                    {skipReasonLabel(reason)}
                                                </span>
                                                <span>
                                                    {countOrDash(count)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>

                            <div className={styles.detailBlock}>
                                <h4 className={styles.detailTitle}>סטטוס</h4>
                                <ul className={styles.countList}>
                                    <li className={styles.countItem}>
                                        מצב: {statusLabel(selectedDraft.status)}
                                    </li>
                                    <li className={styles.countItem}>
                                        נוצרה:{" "}
                                        {formatDate(selectedDraft.createdAt)}
                                    </li>
                                    <li className={styles.countItem}>
                                        עודכנה:{" "}
                                        {formatDate(selectedDraft.updatedAt)}
                                    </li>
                                    {selectedDraft.canceledAt ? (
                                        <li className={styles.countItem}>
                                            בוטלה:{" "}
                                            {formatDate(
                                                selectedDraft.canceledAt,
                                            )}
                                        </li>
                                    ) : null}
                                </ul>
                            </div>

                            <div className={styles.sendStatusBlock}>
                                <h4 className={styles.detailTitle}>
                                    סטטוס שליחת קמפיין
                                </h4>
                                <p className={styles.sendStatusHelper}>
                                    המידע כאן מציג סטטוס טכני של נמעני הקמפיין.
                                    הוא לא שולח אימיילים.
                                </p>
                                <button
                                    type="button"
                                    className={styles.sendStatusButton}
                                    onClick={() =>
                                        handleLoadSendStatus(
                                            selectedDraft.campaignId,
                                        )
                                    }
                                    disabled={sendStatusLoading}
                                >
                                    {sendStatusLoading
                                        ? "טוען סטטוס..."
                                        : "רענון סטטוס"}
                                </button>
                                <div
                                    className={styles.sendStatusStatus}
                                    role="status"
                                    aria-live="polite"
                                >
                                    {sendStatusCheckedDraftId ===
                                        selectedDraft.campaignId &&
                                    sendStatusError ? (
                                        <p
                                            className={styles.error}
                                            role="alert"
                                        >
                                            {sendStatusError}
                                        </p>
                                    ) : null}

                                    {sendStatusCheckedDraftId ===
                                        selectedDraft.campaignId &&
                                    sendStatusResult ? (
                                        <div
                                            className={styles.sendStatusResult}
                                        >
                                            <ul className={styles.countList}>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    מצב קמפיין:{" "}
                                                    {sendStatusCampaignLabel(
                                                        sendStatusResult.campaignStatus,
                                                    )}
                                                </li>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    סה״כ:{" "}
                                                    {countOrDash(
                                                        sendStatusResult.counts
                                                            .total,
                                                    )}
                                                </li>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    ממתינים:{" "}
                                                    {countOrDash(
                                                        sendStatusResult.counts
                                                            .pending,
                                                    )}
                                                </li>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    בעיבוד:{" "}
                                                    {countOrDash(
                                                        sendStatusResult.counts
                                                            .sending,
                                                    )}
                                                </li>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    סומנו כנשלחו (טכני):{" "}
                                                    {countOrDash(
                                                        sendStatusResult.counts
                                                            .sent,
                                                    )}
                                                </li>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    נכשלו:{" "}
                                                    {countOrDash(
                                                        sendStatusResult.counts
                                                            .failed,
                                                    )}
                                                </li>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    דולגו:{" "}
                                                    {countOrDash(
                                                        sendStatusResult.counts
                                                            .skipped,
                                                    )}
                                                </li>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    נחסמו:{" "}
                                                    {countOrDash(
                                                        sendStatusResult.counts
                                                            .suppressed,
                                                    )}
                                                </li>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    בוטלו:{" "}
                                                    {countOrDash(
                                                        sendStatusResult.counts
                                                            .canceled,
                                                    )}
                                                </li>
                                            </ul>
                                            <ul className={styles.countList}>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    בתור מאז:{" "}
                                                    {formatDate(
                                                        sendStatusResult.queuedAt,
                                                    )}
                                                </li>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    בוטל:{" "}
                                                    {formatDate(
                                                        sendStatusResult.canceledAt,
                                                    )}
                                                </li>
                                                <li
                                                    className={styles.countItem}
                                                >
                                                    עודכן:{" "}
                                                    {formatDate(
                                                        sendStatusResult.updatedAt,
                                                    )}
                                                </li>
                                            </ul>
                                            <p className={styles.muted}>
                                                {sendStatusResult.counts
                                                    .total === 0
                                                    ? "עדיין לא נוצרו רשומות שליחה לקמפיין הזה."
                                                    : sendStatusResult.hasActiveRows
                                                      ? "יש רשומות פעילות בתהליך."
                                                      : sendStatusResult.isTerminal
                                                        ? "אין רשומות פעילות כרגע."
                                                        : ""}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {selectedDraft.status === "draft" ? (
                                <div className={styles.readinessBlock}>
                                    <h4 className={styles.detailTitle}>
                                        מוכנות לשליחה
                                    </h4>
                                    <button
                                        type="button"
                                        className={styles.readinessButton}
                                        onClick={() =>
                                            handleCheckReadiness(
                                                selectedDraft.campaignId,
                                            )
                                        }
                                        disabled={
                                            readinessLoading ||
                                            (readinessDisabledByFlag &&
                                                readinessCheckedDraftId ===
                                                    selectedDraft.campaignId)
                                        }
                                    >
                                        {readinessLoading
                                            ? "בודק מוכנות..."
                                            : "בדיקת מוכנות לשליחה"}
                                    </button>
                                    <p className={styles.readinessHelper}>
                                        הבדיקה לא שולחת אימיילים ולא מפעילה
                                        קמפיין.
                                    </p>
                                    <div
                                        className={styles.readinessStatus}
                                        aria-live="polite"
                                    >
                                        {readinessCheckedDraftId ===
                                            selectedDraft.campaignId &&
                                        readinessError ? (
                                            <p
                                                className={styles.error}
                                                role="alert"
                                            >
                                                {readinessError}
                                            </p>
                                        ) : null}

                                        {readinessCheckedDraftId ===
                                            selectedDraft.campaignId &&
                                        readinessResult ? (
                                            <div
                                                className={
                                                    styles.readinessResult
                                                }
                                            >
                                                <p
                                                    className={
                                                        readinessResult.ready
                                                            ? styles.success
                                                            : styles.muted
                                                    }
                                                >
                                                    {readinessResult.ready
                                                        ? "הטיוטה מוכנה לשלב הבא."
                                                        : "אין נמענים כשירים כרגע."}
                                                </p>
                                                <ul
                                                    className={styles.countList}
                                                >
                                                    <li
                                                        className={
                                                            styles.countItem
                                                        }
                                                    >
                                                        נבחרו:{" "}
                                                        {countOrDash(
                                                            readinessResult.selectedCount,
                                                        )}
                                                    </li>
                                                    <li
                                                        className={
                                                            styles.countItem
                                                        }
                                                    >
                                                        זכאים:{" "}
                                                        {countOrDash(
                                                            readinessResult.eligibleCount,
                                                        )}
                                                    </li>
                                                    <li
                                                        className={
                                                            styles.countItem
                                                        }
                                                    >
                                                        נפסלו:{" "}
                                                        {countOrDash(
                                                            readinessResult.skippedCount,
                                                        )}
                                                    </li>
                                                    <li
                                                        className={
                                                            styles.countItem
                                                        }
                                                    >
                                                        כפולים:{" "}
                                                        {countOrDash(
                                                            readinessResult.duplicateCount,
                                                        )}
                                                    </li>
                                                </ul>
                                                {readinessResult.skippedByReason &&
                                                Object.keys(
                                                    readinessResult.skippedByReason,
                                                ).length > 0 ? (
                                                    <ul
                                                        className={
                                                            styles.reasonList
                                                        }
                                                    >
                                                        {Object.entries(
                                                            readinessResult.skippedByReason,
                                                        ).map(
                                                            ([
                                                                reason,
                                                                count,
                                                            ]) => (
                                                                <li
                                                                    key={reason}
                                                                    className={
                                                                        styles.reasonRow
                                                                    }
                                                                >
                                                                    <span>
                                                                        {skipReasonLabel(
                                                                            reason,
                                                                        )}
                                                                    </span>
                                                                    <span>
                                                                        {countOrDash(
                                                                            count,
                                                                        )}
                                                                    </span>
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                ) : null}
                                                {readinessResult.warnings
                                                    .length > 0 ? (
                                                    <ul
                                                        className={
                                                            styles.reasonList
                                                        }
                                                    >
                                                        {readinessResult.warnings.map(
                                                            (warning, idx) => (
                                                                <li
                                                                    key={`${String(
                                                                        warning,
                                                                    )}-${idx}`}
                                                                    className={
                                                                        styles.reasonRow
                                                                    }
                                                                >
                                                                    <span>
                                                                        {String(
                                                                            warning,
                                                                        )}
                                                                    </span>
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}

                            {cancelError ? (
                                <p className={styles.error} role="alert">
                                    {cancelError}
                                </p>
                            ) : null}

                            {selectedDraft.status === "draft" ? (
                                confirmingCancelId ===
                                selectedDraft.campaignId ? (
                                    <div
                                        className={styles.confirmBox}
                                        role="group"
                                        aria-label="אישור ביטול"
                                    >
                                        <span className={styles.confirmText}>
                                            לבטל את הטיוטה?
                                        </span>
                                        <div className={styles.confirmActions}>
                                            <button
                                                type="button"
                                                className={
                                                    styles.confirmYesButton
                                                }
                                                onClick={() =>
                                                    handleConfirmCancel(
                                                        selectedDraft.campaignId,
                                                    )
                                                }
                                                disabled={
                                                    cancelLoadingId ===
                                                    selectedDraft.campaignId
                                                }
                                            >
                                                כן, בטל טיוטה
                                            </button>
                                            <button
                                                type="button"
                                                className={
                                                    styles.confirmNoButton
                                                }
                                                onClick={() =>
                                                    setConfirmingCancelId(null)
                                                }
                                                disabled={
                                                    cancelLoadingId ===
                                                    selectedDraft.campaignId
                                                }
                                            >
                                                לא, השאר
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.cancelButton}
                                        onClick={() =>
                                            setConfirmingCancelId(
                                                selectedDraft.campaignId,
                                            )
                                        }
                                    >
                                        בטל טיוטה
                                    </button>
                                )
                            ) : null}

                            {selectedDraft.status === "draft" ? (
                                <div className={styles.startPrepBlock}>
                                    <h4 className={styles.detailTitle}>
                                        הכנת קמפיין לשליחה
                                    </h4>
                                    <p className={styles.startPrepHelper}>
                                        הפעולה תיצור רשומות שליחה טכניות בעתיד,
                                        אך אינה שולחת אימיילים בשלב זה.
                                    </p>
                                    <p className={styles.startPrepNote}>
                                        שליחה אמיתית תופעל רק בשלב נפרד.
                                    </p>
                                    <button
                                        type="button"
                                        className={styles.startPrepButton}
                                        disabled
                                    >
                                        יצירת רשומות שליחה
                                    </button>
                                </div>
                            ) : null}

                            {selectedDraft.status === "draft" ? (
                                <div className={styles.deleteBlock}>
                                    {deleteError ? (
                                        <p
                                            className={styles.error}
                                            role="alert"
                                        >
                                            {deleteError}
                                        </p>
                                    ) : null}

                                    {confirmingDeleteId ===
                                    selectedDraft.campaignId ? (
                                        <div
                                            className={styles.confirmBox}
                                            role="group"
                                            aria-label="אישור מחיקה"
                                        >
                                            <span
                                                className={styles.confirmText}
                                            >
                                                הפעולה תמחק את הטיוטה רק אם
                                                עדיין לא נוצרו לה רשומות שליחה.
                                                לא ניתן לשחזר.
                                            </span>
                                            <div
                                                className={
                                                    styles.confirmActions
                                                }
                                            >
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.confirmYesButton
                                                    }
                                                    onClick={() =>
                                                        handleConfirmDelete(
                                                            selectedDraft.campaignId,
                                                        )
                                                    }
                                                    disabled={
                                                        deleteLoadingId ===
                                                        selectedDraft.campaignId
                                                    }
                                                >
                                                    כן, מחק טיוטה
                                                </button>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.confirmNoButton
                                                    }
                                                    onClick={() =>
                                                        setConfirmingDeleteId(
                                                            null,
                                                        )
                                                    }
                                                    disabled={
                                                        deleteLoadingId ===
                                                        selectedDraft.campaignId
                                                    }
                                                >
                                                    לא, השאר
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.deleteButton}
                                            onClick={() =>
                                                setConfirmingDeleteId(
                                                    selectedDraft.campaignId,
                                                )
                                            }
                                        >
                                            מחיקת טיוטה
                                        </button>
                                    )}
                                </div>
                            ) : null}
                        </>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}
