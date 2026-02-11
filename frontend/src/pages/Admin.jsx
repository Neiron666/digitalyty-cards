import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import FlashBanner from "../components/ui/FlashBanner/FlashBanner";
import { useAuth } from "../context/AuthContext";
import {
    adminDeactivateCard,
    adminDeleteCard,
    adminDeleteUserPermanently,
    adminExtendTrial,
    adminOverridePlan,
    adminReactivateCard,
    adminSetCardTier,
    adminSetUserTier,
    getAdminCardById,
    getAdminStats,
    getAdminUserById,
    listAdminCards,
    listAdminUsers,
} from "../services/admin.service";
import AdminAnalyticsView from "./admin/AdminAnalyticsView";
import AdminOrganizationsView from "./admin/AdminOrganizationsView";
import styles from "./Admin.module.css";

// Admin UI Hebrew + RTL (local strings dictionary, no i18n framework)
// -------------------------------------------------------------------
// Inventory of visible EN strings/placeholders translated in this file:
// - "Admin"
// - "Login is required to access admin panel."
// - "Please login as an admin user."
// - "Access denied"
// - "Your user does not have admin permissions."
// - "Secure admin cabinet"
// - "Stats" / "No stats" / "Refresh" / "Failed to load admin data"
// - "Selected card" / "Select a card from the list." / "Failed to load card"
// - Field labels: "Id", "Slug", "Status", "Active", "Owner", "Effective plan",
//   "Entitled", "Paid", "Effective tier", "Source", "until", "Trial ends",
//   "Effective billing", "Admin override", "Card tier override", "User tier override"
// - "Reason" / "Required for any admin action" / "Reason is required"
// - Actions: "Deactivate card" / "Reactivate card" / "Trial mode" / "Days" / "Exact"
//   / "Days (0..14)" / "Date (Israel)" / "Hour (0..23)" / "Minute (step 5)" / "Set"
// - "Override plan" / "Override until" / placeholders "free | monthly | yearly", "YYYY-MM-DD"
//   / "Override"
// - "Card tier" / "(clear)" / "Card tier until" / "Apply"
// - "User tier" / "User tier until" / "Selected card has no user owner"
// - Tables: "Users" / headers "Email", "Card", "Role", "Created" / "missing"
// - "Cards" / headers "Slug", "Owner", "Status", "Active", "Updated" / "(no slug)"
//   / owner label "anonymous" / "Loading card…"

const STR = {
    he: {
        title_admin: "לוח ניהול",
        subtitle_login_required: "נדרשת התחברות כדי לגשת ללוח הניהול.",
        subtitle_access_denied: "הגישה נדחתה",
        subtitle_admin_secure: "לוח ניהול מאובטח",

        msg_login_as_admin: "נא להתחבר כמשתמש בעל הרשאות מנהל.",
        msg_no_admin_permissions: "למשתמש זה אין הרשאות מנהל.",

        section_stats: "סטטיסטיקות",
        stats_none: "אין נתונים",
        stats_anonymous_cards: "כרטיסים אנונימיים",
        stats_user_cards: "כרטיסים של משתמשים",
        stats_published: "מפורסמים",
        btn_refresh: "רענן",

        section_selected_card: "כרטיס נבחר",
        section_card_details: "פרטי כרטיס",
        section_admin_actions: "פעולות מנהל",
        msg_select_card: "בחר כרטיס מהרשימה.",

        label_reason: "סיבה",
        placeholder_reason: "נדרש לצורך תיעוד פעולה",

        label_id: "מזהה כרטיס (ID פנימי)",
        label_slug: "סלאג (כתובת קצרה לאחר /card/)",
        label_status: "סטטוס",
        label_active: "פעיל",
        label_owner: "בעלות",
        owner_user: "משתמש",
        owner_anonymous: "אנונימי",

        yes: "כן",
        no: "לא",

        role_user: "משתמש",
        role_admin: "מנהל",

        card_status_draft: "טיוטה",
        card_status_published: "מפורסם",

        plan_free: "חינמי",
        plan_monthly: "חודשי",
        plan_yearly: "שנתי",

        billing_status_free: "חינמי",
        billing_status_trial: "ניסיון",
        billing_status_active: "פעיל",
        billing_status_past_due: "באיחור תשלום",
        billing_status_canceled: "בוטל",

        label_effective_plan: "מסלול תשלום בפועל",
        label_entitled: "גישה פעילה",
        label_paid: "שולם",

        label_effective_tier: "רמת פיצ'רים בפועל",
        label_tier_source: "מקור",
        label_until: "עד",

        label_trial_ends: "סיום תקופת ניסיון",
        label_effective_billing: "סטטוס תשלום בפועל",

        label_analytics: "אנליטיקה",
        label_can_view_analytics: "גישה לאנליטיקה",
        label_analytics_retention: "שמירת נתונים (ימים)",

        label_admin_override: "הטבת מסלול (ידני)",
        label_card_tier_override: "רמת פיצ'רים לכרטיס (ידני)",
        label_user_tier_override: "רמת פיצ'רים למשתמש (ידני)",

        btn_deactivate: "השבת כרטיס(הפוך ללא פעיל)",
        btn_reactivate: "הפעל כרטיס מחדש(הפוך לפעיל)",

        label_trial_mode: "מצב ניסיון",
        opt_trial_mode_days: "ימים מעכשיו",
        opt_trial_mode_exact: "יום ושעה מדוייקים",
        label_trial_days: "ימים (0–14)",
        label_trial_date_il: "תאריך (ישראל)",
        label_trial_hour: "שעה (0–23)",
        label_trial_minute: "דקות (קפיצות של 5)",
        btn_set: "קבע",

        label_override_plan: "מסלול (ידני)",
        placeholder_override_plan: "לדוגמה: free | monthly | yearly",
        label_override_until: "עד תאריך",
        placeholder_date_ymd: "YYYY-MM-DD",
        btn_override: "החל",

        label_card_tier: "רמת פיצ'רים לכרטיס",
        label_user_tier: "רמת פיצ'רים למשתמש",
        opt_clear: "(נקה)",
        opt_tier_free: "חינמי",
        opt_tier_basic: "בסיסי",
        opt_tier_premium: "פרימיום",
        label_card_tier_until: "עד תאריך (כרטיס)",
        label_user_tier_until: "עד תאריך (משתמש)",
        btn_apply: "החל",

        section_users: "משתמשים",
        section_orgs: "ארגונים",
        th_email: "אימייל",
        th_card: "כרטיס",
        th_role: "תפקיד",
        th_created: "נוצר",
        label_missing: "חסר",

        section_cards: "כרטיסים",
        th_slug: "סלאג",
        th_owner: "בעלות",
        th_updated: "עודכן",
        label_no_slug: "(אין סלאג)",
        msg_loading_card: "טוען כרטיס…",

        err_reason_required: "יש למלא סיבה.",
        err_reason_too_long: "הסיבה ארוכה מדי.",
        err_invalid_tier: "רמת פיצ'רים לא תקינה.",
        err_invalid_until: "תאריך 'עד' לא תקין (חייב להיות בעתיד).",
        err_card_has_no_user_owner: "לכרטיס הנבחר אין משתמש בעלים.",
        err_generic: "אירעה שגיאה. נסה שוב.",
        err_load_admin: "אירעה שגיאה בטעינת נתוני הניהול.",
        err_load_card: "אירעה שגיאה בטעינת הכרטיס.",
        err_unauthorized: "נדרשת התחברות.",
        err_forbidden: "אין לך הרשאות לביצוע פעולה זו.",
        err_rate_limited: "בוצעו יותר מדי ניסיונות. נסה שוב מאוחר יותר.",
        err_validation: "נתונים לא תקינים.",
        err_slug_taken: "הסלאג כבר תפוס.",
        err_trial_expired: "תקופת הניסיון כבר הסתיימה.",
        err_not_found: "לא נמצא.",
    },
};

function t(key) {
    return STR.he[key] ?? key;
}

function mapApiErrorToHebrew(err, fallbackKey = "err_generic") {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;

    if (status === 401 || code === "UNAUTHORIZED") return t("err_unauthorized");
    if (status === 403 || code === "FORBIDDEN") return t("err_forbidden");
    if (status === 429 || code === "RATE_LIMITED") return t("err_rate_limited");

    if (status === 404) return t("err_not_found");

    if (code === "REASON_REQUIRED") return t("err_reason_required");
    if (code === "REASON_TOO_LONG") return t("err_reason_too_long");
    if (code === "INVALID_TIER") return t("err_invalid_tier");
    if (code === "INVALID_UNTIL") return t("err_invalid_until");

    if (code === "SLUG_TAKEN") return t("err_slug_taken");
    if (code === "TRIAL_EXPIRED") return t("err_trial_expired");
    if (code === "VALIDATION_ERROR") return t("err_validation");
    if (code === "NOT_FOUND") return t("err_not_found");

    return t(fallbackKey);
}

function boolHe(v) {
    return v ? t("yes") : t("no");
}

function roleHe(role) {
    if (role === "admin") return t("role_admin");
    if (role === "user") return t("role_user");
    return String(role || "");
}

function cardStatusHe(status) {
    if (status === "draft") return t("card_status_draft");
    if (status === "published") return t("card_status_published");
    return String(status || "");
}

function planHe(plan) {
    if (plan === "free") return t("plan_free");
    if (plan === "monthly") return t("plan_monthly");
    if (plan === "yearly") return t("plan_yearly");
    return String(plan || "");
}

function tierHe(tier) {
    if (tier === "free") return t("opt_tier_free");
    if (tier === "basic") return t("opt_tier_basic");
    if (tier === "premium") return t("opt_tier_premium");
    return String(tier || "");
}

function isAccessDenied(err) {
    const status = err?.response?.status;
    return status === 401 || status === 403;
}

function formatDate(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return "";
    }
}

function getIsraelNowParts() {
    const now = new Date();

    const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now);

    const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jerusalem",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(now);

    const [hRaw, mRaw] = String(time).split(":");
    const h = Number(hRaw);
    const m = Number(mRaw);
    const rounded = Number.isFinite(m) ? Math.floor(m / 5) * 5 : 0;

    return {
        date,
        hour: String(Number.isFinite(h) ? h : 0).padStart(2, "0"),
        minute: String(rounded).padStart(2, "0"),
    };
}

export default function Admin() {
    const { token } = useAuth();

    const [adminMode, setAdminMode] = useState("manage");
    const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);

    const [directoryTab, setDirectoryTab] = useState("cards");
    const [selectedTab, setSelectedTab] = useState("general");
    const [selectedUserTab, setSelectedUserTab] = useState("general");
    const [cardsQuery, setCardsQuery] = useState("");
    const directoryTabListRef = useRef(null);
    const selectedTabListRef = useRef(null);
    const selectedTabListRefMobile = useRef(null);
    const selectedUserTabListRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [error, setError] = useState("");

    const [actionLoading, setActionLoading] = useState({
        deactivate: false,
        reactivate: false,
        delete: false,
        extend: false,
        override: false,
        cardTier: false,
        userTier: false,
    });

    const [actionError, setActionError] = useState({
        deactivate: "",
        reactivate: "",
        delete: "",
        extend: "",
        override: "",
        cardTier: "",
        userTier: "",
    });

    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [cards, setCards] = useState([]);

    const [selectedCardId, setSelectedCardId] = useState("");
    const [selectedCard, setSelectedCard] = useState(null);

    const [selectedUserId, setSelectedUserId] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserError, setSelectedUserError] = useState("");

    const [userDeleteConfirm, setUserDeleteConfirm] = useState("");
    const [userDeleteError, setUserDeleteError] = useState("");
    const [userDeleteSuccess, setUserDeleteSuccess] = useState("");

    const [reason, setReason] = useState("");
    const [trialDays, setTrialDays] = useState(7);
    const [trialMode, setTrialMode] = useState("days");
    const ilNow = useMemo(() => getIsraelNowParts(), []);
    const [trialUntilDate, setTrialUntilDate] = useState(ilNow.date);
    const [trialUntilHour, setTrialUntilHour] = useState(ilNow.hour);
    const [trialUntilMinute, setTrialUntilMinute] = useState(ilNow.minute);
    const [overridePlan, setOverridePlan] = useState("monthly");
    const [overrideUntil, setOverrideUntil] = useState("");

    const [cardTier, setCardTier] = useState("");
    const [cardTierUntil, setCardTierUntil] = useState("");
    const [userTier, setUserTier] = useState("");
    const [userTierUntil, setUserTierUntil] = useState("");

    const selectedCardOwner = useMemo(() => {
        if (!selectedCard) return "";
        if (selectedCard?.user) return "user";
        if (selectedCard?.anonymousId) return "anonymous";
        return "";
    }, [selectedCard]);

    const selectedCardOwnerLabel = useMemo(() => {
        if (selectedCardOwner === "user") return t("owner_user");
        if (selectedCardOwner === "anonymous") return t("owner_anonymous");
        return "";
    }, [selectedCardOwner]);

    const selectedEffectivePlan = useMemo(() => {
        if (!selectedCard) return "";
        return selectedCard?.effectiveBilling?.plan || "";
    }, [selectedCard]);

    const selectedIsPaid = useMemo(() => {
        if (!selectedCard) return false;
        return Boolean(selectedCard?.effectiveBilling?.isPaid);
    }, [selectedCard]);

    const selectedIsEntitled = useMemo(() => {
        if (!selectedCard) return false;
        return Boolean(selectedCard?.effectiveBilling?.isEntitled);
    }, [selectedCard]);

    const selectedBilling = useMemo(() => {
        if (!selectedCard) return null;
        return selectedCard?.effectiveBilling || null;
    }, [selectedCard]);

    const selectedEffectiveTier = useMemo(() => {
        if (!selectedCard) return "";
        return selectedCard?.effectiveTier || "";
    }, [selectedCard]);

    const selectedTierSource = useMemo(() => {
        if (!selectedCard) return "";
        return selectedCard?.tierSource || "";
    }, [selectedCard]);

    const selectedTierUntil = useMemo(() => {
        if (!selectedCard) return "";
        return selectedCard?.tierUntil || "";
    }, [selectedCard]);

    const filteredCards = useMemo(() => {
        const q = String(cardsQuery || "")
            .trim()
            .toLowerCase();
        if (!q) return cards;

        return (Array.isArray(cards) ? cards : []).filter((c) => {
            const slug = String(c?.slug || "").toLowerCase();
            const email = String(c?.ownerSummary?.email || "").toLowerCase();
            return slug.includes(q) || email.includes(q);
        });
    }, [cards, cardsQuery]);

    function toDateInputUtc(value) {
        if (!value) return "";
        try {
            const d = new Date(value);
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, "0");
            const day = String(d.getUTCDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        } catch {
            return "";
        }
    }

    function updateCardInList(updated) {
        if (!updated?._id) return;
        setCards((prev) =>
            Array.isArray(prev)
                ? prev.map((c) =>
                      c?._id === updated._id
                          ? {
                                ...c,
                                slug: updated.slug,
                                status: updated.status,
                                isActive: updated.isActive,
                                effectiveBilling: updated.effectiveBilling,
                                effectiveTier: updated.effectiveTier,
                                tierSource: updated.tierSource,
                                tierUntil: updated.tierUntil,
                                entitlements: updated.entitlements,
                                updatedAt: updated.updatedAt,
                                trialEndsAt: updated.trialEndsAt,
                            }
                          : c,
                  )
                : prev,
        );
    }

    async function loadAll() {
        setLoading(true);
        setError("");
        setAccessDenied(false);
        try {
            const [s, u, c] = await Promise.all([
                getAdminStats(),
                listAdminUsers(),
                listAdminCards(),
            ]);
            setStats(s.data);
            setUsers(u.data?.items || []);
            setCards(c.data?.items || []);
        } catch (err) {
            if (isAccessDenied(err)) {
                setAccessDenied(true);
            } else {
                setError(mapApiErrorToHebrew(err, "err_load_admin"));
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (directoryTab === "users") return;
        setSelectedUserId("");
        setSelectedUser(null);
        setSelectedUserTab("general");
        setSelectedUserError("");
    }, [directoryTab]);

    function handleRefreshClick() {
        if (adminMode === "analytics") {
            setAnalyticsRefreshKey((k) => k + 1);
            return;
        }
        loadAll();
    }

    async function loadCard(id) {
        setSelectedCardId(id);
        setSelectedCard(null);
        setError("");
        setActionError({
            deactivate: "",
            reactivate: "",
            delete: "",
            extend: "",
            override: "",
            cardTier: "",
            userTier: "",
        });
        try {
            const res = await getAdminCardById(id);
            setSelectedCard(res.data);
        } catch (err) {
            if (isAccessDenied(err)) {
                setAccessDenied(true);
            } else {
                setError(mapApiErrorToHebrew(err, "err_load_card"));
            }
        }
    }

    async function loadUser(id) {
        setSelectedUserId(id);
        setSelectedUser(null);
        setSelectedUserTab("general");
        setSelectedUserError("");
        setUserDeleteConfirm("");
        setUserDeleteError("");
        setUserDeleteSuccess("");

        setLoading(true);
        try {
            const res = await getAdminUserById(id);
            setSelectedUser(res.data);
        } catch (err) {
            if (isAccessDenied(err)) {
                setAccessDenied(true);
            } else {
                setSelectedUserError(mapApiErrorToHebrew(err, "err_generic"));
            }
        } finally {
            setLoading(false);
        }
    }

    function requireReason() {
        const r = String(reason || "").trim();
        if (!r) {
            setError(t("err_reason_required"));
            return null;
        }
        return r;
    }

    function normalizeActionError(err) {
        return mapApiErrorToHebrew(err, "err_generic");
    }

    function getServerCodeMessage(err) {
        const code = err?.response?.data?.code;
        const msg = err?.response?.data?.message;
        const message =
            typeof msg === "string" && msg.trim()
                ? msg.trim()
                : typeof err?.message === "string" && err.message.trim()
                  ? err.message.trim()
                  : "Request failed";

        if (typeof code === "string" && code.trim()) {
            return `${code.trim()}: ${message}`;
        }
        return message;
    }

    async function runAction(actionKey, fn) {
        const r = requireReason();
        if (!r) return;

        setActionError((prev) => ({ ...prev, [actionKey]: "" }));

        setLoading(true);
        setError("");
        setActionLoading((prev) => ({ ...prev, [actionKey]: true }));
        try {
            const updatedCard = await fn(r);
            setSelectedCard(updatedCard);
            updateCardInList(updatedCard);

            // UX: after successful admin action, clear the reason field
            setReason("");

            // Keep tier inputs in sync after apply (selectedCard id stays the same)
            if (actionKey === "cardTier") {
                setCardTier(updatedCard?.adminTier || "");
                setCardTierUntil(toDateInputUtc(updatedCard?.adminTierUntil));
            }
        } catch (err) {
            if (isAccessDenied(err)) {
                setAccessDenied(true);
            } else {
                const msg = normalizeActionError(err);
                setActionError((prev) => ({ ...prev, [actionKey]: msg }));
            }
        } finally {
            setLoading(false);
            setActionLoading((prev) => ({ ...prev, [actionKey]: false }));
        }
    }

    function removeCardFromLists(cardId) {
        if (!cardId) return;

        setCards((prev) =>
            Array.isArray(prev) ? prev.filter((c) => c?._id !== cardId) : prev,
        );

        setUsers((prev) =>
            Array.isArray(prev)
                ? prev.map((u) => {
                      if (u?.cardSummary?.cardId !== cardId) return u;
                      return {
                          ...u,
                          cardId: null,
                          cardSummary: null,
                      };
                  })
                : prev,
        );
    }

    async function runDeleteAction() {
        if (!selectedCard?._id) return;
        const r = requireReason();
        if (!r) return;

        const confirmed = window.confirm(
            "Delete this card permanently? This cannot be undone.",
        );
        if (!confirmed) return;

        setActionError((prev) => ({ ...prev, delete: "" }));

        setLoading(true);
        setError("");
        setActionLoading((prev) => ({ ...prev, delete: true }));
        try {
            await adminDeleteCard(selectedCard._id, r);

            removeCardFromLists(selectedCard._id);
            setSelectedCardId("");
            setSelectedCard(null);
            setReason("");
        } catch (err) {
            if (isAccessDenied(err)) {
                setAccessDenied(true);
            } else {
                const msg = normalizeActionError(err);
                setActionError((prev) => ({ ...prev, delete: msg }));
            }
        } finally {
            setLoading(false);
            setActionLoading((prev) => ({ ...prev, delete: false }));
        }
    }

    async function runUserTierAction() {
        const r = requireReason();
        if (!r) return;
        if (!selectedCard?.user) {
            setError(t("err_card_has_no_user_owner"));
            return;
        }

        setActionError((prev) => ({ ...prev, userTier: "" }));

        setLoading(true);
        setError("");
        setActionLoading((prev) => ({ ...prev, userTier: true }));
        try {
            const until = userTierUntil
                ? new Date(`${userTierUntil}T23:59:59.999Z`).toISOString()
                : "";

            await adminSetUserTier(selectedCard.user, {
                tier: userTier || null,
                until,
                reason: r,
            });

            const refreshed = await getAdminCardById(selectedCard._id);
            setSelectedCard(refreshed.data);
            updateCardInList(refreshed.data);

            // UX: after successful admin action, clear the reason field
            setReason("");

            // Keep tier inputs in sync after apply
            setUserTier(refreshed.data?.ownerAdminTier || "");
            setUserTierUntil(
                toDateInputUtc(refreshed.data?.ownerAdminTierUntil),
            );
        } catch (err) {
            if (isAccessDenied(err)) {
                setAccessDenied(true);
            } else {
                const msg = normalizeActionError(err);
                setActionError((prev) => ({ ...prev, userTier: msg }));
            }
        } finally {
            setLoading(false);
            setActionLoading((prev) => ({ ...prev, userTier: false }));
        }
    }

    async function runUserDeletePermanent() {
        if (!selectedUser?._id) return;

        const r = requireReason();
        if (!r) return;

        setUserDeleteError("");
        setUserDeleteSuccess("");

        if (String(userDeleteConfirm || "").trim() !== "DELETE") {
            setUserDeleteError("יש להקליד DELETE לאישור");
            return;
        }

        const confirmed = window.confirm(
            "Delete this user permanently? This cannot be undone.",
        );
        if (!confirmed) return;

        setLoading(true);
        try {
            await adminDeleteUserPermanently(selectedUser._id, { reason: r });

            setUsers((prev) =>
                Array.isArray(prev)
                    ? prev.filter((u) => u?._id !== selectedUser._id)
                    : prev,
            );

            setCards((prev) =>
                Array.isArray(prev)
                    ? prev.filter((c) => {
                          const owner = c?.ownerSummary;
                          if (owner?.type !== "user") return true;
                          return owner?.userId !== selectedUser._id;
                      })
                    : prev,
            );

            setSelectedUserId("");
            setSelectedUser(null);
            setSelectedUserTab("general");

            setReason("");
            setUserDeleteConfirm("");
            setUserDeleteSuccess("המשתמש נמחק לצמיתות");
        } catch (err) {
            if (isAccessDenied(err)) {
                setAccessDenied(true);
            } else {
                setUserDeleteError(getServerCodeMessage(err));
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!token) return;
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        if (!selectedCard) return;
        setCardTier(selectedCard?.adminTier || "");
        setCardTierUntil(toDateInputUtc(selectedCard?.adminTierUntil));
        setUserTier(selectedCard?.ownerAdminTier || "");
        setUserTierUntil(toDateInputUtc(selectedCard?.ownerAdminTierUntil));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selectedCard?._id,
        selectedCard?.adminTier,
        selectedCard?.adminTierUntil,
        selectedCard?.ownerAdminTier,
        selectedCard?.ownerAdminTierUntil,
    ]);

    if (!token) {
        return (
            <main className={styles.adminRoot} dir="rtl">
                <div className={styles.centerCard}>
                    <h1 className={styles.title}>{t("title_admin")}</h1>
                    <p className={styles.subtitle}>
                        {t("subtitle_login_required")}
                    </p>
                    <p className={styles.muted}>{t("msg_login_as_admin")}</p>
                </div>
            </main>
        );
    }

    if (accessDenied) {
        return (
            <main className={styles.adminRoot} dir="rtl">
                <div className={styles.centerCard}>
                    <h1 className={styles.title}>{t("title_admin")}</h1>
                    <p className={styles.subtitle}>
                        {t("subtitle_access_denied")}
                    </p>
                    <p className={styles.muted}>
                        {t("msg_no_admin_permissions")}
                    </p>
                </div>
            </main>
        );
    }

    function focusTabInList(tabListEl, nextId) {
        if (!tabListEl) return;
        const next = tabListEl.querySelector(
            `[role="tab"][data-tab="${nextId}"]`,
        );
        next?.focus?.();
    }

    function handleTabListKeyDown(e, options) {
        const { current, setCurrent, order, tabListRef } = options;
        const idx = order.indexOf(current);
        if (idx < 0) return;

        const isArrowLeft = e.key === "ArrowLeft";
        const isArrowRight = e.key === "ArrowRight";
        const isHome = e.key === "Home";
        const isEnd = e.key === "End";

        if (!isArrowLeft && !isArrowRight && !isHome && !isEnd) return;
        e.preventDefault();

        let nextIndex = idx;
        if (isHome) nextIndex = 0;
        else if (isEnd) nextIndex = order.length - 1;
        else if (isArrowLeft) nextIndex = Math.max(0, idx - 1);
        else if (isArrowRight) nextIndex = Math.min(order.length - 1, idx + 1);

        const nextId = order[nextIndex];
        setCurrent(nextId);
        focusTabInList(tabListRef.current, nextId);
    }

    return (
        <main className={styles.adminRoot} dir="rtl">
            <header className={styles.topbar}>
                <div className={styles.topbarTitleWrap}>
                    <h1 className={styles.title}>{t("title_admin")}</h1>
                    <p className={styles.subtitle}>
                        {t("subtitle_admin_secure")}
                    </p>
                </div>
                <div className={styles.topbarActions}>
                    <Button onClick={handleRefreshClick} loading={loading}>
                        {t("btn_refresh")}
                    </Button>

                    <div
                        className={styles.tabs}
                        role="tablist"
                        aria-label="Admin mode"
                    >
                        <button
                            type="button"
                            className={`${styles.tab} ${
                                adminMode === "manage" ? styles.tabActive : ""
                            }`}
                            role="tab"
                            aria-selected={adminMode === "manage"}
                            onClick={() => setAdminMode("manage")}
                        >
                            ניהול
                        </button>
                        <button
                            type="button"
                            className={`${styles.tab} ${
                                adminMode === "analytics"
                                    ? styles.tabActive
                                    : ""
                            }`}
                            role="tab"
                            aria-selected={adminMode === "analytics"}
                            onClick={() => setAdminMode("analytics")}
                        >
                            אנליטיקה
                        </button>
                    </div>
                </div>
            </header>

            {adminMode === "manage" ? (
                <div className={styles.body}>
                    <section className={styles.leftRail} aria-label="Directory">
                        <div
                            className={`${styles.cardShell} ${styles.statsCard}`}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.headerRow}>
                                    <h2 className={styles.h2}>
                                        {t("section_stats")}
                                    </h2>
                                </div>
                                <p className={styles.muted}>
                                    {stats
                                        ? `${t("section_users")}: ${stats.users} · ${t(
                                              "section_cards",
                                          )}: ${stats.cardsTotal} · ${t(
                                              "stats_anonymous_cards",
                                          )}: ${stats.cardsAnonymous} · ${t(
                                              "stats_user_cards",
                                          )}: ${stats.cardsUserOwned} · ${t(
                                              "stats_published",
                                          )}: ${stats.publishedCards} · ${t(
                                              "label_active",
                                          )}: ${stats.activeCards}`
                                        : t("stats_none")}
                                </p>
                            </div>
                            <div className={styles.cardBody}>
                                <details className={styles.legendDetails}>
                                    <summary className={styles.legendSummary}>
                                        {t("section_legend")}
                                    </summary>
                                    <div className={styles.legend}>
                                        <p>
                                            הלוח הזה מיועד למנהלים בלבד. כל
                                            פעולה אדמינית דורשת מילוי “סיבה”
                                            ונרשמת ביומן הפעולות לצורכי מעקב
                                            ובקרה.
                                        </p>

                                        <p>
                                            סטטיסטיקות: סיכום מהיר של כמות
                                            משתמשים, כרטיסים, כרטיסים אנונימיים,
                                            כרטיסים בבעלות משתמשים, כרטיסים
                                            מפורסמים וכרטיסים פעילים.
                                        </p>

                                        <p>
                                            טבלאות “משתמשים” ו“כרטיסים”: לחיצה
                                            על שורה טוענת את הכרטיס הנבחר ומציגה
                                            את כל הפרטים והפעולות האפשריות.
                                        </p>

                                        <p>
                                            מזהה כרטיס (ID פנימי): המזהה הפנימי
                                            של הכרטיס במסד הנתונים (MongoDB). זה
                                            לא הסלאג ולא כתובת האתר.
                                        </p>

                                        <p>
                                            סלאג: הכתובת הקצרה של הכרטיס — החלק
                                            שמופיע ב־URL אחרי ‎/card/‎. הסלאג
                                            מוצג משמאל לימין (LTR) כדי שיהיה
                                            קריא.
                                        </p>

                                        <p>
                                            סטטוס: “טיוטה” או “מפורסם”. רק כרטיס
                                            “מפורסם” יכול להיות נגיש לציבור, וגם
                                            זה רק אם הוא פעיל ובבעלות משתמש (לא
                                            אנונימי).
                                        </p>

                                        <p>
                                            פעיל: אם “לא” — הכרטיס מושבת
                                            (isActive=false). במצב זה הכרטיס לא
                                            נגיש לציבור לפי סלאג, לא נאספים
                                            לידים, ולא נאספת אנליטיקה.
                                        </p>

                                        <p>
                                            בעלות: “משתמש” או “אנונימי”. כרטיס
                                            אנונימי לא משויך למשתמש, ולכן אין
                                            אפשרות להחיל עליו “רמת פיצ’רים
                                            למשתמש (ידני)”.
                                        </p>

                                        <p>
                                            מסלול תשלום בפועל: המסלול שהמערכת
                                            מחשיבה כבתוקף לצורכי גישה (free /
                                            monthly / yearly), לפי
                                            תשלום/ניסיון/הטבות ידניות.
                                        </p>

                                        <p>
                                            גישה פעילה: האם יש זכאות לגישה עכשיו
                                            (למשל ניסיון בתוקף או תשלום בתוקף).
                                            ייתכן “כן” גם אם “שולם” הוא “לא”
                                            (לדוגמה בתקופת ניסיון או בהטבה
                                            ידנית).
                                        </p>

                                        <p>
                                            שולם: האם יש תשלום פעיל בפועל. זה
                                            מדד תשלום בלבד, לא בהכרח מדד גישה.
                                        </p>

                                        <p>
                                            רמת פיצ’רים בפועל: free / basic /
                                            premium. זה משפיע על פיצ’רים שהכרטיס
                                            מקבל (למשל יכולות), ולא משנה את
                                            החיוב או התשלום של הלקוח.
                                        </p>

                                        <p>
                                            מקור: מאיפה נקבעה “רמת הפיצ’רים
                                            בפועל” (לדוגמה: לפי כרטיס, לפי
                                            משתמש, או לפי חיוב).
                                        </p>

                                        <p>
                                            עד: תאריך/זמן תפוגה של
                                            הטבה/override. אם מוגדר “עד”, אחרי
                                            הזמן הזה ההטבה תסתיים והמערכת תחזור
                                            להתנהגות הרגילה.
                                        </p>

                                        <p>
                                            סיום תקופת ניסיון: מוצג בשעון ישראל.
                                            אחרי הזמן הזה, אם אין זכאות אחרת,
                                            הגישה תיחסם.
                                        </p>

                                        <p>
                                            סטטוס תשלום בפועל: מציג מקור + מסלול
                                            + תאריך “עד” (אם קיים), כדי להבין מה
                                            בדיוק המערכת מחשיבה כמצב החיוב/גישה
                                            הנוכחי.
                                        </p>

                                        <p>
                                            הטבת מסלול (ידני): מאפשרת לקבוע
                                            מסלול לצורכי זכאות בלבד (ללא שינוי
                                            תשלום בפועל). השדה “עד תאריך” מוחל
                                            עד סוף היום של התאריך שנבחר (UTC).
                                        </p>

                                        <p>
                                            רמת פיצ’רים לכרטיס (ידני): קובעת רמת
                                            פיצ’רים לכרטיס ספציפי. אם מוגדר — זה
                                            גובר על רמת הפיצ’רים של המשתמש ועל
                                            מה שנגזר מהחיוב.
                                        </p>

                                        <p>
                                            רמת פיצ’רים למשתמש (ידני): קובעת רמת
                                            פיצ’רים לכל הכרטיסים של המשתמש (אלא
                                            אם לכרטיס יש override משלו). מופיע
                                            רק אם הכרטיס בבעלות משתמש.
                                        </p>

                                        <p>
                                            השבת כרטיס: משבית את הכרטיס
                                            (isActive=false) בלי למחוק אותו.
                                            הפעל כרטיס: מחזיר את הכרטיס לפעיל
                                            (isActive=true).
                                        </p>

                                        <p>
                                            הארכת ניסיון: “ימים מעכשיו” קובע
                                            סיום לסוף היום בישראל לאחר N ימים.
                                            “יום ושעה מדויקים” קובע תאריך/שעה
                                            בישראל בדיוק. ימים=0 מסיים ניסיון
                                            מיידית.
                                        </p>

                                        <p>
                                            שים לב: ערכים טכניים כמו ID, אימייל
                                            וסלאג מוצגים כ־LTR כדי למנוע בלבול
                                            בתוך ממשק RTL.
                                        </p>
                                    </div>
                                </details>
                            </div>
                        </div>

                        <div
                            className={`${styles.cardShell} ${styles.directoryCard}`}
                        >
                            <div className={styles.cardHeader}>
                                {error ? (
                                    <FlashBanner
                                        type="error"
                                        message={error}
                                        autoHideMs={0}
                                        onDismiss={() => setError("")}
                                    />
                                ) : null}
                                <div
                                    className={styles.tabs}
                                    role="tablist"
                                    aria-label="Directory tabs"
                                    ref={directoryTabListRef}
                                    onKeyDown={(e) =>
                                        handleTabListKeyDown(e, {
                                            current: directoryTab,
                                            setCurrent: setDirectoryTab,
                                            order: ["cards", "users", "orgs"],
                                            tabListRef: directoryTabListRef,
                                        })
                                    }
                                >
                                    <button
                                        type="button"
                                        className={`${styles.tab} ${
                                            directoryTab === "cards"
                                                ? styles.tabActive
                                                : ""
                                        }`}
                                        role="tab"
                                        data-tab="cards"
                                        aria-selected={directoryTab === "cards"}
                                        aria-controls="admin-directory-panel"
                                        onClick={() => setDirectoryTab("cards")}
                                    >
                                        {t("section_cards")}
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.tab} ${
                                            directoryTab === "users"
                                                ? styles.tabActive
                                                : ""
                                        }`}
                                        role="tab"
                                        data-tab="users"
                                        aria-selected={directoryTab === "users"}
                                        aria-controls="admin-directory-panel"
                                        onClick={() => setDirectoryTab("users")}
                                    >
                                        {t("section_users")}
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.tab} ${
                                            directoryTab === "orgs"
                                                ? styles.tabActive
                                                : ""
                                        }`}
                                        role="tab"
                                        data-tab="orgs"
                                        aria-selected={directoryTab === "orgs"}
                                        aria-controls="admin-directory-panel"
                                        onClick={() => setDirectoryTab("orgs")}
                                    >
                                        {t("section_orgs")}
                                    </button>
                                </div>

                                {directoryTab === "cards" ? (
                                    <div className={styles.directoryTools}>
                                        <div className={styles.searchRow}>
                                            <Input
                                                label="חיפוש כרטיסים"
                                                value={cardsQuery}
                                                onChange={(e) =>
                                                    setCardsQuery(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="סלאג או אימייל בעלים"
                                                className={styles.searchInput}
                                            />

                                            {String(cardsQuery || "").trim() ? (
                                                <Button
                                                    variant="secondary"
                                                    size="small"
                                                    onClick={() =>
                                                        setCardsQuery("")
                                                    }
                                                >
                                                    נקה
                                                </Button>
                                            ) : null}
                                        </div>
                                        <p className={styles.muted}>
                                            מציג {filteredCards.length} מתוך{" "}
                                            {cards.length}
                                        </p>
                                    </div>
                                ) : null}
                            </div>

                            <div
                                id="admin-directory-panel"
                                className={styles.cardBody}
                                role="tabpanel"
                                aria-label="Directory panel"
                            >
                                {directoryTab === "orgs" ? (
                                    <AdminOrganizationsView />
                                ) : null}
                                {directoryTab === "users" ? (
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>{t("th_email")}</th>
                                                <th>{t("th_card")}</th>
                                                <th>{t("th_role")}</th>
                                                <th>{t("th_created")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((u) => (
                                                <tr key={u._id}>
                                                    <td data-label="אימייל">
                                                        <button
                                                            className={
                                                                styles.rowBtn
                                                            }
                                                            type="button"
                                                            onClick={() =>
                                                                loadUser(u._id)
                                                            }
                                                            disabled={loading}
                                                            title={u._id}
                                                        >
                                                            <span
                                                                className={
                                                                    styles.ltr
                                                                }
                                                                dir="ltr"
                                                            >
                                                                {u.email}
                                                            </span>
                                                        </button>
                                                    </td>
                                                    <td data-label="כרטיס">
                                                        {u?.cardSummary
                                                            ?.slug ? (
                                                            <button
                                                                className={
                                                                    styles.rowBtn
                                                                }
                                                                type="button"
                                                                onClick={() =>
                                                                    loadCard(
                                                                        u
                                                                            .cardSummary
                                                                            .cardId,
                                                                    )
                                                                }
                                                                disabled={
                                                                    loading
                                                                }
                                                                title={
                                                                    u
                                                                        .cardSummary
                                                                        .cardId
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.ltr
                                                                    }
                                                                    dir="ltr"
                                                                >
                                                                    {
                                                                        u
                                                                            .cardSummary
                                                                            .slug
                                                                    }
                                                                </span>{" "}
                                                                (
                                                                <span
                                                                    className={
                                                                        styles.ltr
                                                                    }
                                                                    dir="ltr"
                                                                >
                                                                    {cardStatusHe(
                                                                        u
                                                                            .cardSummary
                                                                            .status,
                                                                    )}
                                                                </span>
                                                                )
                                                                {u?.cardSummary
                                                                    ?.ownershipMismatch ? (
                                                                    <span
                                                                        className={
                                                                            styles.mismatchBadge
                                                                        }
                                                                    >
                                                                        ⚠
                                                                        mismatch
                                                                    </span>
                                                                ) : null}
                                                            </button>
                                                        ) : u?.cardSummary
                                                              ?.missing ? (
                                                            <span
                                                                className={
                                                                    styles.muted
                                                                }
                                                            >
                                                                {t(
                                                                    "label_missing",
                                                                )}
                                                            </span>
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </td>
                                                    <td data-label="תפקיד">
                                                        {roleHe(u.role)}
                                                    </td>
                                                    <td data-label="נוצר">
                                                        {formatDate(
                                                            u.createdAt,
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>{t("th_slug")}</th>
                                                    <th>{t("th_owner")}</th>
                                                    <th>{t("label_status")}</th>
                                                    <th>{t("label_active")}</th>
                                                    <th>{t("th_updated")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredCards.map((c) => (
                                                    <tr key={c._id}>
                                                        <td data-label="סלאג">
                                                            <button
                                                                className={
                                                                    styles.rowBtn
                                                                }
                                                                onClick={() =>
                                                                    loadCard(
                                                                        c._id,
                                                                    )
                                                                }
                                                                type="button"
                                                                disabled={
                                                                    loading
                                                                }
                                                                title={c._id}
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.ltr
                                                                    }
                                                                    dir="ltr"
                                                                >
                                                                    {c.slug ||
                                                                        t(
                                                                            "label_no_slug",
                                                                        )}
                                                                </span>
                                                            </button>
                                                        </td>
                                                        <td data-label="בעלות">
                                                            {c?.ownerSummary
                                                                ?.type ===
                                                            "user" ? (
                                                                <span
                                                                    title={
                                                                        c
                                                                            .ownerSummary
                                                                            .email ||
                                                                        ""
                                                                    }
                                                                    className={
                                                                        styles.truncate
                                                                    }
                                                                    dir="ltr"
                                                                >
                                                                    <span
                                                                        className={
                                                                            styles.ltr
                                                                        }
                                                                        dir="ltr"
                                                                    >
                                                                        {c
                                                                            .ownerSummary
                                                                            .email ||
                                                                            "—"}
                                                                    </span>
                                                                </span>
                                                            ) : c?.ownerSummary
                                                                  ?.type ===
                                                              "anonymous" ? (
                                                                <span
                                                                    className={
                                                                        styles.muted
                                                                    }
                                                                >
                                                                    {t(
                                                                        "owner_anonymous",
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </td>
                                                        <td data-label="סטטוס">
                                                            {cardStatusHe(
                                                                c.status,
                                                            )}
                                                        </td>
                                                        <td data-label="פעיל">
                                                            {boolHe(
                                                                !!c.isActive,
                                                            )}
                                                        </td>
                                                        <td data-label="עודכן">
                                                            {formatDate(
                                                                c.updatedAt,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {selectedCardId && !selectedCard ? (
                                            <p className={styles.muted}>
                                                {t("msg_loading_card")}
                                            </p>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </div>

                        <div
                            className={`${styles.cardShell} ${styles.selectedCard} ${styles.mobileOnly}`}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.headerRow}>
                                    <h2 className={styles.h2}>
                                        {t("section_selected_card")}
                                    </h2>
                                </div>

                                {selectedCard ? (
                                    <div className={styles.selectedHeaderStrip}>
                                        <div className={styles.selectedPrimary}>
                                            <span
                                                className={styles.selectedLabel}
                                            >
                                                {t("label_slug")}:
                                            </span>{" "}
                                            <span
                                                className={`${styles.ltr} ${styles.selectedValue}`}
                                                dir="ltr"
                                                title={selectedCard.slug || ""}
                                            >
                                                {selectedCard.slug || ""}
                                            </span>
                                        </div>
                                        <div className={styles.selectedMeta}>
                                            <span className={styles.metaPill}>
                                                <span
                                                    className={styles.metaKey}
                                                >
                                                    {t("label_id")}:
                                                </span>{" "}
                                                <span
                                                    className={styles.ltr}
                                                    dir="ltr"
                                                    title={selectedCard._id}
                                                >
                                                    {selectedCard._id}
                                                </span>
                                            </span>
                                            <span className={styles.metaPill}>
                                                <span
                                                    className={styles.metaKey}
                                                >
                                                    {t("label_status")}:
                                                </span>{" "}
                                                <span
                                                    className={styles.ltr}
                                                    dir="ltr"
                                                >
                                                    {cardStatusHe(
                                                        selectedCard.status,
                                                    )}
                                                </span>
                                            </span>
                                            <span className={styles.metaPill}>
                                                <span
                                                    className={styles.metaKey}
                                                >
                                                    {t("label_active")}:
                                                </span>{" "}
                                                <span>
                                                    {boolHe(
                                                        !!selectedCard.isActive,
                                                    )}
                                                </span>
                                            </span>
                                            <span className={styles.metaPill}>
                                                <span
                                                    className={styles.metaKey}
                                                >
                                                    {t("label_owner")}:
                                                </span>{" "}
                                                <span>
                                                    {selectedCardOwnerLabel}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                {selectedCard ? (
                                    <div
                                        className={styles.commandBar}
                                        aria-label="Command bar"
                                    >
                                        <div
                                            className={styles.commandBarButtons}
                                        >
                                            <Button
                                                variant="secondary"
                                                size="small"
                                                className={styles.commandBtn}
                                                onClick={() =>
                                                    setSelectedTab("billing")
                                                }
                                            >
                                                חיוב
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="small"
                                                className={styles.commandBtn}
                                                onClick={() =>
                                                    setSelectedTab("actions")
                                                }
                                            >
                                                פעולות
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="small"
                                                className={styles.commandBtn}
                                                onClick={() =>
                                                    setSelectedTab("danger")
                                                }
                                            >
                                                סכנה
                                            </Button>
                                        </div>
                                        <div className={styles.commandBarHint}>
                                            קיצורי דרך לכרטיס הנבחר
                                        </div>
                                    </div>
                                ) : null}

                                <div
                                    className={styles.tabs}
                                    role="tablist"
                                    aria-label="Selected card tabs"
                                    ref={selectedTabListRefMobile}
                                    onKeyDown={(e) =>
                                        handleTabListKeyDown(e, {
                                            current: selectedTab,
                                            setCurrent: setSelectedTab,
                                            order: [
                                                "general",
                                                "billing",
                                                "actions",
                                                "danger",
                                            ],
                                            tabListRef:
                                                selectedTabListRefMobile,
                                        })
                                    }
                                >
                                    <button
                                        type="button"
                                        className={`${styles.tab} ${
                                            selectedTab === "general"
                                                ? styles.tabActive
                                                : ""
                                        }`}
                                        role="tab"
                                        data-tab="general"
                                        aria-selected={
                                            selectedTab === "general"
                                        }
                                        aria-controls="admin-selected-panel-mobile"
                                        onClick={() =>
                                            setSelectedTab("general")
                                        }
                                    >
                                        כללי
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.tab} ${
                                            selectedTab === "billing"
                                                ? styles.tabActive
                                                : ""
                                        }`}
                                        role="tab"
                                        data-tab="billing"
                                        aria-selected={
                                            selectedTab === "billing"
                                        }
                                        aria-controls="admin-selected-panel-mobile"
                                        onClick={() =>
                                            setSelectedTab("billing")
                                        }
                                    >
                                        חיוב
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.tab} ${
                                            selectedTab === "actions"
                                                ? styles.tabActive
                                                : ""
                                        }`}
                                        role="tab"
                                        data-tab="actions"
                                        aria-selected={
                                            selectedTab === "actions"
                                        }
                                        aria-controls="admin-selected-panel-mobile"
                                        onClick={() =>
                                            setSelectedTab("actions")
                                        }
                                    >
                                        פעולות
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.tab} ${
                                            selectedTab === "danger"
                                                ? styles.tabActive
                                                : ""
                                        }`}
                                        role="tab"
                                        data-tab="danger"
                                        aria-selected={selectedTab === "danger"}
                                        aria-controls="admin-selected-panel-mobile"
                                        onClick={() => setSelectedTab("danger")}
                                    >
                                        סכנה
                                    </button>
                                </div>
                            </div>

                            <div
                                id="admin-selected-panel-mobile"
                                className={styles.cardBody}
                                role="tabpanel"
                                aria-label="Selected card panel"
                            >
                                {!selectedCard ? (
                                    <p className={styles.muted}>
                                        {t("msg_select_card")}
                                    </p>
                                ) : null}

                                {selectedCard ? (
                                    <>
                                        {selectedTab === "general" ? (
                                            <div
                                                className={styles.sectionBlock}
                                            >
                                                <div
                                                    className={
                                                        styles.sectionTitle
                                                    }
                                                >
                                                    {t("section_card_details")}
                                                </div>
                                                <dl className={styles.kvDl}>
                                                    <dt className={styles.kvDt}>
                                                        {t("label_id")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                            title={
                                                                selectedCard._id
                                                            }
                                                        >
                                                            {selectedCard._id}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("label_slug")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                            title={
                                                                selectedCard.slug ||
                                                                ""
                                                            }
                                                        >
                                                            {selectedCard.slug ||
                                                                ""}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("label_status")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {cardStatusHe(
                                                                selectedCard.status,
                                                            )}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("label_active")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span>
                                                            {boolHe(
                                                                !!selectedCard.isActive,
                                                            )}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("label_owner")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span>
                                                            {
                                                                selectedCardOwnerLabel
                                                            }
                                                        </span>
                                                    </dd>
                                                </dl>
                                            </div>
                                        ) : null}

                                        {selectedTab === "billing" ? (
                                            <div
                                                className={styles.sectionBlock}
                                            >
                                                <div
                                                    className={
                                                        styles.sectionTitle
                                                    }
                                                >
                                                    Billing
                                                </div>
                                                <dl className={styles.kvDl}>
                                                    <dt className={styles.kvDt}>
                                                        {t(
                                                            "label_effective_plan",
                                                        )}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span>
                                                            {planHe(
                                                                selectedEffectivePlan,
                                                            )}
                                                        </span>
                                                        {" · "}
                                                        {t(
                                                            "label_entitled",
                                                        )}:{" "}
                                                        <span>
                                                            {boolHe(
                                                                selectedIsEntitled,
                                                            )}
                                                        </span>
                                                        {" · "}
                                                        {t("label_paid")}:{" "}
                                                        <span>
                                                            {boolHe(
                                                                selectedIsPaid,
                                                            )}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t(
                                                            "label_effective_tier",
                                                        )}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span>
                                                            {tierHe(
                                                                selectedEffectiveTier,
                                                            )}
                                                        </span>
                                                        {" · "}
                                                        {t("label_tier_source")}
                                                        :{" "}
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {selectedTierSource}
                                                        </span>
                                                        {selectedTierUntil
                                                            ? ` · ${t(
                                                                  "label_until",
                                                              )} ${formatDate(
                                                                  selectedTierUntil,
                                                              )}`
                                                            : ""}
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("label_trial_ends")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {selectedCard?.trialEndsAtIsrael ||
                                                                formatDate(
                                                                    selectedCard.trialEndsAt,
                                                                )}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t(
                                                            "label_effective_billing",
                                                        )}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {selectedBilling?.source ||
                                                                ""}{" "}
                                                            /{" "}
                                                            {selectedBilling?.plan
                                                                ? planHe(
                                                                      selectedBilling.plan,
                                                                  )
                                                                : ""}
                                                        </span>{" "}
                                                        {selectedBilling?.untilIsrael
                                                            ? `${t(
                                                                  "label_until",
                                                              )} ${selectedBilling.untilIsrael}`
                                                            : selectedBilling?.until
                                                              ? `${t(
                                                                    "label_until",
                                                                )} ${formatDate(
                                                                    selectedBilling.until,
                                                                )}`
                                                              : ""}
                                                    </dd>
                                                </dl>
                                            </div>
                                        ) : null}

                                        {selectedTab === "actions" ? (
                                            <div
                                                className={styles.sectionBlock}
                                            >
                                                <div
                                                    className={
                                                        styles.sectionTitle
                                                    }
                                                >
                                                    {t("section_admin_actions")}
                                                </div>

                                                <Input
                                                    label={t("label_reason")}
                                                    value={reason}
                                                    onChange={(e) =>
                                                        setReason(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder={t(
                                                        "placeholder_reason",
                                                    )}
                                                    required
                                                />

                                                <div
                                                    className={
                                                        styles.actionGroup
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.formRow
                                                        }
                                                    >
                                                        <label
                                                            className={
                                                                styles.selectField
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.selectLabel
                                                                }
                                                            >
                                                                {t(
                                                                    "label_trial_mode",
                                                                )}
                                                            </span>
                                                            <select
                                                                className={
                                                                    styles.select
                                                                }
                                                                value={
                                                                    trialMode
                                                                }
                                                                onChange={(e) =>
                                                                    setTrialMode(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            >
                                                                <option value="days">
                                                                    {t(
                                                                        "opt_trial_mode_days",
                                                                    )}
                                                                </option>
                                                                <option value="exact">
                                                                    {t(
                                                                        "opt_trial_mode_exact",
                                                                    )}
                                                                </option>
                                                            </select>
                                                        </label>

                                                        <label
                                                            className={
                                                                styles.selectField
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.selectLabel
                                                                }
                                                            >
                                                                {t(
                                                                    "label_trial_days",
                                                                )}
                                                            </span>
                                                            <select
                                                                className={
                                                                    styles.select
                                                                }
                                                                value={
                                                                    trialDays
                                                                }
                                                                onChange={(e) =>
                                                                    setTrialDays(
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ),
                                                                    )
                                                                }
                                                                disabled={
                                                                    trialMode !==
                                                                    "days"
                                                                }
                                                            >
                                                                {Array.from(
                                                                    {
                                                                        length: 15,
                                                                    },
                                                                    (_, i) => i,
                                                                ).map((n) => (
                                                                    <option
                                                                        key={n}
                                                                        value={
                                                                            n
                                                                        }
                                                                    >
                                                                        {n}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </label>

                                                        <Input
                                                            label={t(
                                                                "label_trial_date_il",
                                                            )}
                                                            type="date"
                                                            value={
                                                                trialUntilDate
                                                            }
                                                            onChange={(e) =>
                                                                setTrialUntilDate(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            disabled={
                                                                trialMode !==
                                                                "exact"
                                                            }
                                                        />

                                                        <label
                                                            className={
                                                                styles.selectField
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.selectLabel
                                                                }
                                                            >
                                                                {t(
                                                                    "label_trial_hour",
                                                                )}
                                                            </span>
                                                            <select
                                                                className={
                                                                    styles.select
                                                                }
                                                                value={
                                                                    trialUntilHour
                                                                }
                                                                onChange={(e) =>
                                                                    setTrialUntilHour(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                disabled={
                                                                    trialMode !==
                                                                    "exact"
                                                                }
                                                            >
                                                                {Array.from(
                                                                    {
                                                                        length: 24,
                                                                    },
                                                                    (_, i) => i,
                                                                ).map((h) => {
                                                                    const hh =
                                                                        String(
                                                                            h,
                                                                        ).padStart(
                                                                            2,
                                                                            "0",
                                                                        );
                                                                    return (
                                                                        <option
                                                                            key={
                                                                                hh
                                                                            }
                                                                            value={
                                                                                hh
                                                                            }
                                                                        >
                                                                            {hh}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </label>

                                                        <label
                                                            className={
                                                                styles.selectField
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.selectLabel
                                                                }
                                                            >
                                                                {t(
                                                                    "label_trial_minute",
                                                                )}
                                                            </span>
                                                            <select
                                                                className={
                                                                    styles.select
                                                                }
                                                                value={
                                                                    trialUntilMinute
                                                                }
                                                                onChange={(e) =>
                                                                    setTrialUntilMinute(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                disabled={
                                                                    trialMode !==
                                                                    "exact"
                                                                }
                                                            >
                                                                {Array.from(
                                                                    {
                                                                        length: 12,
                                                                    },
                                                                    (_, i) =>
                                                                        i * 5,
                                                                ).map((m) => {
                                                                    const mm =
                                                                        String(
                                                                            m,
                                                                        ).padStart(
                                                                            2,
                                                                            "0",
                                                                        );
                                                                    return (
                                                                        <option
                                                                            key={
                                                                                mm
                                                                            }
                                                                            value={
                                                                                mm
                                                                            }
                                                                        >
                                                                            {mm}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </label>

                                                        <Button
                                                            variant="secondary"
                                                            disabled={
                                                                loading ||
                                                                actionLoading.extend
                                                            }
                                                            loading={
                                                                actionLoading.extend
                                                            }
                                                            onClick={() =>
                                                                runAction(
                                                                    "extend",
                                                                    async (
                                                                        r,
                                                                    ) => {
                                                                        const payload =
                                                                            trialMode ===
                                                                            "exact"
                                                                                ? {
                                                                                      untilLocal:
                                                                                          {
                                                                                              date: trialUntilDate,
                                                                                              hour: Number(
                                                                                                  trialUntilHour,
                                                                                              ),
                                                                                              minute: Number(
                                                                                                  trialUntilMinute,
                                                                                              ),
                                                                                          },
                                                                                      reason: r,
                                                                                  }
                                                                                : {
                                                                                      days: Number(
                                                                                          trialDays,
                                                                                      ),
                                                                                      reason: r,
                                                                                  };

                                                                        const res =
                                                                            await adminExtendTrial(
                                                                                selectedCard._id,
                                                                                payload,
                                                                            );
                                                                        return res.data;
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            {t("btn_set")}
                                                        </Button>
                                                    </div>
                                                    {actionError.extend ? (
                                                        <p
                                                            className={
                                                                styles.errorText
                                                            }
                                                        >
                                                            {actionError.extend}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </section>

                    <section
                        className={styles.rightPanel}
                        aria-label={t("section_selected_card")}
                    >
                        <div
                            className={`${styles.cardShell} ${styles.selectedCard}`}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.headerRow}>
                                    <h2 className={styles.h2}>
                                        {t("section_selected_card")}
                                    </h2>
                                </div>

                                {selectedCard ? (
                                    <div className={styles.selectedHeaderStrip}>
                                        <div className={styles.selectedPrimary}>
                                            <span
                                                className={styles.selectedLabel}
                                            >
                                                {t("label_slug")}:
                                            </span>{" "}
                                            <span
                                                className={`${styles.ltr} ${styles.selectedValue}`}
                                                dir="ltr"
                                                title={selectedCard.slug || ""}
                                            >
                                                {selectedCard.slug || ""}
                                            </span>
                                        </div>
                                        <div className={styles.selectedMeta}>
                                            <span className={styles.metaPill}>
                                                <span
                                                    className={styles.metaKey}
                                                >
                                                    {t("label_id")}:
                                                </span>{" "}
                                                <span
                                                    className={styles.ltr}
                                                    dir="ltr"
                                                    title={selectedCard._id}
                                                >
                                                    {selectedCard._id}
                                                </span>
                                            </span>
                                            <span className={styles.metaPill}>
                                                <span
                                                    className={styles.metaKey}
                                                >
                                                    {t("label_status")}:
                                                </span>{" "}
                                                <span
                                                    className={styles.ltr}
                                                    dir="ltr"
                                                >
                                                    {cardStatusHe(
                                                        selectedCard.status,
                                                    )}
                                                </span>
                                            </span>
                                            <span className={styles.metaPill}>
                                                <span
                                                    className={styles.metaKey}
                                                >
                                                    {t("label_active")}:
                                                </span>{" "}
                                                <span>
                                                    {boolHe(
                                                        !!selectedCard.isActive,
                                                    )}
                                                </span>
                                            </span>
                                            <span className={styles.metaPill}>
                                                <span
                                                    className={styles.metaKey}
                                                >
                                                    {t("label_owner")}:
                                                </span>{" "}
                                                <span>
                                                    {selectedCardOwnerLabel}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                {selectedCard ? (
                                    <div
                                        className={styles.commandBar}
                                        aria-label="Command bar"
                                    >
                                        <div
                                            className={styles.commandBarButtons}
                                        >
                                            <Button
                                                variant="secondary"
                                                size="small"
                                                className={styles.commandBtn}
                                                onClick={() =>
                                                    setSelectedTab("billing")
                                                }
                                            >
                                                חיוב
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="small"
                                                className={styles.commandBtn}
                                                onClick={() =>
                                                    setSelectedTab("actions")
                                                }
                                            >
                                                פעולות
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="small"
                                                className={styles.commandBtn}
                                                onClick={() =>
                                                    setSelectedTab("danger")
                                                }
                                            >
                                                סכנה
                                            </Button>
                                        </div>
                                        <div className={styles.commandBarHint}>
                                            קיצורי דרך לכרטיס הנבחר
                                        </div>
                                    </div>
                                ) : null}

                                <div
                                    className={styles.tabs}
                                    role="tablist"
                                    aria-label="Selected card tabs"
                                    ref={selectedTabListRef}
                                    onKeyDown={(e) =>
                                        handleTabListKeyDown(e, {
                                            current: selectedTab,
                                            setCurrent: setSelectedTab,
                                            order: [
                                                "general",
                                                "billing",
                                                "actions",
                                                "danger",
                                            ],
                                            tabListRef: selectedTabListRef,
                                        })
                                    }
                                >
                                    <button
                                        type="button"
                                        className={`${styles.tab} ${
                                            selectedTab === "general"
                                                ? styles.tabActive
                                                : ""
                                        }`}
                                        role="tab"
                                        data-tab="general"
                                        aria-selected={
                                            selectedTab === "general"
                                        }
                                        aria-controls="admin-selected-panel"
                                        onClick={() =>
                                            setSelectedTab("general")
                                        }
                                    >
                                        כללי
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.tab} ${
                                            selectedTab === "billing"
                                                ? styles.tabActive
                                                : ""
                                        }`}
                                        role="tab"
                                        data-tab="billing"
                                        aria-selected={
                                            selectedTab === "billing"
                                        }
                                        aria-controls="admin-selected-panel"
                                        onClick={() =>
                                            setSelectedTab("billing")
                                        }
                                    >
                                        חיוב
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.tab} ${
                                            selectedTab === "actions"
                                                ? styles.tabActive
                                                : ""
                                        }`}
                                        role="tab"
                                        data-tab="actions"
                                        aria-selected={
                                            selectedTab === "actions"
                                        }
                                        aria-controls="admin-selected-panel"
                                        onClick={() =>
                                            setSelectedTab("actions")
                                        }
                                    >
                                        פעולות
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.tab} ${
                                            selectedTab === "danger"
                                                ? styles.tabActive
                                                : ""
                                        }`}
                                        role="tab"
                                        data-tab="danger"
                                        aria-selected={selectedTab === "danger"}
                                        aria-controls="admin-selected-panel"
                                        onClick={() => setSelectedTab("danger")}
                                    >
                                        סכנה
                                    </button>
                                </div>
                            </div>

                            <div
                                id="admin-selected-panel"
                                className={styles.cardBody}
                                role="tabpanel"
                                aria-label="Selected card panel"
                            >
                                {!selectedCard ? (
                                    <p className={styles.muted}>
                                        {t("msg_select_card")}
                                    </p>
                                ) : null}

                                {selectedCard ? (
                                    <>
                                        {selectedTab === "general" ? (
                                            <div
                                                className={styles.sectionBlock}
                                            >
                                                <div
                                                    className={
                                                        styles.sectionTitle
                                                    }
                                                >
                                                    {t("section_card_details")}
                                                </div>
                                                <dl className={styles.kvDl}>
                                                    <dt className={styles.kvDt}>
                                                        {t("label_id")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                            title={
                                                                selectedCard._id
                                                            }
                                                        >
                                                            {selectedCard._id}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("label_slug")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                            title={
                                                                selectedCard.slug ||
                                                                ""
                                                            }
                                                        >
                                                            {selectedCard.slug ||
                                                                ""}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("label_status")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {cardStatusHe(
                                                                selectedCard.status,
                                                            )}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("label_active")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span>
                                                            {boolHe(
                                                                !!selectedCard.isActive,
                                                            )}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("label_owner")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span>
                                                            {
                                                                selectedCardOwnerLabel
                                                            }
                                                        </span>
                                                    </dd>
                                                </dl>
                                            </div>
                                        ) : null}

                                        {selectedTab === "billing" ? (
                                            <div
                                                className={styles.sectionBlock}
                                            >
                                                <div
                                                    className={
                                                        styles.sectionTitle
                                                    }
                                                >
                                                    Billing
                                                </div>
                                                <dl className={styles.kvDl}>
                                                    <dt className={styles.kvDt}>
                                                        {t(
                                                            "label_effective_plan",
                                                        )}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span>
                                                            {planHe(
                                                                selectedEffectivePlan,
                                                            )}
                                                        </span>
                                                        {" · "}
                                                        {t(
                                                            "label_entitled",
                                                        )}:{" "}
                                                        <span>
                                                            {boolHe(
                                                                selectedIsEntitled,
                                                            )}
                                                        </span>
                                                        {" · "}
                                                        {t("label_paid")}:{" "}
                                                        <span>
                                                            {boolHe(
                                                                selectedIsPaid,
                                                            )}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t(
                                                            "label_effective_tier",
                                                        )}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span>
                                                            {tierHe(
                                                                selectedEffectiveTier,
                                                            )}
                                                        </span>
                                                        {" · "}
                                                        {t("label_tier_source")}
                                                        :{" "}
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {selectedTierSource}
                                                        </span>
                                                        {selectedTierUntil
                                                            ? ` · ${t("label_until")} ${formatDate(selectedTierUntil)}`
                                                            : ""}
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("label_trial_ends")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {selectedCard?.trialEndsAtIsrael ||
                                                                formatDate(
                                                                    selectedCard.trialEndsAt,
                                                                )}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t(
                                                            "label_effective_billing",
                                                        )}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {selectedBilling?.source ||
                                                                ""}{" "}
                                                            /{" "}
                                                            {selectedBilling?.plan
                                                                ? planHe(
                                                                      selectedBilling.plan,
                                                                  )
                                                                : ""}
                                                        </span>{" "}
                                                        {selectedBilling?.untilIsrael
                                                            ? `${t("label_until")} ${selectedBilling.untilIsrael}`
                                                            : selectedBilling?.until
                                                              ? `${t("label_until")} ${formatDate(selectedBilling.until)}`
                                                              : ""}
                                                    </dd>

                                                    {selectedCard?.adminOverride ? (
                                                        <>
                                                            <dt
                                                                className={
                                                                    styles.kvDt
                                                                }
                                                            >
                                                                {t(
                                                                    "label_admin_override",
                                                                )}
                                                            </dt>
                                                            <dd
                                                                className={
                                                                    styles.kvDd
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.ltr
                                                                    }
                                                                    dir="ltr"
                                                                >
                                                                    {selectedCard
                                                                        .adminOverride
                                                                        ?.plan
                                                                        ? planHe(
                                                                              selectedCard
                                                                                  .adminOverride
                                                                                  .plan,
                                                                          )
                                                                        : ""}
                                                                </span>{" "}
                                                                {selectedCard
                                                                    .adminOverride
                                                                    ?.until
                                                                    ? `${t("label_until")} ${formatDate(selectedCard.adminOverride.until)}`
                                                                    : ""}
                                                            </dd>
                                                        </>
                                                    ) : null}

                                                    {selectedCard?.adminTier ||
                                                    selectedCard?.adminTierUntil ? (
                                                        <>
                                                            <dt
                                                                className={
                                                                    styles.kvDt
                                                                }
                                                            >
                                                                {t(
                                                                    "label_card_tier_override",
                                                                )}
                                                            </dt>
                                                            <dd
                                                                className={
                                                                    styles.kvDd
                                                                }
                                                            >
                                                                <span>
                                                                    {selectedCard.adminTier
                                                                        ? tierHe(
                                                                              selectedCard.adminTier,
                                                                          )
                                                                        : ""}
                                                                </span>{" "}
                                                                {selectedCard.adminTierUntil
                                                                    ? `${t("label_until")} ${formatDate(selectedCard.adminTierUntil)}`
                                                                    : ""}
                                                            </dd>
                                                        </>
                                                    ) : null}

                                                    {selectedCard?.ownerAdminTier ||
                                                    selectedCard?.ownerAdminTierUntil ? (
                                                        <>
                                                            <dt
                                                                className={
                                                                    styles.kvDt
                                                                }
                                                            >
                                                                {t(
                                                                    "label_user_tier_override",
                                                                )}
                                                            </dt>
                                                            <dd
                                                                className={
                                                                    styles.kvDd
                                                                }
                                                            >
                                                                <span>
                                                                    {selectedCard.ownerAdminTier
                                                                        ? tierHe(
                                                                              selectedCard.ownerAdminTier,
                                                                          )
                                                                        : ""}
                                                                </span>{" "}
                                                                {selectedCard.ownerAdminTierUntil
                                                                    ? `${t("label_until")} ${formatDate(selectedCard.ownerAdminTierUntil)}`
                                                                    : ""}
                                                            </dd>
                                                        </>
                                                    ) : null}
                                                </dl>
                                            </div>
                                        ) : null}

                                        {selectedTab === "actions" ? (
                                            <div
                                                className={styles.sectionBlock}
                                            >
                                                <div
                                                    className={
                                                        styles.sectionTitle
                                                    }
                                                >
                                                    {t("section_admin_actions")}
                                                </div>

                                                <Input
                                                    label={t("label_reason")}
                                                    value={reason}
                                                    onChange={(e) =>
                                                        setReason(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder={t(
                                                        "placeholder_reason",
                                                    )}
                                                    required
                                                />

                                                <div
                                                    className={
                                                        styles.actionGroup
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.formRow
                                                        }
                                                    >
                                                        <label
                                                            className={
                                                                styles.selectField
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.selectLabel
                                                                }
                                                            >
                                                                {t(
                                                                    "label_trial_mode",
                                                                )}
                                                            </span>
                                                            <select
                                                                className={
                                                                    styles.select
                                                                }
                                                                value={
                                                                    trialMode
                                                                }
                                                                onChange={(e) =>
                                                                    setTrialMode(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            >
                                                                <option value="days">
                                                                    {t(
                                                                        "opt_trial_mode_days",
                                                                    )}
                                                                </option>
                                                                <option value="exact">
                                                                    {t(
                                                                        "opt_trial_mode_exact",
                                                                    )}
                                                                </option>
                                                            </select>
                                                        </label>

                                                        <label
                                                            className={
                                                                styles.selectField
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.selectLabel
                                                                }
                                                            >
                                                                {t(
                                                                    "label_trial_days",
                                                                )}
                                                            </span>
                                                            <select
                                                                className={
                                                                    styles.select
                                                                }
                                                                value={
                                                                    trialDays
                                                                }
                                                                onChange={(e) =>
                                                                    setTrialDays(
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ),
                                                                    )
                                                                }
                                                                disabled={
                                                                    trialMode !==
                                                                    "days"
                                                                }
                                                            >
                                                                {Array.from(
                                                                    {
                                                                        length: 15,
                                                                    },
                                                                    (_, i) => i,
                                                                ).map((n) => (
                                                                    <option
                                                                        key={n}
                                                                        value={
                                                                            n
                                                                        }
                                                                    >
                                                                        {n}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </label>

                                                        <Input
                                                            label={t(
                                                                "label_trial_date_il",
                                                            )}
                                                            type="date"
                                                            value={
                                                                trialUntilDate
                                                            }
                                                            onChange={(e) =>
                                                                setTrialUntilDate(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            disabled={
                                                                trialMode !==
                                                                "exact"
                                                            }
                                                        />

                                                        <label
                                                            className={
                                                                styles.selectField
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.selectLabel
                                                                }
                                                            >
                                                                {t(
                                                                    "label_trial_hour",
                                                                )}
                                                            </span>
                                                            <select
                                                                className={
                                                                    styles.select
                                                                }
                                                                value={
                                                                    trialUntilHour
                                                                }
                                                                onChange={(e) =>
                                                                    setTrialUntilHour(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                disabled={
                                                                    trialMode !==
                                                                    "exact"
                                                                }
                                                            >
                                                                {Array.from(
                                                                    {
                                                                        length: 24,
                                                                    },
                                                                    (_, i) => i,
                                                                ).map((h) => {
                                                                    const hh =
                                                                        String(
                                                                            h,
                                                                        ).padStart(
                                                                            2,
                                                                            "0",
                                                                        );
                                                                    return (
                                                                        <option
                                                                            key={
                                                                                hh
                                                                            }
                                                                            value={
                                                                                hh
                                                                            }
                                                                        >
                                                                            {hh}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </label>

                                                        <label
                                                            className={
                                                                styles.selectField
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.selectLabel
                                                                }
                                                            >
                                                                {t(
                                                                    "label_trial_minute",
                                                                )}
                                                            </span>
                                                            <select
                                                                className={
                                                                    styles.select
                                                                }
                                                                value={
                                                                    trialUntilMinute
                                                                }
                                                                onChange={(e) =>
                                                                    setTrialUntilMinute(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                disabled={
                                                                    trialMode !==
                                                                    "exact"
                                                                }
                                                            >
                                                                {Array.from(
                                                                    {
                                                                        length: 12,
                                                                    },
                                                                    (_, i) =>
                                                                        i * 5,
                                                                ).map((m) => {
                                                                    const mm =
                                                                        String(
                                                                            m,
                                                                        ).padStart(
                                                                            2,
                                                                            "0",
                                                                        );
                                                                    return (
                                                                        <option
                                                                            key={
                                                                                mm
                                                                            }
                                                                            value={
                                                                                mm
                                                                            }
                                                                        >
                                                                            {mm}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </label>

                                                        <Button
                                                            variant="secondary"
                                                            disabled={
                                                                loading ||
                                                                actionLoading.extend
                                                            }
                                                            loading={
                                                                actionLoading.extend
                                                            }
                                                            onClick={() =>
                                                                runAction(
                                                                    "extend",
                                                                    async (
                                                                        r,
                                                                    ) => {
                                                                        const payload =
                                                                            trialMode ===
                                                                            "exact"
                                                                                ? {
                                                                                      untilLocal:
                                                                                          {
                                                                                              date: trialUntilDate,
                                                                                              hour: Number(
                                                                                                  trialUntilHour,
                                                                                              ),
                                                                                              minute: Number(
                                                                                                  trialUntilMinute,
                                                                                              ),
                                                                                          },
                                                                                      reason: r,
                                                                                  }
                                                                                : {
                                                                                      days: Number(
                                                                                          trialDays,
                                                                                      ),
                                                                                      reason: r,
                                                                                  };

                                                                        const res =
                                                                            await adminExtendTrial(
                                                                                selectedCard._id,
                                                                                payload,
                                                                            );
                                                                        return res.data;
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            {t("btn_set")}
                                                        </Button>
                                                    </div>
                                                    {actionError.extend ? (
                                                        <p
                                                            className={
                                                                styles.errorText
                                                            }
                                                        >
                                                            {actionError.extend}
                                                        </p>
                                                    ) : null}
                                                </div>

                                                <div
                                                    className={
                                                        styles.actionGroup
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.formRow
                                                        }
                                                    >
                                                        <Input
                                                            label={t(
                                                                "label_override_plan",
                                                            )}
                                                            value={overridePlan}
                                                            onChange={(e) =>
                                                                setOverridePlan(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder={t(
                                                                "placeholder_override_plan",
                                                            )}
                                                        />
                                                        <Input
                                                            label={t(
                                                                "label_override_until",
                                                            )}
                                                            type="date"
                                                            value={
                                                                overrideUntil
                                                            }
                                                            onChange={(e) =>
                                                                setOverrideUntil(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder={t(
                                                                "placeholder_date_ymd",
                                                            )}
                                                        />
                                                        <Button
                                                            variant="secondary"
                                                            disabled={
                                                                loading ||
                                                                actionLoading.override
                                                            }
                                                            loading={
                                                                actionLoading.override
                                                            }
                                                            onClick={() =>
                                                                runAction(
                                                                    "override",
                                                                    async (
                                                                        r,
                                                                    ) => {
                                                                        const until =
                                                                            overrideUntil
                                                                                ? new Date(
                                                                                      `${overrideUntil}T23:59:59.999Z`,
                                                                                  ).toISOString()
                                                                                : "";
                                                                        const res =
                                                                            await adminOverridePlan(
                                                                                selectedCard._id,
                                                                                {
                                                                                    plan: String(
                                                                                        overridePlan ||
                                                                                            "",
                                                                                    ).trim(),
                                                                                    until,
                                                                                    reason: r,
                                                                                },
                                                                            );
                                                                        return res.data;
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            {t("btn_override")}
                                                        </Button>
                                                    </div>
                                                    {actionError.override ? (
                                                        <p
                                                            className={
                                                                styles.errorText
                                                            }
                                                        >
                                                            {
                                                                actionError.override
                                                            }
                                                        </p>
                                                    ) : null}
                                                </div>

                                                <div
                                                    className={
                                                        styles.actionGroup
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.formRow
                                                        }
                                                    >
                                                        <label
                                                            className={
                                                                styles.selectField
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.selectLabel
                                                                }
                                                            >
                                                                {t(
                                                                    "label_card_tier",
                                                                )}
                                                            </span>
                                                            <select
                                                                className={
                                                                    styles.select
                                                                }
                                                                value={cardTier}
                                                                onChange={(e) =>
                                                                    setCardTier(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            >
                                                                <option value="">
                                                                    {t(
                                                                        "opt_clear",
                                                                    )}
                                                                </option>
                                                                <option value="free">
                                                                    {t(
                                                                        "opt_tier_free",
                                                                    )}
                                                                </option>
                                                                <option value="basic">
                                                                    {t(
                                                                        "opt_tier_basic",
                                                                    )}
                                                                </option>
                                                                <option value="premium">
                                                                    {t(
                                                                        "opt_tier_premium",
                                                                    )}
                                                                </option>
                                                            </select>
                                                        </label>
                                                        <Input
                                                            label={t(
                                                                "label_card_tier_until",
                                                            )}
                                                            type="date"
                                                            value={
                                                                cardTierUntil
                                                            }
                                                            onChange={(e) =>
                                                                setCardTierUntil(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder={t(
                                                                "placeholder_date_ymd",
                                                            )}
                                                        />
                                                        <Button
                                                            variant="secondary"
                                                            disabled={
                                                                loading ||
                                                                actionLoading.cardTier
                                                            }
                                                            loading={
                                                                actionLoading.cardTier
                                                            }
                                                            onClick={() =>
                                                                runAction(
                                                                    "cardTier",
                                                                    async (
                                                                        r,
                                                                    ) => {
                                                                        const until =
                                                                            cardTierUntil
                                                                                ? new Date(
                                                                                      `${cardTierUntil}T23:59:59.999Z`,
                                                                                  ).toISOString()
                                                                                : "";
                                                                        const res =
                                                                            await adminSetCardTier(
                                                                                selectedCard._id,
                                                                                {
                                                                                    tier:
                                                                                        cardTier ||
                                                                                        null,
                                                                                    until,
                                                                                    reason: r,
                                                                                },
                                                                            );
                                                                        return res.data;
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            {t("btn_apply")}
                                                        </Button>
                                                    </div>
                                                    {actionError.cardTier ? (
                                                        <p
                                                            className={
                                                                styles.errorText
                                                            }
                                                        >
                                                            {
                                                                actionError.cardTier
                                                            }
                                                        </p>
                                                    ) : null}
                                                </div>

                                                {selectedCardOwner ===
                                                "user" ? (
                                                    <div
                                                        className={
                                                            styles.actionGroup
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.formRow
                                                            }
                                                        >
                                                            <label
                                                                className={
                                                                    styles.selectField
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.selectLabel
                                                                    }
                                                                >
                                                                    {t(
                                                                        "label_user_tier",
                                                                    )}
                                                                </span>
                                                                <select
                                                                    className={
                                                                        styles.select
                                                                    }
                                                                    value={
                                                                        userTier
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setUserTier(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                >
                                                                    <option value="">
                                                                        {t(
                                                                            "opt_clear",
                                                                        )}
                                                                    </option>
                                                                    <option value="free">
                                                                        {t(
                                                                            "opt_tier_free",
                                                                        )}
                                                                    </option>
                                                                    <option value="basic">
                                                                        {t(
                                                                            "opt_tier_basic",
                                                                        )}
                                                                    </option>
                                                                    <option value="premium">
                                                                        {t(
                                                                            "opt_tier_premium",
                                                                        )}
                                                                    </option>
                                                                </select>
                                                            </label>
                                                            <Input
                                                                label={t(
                                                                    "label_user_tier_until",
                                                                )}
                                                                type="date"
                                                                value={
                                                                    userTierUntil
                                                                }
                                                                onChange={(e) =>
                                                                    setUserTierUntil(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder={t(
                                                                    "placeholder_date_ymd",
                                                                )}
                                                            />
                                                            <Button
                                                                variant="secondary"
                                                                disabled={
                                                                    loading ||
                                                                    actionLoading.userTier
                                                                }
                                                                loading={
                                                                    actionLoading.userTier
                                                                }
                                                                onClick={
                                                                    runUserTierAction
                                                                }
                                                            >
                                                                {t("btn_apply")}
                                                            </Button>
                                                        </div>
                                                        {actionError.userTier ? (
                                                            <p
                                                                className={
                                                                    styles.errorText
                                                                }
                                                            >
                                                                {
                                                                    actionError.userTier
                                                                }
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        {selectedTab === "danger" ? (
                                            <div
                                                className={styles.sectionBlock}
                                            >
                                                <div
                                                    className={
                                                        styles.sectionTitle
                                                    }
                                                >
                                                    Danger
                                                </div>
                                                <Input
                                                    label={t("label_reason")}
                                                    value={reason}
                                                    onChange={(e) =>
                                                        setReason(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder={t(
                                                        "placeholder_reason",
                                                    )}
                                                    required
                                                />

                                                <div
                                                    className={
                                                        styles.actionGroup
                                                    }
                                                >
                                                    {selectedCard.isActive ? (
                                                        <Button
                                                            variant="secondary"
                                                            disabled={
                                                                loading ||
                                                                actionLoading.deactivate
                                                            }
                                                            loading={
                                                                actionLoading.deactivate
                                                            }
                                                            onClick={() =>
                                                                runAction(
                                                                    "deactivate",
                                                                    async (
                                                                        r,
                                                                    ) => {
                                                                        const res =
                                                                            await adminDeactivateCard(
                                                                                selectedCard._id,
                                                                                r,
                                                                            );
                                                                        return res.data;
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            {t(
                                                                "btn_deactivate",
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="secondary"
                                                            disabled={
                                                                loading ||
                                                                actionLoading.reactivate
                                                            }
                                                            loading={
                                                                actionLoading.reactivate
                                                            }
                                                            onClick={() =>
                                                                runAction(
                                                                    "reactivate",
                                                                    async (
                                                                        r,
                                                                    ) => {
                                                                        const res =
                                                                            await adminReactivateCard(
                                                                                selectedCard._id,
                                                                                r,
                                                                            );
                                                                        return res.data;
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            {t(
                                                                "btn_reactivate",
                                                            )}
                                                        </Button>
                                                    )}

                                                    {selectedCard.isActive &&
                                                    actionError.deactivate ? (
                                                        <p
                                                            className={
                                                                styles.errorText
                                                            }
                                                        >
                                                            {
                                                                actionError.deactivate
                                                            }
                                                        </p>
                                                    ) : null}
                                                    {!selectedCard.isActive &&
                                                    actionError.reactivate ? (
                                                        <p
                                                            className={
                                                                styles.errorText
                                                            }
                                                        >
                                                            {
                                                                actionError.reactivate
                                                            }
                                                        </p>
                                                    ) : null}

                                                    <Button
                                                        variant="danger"
                                                        disabled={
                                                            loading ||
                                                            actionLoading.delete
                                                        }
                                                        loading={
                                                            actionLoading.delete
                                                        }
                                                        onClick={
                                                            runDeleteAction
                                                        }
                                                    >
                                                        Delete permanently
                                                    </Button>

                                                    {actionError.delete ? (
                                                        <p
                                                            className={
                                                                styles.errorText
                                                            }
                                                        >
                                                            {actionError.delete}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}
                                    </>
                                ) : null}
                            </div>
                        </div>

                        {directoryTab === "users" && selectedUser ? (
                            <div className={styles.cardShell}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.headerRow}>
                                        <h2 className={styles.h2}>
                                            משתמש נבחר
                                        </h2>
                                    </div>

                                    {userDeleteSuccess ? (
                                        <FlashBanner
                                            type="success"
                                            message={userDeleteSuccess}
                                            autoHideMs={4500}
                                            onDismiss={() =>
                                                setUserDeleteSuccess("")
                                            }
                                        />
                                    ) : null}

                                    {selectedUserError ? (
                                        <p className={styles.errorText}>
                                            {selectedUserError}
                                        </p>
                                    ) : null}

                                    <div className={styles.selectedHeaderStrip}>
                                        <div className={styles.selectedPrimary}>
                                            <span
                                                className={styles.selectedLabel}
                                            >
                                                {t("th_email")}:
                                            </span>{" "}
                                            <span
                                                className={`${styles.ltr} ${styles.selectedValue}`}
                                                dir="ltr"
                                                title={
                                                    selectedUser?.email || ""
                                                }
                                            >
                                                {selectedUser?.email || ""}
                                            </span>
                                        </div>
                                        <div className={styles.selectedMeta}>
                                            <span className={styles.metaPill}>
                                                <span
                                                    className={styles.metaKey}
                                                >
                                                    ID:
                                                </span>{" "}
                                                <span
                                                    className={styles.ltr}
                                                    dir="ltr"
                                                    title={
                                                        selectedUser?._id || ""
                                                    }
                                                >
                                                    {selectedUser?._id || ""}
                                                </span>
                                            </span>
                                            <span className={styles.metaPill}>
                                                <span
                                                    className={styles.metaKey}
                                                >
                                                    {t("th_role")}:
                                                </span>{" "}
                                                <span>
                                                    {roleHe(selectedUser?.role)}
                                                </span>
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        className={styles.tabs}
                                        role="tablist"
                                        aria-label="Selected user tabs"
                                        ref={selectedUserTabListRef}
                                        onKeyDown={(e) =>
                                            handleTabListKeyDown(e, {
                                                current: selectedUserTab,
                                                setCurrent: setSelectedUserTab,
                                                order: [
                                                    "general",
                                                    "billing",
                                                    "actions",
                                                    "danger",
                                                ],
                                                tabListRef:
                                                    selectedUserTabListRef,
                                            })
                                        }
                                    >
                                        <button
                                            type="button"
                                            className={`${styles.tab} ${
                                                selectedUserTab === "general"
                                                    ? styles.tabActive
                                                    : ""
                                            }`}
                                            role="tab"
                                            aria-selected={
                                                selectedUserTab === "general"
                                            }
                                            onClick={() =>
                                                setSelectedUserTab("general")
                                            }
                                        >
                                            כללי
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.tab} ${
                                                selectedUserTab === "billing"
                                                    ? styles.tabActive
                                                    : ""
                                            }`}
                                            role="tab"
                                            aria-selected={
                                                selectedUserTab === "billing"
                                            }
                                            onClick={() =>
                                                setSelectedUserTab("billing")
                                            }
                                        >
                                            חיוב
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.tab} ${
                                                selectedUserTab === "actions"
                                                    ? styles.tabActive
                                                    : ""
                                            }`}
                                            role="tab"
                                            aria-selected={
                                                selectedUserTab === "actions"
                                            }
                                            onClick={() =>
                                                setSelectedUserTab("actions")
                                            }
                                        >
                                            פעולות
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.tab} ${
                                                selectedUserTab === "danger"
                                                    ? styles.tabActive
                                                    : ""
                                            }`}
                                            role="tab"
                                            aria-selected={
                                                selectedUserTab === "danger"
                                            }
                                            onClick={() =>
                                                setSelectedUserTab("danger")
                                            }
                                        >
                                            סכנה
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.cardBody}>
                                    {selectedUserTab === "general" ? (
                                        <div className={styles.sectionBlock}>
                                            <div className={styles.kv}>
                                                <dl className={styles.kvDl}>
                                                    <dt className={styles.kvDt}>
                                                        {t("th_email")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {selectedUser?.email ||
                                                                ""}
                                                        </span>
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("th_role")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        {roleHe(
                                                            selectedUser?.role,
                                                        )}
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("th_created")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        {formatDate(
                                                            selectedUser?.createdAt,
                                                        )}
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        עודכן
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        {selectedUser?.updatedAt
                                                            ? formatDate(
                                                                  selectedUser.updatedAt,
                                                              )
                                                            : "—"}
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        {t("th_card")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        {selectedUser?.cardId ? (
                                                            <span
                                                                className={
                                                                    styles.ltr
                                                                }
                                                                dir="ltr"
                                                            >
                                                                {String(
                                                                    selectedUser.cardId,
                                                                )}
                                                            </span>
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </dd>
                                                </dl>
                                            </div>
                                        </div>
                                    ) : selectedUserTab === "billing" ? (
                                        <div className={styles.sectionBlock}>
                                            <div className={styles.kv}>
                                                <dl className={styles.kvDl}>
                                                    <dt className={styles.kvDt}>
                                                        Plan
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        {planHe(
                                                            selectedUser?.plan,
                                                        )}
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        Tier
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        {selectedUser?.adminTier
                                                            ? tierHe(
                                                                  selectedUser.adminTier,
                                                              )
                                                            : "—"}
                                                        {selectedUser?.adminTierUntil
                                                            ? ` · עד ${formatDate(selectedUser.adminTierUntil)}`
                                                            : ""}
                                                    </dd>

                                                    <dt className={styles.kvDt}>
                                                        Subscription
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {selectedUser
                                                                ?.subscription
                                                                ?.status
                                                                ? String(
                                                                      selectedUser
                                                                          .subscription
                                                                          .status,
                                                                  )
                                                                : "inactive"}
                                                        </span>
                                                        {selectedUser
                                                            ?.subscription
                                                            ?.expiresAt
                                                            ? ` · expires ${formatDate(selectedUser.subscription.expiresAt)}`
                                                            : ""}
                                                        {selectedUser
                                                            ?.subscription
                                                            ?.provider
                                                            ? ` · provider ${String(selectedUser.subscription.provider)}`
                                                            : ""}
                                                    </dd>
                                                </dl>
                                            </div>
                                        </div>
                                    ) : selectedUserTab === "danger" ? (
                                        <div className={styles.sectionBlock}>
                                            <div
                                                className={styles.sectionTitle}
                                            >
                                                סכנה
                                            </div>

                                            <Input
                                                label={t("label_reason")}
                                                value={reason}
                                                onChange={(e) =>
                                                    setReason(e.target.value)
                                                }
                                                placeholder={t(
                                                    "placeholder_reason",
                                                )}
                                                required
                                            />

                                            <Input
                                                label='הקלד "DELETE" לאישור'
                                                value={userDeleteConfirm}
                                                onChange={(e) =>
                                                    setUserDeleteConfirm(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="DELETE"
                                                required
                                            />

                                            <div className={styles.actionGroup}>
                                                <Button
                                                    variant="danger"
                                                    disabled={loading}
                                                    loading={loading}
                                                    onClick={
                                                        runUserDeletePermanent
                                                    }
                                                >
                                                    Delete user permanently
                                                </Button>

                                                {userDeleteError ? (
                                                    <p
                                                        className={
                                                            styles.errorText
                                                        }
                                                    >
                                                        {userDeleteError}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className={styles.muted}>
                                            Coming later
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </section>
                </div>
            ) : (
                <AdminAnalyticsView refreshKey={analyticsRefreshKey} />
            )}
        </main>
    );
}
