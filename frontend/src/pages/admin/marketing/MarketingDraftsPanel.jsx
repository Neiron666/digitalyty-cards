import { useCallback, useEffect, useState } from "react";
import {
    listMarketingCampaignDrafts,
    getMarketingCampaignDraft,
    cancelMarketingCampaignDraft,
    checkMarketingCampaignSendReadiness,
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

    // Read-only readiness probe. Stores whitelisted counts only; maps every
    // backend status to a fixed Hebrew string (never renders a message
    // verbatim). This does NOT send email and does NOT start a campaign.
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
                        </>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}
