import { useCallback, useEffect, useState } from "react";
import {
    listMarketingCampaignDrafts,
    getMarketingCampaignDraft,
    cancelMarketingCampaignDraft,
    cancelMarketingCampaignSend,
    startMarketingCampaignSend,
    checkMarketingCampaignSendReadiness,
    getMarketingCampaignSendStatus,
    deleteMarketingCampaign,
} from "../../../services/admin.service";
import styles from "./MarketingDraftsPanel.module.css";

// Allowlisted list-filter statuses (mirrors the backend allowlist). No "all".
const DRAFT_STATUS_OPTIONS = ["draft", "queued", "canceled"];
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

    // Cancel-send flow state (queued detail only). Two-step confirm; backend is
    // SSoT for cancelability. Stores nothing from the response except a fixed
    // success/error string. Never renders a backend message verbatim.
    const [cancelSendLoadingId, setCancelSendLoadingId] = useState(null);
    const [cancelSendError, setCancelSendError] = useState("");
    const [cancelSendResult, setCancelSendResult] = useState("");
    const [confirmingCancelSendId, setConfirmingCancelSendId] = useState(null);

    // Drop cancel-send flow state (confirm/loading/error). cancelSendResult is
    // reset separately so it can persist on the panel status line after reloads.
    function clearCancelSendState() {
        setCancelSendLoadingId(null);
        setCancelSendError("");
        setConfirmingCancelSendId(null);
    }

    // Start-send flow state (draft detail only). Two-step confirm; backend is
    // SSoT (flag gate + draft-only CAS + content/recipient revalidation).
    // Stores nothing from the response except a fixed success/error string.
    // Never renders a backend message verbatim.
    const [startSendLoadingId, setStartSendLoadingId] = useState(null);
    const [startSendError, setStartSendError] = useState("");
    const [startSendResult, setStartSendResult] = useState("");
    const [confirmingStartSendId, setConfirmingStartSendId] = useState(null);

    // Drop start-send flow state (confirm/loading/error). startSendResult is
    // reset separately so it can persist on the panel status line after reloads.
    function clearStartSendState() {
        setStartSendLoadingId(null);
        setStartSendError("");
        setConfirmingStartSendId(null);
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
        clearCancelSendState();
        setCancelSendResult("");
        clearStartSendState();
        setStartSendResult("");
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
        clearCancelSendState();
        setCancelSendResult("");
        clearStartSendState();
        setStartSendResult("");
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

    // Hard-delete — draft or canceled branch. statusAtConfirm is captured at
    // confirm-click time so the correct fixed Hebrew copy is used even after
    // the selectedDraft ref may have changed due to async reloads. The backend
    // is SSoT for deletability — a 404/409 means the open detail is stale, so
    // the list (and, where relevant, the detail) is refreshed. The backend
    // message is never rendered; only fixed Hebrew strings are shown.
    async function handleConfirmDelete(campaignId, statusAtConfirm) {
        if (deleteLoadingId) return;
        setDeleteError("");
        setDeleteResult("");
        setDeleteLoadingId(campaignId);
        // Fixed copy maps — never rendered from backend response.
        const successCopy =
            statusAtConfirm === "canceled"
                ? "הקמפיין נמחק בהצלחה."
                : "הטיוטה נמחקה בהצלחה.";
        const error409Copy =
            statusAtConfirm === "canceled"
                ? "לא ניתן למחוק את הקמפיין כי קיימות רשומות שליחה עם ראיות שליחה או ניסיון שליחה. ניתן למחוק רק קמפיין שבוטל וכל הרשומות שלו בוטלו ללא ראיות."
                : "לא ניתן למחוק את הטיוטה במצב הנוכחי.";
        const errorGenericCopy =
            statusAtConfirm === "canceled"
                ? "מחיקת הקמפיין נכשלה. נסו שוב."
                : "מחיקת הטיוטה נכשלה. נסו שוב.";
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
            setDeleteResult(successCopy);
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
                setDeleteError(error409Copy);
            } else {
                setDeleteError(errorGenericCopy);
            }
        } finally {
            setDeleteLoadingId(null);
        }
    }

    // Start-send — draft-only enqueue. POST /campaigns/:id/start.
    // Backend is SSoT (flag gate + draft-only CAS + server content/recipient
    // revalidation). requestId generated per confirmed attempt; never stored in
    // state. Backend message is never rendered — only fixed Hebrew strings.
    // On success: switches list to queued tab (setDraftsStatus triggers useEffect
    // reload of the list — loadDrafts is NOT called directly after setDraftsStatus
    // to avoid stale-closure capture of the old status). Detail + send-status
    // are refreshed explicitly.
    async function handleConfirmStartSend(campaignId) {
        if (startSendLoadingId) return;
        setStartSendError("");
        setStartSendResult("");
        setStartSendLoadingId(campaignId);
        // requestId is generated per confirmed attempt. Never stored in state.
        // Never rendered. crypto.randomUUID() is available in all modern browsers
        // and in Node 22 (used by Vite dev server). No fallback needed.
        const requestId = crypto.randomUUID();
        try {
            await startMarketingCampaignSend(campaignId, requestId);
            setConfirmingStartSendId(null);
            // Switch the list tab to "queued" so the operator sees the newly
            // queued campaign immediately. setDraftsStatus + setDraftsPage
            // trigger the loadDrafts useEffect — do NOT call loadDrafts() here
            // directly, as the closure would still capture the old draftsStatus.
            setDraftsStatus("queued");
            setDraftsPage(1);
            // Reload detail so the detail panel reflects status:"queued" and
            // the cancel-send block becomes available.
            await loadDetail(campaignId);
            // One-shot send-status refresh so pending counts are visible.
            await handleLoadSendStatus(campaignId);
            // Set AFTER all reloads — loadDetail calls clearStartSendState
            // which would clear this; re-set here so the status line shows it.
            setStartSendResult(
                "הקמפיין עבר למצב ממתין לשליחה. אם מנגנון השליחה פעיל, השליחה תתבצע לפי תצורת המערכת.",
            );
        } catch (e) {
            const httpStatus = e?.response?.status;
            const msg = String(e?.response?.data?.message || "").toLowerCase();
            setConfirmingStartSendId(null);
            if (httpStatus === 409 && msg.includes("disabled")) {
                // Flag is off — fixed copy only; no reload needed.
                setStartSendError("הכנת שליחה אינה פעילה כרגע.");
            } else if (httpStatus === 409) {
                // Stale state — reload list + detail.
                await loadDrafts();
                if (selectedDraftId === campaignId) {
                    await loadDetail(campaignId);
                }
                setStartSendError("הכנת השליחה אינה אפשרית במצב הנוכחי.");
            } else if (httpStatus === 422) {
                setStartSendError("הטיוטה אינה מוכנה לשליחה.");
            } else {
                setStartSendError("הכנת השליחה נכשלה. נסו שוב.");
            }
        } finally {
            setStartSendLoadingId(null);
        }
    }

    // Cancel-send — queued-only rollback. PATCH /campaigns/:id/cancel-send.
    // Backend is SSoT (queued-only CAS). A 404/409 means stale state; list and
    // detail are refreshed. Backend message is never rendered — only fixed
    // Hebrew strings. After success the detail reloads so status becomes
    // "canceled" and the delete cleanup UI becomes available immediately.
    async function handleConfirmCancelSend(campaignId) {
        if (cancelSendLoadingId) return;
        setCancelSendError("");
        setCancelSendResult("");
        setCancelSendLoadingId(campaignId);
        try {
            await cancelMarketingCampaignSend(campaignId);
            setConfirmingCancelSendId(null);
            await loadDrafts();
            if (selectedDraftId === campaignId) {
                await loadDetail(campaignId);
                await handleLoadSendStatus(campaignId);
            }
            // Set AFTER all reloads — loadDetail calls clearCancelSendState
            // which clears cancelSendResult; re-set here so status line shows it.
            setCancelSendResult("הכנת השליחה בוטלה בהצלחה.");
        } catch (e) {
            const httpStatus = e?.response?.status;
            setConfirmingCancelSendId(null);
            await loadDrafts();
            if (selectedDraftId === campaignId) {
                await loadDetail(campaignId);
            }
            // Set AFTER all reloads — same reason as success path above.
            if (httpStatus === 404 || httpStatus === 409) {
                setCancelSendError("לא ניתן לבטל את הכנת השליחה במצב הנוכחי.");
            } else {
                setCancelSendError("ביטול הכנת השליחה נכשל. נסו שוב.");
            }
        } finally {
            setCancelSendLoadingId(null);
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
                                : opt === "queued"
                                  ? "ממתינות לשליחה"
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
                {cancelSendResult ? (
                    <span className={styles.success}>{cancelSendResult}</span>
                ) : null}
                {startSendResult ? (
                    <span className={styles.success}>{startSendResult}</span>
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
                                                    נשלחו:{" "}
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
                                            <p className={styles.muted}>
                                                השליחה מתבצעת באופן אסינכרוני.
                                                כדי לראות סטטוס עדכני יש ללחוץ
                                                על רענון סטטוס.
                                                &#8220;נשלחו&#8221; מציין
                                                שהמערכת קיבלה אישור מהספק.
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
                                        הפעולה תיצור רשומות שליחה לנמענים ותעביר
                                        את הקמפיין למצב ממתין לשליחה. כאשר
                                        מנגנון השליחה פעיל, אימיילים עשויים
                                        להישלח אוטומטית לפי תצורת המערכת.
                                    </p>
                                    {readinessCheckedDraftId ===
                                        selectedDraft.campaignId &&
                                    readinessResult &&
                                    !readinessResult.ready ? (
                                        <p className={styles.startPrepNote}>
                                            הטיוטה אינה מוכנה לשליחה — הבדיקה
                                            היא אינדיקציה בלבד, והשרת יבדוק שוב
                                            בעת ההפעלה.
                                        </p>
                                    ) : null}
                                    {startSendError ? (
                                        <p
                                            className={styles.error}
                                            role="alert"
                                        >
                                            {startSendError}
                                        </p>
                                    ) : null}
                                    {confirmingStartSendId ===
                                    selectedDraft.campaignId ? (
                                        <div
                                            className={styles.confirmBox}
                                            role="group"
                                            aria-label="אישור יצירת רשומות שליחה"
                                        >
                                            <span
                                                className={styles.confirmText}
                                            >
                                                הפעולה תעביר את הקמפיין למצב
                                                ממתין לשליחה. אם מנגנון השליחה
                                                פעיל, אימיילים עשויים להישלח
                                                בהקדם. ניתן לבטל את הקמפיין כדי
                                                לעצור שליחה של נמענים שעדיין
                                                ממתינים.
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
                                                        handleConfirmStartSend(
                                                            selectedDraft.campaignId,
                                                        )
                                                    }
                                                    disabled={
                                                        startSendLoadingId ===
                                                        selectedDraft.campaignId
                                                    }
                                                >
                                                    כן, העבר לממתין לשליחה
                                                </button>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.confirmNoButton
                                                    }
                                                    onClick={() =>
                                                        setConfirmingStartSendId(
                                                            null,
                                                        )
                                                    }
                                                    disabled={
                                                        startSendLoadingId ===
                                                        selectedDraft.campaignId
                                                    }
                                                >
                                                    לא, השאר כטיוטה
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.startPrepButton}
                                            onClick={() =>
                                                setConfirmingStartSendId(
                                                    selectedDraft.campaignId,
                                                )
                                            }
                                            disabled={
                                                startSendLoadingId ===
                                                selectedDraft.campaignId
                                            }
                                        >
                                            יצירת רשומות שליחה
                                        </button>
                                    )}
                                </div>
                            ) : null}

                            {selectedDraft.status === "queued" ? (
                                <div className={styles.cancelSendBlock}>
                                    {cancelSendError ? (
                                        <p
                                            className={styles.error}
                                            role="alert"
                                        >
                                            {cancelSendError}
                                        </p>
                                    ) : null}

                                    {confirmingCancelSendId ===
                                    selectedDraft.campaignId ? (
                                        <div
                                            className={styles.confirmBox}
                                            role="group"
                                            aria-label="אישור ביטול הכנת שליחה"
                                        >
                                            <span
                                                className={styles.confirmText}
                                            >
                                                הפעולה תבטל את הכנת השליחה ותסמן
                                                רשומות ממתינות כמבוטלות.
                                                אימיילים לא יישלחו דרך פעולה זו.
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
                                                        handleConfirmCancelSend(
                                                            selectedDraft.campaignId,
                                                        )
                                                    }
                                                    disabled={
                                                        cancelSendLoadingId ===
                                                        selectedDraft.campaignId
                                                    }
                                                >
                                                    כן, בטל הכנת שליחה
                                                </button>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.confirmNoButton
                                                    }
                                                    onClick={() =>
                                                        setConfirmingCancelSendId(
                                                            null,
                                                        )
                                                    }
                                                    disabled={
                                                        cancelSendLoadingId ===
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
                                            className={styles.cancelSendButton}
                                            onClick={() =>
                                                setConfirmingCancelSendId(
                                                    selectedDraft.campaignId,
                                                )
                                            }
                                            disabled={
                                                cancelSendLoadingId ===
                                                selectedDraft.campaignId
                                            }
                                        >
                                            ביטול הכנת שליחה
                                        </button>
                                    )}
                                </div>
                            ) : null}

                            {selectedDraft.status === "draft" ||
                            selectedDraft.status === "canceled" ? (
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
                                            aria-label={
                                                selectedDraft.status ===
                                                "canceled"
                                                    ? "אישור מחיקת קמפיין שבוטל"
                                                    : "אישור מחיקה"
                                            }
                                        >
                                            <span
                                                className={styles.confirmText}
                                            >
                                                {selectedDraft.status ===
                                                "canceled"
                                                    ? "הפעולה תמחק את הקמפיין שבוטל ואת רשומות השליחה הטכניות שמותר למחוק. לא ניתן לשחזר."
                                                    : "הפעולה תמחק את הטיוטה רק אם עדיין לא נוצרו לה רשומות שליחה. לא ניתן לשחזר."}
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
                                                            selectedDraft.status,
                                                        )
                                                    }
                                                    disabled={
                                                        deleteLoadingId ===
                                                        selectedDraft.campaignId
                                                    }
                                                >
                                                    {selectedDraft.status ===
                                                    "canceled"
                                                        ? "כן, מחק קמפיין שבוטל"
                                                        : "כן, מחק טיוטה"}
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
                                            {selectedDraft.status === "canceled"
                                                ? "מחיקת קמפיין שבוטל"
                                                : "מחיקת טיוטה"}
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
