import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect, useRef } from "react";
import { a as api, F as FlashBanner, B as Button, u as useAuth } from "../entry-server.js";
import { I as Input } from "./Input-CGCIIpQL.js";
import "react-dom/server";
import "react-router-dom";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
function getAdminStats() {
  return api.get("/admin/stats");
}
function listAdminUsers(params = {}) {
  return api.get("/admin/users", { params });
}
function listAdminCards(params = {}) {
  return api.get("/admin/cards", { params });
}
function getAdminUserById(id) {
  return api.get(`/admin/users/${id}`);
}
function getAdminCardById(id) {
  return api.get(`/admin/cards/${id}`);
}
function listAdminAudit(params = {}) {
  return api.get("/admin/audit", { params });
}
function adminDeactivateCard(id, reason) {
  return api.post(`/admin/cards/${id}/deactivate`, { reason });
}
function adminReactivateCard(id, reason) {
  return api.post(`/admin/cards/${id}/reactivate`, { reason });
}
function adminDeleteCard(id, reason) {
  return api.post(`/admin/cards/${id}/delete`, { reason });
}
function adminExtendTrial(id, { days, untilLocal, reason }) {
  return api.post(`/admin/cards/${id}/trial/extend`, {
    days,
    untilLocal,
    reason
  });
}
function adminOverridePlan(id, { plan, until, reason }) {
  return api.post(`/admin/cards/${id}/plan/override`, {
    plan,
    until,
    reason
  });
}
function adminSetUserSubscription(userId, { plan, expiresAt, status, reason } = {}) {
  return api.post(`/admin/billing/users/${userId}/subscription/set`, {
    plan,
    expiresAt,
    provider: "admin",
    status,
    reason
  });
}
function adminRevokeUserSubscription(userId, { reason } = {}) {
  return api.post(`/admin/billing/users/${userId}/subscription/revoke`, {
    reason
  });
}
function adminSetCardBilling(cardId, { plan, paidUntil, status, reason, payerType, payerNote } = {}) {
  const body2 = { plan, paidUntil, status, reason };
  if (payerType !== void 0 && payerType !== "") body2.payerType = payerType;
  if (payerNote !== void 0) body2.payerNote = payerNote;
  return api.post(`/admin/billing/cards/${cardId}/billing/set`, body2);
}
function adminRevokeCardBilling(cardId, { reason } = {}) {
  return api.post(`/admin/billing/cards/${cardId}/billing/revoke`, {
    reason
  });
}
function adminSyncCardBillingFromUser(cardId, { reason, force } = {}) {
  const body2 = {};
  if (reason !== void 0) body2.reason = reason;
  if (force !== void 0) body2.force = force;
  return api.post(
    `/admin/billing/cards/${cardId}/billing/sync-from-user`,
    body2
  );
}
function adminClearCardAdminOverride(cardId, { reason } = {}) {
  return api.post(`/admin/cards/${cardId}/admin-override/clear`, {
    reason
  });
}
function adminSetAnalyticsPremium(cardId, { enabled, reason }) {
  return api.post(`/admin/cards/${cardId}/analytics-premium`, {
    enabled,
    reason
  });
}
function adminSetCardTier(id, { tier, until, reason }) {
  return api.post(`/admin/cards/${id}/tier`, {
    tier,
    until,
    reason
  });
}
function adminSetUserTier(id, { tier, until, reason }) {
  return api.post(`/admin/users/${id}/tier`, {
    tier,
    until,
    reason
  });
}
function adminDeleteUserPermanently(userId, { reason } = {}) {
  return api.post(`/admin/users/${userId}/delete`, {
    reason,
    confirm: "DELETE"
  });
}
function getAdminSiteAnalyticsSummary(params = {}) {
  return api.get("/admin/site-analytics/summary", { params });
}
function getAdminSiteAnalyticsSources(params = {}) {
  return api.get("/admin/site-analytics/sources", { params });
}
function getAdminSiteAnalyticsVisits(params = {}) {
  return api.get("/admin/site-analytics/visits", { params });
}
function listAdminOrganizations(params = {}) {
  return api.get("/admin/orgs", { params });
}
function createAdminOrganization({ name, slug, note, seatLimit } = {}) {
  return api.post("/admin/orgs", { name, slug, note, seatLimit });
}
function getAdminOrganizationById(id) {
  return api.get(`/admin/orgs/${id}`);
}
function patchAdminOrganization(id, patch = {}) {
  return api.patch(`/admin/orgs/${id}`, patch);
}
function listAdminOrgMembers(orgId, params = {}) {
  return api.get(`/admin/orgs/${orgId}/members`, { params });
}
function patchAdminOrgMember(orgId, memberId, patch = {}) {
  return api.patch(`/admin/orgs/${orgId}/members/${memberId}`, patch);
}
function deleteAdminOrgMember(orgId, memberId) {
  return api.delete(`/admin/orgs/${orgId}/members/${memberId}`);
}
function createAdminOrgInvite(orgId, { email, role } = {}) {
  return api.post(`/admin/orgs/${orgId}/invites`, { email, role });
}
function listAdminOrgInvites(orgId) {
  return api.get(`/admin/orgs/${orgId}/invites`);
}
function revokeAdminOrgInvite(orgId, inviteId) {
  return api.post(`/admin/orgs/${orgId}/invites/${inviteId}/revoke`);
}
function adminGrantOrgEntitlement(orgId, {
  expiresAt,
  reason,
  confirmOrgAnnualGrant,
  startsAt,
  paymentReference,
  adminNote
} = {}) {
  const body2 = { expiresAt, reason, confirmOrgAnnualGrant };
  if (startsAt !== void 0 && startsAt !== null) body2.startsAt = startsAt;
  if (paymentReference) body2.paymentReference = paymentReference;
  if (adminNote) body2.adminNote = adminNote;
  return api.post(`/admin/orgs/${orgId}/entitlement/grant`, body2);
}
function adminRevokeOrgEntitlement(orgId, { reason } = {}) {
  return api.post(`/admin/orgs/${orgId}/entitlement/revoke`, { reason });
}
function adminExtendOrgEntitlement(orgId, { newExpiresAt, reason, paymentReference, adminNote } = {}) {
  const body2 = { newExpiresAt, reason };
  if (paymentReference) body2.paymentReference = paymentReference;
  if (adminNote) body2.adminNote = adminNote;
  return api.post(`/admin/orgs/${orgId}/entitlement/extend`, body2);
}
function listAdminBlogPosts(params = {}) {
  return api.get("/admin/blog/posts", { params });
}
function getAdminBlogPostById(id) {
  return api.get(`/admin/blog/posts/${id}`);
}
function createAdminBlogPost(body2) {
  return api.post("/admin/blog/posts", body2);
}
function updateAdminBlogPost(id, body2) {
  return api.patch(`/admin/blog/posts/${id}`, body2);
}
function publishAdminBlogPost(id) {
  return api.post(`/admin/blog/posts/${id}/publish`);
}
function unpublishAdminBlogPost(id) {
  return api.post(`/admin/blog/posts/${id}/unpublish`);
}
function deleteAdminBlogPost(id) {
  return api.post(`/admin/blog/posts/${id}/delete`);
}
function uploadAdminBlogHeroImage(id, file, alt) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("alt", alt);
  return api.post(`/admin/blog/posts/${id}/upload-hero`, fd);
}
function uploadAdminBlogSectionImage(id, sectionIdx2, file, alt) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("alt", alt);
  return api.post(
    `/admin/blog/posts/${id}/sections/${sectionIdx2}/upload-image`,
    fd
  );
}
function removeAdminBlogSectionImage(id, sectionIdx2) {
  return api.post(
    `/admin/blog/posts/${id}/sections/${sectionIdx2}/remove-image`
  );
}
function listAdminGuidePosts(params = {}) {
  return api.get("/admin/guides/posts", { params });
}
function getAdminGuidePostById(id) {
  return api.get(`/admin/guides/posts/${id}`);
}
function createAdminGuidePost(body2) {
  return api.post("/admin/guides/posts", body2);
}
function updateAdminGuidePost(id, body2) {
  return api.patch(`/admin/guides/posts/${id}`, body2);
}
function publishAdminGuidePost(id) {
  return api.post(`/admin/guides/posts/${id}/publish`);
}
function unpublishAdminGuidePost(id) {
  return api.post(`/admin/guides/posts/${id}/unpublish`);
}
function deleteAdminGuidePost(id) {
  return api.post(`/admin/guides/posts/${id}/delete`);
}
function uploadAdminGuideHeroImage(id, file, alt) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("alt", alt);
  return api.post(`/admin/guides/posts/${id}/upload-hero`, fd);
}
function uploadAdminGuideSectionImage(id, sectionIdx2, file, alt) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("alt", alt);
  return api.post(
    `/admin/guides/posts/${id}/sections/${sectionIdx2}/upload-image`,
    fd
  );
}
function removeAdminGuideSectionImage(id, sectionIdx2) {
  return api.post(
    `/admin/guides/posts/${id}/sections/${sectionIdx2}/remove-image`
  );
}
const root = "_root_1a0bs_1";
const header = "_header_1a0bs_21";
const controls = "_controls_1a0bs_35";
const titleWrap = "_titleWrap_1a0bs_51";
const title$1 = "_title_1a0bs_51";
const subtitle$1 = "_subtitle_1a0bs_79";
const rangeTabs = "_rangeTabs_1a0bs_91";
const optOutBtn = "_optOutBtn_1a0bs_105";
const optOutBtnActive = "_optOutBtnActive_1a0bs_139";
const optOutHint = "_optOutHint_1a0bs_149";
const tab$1 = "_tab_1a0bs_161";
const tabActive$1 = "_tabActive_1a0bs_195";
const blocks = "_blocks_1a0bs_205";
const block = "_block_1a0bs_205";
const blockTitle = "_blockTitle_1a0bs_237";
const kpis = "_kpis_1a0bs_247";
const kpiCard = "_kpiCard_1a0bs_259";
const kpiLabel = "_kpiLabel_1a0bs_281";
const kpiValue = "_kpiValue_1a0bs_291";
const sourcesGrid = "_sourcesGrid_1a0bs_301";
const sourceCard = "_sourceCard_1a0bs_313";
const sourceTitle = "_sourceTitle_1a0bs_335";
const rows = "_rows_1a0bs_345";
const row$1 = "_row_1a0bs_345";
const rowKey = "_rowKey_1a0bs_371";
const rowVal = "_rowVal_1a0bs_417";
const campaignsGrid = "_campaignsGrid_1a0bs_429";
const campaignCard = "_campaignCard_1a0bs_441";
const campaignTitle = "_campaignTitle_1a0bs_463";
const muted$3 = "_muted_1a0bs_473";
const errorText$1 = "_errorText_1a0bs_483";
const visitApproxNote = "_visitApproxNote_1a0bs_537";
const visitSubTitle = "_visitSubTitle_1a0bs_551";
const visitTableHead = "_visitTableHead_1a0bs_567";
const visitTableRow = "_visitTableRow_1a0bs_589";
const visitCellSource = "_visitCellSource_1a0bs_613";
const visitCellNum = "_visitCellNum_1a0bs_629";
const styles$4 = {
  root,
  header,
  controls,
  titleWrap,
  title: title$1,
  subtitle: subtitle$1,
  rangeTabs,
  optOutBtn,
  optOutBtnActive,
  optOutHint,
  tab: tab$1,
  tabActive: tabActive$1,
  blocks,
  block,
  blockTitle,
  kpis,
  kpiCard,
  kpiLabel,
  kpiValue,
  sourcesGrid,
  sourceCard,
  sourceTitle,
  rows,
  row: row$1,
  rowKey,
  rowVal,
  campaignsGrid,
  campaignCard,
  campaignTitle,
  muted: muted$3,
  errorText: errorText$1,
  visitApproxNote,
  visitSubTitle,
  visitTableHead,
  visitTableRow,
  visitCellSource,
  visitCellNum
};
const RANGE_OPTIONS = [1, 7, 30, 90];
const OPT_OUT_KEY = "siteAnalyticsOptOut";
const CHANNEL_LABELS = {
  direct: "ישיר",
  social: "רשתות חברתיות",
  referral: "הפניה",
  search: "חיפוש",
  email: "אימייל",
  paid: "ממומן",
  ai: "בינה מלאכותית (AI)",
  other: "אחר"
};
const SOURCE_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  google: "Google",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
  yahoo: "Yahoo",
  direct: "ישיר",
  ai: "בינה מלאכותית",
  other_source: "מקור אחר"
};
function sourceLabel(key) {
  const k = String(key || "");
  if (SOURCE_LABELS[k]) return SOURCE_LABELS[k];
  if (k.startsWith("ext_")) return k.slice(4);
  if (k.startsWith("utm_")) return `UTM: ${k.slice(4)}`;
  return k;
}
const ACTION_LABELS = {
  home_hero_primary_register: "לחיצה על הכפתור הראשי בכותרת הבית",
  home_hero_secondary_examples: "לחיצה על כפתור הדוגמאות בכותרת הבית",
  home_templates_cta: "לחיצה על בחירת תבנית בעמוד הבית",
  home_bottom_cta: "לחיצה על הכפתור התחתון בעמוד הבית",
  pricing_trial_start: "לחיצה על התחלת ניסיון בעמוד המחירים",
  pricing_premium_upgrade: "לחיצה על שדרוג לפרימיום",
  pricing_monthly_start: "לחיצה על בחירת מסלול חודשי",
  pricing_annual_start: "לחיצה על בחירת מסלול שנתי",
  contact_email_click: "לחיצה על קישור אימייל",
  contact_form_submit: "שליחת טופס יצירת קשר",
  contact_whatsapp_click: "לחיצה על קישור WhatsApp",
  cards_hero_cta: "לחיצה על הכפתור הראשי בכותרת עמוד הדוגמאות",
  cards_templates_cta: "לחיצה על בחירת תבנית בעמוד הדוגמאות",
  cards_showcase_card_cta: "לחיצה על התחלה מכרטיס תבנית",
  cards_showcase_view_all_cta: "לחיצה על צפייה בכל התבניות",
  cards_bottom_cta: "לחיצה על הכפתור התחתון בעמוד הדוגמאות"
};
function readOptOut() {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage?.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}
function writeOptOut(nextValue) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage?.setItem(OPT_OUT_KEY, nextValue ? "1" : "0");
  } catch {
  }
}
function AdminAnalyticsView({ refreshKey = 0 } = {}) {
  const [rangeDays, setRangeDays] = useState(7);
  const [optOut, setOptOut] = useState(() => readOptOut());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [sources, setSources] = useState(null);
  const [visits, setVisits] = useState(null);
  const rangeLabel = useMemo(() => {
    if (rangeDays === 1) return "היום (UTC)";
    if (rangeDays === 7) return "7 ימים";
    if (rangeDays === 30) return "30 ימים";
    if (rangeDays === 90) return "90 ימים";
    return `${rangeDays} ימים`;
  }, [rangeDays]);
  useEffect(() => {
    let alive = true;
    async function runBase() {
      setLoading(true);
      setError("");
      try {
        const [s1, s2] = await Promise.all([
          getAdminSiteAnalyticsSummary({ range: rangeDays }),
          getAdminSiteAnalyticsSources({ range: rangeDays })
        ]);
        if (!alive) return;
        setSummary(s1?.data || null);
        setSources(s2?.data || null);
      } catch (e) {
        if (!alive) return;
        const msg = typeof e?.response?.data?.message === "string" ? e.response.data.message : "לא הצלחנו לטעון את נתוני האנליטיקה";
        setError(msg);
        setSummary(null);
        setSources(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }
    async function runVisits() {
      try {
        const s3 = await getAdminSiteAnalyticsVisits({
          range: rangeDays
        });
        if (!alive) return;
        setVisits(s3?.data || null);
      } catch {
        if (!alive) return;
        setVisits(null);
      }
    }
    runBase();
    runVisits();
    return () => {
      alive = false;
    };
  }, [rangeDays, refreshKey]);
  const kpi = summary?.kpi || null;
  const today = summary?.today || null;
  const channelsObj = sources?.channels && typeof sources.channels === "object" ? sources.channels : {};
  const channelsRows = useMemo(() => {
    return Object.entries(channelsObj).map(([key, value]) => ({ key, count: Number(value) || 0 })).filter((x) => x.key && x.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [channelsObj]);
  const referrersTop = Array.isArray(sources?.referrersTop) ? sources.referrersTop : [];
  const utmTop = Array.isArray(sources?.utmSourcesTop) ? sources.utmSourcesTop : [];
  const campaignsTop = Array.isArray(sources?.campaignsTop) ? sources.campaignsTop : [];
  const aiSourcesTop = Array.isArray(sources?.aiSourcesTop) ? sources.aiSourcesTop : [];
  const sourceTopRows = Array.isArray(sources?.sourceTop) ? sources.sourceTop : [];
  const topPages = Array.isArray(sources?.topPages) ? sources.topPages : [];
  const topActions = Array.isArray(sources?.topActions) ? sources.topActions : [];
  const totalUniqueVisitors = typeof visits?.totalUniqueVisitors === "number" ? visits.totalUniqueVisitors : null;
  const topActionsBySource = visits?.topActionsBySource && typeof visits.topActionsBySource === "object" && !Array.isArray(visits.topActionsBySource) ? visits.topActionsBySource : {};
  const topLandingsBySource = visits?.topLandingsBySource && typeof visits.topLandingsBySource === "object" && !Array.isArray(visits.topLandingsBySource) ? visits.topLandingsBySource : {};
  const visitSourceRows = useMemo(() => {
    const vbs = Array.isArray(visits?.visitsBySource) ? visits.visitsBySource : [];
    const ubs = Array.isArray(visits?.uniquesBySource) ? visits.uniquesBySource : [];
    const uniquesMap = {};
    for (const r of ubs) {
      uniquesMap[r.source] = r.uniqueVisitors;
    }
    return vbs.map((r) => ({
      source: r.source,
      visits: r.visits,
      uniqueVisitors: uniquesMap[r.source] !== void 0 ? uniquesMap[r.source] : null
    }));
  }, [visits]);
  const formatPct = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return `${Math.round(n * 1e3) / 10}%`;
  };
  const onToggleOptOut = () => {
    setOptOut((prev) => {
      const next = !prev;
      writeOptOut(next);
      return next;
    });
  };
  return /* @__PURE__ */ jsxs(
    "section",
    {
      className: styles$4.root,
      dir: "rtl",
      "aria-label": "אנליטיקת אתר (שיווק)",
      children: [
        /* @__PURE__ */ jsxs("header", { className: styles$4.header, children: [
          /* @__PURE__ */ jsxs("div", { className: styles$4.titleWrap, children: [
            /* @__PURE__ */ jsx("h2", { className: styles$4.title, children: "אנליטיקת אתר (שיווק)" }),
            /* @__PURE__ */ jsx("p", { className: styles$4.subtitle, children: "מציג נתונים מכל הדפים הציבוריים השיווקיים · לא כולל דפי כרטיסים, ניהול, הרשמה ואימות" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$4.controls, children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                className: styles$4.rangeTabs,
                role: "tablist",
                "aria-label": "Range",
                children: RANGE_OPTIONS.map((d) => /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: `${styles$4.tab} ${rangeDays === d ? styles$4.tabActive : ""}`,
                    role: "tab",
                    "aria-selected": rangeDays === d,
                    onClick: () => setRangeDays(d),
                    children: d === 1 ? "היום (UTC)" : d
                  },
                  d
                ))
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: `${styles$4.optOutBtn} ${optOut ? styles$4.optOutBtnActive : ""}`,
                "aria-pressed": optOut,
                onClick: onToggleOptOut,
                children: "אל תעקוב אחרי הביקורים שלי"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { className: styles$4.optOutHint, children: optOut ? "איסוף נתונים מושבת: הביקורים שלך מהמכשיר הזה לא נספרים." : "איסוף נתונים פעיל: הביקורים שלך בדפים הציבוריים נספרים." }),
        loading ? /* @__PURE__ */ jsx("p", { className: styles$4.muted, children: "טוען…" }) : error ? /* @__PURE__ */ jsx("p", { className: styles$4.errorText, children: error }) : !summary || !sources ? /* @__PURE__ */ jsxs("p", { className: styles$4.muted, children: [
          "מצב ",
          rangeLabel,
          ": אין נתונים."
        ] }) : null,
        /* @__PURE__ */ jsxs("div", { className: styles$4.blocks, children: [
          /* @__PURE__ */ jsxs("div", { className: styles$4.block, children: [
            /* @__PURE__ */ jsx("div", { className: styles$4.blockTitle, children: "מדדי מפתח" }),
            /* @__PURE__ */ jsxs("div", { className: styles$4.kpis, children: [
              /* @__PURE__ */ jsxs("div", { className: styles$4.kpiCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$4.kpiLabel, children: "צפיות" }),
                /* @__PURE__ */ jsx("div", { className: styles$4.kpiValue, children: typeof kpi?.views === "number" ? kpi.views : "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$4.kpiCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$4.kpiLabel, children: "קליקים" }),
                /* @__PURE__ */ jsx("div", { className: styles$4.kpiValue, children: typeof kpi?.clicksTotal === "number" ? kpi.clicksTotal : "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$4.kpiCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$4.kpiLabel, children: "יחס המרה" }),
                /* @__PURE__ */ jsx("div", { className: styles$4.kpiValue, children: typeof kpi?.conversion === "number" ? formatPct(kpi.conversion) : "-" })
              ] })
            ] }),
            today && rangeDays !== 1 ? /* @__PURE__ */ jsxs("p", { className: styles$4.muted, children: [
              "היום: צפיות ",
              Number(today.views) || 0,
              " · קליקים",
              " ",
              Number(today.clicksTotal) || 0
            ] }) : null
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$4.block, children: [
            /* @__PURE__ */ jsx("div", { className: styles$4.blockTitle, children: "מקורות" }),
            /* @__PURE__ */ jsxs("div", { className: styles$4.sourcesGrid, children: [
              /* @__PURE__ */ jsxs("div", { className: styles$4.sourceCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$4.sourceTitle, children: "ערוצי תנועה" }),
                channelsRows.length ? /* @__PURE__ */ jsx("div", { className: styles$4.rows, children: channelsRows.map((r) => /* @__PURE__ */ jsxs("div", { className: styles$4.row, children: [
                  /* @__PURE__ */ jsx("span", { className: styles$4.rowKey, children: CHANNEL_LABELS[r.key] || r.key }),
                  /* @__PURE__ */ jsx("span", { className: styles$4.rowVal, children: r.count })
                ] }, r.key)) }) : /* @__PURE__ */ jsx("p", { className: styles$4.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$4.sourceCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$4.sourceTitle, children: "מקורות מנורמלים" }),
                sourceTopRows.length ? /* @__PURE__ */ jsx("div", { className: styles$4.rows, children: sourceTopRows.map((r) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$4.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowKey, children: sourceLabel(r.source) }),
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowVal, children: Number(r.count) || 0 })
                    ]
                  },
                  r.source
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$4.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$4.sourceCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$4.sourceTitle, children: "מקורות הפניה" }),
                referrersTop.length ? /* @__PURE__ */ jsx("div", { className: styles$4.rows, children: referrersTop.map((r) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$4.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowKey, children: r.referrer }),
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowVal, children: Number(r.count) || 0 })
                    ]
                  },
                  r.referrer
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$4.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$4.sourceCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$4.sourceTitle, children: "UTM" }),
                utmTop.length ? /* @__PURE__ */ jsx("div", { className: styles$4.rows, children: utmTop.map((r) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$4.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowKey, children: r.source }),
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowVal, children: Number(r.count) || 0 })
                    ]
                  },
                  r.source
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$4.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$4.sourceCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$4.sourceTitle, children: "מקורות בינה מלאכותית" }),
                aiSourcesTop.length ? /* @__PURE__ */ jsx("div", { className: styles$4.rows, children: aiSourcesTop.map((r) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$4.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowKey, children: r.source }),
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowVal, children: Number(r.count) || 0 })
                    ]
                  },
                  r.source
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$4.muted, children: "-" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$4.block, children: [
            /* @__PURE__ */ jsx("div", { className: styles$4.blockTitle, children: "פופולרי" }),
            /* @__PURE__ */ jsxs("div", { className: styles$4.campaignsGrid, children: [
              /* @__PURE__ */ jsxs("div", { className: styles$4.campaignCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$4.campaignTitle, children: "עמודים מובילים" }),
                topPages.length ? /* @__PURE__ */ jsx("div", { className: styles$4.rows, children: topPages.slice(0, 10).map((p) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$4.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowKey, children: p.pagePath }),
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowVal, children: Number(p.count) || 0 })
                    ]
                  },
                  p.pagePath
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$4.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$4.campaignCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$4.campaignTitle, children: "פעולות מובילות" }),
                topActions.length ? /* @__PURE__ */ jsx("div", { className: styles$4.rows, children: topActions.map((a) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$4.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowKey, children: ACTION_LABELS[a.action] || a.action }),
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowVal, children: Number(a.count) || 0 })
                    ]
                  },
                  a.action
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$4.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$4.campaignCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$4.campaignTitle, children: "קמפיינים (UTM)" }),
                campaignsTop.length ? /* @__PURE__ */ jsx("div", { className: styles$4.rows, children: campaignsTop.slice(0, 10).map((c) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$4.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowKey, children: c.campaign }),
                      /* @__PURE__ */ jsx("span", { className: styles$4.rowVal, children: Number(c.count) || 0 })
                    ]
                  },
                  c.campaign
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$4.muted, children: "-" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$4.block, children: [
            /* @__PURE__ */ jsx("div", { className: styles$4.blockTitle, children: "ביקורים לפי מקור" }),
            /* @__PURE__ */ jsx("div", { className: styles$4.kpis, children: /* @__PURE__ */ jsxs("div", { className: styles$4.kpiCard, children: [
              /* @__PURE__ */ jsx("div", { className: styles$4.kpiLabel, children: "מבקרים (בקירוב)" }),
              /* @__PURE__ */ jsx("div", { className: styles$4.kpiValue, children: totalUniqueVisitors !== null ? totalUniqueVisitors : "-" }),
              /* @__PURE__ */ jsx("p", { className: styles$4.visitApproxNote, children: "כפיל דפדפן בלבד · לא מייצג אנשים · ביקורים ממקורות שונים עשויים לחפוף" })
            ] }) }),
            visitSourceRows.length > 0 ? /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("div", { className: styles$4.visitTableHead, children: [
                /* @__PURE__ */ jsx("span", { className: styles$4.visitCellSource, children: "מקור" }),
                /* @__PURE__ */ jsx("span", { className: styles$4.visitCellNum, children: "ביקורים" }),
                /* @__PURE__ */ jsx("span", { className: styles$4.visitCellNum, children: "מבקרים ייחודיים (בקירוב)" })
              ] }),
              visitSourceRows.map((r) => /* @__PURE__ */ jsxs(
                "div",
                {
                  className: styles$4.visitTableRow,
                  children: [
                    /* @__PURE__ */ jsx("span", { className: styles$4.visitCellSource, children: sourceLabel(r.source) }),
                    /* @__PURE__ */ jsx("span", { className: styles$4.visitCellNum, children: r.visits }),
                    /* @__PURE__ */ jsx("span", { className: styles$4.visitCellNum, children: r.uniqueVisitors !== null ? r.uniqueVisitors : "-" })
                  ]
                },
                r.source
              ))
            ] }) : !loading && !error ? /* @__PURE__ */ jsx("p", { className: styles$4.muted, children: "אין נתוני ביקורים לתקופה זו." }) : null,
            Object.keys(topLandingsBySource).length > 0 && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: styles$4.visitSubTitle, children: "עמודי כניסה לפי מקור" }),
              /* @__PURE__ */ jsx("div", { className: styles$4.sourcesGrid, children: Object.entries(topLandingsBySource).map(
                ([src, pages]) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$4.sourceCard,
                    children: [
                      /* @__PURE__ */ jsx("div", { className: styles$4.sourceTitle, children: sourceLabel(src) }),
                      /* @__PURE__ */ jsx("div", { className: styles$4.rows, children: pages.map((p) => /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: styles$4.row,
                          children: [
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles$4.rowKey,
                                children: p.landingPage
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles$4.rowVal,
                                children: Number(p.count) || 0
                              }
                            )
                          ]
                        },
                        p.landingPage
                      )) })
                    ]
                  },
                  src
                )
              ) })
            ] }),
            Object.keys(topActionsBySource).length > 0 && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: styles$4.visitSubTitle, children: "פעולות לפי מקור" }),
              /* @__PURE__ */ jsx("div", { className: styles$4.sourcesGrid, children: Object.entries(topActionsBySource).map(
                ([src, actions]) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$4.sourceCard,
                    children: [
                      /* @__PURE__ */ jsx("div", { className: styles$4.sourceTitle, children: sourceLabel(src) }),
                      /* @__PURE__ */ jsx("div", { className: styles$4.rows, children: actions.map((a) => /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: styles$4.row,
                          children: [
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles$4.rowKey,
                                children: ACTION_LABELS[a.action] || a.action
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles$4.rowVal,
                                children: Number(a.count) || 0
                              }
                            )
                          ]
                        },
                        a.action
                      )) })
                    ]
                  },
                  src
                )
              ) })
            ] })
          ] })
        ] })
      ]
    }
  );
}
const wrap$2 = "_wrap_nqnhm_1";
const topRow$1 = "_topRow_nqnhm_13";
const h2$3 = "_h2_nqnhm_31";
const h3$2 = "_h3_nqnhm_43";
const h4$1 = "_h4_nqnhm_55";
const grid$2 = "_grid_nqnhm_71";
const panel$2 = "_panel_nqnhm_97";
const searchRow$3 = "_searchRow_nqnhm_133";
const muted$2 = "_muted_nqnhm_147";
const postList$1 = "_postList_nqnhm_161";
const postItem$1 = "_postItem_nqnhm_179";
const postItemActive$1 = "_postItemActive_nqnhm_205";
const postBtn$1 = "_postBtn_nqnhm_215";
const postThumb$1 = "_postThumb_nqnhm_255";
const postInfo$1 = "_postInfo_nqnhm_275";
const postTitle$1 = "_postTitle_nqnhm_291";
const postExcerpt$1 = "_postExcerpt_nqnhm_309";
const postDate$1 = "_postDate_nqnhm_325";
const badge$1 = "_badge_nqnhm_339";
const badgePublished$1 = "_badgePublished_nqnhm_355";
const badgeDraft$1 = "_badgeDraft_nqnhm_365";
const pager$3 = "_pager_nqnhm_379";
const pagerMeta$3 = "_pagerMeta_nqnhm_397";
const form$2 = "_form_nqnhm_411";
const fieldLabel$1 = "_fieldLabel_nqnhm_423";
const textarea$1 = "_textarea_nqnhm_439";
const sectionBlock$2 = "_sectionBlock_nqnhm_479";
const heroPreview$1 = "_heroPreview_nqnhm_499";
const heroImg$1 = "_heroImg_nqnhm_509";
const heroFields$1 = "_heroFields_nqnhm_523";
const toggleRow$2 = "_toggleRow_nqnhm_539";
const fileInput$1 = "_fileInput_nqnhm_555";
const sectionCard$1 = "_sectionCard_nqnhm_569";
const sectionCardHeader$1 = "_sectionCardHeader_nqnhm_591";
const sectionIdx$1 = "_sectionIdx_nqnhm_605";
const sectionActions$1 = "_sectionActions_nqnhm_617";
const iconBtn$1 = "_iconBtn_nqnhm_629";
const iconBtnDanger$1 = "_iconBtnDanger_nqnhm_685";
const secImgBlock$1 = "_secImgBlock_nqnhm_705";
const secImgPreview$1 = "_secImgPreview_nqnhm_719";
const secImgThumb$1 = "_secImgThumb_nqnhm_727";
const secImgActions$1 = "_secImgActions_nqnhm_741";
const timestampsRow$1 = "_timestampsRow_nqnhm_757";
const tsItem$1 = "_tsItem_nqnhm_775";
const slugHint$1 = "_slugHint_nqnhm_789";
const linkHint$1 = "_linkHint_nqnhm_807";
const linkHintSummary$1 = "_linkHintSummary_nqnhm_819";
const linkHintBody$1 = "_linkHintBody_nqnhm_905";
const linkHintExamples$1 = "_linkHintExamples_nqnhm_935";
const linkHintCode$1 = "_linkHintCode_nqnhm_945";
const uploadHint$1 = "_uploadHint_nqnhm_977";
const actionRow$1 = "_actionRow_nqnhm_995";
const styles$3 = {
  wrap: wrap$2,
  topRow: topRow$1,
  h2: h2$3,
  h3: h3$2,
  h4: h4$1,
  grid: grid$2,
  panel: panel$2,
  searchRow: searchRow$3,
  muted: muted$2,
  postList: postList$1,
  postItem: postItem$1,
  postItemActive: postItemActive$1,
  postBtn: postBtn$1,
  postThumb: postThumb$1,
  postInfo: postInfo$1,
  postTitle: postTitle$1,
  postExcerpt: postExcerpt$1,
  postDate: postDate$1,
  badge: badge$1,
  badgePublished: badgePublished$1,
  badgeDraft: badgeDraft$1,
  pager: pager$3,
  pagerMeta: pagerMeta$3,
  form: form$2,
  fieldLabel: fieldLabel$1,
  textarea: textarea$1,
  sectionBlock: sectionBlock$2,
  heroPreview: heroPreview$1,
  heroImg: heroImg$1,
  heroFields: heroFields$1,
  toggleRow: toggleRow$2,
  fileInput: fileInput$1,
  sectionCard: sectionCard$1,
  sectionCardHeader: sectionCardHeader$1,
  sectionIdx: sectionIdx$1,
  sectionActions: sectionActions$1,
  iconBtn: iconBtn$1,
  iconBtnDanger: iconBtnDanger$1,
  secImgBlock: secImgBlock$1,
  secImgPreview: secImgPreview$1,
  secImgThumb: secImgThumb$1,
  secImgActions: secImgActions$1,
  timestampsRow: timestampsRow$1,
  tsItem: tsItem$1,
  slugHint: slugHint$1,
  linkHint: linkHint$1,
  linkHintSummary: linkHintSummary$1,
  linkHintBody: linkHintBody$1,
  linkHintExamples: linkHintExamples$1,
  linkHintCode: linkHintCode$1,
  uploadHint: uploadHint$1,
  actionRow: actionRow$1
};
const MAX_SECTIONS$1 = 20;
const EMPTY_SECTION$1 = () => ({
  heading: "",
  body: "",
  imageUrl: null,
  imageAlt: ""
});
function safeString$2(value) {
  if (value === null || value === void 0) return "";
  return String(value);
}
function slugFromTitle$1(title2) {
  return String(title2 || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}
function normalizeSlug$1(raw) {
  return String(raw || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-").slice(0, 100);
}
function mapBlogApiError(err) {
  const status = err?.response?.status;
  const apiMessage = typeof err?.response?.data?.message === "string" ? err.response.data.message.trim() : "";
  if (status === 401) return "נדרשת התחברות.";
  if (status === 403) return "אין הרשאות.";
  if (status === 404) return "הפוסט לא נמצא.";
  if (status === 409) return apiMessage || "סלאג כבר תפוס.";
  if (status === 413) return "הקובץ גדול מדי (מקסימום 2MB).";
  if (status === 422) return apiMessage || "שגיאת ולידציה.";
  return "אירעה שגיאה. נסה שוב.";
}
function formatDate$2(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("he-IL", {
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch {
    return String(iso);
  }
}
function AdminBlogView() {
  const [flash, setFlash] = useState(null);
  const flashTimerRef = useRef(null);
  function showFlash(type, text) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash({ type, text });
    flashTimerRef.current = setTimeout(() => setFlash(null), 3500);
  }
  const [posts, setPosts] = useState([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [searchQ, setSearchQ] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedBusy, setSelectedBusy] = useState(false);
  const [fTitle, setFTitle] = useState("");
  const [fSlug, setFSlug] = useState("");
  const [fSlugTouched, setFSlugTouched] = useState(false);
  const [fExcerpt, setFExcerpt] = useState("");
  const [fSections, setFSections] = useState([]);
  const [fSeoTitle, setFSeoTitle] = useState("");
  const [fSeoDesc, setFSeoDesc] = useState("");
  const [fShowAuthor, setFShowAuthor] = useState(false);
  const [fHeroUrl, setFHeroUrl] = useState(null);
  const [fHeroAlt, setFHeroAlt] = useState("");
  const [fStatus, setFStatus] = useState("draft");
  const [fPublishedAt, setFPublishedAt] = useState(null);
  const [fCreatedAt, setFCreatedAt] = useState(null);
  const [fUpdatedAt, setFUpdatedAt] = useState(null);
  const heroFileRef = useRef(null);
  const selectRequestRef = useRef(0);
  async function fetchList() {
    setListLoading(true);
    try {
      const params = { page, limit };
      if (searchQ.trim()) params.q = searchQ.trim();
      const res = await listAdminBlogPosts(params);
      const d = res.data;
      setPosts(d.items || []);
      setPostsTotal(d.total || 0);
    } catch (err) {
      showFlash("error", mapBlogApiError(err));
    } finally {
      setListLoading(false);
    }
  }
  useEffect(() => {
    fetchList();
  }, [page]);
  function populateForm(post) {
    setFTitle(safeString$2(post.title));
    setFSlug(safeString$2(post.slug));
    setFSlugTouched(false);
    setFExcerpt(safeString$2(post.excerpt));
    setFSections(
      (post.sections || []).map((s) => ({
        heading: safeString$2(s.heading),
        body: safeString$2(s.body),
        imageUrl: s.imageUrl || null,
        imageAlt: safeString$2(s.imageAlt)
      }))
    );
    setFSeoTitle(safeString$2(post.seo?.title));
    setFSeoDesc(safeString$2(post.seo?.description));
    setFShowAuthor(Boolean(post.authorName));
    setFHeroUrl(post.heroImageUrl || null);
    setFHeroAlt(safeString$2(post.heroImageAlt));
    setFStatus(post.status || "draft");
    setFPublishedAt(post.publishedAt || null);
    setFCreatedAt(post.createdAt || null);
    setFUpdatedAt(post.updatedAt || null);
  }
  function resetForm() {
    setSelectedId(null);
    setFTitle("");
    setFSlug("");
    setFSlugTouched(false);
    setFExcerpt("");
    setFSections([]);
    setFSeoTitle("");
    setFSeoDesc("");
    setFShowAuthor(false);
    setFHeroUrl(null);
    setFHeroAlt("");
    setFStatus("draft");
    setFPublishedAt(null);
    setFCreatedAt(null);
    setFUpdatedAt(null);
    if (heroFileRef.current) heroFileRef.current.value = "";
  }
  function handleSelectPost(post) {
    const requestId = ++selectRequestRef.current;
    setSelectedId(post.id);
    setSelectedBusy(true);
    getAdminBlogPostById(post.id).then((res) => {
      if (selectRequestRef.current !== requestId) return;
      populateForm(res.data);
    }).catch((err) => {
      if (selectRequestRef.current !== requestId) return;
      showFlash("error", mapBlogApiError(err));
    }).finally(() => {
      if (selectRequestRef.current !== requestId) return;
      setSelectedBusy(false);
    });
  }
  function handleTitleChange(e) {
    const v = e.target.value;
    setFTitle(v);
    if (!fSlugTouched) {
      setFSlug(slugFromTitle$1(v));
    }
  }
  function handleSectionField(idx, field, value) {
    setFSections((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }
  function addSection() {
    if (fSections.length >= MAX_SECTIONS$1) {
      showFlash("error", `לא ניתן להוסיף יותר מ-${MAX_SECTIONS$1} קטעים.`);
      return;
    }
    setFSections((prev) => [...prev, EMPTY_SECTION$1()]);
  }
  function removeSection(idx) {
    setFSections((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveSection(idx, dir) {
    setFSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  async function handleCreate() {
    if (!fTitle.trim() || !fExcerpt.trim()) {
      showFlash("error", "כותרת ותקציר הם שדות חובה.");
      return;
    }
    setSelectedBusy(true);
    try {
      const slug = normalizeSlug$1(fSlug);
      const body2 = {
        title: fTitle.trim(),
        excerpt: fExcerpt.trim(),
        sections: fSections,
        seo: { title: fSeoTitle.trim(), description: fSeoDesc.trim() },
        authorName: fShowAuthor ? "ולנטין" : ""
      };
      if (slug) body2.slug = slug;
      const res = await createAdminBlogPost(body2);
      const post = res.data;
      showFlash("success", "הפוסט נוצר.");
      setSelectedId(post.id);
      populateForm(post);
      await fetchList();
    } catch (err) {
      showFlash("error", mapBlogApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleUpdate() {
    if (!selectedId) return;
    if (!fTitle.trim() || !fExcerpt.trim()) {
      showFlash("error", "כותרת ותקציר הם שדות חובה.");
      return;
    }
    setSelectedBusy(true);
    try {
      const body2 = {
        title: fTitle.trim(),
        excerpt: fExcerpt.trim(),
        sections: fSections,
        seo: { title: fSeoTitle.trim(), description: fSeoDesc.trim() },
        authorName: fShowAuthor ? "ולנטין" : ""
      };
      if (fSlugTouched) {
        const slug = normalizeSlug$1(fSlug);
        if (slug) body2.slug = slug;
      }
      const res = await updateAdminBlogPost(selectedId, body2);
      populateForm(res.data);
      showFlash("success", "הפוסט עודכן.");
      await fetchList();
    } catch (err) {
      showFlash("error", mapBlogApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handlePublish() {
    if (!selectedId) return;
    setSelectedBusy(true);
    try {
      const res = await publishAdminBlogPost(selectedId);
      populateForm(res.data);
      showFlash("success", "הפוסט פורסם.");
      await fetchList();
    } catch (err) {
      showFlash("error", mapBlogApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleUnpublish() {
    if (!selectedId) return;
    setSelectedBusy(true);
    try {
      const res = await unpublishAdminBlogPost(selectedId);
      populateForm(res.data);
      showFlash("success", "הפוסט הוסר מפרסום.");
      await fetchList();
    } catch (err) {
      showFlash("error", mapBlogApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm("למחוק את הפוסט? פעולה זו בלתי הפיכה.")) return;
    setSelectedBusy(true);
    try {
      await deleteAdminBlogPost(selectedId);
      showFlash("success", "הפוסט נמחק.");
      resetForm();
      await fetchList();
    } catch (err) {
      showFlash("error", mapBlogApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleHeroUpload() {
    if (!selectedId) {
      showFlash("error", "יש לשמור את הפוסט לפני העלאת תמונה.");
      return;
    }
    const file = heroFileRef.current?.files?.[0];
    if (!file) {
      showFlash("error", "יש לבחור קובץ תמונה.");
      return;
    }
    if (!fHeroAlt.trim()) {
      showFlash("error", "טקסט חלופי (alt) הוא שדה חובה.");
      return;
    }
    setSelectedBusy(true);
    try {
      const res = await uploadAdminBlogHeroImage(
        selectedId,
        file,
        fHeroAlt.trim()
      );
      setFHeroUrl(res.data.heroImageUrl || null);
      showFlash("success", "התמונה הועלתה.");
      if (heroFileRef.current) heroFileRef.current.value = "";
    } catch (err) {
      showFlash("error", mapBlogApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleSectionImageUpload(idx) {
    if (!selectedId) {
      showFlash("error", "יש לשמור את הפוסט לפני העלאת תמונה.");
      return;
    }
    const fileInput2 = document.getElementById(`sec-img-input-${idx}`);
    const file = fileInput2?.files?.[0];
    if (!file) {
      showFlash("error", "יש לבחור קובץ תמונה.");
      return;
    }
    const alt = (fSections[idx]?.imageAlt || "").trim();
    if (!alt) {
      showFlash("error", "טקסט חלופי (alt) הוא שדה חובה לתמונת קטע.");
      return;
    }
    setSelectedBusy(true);
    try {
      const res = await uploadAdminBlogSectionImage(
        selectedId,
        idx,
        file,
        alt
      );
      setFSections((prev) => {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          imageUrl: res.data.imageUrl || null,
          imageAlt: res.data.imageAlt || alt
        };
        return next;
      });
      showFlash("success", "תמונת הקטע הועלתה.");
      if (fileInput2) fileInput2.value = "";
    } catch (err) {
      showFlash("error", mapBlogApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleSectionImageRemove(idx) {
    if (!selectedId) return;
    if (!window.confirm("להסיר את תמונת הקטע?")) return;
    setSelectedBusy(true);
    try {
      await removeAdminBlogSectionImage(selectedId, idx);
      setFSections((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], imageUrl: null, imageAlt: "" };
        return next;
      });
      showFlash("success", "תמונת הקטע הוסרה.");
      const fileInput2 = document.getElementById(`sec-img-input-${idx}`);
      if (fileInput2) fileInput2.value = "";
    } catch (err) {
      showFlash("error", mapBlogApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    fetchList();
  }
  const totalPages = Math.max(1, Math.ceil(postsTotal / limit));
  const isEditing = Boolean(selectedId);
  return /* @__PURE__ */ jsxs("div", { className: styles$3.wrap, children: [
    flash && /* @__PURE__ */ jsx(
      FlashBanner,
      {
        type: flash.type,
        message: flash.text,
        autoHideMs: 3500,
        onDismiss: () => setFlash(null)
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: styles$3.topRow, children: [
      /* @__PURE__ */ jsx("h2", { className: styles$3.h2, children: "ניהול בלוג" }),
      /* @__PURE__ */ jsx(
        Button,
        {
          onClick: () => {
            resetForm();
          },
          disabled: selectedBusy,
          children: "צור פוסט חדש"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles$3.grid, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$3.panel, children: [
        /* @__PURE__ */ jsx("h3", { className: styles$3.h3, children: "פוסטים" }),
        /* @__PURE__ */ jsxs("form", { className: styles$3.searchRow, onSubmit: handleSearch, children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              placeholder: "חיפוש לפי כותרת / סלאג",
              value: searchQ,
              onChange: (e) => setSearchQ(e.target.value)
            }
          ),
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: listLoading, children: "חפש" })
        ] }),
        listLoading && /* @__PURE__ */ jsx("p", { className: styles$3.muted, children: "טוען…" }),
        !listLoading && posts.length === 0 && /* @__PURE__ */ jsx("p", { className: styles$3.muted, children: "אין פוסטים." }),
        /* @__PURE__ */ jsx("ul", { className: styles$3.postList, children: posts.map((p) => /* @__PURE__ */ jsx(
          "li",
          {
            className: `${styles$3.postItem} ${selectedId === p.id ? styles$3.postItemActive : ""}`,
            children: /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                className: styles$3.postBtn,
                onClick: () => handleSelectPost(p),
                disabled: selectedBusy,
                children: [
                  p.heroImageUrl && /* @__PURE__ */ jsx(
                    "img",
                    {
                      className: styles$3.postThumb,
                      src: p.heroImageUrl,
                      alt: ""
                    }
                  ),
                  /* @__PURE__ */ jsxs("span", { className: styles$3.postInfo, children: [
                    /* @__PURE__ */ jsx("span", { className: styles$3.postTitle, children: p.title }),
                    p.excerpt && /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: styles$3.postExcerpt,
                        children: p.excerpt
                      }
                    ),
                    p.publishedAt && /* @__PURE__ */ jsx("span", { className: styles$3.postDate, children: formatDate$2(p.publishedAt) })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: `${styles$3.badge} ${p.status === "published" ? styles$3.badgePublished : styles$3.badgeDraft}`,
                      children: p.status === "published" ? "פורסם" : "טיוטה"
                    }
                  )
                ]
              }
            )
          },
          p.id
        )) }),
        postsTotal > limit && /* @__PURE__ */ jsxs("div", { className: styles$3.pager, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: () => setPage((p) => Math.max(1, p - 1)),
              disabled: page <= 1 || listLoading,
              children: "הקודם"
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: styles$3.pagerMeta, children: [
            page,
            " / ",
            totalPages
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: () => setPage((p) => Math.min(totalPages, p + 1)),
              disabled: page >= totalPages || listLoading,
              children: "הבא"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.panel, children: [
        /* @__PURE__ */ jsx("h3", { className: styles$3.h3, children: isEditing ? "עריכת פוסט" : "פוסט חדש" }),
        selectedBusy && selectedId && /* @__PURE__ */ jsx("p", { className: styles$3.muted, children: "טוען פוסט…" }),
        /* @__PURE__ */ jsxs("div", { className: styles$3.form, children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              label: "כותרת",
              required: true,
              value: fTitle,
              onChange: handleTitleChange,
              placeholder: "כותרת הפוסט",
              disabled: selectedBusy
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              label: "סלאג",
              value: fSlug,
              onChange: (e) => {
                setFSlugTouched(true);
                setFSlug(normalizeSlug$1(e.target.value));
              },
              placeholder: "ייווצר אוטומטית מהכותרת",
              meta: isEditing ? "שינוי סלאג ישבור קישורים קיימים" : "ייווצר בצד השרת",
              disabled: selectedBusy
            }
          ),
          /[\u0590-\u05FF]/.test(fTitle) && !normalizeSlug$1(fTitle) && /* @__PURE__ */ jsx("p", { className: styles$3.slugHint, children: "שימו לב: כשכותרת בעברית - הסלאג לא נוצר אוטומטית. אפשר להשאיר ריק (ייווצר אוטומטית כמו post-xxxxxxxx), או להזין סלאג באנגלית (a-z, 0-9, מקפים) לטובת SEO." }),
          /* @__PURE__ */ jsxs("label", { className: styles$3.fieldLabel, children: [
            "תקציר *",
            /* @__PURE__ */ jsx(
              "textarea",
              {
                className: styles$3.textarea,
                rows: 3,
                value: fExcerpt,
                onChange: (e) => setFExcerpt(e.target.value),
                placeholder: "תקציר קצר (עד 500 תווים)",
                required: true,
                disabled: selectedBusy
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$3.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$3.h4, children: "תמונה ראשית" }),
          fHeroUrl && /* @__PURE__ */ jsx("div", { className: styles$3.heroPreview, children: /* @__PURE__ */ jsx(
            "img",
            {
              className: styles$3.heroImg,
              src: fHeroUrl,
              alt: fHeroAlt || "hero"
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: styles$3.heroFields, children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "file",
                accept: "image/jpeg,image/png,image/webp",
                ref: heroFileRef,
                className: styles$3.fileInput,
                disabled: selectedBusy
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                label: "טקסט חלופי (alt)",
                required: true,
                value: fHeroAlt,
                onChange: (e) => setFHeroAlt(e.target.value),
                placeholder: "תיאור התמונה",
                disabled: selectedBusy
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: handleHeroUpload,
                disabled: selectedBusy || !selectedId,
                variant: "secondary",
                children: "העלה תמונה"
              }
            ),
            !selectedId && /* @__PURE__ */ jsx("p", { className: styles$3.uploadHint, children: "כדי להעלות תמונה צריך קודם לשמור את הפוסט." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$3.sectionBlock, children: [
          /* @__PURE__ */ jsxs("h4", { className: styles$3.h4, children: [
            "קטעי תוכן (",
            fSections.length,
            "/",
            MAX_SECTIONS$1,
            ")"
          ] }),
          fSections.map((sec, idx) => /* @__PURE__ */ jsxs("div", { className: styles$3.sectionCard, children: [
            /* @__PURE__ */ jsxs("div", { className: styles$3.sectionCardHeader, children: [
              /* @__PURE__ */ jsxs("span", { className: styles$3.sectionIdx, children: [
                "#",
                idx + 1
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$3.sectionActions, children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: styles$3.iconBtn,
                    onClick: () => moveSection(idx, -1),
                    disabled: idx === 0 || selectedBusy,
                    "aria-label": "הזז למעלה",
                    children: "▲"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: styles$3.iconBtn,
                    onClick: () => moveSection(idx, 1),
                    disabled: idx === fSections.length - 1 || selectedBusy,
                    "aria-label": "הזז למטה",
                    children: "▼"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: `${styles$3.iconBtn} ${styles$3.iconBtnDanger}`,
                    onClick: () => removeSection(idx),
                    disabled: selectedBusy,
                    "aria-label": "מחק קטע",
                    children: "✕"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              Input,
              {
                label: "כותרת קטע",
                value: sec.heading,
                onChange: (e) => handleSectionField(
                  idx,
                  "heading",
                  e.target.value
                ),
                disabled: selectedBusy
              }
            ),
            /* @__PURE__ */ jsxs("label", { className: styles$3.fieldLabel, children: [
              "תוכן",
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  className: styles$3.textarea,
                  rows: 5,
                  value: sec.body,
                  onChange: (e) => handleSectionField(
                    idx,
                    "body",
                    e.target.value
                  ),
                  disabled: selectedBusy
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$3.secImgBlock, children: [
              sec.imageUrl && /* @__PURE__ */ jsx("div", { className: styles$3.secImgPreview, children: /* @__PURE__ */ jsx(
                "img",
                {
                  className: styles$3.secImgThumb,
                  src: sec.imageUrl,
                  alt: sec.imageAlt || "section"
                }
              ) }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "file",
                  accept: "image/jpeg,image/png,image/webp",
                  id: `sec-img-input-${idx}`,
                  className: styles$3.fileInput,
                  disabled: selectedBusy
                }
              ),
              /* @__PURE__ */ jsx(
                Input,
                {
                  label: "טקסט חלופי לתמונה (alt)",
                  value: sec.imageAlt,
                  onChange: (e) => handleSectionField(
                    idx,
                    "imageAlt",
                    e.target.value
                  ),
                  disabled: selectedBusy
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: styles$3.secImgActions, children: [
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    onClick: () => handleSectionImageUpload(idx),
                    disabled: selectedBusy || !selectedId,
                    variant: "secondary",
                    children: "העלה תמונת קטע"
                  }
                ),
                !selectedId && /* @__PURE__ */ jsx("p", { className: styles$3.uploadHint, children: "כדי להעלות תמונה צריך קודם לשמור את הפוסט." }),
                sec.imageUrl && /* @__PURE__ */ jsx(
                  Button,
                  {
                    onClick: () => handleSectionImageRemove(
                      idx
                    ),
                    disabled: selectedBusy,
                    variant: "danger",
                    children: "הסר תמונה"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs("details", { className: styles$3.linkHint, children: [
              /* @__PURE__ */ jsx("summary", { className: styles$3.linkHintSummary, children: "איך מוסיפים קישורים בתוך הטקסט?" }),
              /* @__PURE__ */ jsxs("div", { className: styles$3.linkHintBody, children: [
                /* @__PURE__ */ jsx("p", { children: "טקסט לחיץ עם קישור:" }),
                /* @__PURE__ */ jsx("code", { className: styles$3.linkHintCode, children: "[טקסט להצגה](כתובת)" }),
                /* @__PURE__ */ jsx("p", { children: "אפשר גם להדביק כתובת URL מלאה - היא תזוהה אוטומטית." }),
                /* @__PURE__ */ jsx("p", { children: "לקישור פנימי בבלוג, עדיף להשתמש בנתיב יחסי:" }),
                /* @__PURE__ */ jsx("p", { className: styles$3.linkHintExamples, children: "דוגמאות:" }),
                /* @__PURE__ */ jsx("code", { className: styles$3.linkHintCode, children: "[קראו עוד](/blog/seo-tips)" }),
                /* @__PURE__ */ jsx("code", { className: styles$3.linkHintCode, children: "[לאתר הרשמי](https://example.com)" }),
                /* @__PURE__ */ jsx("code", { className: styles$3.linkHintCode, children: "https://cardigo.co.il/blog/digital-card-guide" })
              ] })
            ] })
          ] }, idx)),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: addSection,
              disabled: selectedBusy || fSections.length >= MAX_SECTIONS$1,
              children: "הוסף קטע"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$3.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$3.h4, children: "SEO" }),
          /* @__PURE__ */ jsxs("div", { className: styles$3.form, children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                label: "SEO כותרת",
                value: fSeoTitle,
                onChange: (e) => setFSeoTitle(e.target.value),
                placeholder: "ברירת מחדל: כותרת הפוסט",
                disabled: selectedBusy
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                label: "SEO תיאור",
                value: fSeoDesc,
                onChange: (e) => setFSeoDesc(e.target.value),
                placeholder: "ברירת מחדל: התקציר",
                disabled: selectedBusy
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$3.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$3.h4, children: "מחבר" }),
          /* @__PURE__ */ jsxs("label", { className: styles$3.toggleRow, children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: fShowAuthor,
                onChange: (e) => setFShowAuthor(e.target.checked),
                disabled: selectedBusy
              }
            ),
            'הצג מחבר של הכרטיס בפוסט (יציג "ולנטין" בתחתית הפוסט)'
          ] })
        ] }),
        isEditing && /* @__PURE__ */ jsxs("div", { className: styles$3.timestampsRow, children: [
          /* @__PURE__ */ jsxs("span", { className: styles$3.tsItem, children: [
            "נוצר: ",
            formatDate$2(fCreatedAt)
          ] }),
          /* @__PURE__ */ jsxs("span", { className: styles$3.tsItem, children: [
            "עודכן: ",
            formatDate$2(fUpdatedAt)
          ] }),
          fPublishedAt && /* @__PURE__ */ jsxs("span", { className: styles$3.tsItem, children: [
            "פורסם: ",
            formatDate$2(fPublishedAt)
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: styles$3.actionRow, children: isEditing ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              onClick: handleUpdate,
              disabled: selectedBusy,
              children: "שמור שינויים"
            }
          ),
          fStatus === "draft" ? /* @__PURE__ */ jsx(
            Button,
            {
              onClick: handlePublish,
              disabled: selectedBusy,
              variant: "secondary",
              children: "פרסם"
            }
          ) : /* @__PURE__ */ jsx(
            Button,
            {
              onClick: handleUnpublish,
              disabled: selectedBusy,
              variant: "secondary",
              children: "בטל פרסום"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              onClick: handleDelete,
              disabled: selectedBusy,
              variant: "danger",
              children: "מחק"
            }
          )
        ] }) : /* @__PURE__ */ jsx(
          Button,
          {
            onClick: handleCreate,
            disabled: selectedBusy,
            children: "צור פוסט"
          }
        ) })
      ] })
    ] })
  ] });
}
const wrap$1 = "_wrap_nqnhm_1";
const topRow = "_topRow_nqnhm_13";
const h2$2 = "_h2_nqnhm_31";
const h3$1 = "_h3_nqnhm_43";
const h4 = "_h4_nqnhm_55";
const grid$1 = "_grid_nqnhm_71";
const panel$1 = "_panel_nqnhm_97";
const searchRow$2 = "_searchRow_nqnhm_133";
const muted$1 = "_muted_nqnhm_147";
const postList = "_postList_nqnhm_161";
const postItem = "_postItem_nqnhm_179";
const postItemActive = "_postItemActive_nqnhm_205";
const postBtn = "_postBtn_nqnhm_215";
const postThumb = "_postThumb_nqnhm_255";
const postInfo = "_postInfo_nqnhm_275";
const postTitle = "_postTitle_nqnhm_291";
const postExcerpt = "_postExcerpt_nqnhm_309";
const postDate = "_postDate_nqnhm_325";
const badge = "_badge_nqnhm_339";
const badgePublished = "_badgePublished_nqnhm_355";
const badgeDraft = "_badgeDraft_nqnhm_365";
const pager$2 = "_pager_nqnhm_379";
const pagerMeta$2 = "_pagerMeta_nqnhm_397";
const form$1 = "_form_nqnhm_411";
const fieldLabel = "_fieldLabel_nqnhm_423";
const textarea = "_textarea_nqnhm_439";
const sectionBlock$1 = "_sectionBlock_nqnhm_479";
const heroPreview = "_heroPreview_nqnhm_499";
const heroImg = "_heroImg_nqnhm_509";
const heroFields = "_heroFields_nqnhm_523";
const toggleRow$1 = "_toggleRow_nqnhm_539";
const fileInput = "_fileInput_nqnhm_555";
const sectionCard = "_sectionCard_nqnhm_569";
const sectionCardHeader = "_sectionCardHeader_nqnhm_591";
const sectionIdx = "_sectionIdx_nqnhm_605";
const sectionActions = "_sectionActions_nqnhm_617";
const iconBtn = "_iconBtn_nqnhm_629";
const iconBtnDanger = "_iconBtnDanger_nqnhm_685";
const secImgBlock = "_secImgBlock_nqnhm_705";
const secImgPreview = "_secImgPreview_nqnhm_719";
const secImgThumb = "_secImgThumb_nqnhm_727";
const secImgActions = "_secImgActions_nqnhm_741";
const timestampsRow = "_timestampsRow_nqnhm_757";
const tsItem = "_tsItem_nqnhm_775";
const slugHint = "_slugHint_nqnhm_789";
const linkHint = "_linkHint_nqnhm_807";
const linkHintSummary = "_linkHintSummary_nqnhm_819";
const linkHintBody = "_linkHintBody_nqnhm_905";
const linkHintExamples = "_linkHintExamples_nqnhm_935";
const linkHintCode = "_linkHintCode_nqnhm_945";
const uploadHint = "_uploadHint_nqnhm_977";
const actionRow = "_actionRow_nqnhm_995";
const styles$2 = {
  wrap: wrap$1,
  topRow,
  h2: h2$2,
  h3: h3$1,
  h4,
  grid: grid$1,
  panel: panel$1,
  searchRow: searchRow$2,
  muted: muted$1,
  postList,
  postItem,
  postItemActive,
  postBtn,
  postThumb,
  postInfo,
  postTitle,
  postExcerpt,
  postDate,
  badge,
  badgePublished,
  badgeDraft,
  pager: pager$2,
  pagerMeta: pagerMeta$2,
  form: form$1,
  fieldLabel,
  textarea,
  sectionBlock: sectionBlock$1,
  heroPreview,
  heroImg,
  heroFields,
  toggleRow: toggleRow$1,
  fileInput,
  sectionCard,
  sectionCardHeader,
  sectionIdx,
  sectionActions,
  iconBtn,
  iconBtnDanger,
  secImgBlock,
  secImgPreview,
  secImgThumb,
  secImgActions,
  timestampsRow,
  tsItem,
  slugHint,
  linkHint,
  linkHintSummary,
  linkHintBody,
  linkHintExamples,
  linkHintCode,
  uploadHint,
  actionRow
};
const MAX_SECTIONS = 20;
const EMPTY_SECTION = () => ({
  heading: "",
  body: "",
  imageUrl: null,
  imageAlt: ""
});
function safeString$1(value) {
  if (value === null || value === void 0) return "";
  return String(value);
}
function slugFromTitle(title2) {
  return String(title2 || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}
function normalizeSlug(raw) {
  return String(raw || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-").slice(0, 100);
}
function mapGuideApiError(err) {
  const status = err?.response?.status;
  const apiMessage = typeof err?.response?.data?.message === "string" ? err.response.data.message.trim() : "";
  if (status === 401) return "נדרשת התחברות.";
  if (status === 403) return "אין הרשאות.";
  if (status === 404) return "המדריך לא נמצא.";
  if (status === 409) return apiMessage || "סלאג כבר תפוס.";
  if (status === 413) return "הקובץ גדול מדי (מקסימום 2MB).";
  if (status === 422) return apiMessage || "שגיאת ולידציה.";
  return "אירעה שגיאה. נסה שוב.";
}
function formatDate$1(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("he-IL", {
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch {
    return String(iso);
  }
}
function AdminGuidesView() {
  const [flash, setFlash] = useState(null);
  const flashTimerRef = useRef(null);
  function showFlash(type, text) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash({ type, text });
    flashTimerRef.current = setTimeout(() => setFlash(null), 3500);
  }
  const [posts, setPosts] = useState([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [searchQ, setSearchQ] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedBusy, setSelectedBusy] = useState(false);
  const [fTitle, setFTitle] = useState("");
  const [fSlug, setFSlug] = useState("");
  const [fSlugTouched, setFSlugTouched] = useState(false);
  const [fExcerpt, setFExcerpt] = useState("");
  const [fSections, setFSections] = useState([]);
  const [fSeoTitle, setFSeoTitle] = useState("");
  const [fSeoDesc, setFSeoDesc] = useState("");
  const [fShowAuthor, setFShowAuthor] = useState(false);
  const [fHeroUrl, setFHeroUrl] = useState(null);
  const [fHeroAlt, setFHeroAlt] = useState("");
  const [fStatus, setFStatus] = useState("draft");
  const [fPublishedAt, setFPublishedAt] = useState(null);
  const [fCreatedAt, setFCreatedAt] = useState(null);
  const [fUpdatedAt, setFUpdatedAt] = useState(null);
  const heroFileRef = useRef(null);
  const selectRequestRef = useRef(0);
  async function fetchList() {
    setListLoading(true);
    try {
      const params = { page, limit };
      if (searchQ.trim()) params.q = searchQ.trim();
      const res = await listAdminGuidePosts(params);
      const d = res.data;
      setPosts(d.items || []);
      setPostsTotal(d.total || 0);
    } catch (err) {
      showFlash("error", mapGuideApiError(err));
    } finally {
      setListLoading(false);
    }
  }
  useEffect(() => {
    fetchList();
  }, [page]);
  function populateForm(post) {
    setFTitle(safeString$1(post.title));
    setFSlug(safeString$1(post.slug));
    setFSlugTouched(false);
    setFExcerpt(safeString$1(post.excerpt));
    setFSections(
      (post.sections || []).map((s) => ({
        heading: safeString$1(s.heading),
        body: safeString$1(s.body),
        imageUrl: s.imageUrl || null,
        imageAlt: safeString$1(s.imageAlt)
      }))
    );
    setFSeoTitle(safeString$1(post.seo?.title));
    setFSeoDesc(safeString$1(post.seo?.description));
    setFShowAuthor(Boolean(post.authorName));
    setFHeroUrl(post.heroImageUrl || null);
    setFHeroAlt(safeString$1(post.heroImageAlt));
    setFStatus(post.status || "draft");
    setFPublishedAt(post.publishedAt || null);
    setFCreatedAt(post.createdAt || null);
    setFUpdatedAt(post.updatedAt || null);
  }
  function resetForm() {
    setSelectedId(null);
    setFTitle("");
    setFSlug("");
    setFSlugTouched(false);
    setFExcerpt("");
    setFSections([]);
    setFSeoTitle("");
    setFSeoDesc("");
    setFShowAuthor(false);
    setFHeroUrl(null);
    setFHeroAlt("");
    setFStatus("draft");
    setFPublishedAt(null);
    setFCreatedAt(null);
    setFUpdatedAt(null);
    if (heroFileRef.current) heroFileRef.current.value = "";
  }
  function handleSelectPost(post) {
    const requestId = ++selectRequestRef.current;
    setSelectedId(post.id);
    setSelectedBusy(true);
    getAdminGuidePostById(post.id).then((res) => {
      if (selectRequestRef.current !== requestId) return;
      populateForm(res.data);
    }).catch((err) => {
      if (selectRequestRef.current !== requestId) return;
      showFlash("error", mapGuideApiError(err));
    }).finally(() => {
      if (selectRequestRef.current !== requestId) return;
      setSelectedBusy(false);
    });
  }
  function handleTitleChange(e) {
    const v = e.target.value;
    setFTitle(v);
    if (!fSlugTouched) {
      setFSlug(slugFromTitle(v));
    }
  }
  function handleSectionField(idx, field, value) {
    setFSections((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }
  function addSection() {
    if (fSections.length >= MAX_SECTIONS) {
      showFlash("error", `לא ניתן להוסיף יותר מ-${MAX_SECTIONS} קטעים.`);
      return;
    }
    setFSections((prev) => [...prev, EMPTY_SECTION()]);
  }
  function removeSection(idx) {
    setFSections((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveSection(idx, dir) {
    setFSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  async function handleCreate() {
    if (!fTitle.trim() || !fExcerpt.trim()) {
      showFlash("error", "כותרת ותקציר הם שדות חובה.");
      return;
    }
    setSelectedBusy(true);
    try {
      const slug = normalizeSlug(fSlug);
      const body2 = {
        title: fTitle.trim(),
        excerpt: fExcerpt.trim(),
        sections: fSections,
        seo: { title: fSeoTitle.trim(), description: fSeoDesc.trim() },
        authorName: fShowAuthor ? "ולנטין" : ""
      };
      if (slug) body2.slug = slug;
      const res = await createAdminGuidePost(body2);
      const post = res.data;
      showFlash("success", "המדריך נוצר.");
      setSelectedId(post.id);
      populateForm(post);
      await fetchList();
    } catch (err) {
      showFlash("error", mapGuideApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleUpdate() {
    if (!selectedId) return;
    if (!fTitle.trim() || !fExcerpt.trim()) {
      showFlash("error", "כותרת ותקציר הם שדות חובה.");
      return;
    }
    setSelectedBusy(true);
    try {
      const body2 = {
        title: fTitle.trim(),
        excerpt: fExcerpt.trim(),
        sections: fSections,
        seo: { title: fSeoTitle.trim(), description: fSeoDesc.trim() },
        authorName: fShowAuthor ? "ולנטין" : ""
      };
      if (fSlugTouched) {
        const slug = normalizeSlug(fSlug);
        if (slug) body2.slug = slug;
      }
      const res = await updateAdminGuidePost(selectedId, body2);
      populateForm(res.data);
      showFlash("success", "המדריך עודכן.");
      await fetchList();
    } catch (err) {
      showFlash("error", mapGuideApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handlePublish() {
    if (!selectedId) return;
    setSelectedBusy(true);
    try {
      const res = await publishAdminGuidePost(selectedId);
      populateForm(res.data);
      showFlash("success", "המדריך פורסם.");
      await fetchList();
    } catch (err) {
      showFlash("error", mapGuideApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleUnpublish() {
    if (!selectedId) return;
    setSelectedBusy(true);
    try {
      const res = await unpublishAdminGuidePost(selectedId);
      populateForm(res.data);
      showFlash("success", "המדריך הוסר מפרסום.");
      await fetchList();
    } catch (err) {
      showFlash("error", mapGuideApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm("למחוק את המדריך? פעולה זו בלתי הפיכה.")) return;
    setSelectedBusy(true);
    try {
      await deleteAdminGuidePost(selectedId);
      showFlash("success", "המדריך נמחק.");
      resetForm();
      await fetchList();
    } catch (err) {
      showFlash("error", mapGuideApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleHeroUpload() {
    if (!selectedId) {
      showFlash("error", "יש לשמור את המדריך לפני העלאת תמונה.");
      return;
    }
    const file = heroFileRef.current?.files?.[0];
    if (!file) {
      showFlash("error", "יש לבחור קובץ תמונה.");
      return;
    }
    if (!fHeroAlt.trim()) {
      showFlash("error", "טקסט חלופי (alt) הוא שדה חובה.");
      return;
    }
    setSelectedBusy(true);
    try {
      const res = await uploadAdminGuideHeroImage(
        selectedId,
        file,
        fHeroAlt.trim()
      );
      setFHeroUrl(res.data.heroImageUrl || null);
      showFlash("success", "התמונה הועלתה.");
      if (heroFileRef.current) heroFileRef.current.value = "";
    } catch (err) {
      showFlash("error", mapGuideApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleSectionImageUpload(idx) {
    if (!selectedId) {
      showFlash("error", "יש לשמור את המדריך לפני העלאת תמונה.");
      return;
    }
    const fileInput2 = document.getElementById(`guide-sec-img-input-${idx}`);
    const file = fileInput2?.files?.[0];
    if (!file) {
      showFlash("error", "יש לבחור קובץ תמונה.");
      return;
    }
    const alt = (fSections[idx]?.imageAlt || "").trim();
    if (!alt) {
      showFlash("error", "טקסט חלופי (alt) הוא שדה חובה לתמונת קטע.");
      return;
    }
    setSelectedBusy(true);
    try {
      const res = await uploadAdminGuideSectionImage(
        selectedId,
        idx,
        file,
        alt
      );
      setFSections((prev) => {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          imageUrl: res.data.imageUrl || null,
          imageAlt: res.data.imageAlt || alt
        };
        return next;
      });
      showFlash("success", "תמונת הקטע הועלתה.");
      if (fileInput2) fileInput2.value = "";
    } catch (err) {
      showFlash("error", mapGuideApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleSectionImageRemove(idx) {
    if (!selectedId) return;
    if (!window.confirm("להסיר את תמונת הקטע?")) return;
    setSelectedBusy(true);
    try {
      await removeAdminGuideSectionImage(selectedId, idx);
      setFSections((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], imageUrl: null, imageAlt: "" };
        return next;
      });
      showFlash("success", "תמונת הקטע הוסרה.");
      const fileInput2 = document.getElementById(
        `guide-sec-img-input-${idx}`
      );
      if (fileInput2) fileInput2.value = "";
    } catch (err) {
      showFlash("error", mapGuideApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    fetchList();
  }
  const totalPages = Math.max(1, Math.ceil(postsTotal / limit));
  const isEditing = Boolean(selectedId);
  return /* @__PURE__ */ jsxs("div", { className: styles$2.wrap, children: [
    flash && /* @__PURE__ */ jsx(
      FlashBanner,
      {
        type: flash.type,
        message: flash.text,
        autoHideMs: 3500,
        onDismiss: () => setFlash(null)
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: styles$2.topRow, children: [
      /* @__PURE__ */ jsx("h2", { className: styles$2.h2, children: "ניהול מדריכים" }),
      /* @__PURE__ */ jsx(
        Button,
        {
          onClick: () => {
            resetForm();
          },
          disabled: selectedBusy,
          children: "צור מדריך חדש"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles$2.grid, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$2.panel, children: [
        /* @__PURE__ */ jsx("h3", { className: styles$2.h3, children: "מדריכים" }),
        /* @__PURE__ */ jsxs("form", { className: styles$2.searchRow, onSubmit: handleSearch, children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              placeholder: "חיפוש לפי כותרת / סלאג",
              value: searchQ,
              onChange: (e) => setSearchQ(e.target.value)
            }
          ),
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: listLoading, children: "חפש" })
        ] }),
        listLoading && /* @__PURE__ */ jsx("p", { className: styles$2.muted, children: "טוען…" }),
        !listLoading && posts.length === 0 && /* @__PURE__ */ jsx("p", { className: styles$2.muted, children: "אין מדריכים." }),
        /* @__PURE__ */ jsx("ul", { className: styles$2.postList, children: posts.map((p) => /* @__PURE__ */ jsx(
          "li",
          {
            className: `${styles$2.postItem} ${selectedId === p.id ? styles$2.postItemActive : ""}`,
            children: /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                className: styles$2.postBtn,
                onClick: () => handleSelectPost(p),
                disabled: selectedBusy,
                children: [
                  p.heroImageUrl && /* @__PURE__ */ jsx(
                    "img",
                    {
                      className: styles$2.postThumb,
                      src: p.heroImageUrl,
                      alt: ""
                    }
                  ),
                  /* @__PURE__ */ jsxs("span", { className: styles$2.postInfo, children: [
                    /* @__PURE__ */ jsx("span", { className: styles$2.postTitle, children: p.title }),
                    p.excerpt && /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: styles$2.postExcerpt,
                        children: p.excerpt
                      }
                    ),
                    p.publishedAt && /* @__PURE__ */ jsx("span", { className: styles$2.postDate, children: formatDate$1(p.publishedAt) })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: `${styles$2.badge} ${p.status === "published" ? styles$2.badgePublished : styles$2.badgeDraft}`,
                      children: p.status === "published" ? "פורסם" : "טיוטה"
                    }
                  )
                ]
              }
            )
          },
          p.id
        )) }),
        postsTotal > limit && /* @__PURE__ */ jsxs("div", { className: styles$2.pager, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: () => setPage((p) => Math.max(1, p - 1)),
              disabled: page <= 1 || listLoading,
              children: "הקודם"
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: styles$2.pagerMeta, children: [
            page,
            " / ",
            totalPages
          ] }),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: () => setPage((p) => Math.min(totalPages, p + 1)),
              disabled: page >= totalPages || listLoading,
              children: "הבא"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$2.panel, children: [
        /* @__PURE__ */ jsx("h3", { className: styles$2.h3, children: isEditing ? "עריכת מדריך" : "מדריך חדש" }),
        selectedBusy && selectedId && /* @__PURE__ */ jsx("p", { className: styles$2.muted, children: "טוען מדריך…" }),
        /* @__PURE__ */ jsxs("div", { className: styles$2.form, children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              label: "כותרת",
              required: true,
              value: fTitle,
              onChange: handleTitleChange,
              placeholder: "כותרת המדריך",
              disabled: selectedBusy
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              label: "סלאג",
              value: fSlug,
              onChange: (e) => {
                setFSlugTouched(true);
                setFSlug(normalizeSlug(e.target.value));
              },
              placeholder: "ייווצר אוטומטית מהכותרת",
              meta: isEditing ? "שינוי סלאג ישבור קישורים קיימים" : "ייווצר בצד השרת",
              disabled: selectedBusy
            }
          ),
          /[\u0590-\u05FF]/.test(fTitle) && !normalizeSlug(fTitle) && /* @__PURE__ */ jsx("p", { className: styles$2.slugHint, children: "שימו לב: כשכותרת בעברית - הסלאג לא נוצר אוטומטית. אפשר להשאיר ריק (ייווצר אוטומטית כמו guide-xxxxxxxx), או להזין סלאג באנגלית (a-z, 0-9, מקפים) לטובת SEO." }),
          /* @__PURE__ */ jsxs("label", { className: styles$2.fieldLabel, children: [
            "תקציר *",
            /* @__PURE__ */ jsx(
              "textarea",
              {
                className: styles$2.textarea,
                rows: 3,
                value: fExcerpt,
                onChange: (e) => setFExcerpt(e.target.value),
                placeholder: "תקציר קצר (עד 500 תווים)",
                required: true,
                disabled: selectedBusy
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$2.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$2.h4, children: "תמונה ראשית" }),
          fHeroUrl && /* @__PURE__ */ jsx("div", { className: styles$2.heroPreview, children: /* @__PURE__ */ jsx(
            "img",
            {
              className: styles$2.heroImg,
              src: fHeroUrl,
              alt: fHeroAlt || "hero"
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: styles$2.heroFields, children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "file",
                accept: "image/jpeg,image/png,image/webp",
                ref: heroFileRef,
                className: styles$2.fileInput,
                disabled: selectedBusy
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                label: "טקסט חלופי (alt)",
                required: true,
                value: fHeroAlt,
                onChange: (e) => setFHeroAlt(e.target.value),
                placeholder: "תיאור התמונה",
                disabled: selectedBusy
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: handleHeroUpload,
                disabled: selectedBusy || !selectedId,
                variant: "secondary",
                children: "העלה תמונה"
              }
            ),
            !selectedId && /* @__PURE__ */ jsx("p", { className: styles$2.uploadHint, children: "כדי להעלות תמונה צריך קודם לשמור את המדריך." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$2.sectionBlock, children: [
          /* @__PURE__ */ jsxs("h4", { className: styles$2.h4, children: [
            "קטעי תוכן (",
            fSections.length,
            "/",
            MAX_SECTIONS,
            ")"
          ] }),
          fSections.map((sec, idx) => /* @__PURE__ */ jsxs("div", { className: styles$2.sectionCard, children: [
            /* @__PURE__ */ jsxs("div", { className: styles$2.sectionCardHeader, children: [
              /* @__PURE__ */ jsxs("span", { className: styles$2.sectionIdx, children: [
                "#",
                idx + 1
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$2.sectionActions, children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: styles$2.iconBtn,
                    onClick: () => moveSection(idx, -1),
                    disabled: idx === 0 || selectedBusy,
                    "aria-label": "הזז למעלה",
                    children: "▲"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: styles$2.iconBtn,
                    onClick: () => moveSection(idx, 1),
                    disabled: idx === fSections.length - 1 || selectedBusy,
                    "aria-label": "הזז למטה",
                    children: "▼"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: `${styles$2.iconBtn} ${styles$2.iconBtnDanger}`,
                    onClick: () => removeSection(idx),
                    disabled: selectedBusy,
                    "aria-label": "מחק קטע",
                    children: "✕"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              Input,
              {
                label: "כותרת קטע",
                value: sec.heading,
                onChange: (e) => handleSectionField(
                  idx,
                  "heading",
                  e.target.value
                ),
                disabled: selectedBusy
              }
            ),
            /* @__PURE__ */ jsxs("label", { className: styles$2.fieldLabel, children: [
              "תוכן",
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  className: styles$2.textarea,
                  rows: 5,
                  value: sec.body,
                  onChange: (e) => handleSectionField(
                    idx,
                    "body",
                    e.target.value
                  ),
                  disabled: selectedBusy
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$2.secImgBlock, children: [
              sec.imageUrl && /* @__PURE__ */ jsx("div", { className: styles$2.secImgPreview, children: /* @__PURE__ */ jsx(
                "img",
                {
                  className: styles$2.secImgThumb,
                  src: sec.imageUrl,
                  alt: sec.imageAlt || "section"
                }
              ) }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "file",
                  accept: "image/jpeg,image/png,image/webp",
                  id: `guide-sec-img-input-${idx}`,
                  className: styles$2.fileInput,
                  disabled: selectedBusy
                }
              ),
              /* @__PURE__ */ jsx(
                Input,
                {
                  label: "טקסט חלופי לתמונה (alt)",
                  value: sec.imageAlt,
                  onChange: (e) => handleSectionField(
                    idx,
                    "imageAlt",
                    e.target.value
                  ),
                  disabled: selectedBusy
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: styles$2.secImgActions, children: [
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    onClick: () => handleSectionImageUpload(idx),
                    disabled: selectedBusy || !selectedId,
                    variant: "secondary",
                    children: "העלה תמונת קטע"
                  }
                ),
                !selectedId && /* @__PURE__ */ jsx("p", { className: styles$2.uploadHint, children: "כדי להעלות תמונה צריך קודם לשמור את המדריך." }),
                sec.imageUrl && /* @__PURE__ */ jsx(
                  Button,
                  {
                    onClick: () => handleSectionImageRemove(
                      idx
                    ),
                    disabled: selectedBusy,
                    variant: "danger",
                    children: "הסר תמונה"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs("details", { className: styles$2.linkHint, children: [
              /* @__PURE__ */ jsx("summary", { className: styles$2.linkHintSummary, children: "איך מוסיפים קישורים בתוך הטקסט?" }),
              /* @__PURE__ */ jsxs("div", { className: styles$2.linkHintBody, children: [
                /* @__PURE__ */ jsx("p", { children: "טקסט לחיץ עם קישור:" }),
                /* @__PURE__ */ jsx("code", { className: styles$2.linkHintCode, children: "[טקסט להצגה](כתובת)" }),
                /* @__PURE__ */ jsx("p", { children: "אפשר גם להדביק כתובת URL מלאה - היא תזוהה אוטומטית." }),
                /* @__PURE__ */ jsx("p", { children: "לקישור פנימי במדריכים, עדיף להשתמש בנתיב יחסי:" }),
                /* @__PURE__ */ jsx("p", { className: styles$2.linkHintExamples, children: "דוגמאות:" }),
                /* @__PURE__ */ jsx("code", { className: styles$2.linkHintCode, children: "[קראו עוד](/guides/getting-started)" }),
                /* @__PURE__ */ jsx("code", { className: styles$2.linkHintCode, children: "[לאתר הרשמי](https://example.com)" }),
                /* @__PURE__ */ jsx("code", { className: styles$2.linkHintCode, children: "https://cardigo.co.il/guides/digital-card-guide" })
              ] })
            ] })
          ] }, idx)),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: addSection,
              disabled: selectedBusy || fSections.length >= MAX_SECTIONS,
              children: "הוסף קטע"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$2.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$2.h4, children: "SEO" }),
          /* @__PURE__ */ jsxs("div", { className: styles$2.form, children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                label: "SEO כותרת",
                value: fSeoTitle,
                onChange: (e) => setFSeoTitle(e.target.value),
                placeholder: "ברירת מחדל: כותרת המדריך",
                disabled: selectedBusy
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                label: "SEO תיאור",
                value: fSeoDesc,
                onChange: (e) => setFSeoDesc(e.target.value),
                placeholder: "ברירת מחדל: התקציר",
                disabled: selectedBusy
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$2.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$2.h4, children: "מחבר" }),
          /* @__PURE__ */ jsxs("label", { className: styles$2.toggleRow, children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: fShowAuthor,
                onChange: (e) => setFShowAuthor(e.target.checked),
                disabled: selectedBusy
              }
            ),
            'הצג מחבר של הכרטיס במדריך (יציג "ולנטין" בתחתית המדריך)'
          ] })
        ] }),
        isEditing && /* @__PURE__ */ jsxs("div", { className: styles$2.timestampsRow, children: [
          /* @__PURE__ */ jsxs("span", { className: styles$2.tsItem, children: [
            "נוצר: ",
            formatDate$1(fCreatedAt)
          ] }),
          /* @__PURE__ */ jsxs("span", { className: styles$2.tsItem, children: [
            "עודכן: ",
            formatDate$1(fUpdatedAt)
          ] }),
          fPublishedAt && /* @__PURE__ */ jsxs("span", { className: styles$2.tsItem, children: [
            "פורסם: ",
            formatDate$1(fPublishedAt)
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: styles$2.actionRow, children: isEditing ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              onClick: handleUpdate,
              disabled: selectedBusy,
              children: "שמור שינויים"
            }
          ),
          fStatus === "draft" ? /* @__PURE__ */ jsx(
            Button,
            {
              onClick: handlePublish,
              disabled: selectedBusy,
              variant: "secondary",
              children: "פרסם"
            }
          ) : /* @__PURE__ */ jsx(
            Button,
            {
              onClick: handleUnpublish,
              disabled: selectedBusy,
              variant: "secondary",
              children: "בטל פרסום"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              onClick: handleDelete,
              disabled: selectedBusy,
              variant: "danger",
              children: "מחק"
            }
          )
        ] }) : /* @__PURE__ */ jsx(
          Button,
          {
            onClick: handleCreate,
            disabled: selectedBusy,
            children: "צור מדריך"
          }
        ) })
      ] })
    ] })
  ] });
}
const wrap = "_wrap_queya_1";
const grid = "_grid_queya_9";
const panel = "_panel_queya_21";
const h2$1 = "_h2_queya_33";
const h3 = "_h3_queya_43";
const searchRow$1 = "_searchRow_queya_53";
const tableWrap = "_tableWrap_queya_67";
const table$1 = "_table_queya_67";
const row = "_row_queya_105";
const cellMono = "_cellMono_queya_113";
const cell = "_cell_queya_113";
const cellActions = "_cellActions_queya_135";
const pager$1 = "_pager_queya_149";
const pagerMeta$1 = "_pagerMeta_queya_167";
const pagerControls$1 = "_pagerControls_queya_179";
const pagerPage$1 = "_pagerPage_queya_191";
const pagerLimit = "_pagerLimit_queya_201";
const limitLabel = "_limitLabel_queya_213";
const form = "_form_queya_225";
const label = "_label_queya_237";
const detailsGrid = "_detailsGrid_queya_249";
const detailItem = "_detailItem_queya_277";
const detailLabel = "_detailLabel_queya_293";
const detailValue = "_detailValue_queya_307";
const detailValueMono = "_detailValueMono_queya_315";
const noteBlock = "_noteBlock_queya_331";
const memberForm = "_memberForm_queya_345";
const memberFormRow = "_memberFormRow_queya_359";
const memberCol = "_memberCol_queya_397";
const memberColActions = "_memberColActions_queya_409";
const select$1 = "_select_queya_421";
const selectInline = "_selectInline_queya_441";
const empty = "_empty_queya_461";
const entitlementSection = "_entitlementSection_queya_479";
const entitlementHelperText = "_entitlementHelperText_queya_491";
const entitlementActions = "_entitlementActions_queya_503";
const entitlementFormPanel = "_entitlementFormPanel_queya_531";
const entitlementCheckboxRow = "_entitlementCheckboxRow_queya_551";
const entitlementStatusBadge = "_entitlementStatusBadge_queya_585";
const entitlementStatus_none = "_entitlementStatus_none_queya_601";
const entitlementStatus_active = "_entitlementStatus_active_queya_611";
const entitlementStatus_expired = "_entitlementStatus_expired_queya_621";
const entitlementStatus_revoked = "_entitlementStatus_revoked_queya_631";
const styles$1 = {
  wrap,
  grid,
  panel,
  h2: h2$1,
  h3,
  searchRow: searchRow$1,
  tableWrap,
  table: table$1,
  row,
  cellMono,
  cell,
  cellActions,
  pager: pager$1,
  pagerMeta: pagerMeta$1,
  pagerControls: pagerControls$1,
  pagerPage: pagerPage$1,
  pagerLimit,
  limitLabel,
  form,
  label,
  detailsGrid,
  detailItem,
  detailLabel,
  detailValue,
  detailValueMono,
  noteBlock,
  memberForm,
  memberFormRow,
  memberCol,
  memberColActions,
  select: select$1,
  selectInline,
  empty,
  entitlementSection,
  entitlementHelperText,
  entitlementActions,
  entitlementFormPanel,
  entitlementCheckboxRow,
  entitlementStatusBadge,
  entitlementStatus_none,
  entitlementStatus_active,
  entitlementStatus_expired,
  entitlementStatus_revoked
};
function safeString(value) {
  if (value === null || value === void 0) return "";
  return String(value);
}
function clampInt(value, { min, max, fallback }) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
function formatAdminDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}
function memberStatusHe(status) {
  if (status === "active") return "פעיל";
  if (status === "suspended") return "מושהה";
  return String(status || "");
}
function roleHe$1(role) {
  if (role === "member") return "חבר";
  if (role === "admin") return "מנהל";
  return String(role || "");
}
function mapAdminApiError(err) {
  const status = err?.response?.status;
  const code = err?.response?.data?.code;
  const apiMessage = typeof err?.response?.data?.message === "string" ? err.response.data.message.trim() : "";
  if (status === 409 && code === "ORG_SLUG_TAKEN") return "הסלאג כבר תפוס.";
  if (status === 409 && code === "MEMBER_EXISTS")
    return "החבר כבר קיים בארגון.";
  if (status === 409 && code === "INVITE_ALREADY_PENDING")
    return "כבר קיימת הזמנה ממתינה לאימייל הזה.";
  if (status === 409 && code === "SEAT_LIMIT_REACHED")
    return apiMessage || "הגעת למגבלת המושבים.";
  if (status === 404 && code === "USER_NOT_FOUND") return "המשתמש לא נמצא.";
  if (status === 400 && code === "INVALID_SLUG") return "סלאג לא תקין.";
  if (status === 400 && code === "RESERVED_SLUG")
    return "הסלאג שמור ואסור לשימוש.";
  if (status === 400 && code === "SLUG_IMMUTABLE")
    return "אי אפשר לשנות סלאג לאחר יצירה.";
  if (status === 400 && code === "INVALID_NAME") return "שם לא תקין.";
  if (status === 400 && code === "INVALID_EMAIL") return "אימייל לא תקין.";
  if (status === 400 && code === "INVALID_USER_ID")
    return "מזהה משתמש לא תקין.";
  if (status === 400 && code === "INVALID_ROLE") return "תפקיד לא תקין.";
  if (status === 400 && code === "INVALID_STATUS") return "סטטוס לא תקין.";
  if (status === 400 && (code === "EMPTY_PATCH" || code === "INVALID_PATCH"))
    return "אין מה לעדכן.";
  if (status === 409 && code === "ENTITLEMENT_ALREADY_ACTIVE")
    return "הרשאת הארגון כבר פעילה. השתמש בהארכת גישה.";
  if (status === 409 && code === "NOT_ACTIVE")
    return "אין הרשאה פעילה להארכה. יש להעניק גישה חדשה.";
  if (status === 409 && code === "NO_ENTITLEMENT")
    return "אין הרשאה פעילה לביטול.";
  if (status === 409 && code === "INACTIVE_ORG") return "הארגון אינו פעיל.";
  if (status === 400 && code === "CONFIRM_REQUIRED")
    return "נדרש אישור הענקת גישה שנתית.";
  if (status === 400 && code === "INVALID_REASON")
    return "הסיבה חייבת להכיל 5–500 תווים.";
  if (status === 400 && code === "INVALID_EXPIRES_AT")
    return "תאריך תפוגה לא תקין.";
  if (status === 400 && code === "INVALID_DATE_RANGE")
    return "טווח תאריכים לא תקין.";
  if (status === 400 && code === "INVALID_PAYMENT_REFERENCE")
    return "אסמכתא תשלום לא תקינה (עד 120 תווים).";
  if (status === 400 && code === "INVALID_ADMIN_NOTE")
    return "הערת מנהל לא תקינה (עד 500 תווים).";
  if (status === 401) return "נדרשת התחברות.";
  if (status === 403) return "אין הרשאות.";
  return "אירעה שגיאה. נסה שוב.";
}
const ENTITLEMENT_STATUS_CLASS = {
  none: styles$1.entitlementStatus_none,
  active: styles$1.entitlementStatus_active,
  expired: styles$1.entitlementStatus_expired,
  revoked: styles$1.entitlementStatus_revoked
};
function OrgRow({ org, onSelect, onToggleActive, busy }) {
  const isActive = Boolean(org?.isActive);
  return /* @__PURE__ */ jsxs("tr", { className: styles$1.row, children: [
    /* @__PURE__ */ jsx("td", { className: styles$1.cellMono, children: org?.slug }),
    /* @__PURE__ */ jsx("td", { className: styles$1.cell, children: org?.name }),
    /* @__PURE__ */ jsx("td", { className: styles$1.cell, children: isActive ? "כן" : "לא" }),
    /* @__PURE__ */ jsxs("td", { className: styles$1.cellActions, children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          onClick: () => onSelect(org),
          disabled: busy,
          variant: "secondary",
          children: "פרטים"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          onClick: () => onToggleActive(org),
          disabled: busy,
          variant: isActive ? "danger" : "primary",
          children: isActive ? "כבה" : "הפעל"
        }
      )
    ] })
  ] });
}
function AdminOrganizationsView() {
  const [flash, setFlash] = useState(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [orgs, setOrgs] = useState([]);
  const [orgsTotal, setOrgsTotal] = useState(0);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createNote, setCreateNote] = useState("");
  const [createSeatLimit, setCreateSeatLimit] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedSeatLimit, setSelectedSeatLimit] = useState("");
  const [selectedBusy, setSelectedBusy] = useState(false);
  const [entitlementBusy, setEntitlementBusy] = useState(false);
  const [entitlementOp, setEntitlementOp] = useState(null);
  const [grantExpiresAt, setGrantExpiresAt] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [grantPaymentRef, setGrantPaymentRef] = useState("");
  const [grantAdminNote, setGrantAdminNote] = useState("");
  const [grantConfirm, setGrantConfirm] = useState(false);
  const [extendNewExpiresAt, setExtendNewExpiresAt] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [extendPaymentRef, setExtendPaymentRef] = useState("");
  const [extendAdminNote, setExtendAdminNote] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersPage, setMembersPage] = useState(1);
  const [membersLimit, setMembersLimit] = useState(25);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [memberBusyId, setMemberBusyId] = useState(null);
  const [orgInvites, setOrgInvites] = useState([]);
  const [orgInvitesLoading, setOrgInvitesLoading] = useState(false);
  const [revokeBusyId, setRevokeBusyId] = useState(null);
  const flashTimerRef = useRef(null);
  function showFlash(type, text) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash({ type, text });
    flashTimerRef.current = setTimeout(() => setFlash(null), 3500);
  }
  const safeLimit = useMemo(() => {
    return clampInt(limit, { min: 1, max: 100, fallback: 25 });
  }, [limit]);
  async function loadOrgs() {
    setOrgsLoading(true);
    try {
      const res = await listAdminOrganizations({
        q: q.trim() || void 0,
        page,
        limit: safeLimit
      });
      const data = res?.data || {};
      setOrgs(Array.isArray(data.items) ? data.items : []);
      setOrgsTotal(Number(data.total) || 0);
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setOrgsLoading(false);
    }
  }
  async function loadSelectedOrgAndMembers(nextOrgId) {
    const orgId = String(nextOrgId || "");
    if (!orgId) return;
    setSelectedBusy(true);
    setMembersLoading(true);
    try {
      const [orgRes, membersRes] = await Promise.all([
        getAdminOrganizationById(orgId),
        listAdminOrgMembers(orgId, {
          page: membersPage,
          limit: membersLimit
        })
      ]);
      setSelectedOrgId(orgId);
      setSelectedOrg(orgRes?.data || null);
      const m = membersRes?.data || {};
      setMembers(Array.isArray(m.items) ? m.items : []);
      setMembersTotal(Number(m.total) || 0);
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setSelectedBusy(false);
      setMembersLoading(false);
    }
  }
  useEffect(() => {
    loadOrgs();
  }, [page, safeLimit]);
  useEffect(() => {
    if (!selectedOrgId) return;
    loadSelectedOrgAndMembers(selectedOrgId);
  }, [selectedOrgId, membersPage, membersLimit]);
  async function loadInvites(orgId) {
    const id = String(orgId || "");
    if (!id) {
      setOrgInvites([]);
      return;
    }
    setOrgInvitesLoading(true);
    try {
      const res = await listAdminOrgInvites(id);
      const items = res?.data?.items;
      setOrgInvites(Array.isArray(items) ? items : []);
    } catch {
      setOrgInvites([]);
    } finally {
      setOrgInvitesLoading(false);
    }
  }
  useEffect(() => {
    setInviteEmail("");
    setInviteRole("member");
    setInviteLink("");
    setEntitlementOp(null);
    setGrantExpiresAt("");
    setGrantReason("");
    setGrantPaymentRef("");
    setGrantAdminNote("");
    setGrantConfirm(false);
    setExtendNewExpiresAt("");
    setExtendReason("");
    setExtendPaymentRef("");
    setExtendAdminNote("");
    setRevokeReason("");
    setRevokeConfirm(false);
    loadInvites(selectedOrgId);
  }, [selectedOrgId]);
  useEffect(() => {
    if (!selectedOrg) {
      setSelectedSeatLimit("");
      return;
    }
    const v = selectedOrg?.seatLimit;
    if (v === null || v === void 0) {
      setSelectedSeatLimit("");
      return;
    }
    setSelectedSeatLimit(String(v));
  }, [selectedOrg]);
  function parseSeatLimitInput(raw) {
    const s = String(raw ?? "").trim();
    if (!s) return { ok: true, value: null };
    const n = Number.parseInt(s, 10);
    if (!Number.isFinite(n) || n <= 0) return { ok: false, value: null };
    return { ok: true, value: n };
  }
  const seatLimitRaw = selectedOrg?.seatLimit;
  const hasSeatLimit = seatLimitRaw !== null && seatLimitRaw !== void 0 && Number.isFinite(Number(seatLimitRaw));
  const seatLimit = hasSeatLimit ? Number(seatLimitRaw) : null;
  const usedSeats = Number(selectedOrg?.usedSeats ?? 0);
  const remainingSeats = hasSeatLimit ? Math.max(0, seatLimit - usedSeats) : null;
  async function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    await loadOrgs();
  }
  async function handleCreateOrg(e) {
    e.preventDefault();
    setCreateBusy(true);
    try {
      const seatLimitParsed = parseSeatLimitInput(createSeatLimit);
      if (!seatLimitParsed.ok) {
        showFlash(
          "error",
          "מגבלת מושבים חייבת להיות מספר חיובי או ריקה"
        );
        return;
      }
      const res = await createAdminOrganization({
        name: createName,
        slug: createSlug,
        note: createNote,
        seatLimit: seatLimitParsed.value
      });
      const created = res?.data || null;
      showFlash("success", "הארגון נוצר.");
      setCreateName("");
      setCreateSlug("");
      setCreateNote("");
      setCreateSeatLimit("");
      setPage(1);
      await loadOrgs();
      if (created?.id) {
        setSelectedOrgId(String(created.id));
      }
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setCreateBusy(false);
    }
  }
  async function handleToggleActive(org) {
    const id = org?.id;
    if (!id) return;
    setSelectedBusy(true);
    try {
      await patchAdminOrganization(id, { isActive: !org.isActive });
      await loadOrgs();
      if (selectedOrgId === String(id)) {
        await loadSelectedOrgAndMembers(id);
      }
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleSelectOrg(org) {
    const id = org?.id;
    if (!id) return;
    setMembersPage(1);
    setMembersLimit(25);
    await loadSelectedOrgAndMembers(id);
  }
  async function handleUpdateOrgNote() {
    if (!selectedOrgId) return;
    setSelectedBusy(true);
    try {
      const res = await patchAdminOrganization(selectedOrgId, {
        note: safeString(selectedOrg?.note)
      });
      setSelectedOrg(res?.data || null);
      showFlash("success", "עודכן.");
      await loadOrgs();
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleUpdateOrgSeatLimit() {
    if (!selectedOrgId) return;
    const parsed = parseSeatLimitInput(selectedSeatLimit);
    if (!parsed.ok) {
      showFlash("error", "מגבלת מושבים חייבת להיות מספר חיובי או ריקה");
      return;
    }
    setSelectedBusy(true);
    try {
      const res = await patchAdminOrganization(selectedOrgId, {
        seatLimit: parsed.value
      });
      setSelectedOrg(res?.data || null);
      showFlash("success", "עודכן.");
      await loadOrgs();
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setSelectedBusy(false);
    }
  }
  async function handleMemberRoleChange(member, nextRole) {
    if (!selectedOrgId || !member?.id) return;
    setMemberBusyId(member.id);
    try {
      await patchAdminOrgMember(selectedOrgId, member.id, {
        role: nextRole
      });
      await loadSelectedOrgAndMembers(selectedOrgId);
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setMemberBusyId(null);
    }
  }
  async function handleMemberStatusToggle(member) {
    if (!selectedOrgId || !member?.id) return;
    setMemberBusyId(member.id);
    try {
      const next = member.status === "inactive" ? "active" : "inactive";
      await patchAdminOrgMember(selectedOrgId, member.id, {
        status: next
      });
      await loadSelectedOrgAndMembers(selectedOrgId);
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setMemberBusyId(null);
    }
  }
  async function handleMemberDelete(member) {
    if (!selectedOrgId || !member?.id) return;
    const confirmed = window.confirm(
      "להסיר את החבר מהארגון? פעולה זו בלתי הפיכה."
    );
    if (!confirmed) return;
    setMemberBusyId(member.id);
    try {
      await deleteAdminOrgMember(selectedOrgId, member.id);
      showFlash("success", "החבר הוסר.");
      await loadSelectedOrgAndMembers(selectedOrgId);
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setMemberBusyId(null);
    }
  }
  async function handleCreateInvite(e) {
    e.preventDefault();
    if (!selectedOrgId) return;
    setInviteBusy(true);
    setInviteLink("");
    try {
      const res = await createAdminOrgInvite(selectedOrgId, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      const link = String(res?.data?.inviteLink || "").trim();
      if (link) {
        setInviteLink(link);
        showFlash("success", "ההזמנה נוצרה.");
        loadInvites(selectedOrgId);
      } else {
        showFlash("error", "אירעה שגיאה. נסה שוב.");
      }
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setInviteBusy(false);
    }
  }
  function inviteStatus(inv) {
    if (inv.revokedAt) return "בוטלה";
    if (inv.usedAt) return "נוצלה";
    if (inv.expiresAt && new Date(inv.expiresAt) < /* @__PURE__ */ new Date())
      return "פג תוקף";
    return "ממתינה";
  }
  async function handleRevokeInvite(inv) {
    if (!selectedOrgId || !inv?.id) return;
    const confirmed = window.confirm("לבטל את ההזמנה? לא ניתן לשחזר.");
    if (!confirmed) return;
    setRevokeBusyId(inv.id);
    try {
      await revokeAdminOrgInvite(selectedOrgId, inv.id);
      showFlash("success", "ההזמנה בוטלה.");
      await loadInvites(selectedOrgId);
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setRevokeBusyId(null);
    }
  }
  async function handleCopyInviteLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      showFlash("success", "הקישור הועתק.");
    } catch {
      showFlash("error", "לא ניתן להעתיק. העתק ידנית.");
    }
  }
  const ent = selectedOrg?.entitlement ?? null;
  const entNow = /* @__PURE__ */ new Date();
  const entExpiresDate = ent?.expiresAt ? new Date(ent.expiresAt) : null;
  const entIsEffectivelyActive = ent?.status === "active" && entExpiresDate !== null && Number.isFinite(entExpiresDate.getTime()) && entExpiresDate > entNow;
  const entComputedStatus = !ent || ent.status === "none" || ent.status === void 0 ? "none" : ent.status === "revoked" ? "revoked" : ent.status === "active" && !entIsEffectivelyActive ? "expired" : "active";
  const entStatusLabel = {
    none: "אין הרשאה",
    active: "פעיל",
    expired: "פג תוקף",
    revoked: "בוטל"
  }[entComputedStatus] ?? "—";
  const showGrant = !entIsEffectivelyActive;
  const showExtend = entIsEffectivelyActive;
  const showRevoke = entIsEffectivelyActive;
  async function handleGrantEntitlement(e) {
    e.preventDefault();
    const expiresDate = grantExpiresAt ? new Date(grantExpiresAt) : null;
    if (!expiresDate || !Number.isFinite(expiresDate.getTime()) || expiresDate <= /* @__PURE__ */ new Date()) {
      showFlash("error", "תאריך תפוגה חייב להיות בעתיד.");
      return;
    }
    const reason = grantReason.trim();
    if (reason.length < 5 || reason.length > 500) {
      showFlash("error", "הסיבה חייבת להכיל 5–500 תווים.");
      return;
    }
    if (grantPaymentRef.trim().length > 120) {
      showFlash("error", "אסמכתא תשלום לא תקינה (עד 120 תווים).");
      return;
    }
    if (grantAdminNote.trim().length > 500) {
      showFlash("error", "הערת מנהל לא תקינה (עד 500 תווים).");
      return;
    }
    if (!grantConfirm) {
      showFlash("error", "נדרש אישור הענקת גישה שנתית.");
      return;
    }
    setEntitlementBusy(true);
    try {
      const body2 = {
        expiresAt: expiresDate.toISOString(),
        reason,
        confirmOrgAnnualGrant: true
      };
      if (grantPaymentRef.trim())
        body2.paymentReference = grantPaymentRef.trim();
      if (grantAdminNote.trim()) body2.adminNote = grantAdminNote.trim();
      const res = await adminGrantOrgEntitlement(selectedOrgId, body2);
      const msg = res?.data?.auditWriteFailed ? "גישה שנתית הוענקה. שים לב: רישום הביקורת נכשל — יש לבדוק לוגים." : "גישה שנתית הוענקה.";
      showFlash(res?.data?.auditWriteFailed ? "info" : "success", msg);
      setEntitlementOp(null);
      setGrantExpiresAt("");
      setGrantReason("");
      setGrantPaymentRef("");
      setGrantAdminNote("");
      setGrantConfirm(false);
      await loadSelectedOrgAndMembers(selectedOrgId);
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setEntitlementBusy(false);
    }
  }
  async function handleExtendEntitlement(e) {
    e.preventDefault();
    const currentExpires = selectedOrg?.entitlement?.expiresAt ? new Date(selectedOrg.entitlement.expiresAt) : null;
    if (!currentExpires || !Number.isFinite(currentExpires.getTime())) {
      showFlash("error", "תאריך תפוגה נוכחי לא תקין.");
      return;
    }
    const newExpires = extendNewExpiresAt ? new Date(extendNewExpiresAt) : null;
    if (!newExpires || !Number.isFinite(newExpires.getTime()) || newExpires <= currentExpires) {
      showFlash(
        "error",
        "תאריך תפוגה חדש חייב להיות אחרי תאריך התפוגה הנוכחי."
      );
      return;
    }
    const reason = extendReason.trim();
    if (reason.length < 5 || reason.length > 500) {
      showFlash("error", "הסיבה חייבת להכיל 5–500 תווים.");
      return;
    }
    if (extendPaymentRef.trim().length > 120) {
      showFlash("error", "אסמכתא תשלום לא תקינה (עד 120 תווים).");
      return;
    }
    if (extendAdminNote.trim().length > 500) {
      showFlash("error", "הערת מנהל לא תקינה (עד 500 תווים).");
      return;
    }
    setEntitlementBusy(true);
    try {
      const body2 = {
        newExpiresAt: newExpires.toISOString(),
        reason
      };
      if (extendPaymentRef.trim())
        body2.paymentReference = extendPaymentRef.trim();
      if (extendAdminNote.trim()) body2.adminNote = extendAdminNote.trim();
      const res = await adminExtendOrgEntitlement(selectedOrgId, body2);
      const msg = res?.data?.auditWriteFailed ? "גישה שנתית הוארכה. שים לב: רישום הביקורת נכשל — יש לבדוק לוגים." : "גישה שנתית הוארכה.";
      showFlash(res?.data?.auditWriteFailed ? "info" : "success", msg);
      setEntitlementOp(null);
      setExtendNewExpiresAt("");
      setExtendReason("");
      setExtendPaymentRef("");
      setExtendAdminNote("");
      await loadSelectedOrgAndMembers(selectedOrgId);
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setEntitlementBusy(false);
    }
  }
  async function handleRevokeEntitlement(e) {
    e.preventDefault();
    const reason = revokeReason.trim();
    if (reason.length < 5 || reason.length > 500) {
      showFlash("error", "הסיבה חייבת להכיל 5–500 תווים.");
      return;
    }
    if (!revokeConfirm) {
      showFlash("error", "נדרש אישור ביטול גישה שנתית.");
      return;
    }
    setEntitlementBusy(true);
    try {
      const res = await adminRevokeOrgEntitlement(selectedOrgId, {
        reason
      });
      const msg = res?.data?.auditWriteFailed ? "גישה שנתית בוטלה. שים לב: רישום הביקורת נכשל — יש לבדוק לוגים." : "גישה שנתית בוטלה.";
      showFlash(res?.data?.auditWriteFailed ? "info" : "success", msg);
      setEntitlementOp(null);
      setRevokeReason("");
      setRevokeConfirm(false);
      await loadSelectedOrgAndMembers(selectedOrgId);
    } catch (err) {
      showFlash("error", mapAdminApiError(err));
    } finally {
      setEntitlementBusy(false);
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: styles$1.wrap, dir: "rtl", children: [
    flash ? /* @__PURE__ */ jsx(
      FlashBanner,
      {
        type: flash.type,
        message: flash.text,
        onClose: () => setFlash(null)
      }
    ) : null,
    /* @__PURE__ */ jsxs("div", { className: styles$1.grid, children: [
      /* @__PURE__ */ jsxs("section", { className: styles$1.panel, children: [
        /* @__PURE__ */ jsx("h2", { className: styles$1.h2, children: "ארגונים" }),
        /* @__PURE__ */ jsxs(
          "form",
          {
            className: styles$1.searchRow,
            onSubmit: handleSearchSubmit,
            children: [
              /* @__PURE__ */ jsx(
                Input,
                {
                  value: q,
                  onChange: (e) => setQ(e.target.value),
                  placeholder: "חפש לפי שם או סלאג"
                }
              ),
              /* @__PURE__ */ jsx(Button, { type: "submit", disabled: orgsLoading, children: "חפש" })
            ]
          }
        ),
        /* @__PURE__ */ jsx("div", { className: styles$1.tableWrap, children: /* @__PURE__ */ jsxs("table", { className: styles$1.table, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("th", { children: "סלאג" }),
            /* @__PURE__ */ jsx("th", { children: "שם" }),
            /* @__PURE__ */ jsx("th", { children: "פעיל" }),
            /* @__PURE__ */ jsx("th", {})
          ] }) }),
          /* @__PURE__ */ jsxs("tbody", { children: [
            orgs.map((org) => /* @__PURE__ */ jsx(
              OrgRow,
              {
                org,
                onSelect: handleSelectOrg,
                onToggleActive: handleToggleActive,
                busy: orgsLoading || selectedBusy
              },
              org.id
            )),
            !orgs.length && !orgsLoading ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
              "td",
              {
                colSpan: 4,
                className: styles$1.empty,
                children: "אין ארגונים"
              }
            ) }) : null
          ] })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: styles$1.pager, children: [
          /* @__PURE__ */ jsxs("div", { className: styles$1.pagerMeta, children: [
            'סה"כ: ',
            orgsTotal
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$1.pagerControls, children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "secondary",
                onClick: () => setPage((p) => Math.max(1, p - 1)),
                disabled: orgsLoading || page <= 1,
                children: "הקודם"
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: styles$1.pagerPage, children: [
              "עמוד ",
              page
            ] }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "secondary",
                onClick: () => setPage((p) => p + 1),
                disabled: orgsLoading || orgs.length < safeLimit,
                children: "הבא"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$1.pagerLimit, children: [
            /* @__PURE__ */ jsx("label", { className: styles$1.limitLabel, children: "כמות להצגה" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: String(limit),
                onChange: (e) => setLimit(e.target.value),
                inputMode: "numeric"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsx("h3", { className: styles$1.h3, children: "צור ארגון" }),
        /* @__PURE__ */ jsxs("form", { className: styles$1.form, onSubmit: handleCreateOrg, children: [
          /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "שם" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              value: createName,
              onChange: (e) => setCreateName(e.target.value),
              placeholder: "שם החברה"
            }
          ),
          /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "סלאג" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              value: createSlug,
              onChange: (e) => setCreateSlug(e.target.value),
              placeholder: "לדוגמה: חברה-לדוגמה"
            }
          ),
          /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "הערה (אופציונלי)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              value: createNote,
              onChange: (e) => setCreateNote(e.target.value),
              placeholder: "הערה"
            }
          ),
          /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "מגבלת מושבים (אופציונלי)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              value: createSeatLimit,
              onChange: (e) => setCreateSeatLimit(e.target.value),
              inputMode: "numeric",
              placeholder: "לדוגמה: 25"
            }
          ),
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: createBusy, children: "צור" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: styles$1.panel, children: [
        /* @__PURE__ */ jsx("h2", { className: styles$1.h2, children: "פרטי ארגון" }),
        !selectedOrg ? /* @__PURE__ */ jsx("div", { className: styles$1.empty, children: "בחר ארגון כדי לנהל חברים" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: styles$1.detailsGrid, children: [
            /* @__PURE__ */ jsxs("div", { className: styles$1.detailItem, children: [
              /* @__PURE__ */ jsx("div", { className: styles$1.detailLabel, children: "סלאג" }),
              /* @__PURE__ */ jsx("div", { className: styles$1.detailValueMono, children: selectedOrg.slug })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$1.detailItem, children: [
              /* @__PURE__ */ jsx("div", { className: styles$1.detailLabel, children: "שם" }),
              /* @__PURE__ */ jsx("div", { className: styles$1.detailValue, children: selectedOrg.name })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$1.detailItem, children: [
              /* @__PURE__ */ jsx("div", { className: styles$1.detailLabel, children: "פעיל" }),
              /* @__PURE__ */ jsx("div", { className: styles$1.detailValue, children: selectedOrg.isActive ? "כן" : "לא" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$1.noteBlock, children: [
            /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "הערה" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: safeString(selectedOrg.note),
                onChange: (e) => setSelectedOrg(
                  (prev) => prev ? {
                    ...prev,
                    note: e.target.value
                  } : prev
                ),
                placeholder: "הערה פנימית"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: handleUpdateOrgNote,
                disabled: selectedBusy,
                variant: "secondary",
                children: "שמור"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$1.noteBlock, children: [
            /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "מגבלת מושבים (ריק = ללא הגבלה מוגדרת)" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: selectedSeatLimit,
                onChange: (e) => setSelectedSeatLimit(e.target.value),
                inputMode: "numeric",
                placeholder: "לדוגמה: 25"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: handleUpdateOrgSeatLimit,
                disabled: selectedBusy,
                variant: "secondary",
                children: "שמור"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$1.entitlementSection, children: [
            /* @__PURE__ */ jsx("h3", { className: styles$1.h3, children: "הרשאה שנתית לארגון" }),
            /* @__PURE__ */ jsx("p", { className: styles$1.entitlementHelperText, children: "גישה שנתית לארגון מנוהלת ידנית לאחר תשלום מחוץ למערכת. לא מתבצעת כאן סליקה, יצירת חשבונית או חיוב אוטומטי." }),
            /* @__PURE__ */ jsxs("div", { className: styles$1.detailsGrid, children: [
              /* @__PURE__ */ jsxs("div", { className: styles$1.detailItem, children: [
                /* @__PURE__ */ jsx("div", { className: styles$1.detailLabel, children: "סטטוס" }),
                /* @__PURE__ */ jsx("div", { className: styles$1.detailValue, children: /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: [
                      styles$1.entitlementStatusBadge,
                      ENTITLEMENT_STATUS_CLASS[entComputedStatus]
                    ].filter(Boolean).join(" "),
                    children: entStatusLabel
                  }
                ) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$1.detailItem, children: [
                /* @__PURE__ */ jsx("div", { className: styles$1.detailLabel, children: "תוכנית" }),
                /* @__PURE__ */ jsx("div", { className: styles$1.detailValue, children: ent?.plan || "—" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$1.detailItem, children: [
                /* @__PURE__ */ jsx("div", { className: styles$1.detailLabel, children: "תחילה" }),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: styles$1.detailValue,
                    dir: "ltr",
                    children: formatAdminDate(ent?.startsAt)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$1.detailItem, children: [
                /* @__PURE__ */ jsx("div", { className: styles$1.detailLabel, children: "תפוגה" }),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: styles$1.detailValue,
                    dir: "ltr",
                    children: formatAdminDate(ent?.expiresAt)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$1.detailItem, children: [
                /* @__PURE__ */ jsx("div", { className: styles$1.detailLabel, children: "מקור" }),
                /* @__PURE__ */ jsx("div", { className: styles$1.detailValue, children: ent?.source || "—" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$1.detailItem, children: [
                /* @__PURE__ */ jsx("div", { className: styles$1.detailLabel, children: "הוענק" }),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: styles$1.detailValue,
                    dir: "ltr",
                    children: formatAdminDate(ent?.grantedAt)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$1.detailItem, children: [
                /* @__PURE__ */ jsx("div", { className: styles$1.detailLabel, children: "עודכן לאחרונה" }),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: styles$1.detailValue,
                    dir: "ltr",
                    children: formatAdminDate(
                      ent?.lastModifiedAt
                    )
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$1.entitlementActions, children: [
              showGrant && /* @__PURE__ */ jsx(
                Button,
                {
                  size: "small",
                  onClick: () => setEntitlementOp(
                    entitlementOp === "grant" ? null : "grant"
                  ),
                  disabled: entitlementBusy,
                  children: entitlementOp === "grant" ? "סגור" : "הענק גישה שנתית"
                }
              ),
              showExtend && /* @__PURE__ */ jsx(
                Button,
                {
                  size: "small",
                  variant: "secondary",
                  onClick: () => setEntitlementOp(
                    entitlementOp === "extend" ? null : "extend"
                  ),
                  disabled: entitlementBusy,
                  children: entitlementOp === "extend" ? "סגור" : "הארך גישה"
                }
              ),
              showRevoke && /* @__PURE__ */ jsx(
                Button,
                {
                  size: "small",
                  variant: "danger",
                  onClick: () => setEntitlementOp(
                    entitlementOp === "revoke" ? null : "revoke"
                  ),
                  disabled: entitlementBusy,
                  children: entitlementOp === "revoke" ? "סגור" : "בטל גישה"
                }
              )
            ] }),
            entitlementOp === "grant" && /* @__PURE__ */ jsxs(
              "form",
              {
                className: styles$1.entitlementFormPanel,
                onSubmit: handleGrantEntitlement,
                children: [
                  /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "תאריך תפוגה *" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      type: "date",
                      value: grantExpiresAt,
                      onChange: (e) => setGrantExpiresAt(
                        e.target.value
                      ),
                      required: true
                    }
                  ),
                  /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "סיבה *" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      value: grantReason,
                      onChange: (e) => setGrantReason(e.target.value),
                      placeholder: "לדוגמה: חוזה שנתי B2B",
                      required: true
                    }
                  ),
                  /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "אסמכתא תשלום (אופציונלי)" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      value: grantPaymentRef,
                      onChange: (e) => setGrantPaymentRef(
                        e.target.value
                      ),
                      placeholder: "מס׳ אסמכתא, קישור, תיאור"
                    }
                  ),
                  /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "הערת מנהל (אופציונלי)" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      value: grantAdminNote,
                      onChange: (e) => setGrantAdminNote(
                        e.target.value
                      ),
                      placeholder: "הערה פנימית לטובת הצוות"
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "div",
                    {
                      className: styles$1.entitlementCheckboxRow,
                      children: [
                        /* @__PURE__ */ jsx(
                          "input",
                          {
                            type: "checkbox",
                            id: "entGrantConfirm",
                            checked: grantConfirm,
                            onChange: (e) => setGrantConfirm(
                              e.target.checked
                            )
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "label",
                          {
                            htmlFor: "entGrantConfirm",
                            className: styles$1.label,
                            children: "אני מאשר/ת הענקת גישה שנתית לאחר קבלת תשלום מחוץ למערכת"
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      type: "submit",
                      size: "small",
                      disabled: entitlementBusy || !grantConfirm,
                      children: entitlementBusy ? "שולח..." : "הענק גישה"
                    }
                  )
                ]
              }
            ),
            entitlementOp === "extend" && /* @__PURE__ */ jsxs(
              "form",
              {
                className: styles$1.entitlementFormPanel,
                onSubmit: handleExtendEntitlement,
                children: [
                  /* @__PURE__ */ jsxs(
                    "p",
                    {
                      className: styles$1.entitlementHelperText,
                      children: [
                        "תפוגה נוכחית:",
                        " ",
                        formatAdminDate(ent?.expiresAt)
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "תאריך תפוגה חדש *" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      type: "date",
                      value: extendNewExpiresAt,
                      onChange: (e) => setExtendNewExpiresAt(
                        e.target.value
                      ),
                      required: true
                    }
                  ),
                  /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "סיבה *" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      value: extendReason,
                      onChange: (e) => setExtendReason(e.target.value),
                      placeholder: "לדוגמה: חידוש שנתי",
                      required: true
                    }
                  ),
                  /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "אסמכתא תשלום (אופציונלי)" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      value: extendPaymentRef,
                      onChange: (e) => setExtendPaymentRef(
                        e.target.value
                      ),
                      placeholder: "מס׳ אסמכתא"
                    }
                  ),
                  /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "הערת מנהל (אופציונלי)" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      value: extendAdminNote,
                      onChange: (e) => setExtendAdminNote(
                        e.target.value
                      )
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      type: "submit",
                      size: "small",
                      disabled: entitlementBusy,
                      children: entitlementBusy ? "שולח..." : "הארך גישה"
                    }
                  )
                ]
              }
            ),
            entitlementOp === "revoke" && /* @__PURE__ */ jsxs(
              "form",
              {
                className: styles$1.entitlementFormPanel,
                onSubmit: handleRevokeEntitlement,
                children: [
                  /* @__PURE__ */ jsx(
                    "p",
                    {
                      className: styles$1.entitlementHelperText,
                      children: "ביטול הגישה השנתית יפסיק את ההרשאה לאלתר. לא מבוצעת החזרה כספית."
                    }
                  ),
                  /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "סיבה *" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      value: revokeReason,
                      onChange: (e) => setRevokeReason(e.target.value),
                      placeholder: "לדוגמה: סיום חוזה",
                      required: true
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "div",
                    {
                      className: styles$1.entitlementCheckboxRow,
                      children: [
                        /* @__PURE__ */ jsx(
                          "input",
                          {
                            type: "checkbox",
                            id: "entRevokeConfirm",
                            checked: revokeConfirm,
                            onChange: (e) => setRevokeConfirm(
                              e.target.checked
                            )
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "label",
                          {
                            htmlFor: "entRevokeConfirm",
                            className: styles$1.label,
                            children: "אני מאשר/ת ביטול גישה שנתית לארגון זה"
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      type: "submit",
                      size: "small",
                      variant: "danger",
                      disabled: entitlementBusy || !revokeConfirm,
                      children: entitlementBusy ? "שולח..." : "בטל גישה"
                    }
                  )
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx("h3", { className: styles$1.h3, children: "חברים" }),
          /* @__PURE__ */ jsx("h3", { className: styles$1.h3, children: "הזמנות" }),
          /* @__PURE__ */ jsxs("div", { className: styles$1.detailItem, children: [
            /* @__PURE__ */ jsx("div", { className: styles$1.detailLabel, children: "מושבים" }),
            /* @__PURE__ */ jsxs("div", { className: styles$1.detailValue, children: [
              "מושבים: ",
              usedSeats,
              "/",
              hasSeatLimit ? seatLimit : "∞",
              /* @__PURE__ */ jsx("br", {}),
              "נותרו: ",
              hasSeatLimit ? remainingSeats : "∞"
            ] })
          ] }),
          /* @__PURE__ */ jsxs(
            "form",
            {
              className: styles$1.memberForm,
              onSubmit: handleCreateInvite,
              children: [
                /* @__PURE__ */ jsxs("div", { className: styles$1.memberFormRow, children: [
                  /* @__PURE__ */ jsxs("div", { className: styles$1.memberCol, children: [
                    /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "אימייל" }),
                    /* @__PURE__ */ jsx(
                      Input,
                      {
                        value: inviteEmail,
                        onChange: (e) => setInviteEmail(e.target.value),
                        placeholder: "user@example.com",
                        required: true
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: styles$1.memberCol, children: [
                    /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "תפקיד" }),
                    /* @__PURE__ */ jsxs(
                      "select",
                      {
                        className: styles$1.select,
                        value: inviteRole,
                        onChange: (e) => setInviteRole(e.target.value),
                        children: [
                          /* @__PURE__ */ jsx("option", { value: "member", children: "חבר" }),
                          /* @__PURE__ */ jsx("option", { value: "admin", children: "מנהל" })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: styles$1.memberFormRow, children: /* @__PURE__ */ jsx("div", { className: styles$1.memberColActions, children: /* @__PURE__ */ jsx(
                  Button,
                  {
                    type: "submit",
                    disabled: inviteBusy || !String(
                      inviteEmail || ""
                    ).trim(),
                    children: "צור הזמנה"
                  }
                ) }) }),
                inviteLink ? /* @__PURE__ */ jsxs("div", { className: styles$1.memberCol, children: [
                  /* @__PURE__ */ jsx("label", { className: styles$1.label, children: "קישור הזמנה" }),
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: styles$1.detailValueMono,
                      dir: "ltr",
                      children: inviteLink
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "small",
                      onClick: handleCopyInviteLink,
                      children: "העתק קישור"
                    }
                  )
                ] }) : null
              ]
            }
          ),
          /* @__PURE__ */ jsx("h3", { className: styles$1.h3, children: "הזמנות" }),
          orgInvitesLoading ? /* @__PURE__ */ jsx("p", { children: "טוען הזמנות…" }) : orgInvites.length === 0 ? /* @__PURE__ */ jsx("p", { children: "אין הזמנות." }) : /* @__PURE__ */ jsx("div", { className: styles$1.tableWrap, children: /* @__PURE__ */ jsxs("table", { className: styles$1.table, children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("th", { children: "אימייל" }),
              /* @__PURE__ */ jsx("th", { children: "תפקיד" }),
              /* @__PURE__ */ jsx("th", { children: "סטטוס" }),
              /* @__PURE__ */ jsx("th", { children: "נוצר" }),
              /* @__PURE__ */ jsx("th", {})
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { children: orgInvites.map((inv) => {
              const status = inviteStatus(inv);
              const canRevoke = status === "ממתינה";
              const busy = revokeBusyId === inv.id;
              return /* @__PURE__ */ jsxs(
                "tr",
                {
                  className: styles$1.row,
                  children: [
                    /* @__PURE__ */ jsx(
                      "td",
                      {
                        className: styles$1.cellMono,
                        dir: "ltr",
                        children: inv.email
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "td",
                      {
                        className: styles$1.cell,
                        children: roleHe$1(inv.role)
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "td",
                      {
                        className: styles$1.cell,
                        children: status
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "td",
                      {
                        className: styles$1.cell,
                        dir: "ltr",
                        children: inv.createdAt ? new Date(
                          inv.createdAt
                        ).toLocaleDateString(
                          "he-IL"
                        ) : "-"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "td",
                      {
                        className: styles$1.cellActions,
                        children: canRevoke ? /* @__PURE__ */ jsx(
                          Button,
                          {
                            size: "small",
                            variant: "danger",
                            disabled: busy,
                            onClick: () => handleRevokeInvite(
                              inv
                            ),
                            children: busy ? "מבטל…" : "ביטול"
                          }
                        ) : null
                      }
                    )
                  ]
                },
                inv.id
              );
            }) })
          ] }) }),
          /* @__PURE__ */ jsx("h3", { className: styles$1.h3, children: "חברים" }),
          /* @__PURE__ */ jsx("div", { className: styles$1.tableWrap, children: /* @__PURE__ */ jsxs("table", { className: styles$1.table, children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("th", { children: "אימייל" }),
              /* @__PURE__ */ jsx("th", { children: "תפקיד" }),
              /* @__PURE__ */ jsx("th", { children: "סטטוס" }),
              /* @__PURE__ */ jsx("th", {})
            ] }) }),
            /* @__PURE__ */ jsxs("tbody", { children: [
              members.map((m) => {
                const busy = memberBusyId === m.id;
                return /* @__PURE__ */ jsxs(
                  "tr",
                  {
                    className: styles$1.row,
                    children: [
                      /* @__PURE__ */ jsx(
                        "td",
                        {
                          className: styles$1.cellMono,
                          children: m.email
                        }
                      ),
                      /* @__PURE__ */ jsx("td", { className: styles$1.cell, children: /* @__PURE__ */ jsxs(
                        "select",
                        {
                          className: styles$1.selectInline,
                          value: m.role,
                          onChange: (e) => handleMemberRoleChange(
                            m,
                            e.target.value
                          ),
                          disabled: busy,
                          children: [
                            /* @__PURE__ */ jsx("option", { value: "member", children: "חבר" }),
                            /* @__PURE__ */ jsx("option", { value: "admin", children: "מנהל" })
                          ]
                        }
                      ) }),
                      /* @__PURE__ */ jsx("td", { className: styles$1.cell, children: /* @__PURE__ */ jsx(
                        Button,
                        {
                          variant: "secondary",
                          onClick: () => handleMemberStatusToggle(
                            m
                          ),
                          disabled: busy,
                          children: memberStatusHe(
                            m.status
                          )
                        }
                      ) }),
                      /* @__PURE__ */ jsx(
                        "td",
                        {
                          className: styles$1.cellActions,
                          children: /* @__PURE__ */ jsx(
                            Button,
                            {
                              variant: "danger",
                              onClick: () => handleMemberDelete(
                                m
                              ),
                              disabled: busy,
                              children: "הסר"
                            }
                          )
                        }
                      )
                    ]
                  },
                  m.id
                );
              }),
              !members.length && !membersLoading ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
                "td",
                {
                  colSpan: 4,
                  className: styles$1.empty,
                  children: "אין חברים"
                }
              ) }) : null
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { className: styles$1.pager, children: [
            /* @__PURE__ */ jsxs("div", { className: styles$1.pagerMeta, children: [
              'סה"כ: ',
              membersTotal
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$1.pagerControls, children: [
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "secondary",
                  onClick: () => setMembersPage(
                    (p) => Math.max(1, p - 1)
                  ),
                  disabled: membersLoading || membersPage <= 1,
                  children: "הקודם"
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: styles$1.pagerPage, children: [
                "עמוד ",
                membersPage
              ] }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "secondary",
                  onClick: () => setMembersPage((p) => p + 1),
                  disabled: membersLoading || members.length < Number(membersLimit),
                  children: "הבא"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$1.pagerLimit, children: [
              /* @__PURE__ */ jsx("label", { className: styles$1.limitLabel, children: "כמות להצגה" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  value: String(membersLimit),
                  onChange: (e) => setMembersLimit(
                    clampInt(e.target.value, {
                      min: 1,
                      max: 100,
                      fallback: 25
                    })
                  ),
                  inputMode: "numeric"
                }
              )
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
const adminRoot = "_adminRoot_17y8v_1";
const scrollArea = "_scrollArea_17y8v_21";
const body = "_body_17y8v_59";
const cardBody = "_cardBody_17y8v_69";
const topbar = "_topbar_17y8v_97";
const topbarTitleWrap = "_topbarTitleWrap_17y8v_125";
const topbarActions = "_topbarActions_17y8v_139";
const commandBar = "_commandBar_17y8v_153";
const commandBarButtons = "_commandBarButtons_17y8v_169";
const commandBtn = "_commandBtn_17y8v_183";
const commandBarHint = "_commandBarHint_17y8v_201";
const title = "_title_17y8v_215";
const subtitle = "_subtitle_17y8v_229";
const leftRail = "_leftRail_17y8v_265";
const queueCards = "_queueCards_17y8v_273";
const queueUsers = "_queueUsers_17y8v_281";
const queueOrgs = "_queueOrgs_17y8v_289";
const rightPanel = "_rightPanel_17y8v_297";
const statsCard = "_statsCard_17y8v_305";
const cardShell = "_cardShell_17y8v_359";
const mobileOnly = "_mobileOnly_17y8v_377";
const cardHeader = "_cardHeader_17y8v_385";
const directoryTools = "_directoryTools_17y8v_401";
const searchRow = "_searchRow_17y8v_413";
const searchInput = "_searchInput_17y8v_427";
const headerRow = "_headerRow_17y8v_447";
const h2 = "_h2_17y8v_461";
const table = "_table_17y8v_475";
const rowBtn = "_rowBtn_17y8v_521";
const ltr = "_ltr_17y8v_553";
const truncate = "_truncate_17y8v_563";
const muted = "_muted_17y8v_583";
const mismatchBadge = "_mismatchBadge_17y8v_593";
const errorText = "_errorText_17y8v_617";
const warningBox = "_warningBox_17y8v_631";
const sectionBlock = "_sectionBlock_17y8v_647";
const sectionTitle = "_sectionTitle_17y8v_659";
const kv = "_kv_17y8v_671";
const kvDl = "_kvDl_17y8v_683";
const kvDt = "_kvDt_17y8v_697";
const kvDd = "_kvDd_17y8v_711";
const selectedHeaderStrip = "_selectedHeaderStrip_17y8v_723";
const selectedPrimary = "_selectedPrimary_17y8v_743";
const selectedLabel = "_selectedLabel_17y8v_759";
const selectedValue = "_selectedValue_17y8v_769";
const selectedMeta = "_selectedMeta_17y8v_777";
const metaPill = "_metaPill_17y8v_791";
const metaKey = "_metaKey_17y8v_813";
const actionGroup = "_actionGroup_17y8v_823";
const formRow = "_formRow_17y8v_839";
const toggleRow = "_toggleRow_17y8v_871";
const provenancePanel = "_provenancePanel_17y8v_899";
const provenanceHeader = "_provenanceHeader_17y8v_915";
const provenanceHeaderLeft = "_provenanceHeaderLeft_17y8v_931";
const provenancePill = "_provenancePill_17y8v_947";
const auditList = "_auditList_17y8v_971";
const auditRow = "_auditRow_17y8v_983";
const auditMeta = "_auditMeta_17y8v_1003";
const auditKey = "_auditKey_17y8v_1019";
const auditReason = "_auditReason_17y8v_1029";
const selectField = "_selectField_17y8v_1039";
const selectLabel = "_selectLabel_17y8v_1055";
const select = "_select_17y8v_723";
const tabs = "_tabs_17y8v_1103";
const selectedCard = "_selectedCard_17y8v_1247";
const queuePanel = "_queuePanel_17y8v_1289";
const legend = "_legend_17y8v_1389";
const tab = "_tab_17y8v_475";
const tabActive = "_tabActive_17y8v_1453";
const legendDetails = "_legendDetails_17y8v_1467";
const legendSummary = "_legendSummary_17y8v_1481";
const legendIntro = "_legendIntro_17y8v_1533";
const legendGroup = "_legendGroup_17y8v_1551";
const legendHeading = "_legendHeading_17y8v_1579";
const legendDl = "_legendDl_17y8v_1595";
const legendNote = "_legendNote_17y8v_1641";
const queueBody = "_queueBody_17y8v_1671";
const queueSummary = "_queueSummary_17y8v_1679";
const queueCount = "_queueCount_17y8v_1745";
const pager = "_pager_17y8v_1767";
const pagerMeta = "_pagerMeta_17y8v_1785";
const pagerControls = "_pagerControls_17y8v_1795";
const pagerPage = "_pagerPage_17y8v_1807";
const centerCard = "_centerCard_17y8v_1819";
const cardPublicLink = "_cardPublicLink_17y8v_1843";
const styles = {
  adminRoot,
  scrollArea,
  body,
  cardBody,
  topbar,
  topbarTitleWrap,
  topbarActions,
  commandBar,
  commandBarButtons,
  commandBtn,
  commandBarHint,
  title,
  subtitle,
  leftRail,
  queueCards,
  queueUsers,
  queueOrgs,
  rightPanel,
  statsCard,
  cardShell,
  mobileOnly,
  cardHeader,
  directoryTools,
  searchRow,
  searchInput,
  headerRow,
  h2,
  table,
  rowBtn,
  ltr,
  truncate,
  muted,
  mismatchBadge,
  errorText,
  warningBox,
  sectionBlock,
  sectionTitle,
  kv,
  kvDl,
  kvDt,
  kvDd,
  selectedHeaderStrip,
  selectedPrimary,
  selectedLabel,
  selectedValue,
  selectedMeta,
  metaPill,
  metaKey,
  actionGroup,
  formRow,
  toggleRow,
  provenancePanel,
  provenanceHeader,
  provenanceHeaderLeft,
  provenancePill,
  auditList,
  auditRow,
  auditMeta,
  auditKey,
  auditReason,
  selectField,
  selectLabel,
  select,
  tabs,
  selectedCard,
  queuePanel,
  legend,
  tab,
  tabActive,
  legendDetails,
  legendSummary,
  legendIntro,
  legendGroup,
  legendHeading,
  legendDl,
  legendNote,
  queueBody,
  queueSummary,
  queueCount,
  pager,
  pagerMeta,
  pagerControls,
  pagerPage,
  centerCard,
  cardPublicLink
};
const ORIGIN = "https://cardigo.co.il";
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
    label_slug: "סלאג",
    label_card_public_url: "כתובת ציבורית",
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
    section_provenance: "מקור הסטטוס",
    label_raw_billing: "חיוב (גולמי)",
    label_raw_payer: "משלם (גולמי)",
    label_audit_history: "בדיקה אחרונה",
    label_latest_audit: "אירוע אחרון",
    label_when: "מתי",
    label_action: "פעולה",
    label_mode: "מצב",
    label_by_admin: "מנהל",
    msg_audit_loading: "טוען היסטוריה…",
    msg_audit_empty: "אין אירועי בקרה לכרטיס זה.",
    label_analytics: "אנליטיקה",
    label_can_view_analytics: "גישה לאנליטיקה",
    label_analytics_retention: "שמירת נתונים (ימים)",
    label_admin_override: "הטבת מסלול (ידני)",
    label_card_tier_override: "רמת פיצ'רים לכרטיס (ידני)",
    label_user_tier_override: "רמת פיצ'רים למשתמש (ידני)",
    section_billing_crud: "ניהול חיובים",
    section_user_subscription: "מנוי משתמש",
    section_card_billing_crud: "חיוב הכרטיס בזמן אמת",
    msg_user_subscription_help: 'טיפ: שינוי מנוי משתמש לא משנה כרטיסים מיד - אחרי זה עושים "סנכרן מהמשתמש".',
    msg_card_billing_help: "טיפ: חיוב כרטיס משפיע מיד. אם יש הטבה ידנית - היא יכולה להסתיר את החיוב עד שמנקים אותה.",
    label_user_id: "מזהה משתמש",
    label_card_id_crud: "מזהה כרטיס",
    label_plan_crud: "מסלול",
    label_expires_at_iso: "תוקף מנוי עד (תאריך ושעה)",
    label_paid_until_iso: "תשלום פעיל עד (תאריך ושעה)",
    btn_enable_subscription: "הפעל מנוי",
    btn_revoke_subscription: "בטל מנוי",
    btn_enable_card_billing: "הפעל תשלום לכרטיס",
    btn_revoke_card_billing: "בטל תשלום לכרטיס",
    btn_sync_from_user: "סנכרן מהמשתמש",
    btn_clear_override: "נקה הטבה ידנית",
    warn_override_precedence: "הטבה ידנית פעילה גוברת על החיוב, ולכן הכרטיס עשוי להופיע כלא משולם. נדרש ניקוי הטבה ידנית באופן מפורש.",
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
    hint_analytics_premium: "מפעיל/מכבה אנליטיקה מתקדמת בכרטיס הזה בלבד. לא משנה תשלום ולא משנה רמת פיצ׳רים.",
    hint_extend_trial: "מאריך/מגדיר ניסיון לכרטיס. זה לא תשלום וזה לא פרימיום.",
    hint_override_plan: 'נותן מסלול ידני זמני לכרטיס. כדי לחזור למצב רגיל צריך "נקה הטבה ידנית".',
    hint_card_tier: "קובע רמת פיצ׳רים לכרטיס הזה. זה גובר על הכל - לזכור להסיר כשמסיימים.",
    hint_user_tier: "קובע רמת פיצ׳רים לכל הכרטיסים של המשתמש. כרטיס עם רמה ידנית עדיין גובר.",
    hint_enable_subscription: 'נותן מנוי למשתמש עד תאריך. כדי שזה ישפיע על כרטיסים - צריך גם ללחוץ "סנכרן מהמשתמש".',
    hint_revoke_subscription: 'מבטל את המנוי של המשתמש ומחזיר לחינם. כדי לעדכן כרטיסים - צריך גם "סנכרן מהמשתמש".',
    hint_enable_card_billing: "נותן פרימיום לכרטיס הזה עד תאריך. ההשפעה מיידית (פרסום, כתובת קצרה, SEO וסקריפטים, אנליטיקה).",
    hint_revoke_card_billing: "מבטל פרימיום בכרטיס הזה ומחזיר לחינם מיד.",
    hint_sync_from_user: "מעתיק את מצב המנוי של המשתמש לכרטיס. אם התשלום שייך לארגון/משלם אחר - סמן «הגדרת משלם לארגון» לפני הסנכרון.",
    hint_clear_override: "מסיר הטבה ידנית. אחרי הניקוי - הכרטיס חוזר להתנהג לפי החיוב האמיתי שלו.",
    label_payer_type: "סוג משלם",
    label_payer_note: "הערת משלם",
    opt_keep_current: "השאר ללא שינוי",
    opt_payer_none: "ללא",
    opt_payer_user: "משתמש",
    opt_payer_org: "ארגון",
    section_legend: "מקרא",
    legend_intro: "לוח ניהול למנהלים בלבד. כל פעולה דורשת מילוי שדה «סיבה» ונרשמת ביומן הפעולות לצורכי מעקב ובקרה.",
    legend_nav: "ניווט",
    legend_nav_desc: "לוח הניהול מחולק לשלושה אזורים: סרגל סטטיסטיקות עליון, אזור מרכזי עם טבלאות ספרייה (כרטיסים / משתמשים / ארגונים), ופאנל כרטיס נבחר עם טאבים.",
    legend_tab_general: "טאב «כללי»",
    legend_tab_general_desc: "מציג פרטי כרטיס בסיסיים: מזהה פנימי (MongoDB ID), סלאג (כתובת קצרה), סטטוס (טיוטה/מפורסם), פעיל (כן/לא), ובעלות (משתמש/אנונימי).",
    legend_tab_billing: "טאב «חיוב»",
    legend_tab_billing_desc: "מציג מצב חיוב בפועל: מסלול תשלום (free/monthly/yearly), גישה פעילה (entitled), שולם (isPaid), רמת פיצ'רים (free/basic/premium) + מקור + תוקף, סיום ניסיון, וסטטוס תשלום מפורט.",
    legend_provenance: "מקור הסטטוס",
    legend_provenance_desc: "בתוך טאב חיוב - מציג נתונים גולמיים: חיוב גולמי (סטטוס · מסלול · תשלום עד), משלם גולמי (סוג · מקור · עודכן), והיסטוריית בקרה עם פעולה, מצב, מנהל, וסיבה.",
    legend_tab_actions: "טאב «פעולות מנהל»",
    legend_tab_actions_items: "הארכת ניסיון (ימים / תאריך מדויק), הטבת מסלול ידנית, רמת פיצ'רים לכרטיס, רמת פיצ'רים למשתמש (רק אם הכרטיס בבעלות משתמש), אנליטיקס פרימיום (הפעלה/כיבוי).",
    legend_tab_danger: "טאב «אזור סכנה»",
    legend_tab_danger_desc: "השבתה/הפעלה מחדש של כרטיס (isActive), מחיקת כרטיס לצמיתות, מחיקת משתמש לצמיתות. כל פעולה דורשת אישור.",
    legend_billing_crud: "פאנל «ניהול חיובים»",
    legend_billing_crud_desc: "פאנל ימני נפרד עם שתי יחידות:",
    legend_user_sub: "מנוי משתמש - הגדרת מסלול + תוקף ברמת המשתמש. לא משפיע ישירות על כרטיס עד ביצוע סנכרון.",
    legend_card_billing: "חיוב כרטיס (מקור אמת) - קובע את חיוב הכרטיס ומשפיע מיידית על החיוב בפועל. כולל: מסלול, תשלום עד, סוג משלם, הערת משלם, סנכרון מהמשתמש, הגדרת משלם לארגון, וניקוי הטבה ידנית.",
    legend_what_affects_what_title: "מה משפיע על מה?",
    legend_what_affects_what_tier: "רמת פיצ׳רים: כרטיס (ידני) → משתמש (ידני) → תשלום → חינם",
    legend_what_affects_what_billing: "מסלול תשלום בפועל: הטבה ידנית → חיוב כרטיס → סנכרון מהמשתמש",
    legend_what_affects_what_rules: "כללי אצבע: אחרי שינוי מנוי משתמש מסנכרנים; אם יש הטבה ידנית - מנקים כדי לחזור לרגיל",
    legend_slug_note: "סלאג: כתובת קצרה. כרטיסים אישיים: /card/:slug. כרטיסי ארגון: /c/:orgSlug/:slug.",
    legend_ltr_note: "ערכים טכניים (ID, אימייל, סלאג, תאריכים) מוצגים LTR למניעת בלבול בממשק RTL.",
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
    label_force_org_payer: "הגדרת משלם לארגון",
    msg_sync_uses_saved_db: "הסנכרון משתמש בתאריך התפוגה השמור במנוי המשתמש.",
    err_org_payer_locked: "התשלום משויך לארגון ונעול. סמן «הגדרת משלם לארגון» ונסה שוב.",
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
    err_datetime_must_be_empty_for_free: "במסלול חינמי יש להשאיר את השדה ריק."
  }
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
  const now = /* @__PURE__ */ new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);
  const [hRaw, mRaw] = String(time).split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  const rounded = Number.isFinite(m) ? Math.floor(m / 5) * 5 : 0;
  return {
    date,
    hour: String(Number.isFinite(h) ? h : 0).padStart(2, "0"),
    minute: String(rounded).padStart(2, "0")
  };
}
function Admin() {
  const { isAuthenticated } = useAuth();
  const [adminMode, setAdminMode] = useState("manage");
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);
  const [selectedTab, setSelectedTab] = useState("general");
  const [selectedUserTab, setSelectedUserTab] = useState("general");
  const [cardsQuery, setCardsQuery] = useState("");
  const [cardsCohort, setCardsCohort] = useState("");
  const [usersQuery, setUsersQuery] = useState("");
  const [usersAppliedQ, setUsersAppliedQ] = useState("");
  const [usersCohort, setUsersCohort] = useState("");
  const selectedTabListRef = useRef(null);
  const selectedTabListRefMobile = useRef(null);
  const selectedUserTabListRef = useRef(null);
  const pendingBillingCardIdRef = useRef(null);
  const loadUserRequestIdRef = useRef(null);
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
    analyticsPremium: false
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
    analyticsPremium: ""
  });
  const CARDS_PAGE_LIMIT = 25;
  const USERS_PAGE_LIMIT = 25;
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [cards, setCards] = useState([]);
  const [cardsTotal, setCardsTotal] = useState(0);
  const [cardsPage, setCardsPage] = useState(1);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [selectedCard2, setSelectedCard] = useState(null);
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
  const [billingCardPayerNoteTouched, setBillingCardPayerNoteTouched] = useState(false);
  const billingUserIdTrimmed = useMemo(
    () => String(billingUserId || "").trim(),
    [billingUserId]
  );
  const billingUserIdLooksValid = useMemo(
    () => /^[0-9a-f]{24}$/i.test(billingUserIdTrimmed),
    [billingUserIdTrimmed]
  );
  const billingCardIdTrimmed = useMemo(
    () => String(billingCardId || "").trim(),
    [billingCardId]
  );
  const billingCardActionsDisabled = useMemo(
    () => loading || !billingCardIdTrimmed,
    [loading, billingCardIdTrimmed]
  );
  const selectedCardOwner = useMemo(() => {
    if (!selectedCard2) return "";
    if (selectedCard2?.user) return "user";
    if (selectedCard2?.anonymousId) return "anonymous";
    return "";
  }, [selectedCard2]);
  const selectedCardOwnerLabel = useMemo(() => {
    if (selectedCardOwner === "user") return t("owner_user");
    if (selectedCardOwner === "anonymous") return t("owner_anonymous");
    return "";
  }, [selectedCardOwner]);
  const selectedEffectivePlan = useMemo(() => {
    if (!selectedCard2) return "";
    return selectedCard2?.effectiveBilling?.plan || "";
  }, [selectedCard2]);
  const selectedIsPaid = useMemo(() => {
    if (!selectedCard2) return false;
    return Boolean(selectedCard2?.effectiveBilling?.isPaid);
  }, [selectedCard2]);
  const selectedIsEntitled = useMemo(() => {
    if (!selectedCard2) return false;
    return Boolean(selectedCard2?.effectiveBilling?.isEntitled);
  }, [selectedCard2]);
  const selectedBilling = useMemo(() => {
    if (!selectedCard2) return null;
    return selectedCard2?.effectiveBilling || null;
  }, [selectedCard2]);
  const selectedProvenanceSource = useMemo(() => {
    if (!selectedCard2) return "";
    if (selectedCard2?.adminOverride) return "adminOverride";
    return String(selectedBilling?.source || "");
  }, [selectedCard2, selectedBilling]);
  const selectedLatestAudit = useMemo(() => {
    if (!Array.isArray(selectedAuditItems)) return null;
    return selectedAuditItems.length ? selectedAuditItems[0] : null;
  }, [selectedAuditItems]);
  const selectedEffectiveTier = useMemo(() => {
    if (!selectedCard2) return "";
    return selectedCard2?.effectiveTier || "";
  }, [selectedCard2]);
  const selectedTierSource = useMemo(() => {
    if (!selectedCard2) return "";
    return selectedCard2?.tierSource || "";
  }, [selectedCard2]);
  const selectedTierUntil = useMemo(() => {
    if (!selectedCard2) return "";
    return selectedCard2?.tierUntil || "";
  }, [selectedCard2]);
  const selectedCardPublicUrl = useMemo(() => {
    const p = selectedCard2?.publicPath;
    if (typeof p !== "string" || !p.startsWith("/")) return null;
    return `${ORIGIN}${p}`;
  }, [selectedCard2]);
  const filteredCards = useMemo(() => {
    const list = Array.isArray(cards) ? cards : [];
    const q = String(cardsQuery || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
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
    setCards(
      (prev) => Array.isArray(prev) ? prev.map(
        (c) => c?._id === updated._id ? {
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
          trialEndsAt: updated.trialEndsAt
        } : c
      ) : prev
    );
  }
  async function loadAll() {
    setLoading(true);
    setError("");
    setAccessDenied(false);
    try {
      const [s, u, c] = await Promise.all([
        getAdminStats(),
        listAdminUsers({
          page: usersPage,
          limit: USERS_PAGE_LIMIT,
          ...usersAppliedQ ? { q: usersAppliedQ } : {},
          ...usersCohort ? { cohort: usersCohort } : {}
        }),
        listAdminCards({
          page: cardsPage,
          limit: CARDS_PAGE_LIMIT,
          ...cardsCohort ? { cohort: cardsCohort } : {}
        })
      ]);
      setStats(s.data);
      setUsers(u.data?.items || []);
      setUsersTotal(Number(u.data?.total) || 0);
      setCards(c.data?.items || []);
      setCardsTotal(Number(c.data?.total) || 0);
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
  async function loadCardsPage(nextPage, explicitCohort) {
    const cohort = typeof explicitCohort === "string" ? explicitCohort : cardsCohort;
    setCardsPage(nextPage);
    setLoading(true);
    setError("");
    try {
      const c = await listAdminCards({
        page: nextPage,
        limit: CARDS_PAGE_LIMIT,
        ...cohort ? { cohort } : {}
      });
      setCards(c.data?.items || []);
      setCardsTotal(Number(c.data?.total) || 0);
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
  async function loadUsersPage(nextPage, appliedQ, cohort) {
    const q = typeof appliedQ === "string" ? appliedQ : usersAppliedQ;
    const c = typeof cohort === "string" ? cohort : usersCohort;
    setUsersPage(nextPage);
    setLoading(true);
    setError("");
    try {
      const trimmedQ = String(q || "").trim();
      const u = await listAdminUsers({
        page: nextPage,
        limit: USERS_PAGE_LIMIT,
        ...trimmedQ ? { q: trimmedQ } : {},
        ...c ? { cohort: c } : {}
      });
      setUsers(u.data?.items || []);
      setUsersTotal(Number(u.data?.total) || 0);
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
  function handleUsersSearch() {
    const trimmed = String(usersQuery || "").trim();
    if (!trimmed) return;
    setUsersAppliedQ(trimmed);
    loadUsersPage(1, trimmed);
  }
  function handleUsersClearSearch() {
    setUsersQuery("");
    setUsersAppliedQ("");
    setUsersCohort("");
    loadUsersPage(1, "", "");
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
      userTier: ""
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
    loadUserRequestIdRef.current = id;
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
      if (loadUserRequestIdRef.current !== id) return;
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
  function handleCardSlugClick(c) {
    pendingBillingCardIdRef.current = null;
    loadUserRequestIdRef.current = null;
    loadCard(c._id);
    if (c.ownerSummary?.type === "user" && c.ownerSummary?.userId) {
      pendingBillingCardIdRef.current = String(c._id);
      loadUser(c.ownerSummary.userId);
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
    const message = typeof msg === "string" && msg.trim() ? msg.trim() : typeof err?.message === "string" && err.message.trim() ? err.message.trim() : "Request failed";
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
      setReason("");
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
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})$/.exec(v);
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
      const d2 = new Date(trimmed);
      if (!Number.isFinite(d2.getTime())) {
        return {
          ok: false,
          isoZ: null,
          date: null,
          uiError: t("err_invalid_datetime")
        };
      }
      return { ok: true, isoZ: d2.toISOString(), date: d2, uiError: null };
    }
    const d = parseDatetimeLocalToDate(trimmed);
    if (!d) {
      return {
        ok: false,
        isoZ: null,
        date: null,
        uiError: t("err_invalid_datetime")
      };
    }
    return { ok: true, isoZ: d.toISOString(), date: d, uiError: null };
  }
  const billingUserExpiresAtNorm = useMemo(
    () => normalizeAdminDateInput(billingUserExpiresAt),
    [billingUserExpiresAt]
  );
  const billingCardPaidUntilNorm = useMemo(
    () => normalizeAdminDateInput(billingCardPaidUntil),
    [billingCardPaidUntil]
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
      if (dto?._id && selectedCard2?._id === dto._id) {
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
      if (dto?._id && selectedCard2?._id === dto._id) {
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
    setCards(
      (prev) => Array.isArray(prev) ? prev.filter((c) => c?._id !== cardId) : prev
    );
    setUsers(
      (prev) => Array.isArray(prev) ? prev.map((u) => {
        if (u?.cardSummary?.cardId !== cardId) return u;
        return {
          ...u,
          cardId: null,
          cardSummary: null
        };
      }) : prev
    );
  }
  async function runDeleteAction() {
    if (!selectedCard2?._id) return;
    const r = requireReason();
    if (!r) return;
    const confirmed = window.confirm(t("confirm_delete_card"));
    if (!confirmed) return;
    setActionError((prev) => ({ ...prev, delete: "" }));
    setLoading(true);
    setError("");
    setActionLoading((prev) => ({ ...prev, delete: true }));
    try {
      await adminDeleteCard(selectedCard2._id, r);
      removeCardFromLists(selectedCard2._id);
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
    if (!selectedCard2?.user) {
      setError(t("err_card_has_no_user_owner"));
      return;
    }
    setActionError((prev) => ({ ...prev, userTier: "" }));
    setLoading(true);
    setError("");
    setActionLoading((prev) => ({ ...prev, userTier: true }));
    try {
      const until = userTierUntil ? (/* @__PURE__ */ new Date(`${userTierUntil}T23:59:59.999Z`)).toISOString() : "";
      await adminSetUserTier(selectedCard2.user, {
        tier: userTier || null,
        until,
        reason: r
      });
      const refreshed = await getAdminCardById(selectedCard2._id);
      setSelectedCard(refreshed.data);
      updateCardInList(refreshed.data);
      setReason("");
      setUserTier(refreshed.data?.ownerAdminTier || "");
      setUserTierUntil(
        toDateInputUtc(refreshed.data?.ownerAdminTierUntil)
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
      setUsers(
        (prev) => Array.isArray(prev) ? prev.filter((u) => u?._id !== selectedUser._id) : prev
      );
      setCards(
        (prev) => Array.isArray(prev) ? prev.filter((c) => {
          const owner = c?.ownerSummary;
          if (owner?.type !== "user") return true;
          return owner?.userId !== selectedUser._id;
        }) : prev
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
    if (!isAuthenticated) return;
    loadAll();
  }, [isAuthenticated]);
  useEffect(() => {
    if (!selectedCard2) return;
    setCardTier(selectedCard2?.adminTier || "");
    setCardTierUntil(toDateInputUtc(selectedCard2?.adminTierUntil));
    setUserTier(selectedCard2?.ownerAdminTier || "");
    setUserTierUntil(toDateInputUtc(selectedCard2?.ownerAdminTierUntil));
  }, [
    selectedCard2?._id,
    selectedCard2?.adminTier,
    selectedCard2?.adminTierUntil,
    selectedCard2?.ownerAdminTier,
    selectedCard2?.ownerAdminTierUntil
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
      setBillingCards([]);
      setBillingCardsStatus("idle");
      setBillingCardsError("");
      setBillingCardId("");
      setBillingCardResult(null);
    }
  }, [
    selectedUser?._id,
    selectedUser?.subscription?.expiresAt,
    selectedUser?.plan
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
          userId: billingUserIdTrimmed
        });
        if (cancelled) return;
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        setBillingCards(items);
        setBillingCardsStatus("ready");
        const pendingId = pendingBillingCardIdRef.current;
        if (pendingId) {
          pendingBillingCardIdRef.current = null;
          const inList = items.some(
            (c) => String(c?._id || "") === pendingId
          );
          if (inList) {
            setBillingCardId(pendingId);
            setBillingCardResult(null);
            return;
          }
        }
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
            (c) => String(c?._id || "") === prevId
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
    const iso = selectedCard2?.billing?.paidUntil || null;
    setBillingCardPaidUntil(isoToDatetimeLocalValue(iso));
    const currCardId = String(billingCardId || "").trim();
    if (!currCardId && selectedCard2?._id) {
      setBillingCardId(String(selectedCard2._id));
    }
  }, [selectedCard2?._id, selectedCard2?.billing?.paidUntil]);
  useEffect(() => {
    const cardId = String(selectedCard2?._id || "").trim();
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
          limit: 10
        });
        if (cancelled) return;
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
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
  }, [selectedCard2?._id]);
  if (!isAuthenticated) {
    return /* @__PURE__ */ jsx("main", { className: styles.adminRoot, dir: "rtl", children: /* @__PURE__ */ jsxs("div", { className: styles.centerCard, children: [
      /* @__PURE__ */ jsx("h1", { className: styles.title, children: t("title_admin") }),
      /* @__PURE__ */ jsx("p", { className: styles.subtitle, children: t("subtitle_login_required") }),
      /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("msg_login_as_admin") })
    ] }) });
  }
  if (accessDenied) {
    return /* @__PURE__ */ jsx("main", { className: styles.adminRoot, dir: "rtl", children: /* @__PURE__ */ jsxs("div", { className: styles.centerCard, children: [
      /* @__PURE__ */ jsx("h1", { className: styles.title, children: t("title_admin") }),
      /* @__PURE__ */ jsx("p", { className: styles.subtitle, children: t("subtitle_access_denied") }),
      /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("msg_no_admin_permissions") })
    ] }) });
  }
  function focusTabInList(tabListEl, nextId) {
    if (!tabListEl) return;
    const next = tabListEl.querySelector(
      `[role="tab"][data-tab="${nextId}"]`
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
  function renderCardDangerTab() {
    if (!selectedCard2) return null;
    return /* @__PURE__ */ jsxs("div", { className: styles.sectionBlock, children: [
      /* @__PURE__ */ jsx("div", { className: styles.sectionTitle, children: t("section_danger") }),
      /* @__PURE__ */ jsx(
        Input,
        {
          label: t("label_reason"),
          value: reason,
          onChange: (e) => setReason(e.target.value),
          placeholder: t("placeholder_reason"),
          required: true
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: styles.actionGroup, children: [
        selectedCard2.isActive ? /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            disabled: loading || actionLoading.deactivate,
            loading: actionLoading.deactivate,
            onClick: () => runAction("deactivate", async (r) => {
              const res = await adminDeactivateCard(
                selectedCard2._id,
                r
              );
              return res.data;
            }),
            children: t("btn_deactivate")
          }
        ) : /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            disabled: loading || actionLoading.reactivate,
            loading: actionLoading.reactivate,
            onClick: () => runAction("reactivate", async (r) => {
              const res = await adminReactivateCard(
                selectedCard2._id,
                r
              );
              return res.data;
            }),
            children: t("btn_reactivate")
          }
        ),
        selectedCard2.isActive && actionError.deactivate ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: actionError.deactivate }) : null,
        !selectedCard2.isActive && actionError.reactivate ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: actionError.reactivate }) : null,
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "danger",
            disabled: loading || actionLoading.delete,
            loading: actionLoading.delete,
            onClick: runDeleteAction,
            children: t("btn_delete_card_permanently")
          }
        ),
        actionError.delete ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: actionError.delete }) : null
      ] })
    ] });
  }
  function renderAnalyticsPremiumToggle() {
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("hint_analytics_premium") }),
      /* @__PURE__ */ jsxs("div", { className: styles.formRow, children: [
        /* @__PURE__ */ jsxs("label", { className: styles.toggleRow, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: Boolean(
                selectedCard2?.billing?.features?.analyticsPremium
              ),
              disabled: actionLoading.analyticsPremium || !selectedCard2?._id,
              onChange: (e) => {
                const next = e.target.checked;
                runAction("analyticsPremium", async (r) => {
                  const res = await adminSetAnalyticsPremium(
                    selectedCard2._id,
                    { enabled: next, reason: r }
                  );
                  return res.data;
                });
              }
            }
          ),
          /* @__PURE__ */ jsx("span", { children: t("label_analytics_premium") })
        ] }),
        actionError.analyticsPremium ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: actionError.analyticsPremium }) : null
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("main", { className: styles.adminRoot, dir: "rtl", children: [
    /* @__PURE__ */ jsxs("header", { className: styles.topbar, children: [
      /* @__PURE__ */ jsxs("div", { className: styles.topbarTitleWrap, children: [
        /* @__PURE__ */ jsx("h1", { className: styles.title, children: t("title_admin") }),
        /* @__PURE__ */ jsx("p", { className: styles.subtitle, children: t("subtitle_admin_secure") })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles.topbarActions, children: [
        /* @__PURE__ */ jsx(Button, { onClick: handleRefreshClick, loading, children: t("btn_refresh") }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: styles.tabs,
            role: "tablist",
            "aria-label": "מצב ניהול",
            children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: `${styles.tab} ${adminMode === "manage" ? styles.tabActive : ""}`,
                  role: "tab",
                  "aria-selected": adminMode === "manage",
                  onClick: () => setAdminMode("manage"),
                  children: "ניהול"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: `${styles.tab} ${adminMode === "blog" ? styles.tabActive : ""}`,
                  role: "tab",
                  "aria-selected": adminMode === "blog",
                  onClick: () => setAdminMode("blog"),
                  children: "בלוג"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: `${styles.tab} ${adminMode === "guides" ? styles.tabActive : ""}`,
                  role: "tab",
                  "aria-selected": adminMode === "guides",
                  onClick: () => setAdminMode("guides"),
                  children: "מדריכים"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: `${styles.tab} ${adminMode === "analytics" ? styles.tabActive : ""}`,
                  role: "tab",
                  "aria-selected": adminMode === "analytics",
                  onClick: () => setAdminMode("analytics"),
                  children: "אנליטיקה"
                }
              )
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: styles.scrollArea, children: adminMode === "manage" ? /* @__PURE__ */ jsxs("div", { className: styles.body, children: [
      /* @__PURE__ */ jsxs(
        "section",
        {
          className: styles.leftRail,
          "aria-label": "Directory",
          children: [
            /* @__PURE__ */ jsxs(
              "div",
              {
                className: `${styles.cardShell} ${styles.statsCard}`,
                children: [
                  /* @__PURE__ */ jsxs("div", { className: styles.cardHeader, children: [
                    /* @__PURE__ */ jsx("div", { className: styles.headerRow, children: /* @__PURE__ */ jsx("h2", { className: styles.h2, children: t("section_stats") }) }),
                    /* @__PURE__ */ jsx("p", { className: styles.muted, children: stats ? `${t("section_users")}: ${stats.users} · ${t(
                      "section_cards"
                    )}: ${stats.cardsTotal} · ${t(
                      "stats_anonymous_cards"
                    )}: ${stats.cardsAnonymous} · ${t(
                      "stats_user_cards"
                    )}: ${stats.cardsUserOwned} · ${t(
                      "stats_published"
                    )}: ${stats.publishedCards} · ${t(
                      "label_active"
                    )}: ${stats.activeCards}` : t("stats_none") })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: styles.cardBody, children: /* @__PURE__ */ jsxs("details", { className: styles.legendDetails, children: [
                    /* @__PURE__ */ jsx(
                      "summary",
                      {
                        className: styles.legendSummary,
                        children: t("section_legend")
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { className: styles.legend, children: [
                      /* @__PURE__ */ jsx("p", { className: styles.legendIntro, children: t("legend_intro") }),
                      /* @__PURE__ */ jsxs(
                        "section",
                        {
                          className: styles.legendGroup,
                          children: [
                            /* @__PURE__ */ jsx(
                              "h4",
                              {
                                className: styles.legendHeading,
                                children: t("legend_nav")
                              }
                            ),
                            /* @__PURE__ */ jsx("p", { children: t("legend_nav_desc") })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "section",
                        {
                          className: styles.legendGroup,
                          children: [
                            /* @__PURE__ */ jsx(
                              "h4",
                              {
                                className: styles.legendHeading,
                                children: t("legend_tab_general")
                              }
                            ),
                            /* @__PURE__ */ jsx("p", { children: t(
                              "legend_tab_general_desc"
                            ) }),
                            /* @__PURE__ */ jsxs("dl", { className: styles.legendDl, children: [
                              /* @__PURE__ */ jsx("dt", { children: t("label_slug") }),
                              /* @__PURE__ */ jsx("dd", { children: t("legend_slug_note") })
                            ] })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "section",
                        {
                          className: styles.legendGroup,
                          children: [
                            /* @__PURE__ */ jsx(
                              "h4",
                              {
                                className: styles.legendHeading,
                                children: t("legend_tab_billing")
                              }
                            ),
                            /* @__PURE__ */ jsx("p", { children: t(
                              "legend_tab_billing_desc"
                            ) }),
                            /* @__PURE__ */ jsxs("dl", { className: styles.legendDl, children: [
                              /* @__PURE__ */ jsx("dt", { children: t("legend_provenance") }),
                              /* @__PURE__ */ jsx("dd", { children: t(
                                "legend_provenance_desc"
                              ) })
                            ] })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "section",
                        {
                          className: styles.legendGroup,
                          children: [
                            /* @__PURE__ */ jsx(
                              "h4",
                              {
                                className: styles.legendHeading,
                                children: t("legend_tab_actions")
                              }
                            ),
                            /* @__PURE__ */ jsx("p", { children: t(
                              "legend_tab_actions_items"
                            ) })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "section",
                        {
                          className: styles.legendGroup,
                          children: [
                            /* @__PURE__ */ jsx(
                              "h4",
                              {
                                className: styles.legendHeading,
                                children: t("legend_tab_danger")
                              }
                            ),
                            /* @__PURE__ */ jsx("p", { children: t(
                              "legend_tab_danger_desc"
                            ) })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "section",
                        {
                          className: styles.legendGroup,
                          children: [
                            /* @__PURE__ */ jsx(
                              "h4",
                              {
                                className: styles.legendHeading,
                                children: t("legend_billing_crud")
                              }
                            ),
                            /* @__PURE__ */ jsx("p", { children: t(
                              "legend_billing_crud_desc"
                            ) }),
                            /* @__PURE__ */ jsxs("dl", { className: styles.legendDl, children: [
                              /* @__PURE__ */ jsx("dt", { children: t(
                                "section_user_subscription"
                              ) }),
                              /* @__PURE__ */ jsx("dd", { children: t("legend_user_sub") }),
                              /* @__PURE__ */ jsx("dt", { children: t(
                                "section_card_billing_crud"
                              ) }),
                              /* @__PURE__ */ jsx("dd", { children: t(
                                "legend_card_billing"
                              ) })
                            ] })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "section",
                        {
                          className: styles.legendGroup,
                          children: [
                            /* @__PURE__ */ jsx(
                              "h4",
                              {
                                className: styles.legendHeading,
                                children: t(
                                  "legend_what_affects_what_title"
                                )
                              }
                            ),
                            /* @__PURE__ */ jsx("p", { children: t(
                              "legend_what_affects_what_tier"
                            ) }),
                            /* @__PURE__ */ jsx("p", { children: t(
                              "legend_what_affects_what_billing"
                            ) }),
                            /* @__PURE__ */ jsx("p", { children: t(
                              "legend_what_affects_what_rules"
                            ) })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsx("p", { className: styles.legendNote, children: t("legend_ltr_note") })
                    ] })
                  ] }) })
                ]
              }
            ),
            error ? /* @__PURE__ */ jsx(
              FlashBanner,
              {
                type: "error",
                message: error,
                autoHideMs: 0,
                onDismiss: () => setError("")
              }
            ) : null,
            /* @__PURE__ */ jsxs(
              "details",
              {
                className: `${styles.queuePanel} ${styles.queueCards}`,
                children: [
                  /* @__PURE__ */ jsxs("summary", { className: styles.queueSummary, children: [
                    t("section_cards"),
                    /* @__PURE__ */ jsxs("span", { className: styles.queueCount, children: [
                      "(",
                      cardsTotal,
                      ")"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: styles.queueBody, children: [
                    /* @__PURE__ */ jsxs("div", { className: styles.directoryTools, children: [
                      /* @__PURE__ */ jsxs("div", { className: styles.searchRow, children: [
                        /* @__PURE__ */ jsx(
                          Input,
                          {
                            label: "חיפוש כרטיסים",
                            value: cardsQuery,
                            onChange: (e) => setCardsQuery(
                              e.target.value
                            ),
                            placeholder: "סלאג או אימייל בעלים",
                            className: styles.searchInput
                          }
                        ),
                        String(cardsQuery || "").trim() ? /* @__PURE__ */ jsx(
                          Button,
                          {
                            variant: "secondary",
                            size: "small",
                            onClick: () => setCardsQuery(""),
                            children: "נקה"
                          }
                        ) : null
                      ] }),
                      /* @__PURE__ */ jsx("div", { className: styles.searchRow, children: [
                        { key: "", label: "הכל" },
                        {
                          key: "trial",
                          label: "ניסיון"
                        },
                        {
                          key: "paid",
                          label: "משלמים"
                        },
                        {
                          key: "free",
                          label: "חינם"
                        },
                        {
                          key: "anonymous",
                          label: "אנונימי"
                        }
                      ].map((c) => /* @__PURE__ */ jsx(
                        Button,
                        {
                          variant: cardsCohort === c.key ? "primary" : "secondary",
                          size: "small",
                          disabled: loading,
                          onClick: () => {
                            setCardsCohort(c.key);
                            loadCardsPage(1, c.key);
                          },
                          children: c.label
                        },
                        c.key || "all"
                      )) }),
                      /* @__PURE__ */ jsx("p", { className: styles.muted, children: String(cardsQuery || "").trim() ? `מסנן ${filteredCards.length} מתוך ${cards.length} בעמוד` : `עמוד ${cardsPage} · ${cards.length} מתוך ${cardsTotal}` })
                    ] }),
                    /* @__PURE__ */ jsxs("table", { className: styles.table, children: [
                      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
                        /* @__PURE__ */ jsx("th", { children: t("th_slug") }),
                        /* @__PURE__ */ jsx("th", { children: t("th_owner") }),
                        /* @__PURE__ */ jsx("th", { children: t("label_status") }),
                        /* @__PURE__ */ jsx("th", { children: t("label_active") }),
                        /* @__PURE__ */ jsx("th", { children: t("th_updated") })
                      ] }) }),
                      /* @__PURE__ */ jsx("tbody", { children: filteredCards.map((c) => /* @__PURE__ */ jsxs("tr", { children: [
                        /* @__PURE__ */ jsx("td", { "data-label": "סלאג", children: /* @__PURE__ */ jsx(
                          "button",
                          {
                            className: styles.rowBtn,
                            onClick: () => handleCardSlugClick(
                              c
                            ),
                            type: "button",
                            disabled: loading,
                            title: c._id,
                            children: /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles.ltr,
                                dir: "ltr",
                                children: c.slug || t(
                                  "label_no_slug"
                                )
                              }
                            )
                          }
                        ) }),
                        /* @__PURE__ */ jsx("td", { "data-label": "בעלות", children: c?.ownerSummary?.type === "user" ? /* @__PURE__ */ jsx(
                          "span",
                          {
                            title: c.ownerSummary.email || "",
                            className: styles.truncate,
                            dir: "ltr",
                            children: /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles.ltr,
                                dir: "ltr",
                                children: c.ownerSummary.email || "-"
                              }
                            )
                          }
                        ) : c?.ownerSummary?.type === "anonymous" ? /* @__PURE__ */ jsx(
                          "span",
                          {
                            className: styles.muted,
                            children: t(
                              "owner_anonymous"
                            )
                          }
                        ) : "-" }),
                        /* @__PURE__ */ jsx("td", { "data-label": "סטטוס", children: cardStatusHe(c.status) }),
                        /* @__PURE__ */ jsx("td", { "data-label": "פעיל", children: boolHe(!!c.isActive) }),
                        /* @__PURE__ */ jsx("td", { "data-label": "עודכן", children: formatDate(
                          c.updatedAt
                        ) })
                      ] }, c._id)) })
                    ] }),
                    selectedCardId && !selectedCard2 ? /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("msg_loading_card") }) : null,
                    /* @__PURE__ */ jsxs("div", { className: styles.pager, children: [
                      /* @__PURE__ */ jsxs("span", { className: styles.pagerMeta, children: [
                        "סה״כ: ",
                        cardsTotal
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: styles.pagerControls, children: [
                        /* @__PURE__ */ jsx(
                          Button,
                          {
                            variant: "secondary",
                            size: "small",
                            onClick: () => loadCardsPage(
                              Math.max(
                                1,
                                cardsPage - 1
                              )
                            ),
                            disabled: loading || cardsPage <= 1,
                            children: "הקודם"
                          }
                        ),
                        /* @__PURE__ */ jsxs("span", { className: styles.pagerPage, children: [
                          "עמוד ",
                          cardsPage
                        ] }),
                        /* @__PURE__ */ jsx(
                          Button,
                          {
                            variant: "secondary",
                            size: "small",
                            onClick: () => loadCardsPage(cardsPage + 1),
                            disabled: loading || cardsPage * CARDS_PAGE_LIMIT >= cardsTotal,
                            children: "הבא"
                          }
                        )
                      ] })
                    ] })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "details",
              {
                className: `${styles.queuePanel} ${styles.queueUsers}`,
                children: [
                  /* @__PURE__ */ jsxs("summary", { className: styles.queueSummary, children: [
                    t("section_users"),
                    /* @__PURE__ */ jsxs("span", { className: styles.queueCount, children: [
                      "(",
                      usersTotal,
                      ")"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: styles.queueBody, children: [
                    /* @__PURE__ */ jsxs("div", { className: styles.directoryTools, children: [
                      /* @__PURE__ */ jsxs("div", { className: styles.searchRow, children: [
                        /* @__PURE__ */ jsx(
                          Input,
                          {
                            label: "חיפוש משתמשים",
                            value: usersQuery,
                            onChange: (e) => setUsersQuery(
                              e.target.value
                            ),
                            onKeyDown: (e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleUsersSearch();
                              }
                            },
                            placeholder: "אימייל",
                            className: styles.searchInput
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          Button,
                          {
                            variant: "secondary",
                            size: "small",
                            onClick: handleUsersSearch,
                            disabled: loading || !String(
                              usersQuery || ""
                            ).trim(),
                            children: "חפש"
                          }
                        ),
                        String(usersQuery || "").trim() || usersAppliedQ || usersCohort ? /* @__PURE__ */ jsx(
                          Button,
                          {
                            variant: "secondary",
                            size: "small",
                            onClick: handleUsersClearSearch,
                            children: "נקה"
                          }
                        ) : null
                      ] }),
                      /* @__PURE__ */ jsx("div", { className: styles.searchRow, children: [
                        "",
                        "trial",
                        "paying",
                        "non-paying"
                      ].map((c) => /* @__PURE__ */ jsx(
                        Button,
                        {
                          variant: usersCohort === c ? "primary" : "secondary",
                          size: "small",
                          disabled: loading,
                          onClick: () => {
                            setUsersCohort(c);
                            loadUsersPage(
                              1,
                              void 0,
                              c
                            );
                          },
                          children: c === "trial" ? "ניסיון" : c === "paying" ? "משלמים" : c === "non-paying" ? "לא משלמים" : "הכל"
                        },
                        c || "all"
                      )) }),
                      /* @__PURE__ */ jsx("p", { className: styles.muted, children: `עמוד ${usersPage} · ${users.length} מתוך ${usersTotal}` })
                    ] }),
                    /* @__PURE__ */ jsxs("table", { className: styles.table, children: [
                      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
                        /* @__PURE__ */ jsx("th", { children: t("th_email") }),
                        /* @__PURE__ */ jsx("th", { children: t("th_card") }),
                        /* @__PURE__ */ jsx("th", { children: t("th_role") }),
                        /* @__PURE__ */ jsx("th", { children: t("th_created") })
                      ] }) }),
                      /* @__PURE__ */ jsx("tbody", { children: users.map((u) => /* @__PURE__ */ jsxs("tr", { children: [
                        /* @__PURE__ */ jsx("td", { "data-label": "אימייל", children: /* @__PURE__ */ jsx(
                          "button",
                          {
                            className: styles.rowBtn,
                            type: "button",
                            onClick: () => loadUser(u._id),
                            disabled: loading,
                            title: u._id,
                            children: /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles.ltr,
                                dir: "ltr",
                                children: u.email
                              }
                            )
                          }
                        ) }),
                        /* @__PURE__ */ jsx("td", { "data-label": "כרטיס", children: u?.cardSummary?.slug ? /* @__PURE__ */ jsxs(
                          "button",
                          {
                            className: styles.rowBtn,
                            type: "button",
                            onClick: () => loadCard(
                              u.cardSummary.cardId
                            ),
                            disabled: loading,
                            title: u.cardSummary.cardId,
                            children: [
                              /* @__PURE__ */ jsx(
                                "span",
                                {
                                  className: styles.ltr,
                                  dir: "ltr",
                                  children: u.cardSummary.slug
                                }
                              ),
                              " ",
                              "(",
                              /* @__PURE__ */ jsx(
                                "span",
                                {
                                  className: styles.ltr,
                                  dir: "ltr",
                                  children: cardStatusHe(
                                    u.cardSummary.status
                                  )
                                }
                              ),
                              ")",
                              u?.cardSummary?.ownershipMismatch ? /* @__PURE__ */ jsx(
                                "span",
                                {
                                  className: styles.mismatchBadge,
                                  children: "⚠ mismatch"
                                }
                              ) : null
                            ]
                          }
                        ) : u?.cardSummary?.missing ? /* @__PURE__ */ jsx(
                          "span",
                          {
                            className: styles.muted,
                            children: t(
                              "label_missing"
                            )
                          }
                        ) : "-" }),
                        /* @__PURE__ */ jsx("td", { "data-label": "תפקיד", children: roleHe(u.role) }),
                        /* @__PURE__ */ jsx("td", { "data-label": "נוצר", children: formatDate(
                          u.createdAt
                        ) })
                      ] }, u._id)) })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: styles.pager, children: [
                      /* @__PURE__ */ jsxs("span", { className: styles.pagerMeta, children: [
                        "סה״כ: ",
                        usersTotal
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: styles.pagerControls, children: [
                        /* @__PURE__ */ jsx(
                          Button,
                          {
                            variant: "secondary",
                            size: "small",
                            onClick: () => loadUsersPage(
                              Math.max(
                                1,
                                usersPage - 1
                              )
                            ),
                            disabled: loading || usersPage <= 1,
                            children: "הקודם"
                          }
                        ),
                        /* @__PURE__ */ jsxs("span", { className: styles.pagerPage, children: [
                          "עמוד ",
                          usersPage
                        ] }),
                        /* @__PURE__ */ jsx(
                          Button,
                          {
                            variant: "secondary",
                            size: "small",
                            onClick: () => loadUsersPage(usersPage + 1),
                            disabled: loading || usersPage * USERS_PAGE_LIMIT >= usersTotal,
                            children: "הבא"
                          }
                        )
                      ] })
                    ] })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "details",
              {
                className: `${styles.queuePanel} ${styles.queueOrgs}`,
                children: [
                  /* @__PURE__ */ jsx("summary", { className: styles.queueSummary, children: t("section_orgs") }),
                  /* @__PURE__ */ jsx("div", { className: styles.queueBody, children: /* @__PURE__ */ jsx(AdminOrganizationsView, {}) })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "div",
              {
                className: `${styles.cardShell} ${styles.selectedCard} ${styles.mobileOnly}`,
                children: [
                  /* @__PURE__ */ jsxs("div", { className: styles.cardHeader, children: [
                    /* @__PURE__ */ jsx("div", { className: styles.headerRow, children: /* @__PURE__ */ jsx("h2", { className: styles.h2, children: t("section_selected_card") }) }),
                    selectedCard2 ? /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles.selectedHeaderStrip,
                        children: [
                          /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.selectedPrimary,
                              children: [
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.selectedLabel,
                                    children: [
                                      t("label_slug"),
                                      ":"
                                    ]
                                  }
                                ),
                                " ",
                                /* @__PURE__ */ jsx(
                                  "span",
                                  {
                                    className: `${styles.ltr} ${styles.selectedValue}`,
                                    dir: "ltr",
                                    title: selectedCard2.slug || "",
                                    children: selectedCard2.slug || ""
                                  }
                                )
                              ]
                            }
                          ),
                          selectedCardPublicUrl && /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.selectedPrimary,
                              children: [
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.selectedLabel,
                                    children: [
                                      t("label_card_public_url"),
                                      ":"
                                    ]
                                  }
                                ),
                                " ",
                                /* @__PURE__ */ jsx(
                                  "a",
                                  {
                                    href: selectedCardPublicUrl,
                                    className: styles.cardPublicLink,
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                    dir: "ltr",
                                    "aria-label": "פתח כרטיס ציבורי בלשונית חדשה",
                                    children: selectedCardPublicUrl
                                  }
                                )
                              ]
                            }
                          ),
                          /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.selectedMeta,
                              children: [
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.metaPill,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "span",
                                        {
                                          className: styles.metaKey,
                                          children: [
                                            t("label_id"),
                                            ":"
                                          ]
                                        }
                                      ),
                                      " ",
                                      /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          title: selectedCard2._id,
                                          children: selectedCard2._id
                                        }
                                      )
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.metaPill,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "span",
                                        {
                                          className: styles.metaKey,
                                          children: [
                                            t("label_status"),
                                            ":"
                                          ]
                                        }
                                      ),
                                      " ",
                                      /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          children: cardStatusHe(
                                            selectedCard2.status
                                          )
                                        }
                                      )
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.metaPill,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "span",
                                        {
                                          className: styles.metaKey,
                                          children: [
                                            t("label_active"),
                                            ":"
                                          ]
                                        }
                                      ),
                                      " ",
                                      /* @__PURE__ */ jsx("span", { children: boolHe(
                                        !!selectedCard2.isActive
                                      ) })
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.metaPill,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "span",
                                        {
                                          className: styles.metaKey,
                                          children: [
                                            t("label_owner"),
                                            ":"
                                          ]
                                        }
                                      ),
                                      " ",
                                      /* @__PURE__ */ jsx("span", { children: selectedCardOwnerLabel })
                                    ]
                                  }
                                )
                              ]
                            }
                          )
                        ]
                      }
                    ) : null,
                    selectedCard2 ? /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles.commandBar,
                        "aria-label": "Command bar",
                        children: [
                          /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.commandBarButtons,
                              children: [
                                /* @__PURE__ */ jsx(
                                  Button,
                                  {
                                    variant: "secondary",
                                    size: "small",
                                    className: styles.commandBtn,
                                    onClick: () => setSelectedTab(
                                      "billing"
                                    ),
                                    children: "חיוב"
                                  }
                                ),
                                /* @__PURE__ */ jsx(
                                  Button,
                                  {
                                    variant: "secondary",
                                    size: "small",
                                    className: styles.commandBtn,
                                    onClick: () => setSelectedTab(
                                      "actions"
                                    ),
                                    children: "פעולות"
                                  }
                                ),
                                /* @__PURE__ */ jsx(
                                  Button,
                                  {
                                    variant: "secondary",
                                    size: "small",
                                    className: styles.commandBtn,
                                    onClick: () => setSelectedTab("danger"),
                                    children: "סכנה"
                                  }
                                )
                              ]
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "div",
                            {
                              className: styles.commandBarHint,
                              children: "קיצורי דרך לכרטיס הנבחר"
                            }
                          )
                        ]
                      }
                    ) : null,
                    /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles.tabs,
                        role: "tablist",
                        "aria-label": "Selected card tabs",
                        ref: selectedTabListRefMobile,
                        onKeyDown: (e) => handleTabListKeyDown(e, {
                          current: selectedTab,
                          setCurrent: setSelectedTab,
                          order: [
                            "general",
                            "billing",
                            "actions",
                            "danger"
                          ],
                          tabListRef: selectedTabListRefMobile
                        }),
                        children: [
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              className: `${styles.tab} ${selectedTab === "general" ? styles.tabActive : ""}`,
                              role: "tab",
                              "data-tab": "general",
                              "aria-selected": selectedTab === "general",
                              "aria-controls": "admin-selected-panel-mobile",
                              onClick: () => setSelectedTab("general"),
                              children: "כללי"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              className: `${styles.tab} ${selectedTab === "billing" ? styles.tabActive : ""}`,
                              role: "tab",
                              "data-tab": "billing",
                              "aria-selected": selectedTab === "billing",
                              "aria-controls": "admin-selected-panel-mobile",
                              onClick: () => setSelectedTab("billing"),
                              children: "חיוב"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              className: `${styles.tab} ${selectedTab === "actions" ? styles.tabActive : ""}`,
                              role: "tab",
                              "data-tab": "actions",
                              "aria-selected": selectedTab === "actions",
                              "aria-controls": "admin-selected-panel-mobile",
                              onClick: () => setSelectedTab("actions"),
                              children: "פעולות"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              className: `${styles.tab} ${selectedTab === "danger" ? styles.tabActive : ""}`,
                              role: "tab",
                              "data-tab": "danger",
                              "aria-selected": selectedTab === "danger",
                              "aria-controls": "admin-selected-panel-mobile",
                              onClick: () => setSelectedTab("danger"),
                              children: "סכנה"
                            }
                          )
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs(
                    "div",
                    {
                      id: "admin-selected-panel-mobile",
                      className: styles.cardBody,
                      role: "tabpanel",
                      "aria-label": "Selected card panel",
                      children: [
                        !selectedCard2 ? /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("msg_select_card") }) : null,
                        selectedCard2 ? /* @__PURE__ */ jsxs(Fragment, { children: [
                          selectedTab === "general" ? /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.sectionBlock,
                              children: [
                                /* @__PURE__ */ jsx(
                                  "div",
                                  {
                                    className: styles.sectionTitle,
                                    children: t(
                                      "section_card_details"
                                    )
                                  }
                                ),
                                /* @__PURE__ */ jsxs("dl", { className: styles.kvDl, children: [
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t("label_id")
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          title: selectedCard2._id,
                                          children: selectedCard2._id
                                        }
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t("label_slug")
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          title: selectedCard2.slug || "",
                                          children: selectedCard2.slug || ""
                                        }
                                      )
                                    }
                                  ),
                                  selectedCardPublicUrl && /* @__PURE__ */ jsxs(Fragment, { children: [
                                    /* @__PURE__ */ jsx(
                                      "dt",
                                      {
                                        className: styles.kvDt,
                                        children: t("label_card_public_url")
                                      }
                                    ),
                                    /* @__PURE__ */ jsx(
                                      "dd",
                                      {
                                        className: styles.kvDd,
                                        children: /* @__PURE__ */ jsx(
                                          "a",
                                          {
                                            href: selectedCardPublicUrl,
                                            className: styles.cardPublicLink,
                                            target: "_blank",
                                            rel: "noopener noreferrer",
                                            dir: "ltr",
                                            "aria-label": "פתח כרטיס ציבורי בלשונית חדשה",
                                            children: selectedCardPublicUrl
                                          }
                                        )
                                      }
                                    )
                                  ] }),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t("label_status")
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          children: cardStatusHe(
                                            selectedCard2.status
                                          )
                                        }
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t("label_active")
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx("span", { children: boolHe(
                                        !!selectedCard2.isActive
                                      ) })
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t("label_owner")
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx("span", { children: selectedCardOwnerLabel })
                                    }
                                  )
                                ] })
                              ]
                            }
                          ) : null,
                          selectedTab === "billing" ? /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.sectionBlock,
                              children: [
                                /* @__PURE__ */ jsx(
                                  "div",
                                  {
                                    className: styles.sectionTitle,
                                    children: "Billing"
                                  }
                                ),
                                /* @__PURE__ */ jsxs("dl", { className: styles.kvDl, children: [
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t(
                                        "label_effective_plan"
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsxs(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: [
                                        /* @__PURE__ */ jsx("span", { children: planHe(
                                          selectedEffectivePlan
                                        ) }),
                                        " · ",
                                        t(
                                          "label_entitled"
                                        ),
                                        ":",
                                        " ",
                                        /* @__PURE__ */ jsx("span", { children: boolHe(
                                          selectedIsEntitled
                                        ) }),
                                        " · ",
                                        t(
                                          "label_paid"
                                        ),
                                        ":",
                                        " ",
                                        /* @__PURE__ */ jsx("span", { children: boolHe(
                                          selectedIsPaid
                                        ) })
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t(
                                        "label_effective_tier"
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsxs(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: [
                                        /* @__PURE__ */ jsx("span", { children: tierHe(
                                          selectedEffectiveTier
                                        ) }),
                                        " · ",
                                        t(
                                          "label_tier_source"
                                        ),
                                        ":",
                                        " ",
                                        /* @__PURE__ */ jsx(
                                          "span",
                                          {
                                            className: styles.ltr,
                                            dir: "ltr",
                                            children: selectedTierSource
                                          }
                                        ),
                                        selectedTierUntil ? ` · ${t(
                                          "label_until"
                                        )} ${formatDate(
                                          selectedTierUntil
                                        )}` : ""
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t(
                                        "label_trial_ends"
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          children: selectedCard2?.trialEndsAtIsrael || formatDate(
                                            selectedCard2.trialEndsAt
                                          )
                                        }
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t(
                                        "label_effective_billing"
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsxs(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: [
                                        /* @__PURE__ */ jsxs(
                                          "span",
                                          {
                                            className: styles.ltr,
                                            dir: "ltr",
                                            children: [
                                              selectedBilling?.source || "",
                                              " ",
                                              "/",
                                              " ",
                                              selectedBilling?.plan ? planHe(
                                                selectedBilling.plan
                                              ) : ""
                                            ]
                                          }
                                        ),
                                        " ",
                                        selectedBilling?.untilIsrael ? `${t(
                                          "label_until"
                                        )} ${selectedBilling.untilIsrael}` : selectedBilling?.until ? `${t(
                                          "label_until"
                                        )} ${formatDate(
                                          selectedBilling.until
                                        )}` : ""
                                      ]
                                    }
                                  )
                                ] }),
                                /* @__PURE__ */ jsxs(
                                  "div",
                                  {
                                    className: styles.provenancePanel,
                                    children: [
                                      /* @__PURE__ */ jsx(
                                        "div",
                                        {
                                          className: styles.provenanceHeader,
                                          children: /* @__PURE__ */ jsxs(
                                            "div",
                                            {
                                              className: styles.provenanceHeaderLeft,
                                              children: [
                                                /* @__PURE__ */ jsxs(
                                                  "span",
                                                  {
                                                    className: styles.provenancePill,
                                                    children: [
                                                      t(
                                                        "section_provenance"
                                                      ),
                                                      ":",
                                                      " ",
                                                      /* @__PURE__ */ jsx(
                                                        "span",
                                                        {
                                                          className: styles.ltr,
                                                          dir: "ltr",
                                                          children: selectedProvenanceSource || "-"
                                                        }
                                                      )
                                                    ]
                                                  }
                                                ),
                                                selectedLatestAudit ? /* @__PURE__ */ jsxs(
                                                  "span",
                                                  {
                                                    className: styles.muted,
                                                    children: [
                                                      t(
                                                        "label_latest_audit"
                                                      ),
                                                      ":",
                                                      " ",
                                                      /* @__PURE__ */ jsxs(
                                                        "span",
                                                        {
                                                          className: styles.ltr,
                                                          dir: "ltr",
                                                          children: [
                                                            selectedLatestAudit.action || "",
                                                            selectedLatestAudit.mode ? ` (${selectedLatestAudit.mode})` : ""
                                                          ]
                                                        }
                                                      )
                                                    ]
                                                  }
                                                ) : null
                                              ]
                                            }
                                          )
                                        }
                                      ),
                                      /* @__PURE__ */ jsxs(
                                        "dl",
                                        {
                                          className: styles.kvDl,
                                          children: [
                                            /* @__PURE__ */ jsx(
                                              "dt",
                                              {
                                                className: styles.kvDt,
                                                children: t(
                                                  "label_raw_billing"
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              "dd",
                                              {
                                                className: styles.kvDd,
                                                children: /* @__PURE__ */ jsxs(
                                                  "span",
                                                  {
                                                    className: styles.ltr,
                                                    dir: "ltr",
                                                    children: [
                                                      "status=",
                                                      billingStatusHe(
                                                        selectedCard2?.billing?.status
                                                      ),
                                                      selectedCard2?.billing?.plan ? ` · plan=${planHe(selectedCard2.billing.plan)}` : "",
                                                      selectedCard2?.billing?.paidUntil ? ` · paidUntil=${selectedCard2.billing.paidUntil}` : ""
                                                    ]
                                                  }
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              "dt",
                                              {
                                                className: styles.kvDt,
                                                children: t(
                                                  "label_raw_payer"
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              "dd",
                                              {
                                                className: styles.kvDd,
                                                children: /* @__PURE__ */ jsx(
                                                  "span",
                                                  {
                                                    className: styles.ltr,
                                                    dir: "ltr",
                                                    children: selectedCard2?.billing?.payer ? `type=${selectedCard2.billing.payer.type || ""} · source=${selectedCard2.billing.payer.source || ""}${selectedCard2.billing.payer.updatedAt ? ` · updatedAt=${selectedCard2.billing.payer.updatedAt}` : ""}` : "-"
                                                  }
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              "dt",
                                              {
                                                className: styles.kvDt,
                                                children: t(
                                                  "label_audit_history"
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              "dd",
                                              {
                                                className: styles.kvDd,
                                                children: selectedAuditStatus === "loading" ? /* @__PURE__ */ jsx(
                                                  "span",
                                                  {
                                                    className: styles.muted,
                                                    children: t(
                                                      "msg_audit_loading"
                                                    )
                                                  }
                                                ) : selectedAuditStatus === "error" ? /* @__PURE__ */ jsx(
                                                  "span",
                                                  {
                                                    className: styles.errorText,
                                                    children: selectedAuditError
                                                  }
                                                ) : selectedAuditItems.length === 0 ? /* @__PURE__ */ jsx(
                                                  "span",
                                                  {
                                                    className: styles.muted,
                                                    children: t(
                                                      "msg_audit_empty"
                                                    )
                                                  }
                                                ) : /* @__PURE__ */ jsx(
                                                  "div",
                                                  {
                                                    className: styles.auditList,
                                                    children: selectedAuditItems.map(
                                                      (a, idx) => /* @__PURE__ */ jsxs(
                                                        "div",
                                                        {
                                                          className: styles.auditRow,
                                                          children: [
                                                            /* @__PURE__ */ jsxs(
                                                              "div",
                                                              {
                                                                className: styles.auditMeta,
                                                                children: [
                                                                  /* @__PURE__ */ jsxs("span", { children: [
                                                                    /* @__PURE__ */ jsxs(
                                                                      "span",
                                                                      {
                                                                        className: styles.auditKey,
                                                                        children: [
                                                                          t(
                                                                            "label_when"
                                                                          ),
                                                                          ":"
                                                                        ]
                                                                      }
                                                                    ),
                                                                    " ",
                                                                    /* @__PURE__ */ jsx(
                                                                      "span",
                                                                      {
                                                                        className: styles.ltr,
                                                                        dir: "ltr",
                                                                        children: formatDate(
                                                                          a?.createdAt
                                                                        )
                                                                      }
                                                                    )
                                                                  ] }),
                                                                  /* @__PURE__ */ jsxs("span", { children: [
                                                                    /* @__PURE__ */ jsxs(
                                                                      "span",
                                                                      {
                                                                        className: styles.auditKey,
                                                                        children: [
                                                                          t(
                                                                            "label_action"
                                                                          ),
                                                                          ":"
                                                                        ]
                                                                      }
                                                                    ),
                                                                    " ",
                                                                    /* @__PURE__ */ jsx(
                                                                      "span",
                                                                      {
                                                                        className: styles.ltr,
                                                                        dir: "ltr",
                                                                        children: a?.action || ""
                                                                      }
                                                                    )
                                                                  ] }),
                                                                  a?.mode ? /* @__PURE__ */ jsxs("span", { children: [
                                                                    /* @__PURE__ */ jsxs(
                                                                      "span",
                                                                      {
                                                                        className: styles.auditKey,
                                                                        children: [
                                                                          t(
                                                                            "label_mode"
                                                                          ),
                                                                          ":"
                                                                        ]
                                                                      }
                                                                    ),
                                                                    " ",
                                                                    /* @__PURE__ */ jsx(
                                                                      "span",
                                                                      {
                                                                        className: styles.ltr,
                                                                        dir: "ltr",
                                                                        children: a.mode
                                                                      }
                                                                    )
                                                                  ] }) : null,
                                                                  a?.byAdmin ? /* @__PURE__ */ jsxs("span", { children: [
                                                                    /* @__PURE__ */ jsxs(
                                                                      "span",
                                                                      {
                                                                        className: styles.auditKey,
                                                                        children: [
                                                                          t(
                                                                            "label_by_admin"
                                                                          ),
                                                                          ":"
                                                                        ]
                                                                      }
                                                                    ),
                                                                    " ",
                                                                    /* @__PURE__ */ jsx(
                                                                      "span",
                                                                      {
                                                                        className: styles.ltr,
                                                                        dir: "ltr",
                                                                        children: a?.byAdminEmail || a.byAdmin
                                                                      }
                                                                    )
                                                                  ] }) : null
                                                                ]
                                                              }
                                                            ),
                                                            a?.reason ? /* @__PURE__ */ jsxs(
                                                              "div",
                                                              {
                                                                className: styles.auditReason,
                                                                children: [
                                                                  /* @__PURE__ */ jsxs(
                                                                    "span",
                                                                    {
                                                                      className: styles.auditKey,
                                                                      children: [
                                                                        t(
                                                                          "label_reason"
                                                                        ),
                                                                        ":"
                                                                      ]
                                                                    }
                                                                  ),
                                                                  " ",
                                                                  a.reason
                                                                ]
                                                              }
                                                            ) : null
                                                          ]
                                                        },
                                                        `${a?.createdAt || ""}-${idx}`
                                                      )
                                                    )
                                                  }
                                                )
                                              }
                                            )
                                          ]
                                        }
                                      )
                                    ]
                                  }
                                )
                              ]
                            }
                          ) : null,
                          selectedTab === "actions" ? /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.sectionBlock,
                              children: [
                                /* @__PURE__ */ jsx(
                                  "div",
                                  {
                                    className: styles.sectionTitle,
                                    children: t(
                                      "section_admin_actions"
                                    )
                                  }
                                ),
                                /* @__PURE__ */ jsx(
                                  Input,
                                  {
                                    label: t(
                                      "label_reason"
                                    ),
                                    value: reason,
                                    onChange: (e) => setReason(
                                      e.target.value
                                    ),
                                    placeholder: t(
                                      "placeholder_reason"
                                    ),
                                    required: true
                                  }
                                ),
                                renderAnalyticsPremiumToggle(),
                                /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("hint_extend_trial") }),
                                /* @__PURE__ */ jsxs(
                                  "div",
                                  {
                                    className: styles.actionGroup,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "div",
                                        {
                                          className: styles.formRow,
                                          children: [
                                            /* @__PURE__ */ jsxs(
                                              "label",
                                              {
                                                className: styles.selectField,
                                                children: [
                                                  /* @__PURE__ */ jsx(
                                                    "span",
                                                    {
                                                      className: styles.selectLabel,
                                                      children: t(
                                                        "label_trial_mode"
                                                      )
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsxs(
                                                    "select",
                                                    {
                                                      className: styles.select,
                                                      value: trialMode,
                                                      onChange: (e) => setTrialMode(
                                                        e.target.value
                                                      ),
                                                      children: [
                                                        /* @__PURE__ */ jsx("option", { value: "days", children: t(
                                                          "opt_trial_mode_days"
                                                        ) }),
                                                        /* @__PURE__ */ jsx("option", { value: "exact", children: t(
                                                          "opt_trial_mode_exact"
                                                        ) })
                                                      ]
                                                    }
                                                  )
                                                ]
                                              }
                                            ),
                                            /* @__PURE__ */ jsxs(
                                              "label",
                                              {
                                                className: styles.selectField,
                                                children: [
                                                  /* @__PURE__ */ jsx(
                                                    "span",
                                                    {
                                                      className: styles.selectLabel,
                                                      children: t(
                                                        "label_trial_days"
                                                      )
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsx(
                                                    "select",
                                                    {
                                                      className: styles.select,
                                                      value: trialDays,
                                                      onChange: (e) => setTrialDays(
                                                        Number(
                                                          e.target.value
                                                        )
                                                      ),
                                                      disabled: trialMode !== "days",
                                                      children: Array.from(
                                                        {
                                                          length: 15
                                                        },
                                                        (_, i) => i
                                                      ).map(
                                                        (n) => /* @__PURE__ */ jsx(
                                                          "option",
                                                          {
                                                            value: n,
                                                            children: n
                                                          },
                                                          n
                                                        )
                                                      )
                                                    }
                                                  )
                                                ]
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              Input,
                                              {
                                                label: t(
                                                  "label_trial_date_il"
                                                ),
                                                type: "date",
                                                value: trialUntilDate,
                                                onChange: (e) => setTrialUntilDate(
                                                  e.target.value
                                                ),
                                                disabled: trialMode !== "exact"
                                              }
                                            ),
                                            /* @__PURE__ */ jsxs(
                                              "label",
                                              {
                                                className: styles.selectField,
                                                children: [
                                                  /* @__PURE__ */ jsx(
                                                    "span",
                                                    {
                                                      className: styles.selectLabel,
                                                      children: t(
                                                        "label_trial_hour"
                                                      )
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsx(
                                                    "select",
                                                    {
                                                      className: styles.select,
                                                      value: trialUntilHour,
                                                      onChange: (e) => setTrialUntilHour(
                                                        e.target.value
                                                      ),
                                                      disabled: trialMode !== "exact",
                                                      children: Array.from(
                                                        {
                                                          length: 24
                                                        },
                                                        (_, i) => i
                                                      ).map(
                                                        (h) => {
                                                          const hh = String(
                                                            h
                                                          ).padStart(
                                                            2,
                                                            "0"
                                                          );
                                                          return /* @__PURE__ */ jsx(
                                                            "option",
                                                            {
                                                              value: hh,
                                                              children: hh
                                                            },
                                                            hh
                                                          );
                                                        }
                                                      )
                                                    }
                                                  )
                                                ]
                                              }
                                            ),
                                            /* @__PURE__ */ jsxs(
                                              "label",
                                              {
                                                className: styles.selectField,
                                                children: [
                                                  /* @__PURE__ */ jsx(
                                                    "span",
                                                    {
                                                      className: styles.selectLabel,
                                                      children: t(
                                                        "label_trial_minute"
                                                      )
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsx(
                                                    "select",
                                                    {
                                                      className: styles.select,
                                                      value: trialUntilMinute,
                                                      onChange: (e) => setTrialUntilMinute(
                                                        e.target.value
                                                      ),
                                                      disabled: trialMode !== "exact",
                                                      children: Array.from(
                                                        {
                                                          length: 12
                                                        },
                                                        (_, i) => i * 5
                                                      ).map(
                                                        (m) => {
                                                          const mm = String(
                                                            m
                                                          ).padStart(
                                                            2,
                                                            "0"
                                                          );
                                                          return /* @__PURE__ */ jsx(
                                                            "option",
                                                            {
                                                              value: mm,
                                                              children: mm
                                                            },
                                                            mm
                                                          );
                                                        }
                                                      )
                                                    }
                                                  )
                                                ]
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              Button,
                                              {
                                                variant: "secondary",
                                                disabled: loading || actionLoading.extend,
                                                loading: actionLoading.extend,
                                                onClick: () => runAction(
                                                  "extend",
                                                  async (r) => {
                                                    const payload = trialMode === "exact" ? {
                                                      untilLocal: {
                                                        date: trialUntilDate,
                                                        hour: Number(
                                                          trialUntilHour
                                                        ),
                                                        minute: Number(
                                                          trialUntilMinute
                                                        )
                                                      },
                                                      reason: r
                                                    } : {
                                                      days: Number(
                                                        trialDays
                                                      ),
                                                      reason: r
                                                    };
                                                    const res = await adminExtendTrial(
                                                      selectedCard2._id,
                                                      payload
                                                    );
                                                    return res.data;
                                                  }
                                                ),
                                                children: t("btn_set")
                                              }
                                            )
                                          ]
                                        }
                                      ),
                                      actionError.extend ? /* @__PURE__ */ jsx(
                                        "p",
                                        {
                                          className: styles.errorText,
                                          children: actionError.extend
                                        }
                                      ) : null
                                    ]
                                  }
                                )
                              ]
                            }
                          ) : null,
                          selectedTab === "danger" ? renderCardDangerTab() : null
                        ] }) : null
                      ]
                    }
                  )
                ]
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "section",
        {
          className: styles.rightPanel,
          "aria-label": t("section_selected_card"),
          children: [
            /* @__PURE__ */ jsxs("div", { className: styles.cardShell, children: [
              /* @__PURE__ */ jsxs("div", { className: styles.cardHeader, children: [
                /* @__PURE__ */ jsx("div", { className: styles.headerRow, children: /* @__PURE__ */ jsx("h2", { className: styles.h2, children: t("section_billing_crud") }) }),
                /* @__PURE__ */ jsx("p", { className: styles.muted, children: "מקור האמת לחיוב בזמן אמת הוא החיוב בפועל של הכרטיס." })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles.cardBody, children: [
                /* @__PURE__ */ jsxs("div", { className: styles.sectionBlock, children: [
                  /* @__PURE__ */ jsx("div", { className: styles.sectionTitle, children: t("section_user_subscription") }),
                  /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("msg_user_subscription_help") }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      label: t("label_user_id"),
                      value: billingUserId,
                      onChange: (e) => setBillingUserId(e.target.value),
                      placeholder: "..."
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: styles.formRow, children: [
                    /* @__PURE__ */ jsx(
                      Input,
                      {
                        label: t("label_reason"),
                        value: reason,
                        onChange: (e) => setReason(e.target.value),
                        placeholder: t(
                          "placeholder_reason"
                        )
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "label",
                      {
                        className: styles.selectField,
                        children: [
                          /* @__PURE__ */ jsx(
                            "span",
                            {
                              className: styles.selectLabel,
                              children: t("label_plan_crud")
                            }
                          ),
                          /* @__PURE__ */ jsxs(
                            "select",
                            {
                              className: styles.select,
                              value: billingUserPlan,
                              onChange: (e) => setBillingUserPlan(
                                e.target.value
                              ),
                              children: [
                                /* @__PURE__ */ jsx("option", { value: "free", children: t("plan_free") }),
                                /* @__PURE__ */ jsx("option", { value: "monthly", children: t("plan_monthly") }),
                                /* @__PURE__ */ jsx("option", { value: "yearly", children: t("plan_yearly") })
                              ]
                            }
                          )
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      Input,
                      {
                        label: t(
                          "label_expires_at_iso"
                        ),
                        value: billingUserExpiresAt,
                        onChange: (e) => (setBillingUserExpiresAt(
                          e.target.value
                        ), setActionError((prev) => ({
                          ...prev,
                          billingUserSet: ""
                        }))),
                        type: "datetime-local",
                        step: "60",
                        onPaste: (e) => {
                          const text = e.clipboardData?.getData(
                            "text"
                          ) || "";
                          const raw = String(
                            text || ""
                          ).trim();
                          const hasExplicitTz = /(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(
                            raw
                          );
                          if (!hasExplicitTz) return;
                          const d = new Date(raw);
                          if (!Number.isFinite(
                            d.getTime()
                          ))
                            return;
                          e.preventDefault();
                          setBillingUserExpiresAt(
                            isoToDatetimeLocalValue(
                              d.toISOString()
                            )
                          );
                          setActionError((prev) => ({
                            ...prev,
                            billingUserSet: ""
                          }));
                        },
                        placeholder: "YYYY-MM-DDTHH:mm",
                        meta: /* @__PURE__ */ jsxs(Fragment, { children: [
                          /* @__PURE__ */ jsxs("span", { children: [
                            "יישלח (UTC ISO):",
                            " ",
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles.ltr,
                                dir: "ltr",
                                children: billingUserExpiresAtNorm.ok && billingUserExpiresAtNorm.isoZ ? billingUserExpiresAtNorm.isoZ : "-"
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsx("br", {}),
                          /* @__PURE__ */ jsxs("span", { children: [
                            "שעה בישראל:",
                            " ",
                            billingUserExpiresAtNorm.ok && billingUserExpiresAtNorm.date ? billingUserExpiresAtNorm.date.toLocaleString(
                              "he-IL",
                              {
                                timeZone: "Asia/Jerusalem"
                              }
                            ) : "-"
                          ] })
                        ] })
                      }
                    ),
                    /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("hint_enable_subscription") }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        variant: "secondary",
                        disabled: loading || actionLoading.billingUserSet,
                        loading: actionLoading.billingUserSet,
                        onClick: () => (() => {
                          setActionError(
                            (prev) => ({
                              ...prev,
                              billingUserSet: ""
                            })
                          );
                          const status = billingUserPlan === "free" ? "free" : "active";
                          if (billingUserPlan === "free") {
                            const hasAny = Boolean(
                              String(
                                billingUserExpiresAt || ""
                              ).trim()
                            );
                            if (hasAny) {
                              setActionError(
                                (prev) => ({
                                  ...prev,
                                  billingUserSet: t(
                                    "err_datetime_must_be_empty_for_free"
                                  )
                                })
                              );
                              return;
                            }
                          } else {
                            if (!billingUserExpiresAtNorm.ok) {
                              setActionError(
                                (prev) => ({
                                  ...prev,
                                  billingUserSet: billingUserExpiresAtNorm.uiError || t(
                                    "err_invalid_datetime"
                                  )
                                })
                              );
                              return;
                            }
                            if (!billingUserExpiresAtNorm.isoZ) {
                              setActionError(
                                (prev) => ({
                                  ...prev,
                                  billingUserSet: t(
                                    "err_datetime_required"
                                  )
                                })
                              );
                              return;
                            }
                          }
                          runBillingUserAction(
                            "billingUserSet",
                            async (r) => {
                              const expiresAt = billingUserPlan === "free" ? null : billingUserExpiresAtNorm.isoZ;
                              const res = await adminSetUserSubscription(
                                billingUserId,
                                {
                                  plan: billingUserPlan,
                                  expiresAt,
                                  status,
                                  reason: r
                                }
                              );
                              return res.data;
                            }
                          );
                        })(),
                        children: t("btn_enable_subscription")
                      }
                    ),
                    /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("hint_revoke_subscription") }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        variant: "secondary",
                        disabled: loading || actionLoading.billingUserRevoke,
                        loading: actionLoading.billingUserRevoke,
                        onClick: () => runBillingUserAction(
                          "billingUserRevoke",
                          async (r) => {
                            const res = await adminRevokeUserSubscription(
                              billingUserId,
                              {
                                reason: r
                              }
                            );
                            return res.data;
                          }
                        ),
                        children: t("btn_revoke_subscription")
                      }
                    )
                  ] }),
                  actionError.billingUserSet ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: actionError.billingUserSet }) : null,
                  actionError.billingUserRevoke ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: actionError.billingUserRevoke }) : null,
                  billingUserResult ? /* @__PURE__ */ jsx("div", { className: styles.kv, children: /* @__PURE__ */ jsxs("dl", { className: styles.kvDl, children: [
                    /* @__PURE__ */ jsx("dt", { className: styles.kvDt, children: t("label_plan_crud") }),
                    /* @__PURE__ */ jsx("dd", { className: styles.kvDd, children: planHe(
                      billingUserResult.plan
                    ) }),
                    /* @__PURE__ */ jsx("dt", { className: styles.kvDt, children: "expiresAt" }),
                    /* @__PURE__ */ jsx("dd", { className: styles.kvDd, children: /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: styles.ltr,
                        dir: "ltr",
                        children: billingUserResult?.subscription?.expiresAt || ""
                      }
                    ) })
                  ] }) }) : null
                ] }),
                /* @__PURE__ */ jsxs("div", { className: styles.sectionBlock, children: [
                  /* @__PURE__ */ jsx("div", { className: styles.sectionTitle, children: t("section_card_billing_crud") }),
                  /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("msg_card_billing_help") }),
                  /* @__PURE__ */ jsx("div", { className: styles.formRow, children: /* @__PURE__ */ jsxs(
                    "label",
                    {
                      className: styles.selectField,
                      children: [
                        /* @__PURE__ */ jsx(
                          "span",
                          {
                            className: styles.selectLabel,
                            children: t("label_card_id_crud")
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "select",
                          {
                            className: styles.select,
                            value: billingCardId,
                            onChange: (e) => {
                              setBillingCardId(
                                e.target.value
                              );
                              setBillingCardResult(
                                null
                              );
                            },
                            disabled: !billingUserIdLooksValid || billingCardsStatus !== "ready" || billingCards.length === 1,
                            children: [
                              /* @__PURE__ */ jsx("option", { value: "", children: billingCardsStatus === "loading" ? "טוען כרטיסים…" : billingCards.length > 1 ? "בחר כרטיס" : "-" }),
                              (Array.isArray(
                                billingCards
                              ) ? billingCards : []).map((c) => {
                                const id = String(
                                  c?._id || ""
                                );
                                const slug = String(
                                  c?.slug || ""
                                );
                                const scopeRaw = typeof c?.scope === "string" ? c.scope : "";
                                const scope = scopeRaw.trim().toLowerCase();
                                const orgId = String(
                                  c?.orgId || ""
                                );
                                const orgLast6 = orgId ? orgId.slice(-6) : "";
                                const plan = String(
                                  c?.effectiveBilling?.plan || ""
                                ).trim();
                                let scopeLabel = `כרטיס: ${slug}`;
                                if (scope === "personal") {
                                  scopeLabel = `אישי: ${slug}`;
                                } else if (scope === "org") {
                                  scopeLabel = `ארגוני: ${slug}${orgLast6 ? ` (org#${orgLast6})` : ""}`;
                                }
                                const label2 = plan ? `${scopeLabel} - ${plan}` : scopeLabel;
                                return /* @__PURE__ */ jsx(
                                  "option",
                                  {
                                    value: id,
                                    children: label2
                                  },
                                  id
                                );
                              })
                            ]
                          }
                        )
                      ]
                    }
                  ) }),
                  billingUserIdLooksValid && billingCardsStatus === "ready" && billingCards.length === 0 ? /* @__PURE__ */ jsx("p", { className: styles.muted, children: "לא נמצאו כרטיסים למשתמש זה" }) : null,
                  billingCardsError ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: billingCardsError }) : null,
                  /* @__PURE__ */ jsxs("div", { className: styles.formRow, children: [
                    /* @__PURE__ */ jsxs(
                      "label",
                      {
                        className: styles.selectField,
                        children: [
                          /* @__PURE__ */ jsx(
                            "span",
                            {
                              className: styles.selectLabel,
                              children: t("label_plan_crud")
                            }
                          ),
                          /* @__PURE__ */ jsxs(
                            "select",
                            {
                              className: styles.select,
                              value: billingCardPlan,
                              onChange: (e) => setBillingCardPlan(
                                e.target.value
                              ),
                              children: [
                                /* @__PURE__ */ jsx("option", { value: "free", children: t("plan_free") }),
                                /* @__PURE__ */ jsx("option", { value: "monthly", children: t("plan_monthly") }),
                                /* @__PURE__ */ jsx("option", { value: "yearly", children: t("plan_yearly") })
                              ]
                            }
                          )
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      Input,
                      {
                        label: t(
                          "label_paid_until_iso"
                        ),
                        value: billingCardPaidUntil,
                        onChange: (e) => (setBillingCardPaidUntil(
                          e.target.value
                        ), setActionError((prev) => ({
                          ...prev,
                          billingCardSet: ""
                        }))),
                        type: "datetime-local",
                        step: "60",
                        onPaste: (e) => {
                          const text = e.clipboardData?.getData(
                            "text"
                          ) || "";
                          const raw = String(
                            text || ""
                          ).trim();
                          const hasExplicitTz = /(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(
                            raw
                          );
                          if (!hasExplicitTz) return;
                          const d = new Date(raw);
                          if (!Number.isFinite(
                            d.getTime()
                          ))
                            return;
                          e.preventDefault();
                          setBillingCardPaidUntil(
                            isoToDatetimeLocalValue(
                              d.toISOString()
                            )
                          );
                          setActionError((prev) => ({
                            ...prev,
                            billingCardSet: ""
                          }));
                        },
                        placeholder: "YYYY-MM-DDTHH:mm",
                        meta: /* @__PURE__ */ jsxs(Fragment, { children: [
                          /* @__PURE__ */ jsxs("span", { children: [
                            "יישלח (UTC ISO):",
                            " ",
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles.ltr,
                                dir: "ltr",
                                children: billingCardPaidUntilNorm.ok && billingCardPaidUntilNorm.isoZ ? billingCardPaidUntilNorm.isoZ : "-"
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsx("br", {}),
                          /* @__PURE__ */ jsxs("span", { children: [
                            "שעה בישראל:",
                            " ",
                            billingCardPaidUntilNorm.ok && billingCardPaidUntilNorm.date ? billingCardPaidUntilNorm.date.toLocaleString(
                              "he-IL",
                              {
                                timeZone: "Asia/Jerusalem"
                              }
                            ) : "-"
                          ] })
                        ] })
                      }
                    ),
                    /* @__PURE__ */ jsxs("label", { className: styles.field, children: [
                      t("label_payer_type"),
                      /* @__PURE__ */ jsxs(
                        "select",
                        {
                          className: styles.input,
                          value: billingCardPayerType,
                          onChange: (e) => {
                            setBillingCardPayerType(
                              e.target.value
                            );
                            setActionError(
                              (prev) => ({
                                ...prev,
                                billingCardSet: ""
                              })
                            );
                          },
                          children: [
                            /* @__PURE__ */ jsx("option", { value: "", children: t("opt_keep_current") }),
                            /* @__PURE__ */ jsx("option", { value: "none", children: t("opt_payer_none") }),
                            /* @__PURE__ */ jsx("option", { value: "user", children: t("opt_payer_user") }),
                            /* @__PURE__ */ jsx("option", { value: "org", children: t("opt_payer_org") })
                          ]
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsx(
                      Input,
                      {
                        label: t("label_payer_note"),
                        value: billingCardPayerNote,
                        onChange: (e) => {
                          setBillingCardPayerNote(
                            e.target.value
                          );
                          setBillingCardPayerNoteTouched(
                            true
                          );
                          setActionError((prev) => ({
                            ...prev,
                            billingCardSet: ""
                          }));
                        },
                        maxLength: 80,
                        placeholder: "עד 80 תווים"
                      }
                    ),
                    /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("hint_enable_card_billing") }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        variant: "secondary",
                        disabled: billingCardActionsDisabled || actionLoading.billingCardSet,
                        loading: actionLoading.billingCardSet,
                        onClick: () => (() => {
                          setActionError(
                            (prev) => ({
                              ...prev,
                              billingCardSet: ""
                            })
                          );
                          const status = billingCardPlan === "free" ? "free" : "active";
                          if (billingCardPlan === "free") {
                            const hasAny = Boolean(
                              String(
                                billingCardPaidUntil || ""
                              ).trim()
                            );
                            if (hasAny) {
                              setActionError(
                                (prev) => ({
                                  ...prev,
                                  billingCardSet: t(
                                    "err_datetime_must_be_empty_for_free"
                                  )
                                })
                              );
                              return;
                            }
                          } else {
                            if (!billingCardPaidUntilNorm.ok) {
                              setActionError(
                                (prev) => ({
                                  ...prev,
                                  billingCardSet: billingCardPaidUntilNorm.uiError || t(
                                    "err_invalid_datetime"
                                  )
                                })
                              );
                              return;
                            }
                            if (!billingCardPaidUntilNorm.isoZ) {
                              setActionError(
                                (prev) => ({
                                  ...prev,
                                  billingCardSet: t(
                                    "err_datetime_required"
                                  )
                                })
                              );
                              return;
                            }
                          }
                          runBillingCardAction(
                            "billingCardSet",
                            async (r) => {
                              const paidUntil = billingCardPlan === "free" ? null : billingCardPaidUntilNorm.isoZ;
                              const res = await adminSetCardBilling(
                                billingCardId,
                                {
                                  plan: billingCardPlan,
                                  paidUntil,
                                  status,
                                  reason: r,
                                  payerType: billingCardPayerType || void 0,
                                  payerNote: billingCardPayerNoteTouched ? billingCardPayerNote : void 0
                                }
                              );
                              return res.data;
                            }
                          );
                        })(),
                        children: t("btn_enable_card_billing")
                      }
                    ),
                    /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("hint_revoke_card_billing") }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        variant: "secondary",
                        disabled: billingCardActionsDisabled || actionLoading.billingCardRevoke,
                        loading: actionLoading.billingCardRevoke,
                        onClick: () => runBillingCardAction(
                          "billingCardRevoke",
                          async (r) => {
                            const res = await adminRevokeCardBilling(
                              billingCardId,
                              {
                                reason: r
                              }
                            );
                            return res.data;
                          }
                        ),
                        children: t("btn_revoke_card_billing")
                      }
                    ),
                    /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("hint_sync_from_user") }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        variant: "secondary",
                        disabled: billingCardActionsDisabled || actionLoading.billingCardSync,
                        loading: actionLoading.billingCardSync,
                        onClick: () => runBillingCardActionNoReason(
                          "billingCardSync",
                          async () => {
                            const res = await adminSyncCardBillingFromUser(
                              billingCardId,
                              {
                                force: billingCardForceSync ? true : void 0
                              }
                            );
                            return res.data;
                          }
                        ),
                        children: t("btn_sync_from_user")
                      }
                    ),
                    /* @__PURE__ */ jsxs("label", { className: styles.toggleRow, children: [
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          type: "checkbox",
                          checked: billingCardForceSync,
                          onChange: (e) => setBillingCardForceSync(
                            e.target.checked
                          )
                        }
                      ),
                      /* @__PURE__ */ jsx("span", { children: t("label_force_org_payer") })
                    ] }),
                    /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("hint_clear_override") }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        variant: "secondary",
                        disabled: billingCardActionsDisabled || actionLoading.billingOverrideClear,
                        loading: actionLoading.billingOverrideClear,
                        onClick: () => runBillingCardAction(
                          "billingOverrideClear",
                          async (r) => {
                            const res = await adminClearCardAdminOverride(
                              billingCardId,
                              {
                                reason: r
                              }
                            );
                            return res.data;
                          }
                        ),
                        children: t("btn_clear_override")
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("msg_sync_uses_saved_db") }),
                  actionError.billingCardSet ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: actionError.billingCardSet }) : null,
                  actionError.billingCardRevoke ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: actionError.billingCardRevoke }) : null,
                  actionError.billingCardSync ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: actionError.billingCardSync }) : null,
                  actionError.billingOverrideClear ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: actionError.billingOverrideClear }) : null,
                  billingCardResult?.adminOverride?.plan || billingCardResult?.adminOverride?.until || billingCardResult?.adminOverride?.byAdmin || billingCardResult?.adminOverride?.createdAt ? /* @__PURE__ */ jsx("div", { className: styles.warningBox, children: t("warn_override_precedence") }) : null,
                  billingCardResult ? /* @__PURE__ */ jsx("div", { className: styles.kv, children: /* @__PURE__ */ jsxs("dl", { className: styles.kvDl, children: [
                    /* @__PURE__ */ jsx("dt", { className: styles.kvDt, children: "plan" }),
                    /* @__PURE__ */ jsx("dd", { className: styles.kvDd, children: planHe(
                      billingCardResult.plan
                    ) }),
                    /* @__PURE__ */ jsx("dt", { className: styles.kvDt, children: "billing.status" }),
                    /* @__PURE__ */ jsx("dd", { className: styles.kvDd, children: /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: styles.ltr,
                        dir: "ltr",
                        children: String(
                          billingCardResult?.billing?.status || ""
                        )
                      }
                    ) }),
                    /* @__PURE__ */ jsx("dt", { className: styles.kvDt, children: "billing.paidUntil" }),
                    /* @__PURE__ */ jsx("dd", { className: styles.kvDd, children: /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: styles.ltr,
                        dir: "ltr",
                        children: billingCardResult?.billing?.paidUntil ? new Date(
                          billingCardResult.billing.paidUntil
                        ).toISOString() : ""
                      }
                    ) }),
                    /* @__PURE__ */ jsx("dt", { className: styles.kvDt, children: "effectiveBilling.isPaid" }),
                    /* @__PURE__ */ jsx("dd", { className: styles.kvDd, children: boolHe(
                      Boolean(
                        billingCardResult?.effectiveBilling?.isPaid
                      )
                    ) })
                  ] }) }) : null
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs(
              "div",
              {
                className: `${styles.cardShell} ${styles.selectedCard}`,
                children: [
                  /* @__PURE__ */ jsxs("div", { className: styles.cardHeader, children: [
                    /* @__PURE__ */ jsx("div", { className: styles.headerRow, children: /* @__PURE__ */ jsx("h2", { className: styles.h2, children: t("section_selected_card") }) }),
                    selectedCard2 ? /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles.selectedHeaderStrip,
                        children: [
                          /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.selectedPrimary,
                              children: [
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.selectedLabel,
                                    children: [
                                      t("label_slug"),
                                      ":"
                                    ]
                                  }
                                ),
                                " ",
                                /* @__PURE__ */ jsx(
                                  "span",
                                  {
                                    className: `${styles.ltr} ${styles.selectedValue}`,
                                    dir: "ltr",
                                    title: selectedCard2.slug || "",
                                    children: selectedCard2.slug || ""
                                  }
                                )
                              ]
                            }
                          ),
                          selectedCardPublicUrl && /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.selectedPrimary,
                              children: [
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.selectedLabel,
                                    children: [
                                      t("label_card_public_url"),
                                      ":"
                                    ]
                                  }
                                ),
                                " ",
                                /* @__PURE__ */ jsx(
                                  "a",
                                  {
                                    href: selectedCardPublicUrl,
                                    className: styles.cardPublicLink,
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                    dir: "ltr",
                                    "aria-label": "פתח כרטיס ציבורי בלשונית חדשה",
                                    children: selectedCardPublicUrl
                                  }
                                )
                              ]
                            }
                          ),
                          /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.selectedMeta,
                              children: [
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.metaPill,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "span",
                                        {
                                          className: styles.metaKey,
                                          children: [
                                            t("label_id"),
                                            ":"
                                          ]
                                        }
                                      ),
                                      " ",
                                      /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          title: selectedCard2._id,
                                          children: selectedCard2._id
                                        }
                                      )
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.metaPill,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "span",
                                        {
                                          className: styles.metaKey,
                                          children: [
                                            t("label_status"),
                                            ":"
                                          ]
                                        }
                                      ),
                                      " ",
                                      /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          children: cardStatusHe(
                                            selectedCard2.status
                                          )
                                        }
                                      )
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.metaPill,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "span",
                                        {
                                          className: styles.metaKey,
                                          children: [
                                            t("label_active"),
                                            ":"
                                          ]
                                        }
                                      ),
                                      " ",
                                      /* @__PURE__ */ jsx("span", { children: boolHe(
                                        !!selectedCard2.isActive
                                      ) })
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsxs(
                                  "span",
                                  {
                                    className: styles.metaPill,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "span",
                                        {
                                          className: styles.metaKey,
                                          children: [
                                            t("label_owner"),
                                            ":"
                                          ]
                                        }
                                      ),
                                      " ",
                                      /* @__PURE__ */ jsx("span", { children: selectedCardOwnerLabel })
                                    ]
                                  }
                                )
                              ]
                            }
                          )
                        ]
                      }
                    ) : null,
                    selectedCard2 ? /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles.commandBar,
                        "aria-label": "Command bar",
                        children: [
                          /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.commandBarButtons,
                              children: [
                                /* @__PURE__ */ jsx(
                                  Button,
                                  {
                                    variant: "secondary",
                                    size: "small",
                                    className: styles.commandBtn,
                                    onClick: () => setSelectedTab(
                                      "billing"
                                    ),
                                    children: "חיוב"
                                  }
                                ),
                                /* @__PURE__ */ jsx(
                                  Button,
                                  {
                                    variant: "secondary",
                                    size: "small",
                                    className: styles.commandBtn,
                                    onClick: () => setSelectedTab(
                                      "actions"
                                    ),
                                    children: "פעולות"
                                  }
                                ),
                                /* @__PURE__ */ jsx(
                                  Button,
                                  {
                                    variant: "secondary",
                                    size: "small",
                                    className: styles.commandBtn,
                                    onClick: () => setSelectedTab("danger"),
                                    children: "סכנה"
                                  }
                                )
                              ]
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "div",
                            {
                              className: styles.commandBarHint,
                              children: "קיצורי דרך לכרטיס הנבחר"
                            }
                          )
                        ]
                      }
                    ) : null,
                    /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles.tabs,
                        role: "tablist",
                        "aria-label": "Selected card tabs",
                        ref: selectedTabListRef,
                        onKeyDown: (e) => handleTabListKeyDown(e, {
                          current: selectedTab,
                          setCurrent: setSelectedTab,
                          order: [
                            "general",
                            "billing",
                            "actions",
                            "danger"
                          ],
                          tabListRef: selectedTabListRef
                        }),
                        children: [
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              className: `${styles.tab} ${selectedTab === "general" ? styles.tabActive : ""}`,
                              role: "tab",
                              "data-tab": "general",
                              "aria-selected": selectedTab === "general",
                              "aria-controls": "admin-selected-panel",
                              onClick: () => setSelectedTab("general"),
                              children: "כללי"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              className: `${styles.tab} ${selectedTab === "billing" ? styles.tabActive : ""}`,
                              role: "tab",
                              "data-tab": "billing",
                              "aria-selected": selectedTab === "billing",
                              "aria-controls": "admin-selected-panel",
                              onClick: () => setSelectedTab("billing"),
                              children: "חיוב"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              className: `${styles.tab} ${selectedTab === "actions" ? styles.tabActive : ""}`,
                              role: "tab",
                              "data-tab": "actions",
                              "aria-selected": selectedTab === "actions",
                              "aria-controls": "admin-selected-panel",
                              onClick: () => setSelectedTab("actions"),
                              children: "פעולות"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "button",
                              className: `${styles.tab} ${selectedTab === "danger" ? styles.tabActive : ""}`,
                              role: "tab",
                              "data-tab": "danger",
                              "aria-selected": selectedTab === "danger",
                              "aria-controls": "admin-selected-panel",
                              onClick: () => setSelectedTab("danger"),
                              children: "סכנה"
                            }
                          )
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs(
                    "div",
                    {
                      id: "admin-selected-panel",
                      className: styles.cardBody,
                      role: "tabpanel",
                      "aria-label": "Selected card panel",
                      children: [
                        !selectedCard2 ? /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("msg_select_card") }) : null,
                        selectedCard2 ? /* @__PURE__ */ jsxs(Fragment, { children: [
                          selectedTab === "general" ? /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.sectionBlock,
                              children: [
                                /* @__PURE__ */ jsx(
                                  "div",
                                  {
                                    className: styles.sectionTitle,
                                    children: t(
                                      "section_card_details"
                                    )
                                  }
                                ),
                                /* @__PURE__ */ jsxs("dl", { className: styles.kvDl, children: [
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t("label_id")
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          title: selectedCard2._id,
                                          children: selectedCard2._id
                                        }
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t("label_slug")
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          title: selectedCard2.slug || "",
                                          children: selectedCard2.slug || ""
                                        }
                                      )
                                    }
                                  ),
                                  selectedCardPublicUrl && /* @__PURE__ */ jsxs(Fragment, { children: [
                                    /* @__PURE__ */ jsx(
                                      "dt",
                                      {
                                        className: styles.kvDt,
                                        children: t("label_card_public_url")
                                      }
                                    ),
                                    /* @__PURE__ */ jsx(
                                      "dd",
                                      {
                                        className: styles.kvDd,
                                        children: /* @__PURE__ */ jsx(
                                          "a",
                                          {
                                            href: selectedCardPublicUrl,
                                            className: styles.cardPublicLink,
                                            target: "_blank",
                                            rel: "noopener noreferrer",
                                            dir: "ltr",
                                            "aria-label": "פתח כרטיס ציבורי בלשונית חדשה",
                                            children: selectedCardPublicUrl
                                          }
                                        )
                                      }
                                    )
                                  ] }),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t("label_status")
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          children: cardStatusHe(
                                            selectedCard2.status
                                          )
                                        }
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t("label_active")
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx("span", { children: boolHe(
                                        !!selectedCard2.isActive
                                      ) })
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t("label_owner")
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx("span", { children: selectedCardOwnerLabel })
                                    }
                                  )
                                ] })
                              ]
                            }
                          ) : null,
                          selectedTab === "billing" ? /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.sectionBlock,
                              children: [
                                /* @__PURE__ */ jsx(
                                  "div",
                                  {
                                    className: styles.sectionTitle,
                                    children: "Billing"
                                  }
                                ),
                                /* @__PURE__ */ jsxs("dl", { className: styles.kvDl, children: [
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t(
                                        "label_effective_plan"
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsxs(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: [
                                        /* @__PURE__ */ jsx("span", { children: planHe(
                                          selectedEffectivePlan
                                        ) }),
                                        " · ",
                                        t(
                                          "label_entitled"
                                        ),
                                        ":",
                                        " ",
                                        /* @__PURE__ */ jsx("span", { children: boolHe(
                                          selectedIsEntitled
                                        ) }),
                                        " · ",
                                        t(
                                          "label_paid"
                                        ),
                                        ":",
                                        " ",
                                        /* @__PURE__ */ jsx("span", { children: boolHe(
                                          selectedIsPaid
                                        ) })
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t(
                                        "label_effective_tier"
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsxs(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: [
                                        /* @__PURE__ */ jsx("span", { children: tierHe(
                                          selectedEffectiveTier
                                        ) }),
                                        " · ",
                                        t(
                                          "label_tier_source"
                                        ),
                                        ":",
                                        " ",
                                        /* @__PURE__ */ jsx(
                                          "span",
                                          {
                                            className: styles.ltr,
                                            dir: "ltr",
                                            children: selectedTierSource
                                          }
                                        ),
                                        selectedTierUntil ? ` · ${t("label_until")} ${formatDate(selectedTierUntil)}` : ""
                                      ]
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t(
                                        "label_trial_ends"
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: /* @__PURE__ */ jsx(
                                        "span",
                                        {
                                          className: styles.ltr,
                                          dir: "ltr",
                                          children: selectedCard2?.trialEndsAtIsrael || formatDate(
                                            selectedCard2.trialEndsAt
                                          )
                                        }
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "dt",
                                    {
                                      className: styles.kvDt,
                                      children: t(
                                        "label_effective_billing"
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsxs(
                                    "dd",
                                    {
                                      className: styles.kvDd,
                                      children: [
                                        /* @__PURE__ */ jsxs(
                                          "span",
                                          {
                                            className: styles.ltr,
                                            dir: "ltr",
                                            children: [
                                              selectedBilling?.source || "",
                                              " ",
                                              "/",
                                              " ",
                                              selectedBilling?.plan ? planHe(
                                                selectedBilling.plan
                                              ) : ""
                                            ]
                                          }
                                        ),
                                        " ",
                                        selectedBilling?.untilIsrael ? `${t("label_until")} ${selectedBilling.untilIsrael}` : selectedBilling?.until ? `${t("label_until")} ${formatDate(selectedBilling.until)}` : ""
                                      ]
                                    }
                                  ),
                                  selectedCard2?.adminOverride ? /* @__PURE__ */ jsxs(Fragment, { children: [
                                    /* @__PURE__ */ jsx(
                                      "dt",
                                      {
                                        className: styles.kvDt,
                                        children: t(
                                          "label_admin_override"
                                        )
                                      }
                                    ),
                                    /* @__PURE__ */ jsxs(
                                      "dd",
                                      {
                                        className: styles.kvDd,
                                        children: [
                                          /* @__PURE__ */ jsx(
                                            "span",
                                            {
                                              className: styles.ltr,
                                              dir: "ltr",
                                              children: selectedCard2.adminOverride?.plan ? planHe(
                                                selectedCard2.adminOverride.plan
                                              ) : ""
                                            }
                                          ),
                                          " ",
                                          selectedCard2.adminOverride?.until ? `${t("label_until")} ${formatDate(selectedCard2.adminOverride.until)}` : ""
                                        ]
                                      }
                                    )
                                  ] }) : null,
                                  selectedCard2?.adminTier || selectedCard2?.adminTierUntil ? /* @__PURE__ */ jsxs(Fragment, { children: [
                                    /* @__PURE__ */ jsx(
                                      "dt",
                                      {
                                        className: styles.kvDt,
                                        children: t(
                                          "label_card_tier_override"
                                        )
                                      }
                                    ),
                                    /* @__PURE__ */ jsxs(
                                      "dd",
                                      {
                                        className: styles.kvDd,
                                        children: [
                                          /* @__PURE__ */ jsx("span", { children: selectedCard2.adminTier ? tierHe(
                                            selectedCard2.adminTier
                                          ) : "" }),
                                          " ",
                                          selectedCard2.adminTierUntil ? `${t("label_until")} ${formatDate(selectedCard2.adminTierUntil)}` : ""
                                        ]
                                      }
                                    )
                                  ] }) : null,
                                  selectedCard2?.ownerAdminTier || selectedCard2?.ownerAdminTierUntil ? /* @__PURE__ */ jsxs(Fragment, { children: [
                                    /* @__PURE__ */ jsx(
                                      "dt",
                                      {
                                        className: styles.kvDt,
                                        children: t(
                                          "label_user_tier_override"
                                        )
                                      }
                                    ),
                                    /* @__PURE__ */ jsxs(
                                      "dd",
                                      {
                                        className: styles.kvDd,
                                        children: [
                                          /* @__PURE__ */ jsx("span", { children: selectedCard2.ownerAdminTier ? tierHe(
                                            selectedCard2.ownerAdminTier
                                          ) : "" }),
                                          " ",
                                          selectedCard2.ownerAdminTierUntil ? `${t("label_until")} ${formatDate(selectedCard2.ownerAdminTierUntil)}` : ""
                                        ]
                                      }
                                    )
                                  ] }) : null
                                ] }),
                                /* @__PURE__ */ jsxs(
                                  "div",
                                  {
                                    className: styles.provenancePanel,
                                    children: [
                                      /* @__PURE__ */ jsx(
                                        "div",
                                        {
                                          className: styles.provenanceHeader,
                                          children: /* @__PURE__ */ jsxs(
                                            "div",
                                            {
                                              className: styles.provenanceHeaderLeft,
                                              children: [
                                                /* @__PURE__ */ jsxs(
                                                  "span",
                                                  {
                                                    className: styles.provenancePill,
                                                    children: [
                                                      t(
                                                        "section_provenance"
                                                      ),
                                                      ":",
                                                      " ",
                                                      /* @__PURE__ */ jsx(
                                                        "span",
                                                        {
                                                          className: styles.ltr,
                                                          dir: "ltr",
                                                          children: selectedProvenanceSource || "-"
                                                        }
                                                      )
                                                    ]
                                                  }
                                                ),
                                                selectedLatestAudit ? /* @__PURE__ */ jsxs(
                                                  "span",
                                                  {
                                                    className: styles.muted,
                                                    children: [
                                                      t(
                                                        "label_latest_audit"
                                                      ),
                                                      ":",
                                                      " ",
                                                      /* @__PURE__ */ jsxs(
                                                        "span",
                                                        {
                                                          className: styles.ltr,
                                                          dir: "ltr",
                                                          children: [
                                                            selectedLatestAudit.action || "",
                                                            selectedLatestAudit.mode ? ` (${selectedLatestAudit.mode})` : ""
                                                          ]
                                                        }
                                                      )
                                                    ]
                                                  }
                                                ) : null
                                              ]
                                            }
                                          )
                                        }
                                      ),
                                      /* @__PURE__ */ jsxs(
                                        "dl",
                                        {
                                          className: styles.kvDl,
                                          children: [
                                            /* @__PURE__ */ jsx(
                                              "dt",
                                              {
                                                className: styles.kvDt,
                                                children: t(
                                                  "label_raw_billing"
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              "dd",
                                              {
                                                className: styles.kvDd,
                                                children: /* @__PURE__ */ jsxs(
                                                  "span",
                                                  {
                                                    className: styles.ltr,
                                                    dir: "ltr",
                                                    children: [
                                                      "status=",
                                                      billingStatusHe(
                                                        selectedCard2?.billing?.status
                                                      ),
                                                      selectedCard2?.billing?.plan ? ` · plan=${planHe(selectedCard2.billing.plan)}` : "",
                                                      selectedCard2?.billing?.paidUntil ? ` · paidUntil=${selectedCard2.billing.paidUntil}` : ""
                                                    ]
                                                  }
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              "dt",
                                              {
                                                className: styles.kvDt,
                                                children: t(
                                                  "label_raw_payer"
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              "dd",
                                              {
                                                className: styles.kvDd,
                                                children: /* @__PURE__ */ jsx(
                                                  "span",
                                                  {
                                                    className: styles.ltr,
                                                    dir: "ltr",
                                                    children: selectedCard2?.billing?.payer ? `type=${selectedCard2.billing.payer.type || ""} · source=${selectedCard2.billing.payer.source || ""}${selectedCard2.billing.payer.updatedAt ? ` · updatedAt=${selectedCard2.billing.payer.updatedAt}` : ""}` : "-"
                                                  }
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              "dt",
                                              {
                                                className: styles.kvDt,
                                                children: t(
                                                  "label_audit_history"
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              "dd",
                                              {
                                                className: styles.kvDd,
                                                children: selectedAuditStatus === "loading" ? /* @__PURE__ */ jsx(
                                                  "span",
                                                  {
                                                    className: styles.muted,
                                                    children: t(
                                                      "msg_audit_loading"
                                                    )
                                                  }
                                                ) : selectedAuditStatus === "error" ? /* @__PURE__ */ jsx(
                                                  "span",
                                                  {
                                                    className: styles.errorText,
                                                    children: selectedAuditError
                                                  }
                                                ) : selectedAuditItems.length === 0 ? /* @__PURE__ */ jsx(
                                                  "span",
                                                  {
                                                    className: styles.muted,
                                                    children: t(
                                                      "msg_audit_empty"
                                                    )
                                                  }
                                                ) : /* @__PURE__ */ jsx(
                                                  "div",
                                                  {
                                                    className: styles.auditList,
                                                    children: selectedAuditItems.map(
                                                      (a, idx) => /* @__PURE__ */ jsxs(
                                                        "div",
                                                        {
                                                          className: styles.auditRow,
                                                          children: [
                                                            /* @__PURE__ */ jsxs(
                                                              "div",
                                                              {
                                                                className: styles.auditMeta,
                                                                children: [
                                                                  /* @__PURE__ */ jsxs("span", { children: [
                                                                    /* @__PURE__ */ jsxs(
                                                                      "span",
                                                                      {
                                                                        className: styles.auditKey,
                                                                        children: [
                                                                          t(
                                                                            "label_when"
                                                                          ),
                                                                          ":"
                                                                        ]
                                                                      }
                                                                    ),
                                                                    " ",
                                                                    /* @__PURE__ */ jsx(
                                                                      "span",
                                                                      {
                                                                        className: styles.ltr,
                                                                        dir: "ltr",
                                                                        children: formatDate(
                                                                          a?.createdAt
                                                                        )
                                                                      }
                                                                    )
                                                                  ] }),
                                                                  /* @__PURE__ */ jsxs("span", { children: [
                                                                    /* @__PURE__ */ jsxs(
                                                                      "span",
                                                                      {
                                                                        className: styles.auditKey,
                                                                        children: [
                                                                          t(
                                                                            "label_action"
                                                                          ),
                                                                          ":"
                                                                        ]
                                                                      }
                                                                    ),
                                                                    " ",
                                                                    /* @__PURE__ */ jsx(
                                                                      "span",
                                                                      {
                                                                        className: styles.ltr,
                                                                        dir: "ltr",
                                                                        children: a?.action || ""
                                                                      }
                                                                    )
                                                                  ] }),
                                                                  a?.mode ? /* @__PURE__ */ jsxs("span", { children: [
                                                                    /* @__PURE__ */ jsxs(
                                                                      "span",
                                                                      {
                                                                        className: styles.auditKey,
                                                                        children: [
                                                                          t(
                                                                            "label_mode"
                                                                          ),
                                                                          ":"
                                                                        ]
                                                                      }
                                                                    ),
                                                                    " ",
                                                                    /* @__PURE__ */ jsx(
                                                                      "span",
                                                                      {
                                                                        className: styles.ltr,
                                                                        dir: "ltr",
                                                                        children: a.mode
                                                                      }
                                                                    )
                                                                  ] }) : null,
                                                                  a?.byAdmin ? /* @__PURE__ */ jsxs("span", { children: [
                                                                    /* @__PURE__ */ jsxs(
                                                                      "span",
                                                                      {
                                                                        className: styles.auditKey,
                                                                        children: [
                                                                          t(
                                                                            "label_by_admin"
                                                                          ),
                                                                          ":"
                                                                        ]
                                                                      }
                                                                    ),
                                                                    " ",
                                                                    /* @__PURE__ */ jsx(
                                                                      "span",
                                                                      {
                                                                        className: styles.ltr,
                                                                        dir: "ltr",
                                                                        children: a?.byAdminEmail || a.byAdmin
                                                                      }
                                                                    )
                                                                  ] }) : null
                                                                ]
                                                              }
                                                            ),
                                                            a?.reason ? /* @__PURE__ */ jsxs(
                                                              "div",
                                                              {
                                                                className: styles.auditReason,
                                                                children: [
                                                                  /* @__PURE__ */ jsxs(
                                                                    "span",
                                                                    {
                                                                      className: styles.auditKey,
                                                                      children: [
                                                                        t(
                                                                          "label_reason"
                                                                        ),
                                                                        ":"
                                                                      ]
                                                                    }
                                                                  ),
                                                                  " ",
                                                                  a.reason
                                                                ]
                                                              }
                                                            ) : null
                                                          ]
                                                        },
                                                        `${a?.createdAt || ""}-${idx}`
                                                      )
                                                    )
                                                  }
                                                )
                                              }
                                            )
                                          ]
                                        }
                                      )
                                    ]
                                  }
                                )
                              ]
                            }
                          ) : null,
                          selectedTab === "actions" ? /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles.sectionBlock,
                              children: [
                                /* @__PURE__ */ jsx(
                                  "div",
                                  {
                                    className: styles.sectionTitle,
                                    children: t(
                                      "section_admin_actions"
                                    )
                                  }
                                ),
                                /* @__PURE__ */ jsx(
                                  Input,
                                  {
                                    label: t(
                                      "label_reason"
                                    ),
                                    value: reason,
                                    onChange: (e) => setReason(
                                      e.target.value
                                    ),
                                    placeholder: t(
                                      "placeholder_reason"
                                    ),
                                    required: true
                                  }
                                ),
                                renderAnalyticsPremiumToggle(),
                                /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("hint_extend_trial") }),
                                /* @__PURE__ */ jsxs(
                                  "div",
                                  {
                                    className: styles.actionGroup,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "div",
                                        {
                                          className: styles.formRow,
                                          children: [
                                            /* @__PURE__ */ jsxs(
                                              "label",
                                              {
                                                className: styles.selectField,
                                                children: [
                                                  /* @__PURE__ */ jsx(
                                                    "span",
                                                    {
                                                      className: styles.selectLabel,
                                                      children: t(
                                                        "label_trial_mode"
                                                      )
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsxs(
                                                    "select",
                                                    {
                                                      className: styles.select,
                                                      value: trialMode,
                                                      onChange: (e) => setTrialMode(
                                                        e.target.value
                                                      ),
                                                      children: [
                                                        /* @__PURE__ */ jsx("option", { value: "days", children: t(
                                                          "opt_trial_mode_days"
                                                        ) }),
                                                        /* @__PURE__ */ jsx("option", { value: "exact", children: t(
                                                          "opt_trial_mode_exact"
                                                        ) })
                                                      ]
                                                    }
                                                  )
                                                ]
                                              }
                                            ),
                                            /* @__PURE__ */ jsxs(
                                              "label",
                                              {
                                                className: styles.selectField,
                                                children: [
                                                  /* @__PURE__ */ jsx(
                                                    "span",
                                                    {
                                                      className: styles.selectLabel,
                                                      children: t(
                                                        "label_trial_days"
                                                      )
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsx(
                                                    "select",
                                                    {
                                                      className: styles.select,
                                                      value: trialDays,
                                                      onChange: (e) => setTrialDays(
                                                        Number(
                                                          e.target.value
                                                        )
                                                      ),
                                                      disabled: trialMode !== "days",
                                                      children: Array.from(
                                                        {
                                                          length: 15
                                                        },
                                                        (_, i) => i
                                                      ).map(
                                                        (n) => /* @__PURE__ */ jsx(
                                                          "option",
                                                          {
                                                            value: n,
                                                            children: n
                                                          },
                                                          n
                                                        )
                                                      )
                                                    }
                                                  )
                                                ]
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              Input,
                                              {
                                                label: t(
                                                  "label_trial_date_il"
                                                ),
                                                type: "date",
                                                value: trialUntilDate,
                                                onChange: (e) => setTrialUntilDate(
                                                  e.target.value
                                                ),
                                                disabled: trialMode !== "exact"
                                              }
                                            ),
                                            /* @__PURE__ */ jsxs(
                                              "label",
                                              {
                                                className: styles.selectField,
                                                children: [
                                                  /* @__PURE__ */ jsx(
                                                    "span",
                                                    {
                                                      className: styles.selectLabel,
                                                      children: t(
                                                        "label_trial_hour"
                                                      )
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsx(
                                                    "select",
                                                    {
                                                      className: styles.select,
                                                      value: trialUntilHour,
                                                      onChange: (e) => setTrialUntilHour(
                                                        e.target.value
                                                      ),
                                                      disabled: trialMode !== "exact",
                                                      children: Array.from(
                                                        {
                                                          length: 24
                                                        },
                                                        (_, i) => i
                                                      ).map(
                                                        (h) => {
                                                          const hh = String(
                                                            h
                                                          ).padStart(
                                                            2,
                                                            "0"
                                                          );
                                                          return /* @__PURE__ */ jsx(
                                                            "option",
                                                            {
                                                              value: hh,
                                                              children: hh
                                                            },
                                                            hh
                                                          );
                                                        }
                                                      )
                                                    }
                                                  )
                                                ]
                                              }
                                            ),
                                            /* @__PURE__ */ jsxs(
                                              "label",
                                              {
                                                className: styles.selectField,
                                                children: [
                                                  /* @__PURE__ */ jsx(
                                                    "span",
                                                    {
                                                      className: styles.selectLabel,
                                                      children: t(
                                                        "label_trial_minute"
                                                      )
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsx(
                                                    "select",
                                                    {
                                                      className: styles.select,
                                                      value: trialUntilMinute,
                                                      onChange: (e) => setTrialUntilMinute(
                                                        e.target.value
                                                      ),
                                                      disabled: trialMode !== "exact",
                                                      children: Array.from(
                                                        {
                                                          length: 12
                                                        },
                                                        (_, i) => i * 5
                                                      ).map(
                                                        (m) => {
                                                          const mm = String(
                                                            m
                                                          ).padStart(
                                                            2,
                                                            "0"
                                                          );
                                                          return /* @__PURE__ */ jsx(
                                                            "option",
                                                            {
                                                              value: mm,
                                                              children: mm
                                                            },
                                                            mm
                                                          );
                                                        }
                                                      )
                                                    }
                                                  )
                                                ]
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              Button,
                                              {
                                                variant: "secondary",
                                                disabled: loading || actionLoading.extend,
                                                loading: actionLoading.extend,
                                                onClick: () => runAction(
                                                  "extend",
                                                  async (r) => {
                                                    const payload = trialMode === "exact" ? {
                                                      untilLocal: {
                                                        date: trialUntilDate,
                                                        hour: Number(
                                                          trialUntilHour
                                                        ),
                                                        minute: Number(
                                                          trialUntilMinute
                                                        )
                                                      },
                                                      reason: r
                                                    } : {
                                                      days: Number(
                                                        trialDays
                                                      ),
                                                      reason: r
                                                    };
                                                    const res = await adminExtendTrial(
                                                      selectedCard2._id,
                                                      payload
                                                    );
                                                    return res.data;
                                                  }
                                                ),
                                                children: t("btn_set")
                                              }
                                            )
                                          ]
                                        }
                                      ),
                                      actionError.extend ? /* @__PURE__ */ jsx(
                                        "p",
                                        {
                                          className: styles.errorText,
                                          children: actionError.extend
                                        }
                                      ) : null
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsx("p", { className: styles.muted, children: t(
                                  "hint_override_plan"
                                ) }),
                                /* @__PURE__ */ jsxs(
                                  "div",
                                  {
                                    className: styles.actionGroup,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "div",
                                        {
                                          className: styles.formRow,
                                          children: [
                                            /* @__PURE__ */ jsx(
                                              Input,
                                              {
                                                label: t(
                                                  "label_override_plan"
                                                ),
                                                value: overridePlan,
                                                onChange: (e) => setOverridePlan(
                                                  e.target.value
                                                ),
                                                placeholder: t(
                                                  "placeholder_override_plan"
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              Input,
                                              {
                                                label: t(
                                                  "label_override_until"
                                                ),
                                                type: "date",
                                                value: overrideUntil,
                                                onChange: (e) => setOverrideUntil(
                                                  e.target.value
                                                ),
                                                placeholder: t(
                                                  "placeholder_date_ymd"
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              Button,
                                              {
                                                variant: "secondary",
                                                disabled: loading || actionLoading.override,
                                                loading: actionLoading.override,
                                                onClick: () => runAction(
                                                  "override",
                                                  async (r) => {
                                                    const until = overrideUntil ? (/* @__PURE__ */ new Date(
                                                      `${overrideUntil}T23:59:59.999Z`
                                                    )).toISOString() : "";
                                                    const res = await adminOverridePlan(
                                                      selectedCard2._id,
                                                      {
                                                        plan: String(
                                                          overridePlan || ""
                                                        ).trim(),
                                                        until,
                                                        reason: r
                                                      }
                                                    );
                                                    return res.data;
                                                  }
                                                ),
                                                children: t(
                                                  "btn_override"
                                                )
                                              }
                                            )
                                          ]
                                        }
                                      ),
                                      actionError.override ? /* @__PURE__ */ jsx(
                                        "p",
                                        {
                                          className: styles.errorText,
                                          children: actionError.override
                                        }
                                      ) : null
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("hint_card_tier") }),
                                /* @__PURE__ */ jsxs(
                                  "div",
                                  {
                                    className: styles.actionGroup,
                                    children: [
                                      /* @__PURE__ */ jsxs(
                                        "div",
                                        {
                                          className: styles.formRow,
                                          children: [
                                            /* @__PURE__ */ jsxs(
                                              "label",
                                              {
                                                className: styles.selectField,
                                                children: [
                                                  /* @__PURE__ */ jsx(
                                                    "span",
                                                    {
                                                      className: styles.selectLabel,
                                                      children: t(
                                                        "label_card_tier"
                                                      )
                                                    }
                                                  ),
                                                  /* @__PURE__ */ jsxs(
                                                    "select",
                                                    {
                                                      className: styles.select,
                                                      value: cardTier,
                                                      onChange: (e) => setCardTier(
                                                        e.target.value
                                                      ),
                                                      children: [
                                                        /* @__PURE__ */ jsx("option", { value: "", children: t(
                                                          "opt_clear"
                                                        ) }),
                                                        /* @__PURE__ */ jsx("option", { value: "free", children: t(
                                                          "opt_tier_free"
                                                        ) }),
                                                        /* @__PURE__ */ jsx("option", { value: "premium", children: t(
                                                          "opt_tier_premium"
                                                        ) })
                                                      ]
                                                    }
                                                  )
                                                ]
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              Input,
                                              {
                                                label: t(
                                                  "label_card_tier_until"
                                                ),
                                                type: "date",
                                                value: cardTierUntil,
                                                onChange: (e) => setCardTierUntil(
                                                  e.target.value
                                                ),
                                                placeholder: t(
                                                  "placeholder_date_ymd"
                                                )
                                              }
                                            ),
                                            /* @__PURE__ */ jsx(
                                              Button,
                                              {
                                                variant: "secondary",
                                                disabled: loading || actionLoading.cardTier,
                                                loading: actionLoading.cardTier,
                                                onClick: () => runAction(
                                                  "cardTier",
                                                  async (r) => {
                                                    const until = cardTierUntil ? (/* @__PURE__ */ new Date(
                                                      `${cardTierUntil}T23:59:59.999Z`
                                                    )).toISOString() : "";
                                                    const res = await adminSetCardTier(
                                                      selectedCard2._id,
                                                      {
                                                        tier: cardTier || null,
                                                        until,
                                                        reason: r
                                                      }
                                                    );
                                                    return res.data;
                                                  }
                                                ),
                                                children: t("btn_apply")
                                              }
                                            )
                                          ]
                                        }
                                      ),
                                      actionError.cardTier ? /* @__PURE__ */ jsx(
                                        "p",
                                        {
                                          className: styles.errorText,
                                          children: actionError.cardTier
                                        }
                                      ) : null
                                    ]
                                  }
                                ),
                                selectedCardOwner === "user" ? /* @__PURE__ */ jsxs(Fragment, { children: [
                                  /* @__PURE__ */ jsx(
                                    "p",
                                    {
                                      className: styles.muted,
                                      children: t(
                                        "hint_user_tier"
                                      )
                                    }
                                  ),
                                  /* @__PURE__ */ jsxs(
                                    "div",
                                    {
                                      className: styles.actionGroup,
                                      children: [
                                        /* @__PURE__ */ jsxs(
                                          "div",
                                          {
                                            className: styles.formRow,
                                            children: [
                                              /* @__PURE__ */ jsxs(
                                                "label",
                                                {
                                                  className: styles.selectField,
                                                  children: [
                                                    /* @__PURE__ */ jsx(
                                                      "span",
                                                      {
                                                        className: styles.selectLabel,
                                                        children: t(
                                                          "label_user_tier"
                                                        )
                                                      }
                                                    ),
                                                    /* @__PURE__ */ jsxs(
                                                      "select",
                                                      {
                                                        className: styles.select,
                                                        value: userTier,
                                                        onChange: (e) => setUserTier(
                                                          e.target.value
                                                        ),
                                                        children: [
                                                          /* @__PURE__ */ jsx("option", { value: "", children: t(
                                                            "opt_clear"
                                                          ) }),
                                                          /* @__PURE__ */ jsx("option", { value: "free", children: t(
                                                            "opt_tier_free"
                                                          ) }),
                                                          /* @__PURE__ */ jsx("option", { value: "premium", children: t(
                                                            "opt_tier_premium"
                                                          ) })
                                                        ]
                                                      }
                                                    )
                                                  ]
                                                }
                                              ),
                                              /* @__PURE__ */ jsx(
                                                Input,
                                                {
                                                  label: t(
                                                    "label_user_tier_until"
                                                  ),
                                                  type: "date",
                                                  value: userTierUntil,
                                                  onChange: (e) => setUserTierUntil(
                                                    e.target.value
                                                  ),
                                                  placeholder: t(
                                                    "placeholder_date_ymd"
                                                  )
                                                }
                                              ),
                                              /* @__PURE__ */ jsx(
                                                Button,
                                                {
                                                  variant: "secondary",
                                                  disabled: loading || actionLoading.userTier,
                                                  loading: actionLoading.userTier,
                                                  onClick: runUserTierAction,
                                                  children: t(
                                                    "btn_apply"
                                                  )
                                                }
                                              )
                                            ]
                                          }
                                        ),
                                        actionError.userTier ? /* @__PURE__ */ jsx(
                                          "p",
                                          {
                                            className: styles.errorText,
                                            children: actionError.userTier
                                          }
                                        ) : null
                                      ]
                                    }
                                  )
                                ] }) : null
                              ]
                            }
                          ) : null,
                          selectedTab === "danger" ? renderCardDangerTab() : null
                        ] }) : null
                      ]
                    }
                  )
                ]
              }
            ),
            selectedUser ? /* @__PURE__ */ jsxs("div", { className: styles.cardShell, children: [
              /* @__PURE__ */ jsxs("div", { className: styles.cardHeader, children: [
                /* @__PURE__ */ jsx("div", { className: styles.headerRow, children: /* @__PURE__ */ jsx("h2", { className: styles.h2, children: "משתמש נבחר" }) }),
                userDeleteSuccess ? /* @__PURE__ */ jsx(
                  FlashBanner,
                  {
                    type: "success",
                    message: userDeleteSuccess,
                    autoHideMs: 4500,
                    onDismiss: () => setUserDeleteSuccess("")
                  }
                ) : null,
                selectedUserError ? /* @__PURE__ */ jsx("p", { className: styles.errorText, children: selectedUserError }) : null,
                /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles.selectedHeaderStrip,
                    children: [
                      /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: styles.selectedPrimary,
                          children: [
                            /* @__PURE__ */ jsxs(
                              "span",
                              {
                                className: styles.selectedLabel,
                                children: [
                                  t("th_email"),
                                  ":"
                                ]
                              }
                            ),
                            " ",
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: `${styles.ltr} ${styles.selectedValue}`,
                                dir: "ltr",
                                title: selectedUser?.email || "",
                                children: selectedUser?.email || ""
                              }
                            )
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: styles.selectedMeta,
                          children: [
                            /* @__PURE__ */ jsxs(
                              "span",
                              {
                                className: styles.metaPill,
                                children: [
                                  /* @__PURE__ */ jsx(
                                    "span",
                                    {
                                      className: styles.metaKey,
                                      children: "ID:"
                                    }
                                  ),
                                  " ",
                                  /* @__PURE__ */ jsx(
                                    "span",
                                    {
                                      className: styles.ltr,
                                      dir: "ltr",
                                      title: selectedUser?._id || "",
                                      children: selectedUser?._id || ""
                                    }
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ jsxs(
                              "span",
                              {
                                className: styles.metaPill,
                                children: [
                                  /* @__PURE__ */ jsxs(
                                    "span",
                                    {
                                      className: styles.metaKey,
                                      children: [
                                        t("th_role"),
                                        ":"
                                      ]
                                    }
                                  ),
                                  " ",
                                  /* @__PURE__ */ jsx("span", { children: roleHe(
                                    selectedUser?.role
                                  ) })
                                ]
                              }
                            )
                          ]
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles.tabs,
                    role: "tablist",
                    "aria-label": "Selected user tabs",
                    ref: selectedUserTabListRef,
                    onKeyDown: (e) => handleTabListKeyDown(e, {
                      current: selectedUserTab,
                      setCurrent: setSelectedUserTab,
                      order: [
                        "general",
                        "billing",
                        "actions",
                        "danger"
                      ],
                      tabListRef: selectedUserTabListRef
                    }),
                    children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: `${styles.tab} ${selectedUserTab === "general" ? styles.tabActive : ""}`,
                          role: "tab",
                          "aria-selected": selectedUserTab === "general",
                          onClick: () => setSelectedUserTab(
                            "general"
                          ),
                          children: "כללי"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: `${styles.tab} ${selectedUserTab === "billing" ? styles.tabActive : ""}`,
                          role: "tab",
                          "aria-selected": selectedUserTab === "billing",
                          onClick: () => setSelectedUserTab(
                            "billing"
                          ),
                          children: "חיוב"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: `${styles.tab} ${selectedUserTab === "actions" ? styles.tabActive : ""}`,
                          role: "tab",
                          "aria-selected": selectedUserTab === "actions",
                          onClick: () => setSelectedUserTab(
                            "actions"
                          ),
                          children: "פעולות"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: `${styles.tab} ${selectedUserTab === "danger" ? styles.tabActive : ""}`,
                          role: "tab",
                          "aria-selected": selectedUserTab === "danger",
                          onClick: () => setSelectedUserTab("danger"),
                          children: "סכנה"
                        }
                      )
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("div", { className: styles.cardBody, children: selectedUserTab === "general" ? /* @__PURE__ */ jsx(
                "div",
                {
                  className: styles.sectionBlock,
                  children: /* @__PURE__ */ jsx("div", { className: styles.kv, children: /* @__PURE__ */ jsxs("dl", { className: styles.kvDl, children: [
                    /* @__PURE__ */ jsx(
                      "dt",
                      {
                        className: styles.kvDt,
                        children: t("th_email")
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dd",
                      {
                        className: styles.kvDd,
                        children: /* @__PURE__ */ jsx(
                          "span",
                          {
                            className: styles.ltr,
                            dir: "ltr",
                            children: selectedUser?.email || ""
                          }
                        )
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dt",
                      {
                        className: styles.kvDt,
                        children: t("th_role")
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dd",
                      {
                        className: styles.kvDd,
                        children: roleHe(
                          selectedUser?.role
                        )
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dt",
                      {
                        className: styles.kvDt,
                        children: t("th_created")
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dd",
                      {
                        className: styles.kvDd,
                        children: formatDate(
                          selectedUser?.createdAt
                        )
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dt",
                      {
                        className: styles.kvDt,
                        children: "עודכן"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dd",
                      {
                        className: styles.kvDd,
                        children: selectedUser?.updatedAt ? formatDate(
                          selectedUser.updatedAt
                        ) : "-"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dt",
                      {
                        className: styles.kvDt,
                        children: t("th_card")
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dd",
                      {
                        className: styles.kvDd,
                        children: selectedUser?.cardId ? /* @__PURE__ */ jsx(
                          "span",
                          {
                            className: styles.ltr,
                            dir: "ltr",
                            children: String(
                              selectedUser.cardId
                            )
                          }
                        ) : "-"
                      }
                    )
                  ] }) })
                }
              ) : selectedUserTab === "billing" ? /* @__PURE__ */ jsx(
                "div",
                {
                  className: styles.sectionBlock,
                  children: /* @__PURE__ */ jsx("div", { className: styles.kv, children: /* @__PURE__ */ jsxs("dl", { className: styles.kvDl, children: [
                    /* @__PURE__ */ jsx(
                      "dt",
                      {
                        className: styles.kvDt,
                        children: "Plan"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dd",
                      {
                        className: styles.kvDd,
                        children: planHe(
                          selectedUser?.plan
                        )
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dt",
                      {
                        className: styles.kvDt,
                        children: "Tier"
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "dd",
                      {
                        className: styles.kvDd,
                        children: [
                          selectedUser?.adminTier ? tierHe(
                            selectedUser.adminTier
                          ) : "-",
                          selectedUser?.adminTierUntil ? ` · עד ${formatDate(selectedUser.adminTierUntil)}` : ""
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "dt",
                      {
                        className: styles.kvDt,
                        children: "Subscription"
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "dd",
                      {
                        className: styles.kvDd,
                        children: [
                          /* @__PURE__ */ jsx(
                            "span",
                            {
                              className: styles.ltr,
                              dir: "ltr",
                              children: selectedUser?.subscription?.status ? String(
                                selectedUser.subscription.status
                              ) : "inactive"
                            }
                          ),
                          selectedUser?.subscription?.expiresAt ? ` · expires ${formatDate(selectedUser.subscription.expiresAt)}` : "",
                          selectedUser?.subscription?.provider ? ` · provider ${String(selectedUser.subscription.provider)}` : ""
                        ]
                      }
                    )
                  ] }) })
                }
              ) : selectedUserTab === "danger" ? /* @__PURE__ */ jsxs(
                "div",
                {
                  className: styles.sectionBlock,
                  children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: styles.sectionTitle,
                        children: "סכנה"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      Input,
                      {
                        label: t("label_reason"),
                        value: reason,
                        onChange: (e) => setReason(
                          e.target.value
                        ),
                        placeholder: t(
                          "placeholder_reason"
                        ),
                        required: true
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      Input,
                      {
                        label: 'הקלד "DELETE" לאישור',
                        value: userDeleteConfirm,
                        onChange: (e) => setUserDeleteConfirm(
                          e.target.value
                        ),
                        placeholder: "DELETE",
                        required: true
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles.actionGroup,
                        children: [
                          /* @__PURE__ */ jsx(
                            Button,
                            {
                              variant: "danger",
                              disabled: loading,
                              loading,
                              onClick: runUserDeletePermanent,
                              children: t(
                                "btn_delete_user_permanently"
                              )
                            }
                          ),
                          userDeleteError ? /* @__PURE__ */ jsx(
                            "p",
                            {
                              className: styles.errorText,
                              children: userDeleteError
                            }
                          ) : null
                        ]
                      }
                    )
                  ]
                }
              ) : /* @__PURE__ */ jsx("p", { className: styles.muted, children: t("msg_coming_later") }) })
            ] }) : null
          ]
        }
      )
    ] }) : adminMode === "blog" ? /* @__PURE__ */ jsx(AdminBlogView, {}) : adminMode === "guides" ? /* @__PURE__ */ jsx(AdminGuidesView, {}) : /* @__PURE__ */ jsx(AdminAnalyticsView, { refreshKey: analyticsRefreshKey }) })
  ] });
}
export {
  Admin as default
};
