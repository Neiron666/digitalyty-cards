import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    getMyLeads,
    markLeadRead,
    updateLeadFlags,
    hardDeleteLead,
} from "../services/leads.service";
import {
    getMyBookings,
    approveMyBooking,
    cancelMyBooking,
} from "../services/bookings.service";
import useUnreadCount from "../hooks/useUnreadCount";
import styles from "./Inbox.module.css";

const VIEWS = [
    { key: "active", label: "הכל" },
    { key: "important", label: "חשובים" },
    { key: "archived", label: "ארכיון" },
    { key: "trash", label: "פח" },
];

const CATEGORIES = [
    { key: "leads", label: "פניות" },
    { key: "bookings", label: "בקשות תיאום" },
    { key: "futureMeetings", label: "פגישות עתידיות" },
];

const STATUS_LABELS = {
    pending: "ממתין",
    approved: "מאושר",
    canceled: "בוטל",
    expired: "פג תוקף",
};

const STATUS_CLASS_MAP = {
    pending: "badgePending",
    approved: "badgeApproved",
    canceled: "badgeCanceled",
    expired: "badgeExpired",
};

function formatDate(iso) {
    try {
        return new Date(iso).toLocaleString("he-IL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return String(iso);
    }
}

function safeStr(v) {
    return String(v ?? "").trim();
}

export default function Inbox() {
    const { isAuthenticated } = useAuth();
    const { adjustUnreadCount, refresh } = useUnreadCount();

    const [activeCategory, setActiveCategory] = useState("leads");
    const [activeView, setActiveView] = useState("active");
    const [leads, setLeads] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [fetchError, setFetchError] = useState(false);
    const viewRef = useRef(activeView);

    const [bookings, setBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [bookingsError, setBookingsError] = useState(false);
    const [bookingsExpandedId, setBookingsExpandedId] = useState(null);
    const [bookingActionError, setBookingActionError] = useState("");
    const bookingActionTimerRef = useRef(null);

    const loadLeads = useCallback(
        async ({ reset } = {}) => {
            try {
                if (reset) {
                    setLoading(true);
                    setFetchError(false);
                    setLeads([]);
                    setNextCursor(null);
                    setExpandedId(null);
                }

                const cursor = reset ? null : nextCursor;
                const data = await getMyLeads({
                    cursor,
                    limit: 20,
                    view: viewRef.current,
                });

                setLeads((prev) =>
                    reset ? data.leads || [] : [...prev, ...(data.leads || [])],
                );
                setNextCursor(data.nextCursor || null);
            } catch {
                setFetchError(true);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [nextCursor],
    );

    const loadMore = useCallback(async () => {
        if (loadingMore || !nextCursor) return;
        setLoadingMore(true);
        await loadLeads({ reset: false });
    }, [loadingMore, nextCursor, loadLeads]);

    const handleCategoryChange = useCallback((key) => {
        setActiveCategory(key);
        setFetchError(false);
        setExpandedId(null);
        setBookingsExpandedId(null);
    }, []);

    const handleToggle = useCallback(
        (lead) => {
            const id = safeStr(lead?._id);
            setExpandedId((prev) => (prev === id ? null : id));

            if (id && !lead.readAt && activeView !== "trash") {
                markLeadRead(id).catch(() => {});
                setLeads((prev) =>
                    prev.map((l) =>
                        safeStr(l._id) === id
                            ? { ...l, readAt: new Date().toISOString() }
                            : l,
                    ),
                );
                if (activeView === "active" || activeView === "important") {
                    adjustUnreadCount(-1);
                }
            }
        },
        [activeView, adjustUnreadCount],
    );

    const handleFlag = useCallback(
        async (leadId, patch) => {
            const id = safeStr(leadId);
            if (!id) return;

            const prevLead = leads.find((l) => safeStr(l._id) === id);

            // Optimistic merge
            setLeads((prev) =>
                prev.map((l) =>
                    safeStr(l._id) === id ? { ...l, ...patch } : l,
                ),
            );

            try {
                await updateLeadFlags(id, patch);

                // After success: remove lead from local list if it moved to another tab
                const shouldRemove =
                    (patch.archivedAt && activeView !== "archived") ||
                    (!patch.archivedAt &&
                        "archivedAt" in patch &&
                        activeView === "archived") ||
                    (patch.deletedAt && activeView !== "trash") ||
                    (patch.isImportant === false && activeView === "important");

                if (shouldRemove) {
                    setLeads((prev) =>
                        prev.filter((l) => safeStr(l._id) !== id),
                    );
                    if (
                        prevLead &&
                        !prevLead.readAt &&
                        (activeView === "active" || activeView === "important")
                    ) {
                        adjustUnreadCount(-1);
                    }
                }
            } catch {
                // Rollback optimistic merge
                setLeads((prev) =>
                    prevLead
                        ? prev.map((l) =>
                              safeStr(l._id) === id ? prevLead : l,
                          )
                        : prev,
                );
            }
        },
        [leads, activeView, adjustUnreadCount],
    );

    const handleHardDelete = useCallback(
        async (leadId) => {
            const id = safeStr(leadId);
            if (!id) return;

            const prevLead = leads.find((l) => safeStr(l._id) === id);
            setLeads((prev) => prev.filter((l) => safeStr(l._id) !== id));

            try {
                await hardDeleteLead(id);
                if (prevLead && !prevLead.readAt) adjustUnreadCount(-1);
            } catch {
                setLeads((prev) => (prevLead ? [prevLead, ...prev] : prev));
            }
        },
        [leads, adjustUnreadCount],
    );

    const loadBookings = useCallback(async () => {
        setBookingsLoading(true);
        setBookingsError(false);

        try {
            const data = await getMyBookings(null, { limit: 50 });
            setBookings(data?.bookings || []);
        } catch {
            setBookingsError(true);
        } finally {
            setBookingsLoading(false);
        }
    }, []);

    const handleRetry = useCallback(() => {
        setFetchError(false);
        setBookingsError(false);
        if (activeCategory === "leads") {
            loadLeads({ reset: true });
        } else {
            // bookings / futureMeetings share the same data source
            loadBookings();
        }
    }, [activeCategory, loadLeads, loadBookings]);

    useEffect(() => {
        viewRef.current = activeView;
        if (activeCategory !== "leads") return;
        loadLeads({ reset: true });
    }, [activeView, activeCategory, loadLeads]);

    useEffect(() => {
        if (
            activeCategory !== "bookings" &&
            activeCategory !== "futureMeetings"
        )
            return;
        loadBookings();
    }, [activeCategory, loadBookings]);

    const handleBookingAction = useCallback(
        async (bookingId, action) => {
            const id = safeStr(bookingId);
            if (!id) return;

            setBookingActionError("");
            clearTimeout(bookingActionTimerRef.current);

            try {
                if (action === "approve") await approveMyBooking(id);
                if (action === "cancel") await cancelMyBooking(id);
            } catch (err) {
                const code = err?.response?.data?.code;
                const msg =
                    code === "INVALID_STATUS"
                        ? "הבקשה כבר אינה תקפה."
                        : "לא ניתן לבצע את הפעולה כרגע.";
                setBookingActionError(msg);
                bookingActionTimerRef.current = setTimeout(
                    () => setBookingActionError(""),
                    6000,
                );
            }

            // Refresh inbox list and header badge in parallel.
            await loadBookings();
            refresh();
        },
        [loadBookings, refresh],
    );

    function formatRequestedBooking(booking) {
        const dateKey = safeStr(booking?.dateKeyIl);
        const localStart = safeStr(booking?.localStartHHmm);
        if (dateKey && localStart) return `${dateKey} בשעה ${localStart}`;
        if (booking?.startAt) return formatDate(booking.startAt);
        return "";
    }

    const tabBar = useMemo(() => {
        return (
            <nav className={styles.tabs} aria-label="תיבות">
                {VIEWS.map((v) => (
                    <button
                        key={v.key}
                        type="button"
                        className={`${styles.tab} ${activeView === v.key ? styles.tabActive : ""}`}
                        onClick={() => setActiveView(v.key)}
                        aria-current={activeView === v.key ? "page" : undefined}
                    >
                        {v.label}
                    </button>
                ))}
            </nav>
        );
    }, [activeView]);

    const categoryBar = useMemo(() => {
        return (
            <nav className={styles.categoryTabs} aria-label="סוג הודעות">
                {CATEGORIES.map((c) => (
                    <button
                        key={c.key}
                        type="button"
                        className={`${styles.categoryTab} ${activeCategory === c.key ? styles.categoryTabActive : ""}`}
                        onClick={() => handleCategoryChange(c.key)}
                        aria-current={
                            activeCategory === c.key ? "page" : undefined
                        }
                    >
                        {c.label}
                    </button>
                ))}
            </nav>
        );
    }, [activeCategory, handleCategoryChange]);

    const nowMs = Date.now();

    const requestBookings = useMemo(
        () =>
            bookings.filter((b) => {
                const st = safeStr(b.status);
                return (
                    st === "pending" || st === "canceled" || st === "expired"
                );
            }),
        [bookings],
    );

    const futureMeetings = useMemo(
        () =>
            bookings.filter((b) => {
                if (safeStr(b.status) !== "approved") return false;
                const end = b.endAt ? new Date(b.endAt).getTime() : 0;
                return end > nowMs;
            }),
        [bookings, nowMs],
    );

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    const isLeadsEmptyState =
        activeCategory === "leads" &&
        !loading &&
        !fetchError &&
        leads.length === 0;

    const leadsEmptyText =
        (activeView === "important" && "אין הודעות חשובות") ||
        (activeView === "archived" && "אין הודעות בארכיון") ||
        (activeView === "trash" && "הפח ריק") ||
        "אין הודעות";

    return (
        <main className={styles.main}>
            <h1 className={styles.heading}>הודעות נכנסות</h1>
            {categoryBar}

            {activeCategory === "leads" ? tabBar : null}

            {activeCategory === "leads" && loading ? (
                <p className={styles.loading}>טוען…</p>
            ) : null}

            {activeCategory === "leads" && fetchError ? (
                <div className={styles.errorWrap}>
                    <p className={styles.errorText}>
                        אירעה שגיאה בטעינת ההודעות
                    </p>
                    <button
                        type="button"
                        className={styles.retryBtn}
                        onClick={handleRetry}
                    >
                        נסה שנית
                    </button>
                </div>
            ) : null}

            {isLeadsEmptyState ? (
                <p className={styles.empty}>{leadsEmptyText}</p>
            ) : null}

            {activeCategory === "leads" &&
            !loading &&
            !fetchError &&
            leads.length > 0 ? (
                <>
                    <ul className={styles.list}>
                        {leads.map((lead) => {
                            const id = safeStr(lead._id);
                            const isExpanded = expandedId === id;
                            const isUnread = !lead.readAt;

                            return (
                                <li key={id} className={styles.item}>
                                    <button
                                        type="button"
                                        className={`${styles.card} ${isUnread ? styles.unread : ""}`}
                                        onClick={() => handleToggle(lead)}
                                        aria-expanded={isExpanded}
                                    >
                                        <div className={styles.row}>
                                            <div className={styles.meta}>
                                                <div className={styles.name}>
                                                    {lead.senderName ||
                                                        "(ללא שם)"}
                                                </div>
                                                <div className={styles.date}>
                                                    {formatDate(lead.createdAt)}
                                                </div>
                                            </div>
                                            {isUnread ? (
                                                <span className={styles.badge}>
                                                    חדש
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className={styles.preview}>
                                            {lead.message ||
                                                lead.senderEmail ||
                                                lead.senderPhone}
                                        </div>
                                    </button>

                                    {isExpanded ? (
                                        <div className={styles.details}>
                                            {lead.senderEmail ? (
                                                <div
                                                    className={
                                                        styles.detailLine
                                                    }
                                                >
                                                    אימייל: {lead.senderEmail}
                                                </div>
                                            ) : null}
                                            {lead.senderPhone ? (
                                                <div
                                                    className={
                                                        styles.detailLine
                                                    }
                                                >
                                                    טלפון: {lead.senderPhone}
                                                </div>
                                            ) : null}
                                            {lead.message ? (
                                                <div
                                                    className={
                                                        styles.detailLine
                                                    }
                                                >
                                                    הודעה: {lead.message}
                                                </div>
                                            ) : null}

                                            <div className={styles.actions}>
                                                {activeView !== "trash" ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.actionBtn
                                                            }
                                                            onClick={() =>
                                                                handleFlag(id, {
                                                                    isImportant:
                                                                        !lead.isImportant,
                                                                })
                                                            }
                                                        >
                                                            {lead.isImportant
                                                                ? "הסר חשוב"
                                                                : "סמן חשוב"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.actionBtn
                                                            }
                                                            onClick={() =>
                                                                handleFlag(id, {
                                                                    archivedAt:
                                                                        !lead.archivedAt,
                                                                })
                                                            }
                                                        >
                                                            {lead.archivedAt
                                                                ? "בטל ארכיון"
                                                                : "העבר לארכיון"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.dangerBtn
                                                            }
                                                            onClick={() =>
                                                                handleFlag(id, {
                                                                    deletedAt: true,
                                                                })
                                                            }
                                                        >
                                                            העבר לפח
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.dangerBtn
                                                        }
                                                        onClick={() =>
                                                            handleHardDelete(id)
                                                        }
                                                    >
                                                        מחיקה סופית
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>

                    {nextCursor ? (
                        <button
                            type="button"
                            className={styles.loadMoreBtn}
                            onClick={loadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? "טוען…" : "טען עוד"}
                        </button>
                    ) : null}
                </>
            ) : null}

            {(activeCategory === "bookings" ||
                activeCategory === "futureMeetings") &&
            bookingActionError ? (
                <p className={styles.errorText}>{bookingActionError}</p>
            ) : null}

            {(activeCategory === "bookings" ||
                activeCategory === "futureMeetings") &&
            bookingsLoading ? (
                <p className={styles.loading}>
                    {activeCategory === "futureMeetings"
                        ? "טוען פגישות…"
                        : "טוען בקשות תיאום…"}
                </p>
            ) : null}

            {(activeCategory === "bookings" ||
                activeCategory === "futureMeetings") &&
            bookingsError ? (
                <div className={styles.errorWrap}>
                    <p className={styles.errorText}>
                        {activeCategory === "futureMeetings"
                            ? "אירעה שגיאה בטעינת הפגישות"
                            : "אירעה שגיאה בטעינת בקשות התיאום"}
                    </p>
                    <button
                        type="button"
                        className={styles.retryBtn}
                        onClick={handleRetry}
                    >
                        נסה שנית
                    </button>
                </div>
            ) : null}

            {(activeCategory === "bookings" ||
                activeCategory === "futureMeetings") &&
            !bookingsLoading &&
            !bookingsError ? (
                <p className={styles.retentionNote}>
                    רשומות נשמרות כ-7 ימים לאחר סיום מועד הפגישה ונמחקות
                    אוטומטית.
                </p>
            ) : null}

            {activeCategory === "bookings" &&
            !bookingsLoading &&
            !bookingsError &&
            requestBookings.length === 0 ? (
                <p className={styles.empty}>אין בקשות תיאום להצגה</p>
            ) : null}

            {activeCategory === "bookings" &&
            !bookingsLoading &&
            !bookingsError &&
            requestBookings.length > 0 ? (
                <ul className={styles.list}>
                    {requestBookings.map((b) => {
                        const id = safeStr(b._id);
                        const isExpanded = bookingsExpandedId === id;
                        const status = safeStr(b.status || b.state || "");
                        const statusLabel = STATUS_LABELS[status] || status;
                        const statusCls = STATUS_CLASS_MAP[status] || "";
                        const createdAt = b.createdAt || b.requestedAt;
                        const requestedSlot = formatRequestedBooking(b);

                        const cardMeta =
                            b?.cardMeta && typeof b.cardMeta === "object"
                                ? b.cardMeta
                                : null;
                        const cardLabel = safeStr(cardMeta?.cardLabel);
                        const cardSlug = safeStr(cardMeta?.slug);

                        const canApprove = status === "pending";
                        const canCancel =
                            status === "pending" || status === "approved";

                        return (
                            <li key={id} className={styles.item}>
                                <button
                                    type="button"
                                    className={styles.card}
                                    onClick={() =>
                                        setBookingsExpandedId((prev) =>
                                            prev === id ? null : id,
                                        )
                                    }
                                    aria-expanded={isExpanded}
                                >
                                    <div className={styles.row}>
                                        <div className={styles.meta}>
                                            <div className={styles.name}>
                                                {b.name ||
                                                    b.customerName ||
                                                    "(ללא שם)"}
                                            </div>
                                            <div className={styles.date}>
                                                {createdAt
                                                    ? formatDate(createdAt)
                                                    : ""}
                                            </div>
                                        </div>
                                        {status ? (
                                            <span
                                                className={`${styles.badge} ${statusCls ? styles[statusCls] : ""}`}
                                            >
                                                {statusLabel}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className={styles.preview}>
                                        {cardLabel
                                            ? `כרטיס: ${cardLabel}`
                                            : cardSlug
                                              ? `כרטיס: ${cardSlug}`
                                              : null}
                                        {cardLabel || cardSlug ? " · " : ""}
                                        {b.note ||
                                            b.message ||
                                            b.phone ||
                                            b.email ||
                                            "בקשת תיאום"}
                                    </div>
                                </button>

                                {isExpanded ? (
                                    <div className={styles.details}>
                                        {b.email ? (
                                            <div className={styles.detailLine}>
                                                אימייל: {b.email}
                                            </div>
                                        ) : null}
                                        {b.phone ? (
                                            <div className={styles.detailLine}>
                                                טלפון: {b.phone}
                                            </div>
                                        ) : null}
                                        {b.note ? (
                                            <div className={styles.detailLine}>
                                                הערה: {b.note}
                                            </div>
                                        ) : null}
                                        {createdAt ? (
                                            <div className={styles.detailLine}>
                                                נוצרה: {formatDate(createdAt)}
                                            </div>
                                        ) : null}
                                        {requestedSlot ? (
                                            <div className={styles.detailLine}>
                                                מועד מבוקש: {requestedSlot}
                                            </div>
                                        ) : null}

                                        <div className={styles.actions}>
                                            <button
                                                type="button"
                                                className={styles.actionBtn}
                                                disabled={!canApprove}
                                                onClick={() =>
                                                    handleBookingAction(
                                                        id,
                                                        "approve",
                                                    )
                                                }
                                            >
                                                אשר
                                            </button>
                                            <button
                                                type="button"
                                                className={
                                                    styles.actionBtnDanger
                                                }
                                                disabled={!canCancel}
                                                onClick={() =>
                                                    handleBookingAction(
                                                        id,
                                                        "cancel",
                                                    )
                                                }
                                            >
                                                בטל
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            ) : null}

            {activeCategory === "futureMeetings" &&
            !bookingsLoading &&
            !bookingsError &&
            futureMeetings.length === 0 ? (
                <p className={styles.empty}>אין פגישות עתידיות</p>
            ) : null}

            {activeCategory === "futureMeetings" &&
            !bookingsLoading &&
            !bookingsError &&
            futureMeetings.length > 0 ? (
                <ul className={styles.list}>
                    {futureMeetings.map((b) => {
                        const id = safeStr(b._id);
                        const isExpanded = bookingsExpandedId === id;
                        const createdAt = b.createdAt || b.requestedAt;
                        const requestedSlot = formatRequestedBooking(b);

                        const cardMeta =
                            b?.cardMeta && typeof b.cardMeta === "object"
                                ? b.cardMeta
                                : null;
                        const cardLabel = safeStr(cardMeta?.cardLabel);
                        const cardSlug = safeStr(cardMeta?.slug);

                        return (
                            <li key={id} className={styles.item}>
                                <button
                                    type="button"
                                    className={styles.card}
                                    onClick={() =>
                                        setBookingsExpandedId((prev) =>
                                            prev === id ? null : id,
                                        )
                                    }
                                    aria-expanded={isExpanded}
                                >
                                    <div className={styles.row}>
                                        <div className={styles.meta}>
                                            <div className={styles.name}>
                                                {b.name ||
                                                    b.customerName ||
                                                    "(ללא שם)"}
                                            </div>
                                            {requestedSlot ? (
                                                <div className={styles.date}>
                                                    {requestedSlot}
                                                </div>
                                            ) : null}
                                        </div>
                                        <span
                                            className={`${styles.badge} ${styles.badgeApproved}`}
                                        >
                                            {STATUS_LABELS.approved}
                                        </span>
                                    </div>
                                    <div className={styles.preview}>
                                        {cardLabel
                                            ? `כרטיס: ${cardLabel}`
                                            : cardSlug
                                              ? `כרטיס: ${cardSlug}`
                                              : null}
                                        {cardLabel || cardSlug ? " · " : ""}
                                        {b.note ||
                                            b.message ||
                                            b.phone ||
                                            b.email ||
                                            "פגישה מאושרת"}
                                    </div>
                                </button>

                                {isExpanded ? (
                                    <div className={styles.details}>
                                        {b.phone ? (
                                            <div className={styles.detailLine}>
                                                טלפון: {b.phone}
                                            </div>
                                        ) : null}
                                        {b.email ? (
                                            <div className={styles.detailLine}>
                                                אימייל: {b.email}
                                            </div>
                                        ) : null}
                                        {b.note ? (
                                            <div className={styles.detailLine}>
                                                הערה: {b.note}
                                            </div>
                                        ) : null}
                                        {createdAt ? (
                                            <div className={styles.detailLine}>
                                                נוצרה: {formatDate(createdAt)}
                                            </div>
                                        ) : null}
                                        {requestedSlot ? (
                                            <div className={styles.detailLine}>
                                                מועד מבוקש: {requestedSlot}
                                            </div>
                                        ) : null}

                                        <div className={styles.actions}>
                                            <button
                                                type="button"
                                                className={
                                                    styles.actionBtnDanger
                                                }
                                                onClick={() =>
                                                    handleBookingAction(
                                                        id,
                                                        "cancel",
                                                    )
                                                }
                                            >
                                                בטל פגישה
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </main>
    );
}
