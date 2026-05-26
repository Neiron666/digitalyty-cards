import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { u as useAuth, y as useUnreadCount, z as getMyLeads, D as markLeadRead, E as updateLeadFlags, I as hardDeleteLead, J as getMyBookings, K as approveMyBooking, L as cancelMyBooking, S as SeoHelmet } from "../entry-server.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
const main = "_main_wnwy6_7";
const heading = "_heading_wnwy6_27";
const tabs = "_tabs_wnwy6_49";
const tab = "_tab_wnwy6_49";
const tabActive = "_tabActive_wnwy6_109";
const categoryTabs = "_categoryTabs_wnwy6_123";
const categoryTab = "_categoryTab_wnwy6_123";
const categoryTabActive = "_categoryTabActive_wnwy6_197";
const loading = "_loading_wnwy6_221";
const empty = "_empty_wnwy6_223";
const retentionNote = "_retentionNote_wnwy6_237";
const errorWrap = "_errorWrap_wnwy6_257";
const errorText = "_errorText_wnwy6_273";
const retryBtn = "_retryBtn_wnwy6_287";
const list = "_list_wnwy6_329";
const item = "_item_wnwy6_347";
const card = "_card_wnwy6_363";
const unread = "_unread_wnwy6_411";
const senderRow = "_senderRow_wnwy6_423";
const dot = "_dot_wnwy6_437";
const label = "_label_wnwy6_453";
const senderName = "_senderName_wnwy6_465";
const statusPill = "_statusPill_wnwy6_479";
const statusPillUnread = "_statusPillUnread_wnwy6_501";
const cardMeta = "_cardMeta_wnwy6_513";
const cardLabel = "_cardLabel_wnwy6_533";
const kindPill = "_kindPill_wnwy6_553";
const kindPillOrg = "_kindPillOrg_wnwy6_573";
const kindPillPersonal = "_kindPillPersonal_wnwy6_585";
const chevron = "_chevron_wnwy6_601";
const preview = "_preview_wnwy6_619";
const date = "_date_wnwy6_635";
const detail = "_detail_wnwy6_649";
const detailMessage = "_detailMessage_wnwy6_665";
const detailField = "_detailField_wnwy6_681";
const detailLabel = "_detailLabel_wnwy6_691";
const detailLink = "_detailLink_wnwy6_699";
const placeholder = "_placeholder_wnwy6_717";
const row = "_row_wnwy6_731";
const meta = "_meta_wnwy6_745";
const name = "_name_wnwy6_761";
const badge = "_badge_wnwy6_781";
const badgePending = "_badgePending_wnwy6_805";
const badgeApproved = "_badgeApproved_wnwy6_817";
const badgeCanceled = "_badgeCanceled_wnwy6_829";
const badgeExpired = "_badgeExpired_wnwy6_841";
const details = "_details_wnwy6_857";
const detailLine = "_detailLine_wnwy6_873";
const actions = "_actions_wnwy6_887";
const starBadge = "_starBadge_wnwy6_909";
const actionBar = "_actionBar_wnwy6_925";
const actionBtn = "_actionBtn_wnwy6_943";
const actionBtnDanger = "_actionBtnDanger_wnwy6_995 _actionBtn_wnwy6_943";
const loadMore = "_loadMore_wnwy6_1019";
const dangerBtn = "_dangerBtn_wnwy6_1075 _actionBtnDanger_wnwy6_995 _actionBtn_wnwy6_943";
const loadMoreBtn = "_loadMoreBtn_wnwy6_1083 _loadMore_wnwy6_1019";
const styles = {
  main,
  heading,
  tabs,
  tab,
  tabActive,
  categoryTabs,
  categoryTab,
  categoryTabActive,
  loading,
  empty,
  retentionNote,
  errorWrap,
  errorText,
  retryBtn,
  list,
  item,
  card,
  unread,
  senderRow,
  dot,
  label,
  senderName,
  statusPill,
  statusPillUnread,
  cardMeta,
  cardLabel,
  kindPill,
  kindPillOrg,
  kindPillPersonal,
  chevron,
  preview,
  date,
  detail,
  detailMessage,
  detailField,
  detailLabel,
  detailLink,
  placeholder,
  row,
  meta,
  name,
  badge,
  badgePending,
  badgeApproved,
  badgeCanceled,
  badgeExpired,
  details,
  detailLine,
  actions,
  starBadge,
  actionBar,
  actionBtn,
  actionBtnDanger,
  loadMore,
  dangerBtn,
  loadMoreBtn
};
const VIEWS = [
  { key: "active", label: "הכל" },
  { key: "important", label: "חשובים" },
  { key: "archived", label: "ארכיון" },
  { key: "trash", label: "פח" }
];
const CATEGORIES = [
  { key: "leads", label: "פניות" },
  { key: "bookings", label: "בקשות תיאום" },
  { key: "futureMeetings", label: "פגישות עתידיות" }
];
const STATUS_LABELS = {
  pending: "ממתין",
  approved: "מאושר",
  canceled: "בוטל",
  expired: "פג תוקף"
};
const STATUS_CLASS_MAP = {
  pending: "badgePending",
  approved: "badgeApproved",
  canceled: "badgeCanceled",
  expired: "badgeExpired"
};
function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(iso);
  }
}
function safeStr(v) {
  return String(v ?? "").trim();
}
function Inbox() {
  const { isAuthenticated } = useAuth();
  const { adjustUnreadCount, refresh } = useUnreadCount();
  const [activeCategory, setActiveCategory] = useState("leads");
  const [activeView, setActiveView] = useState("active");
  const [leads, setLeads] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading2, setLoading] = useState(true);
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
          view: viewRef.current
        });
        setLeads(
          (prev) => reset ? data.leads || [] : [...prev, ...data.leads || []]
        );
        setNextCursor(data.nextCursor || null);
      } catch {
        setFetchError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [nextCursor]
  );
  const loadMore2 = useCallback(async () => {
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
      setExpandedId((prev) => prev === id ? null : id);
      if (id && !lead.readAt && activeView !== "trash") {
        markLeadRead(id).catch(() => {
        });
        setLeads(
          (prev) => prev.map(
            (l) => safeStr(l._id) === id ? { ...l, readAt: (/* @__PURE__ */ new Date()).toISOString() } : l
          )
        );
        if (activeView === "active" || activeView === "important") {
          adjustUnreadCount(-1);
        }
      }
    },
    [activeView, adjustUnreadCount]
  );
  const handleFlag = useCallback(
    async (leadId, patch) => {
      const id = safeStr(leadId);
      if (!id) return;
      const prevLead = leads.find((l) => safeStr(l._id) === id);
      setLeads(
        (prev) => prev.map(
          (l) => safeStr(l._id) === id ? { ...l, ...patch } : l
        )
      );
      try {
        await updateLeadFlags(id, patch);
        const shouldRemove = patch.archivedAt && activeView !== "archived" || !patch.archivedAt && "archivedAt" in patch && activeView === "archived" || patch.deletedAt && activeView !== "trash" || patch.isImportant === false && activeView === "important";
        if (shouldRemove) {
          setLeads(
            (prev) => prev.filter((l) => safeStr(l._id) !== id)
          );
          if (prevLead && !prevLead.readAt && (activeView === "active" || activeView === "important")) {
            adjustUnreadCount(-1);
          }
        }
      } catch {
        setLeads(
          (prev) => prevLead ? prev.map(
            (l) => safeStr(l._id) === id ? prevLead : l
          ) : prev
        );
      }
    },
    [leads, activeView, adjustUnreadCount]
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
        setLeads((prev) => prevLead ? [prevLead, ...prev] : prev);
      }
    },
    [leads, adjustUnreadCount]
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
      loadBookings();
    }
  }, [activeCategory, loadLeads, loadBookings]);
  useEffect(() => {
    viewRef.current = activeView;
    if (activeCategory !== "leads") return;
    loadLeads({ reset: true });
  }, [activeView, activeCategory, loadLeads]);
  useEffect(() => {
    if (activeCategory !== "bookings" && activeCategory !== "futureMeetings")
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
        const msg = code === "INVALID_STATUS" ? "הבקשה כבר אינה תקפה." : "לא ניתן לבצע את הפעולה כרגע.";
        setBookingActionError(msg);
        bookingActionTimerRef.current = setTimeout(
          () => setBookingActionError(""),
          6e3
        );
      }
      await loadBookings();
      refresh();
    },
    [loadBookings, refresh]
  );
  function formatRequestedBooking(booking) {
    const dateKey = safeStr(booking?.dateKeyIl);
    const localStart = safeStr(booking?.localStartHHmm);
    if (dateKey && localStart) return `${dateKey} בשעה ${localStart}`;
    if (booking?.startAt) return formatDate(booking.startAt);
    return "";
  }
  const tabBar = useMemo(() => {
    return /* @__PURE__ */ jsx("nav", { className: styles.tabs, "aria-label": "תיבות", children: VIEWS.map((v) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: `${styles.tab} ${activeView === v.key ? styles.tabActive : ""}`,
        onClick: () => setActiveView(v.key),
        "aria-current": activeView === v.key ? "page" : void 0,
        children: v.label
      },
      v.key
    )) });
  }, [activeView]);
  const categoryBar = useMemo(() => {
    return /* @__PURE__ */ jsx("nav", { className: styles.categoryTabs, "aria-label": "סוג הודעות", children: CATEGORIES.map((c) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: `${styles.categoryTab} ${activeCategory === c.key ? styles.categoryTabActive : ""}`,
        onClick: () => handleCategoryChange(c.key),
        "aria-current": activeCategory === c.key ? "page" : void 0,
        children: c.label
      },
      c.key
    )) });
  }, [activeCategory, handleCategoryChange]);
  const nowMs = Date.now();
  const requestBookings = useMemo(
    () => bookings.filter((b) => {
      const st = safeStr(b.status);
      return st === "pending" || st === "canceled" || st === "expired";
    }),
    [bookings]
  );
  const futureMeetings = useMemo(
    () => bookings.filter((b) => {
      if (safeStr(b.status) !== "approved") return false;
      const end = b.endAt ? new Date(b.endAt).getTime() : 0;
      return end > nowMs;
    }),
    [bookings, nowMs]
  );
  if (!isAuthenticated) return /* @__PURE__ */ jsx(Navigate, { to: "/login", replace: true });
  const isLeadsEmptyState = activeCategory === "leads" && !loading2 && !fetchError && leads.length === 0;
  const leadsEmptyText = activeView === "important" && "אין הודעות חשובות" || activeView === "archived" && "אין הודעות בארכיון" || activeView === "trash" && "הפח ריק" || "אין הודעות";
  return /* @__PURE__ */ jsxs("main", { className: styles.main, children: [
    /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
    /* @__PURE__ */ jsx("h1", { className: styles.heading, children: "הודעות נכנסות" }),
    categoryBar,
    activeCategory === "leads" ? tabBar : null,
    activeCategory === "leads" && loading2 ? /* @__PURE__ */ jsx("p", { className: styles.loading, children: "טוען…" }) : null,
    activeCategory === "leads" && fetchError ? /* @__PURE__ */ jsxs("div", { className: styles.errorWrap, children: [
      /* @__PURE__ */ jsx("p", { className: styles.errorText, children: "אירעה שגיאה בטעינת ההודעות" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles.retryBtn,
          onClick: handleRetry,
          children: "נסה שנית"
        }
      )
    ] }) : null,
    isLeadsEmptyState ? /* @__PURE__ */ jsx("p", { className: styles.empty, children: leadsEmptyText }) : null,
    activeCategory === "leads" && !loading2 && !fetchError && leads.length > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("ul", { className: styles.list, children: leads.map((lead) => {
        const id = safeStr(lead._id);
        const isExpanded = expandedId === id;
        const isUnread = !lead.readAt;
        return /* @__PURE__ */ jsxs("li", { className: styles.item, children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: `${styles.card} ${isUnread ? styles.unread : ""}`,
              onClick: () => handleToggle(lead),
              "aria-expanded": isExpanded,
              children: [
                /* @__PURE__ */ jsxs("div", { className: styles.row, children: [
                  /* @__PURE__ */ jsxs("div", { className: styles.meta, children: [
                    /* @__PURE__ */ jsx("div", { className: styles.name, children: lead.senderName || "(ללא שם)" }),
                    /* @__PURE__ */ jsx("div", { className: styles.date, children: formatDate(lead.createdAt) })
                  ] }),
                  lead.isImportant ? /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: styles.starBadge,
                      "aria-label": "חשוב",
                      children: "★"
                    }
                  ) : null,
                  isUnread ? /* @__PURE__ */ jsx("span", { className: styles.badge, children: "חדש" }) : null
                ] }),
                /* @__PURE__ */ jsx("div", { className: styles.preview, children: lead.message || lead.senderEmail || lead.senderPhone })
              ]
            }
          ),
          isExpanded ? /* @__PURE__ */ jsxs("div", { className: styles.details, children: [
            lead.senderEmail ? /* @__PURE__ */ jsxs(
              "div",
              {
                className: styles.detailLine,
                children: [
                  "אימייל: ",
                  lead.senderEmail
                ]
              }
            ) : null,
            lead.senderPhone ? /* @__PURE__ */ jsxs(
              "div",
              {
                className: styles.detailLine,
                children: [
                  "טלפון: ",
                  lead.senderPhone
                ]
              }
            ) : null,
            lead.message ? /* @__PURE__ */ jsxs(
              "div",
              {
                className: styles.detailLine,
                children: [
                  "הודעה: ",
                  lead.message
                ]
              }
            ) : null,
            /* @__PURE__ */ jsx("div", { className: styles.actions, children: activeView !== "trash" ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: styles.actionBtn,
                  onClick: () => handleFlag(id, {
                    isImportant: !lead.isImportant
                  }),
                  children: lead.isImportant ? "הסר חשוב" : "סמן חשוב"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: styles.actionBtn,
                  onClick: () => handleFlag(id, {
                    archivedAt: !lead.archivedAt
                  }),
                  children: lead.archivedAt ? "בטל ארכיון" : "העבר לארכיון"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: styles.dangerBtn,
                  onClick: () => handleFlag(id, {
                    deletedAt: true
                  }),
                  children: "העבר לפח"
                }
              )
            ] }) : /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles.dangerBtn,
                onClick: () => handleHardDelete(id),
                children: "מחיקה סופית"
              }
            ) })
          ] }) : null
        ] }, id);
      }) }),
      nextCursor ? /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles.loadMoreBtn,
          onClick: loadMore2,
          disabled: loadingMore,
          children: loadingMore ? "טוען…" : "טען עוד"
        }
      ) : null
    ] }) : null,
    (activeCategory === "bookings" || activeCategory === "futureMeetings") && bookingActionError ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: bookingActionError }) : null,
    (activeCategory === "bookings" || activeCategory === "futureMeetings") && bookingsLoading ? /* @__PURE__ */ jsx("p", { className: styles.loading, children: activeCategory === "futureMeetings" ? "טוען פגישות…" : "טוען בקשות תיאום…" }) : null,
    (activeCategory === "bookings" || activeCategory === "futureMeetings") && bookingsError ? /* @__PURE__ */ jsxs("div", { className: styles.errorWrap, children: [
      /* @__PURE__ */ jsx("p", { className: styles.errorText, children: activeCategory === "futureMeetings" ? "אירעה שגיאה בטעינת הפגישות" : "אירעה שגיאה בטעינת בקשות התיאום" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles.retryBtn,
          onClick: handleRetry,
          children: "נסה שנית"
        }
      )
    ] }) : null,
    (activeCategory === "bookings" || activeCategory === "futureMeetings") && !bookingsLoading && !bookingsError ? /* @__PURE__ */ jsx("p", { className: styles.retentionNote, children: "רשומות נשמרות כ-7 ימים לאחר סיום מועד הפגישה ונמחקות אוטומטית." }) : null,
    activeCategory === "bookings" && !bookingsLoading && !bookingsError && requestBookings.length === 0 ? /* @__PURE__ */ jsx("p", { className: styles.empty, children: "אין בקשות תיאום להצגה" }) : null,
    activeCategory === "bookings" && !bookingsLoading && !bookingsError && requestBookings.length > 0 ? /* @__PURE__ */ jsx("ul", { className: styles.list, children: requestBookings.map((b) => {
      const id = safeStr(b._id);
      const isExpanded = bookingsExpandedId === id;
      const status = safeStr(b.status || b.state || "");
      const statusLabel = STATUS_LABELS[status] || status;
      const statusCls = STATUS_CLASS_MAP[status] || "";
      const createdAt = b.createdAt || b.requestedAt;
      const requestedSlot = formatRequestedBooking(b);
      const cardMeta2 = b?.cardMeta && typeof b.cardMeta === "object" ? b.cardMeta : null;
      const cardLabel2 = safeStr(cardMeta2?.cardLabel);
      const cardSlug = safeStr(cardMeta2?.slug);
      const canApprove = status === "pending";
      const canCancel = status === "pending" || status === "approved";
      return /* @__PURE__ */ jsxs("li", { className: styles.item, children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: styles.card,
            onClick: () => setBookingsExpandedId(
              (prev) => prev === id ? null : id
            ),
            "aria-expanded": isExpanded,
            children: [
              /* @__PURE__ */ jsxs("div", { className: styles.row, children: [
                /* @__PURE__ */ jsxs("div", { className: styles.meta, children: [
                  /* @__PURE__ */ jsx("div", { className: styles.name, children: b.name || b.customerName || "(ללא שם)" }),
                  /* @__PURE__ */ jsx("div", { className: styles.date, children: createdAt ? formatDate(createdAt) : "" })
                ] }),
                status ? /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: `${styles.badge} ${statusCls ? styles[statusCls] : ""}`,
                    children: statusLabel
                  }
                ) : null
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles.preview, children: [
                cardLabel2 ? `כרטיס: ${cardLabel2}` : cardSlug ? `כרטיס: ${cardSlug}` : null,
                cardLabel2 || cardSlug ? " · " : "",
                b.note || b.message || b.phone || b.email || "בקשת תיאום"
              ] })
            ]
          }
        ),
        isExpanded ? /* @__PURE__ */ jsxs("div", { className: styles.details, children: [
          b.email ? /* @__PURE__ */ jsxs("div", { className: styles.detailLine, children: [
            "אימייל: ",
            b.email
          ] }) : null,
          b.phone ? /* @__PURE__ */ jsxs("div", { className: styles.detailLine, children: [
            "טלפון: ",
            b.phone
          ] }) : null,
          b.note ? /* @__PURE__ */ jsxs("div", { className: styles.detailLine, children: [
            "הערה: ",
            b.note
          ] }) : null,
          createdAt ? /* @__PURE__ */ jsxs("div", { className: styles.detailLine, children: [
            "נוצרה: ",
            formatDate(createdAt)
          ] }) : null,
          requestedSlot ? /* @__PURE__ */ jsxs("div", { className: styles.detailLine, children: [
            "מועד מבוקש: ",
            requestedSlot
          ] }) : null,
          /* @__PURE__ */ jsxs("div", { className: styles.actions, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles.actionBtn,
                disabled: !canApprove,
                onClick: () => handleBookingAction(
                  id,
                  "approve"
                ),
                children: "אשר"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles.actionBtnDanger,
                disabled: !canCancel,
                onClick: () => handleBookingAction(
                  id,
                  "cancel"
                ),
                children: "בטל"
              }
            )
          ] })
        ] }) : null
      ] }, id);
    }) }) : null,
    activeCategory === "futureMeetings" && !bookingsLoading && !bookingsError && futureMeetings.length === 0 ? /* @__PURE__ */ jsx("p", { className: styles.empty, children: "אין פגישות עתידיות" }) : null,
    activeCategory === "futureMeetings" && !bookingsLoading && !bookingsError && futureMeetings.length > 0 ? /* @__PURE__ */ jsx("ul", { className: styles.list, children: futureMeetings.map((b) => {
      const id = safeStr(b._id);
      const isExpanded = bookingsExpandedId === id;
      const createdAt = b.createdAt || b.requestedAt;
      const requestedSlot = formatRequestedBooking(b);
      const cardMeta2 = b?.cardMeta && typeof b.cardMeta === "object" ? b.cardMeta : null;
      const cardLabel2 = safeStr(cardMeta2?.cardLabel);
      const cardSlug = safeStr(cardMeta2?.slug);
      return /* @__PURE__ */ jsxs("li", { className: styles.item, children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: styles.card,
            onClick: () => setBookingsExpandedId(
              (prev) => prev === id ? null : id
            ),
            "aria-expanded": isExpanded,
            children: [
              /* @__PURE__ */ jsxs("div", { className: styles.row, children: [
                /* @__PURE__ */ jsxs("div", { className: styles.meta, children: [
                  /* @__PURE__ */ jsx("div", { className: styles.name, children: b.name || b.customerName || "(ללא שם)" }),
                  requestedSlot ? /* @__PURE__ */ jsx("div", { className: styles.date, children: requestedSlot }) : null
                ] }),
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: `${styles.badge} ${styles.badgeApproved}`,
                    children: STATUS_LABELS.approved
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles.preview, children: [
                cardLabel2 ? `כרטיס: ${cardLabel2}` : cardSlug ? `כרטיס: ${cardSlug}` : null,
                cardLabel2 || cardSlug ? " · " : "",
                b.note || b.message || b.phone || b.email || "פגישה מאושרת"
              ] })
            ]
          }
        ),
        isExpanded ? /* @__PURE__ */ jsxs("div", { className: styles.details, children: [
          b.phone ? /* @__PURE__ */ jsxs("div", { className: styles.detailLine, children: [
            "טלפון: ",
            b.phone
          ] }) : null,
          b.email ? /* @__PURE__ */ jsxs("div", { className: styles.detailLine, children: [
            "אימייל: ",
            b.email
          ] }) : null,
          b.note ? /* @__PURE__ */ jsxs("div", { className: styles.detailLine, children: [
            "הערה: ",
            b.note
          ] }) : null,
          createdAt ? /* @__PURE__ */ jsxs("div", { className: styles.detailLine, children: [
            "נוצרה: ",
            formatDate(createdAt)
          ] }) : null,
          requestedSlot ? /* @__PURE__ */ jsxs("div", { className: styles.detailLine, children: [
            "מועד מבוקש: ",
            requestedSlot
          ] }) : null,
          /* @__PURE__ */ jsx("div", { className: styles.actions, children: /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles.actionBtnDanger,
              onClick: () => handleBookingAction(
                id,
                "cancel"
              ),
              children: "בטל פגישה"
            }
          ) })
        ] }) : null
      ] }, id);
    }) }) : null
  ] });
}
export {
  Inbox as default
};
