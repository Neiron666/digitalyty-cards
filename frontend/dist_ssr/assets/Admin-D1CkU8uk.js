import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect, useRef, useId, useCallback } from "react";
import { a as api, F as FlashBanner, B as Button, q as useFocusTrap, u as useAuth } from "../entry-server.js";
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
function adminSetUserSubscription(userId, { plan, expiresAt, status: status2, reason } = {}) {
  return api.post(`/admin/billing/users/${userId}/subscription/set`, {
    plan,
    expiresAt,
    provider: "admin",
    status: status2,
    reason
  });
}
function adminRevokeUserSubscription(userId, { reason } = {}) {
  return api.post(`/admin/billing/users/${userId}/subscription/revoke`, {
    reason
  });
}
function adminSetCardBilling(cardId, { plan, paidUntil, status: status2, reason, payerType, payerNote } = {}) {
  const body2 = { plan, paidUntil, status: status2, reason };
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
function listAdminMarketingRecipients(params = {}) {
  return api.get("/admin/marketing/recipients", { params });
}
function previewMarketingCampaign(payload) {
  return api.post("/admin/marketing/campaigns/preview", payload);
}
function testSendMarketingCampaign(payload) {
  return api.post("/admin/marketing/campaigns/test-send", payload);
}
function dryRunMarketingCampaign(userIds) {
  return api.post("/admin/marketing/campaigns/dry-run", { userIds });
}
function createMarketingCampaignDraft(payload) {
  return api.post("/admin/marketing/campaigns/drafts", payload);
}
function listMarketingCampaignDrafts(params = {}) {
  const query = {};
  if (params.status !== void 0) query.status = params.status;
  if (params.page !== void 0) query.page = params.page;
  if (params.limit !== void 0) query.limit = params.limit;
  return api.get("/admin/marketing/campaigns/drafts", { params: query });
}
function getMarketingCampaignDraft(campaignId) {
  return api.get(`/admin/marketing/campaigns/drafts/${campaignId}`);
}
function cancelMarketingCampaignDraft(campaignId) {
  return api.patch(`/admin/marketing/campaigns/drafts/${campaignId}/cancel`);
}
function checkMarketingCampaignSendReadiness(campaignId) {
  return api.post(
    `/admin/marketing/campaigns/${campaignId}/send-readiness`,
    {}
  );
}
function getMarketingCampaignSendStatus(campaignId) {
  return api.get(`/admin/marketing/campaigns/${campaignId}/send-status`);
}
function deleteMarketingCampaign(campaignId) {
  return api.delete(`/admin/marketing/campaigns/${campaignId}`);
}
function startMarketingCampaignSend(campaignId, requestId) {
  return api.post(`/admin/marketing/campaigns/${campaignId}/start`, {
    requestId
  });
}
function cancelMarketingCampaignSend(campaignId) {
  return api.patch(
    `/admin/marketing/campaigns/${campaignId}/cancel-send`,
    {}
  );
}
function listAdminOrganizations(params = {}) {
  return api.get("/admin/orgs", { params });
}
function createAdminOrganization({ name, slug, note: note2, seatLimit } = {}) {
  return api.post("/admin/orgs", { name, slug, note: note2, seatLimit });
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
const root$3 = "_root_1a0bs_1";
const header$5 = "_header_1a0bs_21";
const controls$1 = "_controls_1a0bs_35";
const titleWrap$1 = "_titleWrap_1a0bs_51";
const title$6 = "_title_1a0bs_51";
const subtitle$2 = "_subtitle_1a0bs_79";
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
const row$3 = "_row_1a0bs_345";
const rowKey = "_rowKey_1a0bs_371";
const rowVal = "_rowVal_1a0bs_417";
const campaignsGrid = "_campaignsGrid_1a0bs_429";
const campaignCard = "_campaignCard_1a0bs_441";
const campaignTitle = "_campaignTitle_1a0bs_463";
const muted$6 = "_muted_1a0bs_473";
const errorText$1 = "_errorText_1a0bs_483";
const visitApproxNote = "_visitApproxNote_1a0bs_537";
const visitSubTitle = "_visitSubTitle_1a0bs_551";
const visitTableHead = "_visitTableHead_1a0bs_567";
const visitTableRow = "_visitTableRow_1a0bs_589";
const visitCellSource = "_visitCellSource_1a0bs_613";
const visitCellNum = "_visitCellNum_1a0bs_629";
const styles$9 = {
  root: root$3,
  header: header$5,
  controls: controls$1,
  titleWrap: titleWrap$1,
  title: title$6,
  subtitle: subtitle$2,
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
  row: row$3,
  rowKey,
  rowVal,
  campaignsGrid,
  campaignCard,
  campaignTitle,
  muted: muted$6,
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
  const [error2, setError] = useState("");
  const [summary2, setSummary] = useState(null);
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
  const kpi = summary2?.kpi || null;
  const today = summary2?.today || null;
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
      className: styles$9.root,
      dir: "rtl",
      "aria-label": "אנליטיקת אתר (שיווק)",
      children: [
        /* @__PURE__ */ jsxs("header", { className: styles$9.header, children: [
          /* @__PURE__ */ jsxs("div", { className: styles$9.titleWrap, children: [
            /* @__PURE__ */ jsx("h2", { className: styles$9.title, children: "אנליטיקת אתר (שיווק)" }),
            /* @__PURE__ */ jsx("p", { className: styles$9.subtitle, children: "מציג נתונים מכל הדפים הציבוריים השיווקיים · לא כולל דפי כרטיסים, ניהול, הרשמה ואימות" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$9.controls, children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                className: styles$9.rangeTabs,
                role: "tablist",
                "aria-label": "Range",
                children: RANGE_OPTIONS.map((d) => /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: `${styles$9.tab} ${rangeDays === d ? styles$9.tabActive : ""}`,
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
                className: `${styles$9.optOutBtn} ${optOut ? styles$9.optOutBtnActive : ""}`,
                "aria-pressed": optOut,
                onClick: onToggleOptOut,
                children: "אל תעקוב אחרי הביקורים שלי"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { className: styles$9.optOutHint, children: optOut ? "איסוף נתונים מושבת: הביקורים שלך מהמכשיר הזה לא נספרים." : "איסוף נתונים פעיל: הביקורים שלך בדפים הציבוריים נספרים." }),
        loading ? /* @__PURE__ */ jsx("p", { className: styles$9.muted, children: "טוען…" }) : error2 ? /* @__PURE__ */ jsx("p", { className: styles$9.errorText, children: error2 }) : !summary2 || !sources ? /* @__PURE__ */ jsxs("p", { className: styles$9.muted, children: [
          "מצב ",
          rangeLabel,
          ": אין נתונים."
        ] }) : null,
        /* @__PURE__ */ jsxs("div", { className: styles$9.blocks, children: [
          /* @__PURE__ */ jsxs("div", { className: styles$9.block, children: [
            /* @__PURE__ */ jsx("div", { className: styles$9.blockTitle, children: "מדדי מפתח" }),
            /* @__PURE__ */ jsxs("div", { className: styles$9.kpis, children: [
              /* @__PURE__ */ jsxs("div", { className: styles$9.kpiCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$9.kpiLabel, children: "צפיות" }),
                /* @__PURE__ */ jsx("div", { className: styles$9.kpiValue, children: typeof kpi?.views === "number" ? kpi.views : "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$9.kpiCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$9.kpiLabel, children: "קליקים" }),
                /* @__PURE__ */ jsx("div", { className: styles$9.kpiValue, children: typeof kpi?.clicksTotal === "number" ? kpi.clicksTotal : "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$9.kpiCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$9.kpiLabel, children: "יחס המרה" }),
                /* @__PURE__ */ jsx("div", { className: styles$9.kpiValue, children: typeof kpi?.conversion === "number" ? formatPct(kpi.conversion) : "-" })
              ] })
            ] }),
            today && rangeDays !== 1 ? /* @__PURE__ */ jsxs("p", { className: styles$9.muted, children: [
              "היום: צפיות ",
              Number(today.views) || 0,
              " · קליקים",
              " ",
              Number(today.clicksTotal) || 0
            ] }) : null
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$9.block, children: [
            /* @__PURE__ */ jsx("div", { className: styles$9.blockTitle, children: "מקורות" }),
            /* @__PURE__ */ jsxs("div", { className: styles$9.sourcesGrid, children: [
              /* @__PURE__ */ jsxs("div", { className: styles$9.sourceCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$9.sourceTitle, children: "ערוצי תנועה" }),
                channelsRows.length ? /* @__PURE__ */ jsx("div", { className: styles$9.rows, children: channelsRows.map((r) => /* @__PURE__ */ jsxs("div", { className: styles$9.row, children: [
                  /* @__PURE__ */ jsx("span", { className: styles$9.rowKey, children: CHANNEL_LABELS[r.key] || r.key }),
                  /* @__PURE__ */ jsx("span", { className: styles$9.rowVal, children: r.count })
                ] }, r.key)) }) : /* @__PURE__ */ jsx("p", { className: styles$9.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$9.sourceCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$9.sourceTitle, children: "מקורות מנורמלים" }),
                sourceTopRows.length ? /* @__PURE__ */ jsx("div", { className: styles$9.rows, children: sourceTopRows.map((r) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$9.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowKey, children: sourceLabel(r.source) }),
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowVal, children: Number(r.count) || 0 })
                    ]
                  },
                  r.source
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$9.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$9.sourceCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$9.sourceTitle, children: "מקורות הפניה" }),
                referrersTop.length ? /* @__PURE__ */ jsx("div", { className: styles$9.rows, children: referrersTop.map((r) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$9.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowKey, children: r.referrer }),
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowVal, children: Number(r.count) || 0 })
                    ]
                  },
                  r.referrer
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$9.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$9.sourceCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$9.sourceTitle, children: "UTM" }),
                utmTop.length ? /* @__PURE__ */ jsx("div", { className: styles$9.rows, children: utmTop.map((r) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$9.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowKey, children: r.source }),
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowVal, children: Number(r.count) || 0 })
                    ]
                  },
                  r.source
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$9.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$9.sourceCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$9.sourceTitle, children: "מקורות בינה מלאכותית" }),
                aiSourcesTop.length ? /* @__PURE__ */ jsx("div", { className: styles$9.rows, children: aiSourcesTop.map((r) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$9.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowKey, children: r.source }),
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowVal, children: Number(r.count) || 0 })
                    ]
                  },
                  r.source
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$9.muted, children: "-" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$9.block, children: [
            /* @__PURE__ */ jsx("div", { className: styles$9.blockTitle, children: "פופולרי" }),
            /* @__PURE__ */ jsxs("div", { className: styles$9.campaignsGrid, children: [
              /* @__PURE__ */ jsxs("div", { className: styles$9.campaignCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$9.campaignTitle, children: "עמודים מובילים" }),
                topPages.length ? /* @__PURE__ */ jsx("div", { className: styles$9.rows, children: topPages.slice(0, 10).map((p) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$9.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowKey, children: p.pagePath }),
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowVal, children: Number(p.count) || 0 })
                    ]
                  },
                  p.pagePath
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$9.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$9.campaignCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$9.campaignTitle, children: "פעולות מובילות" }),
                topActions.length ? /* @__PURE__ */ jsx("div", { className: styles$9.rows, children: topActions.map((a) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$9.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowKey, children: ACTION_LABELS[a.action] || a.action }),
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowVal, children: Number(a.count) || 0 })
                    ]
                  },
                  a.action
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$9.muted, children: "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$9.campaignCard, children: [
                /* @__PURE__ */ jsx("div", { className: styles$9.campaignTitle, children: "קמפיינים (UTM)" }),
                campaignsTop.length ? /* @__PURE__ */ jsx("div", { className: styles$9.rows, children: campaignsTop.slice(0, 10).map((c) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$9.row,
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowKey, children: c.campaign }),
                      /* @__PURE__ */ jsx("span", { className: styles$9.rowVal, children: Number(c.count) || 0 })
                    ]
                  },
                  c.campaign
                )) }) : /* @__PURE__ */ jsx("p", { className: styles$9.muted, children: "-" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$9.block, children: [
            /* @__PURE__ */ jsx("div", { className: styles$9.blockTitle, children: "ביקורים לפי מקור" }),
            /* @__PURE__ */ jsx("div", { className: styles$9.kpis, children: /* @__PURE__ */ jsxs("div", { className: styles$9.kpiCard, children: [
              /* @__PURE__ */ jsx("div", { className: styles$9.kpiLabel, children: "מבקרים (בקירוב)" }),
              /* @__PURE__ */ jsx("div", { className: styles$9.kpiValue, children: totalUniqueVisitors !== null ? totalUniqueVisitors : "-" }),
              /* @__PURE__ */ jsx("p", { className: styles$9.visitApproxNote, children: "כפיל דפדפן בלבד · לא מייצג אנשים · ביקורים ממקורות שונים עשויים לחפוף" })
            ] }) }),
            visitSourceRows.length > 0 ? /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("div", { className: styles$9.visitTableHead, children: [
                /* @__PURE__ */ jsx("span", { className: styles$9.visitCellSource, children: "מקור" }),
                /* @__PURE__ */ jsx("span", { className: styles$9.visitCellNum, children: "ביקורים" }),
                /* @__PURE__ */ jsx("span", { className: styles$9.visitCellNum, children: "מבקרים ייחודיים (בקירוב)" })
              ] }),
              visitSourceRows.map((r) => /* @__PURE__ */ jsxs(
                "div",
                {
                  className: styles$9.visitTableRow,
                  children: [
                    /* @__PURE__ */ jsx("span", { className: styles$9.visitCellSource, children: sourceLabel(r.source) }),
                    /* @__PURE__ */ jsx("span", { className: styles$9.visitCellNum, children: r.visits }),
                    /* @__PURE__ */ jsx("span", { className: styles$9.visitCellNum, children: r.uniqueVisitors !== null ? r.uniqueVisitors : "-" })
                  ]
                },
                r.source
              ))
            ] }) : !loading && !error2 ? /* @__PURE__ */ jsx("p", { className: styles$9.muted, children: "אין נתוני ביקורים לתקופה זו." }) : null,
            Object.keys(topLandingsBySource).length > 0 && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: styles$9.visitSubTitle, children: "עמודי כניסה לפי מקור" }),
              /* @__PURE__ */ jsx("div", { className: styles$9.sourcesGrid, children: Object.entries(topLandingsBySource).map(
                ([src, pages]) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$9.sourceCard,
                    children: [
                      /* @__PURE__ */ jsx("div", { className: styles$9.sourceTitle, children: sourceLabel(src) }),
                      /* @__PURE__ */ jsx("div", { className: styles$9.rows, children: pages.map((p) => /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: styles$9.row,
                          children: [
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles$9.rowKey,
                                children: p.landingPage
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles$9.rowVal,
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
              /* @__PURE__ */ jsx("p", { className: styles$9.visitSubTitle, children: "פעולות לפי מקור" }),
              /* @__PURE__ */ jsx("div", { className: styles$9.sourcesGrid, children: Object.entries(topActionsBySource).map(
                ([src, actions2]) => /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$9.sourceCard,
                    children: [
                      /* @__PURE__ */ jsx("div", { className: styles$9.sourceTitle, children: sourceLabel(src) }),
                      /* @__PURE__ */ jsx("div", { className: styles$9.rows, children: actions2.map((a) => /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: styles$9.row,
                          children: [
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles$9.rowKey,
                                children: ACTION_LABELS[a.action] || a.action
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles$9.rowVal,
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
const panel$3 = "_panel_nqnhm_97";
const searchRow$3 = "_searchRow_nqnhm_133";
const muted$5 = "_muted_nqnhm_147";
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
const pager$4 = "_pager_nqnhm_379";
const pagerMeta$3 = "_pagerMeta_nqnhm_397";
const form$2 = "_form_nqnhm_411";
const fieldLabel$1 = "_fieldLabel_nqnhm_423";
const textarea$2 = "_textarea_nqnhm_439";
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
const styles$8 = {
  wrap: wrap$2,
  topRow: topRow$1,
  h2: h2$3,
  h3: h3$2,
  h4: h4$1,
  grid: grid$2,
  panel: panel$3,
  searchRow: searchRow$3,
  muted: muted$5,
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
  pager: pager$4,
  pagerMeta: pagerMeta$3,
  form: form$2,
  fieldLabel: fieldLabel$1,
  textarea: textarea$2,
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
function mapBlogApiError(err2) {
  const status2 = err2?.response?.status;
  const apiMessage = typeof err2?.response?.data?.message === "string" ? err2.response.data.message.trim() : "";
  if (status2 === 401) return "נדרשת התחברות.";
  if (status2 === 403) return "אין הרשאות.";
  if (status2 === 404) return "הפוסט לא נמצא.";
  if (status2 === 409) return apiMessage || "סלאג כבר תפוס.";
  if (status2 === 413) return "הקובץ גדול מדי (מקסימום 2MB).";
  if (status2 === 422) return apiMessage || "שגיאת ולידציה.";
  return "אירעה שגיאה. נסה שוב.";
}
function formatDate$4(iso) {
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
  function showFlash(type, text2) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash({ type, text: text2 });
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
    } catch (err2) {
      showFlash("error", mapBlogApiError(err2));
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
    }).catch((err2) => {
      if (selectRequestRef.current !== requestId) return;
      showFlash("error", mapBlogApiError(err2));
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
  function handleSectionField(idx, field2, value) {
    setFSections((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field2]: value };
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
    } catch (err2) {
      showFlash("error", mapBlogApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapBlogApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapBlogApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapBlogApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapBlogApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapBlogApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapBlogApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapBlogApiError(err2));
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
  return /* @__PURE__ */ jsxs("div", { className: styles$8.wrap, children: [
    flash && /* @__PURE__ */ jsx(
      FlashBanner,
      {
        type: flash.type,
        message: flash.text,
        autoHideMs: 3500,
        onDismiss: () => setFlash(null)
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: styles$8.topRow, children: [
      /* @__PURE__ */ jsx("h2", { className: styles$8.h2, children: "ניהול בלוג" }),
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
    /* @__PURE__ */ jsxs("div", { className: styles$8.grid, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$8.panel, children: [
        /* @__PURE__ */ jsx("h3", { className: styles$8.h3, children: "פוסטים" }),
        /* @__PURE__ */ jsxs("form", { className: styles$8.searchRow, onSubmit: handleSearch, children: [
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
        listLoading && /* @__PURE__ */ jsx("p", { className: styles$8.muted, children: "טוען…" }),
        !listLoading && posts.length === 0 && /* @__PURE__ */ jsx("p", { className: styles$8.muted, children: "אין פוסטים." }),
        /* @__PURE__ */ jsx("ul", { className: styles$8.postList, children: posts.map((p) => /* @__PURE__ */ jsx(
          "li",
          {
            className: `${styles$8.postItem} ${selectedId === p.id ? styles$8.postItemActive : ""}`,
            children: /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                className: styles$8.postBtn,
                onClick: () => handleSelectPost(p),
                disabled: selectedBusy,
                children: [
                  p.heroImageUrl && /* @__PURE__ */ jsx(
                    "img",
                    {
                      className: styles$8.postThumb,
                      src: p.heroImageUrl,
                      alt: ""
                    }
                  ),
                  /* @__PURE__ */ jsxs("span", { className: styles$8.postInfo, children: [
                    /* @__PURE__ */ jsx("span", { className: styles$8.postTitle, children: p.title }),
                    p.excerpt && /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: styles$8.postExcerpt,
                        children: p.excerpt
                      }
                    ),
                    p.publishedAt && /* @__PURE__ */ jsx("span", { className: styles$8.postDate, children: formatDate$4(p.publishedAt) })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: `${styles$8.badge} ${p.status === "published" ? styles$8.badgePublished : styles$8.badgeDraft}`,
                      children: p.status === "published" ? "פורסם" : "טיוטה"
                    }
                  )
                ]
              }
            )
          },
          p.id
        )) }),
        postsTotal > limit && /* @__PURE__ */ jsxs("div", { className: styles$8.pager, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: () => setPage((p) => Math.max(1, p - 1)),
              disabled: page <= 1 || listLoading,
              children: "הקודם"
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: styles$8.pagerMeta, children: [
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
      /* @__PURE__ */ jsxs("div", { className: styles$8.panel, children: [
        /* @__PURE__ */ jsx("h3", { className: styles$8.h3, children: isEditing ? "עריכת פוסט" : "פוסט חדש" }),
        selectedBusy && selectedId && /* @__PURE__ */ jsx("p", { className: styles$8.muted, children: "טוען פוסט…" }),
        /* @__PURE__ */ jsxs("div", { className: styles$8.form, children: [
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
          /[\u0590-\u05FF]/.test(fTitle) && !normalizeSlug$1(fTitle) && /* @__PURE__ */ jsx("p", { className: styles$8.slugHint, children: "שימו לב: כשכותרת בעברית - הסלאג לא נוצר אוטומטית. אפשר להשאיר ריק (ייווצר אוטומטית כמו post-xxxxxxxx), או להזין סלאג באנגלית (a-z, 0-9, מקפים) לטובת SEO." }),
          /* @__PURE__ */ jsxs("label", { className: styles$8.fieldLabel, children: [
            "תקציר *",
            /* @__PURE__ */ jsx(
              "textarea",
              {
                className: styles$8.textarea,
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
        /* @__PURE__ */ jsxs("div", { className: styles$8.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$8.h4, children: "תמונה ראשית" }),
          fHeroUrl && /* @__PURE__ */ jsx("div", { className: styles$8.heroPreview, children: /* @__PURE__ */ jsx(
            "img",
            {
              className: styles$8.heroImg,
              src: fHeroUrl,
              alt: fHeroAlt || "hero"
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: styles$8.heroFields, children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "file",
                accept: "image/jpeg,image/png,image/webp",
                ref: heroFileRef,
                className: styles$8.fileInput,
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
            !selectedId && /* @__PURE__ */ jsx("p", { className: styles$8.uploadHint, children: "כדי להעלות תמונה צריך קודם לשמור את הפוסט." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$8.sectionBlock, children: [
          /* @__PURE__ */ jsxs("h4", { className: styles$8.h4, children: [
            "קטעי תוכן (",
            fSections.length,
            "/",
            MAX_SECTIONS$1,
            ")"
          ] }),
          fSections.map((sec, idx) => /* @__PURE__ */ jsxs("div", { className: styles$8.sectionCard, children: [
            /* @__PURE__ */ jsxs("div", { className: styles$8.sectionCardHeader, children: [
              /* @__PURE__ */ jsxs("span", { className: styles$8.sectionIdx, children: [
                "#",
                idx + 1
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$8.sectionActions, children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: styles$8.iconBtn,
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
                    className: styles$8.iconBtn,
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
                    className: `${styles$8.iconBtn} ${styles$8.iconBtnDanger}`,
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
            /* @__PURE__ */ jsxs("label", { className: styles$8.fieldLabel, children: [
              "תוכן",
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  className: styles$8.textarea,
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
            /* @__PURE__ */ jsxs("div", { className: styles$8.secImgBlock, children: [
              sec.imageUrl && /* @__PURE__ */ jsx("div", { className: styles$8.secImgPreview, children: /* @__PURE__ */ jsx(
                "img",
                {
                  className: styles$8.secImgThumb,
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
                  className: styles$8.fileInput,
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
              /* @__PURE__ */ jsxs("div", { className: styles$8.secImgActions, children: [
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    onClick: () => handleSectionImageUpload(idx),
                    disabled: selectedBusy || !selectedId,
                    variant: "secondary",
                    children: "העלה תמונת קטע"
                  }
                ),
                !selectedId && /* @__PURE__ */ jsx("p", { className: styles$8.uploadHint, children: "כדי להעלות תמונה צריך קודם לשמור את הפוסט." }),
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
            /* @__PURE__ */ jsxs("details", { className: styles$8.linkHint, children: [
              /* @__PURE__ */ jsx("summary", { className: styles$8.linkHintSummary, children: "איך מוסיפים קישורים בתוך הטקסט?" }),
              /* @__PURE__ */ jsxs("div", { className: styles$8.linkHintBody, children: [
                /* @__PURE__ */ jsx("p", { children: "טקסט לחיץ עם קישור:" }),
                /* @__PURE__ */ jsx("code", { className: styles$8.linkHintCode, children: "[טקסט להצגה](כתובת)" }),
                /* @__PURE__ */ jsx("p", { children: "אפשר גם להדביק כתובת URL מלאה - היא תזוהה אוטומטית." }),
                /* @__PURE__ */ jsx("p", { children: "לקישור פנימי בבלוג, עדיף להשתמש בנתיב יחסי:" }),
                /* @__PURE__ */ jsx("p", { className: styles$8.linkHintExamples, children: "דוגמאות:" }),
                /* @__PURE__ */ jsx("code", { className: styles$8.linkHintCode, children: "[קראו עוד](/blog/seo-tips)" }),
                /* @__PURE__ */ jsx("code", { className: styles$8.linkHintCode, children: "[לאתר הרשמי](https://example.com)" }),
                /* @__PURE__ */ jsx("code", { className: styles$8.linkHintCode, children: "https://cardigo.co.il/blog/digital-card-guide" })
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
        /* @__PURE__ */ jsxs("div", { className: styles$8.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$8.h4, children: "SEO" }),
          /* @__PURE__ */ jsxs("div", { className: styles$8.form, children: [
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
        /* @__PURE__ */ jsxs("div", { className: styles$8.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$8.h4, children: "מחבר" }),
          /* @__PURE__ */ jsxs("label", { className: styles$8.toggleRow, children: [
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
        isEditing && /* @__PURE__ */ jsxs("div", { className: styles$8.timestampsRow, children: [
          /* @__PURE__ */ jsxs("span", { className: styles$8.tsItem, children: [
            "נוצר: ",
            formatDate$4(fCreatedAt)
          ] }),
          /* @__PURE__ */ jsxs("span", { className: styles$8.tsItem, children: [
            "עודכן: ",
            formatDate$4(fUpdatedAt)
          ] }),
          fPublishedAt && /* @__PURE__ */ jsxs("span", { className: styles$8.tsItem, children: [
            "פורסם: ",
            formatDate$4(fPublishedAt)
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: styles$8.actionRow, children: isEditing ? /* @__PURE__ */ jsxs(Fragment, { children: [
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
const panel$2 = "_panel_nqnhm_97";
const searchRow$2 = "_searchRow_nqnhm_133";
const muted$4 = "_muted_nqnhm_147";
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
const pager$3 = "_pager_nqnhm_379";
const pagerMeta$2 = "_pagerMeta_nqnhm_397";
const form$1 = "_form_nqnhm_411";
const fieldLabel = "_fieldLabel_nqnhm_423";
const textarea$1 = "_textarea_nqnhm_439";
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
const styles$7 = {
  wrap: wrap$1,
  topRow,
  h2: h2$2,
  h3: h3$1,
  h4,
  grid: grid$1,
  panel: panel$2,
  searchRow: searchRow$2,
  muted: muted$4,
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
  pager: pager$3,
  pagerMeta: pagerMeta$2,
  form: form$1,
  fieldLabel,
  textarea: textarea$1,
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
function mapGuideApiError(err2) {
  const status2 = err2?.response?.status;
  const apiMessage = typeof err2?.response?.data?.message === "string" ? err2.response.data.message.trim() : "";
  if (status2 === 401) return "נדרשת התחברות.";
  if (status2 === 403) return "אין הרשאות.";
  if (status2 === 404) return "המדריך לא נמצא.";
  if (status2 === 409) return apiMessage || "סלאג כבר תפוס.";
  if (status2 === 413) return "הקובץ גדול מדי (מקסימום 2MB).";
  if (status2 === 422) return apiMessage || "שגיאת ולידציה.";
  return "אירעה שגיאה. נסה שוב.";
}
function formatDate$3(iso) {
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
  function showFlash(type, text2) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash({ type, text: text2 });
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
    } catch (err2) {
      showFlash("error", mapGuideApiError(err2));
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
    }).catch((err2) => {
      if (selectRequestRef.current !== requestId) return;
      showFlash("error", mapGuideApiError(err2));
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
  function handleSectionField(idx, field2, value) {
    setFSections((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field2]: value };
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
    } catch (err2) {
      showFlash("error", mapGuideApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapGuideApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapGuideApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapGuideApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapGuideApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapGuideApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapGuideApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapGuideApiError(err2));
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
  return /* @__PURE__ */ jsxs("div", { className: styles$7.wrap, children: [
    flash && /* @__PURE__ */ jsx(
      FlashBanner,
      {
        type: flash.type,
        message: flash.text,
        autoHideMs: 3500,
        onDismiss: () => setFlash(null)
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: styles$7.topRow, children: [
      /* @__PURE__ */ jsx("h2", { className: styles$7.h2, children: "ניהול מדריכים" }),
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
    /* @__PURE__ */ jsxs("div", { className: styles$7.grid, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$7.panel, children: [
        /* @__PURE__ */ jsx("h3", { className: styles$7.h3, children: "מדריכים" }),
        /* @__PURE__ */ jsxs("form", { className: styles$7.searchRow, onSubmit: handleSearch, children: [
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
        listLoading && /* @__PURE__ */ jsx("p", { className: styles$7.muted, children: "טוען…" }),
        !listLoading && posts.length === 0 && /* @__PURE__ */ jsx("p", { className: styles$7.muted, children: "אין מדריכים." }),
        /* @__PURE__ */ jsx("ul", { className: styles$7.postList, children: posts.map((p) => /* @__PURE__ */ jsx(
          "li",
          {
            className: `${styles$7.postItem} ${selectedId === p.id ? styles$7.postItemActive : ""}`,
            children: /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                className: styles$7.postBtn,
                onClick: () => handleSelectPost(p),
                disabled: selectedBusy,
                children: [
                  p.heroImageUrl && /* @__PURE__ */ jsx(
                    "img",
                    {
                      className: styles$7.postThumb,
                      src: p.heroImageUrl,
                      alt: ""
                    }
                  ),
                  /* @__PURE__ */ jsxs("span", { className: styles$7.postInfo, children: [
                    /* @__PURE__ */ jsx("span", { className: styles$7.postTitle, children: p.title }),
                    p.excerpt && /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: styles$7.postExcerpt,
                        children: p.excerpt
                      }
                    ),
                    p.publishedAt && /* @__PURE__ */ jsx("span", { className: styles$7.postDate, children: formatDate$3(p.publishedAt) })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: `${styles$7.badge} ${p.status === "published" ? styles$7.badgePublished : styles$7.badgeDraft}`,
                      children: p.status === "published" ? "פורסם" : "טיוטה"
                    }
                  )
                ]
              }
            )
          },
          p.id
        )) }),
        postsTotal > limit && /* @__PURE__ */ jsxs("div", { className: styles$7.pager, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: () => setPage((p) => Math.max(1, p - 1)),
              disabled: page <= 1 || listLoading,
              children: "הקודם"
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: styles$7.pagerMeta, children: [
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
      /* @__PURE__ */ jsxs("div", { className: styles$7.panel, children: [
        /* @__PURE__ */ jsx("h3", { className: styles$7.h3, children: isEditing ? "עריכת מדריך" : "מדריך חדש" }),
        selectedBusy && selectedId && /* @__PURE__ */ jsx("p", { className: styles$7.muted, children: "טוען מדריך…" }),
        /* @__PURE__ */ jsxs("div", { className: styles$7.form, children: [
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
          /[\u0590-\u05FF]/.test(fTitle) && !normalizeSlug(fTitle) && /* @__PURE__ */ jsx("p", { className: styles$7.slugHint, children: "שימו לב: כשכותרת בעברית - הסלאג לא נוצר אוטומטית. אפשר להשאיר ריק (ייווצר אוטומטית כמו guide-xxxxxxxx), או להזין סלאג באנגלית (a-z, 0-9, מקפים) לטובת SEO." }),
          /* @__PURE__ */ jsxs("label", { className: styles$7.fieldLabel, children: [
            "תקציר *",
            /* @__PURE__ */ jsx(
              "textarea",
              {
                className: styles$7.textarea,
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
        /* @__PURE__ */ jsxs("div", { className: styles$7.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$7.h4, children: "תמונה ראשית" }),
          fHeroUrl && /* @__PURE__ */ jsx("div", { className: styles$7.heroPreview, children: /* @__PURE__ */ jsx(
            "img",
            {
              className: styles$7.heroImg,
              src: fHeroUrl,
              alt: fHeroAlt || "hero"
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: styles$7.heroFields, children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "file",
                accept: "image/jpeg,image/png,image/webp",
                ref: heroFileRef,
                className: styles$7.fileInput,
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
            !selectedId && /* @__PURE__ */ jsx("p", { className: styles$7.uploadHint, children: "כדי להעלות תמונה צריך קודם לשמור את המדריך." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$7.sectionBlock, children: [
          /* @__PURE__ */ jsxs("h4", { className: styles$7.h4, children: [
            "קטעי תוכן (",
            fSections.length,
            "/",
            MAX_SECTIONS,
            ")"
          ] }),
          fSections.map((sec, idx) => /* @__PURE__ */ jsxs("div", { className: styles$7.sectionCard, children: [
            /* @__PURE__ */ jsxs("div", { className: styles$7.sectionCardHeader, children: [
              /* @__PURE__ */ jsxs("span", { className: styles$7.sectionIdx, children: [
                "#",
                idx + 1
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$7.sectionActions, children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: styles$7.iconBtn,
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
                    className: styles$7.iconBtn,
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
                    className: `${styles$7.iconBtn} ${styles$7.iconBtnDanger}`,
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
            /* @__PURE__ */ jsxs("label", { className: styles$7.fieldLabel, children: [
              "תוכן",
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  className: styles$7.textarea,
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
            /* @__PURE__ */ jsxs("div", { className: styles$7.secImgBlock, children: [
              sec.imageUrl && /* @__PURE__ */ jsx("div", { className: styles$7.secImgPreview, children: /* @__PURE__ */ jsx(
                "img",
                {
                  className: styles$7.secImgThumb,
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
                  className: styles$7.fileInput,
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
              /* @__PURE__ */ jsxs("div", { className: styles$7.secImgActions, children: [
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    onClick: () => handleSectionImageUpload(idx),
                    disabled: selectedBusy || !selectedId,
                    variant: "secondary",
                    children: "העלה תמונת קטע"
                  }
                ),
                !selectedId && /* @__PURE__ */ jsx("p", { className: styles$7.uploadHint, children: "כדי להעלות תמונה צריך קודם לשמור את המדריך." }),
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
            /* @__PURE__ */ jsxs("details", { className: styles$7.linkHint, children: [
              /* @__PURE__ */ jsx("summary", { className: styles$7.linkHintSummary, children: "איך מוסיפים קישורים בתוך הטקסט?" }),
              /* @__PURE__ */ jsxs("div", { className: styles$7.linkHintBody, children: [
                /* @__PURE__ */ jsx("p", { children: "טקסט לחיץ עם קישור:" }),
                /* @__PURE__ */ jsx("code", { className: styles$7.linkHintCode, children: "[טקסט להצגה](כתובת)" }),
                /* @__PURE__ */ jsx("p", { children: "אפשר גם להדביק כתובת URL מלאה - היא תזוהה אוטומטית." }),
                /* @__PURE__ */ jsx("p", { children: "לקישור פנימי במדריכים, עדיף להשתמש בנתיב יחסי:" }),
                /* @__PURE__ */ jsx("p", { className: styles$7.linkHintExamples, children: "דוגמאות:" }),
                /* @__PURE__ */ jsx("code", { className: styles$7.linkHintCode, children: "[קראו עוד](/guides/getting-started)" }),
                /* @__PURE__ */ jsx("code", { className: styles$7.linkHintCode, children: "[לאתר הרשמי](https://example.com)" }),
                /* @__PURE__ */ jsx("code", { className: styles$7.linkHintCode, children: "https://cardigo.co.il/guides/digital-card-guide" })
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
        /* @__PURE__ */ jsxs("div", { className: styles$7.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$7.h4, children: "SEO" }),
          /* @__PURE__ */ jsxs("div", { className: styles$7.form, children: [
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
        /* @__PURE__ */ jsxs("div", { className: styles$7.sectionBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$7.h4, children: "מחבר" }),
          /* @__PURE__ */ jsxs("label", { className: styles$7.toggleRow, children: [
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
        isEditing && /* @__PURE__ */ jsxs("div", { className: styles$7.timestampsRow, children: [
          /* @__PURE__ */ jsxs("span", { className: styles$7.tsItem, children: [
            "נוצר: ",
            formatDate$3(fCreatedAt)
          ] }),
          /* @__PURE__ */ jsxs("span", { className: styles$7.tsItem, children: [
            "עודכן: ",
            formatDate$3(fUpdatedAt)
          ] }),
          fPublishedAt && /* @__PURE__ */ jsxs("span", { className: styles$7.tsItem, children: [
            "פורסם: ",
            formatDate$3(fPublishedAt)
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: styles$7.actionRow, children: isEditing ? /* @__PURE__ */ jsxs(Fragment, { children: [
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
const root$2 = "_root_19she_1";
const header$4 = "_header_19she_21";
const title$5 = "_title_19she_35";
const boundary$1 = "_boundary_19she_49";
const fields = "_fields_19she_65";
const field = "_field_19she_65";
const label$1 = "_label_19she_91";
const req = "_req_19she_103";
const input = "_input_19she_113";
const ltr$2 = "_ltr_19she_161";
const textarea = "_textarea_19she_171";
const bodyHelp = "_bodyHelp_19she_223";
const fieldMeta = "_fieldMeta_19she_235";
const help = "_help_19she_253";
const counter = "_counter_19she_269";
const err = "_err_19she_283";
const actions$1 = "_actions_19she_299";
const actionButtons = "_actionButtons_19she_315";
const primaryBtn = "_primaryBtn_19she_331";
const secondaryBtn = "_secondaryBtn_19she_353";
const resetBtn = "_resetBtn_19she_375";
const draftBtn = "_draftBtn_19she_403";
const status = "_status_19she_455";
const lockBanner = "_lockBanner_19she_469";
const sendStatus = "_sendStatus_19she_491";
const warningList$1 = "_warningList_19she_505";
const styles$6 = {
  root: root$2,
  header: header$4,
  title: title$5,
  boundary: boundary$1,
  fields,
  field,
  label: label$1,
  req,
  input,
  ltr: ltr$2,
  textarea,
  bodyHelp,
  fieldMeta,
  help,
  counter,
  err,
  actions: actions$1,
  actionButtons,
  primaryBtn,
  secondaryBtn,
  resetBtn,
  draftBtn,
  status,
  lockBanner,
  sendStatus,
  warningList: warningList$1
};
const LIMITS = {
  subject: 200,
  previewText: 200,
  heading: 150,
  bodyText: 5e3,
  ctaLabel: 60
};
const EMPTY_FORM = {
  subject: "",
  previewText: "",
  topImageUrl: "",
  heading: "",
  bodyText: "",
  ctaLabel: "",
  ctaUrl: ""
};
const EMPTY_TOUCHED = {
  subject: false,
  bodyText: false
};
function MarketingComposerForm({
  onPreview,
  isPreviewing = false,
  isPreviewStale = false,
  onComposerChange,
  onComposerReset,
  onTestSend,
  isSending = false,
  sendDisabled = false,
  sendDisabledByFlag = false,
  sendResult,
  sendError,
  onSaveDraft,
  isSavingDraft = false,
  canSaveDraft = false,
  draftDisabledReason = "",
  draftResult = null,
  draftError = "",
  draftDisabledByFlag = false
} = {}) {
  const [form2, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState(EMPTY_TOUCHED);
  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    onComposerChange?.();
  }
  function markTouched(name) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }
  function onReset() {
    setForm(EMPTY_FORM);
    setTouched(EMPTY_TOUCHED);
    onComposerReset?.();
  }
  const subjectMissing = touched.subject && form2.subject.trim() === "";
  const bodyMissing = touched.bodyText && form2.bodyText.trim() === "";
  const ctaLabelFilled = form2.ctaLabel.trim() !== "";
  const ctaUrlFilled = form2.ctaUrl.trim() !== "";
  const ctaLabelWithoutUrl = ctaLabelFilled && !ctaUrlFilled;
  const ctaUrlWithoutLabel = ctaUrlFilled && !ctaLabelFilled;
  const ctaPairingValid = !ctaLabelWithoutUrl && !ctaUrlWithoutLabel;
  const canPreview = !isPreviewing && form2.subject.trim() !== "" && form2.bodyText.trim() !== "" && ctaPairingValid;
  function handlePreviewClick() {
    if (!canPreview) return;
    onPreview?.(form2);
  }
  const canTestSend = !isPreviewing && !isSending && !sendDisabled && !sendDisabledByFlag && form2.subject.trim() !== "" && form2.bodyText.trim() !== "" && ctaPairingValid;
  function handleTestSendClick() {
    if (!canTestSend) return;
    onTestSend?.(form2);
  }
  function handleSaveDraftClick() {
    if (!onSaveDraft) return;
    if (!canSaveDraft) return;
    if (isSavingDraft) return;
    onSaveDraft(form2);
  }
  return /* @__PURE__ */ jsxs("section", { className: styles$6.root, "aria-label": "עריכת מייל שיווקי", children: [
    /* @__PURE__ */ jsxs("header", { className: styles$6.header, children: [
      /* @__PURE__ */ jsx("h3", { className: styles$6.title, children: "עריכת מייל שיווקי" }),
      /* @__PURE__ */ jsx("p", { className: styles$6.boundary, children: "זהו שלב הכנת התוכן בלבד. תצוגה מקדימה ושליחת מבחן יופעלו בשלב הבא." }),
      /* @__PURE__ */ jsx("p", { className: styles$6.boundary, children: "שליחה המונית לרשימת נמענים עדיין אינה פעילה." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles$6.fields, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$6.field, children: [
        /* @__PURE__ */ jsxs("label", { className: styles$6.label, htmlFor: "mkt-subject", children: [
          "נושא",
          /* @__PURE__ */ jsxs("span", { className: styles$6.req, "aria-hidden": "true", children: [
            " ",
            "*"
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "mkt-subject",
            type: "text",
            className: styles$6.input,
            value: form2.subject,
            maxLength: LIMITS.subject,
            required: true,
            "aria-required": "true",
            "aria-invalid": subjectMissing ? "true" : void 0,
            "aria-describedby": "mkt-subject-help mkt-subject-counter mkt-subject-err",
            onChange: (e) => setField("subject", e.target.value),
            onBlur: () => markTouched("subject")
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: styles$6.fieldMeta, children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              id: "mkt-subject-err",
              className: styles$6.err,
              role: subjectMissing ? "alert" : void 0,
              children: subjectMissing ? "נושא הוא שדה חובה" : ""
            }
          ),
          /* @__PURE__ */ jsxs(
            "span",
            {
              id: "mkt-subject-counter",
              className: styles$6.counter,
              children: [
                form2.subject.length,
                "/",
                LIMITS.subject
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("span", { id: "mkt-subject-help", className: styles$6.help, children: "ניתן להשתמש ב-[user] כדי להכניס את שם הנמען לנושא." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$6.field, children: [
        /* @__PURE__ */ jsx("label", { className: styles$6.label, htmlFor: "mkt-preview-text", children: "טקסט תצוגה מקדימה" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "mkt-preview-text",
            type: "text",
            className: styles$6.input,
            value: form2.previewText,
            maxLength: LIMITS.previewText,
            "aria-describedby": "mkt-preview-text-help mkt-preview-text-counter",
            onChange: (e) => setField("previewText", e.target.value)
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: styles$6.fieldMeta, children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              id: "mkt-preview-text-help",
              className: styles$6.help,
              children: "מופיע בתיבת הדואר לפני פתיחת המייל"
            }
          ),
          /* @__PURE__ */ jsxs(
            "span",
            {
              id: "mkt-preview-text-counter",
              className: styles$6.counter,
              children: [
                form2.previewText.length,
                "/",
                LIMITS.previewText
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$6.field, children: [
        /* @__PURE__ */ jsx("label", { className: styles$6.label, htmlFor: "mkt-top-image", children: "תמונה עליונה (URL)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "mkt-top-image",
            type: "url",
            dir: "ltr",
            className: `${styles$6.input} ${styles$6.ltr}`,
            value: form2.topImageUrl,
            "aria-describedby": "mkt-top-image-help",
            onChange: (e) => setField("topImageUrl", e.target.value)
          }
        ),
        /* @__PURE__ */ jsx("div", { className: styles$6.fieldMeta, children: /* @__PURE__ */ jsx("span", { id: "mkt-top-image-help", className: styles$6.help, children: "כתובת https מ-cardigo.co.il או מאחסון Supabase המאושר" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$6.field, children: [
        /* @__PURE__ */ jsx("label", { className: styles$6.label, htmlFor: "mkt-heading", children: "כותרת" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "mkt-heading",
            type: "text",
            className: styles$6.input,
            value: form2.heading,
            maxLength: LIMITS.heading,
            "aria-describedby": "mkt-heading-counter",
            onChange: (e) => setField("heading", e.target.value)
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: styles$6.fieldMeta, children: [
          /* @__PURE__ */ jsx("span", { className: styles$6.help }),
          /* @__PURE__ */ jsxs(
            "span",
            {
              id: "mkt-heading-counter",
              className: styles$6.counter,
              children: [
                form2.heading.length,
                "/",
                LIMITS.heading
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$6.field, children: [
        /* @__PURE__ */ jsxs("label", { className: styles$6.label, htmlFor: "mkt-body", children: [
          "תוכן המייל",
          /* @__PURE__ */ jsxs("span", { className: styles$6.req, "aria-hidden": "true", children: [
            " ",
            "*"
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            id: "mkt-body",
            className: styles$6.textarea,
            value: form2.bodyText,
            maxLength: LIMITS.bodyText,
            rows: 8,
            required: true,
            "aria-required": "true",
            "aria-invalid": bodyMissing ? "true" : void 0,
            "aria-describedby": "mkt-body-help mkt-body-counter mkt-body-err",
            onChange: (e) => setField("bodyText", e.target.value),
            onBlur: () => markTouched("bodyText")
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: styles$6.bodyHelp, id: "mkt-body-help", children: [
          /* @__PURE__ */ jsx("span", { className: styles$6.help, children: "מודגש: **טקסט מודגש**" }),
          /* @__PURE__ */ jsx("span", { className: styles$6.help, children: "קישור: [טקסט](/pricing)" }),
          /* @__PURE__ */ jsx("span", { className: styles$6.help, children: "HTML גולמי אינו נתמך" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$6.fieldMeta, children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              id: "mkt-body-err",
              className: styles$6.err,
              role: bodyMissing ? "alert" : void 0,
              children: bodyMissing ? "תוכן המייל הוא שדה חובה" : ""
            }
          ),
          /* @__PURE__ */ jsxs("span", { id: "mkt-body-counter", className: styles$6.counter, children: [
            form2.bodyText.length,
            "/",
            LIMITS.bodyText
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$6.field, children: [
        /* @__PURE__ */ jsx("label", { className: styles$6.label, htmlFor: "mkt-cta-label", children: "טקסט כפתור" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "mkt-cta-label",
            type: "text",
            className: styles$6.input,
            value: form2.ctaLabel,
            maxLength: LIMITS.ctaLabel,
            "aria-describedby": "mkt-cta-label-counter mkt-cta-pairing",
            onChange: (e) => setField("ctaLabel", e.target.value)
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: styles$6.fieldMeta, children: [
          /* @__PURE__ */ jsx("span", { className: styles$6.help }),
          /* @__PURE__ */ jsxs(
            "span",
            {
              id: "mkt-cta-label-counter",
              className: styles$6.counter,
              children: [
                form2.ctaLabel.length,
                "/",
                LIMITS.ctaLabel
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$6.field, children: [
        /* @__PURE__ */ jsx("label", { className: styles$6.label, htmlFor: "mkt-cta-url", children: "קישור כפתור" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "mkt-cta-url",
            type: "url",
            dir: "ltr",
            className: `${styles$6.input} ${styles$6.ltr}`,
            value: form2.ctaUrl,
            "aria-describedby": "mkt-cta-url-help mkt-cta-pairing",
            onChange: (e) => setField("ctaUrl", e.target.value)
          }
        ),
        /* @__PURE__ */ jsx("div", { className: styles$6.fieldMeta, children: /* @__PURE__ */ jsx("span", { id: "mkt-cta-url-help", className: styles$6.help, children: "לדוגמה: /pricing או https://cardigo.co.il/pricing" }) })
      ] }),
      /* @__PURE__ */ jsx(
        "p",
        {
          id: "mkt-cta-pairing",
          className: styles$6.err,
          role: ctaLabelWithoutUrl || ctaUrlWithoutLabel ? "alert" : void 0,
          children: ctaLabelWithoutUrl ? "יש להזין גם קישור כפתור או להשאיר את שני השדות ריקים" : ctaUrlWithoutLabel ? "יש להזין גם טקסט כפתור או להשאיר את שני השדות ריקים" : ""
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles$6.actions, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$6.actionButtons, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$6.secondaryBtn,
            onClick: handlePreviewClick,
            disabled: !canPreview,
            children: isPreviewing ? "טוען תצוגה מקדימה…" : "תצוגה מקדימה"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$6.primaryBtn,
            onClick: handleTestSendClick,
            disabled: !canTestSend,
            children: isSending ? "שולח מבחן…" : "שליחת מבחן לכתובת שלי"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$6.draftBtn,
            onClick: handleSaveDraftClick,
            disabled: isSavingDraft || !canSaveDraft || draftDisabledByFlag,
            children: isSavingDraft ? "שומר טיוטה…" : "שמור טיוטת קמפיין"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$6.resetBtn,
            onClick: onReset,
            children: "נקה טופס"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("p", { className: styles$6.help, children: "השליחה תתבצע רק לכתובת האימייל של מנהל המערכת המחובר." }),
      /* @__PURE__ */ jsx("p", { className: styles$6.help, children: "שמירת טיוטה אינה שולחת מיילים." }),
      !canSaveDraft && draftDisabledReason ? /* @__PURE__ */ jsx("p", { className: styles$6.help, children: draftDisabledReason }) : null,
      draftDisabledByFlag ? /* @__PURE__ */ jsx("p", { className: styles$6.lockBanner, role: "status", children: "שמירת טיוטות אינה פעילה כרגע." }) : null,
      draftError ? /* @__PURE__ */ jsx("p", { className: styles$6.err, role: "alert", children: draftError }) : null,
      draftResult ? /* @__PURE__ */ jsx(
        "p",
        {
          className: styles$6.status,
          role: "status",
          "aria-live": "polite",
          children: draftResult.message
        }
      ) : null,
      sendDisabledByFlag ? /* @__PURE__ */ jsx("p", { className: styles$6.lockBanner, role: "status", children: "שליחת מבחן אינה פעילה כרגע." }) : null,
      sendError ? /* @__PURE__ */ jsx("p", { className: styles$6.err, role: "alert", children: sendError }) : null,
      sendResult ? /* @__PURE__ */ jsxs("div", { className: styles$6.sendStatus, "aria-live": "polite", children: [
        /* @__PURE__ */ jsx(
          "p",
          {
            className: sendResult.kind === "error" ? styles$6.err : styles$6.status,
            role: sendResult.kind === "error" ? "alert" : void 0,
            children: sendResult.message
          }
        ),
        sendResult.deliveredToMasked ? /* @__PURE__ */ jsx("p", { className: styles$6.help, children: `יעד: ${sendResult.deliveredToMasked}` }) : null,
        Array.isArray(sendResult.warnings) && sendResult.warnings.length > 0 ? /* @__PURE__ */ jsx("ul", { className: styles$6.warningList, children: sendResult.warnings.map((w, i) => /* @__PURE__ */ jsx("li", { className: styles$6.err, children: w }, i)) }) : null
      ] }) : null,
      /* @__PURE__ */ jsx("p", { className: styles$6.status, "aria-live": "polite", children: "בשלב זה ניתן להפיק תצוגה מקדימה בלבד; שליחת מבחן ושליחה לרשימה יופעלו בשלב הבא." }),
      isPreviewStale ? /* @__PURE__ */ jsx("p", { className: styles$6.status, "aria-live": "polite", children: "התצוגה המקדימה אינה מעודכנת לשינויים האחרונים." }) : null,
      /* @__PURE__ */ jsx("p", { className: styles$6.boundary, children: "שליחה המונית לרשימת נמענים עדיין אינה פעילה." })
    ] })
  ] });
}
const root$1 = "_root_a7hp9_1";
const header$3 = "_header_a7hp9_23";
const title$4 = "_title_a7hp9_37";
const boundary = "_boundary_a7hp9_49";
const body$2 = "_body_a7hp9_61";
const muted$3 = "_muted_a7hp9_75";
const error$2 = "_error_a7hp9_87";
const stale = "_stale_a7hp9_101";
const summary$1 = "_summary_a7hp9_113";
const sectionTitle$1 = "_sectionTitle_a7hp9_127";
const summaryList = "_summaryList_a7hp9_139";
const summaryRow = "_summaryRow_a7hp9_163";
const summaryKey = "_summaryKey_a7hp9_183";
const summaryVal = "_summaryVal_a7hp9_199";
const ltr$1 = "_ltr_a7hp9_217";
const textBlock = "_textBlock_a7hp9_227";
const textPreview = "_textPreview_a7hp9_241";
const warnings = "_warnings_a7hp9_277";
const warningList = "_warningList_a7hp9_291";
const warningItem = "_warningItem_a7hp9_309";
const styles$5 = {
  root: root$1,
  header: header$3,
  title: title$4,
  boundary,
  body: body$2,
  muted: muted$3,
  error: error$2,
  stale,
  summary: summary$1,
  sectionTitle: sectionTitle$1,
  summaryList,
  summaryRow,
  summaryKey,
  summaryVal,
  ltr: ltr$1,
  textBlock,
  textPreview,
  warnings,
  warningList,
  warningItem
};
const SUMMARY_FIELDS = [
  { key: "subject", label: "נושא", ltr: false },
  { key: "previewText", label: "טקסט תצוגה מקדימה", ltr: false },
  { key: "heading", label: "כותרת", ltr: false },
  { key: "topImageUrl", label: "תמונה עליונה", ltr: true },
  { key: "ctaLabel", label: "טקסט כפתור", ltr: false },
  { key: "ctaUrl", label: "קישור כפתור", ltr: true }
];
function MarketingPreviewPanel({
  result,
  error: error2,
  isLoading = false,
  isStale = false,
  submittedAt
} = {}) {
  const snapshot = result && result.formSnapshot ? result.formSnapshot : null;
  const warnings2 = result && Array.isArray(result.warnings) ? result.warnings : [];
  const previewText = result && typeof result.text === "string" ? result.text : "";
  return /* @__PURE__ */ jsxs("section", { className: styles$5.root, "aria-label": "תצוגה מקדימה של המייל", children: [
    /* @__PURE__ */ jsxs("header", { className: styles$5.header, children: [
      /* @__PURE__ */ jsx("h3", { className: styles$5.title, children: "תצוגת טקסט בטוחה" }),
      /* @__PURE__ */ jsx("p", { className: styles$5.boundary, children: "תצוגת HTML חזותית תיבחן בשלב נפרד." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: styles$5.body, "aria-live": "polite", children: isLoading ? /* @__PURE__ */ jsx("p", { className: styles$5.muted, children: "טוען תצוגה מקדימה…" }) : error2 ? /* @__PURE__ */ jsx("p", { className: styles$5.error, role: "alert", children: error2 }) : !result ? /* @__PURE__ */ jsx("p", { className: styles$5.muted, children: "לא נוצרה תצוגה מקדימה עדיין." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      isStale ? /* @__PURE__ */ jsx("p", { className: styles$5.stale, role: "status", children: "התצוגה המקדימה אינה מעודכנת לשינויים האחרונים." }) : null,
      snapshot ? /* @__PURE__ */ jsxs("div", { className: styles$5.summary, children: [
        /* @__PURE__ */ jsx("h4", { className: styles$5.sectionTitle, children: "סיכום" }),
        /* @__PURE__ */ jsx("dl", { className: styles$5.summaryList, children: SUMMARY_FIELDS.map((f) => /* @__PURE__ */ jsxs(
          "div",
          {
            className: styles$5.summaryRow,
            children: [
              /* @__PURE__ */ jsx("dt", { className: styles$5.summaryKey, children: f.label }),
              /* @__PURE__ */ jsx(
                "dd",
                {
                  className: `${styles$5.summaryVal} ${f.ltr ? styles$5.ltr : ""}`,
                  children: snapshot[f.key]?.trim() ? snapshot[f.key] : "—"
                }
              )
            ]
          },
          f.key
        )) })
      ] }) : null,
      /* @__PURE__ */ jsxs("div", { className: styles$5.textBlock, children: [
        /* @__PURE__ */ jsx("h4", { className: styles$5.sectionTitle, children: "תצוגת טקסט" }),
        /* @__PURE__ */ jsx("pre", { className: styles$5.textPreview, children: previewText })
      ] }),
      warnings2.length > 0 ? /* @__PURE__ */ jsxs("div", { className: styles$5.warnings, children: [
        /* @__PURE__ */ jsx("h4", { className: styles$5.sectionTitle, children: "אזהרות מהשרת" }),
        /* @__PURE__ */ jsx("ul", { className: styles$5.warningList, children: warnings2.map((w, i) => /* @__PURE__ */ jsx(
          "li",
          {
            className: styles$5.warningItem,
            children: w
          },
          i
        )) })
      ] }) : null
    ] }) })
  ] });
}
const backdrop = "_backdrop_5nr98_1";
const modal = "_modal_5nr98_25";
const header$2 = "_header_5nr98_53";
const title$3 = "_title_5nr98_67";
const body$1 = "_body_5nr98_83";
const text = "_text_5nr98_97";
const actions = "_actions_5nr98_113";
const button = "_button_5nr98_131";
const primary = "_primary_5nr98_177";
const secondary = "_secondary_5nr98_189";
const styles$4 = {
  backdrop,
  modal,
  header: header$2,
  title: title$3,
  body: body$1,
  text,
  actions,
  button,
  primary,
  secondary
};
function MarketingTestSendConfirm({
  open,
  isSending = false,
  onConfirm,
  onCancel
} = {}) {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  useFocusTrap(dialogRef, open);
  useEffect(() => {
    if (!open) return;
    const t2 = window.setTimeout(() => {
      confirmButtonRef.current?.focus?.();
    }, 0);
    return () => window.clearTimeout(t2);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !isSending) {
        e.preventDefault();
        onCancel?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isSending, onCancel]);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: dialogRef,
      className: styles$4.backdrop,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      "aria-describedby": bodyId,
      onMouseDown: (e) => {
        if (e.target === e.currentTarget && !isSending) onCancel?.();
      },
      children: /* @__PURE__ */ jsxs("div", { className: styles$4.modal, dir: "rtl", children: [
        /* @__PURE__ */ jsx("div", { className: styles$4.header, children: /* @__PURE__ */ jsx("h2", { id: titleId, className: styles$4.title, children: "לאשר שליחת מבחן?" }) }),
        /* @__PURE__ */ jsx("div", { className: styles$4.body, children: /* @__PURE__ */ jsx("p", { id: bodyId, className: styles$4.text, children: "המייל יישלח פעם אחת בלבד לכתובת האימייל של מנהל המערכת המחובר. הוא לא יישלח לרשימת הנמענים." }) }),
        /* @__PURE__ */ jsxs("div", { className: styles$4.actions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              ref: confirmButtonRef,
              type: "button",
              className: `${styles$4.button} ${styles$4.primary}`,
              onClick: () => onConfirm?.(),
              disabled: isSending,
              children: isSending ? "שולח מבחן…" : "שלחו מבחן"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: `${styles$4.button} ${styles$4.secondary}`,
              onClick: () => onCancel?.(),
              disabled: isSending,
              children: "ביטול"
            }
          )
        ] })
      ] })
    }
  );
}
const panel$1 = "_panel_1xoof_1";
const header$1 = "_header_1xoof_23";
const title$2 = "_title_1xoof_37";
const helper = "_helper_1xoof_51";
const toolbar = "_toolbar_1xoof_65";
const filterGroup = "_filterGroup_1xoof_83";
const filterButton = "_filterButton_1xoof_97";
const filterButtonActive = "_filterButtonActive_1xoof_139";
const reloadButton = "_reloadButton_1xoof_149";
const statusLine = "_statusLine_1xoof_191";
const muted$2 = "_muted_1xoof_209";
const success = "_success_1xoof_223";
const error$1 = "_error_1xoof_235";
const empty$1 = "_empty_1xoof_249";
const list$1 = "_list_1xoof_263";
const row$2 = "_row_1xoof_283";
const rowMain = "_rowMain_1xoof_309";
const rowSubject = "_rowSubject_1xoof_325";
const rowHeading = "_rowHeading_1xoof_339";
const rowMeta = "_rowMeta_1xoof_353";
const metaItem = "_metaItem_1xoof_369";
const rowActions = "_rowActions_1xoof_391";
const viewButton = "_viewButton_1xoof_405";
const pager$2 = "_pager_1xoof_447";
const pagerButton = "_pagerButton_1xoof_463";
const pagerInfo = "_pagerInfo_1xoof_505";
const detail = "_detail_1xoof_517";
const detailBlock = "_detailBlock_1xoof_539";
const detailTitle = "_detailTitle_1xoof_553";
const detailList = "_detailList_1xoof_567";
const detailRow = "_detailRow_1xoof_583";
const detailKey = "_detailKey_1xoof_599";
const detailText = "_detailText_1xoof_617";
const countList = "_countList_1xoof_635";
const countItem = "_countItem_1xoof_655";
const reasonList = "_reasonList_1xoof_677";
const reasonRow = "_reasonRow_1xoof_697";
const confirmBox = "_confirmBox_1xoof_719";
const confirmText = "_confirmText_1xoof_743";
const confirmActions = "_confirmActions_1xoof_755";
const confirmYesButton = "_confirmYesButton_1xoof_769";
const confirmNoButton = "_confirmNoButton_1xoof_811";
const cancelButton = "_cancelButton_1xoof_853";
const startPrepBlock = "_startPrepBlock_1xoof_887";
const startPrepHelper = "_startPrepHelper_1xoof_911";
const startPrepNote = "_startPrepNote_1xoof_925";
const startPrepButton = "_startPrepButton_1xoof_939";
const deleteBlock = "_deleteBlock_1xoof_983";
const deleteButton = "_deleteButton_1xoof_999";
const readinessBlock = "_readinessBlock_1xoof_1043";
const readinessButton = "_readinessButton_1xoof_1057";
const readinessHelper = "_readinessHelper_1xoof_1101";
const readinessStatus = "_readinessStatus_1xoof_1117";
const readinessResult = "_readinessResult_1xoof_1131";
const sendStatusBlock = "_sendStatusBlock_1xoof_1145";
const sendStatusButton = "_sendStatusButton_1xoof_1159";
const sendStatusHelper = "_sendStatusHelper_1xoof_1203";
const sendStatusStatus = "_sendStatusStatus_1xoof_1219";
const sendStatusResult = "_sendStatusResult_1xoof_1233";
const cancelSendBlock = "_cancelSendBlock_1xoof_1247";
const cancelSendButton = "_cancelSendButton_1xoof_1263";
const styles$3 = {
  panel: panel$1,
  header: header$1,
  title: title$2,
  helper,
  toolbar,
  filterGroup,
  filterButton,
  filterButtonActive,
  reloadButton,
  statusLine,
  muted: muted$2,
  success,
  error: error$1,
  empty: empty$1,
  list: list$1,
  row: row$2,
  rowMain,
  rowSubject,
  rowHeading,
  rowMeta,
  metaItem,
  rowActions,
  viewButton,
  pager: pager$2,
  pagerButton,
  pagerInfo,
  detail,
  detailBlock,
  detailTitle,
  detailList,
  detailRow,
  detailKey,
  detailText,
  countList,
  countItem,
  reasonList,
  reasonRow,
  confirmBox,
  confirmText,
  confirmActions,
  confirmYesButton,
  confirmNoButton,
  cancelButton,
  startPrepBlock,
  startPrepHelper,
  startPrepNote,
  startPrepButton,
  deleteBlock,
  deleteButton,
  readinessBlock,
  readinessButton,
  readinessHelper,
  readinessStatus,
  readinessResult,
  sendStatusBlock,
  sendStatusButton,
  sendStatusHelper,
  sendStatusStatus,
  sendStatusResult,
  cancelSendBlock,
  cancelSendButton
};
const DRAFT_STATUS_OPTIONS = ["draft", "queued", "completed", "canceled"];
const PAGE_LIMIT = 20;
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
  UNKNOWN: "לא ידוע"
};
const STATUS_LABELS = {
  draft: "טיוטה",
  canceled: "בוטלה",
  queued: "בתור",
  sending: "בשליחה",
  completed: "הושלם",
  failed: "נכשל"
};
const SEND_STATUS_CAMPAIGN_LABELS = {
  draft: "טיוטה",
  ready: "מוכן",
  queued: "בתור",
  sending: "בשליחה",
  completed: "הושלם",
  failed: "נכשל",
  canceled: "בוטל"
};
function sendStatusCampaignLabel(status2) {
  return SEND_STATUS_CAMPAIGN_LABELS[String(status2 || "")] || (status2 ? String(status2) : "—");
}
function skipReasonLabel$1(reason) {
  return SKIP_REASON_LABELS[String(reason)] || String(reason);
}
function statusLabel(status2) {
  return STATUS_LABELS[String(status2 || "")] || (status2 ? String(status2) : "—");
}
function formatDate$2(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("he-IL");
}
function countOrDash(value) {
  return typeof value === "number" ? value : "—";
}
function MarketingDraftsPanel() {
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
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState("");
  const [readinessResult2, setReadinessResult] = useState(null);
  const [readinessDisabledByFlag, setReadinessDisabledByFlag] = useState(false);
  const [readinessCheckedDraftId, setReadinessCheckedDraftId] = useState(null);
  function clearReadinessState() {
    setReadinessLoading(false);
    setReadinessError("");
    setReadinessResult(null);
    setReadinessDisabledByFlag(false);
    setReadinessCheckedDraftId(null);
  }
  const [sendStatusLoading, setSendStatusLoading] = useState(false);
  const [sendStatusError, setSendStatusError] = useState("");
  const [sendStatusResult2, setSendStatusResult] = useState(null);
  const [sendStatusCheckedDraftId, setSendStatusCheckedDraftId] = useState(null);
  function clearSendStatusState() {
    setSendStatusLoading(false);
    setSendStatusError("");
    setSendStatusResult(null);
    setSendStatusCheckedDraftId(null);
  }
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteResult, setDeleteResult] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  function clearDeleteState() {
    setDeleteLoadingId(null);
    setDeleteError("");
    setConfirmingDeleteId(null);
  }
  const [cancelSendLoadingId, setCancelSendLoadingId] = useState(null);
  const [cancelSendError, setCancelSendError] = useState("");
  const [cancelSendResult, setCancelSendResult] = useState("");
  const [confirmingCancelSendId, setConfirmingCancelSendId] = useState(null);
  function clearCancelSendState() {
    setCancelSendLoadingId(null);
    setCancelSendError("");
    setConfirmingCancelSendId(null);
  }
  const [startSendLoadingId, setStartSendLoadingId] = useState(null);
  const [startSendError, setStartSendError] = useState("");
  const [startSendResult, setStartSendResult] = useState("");
  const [confirmingStartSendId, setConfirmingStartSendId] = useState(null);
  function clearStartSendState() {
    setStartSendLoadingId(null);
    setStartSendError("");
    setConfirmingStartSendId(null);
  }
  const loadDrafts = useCallback(async () => {
    setDraftsLoading(true);
    setDraftsError("");
    try {
      const res = await listMarketingCampaignDrafts({
        status: draftsStatus,
        page: draftsPage,
        limit: PAGE_LIMIT
      });
      const data = res?.data || {};
      setDraftsResult({
        page: typeof data.page === "number" ? data.page : draftsPage,
        limit: typeof data.limit === "number" ? data.limit : PAGE_LIMIT,
        total: typeof data.total === "number" ? data.total : 0,
        items: Array.isArray(data.items) ? data.items : []
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
      await loadDrafts();
      if (selectedDraftId === campaignId) {
        await loadDetail(campaignId);
      }
    } catch (e) {
      const status2 = e?.response?.status;
      setConfirmingCancelId(null);
      if (status2 === 409) {
        setCancelError("הטיוטה אינה ניתנת לביטול.");
      } else {
        setCancelError("ביטול הטיוטה נכשל.");
      }
      await loadDrafts();
      if (selectedDraftId === campaignId) {
        await loadDetail(campaignId);
      }
    } finally {
      setCancelLoadingId(null);
    }
  }
  async function handleConfirmDelete(campaignId, statusAtConfirm) {
    if (deleteLoadingId) return;
    setDeleteError("");
    setDeleteResult("");
    setDeleteLoadingId(campaignId);
    const successCopy = statusAtConfirm === "canceled" ? "הקמפיין נמחק בהצלחה." : "הטיוטה נמחקה בהצלחה.";
    const error409Copy = statusAtConfirm === "canceled" ? "לא ניתן למחוק את הקמפיין כי קיימות רשומות שליחה עם ראיות שליחה או ניסיון שליחה. ניתן למחוק רק קמפיין שבוטל וכל הרשומות שלו בוטלו ללא ראיות." : "לא ניתן למחוק את הטיוטה במצב הנוכחי.";
    const errorGenericCopy = statusAtConfirm === "canceled" ? "מחיקת הקמפיין נכשלה. נסו שוב." : "מחיקת הטיוטה נכשלה. נסו שוב.";
    try {
      await deleteMarketingCampaign(campaignId);
      setConfirmingDeleteId(null);
      setSelectedDraftId(null);
      setSelectedDraft(null);
      setSelectedDraftError("");
      clearReadinessState();
      clearSendStatusState();
      setDeleteResult(successCopy);
      await loadDrafts();
    } catch (e) {
      const status2 = e?.response?.status;
      setConfirmingDeleteId(null);
      await loadDrafts();
      if (selectedDraftId === campaignId) {
        await loadDetail(campaignId);
      }
      if (status2 === 409 || status2 === 404) {
        setDeleteError(error409Copy);
      } else {
        setDeleteError(errorGenericCopy);
      }
    } finally {
      setDeleteLoadingId(null);
    }
  }
  async function handleConfirmStartSend(campaignId) {
    if (startSendLoadingId) return;
    setStartSendError("");
    setStartSendResult("");
    setStartSendLoadingId(campaignId);
    const requestId = crypto.randomUUID();
    try {
      await startMarketingCampaignSend(campaignId, requestId);
      setConfirmingStartSendId(null);
      setDraftsStatus("queued");
      setDraftsPage(1);
      await loadDetail(campaignId);
      await handleLoadSendStatus(campaignId);
      setStartSendResult(
        "הקמפיין עבר למצב ממתין לשליחה. אם מנגנון השליחה פעיל, השליחה תתבצע לפי תצורת המערכת."
      );
    } catch (e) {
      const httpStatus = e?.response?.status;
      const msg = String(e?.response?.data?.message || "").toLowerCase();
      setConfirmingStartSendId(null);
      if (httpStatus === 409 && msg.includes("disabled")) {
        setStartSendError("הכנת שליחה אינה פעילה כרגע.");
      } else if (httpStatus === 409) {
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
      setCancelSendResult("הכנת השליחה בוטלה בהצלחה.");
    } catch (e) {
      const httpStatus = e?.response?.status;
      setConfirmingCancelSendId(null);
      await loadDrafts();
      if (selectedDraftId === campaignId) {
        await loadDetail(campaignId);
      }
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
        skippedByReason: data.skippedByReason && typeof data.skippedByReason === "object" ? data.skippedByReason : null,
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        ready: data.ready === true
      });
      setReadinessCheckedDraftId(campaignId);
    } catch (e) {
      const status2 = e?.response?.status;
      const message = String(
        e?.response?.data?.message || ""
      ).toLowerCase();
      if (status2 === 409) {
        if (message.includes("disabled")) {
          setReadinessDisabledByFlag(true);
          setReadinessError("בדיקת מוכנות לשליחה אינה פעילה כרגע.");
        } else {
          setReadinessError("ניתן לבדוק מוכנות רק לטיוטה פעילה.");
        }
      } else if (status2 === 422) {
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
  async function handleLoadSendStatus(campaignId) {
    if (!campaignId) return;
    if (sendStatusLoading) return;
    setSendStatusError("");
    setSendStatusLoading(true);
    try {
      const res = await getMarketingCampaignSendStatus(campaignId);
      const data = res?.data || {};
      const counts = data.counts && typeof data.counts === "object" ? data.counts : {};
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
          total: counts.total
        },
        hasActiveRows: data.hasActiveRows === true,
        isTerminal: data.isTerminal === true
      });
      setSendStatusCheckedDraftId(campaignId);
    } catch (e) {
      const status2 = e?.response?.status;
      if (status2 === 404) {
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
  const nextDisabled = draftsLoading || draftsPage * PAGE_LIMIT >= total || items.length < PAGE_LIMIT;
  const isSelectedDraftSendTerminal = selectedDraft?.status === "queued" && sendStatusResult2?.campaignId === selectedDraft?.campaignId && sendStatusResult2?.isTerminal === true;
  return /* @__PURE__ */ jsxs("section", { className: styles$3.panel, "aria-label": "טיוטות קמפיינים", children: [
    /* @__PURE__ */ jsxs("header", { className: styles$3.header, children: [
      /* @__PURE__ */ jsx("h3", { className: styles$3.title, children: "טיוטות קמפיינים" }),
      /* @__PURE__ */ jsx("p", { className: styles$3.helper, children: "כאן ניתן לצפות בטיוטות שנשמרו ולבטל טיוטות לפני שימוש עתידי." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles$3.toolbar, children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: styles$3.filterGroup,
          role: "group",
          "aria-label": "סינון טיוטות",
          children: DRAFT_STATUS_OPTIONS.map((opt) => /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: `${styles$3.filterButton} ${draftsStatus === opt ? styles$3.filterButtonActive : ""}`,
              "aria-pressed": draftsStatus === opt,
              onClick: () => handleSelectStatus(opt),
              children: opt === "draft" ? "טיוטות פעילות" : opt === "queued" ? "ממתינות לשליחה" : opt === "completed" ? "נשלחו" : "טיוטות שבוטלו"
            },
            opt
          ))
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$3.reloadButton,
          onClick: loadDrafts,
          disabled: draftsLoading,
          children: "רענון טיוטות"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles$3.statusLine, "aria-live": "polite", children: [
      draftsLoading ? /* @__PURE__ */ jsx("span", { className: styles$3.muted, children: "טוען…" }) : null,
      cancelResult ? /* @__PURE__ */ jsx("span", { className: styles$3.success, children: cancelResult }) : null,
      deleteResult ? /* @__PURE__ */ jsx("span", { className: styles$3.success, children: deleteResult }) : null,
      cancelSendResult ? /* @__PURE__ */ jsx("span", { className: styles$3.success, children: cancelSendResult }) : null,
      startSendResult ? /* @__PURE__ */ jsx("span", { className: styles$3.success, children: startSendResult }) : null
    ] }),
    draftsError ? /* @__PURE__ */ jsx("p", { className: styles$3.error, role: "alert", children: draftsError }) : null,
    !draftsLoading && !draftsError && items.length === 0 ? /* @__PURE__ */ jsx("p", { className: styles$3.empty, children: "אין טיוטות להצגה." }) : null,
    items.length > 0 ? /* @__PURE__ */ jsx("ul", { className: styles$3.list, children: items.map((draft) => /* @__PURE__ */ jsxs("li", { className: styles$3.row, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$3.rowMain, children: [
        /* @__PURE__ */ jsx("span", { className: styles$3.rowSubject, children: draft.subject || "—" }),
        /* @__PURE__ */ jsx("span", { className: styles$3.rowHeading, children: draft.heading || "—" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$3.rowMeta, children: [
        /* @__PURE__ */ jsx("span", { className: styles$3.metaItem, children: statusLabel(draft.status) }),
        /* @__PURE__ */ jsx("span", { className: styles$3.metaItem, children: formatDate$2(draft.createdAt) }),
        /* @__PURE__ */ jsxs("span", { className: styles$3.metaItem, children: [
          "נבחרו: ",
          countOrDash(draft.selectedCount)
        ] }),
        /* @__PURE__ */ jsxs("span", { className: styles$3.metaItem, children: [
          "זכאים: ",
          countOrDash(draft.eligibleCount)
        ] }),
        /* @__PURE__ */ jsxs("span", { className: styles$3.metaItem, children: [
          "נפסלו: ",
          countOrDash(draft.skippedCount)
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$3.rowActions, children: /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$3.viewButton,
          onClick: () => loadDetail(draft.campaignId),
          disabled: selectedDraftLoading && selectedDraftId === draft.campaignId,
          children: "צפייה"
        }
      ) })
    ] }, draft.campaignId)) }) : null,
    items.length > 0 ? /* @__PURE__ */ jsxs("div", { className: styles$3.pager, children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$3.pagerButton,
          onClick: () => setDraftsPage((p) => Math.max(1, p - 1)),
          disabled: prevDisabled,
          children: "הקודם"
        }
      ),
      /* @__PURE__ */ jsxs("span", { className: styles$3.pagerInfo, children: [
        "עמוד ",
        draftsPage
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$3.pagerButton,
          onClick: () => setDraftsPage((p) => p + 1),
          disabled: nextDisabled,
          children: "הבא"
        }
      )
    ] }) : null,
    selectedDraftId ? /* @__PURE__ */ jsxs("div", { className: styles$3.detail, "aria-live": "polite", children: [
      selectedDraftLoading ? /* @__PURE__ */ jsx("p", { className: styles$3.muted, children: "טוען…" }) : null,
      selectedDraftError ? /* @__PURE__ */ jsx("p", { className: styles$3.error, role: "alert", children: selectedDraftError }) : null,
      selectedDraft ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: styles$3.detailBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$3.detailTitle, children: "תוכן הטיוטה" }),
          /* @__PURE__ */ jsxs("dl", { className: styles$3.detailList, children: [
            /* @__PURE__ */ jsxs("div", { className: styles$3.detailRow, children: [
              /* @__PURE__ */ jsx("dt", { className: styles$3.detailKey, children: "נושא" }),
              /* @__PURE__ */ jsx("dd", { className: styles$3.detailText, children: selectedDraft.contentSnapshot?.subject || "—" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$3.detailRow, children: [
              /* @__PURE__ */ jsx("dt", { className: styles$3.detailKey, children: "טקסט תצוגה" }),
              /* @__PURE__ */ jsx("dd", { className: styles$3.detailText, children: selectedDraft.contentSnapshot?.previewText || "—" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$3.detailRow, children: [
              /* @__PURE__ */ jsx("dt", { className: styles$3.detailKey, children: "כותרת" }),
              /* @__PURE__ */ jsx("dd", { className: styles$3.detailText, children: selectedDraft.contentSnapshot?.heading || "—" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$3.detailRow, children: [
              /* @__PURE__ */ jsx("dt", { className: styles$3.detailKey, children: "גוף הודעה" }),
              /* @__PURE__ */ jsx("dd", { className: styles$3.detailText, children: selectedDraft.contentSnapshot?.bodyText || "—" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$3.detailRow, children: [
              /* @__PURE__ */ jsx("dt", { className: styles$3.detailKey, children: "תמונה עליונה (כתובת)" }),
              /* @__PURE__ */ jsx("dd", { className: styles$3.detailText, children: selectedDraft.contentSnapshot?.topImageUrl || "—" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$3.detailRow, children: [
              /* @__PURE__ */ jsx("dt", { className: styles$3.detailKey, children: "כיתוב כפתור" }),
              /* @__PURE__ */ jsx("dd", { className: styles$3.detailText, children: selectedDraft.contentSnapshot?.ctaLabel || "—" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$3.detailRow, children: [
              /* @__PURE__ */ jsx("dt", { className: styles$3.detailKey, children: "כתובת כפתור" }),
              /* @__PURE__ */ jsx("dd", { className: styles$3.detailText, children: selectedDraft.contentSnapshot?.ctaUrl || "—" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$3.detailBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$3.detailTitle, children: "סיכום זכאות" }),
          /* @__PURE__ */ jsxs("ul", { className: styles$3.countList, children: [
            /* @__PURE__ */ jsxs("li", { className: styles$3.countItem, children: [
              "נבחרו:",
              " ",
              countOrDash(
                selectedDraft.selectionSummary?.selectedCount
              )
            ] }),
            /* @__PURE__ */ jsxs("li", { className: styles$3.countItem, children: [
              "כפולים:",
              " ",
              countOrDash(
                selectedDraft.selectionSummary?.duplicateCount
              )
            ] }),
            /* @__PURE__ */ jsxs("li", { className: styles$3.countItem, children: [
              "ייחודיים:",
              " ",
              countOrDash(
                selectedDraft.selectionSummary?.uniqueCount
              )
            ] }),
            /* @__PURE__ */ jsxs("li", { className: styles$3.countItem, children: [
              "זכאים:",
              " ",
              countOrDash(
                selectedDraft.selectionSummary?.eligibleCount
              )
            ] }),
            /* @__PURE__ */ jsxs("li", { className: styles$3.countItem, children: [
              "נפסלו:",
              " ",
              countOrDash(
                selectedDraft.selectionSummary?.skippedCount
              )
            ] })
          ] }),
          selectedDraft.selectionSummary?.skippedByReason && typeof selectedDraft.selectionSummary.skippedByReason === "object" && Object.keys(
            selectedDraft.selectionSummary.skippedByReason
          ).length > 0 ? /* @__PURE__ */ jsx("ul", { className: styles$3.reasonList, children: Object.entries(
            selectedDraft.selectionSummary.skippedByReason
          ).map(([reason, count]) => /* @__PURE__ */ jsxs(
            "li",
            {
              className: styles$3.reasonRow,
              children: [
                /* @__PURE__ */ jsx("span", { children: skipReasonLabel$1(reason) }),
                /* @__PURE__ */ jsx("span", { children: countOrDash(count) })
              ]
            },
            reason
          )) }) : null
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$3.detailBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$3.detailTitle, children: "סטטוס" }),
          /* @__PURE__ */ jsxs("ul", { className: styles$3.countList, children: [
            /* @__PURE__ */ jsxs("li", { className: styles$3.countItem, children: [
              "מצב: ",
              statusLabel(selectedDraft.status)
            ] }),
            /* @__PURE__ */ jsxs("li", { className: styles$3.countItem, children: [
              "נוצרה:",
              " ",
              formatDate$2(selectedDraft.createdAt)
            ] }),
            /* @__PURE__ */ jsxs("li", { className: styles$3.countItem, children: [
              "עודכנה:",
              " ",
              formatDate$2(selectedDraft.updatedAt)
            ] }),
            selectedDraft.canceledAt ? /* @__PURE__ */ jsxs("li", { className: styles$3.countItem, children: [
              "בוטלה:",
              " ",
              formatDate$2(
                selectedDraft.canceledAt
              )
            ] }) : null
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$3.sendStatusBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$3.detailTitle, children: "סטטוס שליחת קמפיין" }),
          /* @__PURE__ */ jsx("p", { className: styles$3.sendStatusHelper, children: "המידע כאן מציג סטטוס טכני של נמעני הקמפיין. הוא לא שולח אימיילים." }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$3.sendStatusButton,
              onClick: () => handleLoadSendStatus(
                selectedDraft.campaignId
              ),
              disabled: sendStatusLoading,
              children: sendStatusLoading ? "טוען סטטוס..." : "רענון סטטוס"
            }
          ),
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: styles$3.sendStatusStatus,
              role: "status",
              "aria-live": "polite",
              children: [
                sendStatusCheckedDraftId === selectedDraft.campaignId && sendStatusError ? /* @__PURE__ */ jsx(
                  "p",
                  {
                    className: styles$3.error,
                    role: "alert",
                    children: sendStatusError
                  }
                ) : null,
                sendStatusCheckedDraftId === selectedDraft.campaignId && sendStatusResult2 ? /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$3.sendStatusResult,
                    children: [
                      /* @__PURE__ */ jsxs("ul", { className: styles$3.countList, children: [
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "מצב קמפיין:",
                              " ",
                              sendStatusCampaignLabel(
                                sendStatusResult2.campaignStatus
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "סה״כ:",
                              " ",
                              countOrDash(
                                sendStatusResult2.counts.total
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "ממתינים:",
                              " ",
                              countOrDash(
                                sendStatusResult2.counts.pending
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "בעיבוד:",
                              " ",
                              countOrDash(
                                sendStatusResult2.counts.sending
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "נשלחו:",
                              " ",
                              countOrDash(
                                sendStatusResult2.counts.sent
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "נכשלו:",
                              " ",
                              countOrDash(
                                sendStatusResult2.counts.failed
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "דולגו:",
                              " ",
                              countOrDash(
                                sendStatusResult2.counts.skipped
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "נחסמו:",
                              " ",
                              countOrDash(
                                sendStatusResult2.counts.suppressed
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "בוטלו:",
                              " ",
                              countOrDash(
                                sendStatusResult2.counts.canceled
                              )
                            ]
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("ul", { className: styles$3.countList, children: [
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "בתור מאז:",
                              " ",
                              formatDate$2(
                                sendStatusResult2.queuedAt
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "בוטל:",
                              " ",
                              formatDate$2(
                                sendStatusResult2.canceledAt
                              )
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "li",
                          {
                            className: styles$3.countItem,
                            children: [
                              "עודכן:",
                              " ",
                              formatDate$2(
                                sendStatusResult2.updatedAt
                              )
                            ]
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: styles$3.muted, children: sendStatusResult2.counts.total === 0 ? "עדיין לא נוצרו רשומות שליחה לקמפיין הזה." : sendStatusResult2.hasActiveRows ? "יש רשומות פעילות בתהליך." : sendStatusResult2.isTerminal ? "אין רשומות פעילות כרגע." : "" }),
                      /* @__PURE__ */ jsx("p", { className: styles$3.muted, children: "השליחה מתבצעת באופן אסינכרוני. כדי לראות סטטוס עדכני יש ללחוץ על רענון סטטוס. “נשלחו” מציין שהמערכת קיבלה אישור מהספק." })
                    ]
                  }
                ) : null
              ]
            }
          )
        ] }),
        selectedDraft.status === "draft" ? /* @__PURE__ */ jsxs("div", { className: styles$3.readinessBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$3.detailTitle, children: "מוכנות לשליחה" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$3.readinessButton,
              onClick: () => handleCheckReadiness(
                selectedDraft.campaignId
              ),
              disabled: readinessLoading || readinessDisabledByFlag && readinessCheckedDraftId === selectedDraft.campaignId,
              children: readinessLoading ? "בודק מוכנות..." : "בדיקת מוכנות לשליחה"
            }
          ),
          /* @__PURE__ */ jsx("p", { className: styles$3.readinessHelper, children: "הבדיקה לא שולחת אימיילים ולא מפעילה קמפיין." }),
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: styles$3.readinessStatus,
              "aria-live": "polite",
              children: [
                readinessCheckedDraftId === selectedDraft.campaignId && readinessError ? /* @__PURE__ */ jsx(
                  "p",
                  {
                    className: styles$3.error,
                    role: "alert",
                    children: readinessError
                  }
                ) : null,
                readinessCheckedDraftId === selectedDraft.campaignId && readinessResult2 ? /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$3.readinessResult,
                    children: [
                      /* @__PURE__ */ jsx(
                        "p",
                        {
                          className: readinessResult2.ready ? styles$3.success : styles$3.muted,
                          children: readinessResult2.ready ? "הטיוטה מוכנה לשלב הבא." : "אין נמענים כשירים כרגע."
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "ul",
                        {
                          className: styles$3.countList,
                          children: [
                            /* @__PURE__ */ jsxs(
                              "li",
                              {
                                className: styles$3.countItem,
                                children: [
                                  "נבחרו:",
                                  " ",
                                  countOrDash(
                                    readinessResult2.selectedCount
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ jsxs(
                              "li",
                              {
                                className: styles$3.countItem,
                                children: [
                                  "זכאים:",
                                  " ",
                                  countOrDash(
                                    readinessResult2.eligibleCount
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ jsxs(
                              "li",
                              {
                                className: styles$3.countItem,
                                children: [
                                  "נפסלו:",
                                  " ",
                                  countOrDash(
                                    readinessResult2.skippedCount
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ jsxs(
                              "li",
                              {
                                className: styles$3.countItem,
                                children: [
                                  "כפולים:",
                                  " ",
                                  countOrDash(
                                    readinessResult2.duplicateCount
                                  )
                                ]
                              }
                            )
                          ]
                        }
                      ),
                      readinessResult2.skippedByReason && Object.keys(
                        readinessResult2.skippedByReason
                      ).length > 0 ? /* @__PURE__ */ jsx(
                        "ul",
                        {
                          className: styles$3.reasonList,
                          children: Object.entries(
                            readinessResult2.skippedByReason
                          ).map(
                            ([
                              reason,
                              count
                            ]) => /* @__PURE__ */ jsxs(
                              "li",
                              {
                                className: styles$3.reasonRow,
                                children: [
                                  /* @__PURE__ */ jsx("span", { children: skipReasonLabel$1(
                                    reason
                                  ) }),
                                  /* @__PURE__ */ jsx("span", { children: countOrDash(
                                    count
                                  ) })
                                ]
                              },
                              reason
                            )
                          )
                        }
                      ) : null,
                      readinessResult2.warnings.length > 0 ? /* @__PURE__ */ jsx(
                        "ul",
                        {
                          className: styles$3.reasonList,
                          children: readinessResult2.warnings.map(
                            (warning, idx) => /* @__PURE__ */ jsx(
                              "li",
                              {
                                className: styles$3.reasonRow,
                                children: /* @__PURE__ */ jsx("span", { children: String(
                                  warning
                                ) })
                              },
                              `${String(
                                warning
                              )}-${idx}`
                            )
                          )
                        }
                      ) : null
                    ]
                  }
                ) : null
              ]
            }
          )
        ] }) : null,
        cancelError ? /* @__PURE__ */ jsx("p", { className: styles$3.error, role: "alert", children: cancelError }) : null,
        selectedDraft.status === "draft" ? confirmingCancelId === selectedDraft.campaignId ? /* @__PURE__ */ jsxs(
          "div",
          {
            className: styles$3.confirmBox,
            role: "group",
            "aria-label": "אישור ביטול",
            children: [
              /* @__PURE__ */ jsx("span", { className: styles$3.confirmText, children: "לבטל את הטיוטה?" }),
              /* @__PURE__ */ jsxs("div", { className: styles$3.confirmActions, children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: styles$3.confirmYesButton,
                    onClick: () => handleConfirmCancel(
                      selectedDraft.campaignId
                    ),
                    disabled: cancelLoadingId === selectedDraft.campaignId,
                    children: "כן, בטל טיוטה"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: styles$3.confirmNoButton,
                    onClick: () => setConfirmingCancelId(null),
                    disabled: cancelLoadingId === selectedDraft.campaignId,
                    children: "לא, השאר"
                  }
                )
              ] })
            ]
          }
        ) : /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$3.cancelButton,
            onClick: () => setConfirmingCancelId(
              selectedDraft.campaignId
            ),
            children: "בטל טיוטה"
          }
        ) : null,
        selectedDraft.status === "draft" ? /* @__PURE__ */ jsxs("div", { className: styles$3.startPrepBlock, children: [
          /* @__PURE__ */ jsx("h4", { className: styles$3.detailTitle, children: "הכנת קמפיין לשליחה" }),
          /* @__PURE__ */ jsx("p", { className: styles$3.startPrepHelper, children: "הפעולה תיצור רשומות שליחה לנמענים ותעביר את הקמפיין למצב ממתין לשליחה. כאשר מנגנון השליחה פעיל, אימיילים עשויים להישלח אוטומטית לפי תצורת המערכת." }),
          readinessCheckedDraftId === selectedDraft.campaignId && readinessResult2 && !readinessResult2.ready ? /* @__PURE__ */ jsx("p", { className: styles$3.startPrepNote, children: "הטיוטה אינה מוכנה לשליחה — הבדיקה היא אינדיקציה בלבד, והשרת יבדוק שוב בעת ההפעלה." }) : null,
          startSendError ? /* @__PURE__ */ jsx(
            "p",
            {
              className: styles$3.error,
              role: "alert",
              children: startSendError
            }
          ) : null,
          confirmingStartSendId === selectedDraft.campaignId ? /* @__PURE__ */ jsxs(
            "div",
            {
              className: styles$3.confirmBox,
              role: "group",
              "aria-label": "אישור יצירת רשומות שליחה",
              children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$3.confirmText,
                    children: "הפעולה תעביר את הקמפיין למצב ממתין לשליחה. אם מנגנון השליחה פעיל, אימיילים עשויים להישלח בהקדם. ניתן לבטל את הקמפיין כדי לעצור שליחה של נמענים שעדיין ממתינים."
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$3.confirmActions,
                    children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: styles$3.confirmYesButton,
                          onClick: () => handleConfirmStartSend(
                            selectedDraft.campaignId
                          ),
                          disabled: startSendLoadingId === selectedDraft.campaignId,
                          children: "כן, העבר לממתין לשליחה"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: styles$3.confirmNoButton,
                          onClick: () => setConfirmingStartSendId(
                            null
                          ),
                          disabled: startSendLoadingId === selectedDraft.campaignId,
                          children: "לא, השאר כטיוטה"
                        }
                      )
                    ]
                  }
                )
              ]
            }
          ) : /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$3.startPrepButton,
              onClick: () => setConfirmingStartSendId(
                selectedDraft.campaignId
              ),
              disabled: startSendLoadingId === selectedDraft.campaignId,
              children: "יצירת רשומות שליחה"
            }
          )
        ] }) : null,
        selectedDraft.status === "queued" && !isSelectedDraftSendTerminal ? /* @__PURE__ */ jsxs("div", { className: styles$3.cancelSendBlock, children: [
          cancelSendError ? /* @__PURE__ */ jsx(
            "p",
            {
              className: styles$3.error,
              role: "alert",
              children: cancelSendError
            }
          ) : null,
          confirmingCancelSendId === selectedDraft.campaignId ? /* @__PURE__ */ jsxs(
            "div",
            {
              className: styles$3.confirmBox,
              role: "group",
              "aria-label": "אישור ביטול הכנת שליחה",
              children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$3.confirmText,
                    children: "הפעולה תבטל את הכנת השליחה ותסמן רשומות ממתינות כמבוטלות. אימיילים לא יישלחו דרך פעולה זו."
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$3.confirmActions,
                    children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: styles$3.confirmYesButton,
                          onClick: () => handleConfirmCancelSend(
                            selectedDraft.campaignId
                          ),
                          disabled: cancelSendLoadingId === selectedDraft.campaignId,
                          children: "כן, בטל הכנת שליחה"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: styles$3.confirmNoButton,
                          onClick: () => setConfirmingCancelSendId(
                            null
                          ),
                          disabled: cancelSendLoadingId === selectedDraft.campaignId,
                          children: "לא, השאר"
                        }
                      )
                    ]
                  }
                )
              ]
            }
          ) : /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$3.cancelSendButton,
              onClick: () => setConfirmingCancelSendId(
                selectedDraft.campaignId
              ),
              disabled: cancelSendLoadingId === selectedDraft.campaignId,
              children: "ביטול הכנת שליחה"
            }
          )
        ] }) : null,
        selectedDraft.status === "queued" && isSelectedDraftSendTerminal ? /* @__PURE__ */ jsx("p", { className: styles$3.muted, children: "השליחה הסתיימה. לא נותרו נמענים ממתינים לביטול." }) : null,
        selectedDraft.status === "draft" || selectedDraft.status === "canceled" ? /* @__PURE__ */ jsxs("div", { className: styles$3.deleteBlock, children: [
          deleteError ? /* @__PURE__ */ jsx(
            "p",
            {
              className: styles$3.error,
              role: "alert",
              children: deleteError
            }
          ) : null,
          confirmingDeleteId === selectedDraft.campaignId ? /* @__PURE__ */ jsxs(
            "div",
            {
              className: styles$3.confirmBox,
              role: "group",
              "aria-label": selectedDraft.status === "canceled" ? "אישור מחיקת קמפיין שבוטל" : "אישור מחיקה",
              children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$3.confirmText,
                    children: selectedDraft.status === "canceled" ? "הפעולה תמחק את הקמפיין שבוטל ואת רשומות השליחה הטכניות שמותר למחוק. לא ניתן לשחזר." : "הפעולה תמחק את הטיוטה רק אם עדיין לא נוצרו לה רשומות שליחה. לא ניתן לשחזר."
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$3.confirmActions,
                    children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: styles$3.confirmYesButton,
                          onClick: () => handleConfirmDelete(
                            selectedDraft.campaignId,
                            selectedDraft.status
                          ),
                          disabled: deleteLoadingId === selectedDraft.campaignId,
                          children: selectedDraft.status === "canceled" ? "כן, מחק קמפיין שבוטל" : "כן, מחק טיוטה"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: styles$3.confirmNoButton,
                          onClick: () => setConfirmingDeleteId(
                            null
                          ),
                          disabled: deleteLoadingId === selectedDraft.campaignId,
                          children: "לא, השאר"
                        }
                      )
                    ]
                  }
                )
              ]
            }
          ) : /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$3.deleteButton,
              onClick: () => setConfirmingDeleteId(
                selectedDraft.campaignId
              ),
              children: selectedDraft.status === "canceled" ? "מחיקת קמפיין שבוטל" : "מחיקת טיוטה"
            }
          )
        ] }) : null
      ] }) : null
    ] }) : null
  ] });
}
const root = "_root_am3ls_1";
const header = "_header_am3ls_21";
const titleWrap = "_titleWrap_am3ls_37";
const title$1 = "_title_am3ls_37";
const subtitle$1 = "_subtitle_am3ls_65";
const note = "_note_am3ls_77";
const noteStrong = "_noteStrong_am3ls_99";
const controls = "_controls_am3ls_107";
const filters = "_filters_am3ls_123";
const chip = "_chip_am3ls_137";
const chipActive = "_chipActive_am3ls_169";
const searchForm = "_searchForm_am3ls_179";
const searchLabel = "_searchLabel_am3ls_193";
const searchInput$1 = "_searchInput_am3ls_205";
const searchBtn = "_searchBtn_am3ls_239";
const summary = "_summary_am3ls_271";
const summaryItem = "_summaryItem_am3ls_289";
const error = "_error_am3ls_307";
const muted$1 = "_muted_am3ls_319";
const selectionBar = "_selectionBar_am3ls_331";
const selectionCount = "_selectionCount_am3ls_355";
const clearBtn = "_clearBtn_am3ls_367";
const selectionNote = "_selectionNote_am3ls_409";
const dryRunActions = "_dryRunActions_am3ls_427";
const dryRunButton = "_dryRunButton_am3ls_443";
const dryRunBoundaryNote = "_dryRunBoundaryNote_am3ls_487";
const dryRunRegion = "_dryRunRegion_am3ls_505";
const dryRunStaleHint = "_dryRunStaleHint_am3ls_519";
const dryRunPanel = "_dryRunPanel_am3ls_533";
const dryRunStats = "_dryRunStats_am3ls_555";
const dryRunStat = "_dryRunStat_am3ls_555";
const dryRunReasons = "_dryRunReasons_am3ls_585";
const dryRunReasonRow = "_dryRunReasonRow_am3ls_605";
const dryRunWarnings = "_dryRunWarnings_am3ls_627";
const dryRunWarning = "_dryRunWarning_am3ls_627";
const checkboxCell = "_checkboxCell_am3ls_663";
const checkbox = "_checkbox_am3ls_663";
const list = "_list_am3ls_697";
const row$1 = "_row_am3ls_715";
const rowHead = "_rowHead_am3ls_741";
const cell$1 = "_cell_am3ls_753";
const cellEmail = "_cellEmail_am3ls_765";
const styles$2 = {
  root,
  header,
  titleWrap,
  title: title$1,
  subtitle: subtitle$1,
  note,
  noteStrong,
  controls,
  filters,
  chip,
  chipActive,
  searchForm,
  searchLabel,
  searchInput: searchInput$1,
  searchBtn,
  summary,
  summaryItem,
  error,
  muted: muted$1,
  selectionBar,
  selectionCount,
  clearBtn,
  selectionNote,
  dryRunActions,
  dryRunButton,
  dryRunBoundaryNote,
  dryRunRegion,
  dryRunStaleHint,
  dryRunPanel,
  dryRunStats,
  dryRunStat,
  dryRunReasons,
  dryRunReasonRow,
  dryRunWarnings,
  dryRunWarning,
  checkboxCell,
  checkbox,
  list,
  row: row$1,
  rowHead,
  cell: cell$1,
  cellEmail
};
const FILTERS = [
  { key: "all", cohort: "", label: "הכל" },
  { key: "trial", cohort: "trial", label: "ניסיון" },
  { key: "paying", cohort: "paying", label: "משלמים" },
  { key: "non-paying", cohort: "non-paying", label: "לא משלמים" }
];
const PLAN_LABELS = {
  free: "חינם",
  monthly: "חודשי",
  yearly: "שנתי"
};
const SUB_STATUS_LABELS = {
  active: "פעיל",
  inactive: "לא פעיל",
  expired: "פג תוקף"
};
const CONSENT_SOURCE_LABELS = {
  register: "הרשמה",
  signup_consume: "השלמת הרשמה",
  invite_accept: "קבלת הזמנה",
  editor_sidebar: "עורך הכרטיס",
  settings_panel: "הגדרות",
  unsubscribe_link: "קישור ביטול"
};
function planLabel(plan) {
  return PLAN_LABELS[String(plan || "")] || (plan ? String(plan) : "—");
}
function subStatusLabel(status2) {
  return SUB_STATUS_LABELS[String(status2 || "")] || (status2 ? String(status2) : "—");
}
function consentSourceLabel(source) {
  if (!source) return "—";
  return CONSENT_SOURCE_LABELS[String(source)] || String(source);
}
function formatDate$1(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("he-IL");
}
function createDraftRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `draft-${crypto.randomUUID()}`;
  }
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function AdminMarketingView() {
  const [filterKey, setFilterKey] = useState("all");
  const [searchInput2, setSearchInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error2, setError] = useState("");
  const [data, setData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [previewStale, setPreviewStale] = useState(false);
  const [previewSubmittedAt, setPreviewSubmittedAt] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendResult, setSendResult] = useState(null);
  const [sendDisabledByFlag, setSendDisabledByFlag] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [pendingForm, setPendingForm] = useState(null);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState(
    () => /* @__PURE__ */ new Set()
  );
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunError, setDryRunError] = useState("");
  const [dryRunResult, setDryRunResult] = useState(null);
  const [dryRunStale, setDryRunStale] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftResult, setDraftResult] = useState(null);
  const [draftDisabledByFlag, setDraftDisabledByFlag] = useState(false);
  const [pendingDraftRequestId, setPendingDraftRequestId] = useState(null);
  function clearDraftAttempt() {
    setDraftResult(null);
    setDraftError("");
    setPendingDraftRequestId(null);
  }
  function handleToggleRecipient(userId) {
    if (dryRunResult) {
      setDryRunStale(true);
    }
    clearDraftAttempt();
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }
  function handleClearSelection() {
    setSelectedRecipientIds(/* @__PURE__ */ new Set());
    setDryRunResult(null);
    setDryRunError("");
    setDryRunStale(false);
    clearDraftAttempt();
  }
  async function handlePreview(form2) {
    setPreviewError("");
    setPreviewLoading(true);
    try {
      const res = await previewMarketingCampaign(form2);
      const payload = res?.data || {};
      setPreviewResult({
        text: typeof payload.text === "string" ? payload.text : "",
        warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
        formSnapshot: { ...form2 }
      });
      setPreviewSubmittedAt(Date.now());
      setPreviewStale(false);
    } catch (e) {
      const status2 = e?.response?.status;
      let msg;
      if (status2 === 400) {
        msg = typeof e?.response?.data?.message === "string" ? e.response.data.message : "בקשת תצוגה מקדימה שגויה";
      } else if (status2 === 403 || status2 === 404) {
        msg = "אין הרשאה לביצוע הפעולה";
      } else {
        msg = "אירעה שגיאה בתצוגה המקדימה";
      }
      setPreviewError(msg);
    } finally {
      setPreviewLoading(false);
    }
  }
  function handleOpenTestSendConfirm(form2) {
    setPendingForm({ ...form2 });
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
      const data2 = res?.data || {};
      const providerStatus = data2.providerStatus;
      const deliveredToMasked = typeof data2.deliveredToMasked === "string" ? data2.deliveredToMasked : "";
      const warnings2 = Array.isArray(data2.warnings) ? data2.warnings : [];
      if (providerStatus === "accepted" && data2.sent === true) {
        setSendResult({
          kind: "success",
          message: "הבקשה התקבלה אצל ספק המייל. בדקו את תיבת הדואר.",
          deliveredToMasked,
          warnings: warnings2,
          providerStatus
        });
        setLastSentAt(Date.now());
      } else if (providerStatus === "skipped") {
        setSendResult({
          kind: "warning",
          message: "שליחת מיילים אינה מוגדרת בסביבה זו.",
          deliveredToMasked,
          warnings: warnings2,
          providerStatus
        });
      } else {
        setSendResult({
          kind: "error",
          message: "שליחת המבחן נכשלה. נסו שוב מאוחר יותר.",
          deliveredToMasked: "",
          warnings: warnings2,
          providerStatus
        });
      }
    } catch (e) {
      const status2 = e?.response?.status;
      if (status2 === 409) {
        setSendDisabledByFlag(true);
        setSendError("");
      } else if (status2 === 400) {
        setSendError(
          typeof e?.response?.data?.message === "string" ? e.response.data.message : "בקשת שליחת מבחן שגויה"
        );
      } else if (status2 === 403 || status2 === 404) {
        setSendError("אין הרשאה לביצוע הפעולה");
      } else if (status2 === 429) {
        setSendError(
          "בוצעו יותר מדי שליחות מבחן. נסו שוב בעוד מספר דקות."
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
    setSendResult(null);
    setSendError("");
    clearDraftAttempt();
  }
  function handleComposerReset() {
    setPreviewResult(null);
    setPreviewError("");
    setPreviewStale(false);
    setPreviewSubmittedAt(null);
    setSendResult(null);
    setSendError("");
    setConfirmOpen(false);
    setLastSentAt(null);
    setPendingForm(null);
    clearDraftAttempt();
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
        const msg = typeof e?.response?.data?.message === "string" ? e.response.data.message : "לא הצלחנו לטעון את רשימת הנמענים";
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
  useEffect(() => {
    setSelectedRecipientIds(/* @__PURE__ */ new Set());
    setDryRunResult(null);
    setDryRunError("");
    setDryRunStale(false);
    clearDraftAttempt();
  }, [activeCohort, appliedQuery]);
  const items = Array.isArray(data?.items) ? data.items : [];
  const totalCandidates = typeof data?.totalCandidates === "number" ? data.totalCandidates : null;
  const returnedCount = typeof data?.returnedCount === "number" ? data.returnedCount : null;
  const suppressedOnPage = typeof data?.suppressedOnPage === "number" ? data.suppressedOnPage : null;
  const selectedVisibleCount = items.reduce(
    (acc, u) => acc + (selectedRecipientIds.has(u.userId) ? 1 : 0),
    0
  );
  async function handleDryRun() {
    if (dryRunLoading) return;
    const ids = items.filter((u) => selectedRecipientIds.has(u.userId)).map((u) => u.userId);
    if (ids.length === 0) {
      setDryRunError(
        "בחרו לפחות נמען אחד לבדיקה"
      );
      return;
    }
    setDryRunError("");
    setDryRunLoading(true);
    clearDraftAttempt();
    try {
      const res = await dryRunMarketingCampaign(ids);
      const data2 = res?.data || {};
      const num = (v) => typeof v === "number" ? v : null;
      const reasons = data2.skippedByReason && typeof data2.skippedByReason === "object" && !Array.isArray(data2.skippedByReason) ? data2.skippedByReason : {};
      setDryRunResult({
        selectedCount: num(data2.selectedCount),
        uniqueCount: num(data2.uniqueCount),
        duplicateCount: num(data2.duplicateCount),
        eligibleCount: num(data2.eligibleCount),
        skippedCount: num(data2.skippedCount),
        skippedByReason: reasons,
        warnings: Array.isArray(data2.warnings) ? data2.warnings : []
      });
      setDryRunStale(false);
    } catch (e) {
      const status2 = e?.response?.status;
      let msg;
      if (status2 === 400) {
        msg = typeof e?.response?.data?.message === "string" ? e.response.data.message : "בקשת בדיקת זכאות שגויה";
      } else if (status2 === 403 || status2 === 404) {
        msg = "אין הרשאה לביצוע הפעולה";
      } else {
        msg = "אירעה שגיאה בבדיקת הזכאות";
      }
      setDryRunError(msg);
    } finally {
      setDryRunLoading(false);
    }
  }
  async function handleSaveDraft(form2) {
    if (draftLoading) return;
    if (selectedVisibleCount === 0) {
      setDraftResult(null);
      setDraftError(
        "בחרו לפחות נמען אחד לשמירת הטיוטה."
      );
      return;
    }
    if (!dryRunResult || dryRunStale) {
      setDraftResult(null);
      setDraftError(
        "הריצו בדיקת זכאות עדכנית לפני שמירת הטיוטה."
      );
      return;
    }
    const ids = items.filter((u) => selectedRecipientIds.has(u.userId)).map((u) => u.userId);
    if (ids.length === 0) {
      setDraftResult(null);
      setDraftError(
        "בחרו לפחות נמען אחד לשמירת הטיוטה."
      );
      return;
    }
    const requestId = pendingDraftRequestId || createDraftRequestId();
    if (!pendingDraftRequestId) {
      setPendingDraftRequestId(requestId);
    }
    setDraftError("");
    setDraftLoading(true);
    try {
      const res = await createMarketingCampaignDraft({
        userIds: ids,
        content: form2,
        requestId
      });
      const data2 = res?.data || {};
      const warnings2 = Array.isArray(data2.warnings) ? data2.warnings : [];
      const num = (v) => typeof v === "number" ? v : null;
      const replay = warnings2.includes("IDEMPOTENT_REPLAY");
      setDraftResult({
        message: replay ? "הטיוטה כבר נשמרה (לא נוצרה כפילות)." : "הטיוטה נשמרה בהצלחה.",
        selectedCount: num(data2.selectedCount),
        eligibleCount: num(data2.eligibleCount),
        skippedCount: num(data2.skippedCount)
      });
    } catch (e) {
      const status2 = e?.response?.status;
      const serverMsg = typeof e?.response?.data?.message === "string" ? e.response.data.message : "";
      if (status2 === 409) {
        if (serverMsg === "Marketing campaign drafts are disabled") {
          setDraftDisabledByFlag(true);
          setDraftError("");
          setDraftResult(null);
          setPendingDraftRequestId(null);
        } else {
          setDraftResult(null);
          setPendingDraftRequestId(null);
          setDraftError(
            "טיוטה זו כבר נשמרה."
          );
        }
      } else if (status2 === 400) {
        setDraftResult(null);
        setDraftError(
          serverMsg || "בקשת שמירת טיוטה שגויה."
        );
      } else if (status2 === 422) {
        setDraftResult(null);
        setDraftError(
          "לא נמצאו נמענים כשירים לשמירת הטיוטה."
        );
      } else {
        setDraftResult(null);
        setDraftError(
          "שמירת הטיוטה נכשלה. נסו שוב מאוחר יותר."
        );
      }
    } finally {
      setDraftLoading(false);
    }
  }
  function onSubmitSearch(e) {
    e.preventDefault();
    setAppliedQuery(searchInput2.trim());
  }
  return /* @__PURE__ */ jsxs("section", { className: styles$2.root, "aria-label": "שליחת אימיילים", children: [
    /* @__PURE__ */ jsx("header", { className: styles$2.header, children: /* @__PURE__ */ jsxs("div", { className: styles$2.titleWrap, children: [
      /* @__PURE__ */ jsx("h2", { className: styles$2.title, children: "שליחת אימיילים" }),
      /* @__PURE__ */ jsx("p", { className: styles$2.subtitle, children: "מסך זה מציג רק משתמשים שאישרו קבלת דיוור שיווקי ואימתו את כתובת האימייל שלהם. הכנת תוכן למיילים זמינה כעת; תצוגה מקדימה, שליחת מבחן ושליחה לרשימה יופעלו בשלבים הבאים." })
    ] }) }),
    /* @__PURE__ */ jsxs("p", { className: styles$2.note, children: [
      "המספר הכולל (",
      /* @__PURE__ */ jsx("span", { className: styles$2.noteStrong, children: "מועמדים" }),
      ") מחושב לפני סינון הסרות דיוור. הרשימה המוצגת היא לאחר סינון הסרות ברמת העמוד, ולכן ייתכן שמספר השורות קטן מהמספר הכולל."
    ] }),
    /* @__PURE__ */ jsx(
      MarketingComposerForm,
      {
        onPreview: handlePreview,
        isPreviewing: previewLoading,
        isPreviewStale: previewStale,
        onComposerChange: handleComposerChange,
        onComposerReset: handleComposerReset,
        onTestSend: handleOpenTestSendConfirm,
        isSending: sendLoading,
        sendDisabled: false,
        sendResult,
        sendError,
        sendDisabledByFlag,
        onSaveDraft: handleSaveDraft,
        isSavingDraft: draftLoading,
        draftResult,
        draftError,
        draftDisabledByFlag,
        canSaveDraft: selectedVisibleCount > 0 && !!dryRunResult && !dryRunStale,
        draftDisabledReason: selectedVisibleCount === 0 ? "בחרו לפחות נמען אחד לשמירת הטיוטה." : !dryRunResult || dryRunStale ? "הריצו בדיקת זכאות עדכנית לפני שמירת הטיוטה." : ""
      }
    ),
    /* @__PURE__ */ jsx(
      MarketingPreviewPanel,
      {
        result: previewResult,
        error: previewError,
        isLoading: previewLoading,
        isStale: previewStale,
        submittedAt: previewSubmittedAt
      }
    ),
    /* @__PURE__ */ jsx(
      MarketingTestSendConfirm,
      {
        open: confirmOpen,
        isSending: sendLoading,
        onConfirm: handleConfirmTestSend,
        onCancel: handleCancelTestSend
      }
    ),
    /* @__PURE__ */ jsx(MarketingDraftsPanel, {}),
    /* @__PURE__ */ jsxs("div", { className: styles$2.controls, children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: styles$2.filters,
          role: "group",
          "aria-label": "סינון נמענים",
          children: FILTERS.map((f) => /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: `${styles$2.chip} ${filterKey === f.key ? styles$2.chipActive : ""}`,
              "aria-pressed": filterKey === f.key,
              onClick: () => setFilterKey(f.key),
              children: f.label
            },
            f.key
          ))
        }
      ),
      /* @__PURE__ */ jsxs("form", { className: styles$2.searchForm, onSubmit: onSubmitSearch, children: [
        /* @__PURE__ */ jsx("label", { className: styles$2.searchLabel, htmlFor: "mkt-search", children: "חפש" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "mkt-search",
            type: "search",
            className: styles$2.searchInput,
            value: searchInput2,
            onChange: (e) => setSearchInput(e.target.value),
            placeholder: "חיפוש לפי אימייל",
            maxLength: 64
          }
        ),
        /* @__PURE__ */ jsx("button", { type: "submit", className: styles$2.searchBtn, children: "חפש" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles$2.summary, "aria-live": "polite", children: [
      /* @__PURE__ */ jsxs("span", { className: styles$2.summaryItem, children: [
        "מועמדים: ",
        totalCandidates ?? "—"
      ] }),
      /* @__PURE__ */ jsxs("span", { className: styles$2.summaryItem, children: [
        "מוצגים: ",
        returnedCount ?? "—"
      ] }),
      /* @__PURE__ */ jsxs("span", { className: styles$2.summaryItem, children: [
        "הוסרו בעמוד: ",
        suppressedOnPage ?? "—"
      ] })
    ] }),
    error2 ? /* @__PURE__ */ jsx("p", { className: styles$2.error, role: "alert", children: error2 }) : null,
    loading ? /* @__PURE__ */ jsx("p", { className: styles$2.muted, children: "טוען…" }) : items.length === 0 ? /* @__PURE__ */ jsx("p", { className: styles$2.muted, children: "אין נמענים זמינים לסינון הנוכחי." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: styles$2.selectionBar, children: [
        /* @__PURE__ */ jsxs("span", { className: styles$2.selectionCount, children: [
          "נבחרו ",
          selectedVisibleCount,
          " נמענים"
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$2.clearBtn,
            onClick: handleClearSelection,
            disabled: selectedVisibleCount === 0,
            children: "נקה בחירה"
          }
        ),
        /* @__PURE__ */ jsx("span", { className: styles$2.selectionNote, children: "בחירת נמענים היא להכנה בלבד. שליחה לרשימה תתווסף בשלב נפרד לאחר בדיקת זכאות." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$2.dryRunActions, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$2.dryRunButton,
            onClick: handleDryRun,
            disabled: selectedVisibleCount === 0 || dryRunLoading,
            children: dryRunLoading ? "בודק זכאות…" : "בדיקת זכאות לנמענים"
          }
        ),
        /* @__PURE__ */ jsx("span", { className: styles$2.dryRunBoundaryNote, children: "הבדיקה אינה שולחת מיילים ואינה יוצרת קמפיין." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$2.dryRunRegion, "aria-live": "polite", children: [
        dryRunError ? /* @__PURE__ */ jsx("p", { className: styles$2.error, role: "alert", children: dryRunError }) : null,
        dryRunStale ? /* @__PURE__ */ jsx("p", { className: styles$2.dryRunStaleHint, children: "התוצאה אינה מעודכנת לאחר שינוי בחירה. הריצו בדיקה מחדש." }) : null,
        dryRunResult ? /* @__PURE__ */ jsxs("div", { className: styles$2.dryRunPanel, children: [
          /* @__PURE__ */ jsxs("div", { className: styles$2.dryRunStats, children: [
            /* @__PURE__ */ jsxs("span", { className: styles$2.dryRunStat, children: [
              "נבחרו:",
              " ",
              dryRunResult.selectedCount ?? "—"
            ] }),
            /* @__PURE__ */ jsxs("span", { className: styles$2.dryRunStat, children: [
              "ייחודיים:",
              " ",
              dryRunResult.uniqueCount ?? "—"
            ] }),
            /* @__PURE__ */ jsxs("span", { className: styles$2.dryRunStat, children: [
              "כפולים:",
              " ",
              dryRunResult.duplicateCount ?? "—"
            ] }),
            /* @__PURE__ */ jsxs("span", { className: styles$2.dryRunStat, children: [
              "זכאים:",
              " ",
              dryRunResult.eligibleCount ?? "—"
            ] }),
            /* @__PURE__ */ jsxs("span", { className: styles$2.dryRunStat, children: [
              "נפסלו:",
              " ",
              dryRunResult.skippedCount ?? "—"
            ] })
          ] }),
          Object.keys(dryRunResult.skippedByReason).length > 0 ? /* @__PURE__ */ jsx("ul", { className: styles$2.dryRunReasons, children: Object.entries(
            dryRunResult.skippedByReason
          ).map(([reason, count]) => /* @__PURE__ */ jsxs(
            "li",
            {
              className: styles$2.dryRunReasonRow,
              children: [
                /* @__PURE__ */ jsx("span", { children: skipReasonLabel(reason) }),
                /* @__PURE__ */ jsx("span", { children: typeof count === "number" ? count : "—" })
              ]
            },
            reason
          )) }) : null,
          dryRunResult.warnings.length > 0 ? /* @__PURE__ */ jsx("ul", { className: styles$2.dryRunWarnings, children: dryRunResult.warnings.map((w, i) => /* @__PURE__ */ jsx(
            "li",
            {
              className: styles$2.dryRunWarning,
              children: String(w)
            },
            `${i}-${String(w)}`
          )) }) : null
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxs("ul", { className: styles$2.list, children: [
        /* @__PURE__ */ jsxs("li", { className: `${styles$2.row} ${styles$2.rowHead}`, children: [
          /* @__PURE__ */ jsx("span", { className: styles$2.checkboxCell, children: "בחירה" }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cellEmail, children: "אימייל" }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cell, children: "שם" }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cell, children: "מסלול" }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cell, children: "מנוי" }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cell, children: "ניסיון" }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cell, children: "אימות" }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cell, children: "הסכמה" })
        ] }),
        items.map((u) => /* @__PURE__ */ jsxs("li", { className: styles$2.row, children: [
          /* @__PURE__ */ jsx("span", { className: styles$2.checkboxCell, children: /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              className: styles$2.checkbox,
              checked: selectedRecipientIds.has(
                u.userId
              ),
              onChange: () => handleToggleRecipient(u.userId),
              "aria-label": `בחר נמען ${u.email}`
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cellEmail, children: u.email }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cell, children: u.firstName || "—" }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cell, children: planLabel(u.plan) }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cell, children: subStatusLabel(u.subscriptionStatus) }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cell, children: u.isTrialActive ? "פעיל" : "—" }),
          /* @__PURE__ */ jsx("span", { className: styles$2.cell, children: u.isVerified ? "מאומת" : "לא מאומת" }),
          /* @__PURE__ */ jsxs("span", { className: styles$2.cell, children: [
            consentSourceLabel(
              u.emailMarketingConsentSource
            ),
            u.emailMarketingConsentAt ? ` · ${formatDate$1(
              u.emailMarketingConsentAt
            )}` : ""
          ] })
        ] }, u.userId))
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
function memberStatusHe(status2) {
  if (status2 === "active") return "פעיל";
  if (status2 === "suspended") return "מושהה";
  return String(status2 || "");
}
function roleHe$1(role) {
  if (role === "member") return "חבר";
  if (role === "admin") return "מנהל";
  return String(role || "");
}
function mapAdminApiError(err2) {
  const status2 = err2?.response?.status;
  const code = err2?.response?.data?.code;
  const apiMessage = typeof err2?.response?.data?.message === "string" ? err2.response.data.message.trim() : "";
  if (status2 === 409 && code === "ORG_SLUG_TAKEN") return "הסלאג כבר תפוס.";
  if (status2 === 409 && code === "MEMBER_EXISTS")
    return "החבר כבר קיים בארגון.";
  if (status2 === 409 && code === "INVITE_ALREADY_PENDING")
    return "כבר קיימת הזמנה ממתינה לאימייל הזה.";
  if (status2 === 409 && code === "SEAT_LIMIT_REACHED")
    return apiMessage || "הגעת למגבלת המושבים.";
  if (status2 === 404 && code === "USER_NOT_FOUND") return "המשתמש לא נמצא.";
  if (status2 === 400 && code === "INVALID_SLUG") return "סלאג לא תקין.";
  if (status2 === 400 && code === "RESERVED_SLUG")
    return "הסלאג שמור ואסור לשימוש.";
  if (status2 === 400 && code === "SLUG_IMMUTABLE")
    return "אי אפשר לשנות סלאג לאחר יצירה.";
  if (status2 === 400 && code === "INVALID_NAME") return "שם לא תקין.";
  if (status2 === 400 && code === "INVALID_EMAIL") return "אימייל לא תקין.";
  if (status2 === 400 && code === "INVALID_USER_ID")
    return "מזהה משתמש לא תקין.";
  if (status2 === 400 && code === "INVALID_ROLE") return "תפקיד לא תקין.";
  if (status2 === 400 && code === "INVALID_STATUS") return "סטטוס לא תקין.";
  if (status2 === 400 && (code === "EMPTY_PATCH" || code === "INVALID_PATCH"))
    return "אין מה לעדכן.";
  if (status2 === 409 && code === "ENTITLEMENT_ALREADY_ACTIVE")
    return "הרשאת הארגון כבר פעילה. השתמש בהארכת גישה.";
  if (status2 === 409 && code === "NOT_ACTIVE")
    return "אין הרשאה פעילה להארכה. יש להעניק גישה חדשה.";
  if (status2 === 409 && code === "NO_ENTITLEMENT")
    return "אין הרשאה פעילה לביטול.";
  if (status2 === 409 && code === "INACTIVE_ORG") return "הארגון אינו פעיל.";
  if (status2 === 400 && code === "CONFIRM_REQUIRED")
    return "נדרש אישור הענקת גישה שנתית.";
  if (status2 === 400 && code === "INVALID_REASON")
    return "הסיבה חייבת להכיל 5–500 תווים.";
  if (status2 === 400 && code === "INVALID_EXPIRES_AT")
    return "תאריך תפוגה לא תקין.";
  if (status2 === 400 && code === "INVALID_DATE_RANGE")
    return "טווח תאריכים לא תקין.";
  if (status2 === 400 && code === "INVALID_PAYMENT_REFERENCE")
    return "אסמכתא תשלום לא תקינה (עד 120 תווים).";
  if (status2 === 400 && code === "INVALID_ADMIN_NOTE")
    return "הערת מנהל לא תקינה (עד 500 תווים).";
  if (status2 === 401) return "נדרשת התחברות.";
  if (status2 === 403) return "אין הרשאות.";
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
  function showFlash(type, text2) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash({ type, text: text2 });
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
    } catch (err2) {
      showFlash("error", mapAdminApiError(err2));
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
              const status2 = inviteStatus(inv);
              const canRevoke = status2 === "ממתינה";
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
                        children: status2
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
const adminRoot = "_adminRoot_1ybqn_1";
const scrollArea = "_scrollArea_1ybqn_21";
const body = "_body_1ybqn_59";
const cardBody = "_cardBody_1ybqn_69";
const topbar = "_topbar_1ybqn_97";
const topbarTitleWrap = "_topbarTitleWrap_1ybqn_125";
const topbarActions = "_topbarActions_1ybqn_139";
const commandBar = "_commandBar_1ybqn_153";
const commandBarButtons = "_commandBarButtons_1ybqn_169";
const commandBtn = "_commandBtn_1ybqn_183";
const commandBarHint = "_commandBarHint_1ybqn_201";
const title = "_title_1ybqn_215";
const subtitle = "_subtitle_1ybqn_229";
const leftRail = "_leftRail_1ybqn_265";
const queueCards = "_queueCards_1ybqn_273";
const queueUsers = "_queueUsers_1ybqn_281";
const queueOrgs = "_queueOrgs_1ybqn_289";
const rightPanel = "_rightPanel_1ybqn_297";
const statsCard = "_statsCard_1ybqn_305";
const cardShell = "_cardShell_1ybqn_359";
const mobileOnly = "_mobileOnly_1ybqn_377";
const cardHeader = "_cardHeader_1ybqn_385";
const directoryTools = "_directoryTools_1ybqn_401";
const searchRow = "_searchRow_1ybqn_413";
const searchInput = "_searchInput_1ybqn_427";
const headerRow = "_headerRow_1ybqn_447";
const h2 = "_h2_1ybqn_461";
const table = "_table_1ybqn_475";
const rowBtn = "_rowBtn_1ybqn_521";
const ltr = "_ltr_1ybqn_553";
const truncate = "_truncate_1ybqn_563";
const muted = "_muted_1ybqn_583";
const mismatchBadge = "_mismatchBadge_1ybqn_593";
const errorText = "_errorText_1ybqn_617";
const warningBox = "_warningBox_1ybqn_631";
const sectionBlock = "_sectionBlock_1ybqn_647";
const sectionTitle = "_sectionTitle_1ybqn_659";
const kv = "_kv_1ybqn_671";
const kvDl = "_kvDl_1ybqn_683";
const kvDt = "_kvDt_1ybqn_697";
const kvDd = "_kvDd_1ybqn_711";
const selectedHeaderStrip = "_selectedHeaderStrip_1ybqn_723";
const selectedPrimary = "_selectedPrimary_1ybqn_743";
const selectedLabel = "_selectedLabel_1ybqn_759";
const selectedValue = "_selectedValue_1ybqn_769";
const selectedMeta = "_selectedMeta_1ybqn_777";
const metaPill = "_metaPill_1ybqn_791";
const metaKey = "_metaKey_1ybqn_813";
const actionGroup = "_actionGroup_1ybqn_823";
const formRow = "_formRow_1ybqn_839";
const toggleRow = "_toggleRow_1ybqn_871";
const provenancePanel = "_provenancePanel_1ybqn_899";
const provenanceHeader = "_provenanceHeader_1ybqn_915";
const provenanceHeaderLeft = "_provenanceHeaderLeft_1ybqn_931";
const provenancePill = "_provenancePill_1ybqn_947";
const auditList = "_auditList_1ybqn_971";
const auditRow = "_auditRow_1ybqn_983";
const auditMeta = "_auditMeta_1ybqn_1003";
const auditKey = "_auditKey_1ybqn_1019";
const auditReason = "_auditReason_1ybqn_1029";
const selectField = "_selectField_1ybqn_1039";
const selectLabel = "_selectLabel_1ybqn_1055";
const select = "_select_1ybqn_723";
const tabs = "_tabs_1ybqn_1103";
const selectedCard = "_selectedCard_1ybqn_1255";
const tab = "_tab_1ybqn_475";
const queuePanel = "_queuePanel_1ybqn_1319";
const legend = "_legend_1ybqn_1419";
const tabActive = "_tabActive_1ybqn_1483";
const legendDetails = "_legendDetails_1ybqn_1497";
const legendSummary = "_legendSummary_1ybqn_1511";
const legendIntro = "_legendIntro_1ybqn_1563";
const legendGroup = "_legendGroup_1ybqn_1581";
const legendHeading = "_legendHeading_1ybqn_1609";
const legendDl = "_legendDl_1ybqn_1625";
const legendNote = "_legendNote_1ybqn_1671";
const queueBody = "_queueBody_1ybqn_1701";
const queueSummary = "_queueSummary_1ybqn_1709";
const queueCount = "_queueCount_1ybqn_1775";
const pager = "_pager_1ybqn_1797";
const pagerMeta = "_pagerMeta_1ybqn_1815";
const pagerControls = "_pagerControls_1ybqn_1825";
const pagerPage = "_pagerPage_1ybqn_1837";
const centerCard = "_centerCard_1ybqn_1849";
const cardPublicLink = "_cardPublicLink_1ybqn_1873";
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
  tab,
  queuePanel,
  legend,
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
function mapApiErrorToHebrew(err2, fallbackKey = "err_generic") {
  const status2 = err2?.response?.status;
  const code = err2?.response?.data?.code;
  if (status2 === 401 || code === "UNAUTHORIZED") return t("err_unauthorized");
  if (status2 === 403 || code === "FORBIDDEN") return t("err_forbidden");
  if (status2 === 429 || code === "RATE_LIMITED") return t("err_rate_limited");
  if (status2 === 404) return t("err_not_found");
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
function cardStatusHe(status2) {
  if (status2 === "draft") return t("card_status_draft");
  if (status2 === "published") return t("card_status_published");
  return String(status2 || "");
}
function planHe(plan) {
  if (plan === "free") return t("plan_free");
  if (plan === "monthly") return t("plan_monthly");
  if (plan === "yearly") return t("plan_yearly");
  return String(plan || "");
}
function billingStatusHe(status2) {
  if (status2 === "free") return t("billing_status_free");
  if (status2 === "trial") return t("billing_status_trial");
  if (status2 === "active") return t("billing_status_active");
  if (status2 === "past_due") return t("billing_status_past_due");
  if (status2 === "canceled") return t("billing_status_canceled");
  return String(status2 || "");
}
function tierHe(tier) {
  if (tier === "free") return t("opt_tier_free");
  if (tier === "basic") return t("opt_tier_basic");
  if (tier === "premium") return t("opt_tier_premium");
  return String(tier || "");
}
function isAccessDenied(err2) {
  const status2 = err2?.response?.status;
  return status2 === 401 || status2 === 403;
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
  const [error2, setError] = useState("");
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
    const list2 = Array.isArray(cards) ? cards : [];
    const q = String(cardsQuery || "").trim().toLowerCase();
    if (!q) return list2;
    return list2.filter((c) => {
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        setError(mapApiErrorToHebrew(err2, "err_load_admin"));
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        setError(mapApiErrorToHebrew(err2, "err_load_admin"));
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        setError(mapApiErrorToHebrew(err2, "err_load_admin"));
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        setError(mapApiErrorToHebrew(err2, "err_load_card"));
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        setSelectedUserError(mapApiErrorToHebrew(err2, "err_generic"));
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
  function normalizeActionError(err2) {
    return mapApiErrorToHebrew(err2, "err_generic");
  }
  function getServerCodeMessage(err2) {
    const code = err2?.response?.data?.code;
    const msg = err2?.response?.data?.message;
    const message = typeof msg === "string" && msg.trim() ? msg.trim() : typeof err2?.message === "string" && err2.message.trim() ? err2.message.trim() : "Request failed";
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        const msg = normalizeActionError(err2);
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        const msg = normalizeActionError(err2);
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        const msg = normalizeActionError(err2);
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        const msg = normalizeActionError(err2);
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        const msg = normalizeActionError(err2);
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        const msg = normalizeActionError(err2);
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
    } catch (err2) {
      if (isAccessDenied(err2)) {
        setAccessDenied(true);
      } else {
        setUserDeleteError(getServerCodeMessage(err2));
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
      } catch (err2) {
        if (cancelled) return;
        setBillingCards([]);
        setBillingCardsStatus("error");
        setBillingCardsError(mapApiErrorToHebrew(err2, "err_generic"));
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
      } catch (err2) {
        if (cancelled) return;
        setSelectedAuditItems([]);
        setSelectedAuditStatus("error");
        setSelectedAuditError(mapApiErrorToHebrew(err2, "err_generic"));
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
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: `${styles.tab} ${adminMode === "marketing" ? styles.tabActive : ""}`,
                  role: "tab",
                  "aria-selected": adminMode === "marketing",
                  onClick: () => setAdminMode("marketing"),
                  children: "שליחת אימיילים"
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
            error2 ? /* @__PURE__ */ jsx(
              FlashBanner,
              {
                type: "error",
                message: error2,
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
                                      t(
                                        "label_card_public_url"
                                      ),
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
                                        children: t(
                                          "label_card_public_url"
                                        )
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
                          const text2 = e.clipboardData?.getData(
                            "text"
                          ) || "";
                          const raw = String(
                            text2 || ""
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
                          const status2 = billingUserPlan === "free" ? "free" : "active";
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
                                  status: status2,
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
                          const text2 = e.clipboardData?.getData(
                            "text"
                          ) || "";
                          const raw = String(
                            text2 || ""
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
                          const status2 = billingCardPlan === "free" ? "free" : "active";
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
                                  status: status2,
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
                                      t(
                                        "label_card_public_url"
                                      ),
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
                                        children: t(
                                          "label_card_public_url"
                                        )
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
    ] }) : adminMode === "blog" ? /* @__PURE__ */ jsx(AdminBlogView, {}) : adminMode === "guides" ? /* @__PURE__ */ jsx(AdminGuidesView, {}) : adminMode === "marketing" ? /* @__PURE__ */ jsx(AdminMarketingView, {}) : /* @__PURE__ */ jsx(AdminAnalyticsView, { refreshKey: analyticsRefreshKey }) })
  ] });
}
export {
  Admin as default
};
