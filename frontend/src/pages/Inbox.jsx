import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    getMyLeads,
    markLeadRead,
    updateLeadFlags,
    hardDeleteLead,
} from "../services/leads.service";
import useUnreadCount from "../hooks/useUnreadCount";
import styles from "./Inbox.module.css";

const VIEWS = [
    { key: "active", label: "הכל" },
    { key: "important", label: "חשובים" },
    { key: "archived", label: "ארכיון" },
    { key: "trash", label: "פח" },
];

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

export default function Inbox() {
    const { isAuthenticated } = useAuth();
    const { adjustUnreadCount } = useUnreadCount();

    const [activeView, setActiveView] = useState("active");
    const [leads, setLeads] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [fetchError, setFetchError] = useState(false);
    const viewRef = useRef(activeView);

    const fetchLeads = useCallback(async (cursor, view) => {
        const data = await getMyLeads({ cursor, limit: 20, view });
        return data;
    }, []);

    // Load leads for current view.
    const loadView = useCallback(
        async (view) => {
            setLoading(true);
            setFetchError(false);
            setExpandedId(null);
            try {
                const data = await fetchLeads(null, view);
                if (viewRef.current !== view) return;
                setLeads(data.leads || []);
                setNextCursor(data.nextCursor || null);
            } catch {
                if (viewRef.current === view) setFetchError(true);
            } finally {
                if (viewRef.current === view) setLoading(false);
            }
        },
        [fetchLeads],
    );

    // Initial load + view change.
    useEffect(() => {
        viewRef.current = activeView;
        loadView(activeView);
    }, [activeView, loadView]);

    // Retry after error.
    const handleRetry = useCallback(() => {
        loadView(activeView);
    }, [activeView, loadView]);

    // Load more.
    const handleLoadMore = useCallback(async () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const data = await fetchLeads(nextCursor, activeView);
            setLeads((prev) => [...prev, ...(data.leads || [])]);
            setNextCursor(data.nextCursor || null);
        } catch {
            setFetchError(true);
        } finally {
            setLoadingMore(false);
        }
    }, [nextCursor, loadingMore, fetchLeads, activeView]);

    // Expand + mark read (active/important views only).
    const handleToggle = useCallback(
        (lead) => {
            const id = String(lead._id);
            setExpandedId((prev) => (prev === id ? null : id));

            if (!lead.readAt && activeView !== "trash") {
                markLeadRead(id).catch(() => {});
                setLeads((prev) =>
                    prev.map((l) =>
                        String(l._id) === id
                            ? { ...l, readAt: new Date().toISOString() }
                            : l,
                    ),
                );
                if (activeView === "active" || activeView === "important") {
                    adjustUnreadCount(-1);
                }
            }
        },
        [adjustUnreadCount, activeView],
    );

    // ── Flag actions (optimistic) ──────────────────────────────────

    const handleFlag = useCallback(
        (lead, flags) => {
            const id = String(lead._id);
            const wasUnread = !lead.readAt;
            const wasActive =
                activeView === "active" || activeView === "important";

            updateLeadFlags(id, flags).catch(() => {});

            // Determine if lead should be removed from current view.
            const willRemove =
                (flags.archivedAt === true && activeView !== "archived") ||
                (flags.archivedAt === false && activeView === "archived") ||
                (flags.deletedAt === true && activeView !== "trash") ||
                (flags.deletedAt === false && activeView === "trash");

            if (willRemove) {
                setLeads((prev) => prev.filter((l) => String(l._id) !== id));
                if (expandedId === id) setExpandedId(null);

                // Badge adjustment: if unread lead leaves/enters active.
                if (wasUnread && wasActive) {
                    adjustUnreadCount(-1);
                }
                if (
                    wasUnread &&
                    (flags.deletedAt === false || flags.archivedAt === false)
                ) {
                    // Restoring to active — bump badge.
                    adjustUnreadCount(+1);
                }
            } else {
                // In-place update.
                setLeads((prev) =>
                    prev.map((l) => {
                        if (String(l._id) !== id) return l;
                        const updated = { ...l };
                        if (flags.readAt === true)
                            updated.readAt = new Date().toISOString();
                        if (flags.readAt === false) updated.readAt = null;
                        if (flags.isImportant !== undefined)
                            updated.isImportant = flags.isImportant;
                        if (flags.archivedAt === true)
                            updated.archivedAt = new Date().toISOString();
                        if (flags.archivedAt === false)
                            updated.archivedAt = null;
                        if (flags.deletedAt === true)
                            updated.deletedAt = new Date().toISOString();
                        if (flags.deletedAt === false) updated.deletedAt = null;
                        return updated;
                    }),
                );

                // Badge: read/unread toggle in active view.
                if (wasActive) {
                    if (flags.readAt === true && wasUnread) {
                        adjustUnreadCount(-1);
                    }
                    if (flags.readAt === false && !wasUnread) {
                        adjustUnreadCount(+1);
                    }
                }
            }
        },
        [activeView, expandedId, adjustUnreadCount],
    );

    // Tab switch.
    const handleTabChange = useCallback((view) => {
        setActiveView(view);
    }, []);

    // Hard delete (trash only, with confirm).
    const handleHardDelete = useCallback(
        async (lead) => {
            const ok = window.confirm(
                "\u05DC\u05DE\u05D7\u05D5\u05E7 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA? \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05D7\u05D6\u05E8.",
            );
            if (!ok) return;

            const id = String(lead._id);
            try {
                await hardDeleteLead(id);
                setLeads((prev) => prev.filter((l) => String(l._id) !== id));
                if (expandedId === id) setExpandedId(null);
            } catch {
                // best-effort; lead stays in list on failure
            }
        },
        [expandedId],
    );

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // ── Render ─────────────────────────────────────────────────────

    const tabBar = (
        <nav className={styles.tabs} aria-label="תצוגת הודעות">
            {VIEWS.map((v) => (
                <button
                    key={v.key}
                    type="button"
                    className={`${styles.tab} ${activeView === v.key ? styles.tabActive : ""}`}
                    onClick={() => handleTabChange(v.key)}
                    aria-current={activeView === v.key ? "page" : undefined}
                >
                    {v.label}
                </button>
            ))}
        </nav>
    );

    if (loading) {
        return (
            <main className={styles.main}>
                <h1 className={styles.heading}>הודעות נכנסות</h1>
                {tabBar}
                <p className={styles.loading}>טוען הודעות…</p>
            </main>
        );
    }

    if (fetchError && leads.length === 0) {
        return (
            <main className={styles.main}>
                <h1 className={styles.heading}>הודעות נכנסות</h1>
                {tabBar}
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
            </main>
        );
    }

    if (leads.length === 0) {
        return (
            <main className={styles.main}>
                <h1 className={styles.heading}>הודעות נכנסות</h1>
                {tabBar}
                <p className={styles.empty}>
                    {activeView === "active" && "אין הודעות נכנסות עדיין"}
                    {activeView === "important" && "אין הודעות חשובות"}
                    {activeView === "archived" && "אין הודעות בארכיון"}
                    {activeView === "trash" && "הפח ריק"}
                </p>
            </main>
        );
    }

    return (
        <main className={styles.main}>
            <h1 className={styles.heading}>הודעות נכנסות</h1>
            {tabBar}

            <ul className={styles.list}>
                {leads.map((lead) => {
                    const id = String(lead._id);
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
                                <span className={styles.senderRow}>
                                    {isUnread && (
                                        <span
                                            className={styles.dot}
                                            aria-label="לא נקראה"
                                        />
                                    )}
                                    <span className={styles.label}>מאת:</span>
                                    <span className={styles.senderName}>
                                        {lead.senderName}
                                    </span>
                                    <span
                                        className={`${styles.statusPill} ${isUnread ? styles.statusPillUnread : ""}`}
                                    >
                                        {isUnread ? "לא נקרא" : "נקרא"}
                                    </span>
                                    {lead.isImportant && (
                                        <span
                                            className={styles.starBadge}
                                            aria-label="חשוב"
                                        >
                                            ★
                                        </span>
                                    )}
                                    {lead.card?.slug && (
                                        <span className={styles.cardSlug}>
                                            כרטיס: {lead.card.slug}
                                        </span>
                                    )}
                                    <span className={styles.chevron}>
                                        {isExpanded ? "▾" : "◂"}
                                    </span>
                                </span>

                                {lead.message && (
                                    <span className={styles.preview}>
                                        {lead.message.length > 80
                                            ? lead.message.slice(0, 80) + "…"
                                            : lead.message}
                                    </span>
                                )}

                                <span className={styles.date}>
                                    {formatDate(lead.createdAt)}
                                </span>
                            </button>

                            {isExpanded && (
                                <div className={styles.detail}>
                                    <p className={styles.detailField}>
                                        <span className={styles.detailLabel}>
                                            מאת:
                                        </span>{" "}
                                        {lead.senderName}
                                    </p>
                                    {lead.message && (
                                        <p className={styles.detailMessage}>
                                            {lead.message}
                                        </p>
                                    )}
                                    <p className={styles.detailField}>
                                        <span className={styles.detailLabel}>
                                            אימייל:
                                        </span>{" "}
                                        {lead.senderEmail ? (
                                            <a
                                                href={`mailto:${lead.senderEmail}`}
                                                className={styles.detailLink}
                                            >
                                                {lead.senderEmail}
                                            </a>
                                        ) : (
                                            <span
                                                className={styles.placeholder}
                                            >
                                                לא סופק
                                            </span>
                                        )}
                                    </p>
                                    <p className={styles.detailField}>
                                        <span className={styles.detailLabel}>
                                            טלפון:
                                        </span>{" "}
                                        {lead.senderPhone ? (
                                            <a
                                                href={`tel:${lead.senderPhone}`}
                                                className={styles.detailLink}
                                            >
                                                {lead.senderPhone}
                                            </a>
                                        ) : (
                                            <span
                                                className={styles.placeholder}
                                            >
                                                לא סופק
                                            </span>
                                        )}
                                    </p>

                                    {/* ── Action bar ── */}
                                    <div className={styles.actionBar}>
                                        <button
                                            type="button"
                                            className={styles.actionBtn}
                                            onClick={() =>
                                                handleFlag(lead, {
                                                    readAt: isUnread,
                                                })
                                            }
                                        >
                                            {isUnread
                                                ? "סמן כנקרא"
                                                : "סמן כלא נקרא"}
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.actionBtn}
                                            onClick={() =>
                                                handleFlag(lead, {
                                                    isImportant:
                                                        !lead.isImportant,
                                                })
                                            }
                                        >
                                            {lead.isImportant
                                                ? "★ חשוב"
                                                : "☆ חשוב"}
                                        </button>
                                        {activeView !== "trash" && (
                                            <button
                                                type="button"
                                                className={styles.actionBtn}
                                                onClick={() =>
                                                    handleFlag(lead, {
                                                        archivedAt:
                                                            activeView ===
                                                            "archived"
                                                                ? false
                                                                : true,
                                                    })
                                                }
                                            >
                                                {activeView === "archived"
                                                    ? "הוצא מארכיון"
                                                    : "ארכיון"}
                                            </button>
                                        )}
                                        {activeView === "trash" ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className={styles.actionBtn}
                                                    onClick={() =>
                                                        handleFlag(lead, {
                                                            deletedAt: false,
                                                        })
                                                    }
                                                >
                                                    שחזר
                                                </button>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.actionBtnDanger
                                                    }
                                                    onClick={() =>
                                                        handleHardDelete(lead)
                                                    }
                                                >
                                                    מחק לצמיתות
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                className={
                                                    styles.actionBtnDanger
                                                }
                                                onClick={() =>
                                                    handleFlag(lead, {
                                                        deletedAt: true,
                                                    })
                                                }
                                            >
                                                מחק
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            {fetchError && leads.length > 0 && (
                <div className={styles.errorWrap}>
                    <p className={styles.errorText}>
                        אירעה שגיאה בטעינת הודעות נוספות
                    </p>
                    <button
                        type="button"
                        className={styles.retryBtn}
                        onClick={handleLoadMore}
                    >
                        נסה שנית
                    </button>
                </div>
            )}

            {nextCursor && !fetchError && (
                <button
                    type="button"
                    className={styles.loadMore}
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                >
                    {loadingMore ? "טוען…" : "טען עוד"}
                </button>
            )}
        </main>
    );
}
