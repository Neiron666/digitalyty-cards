import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect, useId, useMemo } from "react";
import { useNavigate, useParams, useBlocker, Link } from "react-router-dom";
import { g as getAccountSummary, u as updateEmailPreferences, a as getReceipts, d as deleteAccount, c as changePassword, b as cancelRenewal, r as resumeAutoRenewal, e as deletePaymentMethod, f as updateReceiptProfile, h as updateAccountName } from "./account.service-uDeHNjVm.js";
import { C as CopyIcon, g as CrownIcon, H as HelpIcon, A as AnalyticsIcon, h as SettingsIcon, i as SeoIcon, j as FaqIcon, R as ReviewsIcon, G as GalleryIcon, W as WorkHoursIcon, k as ServicesIcon, l as ContentIcon, m as ContactIcon, n as BusinessIcon, o as HeadIcon, p as SelfDesignIcon, T as TemplatesIcon, a as api, B as Button, q as useFocusTrap, u as useAuth, s as SUPPORT_WHATSAPP_URL, w as SUPPORT_EMAIL, x as getAnonymousId, y as clearAnonymousId, S as SeoHelmet } from "../entry-server.js";
import { I as Input } from "./Input-BcHQKXiD.js";
import { f as formStyles, g as galleryItemToUrl, u as uploadGalleryImage, a as uploadDesignAsset, b as getTemplateById, n as normalizeTemplateId, T as TEMPLATES, r as resolveEffectiveSelfThemeV1, c as getOwnerSelfExcludeKey, L as LEGACY_OWNER_SELF_EXCLUDE_KEY, C as CardRenderer } from "./CardRenderer-DegCLt5J.js";
import Cropper from "react-easy-crop";
import { P as PASSWORD_POLICY_HELPER_TEXT_HE, a as PASSWORD_POLICY, g as getPasswordPolicyChecklist, v as validatePasswordPolicy, b as getPasswordPolicyMessage } from "./passwordPolicy-XzlGEeig.js";
import { w as withDemoPreviewCard } from "./previewDemo-BAfUzxo7.js";
import { u as updateCardSlug, d as deleteCard } from "./cards.service-CwGKgAdq.js";
import "react-dom/server";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "axios";
import "qrcode.react";
import "./Notice-Rge9ZUBq.js";
const editor = "_editor_bijr6_1";
const scrollLock = "_scrollLock_bijr6_35";
const panel$2 = "_panel_bijr6_65";
const preview$2 = "_preview_bijr6_89";
const topbar = "_topbar_bijr6_117";
const sectionsTrigger = "_sectionsTrigger_bijr6_141";
const sectionsIcon = "_sectionsIcon_bijr6_149";
const sectionsDot = "_sectionsDot_bijr6_157";
const sectionsLabel = "_sectionsLabel_bijr6_165";
const segmented = "_segmented_bijr6_173";
const segment = "_segment_bijr6_173";
const segmentActive = "_segmentActive_bijr6_189";
const drawerOverlay = "_drawerOverlay_bijr6_195";
const drawerOverlayOpen = "_drawerOverlayOpen_bijr6_203";
const drawerHeader = "_drawerHeader_bijr6_209";
const drawerTitle = "_drawerTitle_bijr6_217";
const drawerCloseBtn = "_drawerCloseBtn_bijr6_223";
const sidebarSlot = "_sidebarSlot_bijr6_229";
const drawerOpen = "_drawerOpen_bijr6_291";
const toast = "_toast_bijr6_297";
const toastText = "_toastText_bijr6_305";
const toastAction = "_toastAction_bijr6_311";
const contextWrap = "_contextWrap_bijr6_463";
const contextLabel$1 = "_contextLabel_bijr6_477";
const selectShell$1 = "_selectShell_bijr6_493";
const contextSelect$1 = "_contextSelect_bijr6_531";
const contextCaret$1 = "_contextCaret_bijr6_581";
const guideBtnWrap = "_guideBtnWrap_bijr6_983";
const guideBtn = "_guideBtn_bijr6_983";
const guideBtnPulse = "_guideBtnPulse_bijr6_1035";
const guideBtnAck = "_guideBtnAck_bijr6_1047";
const guideDropdown = "_guideDropdown_bijr6_1097";
const guideDropdownItem = "_guideDropdownItem_bijr6_1127";
const styles$s = {
  editor,
  scrollLock,
  panel: panel$2,
  preview: preview$2,
  topbar,
  sectionsTrigger,
  sectionsIcon,
  sectionsDot,
  sectionsLabel,
  segmented,
  segment,
  segmentActive,
  drawerOverlay,
  drawerOverlayOpen,
  drawerHeader,
  drawerTitle,
  drawerCloseBtn,
  sidebarSlot,
  drawerOpen,
  toast,
  toastText,
  toastAction,
  contextWrap,
  contextLabel: contextLabel$1,
  selectShell: selectShell$1,
  contextSelect: contextSelect$1,
  contextCaret: contextCaret$1,
  guideBtnWrap,
  guideBtn,
  guideBtnPulse,
  guideBtnAck,
  guideDropdown,
  guideDropdownItem
};
const sidebar = "_sidebar_1vnit_1";
const title$8 = "_title_1vnit_15";
const nav = "_nav_1vnit_33";
const tab = "_tab_1vnit_45";
const tabLabel = "_tabLabel_1vnit_101";
const tabIcon = "_tabIcon_1vnit_117";
const crown = "_crown_1vnit_135";
const active$1 = "_active_1vnit_153";
const planBadge = "_planBadge_1vnit_179";
const planBadgePremium = "_planBadgePremium_1vnit_207";
const planBadgeFree = "_planBadgeFree_1vnit_221";
const planCrown = "_planCrown_1vnit_233";
const planLabel = "_planLabel_1vnit_249";
const planValue = "_planValue_1vnit_261";
const trialCard = "_trialCard_1vnit_271";
const trialCountdown = "_trialCountdown_1vnit_295";
const trialCta = "_trialCta_1vnit_315";
const publicLink = "_publicLink_1vnit_355";
const publicLinkTitle = "_publicLinkTitle_1vnit_367";
const publicLinkUrl = "_publicLinkUrl_1vnit_381";
const publicLinkRow = "_publicLinkRow_1vnit_425";
const copyIcon = "_copyIcon_1vnit_439";
const copyBtn = "_copyBtn_1vnit_455";
const copyHint = "_copyHint_1vnit_539";
const copyHintAction = "_copyHintAction_1vnit_559";
const copyHintText = "_copyHintText_1vnit_567";
const copyHintLink = "_copyHintLink_1vnit_575";
const contextBlock = "_contextBlock_1vnit_607";
const contextLabel = "_contextLabel_1vnit_627";
const selectShell = "_selectShell_1vnit_641";
const contextSelect = "_contextSelect_1vnit_677";
const contextCaret = "_contextCaret_1vnit_727";
const consentNudge = "_consentNudge_1vnit_753";
const consentNudgeText = "_consentNudgeText_1vnit_773";
const consentNudgeActions = "_consentNudgeActions_1vnit_791";
const consentBtnYes = "_consentBtnYes_1vnit_803";
const consentBtnNo = "_consentBtnNo_1vnit_867";
const styles$r = {
  sidebar,
  title: title$8,
  nav,
  tab,
  tabLabel,
  tabIcon,
  crown,
  active: active$1,
  planBadge,
  planBadgePremium,
  planBadgeFree,
  planCrown,
  planLabel,
  planValue,
  trialCard,
  trialCountdown,
  trialCta,
  publicLink,
  publicLinkTitle,
  publicLinkUrl,
  publicLinkRow,
  copyIcon,
  copyBtn,
  copyHint,
  copyHintAction,
  copyHintText,
  copyHintLink,
  contextBlock,
  contextLabel,
  selectShell,
  contextSelect,
  contextCaret,
  consentNudge,
  consentNudgeText,
  consentNudgeActions,
  consentBtnYes,
  consentBtnNo
};
const PANEL_TEMPLATES = "templates";
const PANEL_BUSINESS = "business";
const PANEL_CONTACT = "contact";
const PANEL_CONTENT = "content";
const PANEL_SERVICES = "services";
const PANEL_BUSINESS_HOURS = "businessHours";
const PANEL_HEAD = "head";
const PANEL_DESIGN = "design";
const PANEL_GALLERY = "gallery";
const PANEL_REVIEWS = "reviews";
const PANEL_FAQ = "faq";
const PANEL_SEO = "seo";
const PANEL_SETTINGS = "settings";
const PANEL_ANALYTICS = "analytics";
const PANEL_HELP = "help";
const EDITOR_CARD_TABS = Object.freeze([
  PANEL_TEMPLATES,
  PANEL_BUSINESS,
  PANEL_CONTACT,
  PANEL_CONTENT,
  PANEL_SERVICES,
  PANEL_BUSINESS_HOURS,
  PANEL_HEAD,
  PANEL_DESIGN,
  PANEL_GALLERY,
  PANEL_REVIEWS,
  PANEL_FAQ,
  PANEL_SEO,
  PANEL_SETTINGS,
  PANEL_ANALYTICS,
  PANEL_HELP
]);
const TABS = [
  { id: PANEL_TEMPLATES, label: "תבניות" },
  { id: PANEL_DESIGN, label: "עיצוב עצמי" },
  { id: PANEL_HEAD, label: "ראש הכרטיס" },
  { id: PANEL_BUSINESS, label: "פרטי העסק" },
  { id: PANEL_CONTACT, label: "פרטי קשר" },
  { id: PANEL_CONTENT, label: "תוכן" },
  { id: PANEL_SERVICES, label: "שירותים" },
  { id: PANEL_BUSINESS_HOURS, label: "שעות פעילות" },
  { id: PANEL_GALLERY, label: "גלריה" },
  { id: PANEL_REVIEWS, label: "ביקורות" },
  { id: PANEL_FAQ, label: "שאלות ותשובות" },
  { id: PANEL_SEO, label: "SEO וסקריפטים" },
  { id: PANEL_SETTINGS, label: "הגדרות" },
  { id: PANEL_ANALYTICS, label: "אנליטיקה" },
  { id: PANEL_HELP, label: "עזרה" }
];
const TAB_ICON = {
  [PANEL_TEMPLATES]: TemplatesIcon,
  [PANEL_DESIGN]: SelfDesignIcon,
  [PANEL_HEAD]: HeadIcon,
  [PANEL_BUSINESS]: BusinessIcon,
  [PANEL_CONTACT]: ContactIcon,
  [PANEL_CONTENT]: ContentIcon,
  [PANEL_SERVICES]: ServicesIcon,
  [PANEL_BUSINESS_HOURS]: WorkHoursIcon,
  [PANEL_GALLERY]: GalleryIcon,
  [PANEL_REVIEWS]: ReviewsIcon,
  [PANEL_FAQ]: FaqIcon,
  [PANEL_SEO]: SeoIcon,
  [PANEL_SETTINGS]: SettingsIcon,
  [PANEL_ANALYTICS]: AnalyticsIcon,
  [PANEL_HELP]: HelpIcon
};
function isPremiumTab(tabId, entitlements) {
  if (!entitlements) return false;
  if (tabId === "gallery") return entitlements.canUseGallery === false;
  if (tabId === "seo") return entitlements.canEditSeo === false;
  if (tabId === "settings") {
    return entitlements.canPublish === false || entitlements.canChangeSlug === false;
  }
  if (tabId === "analytics") {
    return entitlements.canUseAnalyticsPremium !== true;
  }
  if (tabId === PANEL_SERVICES) return !entitlements.canUseServices;
  if (tabId === PANEL_BUSINESS_HOURS)
    return !entitlements.canUseBusinessHours;
  return false;
}
function isHiddenTab() {
  return false;
}
function computeTrialDaysLeft(billingUntil) {
  if (!billingUntil) return null;
  const endMs = new Date(billingUntil).getTime();
  if (!Number.isFinite(endMs)) return null;
  const diff = endMs - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1e3));
}
function EditorSidebar({
  activeTab,
  onChangeTab,
  entitlements,
  isPremium,
  billingSource,
  billingUntil,
  publicUrl,
  publicPath,
  isPublished,
  activeOrgSlug,
  myOrgs,
  onContextChange,
  onLoadOrgs,
  showContextBar
}) {
  const isTrial = billingSource === "trial-premium";
  const trialDaysLeft = isTrial ? computeTrialDaysLeft(billingUntil) : null;
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);
  const canCopy = isPublished && Boolean(publicUrl);
  const handleCopy = useCallback(async () => {
    if (!canCopy) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = publicUrl;
        ta.setAttribute("readonly", "");
        ta.setAttribute("style", "position:fixed;left:-9999px");
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2e3);
    } catch {
      setCopied(false);
    }
  }, [canCopy, publicUrl]);
  const handleCopyHintSettingsLinkClick = (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey) return;
    if (event.ctrlKey) return;
    if (event.shiftKey) return;
    if (event.altKey) return;
    event.preventDefault();
    onChangeTab(PANEL_SETTINGS);
  };
  const [account, setAccount] = useState(null);
  const [mktBusy, setMktBusy] = useState(false);
  const accountFetched = useRef(false);
  useEffect(() => {
    if (accountFetched.current) return;
    accountFetched.current = true;
    getAccountSummary().then((data) => setAccount(data)).catch(() => {
    });
  }, []);
  const handleNudgeConsent = useCallback(
    async (value) => {
      if (mktBusy) return;
      setMktBusy(true);
      try {
        const data = await updateEmailPreferences({
          emailMarketingConsent: value,
          source: "editor_sidebar"
        });
        setAccount(
          (prev) => prev ? {
            ...prev,
            emailMarketingConsent: data?.emailMarketingConsent ?? value
          } : prev
        );
      } catch {
      } finally {
        setMktBusy(false);
      }
    },
    [mktBusy]
  );
  return /* @__PURE__ */ jsxs("aside", { className: styles$r.sidebar, children: [
    showContextBar ? /* @__PURE__ */ jsxs("div", { className: styles$r.contextBlock, dir: "rtl", children: [
      /* @__PURE__ */ jsx("div", { className: styles$r.contextLabel, children: "כרטיס" }),
      /* @__PURE__ */ jsxs("div", { className: styles$r.selectShell, children: [
        /* @__PURE__ */ jsxs(
          "select",
          {
            className: styles$r.contextSelect,
            value: activeOrgSlug || "",
            onFocus: onLoadOrgs,
            onMouseDown: onLoadOrgs,
            onChange: (e) => onContextChange(e.target.value),
            "aria-label": "הקשר כרטיס",
            children: [
              /* @__PURE__ */ jsx("option", { value: "", children: "אישי" }),
              (myOrgs || []).map((o) => /* @__PURE__ */ jsx(
                "option",
                {
                  value: String(o?.slug || ""),
                  children: String(o?.name || o?.slug || "")
                },
                String(o?.id || o?.slug || "")
              ))
            ]
          }
        ),
        myOrgs && myOrgs.length > 0 ? /* @__PURE__ */ jsx(
          "span",
          {
            className: styles$r.contextCaret,
            "aria-hidden": "true",
            children: "▾"
          }
        ) : null
      ] })
    ] }) : null,
    publicUrl ? /* @__PURE__ */ jsxs(
      "div",
      {
        className: styles$r.publicLink,
        dir: "rtl",
        "data-tour-id": "editor-mini-guide-public-link-block",
        children: [
          /* @__PURE__ */ jsx("div", { className: styles$r.publicLinkTitle, children: isPublished ? "קישור ציבורי" : "קישור עתידי" }),
          /* @__PURE__ */ jsx("div", { className: styles$r.publicLinkRow, children: isPublished ? /* @__PURE__ */ jsx(
            "a",
            {
              href: publicPath,
              target: "_blank",
              rel: "noreferrer",
              className: styles$r.publicLinkUrl,
              children: publicUrl
            }
          ) : /* @__PURE__ */ jsx("span", { className: styles$r.publicLinkUrl, children: publicUrl }) }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: styles$r.copyBtn,
              onClick: handleCopy,
              disabled: !canCopy,
              "aria-label": "העתק קישור",
              title: !canCopy ? "אפשר להעתיק קישור רק אחרי פרסום הכרטיס" : void 0,
              children: [
                /* @__PURE__ */ jsx(CopyIcon, { className: styles$r.copyIcon }),
                copied ? "הועתק!" : "העתק קישור"
              ]
            }
          ),
          !canCopy && /* @__PURE__ */ jsxs(
            "div",
            {
              className: `${styles$r.copyHint} ${styles$r.copyHintAction}`,
              children: [
                /* @__PURE__ */ jsx("span", { className: styles$r.copyHintText, children: "אפשר להעתיק קישור רק אחרי פרסום הכרטיס." }),
                " ",
                /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: "/edit/card/settings",
                    className: styles$r.copyHintLink,
                    "aria-label": "מעבר להגדרות פרסום הכרטיס",
                    onClick: handleCopyHintSettingsLinkClick,
                    children: "להגדרות"
                  }
                )
              ]
            }
          )
        ]
      }
    ) : /* @__PURE__ */ jsxs("div", { className: styles$r.publicLink, dir: "rtl", children: [
      /* @__PURE__ */ jsx("div", { className: styles$r.publicLinkTitle, children: "קישור ציבורי" }),
      /* @__PURE__ */ jsx("div", { className: styles$r.copyHint, children: "הקישור יופיע אחרי פרסום הכרטיס." })
    ] }),
    /* @__PURE__ */ jsx(
      "div",
      {
        className: `${styles$r.planBadge} ${isPremium ? styles$r.planBadgePremium : styles$r.planBadgeFree}`,
        dir: "rtl",
        children: isPremium ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(CrownIcon, { className: styles$r.planCrown }),
          /* @__PURE__ */ jsx("span", { className: styles$r.planLabel, children: "מסלול:" }),
          /* @__PURE__ */ jsx("span", { className: styles$r.planValue, children: isTrial ? "פרמיום ניסיון" : "פרמיום" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { className: styles$r.planLabel, children: "מסלול:" }),
          /* @__PURE__ */ jsx("span", { className: styles$r.planValue, children: "חינם" })
        ] })
      }
    ),
    isTrial && trialDaysLeft != null && /* @__PURE__ */ jsxs("div", { className: styles$r.trialCard, dir: "rtl", children: [
      /* @__PURE__ */ jsx("div", { className: styles$r.trialCountdown, children: trialDaysLeft > 1 ? `נותרו עוד ${trialDaysLeft} ימים לניסיון פרמיום` : trialDaysLeft === 1 ? "נותר עוד יום לניסיון פרמיום" : "נותר פחות מיום לניסיון פרמיום" }),
      /* @__PURE__ */ jsx("a", { href: "/pricing", className: styles$r.trialCta, children: "עבור למסלולים" })
    ] }),
    account !== null && account.emailMarketingConsent === null && isTrial && trialDaysLeft != null && trialDaysLeft > 0 && /* @__PURE__ */ jsxs("div", { className: styles$r.consentNudge, dir: "rtl", children: [
      /* @__PURE__ */ jsx("p", { className: styles$r.consentNudgeText, children: "רוצה לקבל תזכורות ועדכונים רלוונטיים על הניסיון והפרימיום?" }),
      /* @__PURE__ */ jsxs("div", { className: styles$r.consentNudgeActions, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$r.consentBtnYes,
            disabled: mktBusy,
            onClick: () => handleNudgeConsent(true),
            children: "כן, שלחו לי"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$r.consentBtnNo,
            disabled: mktBusy,
            onClick: () => handleNudgeConsent(false),
            children: "לא תודה"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: styles$r.title, children: "עריכת כרטיס" }),
    /* @__PURE__ */ jsx("nav", { className: styles$r.nav, children: TABS.filter((tab2) => !isHiddenTab(tab2.id)).map(
      (tab2) => {
        const premium = isPremiumTab(tab2.id, entitlements);
        const TabIcon = TAB_ICON[tab2.id];
        return /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: `${styles$r.tab} ${activeTab === tab2.id ? styles$r.active : ""}`,
            onClick: () => onChangeTab(tab2.id),
            "data-tour-id": tab2.id === "head" ? "editor-tour-tab-head" : tab2.id === "business" ? "editor-tour-tab-business" : tab2.id === "contact" ? "editor-tour-tab-contact" : tab2.id === "settings" ? "editor-mini-guide-tab-settings" : tab2.id === "seo" ? "editor-mini-guide-tab-seo" : tab2.id === "businessHours" ? "editor-mini-guide-tab-hours" : void 0,
            children: /* @__PURE__ */ jsxs("span", { className: styles$r.tabLabel, children: [
              TabIcon && /* @__PURE__ */ jsx(TabIcon, { className: styles$r.tabIcon }),
              tab2.label,
              premium ? /* @__PURE__ */ jsx(
                CrownIcon,
                {
                  className: styles$r.crown,
                  title: "רק לפרימיום"
                }
              ) : null
            ] })
          },
          tab2.id
        );
      }
    ) })
  ] });
}
const panel$1 = "_panel_plll0_1";
const header$5 = "_header_plll0_13";
const body$3 = "_body_plll0_31";
const styles$q = {
  panel: panel$1,
  header: header$5,
  body: body$3
};
function Panel({ title: title2, children }) {
  return /* @__PURE__ */ jsxs("section", { className: styles$q.panel, children: [
    /* @__PURE__ */ jsx("div", { className: styles$q.header, children: title2 }),
    /* @__PURE__ */ jsx("div", { className: styles$q.body, children })
  ] });
}
const BUSINESS_NAME_MAX = 60;
const BUSINESS_SUBTITLE_MAX = 80;
const BUSINESS_CITY_MAX = 40;
const BUSINESS_SLOGAN_MAX = 120;
function remaining$3(max, value) {
  const s = typeof value === "string" ? value : String(value || "");
  return Math.max(0, max - s.length);
}
function BusinessPanel({
  business = {},
  onFieldChange,
  editingDisabled = false
}) {
  const emit = (patch) => {
    if (!patch || typeof patch !== "object") return;
    onFieldChange?.("business", patch);
  };
  return /* @__PURE__ */ jsxs(Panel, { title: "פרטי העסק", children: [
    /* @__PURE__ */ jsx(
      Input,
      {
        label: "שם העסק",
        value: business.name || "",
        disabled: editingDisabled,
        onChange: (e) => emit({ name: e.target.value }),
        onBlur: (e) => emit({ name: e.target.value.trim() }),
        maxLength: BUSINESS_NAME_MAX,
        meta: `נשארו ${remaining$3(BUSINESS_NAME_MAX, business.name || "")} תווים`,
        "data-tour-id": "editor-tour-field-business-name"
      }
    ),
    /* @__PURE__ */ jsx(
      Input,
      {
        label: "תחום עיסוק",
        value: business.category || "",
        disabled: editingDisabled,
        onChange: (e) => emit({ category: e.target.value }),
        onBlur: (e) => emit({ category: e.target.value.trim() }),
        maxLength: BUSINESS_SUBTITLE_MAX,
        meta: `נשארו ${remaining$3(BUSINESS_SUBTITLE_MAX, business.category || "")} תווים`,
        "data-tour-id": "editor-tour-field-business-category"
      }
    ),
    /* @__PURE__ */ jsx(
      Input,
      {
        label: "עיר הפעילות",
        value: business.city || "",
        disabled: editingDisabled,
        onChange: (e) => emit({ city: e.target.value }),
        onBlur: (e) => emit({ city: e.target.value.trim() }),
        maxLength: BUSINESS_CITY_MAX,
        placeholder: "לדוגמה: תל אביב, חיפה, ירושלים",
        meta: `יעזור להציג את העסק בצורה מדויקת יותר בגוגל ובכרטיס. נשארו ${remaining$3(BUSINESS_CITY_MAX, business.city || "")} תווים`
      }
    ),
    /* @__PURE__ */ jsx(
      Input,
      {
        label: "סלוגן",
        value: business.slogan || "",
        disabled: editingDisabled,
        onChange: (e) => emit({ slogan: e.target.value }),
        onBlur: (e) => emit({ slogan: e.target.value.trim() }),
        maxLength: BUSINESS_SLOGAN_MAX,
        meta: `נשארו ${remaining$3(BUSINESS_SLOGAN_MAX, business.slogan || "")} תווים`
      }
    )
  ] });
}
const syncRow = "_syncRow_16wzl_1";
const syncLabel = "_syncLabel_16wzl_37";
const lockedBlock$6 = "_lockedBlock_16wzl_51";
const lockedTitle$6 = "_lockedTitle_16wzl_71";
const lockedText$6 = "_lockedText_16wzl_83";
const lockedCta$6 = "_lockedCta_16wzl_95";
const styles$p = {
  syncRow,
  syncLabel,
  lockedBlock: lockedBlock$6,
  lockedTitle: lockedTitle$6,
  lockedText: lockedText$6,
  lockedCta: lockedCta$6
};
const PHONE_MAX = 30;
const WHATSAPP_MAX = 20;
const EMAIL_MAX = 254;
const URL_MAX = 2048;
function remaining$2(max, value) {
  const s = typeof value === "string" ? value : String(value || "");
  return Math.max(0, max - s.length);
}
function ContactPanel({
  contact = {},
  onFieldChange,
  editingDisabled = false,
  entitlements,
  fieldErrors = {}
}) {
  const showPremiumFields = entitlements?.canUseServices !== false;
  const phone = contact.phone || "";
  const whatsapp = contact.whatsapp || "";
  const [whatsappLinked, setWhatsappLinked] = useState(
    () => !whatsapp || whatsapp === phone
  );
  const emit = (patch) => {
    if (!patch || typeof patch !== "object") return;
    onFieldChange?.("contact", patch);
  };
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    if (whatsappLinked) {
      emit({ phone: value, whatsapp: value });
    } else {
      emit({ phone: value });
    }
  };
  const handleLinkToggle = (e) => {
    const checked = e.target.checked;
    setWhatsappLinked(checked);
    if (checked) {
      emit({ whatsapp: phone });
    }
  };
  const activePhoneMax = whatsappLinked ? WHATSAPP_MAX : PHONE_MAX;
  return /* @__PURE__ */ jsxs(Panel, { title: "פרטי קשר", children: [
    /* @__PURE__ */ jsx(
      Input,
      {
        label: "טלפון",
        value: phone,
        disabled: editingDisabled,
        onChange: handlePhoneChange,
        maxLength: activePhoneMax,
        meta: `נשארו ${remaining$2(activePhoneMax, phone)} תווים`,
        error: fieldErrors["contact.phone"],
        dir: "ltr",
        inputMode: "tel",
        autoComplete: "tel",
        "data-tour-id": "editor-tour-field-contact-phone"
      }
    ),
    /* @__PURE__ */ jsxs("label", { className: styles$p.syncRow, children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "checkbox",
          checked: whatsappLinked,
          disabled: editingDisabled,
          onChange: handleLinkToggle
        }
      ),
      /* @__PURE__ */ jsx("span", { className: styles$p.syncLabel, children: "מספר הוואטסאפ זהה למספר הטלפון" })
    ] }),
    /* @__PURE__ */ jsx(
      Input,
      {
        label: "וואטסאפ",
        value: whatsapp,
        disabled: editingDisabled || whatsappLinked,
        onChange: (e) => emit({ whatsapp: e.target.value }),
        maxLength: WHATSAPP_MAX,
        error: fieldErrors["contact.whatsapp"],
        dir: "ltr",
        inputMode: "tel",
        autoComplete: "tel"
      }
    ),
    /* @__PURE__ */ jsx(
      Input,
      {
        label: "כתובת אימייל",
        type: "email",
        value: contact.email || "",
        disabled: editingDisabled,
        onChange: (e) => emit({ email: e.target.value }),
        maxLength: EMAIL_MAX,
        "data-tour-id": "editor-tour-field-contact-email",
        meta: `נשארו ${remaining$2(EMAIL_MAX, contact.email || "")} תווים`,
        error: fieldErrors["contact.email"]
      }
    ),
    /* @__PURE__ */ jsx(
      Input,
      {
        label: "אתר אינטרנט",
        value: contact.website || "",
        disabled: editingDisabled,
        onChange: (e) => emit({ website: e.target.value }),
        maxLength: URL_MAX,
        error: fieldErrors["contact.website"]
      }
    ),
    /* @__PURE__ */ jsx(
      Input,
      {
        label: "אינסטגרם",
        value: contact.instagram || "",
        disabled: editingDisabled,
        onChange: (e) => emit({ instagram: e.target.value }),
        maxLength: URL_MAX,
        error: fieldErrors["contact.instagram"]
      }
    ),
    showPremiumFields ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          label: "פייסבוק",
          value: contact.facebook || "",
          disabled: editingDisabled,
          onChange: (e) => emit({ facebook: e.target.value }),
          maxLength: URL_MAX,
          error: fieldErrors["contact.facebook"]
        }
      ),
      /* @__PURE__ */ jsx(
        Input,
        {
          label: "X (טוויטר)",
          value: contact.twitter || "",
          disabled: editingDisabled,
          onChange: (e) => emit({ twitter: e.target.value }),
          maxLength: URL_MAX,
          error: fieldErrors["contact.twitter"]
        }
      ),
      /* @__PURE__ */ jsx(
        Input,
        {
          label: "טיקטוק",
          value: contact.tiktok || "",
          disabled: editingDisabled,
          onChange: (e) => emit({ tiktok: e.target.value }),
          maxLength: URL_MAX,
          error: fieldErrors["contact.tiktok"]
        }
      ),
      /* @__PURE__ */ jsx(
        Input,
        {
          label: "קישור לניווט בווייז",
          value: contact.waze || "",
          disabled: editingDisabled,
          onChange: (e) => emit({ waze: e.target.value }),
          maxLength: URL_MAX,
          error: fieldErrors["contact.waze"]
        }
      )
    ] }) : /* @__PURE__ */ jsxs("div", { className: styles$p.lockedBlock, children: [
      /* @__PURE__ */ jsx("div", { className: styles$p.lockedTitle, children: "עוד דרכי קשר" }),
      /* @__PURE__ */ jsx("div", { className: styles$p.lockedText, children: "פייסבוק, X, טיקטוק וווייז זמינים במסלול פרימיום." }),
      /* @__PURE__ */ jsx("a", { href: "/pricing", className: styles$p.lockedCta, children: "שדרג לפרימיום" })
    ] })
  ] });
}
const aboutLabelTitle = "_aboutLabelTitle_ugk2l_1";
const aboutBlock = "_aboutBlock_ugk2l_9";
const aboutParagraph = "_aboutParagraph_ugk2l_21";
const paragraphBlock = "_paragraphBlock_ugk2l_29";
const paragraphCounter = "_paragraphCounter_ugk2l_41";
const paragraphActionRow = "_paragraphActionRow_ugk2l_53";
const fieldAiRow = "_fieldAiRow_ugk2l_67";
const fieldAiButton = "_fieldAiButton_ugk2l_81";
const aiLockedBlock$1 = "_aiLockedBlock_ugk2l_129";
const aiLockedTitle$1 = "_aiLockedTitle_ugk2l_149";
const aiLockedText$1 = "_aiLockedText_ugk2l_161";
const aiLockedCta$1 = "_aiLockedCta_ugk2l_173";
const deleteParagraphButton = "_deleteParagraphButton_ugk2l_211";
const aiReadinessHint$2 = "_aiReadinessHint_ugk2l_249";
const aiReadinessLink$1 = "_aiReadinessLink_ugk2l_261";
const aiStatusRow$1 = "_aiStatusRow_ugk2l_319";
const addParagraphButton = "_addParagraphButton_ugk2l_329";
const hint$6 = "_hint_ugk2l_371";
const aiBlock$2 = "_aiBlock_ugk2l_385";
const aiDisclosure$1 = "_aiDisclosure_ugk2l_405";
const aiError$2 = "_aiError_ugk2l_417";
const aiPreview$2 = "_aiPreview_ugk2l_435";
const aiPreviewTitle$1 = "_aiPreviewTitle_ugk2l_455";
const aiPreviewContent = "_aiPreviewContent_ugk2l_467";
const aiActions$2 = "_aiActions_ugk2l_497";
const consentOverlay$2 = "_consentOverlay_ugk2l_513";
const consentDialog$2 = "_consentDialog_ugk2l_535";
const consentTitle$2 = "_consentTitle_ugk2l_565";
const consentBody$2 = "_consentBody_ugk2l_579";
const consentActions$2 = "_consentActions_ugk2l_595";
const consentConfirm$2 = "_consentConfirm_ugk2l_609";
const consentCancel$2 = "_consentCancel_ugk2l_611";
const styles$o = {
  aboutLabelTitle,
  aboutBlock,
  aboutParagraph,
  paragraphBlock,
  paragraphCounter,
  paragraphActionRow,
  fieldAiRow,
  fieldAiButton,
  aiLockedBlock: aiLockedBlock$1,
  aiLockedTitle: aiLockedTitle$1,
  aiLockedText: aiLockedText$1,
  aiLockedCta: aiLockedCta$1,
  deleteParagraphButton,
  aiReadinessHint: aiReadinessHint$2,
  aiReadinessLink: aiReadinessLink$1,
  aiStatusRow: aiStatusRow$1,
  addParagraphButton,
  hint: hint$6,
  aiBlock: aiBlock$2,
  aiDisclosure: aiDisclosure$1,
  aiError: aiError$2,
  aiPreview: aiPreview$2,
  aiPreviewTitle: aiPreviewTitle$1,
  aiPreviewContent,
  aiActions: aiActions$2,
  consentOverlay: consentOverlay$2,
  consentDialog: consentDialog$2,
  consentTitle: consentTitle$2,
  consentBody: consentBody$2,
  consentActions: consentActions$2,
  consentConfirm: consentConfirm$2,
  consentCancel: consentCancel$2
};
async function suggestAbout(cardId, payload) {
  const res = await api.post(`/cards/${cardId}/ai/about-suggestion`, payload);
  return { suggestion: res.data?.suggestion, quota: res.data?.quota };
}
async function fetchAiQuota(cardId, feature = "ai_about_generation") {
  const res = await api.get(`/cards/${cardId}/ai/quota`, {
    params: { feature }
  });
  return res.data?.quota;
}
async function suggestSeo(cardId, payload) {
  const res = await api.post(`/cards/${cardId}/ai/seo-suggestion`, payload);
  return { suggestion: res.data?.suggestion, quota: res.data?.quota };
}
async function suggestFaq(cardId, payload) {
  const res = await api.post(`/cards/${cardId}/ai/faq-suggestion`, payload);
  return { suggestion: res.data?.suggestion, quota: res.data?.quota };
}
const quotaHint = "_quotaHint_ojxt4_1";
const styles$n = {
  quotaHint
};
function AiQuotaHint({ quota }) {
  if (!quota) return null;
  return /* @__PURE__ */ jsxs("span", { className: styles$n.quotaHint, children: [
    "נותרו ",
    quota.remaining,
    "/",
    quota.limit,
    " הצעות AI החודש"
  ] });
}
const ABOUT_TITLE_MAX = 300;
const ABOUT_PARAGRAPH_ITEM_MAX = 2e3;
function remaining$1(max, value) {
  const s = typeof value === "string" ? value : String(value || "");
  return Math.max(0, max - s.length);
}
const AI_ABOUT_CONSENT_KEY = "cardigo_ai_about_consent";
function hasAiAboutConsent() {
  try {
    return localStorage.getItem(AI_ABOUT_CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}
function saveAiAboutConsent() {
  try {
    localStorage.setItem(AI_ABOUT_CONSENT_KEY, "1");
  } catch {
  }
}
function mapAiError$1(err) {
  const code = err?.response?.data?.code;
  const status2 = err?.response?.status;
  if (status2 === 401) return "יש להתחבר מחדש כדי להשתמש בשירות זה.";
  if (code === "RATE_LIMITED")
    return "יותר מדי בקשות כרגע. נסה שוב בעוד מספר דקות.";
  if (code === "AI_PROVIDER_QUOTA")
    return "מכסת שירות ה-AI החיצוני מוצתה זמנית. נסה שוב מאוחר יותר.";
  if (code === "AI_MONTHLY_LIMIT_REACHED")
    return "מכסת ה-AI החודשית מוצתה. נסה שוב בחודש הבא.";
  if (code === "AI_DISABLED") return "שירות ה-AI אינו פעיל כרגע.";
  if (code === "AI_UNAVAILABLE")
    return "שירות ה-AI אינו זמין זמנית. נסה שוב.";
  if (code === "PREMIUM_REQUIRED")
    return "יצירת תוכן עם AI זמינה למנויי פרימיום בלבד.";
  if (code === "INVALID_SUGGESTION")
    return "ה-AI החזיר תוכן לא שמיש. נסה שוב.";
  if (code === "INVALID_TARGET" || code === "INVALID_PARAGRAPH_INDEX")
    return "בקשה שגויה. נסה שוב.";
  if (code === "AI_INSUFFICIENT_BUSINESS_CONTEXT")
    return "יש למלא שם עסק ותחום עיסוק לפני יצירת תוכן עם AI.";
  return "משהו השתבש. נסה שוב מאוחר יותר.";
}
function AiConsentModal({ open, onConfirm, onCancel }) {
  const titleId = useId();
  const bodyId = useId();
  const confirmRef = useRef(null);
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, open);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmRef.current?.focus?.(), 0);
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: dialogRef,
      className: styles$o.consentOverlay,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      "aria-describedby": bodyId,
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) onCancel?.();
      },
      children: /* @__PURE__ */ jsxs("div", { className: styles$o.consentDialog, dir: "rtl", children: [
        /* @__PURE__ */ jsx("h2", { id: titleId, className: styles$o.consentTitle, children: "הצעת תוכן באמצעות AI" }),
        /* @__PURE__ */ jsx("p", { id: bodyId, className: styles$o.consentBody, children: "ההצעה נוצרת באמצעות שירות בינה מלאכותית חיצוני. המידע העסקי מהכרטיס שלך ישמש ליצירת הטקסט. התוכן המוצע הוא המלצה בלבד - תוכל לערוך או לדחות אותו לפני שמירה." }),
        /* @__PURE__ */ jsxs("div", { className: styles$o.consentActions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              ref: confirmRef,
              type: "button",
              className: styles$o.consentConfirm,
              onClick: onConfirm,
              children: "המשך"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$o.consentCancel,
              onClick: onCancel,
              children: "ביטול"
            }
          )
        ] })
      ] })
    }
  );
}
function ContentPanel({
  content: content2 = {},
  cardId,
  onChange,
  business = {},
  onNavigateTab,
  entitlements,
  plan
}) {
  const maxParagraphs = entitlements?.maxContentParagraphs ?? 3;
  const canUseVideo = entitlements?.canUseVideo !== false;
  const aiLocked = plan === "free";
  const aboutParagraphsRaw = Array.isArray(content2.aboutParagraphs) && content2.aboutParagraphs.length ? content2.aboutParagraphs : typeof content2.aboutText === "string" && content2.aboutText.trim() ? content2.aboutText.split(/\n\s*\n/) : [""];
  const aboutParagraphs = aboutParagraphsRaw.slice(0, maxParagraphs).map((v) => typeof v === "string" ? v : "");
  function commitAboutParagraphs(nextParagraphs) {
    const safe = Array.isArray(nextParagraphs) ? nextParagraphs.slice(0, maxParagraphs) : [""];
    onChange({
      aboutParagraphs: safe,
      // Legacy bridge (tolerant writer). Backend will normalize/filter empties.
      aboutText: safe.join("\n\n")
    });
  }
  const [aiQuota, setAiQuota] = useState(null);
  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    fetchAiQuota(cardId).then((q) => {
      if (!cancelled) setAiQuota(q);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [cardId]);
  const [aiState, setAiState] = useState("idle");
  const [aiTarget, setAiTarget] = useState(null);
  const [aiParagraphIndex, setAiParagraphIndex] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiError2, setAiError] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [pendingTarget, setPendingTarget] = useState(null);
  const [pendingParagraphIndex, setPendingParagraphIndex] = useState(null);
  const hasExistingAbout = Boolean(content2.aboutTitle?.trim()) || Array.isArray(content2.aboutParagraphs) && content2.aboutParagraphs.some(
    (p) => typeof p === "string" && p.trim()
  );
  const quotaExhausted = aiQuota && aiQuota.remaining <= 0;
  const aiReady = Boolean(business?.name?.trim()) && Boolean(business?.category?.trim());
  const hasTitleFilled = Boolean(content2.aboutTitle?.trim());
  const hasParagraphsFilled = Array.isArray(content2.aboutParagraphs) && content2.aboutParagraphs.some((p) => typeof p === "string" && p.trim());
  const bulkEligible = !hasTitleFilled && !hasParagraphsFilled;
  const requestSuggestion = useCallback(
    async (target, paragraphIndex) => {
      if (!cardId) return;
      setAiState("loading");
      setAiTarget(target);
      setAiParagraphIndex(target === "paragraph" ? paragraphIndex : null);
      setAiError("");
      setAiSuggestion(null);
      try {
        const mode = hasExistingAbout ? "improve" : "create";
        const payload = { mode, language: "he", target };
        if (target === "paragraph") {
          payload.paragraphIndex = paragraphIndex;
        }
        const { suggestion, quota } = await suggestAbout(
          cardId,
          payload
        );
        setAiSuggestion(suggestion);
        setAiState("preview");
        if (quota) setAiQuota(quota);
      } catch (err) {
        setAiError(mapAiError$1(err));
        setAiState("error");
        const errQuota = err?.response?.data?.quota;
        if (errQuota) setAiQuota(errQuota);
      }
    },
    [cardId, hasExistingAbout]
  );
  const handleAiClick = useCallback(
    (target, paragraphIndex) => {
      if (hasAiAboutConsent()) {
        requestSuggestion(target, paragraphIndex);
      } else {
        setPendingTarget(target);
        setPendingParagraphIndex(paragraphIndex);
        setShowConsent(true);
      }
    },
    [requestSuggestion]
  );
  const handleConsentConfirm = useCallback(() => {
    saveAiAboutConsent();
    setShowConsent(false);
    requestSuggestion(pendingTarget ?? "full", pendingParagraphIndex);
  }, [requestSuggestion, pendingTarget, pendingParagraphIndex]);
  const handleConsentCancel = useCallback(() => {
    setShowConsent(false);
    setPendingTarget(null);
    setPendingParagraphIndex(null);
  }, []);
  const handleApply = useCallback(() => {
    if (!aiSuggestion) return;
    if (aiTarget === "title") {
      onChange({ aboutTitle: aiSuggestion.aboutTitle || "" });
    } else if (aiTarget === "paragraph" && aiParagraphIndex != null) {
      const next = aboutParagraphs.slice();
      next[aiParagraphIndex] = aiSuggestion.aboutParagraph || "";
      commitAboutParagraphs(next);
    } else {
      const title2 = aiSuggestion.aboutTitle || "";
      const paras = Array.isArray(aiSuggestion.aboutParagraphs) ? aiSuggestion.aboutParagraphs.slice(0, maxParagraphs) : [];
      onChange({ aboutTitle: title2 });
      commitAboutParagraphs(paras.length ? paras : [""]);
    }
    setAiSuggestion(null);
    setAiTarget(null);
    setAiParagraphIndex(null);
    setAiState("idle");
  }, [aiSuggestion, aiTarget, aiParagraphIndex, aboutParagraphs, onChange]);
  const handleDismiss = useCallback(() => {
    setAiSuggestion(null);
    setAiTarget(null);
    setAiParagraphIndex(null);
    setAiState("idle");
    setAiError("");
  }, []);
  const handleDeleteParagraph = useCallback(
    (index) => {
      const next = aboutParagraphs.filter((_, i) => i !== index);
      commitAboutParagraphs(next.length ? next : [""]);
      if (aiTarget === "paragraph" && aiParagraphIndex === index) {
        handleDismiss();
      } else if (aiTarget === "paragraph" && aiParagraphIndex != null && aiParagraphIndex > index) {
        setAiParagraphIndex(aiParagraphIndex - 1);
      }
    },
    [aboutParagraphs, aiTarget, aiParagraphIndex, handleDismiss]
  );
  function renderPreviewContent() {
    if (!aiSuggestion) return null;
    if (aiTarget === "title") {
      return /* @__PURE__ */ jsx("strong", { children: aiSuggestion.aboutTitle });
    }
    if (aiTarget === "paragraph") {
      return /* @__PURE__ */ jsx("p", { children: aiSuggestion.aboutParagraph });
    }
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      aiSuggestion.aboutTitle && /* @__PURE__ */ jsx("strong", { children: aiSuggestion.aboutTitle }),
      Array.isArray(aiSuggestion.aboutParagraphs) && aiSuggestion.aboutParagraphs.map((p, i) => /* @__PURE__ */ jsx("p", { children: p }, i))
    ] });
  }
  function renderPreviewLabel() {
    if (aiTarget === "title") return "הצעת AI - כותרת";
    if (aiTarget === "paragraph")
      return `הצעת AI - פסקה ${(aiParagraphIndex ?? 0) + 1}`;
    return "הצעת AI - בלוק מלא";
  }
  function renderAiPreview() {
    if (aiState !== "preview" || !aiSuggestion) return null;
    return /* @__PURE__ */ jsxs("div", { className: styles$o.aiPreview, children: [
      /* @__PURE__ */ jsx("div", { className: styles$o.aiPreviewTitle, children: renderPreviewLabel() }),
      /* @__PURE__ */ jsx("div", { className: styles$o.aiPreviewContent, children: renderPreviewContent() }),
      /* @__PURE__ */ jsxs("div", { className: styles$o.aiActions, children: [
        /* @__PURE__ */ jsx(Button, { variant: "primary", onClick: handleApply, children: "החל הצעה" }),
        /* @__PURE__ */ jsx(Button, { variant: "secondary", onClick: handleDismiss, children: "דחה" })
      ] })
    ] });
  }
  function renderAiStatus() {
    if (aiState === "loading") {
      return /* @__PURE__ */ jsx("div", { className: styles$o.aiStatusRow, children: /* @__PURE__ */ jsx(Button, { variant: "secondary", loading: true, disabled: true, children: "יוצר הצעה…" }) });
    }
    if (aiState === "error") {
      return /* @__PURE__ */ jsxs("div", { className: styles$o.aiError, children: [
        aiError2,
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            onClick: () => handleAiClick(aiTarget ?? "full", aiParagraphIndex),
            children: "נסה שוב"
          }
        )
      ] });
    }
    return null;
  }
  return /* @__PURE__ */ jsxs(Panel, { title: "תוכן", children: [
    /* @__PURE__ */ jsx(
      Input,
      {
        label: "כותרת אודות",
        value: content2.aboutTitle || "",
        onChange: (e) => onChange({ aboutTitle: e.target.value }),
        maxLength: ABOUT_TITLE_MAX,
        meta: `נשארו ${remaining$1(ABOUT_TITLE_MAX, content2.aboutTitle || "")} תווים`
      }
    ),
    cardId && !aiLocked && !aiReady && /* @__PURE__ */ jsxs("span", { className: styles$o.aiReadinessHint, children: [
      "כדי לקבל הצעת תוכן מדויקת,",
      " ",
      onNavigateTab ? /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$o.aiReadinessLink,
          onClick: () => onNavigateTab("business"),
          children: "מלאו קודם את שם העסק ותחום העיסוק"
        }
      ) : /* @__PURE__ */ jsx(Fragment, { children: "מלאו קודם את שם העסק ותחום העיסוק" })
    ] }),
    cardId && !aiLocked && /* @__PURE__ */ jsxs("div", { className: styles$o.fieldAiRow, children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$o.fieldAiButton,
          disabled: !aiReady || quotaExhausted || aiState === "loading",
          onClick: () => handleAiClick("title"),
          children: "✦ הצע כותרת עם AI"
        }
      ),
      /* @__PURE__ */ jsx(AiQuotaHint, { quota: aiQuota })
    ] }),
    aiTarget === "title" && renderAiStatus(),
    aiTarget === "title" && renderAiPreview(),
    /* @__PURE__ */ jsxs("div", { className: styles$o.aboutBlock, children: [
      /* @__PURE__ */ jsx("div", { className: styles$o.aboutLabelTitle, children: "טקסט אודות" }),
      aboutParagraphs.map((value, index) => /* @__PURE__ */ jsxs("div", { className: styles$o.paragraphBlock, children: [
        /* @__PURE__ */ jsx("label", { className: styles$o.aboutParagraph, children: /* @__PURE__ */ jsx(
          "textarea",
          {
            rows: 5,
            value,
            onChange: (e) => {
              const next = aboutParagraphs.slice();
              next[index] = e.target.value;
              commitAboutParagraphs(next);
            },
            className: formStyles.textarea,
            maxLength: ABOUT_PARAGRAPH_ITEM_MAX
          }
        ) }),
        /* @__PURE__ */ jsx("span", { className: styles$o.paragraphCounter, children: `נשארו ${remaining$1(ABOUT_PARAGRAPH_ITEM_MAX, value)} תווים` }),
        cardId && /* @__PURE__ */ jsxs("div", { className: styles$o.paragraphActionRow, children: [
          !aiLocked && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$o.fieldAiButton,
              disabled: !aiReady || quotaExhausted || aiState === "loading",
              onClick: () => handleAiClick("paragraph", index),
              children: "✦ הצע פסקה עם AI"
            }
          ),
          aboutParagraphs.length > 1 && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$o.deleteParagraphButton,
              onClick: () => handleDeleteParagraph(index),
              children: "מחק פסקה"
            }
          ),
          !aiLocked && /* @__PURE__ */ jsx(AiQuotaHint, { quota: aiQuota })
        ] }),
        aiTarget === "paragraph" && aiParagraphIndex === index && renderAiStatus(),
        aiTarget === "paragraph" && aiParagraphIndex === index && renderAiPreview()
      ] }, index)),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$o.addParagraphButton,
          onClick: () => {
            if (aboutParagraphs.length >= maxParagraphs) return;
            commitAboutParagraphs([...aboutParagraphs, ""]);
          },
          disabled: aboutParagraphs.length >= maxParagraphs,
          children: "+ הוסף פסקה חדשה"
        }
      ),
      maxParagraphs <= 1 && /* @__PURE__ */ jsx("div", { className: styles$o.hint, children: "הוספת פסקאות נוספות זמינה במסלול פרמיום" })
    ] }),
    cardId && aiLocked && /* @__PURE__ */ jsxs("div", { className: styles$o.aiLockedBlock, children: [
      /* @__PURE__ */ jsx("div", { className: styles$o.aiLockedTitle, children: "✦ יצירת תוכן עם AI" }),
      /* @__PURE__ */ jsx("div", { className: styles$o.aiLockedText, children: "יצירת תוכן באמצעות AI זמינה למנויי פרימיום בלבד." }),
      /* @__PURE__ */ jsx("a", { href: "/pricing", className: styles$o.aiLockedCta, children: "שדרג לפרימיום" })
    ] }),
    cardId && !aiLocked && (bulkEligible || aiTarget === "full") && /* @__PURE__ */ jsxs("div", { className: styles$o.aiBlock, children: [
      bulkEligible && aiTarget !== "full" && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: styles$o.aiDisclosure, children: "✦ ניתן לייצר את כל בלוק האודות בבת אחת" }),
        /* @__PURE__ */ jsxs("div", { className: styles$o.fieldAiRow, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              disabled: !aiReady || quotaExhausted || aiState === "loading",
              onClick: () => handleAiClick("full"),
              children: "הצע בלוק אודות מלא עם AI"
            }
          ),
          /* @__PURE__ */ jsx(AiQuotaHint, { quota: aiQuota })
        ] })
      ] }),
      aiTarget === "full" && renderAiStatus(),
      aiTarget === "full" && renderAiPreview()
    ] }),
    /* @__PURE__ */ jsx(
      AiConsentModal,
      {
        open: showConsent,
        onConfirm: handleConsentConfirm,
        onCancel: handleConsentCancel
      }
    ),
    canUseVideo && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          label: "קישור לסרטון YouTube",
          value: content2.videoUrl || "",
          onChange: (e) => onChange({ videoUrl: e.target.value }),
          placeholder: "https://www.youtube.com/..."
        }
      ),
      /* @__PURE__ */ jsx("div", { className: styles$o.hint, children: "Paste a YouTube link" })
    ] })
  ] });
}
const root$7 = "_root_ug4j3_1";
const block = "_block_ug4j3_15";
const list$1 = "_list_ug4j3_29";
const itemBlock = "_itemBlock_ug4j3_43";
const itemActionRow = "_itemActionRow_ug4j3_57";
const removeButton = "_removeButton_ug4j3_71";
const addButton$1 = "_addButton_ug4j3_119";
const hint$5 = "_hint_ug4j3_167";
const addRow$1 = "_addRow_ug4j3_179";
const counter = "_counter_ug4j3_195";
const lockedBlock$5 = "_lockedBlock_ug4j3_209";
const lockedTitle$5 = "_lockedTitle_ug4j3_229";
const lockedText$5 = "_lockedText_ug4j3_241";
const lockedCta$5 = "_lockedCta_ug4j3_253";
const overLimitWarning = "_overLimitWarning_ug4j3_291";
const styles$m = {
  root: root$7,
  block,
  list: list$1,
  itemBlock,
  itemActionRow,
  removeButton,
  addButton: addButton$1,
  hint: hint$5,
  addRow: addRow$1,
  counter,
  lockedBlock: lockedBlock$5,
  lockedTitle: lockedTitle$5,
  lockedText: lockedText$5,
  lockedCta: lockedCta$5,
  overLimitWarning
};
const SERVICES_MAX = 10;
const SERVICES_TITLE_MAX = 120;
const SERVICES_ITEM_MAX = 120;
function remaining(max, value) {
  const s = typeof value === "string" ? value : String(value || "");
  return Math.max(0, max - s.length);
}
function normalizeServices(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { title: "", items: [""] };
  }
  const title2 = typeof value.title === "string" ? value.title : "";
  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items2 = rawItems.map((v) => typeof v === "string" ? v : "").filter((v) => v !== null && v !== void 0);
  return {
    title: title2,
    items: items2.length ? items2 : [""]
  };
}
function cleanItems(items2) {
  const arr = Array.isArray(items2) ? items2 : [];
  return arr.map((v) => typeof v === "string" ? v : "").map((v) => v.replace(/\s+/g, " ")).map((v) => v.trim());
}
function buildCommittedServices(title2, items2) {
  const nextTitle = typeof title2 === "string" ? title2 : "";
  const normalizedTitle = nextTitle.trim();
  const cleanedItems = cleanItems(items2).filter(Boolean);
  if (!normalizedTitle && cleanedItems.length === 0) {
    return null;
  }
  return {
    title: normalizedTitle || null,
    items: cleanedItems
  };
}
function serializeCommittedServices(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "null";
  }
  return JSON.stringify(buildCommittedServices(value.title, value.items));
}
function ServicesPanel({
  services,
  disabled,
  onChange,
  entitlements
}) {
  const normalized = normalizeServices(services);
  const [draftTitle, setDraftTitle] = useState(() => normalized.title);
  const [draftItems, setDraftItems] = useState(() => normalized.items);
  const lastCommittedSignatureRef = useRef(
    serializeCommittedServices(services)
  );
  useEffect(() => {
    const nextSignature = serializeCommittedServices(services);
    if (nextSignature === lastCommittedSignatureRef.current) return;
    lastCommittedSignatureRef.current = nextSignature;
    const nextNormalized = normalizeServices(services);
    setDraftTitle(nextNormalized.title);
    setDraftItems(nextNormalized.items);
  }, [services]);
  if (entitlements && !entitlements.canUseServices) {
    return /* @__PURE__ */ jsx(Panel, { title: "שירותים", children: /* @__PURE__ */ jsxs("div", { className: styles$m.lockedBlock, children: [
      /* @__PURE__ */ jsx("div", { className: styles$m.lockedTitle, children: "שירותים" }),
      /* @__PURE__ */ jsx("div", { className: styles$m.lockedText, children: "כדי להשתמש בשירותים צריך מנוי פרימיום." }),
      /* @__PURE__ */ jsx("a", { href: "/pricing", className: styles$m.lockedCta, children: "שדרג לפרימיום" })
    ] }) });
  }
  function commit(nextTitle, nextItems) {
    const committed = buildCommittedServices(nextTitle, nextItems);
    const nextSignature = JSON.stringify(committed);
    if (nextSignature === serializeCommittedServices(services)) {
      return;
    }
    lastCommittedSignatureRef.current = nextSignature;
    onChange?.({ services: committed });
  }
  function setTitle(nextTitle) {
    setDraftTitle(nextTitle);
    commit(nextTitle, draftItems);
  }
  function setItem(index, value) {
    const next = draftItems.slice();
    next[index] = value;
    setDraftItems(next);
    commit(draftTitle, next);
  }
  function addItem() {
    if (draftItems.length >= SERVICES_MAX) return;
    setDraftItems((prev) => [...prev, ""]);
  }
  function removeItem(index) {
    const next = draftItems.filter((_, i) => i !== index);
    const safeNext = next.length ? next : [""];
    setDraftItems(safeNext);
    commit(draftTitle, safeNext);
  }
  const rowCount = draftItems.length;
  const remainingSlots = Math.max(0, SERVICES_MAX - rowCount);
  const isOverLimit = rowCount > SERVICES_MAX;
  const overflowCount = Math.max(0, rowCount - SERVICES_MAX);
  return /* @__PURE__ */ jsx(Panel, { title: "שירותים", children: /* @__PURE__ */ jsxs("div", { className: styles$m.root, dir: "rtl", children: [
    /* @__PURE__ */ jsx("div", { className: styles$m.block, children: /* @__PURE__ */ jsx(
      Input,
      {
        label: "כותרת (אופציונלי)",
        value: draftTitle,
        disabled,
        placeholder: "לדוגמה: שירותים",
        onChange: (e) => setTitle(e.target.value),
        maxLength: SERVICES_TITLE_MAX,
        meta: `נשארו ${remaining(SERVICES_TITLE_MAX, draftTitle)} תווים`
      }
    ) }),
    /* @__PURE__ */ jsxs("div", { className: styles$m.block, children: [
      /* @__PURE__ */ jsx("div", { className: styles$m.list, children: draftItems.map((value, index) => {
        const key = `service-${index}`;
        const canRemove = draftItems.length > 1;
        return /* @__PURE__ */ jsxs("div", { className: styles$m.itemBlock, children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              value,
              disabled,
              placeholder: "הקלד/י שירות",
              onChange: (e) => setItem(index, e.target.value),
              maxLength: SERVICES_ITEM_MAX,
              meta: `נשארו ${remaining(SERVICES_ITEM_MAX, value)} תווים`
            }
          ),
          canRemove && /* @__PURE__ */ jsx("div", { className: styles$m.itemActionRow, children: /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$m.removeButton,
              disabled,
              onClick: () => removeItem(index),
              children: "הסר"
            }
          ) })
        ] }, key);
      }) }),
      isOverLimit && /* @__PURE__ */ jsxs("div", { className: styles$m.overLimitWarning, children: [
        "המגבלה עודכנה ל-",
        SERVICES_MAX,
        " שירותים. יש להסיר",
        " ",
        overflowCount,
        " ",
        overflowCount === 1 ? "שירות" : "שירותים",
        " לפני שמירה."
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$m.addRow, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$m.addButton,
            disabled: disabled || rowCount >= SERVICES_MAX,
            onClick: addItem,
            children: "+ הוסף שירות"
          }
        ),
        /* @__PURE__ */ jsxs("span", { className: styles$m.counter, children: [
          "נותרו ",
          remainingSlots,
          "/",
          SERVICES_MAX
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$m.hint, children: "כדי להסתיר את הסקשן בכרטיס הציבורי, מחק/י את כל הפריטים. רק שירותים מלאים נשמרים." })
    ] })
  ] }) });
}
const root$6 = "_root_cheog_5";
const section$5 = "_section_cheog_21";
const sectionTitle$3 = "_sectionTitle_cheog_39";
const headerRow$1 = "_headerRow_cheog_69";
const switchLabel = "_switchLabel_cheog_97";
const hint$4 = "_hint_cheog_105";
const lockedBlock$4 = "_lockedBlock_cheog_121";
const lockedTitle$4 = "_lockedTitle_cheog_141";
const lockedText$4 = "_lockedText_cheog_153";
const dayCard = "_dayCard_cheog_169";
const dayRow = "_dayRow_cheog_189";
const dayLabel = "_dayLabel_cheog_205";
const openToggle = "_openToggle_cheog_215";
const openToggleLabel = "_openToggleLabel_cheog_279";
const addBtn = "_addBtn_cheog_287";
const intervals = "_intervals_cheog_317";
const intervalRow = "_intervalRow_cheog_329";
const selectWrap$1 = "_selectWrap_cheog_343";
const selectLabel = "_selectLabel_cheog_359";
const pickerBtn = "_pickerBtn_cheog_369";
const pickerValue = "_pickerValue_cheog_425";
const pickerChevron = "_pickerChevron_cheog_437";
const pickerPopover = "_pickerPopover_cheog_457";
const pickerList = "_pickerList_cheog_481";
const pickerOption = "_pickerOption_cheog_497";
const removeBtn = "_removeBtn_cheog_553";
const emptyDayHint = "_emptyDayHint_cheog_579";
const lockedCta$4 = "_lockedCta_cheog_653";
const styles$l = {
  root: root$6,
  section: section$5,
  sectionTitle: sectionTitle$3,
  headerRow: headerRow$1,
  "switch": "_switch_cheog_83",
  switchLabel,
  hint: hint$4,
  lockedBlock: lockedBlock$4,
  lockedTitle: lockedTitle$4,
  lockedText: lockedText$4,
  dayCard,
  dayRow,
  dayLabel,
  openToggle,
  openToggleLabel,
  addBtn,
  intervals,
  intervalRow,
  selectWrap: selectWrap$1,
  selectLabel,
  pickerBtn,
  pickerValue,
  pickerChevron,
  pickerPopover,
  pickerList,
  pickerOption,
  removeBtn,
  emptyDayHint,
  lockedCta: lockedCta$4
};
const WEEKDAYS = [
  { key: "sun", label: "ראשון" },
  { key: "mon", label: "שני" },
  { key: "tue", label: "שלישי" },
  { key: "wed", label: "רביעי" },
  { key: "thu", label: "חמישי" },
  { key: "fri", label: "שישי" },
  { key: "sat", label: "שבת" }
];
function buildTimeOptions30m() {
  const out = [];
  for (let hh = 0; hh < 24; hh += 1) {
    for (const mm of ["00", "30"]) {
      const label2 = `${String(hh).padStart(2, "0")}:${mm}`;
      out.push(label2);
    }
  }
  return out;
}
function defaultDay() {
  return { open: false, intervals: [] };
}
function defaultWeek() {
  return {
    sun: defaultDay(),
    mon: defaultDay(),
    tue: defaultDay(),
    wed: defaultDay(),
    thu: defaultDay(),
    fri: defaultDay(),
    sat: defaultDay()
  };
}
function coerceInterval(raw) {
  const start = typeof raw?.start === "string" ? raw.start : "";
  const end = typeof raw?.end === "string" ? raw.end : "";
  return { start, end };
}
function coerceDay(raw) {
  const open = raw?.open === true;
  const intervalsRaw = Array.isArray(raw?.intervals) ? raw.intervals : [];
  const intervals2 = intervalsRaw.map(coerceInterval).slice(0, 4);
  return { open, intervals: intervals2 };
}
function coerceBusinessHours(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { v: 1, enabled: false, week: defaultWeek() };
  }
  const enabled = raw.enabled === true;
  const weekRaw = raw.week && typeof raw.week === "object" ? raw.week : null;
  const week = {
    sun: coerceDay(weekRaw?.sun),
    mon: coerceDay(weekRaw?.mon),
    tue: coerceDay(weekRaw?.tue),
    wed: coerceDay(weekRaw?.wed),
    thu: coerceDay(weekRaw?.thu),
    fri: coerceDay(weekRaw?.fri),
    sat: coerceDay(weekRaw?.sat)
  };
  return {
    v: 1,
    enabled,
    week
  };
}
function toMinutes(hhmm) {
  if (typeof hhmm !== "string") return null;
  const m = /^([01]\d|2[0-3]):(00|30)$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
function isValidInterval(interval) {
  const startM = toMinutes(interval?.start);
  const endM = toMinutes(interval?.end);
  if (startM === null || endM === null) return false;
  return startM < endM;
}
function useOnClickOutside(ref, handler, when = true) {
  useEffect(() => {
    if (!when) return;
    function onPointerDown(e) {
      const el = ref?.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      handler?.(e);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [ref, handler, when]);
}
function TimeListbox({ label: label2, value, options, onChange, disabled, invalid }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  useOnClickOutside(
    rootRef,
    () => {
      setOpen(false);
    },
    open
  );
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus?.();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);
  const selectedLabel = typeof value === "string" && value.length ? value : "בחר";
  return /* @__PURE__ */ jsxs("div", { className: styles$l.selectWrap, ref: rootRef, children: [
    /* @__PURE__ */ jsx("div", { className: styles$l.selectLabel, children: label2 }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        ref: buttonRef,
        type: "button",
        className: styles$l.pickerBtn,
        "aria-haspopup": "listbox",
        "aria-expanded": open,
        disabled,
        "data-invalid": invalid ? "1" : "0",
        onClick: () => setOpen((v) => !v),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$l.pickerValue, children: selectedLabel }),
          /* @__PURE__ */ jsx("span", { className: styles$l.pickerChevron, "aria-hidden": "true" })
        ]
      }
    ),
    open ? /* @__PURE__ */ jsx("div", { className: styles$l.pickerPopover, role: "listbox", children: /* @__PURE__ */ jsx("div", { className: styles$l.pickerList, children: options.map((t) => {
      const selected2 = t === value;
      return /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          role: "option",
          "aria-selected": selected2,
          className: styles$l.pickerOption,
          "data-selected": selected2 ? "1" : "0",
          onClick: () => {
            onChange?.(t);
            setOpen(false);
            buttonRef.current?.focus?.();
          },
          children: t
        },
        t
      );
    }) }) }) : null
  ] });
}
const BOOKING_HORIZON_OPTIONS = [
  { value: 7, label: "שבוע" },
  { value: 14, label: "שבועיים" },
  { value: 30, label: "חודש" },
  { value: 60, label: "חודשיים" }
];
const BOOKING_HORIZON_DEFAULT = 14;
function BusinessHoursPanel({
  value,
  disabled,
  onChange,
  bookingSettings,
  canUseBooking,
  onBookingChange,
  entitlements
}) {
  const bh = useMemo(() => coerceBusinessHours(value), [value]);
  const timeOptions = useMemo(() => buildTimeOptions30m(), []);
  if (entitlements && !entitlements.canUseBusinessHours) {
    return /* @__PURE__ */ jsx(Panel, { title: "שעות פעילות", children: /* @__PURE__ */ jsxs("div", { className: styles$l.lockedBlock, children: [
      /* @__PURE__ */ jsx("div", { className: styles$l.lockedTitle, children: "שעות פעילות" }),
      /* @__PURE__ */ jsx("div", { className: styles$l.lockedText, children: "כדי להשתמש בשעות פעילות צריך מנוי פרימיום." }),
      /* @__PURE__ */ jsx("a", { href: "/pricing", className: styles$l.lockedCta, children: "שדרג לפרימיום" })
    ] }) });
  }
  const bookingEnabled = bookingSettings != null && typeof bookingSettings === "object" && bookingSettings.enabled === true;
  const safeBookingSettings = bookingSettings != null && typeof bookingSettings === "object" ? bookingSettings : {};
  const effectiveHorizonDays = BOOKING_HORIZON_OPTIONS.some(
    (option) => option.value === Number(bookingSettings?.horizonDays)
  ) ? Number(bookingSettings.horizonDays) : BOOKING_HORIZON_DEFAULT;
  function commit(next) {
    onChange?.(next);
  }
  function setEnabled(nextEnabled) {
    commit({ ...bh, enabled: nextEnabled === true });
  }
  function setDayOpen(dayKey, nextOpen) {
    const nextWeek = {
      ...bh.week,
      [dayKey]: { ...bh.week[dayKey], open: nextOpen === true }
    };
    commit({ ...bh, week: nextWeek });
  }
  function setIntervalField(dayKey, index, field2, nextValue) {
    const day = bh.week[dayKey] || defaultDay();
    const nextIntervals = (Array.isArray(day.intervals) ? day.intervals : []).slice();
    const prev = nextIntervals[index] || { start: "", end: "" };
    nextIntervals[index] = { ...prev, [field2]: String(nextValue || "") };
    const nextDay = { ...day, intervals: nextIntervals.slice(0, 4) };
    const nextWeek = { ...bh.week, [dayKey]: nextDay };
    commit({ ...bh, week: nextWeek });
  }
  function addInterval(dayKey) {
    const day = bh.week[dayKey] || defaultDay();
    const intervals2 = Array.isArray(day.intervals) ? day.intervals : [];
    if (intervals2.length >= 4) return;
    const nextIntervals = intervals2.concat([{ start: "09:00", end: "17:00" }]).slice(0, 4);
    const nextDay = { ...day, intervals: nextIntervals };
    const nextWeek = { ...bh.week, [dayKey]: nextDay };
    commit({ ...bh, week: nextWeek });
  }
  function removeInterval(dayKey, index) {
    const day = bh.week[dayKey] || defaultDay();
    const intervals2 = Array.isArray(day.intervals) ? day.intervals : [];
    const nextIntervals = intervals2.filter((_, i) => i !== index);
    const nextDay = { ...day, intervals: nextIntervals };
    const nextWeek = { ...bh.week, [dayKey]: nextDay };
    commit({ ...bh, week: nextWeek });
  }
  return /* @__PURE__ */ jsx(Panel, { title: "שעות פעילות וזימון תורים", children: /* @__PURE__ */ jsxs("div", { className: styles$l.root, dir: "rtl", children: [
    canUseBooking ? /* @__PURE__ */ jsxs("div", { className: styles$l.section, children: [
      /* @__PURE__ */ jsx("h3", { className: styles$l.sectionTitle, children: "הזמנת תורים" }),
      /* @__PURE__ */ jsx("div", { className: styles$l.headerRow, children: /* @__PURE__ */ jsxs(
        "label",
        {
          className: styles$l.switch,
          "data-tour-id": "editor-mini-guide-hours-booking-enable",
          children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: bookingEnabled,
                onChange: (e) => onBookingChange?.({
                  ...safeBookingSettings,
                  enabled: e.target.checked
                }),
                disabled
              }
            ),
            /* @__PURE__ */ jsx("span", { className: styles$l.switchLabel, children: "אפשר הזמנת תורים" })
          ]
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: styles$l.hint, children: "כאשר מופעל, לקוחות יוכלו לשלוח בקשות לתורים דרך הכרטיס." }),
      /* @__PURE__ */ jsx("div", { "data-tour-id": "editor-mini-guide-hours-horizon", children: /* @__PURE__ */ jsx(
        TimeListbox,
        {
          label: "כמה זמן קדימה ניתן להזמין?",
          value: BOOKING_HORIZON_OPTIONS.find(
            (o) => o.value === effectiveHorizonDays
          )?.label ?? "",
          options: BOOKING_HORIZON_OPTIONS.map(
            (o) => o.label
          ),
          disabled: disabled || !bookingEnabled,
          invalid: false,
          onChange: (selectedLabel) => {
            const opt = BOOKING_HORIZON_OPTIONS.find(
              (o) => o.label === selectedLabel
            );
            if (!opt) return;
            onBookingChange?.({
              ...safeBookingSettings,
              enabled: bookingEnabled,
              horizonDays: opt.value
            });
          }
        }
      ) }),
      /* @__PURE__ */ jsx("span", { className: styles$l.hint, children: "קובע עד כמה זמן קדימה לקוחות יוכלו לבחור תור בכרטיס." })
    ] }) : /* @__PURE__ */ jsxs("div", { className: styles$l.lockedBlock, children: [
      /* @__PURE__ */ jsx("div", { className: styles$l.lockedTitle, children: "הזמנת תורים" }),
      /* @__PURE__ */ jsx("div", { className: styles$l.lockedText, children: "הזמנת תורים זמינה במסלול בתשלום בלבד." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles$l.section, children: [
      /* @__PURE__ */ jsx("h3", { className: styles$l.sectionTitle, children: "שעות פעילות" }),
      /* @__PURE__ */ jsx("div", { className: styles$l.headerRow, children: /* @__PURE__ */ jsxs(
        "label",
        {
          className: styles$l.switch,
          "data-tour-id": "editor-mini-guide-hours-show-in-card",
          children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: bh.enabled === true,
                onChange: (e) => setEnabled(e.target.checked),
                disabled
              }
            ),
            /* @__PURE__ */ jsx("span", { className: styles$l.switchLabel, children: "הצג בכרטיס" })
          ]
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: styles$l.hint, children: "השעות יוצגו בכרטיס רק אם הסעיף פעיל ומוגדרות שעות פעילות." }),
      WEEKDAYS.map((d) => {
        const day = bh.week?.[d.key] || defaultDay();
        const isOpen = day.open === true;
        const intervals2 = Array.isArray(day.intervals) ? day.intervals : [];
        return /* @__PURE__ */ jsxs("div", { className: styles$l.dayCard, children: [
          /* @__PURE__ */ jsxs("div", { className: styles$l.dayRow, children: [
            /* @__PURE__ */ jsx("div", { className: styles$l.dayLabel, children: d.label }),
            /* @__PURE__ */ jsxs(
              "label",
              {
                className: styles$l.openToggle,
                "data-tour-id": `editor-mini-guide-hours-${d.key}-closed`,
                children: [
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: isOpen,
                      onChange: (e) => setDayOpen(
                        d.key,
                        e.target.checked
                      ),
                      disabled: disabled || bh.enabled !== true
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: styles$l.openToggleLabel,
                      children: isOpen ? "פתוח" : "סגור"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$l.addBtn,
                "data-tour-id": `editor-mini-guide-hours-${d.key}-add-range`,
                onClick: () => addInterval(d.key),
                disabled: disabled || bh.enabled !== true || !isOpen || intervals2.length >= 4,
                children: "הוסף טווח"
              }
            )
          ] }),
          bh.enabled === true && isOpen && intervals2.length ? /* @__PURE__ */ jsx("div", { className: styles$l.intervals, children: intervals2.map((it, idx) => {
            const ok = isValidInterval(it);
            return /* @__PURE__ */ jsxs(
              "div",
              {
                className: styles$l.intervalRow,
                "data-invalid": ok ? "0" : "1",
                children: [
                  /* @__PURE__ */ jsx(
                    TimeListbox,
                    {
                      label: "התחלה",
                      value: typeof it.start === "string" ? it.start : "",
                      options: timeOptions,
                      disabled: disabled || bh.enabled !== true || !isOpen,
                      invalid: !ok,
                      onChange: (next) => setIntervalField(
                        d.key,
                        idx,
                        "start",
                        next
                      )
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    TimeListbox,
                    {
                      label: "סיום",
                      value: typeof it.end === "string" ? it.end : "",
                      options: timeOptions,
                      disabled: disabled || bh.enabled !== true || !isOpen,
                      invalid: !ok,
                      onChange: (next) => setIntervalField(
                        d.key,
                        idx,
                        "end",
                        next
                      )
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      className: styles$l.removeBtn,
                      onClick: () => removeInterval(
                        d.key,
                        idx
                      ),
                      disabled,
                      children: "הסר"
                    }
                  )
                ]
              },
              `${d.key}-${idx}`
            );
          }) }) : bh.enabled === true && isOpen ? /* @__PURE__ */ jsx("div", { className: styles$l.emptyDayHint, children: "אין טווחים. הוסיפו טווח כדי להציג בכרטיס." }) : null
        ] }, d.key);
      })
    ] })
  ] }) });
}
const backdrop$3 = "_backdrop_5fwi6_1";
const modal$3 = "_modal_5fwi6_23";
const header$4 = "_header_5fwi6_43";
const title$7 = "_title_5fwi6_59";
const body$2 = "_body_5fwi6_73";
const controls$1 = "_controls_5fwi6_85";
const zoomRow = "_zoomRow_5fwi6_101";
const zoomLabel = "_zoomLabel_5fwi6_113";
const zoomInput = "_zoomInput_5fwi6_125";
const actions$5 = "_actions_5fwi6_133";
const button$3 = "_button_5fwi6_145";
const buttonPrimary = "_buttonPrimary_5fwi6_167";
const styles$k = {
  backdrop: backdrop$3,
  modal: modal$3,
  header: header$4,
  title: title$7,
  body: body$2,
  controls: controls$1,
  zoomRow,
  zoomLabel,
  zoomInput,
  actions: actions$5,
  button: button$3,
  buttonPrimary
};
function CropModal({
  open,
  title: title2,
  imageUrl,
  aspect,
  cropShape,
  onCancel,
  onApply
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  useFocusTrap(dialogRef, Boolean(open));
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      cancelButtonRef.current?.focus?.();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);
  const safeAspect = useMemo(() => {
    const v = Number(aspect);
    return Number.isFinite(v) && v > 0 ? v : 1;
  }, [aspect]);
  const safeCropShape = cropShape === "round" ? "round" : "rect";
  const handleCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);
  const handleApply = useCallback(() => {
    if (!croppedAreaPixels) return;
    onApply?.(croppedAreaPixels);
  }, [croppedAreaPixels, onApply]);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: dialogRef,
      className: styles$k.backdrop,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": title2 || "Crop image",
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) onCancel?.();
      },
      children: /* @__PURE__ */ jsxs("div", { className: styles$k.modal, dir: "rtl", children: [
        /* @__PURE__ */ jsxs("div", { className: styles$k.header, children: [
          /* @__PURE__ */ jsx("h3", { className: styles$k.title, children: title2 || "Crop" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              ref: cancelButtonRef,
              type: "button",
              className: styles$k.button,
              onClick: onCancel,
              children: "סגור"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: styles$k.body, children: /* @__PURE__ */ jsx(
          Cropper,
          {
            image: imageUrl,
            crop,
            zoom,
            aspect: safeAspect,
            cropShape: safeCropShape,
            showGrid: safeCropShape !== "round",
            onCropChange: setCrop,
            onZoomChange: setZoom,
            onCropComplete: handleCropComplete
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: styles$k.controls, children: [
          /* @__PURE__ */ jsxs("div", { className: styles$k.zoomRow, children: [
            /* @__PURE__ */ jsx("div", { className: styles$k.zoomLabel, children: "זום" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: styles$k.zoomInput,
                type: "range",
                min: 1,
                max: 3,
                step: 0.02,
                value: zoom,
                onChange: (e) => setZoom(Number(e.target.value))
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$k.actions, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$k.button,
                onClick: onCancel,
                children: "ביטול"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: `${styles$k.button} ${styles$k.buttonPrimary}`,
                onClick: handleApply,
                disabled: !croppedAreaPixels,
                children: "החל"
              }
            )
          ] })
        ] })
      ] })
    }
  );
}
function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
async function getCroppedBlob({
  imageSrc,
  cropPixels,
  outputWidth,
  outputHeight,
  mimeType = "image/jpeg",
  quality = 0.92
}) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  const sx = clamp(cropPixels.x, 0, image.width);
  const sy = clamp(cropPixels.y, 0, image.height);
  const sw = clamp(cropPixels.width, 0, image.width - sx);
  const sh = clamp(cropPixels.height, 0, image.height - sy);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
  const blob = await new Promise(
    (resolve) => canvas.toBlob((b) => resolve(b), mimeType, clamp(quality, 0, 1))
  );
  if (!blob) throw new Error("Failed to crop image");
  return blob;
}
const list = "_list_1gw8s_1";
const row$2 = "_row_1gw8s_13";
const thumb = "_thumb_1gw8s_25";
const uploadRow$1 = "_uploadRow_1gw8s_39";
const hiddenFileInput$1 = "_hiddenFileInput_1gw8s_51";
const hint$3 = "_hint_1gw8s_77";
const galleryArea = "_galleryArea_1gw8s_89";
const uploadOverlay = "_uploadOverlay_1gw8s_97";
const uploadSpinner = "_uploadSpinner_1gw8s_125";
const uploadText = "_uploadText_1gw8s_157";
const uploadDebugBox = "_uploadDebugBox_1gw8s_169";
const uploadDebugTitle = "_uploadDebugTitle_1gw8s_195";
const uploadDebugPre = "_uploadDebugPre_1gw8s_209";
const lockedBlock$3 = "_lockedBlock_1gw8s_231";
const lockedTitle$3 = "_lockedTitle_1gw8s_251";
const lockedText$3 = "_lockedText_1gw8s_263";
const lockedCta$3 = "_lockedCta_1gw8s_275";
const styles$j = {
  list,
  row: row$2,
  thumb,
  uploadRow: uploadRow$1,
  hiddenFileInput: hiddenFileInput$1,
  hint: hint$3,
  galleryArea,
  uploadOverlay,
  uploadSpinner,
  uploadText,
  uploadDebugBox,
  uploadDebugTitle,
  uploadDebugPre,
  lockedBlock: lockedBlock$3,
  lockedTitle: lockedTitle$3,
  lockedText: lockedText$3,
  lockedCta: lockedCta$3
};
const ALLOWED_MIME$1 = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES$1 = 10 * 1024 * 1024;
function GalleryPanel({
  gallery = [],
  cardId,
  galleryLimit,
  onChange,
  entitlements
}) {
  if (entitlements?.canUseGallery === false) {
    return /* @__PURE__ */ jsx(Panel, { title: "גלריה", children: /* @__PURE__ */ jsxs("div", { className: styles$j.lockedBlock, children: [
      /* @__PURE__ */ jsx("div", { className: styles$j.lockedTitle, children: "גלריה" }),
      /* @__PURE__ */ jsx("div", { className: styles$j.lockedText, children: "כדי להשתמש בגלריה צריך מנוי פרימיום." }),
      /* @__PURE__ */ jsx("a", { href: "/pricing", className: styles$j.lockedCta, children: "שדרג לפרימיום" })
    ] }) });
  }
  const limit = typeof galleryLimit === "number" && Number.isFinite(galleryLimit) ? galleryLimit : 12;
  const reachedLimit = gallery.length >= limit;
  const latestGalleryRef = useRef(gallery);
  useEffect(() => {
    latestGalleryRef.current = gallery;
  }, [gallery]);
  const objectUrlRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState(null);
  const [cropTarget, setCropTarget] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const debugEnabled = useMemo(
    () => new URLSearchParams(window.location.search).get("uploadDebug") === "1",
    []
  );
  const [debugLog, setDebugLog] = useState([]);
  function pushDebug(tag, payload) {
    if (!debugEnabled) return;
    setDebugLog((prev) => [
      ...prev,
      { ts: (/* @__PURE__ */ new Date()).toISOString(), tag, payload }
    ]);
  }
  const cropTitle = useMemo(() => "בחר/י חיתוך לתמונה הממוזערת", []);
  function cleanupObjectUrl() {
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {
      }
      objectUrlRef.current = null;
    }
  }
  function closeCrop() {
    if (isApplying) return;
    setCropOpen(false);
    setCropImageUrl(null);
    setCropTarget(null);
    setIsApplying(false);
    cleanupObjectUrl();
  }
  function handleCancelCrop() {
    if (isApplying) return;
    if (!cropTarget) {
      closeCrop();
      return;
    }
    const currentGallery = latestGalleryRef.current;
    const idx = findTargetIndex(currentGallery, cropTarget);
    if (idx !== -1) {
      onChange(currentGallery.filter((_, i) => i !== idx));
    }
    closeCrop();
  }
  function findTargetIndex(currentGallery, target) {
    if (!Array.isArray(currentGallery) || !target) return -1;
    const targetPath = typeof target.path === "string" ? target.path.trim() : "";
    const targetUrl = typeof target.url === "string" ? target.url.trim() : "";
    const targetCreatedAt = typeof target.createdAt === "string" ? target.createdAt.trim() : "";
    if (targetPath) {
      const idx = currentGallery.findIndex((item2) => {
        if (!item2 || typeof item2 !== "object") return false;
        const p = typeof item2.path === "string" ? item2.path.trim() : "";
        return p && p === targetPath;
      });
      if (idx !== -1) return idx;
    }
    if (targetUrl) {
      const matches = [];
      currentGallery.forEach((item2, idx) => {
        if (typeof item2 === "string") {
          if (item2.trim() === targetUrl) matches.push(idx);
          return;
        }
        if (!item2 || typeof item2 !== "object") return;
        const u = typeof item2.url === "string" ? item2.url.trim() : "";
        if (u && u === targetUrl) matches.push(idx);
      });
      if (matches.length === 1) return matches[0];
      if (matches.length > 1 && targetCreatedAt) {
        const byCreatedAt = matches.find((idx) => {
          const item2 = currentGallery[idx];
          if (!item2 || typeof item2 !== "object") return false;
          const ca = typeof item2.createdAt === "string" ? item2.createdAt.trim() : "";
          return ca && ca === targetCreatedAt;
        });
        if (typeof byCreatedAt === "number") return byCreatedAt;
      }
      if (matches.length > 1) {
        if (debugEnabled) {
          console.warn("[gallery-thumb] duplicate url matches", {
            cardId,
            targetUrl,
            matches: matches.length
          });
        }
        return matches[0];
      }
    }
    return -1;
  }
  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    pushDebug("file", {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });
    if (!ALLOWED_MIME$1.has(file.type) || file.size > MAX_BYTES$1) {
      pushDebug("rejected", {
        reason: "MIME_OR_SIZE",
        type: file?.type,
        size: file?.size
      });
      alert("אנא העלה/י JPG/PNG/WebP עד 10MB");
      return;
    }
    cleanupObjectUrl();
    try {
      objectUrlRef.current = URL.createObjectURL(file);
    } catch (urlErr) {
      pushDebug("objurl-fail", {
        message: urlErr?.message || String(urlErr)
      });
      return;
    }
    setIsUploading(true);
    try {
      const res = await uploadGalleryImage(cardId, file);
      const createdAt = (/* @__PURE__ */ new Date()).toISOString();
      const item2 = res?.path ? {
        url: res.url,
        path: res.path,
        createdAt
      } : res.url;
      onChange([...gallery, item2]);
      setCropTarget({
        path: res?.path || null,
        url: res?.url || null,
        createdAt
      });
      setCropImageUrl(objectUrlRef.current);
      setCropOpen(true);
    } catch (err) {
      pushDebug("upload-error", {
        code: err?.code,
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data
      });
      cleanupObjectUrl();
      if (err.response?.data?.code === "GALLERY_LIMIT_REACHED") {
        alert(err?.response?.data?.message || "Gallery limit reached");
      } else {
        alert(err?.response?.data?.message || "Upload error");
      }
    } finally {
      setIsUploading(false);
    }
  }
  async function handleApplyCrop(cropPixels) {
    if (isApplying) return;
    if (!cardId || !cropTarget || !cropImageUrl) return;
    const currentGallery = latestGalleryRef.current;
    const idx = findTargetIndex(currentGallery, cropTarget);
    if (idx === -1) {
      closeCrop();
      return;
    }
    setIsApplying(true);
    try {
      const blob = await getCroppedBlob({
        imageSrc: cropImageUrl,
        cropPixels,
        outputWidth: 480,
        outputHeight: 480,
        mimeType: "image/jpeg",
        quality: 0.9
      });
      const thumbFile = new File([blob], "gallery-thumb.jpg", {
        type: blob.type || "image/jpeg"
      });
      const uploaded = await uploadDesignAsset(
        cardId,
        thumbFile,
        "galleryThumb"
      );
      const galleryAfterUpload = latestGalleryRef.current;
      const nextIdx = findTargetIndex(galleryAfterUpload, cropTarget);
      if (nextIdx === -1) {
        closeCrop();
        return;
      }
      const nextGallery = [...galleryAfterUpload];
      const prev = nextGallery[nextIdx];
      if (typeof prev === "string") {
        nextGallery[nextIdx] = {
          url: cropTarget.url || prev.trim(),
          path: cropTarget.path || null,
          createdAt: cropTarget.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          thumbUrl: uploaded.url,
          thumbPath: uploaded.path
        };
      } else if (prev && typeof prev === "object") {
        nextGallery[nextIdx] = {
          ...prev,
          thumbUrl: uploaded.url,
          thumbPath: uploaded.path
        };
      }
      onChange(nextGallery);
      closeCrop();
    } catch (err) {
      pushDebug("crop-error", {
        code: err?.code,
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data
      });
      alert(
        err?.response?.data?.message || err?.message || "Crop failed"
      );
      setIsApplying(false);
    }
  }
  function removeImage(index) {
    if (cropOpen || isApplying || isUploading) return;
    onChange(gallery.filter((_, i) => i !== index));
  }
  function isSafeEditorPreviewUrl(raw) {
    if (typeof raw !== "string") return false;
    const url = raw.trim();
    if (!url) return false;
    if (/^https?:\/\//i.test(url)) return true;
    if (url.startsWith("/uploads/")) return true;
    if (url.startsWith("uploads/")) return true;
    return false;
  }
  return /* @__PURE__ */ jsxs(Panel, { title: "גלריה", children: [
    /* @__PURE__ */ jsx(
      CropModal,
      {
        open: cropOpen,
        title: cropTitle,
        imageUrl: cropImageUrl,
        aspect: 1,
        cropShape: "rect",
        onCancel: handleCancelCrop,
        onApply: handleApplyCrop
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: styles$j.galleryArea, children: [
      isUploading && /* @__PURE__ */ jsxs("div", { className: styles$j.uploadOverlay, children: [
        /* @__PURE__ */ jsx("span", { className: styles$j.uploadSpinner }),
        /* @__PURE__ */ jsx("p", { className: styles$j.uploadText, children: "מעלה תמונה…" })
      ] }),
      /* @__PURE__ */ jsx("ul", { className: styles$j.list, children: (() => {
        const seenKeys = /* @__PURE__ */ new Set();
        return gallery.map((item2, index) => {
          const url = galleryItemToUrl(item2);
          if (!url) return null;
          const baseKey = item2 && typeof item2 === "object" && typeof item2.path === "string" && item2.path.trim() ? item2.path.trim() : url ? url : `gallery-row-${index}`;
          const createdAtKey = item2 && typeof item2 === "object" && typeof item2.createdAt === "string" ? item2.createdAt.trim() : "";
          const key = seenKeys.has(baseKey) ? `${baseKey}|${createdAtKey || index}` : baseKey;
          seenKeys.add(baseKey);
          const thumbUrlRaw = item2 && typeof item2 === "object" ? typeof item2.thumbUrl === "string" ? item2.thumbUrl : typeof item2.thumbPath === "string" ? item2.thumbPath : null : null;
          const safeThumbTrimmed = typeof thumbUrlRaw === "string" ? thumbUrlRaw.trim() : "";
          const previewSrc = isSafeEditorPreviewUrl(
            thumbUrlRaw
          ) ? safeThumbTrimmed.startsWith("uploads/") ? `/${safeThumbTrimmed}` : safeThumbTrimmed : url;
          return /* @__PURE__ */ jsxs("li", { className: styles$j.row, children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                src: previewSrc,
                alt: "",
                className: styles$j.thumb
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "secondary",
                size: "small",
                onClick: () => removeImage(index),
                disabled: cropOpen || isApplying || isUploading,
                children: "הסר"
              }
            )
          ] }, key);
        });
      })() }),
      /* @__PURE__ */ jsxs("div", { className: styles$j.uploadRow, children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            size: "small",
            disabled: !cardId || reachedLimit || cropOpen || isApplying || isUploading,
            onClick: () => fileInputRef.current?.click(),
            children: "הוספת תמונה"
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: fileInputRef,
            className: styles$j.hiddenFileInput,
            type: "file",
            accept: "image/*",
            onChange: handleUpload,
            disabled: !cardId || reachedLimit || cropOpen || isApplying || isUploading,
            "aria-label": "העלאת תמונה לגלריה"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("p", { className: styles$j.hint, children: [
        "מוגבל ל־",
        limit,
        " תמונות"
      ] })
    ] }),
    debugEnabled && debugLog.length > 0 && /* @__PURE__ */ jsxs("div", { className: styles$j.uploadDebugBox, children: [
      /* @__PURE__ */ jsx("p", { className: styles$j.uploadDebugTitle, children: "Upload Debug" }),
      /* @__PURE__ */ jsx("pre", { className: styles$j.uploadDebugPre, children: JSON.stringify(debugLog, null, 2) })
    ] })
  ] });
}
const reviewItem = "_reviewItem_6y5ui_1";
const meta$3 = "_meta_6y5ui_13";
const addRow = "_addRow_6y5ui_27";
const addButton = "_addButton_6y5ui_41";
const hint$2 = "_hint_6y5ui_51";
const styles$i = {
  reviewItem,
  meta: meta$3,
  addRow,
  addButton,
  hint: hint$2
};
function ReviewsPanel({ reviews = [], onChange }) {
  const REVIEWS_MAX = 5;
  const REVIEWS_TEXT_MAX = 100;
  function remaining2(max, value) {
    const s = typeof value === "string" ? value : String(value || "");
    return Math.max(0, max - s.length);
  }
  function addReview() {
    if (reviews.length >= REVIEWS_MAX) return;
    onChange([...reviews, ""]);
  }
  function updateReview(index, value) {
    const updated = [...reviews];
    updated[index] = value;
    onChange(updated);
  }
  function commitReviewOnBlur(index) {
    const raw = reviews[index];
    const trimmed = typeof raw === "string" ? raw.trim() : String(raw || "").trim();
    const clipped = trimmed.slice(0, REVIEWS_TEXT_MAX);
    if (clipped === raw) return;
    updateReview(index, clipped);
  }
  function removeReview(index) {
    const updated = reviews.filter((_, i) => i !== index);
    onChange(updated);
  }
  return /* @__PURE__ */ jsxs(Panel, { title: "המלצות", children: [
    reviews.map((review, index) => /* @__PURE__ */ jsxs("div", { className: styles$i.reviewItem, children: [
      /* @__PURE__ */ jsx(
        "textarea",
        {
          rows: 2,
          value: review,
          onChange: (e) => updateReview(index, e.target.value),
          onBlur: () => commitReviewOnBlur(index),
          maxLength: REVIEWS_TEXT_MAX,
          className: formStyles.textarea
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: styles$i.meta, children: [
        "נשארו ",
        remaining2(REVIEWS_TEXT_MAX, review),
        " תווים"
      ] }),
      /* @__PURE__ */ jsx(
        Button,
        {
          variant: "secondary",
          size: "small",
          onClick: () => removeReview(index),
          children: "מחק"
        }
      )
    ] }, index)),
    /* @__PURE__ */ jsxs("div", { className: styles$i.addRow, children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "small",
          onClick: addReview,
          disabled: reviews.length >= REVIEWS_MAX,
          className: styles$i.addButton,
          children: "הוסף המלצה"
        }
      ),
      reviews.length >= REVIEWS_MAX ? /* @__PURE__ */ jsx("div", { className: styles$i.hint, children: "הגעת למקסימום של 5 המלצות" }) : null
    ] })
  ] });
}
const fieldGroup = "_fieldGroup_a9twu_1";
const label$2 = "_label_a9twu_13";
const items = "_items_a9twu_25";
const item = "_item_a9twu_25";
const itemHeader = "_itemHeader_a9twu_57";
const itemTitle = "_itemTitle_a9twu_73";
const actions$4 = "_actions_a9twu_81";
const hint$1 = "_hint_a9twu_95";
const incompleteHint = "_incompleteHint_a9twu_105";
const aiBlock$1 = "_aiBlock_a9twu_121";
const aiLockedBlock = "_aiLockedBlock_a9twu_143";
const aiLockedTitle = "_aiLockedTitle_a9twu_163";
const aiLockedText = "_aiLockedText_a9twu_175";
const aiLockedCta = "_aiLockedCta_a9twu_187";
const aiDisclosure = "_aiDisclosure_a9twu_225";
const aiRow$1 = "_aiRow_a9twu_237";
const aiReadinessHint$1 = "_aiReadinessHint_a9twu_251";
const aiReadinessLink = "_aiReadinessLink_a9twu_263";
const aiStatusRow = "_aiStatusRow_a9twu_297";
const aiError$1 = "_aiError_a9twu_307";
const aiPreview$1 = "_aiPreview_a9twu_325";
const aiPreviewTitle = "_aiPreviewTitle_a9twu_345";
const aiPreviewItem = "_aiPreviewItem_a9twu_357";
const aiPreviewQ = "_aiPreviewQ_a9twu_369";
const aiPreviewA = "_aiPreviewA_a9twu_383";
const aiActions$1 = "_aiActions_a9twu_397";
const consentOverlay$1 = "_consentOverlay_a9twu_413";
const consentDialog$1 = "_consentDialog_a9twu_435";
const consentTitle$1 = "_consentTitle_a9twu_465";
const consentBody$1 = "_consentBody_a9twu_479";
const consentActions$1 = "_consentActions_a9twu_495";
const consentConfirm$1 = "_consentConfirm_a9twu_509";
const consentCancel$1 = "_consentCancel_a9twu_511";
const styles$h = {
  fieldGroup,
  label: label$2,
  items,
  item,
  itemHeader,
  itemTitle,
  actions: actions$4,
  hint: hint$1,
  incompleteHint,
  aiBlock: aiBlock$1,
  aiLockedBlock,
  aiLockedTitle,
  aiLockedText,
  aiLockedCta,
  aiDisclosure,
  aiRow: aiRow$1,
  aiReadinessHint: aiReadinessHint$1,
  aiReadinessLink,
  aiStatusRow,
  aiError: aiError$1,
  aiPreview: aiPreview$1,
  aiPreviewTitle,
  aiPreviewItem,
  aiPreviewQ,
  aiPreviewA,
  aiActions: aiActions$1,
  consentOverlay: consentOverlay$1,
  consentDialog: consentDialog$1,
  consentTitle: consentTitle$1,
  consentBody: consentBody$1,
  consentActions: consentActions$1,
  consentConfirm: consentConfirm$1,
  consentCancel: consentCancel$1
};
const MAX_ITEMS = 5;
const AI_FAQ_CONSENT_KEY = "cardigo_ai_faq_consent";
function hasAiFaqConsent() {
  try {
    return localStorage.getItem(AI_FAQ_CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}
function saveAiFaqConsent() {
  try {
    localStorage.setItem(AI_FAQ_CONSENT_KEY, "1");
  } catch {
  }
}
function mapFaqAiError(err) {
  const code = err?.response?.data?.code;
  const status2 = err?.response?.status;
  if (status2 === 401) return "יש להתחבר מחדש כדי להשתמש בשירות זה.";
  if (code === "RATE_LIMITED")
    return "יותר מדי בקשות כרגע. נסה שוב בעוד מספר דקות.";
  if (code === "AI_PROVIDER_QUOTA")
    return "מכסת שירות ה-AI החיצוני מוצתה זמנית. נסה שוב מאוחר יותר.";
  if (code === "AI_MONTHLY_LIMIT_REACHED")
    return "מכסת ה-AI החודשית מוצתה. נסה שוב בחודש הבא.";
  if (code === "AI_DISABLED") return "שירות ה-AI אינו פעיל כרגע.";
  if (code === "AI_UNAVAILABLE")
    return "שירות ה-AI אינו זמין זמנית. נסה שוב.";
  if (code === "PREMIUM_REQUIRED")
    return "יצירת שאלות עם AI זמינה למנויי פרימיום בלבד.";
  if (code === "INVALID_SUGGESTION")
    return "ה-AI החזיר תוכן לא שמיש. נסה שוב.";
  if (code === "INVALID_TARGET") return "בקשה שגויה. נסה שוב.";
  if (code === "AI_INSUFFICIENT_BUSINESS_CONTEXT")
    return "יש למלא שם עסק ותחום עיסוק לפני יצירת תוכן עם AI.";
  if (code === "AI_FAQ_NOT_EMPTY")
    return "ניתן להשתמש ב-AI רק כשרשימת השאלות ריקה.";
  return "משהו השתבש. נסה שוב מאוחר יותר.";
}
function AiFaqConsentModal({ open, onConfirm, onCancel }) {
  const titleId = useId();
  const bodyId = useId();
  const confirmRef = useRef(null);
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, open);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmRef.current?.focus?.(), 0);
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: dialogRef,
      className: styles$h.consentOverlay,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      "aria-describedby": bodyId,
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) onCancel?.();
      },
      children: /* @__PURE__ */ jsxs("div", { className: styles$h.consentDialog, dir: "rtl", children: [
        /* @__PURE__ */ jsx("h2", { id: titleId, className: styles$h.consentTitle, children: "הצעת שאלות ותשובות באמצעות AI" }),
        /* @__PURE__ */ jsx("p", { id: bodyId, className: styles$h.consentBody, children: "ההצעה נוצרת באמצעות שירות בינה מלאכותית חיצוני. המידע העסקי מהכרטיס שלך ישמש ליצירת השאלות והתשובות. התוכן המוצע הוא המלצה בלבד - תוכל לערוך או לדחות אותו לפני שמירה." }),
        /* @__PURE__ */ jsxs("div", { className: styles$h.consentActions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              ref: confirmRef,
              type: "button",
              className: styles$h.consentConfirm,
              onClick: onConfirm,
              children: "המשך"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$h.consentCancel,
              onClick: onCancel,
              children: "ביטול"
            }
          )
        ] })
      ] })
    }
  );
}
function normalizeItems(items2) {
  return Array.isArray(items2) ? items2.filter((x) => x && typeof x === "object").map((x) => ({
    q: typeof x.q === "string" ? x.q : "",
    a: typeof x.a === "string" ? x.a : ""
  })) : [];
}
function FaqPanel({
  faq,
  disabled,
  onChange,
  cardId,
  business = {},
  onNavigateTab,
  entitlements,
  plan
}) {
  const aiLocked = plan === "free";
  const value = faq && typeof faq === "object" ? faq : {};
  const title2 = typeof value.title === "string" ? value.title : "";
  const lead = typeof value.lead === "string" ? value.lead : "";
  const items2 = normalizeItems(value.items);
  const hasValidItems = items2.some((it) => it.q.trim() && it.a.trim());
  const incompleteCount = items2.filter((it) => {
    const q = typeof it?.q === "string" ? it.q.trim() : "";
    const a = typeof it?.a === "string" ? it.a.trim() : "";
    return q && !a || !q && a;
  }).length;
  const [aiState, setAiState] = useState("idle");
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiError2, setAiError] = useState("");
  const [aiQuota, setAiQuota] = useState(null);
  const [showConsent, setShowConsent] = useState(false);
  const reqSeqRef = useRef(0);
  const aiReady = Boolean(business?.name?.trim()) && Boolean(business?.category?.trim());
  const quotaExhausted = aiQuota && aiQuota.remaining <= 0;
  const aiEligible = !hasValidItems;
  const prevCardIdRef = useRef(cardId);
  useEffect(() => {
    if (prevCardIdRef.current === cardId) return;
    prevCardIdRef.current = cardId;
    reqSeqRef.current += 1;
    setAiState("idle");
    setAiSuggestion(null);
    setAiError("");
    setAiQuota(null);
    setShowConsent(false);
  }, [cardId]);
  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    fetchAiQuota(cardId, "ai_faq_generation").then((q) => {
      if (!cancelled) setAiQuota(q);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [cardId]);
  useEffect(() => {
    if (!hasValidItems) return;
    if (aiState === "idle") return;
    reqSeqRef.current += 1;
    setAiSuggestion(null);
    setAiState("idle");
    setAiError("");
  }, [hasValidItems, aiState]);
  const requestSuggestion = useCallback(async () => {
    if (!cardId) return;
    const seq = ++reqSeqRef.current;
    setAiState("loading");
    setAiError("");
    setAiSuggestion(null);
    try {
      const { suggestion, quota } = await suggestFaq(cardId, {
        target: "full"
      });
      if (reqSeqRef.current !== seq) return;
      setAiSuggestion(suggestion);
      setAiState("preview");
      if (quota) setAiQuota(quota);
    } catch (err) {
      if (reqSeqRef.current !== seq) return;
      setAiError(mapFaqAiError(err));
      setAiState("error");
      const errQuota = err?.response?.data?.quota;
      if (errQuota) setAiQuota(errQuota);
    }
  }, [cardId]);
  const handleAiClick = useCallback(() => {
    if (hasAiFaqConsent()) {
      requestSuggestion();
    } else {
      setShowConsent(true);
    }
  }, [requestSuggestion]);
  const handleConsentConfirm = useCallback(() => {
    saveAiFaqConsent();
    setShowConsent(false);
    requestSuggestion();
  }, [requestSuggestion]);
  const handleConsentCancel = useCallback(() => {
    setShowConsent(false);
  }, []);
  const handleApply = useCallback(() => {
    if (!aiSuggestion?.items) return;
    onChange?.({
      ...value || {},
      title: title2,
      lead,
      items: aiSuggestion.items.slice(0, MAX_ITEMS).map((it) => ({
        q: typeof it.q === "string" ? it.q : "",
        a: typeof it.a === "string" ? it.a : ""
      }))
    });
    setAiSuggestion(null);
    setAiState("idle");
    setAiError("");
  }, [aiSuggestion, value, title2, lead, onChange]);
  const handleDismiss = useCallback(() => {
    setAiSuggestion(null);
    setAiState("idle");
    setAiError("");
  }, []);
  function commit(next) {
    onChange?.(next);
  }
  function updateField(key, nextValue) {
    commit({
      ...value || {},
      [key]: nextValue,
      items: items2
    });
  }
  function updateItem(index, patch) {
    const nextItems = items2.map(
      (it, i) => i === index ? { ...it, ...patch } : it
    );
    commit({
      ...value || {},
      title: title2,
      lead,
      items: nextItems
    });
  }
  function addItem() {
    if (items2.length >= MAX_ITEMS) return;
    const nextItems = [...items2, { q: "", a: "" }];
    commit({ ...value || {}, title: title2, lead, items: nextItems });
  }
  function removeItem(index) {
    const nextItems = items2.filter((_, i) => i !== index);
    commit({ ...value || {}, title: title2, lead, items: nextItems });
  }
  return /* @__PURE__ */ jsxs(Panel, { title: "שאלות ותשובות", children: [
    /* @__PURE__ */ jsxs("div", { className: styles$h.fieldGroup, children: [
      /* @__PURE__ */ jsxs("label", { className: styles$h.label, children: [
        "כותרת",
        /* @__PURE__ */ jsx(
          "input",
          {
            className: formStyles.input,
            type: "text",
            value: title2,
            onChange: (e) => updateField("title", e.target.value),
            disabled,
            placeholder: "שאלות ותשובות נפוצות"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("label", { className: styles$h.label, children: [
        "תיאור קצר (אופציונלי)",
        /* @__PURE__ */ jsx(
          "textarea",
          {
            className: formStyles.textarea,
            rows: 2,
            value: lead,
            onChange: (e) => updateField("lead", e.target.value),
            disabled
          }
        )
      ] })
    ] }),
    cardId && !aiReady && /* @__PURE__ */ jsxs("span", { className: styles$h.aiReadinessHint, children: [
      "כדי לקבל הצעת שאלות מדויקת,",
      " ",
      onNavigateTab ? /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$h.aiReadinessLink,
          onClick: () => onNavigateTab("business"),
          children: "מלאו קודם את שם העסק ותחום העיסוק"
        }
      ) : /* @__PURE__ */ jsx(Fragment, { children: "מלאו קודם את שם העסק ותחום העיסוק" })
    ] }),
    cardId && !aiLocked && (aiEligible || aiState !== "idle") && /* @__PURE__ */ jsxs("div", { className: styles$h.aiBlock, children: [
      aiEligible && aiState === "idle" && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: styles$h.aiDisclosure, children: "✦ ניתן לייצר שאלות ותשובות באמצעות AI" }),
        /* @__PURE__ */ jsxs("div", { className: styles$h.aiRow, children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              disabled: !aiReady || quotaExhausted || disabled,
              onClick: handleAiClick,
              children: "הצע 3 שאלות ותשובות עם AI"
            }
          ),
          /* @__PURE__ */ jsx(AiQuotaHint, { quota: aiQuota })
        ] })
      ] }),
      aiState === "loading" && /* @__PURE__ */ jsx("div", { className: styles$h.aiStatusRow, children: /* @__PURE__ */ jsx(Button, { variant: "secondary", loading: true, disabled: true, children: "יוצר שאלות ותשובות…" }) }),
      aiState === "error" && /* @__PURE__ */ jsxs("div", { className: styles$h.aiError, children: [
        aiError2,
        /* @__PURE__ */ jsx(Button, { variant: "secondary", onClick: handleAiClick, children: "נסה שוב" })
      ] }),
      aiState === "preview" && aiSuggestion?.items && /* @__PURE__ */ jsxs("div", { className: styles$h.aiPreview, children: [
        /* @__PURE__ */ jsx("div", { className: styles$h.aiPreviewTitle, children: "הצעת AI - שאלות ותשובות" }),
        aiSuggestion.items.map((it, i) => /* @__PURE__ */ jsxs("div", { className: styles$h.aiPreviewItem, children: [
          /* @__PURE__ */ jsx("div", { className: styles$h.aiPreviewQ, children: it.q }),
          /* @__PURE__ */ jsx("div", { className: styles$h.aiPreviewA, children: it.a })
        ] }, i)),
        /* @__PURE__ */ jsxs("div", { className: styles$h.aiActions, children: [
          /* @__PURE__ */ jsx(Button, { variant: "primary", onClick: handleApply, children: "החל הצעה" }),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              onClick: handleDismiss,
              children: "דחה"
            }
          )
        ] })
      ] })
    ] }),
    cardId && aiLocked && aiEligible && /* @__PURE__ */ jsxs("div", { className: styles$h.aiLockedBlock, children: [
      /* @__PURE__ */ jsx("div", { className: styles$h.aiLockedTitle, children: "✦ יצירת שאלות עם AI" }),
      /* @__PURE__ */ jsx("div", { className: styles$h.aiLockedText, children: "יצירת שאלות ותשובות באמצעות AI זמינה למנויי פרימיום בלבד." }),
      /* @__PURE__ */ jsx("a", { href: "/pricing", className: styles$h.aiLockedCta, children: "שדרג לפרימיום" })
    ] }),
    /* @__PURE__ */ jsx(
      AiFaqConsentModal,
      {
        open: showConsent,
        onConfirm: handleConsentConfirm,
        onCancel: handleConsentCancel
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: styles$h.items, children: [
      items2.map((item2, index) => /* @__PURE__ */ jsxs("div", { className: styles$h.item, children: [
        /* @__PURE__ */ jsx("div", { className: styles$h.itemHeader, children: /* @__PURE__ */ jsxs("div", { className: styles$h.itemTitle, children: [
          "שאלה #",
          index + 1
        ] }) }),
        /* @__PURE__ */ jsxs("label", { className: styles$h.label, children: [
          "שאלה",
          /* @__PURE__ */ jsx(
            "textarea",
            {
              className: formStyles.textarea,
              rows: 2,
              value: item2.q,
              onChange: (e) => updateItem(index, { q: e.target.value }),
              disabled
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("label", { className: styles$h.label, children: [
          "תשובה",
          /* @__PURE__ */ jsx(
            "textarea",
            {
              className: formStyles.textarea,
              rows: 3,
              value: item2.a,
              onChange: (e) => updateItem(index, { a: e.target.value }),
              disabled
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            size: "small",
            onClick: () => removeItem(index),
            disabled,
            children: "מחק"
          }
        )
      ] }, index)),
      /* @__PURE__ */ jsxs("div", { className: styles$h.actions, children: [
        incompleteCount ? /* @__PURE__ */ jsx("div", { className: styles$h.incompleteHint, children: "יש למלא גם שאלה וגם תשובה כדי לשמור פריט FAQ." }) : null,
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "small",
            onClick: addItem,
            disabled: disabled || items2.length >= MAX_ITEMS,
            children: "הוסף שאלה"
          }
        ),
        items2.length >= MAX_ITEMS ? /* @__PURE__ */ jsxs("div", { className: styles$h.hint, children: [
          "הגעת למקסימום של ",
          MAX_ITEMS,
          " שאלות"
        ] }) : null,
        /* @__PURE__ */ jsxs("div", { className: styles$h.hint, children: [
          "מקסימום ",
          MAX_ITEMS
        ] })
      ] })
    ] })
  ] });
}
const root$5 = "_root_gmxzb_1";
const section$4 = "_section_gmxzb_13";
const coverSlot = "_coverSlot_gmxzb_61";
const coverSlotImage = "_coverSlotImage_gmxzb_87";
const avatarSlot = "_avatarSlot_gmxzb_119";
const avatarSlotImage = "_avatarSlotImage_gmxzb_145";
const emptyState = "_emptyState_gmxzb_159";
const uploadRow = "_uploadRow_gmxzb_173";
const uploadButton = "_uploadButton_gmxzb_189";
const hiddenFileInput = "_hiddenFileInput_gmxzb_197";
const helper = "_helper_gmxzb_245";
const styles$g = {
  root: root$5,
  section: section$4,
  coverSlot,
  coverSlotImage,
  avatarSlot,
  avatarSlotImage,
  emptyState,
  uploadRow,
  uploadButton,
  hiddenFileInput,
  helper
};
const ALLOWED_MIME = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;
const COVER_ASPECT = 16 / 10;
const AVATAR_ASPECT = 1;
const COVER_OUTPUT = { width: 1600, height: 1e3 };
const AVATAR_OUTPUT = { width: 600, height: 600 };
function DesignEditor({
  design,
  onChange,
  plan,
  cardId,
  editingDisabled,
  onDeleteDesignAsset,
  deleteDesignAssetBusyKind
}) {
  const safeDesign = design || {};
  const template = getTemplateById(
    normalizeTemplateId(safeDesign?.templateId)
  );
  const isDeletingBackground = deleteDesignAssetBusyKind === "background";
  const isDeletingAvatar = deleteDesignAssetBusyKind === "avatar";
  const [cropOpen, setCropOpen] = useState(false);
  const [cropKind, setCropKind] = useState(null);
  const [cropTitle, setCropTitle] = useState("");
  const [cropAspect, setCropAspect] = useState(1);
  const [cropShape, setCropShape] = useState("rect");
  const [cropImageUrl, setCropImageUrl] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const objectUrlRef = useRef(null);
  const backgroundInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const hasBackgroundImage = useMemo(
    () => Boolean(safeDesign?.backgroundImage || safeDesign?.coverImage),
    [safeDesign?.backgroundImage, safeDesign?.coverImage]
  );
  const hasAvatarImage = useMemo(
    () => Boolean(safeDesign?.avatarImage || safeDesign?.logo),
    [safeDesign?.avatarImage, safeDesign?.logo]
  );
  const backgroundPreviewSrc = safeDesign?.backgroundImage || safeDesign?.coverImage || "";
  const avatarPreviewSrc = safeDesign?.avatarImage || safeDesign?.logo || "";
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);
  function openCropFor(kind, file) {
    if (!file) return;
    if (!ALLOWED_MIME.has(file.type) || file.size > MAX_BYTES) {
      alert("אנא העלה/י JPG/PNG/WebP עד 10MB");
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPendingFile(file);
    setCropKind(kind);
    if (kind === "background") {
      setCropTitle("חיתוך תמונת רקע (16:10)");
      setCropAspect(COVER_ASPECT);
      setCropShape("rect");
    } else {
      setCropTitle("חיתוך תמונת פרופיל (1:1)");
      setCropAspect(AVATAR_ASPECT);
      setCropShape("round");
    }
    setCropImageUrl(url);
    setCropOpen(true);
  }
  async function uploadCropped(kind, blob) {
    if (!cardId || !blob) return null;
    const safeKind = kind === "avatar" ? "avatar" : "background";
    const fileName = safeKind === "avatar" ? "avatar.jpg" : "cover.jpg";
    const croppedFile = new File([blob], fileName, { type: blob.type });
    const res = await uploadDesignAsset(cardId, croppedFile, safeKind);
    return res?.url || null;
  }
  async function handleApplyCrop(cropPixels) {
    if (!cropKind || !pendingFile || !cropImageUrl) return;
    if (!cardId) return;
    const output = cropKind === "avatar" ? AVATAR_OUTPUT : COVER_OUTPUT;
    let url;
    try {
      const blob = await getCroppedBlob({
        imageSrc: cropImageUrl,
        cropPixels,
        outputWidth: output.width,
        outputHeight: output.height
      });
      url = await uploadCropped(cropKind, blob);
    } catch (err) {
      alert(
        err?.response?.data?.message || err?.message || "Upload error"
      );
      return;
    }
    if (!url) {
      alert("Upload error");
      return;
    }
    if (cropKind === "background") {
      onChange({
        ...safeDesign,
        backgroundImage: url,
        coverImage: url
      });
    }
    if (cropKind === "avatar") {
      onChange({
        ...safeDesign,
        avatarImage: url,
        logo: url
      });
    }
    const kindForEvent = cropKind;
    document.dispatchEvent(
      new CustomEvent("cardigo:upload-applied", {
        detail: { kind: kindForEvent },
        bubbles: false
      })
    );
    setCropOpen(false);
    setPendingFile(null);
    setCropKind(null);
    setCropImageUrl("");
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }
  function handleCancelCrop() {
    setCropOpen(false);
    setPendingFile(null);
    setCropKind(null);
    setCropImageUrl("");
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }
  function requestDelete(kind) {
    if (!cardId) return;
    if (editingDisabled) return;
    if (typeof onDeleteDesignAsset !== "function") return;
    onDeleteDesignAsset(kind);
  }
  return /* @__PURE__ */ jsxs("aside", { className: styles$g.root, children: [
    template?.supports?.backgroundImage && /* @__PURE__ */ jsxs(
      "section",
      {
        className: styles$g.section,
        "data-tour-id": "editor-tour-upload-background-block",
        children: [
          /* @__PURE__ */ jsx("h3", { children: "תמונת רקע" }),
          /* @__PURE__ */ jsx("div", { className: styles$g.coverSlot, children: hasBackgroundImage ? /* @__PURE__ */ jsx(
            "img",
            {
              src: backgroundPreviewSrc,
              alt: "Background preview",
              className: styles$g.coverSlotImage
            }
          ) : /* @__PURE__ */ jsx("div", { className: styles$g.emptyState, children: "העלה/י תמונה כדי לראות תצוגה מקדימה." }) }),
          /* @__PURE__ */ jsxs("div", { className: styles$g.uploadRow, children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                className: styles$g.uploadButton,
                size: "small",
                disabled: !cardId,
                "aria-label": "העלאת תמונת רקע",
                onClick: () => {
                  if (!cardId) return;
                  if (editingDisabled) return;
                  backgroundInputRef.current?.click();
                },
                children: "העלאת תמונה"
              }
            ),
            hasBackgroundImage ? /* @__PURE__ */ jsx(
              Button,
              {
                className: styles$g.uploadButton,
                size: "small",
                variant: "danger",
                disabled: !cardId || editingDisabled || isDeletingBackground || isDeletingAvatar,
                loading: isDeletingBackground,
                "aria-label": "הסרת תמונת רקע",
                onClick: () => requestDelete("background"),
                children: "הסרת תמונה"
              }
            ) : null,
            /* @__PURE__ */ jsx(
              "input",
              {
                ref: backgroundInputRef,
                className: styles$g.hiddenFileInput,
                type: "file",
                accept: "image/*",
                disabled: !cardId,
                "aria-disabled": !cardId,
                onChange: (e) => openCropFor(
                  "background",
                  e.target.files?.[0] || null
                )
              }
            )
          ] }),
          !cardId ? /* @__PURE__ */ jsx("p", { className: styles$g.helper, children: "שמור/י את הכרטיס כדי להעלות תמונות." }) : null
        ]
      }
    ),
    template?.supports?.avatar && /* @__PURE__ */ jsxs(
      "section",
      {
        className: styles$g.section,
        "data-tour-id": "editor-tour-upload-avatar-block",
        children: [
          /* @__PURE__ */ jsx("h3", { children: " תמונה אישית (או לוגו)" }),
          /* @__PURE__ */ jsx("div", { className: styles$g.avatarSlot, children: hasAvatarImage ? /* @__PURE__ */ jsx(
            "img",
            {
              src: avatarPreviewSrc,
              alt: "Avatar preview",
              className: styles$g.avatarSlotImage
            }
          ) : /* @__PURE__ */ jsx("div", { className: styles$g.emptyState, children: "העלה/י תמונה כדי לראות תצוגה מקדימה." }) }),
          /* @__PURE__ */ jsxs("div", { className: styles$g.uploadRow, children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                className: styles$g.uploadButton,
                size: "small",
                disabled: !cardId,
                "aria-label": "העלאת תמונת פרופיל",
                onClick: () => {
                  if (!cardId) return;
                  if (editingDisabled) return;
                  avatarInputRef.current?.click();
                },
                children: "העלאת תמונה"
              }
            ),
            hasAvatarImage ? /* @__PURE__ */ jsx(
              Button,
              {
                className: styles$g.uploadButton,
                size: "small",
                variant: "danger",
                disabled: !cardId || editingDisabled || isDeletingAvatar || isDeletingBackground,
                loading: isDeletingAvatar,
                "aria-label": "הסרת תמונת פרופיל",
                onClick: () => requestDelete("avatar"),
                children: "הסרת תמונה"
              }
            ) : null,
            /* @__PURE__ */ jsx(
              "input",
              {
                ref: avatarInputRef,
                className: styles$g.hiddenFileInput,
                type: "file",
                accept: "image/*",
                disabled: !cardId,
                "aria-disabled": !cardId,
                onChange: (e) => openCropFor(
                  "avatar",
                  e.target.files?.[0] || null
                )
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      CropModal,
      {
        open: cropOpen,
        title: cropTitle,
        imageUrl: cropImageUrl,
        aspect: cropAspect,
        cropShape,
        onCancel: handleCancelCrop,
        onApply: handleApplyCrop
      }
    )
  ] });
}
const root$4 = "_root_19um7_1";
const head = "_head_19um7_21";
const title$6 = "_title_19um7_35";
const subtitle$2 = "_subtitle_19um7_51";
const grid$3 = "_grid_19um7_63";
const card = "_card_19um7_75";
const selected = "_selected_19um7_117";
const preview$1 = "_preview_19um7_189";
const meta$2 = "_meta_19um7_243";
const name = "_name_19um7_255";
const groupToggle = "_groupToggle_19um7_269";
const groupBtn = "_groupBtn_19um7_289";
const groupBtnActive = "_groupBtnActive_19um7_333";
const desc = "_desc_19um7_345";
const styles$f = {
  root: root$4,
  head,
  title: title$6,
  subtitle: subtitle$2,
  grid: grid$3,
  card,
  selected,
  preview: preview$1,
  meta: meta$2,
  name,
  groupToggle,
  groupBtn,
  groupBtnActive,
  desc
};
function TemplateSelector({ value, onSelect }) {
  const [activeGroup, setActiveGroup] = useState("light");
  const visibleTemplates = TEMPLATES.filter(
    (tpl) => !tpl?.selfThemeV1 && tpl.group === activeGroup
  );
  return /* @__PURE__ */ jsxs("div", { className: styles$f.root, children: [
    /* @__PURE__ */ jsxs("div", { className: styles$f.head, children: [
      /* @__PURE__ */ jsx("h2", { className: styles$f.title, children: "בחר תבנית" }),
      /* @__PURE__ */ jsx("p", { className: styles$f.subtitle, children: "בחר עיצוב כדי להתחיל לערוך את הכרטיס." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles$f.groupToggle, children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: `${styles$f.groupBtn} ${activeGroup === "light" ? styles$f.groupBtnActive : ""}`,
          onClick: () => setActiveGroup("light"),
          children: "תבניות רקע לבן"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: `${styles$f.groupBtn} ${activeGroup === "dark" ? styles$f.groupBtnActive : ""}`,
          onClick: () => setActiveGroup("dark"),
          "data-tour-id": "editor-tour-template-dark-group",
          children: "תבניות רקע שחור"
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: styles$f.grid, children: visibleTemplates.map((tpl) => {
      const selected2 = value === tpl.id;
      const previewSrc = tpl.previewImage || tpl.preview;
      const description = tpl.description || "";
      return /* @__PURE__ */ jsxs(
        "div",
        {
          className: `${styles$f.card} ${selected2 ? styles$f.selected : ""}`,
          children: [
            /* @__PURE__ */ jsx("div", { className: styles$f.preview, children: /* @__PURE__ */ jsx(
              "img",
              {
                src: previewSrc,
                alt: "",
                "aria-hidden": "true",
                loading: "lazy"
              }
            ) }),
            /* @__PURE__ */ jsxs("div", { className: styles$f.meta, children: [
              /* @__PURE__ */ jsx("div", { className: styles$f.name, children: tpl.name }),
              /* @__PURE__ */ jsx("div", { className: styles$f.desc, children: description })
            ] }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: selected2 ? "primary" : "secondary",
                size: "small",
                "aria-label": `בחר תבנית: ${tpl.name}`,
                "data-tour-id": `editor-tour-template-select-${tpl.id}`,
                onClick: () => onSelect(tpl.id),
                children: selected2 ? "נבחר" : "בחר תבנית"
              }
            )
          ]
        },
        tpl.id
      );
    }) })
  ] });
}
const field$1 = "_field_9k33f_1";
const label$1 = "_label_9k33f_15";
const select = "_select_9k33f_25";
const styles$e = {
  field: field$1,
  label: label$1,
  select
};
function labelForPaletteKey(key) {
  const raw = String(key || "").trim();
  if (!raw) return "";
  return raw.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}
function DesignPanel({
  card: card2,
  design,
  plan,
  onChange,
  onFieldChange,
  cardId,
  editingDisabled,
  onDeleteDesignAsset,
  deleteDesignAssetBusyKind
}) {
  const selectedTemplateId = normalizeTemplateId(design?.templateId);
  const selectedTemplate = getTemplateById(selectedTemplateId);
  const paletteKeys = Array.isArray(selectedTemplate?.customPalettes) ? selectedTemplate.customPalettes : [];
  const defaultPaletteKey = typeof selectedTemplate?.defaultPaletteKey === "string" && paletteKeys.includes(selectedTemplate.defaultPaletteKey) ? selectedTemplate.defaultPaletteKey : paletteKeys[0] || "";
  const currentPaletteKey = typeof design?.customPaletteKey === "string" && paletteKeys.includes(design.customPaletteKey) ? design.customPaletteKey : defaultPaletteKey;
  return /* @__PURE__ */ jsxs(
    Panel,
    {
      title: "ראש הכרטיס\r\n",
      children: [
        paletteKeys.length ? /* @__PURE__ */ jsxs("div", { className: styles$e.field, children: [
          /* @__PURE__ */ jsx("label", { className: styles$e.label, htmlFor: "customPaletteKey", children: "Palette" }),
          /* @__PURE__ */ jsx(
            "select",
            {
              id: "customPaletteKey",
              className: styles$e.select,
              value: currentPaletteKey,
              onChange: (e) => {
                const customPaletteKey = String(e.target.value).trim().toLowerCase();
                onChange?.({
                  ...design || {},
                  customPaletteKey
                });
              },
              children: paletteKeys.map((key) => /* @__PURE__ */ jsx("option", { value: key, children: labelForPaletteKey(key) }, key))
            }
          )
        ] }) : null,
        /* @__PURE__ */ jsx(
          DesignEditor,
          {
            design,
            plan,
            onChange,
            cardId,
            editingDisabled,
            onDeleteDesignAsset,
            deleteDesignAssetBusyKind
          }
        )
      ]
    }
  );
}
const root$3 = "_root_5261s_1";
const title$5 = "_title_5261s_35";
const grid$2 = "_grid_5261s_61";
const row$1 = "_row_5261s_73";
const meta$1 = "_meta_5261s_95";
const label = "_label_5261s_111";
const hint = "_hint_5261s_123";
const controls = "_controls_5261s_135";
const colorInput = "_colorInput_5261s_149";
const hex = "_hex_5261s_179";
const fixButton = "_fixButton_5261s_267";
const styles$d = {
  root: root$3,
  title: title$5,
  grid: grid$2,
  row: row$1,
  meta: meta$1,
  label,
  hint,
  controls,
  colorInput,
  hex,
  fixButton
};
function expandHex3(hex2) {
  const h = hex2.replace("#", "");
  return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
}
function normalizeHex(input) {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(lower)) return lower;
  if (/^#[0-9a-f]{3}$/.test(lower)) return expandHex3(lower).toLowerCase();
  return null;
}
function hexToRgb(hex2) {
  const n = normalizeHex(hex2);
  if (!n) return null;
  const h = n.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}
function relativeLuminance({ r, g, b }) {
  const srgb = [r, g, b].map((v) => v / 255);
  const lin = srgb.map(
    (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return null;
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}
function ColorRow({ id, label: label2, hint: hint2, value, disabled, onChange, ariaLabel }) {
  const normalized = normalizeHex(value) || "#000000";
  return /* @__PURE__ */ jsxs("div", { className: styles$d.row, children: [
    /* @__PURE__ */ jsxs("div", { className: styles$d.meta, children: [
      /* @__PURE__ */ jsx("p", { className: styles$d.label, children: label2 }),
      /* @__PURE__ */ jsx("p", { className: styles$d.hint, children: hint2 })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles$d.controls, children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          id,
          className: styles$d.colorInput,
          type: "color",
          value: normalized,
          disabled,
          "aria-label": ariaLabel,
          onChange: (e) => onChange(e.target.value)
        }
      ),
      /* @__PURE__ */ jsx("div", { className: styles$d.hex, children: normalized.toUpperCase() })
    ] })
  ] });
}
function SelfThemePanel({
  card: card2,
  plan,
  disabled,
  onFieldChange
}) {
  const effectiveSelfTheme = resolveEffectiveSelfThemeV1(card2);
  const bg = effectiveSelfTheme.bg;
  const text2 = effectiveSelfTheme.text;
  const primary2 = effectiveSelfTheme.primary;
  const secondary2 = effectiveSelfTheme.secondary;
  const onPrimary = effectiveSelfTheme.onPrimary;
  const controlsDisabled = Boolean(disabled);
  useMemo(() => contrastRatio(text2, bg), [text2, bg]);
  useMemo(
    () => contrastRatio(onPrimary, primary2),
    [onPrimary, primary2]
  );
  function writeSelfTheme(fieldKey, newValue) {
    if (disabled) return;
    onFieldChange?.("design.selfThemeV1", {
      ...effectiveSelfTheme,
      [fieldKey]: newValue,
      version: 1
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: styles$d.root, dir: "rtl", children: [
    /* @__PURE__ */ jsx("h2", { className: styles$d.title, children: "עיצוב עצמי" }),
    /* @__PURE__ */ jsxs("div", { className: styles$d.grid, children: [
      /* @__PURE__ */ jsx(
        ColorRow,
        {
          id: "selftheme-bg",
          label: "רקע",
          hint: "משפיע על הרקע הראשי של הכרטיס",
          value: bg,
          disabled: controlsDisabled,
          ariaLabel: "בחר צבע רקע",
          onChange: (v) => writeSelfTheme("bg", v)
        }
      ),
      /* @__PURE__ */ jsx(
        ColorRow,
        {
          id: "selftheme-text",
          label: "טקסט",
          hint: "משפיע על צבע הטקסט המרכזי",
          value: text2,
          disabled: controlsDisabled,
          ariaLabel: "בחר צבע טקסט",
          onChange: (v) => writeSelfTheme("text", v)
        }
      ),
      /* @__PURE__ */ jsx(
        ColorRow,
        {
          id: "selftheme-primary",
          label: "צבע ראשי",
          hint: "משפיע על כפתורים ואלמנטים בולטים",
          value: primary2,
          disabled: controlsDisabled,
          ariaLabel: "בחר צבע ראשי",
          onChange: (v) => writeSelfTheme("primary", v)
        }
      ),
      /* @__PURE__ */ jsx(
        ColorRow,
        {
          id: "selftheme-secondary",
          label: "צבע משני",
          hint: "משפיע על דגשים משניים",
          value: secondary2,
          disabled: controlsDisabled,
          ariaLabel: "בחר צבע משני",
          onChange: (v) => writeSelfTheme("secondary", v)
        }
      ),
      /* @__PURE__ */ jsx(
        ColorRow,
        {
          id: "selftheme-onprimary",
          label: "טקסט על כפתורים",
          hint: "משפיע על צבע הטקסט על הכפתורים",
          value: onPrimary,
          disabled: controlsDisabled,
          ariaLabel: "בחר צבע טקסט על כפתורים",
          onChange: (v) => writeSelfTheme("onPrimary", v)
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: styles$d.fixButton,
        disabled: controlsDisabled,
        onClick: () => {
          if (disabled) return;
          const currentTemplateId = card2?.design?.templateId;
          const baseTemplateId = card2?.design?.selfThemeBaseTemplateId;
          const currentTemplate = getTemplateById(currentTemplateId);
          const resolvedBase = getTemplateById(baseTemplateId);
          const isCurrentSelfThemeTemplate = currentTemplate?.selfThemeV1 === true;
          const isKnownBaseTemplate = typeof baseTemplateId === "string" && baseTemplateId.trim().length > 0 && resolvedBase?.id === baseTemplateId && resolvedBase?.selfThemeV1 !== true;
          if (isCurrentSelfThemeTemplate && isKnownBaseTemplate) {
            onFieldChange?.("design.templateId", baseTemplateId);
            onFieldChange?.("design.selfThemeBaseTemplateId", null);
          } else {
            onFieldChange?.("design.selfThemeV1", null);
          }
        },
        children: "איפוס"
      }
    )
  ] });
}
const backdrop$2 = "_backdrop_4uu0n_9";
const modal$2 = "_modal_4uu0n_35";
const header$3 = "_header_4uu0n_65";
const title$4 = "_title_4uu0n_73";
const body$1 = "_body_4uu0n_95";
const bodyLine = "_bodyLine_4uu0n_109";
const actions$3 = "_actions_4uu0n_129";
const button$2 = "_button_4uu0n_151";
const primary$1 = "_primary_4uu0n_213";
const secondary$1 = "_secondary_4uu0n_253";
const busyRow = "_busyRow_4uu0n_279";
const spinner$1 = "_spinner_4uu0n_293";
const styles$c = {
  backdrop: backdrop$2,
  modal: modal$2,
  header: header$3,
  title: title$4,
  body: body$1,
  bodyLine,
  actions: actions$3,
  button: button$2,
  primary: primary$1,
  secondary: secondary$1,
  busyRow,
  spinner: spinner$1
};
function CancelRenewalModal({ open, busy, onConfirm, onClose }) {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  useFocusTrap(dialogRef, open);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      confirmButtonRef.current?.focus?.();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: dialogRef,
      className: styles$c.backdrop,
      role: "alertdialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      "aria-describedby": bodyId,
      onMouseDown: (e) => {
        if (!busy && e.target === e.currentTarget) onClose?.();
      },
      children: /* @__PURE__ */ jsxs("div", { className: styles$c.modal, dir: "rtl", children: [
        /* @__PURE__ */ jsx("div", { className: styles$c.header, children: /* @__PURE__ */ jsx("h2", { id: titleId, className: styles$c.title, children: "ביטול חידוש אוטומטי" }) }),
        /* @__PURE__ */ jsxs("div", { id: bodyId, className: styles$c.body, children: [
          /* @__PURE__ */ jsx("p", { className: styles$c.bodyLine, children: "הכרטיס יישאר Premium עד סוף התקופה ששולמה." }),
          /* @__PURE__ */ jsx("p", { className: styles$c.bodyLine, children: "לא יתבצע חיוב נוסף לאחר מכן." }),
          /* @__PURE__ */ jsx("p", { className: styles$c.bodyLine, children: "ניתן להפעיל מחדש מנוי בעתיד דרך עמוד התמחור." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$c.actions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              ref: confirmButtonRef,
              type: "button",
              className: `${styles$c.button} ${styles$c.primary}`,
              onClick: () => !busy && onConfirm?.(),
              disabled: Boolean(busy),
              children: busy ? /* @__PURE__ */ jsxs("span", { className: styles$c.busyRow, children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$c.spinner,
                    "aria-hidden": "true"
                  }
                ),
                "מבטל..."
              ] }) : "בטל את החידוש"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: `${styles$c.button} ${styles$c.secondary}`,
              onClick: () => !busy && onClose?.(),
              disabled: Boolean(busy),
              children: "חזרה"
            }
          )
        ] })
      ] })
    }
  );
}
function DeletePaymentMethodModal({
  open,
  busy,
  onConfirm,
  onClose
}) {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  useFocusTrap(dialogRef, open);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      confirmButtonRef.current?.focus?.();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: dialogRef,
      className: styles$c.backdrop,
      role: "alertdialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      "aria-describedby": bodyId,
      onMouseDown: (e) => {
        if (!busy && e.target === e.currentTarget) onClose?.();
      },
      children: /* @__PURE__ */ jsxs("div", { className: styles$c.modal, dir: "rtl", children: [
        /* @__PURE__ */ jsx("div", { className: styles$c.header, children: /* @__PURE__ */ jsx("h2", { id: titleId, className: styles$c.title, children: "מחיקת פרטי תשלום שמורים" }) }),
        /* @__PURE__ */ jsxs("div", { id: bodyId, className: styles$c.body, children: [
          /* @__PURE__ */ jsx("p", { className: styles$c.bodyLine, children: "מחיקה זו לא מבטלת את המנוי הנוכחי." }),
          /* @__PURE__ */ jsx("p", { className: styles$c.bodyLine, children: "הגישה Premium תישאר פעילה עד תאריך הסיום." }),
          /* @__PURE__ */ jsx("p", { className: styles$c.bodyLine, children: "לאחר המחיקה לא ניתן יהיה לחדש אוטומטית את המנוי." }),
          /* @__PURE__ */ jsx("p", { className: styles$c.bodyLine, children: "בתום התקופה יהיה צורך לבצע רכישה חדשה." }),
          /* @__PURE__ */ jsx("p", { className: styles$c.bodyLine, children: "לא יתבצע חיוב כעת ולא תישלח קבלה." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$c.actions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              ref: confirmButtonRef,
              type: "button",
              className: `${styles$c.button} ${styles$c.primary}`,
              onClick: () => !busy && onConfirm?.(),
              disabled: Boolean(busy),
              children: busy ? /* @__PURE__ */ jsxs("span", { className: styles$c.busyRow, children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$c.spinner,
                    "aria-hidden": "true"
                  }
                ),
                "מוחק..."
              ] }) : "מחק פרטי תשלום"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: `${styles$c.button} ${styles$c.secondary}`,
              onClick: () => !busy && onClose?.(),
              disabled: Boolean(busy),
              children: "חזרה"
            }
          )
        ] })
      ] })
    }
  );
}
const grid$1 = "_grid_19uve_1";
const strong = "_strong_19uve_13";
const accessLine = "_accessLine_19uve_21";
const urlBlock = "_urlBlock_19uve_29";
const urlTitle = "_urlTitle_19uve_37";
const urlNote = "_urlNote_19uve_63";
const slugBlock = "_slugBlock_19uve_73";
const slugInput = "_slugInput_19uve_83";
const slugHelp = "_slugHelp_19uve_91";
const slugRemaining = "_slugRemaining_19uve_103";
const slugRemainingValue = "_slugRemainingValue_19uve_115";
const slugPreview = "_slugPreview_19uve_125";
const slugActions = "_slugActions_19uve_137";
const slugOk = "_slugOk_19uve_149";
const deleteInline = "_deleteInline_19uve_161";
const spinner = "_spinner_19uve_173";
const accountNote = "_accountNote_19uve_207";
const accountError = "_accountError_19uve_215";
const accountFields = "_accountFields_19uve_223";
const accountRow = "_accountRow_19uve_237";
const accountLabel = "_accountLabel_19uve_251";
const accountValue = "_accountValue_19uve_261";
const accountOrgs = "_accountOrgs_19uve_271";
const orgList = "_orgList_19uve_285";
const billingRow = "_billingRow_19uve_309";
const billingLabel = "_billingLabel_19uve_323";
const billingValue = "_billingValue_19uve_333";
const billingNote = "_billingNote_19uve_343";
const billingError = "_billingError_19uve_353";
const billingActions = "_billingActions_19uve_361";
const billingDisclosure = "_billingDisclosure_19uve_375";
const billingDisclosureLink = "_billingDisclosureLink_19uve_395";
const billingOptIn = "_billingOptIn_19uve_407";
const billingOptInLabel = "_billingOptInLabel_19uve_421";
const pwSuccess = "_pwSuccess_19uve_437";
const pwActions = "_pwActions_19uve_445";
const pwChecklist = "_pwChecklist_19uve_461";
const pwChecklistItem = "_pwChecklistItem_19uve_481";
const pwChecklistItemMet = "_pwChecklistItemMet_19uve_509";
const dangerText = "_dangerText_19uve_531";
const dangerError = "_dangerError_19uve_541";
const dangerActions = "_dangerActions_19uve_549";
const section$3 = "_section_19uve_565";
const sectionTitle$2 = "_sectionTitle_19uve_583";
const collapsible$1 = "_collapsible_19uve_607";
const collapsibleTrigger$1 = "_collapsibleTrigger_19uve_617";
const collapsibleContent$1 = "_collapsibleContent_19uve_703";
const collapsibleDanger = "_collapsibleDanger_19uve_721";
const lockedBlock$2 = "_lockedBlock_19uve_741";
const lockedTitle$2 = "_lockedTitle_19uve_761";
const lockedText$2 = "_lockedText_19uve_773";
const lockedCta$2 = "_lockedCta_19uve_785";
const commPrefRow = "_commPrefRow_19uve_827";
const commPrefInfo = "_commPrefInfo_19uve_877";
const commPrefHint = "_commPrefHint_19uve_893";
const cancelRenewalBlock = "_cancelRenewalBlock_19uve_907";
const renewalWarning = "_renewalWarning_19uve_927";
const renewalWarningTitle = "_renewalWarningTitle_19uve_947";
const renewalWarningText = "_renewalWarningText_19uve_959";
const renewalWarningActions = "_renewalWarningActions_19uve_971";
const renewalWarningCta = "_renewalWarningCta_19uve_985";
const renewalWarningHelp = "_renewalWarningHelp_19uve_1023";
const receiptsBlock = "_receiptsBlock_19uve_1041";
const receiptsList = "_receiptsList_19uve_1055";
const receiptRow = "_receiptRow_19uve_1073";
const receiptMain = "_receiptMain_19uve_1099";
const receiptDate = "_receiptDate_19uve_1117";
const receiptMeta = "_receiptMeta_19uve_1129";
const receiptDownloadLink = "_receiptDownloadLink_19uve_1141";
const receiptProfileBlock = "_receiptProfileBlock_19uve_1183";
const receiptProfileFields = "_receiptProfileFields_19uve_1199";
const receiptProfileSelectRow = "_receiptProfileSelectRow_19uve_1211";
const receiptProfileSelectLabel = "_receiptProfileSelectLabel_19uve_1225";
const receiptProfileSelect = "_receiptProfileSelect_19uve_1211";
const styles$b = {
  grid: grid$1,
  strong,
  accessLine,
  urlBlock,
  urlTitle,
  urlNote,
  slugBlock,
  slugInput,
  slugHelp,
  slugRemaining,
  slugRemainingValue,
  slugPreview,
  slugActions,
  slugOk,
  deleteInline,
  spinner,
  accountNote,
  accountError,
  accountFields,
  accountRow,
  accountLabel,
  accountValue,
  accountOrgs,
  orgList,
  billingRow,
  billingLabel,
  billingValue,
  billingNote,
  billingError,
  billingActions,
  billingDisclosure,
  billingDisclosureLink,
  billingOptIn,
  billingOptInLabel,
  pwSuccess,
  pwActions,
  pwChecklist,
  pwChecklistItem,
  pwChecklistItemMet,
  dangerText,
  dangerError,
  dangerActions,
  section: section$3,
  sectionTitle: sectionTitle$2,
  collapsible: collapsible$1,
  collapsibleTrigger: collapsibleTrigger$1,
  collapsibleContent: collapsibleContent$1,
  collapsibleDanger,
  lockedBlock: lockedBlock$2,
  lockedTitle: lockedTitle$2,
  lockedText: lockedText$2,
  lockedCta: lockedCta$2,
  commPrefRow,
  commPrefInfo,
  commPrefHint,
  cancelRenewalBlock,
  renewalWarning,
  renewalWarningTitle,
  renewalWarningText,
  renewalWarningActions,
  renewalWarningCta,
  renewalWarningHelp,
  receiptsBlock,
  receiptsList,
  receiptRow,
  receiptMain,
  receiptDate,
  receiptMeta,
  receiptDownloadLink,
  receiptProfileBlock,
  receiptProfileFields,
  receiptProfileSelectRow,
  receiptProfileSelectLabel,
  receiptProfileSelect
};
function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "";
  }
}
function SettingsPanel({
  card: card2,
  plan,
  onDelete,
  editingDisabled,
  isDeleting,
  onPublish,
  onUnpublish,
  onUpdateSlug
}) {
  const { isAuthenticated, logout } = useAuth();
  const slug = card2?.slug;
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError2, setAccountError] = useState("");
  const accountFetched = useRef(false);
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState("");
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess2, setPwSuccess] = useState("");
  const [pwConfirmError, setPwConfirmError] = useState("");
  const [pwNewError, setPwNewError] = useState("");
  const [pwNewTouched, setPwNewTouched] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingMsg, setBillingMsg] = useState("");
  const [yearlyOptIn, setYearlyOptIn] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [deletePaymentMethodModalOpen, setDeletePaymentMethodModalOpen] = useState(false);
  const [deletePaymentMethodBusy, setDeletePaymentMethodBusy] = useState(false);
  const [deletePaymentMethodError, setDeletePaymentMethodError] = useState("");
  const [deletePaymentMethodSuccess, setDeletePaymentMethodSuccess] = useState(false);
  const [mktBusy, setMktBusy] = useState(false);
  const [mktError, setMktError] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameOk, setNameOk] = useState("");
  const [receiptProfileDraft, setReceiptProfileDraft] = useState({
    recipientType: "",
    name: "",
    nameInvoice: "",
    email: "",
    numberId: "",
    address: "",
    city: "",
    zipCode: ""
  });
  const [receiptProfileClearNumberId, setReceiptProfileClearNumberId] = useState(false);
  const [receiptProfileBusy, setReceiptProfileBusy] = useState(false);
  const [receiptProfileError, setReceiptProfileError] = useState("");
  const [receiptProfileOk, setReceiptProfileOk] = useState("");
  const [delCardConfirm, setDelCardConfirm] = useState("");
  const [delConfirm, setDelConfirm] = useState("");
  const [delPassword, setDelPassword] = useState("");
  const [delSubmitting, setDelSubmitting] = useState(false);
  const [delError, setDelError] = useState("");
  const [delBlockOrgs, setDelBlockOrgs] = useState(null);
  const [delDone, setDelDone] = useState(false);
  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDelError("");
    setDelBlockOrgs(null);
    if (delConfirm.trim() !== "מחיקה" || !delPassword.trim()) {
      setDelError("יש למלא את כל השדות בצורה תקינה.");
      return;
    }
    setDelSubmitting(true);
    try {
      const result = await deleteAccount({
        confirm: delConfirm.trim(),
        password: delPassword
      });
      if (result?.ok) {
        setDelDone(true);
        setTimeout(() => {
          logout();
          window.location.href = "/";
        }, 3e3);
        return;
      }
      if (result?.code === "SOLE_ORG_ADMIN" && result?.orgs) {
        setDelBlockOrgs(result.orgs);
        return;
      }
      setDelError("לא ניתן למחוק חשבון.");
    } catch (err) {
      const status2 = err?.response?.status;
      if (status2 === 429) {
        setDelError("יותר מדי ניסיונות, נסה שוב מאוחר יותר.");
      } else {
        setDelError("לא ניתן למחוק חשבון.");
      }
    } finally {
      setDelSubmitting(false);
    }
  }
  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    setPwConfirmError("");
    setPwNewError("");
    setPwNewTouched(true);
    if (!pwCurrent.trim()) {
      setPwError("יש למלא את כל השדות.");
      return;
    }
    const pwResult = validatePasswordPolicy(pwNew);
    if (!pwResult.ok) {
      setPwNewError(getPasswordPolicyMessage(pwResult.code));
      return;
    }
    if (!pwConfirm) {
      setPwConfirmError("שדה אימות הסיסמה הוא חובה");
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwConfirmError("הסיסמאות לא תואמות.");
      return;
    }
    setPwSubmitting(true);
    try {
      await changePassword({
        currentPassword: pwCurrent,
        newPassword: pwNew
      });
      setPwSuccess("הסיסמה שונתה בהצלחה.");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setPwConfirmError("");
      setPwNewError("");
      setPwNewTouched(false);
    } catch (err) {
      const code = err?.response?.data?.code;
      const status2 = err?.response?.status;
      if (typeof code === "string" && code.startsWith("PASSWORD_")) {
        setPwNewError(getPasswordPolicyMessage(code));
        setPwNewTouched(true);
      } else if (status2 === 429 || code === "RATE_LIMITED") {
        setPwError("יותר מדי ניסיונות. נסה שוב מאוחר יותר.");
      } else {
        setPwError("לא הצלחנו לשנות את הסיסמה.");
      }
    } finally {
      setPwSubmitting(false);
    }
  }
  async function handleCancelRenewal() {
    setCancelError("");
    setCancelBusy(true);
    try {
      const res = await cancelRenewal();
      setAccount((prev) => ({
        ...prev,
        autoRenewal: res?.autoRenewal ?? prev?.autoRenewal,
        paymentMethod: res?.paymentMethod ?? prev?.paymentMethod
      }));
      setCancelModalOpen(false);
    } catch (err) {
      const status2 = err?.response?.status;
      if (status2 === 429) {
        setCancelError("בוצעו יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
      } else {
        setCancelError(
          "לא ניתן לבטל את החידוש כרגע. נסו שוב מאוחר יותר."
        );
      }
      setCancelModalOpen(false);
    } finally {
      setCancelBusy(false);
    }
  }
  async function handleResumeRenewal() {
    setResumeError("");
    setResumeBusy(true);
    try {
      const res = await resumeAutoRenewal();
      setAccount(
        (prev) => prev ? {
          ...prev,
          autoRenewal: res?.autoRenewal ?? prev?.autoRenewal,
          paymentMethod: res?.paymentMethod ?? prev?.paymentMethod
        } : prev
      );
    } catch (err) {
      const status2 = err?.response?.status;
      const messageKey = err?.response?.data?.messageKey;
      if (status2 === 429) {
        setResumeError("בוצעו יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
      } else if (messageKey === "resume_unavailable") {
        setResumeError("האפשרות אינה זמינה כרגע. נסו שוב מאוחר יותר.");
      } else if (messageKey === "subscription_not_active" || messageKey === "subscription_expired") {
        setResumeError(
          "המנוי אינו פעיל כרגע. ניתן להסדיר חידוש לאחר סיום התקופה."
        );
      } else if (messageKey === "wrong_provider") {
        setResumeError(
          "לא ניתן להפעיל חידוש אוטומטי עבור סוג המנוי הנוכחי."
        );
      } else if (messageKey === "unsupported_plan") {
        setResumeError("סוג המנוי אינו נתמך לחידוש אוטומטי.");
      } else if (messageKey === "already_active") {
        setResumeError("החידוש האוטומטי כבר פעיל.");
      } else if (messageKey === "renewal_in_progress") {
        setResumeError("חידוש אוטומטי כבר נמצא בתהליך.");
      } else if (messageKey === "renewal_not_cancelled") {
        setResumeError("אין חידוש אוטומטי מבוטל להפעלה מחדש.");
      } else if (messageKey === "token_missing" || messageKey === "token_expired") {
        setResumeError(
          "לא ניתן להפעיל מחדש את החידוש האוטומטי עם פרטי התשלום הקיימים. ניתן לפנות לתמיכה."
        );
      } else {
        setResumeError(
          "לא הצלחנו להפעיל מחדש את החידוש האוטומטי. נסו שוב מאוחר יותר."
        );
      }
    } finally {
      setResumeBusy(false);
    }
  }
  async function handleDeletePaymentMethod() {
    setDeletePaymentMethodError("");
    setDeletePaymentMethodSuccess(false);
    setDeletePaymentMethodBusy(true);
    try {
      const res = await deletePaymentMethod();
      setAccount(
        (prev) => prev ? {
          ...prev,
          paymentMethod: res?.paymentMethod ?? {
            saved: false,
            expired: false,
            canDelete: false
          },
          autoRenewal: res?.autoRenewal ?? prev?.autoRenewal
        } : prev
      );
      setDeletePaymentMethodModalOpen(false);
      setDeletePaymentMethodSuccess(true);
    } catch (err) {
      const status2 = err?.response?.status;
      const messageKey = err?.response?.data?.messageKey;
      setDeletePaymentMethodModalOpen(false);
      if (status2 === 429) {
        setDeletePaymentMethodError(
          "בוצעו יותר מדי ניסיונות. נסו שוב מאוחר יותר."
        );
      } else if (messageKey === "payment_method_sto_not_deletable") {
        setDeletePaymentMethodError(
          "לא ניתן למחוק פרטי תשלום בזמן שחידוש אוטומטי פעיל. בטל תחילה את החידוש האוטומטי."
        );
      } else if (messageKey === "payment_method_in_flight") {
        setDeletePaymentMethodError(
          "פעולה זו כבר מתבצעת. נסו שוב בעוד רגע."
        );
      } else {
        setDeletePaymentMethodError(
          "לא הצלחנו למחוק את פרטי התשלום. נסו שוב מאוחר יותר."
        );
      }
    } finally {
      setDeletePaymentMethodBusy(false);
    }
  }
  useEffect(() => {
    if (!isAuthenticated || accountFetched.current) return;
    accountFetched.current = true;
    setAccountLoading(true);
    setAccountError("");
    getAccountSummary().then((data) => setAccount(data)).catch(() => setAccountError("לא הצלחנו לטעון את פרטי החשבון.")).finally(() => setAccountLoading(false));
    setReceiptsLoading(true);
    setReceiptsError("");
    getReceipts(12).then(
      (data) => setReceipts(Array.isArray(data?.receipts) ? data.receipts : [])
    ).catch(() => setReceiptsError("לא ניתן לטעון קבלות.")).finally(() => setReceiptsLoading(false));
  }, [isAuthenticated]);
  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  const publicPath = card2?.publicPath || null;
  const publicUrl = publicPath ? `${origin}${publicPath}` : "";
  const isPublished = card2?.status === "published";
  const isPublicLink = isAuthenticated && isPublished;
  const [slugDraft, setSlugDraft] = useState(() => String(slug || ""));
  const [slugBusy, setSlugBusy] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [slugOk2, setSlugOk] = useState("");
  const slugLimit = 2;
  const slugRemainingRaw = card2?.slugPolicy?.remaining;
  const slugRemaining2 = Number.isFinite(Number(slugRemainingRaw)) ? Math.max(0, Math.min(slugLimit, Number(slugRemainingRaw))) : null;
  useEffect(() => {
    setSlugDraft(String(slug || ""));
    setSlugError("");
    setSlugOk("");
  }, [slug]);
  useEffect(() => {
    setNameDraft(String(account?.firstName || ""));
    setNameError("");
    setNameOk("");
  }, [account?.firstName]);
  useEffect(() => {
    const rp = account?.receiptProfile ?? null;
    setReceiptProfileDraft({
      recipientType: rp?.recipientType ?? "",
      name: rp?.name ?? "",
      nameInvoice: rp?.nameInvoice ?? "",
      email: rp?.email ?? "",
      numberId: "",
      address: rp?.address ?? "",
      city: rp?.city ?? "",
      zipCode: rp?.zipCode ?? ""
    });
    setReceiptProfileClearNumberId(false);
    setReceiptProfileError("");
    setReceiptProfileOk("");
  }, [account?.receiptProfile]);
  const isReceiptProfileDirty = useMemo(() => {
    const rp = account?.receiptProfile ?? null;
    if (receiptProfileClearNumberId) return true;
    if (receiptProfileDraft.numberId.trim() !== "") return true;
    const textFields = [
      "name",
      "nameInvoice",
      "email",
      "address",
      "city",
      "zipCode"
    ];
    for (const field2 of textFields) {
      const draftValue = receiptProfileDraft[field2].trim();
      const serverValue = (rp?.[field2] ?? "").trim();
      if (draftValue !== serverValue) return true;
    }
    const draftType = receiptProfileDraft.recipientType || null;
    const serverType = rp?.recipientType ?? null;
    return draftType !== serverType;
  }, [
    receiptProfileDraft,
    receiptProfileClearNumberId,
    account?.receiptProfile
  ]);
  const canEditSlug = useMemo(() => {
    return isAuthenticated && card2?.status === "draft" && !editingDisabled && typeof onUpdateSlug === "function";
  }, [isAuthenticated, card2?.status, editingDisabled, onUpdateSlug]);
  const publicPathPrefix = useMemo(() => {
    if (!publicPath) return null;
    const parts = String(publicPath).split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `/${parts.slice(0, -1).join("/")}`;
  }, [publicPath]);
  const previewUrl = useMemo(() => {
    if (!publicPathPrefix) return "";
    const s = String(slugDraft || "").trim();
    return s ? `${origin}${publicPathPrefix}/${s}` : "";
  }, [slugDraft, origin, publicPathPrefix]);
  function mapSlugError(err) {
    const code = err?.response?.data?.code;
    if (code === "INVALID_SLUG") return "סלאג לא תקין.";
    if (code === "SLUG_TAKEN") return "הסלאג כבר תפוס.";
    if (code === "SLUG_ONLY_DRAFT") return "אפשר לשנות סלאג רק בטיוטה.";
    if (code === "SLUG_REQUIRES_AUTH")
      return "כדי לבחור סלאג מותאם יש להתחבר.";
    if (code === "SLUG_CHANGE_LIMIT") return "הגעת למגבלת 2 שינויים בחודש.";
    return "לא הצלחנו לעדכן סלאג.";
  }
  async function handleSlugSave() {
    if (!canEditSlug) return;
    const nextSlug = String(slugDraft || "").trim();
    if (!nextSlug) {
      setSlugError("יש להזין סלאג.");
      return;
    }
    setSlugBusy(true);
    setSlugError("");
    setSlugOk("");
    try {
      const updated = await onUpdateSlug(nextSlug);
      const s = String(updated || "").trim();
      if (s) {
        setSlugDraft(s);
        setSlugOk("הסלאג עודכן.");
      } else {
        setSlugOk("הסלאג עודכן.");
      }
    } catch (err) {
      setSlugError(mapSlugError(err));
    } finally {
      setSlugBusy(false);
    }
  }
  function validateReceiptProfileDraft(draft) {
    if (draft.name.trim().length > 200) {
      return "שם לקבלה ארוך מדי (מקסימום 200 תווים).";
    }
    if (draft.nameInvoice.trim().length > 200) {
      return "שם עסק / שם לחשבונית ארוך מדי (מקסימום 200 תווים).";
    }
    const emailTrim = draft.email.trim();
    if (emailTrim !== "") {
      if (emailTrim.length > 200) {
        return "דוא״ל ארוך מדי (מקסימום 200 תווים).";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        return "כתובת דוא״ל לא תקינה.";
      }
    }
    const idTrim = draft.numberId.trim();
    if (idTrim !== "") {
      if (idTrim.length > 32) {
        return "מספר מזהה ארוך מדי (מקסימום 32 תווים).";
      }
      if (!/^[a-zA-Z0-9-]*$/.test(idTrim)) {
        return "מספר מזהה מכיל תווים לא חוקיים. מותרים: ספרות, אותיות, מקף.";
      }
    }
    if (draft.address.trim().length > 300) {
      return "כתובת ארוכה מדי (מקסימום 300 תווים).";
    }
    if (draft.city.trim().length > 100) {
      return "עיר ארוכה מדי (מקסימום 100 תווים).";
    }
    if (draft.zipCode.trim().length > 20) {
      return "מיקוד ארוך מדי (מקסימום 20 תווים).";
    }
    return null;
  }
  function buildReceiptProfilePayload(draft, clearNumberId, serverProfile) {
    const rp = serverProfile ?? null;
    const payload = {};
    const draftType = draft.recipientType || null;
    const serverType = rp?.recipientType ?? null;
    if (draftType !== serverType) {
      payload.recipientType = draftType;
    }
    const textFields = [
      "name",
      "nameInvoice",
      "email",
      "address",
      "city",
      "zipCode"
    ];
    for (const field2 of textFields) {
      const draftValue = draft[field2].trim();
      const serverValue = (rp?.[field2] ?? "").trim();
      if (draftValue !== serverValue) {
        payload[field2] = draftValue === "" ? null : draftValue;
      }
    }
    if (clearNumberId) {
      payload.numberId = null;
    } else if (draft.numberId.trim() !== "") {
      payload.numberId = draft.numberId.trim();
    }
    return payload;
  }
  async function handleReceiptProfileSave() {
    setReceiptProfileError("");
    setReceiptProfileOk("");
    const validationError = validateReceiptProfileDraft(receiptProfileDraft);
    if (validationError) {
      setReceiptProfileError(validationError);
      return;
    }
    const payload = buildReceiptProfilePayload(
      receiptProfileDraft,
      receiptProfileClearNumberId,
      account?.receiptProfile ?? null
    );
    if (Object.keys(payload).length === 0) {
      setReceiptProfileOk("לא בוצעו שינויים.");
      return;
    }
    setReceiptProfileBusy(true);
    try {
      const data = await updateReceiptProfile(payload);
      setAccount(
        (prev) => prev ? { ...prev, receiptProfile: data.receiptProfile ?? null } : prev
      );
      setReceiptProfileClearNumberId(false);
      setReceiptProfileOk("פרטי הקבלה נשמרו.");
    } catch (err) {
      const status2 = err?.response?.status;
      if (status2 === 429) {
        setReceiptProfileError(
          "יותר מדי ניסיונות. נסו שוב מאוחר יותר."
        );
      } else if (status2 === 400) {
        const message = err?.response?.data?.message;
        setReceiptProfileError(
          typeof message === "string" && message.length < 200 ? message : "נתונים לא תקינים. בדקו את הפרטים ונסו שנית."
        );
      } else {
        setReceiptProfileError("לא הצלחנו לשמור את פרטי הקבלה.");
      }
    } finally {
      setReceiptProfileBusy(false);
    }
  }
  async function handleNameSave() {
    const next = nameDraft.trim();
    if (!next) {
      setNameError("שדה השם הפרטי הוא חובה");
      return;
    }
    if (next.length > 100) {
      setNameError("השם הפרטי ארוך מדי (מקסימום 100 תווים)");
      return;
    }
    setNameBusy(true);
    setNameError("");
    setNameOk("");
    try {
      const data = await updateAccountName({ firstName: next });
      setAccount((prev) => ({
        ...prev,
        firstName: data?.firstName ?? next
      }));
      setNameOk("השם עודכן.");
    } catch (err) {
      const status2 = err?.response?.status;
      if (status2 === 429) {
        setNameError("יותר מדי ניסיונות, נסה שוב מאוחר יותר.");
      } else {
        setNameError("לא הצלחנו לעדכן את השם.");
      }
    } finally {
      setNameBusy(false);
    }
  }
  async function handleMarketingToggle(nextValue) {
    if (mktBusy || !account) return;
    const currentChecked = account.emailMarketingConsent === true;
    if (nextValue === currentChecked) return;
    const prevConsent = account.emailMarketingConsent;
    setMktError("");
    setMktBusy(true);
    setAccount((prev) => ({
      ...prev,
      emailMarketingConsent: nextValue
    }));
    try {
      const data = await updateEmailPreferences({
        emailMarketingConsent: nextValue
      });
      setAccount((prev) => ({
        ...prev,
        emailMarketingConsent: data?.emailMarketingConsent ?? nextValue,
        emailMarketingConsentAt: data?.emailMarketingConsentAt ?? null,
        emailMarketingConsentVersion: data?.emailMarketingConsentVersion ?? null,
        emailMarketingConsentSource: data?.emailMarketingConsentSource ?? null
      }));
    } catch {
      setAccount((prev) => ({
        ...prev,
        emailMarketingConsent: prevConsent
      }));
      setMktError("לא הצלחנו לשמור את ההעדפה. נסו שוב.");
    } finally {
      setMktBusy(false);
    }
  }
  const eb = card2?.effectiveBilling || null;
  const accessUntil = eb?.until ? formatDate(eb.until) : "";
  let accessLine2 = "";
  if (eb?.source === "adminOverride") {
    accessLine2 = accessUntil ? `גישה אדמינית עד ${accessUntil}` : "גישה אדמינית פעילה";
  } else if (eb?.source === "billing") {
    accessLine2 = accessUntil ? `בתשלום עד ${accessUntil}` : "בתשלום";
  } else if (eb?.source === "trial") {
    accessLine2 = accessUntil ? `ניסיון עד ${accessUntil}` : "ניסיון פעיל";
  } else if (eb?.isEntitled === false) {
    accessLine2 = "אין גישה";
  }
  const entCanPublish = card2?.entitlements?.canPublish === true;
  const entCanChangeSlug = card2?.entitlements?.canChangeSlug === true;
  const canPublish = isAuthenticated && Boolean(card2?._id) && !editingDisabled && entCanPublish;
  const deleteCardBlock = /* @__PURE__ */ jsxs(
    "details",
    {
      className: `${styles$b.collapsible} ${styles$b.collapsibleDanger}`,
      children: [
        /* @__PURE__ */ jsx("summary", { className: styles$b.collapsibleTrigger, children: "מחיקת כרטיס" }),
        /* @__PURE__ */ jsxs("div", { className: styles$b.collapsibleContent, children: [
          /* @__PURE__ */ jsx("div", { className: styles$b.dangerText, children: "מחיקת הכרטיס תמחק לצמיתות את הכרטיס, הקישור הציבורי, תמונות, לידים ונתוני אנליטיקה." }),
          /* @__PURE__ */ jsx("div", { className: styles$b.dangerText, children: "הקישור הציבורי של הכרטיס יפסיק לעבוד מיד." }),
          /* @__PURE__ */ jsx("div", { className: styles$b.dangerText, children: "לא ניתן לשחזר." }),
          /* @__PURE__ */ jsx(
            Input,
            {
              label: 'הקלד "מחיקה" לאישור',
              value: delCardConfirm,
              onChange: (e) => setDelCardConfirm(e.target.value),
              placeholder: "מחיקה",
              autoComplete: "off",
              disabled: Boolean(isDeleting)
            }
          ),
          /* @__PURE__ */ jsx("div", { className: styles$b.dangerActions, children: /* @__PURE__ */ jsx(
            Button,
            {
              variant: "ghost",
              onClick: onDelete,
              disabled: !card2?._id || Boolean(isDeleting) || delCardConfirm.trim() !== "מחיקה",
              children: isDeleting ? /* @__PURE__ */ jsxs("span", { className: styles$b.deleteInline, children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$b.spinner,
                    "aria-hidden": "true"
                  }
                ),
                "מוחק..."
              ] }) : "מחק כרטיס"
            }
          ) })
        ] })
      ]
    }
  );
  return /* @__PURE__ */ jsxs(Panel, { title: "הגדרות", children: [
    /* @__PURE__ */ jsxs("div", { className: styles$b.grid, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$b.section, children: [
        /* @__PURE__ */ jsx("div", { className: styles$b.sectionTitle, children: "כרטיס" }),
        /* @__PURE__ */ jsxs("div", { className: styles$b.strong, children: [
          "סטטוס:",
          " ",
          isPublicLink ? "פורסם (הקישור הציבורי פעיל)" : "עדיין לא פורסם (הקישור הציבורי עדיין לא פעיל) "
        ] }),
        accessLine2 && /* @__PURE__ */ jsx("div", { className: styles$b.accessLine, children: accessLine2 }),
        !entCanPublish ? /* @__PURE__ */ jsxs("div", { className: styles$b.lockedBlock, children: [
          /* @__PURE__ */ jsx("div", { className: styles$b.lockedTitle, children: "פרסום זמין רק בפרימיום" }),
          /* @__PURE__ */ jsx("div", { className: styles$b.lockedText, children: "כדי לפרסם את הכרטיס - צריך מסלול פרימיום." }),
          /* @__PURE__ */ jsx("a", { href: "/pricing", className: styles$b.lockedCta, children: "שדרג לפרימיום" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          isAuthenticated && card2?.status !== "published" && /* @__PURE__ */ jsx(
            Button,
            {
              variant: "primary",
              disabled: !canPublish,
              onClick: () => onPublish?.(),
              "data-tour-id": "editor-mini-guide-publish-btn",
              children: "פרסום"
            }
          ),
          isAuthenticated && card2?.status === "published" && /* @__PURE__ */ jsx(
            Button,
            {
              variant: "secondary",
              disabled: !Boolean(card2?._id) || editingDisabled,
              onClick: () => onUnpublish?.(),
              children: "החזרה לטיוטה"
            }
          )
        ] }),
        publicUrl && isPublicLink && /* @__PURE__ */ jsxs("div", { className: styles$b.urlBlock, children: [
          /* @__PURE__ */ jsx("div", { className: styles$b.urlTitle, children: "קישור ציבורי" }),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: publicUrl,
              target: "_blank",
              rel: "noreferrer",
              children: publicUrl
            }
          )
        ] }),
        publicUrl && !isPublicLink && /* @__PURE__ */ jsxs("div", { className: styles$b.urlBlock, children: [
          /* @__PURE__ */ jsx("div", { className: styles$b.urlTitle, children: "קישור עתידי" }),
          /* @__PURE__ */ jsx("div", { children: publicUrl }),
          /* @__PURE__ */ jsx("div", { className: styles$b.urlNote, children: isAuthenticated ? "הקישור יהפוך לציבורי לאחר פרסום הכרטיס." : "הקישור יהפוך לציבורי אחרי הרשמה ופרסום הכרטיס." })
        ] }),
        !publicUrl && /* @__PURE__ */ jsxs("div", { className: styles$b.urlBlock, children: [
          /* @__PURE__ */ jsx("div", { className: styles$b.urlTitle, children: "קישור ציבורי" }),
          /* @__PURE__ */ jsx("div", { className: styles$b.urlNote, children: "הקישור יופיע אחרי פרסום הכרטיס." })
        ] }),
        isAuthenticated && /* @__PURE__ */ jsxs("div", { className: styles$b.slugBlock, children: [
          /* @__PURE__ */ jsx("div", { className: styles$b.urlTitle, children: "סלאג (כתובת קצרה)" }),
          !entCanChangeSlug ? /* @__PURE__ */ jsxs("div", { className: styles$b.lockedBlock, children: [
            /* @__PURE__ */ jsx("div", { className: styles$b.lockedTitle, children: "שינוי כתובת קצרה זמין רק בפרימיום" }),
            /* @__PURE__ */ jsx("div", { className: styles$b.lockedText, children: "כדי לשנות את הכתובת הקצרה של הכרטיס - צריך מסלול פרימיום." }),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/pricing",
                className: styles$b.lockedCta,
                children: "שדרג לפרימיום"
              }
            )
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                label: publicPathPrefix ? `לאחר ‎${publicPathPrefix}/‎` : "סלאג",
                value: slugDraft,
                onChange: (e) => {
                  setSlugDraft(e.target.value);
                  setSlugError("");
                  setSlugOk("");
                },
                placeholder: "my-business",
                dir: "ltr",
                autoComplete: "off",
                spellCheck: false,
                className: styles$b.slugInput,
                error: slugError,
                disabled: !canEditSlug || slugBusy,
                "data-tour-id": "editor-mini-guide-slug-input"
              }
            ),
            /* @__PURE__ */ jsx("div", { className: styles$b.slugHelp, children: "אפשר לשנות סלאג רק בטיוטה ועד פעמיים בחודש." }),
            /* @__PURE__ */ jsxs("div", { className: styles$b.slugRemaining, children: [
              "נותרו",
              " ",
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: styles$b.slugRemainingValue,
                  children: slugRemaining2 === null ? `-/${slugLimit}` : `${slugRemaining2}/${slugLimit}`
                }
              ),
              " ",
              "שינויים החודש."
            ] }),
            previewUrl ? /* @__PURE__ */ jsx(
              "div",
              {
                className: styles$b.slugPreview,
                dir: "ltr",
                children: previewUrl
              }
            ) : null,
            slugOk2 ? /* @__PURE__ */ jsx("div", { className: styles$b.slugOk, children: slugOk2 }) : null,
            /* @__PURE__ */ jsx("div", { className: styles$b.slugActions, children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "secondary",
                disabled: !canEditSlug || slugBusy || String(
                  slugDraft || ""
                ).trim() === String(slug || "").trim(),
                onClick: handleSlugSave,
                children: slugBusy ? "מעדכן..." : "עדכון סלאג"
              }
            ) })
          ] })
        ] })
      ] }),
      !isAuthenticated && /* @__PURE__ */ jsx("div", { className: styles$b.section, children: deleteCardBlock }),
      isAuthenticated && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: styles$b.section, children: [
          /* @__PURE__ */ jsx("div", { className: styles$b.sectionTitle, children: "חשבון" }),
          accountLoading && /* @__PURE__ */ jsx("div", { className: styles$b.accountNote, children: "טוען..." }),
          accountError2 && /* @__PURE__ */ jsx("div", { className: styles$b.accountError, children: accountError2 }),
          account && !accountLoading && /* @__PURE__ */ jsxs("div", { className: styles$b.accountFields, children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                label: "שם פרטי",
                type: "text",
                autoComplete: "given-name",
                value: nameDraft,
                onChange: (e) => {
                  setNameDraft(e.target.value);
                  setNameError("");
                  setNameOk("");
                },
                error: nameError,
                disabled: nameBusy
              }
            ),
            nameOk && /* @__PURE__ */ jsx("div", { className: styles$b.slugOk, children: nameOk }),
            /* @__PURE__ */ jsx("div", { className: styles$b.slugActions, children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "secondary",
                loading: nameBusy,
                disabled: nameBusy || !nameDraft.trim() || nameDraft.trim() === String(
                  account?.firstName || ""
                ),
                onClick: handleNameSave,
                children: "שמירה"
              }
            ) }),
            /* @__PURE__ */ jsxs("div", { className: styles$b.accountRow, children: [
              /* @__PURE__ */ jsx("span", { className: styles$b.accountLabel, children: "אימייל:" }),
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: styles$b.accountValue,
                  dir: "ltr",
                  children: account.email || "-"
                }
              )
            ] }),
            account.orgMemberships?.length > 0 && /* @__PURE__ */ jsxs("div", { className: styles$b.accountOrgs, children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: styles$b.accountLabel,
                  children: "ארגונים:"
                }
              ),
              /* @__PURE__ */ jsx("ul", { className: styles$b.orgList, children: account.orgMemberships.map(
                (m) => /* @__PURE__ */ jsx("li", { children: m.orgName || m.orgSlug }, m.orgId)
              ) })
            ] })
          ] })
        ] }),
        (() => {
          const sub = account?.subscription || {};
          const acPlan = account?.plan || "free";
          const subStatus = sub.status || "inactive";
          const expiresAt = sub.expiresAt || null;
          const provider = sub.provider || null;
          const isExpired = Boolean(expiresAt) && new Date(expiresAt).getTime() < Date.now();
          const showCta = acPlan === "free" || subStatus !== "active" || isExpired;
          const autoRenewal = account?.autoRenewal ?? {
            status: "none",
            canCancel: false
          };
          const renewalStatus = autoRenewal.status ?? "none";
          const renewalPaidUntil = autoRenewal.subscriptionExpiresAt ?? null;
          const renewalFailedAt = autoRenewal?.renewalFailedAt ?? null;
          const showRenewalFailedBanner = renewalFailedAt !== null && renewalPaidUntil !== null && new Date(renewalPaidUntil).getTime() > Date.now() && renewalStatus === "active";
          const canResumeAutoRenewal = renewalStatus === "cancelled" && provider === "tranzila" && subStatus === "active" && Boolean(expiresAt) && !isExpired && (acPlan === "monthly" || acPlan === "yearly") && account?.paymentMethod?.saved !== false;
          async function handlePayment(plan2) {
            if (plan2 === "yearly" && !yearlyOptIn) {
              setBillingMsg(
                "יש לסמן אישור חידוש שנתי כדי להמשיך"
              );
              return;
            }
            setBillingMsg("");
            navigate(
              `/payment/checkout?plan=${encodeURIComponent(plan2)}`
            );
          }
          return /* @__PURE__ */ jsxs("div", { className: styles$b.section, children: [
            /* @__PURE__ */ jsx("div", { className: styles$b.sectionTitle, children: "תשלומים" }),
            accountLoading && /* @__PURE__ */ jsx("div", { className: styles$b.billingNote, children: "טוען..." }),
            !accountLoading && account && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsxs("div", { className: styles$b.billingRow, children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$b.billingLabel,
                    children: "תוכנית:"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$b.billingValue,
                    children: acPlan === "yearly" ? "שנתית" : acPlan === "monthly" ? "חודשית" : "חינם"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$b.billingRow, children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$b.billingLabel,
                    children: "סטטוס מנוי:"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$b.billingValue,
                    children: subStatus === "active" && !isExpired ? "פעיל" : subStatus === "expired" || isExpired ? "פג תוקף" : "לא פעיל"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: styles$b.billingRow, children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$b.billingLabel,
                    children: "בתוקף עד:"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$b.billingValue,
                    children: expiresAt ? formatDate(expiresAt) : "-"
                  }
                )
              ] }),
              showCta && /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$b.billingDisclosure,
                    children: [
                      /* @__PURE__ */ jsx("span", { children: "מסלול חודשי: חיוב אוטומטי עד לביטול. ניתן לבטל לפני מועד החיוב הבא." }),
                      /* @__PURE__ */ jsx("span", { children: "מסלול שנתי: תשלום ₪299 מראש. חידוש שנתי אוטומטי רק אם תסמן/י את האפשרות למטה." }),
                      /* @__PURE__ */ jsx(
                        "a",
                        {
                          href: "/payment-policy",
                          target: "_blank",
                          rel: "noreferrer",
                          className: styles$b.billingDisclosureLink,
                          children: "תנאי תשלום, חידוש, ביטול והחזרים"
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: styles$b.billingActions,
                    children: [
                      /* @__PURE__ */ jsx(
                        Button,
                        {
                          variant: "secondary",
                          loading: billingBusy,
                          disabled: billingBusy || Boolean(
                            accountError2
                          ),
                          onClick: () => handlePayment(
                            "monthly"
                          ),
                          children: "חודשי - ₪29/חודש"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        Button,
                        {
                          variant: "secondary",
                          loading: billingBusy,
                          disabled: billingBusy || Boolean(
                            accountError2
                          ) || !yearlyOptIn,
                          onClick: () => handlePayment(
                            "yearly"
                          ),
                          children: "שנתי - ₪299/שנה (חוסך ₪49)"
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "label",
                  {
                    className: styles$b.billingOptIn,
                    children: [
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          type: "checkbox",
                          checked: yearlyOptIn,
                          onChange: (e) => setYearlyOptIn(
                            e.target.checked
                          )
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "span",
                        {
                          className: styles$b.billingOptInLabel,
                          children: "אני מאשר/ת חידוש שנתי אוטומטי של ₪299 לפני תחילת שנה שנייה"
                        }
                      )
                    ]
                  }
                )
              ] }),
              billingMsg && /* @__PURE__ */ jsx(
                "div",
                {
                  className: styles$b.billingError,
                  children: billingMsg
                }
              ),
              showRenewalFailedBanner && /* @__PURE__ */ jsxs(
                "div",
                {
                  className: styles$b.renewalWarning,
                  children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: styles$b.renewalWarningTitle,
                        children: "ניסיון חיוב חידוש Premium נכשל"
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles$b.renewalWarningText,
                        children: [
                          "גישת Premium פעילה עד",
                          " ",
                          /* @__PURE__ */ jsx("span", { dir: "ltr", children: formatDate(
                            renewalPaidUntil
                          ) }),
                          ". יש לחדש לפני תאריך זה כדי להמשיך."
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles$b.renewalWarningActions,
                        children: [
                          /* @__PURE__ */ jsx(
                            "a",
                            {
                              href: "/pricing",
                              className: styles$b.renewalWarningCta,
                              children: "חדש Premium עכשיו"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "a",
                            {
                              href: "mailto:support@cardigo.co.il",
                              className: styles$b.renewalWarningHelp,
                              children: "לתמיכה"
                            }
                          )
                        ]
                      }
                    )
                  ]
                }
              ),
              renewalStatus !== "none" && /* @__PURE__ */ jsxs(
                "div",
                {
                  className: styles$b.cancelRenewalBlock,
                  children: [
                    renewalStatus === "active" && autoRenewal.canCancel && /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: styles$b.billingRow,
                          children: [
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles$b.billingLabel,
                                children: "חידוש אוטומטי:"
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles$b.billingValue,
                                children: "פעיל"
                              }
                            )
                          ]
                        }
                      ),
                      renewalPaidUntil && /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: styles$b.billingNote,
                          children: [
                            "הכרטיס יישאר Premium עד",
                            " ",
                            formatDate(
                              renewalPaidUntil
                            )
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "div",
                        {
                          className: styles$b.billingActions,
                          children: /* @__PURE__ */ jsx(
                            Button,
                            {
                              variant: "secondary",
                              disabled: cancelBusy,
                              onClick: () => {
                                setCancelError(
                                  ""
                                );
                                setCancelModalOpen(
                                  true
                                );
                              },
                              children: "ביטול חידוש אוטומטי"
                            }
                          )
                        }
                      )
                    ] }),
                    renewalStatus === "cancelled" && /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: styles$b.pwSuccess,
                          children: [
                            "החידוש האוטומטי בוטל.",
                            " ",
                            renewalPaidUntil ? `הגישה Premium פעילה עד ${formatDate(renewalPaidUntil)}.` : ""
                          ]
                        }
                      ),
                      canResumeAutoRenewal && /* @__PURE__ */ jsxs(Fragment, { children: [
                        /* @__PURE__ */ jsx(
                          "div",
                          {
                            className: styles$b.billingNote,
                            children: "המנוי שלך עדיין פעיל עד תאריך הסיום. אפשר להפעיל מחדש את החידוש האוטומטי כדי שהחיוב הבא יתבצע רק בסיום התקופה הנוכחית."
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "div",
                          {
                            className: styles$b.billingActions,
                            children: /* @__PURE__ */ jsx(
                              Button,
                              {
                                variant: "secondary",
                                loading: resumeBusy,
                                disabled: resumeBusy,
                                onClick: handleResumeRenewal,
                                children: resumeBusy ? "מחדש..." : "חדש חידוש אוטומטי"
                              }
                            )
                          }
                        )
                      ] }),
                      resumeError && /* @__PURE__ */ jsx(
                        "div",
                        {
                          className: styles$b.billingError,
                          children: resumeError
                        }
                      )
                    ] }),
                    (renewalStatus === "pending" || renewalStatus === "failed") && /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: styles$b.billingNote,
                        children: "החידוש האוטומטי עדיין לא הופעל."
                      }
                    ),
                    cancelError && /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: styles$b.billingError,
                        children: cancelError
                      }
                    )
                  ]
                }
              ),
              account?.paymentMethod?.saved === true && /* @__PURE__ */ jsxs(
                "details",
                {
                  className: `${styles$b.collapsible} ${styles$b.collapsibleDanger}`,
                  children: [
                    /* @__PURE__ */ jsx(
                      "summary",
                      {
                        className: styles$b.collapsibleTrigger,
                        children: "ניהול פרטי תשלום שמורים"
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles$b.collapsibleContent,
                        children: [
                          /* @__PURE__ */ jsx(
                            "div",
                            {
                              className: styles$b.billingNote,
                              children: "המנוי יישאר פעיל עד תאריך הסיום. לאחר מחיקת פרטי התשלום לא ניתן יהיה לחדש את המנוי אוטומטית."
                            }
                          ),
                          account?.paymentMethod?.canDelete !== true && /* @__PURE__ */ jsx(
                            "div",
                            {
                              className: styles$b.billingNote,
                              children: "החידוש האוטומטי פעיל — יש לבטל אותו תחילה לפני מחיקת פרטי התשלום."
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "div",
                            {
                              className: styles$b.billingActions,
                              children: /* @__PURE__ */ jsx(
                                Button,
                                {
                                  variant: "secondary",
                                  disabled: deletePaymentMethodBusy || account?.paymentMethod?.canDelete !== true,
                                  onClick: () => {
                                    if (account?.paymentMethod?.canDelete !== true) {
                                      return;
                                    }
                                    setDeletePaymentMethodError(
                                      ""
                                    );
                                    setDeletePaymentMethodSuccess(
                                      false
                                    );
                                    setDeletePaymentMethodModalOpen(
                                      true
                                    );
                                  },
                                  children: "מחק פרטי תשלום"
                                }
                              )
                            }
                          )
                        ]
                      }
                    )
                  ]
                }
              ),
              deletePaymentMethodSuccess && /* @__PURE__ */ jsx(
                "div",
                {
                  className: styles$b.billingNote,
                  children: "פרטי התשלום נמחקו. לחידוש המנוי בעתיד יהיה צורך להזין פרטי תשלום מחדש."
                }
              ),
              deletePaymentMethodError && /* @__PURE__ */ jsx(
                "div",
                {
                  className: styles$b.billingError,
                  children: deletePaymentMethodError
                }
              ),
              /* @__PURE__ */ jsx("div", { className: styles$b.billingNote, children: "שינוי אמצעי תשלום? פנה לתמיכה: support@cardigo.co.il" }),
              /* @__PURE__ */ jsxs(
                "div",
                {
                  className: styles$b.receiptProfileBlock,
                  children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: styles$b.sectionTitle,
                        children: "פרטי קבלה"
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles$b.billingDisclosure,
                        children: [
                          /* @__PURE__ */ jsx("span", { children: "הפרטים ישמשו להפקת קבלות ומסמכי תשלום בלבד." }),
                          /* @__PURE__ */ jsx("span", { children: "שינויים לא יחולו על קבלות שכבר הופקו." }),
                          /* @__PURE__ */ jsx("span", { children: "המספר המזהה הוא אופציונלי ורגיש — מלאו אותו רק אם נדרש." }),
                          /* @__PURE__ */ jsx(
                            "a",
                            {
                              href: "/privacy",
                              className: styles$b.billingDisclosureLink,
                              children: "מדיניות הפרטיות"
                            }
                          )
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: styles$b.receiptProfileFields,
                        children: [
                          /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles$b.receiptProfileSelectRow,
                              children: [
                                /* @__PURE__ */ jsx(
                                  "label",
                                  {
                                    htmlFor: "rp-recipient-type",
                                    className: styles$b.receiptProfileSelectLabel,
                                    children: "סוג נמען"
                                  }
                                ),
                                /* @__PURE__ */ jsxs(
                                  "select",
                                  {
                                    id: "rp-recipient-type",
                                    className: styles$b.receiptProfileSelect,
                                    value: receiptProfileDraft.recipientType,
                                    disabled: receiptProfileBusy,
                                    onChange: (e) => {
                                      setReceiptProfileDraft(
                                        (draft) => ({
                                          ...draft,
                                          recipientType: e.target.value
                                        })
                                      );
                                      setReceiptProfileError(
                                        ""
                                      );
                                      setReceiptProfileOk(
                                        ""
                                      );
                                    },
                                    children: [
                                      /* @__PURE__ */ jsx("option", { value: "", children: "לא צוין" }),
                                      /* @__PURE__ */ jsx("option", { value: "private", children: "פרטי" }),
                                      /* @__PURE__ */ jsx("option", { value: "business", children: "עסקי" })
                                    ]
                                  }
                                )
                              ]
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            Input,
                            {
                              label: "שם לקבלה",
                              type: "text",
                              value: receiptProfileDraft.name,
                              onChange: (e) => {
                                setReceiptProfileDraft(
                                  (draft) => ({
                                    ...draft,
                                    name: e.target.value
                                  })
                                );
                                setReceiptProfileError(
                                  ""
                                );
                                setReceiptProfileOk(
                                  ""
                                );
                              },
                              meta: "אם יישאר ריק, נשתמש בשם החשבון או בדוא״ל החשבון.",
                              autoComplete: "name",
                              disabled: receiptProfileBusy
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            Input,
                            {
                              label: "דוא״ל לשליחת קבלה",
                              type: "email",
                              value: receiptProfileDraft.email,
                              onChange: (e) => {
                                setReceiptProfileDraft(
                                  (draft) => ({
                                    ...draft,
                                    email: e.target.value
                                  })
                                );
                                setReceiptProfileError(
                                  ""
                                );
                                setReceiptProfileOk(
                                  ""
                                );
                              },
                              meta: "אם יישאר ריק, הקבלה תישלח לדוא״ל החשבון.",
                              autoComplete: "email",
                              dir: "ltr",
                              disabled: receiptProfileBusy
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            Input,
                            {
                              label: receiptProfileDraft.recipientType === "business" ? "ח.פ. / מספר עוסק" : receiptProfileDraft.recipientType === "private" ? "ת.ז." : "ת.ז. / ח.פ. / מספר עוסק",
                              type: "text",
                              value: receiptProfileDraft.numberId,
                              onChange: (e) => {
                                setReceiptProfileDraft(
                                  (draft) => ({
                                    ...draft,
                                    numberId: e.target.value
                                  })
                                );
                                setReceiptProfileClearNumberId(
                                  false
                                );
                                setReceiptProfileError(
                                  ""
                                );
                                setReceiptProfileOk(
                                  ""
                                );
                              },
                              meta: account?.receiptProfile?.numberIdMasked ? `מספר מזהה שמור: ${account.receiptProfile.numberIdMasked}` : void 0,
                              placeholder: "אופציונלי",
                              autoComplete: "off",
                              dir: "ltr",
                              disabled: receiptProfileBusy || receiptProfileClearNumberId
                            }
                          ),
                          account?.receiptProfile?.numberIdMasked && /* @__PURE__ */ jsxs(
                            "label",
                            {
                              className: styles$b.billingOptIn,
                              children: [
                                /* @__PURE__ */ jsx(
                                  "input",
                                  {
                                    type: "checkbox",
                                    checked: receiptProfileClearNumberId,
                                    disabled: receiptProfileBusy,
                                    onChange: (e) => {
                                      setReceiptProfileClearNumberId(
                                        e.target.checked
                                      );
                                      if (e.target.checked) {
                                        setReceiptProfileDraft(
                                          (draft) => ({
                                            ...draft,
                                            numberId: ""
                                          })
                                        );
                                      }
                                      setReceiptProfileError(
                                        ""
                                      );
                                      setReceiptProfileOk(
                                        ""
                                      );
                                    }
                                  }
                                ),
                                /* @__PURE__ */ jsx(
                                  "span",
                                  {
                                    className: styles$b.billingOptInLabel,
                                    children: "מחק מספר מזהה שמור"
                                  }
                                )
                              ]
                            }
                          ),
                          /* @__PURE__ */ jsxs(
                            "details",
                            {
                              className: styles$b.collapsible,
                              children: [
                                /* @__PURE__ */ jsx(
                                  "summary",
                                  {
                                    className: styles$b.collapsibleTrigger,
                                    children: "פרטים נוספים"
                                  }
                                ),
                                /* @__PURE__ */ jsxs(
                                  "div",
                                  {
                                    className: styles$b.collapsibleContent,
                                    children: [
                                      /* @__PURE__ */ jsx(
                                        Input,
                                        {
                                          label: "שם עסק / שם לחשבונית",
                                          type: "text",
                                          value: receiptProfileDraft.nameInvoice,
                                          onChange: (e) => {
                                            setReceiptProfileDraft(
                                              (draft) => ({
                                                ...draft,
                                                nameInvoice: e.target.value
                                              })
                                            );
                                            setReceiptProfileError(
                                              ""
                                            );
                                            setReceiptProfileOk(
                                              ""
                                            );
                                          },
                                          disabled: receiptProfileBusy
                                        }
                                      ),
                                      /* @__PURE__ */ jsx(
                                        Input,
                                        {
                                          label: "כתובת",
                                          type: "text",
                                          value: receiptProfileDraft.address,
                                          onChange: (e) => {
                                            setReceiptProfileDraft(
                                              (draft) => ({
                                                ...draft,
                                                address: e.target.value
                                              })
                                            );
                                            setReceiptProfileError(
                                              ""
                                            );
                                            setReceiptProfileOk(
                                              ""
                                            );
                                          },
                                          autoComplete: "street-address",
                                          disabled: receiptProfileBusy
                                        }
                                      ),
                                      /* @__PURE__ */ jsx(
                                        Input,
                                        {
                                          label: "עיר",
                                          type: "text",
                                          value: receiptProfileDraft.city,
                                          onChange: (e) => {
                                            setReceiptProfileDraft(
                                              (draft) => ({
                                                ...draft,
                                                city: e.target.value
                                              })
                                            );
                                            setReceiptProfileError(
                                              ""
                                            );
                                            setReceiptProfileOk(
                                              ""
                                            );
                                          },
                                          autoComplete: "address-level2",
                                          disabled: receiptProfileBusy
                                        }
                                      ),
                                      /* @__PURE__ */ jsx(
                                        Input,
                                        {
                                          label: "מיקוד",
                                          type: "text",
                                          value: receiptProfileDraft.zipCode,
                                          onChange: (e) => {
                                            setReceiptProfileDraft(
                                              (draft) => ({
                                                ...draft,
                                                zipCode: e.target.value
                                              })
                                            );
                                            setReceiptProfileError(
                                              ""
                                            );
                                            setReceiptProfileOk(
                                              ""
                                            );
                                          },
                                          autoComplete: "postal-code",
                                          dir: "ltr",
                                          disabled: receiptProfileBusy
                                        }
                                      )
                                    ]
                                  }
                                )
                              ]
                            }
                          ),
                          receiptProfileError && /* @__PURE__ */ jsx(
                            "div",
                            {
                              className: styles$b.billingError,
                              children: receiptProfileError
                            }
                          ),
                          receiptProfileOk && /* @__PURE__ */ jsx(
                            "div",
                            {
                              className: styles$b.pwSuccess,
                              children: receiptProfileOk
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "div",
                            {
                              className: styles$b.billingActions,
                              children: /* @__PURE__ */ jsx(
                                Button,
                                {
                                  variant: "secondary",
                                  loading: receiptProfileBusy,
                                  disabled: receiptProfileBusy || !isReceiptProfileDirty,
                                  onClick: handleReceiptProfileSave,
                                  children: "שמור פרטי קבלה"
                                }
                              )
                            }
                          )
                        ]
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                "details",
                {
                  className: styles$b.collapsible,
                  children: [
                    /* @__PURE__ */ jsx(
                      "summary",
                      {
                        className: styles$b.collapsibleTrigger,
                        children: "קבלות"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: styles$b.collapsibleContent,
                        children: (() => {
                          const dateFormatter = new Intl.DateTimeFormat(
                            "he-IL",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric"
                            }
                          );
                          const amountFormatter = new Intl.NumberFormat(
                            "he-IL",
                            {
                              style: "currency",
                              currency: "ILS"
                            }
                          );
                          return /* @__PURE__ */ jsxs(
                            "div",
                            {
                              className: styles$b.receiptsBlock,
                              children: [
                                receiptsLoading && /* @__PURE__ */ jsx(
                                  "div",
                                  {
                                    className: styles$b.billingNote,
                                    children: "טוען קבלות..."
                                  }
                                ),
                                !receiptsLoading && receiptsError && /* @__PURE__ */ jsx(
                                  "div",
                                  {
                                    className: styles$b.billingError,
                                    children: receiptsError
                                  }
                                ),
                                !receiptsLoading && !receiptsError && receipts.length === 0 && /* @__PURE__ */ jsx(
                                  "div",
                                  {
                                    className: styles$b.billingNote,
                                    children: "אין קבלות עדיין."
                                  }
                                ),
                                !receiptsLoading && !receiptsError && receipts.length > 0 && /* @__PURE__ */ jsx(
                                  "ul",
                                  {
                                    className: styles$b.receiptsList,
                                    children: receipts.map(
                                      (r) => {
                                        const dateVal = r.issuedAt || r.createdAt;
                                        const dateStr = dateVal ? dateFormatter.format(
                                          new Date(
                                            dateVal
                                          )
                                        ) : "";
                                        const amountStr = typeof r.amountAgorot === "number" ? amountFormatter.format(
                                          r.amountAgorot / 100
                                        ) : "";
                                        const planLabel2 = r.plan === "yearly" ? "שנתי" : r.plan === "monthly" ? "חודשי" : "";
                                        return /* @__PURE__ */ jsxs(
                                          "li",
                                          {
                                            className: styles$b.receiptRow,
                                            children: [
                                              /* @__PURE__ */ jsxs(
                                                "span",
                                                {
                                                  className: styles$b.receiptMain,
                                                  children: [
                                                    /* @__PURE__ */ jsx(
                                                      "span",
                                                      {
                                                        className: styles$b.receiptDate,
                                                        dir: "ltr",
                                                        children: dateStr
                                                      }
                                                    ),
                                                    /* @__PURE__ */ jsx(
                                                      "span",
                                                      {
                                                        className: styles$b.receiptMeta,
                                                        children: [
                                                          amountStr,
                                                          planLabel2
                                                        ].filter(
                                                          Boolean
                                                        ).join(
                                                          " · "
                                                        )
                                                      }
                                                    )
                                                  ]
                                                }
                                              ),
                                              r.hasPdf && /* @__PURE__ */ jsx(
                                                "a",
                                                {
                                                  href: `/api/account/receipts/${r.id}/download`,
                                                  className: styles$b.receiptDownloadLink,
                                                  children: "הורדת קבלה"
                                                }
                                              )
                                            ]
                                          },
                                          r.id
                                        );
                                      }
                                    )
                                  }
                                )
                              ]
                            }
                          );
                        })()
                      }
                    )
                  ]
                }
              )
            ] }),
            !accountLoading && !account && accountError2 && /* @__PURE__ */ jsx("div", { className: styles$b.billingNote, children: "לא זמין" })
          ] });
        })(),
        /* @__PURE__ */ jsxs("div", { className: styles$b.section, children: [
          /* @__PURE__ */ jsx("div", { className: styles$b.sectionTitle, children: "העדפות תקשורת" }),
          accountLoading && /* @__PURE__ */ jsx("div", { className: styles$b.accountNote, children: "טוען..." }),
          !accountLoading && account && /* @__PURE__ */ jsxs("label", { className: styles$b.commPrefRow, children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: account.emailMarketingConsent === true,
                disabled: mktBusy,
                onChange: (e) => handleMarketingToggle(
                  e.target.checked
                )
              }
            ),
            /* @__PURE__ */ jsxs("span", { className: styles$b.commPrefInfo, children: [
              /* @__PURE__ */ jsx("span", { children: 'קבלת תזכורות ועדכונים רלוונטיים מ-Cardigo בדוא"ל' }),
              /* @__PURE__ */ jsx("span", { className: styles$b.commPrefHint, children: "ניתן לשנות בכל עת" })
            ] })
          ] }),
          mktError && /* @__PURE__ */ jsx("div", { className: styles$b.accountError, children: mktError })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$b.section, children: [
          /* @__PURE__ */ jsx("div", { className: styles$b.sectionTitle, children: "פעולות" }),
          /* @__PURE__ */ jsxs("details", { className: styles$b.collapsible, children: [
            /* @__PURE__ */ jsx("summary", { className: styles$b.collapsibleTrigger, children: "שינוי סיסמה" }),
            /* @__PURE__ */ jsxs(
              "form",
              {
                className: styles$b.collapsibleContent,
                onSubmit: handleChangePassword,
                autoComplete: "off",
                children: [
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      label: "סיסמה נוכחית",
                      type: "password",
                      value: pwCurrent,
                      onChange: (e) => {
                        setPwCurrent(e.target.value);
                        setPwError("");
                        setPwSuccess("");
                      },
                      autoComplete: "current-password",
                      disabled: pwSubmitting
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      label: "סיסמה חדשה",
                      type: "password",
                      value: pwNew,
                      onChange: (e) => {
                        setPwNew(e.target.value);
                        setPwError("");
                        setPwSuccess("");
                        setPwConfirmError("");
                        setPwNewError("");
                      },
                      onBlur: () => setPwNewTouched(true),
                      minLength: PASSWORD_POLICY.minLength,
                      maxLength: PASSWORD_POLICY.maxLength,
                      meta: PASSWORD_POLICY_HELPER_TEXT_HE,
                      error: pwNewError,
                      autoComplete: "new-password",
                      disabled: pwSubmitting
                    }
                  ),
                  (pwNewTouched || pwNewError || pwNew.length > 0) && /* @__PURE__ */ jsx(
                    "ul",
                    {
                      className: styles$b.pwChecklist,
                      "aria-label": "דרישות הסיסמה",
                      children: getPasswordPolicyChecklist(
                        pwNew
                      ).map((item2) => /* @__PURE__ */ jsx(
                        "li",
                        {
                          className: `${styles$b.pwChecklistItem}${item2.met ? ` ${styles$b.pwChecklistItemMet}` : ""}`,
                          children: item2.label
                        },
                        item2.id
                      ))
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      label: "אימות סיסמה חדשה",
                      type: "password",
                      value: pwConfirm,
                      onChange: (e) => {
                        setPwConfirm(e.target.value);
                        setPwConfirmError("");
                        setPwSuccess("");
                      },
                      maxLength: PASSWORD_POLICY.maxLength,
                      error: pwConfirmError,
                      autoComplete: "new-password",
                      disabled: pwSubmitting
                    }
                  ),
                  pwError && /* @__PURE__ */ jsx("div", { className: styles$b.accountError, children: pwError }),
                  pwSuccess2 && /* @__PURE__ */ jsx("div", { className: styles$b.pwSuccess, children: pwSuccess2 }),
                  /* @__PURE__ */ jsx("div", { className: styles$b.pwActions, children: /* @__PURE__ */ jsx(
                    Button,
                    {
                      type: "submit",
                      variant: "secondary",
                      loading: pwSubmitting,
                      disabled: pwSubmitting || !pwCurrent.trim() || !pwNew.trim() || !pwConfirm.trim(),
                      children: "שינוי סיסמה"
                    }
                  ) })
                ]
              }
            )
          ] }),
          deleteCardBlock,
          /* @__PURE__ */ jsxs(
            "details",
            {
              className: `${styles$b.collapsible} ${styles$b.collapsibleDanger}`,
              children: [
                /* @__PURE__ */ jsx("summary", { className: styles$b.collapsibleTrigger, children: "מחיקת חשבון" }),
                /* @__PURE__ */ jsxs(
                  "form",
                  {
                    className: styles$b.collapsibleContent,
                    onSubmit: handleDeleteAccount,
                    autoComplete: "off",
                    children: [
                      /* @__PURE__ */ jsx("div", { className: styles$b.dangerText, children: "מחיקת החשבון תמחק לצמיתות את הכרטיס האישי, תמונות, לידים ונתוני אנליטיקה." }),
                      /* @__PURE__ */ jsx("div", { className: styles$b.dangerText, children: "לא ניתן לשחזר." }),
                      /* @__PURE__ */ jsx("div", { className: styles$b.dangerText, children: "לא ניתן החזר כספי אוטומטי על תשלום קיים." }),
                      /* @__PURE__ */ jsx("div", { className: styles$b.dangerText, children: "כתובת האימייל הזו לא תהיה זמינה ליצירת חשבון חדש ב-Cardigo." }),
                      /* @__PURE__ */ jsx(
                        Input,
                        {
                          label: 'הקלד "מחיקה" לאישור',
                          value: delConfirm,
                          onChange: (e) => {
                            setDelConfirm(e.target.value);
                            setDelError("");
                            setDelBlockOrgs(null);
                          },
                          placeholder: "מחיקה",
                          autoComplete: "off",
                          disabled: delSubmitting
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        Input,
                        {
                          label: "סיסמה נוכחית",
                          type: "password",
                          value: delPassword,
                          onChange: (e) => {
                            setDelPassword(e.target.value);
                            setDelError("");
                            setDelBlockOrgs(null);
                          },
                          autoComplete: "current-password",
                          disabled: delSubmitting
                        }
                      ),
                      delBlockOrgs && /* @__PURE__ */ jsxs("div", { className: styles$b.dangerError, children: [
                        "אתה המנהל היחיד בארגונים:",
                        " ",
                        delBlockOrgs.map(
                          (o) => o.orgName || o.orgSlug
                        ).join(", "),
                        ". העבר ניהול לפני מחיקה."
                      ] }),
                      delError && /* @__PURE__ */ jsx("div", { className: styles$b.dangerError, children: delError }),
                      delDone && /* @__PURE__ */ jsx("div", { className: styles$b.dangerText, children: "החשבון נמחק. כתובת האימייל לא תהיה זמינה ליצירת חשבון חדש." }),
                      /* @__PURE__ */ jsx("div", { className: styles$b.dangerActions, children: /* @__PURE__ */ jsx(
                        Button,
                        {
                          type: "submit",
                          variant: "ghost",
                          loading: delSubmitting,
                          disabled: delDone || delSubmitting || delConfirm.trim() !== "מחיקה" || !delPassword.trim(),
                          children: "מחק חשבון"
                        }
                      ) })
                    ]
                  }
                )
              ]
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      CancelRenewalModal,
      {
        open: cancelModalOpen,
        busy: cancelBusy,
        onConfirm: handleCancelRenewal,
        onClose: () => setCancelModalOpen(false)
      }
    ),
    /* @__PURE__ */ jsx(
      DeletePaymentMethodModal,
      {
        open: deletePaymentMethodModalOpen,
        busy: deletePaymentMethodBusy,
        onConfirm: handleDeletePaymentMethod,
        onClose: () => setDeletePaymentMethodModalOpen(false)
      }
    )
  ] });
}
const stack = "_stack_1o180_1";
const row = "_row_1o180_13";
const field = "_field_1o180_25";
const fieldFull = "_fieldFull_1o180_27";
const helperBlock = "_helperBlock_1o180_41";
const helperHeader = "_helperHeader_1o180_63";
const helperTitle = "_helperTitle_1o180_77";
const helperButton = "_helperButton_1o180_87";
const helperValue = "_helperValue_1o180_171";
const hintText = "_hintText_1o180_187";
const warningText = "_warningText_1o180_195";
const jsonLdHelperRow = "_jsonLdHelperRow_1o180_205";
const selectWrap = "_selectWrap_1o180_217";
const robotsSelect = "_robotsSelect_1o180_261";
const jsonLdSelect = "_jsonLdSelect_1o180_263";
const jsonLdActions = "_jsonLdActions_1o180_351";
const jsonOkText = "_jsonOkText_1o180_365";
const jsonBadText = "_jsonBadText_1o180_373";
const section$2 = "_section_1o180_403";
const sectionHeader$1 = "_sectionHeader_1o180_421";
const sectionHint = "_sectionHint_1o180_431";
const sectionContent = "_sectionContent_1o180_441";
const collapsible = "_collapsible_1o180_457";
const collapsibleTrigger = "_collapsibleTrigger_1o180_471";
const collapsibleContent = "_collapsibleContent_1o180_555";
const aiBlock = "_aiBlock_1o180_575";
const aiRow = "_aiRow_1o180_595";
const aiButton = "_aiButton_1o180_609";
const aiReadinessHint = "_aiReadinessHint_1o180_683";
const aiError = "_aiError_1o180_695";
const aiDismissLink = "_aiDismissLink_1o180_715";
const aiPreview = "_aiPreview_1o180_749";
const aiPreviewLabel = "_aiPreviewLabel_1o180_769";
const aiPreviewField = "_aiPreviewField_1o180_781";
const aiPreviewKey = "_aiPreviewKey_1o180_797";
const aiActions = "_aiActions_1o180_805";
const aiApplyBtn = "_aiApplyBtn_1o180_817";
const aiDismissBtn = "_aiDismissBtn_1o180_819";
const consentOverlay = "_consentOverlay_1o180_871";
const consentDialog = "_consentDialog_1o180_893";
const consentTitle = "_consentTitle_1o180_923";
const consentBody = "_consentBody_1o180_937";
const consentActions = "_consentActions_1o180_953";
const consentConfirm = "_consentConfirm_1o180_967";
const consentCancel = "_consentCancel_1o180_969";
const lockedBlock$1 = "_lockedBlock_1o180_1097";
const lockedTitle$1 = "_lockedTitle_1o180_1117";
const lockedText$1 = "_lockedText_1o180_1129";
const lockedCta$1 = "_lockedCta_1o180_1141";
const magicCard = "_magicCard_1o180_1183";
const magicTitle = "_magicTitle_1o180_1203";
const magicDescription = "_magicDescription_1o180_1215";
const magicRequirements = "_magicRequirements_1o180_1227";
const magicRequirementsLabel = "_magicRequirementsLabel_1o180_1239";
const magicRequirementsList = "_magicRequirementsList_1o180_1251";
const magicRequirementsItem = "_magicRequirementsItem_1o180_1267";
const magicActions = "_magicActions_1o180_1279";
const magicButton = "_magicButton_1o180_1291";
const magicHelperText = "_magicHelperText_1o180_1353";
const magicNoticeSuccess = "_magicNoticeSuccess_1o180_1365";
const magicNoticeWarning = "_magicNoticeWarning_1o180_1367";
const magicNoticeError = "_magicNoticeError_1o180_1369";
const magicNoticeMessage = "_magicNoticeMessage_1o180_1421";
const magicNoticeDetails = "_magicNoticeDetails_1o180_1429";
const styles$a = {
  stack,
  row,
  field,
  fieldFull,
  helperBlock,
  helperHeader,
  helperTitle,
  helperButton,
  helperValue,
  hintText,
  warningText,
  jsonLdHelperRow,
  selectWrap,
  robotsSelect,
  jsonLdSelect,
  jsonLdActions,
  jsonOkText,
  jsonBadText,
  section: section$2,
  sectionHeader: sectionHeader$1,
  sectionHint,
  sectionContent,
  collapsible,
  collapsibleTrigger,
  collapsibleContent,
  aiBlock,
  aiRow,
  aiButton,
  aiReadinessHint,
  aiError,
  aiDismissLink,
  aiPreview,
  aiPreviewLabel,
  aiPreviewField,
  aiPreviewKey,
  aiActions,
  aiApplyBtn,
  aiDismissBtn,
  consentOverlay,
  consentDialog,
  consentTitle,
  consentBody,
  consentActions,
  consentConfirm,
  consentCancel,
  lockedBlock: lockedBlock$1,
  lockedTitle: lockedTitle$1,
  lockedText: lockedText$1,
  lockedCta: lockedCta$1,
  magicCard,
  magicTitle,
  magicDescription,
  magicRequirements,
  magicRequirementsLabel,
  magicRequirementsList,
  magicRequirementsItem,
  magicActions,
  magicButton,
  magicHelperText,
  magicNoticeSuccess,
  magicNoticeWarning,
  magicNoticeError,
  magicNoticeMessage,
  magicNoticeDetails
};
const AI_CONSENT_KEY = "cardigo_ai_about_consent";
function hasAiConsent() {
  try {
    return localStorage.getItem(AI_CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}
function saveAiConsent() {
  try {
    localStorage.setItem(AI_CONSENT_KEY, "1");
  } catch {
  }
}
function mapAiError(err) {
  const code = err?.response?.data?.code;
  const status2 = err?.response?.status;
  if (status2 === 401) return "יש להתחבר מחדש כדי להשתמש בשירות זה.";
  if (code === "RATE_LIMITED")
    return "יותר מדי בקשות כרגע. נסה שוב בעוד מספר דקות.";
  if (code === "AI_PROVIDER_QUOTA")
    return "מכסת שירות ה-AI החיצוני מוצתה זמנית. נסה שוב מאוחר יותר.";
  if (code === "AI_MONTHLY_LIMIT_REACHED")
    return "מכסת ה-AI החודשית מוצתה. נסה שוב בחודש הבא.";
  if (code === "AI_DISABLED") return "שירות ה-AI אינו פעיל כרגע.";
  if (code === "AI_UNAVAILABLE")
    return "שירות ה-AI אינו זמין זמנית. נסה שוב.";
  if (code === "INVALID_SUGGESTION")
    return "ה-AI החזיר תוכן לא שמיש. נסה שוב.";
  if (code === "AI_INSUFFICIENT_BUSINESS_CONTEXT")
    return "יש למלא שם עסק ותחום עיסוק לפני יצירת תוכן עם AI.";
  return "משהו השתבש. נסה שוב מאוחר יותר.";
}
function SeoAiConsentModal({ open, onConfirm, onCancel }) {
  const titleId = useId();
  const bodyId = useId();
  const confirmRef = useRef(null);
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, open);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmRef.current?.focus?.(), 0);
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: dialogRef,
      className: styles$a.consentOverlay,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      "aria-describedby": bodyId,
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) onCancel?.();
      },
      children: /* @__PURE__ */ jsxs("div", { className: styles$a.consentDialog, dir: "rtl", children: [
        /* @__PURE__ */ jsx("h2", { id: titleId, className: styles$a.consentTitle, children: "הצעת SEO באמצעות AI" }),
        /* @__PURE__ */ jsx("p", { id: bodyId, className: styles$a.consentBody, children: "ההצעה נוצרת באמצעות שירות בינה מלאכותית חיצוני. המידע העסקי מהכרטיס שלך ישמש ליצירת כותרת ותיאור לגוגל. התוכן המוצע הוא המלצה בלבד - תוכל לערוך או לדחות אותו לפני שמירה." }),
        /* @__PURE__ */ jsxs("div", { className: styles$a.consentActions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              ref: confirmRef,
              type: "button",
              className: styles$a.consentConfirm,
              onClick: onConfirm,
              children: "המשך"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$a.consentCancel,
              onClick: onCancel,
              children: "ביטול"
            }
          )
        ] })
      ] })
    }
  );
}
function JsonLdOverwriteConfirmModal({ open, onConfirm, onCancel }) {
  const titleId = useId();
  const bodyId = useId();
  const confirmRef = useRef(null);
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, open);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmRef.current?.focus?.(), 0);
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: dialogRef,
      className: styles$a.consentOverlay,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      "aria-describedby": bodyId,
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) onCancel?.();
      },
      children: /* @__PURE__ */ jsxs("div", { className: styles$a.consentDialog, dir: "rtl", children: [
        /* @__PURE__ */ jsx("h2", { id: titleId, className: styles$a.consentTitle, children: "להחליף את המידע המובנה?" }),
        /* @__PURE__ */ jsx("p", { id: bodyId, className: styles$a.consentBody, children: "כבר קיים כאן מידע מובנה. יצירת תבנית חדשה תחליף את התוכן הקיים." }),
        /* @__PURE__ */ jsxs("div", { className: styles$a.consentActions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              ref: confirmRef,
              type: "button",
              className: styles$a.consentConfirm,
              onClick: onConfirm,
              children: "החלף"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$a.consentCancel,
              onClick: onCancel,
              children: "ביטול"
            }
          )
        ] })
      ] })
    }
  );
}
function isValidAbsoluteHttpUrl(value) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
function getPublicOrigin() {
  const envOrigin = String("https://cardigo.co.il").trim();
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  try {
    if (typeof window !== "undefined" && window.location?.origin) {
      return String(window.location.origin).trim().replace(/\/$/, "");
    }
  } catch {
  }
  return "";
}
function normalizePathLeadingSlash(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
}
function trimStr(value) {
  return typeof value === "string" ? value.trim() : "";
}
function collectSameAs(contact) {
  if (!contact || typeof contact !== "object") return [];
  const keys = ["facebook", "instagram", "twitter", "tiktok", "linkedin"];
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const key of keys) {
    const raw = trimStr(contact[key]);
    if (!raw) continue;
    if (!isValidAbsoluteHttpUrl(raw)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    result.push(raw);
  }
  return result;
}
function buildJsonLdTemplate(type, { name: name2, baseUrl, business, contact, design }) {
  const obj = {
    "@context": "https://schema.org",
    "@type": type
  };
  if (name2) obj.name = name2;
  if (baseUrl) {
    obj.url = baseUrl;
    obj["@id"] = baseUrl;
  }
  const slogan = trimStr(business?.slogan);
  if (slogan) obj.description = slogan;
  const logoUrl = trimStr(design?.logo);
  if (type === "Person") {
    const category = trimStr(business?.category);
    if (category) obj.jobTitle = category;
    if (logoUrl && isValidAbsoluteHttpUrl(logoUrl)) obj.image = logoUrl;
    const phone = trimStr(contact?.phone);
    if (phone) obj.telephone = phone;
    const email = trimStr(contact?.email);
    if (email) obj.email = email;
  }
  if (type === "Organization") {
    if (logoUrl && isValidAbsoluteHttpUrl(logoUrl)) obj.logo = logoUrl;
  }
  if (type === "LocalBusiness") {
    if (logoUrl && isValidAbsoluteHttpUrl(logoUrl)) obj.image = logoUrl;
    const phone = trimStr(contact?.phone);
    if (phone) obj.telephone = phone;
    const email = trimStr(contact?.email);
    if (email) obj.email = email;
    const city = trimStr(business?.city);
    const address = { "@type": "PostalAddress", addressCountry: "IL" };
    if (city) address.addressLocality = city;
    obj.address = address;
  }
  const sameAs = collectSameAs(contact);
  if (sameAs.length) obj.sameAs = sameAs;
  return obj;
}
function SeoPanel({
  seo,
  publicPath,
  slug,
  displayName,
  disabled,
  onChange,
  canEditSeo,
  cardId,
  business,
  contact,
  design
}) {
  if (canEditSeo === false) {
    return /* @__PURE__ */ jsx(Panel, { title: "SEO וסקריפטים", children: /* @__PURE__ */ jsxs("div", { className: styles$a.lockedBlock, children: [
      /* @__PURE__ */ jsx("div", { className: styles$a.lockedTitle, children: "SEO וסקריפטים" }),
      /* @__PURE__ */ jsx("div", { className: styles$a.lockedText, children: "כדי להשתמש ב-SEO וסקריפטים צריך מנוי פרימיום." }),
      /* @__PURE__ */ jsx("a", { href: "/pricing", className: styles$a.lockedCta, children: "שדרג לפרימיום" })
    ] }) });
  }
  const value = seo || {};
  const [jsonLdTemplateType, setJsonLdTemplateType] = useState("LocalBusiness");
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [hadJsonLdOnEntry, setHadJsonLdOnEntry] = useState(
    () => Boolean(typeof seo?.jsonLd === "string" && seo.jsonLd.trim())
  );
  const jsonLdEntryCardIdRef = useRef(cardId);
  useEffect(() => {
    if (cardId !== jsonLdEntryCardIdRef.current) {
      jsonLdEntryCardIdRef.current = cardId;
      setHadJsonLdOnEntry(
        Boolean(
          typeof value.jsonLd === "string" && value.jsonLd.trim()
        )
      );
    }
  }, [cardId, value.jsonLd]);
  const storedRobots = (value.robots || "").trim();
  const [robotsManual, setRobotsManual] = useState(
    () => Boolean(storedRobots) && !/noindex/i.test(storedRobots)
  );
  const robotsLocalRef = useRef(value.robots);
  const robotsCardIdRef = useRef(cardId);
  useEffect(() => {
    const cardChanged = cardId !== robotsCardIdRef.current;
    if (cardChanged) {
      robotsCardIdRef.current = cardId;
      robotsLocalRef.current = value.robots;
      const raw2 = (value.robots || "").trim();
      setRobotsManual(Boolean(raw2) && !/noindex/i.test(raw2));
      return;
    }
    if (value.robots === robotsLocalRef.current) return;
    robotsLocalRef.current = value.robots;
    const raw = (value.robots || "").trim();
    setRobotsManual(Boolean(raw) && !/noindex/i.test(raw));
  }, [value.robots, cardId]);
  const [aiState, setAiState] = useState("idle");
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiError2, setAiError] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [aiQuota, setAiQuota] = useState(null);
  const [orchestratorBusy, setOrchestratorBusy] = useState(false);
  const [orchestratorNotice, setOrchestratorNotice] = useState(null);
  const pendingMagicRef = useRef(false);
  const magicSetupRef = useRef(null);
  const aiReady = Boolean(business?.name?.trim()) && Boolean(business?.category?.trim());
  const hasExistingSeo = Boolean(value.title?.trim()) || Boolean(value.description?.trim());
  const quotaExhausted = aiQuota && aiQuota.remaining <= 0;
  const aiFeatureEnabled = aiQuota?.featureEnabled !== false;
  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    fetchAiQuota(cardId, "ai_seo_generation").then((q) => {
      if (!cancelled) setAiQuota(q);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [cardId]);
  const requestSeoSuggestion = useCallback(async () => {
    if (!cardId) return;
    setAiState("loading");
    setAiError("");
    setAiSuggestion(null);
    try {
      const mode = hasExistingSeo ? "improve" : "create";
      const { suggestion, quota } = await suggestSeo(cardId, {
        mode,
        language: "he"
      });
      setAiSuggestion(suggestion);
      setAiState("preview");
      if (quota) setAiQuota(quota);
    } catch (err) {
      setAiError(mapAiError(err));
      setAiState("error");
      const errQuota = err?.response?.data?.quota;
      if (errQuota) setAiQuota(errQuota);
    }
  }, [cardId, hasExistingSeo]);
  const handleAiClick = useCallback(() => {
    if (hasAiConsent()) {
      requestSeoSuggestion();
    } else {
      setShowConsent(true);
    }
  }, [requestSeoSuggestion]);
  const handleConsentConfirm = useCallback(() => {
    if (pendingMagicRef.current) {
      pendingMagicRef.current = false;
      saveAiConsent();
      setShowConsent(false);
      magicSetupRef.current?.();
      return;
    }
    saveAiConsent();
    setShowConsent(false);
    requestSeoSuggestion();
  }, [requestSeoSuggestion]);
  const handleConsentCancel = useCallback(() => {
    if (pendingMagicRef.current) {
      pendingMagicRef.current = false;
    }
    setShowConsent(false);
  }, []);
  const handleAiApply = useCallback(() => {
    if (!aiSuggestion) return;
    onChange?.({
      title: aiSuggestion.seoTitle || "",
      description: aiSuggestion.seoDescription || ""
    });
    setAiSuggestion(null);
    setAiState("idle");
  }, [aiSuggestion, onChange]);
  const handleAiDismiss = useCallback(() => {
    setAiSuggestion(null);
    setAiState("idle");
    setAiError("");
  }, []);
  const computedPublicUrl = useMemo(() => {
    const origin = getPublicOrigin();
    const path = (typeof publicPath === "string" && publicPath.trim() ? normalizePathLeadingSlash(publicPath) : slug ? `/card/${String(slug).trim()}` : "") || "";
    if (!origin || !path) return "";
    return `${origin}${path}`;
  }, [publicPath, slug]);
  const jsonLdStatus = useMemo(() => {
    const raw = typeof value.jsonLd === "string" ? value.jsonLd.trim() : "";
    if (!raw) {
      return { hasValue: false, valid: true, root: null };
    }
    try {
      const parsed = JSON.parse(raw);
      const valid = parsed !== null && (typeof parsed === "object" || Array.isArray(parsed));
      const root2 = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
      return { hasValue: true, valid, root: root2 };
    } catch {
      return { hasValue: true, valid: false, root: null };
    }
  }, [value.jsonLd]);
  const hasUrlsContent = Boolean(
    typeof value.robots === "string" && value.robots.trim()
  );
  const hasVerificationContent = Boolean(
    typeof value.googleSiteVerification === "string" && value.googleSiteVerification.trim() || typeof value.facebookDomainVerification === "string" && value.facebookDomainVerification.trim()
  );
  const hasTrackingContent = Boolean(
    typeof value.gtmId === "string" && value.gtmId.trim() || typeof value.gaMeasurementId === "string" && value.gaMeasurementId.trim() || typeof value.metaPixelId === "string" && value.metaPixelId.trim()
  );
  const hasJsonLdContent = Boolean(
    typeof value.jsonLd === "string" && value.jsonLd.trim()
  );
  const magicMissingReasons = [];
  if (!business?.name?.trim()) magicMissingReasons.push("שם העסק");
  if (!business?.category?.trim()) magicMissingReasons.push("תחום עיסוק");
  if (!cardId || !computedPublicUrl)
    magicMissingReasons.push("כתובת ציבורית לכרטיס");
  if (aiFeatureEnabled === false) magicMissingReasons.push("זמינות AI");
  if (quotaExhausted) magicMissingReasons.push("מכסת AI זמינה");
  if (aiState === "loading")
    magicMissingReasons.push("המתינו לסיום פעולת ה-AI הנוכחית");
  const magicReady = !disabled && magicMissingReasons.length === 0;
  function update(key, nextValue) {
    onChange?.({ [key]: nextValue });
  }
  function resolveJsonLdBaseUrl() {
    return computedPublicUrl;
  }
  function resolveJsonLdName() {
    if (typeof displayName === "string" && displayName.trim()) {
      return displayName.trim();
    }
    if (typeof value.title === "string" && value.title.trim()) {
      return value.title.trim();
    }
    return "";
  }
  function executeJsonLdInsert() {
    const baseUrl = resolveJsonLdBaseUrl();
    const name2 = resolveJsonLdName();
    const obj = buildJsonLdTemplate(jsonLdTemplateType, {
      name: name2,
      baseUrl,
      business,
      contact,
      design
    });
    update("jsonLd", JSON.stringify(obj, null, 2));
  }
  function handleInsertJsonLdTemplate() {
    if (hasJsonLdContent) {
      setShowOverwriteConfirm(true);
      return;
    }
    executeJsonLdInsert();
  }
  function handleOverwriteConfirm() {
    setShowOverwriteConfirm(false);
    executeJsonLdInsert();
  }
  function handleOverwriteCancel() {
    setShowOverwriteConfirm(false);
  }
  function handleSyncJsonLdFromCanonical() {
    if (!jsonLdStatus?.valid || !jsonLdStatus?.root) return;
    const baseUrl = resolveJsonLdBaseUrl();
    if (!baseUrl) return;
    const next = { ...jsonLdStatus.root };
    next.url = baseUrl;
    next["@id"] = baseUrl;
    update("jsonLd", JSON.stringify(next, null, 2));
  }
  async function runMagicSeoSetup() {
    if (orchestratorBusy || disabled || magicMissingReasons.length > 0 || aiState === "loading") {
      return;
    }
    if (!hasAiConsent()) {
      pendingMagicRef.current = true;
      setShowConsent(true);
      return;
    }
    setOrchestratorBusy(true);
    setOrchestratorNotice(null);
    try {
      const finalPublicUrl = computedPublicUrl;
      if (!finalPublicUrl) {
        setOrchestratorNotice({
          type: "warning",
          message: "לא נמצאה כתובת ציבורית לכרטיס. לא ניתן להמשיך."
        });
        return;
      }
      const details = [];
      let aiOk = false;
      let jsonLdUnsupported = false;
      try {
        const mode = hasExistingSeo ? "improve" : "create";
        const { suggestion, quota } = await suggestSeo(cardId, {
          mode,
          language: "he"
        });
        update("title", suggestion.seoTitle || "");
        update("description", suggestion.seoDescription || "");
        if (quota) setAiQuota(quota);
        setAiState("idle");
        setAiSuggestion(null);
        setAiError("");
        aiOk = true;
      } catch (err) {
        details.push(mapAiError(err));
      }
      if (!jsonLdStatus.hasValue) {
        const name2 = resolveJsonLdName();
        const obj = buildJsonLdTemplate(jsonLdTemplateType, {
          name: name2,
          baseUrl: finalPublicUrl,
          business,
          contact,
          design
        });
        update("jsonLd", JSON.stringify(obj, null, 2));
      } else if (jsonLdStatus.valid && jsonLdStatus.root) {
        const next = { ...jsonLdStatus.root };
        next.url = finalPublicUrl;
        next["@id"] = finalPublicUrl;
        update("jsonLd", JSON.stringify(next, null, 2));
      } else {
        jsonLdUnsupported = true;
        details.push(
          "קיים מידע מובנה במבנה שלא ניתן לעדכן אוטומטית. השתמשו בהגדרות הידניות."
        );
      }
      details.push(
        "השדות עודכנו בטיוטה. כדי לפרסם את השינויים לחצו שמור שינויים."
      );
      if (aiOk && !jsonLdUnsupported) {
        setOrchestratorNotice({
          type: "success",
          message: "הגדרת ה-SEO הושלמה. בדקו את השדות ולחצו שמור שינויים.",
          details
        });
      } else {
        setOrchestratorNotice({
          type: "warning",
          message: aiOk ? "הגדרת ה-SEO הושלמה. בדקו את השדות ולחצו שמור שינויים." : "חלק מהפעולות הושלמו. ה-AI לא הצליח לקבל הצעה כרגע, אך שאר השדות עודכנו. בדקו ולחצו שמור שינויים.",
          details
        });
      }
    } finally {
      setOrchestratorBusy(false);
    }
  }
  magicSetupRef.current = runMagicSeoSetup;
  return /* @__PURE__ */ jsxs(Panel, { title: "SEO וסקריפטים", children: [
    /* @__PURE__ */ jsxs("div", { className: styles$a.stack, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$a.magicCard, children: [
        /* @__PURE__ */ jsx("div", { className: styles$a.magicTitle, children: "הגדרת SEO בלחיצה אחת" }),
        /* @__PURE__ */ jsx("div", { className: styles$a.magicDescription, children: "נמלא כותרת ותיאור בעזרת AI וניצור מידע מובנה לכרטיס. לאחר מכן צריך ללחוץ על שמור שינויים." }),
        magicMissingReasons.length > 0 && /* @__PURE__ */ jsxs("div", { className: styles$a.magicRequirements, children: [
          /* @__PURE__ */ jsx("div", { className: styles$a.magicRequirementsLabel, children: "כדי להפעיל את ההגדרה האוטומטית, השלימו:" }),
          /* @__PURE__ */ jsx("ul", { className: styles$a.magicRequirementsList, children: magicMissingReasons.map((r) => /* @__PURE__ */ jsx(
            "li",
            {
              className: styles$a.magicRequirementsItem,
              children: r
            },
            r
          )) })
        ] }),
        !hasAiConsent() && magicMissingReasons.length === 0 && /* @__PURE__ */ jsx("div", { className: styles$a.magicHelperText, children: "בלחיצה הראשונה תתבקשו לאשר שימוש ב-AI." }),
        /* @__PURE__ */ jsx("div", { className: styles$a.magicActions, children: /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$a.magicButton,
            "data-tour-id": "editor-mini-guide-seo-auto-btn",
            disabled: !magicReady || orchestratorBusy,
            "aria-busy": orchestratorBusy ? "true" : void 0,
            onClick: runMagicSeoSetup,
            children: orchestratorBusy ? "מגדירים SEO…" : "הגדירו לי SEO אוטומטית ✨"
          }
        ) }),
        /* @__PURE__ */ jsx("div", { className: styles$a.magicHelperText, children: "הכותרת והתיאור עשויים להתעדכן בעזרת AI." }),
        /* @__PURE__ */ jsx("div", { className: styles$a.magicHelperText, children: "השינויים נשמרים בטיוטה בלבד עד ללחיצה על שמור שינויים." }),
        /* @__PURE__ */ jsx(
          "div",
          {
            "aria-live": "polite",
            "aria-atomic": "true",
            "aria-label": "סטטוס הגדרת SEO",
            children: orchestratorNotice && /* @__PURE__ */ jsxs(
              "div",
              {
                className: orchestratorNotice.type === "success" ? styles$a.magicNoticeSuccess : orchestratorNotice.type === "error" ? styles$a.magicNoticeError : styles$a.magicNoticeWarning,
                children: [
                  /* @__PURE__ */ jsx("div", { className: styles$a.magicNoticeMessage, children: orchestratorNotice.message }),
                  orchestratorNotice.details?.length > 0 && /* @__PURE__ */ jsx("ul", { className: styles$a.magicNoticeDetails, children: orchestratorNotice.details.map(
                    (d, i) => /* @__PURE__ */ jsx("li", { children: d }, i)
                  ) })
                ]
              }
            )
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$a.section, children: [
        /* @__PURE__ */ jsx("div", { className: styles$a.sectionHeader, children: "נתונים בסיסיים לגוגל" }),
        /* @__PURE__ */ jsx("div", { className: styles$a.sectionHint, children: "אם תשאירו שדות אלה ריקים, המערכת תיצור כותרת ותיאור אוטומטית מפרטי העסק שלכם." }),
        cardId && aiFeatureEnabled && /* @__PURE__ */ jsxs("div", { className: styles$a.aiBlock, children: [
          /* @__PURE__ */ jsxs("div", { className: styles$a.aiRow, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$a.aiButton,
                disabled: disabled || !aiReady || aiState === "loading" || quotaExhausted,
                onClick: handleAiClick,
                children: aiState === "loading" ? "יוצר הצעה…" : hasExistingSeo ? "שפר כותרת ותיאור עם AI ✨" : "צור כותרת ותיאור עם AI ✨"
              }
            ),
            /* @__PURE__ */ jsx(AiQuotaHint, { quota: aiQuota })
          ] }),
          !aiReady && /* @__PURE__ */ jsx("div", { className: styles$a.aiReadinessHint, children: "יש למלא שם עסק ותחום עיסוק לפני יצירת תוכן עם AI." }),
          aiState === "error" && /* @__PURE__ */ jsxs("div", { className: styles$a.aiError, children: [
            /* @__PURE__ */ jsx("span", { children: aiError2 }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$a.aiDismissLink,
                onClick: handleAiDismiss,
                children: "סגור"
              }
            )
          ] }),
          aiState === "preview" && aiSuggestion && /* @__PURE__ */ jsxs("div", { className: styles$a.aiPreview, children: [
            /* @__PURE__ */ jsx("div", { className: styles$a.aiPreviewLabel, children: "הצעת AI:" }),
            /* @__PURE__ */ jsxs("div", { className: styles$a.aiPreviewField, children: [
              /* @__PURE__ */ jsx("span", { className: styles$a.aiPreviewKey, children: "כותרת:" }),
              " ",
              aiSuggestion.seoTitle || "-"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$a.aiPreviewField, children: [
              /* @__PURE__ */ jsx("span", { className: styles$a.aiPreviewKey, children: "תיאור:" }),
              " ",
              aiSuggestion.seoDescription || "-"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: styles$a.aiActions, children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: styles$a.aiApplyBtn,
                  onClick: handleAiApply,
                  children: "החל"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: styles$a.aiDismissBtn,
                  onClick: handleAiDismiss,
                  children: "בטל"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: styles$a.sectionContent, children: /* @__PURE__ */ jsxs("div", { className: styles$a.row, children: [
          /* @__PURE__ */ jsxs("label", { className: styles$a.field, children: [
            /* @__PURE__ */ jsx("span", { className: styles$a.labelText, children: "כותרת העמוד בגוגל" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: formStyles.input,
                type: "text",
                value: value.title || "",
                onChange: (e) => update("title", e.target.value),
                disabled
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("label", { className: styles$a.field, children: [
            /* @__PURE__ */ jsx("span", { className: styles$a.labelText, children: "תיאור העמוד בגוגל" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                className: formStyles.textarea,
                rows: 3,
                value: value.description || "",
                onChange: (e) => update("description", e.target.value),
                disabled
              }
            )
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(
        "details",
        {
          className: styles$a.collapsible,
          open: hasUrlsContent || void 0,
          children: [
            /* @__PURE__ */ jsx("summary", { className: styles$a.collapsibleTrigger, children: "כתובות ואינדוקס" }),
            /* @__PURE__ */ jsxs("div", { className: styles$a.collapsibleContent, children: [
              /* @__PURE__ */ jsx("div", { className: styles$a.row, children: /* @__PURE__ */ jsx("div", { className: styles$a.fieldFull, children: /* @__PURE__ */ jsxs("div", { className: styles$a.helperBlock, children: [
                /* @__PURE__ */ jsx("div", { className: styles$a.helperHeader, children: /* @__PURE__ */ jsx("div", { className: styles$a.helperTitle, children: "כתובת URL הציבורית של הכרטיס" }) }),
                /* @__PURE__ */ jsx("div", { className: styles$a.helperValue, children: computedPublicUrl || "" }),
                /* @__PURE__ */ jsx("div", { className: styles$a.hintText, children: "בעת שיתוף הכרטיס, רשתות חברתיות רואות תצוגה מקדימה ומפנות אוטומטית לכתובת URL זו." })
              ] }) }) }),
              /* @__PURE__ */ jsx("div", { className: styles$a.row, children: /* @__PURE__ */ jsxs("div", { className: styles$a.field, children: [
                /* @__PURE__ */ jsx("span", { className: styles$a.labelText, children: "הוראות אינדוקס למנועי חיפוש" }),
                /* @__PURE__ */ jsx("div", { className: styles$a.selectWrap, children: /* @__PURE__ */ jsxs(
                  "select",
                  {
                    className: styles$a.robotsSelect,
                    value: robotsManual ? "advanced" : !(value.robots || "").trim() ? "default" : /noindex/i.test(
                      value.robots
                    ) ? "hide" : "advanced",
                    disabled,
                    onChange: (e) => {
                      const mode = e.target.value;
                      if (mode === "default") {
                        setRobotsManual(false);
                        robotsLocalRef.current = "";
                        update("robots", "");
                      } else if (mode === "hide") {
                        setRobotsManual(false);
                        robotsLocalRef.current = "noindex, nofollow";
                        update(
                          "robots",
                          "noindex, nofollow"
                        );
                      } else {
                        setRobotsManual(true);
                      }
                    },
                    children: [
                      /* @__PURE__ */ jsx("option", { value: "default", children: "ברירת מחדל - הצג בגוגל (מומלץ)" }),
                      /* @__PURE__ */ jsx("option", { value: "hide", children: "לא להציג בגוגל" }),
                      /* @__PURE__ */ jsx("option", { value: "advanced", children: "הגדרה ידנית (מתקדם)" })
                    ]
                  }
                ) }),
                !(value.robots || "").trim() ? /* @__PURE__ */ jsx("div", { className: styles$a.hintText, children: "כברירת מחדל, הכרטיס שלכם מופיע בגוגל ובמנועי חיפוש אחרים. אין צורך לשנות הגדרה זו." }) : /noindex/i.test(value.robots || "") ? /* @__PURE__ */ jsx("div", { className: styles$a.warningText, children: "שימו לב: הגדרה זו עלולה למנוע מגוגל להציג את הכרטיס בתוצאות החיפוש." }) : null,
                (robotsManual || Boolean((value.robots || "").trim()) && !/noindex/i.test(
                  value.robots || ""
                )) && /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: formStyles.input,
                    type: "text",
                    value: value.robots || "",
                    onChange: (e) => {
                      robotsLocalRef.current = e.target.value;
                      update("robots", e.target.value);
                    },
                    disabled
                  }
                )
              ] }) })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "details",
        {
          className: styles$a.collapsible,
          open: hasVerificationContent || void 0,
          children: [
            /* @__PURE__ */ jsx("summary", { className: styles$a.collapsibleTrigger, children: "אימות בעלות (גוגל, פייסבוק)" }),
            /* @__PURE__ */ jsxs("div", { className: styles$a.collapsibleContent, children: [
              /* @__PURE__ */ jsx("div", { className: styles$a.sectionHint, children: "שדות אלה רלוונטיים רק אם קיבלתם קוד אימות מגוגל או מפייסבוק." }),
              /* @__PURE__ */ jsxs("div", { className: styles$a.row, children: [
                /* @__PURE__ */ jsxs("label", { className: styles$a.field, children: [
                  /* @__PURE__ */ jsx("span", { className: styles$a.labelText, children: "אימות אתר בגוגל" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: formStyles.input,
                      type: "text",
                      value: value.googleSiteVerification || "",
                      onChange: (e) => update(
                        "googleSiteVerification",
                        e.target.value
                      ),
                      disabled
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("label", { className: styles$a.field, children: [
                  /* @__PURE__ */ jsx("span", { className: styles$a.labelText, children: "אימות דומיין בפייסבוק" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: formStyles.input,
                      type: "text",
                      value: value.facebookDomainVerification || "",
                      onChange: (e) => update(
                        "facebookDomainVerification",
                        e.target.value
                      ),
                      disabled
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
          className: styles$a.collapsible,
          open: hasTrackingContent || void 0,
          children: [
            /* @__PURE__ */ jsx("summary", { className: styles$a.collapsibleTrigger, children: "מדידה ומעקב (גוגל, פייסבוק)" }),
            /* @__PURE__ */ jsxs("div", { className: styles$a.collapsibleContent, children: [
              /* @__PURE__ */ jsx("div", { className: styles$a.sectionHint, children: "שדות אלה רלוונטיים רק אם יש לכם מזהים מ-Google או Meta." }),
              /* @__PURE__ */ jsxs("div", { className: styles$a.row, children: [
                /* @__PURE__ */ jsxs("label", { className: styles$a.field, children: [
                  /* @__PURE__ */ jsx("span", { className: styles$a.labelText, children: "מזהה Google Tag Manager" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: formStyles.input,
                      type: "text",
                      value: value.gtmId || "",
                      onChange: (e) => update("gtmId", e.target.value),
                      disabled,
                      placeholder: "GTM-XXXXXXX"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("label", { className: styles$a.field, children: [
                  /* @__PURE__ */ jsx("span", { className: styles$a.labelText, children: "מזהה Google Analytics" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: formStyles.input,
                      type: "text",
                      value: value.gaMeasurementId || "",
                      onChange: (e) => update(
                        "gaMeasurementId",
                        e.target.value
                      ),
                      disabled,
                      placeholder: "G-XXXXXXX"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("label", { className: styles$a.field, children: [
                  /* @__PURE__ */ jsx("span", { className: styles$a.labelText, children: "מזהה Meta Pixel" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: formStyles.input,
                      type: "text",
                      value: value.metaPixelId || "",
                      onChange: (e) => update("metaPixelId", e.target.value),
                      disabled
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
          className: styles$a.collapsible,
          open: hasJsonLdContent || void 0,
          children: [
            /* @__PURE__ */ jsx("summary", { className: styles$a.collapsibleTrigger, children: "מידע מובנה לגוגל" }),
            /* @__PURE__ */ jsxs("div", { className: styles$a.collapsibleContent, children: [
              /* @__PURE__ */ jsx("div", { className: styles$a.sectionHint, children: "המערכת יכולה ליצור מידע מובנה בסיסי שיעזור לגוגל להבין ולהציג את העסק בצורה מדויקת יותר. בחרו את סוג העסק ולחצו כדי ליצור תבנית התחלתית." }),
              /* @__PURE__ */ jsx("div", { className: styles$a.row, children: /* @__PURE__ */ jsx("div", { className: styles$a.fieldFull, children: /* @__PURE__ */ jsxs("div", { className: styles$a.jsonLdHelperRow, children: [
                /* @__PURE__ */ jsx("div", { className: styles$a.selectWrap, children: /* @__PURE__ */ jsxs(
                  "select",
                  {
                    className: `${formStyles.input} ${styles$a.jsonLdSelect}`,
                    value: jsonLdTemplateType,
                    onChange: (e) => setJsonLdTemplateType(
                      e.target.value
                    ),
                    disabled,
                    "aria-label": "סוג העסק",
                    children: [
                      /* @__PURE__ */ jsx("option", { value: "Person", children: "אדם (Person)" }),
                      /* @__PURE__ */ jsx("option", { value: "LocalBusiness", children: "עסק מקומי (LocalBusiness)" }),
                      /* @__PURE__ */ jsx("option", { value: "Organization", children: "ארגון (Organization)" })
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsx("div", { className: styles$a.jsonLdActions, children: /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: styles$a.helperButton,
                    onClick: handleInsertJsonLdTemplate,
                    disabled,
                    children: "צור מידע מובנה"
                  }
                ) })
              ] }) }) }),
              /* @__PURE__ */ jsxs(
                "details",
                {
                  className: styles$a.collapsible,
                  open: hadJsonLdOnEntry || void 0,
                  children: [
                    /* @__PURE__ */ jsx("summary", { className: styles$a.collapsibleTrigger, children: "מתקדם - עריכה ידנית" }),
                    /* @__PURE__ */ jsx("div", { className: styles$a.collapsibleContent, children: /* @__PURE__ */ jsx("div", { className: styles$a.row, children: /* @__PURE__ */ jsxs("label", { className: styles$a.fieldFull, children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: styles$a.helperButton,
                          onClick: handleSyncJsonLdFromCanonical,
                          disabled: disabled || !jsonLdStatus?.valid || !jsonLdStatus?.root || !resolveJsonLdBaseUrl(),
                          children: "עדכן כתובות מהכתובת הראשית"
                        }
                      ),
                      jsonLdStatus?.hasValue ? /* @__PURE__ */ jsx(
                        "div",
                        {
                          className: jsonLdStatus.valid ? styles$a.jsonOkText : styles$a.jsonBadText,
                          children: jsonLdStatus.valid ? "הקוד תקין" : "יש שגיאה בקוד"
                        }
                      ) : null,
                      /* @__PURE__ */ jsx(
                        "textarea",
                        {
                          className: formStyles.textarea,
                          rows: 6,
                          maxLength: 5e3,
                          value: value.jsonLd || "",
                          onChange: (e) => update("jsonLd", e.target.value),
                          disabled,
                          placeholder: '{"@context":"https://schema.org","@type":"LocalBusiness","name":"שם העסק"}'
                        }
                      )
                    ] }) }) })
                  ]
                }
              )
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      SeoAiConsentModal,
      {
        open: showConsent,
        onConfirm: handleConsentConfirm,
        onCancel: handleConsentCancel
      }
    ),
    /* @__PURE__ */ jsx(
      JsonLdOverwriteConfirmModal,
      {
        open: showOverwriteConfirm,
        onConfirm: handleOverwriteConfirm,
        onCancel: handleOverwriteCancel
      }
    )
  ] });
}
const grid = "_grid_1vtve_1";
const banner = "_banner_1vtve_13";
const selfExcludeRow = "_selfExcludeRow_1vtve_29";
const selfExcludeLabel = "_selfExcludeLabel_1vtve_49";
const selfExcludeHint = "_selfExcludeHint_1vtve_67";
const kpis = "_kpis_1vtve_79";
const kpiCard = "_kpiCard_1vtve_91";
const kpiLabel = "_kpiLabel_1vtve_105";
const kpiValue = "_kpiValue_1vtve_117";
const small = "_small_1vtve_129";
const table = "_table_1vtve_139";
const chart = "_chart_1vtve_179";
const chartHeader = "_chartHeader_1vtve_193";
const svg = "_svg_1vtve_205";
const legend = "_legend_1vtve_217";
const dot = "_dot_1vtve_233";
const dotViews = "_dotViews_1vtve_249";
const dotClicks = "_dotClicks_1vtve_257";
const loadingText = "_loadingText_1vtve_273";
const errorText$1 = "_errorText_1vtve_281";
const headerRow = "_headerRow_1vtve_289";
const headerTitle = "_headerTitle_1vtve_305";
const section$1 = "_section_1vtve_315";
const divider = "_divider_1vtve_329";
const sectionHeader = "_sectionHeader_1vtve_341";
const sectionTitleRow = "_sectionTitleRow_1vtve_355";
const sectionTitle$1 = "_sectionTitle_1vtve_355";
const sectionTitlePlain = "_sectionTitlePlain_1vtve_379";
const sectionSubtitle = "_sectionSubtitle_1vtve_391";
const tooltip = "_tooltip_1vtve_401";
const inlineTooltip = "_inlineTooltip_1vtve_403";
const tooltipText = "_tooltipText_1vtve_433";
const toggleRow = "_toggleRow_1vtve_495";
const rowMuted = "_rowMuted_1vtve_513";
const rowKey = "_rowKey_1vtve_521";
const accordion = "_accordion_1vtve_529";
const accordionItem = "_accordionItem_1vtve_541";
const accordionHeader = "_accordionHeader_1vtve_553";
const accordionTitle = "_accordionTitle_1vtve_581";
const badges = "_badges_1vtve_589";
const badge = "_badge_1vtve_589";
const chevron = "_chevron_1vtve_617";
const accordionContent = "_accordionContent_1vtve_627";
const campaignRow = "_campaignRow_1vtve_637";
const lockedBlock = "_lockedBlock_1vtve_649";
const lockedTitle = "_lockedTitle_1vtve_669";
const lockedText = "_lockedText_1vtve_681";
const lockedCta = "_lockedCta_1vtve_693";
const bannerCta = "_bannerCta_1vtve_731";
const styles$9 = {
  grid,
  banner,
  selfExcludeRow,
  selfExcludeLabel,
  selfExcludeHint,
  kpis,
  kpiCard,
  kpiLabel,
  kpiValue,
  small,
  table,
  chart,
  chartHeader,
  svg,
  legend,
  dot,
  dotViews,
  dotClicks,
  loadingText,
  errorText: errorText$1,
  headerRow,
  headerTitle,
  section: section$1,
  divider,
  sectionHeader,
  sectionTitleRow,
  sectionTitle: sectionTitle$1,
  sectionTitlePlain,
  sectionSubtitle,
  tooltip,
  inlineTooltip,
  tooltipText,
  toggleRow,
  rowMuted,
  rowKey,
  accordion,
  accordionItem,
  accordionHeader,
  accordionTitle,
  badges,
  badge,
  chevron,
  accordionContent,
  campaignRow,
  lockedBlock,
  lockedTitle,
  lockedText,
  lockedCta,
  bannerCta
};
const SECTION_COPY = {
  platforms: {
    title: "מאיפה הגיעו מבקרים",
    subtitle: "מאילו פלטפורמות הגיעו המבקרים",
    tooltip: "מקור כללי של התנועה (אינסטגרם, פייסבוק, גוגל)"
  },
  campaigns: {
    title: "קמפיינים ופרסומות",
    subtitle: "ביצועי פרסומות לפי פלטפורמה",
    tooltip: "קמפיינים כפי שנמדדו דרך תגיות UTM"
  },
  transitions: {
    title: "איך הם הגיעו",
    subtitle: "כניסה ישירה או דרך הפניה",
    tooltip: "אופן ההגעה לעמוד"
  },
  contactActions: {
    title: "לחיצות על כפתורי קשר",
    subtitle: "כמה פעמים מבקרים לחצו על טלפון או וואטסאפ לפי תקופה.",
    tooltip: null
  }
};
const REFERRER_LABEL = {
  direct: "ישיר (direct)",
  google: "גוגל (Google)",
  instagram: "אינסטגרם (Instagram)",
  facebook: "פייסבוק (Facebook)",
  tiktok: "טיקטוק (TikTok)",
  other: "אחר"
};
function sourceLabel(key) {
  return REFERRER_LABEL[key] || key;
}
function SectionHeader({ title: title2, subtitle: subtitle2, tooltip: tooltip2 }) {
  return /* @__PURE__ */ jsxs("div", { className: styles$9.sectionHeader, children: [
    /* @__PURE__ */ jsxs("div", { className: styles$9.sectionTitleRow, children: [
      /* @__PURE__ */ jsx("div", { className: styles$9.sectionTitle, children: title2 }),
      tooltip2 ? /* @__PURE__ */ jsxs(
        "span",
        {
          className: styles$9.tooltip,
          tabIndex: 0,
          role: "button",
          "aria-label": tooltip2,
          children: [
            "i",
            /* @__PURE__ */ jsx("span", { className: styles$9.tooltipText, children: tooltip2 })
          ]
        }
      ) : null
    ] }),
    subtitle2 ? /* @__PURE__ */ jsx("div", { className: styles$9.sectionSubtitle, children: subtitle2 }) : null
  ] });
}
function formatInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat().format(Math.round(n));
}
function formatPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${(n * 100).toFixed(1)}%`;
}
function sumSeries(series, field2) {
  return (series || []).reduce((s, x) => s + (Number(x?.[field2]) || 0), 0);
}
function buildLinePoints(series, field2, { width, height, padding }) {
  const data = (series || []).map((x) => Number(x?.[field2]) || 0);
  if (!data.length) return "";
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const dx = (width - 2 * padding) / Math.max(1, data.length - 1);
  const scaleY = (v) => {
    const t = (v - min) / Math.max(1e-9, max - min);
    return height - padding - t * (height - 2 * padding);
  };
  return data.map((v, i) => {
    const x = padding + i * dx;
    const y = scaleY(v);
    return `${x},${y}`;
  }).join(" ");
}
function toRows(obj, { limit = 10 } = {}) {
  return Object.entries(obj || {}).map(([k, v]) => ({ key: k, count: Number(v) || 0 })).filter((x) => x.key && x.count > 0).sort((a, b) => b.count - a.count).slice(0, limit);
}
function sortCampaignRows(rows) {
  const list2 = Array.isArray(rows) ? rows.slice() : [];
  list2.sort((a, b) => {
    const ac = Number(a?.clicks) || 0;
    const bc = Number(b?.clicks) || 0;
    if (bc !== ac) return bc - ac;
    const av = Number(a?.views) || 0;
    const bv = Number(b?.views) || 0;
    return bv - av;
  });
  return list2;
}
const DEMO_SERIES = Array.from({ length: 30 }, (_, i) => ({
  day: `demo-${i}`,
  views: 120 + Math.floor(20 * Math.sin(i / 2)),
  clicksTotal: 18 + Math.floor(5 * Math.cos(i / 3))
}));
const DEMO_SUMMARY = {
  isDemo: true,
  series: DEMO_SERIES,
  today: {
    views: DEMO_SERIES[29].views,
    clicksTotal: DEMO_SERIES[29].clicksTotal,
    uniqueVisitors: 320
  },
  kpi: { uniqueVisitorsIsApprox: true }
};
const DEMO_SOURCES = {
  socialSources: [
    { source: "google", views: 180, clicks: 32, conversion: 0.178 },
    { source: "instagram", views: 140, clicks: 25, conversion: 0.179 },
    { source: "facebook", views: 80, clicks: 14, conversion: 0.175 },
    { source: "direct", views: 220, clicks: 40, conversion: 0.182 }
  ],
  referrers: {
    direct: 220,
    google: 180,
    instagram: 90,
    facebook: 60,
    other: 40
  },
  socialCampaignSources: [
    {
      source: "google",
      views: 180,
      clicks: 32,
      conversion: 0.178,
      campaigns: [
        { name: "winter_sale", views: 68, clicks: 14 },
        { name: "qr_store", views: 25, clicks: 5 }
      ]
    },
    {
      source: "instagram",
      views: 140,
      clicks: 25,
      conversion: 0.179,
      campaigns: [
        { name: "winter_sale", views: 50, clicks: 10 },
        { name: "qr_store", views: 19, clicks: 4 }
      ]
    },
    {
      source: "facebook",
      views: 80,
      clicks: 14,
      conversion: 0.175,
      campaigns: [
        { name: "winter_sale", views: 29, clicks: 6 },
        { name: "qr_store", views: 11, clicks: 2 }
      ]
    }
  ]
};
const DEMO_ACTIONS_1 = { actions: { call: 2, whatsapp: 5 } };
const DEMO_ACTIONS_7 = { actions: { call: 11, whatsapp: 28 } };
const DEMO_ACTIONS_30 = { actions: { call: 46, whatsapp: 120 } };
function AnalyticsPanel({ card: card2 }) {
  const analyticsLevel = card2?.entitlements?.analyticsLevel || "none";
  const canViewAnalytics = Boolean(card2?.entitlements?.canViewAnalytics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [sources, setSources] = useState(null);
  const [actions1, setActions1] = useState(null);
  const [actions7, setActions7] = useState(null);
  const [actions30, setActions30] = useState(null);
  const [showNoClickSources, setShowNoClickSources] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState({});
  const selfExcludeKey = useMemo(
    () => getOwnerSelfExcludeKey(card2?.publicPath),
    [card2?.publicPath]
  );
  const [selfExclude, setSelfExclude] = useState(false);
  useEffect(() => {
    if (!selfExcludeKey) {
      setSelfExclude(false);
      return;
    }
    try {
      localStorage.removeItem(LEGACY_OWNER_SELF_EXCLUDE_KEY);
      const stored = localStorage.getItem(selfExcludeKey);
      if (stored === null) {
        localStorage.setItem(selfExcludeKey, "1");
        setSelfExclude(true);
      } else {
        setSelfExclude(stored === "1");
      }
    } catch {
      setSelfExclude(false);
    }
  }, [selfExcludeKey]);
  function handleSelfExcludeChange(e) {
    if (!selfExcludeKey) return;
    const checked = e.target.checked;
    setSelfExclude(checked);
    try {
      localStorage.setItem(selfExcludeKey, checked ? "1" : "0");
    } catch {
    }
  }
  const rangeDays = useMemo(() => {
    if (analyticsLevel === "premium") return 30;
    if (analyticsLevel === "demo") return 30;
    return 30;
  }, [analyticsLevel]);
  async function load() {
    if (!card2?._id || !canViewAnalytics) return;
    if (analyticsLevel === "demo") {
      setSummary(DEMO_SUMMARY);
      setSources(DEMO_SOURCES);
      setActions1(DEMO_ACTIONS_1);
      setActions7(DEMO_ACTIONS_7);
      setActions30(DEMO_ACTIONS_30);
      setError(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const act1Promise = api.get(`/analytics/actions/${card2._id}?range=1`).catch(() => null);
      const act7Promise = api.get(`/analytics/actions/${card2._id}?range=7`).catch(() => null);
      const act30Promise = api.get(`/analytics/actions/${card2._id}?range=30`).catch(() => null);
      const [s, so, act1, act7, act30] = await Promise.all([
        api.get(`/analytics/summary/${card2._id}?range=${rangeDays}`),
        api.get(`/analytics/sources/${card2._id}?range=${rangeDays}`),
        act1Promise,
        act7Promise,
        act30Promise
      ]);
      setSummary(s?.data || null);
      setSources(so?.data || null);
      setActions1(act1?.data || null);
      setActions7(act7?.data || null);
      setActions30(act30?.data || null);
    } catch (err) {
      console.error(
        "analytics load failed",
        err?.response?.status,
        err?.response?.data || err
      );
      setError("שגיאה בטעינת אנליטיקה");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [card2?._id, analyticsLevel, rangeDays, canViewAnalytics]);
  if (!canViewAnalytics || analyticsLevel === "none") {
    return /* @__PURE__ */ jsx(Panel, { title: "אנליטיקה", children: /* @__PURE__ */ jsxs("div", { className: styles$9.lockedBlock, children: [
      /* @__PURE__ */ jsx("div", { className: styles$9.lockedTitle, children: "אנליטיקה זמינה רק בפרימיום" }),
      /* @__PURE__ */ jsx("div", { className: styles$9.lockedText, children: "כדי לראות נתוני צפיות, קליקים ומקורות תנועה - צריך מסלול פרימיום." }),
      /* @__PURE__ */ jsx("a", { href: "/pricing", className: styles$9.lockedCta, children: "שדרג לפרימיום" })
    ] }) });
  }
  const series = summary?.series || [];
  const views30 = sumSeries(series, "views");
  const clicks30 = sumSeries(series, "clicksTotal");
  const last7 = series.slice(-7);
  const views7 = sumSeries(last7, "views");
  sumSeries(last7, "clicksTotal");
  const today = summary?.today || null;
  const uniqueToday = today?.uniqueVisitors;
  const conversion30 = views30 > 0 ? clicks30 / views30 : 0;
  const chartWidth = 800;
  const chartHeight = 140;
  const padding = 10;
  const viewPoints = buildLinePoints(series, "views", {
    width: chartWidth,
    height: chartHeight,
    padding
  });
  const clickPoints = buildLinePoints(series, "clicksTotal", {
    width: chartWidth,
    height: chartHeight,
    padding
  });
  const isPremiumLike = analyticsLevel === "premium" || analyticsLevel === "demo";
  const platformRows = useMemo(() => {
    const raw = Array.isArray(sources?.socialSources) ? sources.socialSources : [];
    const rows = raw.map((r) => {
      const source = String(r?.source || "").trim();
      const views = Number(r?.views) || 0;
      const clicks = r?.clicks === null || r?.clicks === void 0 ? null : Number(r?.clicks) || 0;
      return {
        source,
        views,
        clicks,
        conversion: r?.conversion === null || r?.conversion === void 0 ? null : Number(r?.conversion) || 0
      };
    }).filter((r) => r.source && (r.views > 0 || (r.clicks || 0) > 0));
    rows.sort((a, b) => {
      if (isPremiumLike) {
        const ac = Number(a?.clicks) || 0;
        const bc = Number(b?.clicks) || 0;
        if (bc !== ac) return bc - ac;
      }
      return (b.views || 0) - (a.views || 0);
    });
    if (isPremiumLike && !showNoClickSources) {
      return rows.filter((r) => (Number(r?.clicks) || 0) > 0);
    }
    return rows;
  }, [sources, isPremiumLike, showNoClickSources]);
  const transitionRows = useMemo(() => {
    return toRows(sources?.referrers || {}, { limit: 20 });
  }, [sources]);
  const campaignsByPlatform = useMemo(() => {
    const raw = Array.isArray(sources?.socialCampaignSources) ? sources.socialCampaignSources : [];
    const rows = raw.map((p) => {
      const source = String(p?.source || "").trim();
      const views = Number(p?.views) || 0;
      const clicks = Number(p?.clicks) || 0;
      const campaignsRaw = Array.isArray(p?.campaigns) ? p.campaigns : [];
      const campaigns = sortCampaignRows(
        campaignsRaw.map((c) => ({
          name: String(c?.name || "").trim(),
          views: Number(c?.views) || 0,
          clicks: Number(c?.clicks) || 0
        })).filter((c) => c.name && (c.views > 0 || c.clicks > 0))
      );
      return { source, views, clicks, campaigns };
    }).filter((x) => x.source);
    rows.sort((a, b) => {
      const ac = Number(a?.clicks) || 0;
      const bc = Number(b?.clicks) || 0;
      if (bc !== ac) return bc - ac;
      const av = Number(a?.views) || 0;
      const bv = Number(b?.views) || 0;
      return bv - av;
    });
    return rows;
  }, [sources]);
  function togglePlatform(source) {
    setExpandedPlatforms((prev) => ({
      ...prev,
      [source]: !prev?.[source]
    }));
  }
  return /* @__PURE__ */ jsx(Panel, { title: "אנליטיקה", children: /* @__PURE__ */ jsxs("div", { className: styles$9.grid, children: [
    Boolean(summary?.isDemo) && /* @__PURE__ */ jsxs("div", { className: styles$9.banner, children: [
      "דוגמה של לקוח פרימיום",
      /* @__PURE__ */ jsx("a", { href: "/pricing", className: styles$9.bannerCta, children: "שדרג לפרימיום" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: styles$9.headerRow, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$9.headerTitle, children: [
        "רמת אנליטיקה:",
        " ",
        analyticsLevel === "premium" ? "פרימיום" : analyticsLevel === "demo" ? "דמו" : analyticsLevel
      ] }),
      /* @__PURE__ */ jsx(
        Button,
        {
          variant: "secondary",
          onClick: load,
          disabled: loading,
          children: "רענון"
        }
      )
    ] }),
    selfExcludeKey && /* @__PURE__ */ jsxs("div", { className: styles$9.selfExcludeRow, children: [
      /* @__PURE__ */ jsxs("label", { className: styles$9.selfExcludeLabel, children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            checked: selfExclude,
            onChange: handleSelfExcludeChange
          }
        ),
        /* @__PURE__ */ jsx("span", { children: "אל תכלול את הביקורים שלי באנליטיקה" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$9.selfExcludeHint, children: "כשתפתח את הכרטיס שלך מדפדפן זה, הצפיות והלחיצות שלך לא ייספרו." })
    ] }),
    error && /* @__PURE__ */ jsx("div", { className: styles$9.errorText, children: error }),
    (analyticsLevel === "demo" || analyticsLevel === "premium") && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: styles$9.kpis, children: [
        /* @__PURE__ */ jsxs("div", { className: styles$9.kpiCard, children: [
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiLabel, children: "היום" }),
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiValue, children: formatInt(today?.views) }),
          /* @__PURE__ */ jsx("div", { className: styles$9.small, children: "צפיות" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$9.kpiCard, children: [
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiLabel, children: "היום" }),
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiValue, children: analyticsLevel === "premium" ? formatInt(today?.clicksTotal) : formatInt(today?.clicksTotal) }),
          /* @__PURE__ */ jsx("div", { className: styles$9.small, children: "לחיצות" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$9.kpiCard, children: [
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiLabel, children: "7 ימים" }),
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiValue, children: formatInt(views7) }),
          /* @__PURE__ */ jsx("div", { className: styles$9.small, children: "צפיות" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$9.kpiCard, children: [
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiLabel, children: "30 ימים" }),
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiValue, children: formatInt(views30) }),
          /* @__PURE__ */ jsx("div", { className: styles$9.small, children: "צפיות" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$9.kpiCard, children: [
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiLabel, children: "מבקרים ייחודיים (היום)" }),
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiValue, children: uniqueToday === null || uniqueToday === void 0 ? "-" : formatInt(uniqueToday) }),
          /* @__PURE__ */ jsx("div", { className: styles$9.small, children: summary?.kpi?.uniqueVisitorsIsApprox ? "בקירוב" : "" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$9.kpiCard, children: [
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiLabel, children: "המרה (30 ימים)" }),
          /* @__PURE__ */ jsx("div", { className: styles$9.kpiValue, children: formatPct(conversion30) }),
          /* @__PURE__ */ jsx("div", { className: styles$9.small, children: "לחיצות / צפיות" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$9.chart, children: [
        /* @__PURE__ */ jsx("div", { className: styles$9.chartHeader, children: "פעילות (צפיות + לחיצות)" }),
        /* @__PURE__ */ jsxs(
          "svg",
          {
            className: styles$9.svg,
            viewBox: `0 0 ${chartWidth} ${chartHeight}`,
            preserveAspectRatio: "none",
            children: [
              viewPoints && /* @__PURE__ */ jsx(
                "polyline",
                {
                  points: viewPoints,
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "3",
                  opacity: "0.85"
                }
              ),
              clickPoints && /* @__PURE__ */ jsx(
                "polyline",
                {
                  points: clickPoints,
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  opacity: "0.35",
                  strokeDasharray: "6 4"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: styles$9.legend, children: [
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx(
              "span",
              {
                className: `${styles$9.dot} ${styles$9.dotViews}`
              }
            ),
            " ",
            "צפיות"
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx(
              "span",
              {
                className: `${styles$9.dot} ${styles$9.dotClicks}`
              }
            ),
            " ",
            "לחיצות"
          ] })
        ] })
      ] }),
      (actions1 !== null || actions7 !== null || actions30 !== null) && /* @__PURE__ */ jsxs("div", { className: styles$9.section, children: [
        /* @__PURE__ */ jsx(
          SectionHeader,
          {
            ...SECTION_COPY.contactActions
          }
        ),
        /* @__PURE__ */ jsxs("table", { className: styles$9.table, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("th", { children: "פעולה" }),
            /* @__PURE__ */ jsx("th", { children: "היום" }),
            /* @__PURE__ */ jsx("th", { children: "7 ימים" }),
            /* @__PURE__ */ jsx("th", { children: "30 ימים" })
          ] }) }),
          /* @__PURE__ */ jsxs("tbody", { children: [
            /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("td", { children: "טלפון" }),
              /* @__PURE__ */ jsx("td", { children: actions1 === null ? "-" : formatInt(
                Number(
                  actions1?.actions?.call
                ) || 0
              ) }),
              /* @__PURE__ */ jsx("td", { children: actions7 === null ? "-" : formatInt(
                Number(
                  actions7?.actions?.call
                ) || 0
              ) }),
              /* @__PURE__ */ jsx("td", { children: actions30 === null ? "-" : formatInt(
                Number(
                  actions30?.actions?.call
                ) || 0
              ) })
            ] }),
            /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("td", { children: "וואטסאפ" }),
              /* @__PURE__ */ jsx("td", { children: actions1 === null ? "-" : formatInt(
                Number(
                  actions1?.actions?.whatsapp
                ) || 0
              ) }),
              /* @__PURE__ */ jsx("td", { children: actions7 === null ? "-" : formatInt(
                Number(
                  actions7?.actions?.whatsapp
                ) || 0
              ) }),
              /* @__PURE__ */ jsx("td", { children: actions30 === null ? "-" : formatInt(
                Number(
                  actions30?.actions?.whatsapp
                ) || 0
              ) })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: styles$9.section, children: [
        /* @__PURE__ */ jsx(SectionHeader, { ...SECTION_COPY.platforms }),
        isPremiumLike && /* @__PURE__ */ jsxs("label", { className: styles$9.toggleRow, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: showNoClickSources,
              onChange: (e) => setShowNoClickSources(
                e.target.checked
              )
            }
          ),
          /* @__PURE__ */ jsx("span", { children: "הצג מקורות ללא קליקים" })
        ] }),
        platformRows.length ? /* @__PURE__ */ jsxs("table", { className: styles$9.table, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("th", { children: "פלטפורמה" }),
            isPremiumLike ? /* @__PURE__ */ jsx("th", { children: "קליקים" }) : null,
            /* @__PURE__ */ jsx("th", { children: "צפיות" }),
            isPremiumLike ? /* @__PURE__ */ jsx("th", { children: "המרה" }) : null
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: platformRows.map((r) => {
            const clicks = Number(r?.clicks) || 0;
            const isMuted = isPremiumLike && clicks === 0;
            return /* @__PURE__ */ jsxs(
              "tr",
              {
                className: isMuted ? styles$9.rowMuted : void 0,
                children: [
                  /* @__PURE__ */ jsxs("td", { children: [
                    /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: styles$9.rowKey,
                        children: sourceLabel(
                          r.source
                        )
                      }
                    ),
                    isMuted ? /* @__PURE__ */ jsxs(
                      "span",
                      {
                        className: styles$9.inlineTooltip,
                        tabIndex: 0,
                        role: "button",
                        "aria-label": "עדיין ללא קליקים",
                        children: [
                          "i",
                          /* @__PURE__ */ jsx(
                            "span",
                            {
                              className: styles$9.tooltipText,
                              children: "עדיין ללא קליקים"
                            }
                          )
                        ]
                      }
                    ) : null
                  ] }),
                  isPremiumLike ? /* @__PURE__ */ jsx("td", { children: formatInt(
                    r.clicks
                  ) }) : null,
                  /* @__PURE__ */ jsx("td", { children: formatInt(r.views) }),
                  isPremiumLike ? /* @__PURE__ */ jsx("td", { children: r.conversion === null ? "-" : formatPct(
                    r.conversion
                  ) }) : null
                ]
              },
              r.source
            );
          }) })
        ] }) : /* @__PURE__ */ jsx("div", { className: styles$9.small, children: "אין נתונים עדיין" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$9.divider }),
      isPremiumLike ? /* @__PURE__ */ jsxs("div", { className: styles$9.section, children: [
        /* @__PURE__ */ jsx(SectionHeader, { ...SECTION_COPY.campaigns }),
        campaignsByPlatform.length ? /* @__PURE__ */ jsx("div", { className: styles$9.accordion, children: campaignsByPlatform.map((p) => {
          const expanded = Boolean(
            expandedPlatforms?.[p.source]
          );
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: styles$9.accordionItem,
              children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    className: styles$9.accordionHeader,
                    onClick: () => togglePlatform(
                      p.source
                    ),
                    children: [
                      /* @__PURE__ */ jsx(
                        "span",
                        {
                          className: styles$9.accordionTitle,
                          children: sourceLabel(
                            p.source
                          )
                        }
                      ),
                      /* @__PURE__ */ jsxs(
                        "span",
                        {
                          className: styles$9.badges,
                          children: [
                            /* @__PURE__ */ jsxs(
                              "span",
                              {
                                className: styles$9.badge,
                                children: [
                                  formatInt(
                                    p.clicks
                                  ),
                                  " ",
                                  "לחיצות"
                                ]
                              }
                            ),
                            /* @__PURE__ */ jsxs(
                              "span",
                              {
                                className: styles$9.badge,
                                children: [
                                  formatInt(
                                    p.views
                                  ),
                                  " ",
                                  "צפיות"
                                ]
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: styles$9.chevron,
                                "aria-hidden": "true",
                                children: expanded ? "▾" : "▸"
                              }
                            )
                          ]
                        }
                      )
                    ]
                  }
                ),
                expanded ? /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: styles$9.accordionContent,
                    children: p.campaigns.length ? /* @__PURE__ */ jsxs(
                      "table",
                      {
                        className: styles$9.table,
                        children: [
                          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
                            /* @__PURE__ */ jsx("th", { children: "קמפיין" }),
                            /* @__PURE__ */ jsx("th", { children: "קליקים" }),
                            /* @__PURE__ */ jsx("th", { children: "צפיות" })
                          ] }) }),
                          /* @__PURE__ */ jsx("tbody", { children: p.campaigns.map(
                            (c) => /* @__PURE__ */ jsxs(
                              "tr",
                              {
                                className: styles$9.campaignRow,
                                children: [
                                  /* @__PURE__ */ jsx("td", { children: c.name }),
                                  /* @__PURE__ */ jsx("td", { children: formatInt(
                                    c.clicks
                                  ) }),
                                  /* @__PURE__ */ jsx("td", { children: formatInt(
                                    c.views
                                  ) })
                                ]
                              },
                              `${p.source}__${c.name}`
                            )
                          ) })
                        ]
                      }
                    ) : /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: styles$9.small,
                        children: "אין נתוני קמפיינים לפלטפורמה זו"
                      }
                    )
                  }
                ) : null
              ]
            },
            p.source
          );
        }) }) : /* @__PURE__ */ jsx("div", { className: styles$9.small, children: "אין נתונים עדיין" })
      ] }) : null,
      /* @__PURE__ */ jsx("div", { className: styles$9.divider }),
      /* @__PURE__ */ jsxs("div", { className: styles$9.section, children: [
        /* @__PURE__ */ jsx(SectionHeader, { ...SECTION_COPY.transitions }),
        transitionRows.length ? /* @__PURE__ */ jsxs("table", { className: styles$9.table, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("th", { children: "מקור" }),
            /* @__PURE__ */ jsx("th", { children: "צפיות" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: transitionRows.map((r) => /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("td", { children: sourceLabel(r.key) }),
            /* @__PURE__ */ jsx("td", { children: formatInt(r.count) })
          ] }, r.key)) })
        ] }) : /* @__PURE__ */ jsx("div", { className: styles$9.small, children: "אין נתונים עדיין" })
      ] }),
      analyticsLevel === "premium" && summary?.compare && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: styles$9.sectionTitlePlain, children: "השוואה" }),
        /* @__PURE__ */ jsxs("table", { className: styles$9.table, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("th", { children: "תקופה" }),
            /* @__PURE__ */ jsx("th", { children: "צפיות" }),
            /* @__PURE__ */ jsx("th", { children: "לחיצות" })
          ] }) }),
          /* @__PURE__ */ jsxs("tbody", { children: [
            /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("td", { children: "7 ימים אחרונים" }),
              /* @__PURE__ */ jsx("td", { children: formatInt(
                summary?.compare?.last7?.views
              ) }),
              /* @__PURE__ */ jsx("td", { children: formatInt(
                summary?.compare?.last7?.clicksTotal
              ) })
            ] }),
            /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("td", { children: "7 ימים לפני כן" }),
              /* @__PURE__ */ jsx("td", { children: formatInt(
                summary?.compare?.prev7?.views
              ) }),
              /* @__PURE__ */ jsx("td", { children: formatInt(
                summary?.compare?.prev7?.clicksTotal
              ) })
            ] })
          ] })
        ] })
      ] })
    ] }),
    loading && /* @__PURE__ */ jsx("div", { className: styles$9.loadingText, children: "טוען…" })
  ] }) });
}
const root$2 = "_root_pyf3x_1";
const intro = "_intro_pyf3x_13";
const section = "_section_pyf3x_35";
const sectionTitle = "_sectionTitle_pyf3x_53";
const ctaStack = "_ctaStack_pyf3x_71";
const styles$8 = {
  root: root$2,
  intro,
  section,
  sectionTitle,
  ctaStack
};
function HelpPanel() {
  return /* @__PURE__ */ jsx(Panel, { title: "עזרה ותמיכה", children: /* @__PURE__ */ jsxs("div", { className: styles$8.root, children: [
    /* @__PURE__ */ jsx("p", { className: styles$8.intro, children: "צריכים עזרה ביצירת הכרטיס, בהגדרות או בכל דבר אחר? פשוט כתבו לנו - ונשמח לעזור." }),
    /* @__PURE__ */ jsxs("div", { className: styles$8.section, children: [
      /* @__PURE__ */ jsx("div", { className: styles$8.sectionTitle, children: "צור קשר" }),
      /* @__PURE__ */ jsxs("div", { className: styles$8.ctaStack, children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            as: "a",
            variant: "secondary",
            fullWidth: true,
            href: SUPPORT_WHATSAPP_URL,
            target: "_blank",
            rel: "noopener noreferrer",
            "aria-label": "פתח שיחת WhatsApp בחלון חדש",
            children: "שלח הודעה ב-WhatsApp"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            as: "a",
            variant: "ghost",
            fullWidth: true,
            href: "mailto:" + SUPPORT_EMAIL,
            "aria-label": "שלח מייל לתמיכה",
            children: "שלח מייל לתמיכה"
          }
        )
      ] })
    ] })
  ] }) });
}
function EditorPanel({
  tab: tab2,
  card: card2,
  onFieldChange,
  editingDisabled,
  onNavigateTab,
  onDeleteCard,
  onDeleteDesignAsset,
  deleteDesignAssetBusyKind,
  isDeleting,
  onUpgrade,
  onPublish,
  onUnpublish,
  onUpdateSlug,
  fieldErrors = {}
}) {
  const effectivePlan = card2?.effectiveBilling?.plan || "free";
  const galleryLimit = card2?.entitlements?.galleryLimit;
  function applyPatch(sectionName, patch) {
    if (!patch || typeof patch !== "object") return;
    for (const key of Object.keys(patch)) {
      onFieldChange?.(`${sectionName}.${key}`, patch[key]);
    }
  }
  switch (tab2) {
    case "templates":
      return /* @__PURE__ */ jsx(
        TemplateSelector,
        {
          value: normalizeTemplateId(card2?.design?.templateId),
          onSelect: (templateId) => {
            onFieldChange?.("design.templateId", templateId);
          }
        }
      );
    case "business":
      return /* @__PURE__ */ jsx(
        BusinessPanel,
        {
          business: card2.business,
          editingDisabled,
          onFieldChange: (sectionName, patch) => {
            if (sectionName !== "business") return;
            onFieldChange?.("business", patch);
          }
        }
      );
    case "contact":
      return /* @__PURE__ */ jsx(
        ContactPanel,
        {
          contact: card2.contact,
          editingDisabled,
          onFieldChange: (sectionName, patch) => {
            if (sectionName !== "contact") return;
            onFieldChange?.("contact", patch);
          },
          entitlements: card2?.entitlements,
          fieldErrors
        },
        card2?._id || "new-contact"
      );
    case "content":
      return /* @__PURE__ */ jsx(
        ContentPanel,
        {
          content: card2.content,
          cardId: card2._id,
          business: card2.business,
          disabled: editingDisabled,
          onNavigateTab,
          onChange: (patch) => applyPatch("content", patch),
          entitlements: card2?.entitlements,
          plan: effectivePlan
        }
      );
    case "services":
      return /* @__PURE__ */ jsx(
        ServicesPanel,
        {
          services: card2?.content?.services,
          disabled: editingDisabled,
          onChange: (patch) => applyPatch("content", patch),
          entitlements: card2?.entitlements
        }
      );
    case "businessHours":
      return /* @__PURE__ */ jsx(
        BusinessHoursPanel,
        {
          value: card2?.businessHours,
          disabled: editingDisabled,
          onChange: (nextBusinessHours) => onFieldChange?.("businessHours", nextBusinessHours),
          bookingSettings: card2?.bookingSettings,
          canUseBooking: card2?.entitlements?.canUseBooking === true,
          onBookingChange: (nextBooking) => onFieldChange?.("bookingSettings", nextBooking),
          entitlements: card2?.entitlements
        }
      );
    case "head":
      return /* @__PURE__ */ jsx(
        DesignPanel,
        {
          card: card2,
          design: card2.design,
          plan: effectivePlan,
          cardId: card2._id,
          onChange: (design) => onFieldChange?.("design", design),
          editingDisabled,
          onDeleteDesignAsset,
          deleteDesignAssetBusyKind
        }
      );
    case "design":
      return /* @__PURE__ */ jsx(
        SelfThemePanel,
        {
          card: card2,
          plan: effectivePlan,
          disabled: editingDisabled,
          onFieldChange
        }
      );
    case "gallery":
      return /* @__PURE__ */ jsx(
        GalleryPanel,
        {
          gallery: card2.gallery,
          cardId: card2._id,
          plan: effectivePlan,
          galleryLimit,
          onChange: (gallery) => onFieldChange?.("gallery", gallery),
          onUpgrade,
          entitlements: card2?.entitlements
        }
      );
    case "reviews":
      return /* @__PURE__ */ jsx(
        ReviewsPanel,
        {
          reviews: card2.reviews,
          onChange: (reviews) => onFieldChange?.("reviews", reviews)
        }
      );
    case "faq":
      return /* @__PURE__ */ jsx(
        FaqPanel,
        {
          faq: card2.faq,
          disabled: editingDisabled,
          onChange: (faq) => onFieldChange?.("faq", faq),
          cardId: card2._id,
          business: card2.business,
          onNavigateTab,
          entitlements: card2?.entitlements,
          plan: effectivePlan
        }
      );
    case "seo":
      return /* @__PURE__ */ jsx(
        SeoPanel,
        {
          seo: card2.seo,
          publicPath: card2?.publicPath,
          slug: card2?.slug,
          displayName: card2?.business?.name || card2?.business?.businessName || card2?.business?.ownerName || void 0,
          disabled: editingDisabled,
          onChange: (patch) => applyPatch("seo", patch),
          canEditSeo: card2?.entitlements?.canEditSeo === true,
          cardId: card2?._id,
          business: card2?.business,
          contact: card2?.contact,
          design: card2?.design
        }
      );
    case "settings":
      return /* @__PURE__ */ jsx(
        SettingsPanel,
        {
          card: card2,
          plan: effectivePlan,
          onDelete: onDeleteCard,
          onUpgrade,
          editingDisabled,
          isDeleting,
          onPublish,
          onUnpublish,
          onUpdateSlug
        }
      );
    case "analytics":
      return /* @__PURE__ */ jsx(AnalyticsPanel, { card: card2 });
    case "help":
      return /* @__PURE__ */ jsx(HelpPanel, {});
    default:
      return null;
  }
}
const preview = "_preview_dofcb_1";
const phoneFrame = "_phoneFrame_dofcb_19";
const phoneInner = "_phoneInner_dofcb_67";
const phoneScroll = "_phoneScroll_dofcb_85";
const header$2 = "_header_dofcb_117";
const footer = "_footer_dofcb_119";
const demoNotice = "_demoNotice_dofcb_129";
const demoNoticeSuffix = "_demoNoticeSuffix_dofcb_187";
const demoNoticeLink = "_demoNoticeLink_dofcb_195";
const styles$7 = {
  preview,
  phoneFrame,
  phoneInner,
  phoneScroll,
  header: header$2,
  footer,
  demoNotice,
  demoNoticeSuffix,
  demoNoticeLink
};
const cx$1 = (...classes) => classes.filter(Boolean).join(" ");
function toPreviewHrefFromPublicPath(publicPath) {
  const raw = typeof publicPath === "string" ? publicPath.trim() : "";
  if (!raw) return null;
  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  const isAbsoluteUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw);
  let pathname = null;
  try {
    if (isAbsoluteUrl) {
      if (!origin) return null;
      const u = new URL(raw);
      if (u.origin !== origin) return null;
      pathname = u.pathname || null;
    } else {
      if (!origin) return null;
      const u = new URL(raw, origin);
      pathname = u.pathname || null;
    }
  } catch {
    return null;
  }
  if (!pathname) return null;
  const parts = String(pathname).split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "card" && parts[1]) {
    return `/preview/card/${parts[1]}`;
  }
  if (parts.length === 3 && parts[0] === "c" && parts[1] && parts[2]) {
    return `/preview/c/${parts[1]}/${parts[2]}`;
  }
  return null;
}
function PhoneFrame({ children, className }) {
  return /* @__PURE__ */ jsx("div", { className: cx$1(styles$7.phoneFrame, className), "data-preview": "phone", children: /* @__PURE__ */ jsx("div", { className: styles$7.phoneInner, children: /* @__PURE__ */ jsx("div", { className: styles$7.phoneScroll, children }) }) });
}
function EditorPreview({
  className,
  card: card2,
  header: header2,
  footer: footer2,
  isAuthenticated
}) {
  const { tab: tab2 } = useParams();
  const isSelfThemeTab = tab2 === "design";
  const selfThemeAllowed = Boolean(card2?.entitlements?.design?.customColors);
  const selfThemeTemplateId = TEMPLATES.find((t) => t?.selfThemeV1 === true)?.id || null;
  const previewCard = useMemo(() => withDemoPreviewCard(card2), [card2]);
  const previewHref = useMemo(() => {
    return toPreviewHrefFromPublicPath(card2?.publicPath);
  }, [card2?.publicPath]);
  const showDemoNotice = useMemo(() => {
    const businessName = String(previewCard?.business?.name || "");
    const aboutTitle = String(previewCard?.content?.aboutTitle || "");
    const faqTitle = String(previewCard?.faq?.title || "");
    const hasDemoReviews = Array.isArray(previewCard?.reviews) ? previewCard.reviews.some(
      (r) => String(r?.name || "").includes("דוגמא")
    ) : false;
    return businessName.includes("דוגמא") || aboutTitle.includes("דוגמא") || faqTitle.includes("דוגמא") || hasDemoReviews;
  }, [previewCard]);
  const previewCardForRender = useMemo(() => {
    if (!isSelfThemeTab || !selfThemeAllowed || !selfThemeTemplateId) {
      return previewCard;
    }
    const effectiveSelfThemeV1 = resolveEffectiveSelfThemeV1(previewCard);
    return {
      ...previewCard,
      design: {
        ...previewCard?.design || {},
        templateId: selfThemeTemplateId,
        selfThemeV1: effectiveSelfThemeV1
      }
    };
  }, [previewCard, isSelfThemeTab, selfThemeAllowed, selfThemeTemplateId]);
  const canOpenPreviewNoticeLink = Boolean(
    previewHref && (isAuthenticated || getAnonymousId())
  );
  return /* @__PURE__ */ jsx(PhoneFrame, { className, children: /* @__PURE__ */ jsxs("div", { className: styles$7.preview, children: [
    header2 ? /* @__PURE__ */ jsx("div", { className: styles$7.header, children: header2 }) : null,
    showDemoNotice ? /* @__PURE__ */ jsxs("div", { className: styles$7.demoNotice, children: [
      'תוכן "דוגמא" - לא יוצג ציבורית, רק',
      " ",
      canOpenPreviewNoticeLink ? /* @__PURE__ */ jsx(
        "a",
        {
          className: styles$7.demoNoticeLink,
          href: previewHref,
          target: "_blank",
          rel: "noopener noreferrer",
          children: "במצב תצוגה מקדימה"
        }
      ) : /* @__PURE__ */ jsx("span", { className: styles$7.demoNoticeSuffix, children: "במצב תצוגה מקדימה" })
    ] }) : null,
    /* @__PURE__ */ jsx(CardRenderer, { card: previewCardForRender, mode: "editor" }),
    footer2 ? /* @__PURE__ */ jsx("div", { className: styles$7.footer, children: footer2 }) : null
  ] }) });
}
const bar = "_bar_jitow_1";
const saveButton = "_saveButton_jitow_43";
const status = "_status_jitow_125";
const statusDirty = "_statusDirty_jitow_143";
const statusSaved = "_statusSaved_jitow_157";
const statusError = "_statusError_jitow_165";
const statusIdle = "_statusIdle_jitow_173";
const errorText = "_errorText_jitow_181";
const styles$6 = {
  bar,
  saveButton,
  status,
  statusDirty,
  statusSaved,
  statusError,
  statusIdle,
  errorText
};
function EditorSaveBar({
  dirtyCount,
  saveState,
  saveErrorText,
  onSave,
  disabled
}) {
  const isSaving = saveState === "saving";
  const isDirty = saveState === "dirty";
  const isSaved = saveState === "saved";
  const isError = saveState === "error";
  const saveDisabled = Boolean(disabled) || isSaving || !dirtyCount;
  return /* @__PURE__ */ jsxs("div", { className: styles$6.bar, dir: "rtl", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: styles$6.saveButton,
        onClick: () => onSave?.(),
        disabled: saveDisabled,
        "data-tour-id": "editor-tour-save-changes",
        children: isSaving ? "שומר…" : "שמור שינויים"
      }
    ),
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: `${styles$6.status} ${isDirty ? styles$6.statusDirty : isError ? styles$6.statusError : isSaved ? styles$6.statusSaved : styles$6.statusIdle}`,
        role: isError ? "alert" : "status",
        "aria-live": "polite",
        children: [
          isDirty ? "יש שינויים שלא נשמרו" : null,
          isSaving ? "שומר…" : null,
          isSaved ? "נשמר" : null,
          isError ? /* @__PURE__ */ jsxs("span", { className: styles$6.errorText, children: [
            "שגיאה בשמירה",
            saveErrorText ? `: ${saveErrorText}` : ""
          ] }) : null
        ]
      }
    )
  ] });
}
const backdrop$1 = "_backdrop_uju45_1";
const modal$1 = "_modal_uju45_33";
const header$1 = "_header_uju45_61";
const title$3 = "_title_uju45_85";
const closeBtn = "_closeBtn_uju45_103";
const videoWrap = "_videoWrap_uju45_147";
const iframe = "_iframe_uju45_161";
const urlError = "_urlError_uju45_175";
const openLink = "_openLink_uju45_205";
const styles$5 = {
  backdrop: backdrop$1,
  modal: modal$1,
  header: header$1,
  title: title$3,
  closeBtn,
  videoWrap,
  iframe,
  urlError,
  openLink
};
const ALLOWED_HOSTS = /* @__PURE__ */ new Set(["www.youtube.com", "www.youtube-nocookie.com"]);
const ALLOWED_PARAMS = {
  rel: (v) => v === "0" || v === "1",
  modestbranding: (v) => v === "0" || v === "1",
  playsinline: (v) => v === "0" || v === "1",
  start: (v) => /^\d+$/.test(v),
  end: (v) => /^\d+$/.test(v)
};
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{1,20}$/;
function validateYouTubeEmbedUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!ALLOWED_HOSTS.has(url.hostname)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  if (parts[0] !== "embed") return null;
  const videoId = parts[1];
  if (!VIDEO_ID_RE.test(videoId)) return null;
  for (const [key, value] of url.searchParams) {
    const validator = ALLOWED_PARAMS[key];
    if (!validator) return null;
    if (!validator(value)) return null;
  }
  return url.toString();
}
function getGuideVideoUrls(envLike) {
  return {
    mobile: validateYouTubeEmbedUrl(envLike?.VITE_GUIDE_URL_MOBILE),
    desktop: validateYouTubeEmbedUrl(envLike?.VITE_GUIDE_URL_DESKTOP)
  };
}
function getYouTubeWatchUrlFromEmbedUrl(raw) {
  const canonical = validateYouTubeEmbedUrl(raw);
  if (!canonical) return null;
  const parts = new URL(canonical).pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0] !== "embed") return null;
  const videoId = parts[1];
  return "https://www.youtube.com/watch?v=" + videoId;
}
function GuideVideoModal({ open, url, title: title2, onClose }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const validatedUrl = validateYouTubeEmbedUrl(url);
  const watchUrl = getYouTubeWatchUrlFromEmbedUrl(validatedUrl);
  useFocusTrap(dialogRef, open);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: dialogRef,
      className: styles$5.backdrop,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) onClose?.();
      },
      children: /* @__PURE__ */ jsxs("div", { className: styles$5.modal, dir: "rtl", children: [
        /* @__PURE__ */ jsxs("div", { className: styles$5.header, children: [
          /* @__PURE__ */ jsx("h2", { id: titleId, className: styles$5.title, children: title2 }),
          watchUrl ? /* @__PURE__ */ jsx(
            "a",
            {
              href: watchUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              className: styles$5.openLink,
              "aria-label": "פתח ביוטיוב בכרטיסייה חדשה",
              children: "פתח ביוטיוב"
            }
          ) : null,
          /* @__PURE__ */ jsx(
            "button",
            {
              ref: closeBtnRef,
              type: "button",
              className: styles$5.closeBtn,
              "aria-label": "סגור",
              onClick: () => onClose?.(),
              children: "✕"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: styles$5.videoWrap, children: validatedUrl ? /* @__PURE__ */ jsx(
          "iframe",
          {
            className: styles$5.iframe,
            src: validatedUrl,
            title: "מדריך וידאו",
            sandbox: "allow-scripts allow-same-origin allow-presentation allow-fullscreen",
            allow: "fullscreen; picture-in-picture; accelerometer; gyroscope",
            allowFullScreen: true,
            referrerPolicy: "no-referrer-when-downgrade"
          }
        ) : /* @__PURE__ */ jsx("div", { className: styles$5.urlError, children: "לא ניתן לטעון את הסרטון. כתובת לא תקינה." }) })
      ] })
    }
  );
}
const GUIDE_DROPDOWN_ACK_KEY = "cardigo_guide_dropdown_v1";
function getSafeLocalStorage$1() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
}
function readAck() {
  const ls = getSafeLocalStorage$1();
  if (!ls) return false;
  try {
    return ls.getItem(GUIDE_DROPDOWN_ACK_KEY) === "1";
  } catch {
    return false;
  }
}
function writeAck() {
  const ls = getSafeLocalStorage$1();
  if (!ls) return;
  try {
    ls.setItem(GUIDE_DROPDOWN_ACK_KEY, "1");
  } catch {
  }
}
function useGuideDropdownAck() {
  const [isAcknowledged, setIsAcknowledged] = useState(() => readAck());
  function acknowledge() {
    if (isAcknowledged) return;
    writeAck();
    setIsAcknowledged(true);
  }
  return { isAcknowledged, acknowledge };
}
const __vite_import_meta_env__ = { "VITE_GUIDE_URL_DESKTOP": "https://www.youtube-nocookie.com/embed/fKVtDiv8_os", "VITE_GUIDE_URL_MOBILE": "https://www.youtube-nocookie.com/embed/FEKzClnuzto" };
const GUIDE_URLS = getGuideVideoUrls(__vite_import_meta_env__);
const HAS_ANY_GUIDE_URL = Boolean(GUIDE_URLS.mobile || GUIDE_URLS.desktop);
const cx = (...classes) => classes.filter(Boolean).join(" ");
function Editor({
  card: card2,
  onFieldChange,
  editingDisabled,
  onDeleteCard,
  onDeleteDesignAsset,
  deleteDesignAssetBusyKind,
  isDeleting,
  onRequestNavigate,
  onUpgrade,
  onPublish,
  onUnpublish,
  onUpdateSlug,
  previewHeader,
  previewFooter,
  commitDraft,
  dirtyPaths,
  saveState,
  saveErrorText,
  fieldErrors,
  // Mobile: compact context bar in topbar
  activeOrgSlug,
  myOrgs,
  onContextChange,
  onLoadOrgs,
  showContextBar,
  showGuideDropdown = false,
  isAuthenticated,
  // Mobile: public link in sidebar drawer
  publicUrl,
  publicPath,
  isPublished,
  // Phase 2C-6: drawer orchestration signal for guided tour (optional)
  openDrawerForTourStepId,
  // Phase 2C-7: open-only signal for sections-menu during any active tour
  tourSectionsMenuOpenOnly = false,
  // Mini-guide: authenticated mini-guide signals
  onStartShareMiniGuide,
  onStartSeoMiniGuide,
  onStartBookingHoursMiniGuide,
  openDrawerForMiniGuideStepId
}) {
  const navigate = useNavigate();
  const { tab: tab2 } = useParams();
  const MOBILE_MEDIA = "(max-width: 900px)";
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return Boolean(window.matchMedia(MOBILE_MEDIA).matches);
  });
  const [mobileView, setMobileView] = useState("edit");
  const [drawerOpen2, setDrawerOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const { isAcknowledged, acknowledge } = useGuideDropdownAck();
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideModalUrl, setGuideModalUrl] = useState(null);
  const [guideModalTitle, setGuideModalTitle] = useState("");
  const guideBtnRef = useRef(null);
  const guideDropdownRef = useRef(null);
  const guideFirstItemRef = useRef(null);
  const sectionsTriggerRef = useRef(null);
  const drawerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const lastToastAtRef = useRef(0);
  useFocusTrap(drawerRef, isMobile && drawerOpen2);
  const closeDrawer = () => {
    if (drawerRef.current?.contains(document.activeElement)) {
      try {
        sectionsTriggerRef.current?.focus({ preventScroll: true });
      } catch (_) {
        sectionsTriggerRef.current?.focus();
      }
    }
    setDrawerOpen(false);
  };
  const dismissToast = () => {
    setToastOpen(false);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };
  const showToast = () => {
    if (!isMobile) return;
    if (toastOpen) return;
    const now = Date.now();
    const cooldownMs = 15e3;
    if (now - lastToastAtRef.current < cooldownMs) return;
    lastToastAtRef.current = now;
    setToastOpen(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setToastOpen(false);
    }, 3e3);
  };
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MOBILE_MEDIA);
    const update = () => setIsMobile(Boolean(mq.matches));
    update();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);
  useEffect(() => {
    if (!drawerOpen2) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen2]);
  useEffect(() => {
    if (!drawerOpen2 || !isMobile) return;
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const first = drawerRef.current?.querySelector(FOCUSABLE);
    if (!first) return;
    try {
      first.focus({ preventScroll: true });
    } catch (_) {
      first.focus();
    }
  }, [drawerOpen2, isMobile]);
  useEffect(() => {
    if (!guideOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setGuideOpen(false);
        guideBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [guideOpen]);
  useEffect(() => {
    if (!guideOpen) return;
    const t = window.setTimeout(() => {
      guideFirstItemRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [guideOpen]);
  useEffect(() => {
    if (!guideOpen) return;
    const onMouseDown = (e) => {
      if (guideDropdownRef.current && !guideDropdownRef.current.contains(e.target)) {
        setGuideOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [guideOpen]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const lockClass = styles$s.scrollLock;
    const root2 = document.documentElement;
    const body2 = document.body;
    const shouldLock = Boolean(isMobile && drawerOpen2);
    if (shouldLock) {
      root2.classList.add(lockClass);
      body2.classList.add(lockClass);
    } else {
      root2.classList.remove(lockClass);
      body2.classList.remove(lockClass);
    }
    return () => {
      root2.classList.remove(lockClass);
      body2.classList.remove(lockClass);
    };
  }, [drawerOpen2, isMobile]);
  const allowedTabs = useMemo(() => new Set(EDITOR_CARD_TABS), []);
  const activeTab = allowedTabs.has(tab2) ? tab2 : PANEL_TEMPLATES;
  const dirtyCount = dirtyPaths && typeof dirtyPaths.size === "number" ? dirtyPaths.size : 0;
  const showPanel = !isMobile || mobileView === "edit";
  const showPreview = !isMobile || mobileView === "preview";
  const showGuideBtn = isMobile && showGuideDropdown && activeTab === PANEL_TEMPLATES && (HAS_ANY_GUIDE_URL || Boolean(onStartShareMiniGuide) || Boolean(onStartSeoMiniGuide) || Boolean(onStartBookingHoursMiniGuide));
  function handleChangeTab(nextTab) {
    if (!nextTab || !allowedTabs.has(nextTab)) return;
    if (isMobile) setMobileView("edit");
    closeDrawer();
    dismissToast();
    const to = `/edit/card/${nextTab}`;
    if (typeof onRequestNavigate === "function") {
      onRequestNavigate(to);
      return;
    }
    navigate(to);
  }
  useEffect(() => {
    if (!isMobile) return;
    if (mobileView !== "edit") return;
    if (drawerOpen2) return;
    if (saveState !== "dirty") return;
    if (!dirtyCount) return;
    showToast();
  }, [dirtyCount, saveState, isMobile, mobileView, drawerOpen2]);
  useEffect(() => {
    if (!isMobile) return;
    if (mobileView === "preview") {
      dismissToast();
      return;
    }
    if (!dirtyCount || saveState !== "dirty") {
      dismissToast();
    }
  }, [dirtyCount, saveState, isMobile, mobileView]);
  useEffect(() => {
    if (isMobile && openDrawerForTourStepId) {
      setDrawerOpen(true);
    }
  }, [isMobile, openDrawerForTourStepId]);
  useEffect(() => {
    if (isMobile && openDrawerForMiniGuideStepId) {
      setDrawerOpen(true);
    }
  }, [isMobile, openDrawerForMiniGuideStepId]);
  return /* @__PURE__ */ jsxs("div", { className: styles$s.editor, "data-shell": "editor", children: [
    /* @__PURE__ */ jsxs("div", { className: styles$s.topbar, dir: "rtl", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          ref: sectionsTriggerRef,
          type: "button",
          className: styles$s.sectionsTrigger,
          "aria-label": drawerOpen2 ? "סגירת תפריט עריכה" : "פתיחת תפריט עריכה",
          "aria-expanded": drawerOpen2,
          "aria-controls": "editor-sections-drawer",
          onClick: () => {
            dismissToast();
            if (tourSectionsMenuOpenOnly) {
              setDrawerOpen(true);
            } else {
              setDrawerOpen((v) => !v);
            }
          },
          "data-tour-id": "editor-tour-sections-menu",
          children: [
            /* @__PURE__ */ jsxs("span", { className: styles$s.sectionsIcon, "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("span", { className: styles$s.sectionsDot }),
              /* @__PURE__ */ jsx("span", { className: styles$s.sectionsDot }),
              /* @__PURE__ */ jsx("span", { className: styles$s.sectionsDot }),
              /* @__PURE__ */ jsx("span", { className: styles$s.sectionsDot })
            ] }),
            !showContextBar && !showGuideBtn ? /* @__PURE__ */ jsx("span", { className: styles$s.sectionsLabel, children: "תפריט עריכה" }) : null
          ]
        }
      ),
      isMobile && showContextBar ? /* @__PURE__ */ jsxs("div", { className: styles$s.contextWrap, children: [
        /* @__PURE__ */ jsx("span", { className: styles$s.contextLabel, children: "כרטיס" }),
        /* @__PURE__ */ jsxs("div", { className: styles$s.selectShell, children: [
          /* @__PURE__ */ jsxs(
            "select",
            {
              className: styles$s.contextSelect,
              value: activeOrgSlug || "",
              onFocus: onLoadOrgs,
              onMouseDown: onLoadOrgs,
              onChange: (e) => onContextChange(e.target.value),
              "aria-label": "הקשר כרטיס",
              children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "אישי" }),
                (myOrgs || []).map((o) => /* @__PURE__ */ jsx(
                  "option",
                  {
                    value: String(o?.slug || ""),
                    children: String(o?.name || o?.slug || "")
                  },
                  String(o?.id || o?.slug || "")
                ))
              ]
            }
          ),
          myOrgs && myOrgs.length > 0 ? /* @__PURE__ */ jsx(
            "span",
            {
              className: styles$s.contextCaret,
              "aria-hidden": "true",
              children: "▾"
            }
          ) : null
        ] })
      ] }) : null,
      showGuideBtn ? /* @__PURE__ */ jsxs("div", { className: styles$s.guideBtnWrap, ref: guideDropdownRef, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            ref: guideBtnRef,
            className: cx(
              styles$s.guideBtn,
              isAcknowledged ? styles$s.guideBtnAck : styles$s.guideBtnPulse
            ),
            "aria-label": "פתח מדריך",
            "aria-expanded": guideOpen,
            "aria-controls": "editor-guide-dropdown",
            onClick: () => {
              acknowledge();
              setGuideOpen((v) => !v);
            },
            children: "מדריך"
          }
        ),
        guideOpen ? /* @__PURE__ */ jsxs(
          "div",
          {
            id: "editor-guide-dropdown",
            className: styles$s.guideDropdown,
            children: [
              onStartShareMiniGuide ? /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  ref: guideFirstItemRef,
                  className: styles$s.guideDropdownItem,
                  onClick: () => {
                    setGuideOpen(false);
                    onStartShareMiniGuide();
                  },
                  children: "איך לשתף כרטיס"
                }
              ) : null,
              onStartSeoMiniGuide ? /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: styles$s.guideDropdownItem,
                  onClick: () => {
                    setGuideOpen(false);
                    onStartSeoMiniGuide();
                  },
                  children: "SEO וסקריפטים"
                }
              ) : null,
              onStartBookingHoursMiniGuide ? /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: styles$s.guideDropdownItem,
                  onClick: () => {
                    setGuideOpen(false);
                    onStartBookingHoursMiniGuide();
                  },
                  children: "תורים ושעות"
                }
              ) : null,
              GUIDE_URLS.mobile ? /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  ref: onStartShareMiniGuide ? void 0 : guideFirstItemRef,
                  className: styles$s.guideDropdownItem,
                  onClick: () => {
                    setGuideOpen(false);
                    setGuideModalUrl(GUIDE_URLS.mobile);
                    setGuideModalTitle("מדריך לסלולר");
                  },
                  children: "מדריך לסלולר"
                }
              ) : null,
              GUIDE_URLS.desktop ? /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  ref: !onStartShareMiniGuide && !GUIDE_URLS.mobile ? guideFirstItemRef : void 0,
                  className: styles$s.guideDropdownItem,
                  onClick: () => {
                    setGuideOpen(false);
                    setGuideModalUrl(
                      GUIDE_URLS.desktop
                    );
                    setGuideModalTitle("מדריך למחשב");
                  },
                  children: "מדריך למחשב"
                }
              ) : null
            ]
          }
        ) : null
      ] }) : null,
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: styles$s.segmented,
          role: "tablist",
          "aria-label": "תצוגה",
          children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: cx(
                  styles$s.segment,
                  mobileView === "edit" && styles$s.segmentActive
                ),
                role: "tab",
                "aria-selected": mobileView === "edit",
                "data-tour-id": "editor-tour-edit-toggle",
                onClick: () => {
                  closeDrawer();
                  setMobileView("edit");
                  dismissToast();
                },
                children: "עריכה"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: cx(
                  styles$s.segment,
                  mobileView === "preview" && styles$s.segmentActive
                ),
                role: "tab",
                "aria-selected": mobileView === "preview",
                "data-tour-id": "editor-tour-preview-toggle",
                onClick: () => {
                  closeDrawer();
                  setMobileView("preview");
                  dismissToast();
                },
                children: "תצוגה"
              }
            )
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      "div",
      {
        className: cx(
          styles$s.drawerOverlay,
          drawerOpen2 && styles$s.drawerOverlayOpen
        ),
        "aria-hidden": !drawerOpen2,
        onClick: () => {
          closeDrawer();
          dismissToast();
        }
      }
    ),
    /* @__PURE__ */ jsxs(
      "div",
      {
        ref: drawerRef,
        className: cx(
          styles$s.sidebarSlot,
          drawerOpen2 && styles$s.drawerOpen
        ),
        id: "editor-sections-drawer",
        "aria-hidden": isMobile && !drawerOpen2,
        inert: isMobile && !drawerOpen2 ? "" : void 0,
        children: [
          isMobile ? /* @__PURE__ */ jsxs("div", { className: styles$s.drawerHeader, children: [
            /* @__PURE__ */ jsx("div", { className: styles$s.drawerTitle, children: "תפריט עריכה" }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$s.drawerCloseBtn,
                "aria-label": "סגירת תפריט עריכה",
                onClick: () => {
                  closeDrawer();
                  dismissToast();
                },
                children: "✕"
              }
            )
          ] }) : null,
          /* @__PURE__ */ jsx(
            EditorSidebar,
            {
              activeTab,
              onChangeTab: handleChangeTab,
              entitlements: card2?.entitlements,
              isPremium: card2?.effectiveBilling?.isPaid === true,
              billingSource: card2?.effectiveBilling?.source,
              billingUntil: card2?.effectiveBilling?.until,
              publicUrl,
              publicPath,
              isPublished,
              activeOrgSlug,
              myOrgs,
              onContextChange,
              onLoadOrgs,
              showContextBar
            }
          )
        ]
      }
    ),
    showPanel ? /* @__PURE__ */ jsxs("main", { className: styles$s.panel, children: [
      /* @__PURE__ */ jsx(
        EditorPanel,
        {
          tab: activeTab,
          card: card2,
          onFieldChange,
          editingDisabled,
          onNavigateTab: handleChangeTab,
          onDeleteCard,
          onDeleteDesignAsset,
          deleteDesignAssetBusyKind,
          isDeleting,
          onUpgrade,
          onPublish,
          onUnpublish,
          onUpdateSlug,
          fieldErrors
        }
      ),
      /* @__PURE__ */ jsx(
        EditorSaveBar,
        {
          dirtyCount,
          saveState,
          saveErrorText,
          onSave: commitDraft,
          disabled: Boolean(editingDisabled) || !commitDraft
        }
      )
    ] }) : null,
    showPreview ? /* @__PURE__ */ jsx(
      EditorPreview,
      {
        className: styles$s.preview,
        card: card2,
        header: previewHeader,
        footer: previewFooter,
        isAuthenticated
      }
    ) : null,
    toastOpen && isMobile && mobileView === "edit" && showPanel ? /* @__PURE__ */ jsxs(
      "div",
      {
        className: styles$s.toast,
        role: "status",
        "aria-live": "polite",
        dir: "rtl",
        children: [
          /* @__PURE__ */ jsx("div", { className: styles$s.toastText, children: "עודכן בתצוגה" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$s.toastAction,
              onClick: () => {
                setMobileView("preview");
                dismissToast();
              },
              "data-tour-id": "editor-tour-toast-preview",
              children: "צפה"
            }
          )
        ]
      }
    ) : null,
    /* @__PURE__ */ jsx(
      GuideVideoModal,
      {
        open: Boolean(guideModalUrl),
        url: guideModalUrl || "",
        title: guideModalTitle,
        onClose: () => {
          setGuideModalUrl(null);
          setGuideModalTitle("");
          guideBtnRef.current?.focus();
        }
      }
    )
  ] });
}
const backdrop = "_backdrop_r59kt_1";
const modal = "_modal_r59kt_27";
const header = "_header_r59kt_53";
const title$2 = "_title_r59kt_61";
const body = "_body_r59kt_77";
const text$1 = "_text_r59kt_85";
const actions$2 = "_actions_r59kt_99";
const button$1 = "_button_r59kt_117";
const primary = "_primary_r59kt_173";
const secondary = "_secondary_r59kt_237";
const tertiary = "_tertiary_r59kt_269";
const styles$4 = {
  backdrop,
  modal,
  header,
  title: title$2,
  body,
  text: text$1,
  actions: actions$2,
  button: button$1,
  primary,
  secondary,
  tertiary
};
function ConfirmUnsavedChangesModal({
  open,
  title: title2,
  body: body2,
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  onPrimary,
  onSecondary,
  onTertiary,
  busy
}) {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef(null);
  const primaryButtonRef = useRef(null);
  useFocusTrap(dialogRef, open);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      primaryButtonRef.current?.focus?.();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onTertiary?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onTertiary]);
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
        if (e.target === e.currentTarget) onTertiary?.();
      },
      children: /* @__PURE__ */ jsxs("div", { className: styles$4.modal, dir: "rtl", children: [
        /* @__PURE__ */ jsx("div", { className: styles$4.header, children: /* @__PURE__ */ jsx("h2", { id: titleId, className: styles$4.title, children: title2 }) }),
        /* @__PURE__ */ jsx("div", { className: styles$4.body, children: /* @__PURE__ */ jsx("p", { id: bodyId, className: styles$4.text, children: body2 }) }),
        /* @__PURE__ */ jsxs("div", { className: styles$4.actions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              ref: primaryButtonRef,
              type: "button",
              className: `${styles$4.button} ${styles$4.primary}`,
              onClick: () => onPrimary?.(),
              disabled: Boolean(busy),
              children: primaryLabel
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: `${styles$4.button} ${styles$4.secondary}`,
              onClick: () => onSecondary?.(),
              disabled: Boolean(busy),
              children: secondaryLabel
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: `${styles$4.button} ${styles$4.tertiary}`,
              onClick: () => onTertiary?.(),
              disabled: Boolean(busy),
              children: tertiaryLabel
            }
          )
        ] })
      ] })
    }
  );
}
const root$1 = "_root_15pza_1";
const active = "_active_15pza_25";
const expired = "_expired_15pza_37";
const left = "_left_15pza_49";
const icon = "_icon_15pza_61";
const title$1 = "_title_15pza_75";
const subtitle$1 = "_subtitle_15pza_89";
const button = "_button_15pza_105";
const buttonActive = "_buttonActive_15pza_129";
const buttonExpired = "_buttonExpired_15pza_139";
const styles$3 = {
  root: root$1,
  active,
  expired,
  left,
  icon,
  title: title$1,
  subtitle: subtitle$1,
  button,
  buttonActive,
  buttonExpired
};
function TrialBanner({
  trialStartedAt,
  trialEndsAt,
  isExpired,
  onRegister
}) {
  if (!trialStartedAt || !trialEndsAt) return null;
  const endMs = new Date(trialEndsAt).getTime();
  if (!Number.isFinite(endMs)) return null;
  const nowMs = Date.now();
  const msPerDay = 24 * 60 * 60 * 1e3;
  const remainingDays = isExpired ? 0 : Math.max(0, Math.ceil((endMs - nowMs) / msPerDay));
  const title2 = isExpired ? "תקופת הניסיון הסתיימה" : `נשארו לך ${remainingDays} ימים להנות מהכרטיס בחינם`;
  const subtitle2 = isExpired ? "כדי להמשיך לערוך ולשמור את הכרטיס, יש לשדרג לתוכנית בתשלום" : "שדרג עכשיו כדי להמשיך להשתמש בכרטיס אחרי תקופת הניסיון";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      role: "status",
      dir: "rtl",
      className: `${styles$3.root} ${isExpired ? styles$3.expired : styles$3.active}`,
      children: [
        /* @__PURE__ */ jsxs("div", { className: styles$3.left, children: [
          /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: styles$3.icon, children: "⏰" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: styles$3.title, children: title2 }),
            /* @__PURE__ */ jsx("p", { className: styles$3.subtitle, children: subtitle2 })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: `${styles$3.button} ${isExpired ? styles$3.buttonExpired : styles$3.buttonActive}`,
            onClick: onRegister,
            children: "שדרג עכשיו"
          }
        )
      ]
    }
  );
}
const root = "_root_uka51_1";
const content$1 = "_content_uka51_27";
const title = "_title_uka51_39";
const subtitle = "_subtitle_uka51_49";
const actions$1 = "_actions_uka51_59";
const cta = "_cta_uka51_67";
const styles$2 = {
  root,
  content: content$1,
  title,
  subtitle,
  actions: actions$1,
  cta
};
function PremiumExpiryBanner({ daysLeft, onCta }) {
  if (!Number.isFinite(daysLeft) || daysLeft < 1) return null;
  return /* @__PURE__ */ jsxs("section", { className: styles$2.root, dir: "rtl", role: "status", children: [
    /* @__PURE__ */ jsxs("div", { className: styles$2.content, children: [
      /* @__PURE__ */ jsx("div", { className: styles$2.title, children: `המנוי השנתי מסתיים בעוד ${daysLeft} ימים (Annual)` }),
      /* @__PURE__ */ jsx("div", { className: styles$2.subtitle, children: "כדי להמשיך לערוך ללא הפרעה, מומלץ לחדש את המנוי." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: styles$2.actions, children: /* @__PURE__ */ jsx("button", { type: "button", className: styles$2.cta, onClick: onCta, children: "למחירים ולחידוש" }) })
  ] });
}
const anonCta = "_anonCta_19zp1_157";
const anonCtaText = "_anonCtaText_19zp1_185";
const anonCtaActions = "_anonCtaActions_19zp1_195";
const anonCtaPrimary = "_anonCtaPrimary_19zp1_207";
const anonCtaSecondary = "_anonCtaSecondary_19zp1_209";
const createCta = "_createCta_19zp1_271";
const createCtaTitle = "_createCtaTitle_19zp1_293";
const createCtaText = "_createCtaText_19zp1_305";
const createCtaError = "_createCtaError_19zp1_317";
const createCtaActions = "_createCtaActions_19zp1_329";
const createCtaButton = "_createCtaButton_19zp1_341";
const anonConsentGate = "_anonConsentGate_19zp1_377";
const anonConsentTitle = "_anonConsentTitle_19zp1_399";
const anonConsentText = "_anonConsentText_19zp1_415";
const anonConsentLink = "_anonConsentLink_19zp1_429";
const anonCrown = "_anonCrown_19zp1_447";
const anonConsentLabel = "_anonConsentLabel_19zp1_479";
const anonConsentCheckbox = "_anonConsentCheckbox_19zp1_495";
const anonConsentLabelText = "_anonConsentLabelText_19zp1_507";
const anonConsentActions = "_anonConsentActions_19zp1_517";
const editCard = "_editCard_19zp1_677";
const main = "_main_19zp1_695";
const notice = "_notice_19zp1_715";
const noticeSuccess = "_noticeSuccess_19zp1_745";
const noticeError = "_noticeError_19zp1_753";
const noticeText = "_noticeText_19zp1_761";
const noticeClose = "_noticeClose_19zp1_775";
const comingSoon = "_comingSoon_19zp1_893";
const replayTourBtn = "_replayTourBtn_19zp1_917";
const styles$1 = {
  anonCta,
  anonCtaText,
  anonCtaActions,
  anonCtaPrimary,
  anonCtaSecondary,
  createCta,
  createCtaTitle,
  createCtaText,
  createCtaError,
  createCtaActions,
  createCtaButton,
  anonConsentGate,
  anonConsentTitle,
  anonConsentText,
  anonConsentLink,
  anonCrown,
  anonConsentLabel,
  anonConsentCheckbox,
  anonConsentLabelText,
  anonConsentActions,
  editCard,
  main,
  notice,
  noticeSuccess,
  noticeError,
  noticeText,
  noticeClose,
  comingSoon,
  replayTourBtn
};
const EDITOR_TOUR_STORAGE_KEY = "cardigo_editor_tour_v1";
const EDITOR_TOUR_CTA_HL_KEY = "cardigo_editor_tour_cta_highlight_pending_v1";
const EDITOR_TOUR_STEPS = [
  // ── 0 ── template dark group ─────────────────────────────────────────────
  {
    id: "step-template-dark-group",
    targetId: "editor-tour-template-dark-group",
    text: "בחרו סגנון כהה",
    anonymousOnly: false,
    requiresDrawer: false
  },
  // ── 1 ── template select ─────────────────────────────────────────────────
  {
    id: "step-template-select",
    targetId: "editor-tour-template-select-tehomTurkiz",
    text: "בחרו את התבנית",
    anonymousOnly: false,
    requiresDrawer: false
  },
  // ── 2 ── save template ───────────────────────────────────────────────────
  {
    id: "step-save-template",
    targetId: "editor-tour-save-changes",
    text: "שמרו את התבנית",
    anonymousOnly: false,
    requiresDrawer: false,
    isSaveStep: true
  },
  // ── 3 ── preview toggle ──────────────────────────────────────────────────
  {
    id: "step-preview-toggle",
    targetId: "editor-tour-preview-toggle",
    text: "עברו לתצוגה",
    anonymousOnly: false,
    requiresDrawer: false
  },
  // ── 4 ── edit toggle ─────────────────────────────────────────────────────
  {
    id: "step-edit-toggle",
    targetId: "editor-tour-edit-toggle",
    text: "חזרו לעריכה",
    anonymousOnly: false,
    requiresDrawer: false
  },
  // ── 5 ── sections menu ───────────────────────────────────────────────────
  {
    id: "step-sections-menu-1",
    targetId: "editor-tour-sections-menu",
    text: "פתחו את התפריט",
    anonymousOnly: false,
    requiresDrawer: false
  },
  // ── 6 ── tab head ────────────────────────────────────────────────────────
  {
    id: "step-tab-head",
    targetId: "editor-tour-tab-head",
    text: "פתחו את ראש הכרטיס",
    anonymousOnly: false,
    requiresDrawer: true
  },
  // ── 7 ── upload background ───────────────────────────────────────────────
  {
    id: "step-upload-background",
    targetId: "editor-tour-upload-background-block",
    text: "העלו תמונת רקע",
    anonymousOnly: false,
    requiresDrawer: false,
    isUploadStep: true,
    uploadKind: "background"
  },
  // ── 8 ── upload avatar ───────────────────────────────────────────────────
  {
    id: "step-upload-avatar",
    targetId: "editor-tour-upload-avatar-block",
    text: "העלו תמונה או לוגו",
    anonymousOnly: false,
    requiresDrawer: false,
    isUploadStep: true,
    uploadKind: "avatar"
  },
  // ── 9 ── save head/design ────────────────────────────────────────────────
  {
    id: "step-save-head",
    targetId: "editor-tour-save-changes",
    text: "שמרו את התמונות",
    anonymousOnly: false,
    requiresDrawer: false,
    isSaveStep: true
  },
  // ── 10 ── preview after upload ───────────────────────────────────────────
  {
    id: "step-preview-after-upload",
    targetId: "editor-tour-preview-toggle",
    text: "ראו מה השתנה",
    anonymousOnly: false,
    requiresDrawer: false
  },
  // ── 11 ── edit after upload ──────────────────────────────────────────────
  {
    id: "step-edit-after-upload",
    targetId: "editor-tour-edit-toggle",
    text: "חזרו לעריכה",
    anonymousOnly: false,
    requiresDrawer: false
  },
  // ── 12 ── sections menu ──────────────────────────────────────────────────
  {
    id: "step-sections-menu-2",
    targetId: "editor-tour-sections-menu",
    text: "פתחו את התפריט",
    anonymousOnly: false,
    requiresDrawer: false
  },
  // ── 13 ── tab business ───────────────────────────────────────────────────
  {
    id: "step-tab-business",
    targetId: "editor-tour-tab-business",
    text: "פתחו פרטי העסק",
    anonymousOnly: false,
    requiresDrawer: true
  },
  // ── 14 ── business name input ────────────────────────────────────────────
  {
    id: "step-field-business-name",
    targetId: "editor-tour-field-business-name",
    text: "הזינו שם עסק",
    anonymousOnly: false,
    requiresDrawer: false,
    advanceOn: "input"
  },
  // ── 15 ── business category input ────────────────────────────────────────
  {
    id: "step-field-business-category",
    targetId: "editor-tour-field-business-category",
    text: "הזינו תחום עיסוק",
    anonymousOnly: false,
    requiresDrawer: false,
    advanceOn: "input"
  },
  // ── 16 ── save business ──────────────────────────────────────────────────
  {
    id: "step-save-business",
    targetId: "editor-tour-save-changes",
    text: "שמרו את פרטי העסק",
    anonymousOnly: false,
    requiresDrawer: false,
    isSaveStep: true
  },
  // ── 17 ── sections menu ──────────────────────────────────────────────────
  {
    id: "step-sections-menu-3",
    targetId: "editor-tour-sections-menu",
    text: "פתחו את התפריט",
    anonymousOnly: false,
    requiresDrawer: false
  },
  // ── 18 ── tab contact ────────────────────────────────────────────────────
  {
    id: "step-tab-contact",
    targetId: "editor-tour-tab-contact",
    text: "פתחו פרטי קשר",
    anonymousOnly: false,
    requiresDrawer: true
  },
  // ── 19 ── phone input ────────────────────────────────────────────────────
  {
    id: "step-field-contact-phone",
    targetId: "editor-tour-field-contact-phone",
    text: "הזינו טלפון",
    anonymousOnly: false,
    requiresDrawer: false,
    advanceOn: "input"
  },
  // ── 20 ── email input ────────────────────────────────────────────────────
  {
    id: "step-field-contact-email",
    targetId: "editor-tour-field-contact-email",
    text: "הזינו אימייל",
    anonymousOnly: false,
    requiresDrawer: false,
    advanceOn: "input"
  },
  // ── 21 ── save contact ───────────────────────────────────────────────────
  {
    id: "step-save-contact",
    targetId: "editor-tour-save-changes",
    text: "שמרו פרטי קשר",
    anonymousOnly: false,
    requiresDrawer: false,
    isSaveStep: true
  },
  // ── 22 ── final preview ──────────────────────────────────────────────────
  {
    id: "step-final-preview",
    targetId: "editor-tour-preview-toggle",
    text: "צפו בכרטיס",
    anonymousOnly: false,
    requiresDrawer: false
  },
  // ── 23 ── final edit ─────────────────────────────────────────────────────
  {
    id: "step-final-edit",
    targetId: "editor-tour-edit-toggle",
    text: "חזרו לעריכה",
    anonymousOnly: false,
    requiresDrawer: false
  }
];
function getEditorTourSteps({ isAnonymous = false } = {}) {
  if (isAnonymous) return EDITOR_TOUR_STEPS.slice();
  return EDITOR_TOUR_STEPS.filter((step) => !step.anonymousOnly);
}
function getSafeLocalStorage() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
}
function readEditorTourDone() {
  const ls = getSafeLocalStorage();
  if (!ls) return false;
  try {
    return ls.getItem(EDITOR_TOUR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeEditorTourDone() {
  const ls = getSafeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(EDITOR_TOUR_STORAGE_KEY, "1");
  } catch {
  }
}
function clearEditorTourDone() {
  const ls = getSafeLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(EDITOR_TOUR_STORAGE_KEY);
  } catch {
  }
}
function readEditorTourCtaHighlightPending() {
  const ls = getSafeLocalStorage();
  if (!ls) return false;
  try {
    return ls.getItem(EDITOR_TOUR_CTA_HL_KEY) === "1";
  } catch {
    return false;
  }
}
function writeEditorTourCtaHighlightPending() {
  const ls = getSafeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(EDITOR_TOUR_CTA_HL_KEY, "1");
  } catch {
  }
}
function clearEditorTourCtaHighlightPending() {
  const ls = getSafeLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(EDITOR_TOUR_CTA_HL_KEY);
  } catch {
  }
}
function useEditorTour({ isAnonymous = false, enabled = true } = {}) {
  const steps = getEditorTourSteps({ isAnonymous });
  const totalSteps = steps.length;
  const [state, setState] = useState(() => ({
    isDone: readEditorTourDone(),
    currentIndex: 0
  }));
  const isDone = state.isDone;
  const currentIndex = state.currentIndex;
  const currentStep = !isDone && currentIndex < totalSteps ? steps[currentIndex] : null;
  const isActive = Boolean(enabled && !isDone && currentStep);
  const advance = useCallback(() => {
    setState((prev) => {
      if (prev.isDone) return prev;
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= totalSteps) {
        writeEditorTourDone();
        writeEditorTourCtaHighlightPending();
        return { isDone: true, currentIndex: prev.currentIndex };
      }
      return { isDone: false, currentIndex: nextIndex };
    });
  }, [totalSteps]);
  const skip = useCallback(() => {
    writeEditorTourDone();
    clearEditorTourCtaHighlightPending();
    setState({ isDone: true, currentIndex: 0 });
  }, []);
  const complete = useCallback(() => {
    writeEditorTourDone();
    setState({ isDone: true, currentIndex: 0 });
  }, []);
  const restart = useCallback(() => {
    clearEditorTourDone();
    clearEditorTourCtaHighlightPending();
    setState({ isDone: false, currentIndex: 0 });
  }, []);
  const [activeTargetEl, setActiveTargetEl] = useState(null);
  const rafIdRef = useRef(null);
  const activeTargetId = currentStep ? currentStep.targetId : null;
  useEffect(() => {
    if (typeof document === "undefined") return void 0;
    if (!isActive || !activeTargetId) return void 0;
    let capturedEl = null;
    const activate = (el2) => {
      el2.setAttribute("data-tour-active", "true");
      el2.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth"
      });
      capturedEl = el2;
      setActiveTargetEl(el2);
    };
    const el = document.querySelector(`[data-tour-id="${activeTargetId}"]`);
    if (el) {
      activate(el);
    } else {
      let attempt = 0;
      const retry = () => {
        attempt += 1;
        const found = document.querySelector(
          `[data-tour-id="${activeTargetId}"]`
        );
        if (found) {
          activate(found);
        } else if (attempt < 5) {
          rafIdRef.current = requestAnimationFrame(retry);
        }
      };
      rafIdRef.current = requestAnimationFrame(retry);
    }
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (capturedEl) {
        capturedEl.removeAttribute("data-tour-active");
      }
      setActiveTargetEl(null);
    };
  }, [isActive, activeTargetId]);
  useEffect(() => {
    if (!isActive || !activeTargetId || !activeTargetEl) return void 0;
    if (currentStep?.isSaveStep) return void 0;
    if (activeTargetEl.getAttribute("data-tour-id") !== activeTargetId) {
      return void 0;
    }
    const tag = activeTargetEl.tagName;
    const role = activeTargetEl.getAttribute("role");
    const isInteractive = tag === "BUTTON" || tag === "A" || role === "button" || role === "link";
    if (!isInteractive) return void 0;
    const handler = () => {
      advance();
    };
    activeTargetEl.addEventListener("click", handler);
    return () => {
      activeTargetEl.removeEventListener("click", handler);
    };
  }, [isActive, activeTargetId, activeTargetEl, advance, currentStep]);
  useEffect(() => {
    if (!isActive || !activeTargetEl || currentStep?.advanceOn !== "input") {
      return void 0;
    }
    let handled = false;
    let timerId = null;
    const scheduleAdvance = () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(() => {
        timerId = null;
        if (handled) return;
        const val = typeof activeTargetEl.value === "string" ? activeTargetEl.value : "";
        if (val.trim().length > 0) {
          handled = true;
          advance();
        }
      }, 0);
    };
    const handleInput = () => {
      scheduleAdvance();
    };
    const handlePaste = () => {
      scheduleAdvance();
    };
    activeTargetEl.addEventListener("input", handleInput);
    activeTargetEl.addEventListener("paste", handlePaste);
    return () => {
      handled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      activeTargetEl.removeEventListener("input", handleInput);
      activeTargetEl.removeEventListener("paste", handlePaste);
    };
  }, [isActive, activeTargetEl, currentStep, advance]);
  useEffect(() => {
    if (!isActive || !currentStep?.isUploadStep) return void 0;
    const handler = (e) => {
      if (e.detail?.kind === currentStep.uploadKind) {
        advance();
      }
    };
    document.addEventListener("cardigo:upload-applied", handler);
    return () => {
      document.removeEventListener("cardigo:upload-applied", handler);
    };
  }, [isActive, currentStep, advance]);
  return {
    isActive,
    isDone,
    currentStep,
    currentIndex,
    totalSteps,
    advance,
    skip,
    complete,
    restart,
    steps
  };
}
const panel = "_panel_8mfhu_1";
const content = "_content_8mfhu_31";
const text = "_text_8mfhu_43";
const meta = "_meta_8mfhu_57";
const actions = "_actions_8mfhu_69";
const primaryButton = "_primaryButton_8mfhu_81";
const skipButton = "_skipButton_8mfhu_125";
const styles = {
  panel,
  content,
  text,
  meta,
  actions,
  primaryButton,
  skipButton
};
function TourCoachPanel({
  step,
  currentIndex,
  totalSteps,
  onSkip,
  onNext,
  onNextDisabled
}) {
  if (!step) return null;
  return /* @__PURE__ */ jsxs(
    "section",
    {
      className: styles.panel,
      dir: "rtl",
      role: "region",
      "aria-label": "סיור מודרך",
      children: [
        /* @__PURE__ */ jsxs("div", { className: styles.content, children: [
          /* @__PURE__ */ jsx(
            "p",
            {
              className: styles.text,
              "aria-live": "polite",
              "aria-atomic": "true",
              children: step.text
            }
          ),
          /* @__PURE__ */ jsxs("p", { className: styles.meta, children: [
            currentIndex + 1,
            " מתוך ",
            totalSteps
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles.actions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles.primaryButton,
              onClick: () => onNext?.(),
              disabled: Boolean(onNextDisabled),
              children: "המשך"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles.skipButton,
              onClick: () => onSkip?.(),
              children: "דלג על ההדרכה"
            }
          )
        ] })
      ]
    }
  );
}
const MINI_GUIDE_IDS = {
  SHARE_CARD: "share-card",
  SEO_AUTO: "seo-auto",
  BOOKING_HOURS: "booking-hours"
};
function buildShareCardSteps({
  cardIsPublished,
  entCanPublish,
  entCanChangeSlug
}) {
  const sm1 = {
    id: "sm-open",
    targetId: "editor-tour-sections-menu",
    text: "לחץ על תפריט עריכה כדי לפתוח אותו",
    requiresDrawer: false
  };
  const settingsTab = {
    id: "settings-tab",
    targetId: "editor-mini-guide-tab-settings",
    text: "לחץ על הגדרות כדי לפתוח את הגדרות הכרטיס",
    requiresDrawer: true,
    isNextDisabledByDefault: true
  };
  const slugInput2 = {
    id: "slug-input",
    targetId: "editor-mini-guide-slug-input",
    text: "כאן תוכל לשנות את הכתובת הקצרה של הכרטיס. אפשר להמשיך ללא שינוי.",
    requiresDrawer: false,
    isSlugStep: true
  };
  const publishBtn = {
    id: "publish-btn",
    targetId: "editor-mini-guide-publish-btn",
    text: "לחץ על פרסום כדי לפרסם את הכרטיס ולהפעיל את הקישור הציבורי",
    requiresDrawer: false,
    isPublishStep: true
  };
  const sm2 = {
    id: "sm-link",
    targetId: "editor-tour-sections-menu",
    text: "לחץ על תפריט עריכה כדי לראות את הקישור לשיתוף",
    requiresDrawer: false
  };
  const linkBlock = {
    id: "link-block",
    targetId: "editor-mini-guide-public-link-block",
    text: cardIsPublished || entCanPublish ? "זהו הקישור הציבורי שלך — שתף אותו עם הלקוחות!" : "זהו הקישור העתידי שלך — יהפוך לציבורי לאחר פרסום הכרטיס",
    requiresDrawer: true,
    isFinalBlockStep: true
  };
  if (cardIsPublished) {
    return [sm1, settingsTab, sm2, linkBlock];
  }
  if (!entCanPublish) {
    return [sm1, settingsTab, sm2, linkBlock];
  }
  if (!entCanChangeSlug) {
    return [sm1, settingsTab, publishBtn, sm2, linkBlock];
  }
  return [sm1, settingsTab, slugInput2, publishBtn, sm2, linkBlock];
}
function buildSeoAutoSteps() {
  return [
    {
      id: "seo-open",
      targetId: "editor-tour-sections-menu",
      text: "פתחו את תפריט העריכה.",
      requiresDrawer: false
    },
    {
      id: "seo-tab",
      targetId: "editor-mini-guide-tab-seo",
      text: "בחרו SEO וסקריפטים.",
      requiresDrawer: true,
      isNextDisabledByDefault: true
    },
    {
      id: "seo-auto-btn",
      targetId: "editor-mini-guide-seo-auto-btn",
      text: "לחצו על ״הגדירו לי SEO אוטומטית״. אם הכפתור לא פעיל, השלימו קודם את הפרטים החסרים.",
      requiresDrawer: false,
      isFinalBlockStep: true
    }
  ];
}
const BOOKING_HOURS_GUIDE_DAYS = [
  { key: "sun", label: "ראשון" },
  { key: "mon", label: "שני" },
  { key: "tue", label: "שלישי" },
  { key: "wed", label: "רביעי" },
  { key: "thu", label: "חמישי" }
];
function buildBookingHoursSteps({
  canUseBooking,
  bookingEnabled,
  hoursEnabled,
  week
} = {}) {
  const steps = [];
  steps.push({
    id: "booking-hours-open",
    targetId: "editor-tour-sections-menu",
    text: "פתחו את תפריט העריכה.",
    requiresDrawer: false
  });
  steps.push({
    id: "booking-hours-tab",
    targetId: "editor-mini-guide-tab-hours",
    text: "עברו לשעות פעילות.",
    requiresDrawer: true,
    isNextDisabledByDefault: true
  });
  if (canUseBooking) {
    if (bookingEnabled !== true) {
      steps.push({
        id: "booking-enable",
        targetId: "editor-mini-guide-hours-booking-enable",
        text: "אפשרו ללקוחות להזמין תורים מהכרטיס.",
        requiresDrawer: false,
        isCheckboxChangeStep: true
      });
    }
    steps.push({
      id: "booking-horizon",
      targetId: "editor-mini-guide-hours-horizon",
      text: "בחרו כמה זמן קדימה לקוחות יוכלו להזמין.",
      requiresDrawer: false,
      isListboxSelectStep: true
    });
  }
  if (hoursEnabled !== true) {
    steps.push({
      id: "hours-show-in-card",
      targetId: "editor-mini-guide-hours-show-in-card",
      text: "הפעילו הצגה של שעות הפעילות בכרטיס.",
      requiresDrawer: false,
      isCheckboxChangeStep: true
    });
  }
  const safeWeek = week && typeof week === "object" && !Array.isArray(week) ? week : {};
  for (const { key, label: label2 } of BOOKING_HOURS_GUIDE_DAYS) {
    const dayData = safeWeek[key];
    const alreadyOpen = dayData?.open === true;
    const hasIntervals = Array.isArray(dayData?.intervals) && dayData.intervals.length > 0;
    if (!alreadyOpen) {
      steps.push({
        id: `hours-${key}-open`,
        targetId: `editor-mini-guide-hours-${key}-closed`,
        text: `פתחו את יום ${label2} לקבלת תורים.`,
        requiresDrawer: false,
        isCheckboxChangeStep: true
      });
    }
    if (!hasIntervals) {
      steps.push({
        id: `hours-${key}-add-range`,
        targetId: `editor-mini-guide-hours-${key}-add-range`,
        text: `הוסיפו טווח שעות ליום ${label2}.`,
        requiresDrawer: false
      });
    }
  }
  steps.push({
    id: "booking-hours-save",
    targetId: "editor-tour-save-changes",
    text: "שמרו את השינויים.",
    requiresDrawer: false,
    isFinalBlockStep: true
  });
  return steps;
}
function computeActiveSteps(guideId, context) {
  if (guideId === MINI_GUIDE_IDS.SHARE_CARD) {
    return buildShareCardSteps(context);
  }
  if (guideId === MINI_GUIDE_IDS.SEO_AUTO) {
    return buildSeoAutoSteps();
  }
  if (guideId === MINI_GUIDE_IDS.BOOKING_HOURS) {
    return buildBookingHoursSteps(context);
  }
  return [];
}
function useEditorMiniGuide({
  enabled,
  cardIsPublished,
  entCanPublish,
  entCanChangeSlug
}) {
  const [state, setState] = useState({
    guideId: null,
    currentIndex: 0,
    steps: [],
    running: false,
    isDone: false
  });
  const {
    guideId: currentGuideId,
    currentIndex,
    steps,
    running,
    isDone
  } = state;
  const totalSteps = steps.length;
  const isActive = running && totalSteps > 0 && currentIndex < totalSteps;
  const currentStep = isActive ? steps[currentIndex] : null;
  const isFinalStep = isActive && currentIndex === totalSteps - 1;
  const isNextDisabled = Boolean(
    isActive && (currentStep?.isNextDisabledByDefault === true || currentStep?.isPublishStep === true && !cardIsPublished)
  );
  const requiresDrawerStepId = isActive && currentStep?.requiresDrawer ? currentStep.id : null;
  const start = useCallback(
    (newGuideId, extraContext = {}) => {
      if (!enabled) return;
      const context = {
        cardIsPublished,
        entCanPublish,
        entCanChangeSlug,
        ...extraContext
      };
      const activeSteps = computeActiveSteps(newGuideId, context);
      if (!activeSteps.length) return;
      setState({
        guideId: newGuideId,
        currentIndex: 0,
        steps: activeSteps,
        running: true,
        isDone: false
      });
    },
    [enabled, cardIsPublished, entCanPublish, entCanChangeSlug]
  );
  const advance = useCallback(() => {
    setState((prev) => {
      if (!prev.running || !prev.steps.length) return prev;
      const next = prev.currentIndex + 1;
      if (next >= prev.steps.length) {
        return {
          ...prev,
          running: false,
          isDone: true,
          currentIndex: 0
        };
      }
      return { ...prev, currentIndex: next };
    });
  }, []);
  const skip = useCallback(() => {
    setState((prev) => ({
      ...prev,
      running: false,
      isDone: false,
      currentIndex: 0,
      steps: [],
      guideId: null
    }));
  }, []);
  const complete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      running: false,
      isDone: true,
      currentIndex: 0
    }));
  }, []);
  const [activeTargetEl, setActiveTargetEl] = useState(null);
  const rafIdRef = useRef(null);
  const activeTargetId = currentStep ? currentStep.targetId : null;
  useEffect(() => {
    if (typeof document === "undefined") return void 0;
    if (!isActive || !activeTargetId) return void 0;
    let capturedEl = null;
    const activate = (el2) => {
      el2.setAttribute("data-tour-active", "true");
      el2.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth"
      });
      capturedEl = el2;
      setActiveTargetEl(el2);
    };
    const el = document.querySelector(`[data-tour-id="${activeTargetId}"]`);
    if (el) {
      activate(el);
    } else {
      let attempt = 0;
      const retry = () => {
        attempt += 1;
        const found = document.querySelector(
          `[data-tour-id="${activeTargetId}"]`
        );
        if (found) {
          activate(found);
        } else if (attempt < 5) {
          rafIdRef.current = requestAnimationFrame(retry);
        }
      };
      rafIdRef.current = requestAnimationFrame(retry);
    }
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (capturedEl) {
        capturedEl.removeAttribute("data-tour-active");
      }
      setActiveTargetEl(null);
    };
  }, [isActive, activeTargetId]);
  useEffect(() => {
    if (!isActive || !activeTargetId || !activeTargetEl) return void 0;
    if (currentStep?.isPublishStep) return void 0;
    if (currentStep?.isSlugStep) return void 0;
    if (currentStep?.isFinalBlockStep) return void 0;
    if (currentStep?.isCheckboxChangeStep) return void 0;
    if (currentStep?.isListboxSelectStep) return void 0;
    if (activeTargetEl.getAttribute("data-tour-id") !== activeTargetId)
      return void 0;
    const tag = activeTargetEl.tagName;
    const role = activeTargetEl.getAttribute("role");
    const isInteractive = tag === "BUTTON" || tag === "A" || role === "button" || role === "link";
    if (!isInteractive) return void 0;
    const handler = () => {
      advance();
    };
    activeTargetEl.addEventListener("click", handler);
    return () => {
      activeTargetEl.removeEventListener("click", handler);
    };
  }, [isActive, activeTargetId, activeTargetEl, advance, currentStep]);
  useEffect(() => {
    if (!isActive || !activeTargetEl || !currentStep?.isSlugStep)
      return void 0;
    let handled = false;
    let timerId = null;
    const scheduleAdvance = () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(() => {
        timerId = null;
        if (handled) return;
        const val = typeof activeTargetEl.value === "string" ? activeTargetEl.value : "";
        if (val.trim().length > 0) {
          handled = true;
          advance();
        }
      }, 0);
    };
    const handleInput = () => {
      scheduleAdvance();
    };
    const handlePaste = () => {
      scheduleAdvance();
    };
    activeTargetEl.addEventListener("input", handleInput);
    activeTargetEl.addEventListener("paste", handlePaste);
    return () => {
      handled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      activeTargetEl.removeEventListener("input", handleInput);
      activeTargetEl.removeEventListener("paste", handlePaste);
    };
  }, [isActive, activeTargetEl, currentStep, advance]);
  useEffect(() => {
    if (!isActive || !currentStep?.isPublishStep) return;
    if (!cardIsPublished) return;
    advance();
  }, [isActive, cardIsPublished, currentStep?.isPublishStep, advance]);
  useEffect(() => {
    if (!isActive || !activeTargetEl || !currentStep?.isCheckboxChangeStep)
      return void 0;
    const checkboxInput = activeTargetEl.querySelector(
      'input[type="checkbox"]'
    );
    if (!checkboxInput || checkboxInput.disabled) return void 0;
    let handled = false;
    let timerId = null;
    const handler = (e) => {
      if (handled) return;
      if (e.target.checked !== true) return;
      handled = true;
      timerId = window.setTimeout(() => {
        timerId = null;
        advance();
      }, 0);
    };
    checkboxInput.addEventListener("change", handler);
    return () => {
      handled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
      checkboxInput.removeEventListener("change", handler);
    };
  }, [isActive, activeTargetEl, currentStep, advance]);
  useEffect(() => {
    if (!isActive || !activeTargetEl || !currentStep?.isListboxSelectStep)
      return void 0;
    let handled = false;
    let timerId = null;
    const handler = (e) => {
      if (handled) return;
      const optionEl = e.target?.closest?.('[role="option"]');
      if (!optionEl) return;
      handled = true;
      timerId = window.setTimeout(() => {
        timerId = null;
        advance();
      }, 0);
    };
    activeTargetEl.addEventListener("click", handler);
    return () => {
      handled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
      activeTargetEl.removeEventListener("click", handler);
    };
  }, [isActive, activeTargetEl, currentStep, advance]);
  useEffect(() => {
    if (!isActive || !activeTargetEl || !currentStep?.isFinalBlockStep)
      return void 0;
    const handler = () => {
      complete();
    };
    activeTargetEl.addEventListener("click", handler);
    return () => {
      activeTargetEl.removeEventListener("click", handler);
    };
  }, [isActive, activeTargetEl, currentStep, complete]);
  return {
    isActive,
    isDone,
    currentGuideId,
    currentStep,
    currentIndex,
    totalSteps,
    start,
    advance,
    skip,
    complete,
    requiresDrawerStepId,
    isNextDisabled,
    isFinalStep
  };
}
function TourMiniPanel({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onSkip,
  nextDisabled,
  isFinalStep,
  guideTitle
}) {
  if (!step) return null;
  return /* @__PURE__ */ jsxs(
    "section",
    {
      className: styles.panel,
      dir: "rtl",
      role: "region",
      "aria-label": guideTitle || "מדריך",
      children: [
        /* @__PURE__ */ jsxs("div", { className: styles.content, children: [
          /* @__PURE__ */ jsx(
            "p",
            {
              className: styles.text,
              "aria-live": "polite",
              "aria-atomic": "true",
              children: step.text
            }
          ),
          /* @__PURE__ */ jsxs("p", { className: styles.meta, children: [
            currentIndex + 1,
            " מתוך ",
            totalSteps
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles.actions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles.primaryButton,
              onClick: () => onNext?.(),
              disabled: Boolean(nextDisabled),
              children: isFinalStep ? "סיום" : "הבא"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles.skipButton,
              onClick: () => onSkip?.(),
              children: "דלג"
            }
          )
        ] })
      ]
    }
  );
}
const REFETCH_THROTTLE_MS = 15e3;
function EditCard() {
  const navigate = useNavigate();
  const { section: section2, tab: tab2 } = useParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  useEffect(() => {
    if (section2 === "galleries") {
      navigate("/edit/card/gallery", { replace: true });
      return;
    }
    if (section2 === "seo") {
      navigate("/edit/card/seo", { replace: true });
      return;
    }
    if (section2 === "leads") {
      navigate("/edit/card/business", { replace: true });
      return;
    }
    const validSections = /* @__PURE__ */ new Set(["card"]);
    const validCardTabs = new Set(EDITOR_CARD_TABS);
    if (!section2 || !validSections.has(section2)) {
      navigate("/edit/card/templates", { replace: true });
      return;
    }
    if (section2 === "card") {
      if (!tab2 || !validCardTabs.has(tab2)) {
        navigate("/edit/card/templates", { replace: true });
        return;
      }
    } else {
      if (tab2) {
        navigate(`/edit/${section2}`, { replace: true });
        return;
      }
    }
  }, [section2, tab2, navigate]);
  function normalizeReviewsForEditor(input) {
    if (!Array.isArray(input)) return [];
    return input.map((r) => {
      if (typeof r === "string") return r;
      if (r && typeof r === "object" && typeof r.text === "string")
        return r.text;
      return "";
    }).map((s) => String(s || "").trim()).filter(Boolean);
  }
  function normalizeFaqForSave(input) {
    if (input === null) return null;
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return null;
    }
    const title2 = typeof input.title === "string" && input.title.trim() ? input.title.trim() : null;
    const lead = typeof input.lead === "string" && input.lead.trim() ? input.lead.trim() : null;
    const rawItems = Array.isArray(input.items) ? input.items : [];
    const items2 = rawItems.map((it) => {
      if (!it || typeof it !== "object" || Array.isArray(it)) {
        return null;
      }
      const q = typeof it.q === "string" ? String(it.q).trim() : "";
      const a = typeof it.a === "string" ? String(it.a).trim() : "";
      if (!q || !a) return null;
      return { q, a };
    }).filter(Boolean).slice(0, 10);
    if (!title2 && !lead && items2.length === 0) return null;
    return {
      title: title2,
      lead,
      ...items2.length ? { items: items2 } : {}
    };
  }
  function normalizeCardForEditor(dto) {
    if (!dto || typeof dto !== "object") return dto;
    return {
      ...dto,
      // Phase 1: editor ReviewsPanel is still string[]; keep state compatible.
      reviews: normalizeReviewsForEditor(dto.reviews)
    };
  }
  const emptyCard = {
    status: "draft",
    slug: "",
    business: {},
    contact: {},
    content: {},
    gallery: [],
    reviews: [],
    design: {
      templateId: null
    },
    flags: {
      isTemplateSeeded: false,
      seededMap: {}
    }
  };
  function withPreviewMediaTouched(nextDraft) {
    if (!nextDraft || typeof nextDraft !== "object") return nextDraft;
    const prevFlags = nextDraft.flags && typeof nextDraft.flags === "object" ? nextDraft.flags : {};
    const prevLocks = prevFlags.previewLocks && typeof prevFlags.previewLocks === "object" ? prevFlags.previewLocks : {};
    if (prevLocks.mediaTouched === true) return nextDraft;
    return {
      ...nextDraft,
      flags: {
        ...prevFlags,
        previewLocks: {
          ...prevLocks,
          mediaTouched: true
        }
      }
    };
  }
  const [draftCard, setDraftCard] = useState(emptyCard);
  const isAnonymousTourEligible = !isAuthenticated && Boolean(getAnonymousId());
  const editorTour = useEditorTour({
    isAnonymous: isAnonymousTourEligible,
    enabled: section2 === "card" && Boolean(draftCard?._id) && isAnonymousTourEligible
  });
  const editorTourRef = useRef(null);
  useEffect(() => {
    editorTourRef.current = editorTour;
  }, [editorTour]);
  const [dirtyPaths, setDirtyPaths] = useState(() => /* @__PURE__ */ new Set());
  const [saveState, setSaveState] = useState("idle");
  const [ctaHighlightPending, setCtaHighlightPending] = useState(
    () => readEditorTourCtaHighlightPending()
  );
  useEffect(() => {
    if (editorTour.isDone && !editorTour.isActive) {
      setCtaHighlightPending(readEditorTourCtaHighlightPending());
    }
  }, [editorTour.isDone, editorTour.isActive]);
  const guardedTourNext = useCallback(() => {
    const tour = editorTourRef.current;
    const step = tour?.currentStep;
    if (step?.isSaveStep && (dirtyPaths.size > 0 || saveState === "saving")) {
      return;
    }
    tour?.advance?.();
  }, [dirtyPaths.size, saveState]);
  const [saveErrorText, setSaveErrorText] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isInitializing, setIsInitializing] = useState(true);
  const [needsCreateUserCard, setNeedsCreateUserCard] = useState(false);
  const [createUserCardBusy, setCreateUserCardBusy] = useState(false);
  const [createUserCardError, setCreateUserCardError] = useState(null);
  const [claimRecoveryError, setClaimRecoveryError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDesignAssetBusyKind, setDeleteDesignAssetBusyKind] = useState(null);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const pendingBlockerRef = useRef(null);
  const [unsavedActionBusy, setUnsavedActionBusy] = useState(false);
  const isDeletingRef = useRef(isDeleting);
  useEffect(() => {
    isDeletingRef.current = isDeleting;
  }, [isDeleting]);
  const [showAnonConsentGate, setShowAnonConsentGate] = useState(false);
  const [anonConsentChecked, setAnonConsentChecked] = useState(false);
  const [anonConsentBusy, setAnonConsentBusy] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState(null);
  const deleteNoticeTimerRef = useRef(null);
  const clearDeleteNoticeTimer = useCallback(() => {
    if (deleteNoticeTimerRef.current) {
      clearTimeout(deleteNoticeTimerRef.current);
      deleteNoticeTimerRef.current = null;
    }
  }, []);
  const showDeleteNotice = useCallback(
    (notice2) => {
      clearDeleteNoticeTimer();
      setDeleteNotice(notice2);
      deleteNoticeTimerRef.current = setTimeout(() => {
        setDeleteNotice(null);
        deleteNoticeTimerRef.current = null;
      }, 3e3);
    },
    [clearDeleteNoticeTimer]
  );
  useEffect(() => {
    return () => {
      clearDeleteNoticeTimer();
    };
  }, [clearDeleteNoticeTimer]);
  const lastRefetchAtRef = useRef(0);
  const orgContextRef = useRef({ isOrgMode: false, activeOrgSlug: "" });
  const handleUpdateSlug = useCallback(
    async (nextSlug) => {
      const ctx = orgContextRef.current || {
        isOrgMode: false,
        activeOrgSlug: ""
      };
      const payload = ctx.isOrgMode && ctx.activeOrgSlug ? await api.patch(`/orgs/${ctx.activeOrgSlug}/cards/mine/slug`, {
        slug: nextSlug
      }).then((r) => r.data) : await updateCardSlug(nextSlug);
      const updatedSlug = String(payload?.slug || "").trim();
      if (!updatedSlug) return "";
      setDraftCard((prev) => ({
        ...prev || {},
        slug: updatedSlug,
        ...payload?.publicPath ? { publicPath: payload.publicPath } : null,
        ...payload?.ogPath ? { ogPath: payload.ogPath } : null
      }));
      try {
        const mine = await fetchMineOnce();
        if (mine && typeof mine === "object") {
          setDraftCard((prev) => ({
            ...prev || {},
            slugPolicy: mine.slugPolicy || prev?.slugPolicy,
            // Keep slug consistent with server if it differs.
            slug: typeof mine.slug === "string" ? mine.slug : prev?.slug,
            ...typeof mine.publicPath === "string" ? { publicPath: mine.publicPath } : null,
            ...typeof mine.ogPath === "string" ? { ogPath: mine.ogPath } : null
          }));
        }
      } catch {
      }
      return updatedSlug;
    },
    [setDraftCard]
  );
  const draftCardRef = useRef(draftCard);
  useEffect(() => {
    draftCardRef.current = draftCard;
  }, [draftCard]);
  const dirtyPathsRef = useRef(dirtyPaths);
  useEffect(() => {
    dirtyPathsRef.current = dirtyPaths;
  }, [dirtyPaths]);
  const changeSeqRef = useRef(0);
  const lastSelfThemeChangeSeqRef = useRef(0);
  const lastTemplateChangeSeqRef = useRef(0);
  const lastSeqCardIdRef = useRef(null);
  useEffect(() => {
    const nextId = draftCard?._id ? String(draftCard._id) : null;
    if (lastSeqCardIdRef.current === nextId) return;
    lastSeqCardIdRef.current = nextId;
    changeSeqRef.current = 0;
    lastSelfThemeChangeSeqRef.current = 0;
    lastTemplateChangeSeqRef.current = 0;
  }, [draftCard?._id]);
  const closeUnsavedModal = useCallback(() => {
    setIsUnsavedModalOpen(false);
    setPendingAction(null);
    setUnsavedActionBusy(false);
  }, []);
  const requestNavigate = useCallback(
    (to) => {
      const nextTo = String(to || "");
      if (!nextTo) return;
      const hasDirty = dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
      if (!hasDirty) {
        navigate(nextTo);
        return;
      }
      pendingBlockerRef.current = null;
      setPendingAction({ kind: "tab", to: nextTo });
      setIsUnsavedModalOpen(true);
    },
    [navigate]
  );
  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (isDeletingRef.current) return;
      const hasDirty = dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
      if (!hasDirty) return;
      event.preventDefault();
      event.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (isDeletingRef.current) return false;
    const hasDirty = dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
    if (!hasDirty) return false;
    const nextPath = nextLocation?.pathname || "";
    if (nextPath.startsWith("/edit")) return false;
    return true;
  });
  useEffect(() => {
    if (blocker?.state !== "blocked") return;
    pendingBlockerRef.current = blocker;
    setPendingAction({ kind: "leave" });
    setIsUnsavedModalOpen(true);
  }, [blocker]);
  const saveStateTimerRef = useRef(null);
  const clearSaveStateTimer = useCallback(() => {
    if (saveStateTimerRef.current) {
      clearTimeout(saveStateTimerRef.current);
      saveStateTimerRef.current = null;
    }
  }, []);
  useEffect(() => {
    return () => {
      clearSaveStateTimer();
    };
  }, [clearSaveStateTimer]);
  useEffect(() => {
    if (saveState !== "saved") {
      clearSaveStateTimer();
      return;
    }
    clearSaveStateTimer();
    saveStateTimerRef.current = setTimeout(() => {
      setSaveState((prev) => {
        if (prev !== "saved") return prev;
        const hasDirty = dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
        return hasDirty ? "dirty" : "idle";
      });
    }, 2500);
  }, [saveState, clearSaveStateTimer]);
  const isPaid = Boolean(draftCard?.effectiveBilling?.isPaid);
  const isEntitled = Boolean(draftCard?.effectiveBilling?.isEntitled);
  const editingDisabled = draftCard?.entitlements?.canEdit === false;
  const isTrialExpired = draftCard?.entitlements?.lockedReason === "TRIAL_EXPIRED";
  const showTrialBanner = !isPaid && !(!isEntitled && !isTrialExpired) && (draftCard?.effectiveBilling?.source === "trial" || Boolean(draftCard?.trialStartedAt || draftCard?.trialEndsAt) || editingDisabled);
  const createCardInFlightRef = useRef(null);
  const [activeOrgSlug, setActiveOrgSlug] = useState("");
  const [myOrgs, setMyOrgs] = useState([]);
  const [orgsLoadState, setOrgsLoadState] = useState("idle");
  const [orgsError, setOrgsError] = useState("");
  const [orgCardError, setOrgCardError] = useState("");
  const [contextResolved, setContextResolved] = useState(
    () => !isAuthenticated
  );
  const isOrgMode = isAuthenticated && Boolean(activeOrgSlug);
  orgContextRef.current.isOrgMode = isOrgMode;
  orgContextRef.current.activeOrgSlug = activeOrgSlug;
  const orgFromQueryRef = useRef(null);
  const orgFromQueryLoadRequestedRef = useRef(false);
  const orgFromQueryAppliedRef = useRef(false);
  useEffect(() => {
    if (authLoading) return;
    setContextResolved(!isAuthenticated);
    orgFromQueryRef.current = null;
    orgFromQueryLoadRequestedRef.current = false;
    orgFromQueryAppliedRef.current = false;
  }, [isAuthenticated, authLoading]);
  function isCreateInFlightError(err) {
    const status2 = err?.response?.status;
    const code = err?.response?.data?.code;
    return status2 === 503 && code === "CARD_CREATE_IN_FLIGHT";
  }
  function jitterDelayMs(baseMs) {
    const b = Number(baseMs) || 0;
    if (b <= 0) return 0;
    const jitter = 0.7 + Math.random() * 0.6;
    return Math.max(0, Math.round(b * jitter));
  }
  async function sleepMs(ms) {
    const t = Number(ms) || 0;
    if (t <= 0) return;
    return new Promise((resolve) => setTimeout(resolve, t));
  }
  async function fetchPersonalMineOnce() {
    const res = await api.get("/cards/mine");
    return res?.data || null;
  }
  async function fetchMineOnce() {
    const ctx = orgContextRef.current || {
      isOrgMode: false,
      activeOrgSlug: ""
    };
    const res = ctx.isOrgMode && ctx.activeOrgSlug ? await api.get(`/orgs/${ctx.activeOrgSlug}/cards/mine`) : await api.get("/cards/mine");
    return res?.data || null;
  }
  async function createCardWithRetry() {
    if (createCardInFlightRef.current) return createCardInFlightRef.current;
    const promise = (async () => {
      const mine0 = await fetchPersonalMineOnce();
      if (mine0 && mine0._id) return mine0;
      try {
        const created = await api.post("/cards", { consent: true });
        const createdData = created?.data || null;
        if (createdData && createdData._id) return createdData;
        const mineAfter = await fetchPersonalMineOnce();
        if (mineAfter && mineAfter._id) return mineAfter;
        throw new Error("Create card returned invalid response");
      } catch (err) {
        if (!isCreateInFlightError(err)) throw err;
        const delays = [100, 200, 400, 800];
        for (const d of delays) {
          await sleepMs(jitterDelayMs(d));
          const mine = await fetchPersonalMineOnce();
          if (mine && mine._id) return mine;
        }
        const mineLast = await fetchPersonalMineOnce();
        if (mineLast && mineLast._id) return mineLast;
        const retryErr = new Error(
          "Card creation in progress. Please retry."
        );
        retryErr.code = "CARD_CREATE_IN_FLIGHT";
        throw retryErr;
      }
    })();
    createCardInFlightRef.current = promise;
    promise.finally(() => {
      if (createCardInFlightRef.current === promise) {
        createCardInFlightRef.current = null;
      }
    });
    return promise;
  }
  const initCard = useCallback(
    async (isMounted = () => true) => {
      try {
        if (authLoading) return;
        if (isAuthenticated && !contextResolved) return;
        setOrgCardError("");
        const res = isOrgMode ? await api.get(`/orgs/${activeOrgSlug}/cards/mine`) : await api.get("/cards/mine");
        if (!isMounted()) return;
        const hasDirty = dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
        if (hasDirty && draftCardRef.current?._id) {
          setIsInitializing(false);
          return;
        }
        const mine = res?.data;
        if (!mine || !mine._id) {
          if (isOrgMode) {
            setOrgCardError("אין גישה לארגון או שהכרטיס לא זמין");
            setIsInitializing(false);
            return;
          }
          if (isAuthenticated) {
            const anonId2 = getAnonymousId();
            if (anonId2) {
              try {
                const claimRes = await api.post("/cards/claim");
                if (claimRes?.data?._id) {
                  clearAnonymousId();
                  const normalized2 = normalizeCardForEditor(
                    claimRes.data
                  );
                  setDraftCard(normalized2);
                  setNeedsCreateUserCard(false);
                  setCreateUserCardError(null);
                  setDirtyPaths(/* @__PURE__ */ new Set());
                  setSaveState("idle");
                  setSaveErrorText(null);
                  setIsInitializing(false);
                  return;
                }
              } catch (claimErr) {
                const claimStatus = claimErr?.response?.status;
                if (claimStatus >= 500 || !claimStatus) {
                  console.error(
                    "[initCard] fallback claim transient failure",
                    claimStatus,
                    claimErr?.response?.data || claimErr
                  );
                  setNeedsCreateUserCard(true);
                  setClaimRecoveryError(
                    "לא הצלחנו לשחזר את הכרטיס הקיים. נסו לרענן את הדף."
                  );
                  setCreateUserCardError(null);
                  setIsInitializing(false);
                  return;
                }
              }
            }
            setNeedsCreateUserCard(true);
            setCreateUserCardError(null);
            setClaimRecoveryError(null);
            setIsInitializing(false);
            return;
          }
          setShowAnonConsentGate(true);
          setIsInitializing(false);
          return;
        }
        const normalized = normalizeCardForEditor(mine);
        setDraftCard(normalized);
        setNeedsCreateUserCard(false);
        setCreateUserCardError(null);
        setDirtyPaths(/* @__PURE__ */ new Set());
        setSaveState("idle");
        setSaveErrorText(null);
        setIsInitializing(false);
      } catch (err) {
        const status2 = err?.response?.status;
        console.error(
          "initCard error",
          status2,
          err?.response?.data || err
        );
        if (isCreateInFlightError(err)) {
          try {
            if (isOrgMode) {
              setOrgCardError(
                "אין גישה לארגון או שהכרטיס לא זמין"
              );
              setIsInitializing(false);
              return;
            }
            if (isAuthenticated) {
              setNeedsCreateUserCard(true);
              setCreateUserCardError(null);
              setIsInitializing(false);
              return;
            }
            setShowAnonConsentGate(true);
            setIsInitializing(false);
            return;
          } catch (retryErr) {
            console.error(
              "initCard retry after in-flight failed",
              retryErr?.message || retryErr
            );
          }
        }
        if (status2 === 404) {
          if (isOrgMode) {
            setOrgCardError("אין גישה לארגון או שהכרטיס לא זמין");
            setIsInitializing(false);
            return;
          }
          const hadCardId = Boolean(draftCardRef.current?._id);
          if (hadCardId) {
            navigate("/dashboard", {
              replace: true,
              state: {
                flash: {
                  type: "info",
                  message: "הכרטיס כבר נמחק"
                }
              }
            });
            return;
          }
          try {
            if (!isAuthenticated) {
              setShowAnonConsentGate(true);
              setIsInitializing(false);
              return;
            }
            const createdData = await createCardWithRetry();
            if (!isMounted()) return;
            const normalized = normalizeCardForEditor(createdData);
            setDraftCard(normalized);
            setDirtyPaths(/* @__PURE__ */ new Set());
            setSaveState("idle");
            setSaveErrorText(null);
            setIsInitializing(false);
            return;
          } catch (createErr) {
            console.error(
              "initCard create fallback failed",
              createErr?.response?.status,
              createErr?.response?.data || createErr
            );
          }
        }
        if (isOrgMode) {
          setOrgCardError("אין גישה לארגון או שהכרטיס לא זמין");
          setIsInitializing(false);
          return;
        }
        setIsInitializing(false);
      }
    },
    [
      navigate,
      activeOrgSlug,
      isOrgMode,
      isAuthenticated,
      contextResolved,
      authLoading
    ]
  );
  const loadMyOrgs = useCallback(async () => {
    if (!isAuthenticated) return;
    if (orgsLoadState === "loading" || orgsLoadState === "loaded") return;
    setOrgsLoadState("loading");
    setOrgsError("");
    try {
      const res = await api.get("/orgs/mine");
      const list2 = Array.isArray(res?.data) ? res.data : [];
      setMyOrgs(list2);
      setOrgsLoadState("loaded");
    } catch (e) {
      setOrgsLoadState("error");
      setOrgsError("לא הצלחנו לטעון ארגונים");
    }
  }, [isAuthenticated, orgsLoadState]);
  const handleContextChange = useCallback(
    (nextOrgSlug) => {
      const hasDirty = dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
      if (hasDirty) {
        alert("יש שינויים שלא נשמרו. שמור/בטל לפני החלפת כרטיס.");
        return;
      }
      setOrgCardError("");
      setActiveOrgSlug(String(nextOrgSlug || ""));
      setReloadKey((k) => k + 1);
    },
    [setReloadKey]
  );
  useEffect(() => {
    if (!isAuthenticated) return;
    if (contextResolved) return;
    if (activeOrgSlug) {
      setContextResolved(true);
      return;
    }
    if (orgFromQueryRef.current === null) {
      try {
        const search = typeof window !== "undefined" ? String(window.location?.search || "") : "";
        const params = new URLSearchParams(search);
        orgFromQueryRef.current = String(params.get("org") || "").trim().toLowerCase();
      } catch {
        orgFromQueryRef.current = "";
      }
    }
    const requestedOrgSlug = String(orgFromQueryRef.current || "").trim().toLowerCase();
    if (orgsLoadState === "error") {
      const nextOrgSlug2 = requestedOrgSlug ? requestedOrgSlug : "";
      setActiveOrgSlug(nextOrgSlug2);
      orgFromQueryAppliedRef.current = true;
      setContextResolved(true);
      return;
    }
    if (orgsLoadState !== "loaded") {
      if (!orgFromQueryLoadRequestedRef.current) {
        orgFromQueryLoadRequestedRef.current = true;
        loadMyOrgs();
      }
      return;
    }
    const list2 = Array.isArray(myOrgs) ? myOrgs : [];
    const requestedExists = Boolean(requestedOrgSlug) && list2.some(
      (o) => String(o?.slug || "").trim().toLowerCase() === requestedOrgSlug
    );
    const firstOrgSlug = String(list2?.[0]?.slug || "").trim().toLowerCase();
    const nextOrgSlug = requestedExists ? requestedOrgSlug : firstOrgSlug || "";
    setActiveOrgSlug(nextOrgSlug);
    orgFromQueryAppliedRef.current = true;
    setContextResolved(true);
  }, [
    isAuthenticated,
    contextResolved,
    activeOrgSlug,
    orgsLoadState,
    myOrgs,
    loadMyOrgs
  ]);
  const discardUnsavedAndRehydrate = useCallback(async () => {
    const cleared = /* @__PURE__ */ new Set();
    setDirtyPaths(cleared);
    dirtyPathsRef.current = cleared;
    setSaveState("idle");
    setSaveErrorText(null);
    setReloadKey((k) => k + 1);
  }, []);
  const refetchMineThrottled = useCallback(
    async (isMounted = () => true) => {
      if (isDeletingRef.current) return;
      const hasDirty = dirtyPathsRef.current && dirtyPathsRef.current.size > 0;
      if (hasDirty) return;
      const nowMs = Date.now();
      if (nowMs - lastRefetchAtRef.current < REFETCH_THROTTLE_MS) return;
      lastRefetchAtRef.current = nowMs;
      await initCard(isMounted);
    },
    [initCard]
  );
  useEffect(() => {
    let isMounted = true;
    if (authLoading) {
      return () => {
        isMounted = false;
      };
    }
    if (isAuthenticated && !contextResolved) {
      return () => {
        isMounted = false;
      };
    }
    initCard(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, [initCard, reloadKey, isAuthenticated, contextResolved, authLoading]);
  useEffect(() => {
    if (!editingDisabled) return;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        await refetchMineThrottled(() => !stopped);
      } catch {
      }
    };
    const interval = setInterval(tick, REFETCH_THROTTLE_MS);
    const onFocus = () => tick();
    if (!isAuthenticated) window.addEventListener("focus", onFocus);
    return () => {
      stopped = true;
      clearInterval(interval);
      if (!isAuthenticated) window.removeEventListener("focus", onFocus);
    };
  }, [editingDisabled, refetchMineThrottled, isAuthenticated]);
  useEffect(() => {
    if (!isAuthenticated) return;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        await refetchMineThrottled(() => !stopped);
      } catch {
      }
    };
    const onFocus = () => tick();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") tick();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );
    };
  }, [isAuthenticated, refetchMineThrottled]);
  async function handleDelete() {
    if (isDeletingRef.current) return;
    if (!draftCard?._id) return;
    try {
      setIsDeleting(true);
      const result = await deleteCard(draftCard._id);
      const ok = result?.status === 204 || result?.data?.success === true || result?.data?.ok === true;
      if (!ok) {
        showDeleteNotice({
          type: "error",
          text: "שגיאה במחיקה"
        });
        setIsDeleting(false);
        return;
      }
      setDirtyPaths(/* @__PURE__ */ new Set());
      navigate("/dashboard", {
        replace: true,
        state: {
          flash: {
            type: "success",
            message: "הכרטיס נמחק בהצלחה"
          }
        }
      });
    } catch (err) {
      const status2 = err?.response?.status;
      if (status2 === 403) {
        showDeleteNotice({
          type: "error",
          text: "אין הרשאה למחוק כרטיס זה"
        });
        setIsDeleting(false);
        return;
      }
      if (status2 === 404) {
        setIsDeleting(false);
        navigate("/dashboard", {
          replace: true,
          state: {
            flash: {
              type: "info",
              message: "הכרטיס כבר נמחק"
            }
          }
        });
        return;
      }
      if (status2 === 401) {
        const anon = getAnonymousId();
        if (!isAuthenticated && !anon) {
          window.location.href = "/login";
          return;
        }
      }
      const fallback = "שגיאה במחיקה";
      const serverMessage = err?.response?.data?.message;
      const message = typeof serverMessage === "string" && serverMessage.trim() ? serverMessage : fallback;
      showDeleteNotice({ type: "error", text: message });
      setIsDeleting(false);
      return;
    }
  }
  function setIn(obj, path, value) {
    const keys = Array.isArray(path) ? path : String(path).split(".");
    if (keys.length === 0) return obj;
    const next = Array.isArray(obj) ? obj.slice() : { ...obj || {} };
    let currNext = next;
    let currPrev = obj || {};
    for (let i = 0; i < keys.length - 1; i += 1) {
      const k = keys[i];
      const prevChild = currPrev?.[k];
      const child = Array.isArray(prevChild) ? prevChild.slice() : prevChild && typeof prevChild === "object" ? { ...prevChild } : {};
      currNext[k] = child;
      currNext = child;
      currPrev = prevChild || {};
    }
    currNext[keys[keys.length - 1]] = value;
    return next;
  }
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function mergeSection(prev, section22, patch) {
    return {
      ...prev,
      [section22]: {
        ...prev?.[section22] || {},
        ...patch || {}
      }
    };
  }
  function buildMinimalSectionPayload(draft, dirty, sectionName) {
    if (!draft || typeof draft !== "object") return null;
    if (!(dirty instanceof Set) || dirty.size === 0) return null;
    const section22 = draft[sectionName] && typeof draft[sectionName] === "object" ? draft[sectionName] : null;
    if (!section22) return null;
    const prefix = `${sectionName}.`;
    const nestedPatch = {};
    function getValueByKeys(obj, keys) {
      let curr = obj;
      for (const k of keys) {
        if (!curr || typeof curr !== "object") return void 0;
        curr = curr[k];
      }
      return curr;
    }
    function setValueByKeys(target, keys, value) {
      if (!keys.length) return;
      let curr = target;
      for (let i = 0; i < keys.length - 1; i += 1) {
        const k = keys[i];
        if (!curr[k] || typeof curr[k] !== "object" || Array.isArray(curr[k])) {
          curr[k] = {};
        }
        curr = curr[k];
      }
      curr[keys[keys.length - 1]] = value;
    }
    for (const path of dirty) {
      const p = String(path || "");
      if (!p.startsWith(prefix)) continue;
      const leaf = p.slice(prefix.length);
      if (!leaf) continue;
      const keys = leaf.split(".").filter(Boolean);
      if (!keys.length) continue;
      const value = getValueByKeys(section22, keys);
      if (value === void 0) continue;
      setValueByKeys(nestedPatch, keys, value);
    }
    const aboutParagraphsPath = `${sectionName}.aboutParagraphs`;
    const aboutTextPath = `${sectionName}.aboutText`;
    if (dirty.has(aboutParagraphsPath) || dirty.has(aboutTextPath)) {
      const aboutParagraphs = Array.isArray(section22.aboutParagraphs) ? section22.aboutParagraphs : [];
      const aboutText = typeof section22.aboutText === "string" ? section22.aboutText : "";
      nestedPatch.aboutParagraphs = aboutParagraphs;
      nestedPatch.aboutText = aboutText;
    }
    return Object.keys(nestedPatch).length ? nestedPatch : null;
  }
  const commitDraft = useCallback(async () => {
    const cardId = draftCard?._id;
    if (!cardId) return false;
    if (!dirtyPaths || dirtyPaths.size === 0) return false;
    const dirtySections = /* @__PURE__ */ new Set();
    for (const path of dirtyPaths) {
      const section22 = String(path || "").split(".")[0];
      if (section22) dirtySections.add(section22);
    }
    const payload = {};
    for (const section22 of dirtySections) {
      if (Object.prototype.hasOwnProperty.call(draftCard || {}, section22)) {
        if (section22 === "content") {
          const minimal = buildMinimalSectionPayload(
            draftCard,
            dirtyPaths,
            "content"
          );
          if (minimal) payload.content = minimal;
          continue;
        }
        if (section22 === "faq") {
          payload.faq = normalizeFaqForSave(draftCard?.faq);
          continue;
        }
        if (section22 === "flags") {
          const raw = draftCard?.flags && typeof draftCard.flags === "object" ? draftCard.flags : null;
          if (!raw) {
            payload.flags = raw;
            continue;
          }
          const { previewLocks, ...rest } = raw;
          payload.flags = rest;
          continue;
        }
        payload[section22] = draftCard?.[section22];
      }
    }
    const seoDirty = dirtySections.has("seo");
    if (seoDirty) {
      let isAllowedJsonLdTypeValue = function(typeVal) {
        if (typeof typeVal === "string")
          return JSONLD_ALLOWED_TYPES.has(typeVal);
        if (Array.isArray(typeVal)) {
          if (typeVal.length === 0) return false;
          return typeVal.every(
            (t) => typeof t === "string" && JSONLD_ALLOWED_TYPES.has(t)
          );
        }
        return false;
      }, containsBlockedJsonLdNestedType = function(val, depth) {
        if (depth > MAX_NESTING_DEPTH) return true;
        if (val === null || typeof val !== "object") return false;
        if (Array.isArray(val)) {
          return val.some(
            (item2) => containsBlockedJsonLdNestedType(item2, depth + 1)
          );
        }
        if ("@graph" in val) return true;
        const typeVal = val["@type"];
        if (typeVal !== void 0) {
          const types = Array.isArray(typeVal) ? typeVal : [typeVal];
          if (types.some(
            (t) => typeof t === "string" && JSONLD_NESTED_BLOCKED_TYPES.has(t)
          ))
            return true;
        }
        return Object.values(val).some(
          (child) => containsBlockedJsonLdNestedType(child, depth + 1)
        );
      }, isValidJsonLdRootNode = function(node) {
        if (!node || typeof node !== "object" || Array.isArray(node))
          return false;
        if ("@graph" in node) return false;
        if (!isAllowedJsonLdTypeValue(node["@type"])) return false;
        if (containsBlockedJsonLdNestedType(node, 0)) return false;
        return true;
      };
      const seo = draftCard?.seo && typeof draftCard.seo === "object" ? draftCard.seo : {};
      const pickString = (v) => typeof v === "string" ? String(v).trim() : "";
      const hasAngleBrackets = (s) => /[<>]/.test(String(s || ""));
      const MAX_JSONLD_LENGTH = 5e3;
      const JSONLD_ALLOWED_TYPES = /* @__PURE__ */ new Set([
        "LocalBusiness",
        "Organization",
        "Person",
        "Service"
      ]);
      const JSONLD_NESTED_BLOCKED_TYPES = /* @__PURE__ */ new Set([
        "Review",
        "AggregateRating",
        "Rating"
      ]);
      const MAX_NESTING_DEPTH = 10;
      const isValidJsonLdString = (raw) => {
        const v = pickString(raw);
        if (!v) return true;
        if (v.length > MAX_JSONLD_LENGTH) return false;
        try {
          const parsed = JSON.parse(v);
          if (parsed === null || typeof parsed !== "object" && !Array.isArray(parsed))
            return false;
          if (Array.isArray(parsed)) {
            return parsed.every(
              (item2) => item2 !== null && typeof item2 === "object" && !Array.isArray(item2) && isValidJsonLdRootNode(item2)
            );
          }
          return isValidJsonLdRootNode(parsed);
        } catch {
          return false;
        }
      };
      const isValidGtmId = (raw) => {
        const v = pickString(raw);
        if (!v) return true;
        return /^GTM-[A-Z0-9]+$/.test(v.toUpperCase());
      };
      const isValidGaMeasurementId = (raw) => {
        const v = pickString(raw);
        if (!v) return true;
        return /^G-[A-Z0-9]+$/.test(v.toUpperCase());
      };
      const isValidMetaPixelId = (raw) => {
        const v = pickString(raw);
        if (!v) return true;
        return /^[0-9]{5,20}$/.test(v);
      };
      const seoErrorMessageByField = {
        "seo.jsonLd": "JSON-LD לא תקין — יש לוודא: JSON תקין, אובייקט או מערך, עד 5000 תווים, וסוג (@type) מורשה",
        "seo.robots": "Robots לא תקין (ללא < או >)",
        "seo.gtmId": "GTM ID לא תקין. פורמט: GTM-XXXXXXX",
        "seo.gaMeasurementId": "GA Measurement ID לא תקין. פורמט: G-XXXXXXX",
        "seo.metaPixelId": "Meta Pixel ID חייב להיות מספר בלבד",
        "seo.googleSiteVerification": "Verification token לא תקין",
        "seo.facebookDomainVerification": "Verification token לא תקין"
      };
      let firstInvalidField = null;
      if (!isValidJsonLdString(seo?.jsonLd)) {
        firstInvalidField = "seo.jsonLd";
      } else if (!isValidGtmId(seo?.gtmId)) {
        firstInvalidField = "seo.gtmId";
      } else if (!isValidGaMeasurementId(seo?.gaMeasurementId)) {
        firstInvalidField = "seo.gaMeasurementId";
      } else if (!isValidMetaPixelId(seo?.metaPixelId)) {
        firstInvalidField = "seo.metaPixelId";
      } else if (pickString(seo?.robots) && hasAngleBrackets(pickString(seo?.robots))) {
        firstInvalidField = "seo.robots";
      } else if (pickString(seo?.googleSiteVerification) && hasAngleBrackets(pickString(seo?.googleSiteVerification))) {
        firstInvalidField = "seo.googleSiteVerification";
      } else if (pickString(seo?.facebookDomainVerification) && hasAngleBrackets(pickString(seo?.facebookDomainVerification))) {
        firstInvalidField = "seo.facebookDomainVerification";
      }
      if (firstInvalidField) {
        setSaveState("error");
        setSaveErrorText(
          seoErrorMessageByField[firstInvalidField] || "שגיאה בשמירה"
        );
        return false;
      }
    }
    const selfThemeAllowed = Boolean(
      draftCard?.entitlements?.design?.customColors
    );
    const selfThemeTemplateId = TEMPLATES.find((t) => t?.selfThemeV1 === true)?.id || null;
    const selfThemeDirty = Array.from(dirtyPaths).some((p) => {
      const path = String(p || "");
      return path === "design.selfThemeV1" || path.startsWith("design.selfThemeV1.");
    });
    const templateChangedAfterSelfTheme = lastTemplateChangeSeqRef.current > lastSelfThemeChangeSeqRef.current;
    const userChoseOtherTemplate = selfThemeTemplateId && String(draftCard?.design?.templateId || "") !== String(selfThemeTemplateId);
    const blockForce = templateChangedAfterSelfTheme && Boolean(userChoseOtherTemplate);
    const selfThemeValue = draftCard?.design?.selfThemeV1;
    const selfThemeIsActive = selfThemeValue && typeof selfThemeValue === "object" && !Array.isArray(selfThemeValue) && ["bg", "text", "primary", "secondary", "onPrimary"].some(
      (field2) => {
        const value = selfThemeValue[field2];
        return typeof value === "string" && value.trim();
      }
    );
    const shouldForceSelfThemeTemplate = selfThemeAllowed && selfThemeDirty && Boolean(selfThemeTemplateId) && !blockForce && selfThemeIsActive;
    if (shouldForceSelfThemeTemplate) {
      const sourceTemplateId = String(payload.design?.templateId || "");
      const isNewCustomSave = sourceTemplateId.length > 0 && sourceTemplateId !== selfThemeTemplateId;
      payload.design = {
        ...payload.design && typeof payload.design === "object" ? payload.design : {},
        templateId: selfThemeTemplateId,
        ...isNewCustomSave ? { selfThemeBaseTemplateId: sourceTemplateId } : {}
      };
    }
    if (payload.design && typeof payload.design === "object" && selfThemeTemplateId) {
      const finalTemplateId = String(payload.design.templateId || "");
      if (finalTemplateId && finalTemplateId !== selfThemeTemplateId) {
        payload.design = {
          ...payload.design,
          selfThemeBaseTemplateId: null
        };
      }
    }
    if (Object.keys(payload).length === 0) return false;
    setSaveState("saving");
    setSaveErrorText(null);
    setFieldErrors({});
    try {
      const res = await api.patch(`/cards/${cardId}`, payload);
      const previewLocks = draftCardRef.current?.flags?.previewLocks;
      const normalized = normalizeCardForEditor(res.data);
      const normalizedWithLocks = previewLocks ? {
        ...normalized,
        flags: {
          ...normalized?.flags || {},
          previewLocks
        }
      } : normalized;
      setDraftCard(normalizedWithLocks);
      setDirtyPaths(/* @__PURE__ */ new Set());
      setSaveState("saved");
      if (editorTourRef.current?.isActive && editorTourRef.current?.currentStep?.isSaveStep) {
        editorTourRef.current.advance();
      }
      return true;
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "INVALID_ID") {
        setSaveState("error");
        setSaveErrorText("מזהה לא תקין");
        setFieldErrors({});
        return false;
      }
      if (code === "VALIDATION_ERROR") {
        const fields = err?.response?.data?.fields;
        const list2 = Array.isArray(fields) ? fields : [];
        const priority = [
          "seo.jsonLd",
          "seo.gtmId",
          "seo.gaMeasurementId",
          "seo.metaPixelId",
          "seo.robots",
          "seo.googleSiteVerification",
          "seo.facebookDomainVerification"
        ];
        const first = priority.find((p) => list2.includes(p)) || null;
        const messageByField = {
          "seo.jsonLd": "JSON-LD לא תקין — יש לוודא: JSON תקין, אובייקט או מערך, עד 5000 תווים, וסוג (@type) מורשה",
          "seo.robots": "Robots לא תקין (ללא < או >)",
          "seo.gtmId": "GTM ID לא תקין. פורמט: GTM-XXXXXXX",
          "seo.gaMeasurementId": "GA Measurement ID לא תקין. פורמט: G-XXXXXXX",
          "seo.metaPixelId": "Meta Pixel ID חייב להיות מספר בלבד",
          "seo.googleSiteVerification": "Verification token לא תקין",
          "seo.facebookDomainVerification": "Verification token לא תקין"
        };
        if (first) {
          setSaveState("error");
          setSaveErrorText(messageByField[first]);
          return false;
        }
        const contactMessageByField = {
          "contact.phone": "מספר הטלפון לא תקין או ארוך מדי",
          "contact.whatsapp": "מספר ה-WhatsApp לא תקין או ארוך מדי",
          "contact.email": "כתובת האימייל לא תקינה",
          "contact.website": "יש להזין קישור תקין שמתחיל ב-http:// או https://",
          "contact.instagram": "יש להזין קישור Instagram תקין",
          "contact.facebook": "יש להזין קישור Facebook תקין",
          "contact.twitter": "יש להזין קישור X / Twitter תקין",
          "contact.tiktok": "יש להזין קישור TikTok תקין",
          "contact.waze": "יש להזין קישור Waze או קישור http/https תקין"
        };
        const nextFieldErrors = {};
        for (const field2 of list2) {
          if (contactMessageByField[field2]) {
            nextFieldErrors[field2] = contactMessageByField[field2];
          }
        }
        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
        }
      }
      const message = err?.response?.data?.message || err?.message || "שגיאה בשמירה";
      setSaveState("error");
      setSaveErrorText(String(message));
      return false;
    }
  }, [dirtyPaths, draftCard]);
  const proceedPendingNavigation = useCallback(() => {
    if (pendingAction?.kind === "tab" && pendingAction.to) {
      navigate(pendingAction.to);
      return;
    }
    if (pendingAction?.kind === "leave") {
      const b = pendingBlockerRef.current;
      pendingBlockerRef.current = null;
      b?.proceed?.();
      return;
    }
  }, [navigate, pendingAction]);
  const handleUnsavedStay = useCallback(() => {
    const b = pendingBlockerRef.current;
    pendingBlockerRef.current = null;
    b?.reset?.();
    closeUnsavedModal();
  }, [closeUnsavedModal]);
  const handleUnsavedDiscard = useCallback(async () => {
    if (unsavedActionBusy) return;
    setUnsavedActionBusy(true);
    try {
      await discardUnsavedAndRehydrate();
      closeUnsavedModal();
      proceedPendingNavigation();
    } finally {
      setUnsavedActionBusy(false);
    }
  }, [
    closeUnsavedModal,
    discardUnsavedAndRehydrate,
    proceedPendingNavigation,
    unsavedActionBusy
  ]);
  const handleUnsavedSave = useCallback(async () => {
    if (unsavedActionBusy) return;
    setUnsavedActionBusy(true);
    try {
      const ok = await commitDraft();
      if (!ok) {
        closeUnsavedModal();
        return;
      }
      closeUnsavedModal();
      proceedPendingNavigation();
    } finally {
      setUnsavedActionBusy(false);
    }
  }, [
    closeUnsavedModal,
    commitDraft,
    proceedPendingNavigation,
    unsavedActionBusy
  ]);
  const opsPatchCard = useCallback(async (payload, clearPrefixes = []) => {
    const cardId = draftCardRef.current?._id;
    if (!cardId) return;
    if (!payload || typeof payload !== "object") return;
    try {
      const res = await api.patch(`/cards/${cardId}`, payload);
      const normalized = normalizeCardForEditor(res.data);
      setDraftCard((prev) => {
        const prevDraft = prev || {};
        const server = normalized && typeof normalized === "object" ? normalized : null;
        const nextDraft = { ...prevDraft };
        for (const topKey of Object.keys(payload)) {
          const patchValue = payload[topKey];
          const serverValue = server ? server[topKey] : void 0;
          if (patchValue && typeof patchValue === "object" && !Array.isArray(patchValue)) {
            const prevObj = prevDraft[topKey] && typeof prevDraft[topKey] === "object" && !Array.isArray(prevDraft[topKey]) ? prevDraft[topKey] : {};
            const nextObj = { ...prevObj };
            for (const subKey of Object.keys(patchValue)) {
              if (serverValue && typeof serverValue === "object" && Object.prototype.hasOwnProperty.call(
                serverValue,
                subKey
              )) {
                nextObj[subKey] = serverValue[subKey];
              } else {
                nextObj[subKey] = patchValue[subKey];
              }
            }
            nextDraft[topKey] = nextObj;
            continue;
          }
          if (serverValue !== void 0) {
            nextDraft[topKey] = serverValue;
          } else {
            nextDraft[topKey] = patchValue;
          }
        }
        return nextDraft;
      });
      if (Array.isArray(clearPrefixes) && clearPrefixes.length) {
        setDirtyPaths((prev) => {
          const next = new Set(prev);
          const touchedSections = /* @__PURE__ */ new Set();
          for (const prefix of clearPrefixes) {
            const pfx = String(prefix || "");
            if (!pfx) continue;
            touchedSections.add(pfx.split(".")[0]);
            for (const existing of Array.from(next)) {
              if (existing === pfx || existing.startsWith(`${pfx}.`)) {
                next.delete(existing);
              }
            }
          }
          for (const section22 of touchedSections) {
            if (!section22) continue;
            if (!next.has(section22)) continue;
            let hasOther = false;
            for (const existing of next) {
              if (existing.startsWith(`${section22}.`)) {
                hasOther = true;
                break;
              }
            }
            if (!hasOther) next.delete(section22);
          }
          if (next.size === 0) {
            setSaveState("saved");
            setSaveErrorText(null);
          } else {
            setSaveState("dirty");
          }
          return next;
        });
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "שגיאה בשמירה";
      setSaveState("error");
      setSaveErrorText(String(message));
    }
  }, []);
  const opsDeleteDesignAsset = useCallback(
    async (kindRaw) => {
      const cardId = draftCardRef.current?._id;
      if (!cardId) return;
      const kind = kindRaw === "avatar" || kindRaw === "background" ? kindRaw : null;
      if (!kind) return;
      if (deleteDesignAssetBusyKind) return;
      setDeleteDesignAssetBusyKind(kind);
      const clearPrefixes = kind === "background" ? [
        "design.backgroundImage",
        "design.coverImage",
        "design.backgroundImagePath",
        "design.coverImagePath"
      ] : [
        "design.avatarImage",
        "design.logo",
        "design.avatarImagePath",
        "design.logoPath"
      ];
      try {
        const res = await api.delete(
          `/cards/${cardId}/design-asset/${kind}`
        );
        const patch = res?.data?.designPatch;
        if (!patch || typeof patch !== "object") {
          throw new Error("Delete response missing designPatch");
        }
        setDraftCard((prev) => {
          const prevDraft = prev || {};
          const prevDesign = prevDraft.design && typeof prevDraft.design === "object" ? prevDraft.design : {};
          const next = {
            ...prevDraft,
            design: {
              ...prevDesign,
              ...patch
            }
          };
          return withPreviewMediaTouched(next);
        });
        setDirtyPaths((prev) => {
          const next = new Set(prev);
          const touchedSections = /* @__PURE__ */ new Set();
          for (const prefix of clearPrefixes) {
            const pfx = String(prefix || "");
            if (!pfx) continue;
            touchedSections.add(pfx.split(".")[0]);
            for (const existing of Array.from(next)) {
              if (existing === pfx || existing.startsWith(`${pfx}.`)) {
                next.delete(existing);
              }
            }
          }
          for (const section22 of touchedSections) {
            if (!section22) continue;
            if (!next.has(section22)) continue;
            let hasOther = false;
            for (const existing of next) {
              if (existing.startsWith(`${section22}.`)) {
                hasOther = true;
                break;
              }
            }
            if (!hasOther) next.delete(section22);
          }
          if (next.size === 0) {
            setSaveState("saved");
            setSaveErrorText(null);
          } else {
            setSaveState("dirty");
          }
          return next;
        });
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || "שגיאה במחיקה";
        setSaveState("error");
        setSaveErrorText(String(message));
      } finally {
        setDeleteDesignAssetBusyKind(null);
      }
    },
    [deleteDesignAssetBusyKind]
  );
  const onFieldChange = useCallback(
    (sectionOrPath, patchOrValue) => {
      if (editingDisabled) return;
      const key = String(sectionOrPath || "");
      if (!key) return;
      const designMediaKeys = /* @__PURE__ */ new Set([
        "backgroundImage",
        "coverImage",
        "avatarImage",
        "logo"
      ]);
      const isDesignMediaPath = key.startsWith("design.") && designMediaKeys.has(key.split(".")[1] || "");
      if (key.includes(".")) {
        changeSeqRef.current += 1;
        if (key === "design.selfThemeV1" || key.startsWith("design.selfThemeV1.")) {
          lastSelfThemeChangeSeqRef.current = changeSeqRef.current;
        }
        if (key === "design.templateId") {
          lastTemplateChangeSeqRef.current = changeSeqRef.current;
        }
        setDraftCard((prev) => {
          if (!prev) return prev;
          let next = setIn(prev, key, patchOrValue);
          if (key === "design.templateId") {
            const selfThemeTemplateId = TEMPLATES.find((t) => t?.selfThemeV1 === true)?.id || null;
            const prevTemplateIdRaw = prev?.design?.templateId;
            const nextTemplateIdRaw = patchOrValue;
            const prevTemplateId = String(prevTemplateIdRaw || "");
            const nextTemplateId = String(nextTemplateIdRaw || "");
            const selfId = String(selfThemeTemplateId || "");
            if (selfId && prevTemplateId === selfId && nextTemplateId !== selfId) {
              next = setIn(next, "design.selfThemeV1", null);
            }
          }
          return isDesignMediaPath ? withPreviewMediaTouched(next) : next;
        });
        setDirtyPaths((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      } else {
        if (isPlainObject(patchOrValue)) {
          if (key === "design") {
            const prevDesign = draftCardRef.current?.design || {};
            const nextDesign = patchOrValue || {};
            const selfThemeTouched = Object.prototype.hasOwnProperty.call(
              nextDesign,
              "selfThemeV1"
            ) && prevDesign?.selfThemeV1 !== nextDesign.selfThemeV1;
            const templateTouched = Object.prototype.hasOwnProperty.call(
              nextDesign,
              "templateId"
            ) && prevDesign?.templateId !== nextDesign.templateId;
            if (selfThemeTouched || templateTouched) {
              changeSeqRef.current += 1;
              if (selfThemeTouched) {
                lastSelfThemeChangeSeqRef.current = changeSeqRef.current;
              }
              if (templateTouched) {
                lastTemplateChangeSeqRef.current = changeSeqRef.current;
              }
            }
          }
          const shouldTouchMedia = key === "design" && Object.keys(patchOrValue || {}).some((fieldKey) => {
            if (!designMediaKeys.has(fieldKey)) return false;
            const prevDesign = draftCardRef.current?.design || {};
            return prevDesign?.[fieldKey] !== patchOrValue[fieldKey];
          });
          setDraftCard((prev) => {
            if (!prev) return prev;
            const next = mergeSection(prev, key, patchOrValue);
            return shouldTouchMedia ? withPreviewMediaTouched(next) : next;
          });
          setDirtyPaths((prev) => {
            const next = new Set(prev);
            next.add(key);
            const prevSection = draftCardRef.current && draftCardRef.current[key] || {};
            for (const fieldKey of Object.keys(
              patchOrValue || {}
            )) {
              if (prevSection?.[fieldKey] !== patchOrValue[fieldKey]) {
                next.add(`${key}.${fieldKey}`);
              }
            }
            return next;
          });
          if (key === "design") {
            const prevDesign = draftCardRef.current?.design || {};
            const nextDesign = patchOrValue || {};
            const bg = nextDesign.backgroundImage;
            if (bg && bg !== prevDesign.backgroundImage) {
              opsPatchCard({ design: { backgroundImage: bg } }, [
                "design.backgroundImage"
              ]);
            }
            const av = nextDesign.avatarImage;
            if (av && av !== prevDesign.avatarImage) {
              opsPatchCard({ design: { avatarImage: av } }, [
                "design.avatarImage"
              ]);
            }
          }
        } else {
          setDraftCard((prev) => {
            if (!prev) return prev;
            const next = { ...prev || {}, [key]: patchOrValue };
            return key === "gallery" ? withPreviewMediaTouched(next) : next;
          });
          setDirtyPaths((prev) => {
            const next = new Set(prev);
            next.add(key);
            return next;
          });
          if (key === "gallery") {
            opsPatchCard({ gallery: patchOrValue }, ["gallery"]);
          }
        }
      }
      setSaveState("dirty");
      setSaveErrorText(null);
      setFieldErrors({});
    },
    [editingDisabled]
  );
  const handlePublish = useCallback(async () => {
    if (!draftCard?._id) return;
    try {
      const res = await api.patch(`/cards/${draftCard._id}`, {
        status: "published"
      });
      const normalized = normalizeCardForEditor(res.data);
      setDraftCard(normalized);
      if (res?.data?.publishError === "MISSING_FIELDS") {
        alert("כדי לפרסם צריך למלא שם עסק ולבחור תבנית");
      } else if (res?.data?.status !== "published") {
        console.warn("[card:publish] declined", {
          status: res?.data?.status,
          publishError: res?.data?.publishError
        });
        alert("Publish failed");
      }
    } catch (err) {
      const status2 = err?.response?.status;
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;
      if (status2 === 403 && code === "PUBLISH_REQUIRES_AUTH") {
        alert("כדי לפרסם צריך להירשם/להתחבר");
        return;
      }
      alert(message || "שגיאה בפרסום");
    }
  }, [draftCard?._id]);
  const handleCreateUserCard = useCallback(async () => {
    try {
      setCreateUserCardError(null);
      setCreateUserCardBusy(true);
      const createdData = await createCardWithRetry();
      const normalized = normalizeCardForEditor(createdData);
      setDraftCard(normalized);
      setNeedsCreateUserCard(false);
      setDirtyPaths(/* @__PURE__ */ new Set());
      setSaveState("idle");
      setSaveErrorText(null);
    } catch (err) {
      const message = err?.response?.data?.message;
      setCreateUserCardError(message || "שגיאה ביצירת כרטיס");
    } finally {
      setCreateUserCardBusy(false);
    }
  }, [createCardWithRetry]);
  const handleAnonConsentCreate = useCallback(async () => {
    try {
      setAnonConsentBusy(true);
      const createdData = await createCardWithRetry();
      const normalized = normalizeCardForEditor(createdData);
      setDraftCard(normalized);
      setShowAnonConsentGate(false);
      setDirtyPaths(/* @__PURE__ */ new Set());
      setSaveState("idle");
      setSaveErrorText(null);
    } catch (err) {
      console.error(
        "handleAnonConsentCreate failed",
        err?.response?.status,
        err?.response?.data || err
      );
      setAnonConsentBusy(false);
    }
  }, [createCardWithRetry]);
  const handleUnpublish = useCallback(async () => {
    if (!draftCard?._id) return;
    try {
      const res = await api.patch(`/cards/${draftCard._id}`, {
        status: "draft"
      });
      const normalized = normalizeCardForEditor(res.data);
      setDraftCard(normalized);
    } catch (err) {
      const message = err?.response?.data?.message;
      alert(message || "שגיאה");
    }
  }, [draftCard?._id]);
  const miniGuide = useEditorMiniGuide({
    enabled: Boolean(
      isAuthenticated && contextResolved && orgsLoadState === "loaded" && !(myOrgs.length > 0 || Boolean(activeOrgSlug)) && section2 === "card" && draftCard?._id && draftCard?.publicPath
    ),
    cardIsPublished: Boolean(
      isAuthenticated && draftCard?.status === "published"
    ),
    entCanPublish: draftCard?.entitlements?.canPublish === true,
    entCanChangeSlug: draftCard?.entitlements?.canChangeSlug === true
  });
  if (isInitializing) {
    return /* @__PURE__ */ jsx("div", { className: styles$1.editCard, children: "טוען..." });
  }
  if (!draftCard?._id) {
    if (isAuthenticated && !contextResolved) {
      return /* @__PURE__ */ jsx("div", { className: styles$1.editCard, children: "טוען..." });
    }
    if (isAuthenticated && contextResolved && isOrgMode && orgCardError) {
      return /* @__PURE__ */ jsx("div", { className: styles$1.editCard, children: /* @__PURE__ */ jsx("main", { className: styles$1.main, children: /* @__PURE__ */ jsxs(
        "section",
        {
          className: styles$1.createCta,
          dir: "rtl",
          role: "region",
          "aria-label": "Org context error",
          children: [
            /* @__PURE__ */ jsx("div", { className: styles$1.createCtaTitle, children: "לא הצלחנו לפתוח את ההקשר הארגוני" }),
            /* @__PURE__ */ jsx("div", { className: styles$1.createCtaText, children: orgCardError }),
            /* @__PURE__ */ jsx("div", { className: styles$1.createCtaActions, children: /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$1.createCtaButton,
                onClick: () => handleContextChange(""),
                children: "מעבר לאישי"
              }
            ) })
          ]
        }
      ) }) });
    }
    if (isAuthenticated && contextResolved && !activeOrgSlug && needsCreateUserCard) {
      return /* @__PURE__ */ jsx("div", { className: styles$1.editCard, children: /* @__PURE__ */ jsx("main", { className: styles$1.main, children: /* @__PURE__ */ jsxs(
        "section",
        {
          className: styles$1.createCta,
          dir: "rtl",
          role: "region",
          "aria-label": "Create card",
          children: [
            /* @__PURE__ */ jsx("div", { className: styles$1.createCtaTitle, children: "אין לך עדיין כרטיס" }),
            /* @__PURE__ */ jsx("div", { className: styles$1.createCtaText, children: "כדי להתחיל לערוך, צריך ליצור כרטיס." }),
            claimRecoveryError ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: styles$1.createCtaError,
                  role: "alert",
                  children: claimRecoveryError
                }
              ),
              /* @__PURE__ */ jsx("div", { className: styles$1.createCtaActions, children: /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: styles$1.createCtaButton,
                  onClick: () => initCard(),
                  children: "נסו שוב"
                }
              ) })
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              createUserCardError ? /* @__PURE__ */ jsx(
                "div",
                {
                  className: styles$1.createCtaError,
                  role: "alert",
                  children: createUserCardError
                }
              ) : null,
              /* @__PURE__ */ jsx("div", { className: styles$1.createCtaActions, children: /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: styles$1.createCtaButton,
                  onClick: handleCreateUserCard,
                  disabled: createUserCardBusy,
                  children: createUserCardBusy ? "יוצר כרטיס..." : "צור כרטיס"
                }
              ) })
            ] })
          ]
        }
      ) }) });
    }
    if (showAnonConsentGate) {
      return /* @__PURE__ */ jsx("div", { className: styles$1.editCard, children: /* @__PURE__ */ jsx("main", { className: styles$1.main, children: /* @__PURE__ */ jsxs(
        "section",
        {
          className: styles$1.anonConsentGate,
          dir: "rtl",
          role: "region",
          "aria-label": "הסכמה ליצירת טיוטה",
          children: [
            /* @__PURE__ */ jsx("h2", { className: styles$1.anonConsentTitle, children: "יצירת כרטיס ניסיון" }),
            /* @__PURE__ */ jsx("p", { className: styles$1.anonConsentText, children: "המידע שתזין עשוי להישמר כטיוטה זמנית. טיוטה אנונימית נשמרת עד 14 ימים של חוסר פעילות. אם הכרטיס יפורסם בעתיד, תוכן שיפורסם עשוי להיות נגיש לציבור." }),
            /* @__PURE__ */ jsxs("p", { className: styles$1.anonConsentText, children: [
              "ההמשך כפוף ל",
              /* @__PURE__ */ jsx(
                Link,
                {
                  to: "/privacy",
                  className: styles$1.anonConsentLink,
                  children: "מדיניות הפרטיות"
                }
              ),
              " ",
              "ול",
              /* @__PURE__ */ jsx(
                Link,
                {
                  to: "/terms",
                  className: styles$1.anonConsentLink,
                  children: "תנאי השימוש"
                }
              ),
              "."
            ] }),
            /* @__PURE__ */ jsxs("label", { className: styles$1.anonConsentLabel, children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  className: styles$1.anonConsentCheckbox,
                  checked: anonConsentChecked,
                  onChange: (e) => setAnonConsentChecked(e.target.checked),
                  disabled: anonConsentBusy
                }
              ),
              /* @__PURE__ */ jsxs("span", { className: styles$1.anonConsentLabelText, children: [
                "אני מסכים/ה ל",
                /* @__PURE__ */ jsx(
                  Link,
                  {
                    to: "/privacy",
                    className: styles$1.anonConsentLink,
                    children: "מדיניות הפרטיות"
                  }
                ),
                " ",
                "ול",
                /* @__PURE__ */ jsx(
                  Link,
                  {
                    to: "/terms",
                    className: styles$1.anonConsentLink,
                    children: "תנאי השימוש"
                  }
                ),
                " ",
                "ומבין/ה שהמידע שאזין יישמר כטיוטה זמנית בהתאם להם"
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: styles$1.anonConsentActions, children: /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$1.createCtaButton,
                disabled: !anonConsentChecked || anonConsentBusy,
                onClick: handleAnonConsentCreate,
                children: anonConsentBusy ? "יוצר כרטיס..." : "צור כרטיס ניסיון"
              }
            ) })
          ]
        }
      ) }) });
    }
    return /* @__PURE__ */ jsx("div", { className: styles$1.editCard, children: "טוען..." });
  }
  const anonId = getAnonymousId();
  const shouldShowAnonCta = !isAuthenticated && Boolean(anonId);
  const authenticatedSession = isAuthenticated && !shouldShowAnonCta;
  const showSaveFreeCtaHighlight = shouldShowAnonCta && editorTour.isDone && !editorTour.isActive && ctaHighlightPending;
  const eb = draftCard?.effectiveBilling || null;
  const untilIso = eb?.until;
  const plan = eb?.plan;
  const paid = eb?.isPaid === true;
  const msPerDay = 24 * 60 * 60 * 1e3;
  const untilMs = untilIso ? new Date(untilIso).getTime() : NaN;
  const msLeft = Number.isFinite(untilMs) ? untilMs - Date.now() : NaN;
  const daysLeft = Number.isFinite(msLeft) && msLeft > 0 ? Math.ceil(msLeft / msPerDay) : null;
  const showPremiumExpiryBanner = authenticatedSession && paid && plan === "yearly" && typeof daysLeft === "number" && daysLeft >= 1 && daysLeft <= 14;
  const cardPublicPath = draftCard?.publicPath || null;
  const cardPublicUrl = cardPublicPath ? `${window.location.origin}${cardPublicPath}` : null;
  const cardIsPublished = Boolean(
    isAuthenticated && draftCard?.status === "published"
  );
  const showContextBar = isAuthenticated && (myOrgs.length > 0 || Boolean(activeOrgSlug));
  const showGuideDropdown = isAuthenticated && contextResolved && orgsLoadState === "loaded" && !showContextBar;
  const miniGuideAvailable = showGuideDropdown && section2 === "card" && Boolean(draftCard?._id) && Boolean(draftCard?.publicPath);
  const miniSeoGuideAvailable = miniGuideAvailable && draftCard?.entitlements?.canEditSeo === true;
  const miniBookingHoursGuideAvailable = miniGuideAvailable && draftCard?.entitlements?.canUseBusinessHours === true && draftCard?.entitlements?.canUseBooking === true;
  const miniGuideTitle = miniGuide.currentGuideId === MINI_GUIDE_IDS.SEO_AUTO ? "מדריך SEO אוטומטי" : miniGuide.currentGuideId === MINI_GUIDE_IDS.BOOKING_HOURS ? "מדריך תורים ושעות" : "מדריך שיתוף כרטיס";
  return /* @__PURE__ */ jsxs("div", { className: styles$1.editCard, children: [
    /* @__PURE__ */ jsx(SeoHelmet, { robots: "noindex, nofollow" }),
    /* @__PURE__ */ jsx(
      ConfirmUnsavedChangesModal,
      {
        open: isUnsavedModalOpen,
        title: "השינויים לא נשמרו",
        body: "ביצעת שינויים שלא נשמרו בכרטיס. מה תרצה לעשות?",
        primaryLabel: "שמור והמשך",
        secondaryLabel: "המשך בלי לשמור",
        tertiaryLabel: "חזור לעריכה",
        onPrimary: handleUnsavedSave,
        onSecondary: handleUnsavedDiscard,
        onTertiary: handleUnsavedStay,
        busy: unsavedActionBusy
      }
    ),
    deleteNotice ? /* @__PURE__ */ jsxs(
      "div",
      {
        className: `${styles$1.notice} ${deleteNotice.type === "success" ? styles$1.noticeSuccess : styles$1.noticeError}`,
        role: deleteNotice.type === "error" ? "alert" : "status",
        "aria-live": "polite",
        dir: "rtl",
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$1.noticeText, children: deleteNotice.text }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$1.noticeClose,
              onClick: () => {
                clearDeleteNoticeTimer();
                setDeleteNotice(null);
              },
              "aria-label": "סגירה",
              children: "×"
            }
          )
        ]
      }
    ) : null,
    /* @__PURE__ */ jsxs("main", { className: styles$1.main, children: [
      editorTour.isActive ? /* @__PURE__ */ jsx(
        TourCoachPanel,
        {
          step: editorTour.currentStep,
          currentIndex: editorTour.currentIndex,
          totalSteps: editorTour.totalSteps,
          onNext: guardedTourNext,
          onSkip: editorTour.skip,
          onNextDisabled: Boolean(
            editorTour.currentStep?.isSaveStep && (dirtyPaths.size > 0 || saveState === "saving")
          )
        }
      ) : null,
      miniGuide.isActive ? /* @__PURE__ */ jsx(
        TourMiniPanel,
        {
          step: miniGuide.currentStep,
          currentIndex: miniGuide.currentIndex,
          totalSteps: miniGuide.totalSteps,
          onNext: miniGuide.advance,
          onSkip: miniGuide.skip,
          nextDisabled: miniGuide.isNextDisabled,
          isFinalStep: miniGuide.isFinalStep,
          guideTitle: miniGuideTitle
        }
      ) : null,
      editorTour.isDone && !editorTour.isActive && isAnonymousTourEligible ? /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$1.replayTourBtn,
          onClick: editorTour.restart,
          children: "הדריכו אותי שוב"
        }
      ) : null,
      shouldShowAnonCta && !editorTour.isActive ? /* @__PURE__ */ jsxs("section", { className: styles$1.anonCta, dir: "rtl", role: "note", children: [
        /* @__PURE__ */ jsxs("div", { className: styles$1.anonCtaText, children: [
          "שמרו את הכרטיס שלכם בחינם, פרסמו ושתפו עם הלקוחות! כולל",
          " ",
          /* @__PURE__ */ jsxs(
            Link,
            {
              to: "/register",
              className: styles$1.anonConsentLink,
              children: [
                "10 ימי פרימיום במתנה",
                /* @__PURE__ */ jsx(CrownIcon, { className: styles$1.anonCrown })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$1.anonCtaActions, children: [
          /* @__PURE__ */ jsxs(
            Link,
            {
              to: "/register",
              className: styles$1.anonCtaPrimary,
              "data-tour-active": showSaveFreeCtaHighlight ? "true" : void 0,
              onClick: () => {
                clearEditorTourCtaHighlightPending();
                setCtaHighlightPending(false);
              },
              children: [
                "שמרו בחינם",
                " "
              ]
            }
          ),
          /* @__PURE__ */ jsx(
            Link,
            {
              to: "/login",
              className: styles$1.anonCtaSecondary,
              children: "התחברו"
            }
          )
        ] })
      ] }) : null,
      showPremiumExpiryBanner ? /* @__PURE__ */ jsx(
        PremiumExpiryBanner,
        {
          daysLeft,
          onCta: () => {
            window.location.href = "/pricing";
          }
        }
      ) : null,
      showTrialBanner && /* @__PURE__ */ jsx(
        TrialBanner,
        {
          trialStartedAt: draftCard?.trialStartedAt,
          trialEndsAt: draftCard?.trialEndsAt,
          isExpired: isTrialExpired,
          onRegister: () => {
            window.location.href = "/pricing";
          }
        }
      ),
      section2 === "card" ? /* @__PURE__ */ jsx(
        Editor,
        {
          card: draftCard,
          onFieldChange,
          editingDisabled,
          onDeleteCard: handleDelete,
          onDeleteDesignAsset: opsDeleteDesignAsset,
          deleteDesignAssetBusyKind,
          isDeleting,
          onRequestNavigate: requestNavigate,
          onPublish: handlePublish,
          onUnpublish: handleUnpublish,
          onUpdateSlug: handleUpdateSlug,
          commitDraft,
          dirtyPaths,
          saveState,
          saveErrorText,
          fieldErrors,
          activeOrgSlug,
          myOrgs,
          onContextChange: handleContextChange,
          onLoadOrgs: loadMyOrgs,
          showContextBar,
          showGuideDropdown,
          isAuthenticated,
          publicUrl: cardPublicUrl,
          publicPath: cardPublicPath,
          isPublished: cardIsPublished,
          openDrawerForTourStepId: editorTour.isActive && editorTour.currentStep?.requiresDrawer ? editorTour.currentStep.id : null,
          openDrawerForMiniGuideStepId: miniGuide.requiresDrawerStepId,
          onStartShareMiniGuide: miniGuideAvailable ? () => miniGuide.start(MINI_GUIDE_IDS.SHARE_CARD) : void 0,
          onStartSeoMiniGuide: miniSeoGuideAvailable ? () => miniGuide.start(MINI_GUIDE_IDS.SEO_AUTO) : void 0,
          onStartBookingHoursMiniGuide: miniBookingHoursGuideAvailable ? () => miniGuide.start(
            MINI_GUIDE_IDS.BOOKING_HOURS,
            {
              bookingEnabled: draftCard?.bookingSettings?.enabled === true,
              hoursEnabled: draftCard?.businessHours?.enabled === true,
              week: draftCard?.businessHours?.week,
              canUseBooking: draftCard?.entitlements?.canUseBooking === true
            }
          ) : void 0,
          tourSectionsMenuOpenOnly: editorTour.isActive || miniGuide.isActive
        }
      ) : /* @__PURE__ */ jsx("div", { className: styles$1.comingSoon, children: "Coming soon" })
    ] })
  ] });
}
export {
  EditCard as default
};
