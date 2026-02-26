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
    adminSetAnalyticsPremium,
    adminSetUserSubscription,
    adminRevokeUserSubscription,
    adminOverridePlan,
    adminReactivateCard,
    adminSetCardBilling,
    adminRevokeCardBilling,
    adminSyncCardBillingFromUser,
    adminClearCardAdminOverride,
    adminSetCardTier,
    adminSetUserTier,
    getAdminCardById,
    getAdminStats,
    getAdminUserById,
    listAdminAudit,
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

        section_provenance: "מקור סטטוס (Provenance)",
        label_raw_billing: "Billing (Raw)",
        label_raw_payer: "Payer (Raw)",
        label_audit_history: "Audit אחרון",
        label_latest_audit: "אירוע אחרון",
        label_when: "מתי",
        label_action: "פעולה",
        label_mode: "mode",
        label_by_admin: "admin",
        msg_audit_loading: "טוען audit…",
        msg_audit_empty: "אין אירועי audit לכרטיס זה.",

        label_analytics: "אנליטיקה",
        label_can_view_analytics: "גישה לאנליטיקה",
        label_analytics_retention: "שמירת נתונים (ימים)",

        label_admin_override: "הטבת מסלול (ידני)",
        label_card_tier_override: "רמת פיצ'רים לכרטיס (ידני)",
        label_user_tier_override: "רמת פיצ'רים למשתמש (ידני)",

        section_billing_crud: "ניהול חיובים (Billing CRUD)",
        section_user_subscription: "מנוי משתמש",
        section_card_billing_crud: "חיוב כרטיס (Runtime SSoT)",
        msg_user_subscription_help:
            "זהו רישום מנוי למשתמש. כדי להשפיע על ה- runtime בכרטיס יש לבצע סנכרון או להגדיר חיוב לכרטיס.",
        msg_card_billing_help:
            "זה משפיע מיידית על Card.effectiveBilling ועל חוויית paid בכרטיס.",
        label_user_id: "User ID",
        label_card_id_crud: "Card ID",
        label_plan_crud: "מסלול",
        label_expires_at_iso: "תוקף מנוי עד (תאריך ושעה)",
        label_paid_until_iso: "תשלום פעיל עד (תאריך ושעה)",
        btn_enable_subscription: "הפעל מנוי",
        btn_revoke_subscription: "בטל מנוי",
        btn_enable_card_billing: "הפעל תשלום לכרטיס",
        btn_revoke_card_billing: "בטל תשלום לכרטיס",
        btn_sync_from_user: "סנכרן מהמשתמש",
        btn_clear_override: "נקה Override",
        warn_override_precedence:
            "Override פעיל גובר על Billing ולכן isPaid עשוי להיות false. נדרש ניקוי Override באופן מפורש.",

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

        label_analytics_premium: "אנליטיקס פרימיום",

        label_payer_type: "סוג משלם",
        label_payer_note: "הערת משלם",
        opt_keep_current: "השאר ללא שינוי",
        opt_payer_none: "ללא",
        opt_payer_user: "משתמש",
        opt_payer_org: "ארגון",

        section_legend: "מקרא",
        legend_intro:
            "לוח ניהול למנהלים בלבד. כל פעולה דורשת מילוי שדה «סיבה» ונרשמת ב־Audit לצורכי מעקב ובקרה.",
        legend_nav: "ניווט",
        legend_nav_desc:
            "לוח הניהול מחולק לשלושה אזורים: סרגל סטטיסטיקות עליון, אזור מרכזי עם טבלאות ספרייה (כרטיסים / משתמשים / ארגונים), ופאנל כרטיס נבחר עם טאבים.",
        legend_tab_general: "טאב «כללי»",
        legend_tab_general_desc:
            "מציג פרטי כרטיס בסיסיים: מזהה פנימי (MongoDB ID), סלאג (כתובת קצרה), סטטוס (טיוטה/מפורסם), פעיל (כן/לא), ובעלות (משתמש/אנונימי).",
        legend_tab_billing: "טאב «חיוב»",
        legend_tab_billing_desc:
            "מציג מצב חיוב בפועל: מסלול תשלום (free/monthly/yearly), גישה פעילה (entitled), שולם (isPaid), רמת פיצ'רים (free/basic/premium) + מקור + תוקף, סיום ניסיון, וסטטוס תשלום מפורט.",
        legend_provenance: "Provenance",
        legend_provenance_desc:
            "בתוך טאב חיוב — מציג נתונים גולמיים: Billing Raw (status · plan · paidUntil), Payer Raw (type · source · updatedAt), והיסטוריית Audit עם פעולה, מקור, admin, וסיבה.",
        legend_tab_actions: "טאב «פעולות מנהל»",
        legend_tab_actions_items:
            "הארכת ניסיון (ימים / תאריך מדויק), הטבת מסלול ידנית (plan override), רמת פיצ'רים לכרטיס (tier override), רמת פיצ'רים למשתמש (רק אם הכרטיס בבעלות משתמש), אנליטיקס פרימיום (toggle).",
        legend_tab_danger: "טאב «אזור סכנה»",
        legend_tab_danger_desc:
            "השבתה/הפעלה מחדש של כרטיס (isActive), מחיקת כרטיס לצמיתות, מחיקת משתמש לצמיתות. כל פעולה דורשת אישור.",
        legend_billing_crud: "פאנל «ניהול חיובים»",
        legend_billing_crud_desc: "פאנל ימני נפרד עם שתי יחידות:",
        legend_user_sub:
            "מנוי משתמש — הגדרת plan + תוקף ברמת User.subscription. לא משפיע ישירות על כרטיס עד ביצוע סנכרון.",
        legend_card_billing:
            "חיוב כרטיס (SSoT) — קובע Card.billing ומשפיע מיידית על effectiveBilling. כולל: מסלול, תשלום עד, סוג משלם, הערת משלם, סנכרון מהמשתמש, Force org payer, וניקוי Override.",
        legend_slug_note:
            "סלאג: כתובת קצרה. כרטיסים אישיים: /card/:slug. כרטיסי ארגון: /c/:orgSlug/:slug.",
        legend_ltr_note:
            "ערכים טכניים (ID, אימייל, סלאג, תאריכים) מוצגים LTR למניעת בלבול בממשק RTL.",
        section_danger: "אזור סכנה",
        confirm_delete_card: "למחוק את הכרטיס לצמיתות? פעולה זו בלתי הפיכה.",
        confirm_delete_user: "למחוק את המשתמש לצמיתות? פעולה זו בלתי הפיכה.",
        btn_delete_card_permanently: "מחק כרטיס לצמיתות",
        btn_delete_user_permanently: "מחק משתמש לצמיתות",
        msg_coming_later: "בקרוב",

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

        label_force_org_payer: "Force (org payer)",
        msg_sync_uses_saved_db:
            "Sync uses saved DB User.subscription.expiresAt.",
        err_org_payer_locked:
            "התשלום משויך לארגון (Org payer lock). סמן Force (org payer) ונסה שוב.",

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

        err_invalid_datetime: "תאריך/שעה לא תקינים.",
        err_datetime_required: "יש לבחור תאריך ושעה.",
        err_datetime_must_be_empty_for_free:
            "במסלול חינמי יש להשאיר את השדה ריק.",
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
    if (code === "ORG_PAYER_LOCKED") return t("err_org_payer_locked");
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

function billingStatusHe(status) {
    if (status === "free") return t("billing_status_free");
    if (status === "trial") return t("billing_status_trial");
    if (status === "active") return t("billing_status_active");
    if (status === "past_due") return t("billing_status_past_due");
    if (status === "canceled") return t("billing_status_canceled");
    return String(status || "");
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

    const [selectedTab, setSelectedTab] = useState("general");
    const [selectedUserTab, setSelectedUserTab] = useState("general");
    const [cardsQuery, setCardsQuery] = useState("");
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
        billingUserSet: false,
        billingUserRevoke: false,
        billingCardSet: false,
        billingCardRevoke: false,
        billingCardSync: false,
        billingOverrideClear: false,
        analyticsPremium: false,
    });

    const [actionError, setActionError] = useState({
        deactivate: "",
        reactivate: "",
        delete: "",
        extend: "",
        override: "",
        cardTier: "",
        userTier: "",
        billingUserSet: "",
        billingUserRevoke: "",
        billingCardSet: "",
        billingCardRevoke: "",
        billingCardSync: "",
        billingOverrideClear: "",
        analyticsPremium: "",
    });

    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [cards, setCards] = useState([]);

    const [selectedCardId, setSelectedCardId] = useState("");
    const [selectedCard, setSelectedCard] = useState(null);

    const [selectedAuditItems, setSelectedAuditItems] = useState([]);
    const [selectedAuditStatus, setSelectedAuditStatus] = useState("idle");
    const [selectedAuditError, setSelectedAuditError] = useState("");

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

    const [billingUserId, setBillingUserId] = useState("");
    const [billingUserPlan, setBillingUserPlan] = useState("free");
    const [billingUserExpiresAt, setBillingUserExpiresAt] = useState("");
    const [billingUserResult, setBillingUserResult] = useState(null);

    const [billingCards, setBillingCards] = useState([]);
    const [billingCardsStatus, setBillingCardsStatus] = useState("idle");
    const [billingCardsError, setBillingCardsError] = useState("");

    const [billingCardId, setBillingCardId] = useState("");
    const [billingCardPlan, setBillingCardPlan] = useState("free");
    const [billingCardPaidUntil, setBillingCardPaidUntil] = useState("");
    const [billingCardForceSync, setBillingCardForceSync] = useState(false);
    const [billingCardResult, setBillingCardResult] = useState(null);

    const [billingCardPayerType, setBillingCardPayerType] = useState("");
    const [billingCardPayerNote, setBillingCardPayerNote] = useState("");
    const [billingCardPayerNoteTouched, setBillingCardPayerNoteTouched] =
        useState(false);

    const billingUserIdTrimmed = useMemo(
        () => String(billingUserId || "").trim(),
        [billingUserId],
    );

    const billingUserIdLooksValid = useMemo(
        () => /^[0-9a-f]{24}$/i.test(billingUserIdTrimmed),
        [billingUserIdTrimmed],
    );

    const billingCardIdTrimmed = useMemo(
        () => String(billingCardId || "").trim(),
        [billingCardId],
    );

    const billingCardActionsDisabled = useMemo(
        () => loading || !billingCardIdTrimmed,
        [loading, billingCardIdTrimmed],
    );

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

    const selectedProvenanceSource = useMemo(() => {
        if (!selectedCard) return "";
        if (selectedCard?.adminOverride) return "adminOverride";
        return String(selectedBilling?.source || "");
    }, [selectedCard, selectedBilling]);

    const selectedLatestAudit = useMemo(() => {
        if (!Array.isArray(selectedAuditItems)) return null;
        return selectedAuditItems.length ? selectedAuditItems[0] : null;
    }, [selectedAuditItems]);

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

    function trimToNull(value) {
        const v = String(value || "").trim();
        return v ? v : null;
    }

    function pad2(n) {
        return String(Number(n)).padStart(2, "0");
    }

    function isoToDatetimeLocalValue(isoZ) {
        if (!isoZ) return "";
        const d = new Date(String(isoZ));
        if (!Number.isFinite(d.getTime())) return "";

        const yyyy = d.getFullYear();
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const hh = pad2(d.getHours());
        const min = pad2(d.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }

    function parseDatetimeLocalToDate(value) {
        const v = String(value || "").trim();
        const m =
            /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})$/.exec(v);
        if (!m) return null;

        const year = Number(m[1]);
        const month = Number(m[2]);
        const day = Number(m[3]);
        const hour = Number(m[4]);
        const minute = Number(m[5]);

        if (!Number.isFinite(year) || year < 1970 || year > 2100) return null;
        if (!Number.isFinite(month) || month < 1 || month > 12) return null;
        if (!Number.isFinite(day) || day < 1 || day > 31) return null;
        if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
        if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;

        const d = new Date(year, month - 1, day, hour, minute, 0, 0);
        if (!Number.isFinite(d.getTime())) return null;

        if (d.getFullYear() !== year) return null;
        if (d.getMonth() !== month - 1) return null;
        if (d.getDate() !== day) return null;
        if (d.getHours() !== hour) return null;
        if (d.getMinutes() !== minute) return null;

        return d;
    }

    function normalizeAdminDateInput(raw) {
        const trimmed = String(raw || "").trim();
        if (!trimmed) {
            return { ok: true, isoZ: null, date: null, uiError: null };
        }

        const hasExplicitTz = /(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(trimmed);

        if (hasExplicitTz) {
            const d = new Date(trimmed);
            if (!Number.isFinite(d.getTime())) {
                return {
                    ok: false,
                    isoZ: null,
                    date: null,
                    uiError: t("err_invalid_datetime"),
                };
            }
            return { ok: true, isoZ: d.toISOString(), date: d, uiError: null };
        }

        const d = parseDatetimeLocalToDate(trimmed);
        if (!d) {
            return {
                ok: false,
                isoZ: null,
                date: null,
                uiError: t("err_invalid_datetime"),
            };
        }

        return { ok: true, isoZ: d.toISOString(), date: d, uiError: null };
    }

    const billingUserExpiresAtNorm = useMemo(
        () => normalizeAdminDateInput(billingUserExpiresAt),
        [billingUserExpiresAt],
    );
    const billingCardPaidUntilNorm = useMemo(
        () => normalizeAdminDateInput(billingCardPaidUntil),
        [billingCardPaidUntil],
    );

    async function runBillingUserAction(actionKey, fn) {
        const r = requireReason();
        if (!r) return;

        setActionError((prev) => ({ ...prev, [actionKey]: "" }));

        setLoading(true);
        setError("");
        setActionLoading((prev) => ({ ...prev, [actionKey]: true }));
        try {
            const result = await fn(r);
            setBillingUserResult(result);

            const nextPlan = result?.plan;
            if (typeof nextPlan === "string" && nextPlan.trim()) {
                setBillingUserPlan(nextPlan.trim());
            }

            const nextUserId = result?.userId;
            if (typeof nextUserId === "string" && nextUserId.trim()) {
                setBillingUserId(nextUserId.trim());
            }

            const nextExpiresAt = result?.subscription?.expiresAt || null;
            setBillingUserExpiresAt(isoToDatetimeLocalValue(nextExpiresAt));

            setReason("");
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

    async function runBillingCardAction(actionKey, fn) {
        const r = requireReason();
        if (!r) return;

        setActionError((prev) => ({ ...prev, [actionKey]: "" }));

        setLoading(true);
        setError("");
        setActionLoading((prev) => ({ ...prev, [actionKey]: true }));
        try {
            const dto = await fn(r);
            setBillingCardResult(dto);

            const nextCardId = dto?._id;
            if (typeof nextCardId === "string" && nextCardId.trim()) {
                setBillingCardId(nextCardId.trim());
            }

            const nextPlan = dto?.plan;
            if (typeof nextPlan === "string" && nextPlan.trim()) {
                setBillingCardPlan(nextPlan.trim());
            }

            const nextPaidUntil = dto?.billing?.paidUntil || null;
            setBillingCardPaidUntil(isoToDatetimeLocalValue(nextPaidUntil));

            setBillingCardPayerType("");
            setBillingCardPayerNote(dto?.billing?.payer?.note ?? "");
            setBillingCardPayerNoteTouched(false);

            if (dto?._id && selectedCard?._id === dto._id) {
                setSelectedCard(dto);
            }
            if (dto?._id) updateCardInList(dto);

            setReason("");
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

    async function runBillingCardActionNoReason(actionKey, fn) {
        setActionError((prev) => ({ ...prev, [actionKey]: "" }));

        setLoading(true);
        setError("");
        setActionLoading((prev) => ({ ...prev, [actionKey]: true }));
        try {
            const dto = await fn();
            setBillingCardResult(dto);

            const nextCardId = dto?._id;
            if (typeof nextCardId === "string" && nextCardId.trim()) {
                setBillingCardId(nextCardId.trim());
            }

            const nextPlan = dto?.plan;
            if (typeof nextPlan === "string" && nextPlan.trim()) {
                setBillingCardPlan(nextPlan.trim());
            }

            const nextPaidUntil = dto?.billing?.paidUntil || null;
            setBillingCardPaidUntil(isoToDatetimeLocalValue(nextPaidUntil));

            if (dto?._id && selectedCard?._id === dto._id) {
                setSelectedCard(dto);
            }
            if (dto?._id) updateCardInList(dto);
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

        const confirmed = window.confirm(t("confirm_delete_card"));
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

        const confirmed = window.confirm(t("confirm_delete_user"));
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

    useEffect(() => {
        const nextUserId = selectedUser?._id ? String(selectedUser._id) : "";
        const currUserId = String(billingUserId || "").trim();

        if (!nextUserId) return;

        if (nextUserId !== currUserId) {
            setBillingUserId(nextUserId);
            setBillingUserPlan(selectedUser?.plan ?? "free");

            const iso = selectedUser?.subscription?.expiresAt || null;
            setBillingUserExpiresAt(isoToDatetimeLocalValue(iso));

            // Reset card-scoped state to avoid stale cards from the previously selected user.
            setBillingCards([]);
            setBillingCardsStatus("idle");
            setBillingCardsError("");
            setBillingCardId("");
            setBillingCardResult(null);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selectedUser?._id,
        selectedUser?.subscription?.expiresAt,
        selectedUser?.plan,
    ]);

    useEffect(() => {
        if (!billingUserIdTrimmed || !billingUserIdLooksValid) {
            setBillingCards([]);
            setBillingCardsStatus("idle");
            setBillingCardsError("");
            setBillingCardId("");
            setBillingCardResult(null);
            return;
        }

        let cancelled = false;
        setBillingCardsStatus("loading");
        setBillingCardsError("");

        (async () => {
            try {
                const res = await listAdminCards({
                    userId: billingUserIdTrimmed,
                });
                if (cancelled) return;

                const items = Array.isArray(res?.data?.items)
                    ? res.data.items
                    : [];
                setBillingCards(items);
                setBillingCardsStatus("ready");

                if (items.length === 1 && items[0]?._id) {
                    setBillingCardId(String(items[0]._id));
                    setBillingCardResult(null);
                    return;
                }

                if (items.length === 0) {
                    setBillingCardId("");
                    setBillingCardResult(null);
                    return;
                }

                setBillingCardId((prev) => {
                    const prevId = String(prev || "").trim();
                    if (!prevId) return "";
                    const stillExists = items.some(
                        (c) => String(c?._id || "") === prevId,
                    );
                    return stillExists ? prevId : "";
                });
                setBillingCardResult(null);
            } catch (err) {
                if (cancelled) return;
                setBillingCards([]);
                setBillingCardsStatus("error");
                setBillingCardsError(mapApiErrorToHebrew(err, "err_generic"));
                setBillingCardId("");
                setBillingCardResult(null);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [billingUserIdTrimmed, billingUserIdLooksValid]);

    useEffect(() => {
        const current = String(billingCardPaidUntil || "").trim();
        if (current) return;
        const iso = selectedCard?.billing?.paidUntil || null;
        setBillingCardPaidUntil(isoToDatetimeLocalValue(iso));

        const currCardId = String(billingCardId || "").trim();
        if (!currCardId && selectedCard?._id) {
            setBillingCardId(String(selectedCard._id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCard?._id, selectedCard?.billing?.paidUntil]);

    useEffect(() => {
        const cardId = String(selectedCard?._id || "").trim();
        if (!cardId) {
            setSelectedAuditItems([]);
            setSelectedAuditStatus("idle");
            setSelectedAuditError("");
            return;
        }

        let cancelled = false;
        setSelectedAuditStatus("loading");
        setSelectedAuditError("");

        (async () => {
            try {
                const res = await listAdminAudit({
                    targetType: "card",
                    targetId: cardId,
                    limit: 10,
                });
                if (cancelled) return;

                const items = Array.isArray(res?.data?.items)
                    ? res.data.items
                    : [];
                setSelectedAuditItems(items);
                setSelectedAuditStatus("ready");
            } catch (err) {
                if (cancelled) return;
                setSelectedAuditItems([]);
                setSelectedAuditStatus("error");
                setSelectedAuditError(mapApiErrorToHebrew(err, "err_generic"));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedCard?._id]);

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

    /* ---- shared danger tab body (card) — used by mobile + desktop ---- */
    function renderCardDangerTab() {
        if (!selectedCard) return null;
        return (
            <div className={styles.sectionBlock}>
                <div className={styles.sectionTitle}>{t("section_danger")}</div>
                <Input
                    label={t("label_reason")}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("placeholder_reason")}
                    required
                />

                <div className={styles.actionGroup}>
                    {selectedCard.isActive ? (
                        <Button
                            variant="secondary"
                            disabled={loading || actionLoading.deactivate}
                            loading={actionLoading.deactivate}
                            onClick={() =>
                                runAction("deactivate", async (r) => {
                                    const res = await adminDeactivateCard(
                                        selectedCard._id,
                                        r,
                                    );
                                    return res.data;
                                })
                            }
                        >
                            {t("btn_deactivate")}
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            disabled={loading || actionLoading.reactivate}
                            loading={actionLoading.reactivate}
                            onClick={() =>
                                runAction("reactivate", async (r) => {
                                    const res = await adminReactivateCard(
                                        selectedCard._id,
                                        r,
                                    );
                                    return res.data;
                                })
                            }
                        >
                            {t("btn_reactivate")}
                        </Button>
                    )}

                    {selectedCard.isActive && actionError.deactivate ? (
                        <p className={styles.errorText}>
                            {actionError.deactivate}
                        </p>
                    ) : null}
                    {!selectedCard.isActive && actionError.reactivate ? (
                        <p className={styles.errorText}>
                            {actionError.reactivate}
                        </p>
                    ) : null}

                    <Button
                        variant="danger"
                        disabled={loading || actionLoading.delete}
                        loading={actionLoading.delete}
                        onClick={runDeleteAction}
                    >
                        {t("btn_delete_card_permanently")}
                    </Button>

                    {actionError.delete ? (
                        <p className={styles.errorText}>{actionError.delete}</p>
                    ) : null}
                </div>
            </div>
        );
    }

    /* ---- shared analytics premium toggle — used by mobile + desktop ---- */
    function renderAnalyticsPremiumToggle() {
        return (
            <div className={styles.formRow}>
                <label className={styles.toggleRow}>
                    <input
                        type="checkbox"
                        checked={Boolean(
                            selectedCard?.billing?.features?.analyticsPremium,
                        )}
                        disabled={
                            actionLoading.analyticsPremium || !selectedCard?._id
                        }
                        onChange={(e) => {
                            const next = e.target.checked;
                            runAction("analyticsPremium", async (r) => {
                                const res = await adminSetAnalyticsPremium(
                                    selectedCard._id,
                                    { enabled: next, reason: r },
                                );
                                return res.data;
                            });
                        }}
                    />
                    <span>{t("label_analytics_premium")}</span>
                </label>
                {actionError.analyticsPremium ? (
                    <p className={styles.errorText}>
                        {actionError.analyticsPremium}
                    </p>
                ) : null}
            </div>
        );
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
                        aria-label="מצב ניהול"
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

            <div className={styles.scrollArea}>
                {adminMode === "manage" ? (
                    <div className={styles.body}>
                        <section
                            className={styles.leftRail}
                            aria-label="Directory"
                        >
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
                                        <summary
                                            className={styles.legendSummary}
                                        >
                                            {t("section_legend")}
                                        </summary>
                                        <div className={styles.legend}>
                                            <p className={styles.legendIntro}>
                                                {t("legend_intro")}
                                            </p>

                                            <section
                                                className={styles.legendGroup}
                                            >
                                                <h4
                                                    className={
                                                        styles.legendHeading
                                                    }
                                                >
                                                    {t("legend_nav")}
                                                </h4>
                                                <p>{t("legend_nav_desc")}</p>
                                            </section>

                                            <section
                                                className={styles.legendGroup}
                                            >
                                                <h4
                                                    className={
                                                        styles.legendHeading
                                                    }
                                                >
                                                    {t("legend_tab_general")}
                                                </h4>
                                                <p>
                                                    {t(
                                                        "legend_tab_general_desc",
                                                    )}
                                                </p>
                                                <dl className={styles.legendDl}>
                                                    <dt>{t("label_slug")}</dt>
                                                    <dd>
                                                        {t("legend_slug_note")}
                                                    </dd>
                                                </dl>
                                            </section>

                                            <section
                                                className={styles.legendGroup}
                                            >
                                                <h4
                                                    className={
                                                        styles.legendHeading
                                                    }
                                                >
                                                    {t("legend_tab_billing")}
                                                </h4>
                                                <p>
                                                    {t(
                                                        "legend_tab_billing_desc",
                                                    )}
                                                </p>
                                                <dl className={styles.legendDl}>
                                                    <dt>
                                                        {t("legend_provenance")}
                                                    </dt>
                                                    <dd>
                                                        {t(
                                                            "legend_provenance_desc",
                                                        )}
                                                    </dd>
                                                </dl>
                                            </section>

                                            <section
                                                className={styles.legendGroup}
                                            >
                                                <h4
                                                    className={
                                                        styles.legendHeading
                                                    }
                                                >
                                                    {t("legend_tab_actions")}
                                                </h4>
                                                <p>
                                                    {t(
                                                        "legend_tab_actions_items",
                                                    )}
                                                </p>
                                            </section>

                                            <section
                                                className={styles.legendGroup}
                                            >
                                                <h4
                                                    className={
                                                        styles.legendHeading
                                                    }
                                                >
                                                    {t("legend_tab_danger")}
                                                </h4>
                                                <p>
                                                    {t(
                                                        "legend_tab_danger_desc",
                                                    )}
                                                </p>
                                            </section>

                                            <section
                                                className={styles.legendGroup}
                                            >
                                                <h4
                                                    className={
                                                        styles.legendHeading
                                                    }
                                                >
                                                    {t("legend_billing_crud")}
                                                </h4>
                                                <p>
                                                    {t(
                                                        "legend_billing_crud_desc",
                                                    )}
                                                </p>
                                                <dl className={styles.legendDl}>
                                                    <dt>
                                                        {t(
                                                            "section_user_subscription",
                                                        )}
                                                    </dt>
                                                    <dd>
                                                        {t("legend_user_sub")}
                                                    </dd>
                                                    <dt>
                                                        {t(
                                                            "section_card_billing_crud",
                                                        )}
                                                    </dt>
                                                    <dd>
                                                        {t(
                                                            "legend_card_billing",
                                                        )}
                                                    </dd>
                                                </dl>
                                            </section>

                                            <p className={styles.legendNote}>
                                                {t("legend_ltr_note")}
                                            </p>
                                        </div>
                                    </details>
                                </div>
                            </div>

                            {error ? (
                                <FlashBanner
                                    type="error"
                                    message={error}
                                    autoHideMs={0}
                                    onDismiss={() => setError("")}
                                />
                            ) : null}

                            <details
                                className={`${styles.queuePanel} ${styles.queueCards}`}
                                open
                            >
                                <summary className={styles.queueSummary}>
                                    {t("section_cards")}
                                    <span className={styles.queueCount}>
                                        ({filteredCards.length}/{cards.length})
                                    </span>
                                </summary>
                                <div className={styles.queueBody}>
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
                                                                loadCard(c._id)
                                                            }
                                                            type="button"
                                                            disabled={loading}
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
                                                        {cardStatusHe(c.status)}
                                                    </td>
                                                    <td data-label="פעיל">
                                                        {boolHe(!!c.isActive)}
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
                                </div>
                            </details>

                            <details
                                className={`${styles.queuePanel} ${styles.queueUsers}`}
                            >
                                <summary className={styles.queueSummary}>
                                    {t("section_users")}
                                    <span className={styles.queueCount}>
                                        ({users.length})
                                    </span>
                                </summary>
                                <div className={styles.queueBody}>
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
                                </div>
                            </details>

                            <details
                                className={`${styles.queuePanel} ${styles.queueOrgs}`}
                            >
                                <summary className={styles.queueSummary}>
                                    {t("section_orgs")}
                                </summary>
                                <div className={styles.queueBody}>
                                    <AdminOrganizationsView />
                                </div>
                            </details>

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
                                        <div
                                            className={
                                                styles.selectedHeaderStrip
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.selectedPrimary
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles.selectedLabel
                                                    }
                                                >
                                                    {t("label_slug")}:
                                                </span>{" "}
                                                <span
                                                    className={`${styles.ltr} ${styles.selectedValue}`}
                                                    dir="ltr"
                                                    title={
                                                        selectedCard.slug || ""
                                                    }
                                                >
                                                    {selectedCard.slug || ""}
                                                </span>
                                            </div>
                                            <div
                                                className={styles.selectedMeta}
                                            >
                                                <span
                                                    className={styles.metaPill}
                                                >
                                                    <span
                                                        className={
                                                            styles.metaKey
                                                        }
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
                                                <span
                                                    className={styles.metaPill}
                                                >
                                                    <span
                                                        className={
                                                            styles.metaKey
                                                        }
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
                                                <span
                                                    className={styles.metaPill}
                                                >
                                                    <span
                                                        className={
                                                            styles.metaKey
                                                        }
                                                    >
                                                        {t("label_active")}:
                                                    </span>{" "}
                                                    <span>
                                                        {boolHe(
                                                            !!selectedCard.isActive,
                                                        )}
                                                    </span>
                                                </span>
                                                <span
                                                    className={styles.metaPill}
                                                >
                                                    <span
                                                        className={
                                                            styles.metaKey
                                                        }
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
                                                className={
                                                    styles.commandBarButtons
                                                }
                                            >
                                                <Button
                                                    variant="secondary"
                                                    size="small"
                                                    className={
                                                        styles.commandBtn
                                                    }
                                                    onClick={() =>
                                                        setSelectedTab(
                                                            "billing",
                                                        )
                                                    }
                                                >
                                                    חיוב
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="small"
                                                    className={
                                                        styles.commandBtn
                                                    }
                                                    onClick={() =>
                                                        setSelectedTab(
                                                            "actions",
                                                        )
                                                    }
                                                >
                                                    פעולות
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="small"
                                                    className={
                                                        styles.commandBtn
                                                    }
                                                    onClick={() =>
                                                        setSelectedTab("danger")
                                                    }
                                                >
                                                    סכנה
                                                </Button>
                                            </div>
                                            <div
                                                className={
                                                    styles.commandBarHint
                                                }
                                            >
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
                                            aria-selected={
                                                selectedTab === "danger"
                                            }
                                            aria-controls="admin-selected-panel-mobile"
                                            onClick={() =>
                                                setSelectedTab("danger")
                                            }
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
                                                    className={
                                                        styles.sectionBlock
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.sectionTitle
                                                        }
                                                    >
                                                        {t(
                                                            "section_card_details",
                                                        )}
                                                    </div>
                                                    <dl className={styles.kvDl}>
                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("label_id")}
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
                                                                title={
                                                                    selectedCard._id
                                                                }
                                                            >
                                                                {
                                                                    selectedCard._id
                                                                }
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("label_slug")}
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
                                                                title={
                                                                    selectedCard.slug ||
                                                                    ""
                                                                }
                                                            >
                                                                {selectedCard.slug ||
                                                                    ""}
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("label_status")}
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
                                                                {cardStatusHe(
                                                                    selectedCard.status,
                                                                )}
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("label_active")}
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
                                                            <span>
                                                                {boolHe(
                                                                    !!selectedCard.isActive,
                                                                )}
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("label_owner")}
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
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
                                                    className={
                                                        styles.sectionBlock
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.sectionTitle
                                                        }
                                                    >
                                                        Billing
                                                    </div>
                                                    <dl className={styles.kvDl}>
                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t(
                                                                "label_effective_plan",
                                                            )}
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
                                                            <span>
                                                                {planHe(
                                                                    selectedEffectivePlan,
                                                                )}
                                                            </span>
                                                            {" · "}
                                                            {t(
                                                                "label_entitled",
                                                            )}
                                                            :{" "}
                                                            <span>
                                                                {boolHe(
                                                                    selectedIsEntitled,
                                                                )}
                                                            </span>
                                                            {" · "}
                                                            {t(
                                                                "label_paid",
                                                            )}:{" "}
                                                            <span>
                                                                {boolHe(
                                                                    selectedIsPaid,
                                                                )}
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t(
                                                                "label_effective_tier",
                                                            )}
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
                                                            <span>
                                                                {tierHe(
                                                                    selectedEffectiveTier,
                                                                )}
                                                            </span>
                                                            {" · "}
                                                            {t(
                                                                "label_tier_source",
                                                            )}
                                                            :{" "}
                                                            <span
                                                                className={
                                                                    styles.ltr
                                                                }
                                                                dir="ltr"
                                                            >
                                                                {
                                                                    selectedTierSource
                                                                }
                                                            </span>
                                                            {selectedTierUntil
                                                                ? ` · ${t(
                                                                      "label_until",
                                                                  )} ${formatDate(
                                                                      selectedTierUntil,
                                                                  )}`
                                                                : ""}
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t(
                                                                "label_trial_ends",
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
                                                                {selectedCard?.trialEndsAtIsrael ||
                                                                    formatDate(
                                                                        selectedCard.trialEndsAt,
                                                                    )}
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t(
                                                                "label_effective_billing",
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

                                                    <div
                                                        className={
                                                            styles.provenancePanel
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.provenanceHeader
                                                            }
                                                        >
                                                            <div
                                                                className={
                                                                    styles.provenanceHeaderLeft
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.provenancePill
                                                                    }
                                                                >
                                                                    {t(
                                                                        "section_provenance",
                                                                    )}
                                                                    :{" "}
                                                                    <span
                                                                        className={
                                                                            styles.ltr
                                                                        }
                                                                        dir="ltr"
                                                                    >
                                                                        {selectedProvenanceSource ||
                                                                            "—"}
                                                                    </span>
                                                                </span>

                                                                {selectedLatestAudit ? (
                                                                    <span
                                                                        className={
                                                                            styles.muted
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "label_latest_audit",
                                                                        )}
                                                                        :{" "}
                                                                        <span
                                                                            className={
                                                                                styles.ltr
                                                                            }
                                                                            dir="ltr"
                                                                        >
                                                                            {selectedLatestAudit.action ||
                                                                                ""}
                                                                            {selectedLatestAudit.mode
                                                                                ? ` (${selectedLatestAudit.mode})`
                                                                                : ""}
                                                                        </span>
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        <dl
                                                            className={
                                                                styles.kvDl
                                                            }
                                                        >
                                                            <dt
                                                                className={
                                                                    styles.kvDt
                                                                }
                                                            >
                                                                {t(
                                                                    "label_raw_billing",
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
                                                                    status=
                                                                    {billingStatusHe(
                                                                        selectedCard
                                                                            ?.billing
                                                                            ?.status,
                                                                    )}
                                                                    {selectedCard
                                                                        ?.billing
                                                                        ?.plan
                                                                        ? ` · plan=${planHe(selectedCard.billing.plan)}`
                                                                        : ""}
                                                                    {selectedCard
                                                                        ?.billing
                                                                        ?.paidUntil
                                                                        ? ` · paidUntil=${selectedCard.billing.paidUntil}`
                                                                        : ""}
                                                                </span>
                                                            </dd>

                                                            <dt
                                                                className={
                                                                    styles.kvDt
                                                                }
                                                            >
                                                                {t(
                                                                    "label_raw_payer",
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
                                                                        ?.billing
                                                                        ?.payer
                                                                        ? `type=${selectedCard.billing.payer.type || ""} · source=${selectedCard.billing.payer.source || ""}${selectedCard.billing.payer.updatedAt ? ` · updatedAt=${selectedCard.billing.payer.updatedAt}` : ""}`
                                                                        : "—"}
                                                                </span>
                                                            </dd>

                                                            <dt
                                                                className={
                                                                    styles.kvDt
                                                                }
                                                            >
                                                                {t(
                                                                    "label_audit_history",
                                                                )}
                                                            </dt>
                                                            <dd
                                                                className={
                                                                    styles.kvDd
                                                                }
                                                            >
                                                                {selectedAuditStatus ===
                                                                "loading" ? (
                                                                    <span
                                                                        className={
                                                                            styles.muted
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "msg_audit_loading",
                                                                        )}
                                                                    </span>
                                                                ) : selectedAuditStatus ===
                                                                  "error" ? (
                                                                    <span
                                                                        className={
                                                                            styles.errorText
                                                                        }
                                                                    >
                                                                        {
                                                                            selectedAuditError
                                                                        }
                                                                    </span>
                                                                ) : selectedAuditItems.length ===
                                                                  0 ? (
                                                                    <span
                                                                        className={
                                                                            styles.muted
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "msg_audit_empty",
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <div
                                                                        className={
                                                                            styles.auditList
                                                                        }
                                                                    >
                                                                        {selectedAuditItems.map(
                                                                            (
                                                                                a,
                                                                                idx,
                                                                            ) => (
                                                                                <div
                                                                                    key={`${a?.createdAt || ""}-${idx}`}
                                                                                    className={
                                                                                        styles.auditRow
                                                                                    }
                                                                                >
                                                                                    <div
                                                                                        className={
                                                                                            styles.auditMeta
                                                                                        }
                                                                                    >
                                                                                        <span>
                                                                                            <span
                                                                                                className={
                                                                                                    styles.auditKey
                                                                                                }
                                                                                            >
                                                                                                {t(
                                                                                                    "label_when",
                                                                                                )}

                                                                                                :
                                                                                            </span>{" "}
                                                                                            <span
                                                                                                className={
                                                                                                    styles.ltr
                                                                                                }
                                                                                                dir="ltr"
                                                                                            >
                                                                                                {formatDate(
                                                                                                    a?.createdAt,
                                                                                                )}
                                                                                            </span>
                                                                                        </span>
                                                                                        <span>
                                                                                            <span
                                                                                                className={
                                                                                                    styles.auditKey
                                                                                                }
                                                                                            >
                                                                                                {t(
                                                                                                    "label_action",
                                                                                                )}

                                                                                                :
                                                                                            </span>{" "}
                                                                                            <span
                                                                                                className={
                                                                                                    styles.ltr
                                                                                                }
                                                                                                dir="ltr"
                                                                                            >
                                                                                                {a?.action ||
                                                                                                    ""}
                                                                                            </span>
                                                                                        </span>
                                                                                        {a?.mode ? (
                                                                                            <span>
                                                                                                <span
                                                                                                    className={
                                                                                                        styles.auditKey
                                                                                                    }
                                                                                                >
                                                                                                    {t(
                                                                                                        "label_mode",
                                                                                                    )}

                                                                                                    :
                                                                                                </span>{" "}
                                                                                                <span
                                                                                                    className={
                                                                                                        styles.ltr
                                                                                                    }
                                                                                                    dir="ltr"
                                                                                                >
                                                                                                    {
                                                                                                        a.mode
                                                                                                    }
                                                                                                </span>
                                                                                            </span>
                                                                                        ) : null}
                                                                                        {a?.byAdmin ? (
                                                                                            <span>
                                                                                                <span
                                                                                                    className={
                                                                                                        styles.auditKey
                                                                                                    }
                                                                                                >
                                                                                                    {t(
                                                                                                        "label_by_admin",
                                                                                                    )}

                                                                                                    :
                                                                                                </span>{" "}
                                                                                                <span
                                                                                                    className={
                                                                                                        styles.ltr
                                                                                                    }
                                                                                                    dir="ltr"
                                                                                                >
                                                                                                    {a?.byAdminEmail ||
                                                                                                        a.byAdmin}
                                                                                                </span>
                                                                                            </span>
                                                                                        ) : null}
                                                                                    </div>
                                                                                    {a?.reason ? (
                                                                                        <div
                                                                                            className={
                                                                                                styles.auditReason
                                                                                            }
                                                                                        >
                                                                                            <span
                                                                                                className={
                                                                                                    styles.auditKey
                                                                                                }
                                                                                            >
                                                                                                {t(
                                                                                                    "label_reason",
                                                                                                )}

                                                                                                :
                                                                                            </span>{" "}
                                                                                            {
                                                                                                a.reason
                                                                                            }
                                                                                        </div>
                                                                                    ) : null}
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </dd>
                                                        </dl>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {selectedTab === "actions" ? (
                                                <div
                                                    className={
                                                        styles.sectionBlock
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.sectionTitle
                                                        }
                                                    >
                                                        {t(
                                                            "section_admin_actions",
                                                        )}
                                                    </div>

                                                    <Input
                                                        label={t(
                                                            "label_reason",
                                                        )}
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

                                                    {renderAnalyticsPremiumToggle()}
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
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setTrialMode(
                                                                            e
                                                                                .target
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
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
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
                                                                        (
                                                                            _,
                                                                            i,
                                                                        ) => i,
                                                                    ).map(
                                                                        (n) => (
                                                                            <option
                                                                                key={
                                                                                    n
                                                                                }
                                                                                value={
                                                                                    n
                                                                                }
                                                                            >
                                                                                {
                                                                                    n
                                                                                }
                                                                            </option>
                                                                        ),
                                                                    )}
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
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setTrialUntilHour(
                                                                            e
                                                                                .target
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
                                                                        (
                                                                            _,
                                                                            i,
                                                                        ) => i,
                                                                    ).map(
                                                                        (h) => {
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
                                                                                    {
                                                                                        hh
                                                                                    }
                                                                                </option>
                                                                            );
                                                                        },
                                                                    )}
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
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setTrialUntilMinute(
                                                                            e
                                                                                .target
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
                                                                        (
                                                                            _,
                                                                            i,
                                                                        ) =>
                                                                            i *
                                                                            5,
                                                                    ).map(
                                                                        (m) => {
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
                                                                                    {
                                                                                        mm
                                                                                    }
                                                                                </option>
                                                                            );
                                                                        },
                                                                    )}
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
                                                                {
                                                                    actionError.extend
                                                                }
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ) : null}

                                            {selectedTab === "danger"
                                                ? renderCardDangerTab()
                                                : null}
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        </section>

                        <section
                            className={styles.rightPanel}
                            aria-label={t("section_selected_card")}
                        >
                            <div className={styles.cardShell}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.headerRow}>
                                        <h2 className={styles.h2}>
                                            {t("section_billing_crud")}
                                        </h2>
                                    </div>
                                    <p className={styles.muted}>
                                        Runtime billing SSoT הוא
                                        Card.effectiveBilling.
                                    </p>
                                </div>

                                <div className={styles.cardBody}>
                                    <div className={styles.sectionBlock}>
                                        <div className={styles.sectionTitle}>
                                            {t("section_user_subscription")}
                                        </div>

                                        <p className={styles.muted}>
                                            {t("msg_user_subscription_help")}
                                        </p>

                                        <Input
                                            label={t("label_user_id")}
                                            value={billingUserId}
                                            onChange={(e) =>
                                                setBillingUserId(e.target.value)
                                            }
                                            placeholder="..."
                                        />

                                        <div className={styles.formRow}>
                                            <Input
                                                label={t("label_reason")}
                                                value={reason}
                                                onChange={(e) =>
                                                    setReason(e.target.value)
                                                }
                                                placeholder={t(
                                                    "placeholder_reason",
                                                )}
                                            />

                                            <label
                                                className={styles.selectField}
                                            >
                                                <span
                                                    className={
                                                        styles.selectLabel
                                                    }
                                                >
                                                    {t("label_plan_crud")}
                                                </span>
                                                <select
                                                    className={styles.select}
                                                    value={billingUserPlan}
                                                    onChange={(e) =>
                                                        setBillingUserPlan(
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="free">
                                                        {t("plan_free")}
                                                    </option>
                                                    <option value="monthly">
                                                        {t("plan_monthly")}
                                                    </option>
                                                    <option value="yearly">
                                                        {t("plan_yearly")}
                                                    </option>
                                                </select>
                                            </label>

                                            <Input
                                                label={t(
                                                    "label_expires_at_iso",
                                                )}
                                                value={billingUserExpiresAt}
                                                onChange={(e) => (
                                                    setBillingUserExpiresAt(
                                                        e.target.value,
                                                    ),
                                                    setActionError((prev) => ({
                                                        ...prev,
                                                        billingUserSet: "",
                                                    }))
                                                )}
                                                type="datetime-local"
                                                step="60"
                                                onPaste={(e) => {
                                                    const text =
                                                        e.clipboardData?.getData(
                                                            "text",
                                                        ) || "";
                                                    const raw = String(
                                                        text || "",
                                                    ).trim();
                                                    const hasExplicitTz =
                                                        /(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(
                                                            raw,
                                                        );
                                                    if (!hasExplicitTz) return;
                                                    const d = new Date(raw);
                                                    if (
                                                        !Number.isFinite(
                                                            d.getTime(),
                                                        )
                                                    )
                                                        return;
                                                    e.preventDefault();
                                                    setBillingUserExpiresAt(
                                                        isoToDatetimeLocalValue(
                                                            d.toISOString(),
                                                        ),
                                                    );
                                                    setActionError((prev) => ({
                                                        ...prev,
                                                        billingUserSet: "",
                                                    }));
                                                }}
                                                placeholder="YYYY-MM-DDTHH:mm"
                                                meta={
                                                    <>
                                                        <span>
                                                            יישלח (UTC ISO):{" "}
                                                            <span
                                                                className={
                                                                    styles.ltr
                                                                }
                                                                dir="ltr"
                                                            >
                                                                {billingUserExpiresAtNorm.ok &&
                                                                billingUserExpiresAtNorm.isoZ
                                                                    ? billingUserExpiresAtNorm.isoZ
                                                                    : "—"}
                                                            </span>
                                                        </span>
                                                        <br />
                                                        <span>
                                                            שעה בישראל:{" "}
                                                            {billingUserExpiresAtNorm.ok &&
                                                            billingUserExpiresAtNorm.date
                                                                ? billingUserExpiresAtNorm.date.toLocaleString(
                                                                      "he-IL",
                                                                      {
                                                                          timeZone:
                                                                              "Asia/Jerusalem",
                                                                      },
                                                                  )
                                                                : "—"}
                                                        </span>
                                                    </>
                                                }
                                            />

                                            <Button
                                                variant="secondary"
                                                disabled={
                                                    loading ||
                                                    actionLoading.billingUserSet
                                                }
                                                loading={
                                                    actionLoading.billingUserSet
                                                }
                                                onClick={() =>
                                                    (() => {
                                                        setActionError(
                                                            (prev) => ({
                                                                ...prev,
                                                                billingUserSet:
                                                                    "",
                                                            }),
                                                        );

                                                        const status =
                                                            billingUserPlan ===
                                                            "free"
                                                                ? "free"
                                                                : "active";

                                                        if (
                                                            billingUserPlan ===
                                                            "free"
                                                        ) {
                                                            const hasAny =
                                                                Boolean(
                                                                    String(
                                                                        billingUserExpiresAt ||
                                                                            "",
                                                                    ).trim(),
                                                                );
                                                            if (hasAny) {
                                                                setActionError(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        billingUserSet:
                                                                            t(
                                                                                "err_datetime_must_be_empty_for_free",
                                                                            ),
                                                                    }),
                                                                );
                                                                return;
                                                            }
                                                        } else {
                                                            if (
                                                                !billingUserExpiresAtNorm.ok
                                                            ) {
                                                                setActionError(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        billingUserSet:
                                                                            billingUserExpiresAtNorm.uiError ||
                                                                            t(
                                                                                "err_invalid_datetime",
                                                                            ),
                                                                    }),
                                                                );
                                                                return;
                                                            }
                                                            if (
                                                                !billingUserExpiresAtNorm.isoZ
                                                            ) {
                                                                setActionError(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        billingUserSet:
                                                                            t(
                                                                                "err_datetime_required",
                                                                            ),
                                                                    }),
                                                                );
                                                                return;
                                                            }
                                                        }

                                                        runBillingUserAction(
                                                            "billingUserSet",
                                                            async (r) => {
                                                                const expiresAt =
                                                                    billingUserPlan ===
                                                                    "free"
                                                                        ? null
                                                                        : billingUserExpiresAtNorm.isoZ;

                                                                const res =
                                                                    await adminSetUserSubscription(
                                                                        billingUserId,
                                                                        {
                                                                            plan: billingUserPlan,
                                                                            expiresAt,
                                                                            status,
                                                                            reason: r,
                                                                        },
                                                                    );
                                                                return res.data;
                                                            },
                                                        );
                                                    })()
                                                }
                                            >
                                                {t("btn_enable_subscription")}
                                            </Button>

                                            <Button
                                                variant="secondary"
                                                disabled={
                                                    loading ||
                                                    actionLoading.billingUserRevoke
                                                }
                                                loading={
                                                    actionLoading.billingUserRevoke
                                                }
                                                onClick={() =>
                                                    runBillingUserAction(
                                                        "billingUserRevoke",
                                                        async (r) => {
                                                            const res =
                                                                await adminRevokeUserSubscription(
                                                                    billingUserId,
                                                                    {
                                                                        reason: r,
                                                                    },
                                                                );
                                                            return res.data;
                                                        },
                                                    )
                                                }
                                            >
                                                {t("btn_revoke_subscription")}
                                            </Button>
                                        </div>

                                        {actionError.billingUserSet ? (
                                            <p className={styles.errorText}>
                                                {actionError.billingUserSet}
                                            </p>
                                        ) : null}
                                        {actionError.billingUserRevoke ? (
                                            <p className={styles.errorText}>
                                                {actionError.billingUserRevoke}
                                            </p>
                                        ) : null}

                                        {billingUserResult ? (
                                            <div className={styles.kv}>
                                                <dl className={styles.kvDl}>
                                                    <dt className={styles.kvDt}>
                                                        {t("label_plan_crud")}
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        {planHe(
                                                            billingUserResult.plan,
                                                        )}
                                                    </dd>
                                                    <dt className={styles.kvDt}>
                                                        expiresAt
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {billingUserResult
                                                                ?.subscription
                                                                ?.expiresAt ||
                                                                ""}
                                                        </span>
                                                    </dd>
                                                </dl>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className={styles.sectionBlock}>
                                        <div className={styles.sectionTitle}>
                                            {t("section_card_billing_crud")}
                                        </div>

                                        <p className={styles.muted}>
                                            {t("msg_card_billing_help")}
                                        </p>

                                        <div className={styles.formRow}>
                                            <label
                                                className={styles.selectField}
                                            >
                                                <span
                                                    className={
                                                        styles.selectLabel
                                                    }
                                                >
                                                    {t("label_card_id_crud")}
                                                </span>
                                                <select
                                                    className={styles.select}
                                                    value={billingCardId}
                                                    onChange={(e) => {
                                                        setBillingCardId(
                                                            e.target.value,
                                                        );
                                                        setBillingCardResult(
                                                            null,
                                                        );
                                                    }}
                                                    disabled={
                                                        !billingUserIdLooksValid ||
                                                        billingCardsStatus !==
                                                            "ready" ||
                                                        billingCards.length ===
                                                            1
                                                    }
                                                >
                                                    <option value="">
                                                        {billingCardsStatus ===
                                                        "loading"
                                                            ? "טוען כרטיסים…"
                                                            : billingCards.length >
                                                                1
                                                              ? "בחר כרטיס"
                                                              : "—"}
                                                    </option>
                                                    {(Array.isArray(
                                                        billingCards,
                                                    )
                                                        ? billingCards
                                                        : []
                                                    ).map((c) => {
                                                        const id = String(
                                                            c?._id || "",
                                                        );
                                                        const slug = String(
                                                            c?.slug || "",
                                                        );
                                                        const scopeRaw =
                                                            typeof c?.scope ===
                                                            "string"
                                                                ? c.scope
                                                                : "";
                                                        const scope = scopeRaw
                                                            .trim()
                                                            .toLowerCase();
                                                        const orgId = String(
                                                            c?.orgId || "",
                                                        );
                                                        const orgLast6 = orgId
                                                            ? orgId.slice(-6)
                                                            : "";
                                                        const plan = String(
                                                            c?.effectiveBilling
                                                                ?.plan || "",
                                                        ).trim();

                                                        let scopeLabel = `כרטיס: ${slug}`;
                                                        if (
                                                            scope === "personal"
                                                        ) {
                                                            scopeLabel = `אישי: ${slug}`;
                                                        } else if (
                                                            scope === "org"
                                                        ) {
                                                            scopeLabel = `ארגוני: ${slug}${
                                                                orgLast6
                                                                    ? ` (org#${orgLast6})`
                                                                    : ""
                                                            }`;
                                                        }

                                                        const label = plan
                                                            ? `${scopeLabel} — ${plan}`
                                                            : scopeLabel;

                                                        return (
                                                            <option
                                                                key={id}
                                                                value={id}
                                                            >
                                                                {label}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </label>
                                        </div>

                                        {billingUserIdLooksValid &&
                                        billingCardsStatus === "ready" &&
                                        billingCards.length === 0 ? (
                                            <p className={styles.muted}>
                                                לא נמצאו כרטיסים למשתמש זה
                                            </p>
                                        ) : null}
                                        {billingCardsError ? (
                                            <p className={styles.errorText}>
                                                {billingCardsError}
                                            </p>
                                        ) : null}

                                        <div className={styles.formRow}>
                                            <label
                                                className={styles.selectField}
                                            >
                                                <span
                                                    className={
                                                        styles.selectLabel
                                                    }
                                                >
                                                    {t("label_plan_crud")}
                                                </span>
                                                <select
                                                    className={styles.select}
                                                    value={billingCardPlan}
                                                    onChange={(e) =>
                                                        setBillingCardPlan(
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="free">
                                                        {t("plan_free")}
                                                    </option>
                                                    <option value="monthly">
                                                        {t("plan_monthly")}
                                                    </option>
                                                    <option value="yearly">
                                                        {t("plan_yearly")}
                                                    </option>
                                                </select>
                                            </label>

                                            <Input
                                                label={t(
                                                    "label_paid_until_iso",
                                                )}
                                                value={billingCardPaidUntil}
                                                onChange={(e) => (
                                                    setBillingCardPaidUntil(
                                                        e.target.value,
                                                    ),
                                                    setActionError((prev) => ({
                                                        ...prev,
                                                        billingCardSet: "",
                                                    }))
                                                )}
                                                type="datetime-local"
                                                step="60"
                                                onPaste={(e) => {
                                                    const text =
                                                        e.clipboardData?.getData(
                                                            "text",
                                                        ) || "";
                                                    const raw = String(
                                                        text || "",
                                                    ).trim();
                                                    const hasExplicitTz =
                                                        /(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(
                                                            raw,
                                                        );
                                                    if (!hasExplicitTz) return;
                                                    const d = new Date(raw);
                                                    if (
                                                        !Number.isFinite(
                                                            d.getTime(),
                                                        )
                                                    )
                                                        return;
                                                    e.preventDefault();
                                                    setBillingCardPaidUntil(
                                                        isoToDatetimeLocalValue(
                                                            d.toISOString(),
                                                        ),
                                                    );
                                                    setActionError((prev) => ({
                                                        ...prev,
                                                        billingCardSet: "",
                                                    }));
                                                }}
                                                placeholder="YYYY-MM-DDTHH:mm"
                                                meta={
                                                    <>
                                                        <span>
                                                            יישלח (UTC ISO):{" "}
                                                            <span
                                                                className={
                                                                    styles.ltr
                                                                }
                                                                dir="ltr"
                                                            >
                                                                {billingCardPaidUntilNorm.ok &&
                                                                billingCardPaidUntilNorm.isoZ
                                                                    ? billingCardPaidUntilNorm.isoZ
                                                                    : "—"}
                                                            </span>
                                                        </span>
                                                        <br />
                                                        <span>
                                                            שעה בישראל:{" "}
                                                            {billingCardPaidUntilNorm.ok &&
                                                            billingCardPaidUntilNorm.date
                                                                ? billingCardPaidUntilNorm.date.toLocaleString(
                                                                      "he-IL",
                                                                      {
                                                                          timeZone:
                                                                              "Asia/Jerusalem",
                                                                      },
                                                                  )
                                                                : "—"}
                                                        </span>
                                                    </>
                                                }
                                            />

                                            <label className={styles.field}>
                                                {t("label_payer_type")}
                                                <select
                                                    className={styles.input}
                                                    value={billingCardPayerType}
                                                    onChange={(e) => {
                                                        setBillingCardPayerType(
                                                            e.target.value,
                                                        );
                                                        setActionError(
                                                            (prev) => ({
                                                                ...prev,
                                                                billingCardSet:
                                                                    "",
                                                            }),
                                                        );
                                                    }}
                                                >
                                                    <option value="">
                                                        {t("opt_keep_current")}
                                                    </option>
                                                    <option value="none">
                                                        {t("opt_payer_none")}
                                                    </option>
                                                    <option value="user">
                                                        {t("opt_payer_user")}
                                                    </option>
                                                    <option value="org">
                                                        {t("opt_payer_org")}
                                                    </option>
                                                </select>
                                            </label>

                                            <Input
                                                label={t("label_payer_note")}
                                                value={billingCardPayerNote}
                                                onChange={(e) => {
                                                    setBillingCardPayerNote(
                                                        e.target.value,
                                                    );
                                                    setBillingCardPayerNoteTouched(
                                                        true,
                                                    );
                                                    setActionError((prev) => ({
                                                        ...prev,
                                                        billingCardSet: "",
                                                    }));
                                                }}
                                                maxLength={80}
                                                placeholder="עד 80 תווים"
                                            />

                                            <Button
                                                variant="secondary"
                                                disabled={
                                                    billingCardActionsDisabled ||
                                                    actionLoading.billingCardSet
                                                }
                                                loading={
                                                    actionLoading.billingCardSet
                                                }
                                                onClick={() =>
                                                    (() => {
                                                        setActionError(
                                                            (prev) => ({
                                                                ...prev,
                                                                billingCardSet:
                                                                    "",
                                                            }),
                                                        );

                                                        const status =
                                                            billingCardPlan ===
                                                            "free"
                                                                ? "free"
                                                                : "active";

                                                        if (
                                                            billingCardPlan ===
                                                            "free"
                                                        ) {
                                                            const hasAny =
                                                                Boolean(
                                                                    String(
                                                                        billingCardPaidUntil ||
                                                                            "",
                                                                    ).trim(),
                                                                );
                                                            if (hasAny) {
                                                                setActionError(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        billingCardSet:
                                                                            t(
                                                                                "err_datetime_must_be_empty_for_free",
                                                                            ),
                                                                    }),
                                                                );
                                                                return;
                                                            }
                                                        } else {
                                                            if (
                                                                !billingCardPaidUntilNorm.ok
                                                            ) {
                                                                setActionError(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        billingCardSet:
                                                                            billingCardPaidUntilNorm.uiError ||
                                                                            t(
                                                                                "err_invalid_datetime",
                                                                            ),
                                                                    }),
                                                                );
                                                                return;
                                                            }
                                                            if (
                                                                !billingCardPaidUntilNorm.isoZ
                                                            ) {
                                                                setActionError(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        billingCardSet:
                                                                            t(
                                                                                "err_datetime_required",
                                                                            ),
                                                                    }),
                                                                );
                                                                return;
                                                            }
                                                        }

                                                        runBillingCardAction(
                                                            "billingCardSet",
                                                            async (r) => {
                                                                const paidUntil =
                                                                    billingCardPlan ===
                                                                    "free"
                                                                        ? null
                                                                        : billingCardPaidUntilNorm.isoZ;

                                                                const res =
                                                                    await adminSetCardBilling(
                                                                        billingCardId,
                                                                        {
                                                                            plan: billingCardPlan,
                                                                            paidUntil,
                                                                            status,
                                                                            reason: r,
                                                                            payerType:
                                                                                billingCardPayerType ||
                                                                                undefined,
                                                                            payerNote:
                                                                                billingCardPayerNoteTouched
                                                                                    ? billingCardPayerNote
                                                                                    : undefined,
                                                                        },
                                                                    );
                                                                return res.data;
                                                            },
                                                        );
                                                    })()
                                                }
                                            >
                                                {t("btn_enable_card_billing")}
                                            </Button>

                                            <Button
                                                variant="secondary"
                                                disabled={
                                                    billingCardActionsDisabled ||
                                                    actionLoading.billingCardRevoke
                                                }
                                                loading={
                                                    actionLoading.billingCardRevoke
                                                }
                                                onClick={() =>
                                                    runBillingCardAction(
                                                        "billingCardRevoke",
                                                        async (r) => {
                                                            const res =
                                                                await adminRevokeCardBilling(
                                                                    billingCardId,
                                                                    {
                                                                        reason: r,
                                                                    },
                                                                );
                                                            return res.data;
                                                        },
                                                    )
                                                }
                                            >
                                                {t("btn_revoke_card_billing")}
                                            </Button>

                                            <Button
                                                variant="secondary"
                                                disabled={
                                                    billingCardActionsDisabled ||
                                                    actionLoading.billingCardSync
                                                }
                                                loading={
                                                    actionLoading.billingCardSync
                                                }
                                                onClick={() =>
                                                    runBillingCardActionNoReason(
                                                        "billingCardSync",
                                                        async () => {
                                                            const res =
                                                                await adminSyncCardBillingFromUser(
                                                                    billingCardId,
                                                                    {
                                                                        force: billingCardForceSync
                                                                            ? true
                                                                            : undefined,
                                                                    },
                                                                );
                                                            return res.data;
                                                        },
                                                    )
                                                }
                                            >
                                                {t("btn_sync_from_user")}
                                            </Button>

                                            <label className={styles.toggleRow}>
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        billingCardForceSync
                                                    }
                                                    onChange={(e) =>
                                                        setBillingCardForceSync(
                                                            e.target.checked,
                                                        )
                                                    }
                                                />
                                                <span>
                                                    {t("label_force_org_payer")}
                                                </span>
                                            </label>

                                            <Button
                                                variant="secondary"
                                                disabled={
                                                    billingCardActionsDisabled ||
                                                    actionLoading.billingOverrideClear
                                                }
                                                loading={
                                                    actionLoading.billingOverrideClear
                                                }
                                                onClick={() =>
                                                    runBillingCardAction(
                                                        "billingOverrideClear",
                                                        async (r) => {
                                                            const res =
                                                                await adminClearCardAdminOverride(
                                                                    billingCardId,
                                                                    {
                                                                        reason: r,
                                                                    },
                                                                );
                                                            return res.data;
                                                        },
                                                    )
                                                }
                                            >
                                                {t("btn_clear_override")}
                                            </Button>
                                        </div>

                                        <p className={styles.muted}>
                                            {t("msg_sync_uses_saved_db")}
                                        </p>

                                        {actionError.billingCardSet ? (
                                            <p className={styles.errorText}>
                                                {actionError.billingCardSet}
                                            </p>
                                        ) : null}
                                        {actionError.billingCardRevoke ? (
                                            <p className={styles.errorText}>
                                                {actionError.billingCardRevoke}
                                            </p>
                                        ) : null}
                                        {actionError.billingCardSync ? (
                                            <p className={styles.errorText}>
                                                {actionError.billingCardSync}
                                            </p>
                                        ) : null}
                                        {actionError.billingOverrideClear ? (
                                            <p className={styles.errorText}>
                                                {
                                                    actionError.billingOverrideClear
                                                }
                                            </p>
                                        ) : null}

                                        {billingCardResult?.adminOverride
                                            ?.plan ||
                                        billingCardResult?.adminOverride
                                            ?.until ||
                                        billingCardResult?.adminOverride
                                            ?.byAdmin ||
                                        billingCardResult?.adminOverride
                                            ?.createdAt ? (
                                            <div className={styles.warningBox}>
                                                {t("warn_override_precedence")}
                                            </div>
                                        ) : null}

                                        {billingCardResult ? (
                                            <div className={styles.kv}>
                                                <dl className={styles.kvDl}>
                                                    <dt className={styles.kvDt}>
                                                        plan
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        {planHe(
                                                            billingCardResult.plan,
                                                        )}
                                                    </dd>
                                                    <dt className={styles.kvDt}>
                                                        billing.status
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {String(
                                                                billingCardResult
                                                                    ?.billing
                                                                    ?.status ||
                                                                    "",
                                                            )}
                                                        </span>
                                                    </dd>
                                                    <dt className={styles.kvDt}>
                                                        billing.paidUntil
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        <span
                                                            className={
                                                                styles.ltr
                                                            }
                                                            dir="ltr"
                                                        >
                                                            {billingCardResult
                                                                ?.billing
                                                                ?.paidUntil
                                                                ? new Date(
                                                                      billingCardResult
                                                                          .billing
                                                                          .paidUntil,
                                                                  ).toISOString()
                                                                : ""}
                                                        </span>
                                                    </dd>
                                                    <dt className={styles.kvDt}>
                                                        effectiveBilling.isPaid
                                                    </dt>
                                                    <dd className={styles.kvDd}>
                                                        {boolHe(
                                                            Boolean(
                                                                billingCardResult
                                                                    ?.effectiveBilling
                                                                    ?.isPaid,
                                                            ),
                                                        )}
                                                    </dd>
                                                </dl>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

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
                                        <div
                                            className={
                                                styles.selectedHeaderStrip
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.selectedPrimary
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles.selectedLabel
                                                    }
                                                >
                                                    {t("label_slug")}:
                                                </span>{" "}
                                                <span
                                                    className={`${styles.ltr} ${styles.selectedValue}`}
                                                    dir="ltr"
                                                    title={
                                                        selectedCard.slug || ""
                                                    }
                                                >
                                                    {selectedCard.slug || ""}
                                                </span>
                                            </div>
                                            <div
                                                className={styles.selectedMeta}
                                            >
                                                <span
                                                    className={styles.metaPill}
                                                >
                                                    <span
                                                        className={
                                                            styles.metaKey
                                                        }
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
                                                <span
                                                    className={styles.metaPill}
                                                >
                                                    <span
                                                        className={
                                                            styles.metaKey
                                                        }
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
                                                <span
                                                    className={styles.metaPill}
                                                >
                                                    <span
                                                        className={
                                                            styles.metaKey
                                                        }
                                                    >
                                                        {t("label_active")}:
                                                    </span>{" "}
                                                    <span>
                                                        {boolHe(
                                                            !!selectedCard.isActive,
                                                        )}
                                                    </span>
                                                </span>
                                                <span
                                                    className={styles.metaPill}
                                                >
                                                    <span
                                                        className={
                                                            styles.metaKey
                                                        }
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
                                                className={
                                                    styles.commandBarButtons
                                                }
                                            >
                                                <Button
                                                    variant="secondary"
                                                    size="small"
                                                    className={
                                                        styles.commandBtn
                                                    }
                                                    onClick={() =>
                                                        setSelectedTab(
                                                            "billing",
                                                        )
                                                    }
                                                >
                                                    חיוב
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="small"
                                                    className={
                                                        styles.commandBtn
                                                    }
                                                    onClick={() =>
                                                        setSelectedTab(
                                                            "actions",
                                                        )
                                                    }
                                                >
                                                    פעולות
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="small"
                                                    className={
                                                        styles.commandBtn
                                                    }
                                                    onClick={() =>
                                                        setSelectedTab("danger")
                                                    }
                                                >
                                                    סכנה
                                                </Button>
                                            </div>
                                            <div
                                                className={
                                                    styles.commandBarHint
                                                }
                                            >
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
                                            aria-selected={
                                                selectedTab === "danger"
                                            }
                                            aria-controls="admin-selected-panel"
                                            onClick={() =>
                                                setSelectedTab("danger")
                                            }
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
                                                    className={
                                                        styles.sectionBlock
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.sectionTitle
                                                        }
                                                    >
                                                        {t(
                                                            "section_card_details",
                                                        )}
                                                    </div>
                                                    <dl className={styles.kvDl}>
                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("label_id")}
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
                                                                title={
                                                                    selectedCard._id
                                                                }
                                                            >
                                                                {
                                                                    selectedCard._id
                                                                }
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("label_slug")}
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
                                                                title={
                                                                    selectedCard.slug ||
                                                                    ""
                                                                }
                                                            >
                                                                {selectedCard.slug ||
                                                                    ""}
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("label_status")}
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
                                                                {cardStatusHe(
                                                                    selectedCard.status,
                                                                )}
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("label_active")}
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
                                                            <span>
                                                                {boolHe(
                                                                    !!selectedCard.isActive,
                                                                )}
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("label_owner")}
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
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
                                                    className={
                                                        styles.sectionBlock
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.sectionTitle
                                                        }
                                                    >
                                                        Billing
                                                    </div>
                                                    <dl className={styles.kvDl}>
                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t(
                                                                "label_effective_plan",
                                                            )}
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
                                                            <span>
                                                                {planHe(
                                                                    selectedEffectivePlan,
                                                                )}
                                                            </span>
                                                            {" · "}
                                                            {t(
                                                                "label_entitled",
                                                            )}
                                                            :{" "}
                                                            <span>
                                                                {boolHe(
                                                                    selectedIsEntitled,
                                                                )}
                                                            </span>
                                                            {" · "}
                                                            {t(
                                                                "label_paid",
                                                            )}:{" "}
                                                            <span>
                                                                {boolHe(
                                                                    selectedIsPaid,
                                                                )}
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t(
                                                                "label_effective_tier",
                                                            )}
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
                                                            <span>
                                                                {tierHe(
                                                                    selectedEffectiveTier,
                                                                )}
                                                            </span>
                                                            {" · "}
                                                            {t(
                                                                "label_tier_source",
                                                            )}
                                                            :{" "}
                                                            <span
                                                                className={
                                                                    styles.ltr
                                                                }
                                                                dir="ltr"
                                                            >
                                                                {
                                                                    selectedTierSource
                                                                }
                                                            </span>
                                                            {selectedTierUntil
                                                                ? ` · ${t("label_until")} ${formatDate(selectedTierUntil)}`
                                                                : ""}
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t(
                                                                "label_trial_ends",
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
                                                                {selectedCard?.trialEndsAtIsrael ||
                                                                    formatDate(
                                                                        selectedCard.trialEndsAt,
                                                                    )}
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t(
                                                                "label_effective_billing",
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

                                                    <div
                                                        className={
                                                            styles.provenancePanel
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.provenanceHeader
                                                            }
                                                        >
                                                            <div
                                                                className={
                                                                    styles.provenanceHeaderLeft
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.provenancePill
                                                                    }
                                                                >
                                                                    {t(
                                                                        "section_provenance",
                                                                    )}
                                                                    :{" "}
                                                                    <span
                                                                        className={
                                                                            styles.ltr
                                                                        }
                                                                        dir="ltr"
                                                                    >
                                                                        {selectedProvenanceSource ||
                                                                            "—"}
                                                                    </span>
                                                                </span>

                                                                {selectedLatestAudit ? (
                                                                    <span
                                                                        className={
                                                                            styles.muted
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "label_latest_audit",
                                                                        )}
                                                                        :{" "}
                                                                        <span
                                                                            className={
                                                                                styles.ltr
                                                                            }
                                                                            dir="ltr"
                                                                        >
                                                                            {selectedLatestAudit.action ||
                                                                                ""}
                                                                            {selectedLatestAudit.mode
                                                                                ? ` (${selectedLatestAudit.mode})`
                                                                                : ""}
                                                                        </span>
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        <dl
                                                            className={
                                                                styles.kvDl
                                                            }
                                                        >
                                                            <dt
                                                                className={
                                                                    styles.kvDt
                                                                }
                                                            >
                                                                {t(
                                                                    "label_raw_billing",
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
                                                                    status=
                                                                    {billingStatusHe(
                                                                        selectedCard
                                                                            ?.billing
                                                                            ?.status,
                                                                    )}
                                                                    {selectedCard
                                                                        ?.billing
                                                                        ?.plan
                                                                        ? ` · plan=${planHe(selectedCard.billing.plan)}`
                                                                        : ""}
                                                                    {selectedCard
                                                                        ?.billing
                                                                        ?.paidUntil
                                                                        ? ` · paidUntil=${selectedCard.billing.paidUntil}`
                                                                        : ""}
                                                                </span>
                                                            </dd>

                                                            <dt
                                                                className={
                                                                    styles.kvDt
                                                                }
                                                            >
                                                                {t(
                                                                    "label_raw_payer",
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
                                                                        ?.billing
                                                                        ?.payer
                                                                        ? `type=${selectedCard.billing.payer.type || ""} · source=${selectedCard.billing.payer.source || ""}${selectedCard.billing.payer.updatedAt ? ` · updatedAt=${selectedCard.billing.payer.updatedAt}` : ""}`
                                                                        : "—"}
                                                                </span>
                                                            </dd>

                                                            <dt
                                                                className={
                                                                    styles.kvDt
                                                                }
                                                            >
                                                                {t(
                                                                    "label_audit_history",
                                                                )}
                                                            </dt>
                                                            <dd
                                                                className={
                                                                    styles.kvDd
                                                                }
                                                            >
                                                                {selectedAuditStatus ===
                                                                "loading" ? (
                                                                    <span
                                                                        className={
                                                                            styles.muted
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "msg_audit_loading",
                                                                        )}
                                                                    </span>
                                                                ) : selectedAuditStatus ===
                                                                  "error" ? (
                                                                    <span
                                                                        className={
                                                                            styles.errorText
                                                                        }
                                                                    >
                                                                        {
                                                                            selectedAuditError
                                                                        }
                                                                    </span>
                                                                ) : selectedAuditItems.length ===
                                                                  0 ? (
                                                                    <span
                                                                        className={
                                                                            styles.muted
                                                                        }
                                                                    >
                                                                        {t(
                                                                            "msg_audit_empty",
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <div
                                                                        className={
                                                                            styles.auditList
                                                                        }
                                                                    >
                                                                        {selectedAuditItems.map(
                                                                            (
                                                                                a,
                                                                                idx,
                                                                            ) => (
                                                                                <div
                                                                                    key={`${a?.createdAt || ""}-${idx}`}
                                                                                    className={
                                                                                        styles.auditRow
                                                                                    }
                                                                                >
                                                                                    <div
                                                                                        className={
                                                                                            styles.auditMeta
                                                                                        }
                                                                                    >
                                                                                        <span>
                                                                                            <span
                                                                                                className={
                                                                                                    styles.auditKey
                                                                                                }
                                                                                            >
                                                                                                {t(
                                                                                                    "label_when",
                                                                                                )}

                                                                                                :
                                                                                            </span>{" "}
                                                                                            <span
                                                                                                className={
                                                                                                    styles.ltr
                                                                                                }
                                                                                                dir="ltr"
                                                                                            >
                                                                                                {formatDate(
                                                                                                    a?.createdAt,
                                                                                                )}
                                                                                            </span>
                                                                                        </span>
                                                                                        <span>
                                                                                            <span
                                                                                                className={
                                                                                                    styles.auditKey
                                                                                                }
                                                                                            >
                                                                                                {t(
                                                                                                    "label_action",
                                                                                                )}

                                                                                                :
                                                                                            </span>{" "}
                                                                                            <span
                                                                                                className={
                                                                                                    styles.ltr
                                                                                                }
                                                                                                dir="ltr"
                                                                                            >
                                                                                                {a?.action ||
                                                                                                    ""}
                                                                                            </span>
                                                                                        </span>
                                                                                        {a?.mode ? (
                                                                                            <span>
                                                                                                <span
                                                                                                    className={
                                                                                                        styles.auditKey
                                                                                                    }
                                                                                                >
                                                                                                    {t(
                                                                                                        "label_mode",
                                                                                                    )}

                                                                                                    :
                                                                                                </span>{" "}
                                                                                                <span
                                                                                                    className={
                                                                                                        styles.ltr
                                                                                                    }
                                                                                                    dir="ltr"
                                                                                                >
                                                                                                    {
                                                                                                        a.mode
                                                                                                    }
                                                                                                </span>
                                                                                            </span>
                                                                                        ) : null}
                                                                                        {a?.byAdmin ? (
                                                                                            <span>
                                                                                                <span
                                                                                                    className={
                                                                                                        styles.auditKey
                                                                                                    }
                                                                                                >
                                                                                                    {t(
                                                                                                        "label_by_admin",
                                                                                                    )}

                                                                                                    :
                                                                                                </span>{" "}
                                                                                                <span
                                                                                                    className={
                                                                                                        styles.ltr
                                                                                                    }
                                                                                                    dir="ltr"
                                                                                                >
                                                                                                    {a?.byAdminEmail ||
                                                                                                        a.byAdmin}
                                                                                                </span>
                                                                                            </span>
                                                                                        ) : null}
                                                                                    </div>
                                                                                    {a?.reason ? (
                                                                                        <div
                                                                                            className={
                                                                                                styles.auditReason
                                                                                            }
                                                                                        >
                                                                                            <span
                                                                                                className={
                                                                                                    styles.auditKey
                                                                                                }
                                                                                            >
                                                                                                {t(
                                                                                                    "label_reason",
                                                                                                )}

                                                                                                :
                                                                                            </span>{" "}
                                                                                            {
                                                                                                a.reason
                                                                                            }
                                                                                        </div>
                                                                                    ) : null}
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </dd>
                                                        </dl>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {selectedTab === "actions" ? (
                                                <div
                                                    className={
                                                        styles.sectionBlock
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.sectionTitle
                                                        }
                                                    >
                                                        {t(
                                                            "section_admin_actions",
                                                        )}
                                                    </div>

                                                    <Input
                                                        label={t(
                                                            "label_reason",
                                                        )}
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

                                                    {renderAnalyticsPremiumToggle()}
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
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setTrialMode(
                                                                            e
                                                                                .target
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
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
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
                                                                        (
                                                                            _,
                                                                            i,
                                                                        ) => i,
                                                                    ).map(
                                                                        (n) => (
                                                                            <option
                                                                                key={
                                                                                    n
                                                                                }
                                                                                value={
                                                                                    n
                                                                                }
                                                                            >
                                                                                {
                                                                                    n
                                                                                }
                                                                            </option>
                                                                        ),
                                                                    )}
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
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setTrialUntilHour(
                                                                            e
                                                                                .target
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
                                                                        (
                                                                            _,
                                                                            i,
                                                                        ) => i,
                                                                    ).map(
                                                                        (h) => {
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
                                                                                    {
                                                                                        hh
                                                                                    }
                                                                                </option>
                                                                            );
                                                                        },
                                                                    )}
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
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setTrialUntilMinute(
                                                                            e
                                                                                .target
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
                                                                        (
                                                                            _,
                                                                            i,
                                                                        ) =>
                                                                            i *
                                                                            5,
                                                                    ).map(
                                                                        (m) => {
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
                                                                                    {
                                                                                        mm
                                                                                    }
                                                                                </option>
                                                                            );
                                                                        },
                                                                    )}
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
                                                                {
                                                                    actionError.extend
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
                                                            <Input
                                                                label={t(
                                                                    "label_override_plan",
                                                                )}
                                                                value={
                                                                    overridePlan
                                                                }
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
                                                                {t(
                                                                    "btn_override",
                                                                )}
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
                                                                    value={
                                                                        cardTier
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setCardTier(
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
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setUserTierUntil(
                                                                            e
                                                                                .target
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
                                                                    {t(
                                                                        "btn_apply",
                                                                    )}
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

                                            {selectedTab === "danger"
                                                ? renderCardDangerTab()
                                                : null}
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            {selectedUser ? (
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

                                        <div
                                            className={
                                                styles.selectedHeaderStrip
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.selectedPrimary
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles.selectedLabel
                                                    }
                                                >
                                                    {t("th_email")}:
                                                </span>{" "}
                                                <span
                                                    className={`${styles.ltr} ${styles.selectedValue}`}
                                                    dir="ltr"
                                                    title={
                                                        selectedUser?.email ||
                                                        ""
                                                    }
                                                >
                                                    {selectedUser?.email || ""}
                                                </span>
                                            </div>
                                            <div
                                                className={styles.selectedMeta}
                                            >
                                                <span
                                                    className={styles.metaPill}
                                                >
                                                    <span
                                                        className={
                                                            styles.metaKey
                                                        }
                                                    >
                                                        ID:
                                                    </span>{" "}
                                                    <span
                                                        className={styles.ltr}
                                                        dir="ltr"
                                                        title={
                                                            selectedUser?._id ||
                                                            ""
                                                        }
                                                    >
                                                        {selectedUser?._id ||
                                                            ""}
                                                    </span>
                                                </span>
                                                <span
                                                    className={styles.metaPill}
                                                >
                                                    <span
                                                        className={
                                                            styles.metaKey
                                                        }
                                                    >
                                                        {t("th_role")}:
                                                    </span>{" "}
                                                    <span>
                                                        {roleHe(
                                                            selectedUser?.role,
                                                        )}
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
                                                    setCurrent:
                                                        setSelectedUserTab,
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
                                                    selectedUserTab ===
                                                    "general"
                                                        ? styles.tabActive
                                                        : ""
                                                }`}
                                                role="tab"
                                                aria-selected={
                                                    selectedUserTab ===
                                                    "general"
                                                }
                                                onClick={() =>
                                                    setSelectedUserTab(
                                                        "general",
                                                    )
                                                }
                                            >
                                                כללי
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.tab} ${
                                                    selectedUserTab ===
                                                    "billing"
                                                        ? styles.tabActive
                                                        : ""
                                                }`}
                                                role="tab"
                                                aria-selected={
                                                    selectedUserTab ===
                                                    "billing"
                                                }
                                                onClick={() =>
                                                    setSelectedUserTab(
                                                        "billing",
                                                    )
                                                }
                                            >
                                                חיוב
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.tab} ${
                                                    selectedUserTab ===
                                                    "actions"
                                                        ? styles.tabActive
                                                        : ""
                                                }`}
                                                role="tab"
                                                aria-selected={
                                                    selectedUserTab ===
                                                    "actions"
                                                }
                                                onClick={() =>
                                                    setSelectedUserTab(
                                                        "actions",
                                                    )
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
                                            <div
                                                className={styles.sectionBlock}
                                            >
                                                <div className={styles.kv}>
                                                    <dl className={styles.kvDl}>
                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("th_email")}
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
                                                                {selectedUser?.email ||
                                                                    ""}
                                                            </span>
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("th_role")}
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
                                                            {roleHe(
                                                                selectedUser?.role,
                                                            )}
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("th_created")}
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
                                                            {formatDate(
                                                                selectedUser?.createdAt,
                                                            )}
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            עודכן
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
                                                            {selectedUser?.updatedAt
                                                                ? formatDate(
                                                                      selectedUser.updatedAt,
                                                                  )
                                                                : "—"}
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            {t("th_card")}
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
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
                                            <div
                                                className={styles.sectionBlock}
                                            >
                                                <div className={styles.kv}>
                                                    <dl className={styles.kvDl}>
                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            Plan
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
                                                            {planHe(
                                                                selectedUser?.plan,
                                                            )}
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            Tier
                                                        </dt>
                                                        <dd
                                                            className={
                                                                styles.kvDd
                                                            }
                                                        >
                                                            {selectedUser?.adminTier
                                                                ? tierHe(
                                                                      selectedUser.adminTier,
                                                                  )
                                                                : "—"}
                                                            {selectedUser?.adminTierUntil
                                                                ? ` · עד ${formatDate(selectedUser.adminTierUntil)}`
                                                                : ""}
                                                        </dd>

                                                        <dt
                                                            className={
                                                                styles.kvDt
                                                            }
                                                        >
                                                            Subscription
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
                                            <div
                                                className={styles.sectionBlock}
                                            >
                                                <div
                                                    className={
                                                        styles.sectionTitle
                                                    }
                                                >
                                                    סכנה
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

                                                <div
                                                    className={
                                                        styles.actionGroup
                                                    }
                                                >
                                                    <Button
                                                        variant="danger"
                                                        disabled={loading}
                                                        loading={loading}
                                                        onClick={
                                                            runUserDeletePermanent
                                                        }
                                                    >
                                                        {t(
                                                            "btn_delete_user_permanently",
                                                        )}
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
                                                {t("msg_coming_later")}
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
            </div>
        </main>
    );
}
