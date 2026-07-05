import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { Link, useParams, useNavigate, createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router-dom";
import { H as Helmet, a as HelmetProvider } from "./assets/vendor-epyEJgau.js";
import { createContext, useContext, useState, useSyncExternalStore, useMemo, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import "react-fast-compare";
import "invariant";
import "shallowequal";
function normalizeApiBaseUrl(raw) {
  const v = String(raw).trim();
  if (!v) return "/api";
  const noTrailing = v.replace(/\/+$/, "");
  if (noTrailing.endsWith("/api")) return noTrailing;
  return `${noTrailing}/api`;
}
const api = axios.create({
  baseURL: normalizeApiBaseUrl(
    "http://localhost:5000/api"
  ),
  withCredentials: true
});
api.defaults.headers.common.Accept = "application/json";
api.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
const ANON_STORAGE_KEY = "digitalyty_anon_id";
function safeGetLocalStorage() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
}
function uuidV4() {
  try {
    const c = typeof crypto !== "undefined" ? crypto : null;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
  }
  let bytes;
  try {
    const c = typeof crypto !== "undefined" ? crypto : null;
    if (c && typeof c.getRandomValues === "function") {
      bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
    }
  } catch {
  }
  if (!bytes) {
    bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i += 1)
      bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    ""
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function getAnonymousId() {
  const ls = safeGetLocalStorage();
  if (!ls) return null;
  try {
    const v = ls.getItem(ANON_STORAGE_KEY);
    return v && String(v).trim() ? String(v) : null;
  } catch {
    return null;
  }
}
function ensureAnonymousId() {
  const ls = safeGetLocalStorage();
  if (!ls) return null;
  const existing = getAnonymousId();
  if (existing) return existing;
  const id = uuidV4();
  try {
    ls.setItem(ANON_STORAGE_KEY, id);
    return id;
  } catch {
    return null;
  }
}
api.interceptors.request.use((config) => {
  if (config?.data instanceof FormData) {
    config.headers = config.headers || {};
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  }
  const headers = config.headers = config.headers || {};
  const authHeader = headers.Authorization || headers.authorization || api.defaults.headers.common.Authorization || api.defaults.headers.common.authorization;
  const existingAnon = getAnonymousId();
  const anonId = existingAnon || (!authHeader ? ensureAnonymousId() : null);
  if (anonId) headers["x-anonymous-id"] = anonId;
  return config;
});
function getCardBySlug(slug) {
  return api.get(`/cards/${slug}`).then((r) => r.data);
}
function getCompanyCardBySlug(orgSlug, slug) {
  return api.get(`/c/${orgSlug}/${slug}`).then((r) => r.data);
}
const STORAGE_KEY_UTM = "digitalyty_utm";
function getUtm() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const source = params.get("utm_source") || "";
    const campaign = params.get("utm_campaign") || "";
    const medium = params.get("utm_medium") || "";
    const utm = {
      source: source || void 0,
      campaign: campaign || void 0,
      medium: medium || void 0
    };
    const hasAny = Boolean(utm.source || utm.campaign || utm.medium);
    if (hasAny) {
      sessionStorage.setItem(STORAGE_KEY_UTM, JSON.stringify(utm));
      return utm;
    }
    const cached = sessionStorage.getItem(STORAGE_KEY_UTM);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
      }
    }
    return {};
  } catch {
    return {};
  }
}
const STORAGE_KEY_DEVICE = "digitalyty_deviceId";
const OWNER_SELF_EXCLUDE_KEY_PREFIX = "cardigo_owner_self_exclude_v1:path:";
function normalizeOwnerSelfExcludePath(path) {
  if (typeof path !== "string" || !path) return null;
  let p = path.trim();
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  const qIdx = p.indexOf("?");
  if (qIdx !== -1) p = p.slice(0, qIdx);
  const hIdx = p.indexOf("#");
  if (hIdx !== -1) p = p.slice(0, hIdx);
  if (/^\/card\/[^/]+$/.test(p)) return p;
  if (/^\/c\/[^/]+\/[^/]+$/.test(p)) return p;
  return null;
}
function getOwnerSelfExcludeKey(publicPath) {
  const normalised = normalizeOwnerSelfExcludePath(publicPath);
  if (!normalised) return null;
  return OWNER_SELF_EXCLUDE_KEY_PREFIX + normalised;
}
function isOwnerSelfExcludedForCurrentPath() {
  try {
    if (typeof window === "undefined") return false;
    const scopedKey = getOwnerSelfExcludeKey(window.location.pathname);
    if (!scopedKey) return false;
    return localStorage.getItem(scopedKey) === "1";
  } catch {
    return false;
  }
}
function uuidFallback() {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function getOrCreateDeviceId() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY_DEVICE);
    if (existing) return existing;
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : uuidFallback();
    localStorage.setItem(STORAGE_KEY_DEVICE, id);
    return id;
  } catch {
    return uuidFallback();
  }
}
function send(payload) {
  try {
    const body2 = JSON.stringify(payload);
    const url = "/api/analytics/track";
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body2], { type: "application/json" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body2,
      keepalive: true
    }).then((res) => {
      try {
        if (false) ;
      } catch {
      }
    }).catch((err) => {
      try {
        if (false) ;
      } catch {
      }
    });
  } catch {
  }
}
function normalizeAction(action) {
  const a = String(action || "").trim().toLowerCase();
  if (!a) return "other";
  const allowed = /* @__PURE__ */ new Set([
    "call",
    "whatsapp",
    "email",
    "navigate",
    "maps",
    "waze",
    "website",
    "instagram",
    "facebook",
    "tiktok",
    "linkedin",
    "twitter",
    "lead",
    "booking",
    "custom_action",
    "other"
  ]);
  return allowed.has(a) ? a : "other";
}
function detectOrgSlugFromPath() {
  try {
    if (typeof window === "undefined") return "";
    const path = String(window.location?.pathname || "");
    const m = path.match(/^\/c\/([^/]+)\//i);
    return m && m[1] ? decodeURIComponent(m[1]).trim().toLowerCase() : "";
  } catch {
    return "";
  }
}
function trackView(slug, utm = getUtm(), ref = document.referrer || "", orgSlug = "") {
  if (!slug) return;
  if (isOwnerSelfExcludedForCurrentPath()) return;
  const resolvedOrgSlug = typeof orgSlug === "string" && orgSlug.trim() ? orgSlug.trim().toLowerCase() : detectOrgSlugFromPath();
  send({
    slug,
    event: "view",
    ...resolvedOrgSlug ? { orgSlug: resolvedOrgSlug } : {},
    utm,
    ref,
    deviceId: getOrCreateDeviceId()
  });
}
function trackClick(slug, action, utm = getUtm(), ref = document.referrer || "", orgSlug = "") {
  if (!slug) return;
  if (isOwnerSelfExcludedForCurrentPath()) return;
  const resolvedOrgSlug = typeof orgSlug === "string" && orgSlug.trim() ? orgSlug.trim().toLowerCase() : detectOrgSlugFromPath();
  send({
    slug,
    event: "click",
    action: normalizeAction(action),
    ...resolvedOrgSlug ? { orgSlug: resolvedOrgSlug } : {},
    utm,
    ref,
    deviceId: getOrCreateDeviceId()
  });
}
function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.version === 1) {
      return parsed;
    }
  } catch {
  }
  return null;
}
const CARD_CONSENT_KEY = "cardigo_card_consent_v1";
function getCardConsentState() {
  try {
    const raw = localStorage.getItem(CARD_CONSENT_KEY);
    if (!raw) return null;
    return safeParse(raw);
  } catch {
    return null;
  }
}
function saveCardConsent(ownerTrackingAllowed) {
  const state = {
    version: 1,
    acknowledged: true,
    ownerTrackingAllowed: Boolean(ownerTrackingAllowed),
    ts: Date.now()
  };
  try {
    localStorage.setItem(CARD_CONSENT_KEY, JSON.stringify(state));
  } catch {
  }
  return state;
}
function hasAcceptedCardConsent() {
  const s = getCardConsentState();
  return Boolean(s && s.acknowledged);
}
const DEFAULT_OG_IMAGE_PATH = "/images/og/cardigo-home-og-1200x630.jpg?v=20260519";
const EMPTY = Object.freeze({});
const InitialDetailDataContext = createContext(EMPTY);
function InitialDetailDataProvider({ value, children }) {
  const safeValue = value && typeof value === "object" && !Array.isArray(value) ? value : EMPTY;
  return /* @__PURE__ */ jsx(InitialDetailDataContext.Provider, { value: safeValue, children });
}
function useInitialDetailData(key) {
  const ctx = useContext(InitialDetailDataContext) || EMPTY;
  if (typeof key !== "string" || key.length === 0) return null;
  const v = ctx[key];
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  if (typeof v.slug !== "string" || v.slug.length === 0) return null;
  return v;
}
const overlay$2 = "_overlay_1wan2_1";
const banner = "_banner_1wan2_23";
const text$1 = "_text_1wan2_65";
const actions$1 = "_actions_1wan2_81";
const accept = "_accept_1wan2_95";
const decline = "_decline_1wan2_157";
const link = "_link_1wan2_223";
const styles$j = {
  overlay: overlay$2,
  banner,
  text: text$1,
  actions: actions$1,
  accept,
  decline,
  link
};
function CardOwnerConsentBanner({ onConsentChange }) {
  const [visible, setVisible] = useState(() => !hasAcceptedCardConsent());
  if (!visible) return null;
  function handleAccept() {
    saveCardConsent(true);
    setVisible(false);
    if (onConsentChange) onConsentChange(true);
  }
  function handleDecline() {
    saveCardConsent(false);
    setVisible(false);
    if (onConsentChange) onConsentChange(false);
  }
  return /* @__PURE__ */ jsx(
    "aside",
    {
      className: styles$j.overlay,
      role: "region",
      "aria-label": "הודעת פרטיות – כלי מדידה של בעל הכרטיס",
      children: /* @__PURE__ */ jsxs("div", { className: styles$j.banner, children: [
        /* @__PURE__ */ jsxs("p", { className: styles$j.text, children: [
          "האתר משתמש בקובצי Cookie 🍪 למדידה ושיפור החוויה.",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/privacy", className: styles$j.link, children: "למדיניות הפרטיות" }),
          " ",
          "ו",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/terms", className: styles$j.link, children: "תנאי השימוש" }),
          "."
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$j.actions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$j.accept,
              onClick: handleAccept,
              children: "אישור"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$j.decline,
              onClick: handleDecline,
              children: "דחייה"
            }
          )
        ] })
      ] })
    }
  );
}
const PREVIEW_PLACEHOLDER_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Z2qAAAAAASUVORK5CYII=";
const TEMPLATES = [
  {
    id: "roismanA11yLight",
    label: "Roisman A11y Light",
    name: "מפרץ",
    skinKey: "roismanA11y",
    group: "light",
    previewImage: "/templates/previews/preview-covers/roismana11ylight.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: {
        label: "שיחה מהירה בוואטסאפ",
        value: "https://wa.me/972501234567"
      },
      contact: {
        phone: "+972-50-123-4567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/example"
        },
        {
          platform: "instagram",
          url: "https://www.instagram.com/example"
        }
      ]
    }
  },
  {
    id: "lakmi",
    label: "Lakmi",
    name: "ורד-זהב",
    skinKey: "lakmi",
    group: "light",
    previewImage: "/templates/previews/preview-covers/lakmi.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: {
        label: "שיחה מהירה בוואטסאפ",
        value: "https://wa.me/972501234567"
      },
      contact: {
        phone: "+972-50-123-4567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/example"
        },
        {
          platform: "instagram",
          url: "https://www.instagram.com/example"
        }
      ]
    }
  },
  // Variant A: token-only skin; shared CardLayout skeleton.
  {
    id: "beauty",
    skinKey: "beauty",
    group: "light",
    name: "שקד",
    backgroundMode: "photo",
    previewImage: "/templates/previews/preview-covers/beauty.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      gallery: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "center",
      socialStyle: "icons",
      backgroundOverlay: 40
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "תשובות קצרות וברורות שיעזרו לכם להחליט במהירות.",
        items: [
          {
            q: "מה כלול בשירות?",
            a: "שיחת היכרות, התאמת פתרון לצורך, וליווי קצר כדי לוודא שהכול עובד כמו שצריך."
          },
          {
            q: "אפשר לקבל הצעת מחיר?",
            a: "כן. כתבו לי בהודעה קצרה, ואחזור אליכם עם הצעה שמתאימה בדיוק למה שאתם צריכים."
          },
          {
            q: "כמה מהר אפשר להתחיל?",
            a: "בדרך כלל אפשר להתחיל כבר בימים הקרובים, בהתאם לזמינות ולדחיפות."
          }
        ]
      }
    }
  },
  {
    id: "galit",
    label: "Galit",
    name: "אבן-שמיים",
    skinKey: "galit",
    group: "light",
    previewImage: "/templates/previews/preview-covers/galit.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: {
        label: "שיחה מהירה בוואטסאפ",
        value: "https://wa.me/972501234567"
      },
      contact: {
        phone: "+972-50-123-4567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/example"
        },
        {
          platform: "instagram",
          url: "https://www.instagram.com/example"
        }
      ]
    }
  },
  {
    id: "customV1",
    skinKey: "self",
    name: "עיצוב עצמי",
    selfThemeV1: true,
    backgroundMode: "photo",
    previewImage: PREVIEW_PLACEHOLDER_PNG,
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      gallery: true,
      cta: true,
      socials: true,
      contact: true
    },
    // Palette-only customization (renderer applies palette classes, no inline styles)
    designDefaults: {
      templateId: "customV1",
      backgroundOverlay: 40
    },
    seededFields: [
      "name",
      "headline",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "Custom Card",
      headline: "Pick a palette",
      about: "Class-based palettes only (safe, no inline styles).",
      faq: {
        title: "שאלות ותשובות",
        lead: "מענה קצר על הדברים החשובים לפני שמתחילים.",
        items: [
          {
            q: "אפשר לערוך אחר כך?",
            a: "כן. אפשר לעדכן את השאלות והתשובות בכל זמן דרך העורך."
          },
          {
            q: "זה מתאים גם ל-RTL?",
            a: "כן. הסקשן בנוי RTL-first ומשתמש ב-flex ובערכי טוקנים."
          },
          {
            q: "האם זה משפיע על SEO?",
            a: "כן. נוצרת גם סכמת JSON-LD מסוג FAQPage בצורה מסונכרנת מהנתונים."
          }
        ]
      },
      cta: { label: "Contact", value: "https://wa.me/972501112233" },
      contact: {
        phone: "+972-50-111-2233",
        email: "hello@example.com",
        website: "https://example.com"
      },
      socials: [
        {
          platform: "instagram",
          url: "https://www.instagram.com/example"
        }
      ]
    }
  },
  {
    id: "irisLayla",
    label: "Iris Layla",
    name: "איריס-לילה",
    skinKey: "irisLayla",
    group: "light",
    previewImage: "/templates/previews/preview-covers/iris-layla.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: {
        label: "שיחה מהירה בוואטסאפ",
        value: "https://wa.me/972501234567"
      },
      contact: {
        phone: "+972-50-123-4567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/example"
        },
        {
          platform: "instagram",
          url: "https://www.instagram.com/example"
        }
      ]
    }
  },
  {
    id: "shkiyaLaguna",
    label: "Shkiya Laguna",
    name: "שקיעה-לגונה",
    skinKey: "shkiyaLaguna",
    group: "light",
    previewImage: "/templates/previews/preview-covers/shkiya-laguna.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: {
        label: "שיחה מהירה בוואטסאפ",
        value: "https://wa.me/972501234567"
      },
      contact: {
        phone: "+972-50-123-4567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/example"
        },
        {
          platform: "instagram",
          url: "https://www.instagram.com/example"
        }
      ]
    }
  },
  {
    id: "zahavLaguna",
    label: "Zahav Laguna",
    name: "זהב-לגונה",
    skinKey: "zahavLaguna",
    group: "light",
    previewImage: "/templates/previews/preview-covers/zahav-laguna.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: {
        label: "שיחה מהירה בוואטסאפ",
        value: "https://wa.me/972501234567"
      },
      contact: {
        phone: "+972-50-123-4567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/example"
        },
        {
          platform: "instagram",
          url: "https://www.instagram.com/example"
        }
      ]
    }
  },
  {
    id: "rubyEsh",
    label: "Ruby Esh",
    name: "רובי-אש",
    skinKey: "rubyEsh",
    group: "light",
    previewImage: "/templates/previews/preview-covers/ruby-esh.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: {
        label: "שיחה מהירה בוואטסאפ",
        value: "https://wa.me/972501234567"
      },
      contact: {
        phone: "+972-50-123-4567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/example"
        },
        {
          platform: "instagram",
          url: "https://www.instagram.com/example"
        }
      ]
    }
  },
  {
    id: "shachorGraphit",
    label: "Shachor Graphit",
    name: "שחור-גרפיט",
    skinKey: "shachorGraphit",
    group: "light",
    previewImage: "/templates/previews/preview-covers/shachor-graphit.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: {
        label: "שיחה מהירה בוואטסאפ",
        value: "https://wa.me/972501234567"
      },
      contact: {
        phone: "+972-50-123-4567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/example"
        },
        {
          platform: "instagram",
          url: "https://www.instagram.com/example"
        }
      ]
    }
  },
  {
    id: "pardesChai",
    label: "Pardes Chai",
    name: "פרדס-חי",
    skinKey: "pardesChai",
    group: "light",
    previewImage: "/templates/previews/preview-covers/pardes-chai.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: {
        label: "שיחה מהירה בוואטסאפ",
        value: "https://wa.me/972501234567"
      },
      contact: {
        phone: "+972-50-123-4567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/example"
        },
        {
          platform: "instagram",
          url: "https://www.instagram.com/example"
        }
      ]
    }
  },
  {
    id: "bronzeSachlav",
    label: "Bronze Sachlav",
    name: "ברונזה-סחלב",
    skinKey: "bronzeSachlav",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/bronze-sachlav.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: {
        label: "שיחה מהירה בוואטסאפ",
        value: "https://wa.me/972501234567"
      },
      contact: {
        phone: "+972-50-123-4567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/example"
        },
        {
          platform: "instagram",
          url: "https://www.instagram.com/example"
        }
      ]
    }
  },
  {
    id: "tehomTurkiz",
    label: "Tehom Turkiz",
    name: "תהום-טורקיז",
    skinKey: "tehomTurkiz",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/tehom-turkiz.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  {
    id: "inbarAdama",
    label: "Inbar Adama",
    name: "ענבר-אדמה",
    skinKey: "inbarAdama",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/inbar-adama.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  {
    id: "lavaLaguna",
    label: "Lava Laguna",
    name: "לבה-לגונה",
    skinKey: "lavaLaguna",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/lava-laguna.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  {
    id: "zahavTehom",
    label: "Zahav Tehom",
    name: "זהב-תהום",
    skinKey: "zahavTehom",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/zahav-tehom.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  {
    id: "evenNil",
    label: "Even Nil",
    name: "אבן-נילוס",
    skinKey: "evenNil",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/even-nil.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  {
    id: "irisChatzot",
    label: "Iris Chatzot",
    name: "איריס-חצות",
    skinKey: "irisChatzot",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/iris-chatzot.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  {
    id: "gacheletArgaman",
    label: "Gachelet Argaman",
    name: "גחלת-ארגמן",
    skinKey: "gacheletArgaman",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/gachelet-argaman.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  {
    id: "bronzeChol",
    label: "Bronze Chol",
    name: "ברונזה-חול",
    skinKey: "bronzeChol",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/bronze-chol.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  {
    id: "hadarGachelet",
    label: "Hadar Gachelet",
    name: "הדר-גחל",
    skinKey: "hadarGachelet",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/hadar-gachelet.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  // ── Laguna Shkiya (dark / teal-primary + warm-orange-secondary) ──
  {
    id: "lagunaShkiya",
    label: "Laguna Shkiya",
    name: "לגונה-שקיעה",
    skinKey: "lagunaShkiya",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/laguna-shkiya.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  // ── Menta Gachelet (dark / fresh mint-primary + warm-orange-secondary) ──
  {
    id: "mentaGachelet",
    label: "Menta Gachelet",
    name: "מנטה-גחל",
    skinKey: "mentaGachelet",
    group: "dark",
    previewImage: "/templates/previews/preview-covers/menta-gachelet.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  // ── Menta Shachar (light / fresh mint-primary + warm-orange-secondary) ──
  {
    id: "mentaShachar",
    label: "Menta Shachar",
    name: "מנטה-שחר",
    skinKey: "mentaShachar",
    group: "light",
    previewImage: "/templates/previews/preview-covers/menta-shachar.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  },
  // ── Laguna Afarsek (light / teal-primary + peach-secondary) ──
  {
    id: "lagunaAfarsek",
    label: "Laguna Afarsek",
    name: "לגונה-אפרסק",
    skinKey: "lagunaAfarsek",
    group: "light",
    previewImage: "/templates/previews/preview-covers/laguna-afarsek.webp",
    supports: {
      backgroundImage: true,
      avatar: true,
      header: true,
      about: true,
      services: true,
      cta: true,
      socials: true,
      contact: true
    },
    designDefaults: {
      backgroundMode: "photo",
      alignment: "left",
      socialStyle: "pills",
      fonts: { heading: "Heebo", body: "Assistant" },
      overlay: { enabled: true, color: "#000000", opacity: 0.35 }
    },
    seededFields: [
      "name",
      "headline",
      "company",
      "about",
      "faq",
      "cta.label",
      "cta.value",
      "contact.phone",
      "contact.email",
      "contact.website",
      "socials"
    ],
    sampleData: {
      name: "דניאל כהן",
      headline: "יועץ עסקי • אסטרטגיה וצמיחה",
      company: "כהן קונסלטינג",
      about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
      faq: {
        title: "שאלות ותשובות נפוצות",
        lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
        items: [
          {
            q: "איך מתחילים?",
            a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות."
          },
          {
            q: "למי זה מתאים?",
            a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת."
          },
          {
            q: "כמה זמן לוקח לראות תוצאות?",
            a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה."
          }
        ]
      },
      cta: { label: "לפרטים נוספים", value: "https://example.com" },
      contact: {
        phone: "+972501234567",
        email: "daniel@example.com",
        website: "https://example.com"
      },
      socials: [
        { platform: "instagram", url: "https://instagram.com/example" },
        {
          platform: "linkedin",
          url: "https://linkedin.com/in/example"
        },
        { platform: "facebook", url: "https://facebook.com/example" }
      ]
    }
  }
];
function normalizeTemplateId(raw) {
  const s = String(raw || "").trim();
  return s.length ? s : "roismanA11yLight";
}
function getTemplateById(id) {
  const normalized = normalizeTemplateId(id);
  return TEMPLATES.find((t) => t.id === normalized) || TEMPLATES[0];
}
const footer = "_footer_1livh_1";
const shareBlock = "_shareBlock_1livh_29";
const shareTitle = "_shareTitle_1livh_45";
const shareRow = "_shareRow_1livh_59";
const shareIcon = "_shareIcon_1livh_77";
const iconFacebook$1 = "_iconFacebook_1livh_129";
const iconEmail$1 = "_iconEmail_1livh_131";
const iconWhatsapp$1 = "_iconWhatsapp_1livh_133";
const logoWrap = "_logoWrap_1livh_199";
const logoImg = "_logoImg_1livh_237";
const promo = "_promo_1livh_257";
const promoLink = "_promoLink_1livh_271";
const installRow = "_installRow_1livh_297";
const installBtn = "_installBtn_1livh_313";
const installHelp = "_installHelp_1livh_365";
const installHelpHl = "_installHelpHl_1livh_385";
const styles$i = {
  footer,
  shareBlock,
  shareTitle,
  shareRow,
  shareIcon,
  iconFacebook: iconFacebook$1,
  iconEmail: iconEmail$1,
  iconWhatsapp: iconWhatsapp$1,
  logoWrap,
  logoImg,
  promo,
  promoLink,
  installRow,
  installBtn,
  installHelp,
  installHelpHl
};
function checkStandalone() {
  if (typeof window === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.standalone === true) {
    return true;
  }
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  return false;
}
let _deferredPrompt = null;
let _canPrompt = false;
let _isInstalled = checkStandalone();
let _snapshot = Object.freeze({
  canPrompt: _canPrompt,
  isInstalled: _isInstalled
});
const _listeners = /* @__PURE__ */ new Set();
function _emit() {
  _snapshot = Object.freeze({
    canPrompt: _canPrompt,
    isInstalled: _isInstalled
  });
  for (const fn of _listeners) fn();
}
function _syncInstalled() {
  const real = checkStandalone();
  if (real !== _isInstalled) {
    _isInstalled = real;
    _emit();
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    _canPrompt = true;
    _isInstalled = false;
    _emit();
  });
  window.addEventListener("appinstalled", () => {
    _deferredPrompt = null;
    _canPrompt = false;
    _isInstalled = true;
    _emit();
  });
  const mql = window.matchMedia?.("(display-mode: standalone)");
  mql?.addEventListener?.("change", (e) => {
    _isInstalled = e.matches;
    _emit();
  });
  window.addEventListener("pageshow", _syncInstalled);
  document.addEventListener("visibilitychange", _syncInstalled);
  window.addEventListener("focus", _syncInstalled);
}
const _SERVER_SNAPSHOT = Object.freeze({
  canPrompt: false,
  isInstalled: false
});
function subscribe(callback) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}
function getSnapshot() {
  return _snapshot;
}
function getServerSnapshot() {
  return _SERVER_SNAPSHOT;
}
async function triggerPrompt() {
  const prompt = _deferredPrompt;
  if (!prompt) return;
  prompt.prompt();
  await prompt.userChoice;
  _deferredPrompt = null;
  _canPrompt = false;
  _emit();
}
function useInstallPrompt() {
  const { canPrompt, isInstalled } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const [platform] = useState(() => {
    if (typeof navigator === "undefined") {
      return { isIOS: false, isSafari: false, isInAppBrowser: false };
    }
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !/** @type {any} */
    window.MSStream;
    const isSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    const isInAppBrowser = /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|LinkedIn/i.test(ua);
    return { isIOS, isSafari, isInAppBrowser };
  });
  const showIOSGuide = platform.isIOS && platform.isSafari && !isInstalled && !canPrompt;
  return {
    canPrompt,
    triggerPrompt,
    isInstalled,
    isIOS: platform.isIOS,
    isSafari: platform.isSafari,
    isInAppBrowser: platform.isInAppBrowser,
    showIOSGuide
  };
}
function getBrandName(card2) {
  return card2?.business?.name || card2?.business?.businessName || card2?.business?.ownerName || "";
}
function isAbsoluteUrl$2(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}
function buildShareUrl(publicPath) {
  if (typeof window === "undefined") return "";
  const raw = typeof publicPath === "string" ? publicPath.trim() : "";
  if (!raw) return "";
  const origin = window.location.origin;
  if (isAbsoluteUrl$2(raw)) {
    return raw.startsWith(origin) ? raw : "";
  }
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return `${origin}${normalized}`;
}
function tryCopyToClipboard(url) {
  if (!url) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
      navigator.clipboard.writeText(url).catch(() => {
      });
    }
  } catch {
  }
}
function CardFooter({ card: card2 }) {
  const brandName = getBrandName(card2);
  const {
    canPrompt,
    triggerPrompt: triggerPrompt2,
    isInstalled,
    isIOS,
    isSafari,
    isInAppBrowser,
    showIOSGuide
  } = useInstallPrompt();
  const [installHelpHl2, setInstallHelpHl] = useState(false);
  const shareUrl = useMemo(
    () => buildShareUrl(card2?.publicPath),
    [card2?.publicPath]
  );
  const facebookShareHref = shareUrl ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` : null;
  const emailShareHref = shareUrl ? `mailto:?body=${encodeURIComponent(shareUrl)}` : null;
  const waShareHref = shareUrl ? `https://wa.me/?text=${encodeURIComponent(shareUrl)}` : null;
  return /* @__PURE__ */ jsxs("footer", { className: styles$i.footer, children: [
    shareUrl && /* @__PURE__ */ jsxs("div", { className: styles$i.shareBlock, children: [
      /* @__PURE__ */ jsx("p", { className: styles$i.shareTitle, children: brandName ? `שתפו את ${brandName}` : "שתפו" }),
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: styles$i.shareRow,
          role: "group",
          "aria-label": "שיתוף הכרטיס",
          children: [
            /* @__PURE__ */ jsx(
              "a",
              {
                href: facebookShareHref,
                target: "_blank",
                rel: "noreferrer noopener",
                className: styles$i.shareIcon,
                "aria-label": "שתף בפייסבוק",
                onClick: () => {
                  tryCopyToClipboard(shareUrl);
                  trackClick(card2?.slug, "facebook");
                },
                children: /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$i.iconFacebook,
                    "aria-hidden": "true"
                  }
                )
              }
            ),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: emailShareHref,
                className: styles$i.shareIcon,
                "aria-label": "שתף במייל",
                onClick: () => {
                  tryCopyToClipboard(shareUrl);
                  trackClick(card2?.slug, "email");
                },
                children: /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$i.iconEmail,
                    "aria-hidden": "true"
                  }
                )
              }
            ),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: waShareHref,
                target: "_blank",
                rel: "noreferrer noopener",
                className: styles$i.shareIcon,
                "aria-label": "שתף בוואטסאפ",
                onClick: () => {
                  tryCopyToClipboard(shareUrl);
                  trackClick(card2?.slug, "whatsapp");
                },
                children: /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$i.iconWhatsapp,
                    "aria-hidden": "true"
                  }
                )
              }
            )
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      "a",
      {
        href: "https://cardigo.co.il",
        target: "_blank",
        rel: "noreferrer",
        className: styles$i.logoWrap,
        children: /* @__PURE__ */ jsxs("picture", { children: [
          /* @__PURE__ */ jsx(
            "source",
            {
              srcSet: "/images/brand-logo/cardigo-logo.webp",
              type: "image/webp"
            }
          ),
          /* @__PURE__ */ jsx(
            "img",
            {
              src: "/images/brand-logo/cardigo-logo-512.png",
              alt: "Cardigo",
              className: styles$i.logoImg,
              width: "80",
              height: "28",
              loading: "lazy",
              decoding: "async"
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ jsxs("p", { className: styles$i.promo, children: [
      "נבנה ב־",
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "https://cardigo.co.il",
          target: "_blank",
          rel: "noreferrer",
          className: styles$i.promoLink,
          children: "Cardigo"
        }
      ),
      " - הדרך החכמה לכרטיס ביקור דיגיטלי מקצועי"
    ] }),
    /* @__PURE__ */ jsx(
      InstallRow,
      {
        canPrompt,
        triggerPrompt: triggerPrompt2,
        isInstalled,
        isIOS,
        isSafari,
        isInAppBrowser,
        showIOSGuide,
        highlighted: installHelpHl2,
        onToggleHighlight: () => setInstallHelpHl((v) => !v)
      }
    )
  ] });
}
function InstallRow({
  canPrompt,
  triggerPrompt: triggerPrompt2,
  isInstalled,
  isIOS,
  isSafari,
  isInAppBrowser,
  showIOSGuide,
  highlighted,
  onToggleHighlight
}) {
  let helpText;
  if (isInstalled) {
    helpText = "✓ Cardigo מותקן במכשיר שלכם";
  } else if (canPrompt) {
    helpText = null;
  } else if (showIOSGuide) {
    helpText = "להתקנה: לחצו על שיתוף ▸ הוסף למסך הבית";
  } else if (isInAppBrowser || isIOS && !isSafari) {
    helpText = "פתחו ב־Safari להתקנה כאפליקציה";
  } else {
    helpText = "אם חלון ההתקנה לא נפתח, אפשר להתקין דרך תפריט הדפדפן";
  }
  function handleClick() {
    if (canPrompt) {
      triggerPrompt2();
      return;
    }
    onToggleHighlight();
  }
  const helpClass = highlighted && helpText ? `${styles$i.installHelp} ${styles$i.installHelpHl}` : styles$i.installHelp;
  return /* @__PURE__ */ jsxs("div", { className: styles$i.installRow, children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: styles$i.installBtn,
        onClick: handleClick,
        children: "התקינו את Cardigo לאנדרואיד"
      }
    ),
    helpText && /* @__PURE__ */ jsx("p", { className: helpClass, children: helpText })
  ] });
}
const buttons = "_buttons_1escf_1";
const item$2 = "_item_1escf_23";
const bubble = "_bubble_1escf_63";
const label = "_label_1escf_149";
const icon$5 = "_icon_1escf_167";
const iconPhone = "_iconPhone_1escf_197";
const iconWhatsapp = "_iconWhatsapp_1escf_205";
const iconWaze = "_iconWaze_1escf_213";
const iconEmail = "_iconEmail_1escf_221";
const iconWebsite = "_iconWebsite_1escf_229";
const iconFacebook = "_iconFacebook_1escf_239";
const iconInstagram = "_iconInstagram_1escf_249";
const iconTiktok = "_iconTiktok_1escf_259";
const iconTwitter = "_iconTwitter_1escf_269";
const iconAddress = "_iconAddress_1escf_279";
const iconLink = "_iconLink_1escf_289";
const styles$h = {
  buttons,
  item: item$2,
  bubble,
  label,
  icon: icon$5,
  iconPhone,
  iconWhatsapp,
  iconWaze,
  iconEmail,
  iconWebsite,
  iconFacebook,
  iconInstagram,
  iconTiktok,
  iconTwitter,
  iconAddress,
  iconLink
};
function ensureHttpUrl(value, opts) {
  if (!value) return "";
  const s = String(value).trim();
  if (!s) return "";
  if (/\s/.test(s)) return "";
  const lower = s.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return "";
  }
  if (s.startsWith("//")) {
    return validateHttpUrl(`https:${s}`);
  }
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return validateHttpUrl(s);
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    return "";
  }
  return validateHttpUrl(`https://${s}`);
}
function validateHttpUrl(candidate) {
  try {
    const u = new URL(candidate);
    if ((u.protocol === "http:" || u.protocol === "https:") && u.hostname && u.hostname.includes(".")) {
      return candidate;
    }
  } catch {
  }
  return "";
}
const BIDI_MARKS_RE = /[\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/g;
function extractCleanParts(raw) {
  const s = String(raw == null ? "" : raw).trim().replace(BIDI_MARKS_RE, "");
  const hadLeadingPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  return { hadLeadingPlus, digits };
}
function isIlNsn(nsn) {
  return typeof nsn === "string" && (nsn.length === 8 || nsn.length === 9) && !nsn.startsWith("0");
}
function isPlausibleE164Digits(digits) {
  return typeof digits === "string" && digits.length >= 7 && digits.length <= 15 && !digits.startsWith("0");
}
function normalizeForTel(raw) {
  const { hadLeadingPlus, digits } = extractCleanParts(raw);
  if (!digits) return "";
  if (digits.startsWith("972")) {
    const nsn = digits.slice(3);
    if (isIlNsn(nsn)) return "+" + digits;
  }
  if (digits.startsWith("0")) {
    if (digits.length === 9 || digits.length === 10) {
      const nsn = digits.slice(1);
      if (isIlNsn(nsn)) return "+972" + nsn;
    }
  }
  if (!digits.startsWith("0") && digits.length === 9 && digits.startsWith("5")) {
    return "+972" + digits;
  }
  if (digits.endsWith("972")) {
    const prefix = digits.slice(0, -3);
    if (isIlNsn(prefix)) return "+972" + prefix;
    if (prefix.startsWith("0") && (prefix.length === 9 || prefix.length === 10)) {
      const nsn = prefix.slice(1);
      if (isIlNsn(nsn)) return "+972" + nsn;
    }
  }
  if (hadLeadingPlus && isPlausibleE164Digits(digits)) {
    return "+" + digits;
  }
  return "";
}
function normalizeForWaMe(raw) {
  const tel = normalizeForTel(raw);
  if (!tel) return "";
  return tel.startsWith("+") ? tel.slice(1) : tel;
}
const cx$3 = (...classes) => classes.filter(Boolean).join(" ");
const WA_PREFILL_TEXT = "היי, הגעתי אליך דרך הכרטיס הדיגיטלי שלך ב-Cardigo 👋";
const CUSTOM_ACTION_TYPES_ALLOWED = /* @__PURE__ */ new Set([
  "phone",
  "whatsapp",
  "address",
  "email",
  "facebook",
  "website",
  "url"
]);
const CUSTOM_ACTION_ICON_NAMES = {
  phone: "iconPhone",
  whatsapp: "iconWhatsapp",
  address: "iconAddress",
  email: "iconEmail",
  facebook: "iconFacebook",
  website: "iconWebsite",
  url: "iconLink"
};
function buildCustomActionHref(actionType, target) {
  if (!target) return "";
  switch (actionType) {
    case "phone": {
      const normalized = normalizeForTel(target);
      return normalized ? `tel:${normalized}` : "";
    }
    case "whatsapp": {
      const normalized = normalizeForWaMe(target);
      return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(WA_PREFILL_TEXT)}` : "";
    }
    case "email":
      if (!/^[^\s@<>?&][^@<>?&]*@[^@<>?&]+\.[^@<>?&\s]+$/.test(target))
        return "";
      return `mailto:${target}`;
    case "address":
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
    case "facebook":
    case "website":
    case "url": {
      const href = ensureHttpUrl(target);
      return href || "";
    }
    default:
      return "";
  }
}
function ContactButtons({ card: card2 }) {
  const { contact } = card2;
  const locationAddress = String(card2?.business?.address || "").trim();
  const locationCity = String(card2?.business?.city || "").trim();
  const isPremium = card2?.entitlements?.canUseServices !== void 0 ? card2.entitlements.canUseServices : true;
  const phone = contact?.phone || contact?.mobilePhone || contact?.mobile || contact?.officePhone || "";
  const whatsapp = contact?.whatsapp || contact?.whatsappPhone || "";
  const telHref = normalizeForTel(phone);
  const waHref = normalizeForWaMe(whatsapp);
  const facebookHref = isPremium ? ensureHttpUrl(contact?.facebook) : "";
  const instagramHref = ensureHttpUrl(contact?.instagram);
  const twitterHref = isPremium ? ensureHttpUrl(contact?.twitter) : "";
  const tiktokHref = isPremium ? ensureHttpUrl(contact?.tiktok) : "";
  const websiteHref = ensureHttpUrl(contact?.website);
  const locationQuery = `${locationAddress}, ${locationCity}, ישראל`;
  const locationWazeHref = isPremium && locationAddress && locationCity ? `https://waze.com/ul?q=${encodeURIComponent(locationQuery)}&navigate=yes` : "";
  const rawCustomActions = Array.isArray(contact?.customActions) ? contact.customActions : [];
  const customActionButtons = rawCustomActions.filter((item2) => {
    if (!item2 || typeof item2 !== "object") return false;
    const label2 = typeof item2.label === "string" ? item2.label.trim() : "";
    const actionType = typeof item2.actionType === "string" ? item2.actionType : "";
    const target = typeof item2.target === "string" ? item2.target.trim() : "";
    if (!label2 || !CUSTOM_ACTION_TYPES_ALLOWED.has(actionType) || !target)
      return false;
    return !!buildCustomActionHref(actionType, target);
  }).map((item2) => ({
    label: item2.label.trim(),
    actionType: item2.actionType,
    href: buildCustomActionHref(item2.actionType, item2.target.trim())
  }));
  if (!telHref && !waHref && !facebookHref && !instagramHref && !twitterHref && !tiktokHref && !contact?.email && !websiteHref && !locationWazeHref && customActionButtons.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxs("div", { className: styles$h.buttons, children: [
    telHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: `tel:${telHref}`,
        className: styles$h.item,
        "aria-label": `Call ${phone || telHref}`,
        onClick: () => trackClick(card2?.slug, "call"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$h.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$h.icon, styles$h.iconPhone),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$h.label, children: "טלפון" })
        ]
      }
    ),
    waHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: `https://wa.me/${waHref}?text=${encodeURIComponent(WA_PREFILL_TEXT)}`,
        target: "_blank",
        rel: "noreferrer",
        className: styles$h.item,
        "aria-label": `Open WhatsApp chat ${whatsapp || waHref}`,
        onClick: () => trackClick(card2?.slug, "whatsapp"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$h.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$h.icon, styles$h.iconWhatsapp),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$h.label, children: "וואטסאפ" })
        ]
      }
    ),
    facebookHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: facebookHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$h.item,
        "aria-label": "Open Facebook",
        onClick: () => trackClick(card2?.slug, "facebook"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$h.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$h.icon, styles$h.iconFacebook),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$h.label, children: "פייסבוק" })
        ]
      }
    ),
    instagramHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: instagramHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$h.item,
        "aria-label": "Open Instagram",
        onClick: () => trackClick(card2?.slug, "instagram"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$h.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$h.icon, styles$h.iconInstagram),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$h.label, children: "אינסטגרם" })
        ]
      }
    ),
    twitterHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: twitterHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$h.item,
        "aria-label": "Open X/Twitter",
        onClick: () => trackClick(card2?.slug, "twitter"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$h.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$h.icon, styles$h.iconTwitter),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$h.label, children: "טוויטר" })
        ]
      }
    ),
    tiktokHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: tiktokHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$h.item,
        "aria-label": "Open TikTok",
        onClick: () => trackClick(card2?.slug, "tiktok"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$h.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$h.icon, styles$h.iconTiktok),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$h.label, children: "טיקטוק" })
        ]
      }
    ),
    contact?.email && /* @__PURE__ */ jsxs(
      "a",
      {
        href: `mailto:${contact.email}`,
        className: styles$h.item,
        "aria-label": `Email ${contact.email}`,
        onClick: () => trackClick(card2?.slug, "email"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$h.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$h.icon, styles$h.iconEmail),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$h.label, children: "אימייל" })
        ]
      }
    ),
    websiteHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: websiteHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$h.item,
        "aria-label": "Open website",
        onClick: () => trackClick(card2?.slug, "website"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$h.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$h.icon, styles$h.iconWebsite),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$h.label, children: "אתר" })
        ]
      }
    ),
    locationWazeHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: locationWazeHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$h.item,
        "aria-label": `נווט עם Waze: ${locationAddress}, ${locationCity}`,
        onClick: () => trackClick(card2?.slug, "waze"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$h.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$h.icon, styles$h.iconWaze),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$h.label, children: "ווייז" })
        ]
      }
    ),
    customActionButtons.map((btn2, i) => {
      const isExternal = !btn2.href.startsWith("tel:") && !btn2.href.startsWith("mailto:");
      return /* @__PURE__ */ jsxs(
        "a",
        {
          href: btn2.href,
          ...isExternal ? { target: "_blank", rel: "noreferrer" } : {},
          className: styles$h.item,
          "aria-label": `${btn2.label} (${btn2.actionType})`,
          onClick: () => trackClick(card2?.slug, "custom_action"),
          children: [
            /* @__PURE__ */ jsx("span", { className: styles$h.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
              "span",
              {
                className: cx$3(
                  styles$h.icon,
                  styles$h[CUSTOM_ACTION_ICON_NAMES[btn2.actionType]] || styles$h.iconLink
                ),
                "aria-hidden": "true"
              }
            ) }),
            /* @__PURE__ */ jsx("span", { className: styles$h.label, children: btn2.label })
          ]
        },
        i
      );
    })
  ] });
}
const actions = "_actions_21oo5_1";
const button = "_button_21oo5_13";
const actionShare = "_actionShare_21oo5_31";
const icon$4 = "_icon_21oo5_55";
const iconShare = "_iconShare_21oo5_91";
const iconSave = "_iconSave_21oo5_101";
const shareHint = "_shareHint_21oo5_131";
const styles$g = {
  actions,
  button,
  actionShare,
  icon: icon$4,
  iconShare,
  iconSave,
  shareHint
};
function getPublicOrigin$1() {
  const raw = "https://cardigo.co.il";
  if (raw.trim())
    return raw.trim().replace(/\/$/, "");
  try {
    if (typeof window !== "undefined" && window.location?.origin)
      return String(window.location.origin).trim().replace(/\/$/, "");
  } catch {
  }
  return "";
}
function normalizeAbsoluteUrl$1(origin, value) {
  const rawValue = typeof value === "string" ? value.trim() : "";
  if (!rawValue) return "";
  if (/^https?:\/\//i.test(rawValue)) return rawValue;
  const safeOrigin = typeof origin === "string" ? origin.trim() : "";
  const originTrimmed = safeOrigin.replace(/\/$/, "");
  if (!originTrimmed) return rawValue;
  if (rawValue.startsWith("/")) return `${originTrimmed}${rawValue}`;
  return `${originTrimmed}/${rawValue}`;
}
function deriveOgPathFromPublicPath(publicPath) {
  const p = typeof publicPath === "string" ? publicPath.trim() : "";
  if (!p) return "";
  if (p.startsWith("/c/")) return `/og${p}`;
  if (p.startsWith("/card/")) return `/og${p}`;
  return "";
}
function SaveContactButton({ card: card2 }) {
  const { business, contact } = card2;
  const businessName = business?.name || business?.businessName || business?.ownerName || "";
  const orgName = business?.name || business?.businessName || "";
  const phone = contact?.phone || contact?.mobilePhone || contact?.mobile || contact?.officePhone || "";
  const email = contact?.email || "";
  const website = contact?.website || "";
  const shareOrigin = getPublicOrigin$1();
  const ogPath = typeof card2?.ogPath === "string" ? card2.ogPath.trim() : "";
  const publicPathRaw = typeof card2?.publicPath === "string" ? card2.publicPath.trim() : "";
  const derivedOgPath = deriveOgPathFromPublicPath(publicPathRaw);
  const shareUrl = ogPath ? normalizeAbsoluteUrl$1(shareOrigin, ogPath) : derivedOgPath ? normalizeAbsoluteUrl$1(shareOrigin, derivedOgPath) : "";
  const published = card2?.status === "published";
  const canShare = published && Boolean(shareUrl);
  function escapeVCardText(value = "") {
    return String(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "").replace(/;/g, "\\;").replace(/,/g, "\\,");
  }
  async function handleShare() {
    if (!canShare) return;
    const shareTitle2 = card2?.seo?.title || businessName || "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle2,
          url: shareUrl
        });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert("הקישור הועתק");
        return;
      }
      alert(shareUrl);
    } catch {
    }
  }
  function downloadVCard() {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      businessName ? `FN:${escapeVCardText(businessName)}` : "",
      orgName ? `ORG:${escapeVCardText(orgName)}` : "",
      phone ? `TEL:${escapeVCardText(phone)}` : "",
      email ? `EMAIL:${escapeVCardText(email)}` : "",
      website ? `URL:${escapeVCardText(website)}` : "",
      "END:VCARD"
    ].filter(Boolean);
    const vcard = lines.join("\r\n");
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (businessName || card2.slug || "contact").toLowerCase().replace(/[^a-z0-9\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    a.download = `${safeName || "contact"}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return /* @__PURE__ */ jsxs("div", { className: `${styles$g.actions}`, children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: handleShare,
        disabled: !canShare,
        className: `${styles$g.button} ${styles$g.actionShare}`,
        title: !canShare ? !published ? "אפשר לשתף רק אחרי פרסום הכרטיס" : "קישור לשיתוף לא זמין כרגע" : void 0,
        children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `${styles$g.icon} ${styles$g.iconShare}`,
              "aria-hidden": "true"
            }
          ),
          "שתף"
        ]
      }
    ),
    !canShare && /* @__PURE__ */ jsx("div", { className: styles$g.shareHint, children: !published ? "אפשר לשתף רק אחרי פרסום הכרטיס." : "קישור לשיתוף לא זמין כרגע." }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: downloadVCard,
        className: styles$g.button,
        children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `${styles$g.icon} ${styles$g.iconSave}`,
              "aria-hidden": "true"
            }
          ),
          "שמור אותי באנשי קשר"
        ]
      }
    )
  ] });
}
const section$3 = "_section_74lkl_1";
const title$1 = "_title_74lkl_15";
const content$5 = "_content_74lkl_45";
const styles$f = {
  section: section$3,
  title: title$1,
  content: content$5
};
const cx$2 = (...classes) => classes.filter(Boolean).join(" ");
function Section({
  id,
  title: title2,
  children,
  className,
  titleClassName,
  contentClassName
}) {
  return /* @__PURE__ */ jsxs("section", { id, className: cx$2(styles$f.section, className), children: [
    title2 && /* @__PURE__ */ jsx("h2", { className: cx$2(styles$f.title, titleClassName), children: title2 }),
    /* @__PURE__ */ jsx("div", { className: cx$2(styles$f.content, contentClassName), children })
  ] });
}
const wrap$2 = "_wrap_69vym_1";
const code = "_code_69vym_15";
const download = "_download_69vym_23";
const styles$e = {
  wrap: wrap$2,
  code,
  download
};
function isAbsoluteUrl$1(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}
function QRCodeBlock({ slug, publicPath }) {
  const wrapRef = useRef(null);
  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const raw = typeof publicPath === "string" ? publicPath.trim() : "";
    if (!raw) return "";
    if (isAbsoluteUrl$1(raw)) {
      if (raw.startsWith(origin)) return raw;
      return "";
    }
    const normalized = raw.startsWith("/") ? raw : `/${raw}`;
    return `${origin}${normalized}`;
  }, [publicPath]);
  function handleDownload() {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `qr-${slug || "card"}.png`;
    a.click();
  }
  if (!url) return null;
  return /* @__PURE__ */ jsx(Section, { children: /* @__PURE__ */ jsxs("div", { className: styles$e.wrap, ref: wrapRef, children: [
    /* @__PURE__ */ jsx("div", { className: styles$e.code, children: /* @__PURE__ */ jsx(QRCodeCanvas, { value: url, size: 160, includeMargin: true }) }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: styles$e.download,
        onClick: handleDownload,
        children: "הורד QR"
      }
    )
  ] }) });
}
const paragraphs = "_paragraphs_mwitv_1";
const paragraph = "_paragraph_mwitv_1";
const styles$d = {
  paragraphs,
  paragraph
};
function normalizeAboutParagraphs(content2, maxParagraphs) {
  const raw = content2 && Array.isArray(content2.aboutParagraphs) ? content2.aboutParagraphs : typeof content2?.aboutText === "string" ? content2.aboutText.split(/\n\s*\n/) : [];
  return raw.map((v) => typeof v === "string" ? v.trim() : "").filter(Boolean).slice(0, maxParagraphs);
}
function AboutSection({ card: card2 }) {
  const content2 = card2?.content;
  const maxParagraphs = card2?.entitlements?.maxContentParagraphs ?? 3;
  const paragraphs2 = normalizeAboutParagraphs(content2, maxParagraphs);
  if (!paragraphs2.length) return null;
  return /* @__PURE__ */ jsx(Section, { title: content2.aboutTitle, children: /* @__PURE__ */ jsx("div", { className: styles$d.paragraphs, children: paragraphs2.map((text2, idx) => /* @__PURE__ */ jsx("p", { className: styles$d.paragraph, children: text2 }, idx)) }) });
}
function svgProps(className, title2) {
  const decorative = !title2;
  return {
    className,
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    focusable: "false",
    "aria-hidden": decorative ? "true" : void 0,
    role: title2 ? "img" : void 0
  };
}
function WorkHoursIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsx("path", { d: "M12 7v5l3 3" })
  ] });
}
function ServicesIcon({ className, title: title2 }) {
  return /* @__PURE__ */ jsxs("svg", { ...svgProps(className, title2), children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    /* @__PURE__ */ jsx("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    /* @__PURE__ */ jsx("rect", { x: "3", y: "7", width: "18", height: "13", rx: "2" }),
    /* @__PURE__ */ jsx("path", { d: "M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" }),
    /* @__PURE__ */ jsx("path", { d: "M3 13h18" })
  ] });
}
const section$2 = "_section_12n1w_1";
const sectionTitle$1 = "_sectionTitle_12n1w_17";
const content$4 = "_content_12n1w_37";
const wrap$1 = "_wrap_12n1w_47";
const toggle$1 = "_toggle_12n1w_69";
const tabIcon$1 = "_tabIcon_12n1w_101";
const toggleText$1 = "_toggleText_12n1w_115";
const icon$3 = "_icon_12n1w_125";
const list$1 = "_list_12n1w_153";
const item$1 = "_item_12n1w_171";
const styles$c = {
  section: section$2,
  sectionTitle: sectionTitle$1,
  content: content$4,
  wrap: wrap$1,
  toggle: toggle$1,
  tabIcon: tabIcon$1,
  toggleText: toggleText$1,
  icon: icon$3,
  list: list$1,
  item: item$1
};
function normalizeServices(card2) {
  const services = card2?.content?.services && typeof card2.content.services === "object" ? card2.content.services : null;
  if (!services) return null;
  const title2 = typeof services.title === "string" ? services.title.trim() : "";
  const rawItems = Array.isArray(services.items) ? services.items : [];
  const items = rawItems.map((v) => typeof v === "string" ? v : "").map((v) => v.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!items.length) return null;
  return {
    title: title2 || "שירותים",
    items
  };
}
function ServicesSection({ card: card2, mode }) {
  const services = useMemo(() => normalizeServices(card2), [card2]);
  const initialOpen = false;
  const [open, setOpen] = useState(initialOpen);
  if (!card2?.entitlements?.canUseServices) return null;
  if (!services) return null;
  const toggleLabel = open ? `הסתר ${services.title}` : `הצג ${services.title}`;
  return /* @__PURE__ */ jsx(
    Section,
    {
      id: "services",
      className: styles$c.section,
      contentClassName: styles$c.content,
      children: /* @__PURE__ */ jsxs("div", { className: styles$c.wrap, children: [
        /* @__PURE__ */ jsx("h2", { className: styles$c.sectionTitle, children: services.title }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: styles$c.toggle,
            "aria-expanded": open,
            onClick: () => setOpen((v) => !v),
            children: [
              /* @__PURE__ */ jsx(ServicesIcon, { className: styles$c.tabIcon }),
              /* @__PURE__ */ jsx("span", { className: styles$c.toggleText, children: toggleLabel }),
              /* @__PURE__ */ jsx("span", { className: styles$c.icon, "aria-hidden": "true" })
            ]
          }
        ),
        open ? /* @__PURE__ */ jsx("ul", { className: styles$c.list, role: "list", children: services.items.map((item2, idx) => /* @__PURE__ */ jsx("li", { className: styles$c.item, children: item2 }, `${idx}-${item2}`)) }) : null
      ] })
    }
  );
}
const section$1 = "_section_1jvq4_1";
const sectionTitle = "_sectionTitle_1jvq4_13";
const content$3 = "_content_1jvq4_33";
const wrap = "_wrap_1jvq4_41";
const toggle = "_toggle_1jvq4_59";
const tabIcon = "_tabIcon_1jvq4_91";
const toggleText = "_toggleText_1jvq4_105";
const icon$2 = "_icon_1jvq4_115";
const table = "_table_1jvq4_143";
const row = "_row_1jvq4_155";
const day = "_day_1jvq4_173";
const hours = "_hours_1jvq4_185";
const closed = "_closed_1jvq4_199";
const ranges = "_ranges_1jvq4_207";
const styles$b = {
  section: section$1,
  sectionTitle,
  content: content$3,
  wrap,
  toggle,
  tabIcon,
  toggleText,
  icon: icon$2,
  table,
  row,
  day,
  hours,
  closed,
  ranges
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
function toMinutes(hhmm) {
  if (typeof hhmm !== "string") return null;
  const m = /^([01]\d|2[0-3]):(00|30)$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
function normalizeBusinessHours(card2) {
  const bh = card2?.businessHours && typeof card2.businessHours === "object" ? card2.businessHours : null;
  if (!bh || bh.enabled !== true) return null;
  const week = bh.week && typeof bh.week === "object" ? bh.week : null;
  if (!week) return null;
  const days = [];
  for (const d of WEEKDAYS) {
    const rawDay = week?.[d.key] && typeof week[d.key] === "object" ? week[d.key] : {};
    const open = rawDay.open === true;
    const rawIntervals = Array.isArray(rawDay.intervals) ? rawDay.intervals : [];
    const intervals = rawIntervals.map((it) => {
      const start = typeof it?.start === "string" ? it.start : "";
      const end = typeof it?.end === "string" ? it.end : "";
      const startM = toMinutes(start);
      const endM = toMinutes(end);
      if (startM === null || endM === null) return null;
      if (startM >= endM) return null;
      return { start, end, startM };
    }).filter(Boolean).sort((a, b) => a.startM - b.startM);
    if (!open || intervals.length === 0) {
      days.push({
        key: d.key,
        label: d.label,
        closed: true,
        intervals: []
      });
    } else {
      days.push({ key: d.key, label: d.label, closed: false, intervals });
    }
  }
  const meaningful = days.some(
    (d) => d.closed === false && d.intervals.length
  );
  if (!meaningful) return null;
  return {
    title: "שעות פעילות",
    days
  };
}
function BusinessHoursSection({ card: card2, mode }) {
  const data = useMemo(() => normalizeBusinessHours(card2), [card2]);
  const initialOpen = false;
  const [open, setOpen] = useState(initialOpen);
  if (!card2?.entitlements?.canUseBusinessHours) return null;
  if (!data) return null;
  return /* @__PURE__ */ jsx(
    Section,
    {
      id: "business-hours",
      className: styles$b.section,
      contentClassName: styles$b.content,
      children: /* @__PURE__ */ jsxs("div", { className: styles$b.wrap, children: [
        /* @__PURE__ */ jsx("h2", { className: styles$b.sectionTitle, children: data.title }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: styles$b.toggle,
            "aria-expanded": open,
            onClick: () => setOpen((v) => !v),
            children: [
              /* @__PURE__ */ jsx(WorkHoursIcon, { className: styles$b.tabIcon }),
              /* @__PURE__ */ jsx("span", { className: styles$b.toggleText, children: open ? "הסתר שעות פעילות" : "הצג שעות פעילות" }),
              /* @__PURE__ */ jsx("span", { className: styles$b.icon, "aria-hidden": "true" })
            ]
          }
        ),
        open ? /* @__PURE__ */ jsx("div", { className: styles$b.table, children: data.days.map((d) => /* @__PURE__ */ jsxs("div", { className: styles$b.row, children: [
          /* @__PURE__ */ jsx("div", { className: styles$b.day, children: d.label }),
          /* @__PURE__ */ jsx("div", { className: styles$b.hours, children: d.closed ? /* @__PURE__ */ jsx("span", { className: styles$b.closed, children: "סגור" }) : /* @__PURE__ */ jsx("span", { className: styles$b.ranges, children: d.intervals.map(
            (it) => `${it.start}–${it.end}`
          ).join(", ") }) })
        ] }, d.key)) }) : null
      ] })
    }
  );
}
const REDUCED = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function useReveal({
  revealClass,
  skip = false,
  threshold = 0.15,
  rootMargin = "0px 0px -40px 0px"
} = {}) {
  const observerRef = useRef(null);
  const elsRef = useRef(/* @__PURE__ */ new Set());
  useEffect(() => {
    if (skip || REDUCED || !revealClass) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(revealClass);
            io.unobserve(entry.target);
            elsRef.current.delete(entry.target);
          }
        }
      },
      { threshold, rootMargin }
    );
    observerRef.current = io;
    for (const el of elsRef.current) io.observe(el);
    return () => {
      io.disconnect();
      observerRef.current = null;
    };
  }, [revealClass, skip, threshold, rootMargin]);
  const ref = useCallback(
    (el) => {
      if (!el || skip || REDUCED || !revealClass) return;
      elsRef.current.add(el);
      if (observerRef.current) observerRef.current.observe(el);
    },
    [revealClass, skip]
  );
  return ref;
}
const gallery = "_gallery_lewxd_1";
const imageWrapper = "_imageWrapper_lewxd_41";
const image = "_image_lewxd_41";
const overlay$1 = "_overlay_lewxd_175";
const dialog = "_dialog_lewxd_199";
const topBar = "_topBar_lewxd_217";
const counter = "_counter_lewxd_239";
const close = "_close_lewxd_249";
const media = "_media_lewxd_301";
const navPrev = "_navPrev_lewxd_317";
const navNext = "_navNext_lewxd_319";
const lightboxImage = "_lightboxImage_lewxd_339";
const isRevealed$1 = "_isRevealed_lewxd_571";
const delay0 = "_delay0_lewxd_611";
const delay1 = "_delay1_lewxd_617";
const delay2 = "_delay2_lewxd_623";
const delay3 = "_delay3_lewxd_629";
const styles$a = {
  gallery,
  imageWrapper,
  image,
  overlay: overlay$1,
  dialog,
  topBar,
  counter,
  close,
  media,
  navPrev,
  navNext,
  lightboxImage,
  isRevealed: isRevealed$1,
  delay0,
  delay1,
  delay2,
  delay3
};
function toAbsoluteUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/uploads/")) {
    let base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
    if (typeof window !== "undefined" && window.location?.protocol === "https:" && base.startsWith("http://")) {
      base = base.replace(/^http:\/\//i, "https://");
    }
    return `${base}${url}`;
  }
  return url;
}
function galleryItemToOriginalUrl(item2) {
  if (!item2) return null;
  if (typeof item2 === "string") {
    const url = item2.trim();
    return url ? toAbsoluteUrl(url) : null;
  }
  if (typeof item2 !== "object") return null;
  if (typeof item2.url === "string") {
    const url = item2.url.trim();
    return url ? toAbsoluteUrl(url) : null;
  }
  if (typeof item2.path === "string") {
    const raw = item2.path.trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("/uploads/")) return toAbsoluteUrl(raw);
    if (raw.startsWith("uploads/")) return toAbsoluteUrl(`/${raw}`);
    if (raw.startsWith("cards/")) return null;
  }
  return null;
}
function galleryItemToThumbUrl(item2) {
  if (!item2 || typeof item2 !== "object")
    return galleryItemToOriginalUrl(item2);
  if (typeof item2.thumbUrl === "string") {
    const url = item2.thumbUrl.trim();
    return url ? toAbsoluteUrl(url) : galleryItemToOriginalUrl(item2);
  }
  if (typeof item2.thumbPath === "string") {
    const raw = item2.thumbPath.trim();
    if (!raw) return galleryItemToOriginalUrl(item2);
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("/uploads/")) return toAbsoluteUrl(raw);
    if (raw.startsWith("uploads/")) return toAbsoluteUrl(`/${raw}`);
    if (raw.startsWith("cards/")) return null;
  }
  return galleryItemToOriginalUrl(item2);
}
const BODY_SCROLL_LOCK_CLASS = "digi-lb-open";
const SWIPE_THRESHOLD_PX$1 = 40;
const cx$1 = (...classes) => classes.filter(Boolean).join(" ");
function mod$1(n, m) {
  return (n % m + m) % m;
}
const STAGGER = [styles$a.delay0, styles$a.delay1, styles$a.delay2, styles$a.delay3];
function GallerySection({ card: card2, mode }) {
  const rawGallery = Array.isArray(card2?.gallery) ? card2.gallery : [];
  const businessName = card2?.business?.name || card2?.business?.businessName || card2?.business?.ownerName || "";
  const items = useMemo(() => {
    const out = [];
    for (let rawIndex = 0; rawIndex < rawGallery.length; rawIndex += 1) {
      const item2 = rawGallery[rawIndex];
      const fullUrl = galleryItemToOriginalUrl(item2);
      if (!fullUrl) continue;
      const thumbUrl = galleryItemToThumbUrl(item2) || fullUrl;
      const createdAtPart = item2 && typeof item2 === "object" && item2.createdAt != null ? String(item2.createdAt) : "";
      const pathPart = item2 && typeof item2 === "object" && typeof item2.path === "string" ? item2.path : "";
      const visibleIndex = out.length;
      const alt = item2 && typeof item2 === "object" && typeof item2.alt === "string" && item2.alt.trim() ? item2.alt.trim() : businessName ? `תמונה ${visibleIndex + 1} בגלריה של ${businessName}` : `תמונה ${visibleIndex + 1} בגלריה`;
      out.push({
        id: `${fullUrl}|${createdAtPart}|${pathPart}|${rawIndex}`,
        thumbUrl,
        fullUrl,
        alt,
        rawIndex
      });
    }
    return out;
  }, [rawGallery, businessName]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const overlayRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastActiveThumbRef = useRef(null);
  const touchRef = useRef({
    startX: 0,
    startY: 0,
    swiping: false,
    canceled: false
  });
  const hasItems = items.length > 0;
  const closeLightbox = useCallback(() => {
    setIsOpen(false);
    try {
      document?.body?.classList?.remove(BODY_SCROLL_LOCK_CLASS);
    } catch {
    }
    const el = lastActiveThumbRef.current;
    lastActiveThumbRef.current = null;
    if (el && typeof el.focus === "function") {
      setTimeout(() => {
        try {
          el.focus();
        } catch {
        }
      }, 0);
    }
  }, []);
  const showPrev = useCallback(() => {
    if (!hasItems) return;
    setActiveIndex((i) => mod$1(i - 1, items.length));
  }, [hasItems, items.length]);
  const showNext = useCallback(() => {
    if (!hasItems) return;
    setActiveIndex((i) => mod$1(i + 1, items.length));
  }, [hasItems, items.length]);
  const openLightbox = useCallback(
    (index, thumbEl) => {
      if (!hasItems) return;
      const nextIndex = typeof index === "number" && Number.isFinite(index) ? Math.min(Math.max(0, index), items.length - 1) : 0;
      if (thumbEl) lastActiveThumbRef.current = thumbEl;
      setActiveIndex(nextIndex);
      setIsOpen(true);
    },
    [hasItems, items.length]
  );
  useEffect(() => {
    if (!isOpen) return;
    try {
      document?.body?.classList?.add(BODY_SCROLL_LOCK_CLASS);
    } catch {
    }
    return () => {
      try {
        document?.body?.classList?.remove(BODY_SCROLL_LOCK_CLASS);
      } catch {
      }
    };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    if (!hasItems) {
      setIsOpen(false);
      return;
    }
    setActiveIndex((i) => {
      const clamped = Math.min(Math.max(0, i), items.length - 1);
      return clamped;
    });
  }, [isOpen, hasItems, items.length]);
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        showPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        showNext();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, closeLightbox, showPrev, showNext]);
  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => {
      try {
        closeButtonRef.current?.focus?.();
      } catch {
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    if (!hasItems) return;
    if (items.length < 2) return;
    const left = mod$1(activeIndex - 1, items.length);
    const right = mod$1(activeIndex + 1, items.length);
    for (const idx of [left, right]) {
      const src = items[idx]?.fullUrl;
      if (!src) continue;
      const img = new Image();
      img.src = src;
    }
  }, [activeIndex, hasItems, isOpen, items]);
  const revealRef = useReveal({
    revealClass: styles$a.isRevealed,
    skip: mode !== "public"
  });
  if (!hasItems) return null;
  return /* @__PURE__ */ jsxs(Section, { title: "גלריה", children: [
    /* @__PURE__ */ jsx("div", { className: styles$a.gallery, children: items.map((it, index) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        ref: revealRef,
        className: cx$1(styles$a.imageWrapper, STAGGER[index % 4]),
        onClick: (e) => openLightbox(index, e.currentTarget),
        "aria-label": businessName ? `פתח תמונה ${index + 1} בגלריה של ${businessName}` : `פתח תמונה ${index + 1}`,
        children: /* @__PURE__ */ jsx(
          "img",
          {
            src: it.thumbUrl,
            alt: it.alt,
            className: styles$a.image,
            width: 480,
            height: 480,
            loading: "lazy",
            decoding: "async"
          }
        )
      },
      it.id
    )) }),
    isOpen ? /* @__PURE__ */ jsx(
      "div",
      {
        ref: overlayRef,
        className: styles$a.overlay,
        role: "dialog",
        "aria-modal": "true",
        onMouseDown: (e) => {
          if (e.target === overlayRef.current) closeLightbox();
        },
        onWheel: (e) => {
          if (!isOpen) return;
          e.preventDefault();
          const dx = e.deltaX;
          const dy = e.deltaY;
          const dir = Math.abs(dx) > Math.abs(dy) ? dx : dy;
          if (dir > 0) showNext();
          else if (dir < 0) showPrev();
        },
        onTouchStart: (e) => {
          if (!isOpen) return;
          const t = e.touches?.[0];
          if (!t) return;
          touchRef.current = {
            startX: t.clientX,
            startY: t.clientY,
            swiping: true,
            canceled: false
          };
        },
        onTouchMove: (e) => {
          const state = touchRef.current;
          if (!isOpen || !state.swiping || state.canceled) return;
          const t = e.touches?.[0];
          if (!t) return;
          const dx = t.clientX - state.startX;
          const dy = t.clientY - state.startY;
          if (Math.abs(dy) > Math.abs(dx)) {
            state.canceled = true;
          }
        },
        onTouchEnd: (e) => {
          const state = touchRef.current;
          if (!isOpen || !state.swiping || state.canceled) {
            touchRef.current.swiping = false;
            return;
          }
          const t = e.changedTouches?.[0];
          if (!t) return;
          const dx = t.clientX - state.startX;
          if (dx > SWIPE_THRESHOLD_PX$1) showPrev();
          else if (dx < -SWIPE_THRESHOLD_PX$1) showNext();
          touchRef.current.swiping = false;
        },
        children: /* @__PURE__ */ jsxs("div", { className: styles$a.dialog, children: [
          /* @__PURE__ */ jsxs("div", { className: styles$a.topBar, children: [
            /* @__PURE__ */ jsxs("div", { className: styles$a.counter, children: [
              activeIndex + 1,
              " / ",
              items.length
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                ref: closeButtonRef,
                type: "button",
                className: styles$a.close,
                onClick: closeLightbox,
                "aria-label": "סגור",
                children: "×"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$a.media, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$a.navPrev,
                onClick: showPrev,
                "aria-label": "הקודם",
                children: "‹"
              }
            ),
            /* @__PURE__ */ jsx(
              "img",
              {
                src: items[activeIndex]?.fullUrl,
                alt: items[activeIndex]?.alt,
                className: styles$a.lightboxImage,
                decoding: "async"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$a.navNext,
                onClick: showNext,
                "aria-label": "הבא",
                children: "›"
              }
            )
          ] })
        ] })
      }
    ) : null
  ] });
}
const video = "_video_1txzv_1";
const styles$9 = {
  video
};
function toYouTubeEmbedUrl(raw) {
  if (typeof raw !== "string") return null;
  const input2 = raw.trim();
  if (!input2) return null;
  const looksLikeYouTubeDomain = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\b/i.test(input2);
  if (!looksLikeYouTubeDomain) return null;
  let url;
  try {
    const withProtocol = /^https?:\/\//i.test(input2) ? input2 : `https://${input2}`;
    url = new URL(withProtocol);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase();
  const isYouTube = hostname === "youtube.com" || hostname.endsWith(".youtube.com");
  const isYoutuBe = hostname === "youtu.be";
  if (!isYouTube && !isYoutuBe) return null;
  let videoId = null;
  if (isYoutuBe) {
    const parts = url.pathname.split("/").filter(Boolean);
    videoId = parts[0] || null;
  } else {
    const path = url.pathname;
    if (path === "/watch") {
      videoId = url.searchParams.get("v");
    }
    if (!videoId && path.startsWith("/shorts/")) {
      videoId = path.split("/shorts/")[1]?.split("/")[0] || null;
    }
    if (!videoId && path.startsWith("/embed/")) {
      videoId = path.split("/embed/")[1]?.split("/")[0] || null;
    }
  }
  if (!videoId) return null;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}
function VideoSection({ card: card2 }) {
  const videoUrl = card2.content?.videoUrl;
  if (!card2?.entitlements?.canUseVideo) return null;
  const embedUrl = toYouTubeEmbedUrl(videoUrl);
  if (!embedUrl) return null;
  return /* @__PURE__ */ jsx(Section, { title: "וידאו", children: /* @__PURE__ */ jsx(
    "iframe",
    {
      width: "100%",
      height: "auto",
      src: embedUrl,
      title: "Business video",
      frameBorder: "0",
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
      referrerPolicy: "strict-origin-when-cross-origin",
      allowFullScreen: true,
      className: styles$9.video
    }
  ) });
}
const slider = "_slider_14ywo_1";
const frame = "_frame_14ywo_73";
const viewport = "_viewport_14ywo_101";
const navLayer = "_navLayer_14ywo_115";
const btn = "_btn_14ywo_129";
const btnPrev = "_btnPrev_14ywo_213";
const btnNext = "_btnNext_14ywo_221";
const stack = "_stack_14ywo_229";
const slideSingle = "_slideSingle_14ywo_231";
const action_next = "_action_next_14ywo_253";
const action_prev = "_action_prev_14ywo_263";
const slide = "_slide_14ywo_1";
const outgoing = "_outgoing_14ywo_313";
const incoming = "_incoming_14ywo_323";
const animating = "_animating_14ywo_333";
const card$1 = "_card_14ywo_377";
const cardInner = "_cardInner_14ywo_395";
const stars = "_stars_14ywo_421";
const starFilled = "_starFilled_14ywo_441";
const starEmpty = "_starEmpty_14ywo_449";
const quote = "_quote_14ywo_457";
const text = "_text_14ywo_475";
const author = "_author_14ywo_521";
const styles$8 = {
  slider,
  frame,
  viewport,
  navLayer,
  btn,
  btnPrev,
  btnNext,
  stack,
  slideSingle,
  action_next,
  action_prev,
  slide,
  outgoing,
  incoming,
  animating,
  card: card$1,
  cardInner,
  stars,
  starFilled,
  starEmpty,
  quote,
  text,
  author
};
const INTERVAL_MS = 2e3;
const RESUME_AFTER_MS = 3e3;
const SWIPE_THRESHOLD_PX = 50;
const TRANSITION_MS = 320;
function clampRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n)));
}
function normalizeReviewItem(review) {
  if (typeof review === "string") {
    const text22 = review.trim();
    return text22 ? { text: text22, name: "", rating: 5 } : null;
  }
  if (!review || typeof review !== "object") return null;
  const textRaw = typeof review.text === "string" ? review.text : typeof review.value === "string" ? review.value : "";
  const text2 = String(textRaw || "").trim();
  if (!text2) return null;
  const nameRaw = typeof review.name === "string" ? review.name : typeof review.author === "string" ? review.author : "";
  const name2 = String(nameRaw || "").trim();
  const rating = clampRating(review.rating);
  return { text: text2, name: name2, rating };
}
function mod(n, m) {
  return (n % m + m) % m;
}
function ReviewsSection({ card: card2 }) {
  const items = useMemo(() => {
    const raw = Array.isArray(card2?.reviews) ? card2.reviews : [];
    return raw.map(normalizeReviewItem).filter(Boolean).slice(0, 5);
  }, [card2?.reviews]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [transition, setTransition] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isRTL, setIsRTL] = useState(false);
  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const activeIndexRef = useRef(0);
  const transitionRef = useRef(null);
  const focusWithinRef = useRef(false);
  const autoplayTimerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const transitionDoneTimerRef = useRef(null);
  const pointerRef = useRef({
    id: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    dragging: false,
    canceled: false
  });
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);
  useEffect(() => {
    transitionRef.current = transition;
  }, [transition]);
  useEffect(() => {
    const mq = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (!mq) return;
    const apply = () => setReduceMotion(Boolean(mq.matches));
    apply();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    try {
      const dir = window.getComputedStyle(el).direction;
      setIsRTL(dir === "rtl");
    } catch {
      setIsRTL(false);
    }
  }, []);
  useEffect(() => {
    setActiveIndex((i) => {
      const max = items.length - 1;
      if (max < 0) return 0;
      return Math.min(Math.max(0, i), max);
    });
  }, [items.length]);
  const stopAutoplay = useCallback(() => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);
  const commitTransition = useCallback(() => {
    const t2 = transitionRef.current;
    if (!t2) return;
    setTransition(null);
    setActiveIndex(t2.to);
    activeIndexRef.current = t2.to;
  }, []);
  const endTransition = useCallback(() => {
    const t2 = transitionRef.current;
    if (!t2) return;
    setTransition(null);
    setActiveIndex(t2.to);
    activeIndexRef.current = t2.to;
  }, []);
  const goToIndex = useCallback(
    (nextIndex, action, { source } = {}) => {
      if (items.length < 2) {
        setActiveIndex(0);
        return;
      }
      commitTransition();
      const from = activeIndexRef.current;
      const to = mod(nextIndex, items.length);
      if (to === from) return;
      if (reduceMotion) {
        setActiveIndex(to);
        return;
      }
      setTransition({ from, to, action, phase: "prepare" });
      requestAnimationFrame(() => {
        setTransition(
          (prev) => prev ? { ...prev, phase: "animate" } : prev
        );
      });
      if (transitionDoneTimerRef.current) {
        clearTimeout(transitionDoneTimerRef.current);
      }
      transitionDoneTimerRef.current = setTimeout(() => {
        transitionDoneTimerRef.current = null;
        endTransition();
      }, TRANSITION_MS + 120);
      if (source === "autoplay") return;
    },
    [commitTransition, endTransition, items.length, reduceMotion]
  );
  const goPrev = useCallback(
    ({ source } = {}) => {
      const prev = mod(activeIndexRef.current - 1, items.length);
      goToIndex(prev, "prev", { source });
    },
    [goToIndex, items.length]
  );
  const goNext = useCallback(
    ({ source } = {}) => {
      const next = mod(activeIndexRef.current + 1, items.length);
      goToIndex(next, "next", { source });
    },
    [goToIndex, items.length]
  );
  const startAutoplay = useCallback(() => {
    if (reduceMotion) return;
    if (items.length < 2) return;
    if (focusWithinRef.current) return;
    if (autoplayTimerRef.current) return;
    autoplayTimerRef.current = setInterval(() => {
      if (focusWithinRef.current) return;
      if (transitionRef.current) return;
      goNext({ source: "autoplay" });
    }, INTERVAL_MS);
  }, [goNext, items.length, reduceMotion]);
  const scheduleResume = useCallback(() => {
    if (reduceMotion) return;
    if (items.length < 2) return;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    resumeTimerRef.current = setTimeout(() => {
      resumeTimerRef.current = null;
      if (focusWithinRef.current) return;
      startAutoplay();
    }, RESUME_AFTER_MS);
  }, [items.length, reduceMotion, startAutoplay]);
  useEffect(() => {
    stopAutoplay();
    startAutoplay();
    return () => stopAutoplay();
  }, [items.length, reduceMotion, startAutoplay, stopAutoplay]);
  useEffect(() => {
    return () => {
      if (transitionDoneTimerRef.current) {
        clearTimeout(transitionDoneTimerRef.current);
        transitionDoneTimerRef.current = null;
      }
    };
  }, []);
  const onPrevClick = useCallback(() => {
    stopAutoplay();
    goPrev({ source: "user" });
    scheduleResume();
  }, [goPrev, scheduleResume, stopAutoplay]);
  const onNextClick = useCallback(() => {
    stopAutoplay();
    goNext({ source: "user" });
    scheduleResume();
  }, [goNext, scheduleResume, stopAutoplay]);
  const onKeyDown = useCallback(
    (e) => {
      if (items.length < 2) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      stopAutoplay();
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isRTL) goNext({ source: "user" });
        else goPrev({ source: "user" });
        scheduleResume();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isRTL) goPrev({ source: "user" });
        else goNext({ source: "user" });
        scheduleResume();
      }
    },
    [goNext, goPrev, isRTL, items.length, scheduleResume, stopAutoplay]
  );
  const onFocusCapture = useCallback(() => {
    focusWithinRef.current = true;
    stopAutoplay();
  }, [stopAutoplay]);
  const onBlurCapture = useCallback(() => {
    setTimeout(() => {
      const root2 = rootRef.current;
      const active = document.activeElement;
      const stillWithin = root2 && active && typeof root2.contains === "function" ? root2.contains(active) : false;
      focusWithinRef.current = Boolean(stillWithin);
      if (!focusWithinRef.current) scheduleResume();
    }, 0);
  }, [scheduleResume]);
  const onPointerDown = useCallback(
    (e) => {
      if (items.length < 2) return;
      const el = viewportRef.current;
      if (!el) return;
      stopAutoplay();
      pointerRef.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        dragging: true,
        canceled: false
      };
      try {
        el.setPointerCapture?.(e.pointerId);
      } catch {
      }
    },
    [items.length, stopAutoplay]
  );
  const onPointerMove = useCallback((e) => {
    const state = pointerRef.current;
    if (!state.dragging) return;
    if (state.id !== e.pointerId) return;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    const dx = state.lastX - state.startX;
    const dy = state.lastY - state.startY;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
      state.canceled = true;
    }
  }, []);
  const onPointerUp = useCallback(
    (e) => {
      const state = pointerRef.current;
      if (!state.dragging) return;
      if (state.id !== e.pointerId) return;
      state.dragging = false;
      const dx = state.lastX - state.startX;
      const dy = state.lastY - state.startY;
      if (!state.canceled && Math.abs(dx) > Math.abs(dy)) {
        if (dx <= -SWIPE_THRESHOLD_PX) {
          if (isRTL) goPrev({ source: "user" });
          else goNext({ source: "user" });
        } else if (dx >= SWIPE_THRESHOLD_PX) {
          if (isRTL) goNext({ source: "user" });
          else goPrev({ source: "user" });
        }
      }
      scheduleResume();
    },
    [goNext, goPrev, isRTL, scheduleResume]
  );
  const onPointerCancel = useCallback(() => {
    pointerRef.current.dragging = false;
    scheduleResume();
  }, [scheduleResume]);
  const onSlideTransitionEnd = useCallback(
    (e) => {
      if (!transitionRef.current) return;
      if (transitionRef.current.phase !== "animate") return;
      if (e.propertyName !== "transform" && e.propertyName !== "opacity")
        return;
      if (transitionDoneTimerRef.current) {
        clearTimeout(transitionDoneTimerRef.current);
        transitionDoneTimerRef.current = null;
      }
      endTransition();
    },
    [endTransition]
  );
  function renderStars(rating) {
    const r = clampRating(rating);
    return /* @__PURE__ */ jsx(
      "div",
      {
        className: styles$8.stars,
        role: "img",
        "aria-label": `דירוג ${r} מתוך 5`,
        children: Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ jsx(
          "span",
          {
            className: i < r ? styles$8.starFilled : styles$8.starEmpty,
            "aria-hidden": "true",
            children: "★"
          },
          i
        ))
      }
    );
  }
  function renderCard(item2) {
    return /* @__PURE__ */ jsx("figure", { className: styles$8.card, children: /* @__PURE__ */ jsxs("div", { className: styles$8.cardInner, children: [
      renderStars(5),
      /* @__PURE__ */ jsx("blockquote", { className: styles$8.quote, children: /* @__PURE__ */ jsxs("p", { className: styles$8.text, children: [
        "“",
        item2.text,
        "”"
      ] }) }),
      item2.name ? /* @__PURE__ */ jsx("div", { className: styles$8.author, children: item2.name }) : null
    ] }) });
  }
  if (!items.length) return null;
  const hasControls = items.length > 1;
  const t = transition;
  const stateKey = t ? `${t.from}->${t.to}:${t.action}` : `active:${activeIndex}`;
  return /* @__PURE__ */ jsx(Section, { title: "המלצות", children: /* @__PURE__ */ jsx(
    "div",
    {
      ref: rootRef,
      className: styles$8.slider,
      tabIndex: 0,
      onKeyDown,
      onFocusCapture,
      onBlurCapture,
      "data-dir": isRTL ? "rtl" : "ltr",
      "data-reduce-motion": reduceMotion ? "true" : "false",
      children: /* @__PURE__ */ jsxs("div", { className: styles$8.frame, children: [
        /* @__PURE__ */ jsxs("div", { className: styles$8.navLayer, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: `${styles$8.btn} ${styles$8.btnPrev}`,
              onClick: onPrevClick,
              "aria-label": "המלצה הקודמת",
              disabled: !hasControls,
              children: "‹"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: `${styles$8.btn} ${styles$8.btnNext}`,
              onClick: onNextClick,
              "aria-label": "המלצה הבאה",
              disabled: !hasControls,
              children: "›"
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "div",
          {
            ref: viewportRef,
            className: styles$8.viewport,
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
            role: "group",
            "aria-label": "המלצות",
            children: t ? /* @__PURE__ */ jsxs(
              "div",
              {
                className: `${styles$8.stack} ${styles$8[`action_${t.action}`]} ${t.phase === "animate" ? styles$8.animating : ""}`,
                onTransitionEnd: onSlideTransitionEnd,
                children: [
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: `${styles$8.slide} ${styles$8.outgoing}`,
                      "aria-hidden": "true",
                      tabIndex: -1,
                      children: renderCard(items[t.from])
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: `${styles$8.slide} ${styles$8.incoming}`,
                      "aria-hidden": "false",
                      tabIndex: -1,
                      children: renderCard(items[t.to])
                    }
                  )
                ]
              },
              stateKey
            ) : /* @__PURE__ */ jsx(
              "div",
              {
                className: styles$8.slideSingle,
                "aria-hidden": "false",
                tabIndex: -1,
                children: renderCard(items[activeIndex])
              },
              stateKey
            )
          }
        )
      ] })
    }
  ) });
}
const section = "_section_v68qf_1";
const title = "_title_v68qf_47";
const content$2 = "_content_v68qf_59";
const lead = "_lead_v68qf_87";
const list = "_list_v68qf_103";
const item = "_item_v68qf_125";
const question = "_question_v68qf_143";
const questionText = "_questionText_v68qf_227";
const icon$1 = "_icon_v68qf_241";
const answerWrap = "_answerWrap_v68qf_315";
const answer = "_answer_v68qf_315";
const styles$7 = {
  section,
  title,
  content: content$2,
  lead,
  list,
  item,
  question,
  questionText,
  icon: icon$1,
  answerWrap,
  answer
};
function safeIdPart(value) {
  const raw = String(value || "").trim();
  if (!raw) return "card";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64) || "card";
}
function toPlainText$1(value) {
  if (value === null || value === void 0) return "";
  const s = String(value);
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function normalizeFaq(card2) {
  const faq = card2?.faq && typeof card2.faq === "object" ? card2.faq : null;
  if (!faq) return null;
  const title2 = typeof faq.title === "string" ? faq.title.trim() : "";
  const lead2 = typeof faq.lead === "string" ? faq.lead.trim() : "";
  const rawItems = Array.isArray(faq.items) ? faq.items : [];
  const items = rawItems.map((item2) => {
    if (!item2 || typeof item2 !== "object") return null;
    const q = toPlainText$1(item2.q);
    const a = toPlainText$1(item2.a);
    return { q, a };
  }).filter((item2) => item2 && item2.q && item2.a);
  if (!items.length) return null;
  return {
    title: title2 || "שאלות ותשובות נפוצות",
    lead: lead2,
    items
  };
}
function FaqSection({ card: card2, mode }) {
  const faq = useMemo(() => normalizeFaq(card2), [card2]);
  const initialOpenIndex = mode === "editor" || mode === "preview" ? -1 : 0;
  const [openIndex, setOpenIndex] = useState(initialOpenIndex);
  if (!faq) return null;
  const prefix = `faq-${safeIdPart(card2?.slug || card2?._id)}`;
  function toggle2(index) {
    setOpenIndex((prev) => prev === index ? -1 : index);
  }
  return /* @__PURE__ */ jsxs(
    Section,
    {
      id: "faq",
      title: faq.title,
      className: styles$7.section,
      contentClassName: styles$7.content,
      titleClassName: styles$7.title,
      children: [
        faq.lead ? /* @__PURE__ */ jsx("p", { className: styles$7.lead, children: faq.lead }) : null,
        /* @__PURE__ */ jsx("ul", { className: styles$7.list, role: "list", children: faq.items.map((item2, index) => {
          const qId = `${prefix}-q${index}`;
          const aId = `${prefix}-a${index}`;
          const isOpen = openIndex === index;
          return /* @__PURE__ */ jsxs(
            "li",
            {
              className: styles$7.item,
              "data-open": isOpen ? "true" : "false",
              children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    className: styles$7.question,
                    id: qId,
                    "aria-expanded": isOpen,
                    "aria-controls": aId,
                    onClick: () => toggle2(index),
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$7.questionText, children: item2.q }),
                      /* @__PURE__ */ jsx(
                        "span",
                        {
                          className: styles$7.icon,
                          "aria-hidden": "true"
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: styles$7.answerWrap,
                    id: aId,
                    role: "region",
                    "aria-labelledby": qId,
                    children: /* @__PURE__ */ jsx("div", { className: styles$7.answer, children: item2.a })
                  }
                )
              ]
            },
            qId
          );
        }) })
      ]
    }
  );
}
async function getPublicAvailability(cardId, { days } = {}) {
  const params = { cardId: String(cardId || "").trim() };
  if (Number.isFinite(days)) params.days = days;
  const res = await api.get("/bookings/availability", { params });
  return res.data;
}
async function createPublicBooking(data) {
  const res = await api.post("/bookings", data);
  return res.data;
}
const notice = "_notice_10xro_5";
const success = "_success_10xro_37";
const error = "_error_10xro_51";
const info = "_info_10xro_65";
const icon = "_icon_10xro_79";
const styles$6 = {
  notice,
  success,
  error,
  info,
  icon
};
const VARIANTS = {
  success: { cls: styles$6.success, icon: "✓", role: "status", live: "polite" },
  error: { cls: styles$6.error, icon: "✗", role: "alert", live: "assertive" },
  info: { cls: styles$6.info, icon: "ℹ", role: "status", live: "polite" }
};
function Notice({ variant = "info", children }) {
  const v = VARIANTS[variant] ?? VARIANTS.info;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `${styles$6.notice} ${v.cls}`,
      role: v.role,
      "aria-live": v.live,
      children: [
        /* @__PURE__ */ jsx("span", { className: styles$6.icon, "aria-hidden": "true", children: v.icon }),
        children
      ]
    }
  );
}
const content$1 = "_content_111ro_1";
const intro = "_intro_111ro_53";
const loading = "_loading_111ro_73";
const calBlock = "_calBlock_111ro_93";
const calNav = "_calNav_111ro_137";
const calNavTitle = "_calNavTitle_111ro_153";
const calNavBtn = "_calNavBtn_111ro_173";
const calRow = "_calRow_111ro_223";
const calCell = "_calCell_111ro_223";
const calHeaderCell = "_calHeaderCell_111ro_285";
const calCellOutside = "_calCellOutside_111ro_337";
const calCellInWindowUnavail = "_calCellInWindowUnavail_111ro_349";
const calCellAvailable = "_calCellAvailable_111ro_373";
const calCellSelected = "_calCellSelected_111ro_419";
const slotArea = "_slotArea_111ro_449";
const slotHeader = "_slotHeader_111ro_475";
const slotList = "_slotList_111ro_491";
const slotBtn = "_slotBtn_111ro_511";
const slotBtnSelected = "_slotBtnSelected_111ro_555";
const noSlots = "_noSlots_111ro_567";
const form$1 = "_form_111ro_587";
const submitBtn = "_submitBtn_111ro_631";
const consentRow$1 = "_consentRow_111ro_667";
const consentText$1 = "_consentText_111ro_709";
const hp$1 = "_hp_111ro_767";
const selectedSummary = "_selectedSummary_111ro_791";
const dismissBtn = "_dismissBtn_111ro_817";
const styles$5 = {
  content: content$1,
  intro,
  loading,
  calBlock,
  calNav,
  calNavTitle,
  calNavBtn,
  calRow,
  calCell,
  calHeaderCell,
  calCellOutside,
  calCellInWindowUnavail,
  calCellAvailable,
  calCellSelected,
  slotArea,
  slotHeader,
  slotList,
  slotBtn,
  slotBtnSelected,
  noSlots,
  form: form$1,
  submitBtn,
  consentRow: consentRow$1,
  consentText: consentText$1,
  hp: hp$1,
  selectedSummary,
  dismissBtn
};
const WEEKDAY_HEADERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const WEEKDAY_LABELS = {
  sun: "ראשון",
  mon: "שני",
  tue: "שלישי",
  wed: "רביעי",
  thu: "חמישי",
  fri: "שישי",
  sat: "שבת"
};
const MONTH_LABELS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר"
];
const BOOKING_HORIZON_ALLOWED = [7, 14, 30, 60];
const BOOKING_HORIZON_DEFAULT = 14;
function formatDateShort(dateKeyIl) {
  const [, m, d] = (dateKeyIl || "").split("-");
  if (!m || !d) return "";
  return `${d}/${m}`;
}
function parseSlotTime(timeStr) {
  const m = /^(\d{2}):(\d{2})$/.exec(timeStr || "");
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}
function deriveMonths(days) {
  if (!days || days.length === 0) return [];
  const seen = /* @__PURE__ */ new Set();
  const months = [];
  for (const d of days) {
    const key = d.dateKeyIl.slice(0, 7);
    if (!seen.has(key)) {
      seen.add(key);
      const [y, m] = d.dateKeyIl.split("-");
      months.push({ key, year: Number(y), month: Number(m) });
    }
  }
  return months;
}
function buildStrictMonthGrid(days, year, month) {
  if (!days || !year || !month) return null;
  const dayMap = /* @__PURE__ */ new Map();
  for (const d of days) dayMap.set(d.dateKeyIl, d);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const title2 = `${MONTH_LABELS[month - 1]} ${year}`;
  const rows = [];
  let currentRow = [];
  for (let b = 0; b < firstWeekday; b++) {
    currentRow.push({ type: "empty" });
  }
  for (let day2 = 1; day2 <= daysInMonth; day2++) {
    const mm = String(month).padStart(2, "0");
    const dd = String(day2).padStart(2, "0");
    const dateKey = `${year}-${mm}-${dd}`;
    const backend = dayMap.get(dateKey);
    let cellType;
    if (backend?.isBookable) cellType = "available";
    else if (backend) cellType = "inWindowUnavailable";
    else cellType = "outside";
    currentRow.push({ type: cellType, day: day2, dateKey });
    if (currentRow.length === 7) {
      rows.push(currentRow);
      currentRow = [];
    }
  }
  if (currentRow.length > 0) {
    while (currentRow.length < 7) {
      currentRow.push({ type: "empty" });
    }
    rows.push(currentRow);
  }
  return { title: title2, rows };
}
function BookingSection({ card: card2 }) {
  const canUseBooking = card2?.entitlements?.canUseBooking === true && card2?.bookingSettings?.enabled === true && card2?.businessHours?.enabled === true;
  if (!canUseBooking) return null;
  const cardId = card2?._id;
  const slug = card2?.slug;
  const effectiveHorizonDays = BOOKING_HORIZON_ALLOWED.includes(
    Number(card2?.bookingSettings?.horizonDays)
  ) ? Number(card2.bookingSettings.horizonDays) : BOOKING_HORIZON_DEFAULT;
  const [days, setDays] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [activeMonthKey, setActiveMonthKey] = useState(null);
  const [form2, setForm] = useState({
    name: "",
    phone: "",
    _xf92: "",
    consent: false
  });
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [submitError, setSubmitError] = useState("");
  const autoResetRef = useRef(null);
  const fetchAvailability = useCallback(async () => {
    if (!cardId) return;
    setDays(null);
    setLoadError("");
    setSelectedDateKey(null);
    setSelectedSlot(null);
    setSubmitStatus("idle");
    setSubmitError("");
    try {
      const data = await getPublicAvailability(cardId, {
        days: effectiveHorizonDays
      });
      setDays(Array.isArray(data?.days) ? data.days : []);
    } catch (err) {
      const code2 = err.response?.data?.code;
      if (code2 === "BOOKING_NOT_AVAILABLE") {
        setLoadError("הזמנת תורים לא פעילה כרגע.");
      } else if (code2 === "FEATURE_NOT_AVAILABLE") {
        setLoadError("");
        setDays([]);
      } else if (err.response?.status === 429) {
        setLoadError("יותר מדי ניסיונות, נסו שוב מאוחר יותר.");
      } else {
        setLoadError("לא ניתן לטעון זמינות כרגע.");
      }
    }
  }, [cardId, effectiveHorizonDays]);
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);
  useEffect(() => {
    if (submitStatus !== "success") return;
    autoResetRef.current = setTimeout(() => {
      setSubmitStatus("idle");
      setSelectedSlot(null);
      setSelectedDateKey(null);
    }, 12e3);
    return () => clearTimeout(autoResetRef.current);
  }, [submitStatus]);
  const selectedDay = days && selectedDateKey ? days.find((d) => d.dateKeyIl === selectedDateKey) || null : null;
  const availableSlots = selectedDay?.slots?.filter((s) => s.available) || [];
  const monthList = useMemo(() => deriveMonths(days), [days]);
  useEffect(() => {
    setActiveMonthKey(monthList.length > 0 ? monthList[0].key : null);
  }, [monthList]);
  const activeMonthData = useMemo(
    () => activeMonthKey ? monthList.find((m) => m.key === activeMonthKey) ?? null : null,
    [activeMonthKey, monthList]
  );
  const calendarGrid = useMemo(
    () => activeMonthData ? buildStrictMonthGrid(
      days,
      activeMonthData.year,
      activeMonthData.month
    ) : null,
    [days, activeMonthData]
  );
  const activeMonthIndex = activeMonthKey ? monthList.findIndex((m) => m.key === activeMonthKey) : -1;
  function handlePrevMonth() {
    if (activeMonthIndex <= 0) return;
    const prev = monthList[activeMonthIndex - 1];
    setActiveMonthKey(prev.key);
    if (selectedDateKey && selectedDateKey.slice(0, 7) !== prev.key) {
      setSelectedDateKey(null);
      setSelectedSlot(null);
    }
  }
  function handleNextMonth() {
    if (activeMonthIndex >= monthList.length - 1) return;
    const next = monthList[activeMonthIndex + 1];
    setActiveMonthKey(next.key);
    if (selectedDateKey && selectedDateKey.slice(0, 7) !== next.key) {
      setSelectedDateKey(null);
      setSelectedSlot(null);
    }
  }
  function handleDaySelect(dateKey) {
    const day2 = days?.find((d) => d.dateKeyIl === dateKey);
    if (!day2 || !day2.isBookable) return;
    setSelectedDateKey(dateKey);
    setSelectedSlot(null);
    setSubmitStatus("idle");
    setSubmitError("");
  }
  function handleSlotSelect(timeStr) {
    setSelectedSlot(timeStr);
    setSubmitStatus("idle");
    setSubmitError("");
  }
  function updateField(field, value) {
    if (submitStatus === "error") {
      setSubmitStatus("idle");
      setSubmitError("");
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form2.consent) {
      setSubmitError("חובה להסכים למדיניות הפרטיות ולתנאי השימוש");
      setSubmitStatus("error");
      return;
    }
    if (!selectedDay || !selectedSlot) return;
    const parsed = parseSlotTime(selectedSlot);
    if (!parsed) return;
    setSubmitStatus("submitting");
    trackClick(slug, "booking");
    try {
      await createPublicBooking({
        cardId,
        name: form2.name,
        phone: form2.phone,
        consent: form2.consent,
        date: selectedDay.dateKeyIl,
        hour: parsed.hour,
        minute: parsed.minute,
        _xf92: form2._xf92
      });
      setSubmitStatus("success");
      setForm({ name: "", phone: "", _xf92: "", consent: false });
    } catch (err) {
      const httpStatus = err.response?.status;
      const code2 = err.response?.data?.code;
      let msg;
      if (code2 === "SLOT_TAKEN") {
        msg = "המועד כבר לא פנוי. טוענים מחדש…";
        setSubmitStatus("error");
        setSubmitError(msg);
        setTimeout(() => fetchAvailability(), 1200);
        return;
      }
      if (code2 === "PERSON_REPEAT_BLOCKED") {
        msg = "כבר קיימת בקשת תיאום פעילה עבור כרטיס זה. בעל העסק ייצור קשר.";
      } else if (httpStatus === 429) {
        msg = "יותר מדי ניסיונות, נסו שוב מאוחר יותר.";
      } else if (httpStatus === 403) {
        msg = "שירות לא זמין כרגע.";
      } else if (httpStatus === 404) {
        msg = "הכרטיס לא נמצא או לא פעיל.";
      } else if (httpStatus === 400) {
        msg = "אנא בדקו את הפרטים ונסו שנית.";
      } else {
        msg = "שגיאה בשליחת הבקשה, נסו שוב מאוחר יותר.";
      }
      setSubmitError(msg);
      setSubmitStatus("error");
    }
  }
  if (days === null && !loadError) {
    return /* @__PURE__ */ jsx(Section, { title: " תיאום תור", contentClassName: styles$5.content, children: /* @__PURE__ */ jsx("div", { className: styles$5.loading, children: "טוען זמינות…" }) });
  }
  if (loadError) {
    return /* @__PURE__ */ jsx(Section, { title: " תיאום תור", contentClassName: styles$5.content, children: /* @__PURE__ */ jsx(Notice, { variant: "error", children: loadError }) });
  }
  if (!days || days.length === 0) return null;
  if (submitStatus === "success") {
    return /* @__PURE__ */ jsx(Section, { title: " תיאום תור", contentClassName: styles$5.content, children: /* @__PURE__ */ jsx(Notice, { variant: "success", children: "בקשת התיאום התקבלה! בעל העסק ייצור איתך קשר לאישור המועד." }) });
  }
  return /* @__PURE__ */ jsxs(Section, { title: " תיאום תור", contentClassName: styles$5.content, children: [
    /* @__PURE__ */ jsx("p", { className: styles$5.intro, children: "בחרו יום ושעה מתאימים, ובעל העסק ייצור איתכם קשר לאישור." }),
    calendarGrid && /* @__PURE__ */ jsxs("div", { className: styles$5.calBlock, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$5.calNav, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$5.calNavBtn,
            "aria-label": "חודש קודם",
            onClick: handlePrevMonth,
            disabled: activeMonthIndex <= 0,
            children: "‹"
          }
        ),
        /* @__PURE__ */ jsx("span", { className: styles$5.calNavTitle, children: calendarGrid.title }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$5.calNavBtn,
            "aria-label": "חודש הבא",
            onClick: handleNextMonth,
            disabled: activeMonthIndex >= monthList.length - 1,
            children: "›"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$5.calRow, children: WEEKDAY_HEADERS.map((h) => /* @__PURE__ */ jsx("span", { className: styles$5.calHeaderCell, children: h }, h)) }),
      calendarGrid.rows.map((row2, ri) => /* @__PURE__ */ jsx("div", { className: styles$5.calRow, children: row2.map((cell, ci) => {
        if (cell.type === "empty") {
          return /* @__PURE__ */ jsx(
            "span",
            {
              className: styles$5.calCell
            },
            `e${ci}`
          );
        }
        const isSelected = selectedDateKey === cell.dateKey;
        const isAvailable = cell.type === "available";
        const cls = [
          styles$5.calCell,
          cell.type === "outside" ? styles$5.calCellOutside : "",
          cell.type === "inWindowUnavailable" ? styles$5.calCellInWindowUnavail : "",
          isAvailable ? styles$5.calCellAvailable : "",
          isSelected ? styles$5.calCellSelected : ""
        ].filter(Boolean).join(" ");
        if (isAvailable) {
          return /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: cls,
              "aria-label": `${cell.day}`,
              "aria-pressed": isSelected,
              onClick: () => handleDaySelect(cell.dateKey),
              children: cell.day
            },
            cell.dateKey
          );
        }
        return /* @__PURE__ */ jsx(
          "span",
          {
            className: cls,
            "aria-hidden": "true",
            children: cell.day
          },
          cell.dateKey
        );
      }) }, ri))
    ] }),
    selectedDay && !selectedSlot && /* @__PURE__ */ jsxs("div", { className: styles$5.slotArea, children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$5.dismissBtn,
          "aria-label": "ביטול בחירת יום",
          onClick: () => setSelectedDateKey(null),
          children: "×"
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: styles$5.slotHeader, children: [
        WEEKDAY_LABELS[selectedDay.weekdayKey] || selectedDay.weekdayKey,
        " ",
        formatDateShort(selectedDay.dateKeyIl),
        " - בחרו שעה"
      ] }),
      availableSlots.length > 0 ? /* @__PURE__ */ jsx(
        "div",
        {
          className: styles$5.slotList,
          role: "listbox",
          "aria-label": "בחירת שעה",
          children: availableSlots.map((slot) => {
            const isSelected = selectedSlot === slot.time;
            const cls = [
              styles$5.slotBtn,
              isSelected ? styles$5.slotBtnSelected : ""
            ].filter(Boolean).join(" ");
            return /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                role: "option",
                "aria-selected": isSelected,
                className: cls,
                onClick: () => handleSlotSelect(slot.time),
                children: slot.time
              },
              slot.time
            );
          })
        }
      ) : /* @__PURE__ */ jsx("div", { className: styles$5.noSlots, children: "אין מועדים פנויים ביום זה." })
    ] }),
    selectedSlot && selectedDay && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: styles$5.selectedSummary, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$5.dismissBtn,
            "aria-label": "חזרה לבחירת שעה",
            onClick: () => setSelectedSlot(null),
            children: "×"
          }
        ),
        WEEKDAY_LABELS[selectedDay.weekdayKey] || selectedDay.weekdayKey,
        " ",
        formatDateShort(selectedDay.dateKeyIl),
        " בשעה",
        " ",
        selectedSlot
      ] }),
      /* @__PURE__ */ jsxs("form", { className: styles$5.form, onSubmit: handleSubmit, children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            placeholder: "שם מלא",
            value: form2.name,
            required: true,
            maxLength: 100,
            onChange: (e) => updateField("name", e.target.value)
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "tel",
            placeholder: "טלפון",
            value: form2.phone,
            required: true,
            maxLength: 20,
            onChange: (e) => updateField("phone", e.target.value)
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            name: "_xf92",
            value: form2._xf92,
            onChange: (e) => updateField("_xf92", e.target.value),
            className: styles$5.hp,
            tabIndex: -1,
            autoComplete: "off",
            "aria-hidden": "true"
          }
        ),
        /* @__PURE__ */ jsxs("label", { className: styles$5.consentRow, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: form2.consent,
              onChange: (e) => updateField("consent", e.target.checked),
              required: true
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: styles$5.consentText, children: [
            "אני מסכים/ה ל",
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/privacy",
                target: "_blank",
                rel: "noopener noreferrer",
                children: "מדיניות הפרטיות"
              }
            ),
            " ",
            "ול",
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/terms",
                target: "_blank",
                rel: "noopener noreferrer",
                children: "תנאי השימוש"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            className: styles$5.submitBtn,
            disabled: submitStatus === "submitting",
            children: submitStatus === "submitting" ? "שולח…" : "שליחת בקשה"
          }
        ),
        submitStatus === "error" && submitError && /* @__PURE__ */ jsx(Notice, { variant: "error", children: submitError })
      ] })
    ] })
  ] });
}
const address = "_address_1dj0f_1";
const mapBox = "_mapBox_1dj0f_21";
const mapIframe = "_mapIframe_1dj0f_45";
const mapPlaceholder = "_mapPlaceholder_1dj0f_79";
const mapPlaceholderText = "_mapPlaceholderText_1dj0f_103";
const mapLoadButton = "_mapLoadButton_1dj0f_117";
const navBubbles = "_navBubbles_1dj0f_151";
const navItem = "_navItem_1dj0f_179";
const navBubble = "_navBubble_1dj0f_151";
const navIcon = "_navIcon_1dj0f_299";
const navIconMaps = "_navIconMaps_1dj0f_323";
const navIconWaze = "_navIconWaze_1dj0f_333";
const navLabel = "_navLabel_1dj0f_343";
const styles$4 = {
  address,
  mapBox,
  mapIframe,
  mapPlaceholder,
  mapPlaceholderText,
  mapLoadButton,
  navBubbles,
  navItem,
  navBubble,
  navIcon,
  navIconMaps,
  navIconWaze,
  navLabel
};
function LocationSection({ card: card2 }) {
  const isPremium = card2?.entitlements?.canUseServices === true;
  const address2 = String(card2?.business?.address || "").trim();
  const city = String(card2?.business?.city || "").trim();
  if (!isPremium || !address2 || !city) return null;
  const query = `${address2}, ${city}, ישראל`;
  const googleHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const wazeHref = `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
  const mapsApiKey = String(
    "AIzaSyC5sWVovNxbSzBYB_d2cW3H24JD8-Urc-I"
  ).trim();
  const embedUrl = mapsApiKey ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapsApiKey)}&q=${encodeURIComponent(query)}` : null;
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const mapBoxRef = useRef(null);
  const loadMap = useCallback(() => setShouldLoadMap(true), []);
  useEffect(() => {
    if (!embedUrl || shouldLoadMap) return;
    const el = mapBoxRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoadMap(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [embedUrl, shouldLoadMap]);
  return /* @__PURE__ */ jsxs(Section, { title: "מיקום", children: [
    /* @__PURE__ */ jsxs("p", { className: styles$4.address, children: [
      address2,
      ", ",
      city
    ] }),
    embedUrl && /* @__PURE__ */ jsx("div", { className: styles$4.mapBox, ref: mapBoxRef, children: shouldLoadMap ? /* @__PURE__ */ jsx(
      "iframe",
      {
        className: styles$4.mapIframe,
        title: `מפה: ${address2}, ${city}`,
        src: embedUrl,
        loading: "lazy",
        allowFullScreen: true,
        referrerPolicy: "no-referrer-when-downgrade"
      }
    ) : /* @__PURE__ */ jsxs("div", { className: styles$4.mapPlaceholder, children: [
      /* @__PURE__ */ jsx("p", { className: styles$4.mapPlaceholderText, children: "מפה תיטען בקרבת מקום" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$4.mapLoadButton,
          onClick: loadMap,
          "aria-label": `פתח מפה: ${address2}, ${city}`,
          children: "הצג מפה"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: styles$4.navBubbles, children: [
      /* @__PURE__ */ jsxs(
        "a",
        {
          href: googleHref,
          target: "_blank",
          rel: "noreferrer noopener",
          className: styles$4.navItem,
          "aria-label": `נווט עם Google Maps: ${address2}, ${city}`,
          onClick: () => trackClick(card2?.slug, "maps"),
          children: [
            /* @__PURE__ */ jsx("span", { className: styles$4.navBubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
              "span",
              {
                className: `${styles$4.navIcon} ${styles$4.navIconMaps}`,
                "aria-hidden": "true"
              }
            ) }),
            /* @__PURE__ */ jsx("span", { className: styles$4.navLabel, children: "נווט עם גוגל " })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "a",
        {
          href: wazeHref,
          target: "_blank",
          rel: "noreferrer noopener",
          className: styles$4.navItem,
          "aria-label": `נווט עם Waze: ${address2}, ${city}`,
          onClick: () => trackClick(card2?.slug, "waze"),
          children: [
            /* @__PURE__ */ jsx("span", { className: styles$4.navBubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
              "span",
              {
                className: `${styles$4.navIcon} ${styles$4.navIconWaze}`,
                "aria-hidden": "true"
              }
            ) }),
            /* @__PURE__ */ jsx("span", { className: styles$4.navLabel, children: "נווט עם Waze" })
          ]
        }
      )
    ] })
  ] });
}
async function createLead(data) {
  const res = await api.post("/leads", data);
  return res.data;
}
const paywall = "_paywall_1w74s_1";
const styles$3 = {
  paywall
};
function Paywall({ text: text2, onUpgrade }) {
  return /* @__PURE__ */ jsxs("div", { className: styles$3.paywall, children: [
    /* @__PURE__ */ jsx("p", { children: text2 }),
    /* @__PURE__ */ jsx("button", { onClick: onUpgrade, children: "שדרג עכשיו" })
  ] });
}
const input = "_input_sriup_1";
const textarea = "_textarea_sriup_3";
const formStyles = {
  input,
  textarea
};
const content = "_content_1hntt_1";
const form = "_form_1hntt_11";
const upgradeLink = "_upgradeLink_1hntt_71";
const consentRow = "_consentRow_1hntt_97";
const consentText = "_consentText_1hntt_141";
const resetBtn = "_resetBtn_1hntt_223";
const hp = "_hp_1hntt_255";
const styles$2 = {
  content,
  form,
  upgradeLink,
  consentRow,
  consentText,
  resetBtn,
  hp
};
const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  message: "",
  website: "",
  consent: false
};
function LeadForm({
  cardId,
  slug,
  entitlements,
  onUpgrade,
  mode
}) {
  if (!entitlements?.canUseLeads) {
    if (mode === "public") return null;
    return /* @__PURE__ */ jsx(Section, { title: "צרו קשר", contentClassName: styles$2.content, children: /* @__PURE__ */ jsx(
      Paywall,
      {
        text: "טופס יצירת קשר זמין למנויים בלבד",
        onUpgrade
      }
    ) });
  }
  const [form2, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const autoResetRef = useRef(null);
  useEffect(() => {
    if (status !== "success") return;
    autoResetRef.current = setTimeout(() => setStatus("idle"), 9e3);
    return () => clearTimeout(autoResetRef.current);
  }, [status]);
  function handleReset() {
    setStatus("idle");
    setErrorMsg("");
    setForm(INITIAL_FORM);
  }
  function update(field, value) {
    if (status === "error") {
      setStatus("idle");
      setErrorMsg("");
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form2.consent) {
      setErrorMsg("חובה להסכים למדיניות הפרטיות ולתנאי השימוש");
      setStatus("error");
      return;
    }
    setStatus("loading");
    trackClick(slug, "lead");
    try {
      await createLead({ cardId, ...form2 });
      setStatus("success");
      setForm(INITIAL_FORM);
    } catch (err) {
      const httpStatus = err.response?.status;
      const code2 = err.response?.data?.code;
      let msg;
      if (httpStatus === 429) {
        msg = "יותר מדי ניסיונות, נסה שוב מאוחר יותר.";
      } else if (httpStatus === 400 && code2 === "INVALID_EMAIL") {
        msg = "כתובת אימייל לא תקינה";
      } else if (httpStatus === 400 && code2 === "CONSENT_REQUIRED") {
        msg = "חובה להסכים למדיניות הפרטיות ולתנאי השימוש";
      } else if (httpStatus === 400) {
        msg = "אנא בדוק את הפרטים ונסה שנית";
      } else if (httpStatus === 403 && code2 === "TRIAL_EXPIRED") {
        msg = "תקופת הניסיון הסתיימה";
      } else if (httpStatus === 403 && code2 === "FEATURE_NOT_AVAILABLE") {
        msg = "טופס יצירת קשר זמין למנויי פרימיום בלבד";
      } else if (httpStatus === 404) {
        msg = "הכרטיס לא זמין כרגע";
      } else {
        msg = "שגיאה בשליחת הטופס";
      }
      setErrorMsg(msg);
      setStatus("error");
    }
  }
  if (status === "success") {
    return /* @__PURE__ */ jsxs(Section, { title: "צרו קשר", contentClassName: styles$2.content, children: [
      /* @__PURE__ */ jsx(Notice, { variant: "success", children: "תודה! פנייתך נשלחה בהצלחה" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$2.resetBtn,
          onClick: handleReset,
          children: "שלח הודעה נוספת"
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsx(Section, { title: "צרו קשר", contentClassName: styles$2.content, children: /* @__PURE__ */ jsxs("form", { className: styles$2.form, onSubmit: handleSubmit, children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        placeholder: "שם מלא",
        value: form2.name,
        required: true,
        maxLength: 100,
        onChange: (e) => update("name", e.target.value),
        className: formStyles.input
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "email",
        placeholder: "אימייל",
        value: form2.email,
        maxLength: 254,
        onChange: (e) => update("email", e.target.value),
        className: formStyles.input
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        name: "website",
        value: form2.website,
        onChange: (e) => update("website", e.target.value),
        className: styles$2.hp,
        tabIndex: -1,
        autoComplete: "off",
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        placeholder: "טלפון",
        value: form2.phone,
        maxLength: 20,
        onChange: (e) => update("phone", e.target.value),
        className: formStyles.input
      }
    ),
    /* @__PURE__ */ jsx(
      "textarea",
      {
        placeholder: "הודעה",
        rows: 3,
        value: form2.message,
        maxLength: 1e3,
        onChange: (e) => update("message", e.target.value),
        className: formStyles.textarea
      }
    ),
    /* @__PURE__ */ jsxs("label", { className: styles$2.consentRow, children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "checkbox",
          checked: form2.consent,
          onChange: (e) => update("consent", e.target.checked),
          required: true
        }
      ),
      /* @__PURE__ */ jsxs("span", { className: styles$2.consentText, children: [
        "אני מסכים ל",
        /* @__PURE__ */ jsx(
          "a",
          {
            href: "/privacy",
            target: "_blank",
            rel: "noopener noreferrer",
            children: "מדיניות הפרטיות"
          }
        ),
        " ",
        "וגם ל",
        /* @__PURE__ */ jsx(
          "a",
          {
            href: "/terms",
            target: "_blank",
            rel: "noopener noreferrer",
            children: "תנאי השימוש באתר"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("button", { type: "submit", disabled: status === "loading", children: "שלח" }),
    status === "error" && errorMsg ? /* @__PURE__ */ jsxs(Notice, { variant: "error", children: [
      errorMsg,
      onUpgrade && (errorMsg.includes("פרימיום") || errorMsg.includes("הניסיון")) ? /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$2.upgradeLink,
          onClick: onUpgrade,
          children: "שדרוג"
        }
      ) : null
    ] }) : null
  ] }) });
}
const root = "_root_tnx3x_1";
const card = "_card_tnx3x_209";
const hero = "_hero_tnx3x_251";
const cover = "_cover_tnx3x_303";
const overlay = "_overlay_tnx3x_323";
const overlay0 = "_overlay0_tnx3x_345";
const overlay5 = "_overlay5_tnx3x_351";
const overlay10 = "_overlay10_tnx3x_357";
const overlay15 = "_overlay15_tnx3x_363";
const overlay20 = "_overlay20_tnx3x_369";
const overlay25 = "_overlay25_tnx3x_375";
const overlay30 = "_overlay30_tnx3x_381";
const overlay35 = "_overlay35_tnx3x_387";
const overlay40 = "_overlay40_tnx3x_393";
const overlay45 = "_overlay45_tnx3x_399";
const overlay50 = "_overlay50_tnx3x_405";
const overlay55 = "_overlay55_tnx3x_411";
const overlay60 = "_overlay60_tnx3x_417";
const overlay65 = "_overlay65_tnx3x_423";
const overlay70 = "_overlay70_tnx3x_429";
const heroInner = "_heroInner_tnx3x_437";
const avatarWrap = "_avatarWrap_tnx3x_459";
const body = "_body_tnx3x_495";
const headerCluster = "_headerCluster_tnx3x_515";
const identity = "_identity_tnx3x_525";
const name = "_name_tnx3x_541";
const subtitle = "_subtitle_tnx3x_563";
const nameHeadingText = "_nameHeadingText_tnx3x_585";
const headingCategory = "_headingCategory_tnx3x_593";
const slogan = "_slogan_tnx3x_605";
const socialRow = "_socialRow_tnx3x_625";
const ctaRow = "_ctaRow_tnx3x_627";
const sectionWrap = "_sectionWrap_tnx3x_629";
const formWrap = "_formWrap_tnx3x_631";
const socialIconsRow = "_socialIconsRow_tnx3x_755";
const footerWrap = "_footerWrap_tnx3x_961";
const heroDivider = "_heroDivider_tnx3x_1049";
const heroDividerFill = "_heroDividerFill_tnx3x_1075";
const heroDividerStroke = "_heroDividerStroke_tnx3x_1085";
const theme$r = "_theme_tnx3x_1525";
const isRevealed = "_isRevealed_tnx3x_1569";
const styles$1 = {
  root,
  card,
  hero,
  cover,
  overlay,
  overlay0,
  overlay5,
  overlay10,
  overlay15,
  overlay20,
  overlay25,
  overlay30,
  overlay35,
  overlay40,
  overlay45,
  overlay50,
  overlay55,
  overlay60,
  overlay65,
  overlay70,
  heroInner,
  avatarWrap,
  body,
  headerCluster,
  identity,
  name,
  subtitle,
  nameHeadingText,
  headingCategory,
  slogan,
  socialRow,
  ctaRow,
  sectionWrap,
  formWrap,
  socialIconsRow,
  footerWrap,
  heroDivider,
  heroDividerFill,
  heroDividerStroke,
  theme: theme$r,
  isRevealed
};
const cx = (...classes) => classes.filter(Boolean).join(" ");
function getDisplayName(card2) {
  return card2?.business?.name || card2?.business?.businessName || card2?.business?.ownerName || "";
}
function getSubtitle(card2) {
  return card2?.business?.category || "";
}
const HEADING_COMBINED_MAX = 90;
const HEADING_MIN_TOKEN_LENGTH = 3;
const HEADING_SHARED_TOKEN_LIMIT = 2;
const HEADING_COMPOUND_SEPARATORS = [" - ", "|", ":", " / "];
function normalizeHeadingPart(value) {
  return (typeof value === "string" ? value : "").toLowerCase().replace(/\s+/g, " ").trim();
}
function tokenizeHeadingPart(normalized) {
  return normalized.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= HEADING_MIN_TOKEN_LENGTH);
}
function shouldFoldCategoryIntoHeading(name2, category) {
  const rawName = typeof name2 === "string" ? name2.trim() : "";
  const rawCategory = typeof category === "string" ? category.trim() : "";
  if (!rawName || !rawCategory) return false;
  const nameNorm = normalizeHeadingPart(rawName);
  const categoryNorm = normalizeHeadingPart(rawCategory);
  if (!nameNorm || !categoryNorm) return false;
  if (nameNorm === categoryNorm) return false;
  if (nameNorm.includes(categoryNorm) || categoryNorm.includes(nameNorm)) {
    return false;
  }
  for (const separator of HEADING_COMPOUND_SEPARATORS) {
    if (rawName.includes(separator)) return false;
  }
  const nameTokens = new Set(tokenizeHeadingPart(nameNorm));
  let sharedTokens = 0;
  for (const token of tokenizeHeadingPart(categoryNorm)) {
    if (nameTokens.has(token)) {
      sharedTokens += 1;
      if (sharedTokens >= HEADING_SHARED_TOKEN_LIMIT) return false;
    }
  }
  if (rawName.length + 1 + rawCategory.length > HEADING_COMBINED_MAX) {
    return false;
  }
  return true;
}
function CardLayout({
  card: card2,
  supports,
  skin,
  extraThemeClass,
  mode,
  onUpgrade,
  templateId,
  selfThemeActive
}) {
  const design = card2?.design || {};
  const coverRaw = design?.backgroundImage || design?.coverImage || null;
  const coverUrl = toAbsoluteUrl(coverRaw);
  const avatar = toAbsoluteUrl(design?.avatarImage || design?.logo || null);
  const overlayValue = Number(design?.backgroundOverlay ?? 40);
  const name2 = getDisplayName(card2);
  const subtitle2 = getSubtitle(card2);
  const slogan2 = typeof card2?.business?.slogan === "string" ? card2.business.slogan.trim() : "";
  const foldCategory = shouldFoldCategoryIntoHeading(name2, subtitle2);
  const hasCover = Boolean(coverUrl);
  const avatarRevealRef = useReveal({
    revealClass: styles$1.isRevealed,
    skip: mode !== "public"
  });
  const overlayOpacity = Math.min(0.7, Math.max(0, overlayValue / 100));
  const overlayStep = Math.min(
    70,
    Math.max(0, Math.round(overlayOpacity * 100 / 5) * 5)
  );
  const rootClass = cx(styles$1.root, skin?.theme, extraThemeClass);
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: rootClass,
      "data-mode": mode,
      "data-cardigo-scope": "card",
      "data-template-id": String(templateId || ""),
      "data-self-theme": selfThemeActive ? "1" : void 0,
      children: /* @__PURE__ */ jsxs("div", { className: cx(styles$1.card, skin?.card), children: [
        /* @__PURE__ */ jsxs("header", { className: cx(styles$1.hero, skin?.hero), children: [
          hasCover ? /* @__PURE__ */ jsx(
            "img",
            {
              className: styles$1.cover,
              src: coverUrl,
              alt: name2 && subtitle2 ? `תמונת כותרת של ${name2} - ${subtitle2}` : name2 ? `תמונת כותרת של ${name2}` : "תמונת כותרת של העסק",
              decoding: "async",
              loading: "eager",
              fetchpriority: "high",
              referrerPolicy: "no-referrer"
            }
          ) : null,
          /* @__PURE__ */ jsx(
            "div",
            {
              className: cx(
                styles$1.overlay,
                styles$1[`overlay${overlayStep}`],
                skin?.overlay
              )
            }
          ),
          /* @__PURE__ */ jsx("div", { className: cx(styles$1.heroInner, skin?.heroInner), children: avatar && /* @__PURE__ */ jsx(
            "div",
            {
              ref: avatarRevealRef,
              className: cx(styles$1.avatarWrap, skin?.avatar),
              children: /* @__PURE__ */ jsx(
                "img",
                {
                  src: avatar,
                  alt: name2 && subtitle2 ? `תמונת פרופיל של ${name2} - ${subtitle2}` : name2 ? `תמונת פרופיל של ${name2}` : "תמונת פרופיל של העסק",
                  width: 480,
                  height: 480,
                  decoding: "async"
                }
              )
            }
          ) }),
          /* @__PURE__ */ jsxs(
            "svg",
            {
              className: styles$1.heroDivider,
              viewBox: "0 0 100 20",
              preserveAspectRatio: "none",
              "aria-hidden": "true",
              focusable: "false",
              children: [
                /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M0 0 Q50 20 100 0 V20 H0 Z",
                    className: styles$1.heroDividerFill
                  }
                ),
                /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M0 0 Q50 20 100 0",
                    className: styles$1.heroDividerStroke
                  }
                )
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("main", { className: cx(styles$1.body, skin?.body), children: [
          /* @__PURE__ */ jsxs(
            "section",
            {
              className: cx(
                styles$1.headerCluster,
                skin?.headerCluster
              ),
              children: [
                /* @__PURE__ */ jsxs("div", { className: cx(styles$1.identity, skin?.identity), children: [
                  /* @__PURE__ */ jsxs("h1", { className: cx(styles$1.name, skin?.name), children: [
                    /* @__PURE__ */ jsx("span", { className: styles$1.nameHeadingText, children: name2 || "" }),
                    foldCategory ? /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: cx(
                          styles$1.subtitle,
                          styles$1.headingCategory,
                          skin?.subtitle
                        ),
                        children: subtitle2
                      }
                    ) : null
                  ] }),
                  !foldCategory && subtitle2 ? /* @__PURE__ */ jsx(
                    "p",
                    {
                      className: cx(
                        styles$1.subtitle,
                        skin?.subtitle
                      ),
                      children: subtitle2
                    }
                  ) : null,
                  slogan2 ? /* @__PURE__ */ jsxs("p", { className: styles$1.slogan, children: [
                    '"',
                    slogan2,
                    '"'
                  ] }) : null
                ] }),
                /* @__PURE__ */ jsx("div", { className: cx(styles$1.socialRow, skin?.socialRow), children: /* @__PURE__ */ jsx(ContactButtons, { card: card2 }) }),
                /* @__PURE__ */ jsx("div", { className: cx(styles$1.ctaRow, skin?.ctaRow), children: /* @__PURE__ */ jsx(SaveContactButton, { card: card2 }) })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "section",
            {
              className: cx(styles$1.sectionWrap, skin?.sectionWrap),
              children: [
                /* @__PURE__ */ jsx(AboutSection, { card: card2 }),
                /* @__PURE__ */ jsx(ServicesSection, { card: card2, mode }),
                /* @__PURE__ */ jsx(BusinessHoursSection, { card: card2, mode }),
                supports?.gallery !== false && /* @__PURE__ */ jsx(GallerySection, { card: card2, mode }),
                supports?.video !== false && /* @__PURE__ */ jsx(VideoSection, { card: card2 }),
                supports?.reviews !== false && /* @__PURE__ */ jsx(ReviewsSection, { card: card2 }),
                /* @__PURE__ */ jsx(FaqSection, { card: card2, mode }),
                card2?.status === "published" && /* @__PURE__ */ jsx(
                  QRCodeBlock,
                  {
                    slug: card2.slug,
                    publicPath: card2?.publicPath
                  }
                ),
                /* @__PURE__ */ jsx(LocationSection, { card: card2 }),
                /* @__PURE__ */ jsx(BookingSection, { card: card2 }),
                /* @__PURE__ */ jsx("div", { className: cx(styles$1.formWrap, skin?.formWrap), children: /* @__PURE__ */ jsx(
                  LeadForm,
                  {
                    cardId: card2?._id,
                    slug: card2?.slug,
                    entitlements: card2?.entitlements,
                    onUpgrade,
                    mode
                  }
                ) })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("footer", { className: cx(styles$1.footerWrap, skin?.footerWrap), children: /* @__PURE__ */ jsx(CardFooter, { card: card2 }) })
      ] })
    }
  );
}
const theme$q = "_theme_1byer_1";
const SkinBase = {
  theme: theme$q
};
const paletteGold$1 = "_paletteGold_1yk2e_1";
const paletteOcean$1 = "_paletteOcean_1yk2e_55";
const paletteForest$1 = "_paletteForest_1yk2e_105";
const SharedPalettes = {
  paletteGold: paletteGold$1,
  paletteOcean: paletteOcean$1,
  paletteForest: paletteForest$1
};
const theme$p = "_theme_13dup_1";
const paletteGold = "_paletteGold_13dup_165";
const paletteOcean = "_paletteOcean_13dup_227";
const paletteForest = "_paletteForest_13dup_285";
const CustomSkin = {
  theme: theme$p,
  paletteGold,
  paletteOcean,
  paletteForest
};
const theme$o = "_theme_2ovy8_1";
const BeautySkin = {
  theme: theme$o
};
const theme$n = "_theme_1qkwj_1";
const RoismanA11ySkin = {
  theme: theme$n
};
const theme$m = "_theme_hfy83_1";
const LakmiSkin = {
  theme: theme$m
};
const theme$l = "_theme_lysob_1";
const galitSkin = {
  theme: theme$l
};
const theme$k = "_theme_1av6p_1";
const IrisLaylaSkin = {
  theme: theme$k
};
const theme$j = "_theme_x2qki_1";
const ShkiyaLagunaSkin = {
  theme: theme$j
};
const theme$i = "_theme_1pknr_1";
const ZahavLagunaSkin = {
  theme: theme$i
};
const theme$h = "_theme_1ra0k_1";
const RubyEshSkin = {
  theme: theme$h
};
const theme$g = "_theme_1xncn_1";
const ShachorGraphitSkin = {
  theme: theme$g
};
const theme$f = "_theme_13dge_1";
const PardesChaiSkin = {
  theme: theme$f
};
const theme$e = "_theme_yuw89_1";
const BronzeSachlavSkin = {
  theme: theme$e
};
const theme$d = "_theme_h7jtd_1";
const TehomTurkizSkin = {
  theme: theme$d
};
const theme$c = "_theme_14z90_1";
const InbarAdamaSkin = {
  theme: theme$c
};
const theme$b = "_theme_19ern_1";
const LavaLagunaSkin = {
  theme: theme$b
};
const theme$a = "_theme_yxy7r_1";
const ZahavTehomSkin = {
  theme: theme$a
};
const theme$9 = "_theme_1pnx3_1";
const EvenNilSkin = {
  theme: theme$9
};
const theme$8 = "_theme_cqenf_1";
const IrisChatzotSkin = {
  theme: theme$8
};
const theme$7 = "_theme_1v8ip_1";
const GacheletArgamanSkin = {
  theme: theme$7
};
const theme$6 = "_theme_1a51f_1";
const BronzeCholSkin = {
  theme: theme$6
};
const theme$5 = "_theme_y71jx_1";
const HadarGacheletSkin = {
  theme: theme$5
};
const theme$4 = "_theme_immdp_1";
const LagunaShkiyaSkin = {
  theme: theme$4
};
const theme$3 = "_theme_ezurn_1";
const MentaGacheletSkin = {
  theme: theme$3
};
const theme$2 = "_theme_1jkrp_1";
const MentaShacharSkin = {
  theme: theme$2
};
const theme$1 = "_theme_ay2p4_1";
const LagunaAfarsekSkin = {
  theme: theme$1
};
const theme = "_theme_i7hcn_1";
const SelfThemeSkin = {
  theme
};
function normalizeHexColor(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return null;
}
function hexToRgbTriplet(hex) {
  const h = normalizeHexColor(hex);
  if (!h) return null;
  const v = h.replace("#", "");
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
function toPascalCaseKey(key) {
  return String(key || "").trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}
function paletteKeyToCssModuleClassName(key) {
  return `palette${toPascalCaseKey(key)}`;
}
function getCustomPaletteClassFromRegistry(template, key, skinModule) {
  const allowed = Array.isArray(template?.customPalettes) ? template.customPalettes : [];
  const normalized = String(key || "").trim().toLowerCase();
  const defaultKeyRaw = String(template?.defaultPaletteKey || "").trim().toLowerCase();
  const defaultKey = defaultKeyRaw && allowed.includes(defaultKeyRaw) && defaultKeyRaw || allowed[0] || "";
  const finalKey = allowed.includes(normalized) ? normalized : defaultKey;
  const className = paletteKeyToCssModuleClassName(finalKey);
  const defaultClassName = paletteKeyToCssModuleClassName(defaultKey);
  return skinModule?.[className] || SharedPalettes?.[className] || skinModule?.[defaultClassName] || SharedPalettes?.[defaultClassName] || void 0;
}
function TemplateRenderer({ card: card2, onUpgrade, mode }) {
  const templateId = normalizeTemplateId(card2?.design?.templateId);
  const template = getTemplateById(templateId);
  const supports = template?.supports || {};
  const skinModules = {
    base: SkinBase,
    custom: CustomSkin,
    beauty: BeautySkin,
    roismanA11y: RoismanA11ySkin,
    lakmi: LakmiSkin,
    galit: galitSkin,
    irisLayla: IrisLaylaSkin,
    shkiyaLaguna: ShkiyaLagunaSkin,
    zahavLaguna: ZahavLagunaSkin,
    rubyEsh: RubyEshSkin,
    shachorGraphit: ShachorGraphitSkin,
    pardesChai: PardesChaiSkin,
    bronzeSachlav: BronzeSachlavSkin,
    tehomTurkiz: TehomTurkizSkin,
    inbarAdama: InbarAdamaSkin,
    lavaLaguna: LavaLagunaSkin,
    zahavTehom: ZahavTehomSkin,
    evenNil: EvenNilSkin,
    irisChatzot: IrisChatzotSkin,
    gacheletArgaman: GacheletArgamanSkin,
    bronzeChol: BronzeCholSkin,
    hadarGachelet: HadarGacheletSkin,
    lagunaShkiya: LagunaShkiyaSkin,
    mentaGachelet: MentaGacheletSkin,
    mentaShachar: MentaShacharSkin,
    lagunaAfarsek: LagunaAfarsekSkin,
    self: SelfThemeSkin
  };
  const skinKey = template?.skinKey;
  const skin = skinModules[skinKey] || SkinBase;
  const isCustomV1 = template?.selfThemeV1 === true;
  const hasSelfTheme = Boolean(card2?.design?.selfThemeV1);
  const selfThemeEditorActive = mode === "editor" && isCustomV1 && hasSelfTheme;
  const selfThemePublicActive = mode !== "editor" && isCustomV1 && hasSelfTheme && Boolean(card2?._id);
  const selfThemeScopeActive = selfThemeEditorActive || selfThemePublicActive;
  const selfThemeVersion = Number(card2?.design?.selfThemeV1?.version) > 0 ? Number(card2.design.selfThemeV1.version) : 1;
  const selfThemeCssText = useMemo(() => {
    if (!selfThemeEditorActive) return null;
    const st = card2?.design && typeof card2.design === "object" ? card2.design.selfThemeV1 : null;
    if (!st || typeof st !== "object") return null;
    const bg = normalizeHexColor(st.bg);
    const text2 = normalizeHexColor(st.text);
    const primary = normalizeHexColor(st.primary);
    const secondary = normalizeHexColor(st.secondary);
    const onPrimary = normalizeHexColor(st.onPrimary);
    const cssLines = [];
    cssLines.push(
      `[data-cardigo-scope="card"][data-template-id="${templateId}"][data-self-theme="1"] {`
    );
    if (bg) {
      cssLines.push(`  --c-sections-all-backgronds: ${bg};`);
      const rgb = hexToRgbTriplet(bg);
      if (rgb) cssLines.push(`  --rgb-sections-all-backgronds: ${rgb};`);
      cssLines.push(`  --bg-card: ${bg};`);
      cssLines.push(`  --card-bg: var(--bg-card);`);
    }
    if (text2) {
      cssLines.push(`  --c-neutral-text: ${text2};`);
      const rgb = hexToRgbTriplet(text2);
      if (rgb) cssLines.push(`  --rgb-neutral-text: ${rgb};`);
      cssLines.push(`  --text-main: var(--c-neutral-text);`);
    }
    if (primary) {
      cssLines.push(`  --c-brand-primary: ${primary};`);
      const rgb = hexToRgbTriplet(primary);
      if (rgb) cssLines.push(`  --rgb-brand-primary: ${rgb};`);
    }
    if (secondary) {
      cssLines.push(`  --c-brand-secondary: ${secondary};`);
      const rgb = hexToRgbTriplet(secondary);
      if (rgb) cssLines.push(`  --rgb-brand-secondary: ${rgb};`);
    }
    if (onPrimary) {
      cssLines.push(`  --c-on-primary: ${onPrimary};`);
    }
    cssLines.push("}");
    return cssLines.join("\n") + "\n";
  }, [
    selfThemeEditorActive,
    templateId,
    card2?.design?.selfThemeV1?.bg,
    card2?.design?.selfThemeV1?.text,
    card2?.design?.selfThemeV1?.primary,
    card2?.design?.selfThemeV1?.secondary,
    card2?.design?.selfThemeV1?.onPrimary
  ]);
  const extraThemeClass = Array.isArray(template?.customPalettes) ? getCustomPaletteClassFromRegistry(
    template,
    card2?.design?.customPaletteKey,
    skin
  ) : void 0;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    selfThemeScopeActive ? /* @__PURE__ */ jsx(Helmet, { children: selfThemeEditorActive && selfThemeCssText ? /* @__PURE__ */ jsx("style", { children: selfThemeCssText }, "cardigo-self-theme-editor-css") : selfThemePublicActive ? /* @__PURE__ */ jsx(
      "link",
      {
        rel: "stylesheet",
        href: `/api/cards/${card2._id}/self-theme.css?v=${selfThemeVersion}`
      }
    ) : null }) : null,
    /* @__PURE__ */ jsx(
      CardLayout,
      {
        card: card2,
        supports,
        skin,
        extraThemeClass,
        mode,
        onUpgrade,
        templateId,
        selfThemeActive: selfThemeScopeActive
      }
    )
  ] });
}
function CardRenderer({ card: card2, onUpgrade, mode }) {
  return /* @__PURE__ */ jsx(TemplateRenderer, { card: card2, onUpgrade, mode });
}
const EDGE_LD_MARKER_SELECTOR = 'script[type="application/ld+json"][data-cardigo-edge-ld="1"]';
const EDGE_LD_CANONICAL_ATTR = "data-cardigo-edge-ld-canonical";
function hasTrustedEdgeJsonLd(canonicalUrl) {
  try {
    if (typeof document === "undefined") return false;
    const head = document.head;
    if (!head) return false;
    const nodes = head.querySelectorAll(EDGE_LD_MARKER_SELECTOR);
    if (!nodes || nodes.length === 0) return false;
    const current = typeof canonicalUrl === "string" ? canonicalUrl.trim() : "";
    let sawCanonicalAttr = false;
    for (const n of nodes) {
      if (n.hasAttribute(EDGE_LD_CANONICAL_ATTR)) {
        sawCanonicalAttr = true;
        if (n.getAttribute(EDGE_LD_CANONICAL_ATTR) === current) {
          return true;
        }
      }
    }
    if (sawCanonicalAttr) return false;
    return true;
  } catch {
    return false;
  }
}
const EXACT_PLACEHOLDERS = /* @__PURE__ */ new Set(["GTM-XXXXXXX", "G-XXXXXXX"]);
const BLOCKED_GTM_IDS = /* @__PURE__ */ new Set(["GTM-W6Q8DP6R"]);
const BLOCKED_PIXEL_IDS = /* @__PURE__ */ new Set(["1901625820558020"]);
function toTrimmedString(value) {
  if (value === null || value === void 0) return "";
  return String(value).trim();
}
function containsAngleBrackets(value) {
  return /[<>]/.test(value);
}
function normalizeRobots(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  if (containsAngleBrackets(raw)) return "";
  return raw;
}
function normalizeVerificationToken(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  if (containsAngleBrackets(raw)) return "";
  return raw;
}
function normalizeGtmId(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  if (EXACT_PLACEHOLDERS.has(raw)) return "";
  const normalized = raw.toUpperCase();
  if (!/^GTM-[A-Z0-9]+$/.test(normalized)) return "";
  if (BLOCKED_GTM_IDS.has(normalized)) return "";
  return normalized;
}
function normalizeGaMeasurementId(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  if (EXACT_PLACEHOLDERS.has(raw)) return "";
  const normalized = raw.toUpperCase();
  if (!/^G-[A-Z0-9]+$/.test(normalized)) return "";
  return normalized;
}
function normalizeMetaPixelId(value) {
  const raw = toTrimmedString(value);
  if (!raw) return "";
  if (!/^[0-9]{5,20}$/.test(raw)) return "";
  if (BLOCKED_PIXEL_IDS.has(raw)) return "";
  return raw;
}
function buildGtmSnippet(gtmId) {
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
}
function buildGtagInitSnippet(gaMeasurementId) {
  return `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${gaMeasurementId}');`;
}
function buildMetaPixelSnippet(metaPixelId) {
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`;
}
function safeJsonParse(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null) return null;
    if (typeof parsed !== "object" && !Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function normalizeJsonLdItems(jsonLd, jsonLdItems) {
  const items = [];
  const existing = safeJsonParse(jsonLd);
  if (existing) items.push(existing);
  const extra = Array.isArray(jsonLdItems) ? jsonLdItems : [];
  for (const item2 of extra) {
    if (!item2) continue;
    items.push(item2);
  }
  return items;
}
function SeoHelmet({
  title: title2,
  description,
  robots,
  googleSiteVerification,
  facebookDomainVerification,
  canonicalUrl,
  url,
  image: image2,
  ogType = "website",
  jsonLd,
  jsonLdItems,
  gtmId,
  gaMeasurementId,
  metaPixelId,
  articlePublishedTime,
  articleModifiedTime,
  articleAuthor,
  imageAlt,
  suppressSiteName = false
}) {
  const scripts = normalizeJsonLdItems(jsonLd, jsonLdItems);
  const robotsNormalized = normalizeRobots(robots);
  const googleSiteVerificationNormalized = normalizeVerificationToken(
    googleSiteVerification
  );
  const facebookDomainVerificationNormalized = normalizeVerificationToken(
    facebookDomainVerification
  );
  const gtmIdNormalized = normalizeGtmId(gtmId);
  const gaMeasurementIdNormalized = normalizeGaMeasurementId(gaMeasurementId);
  const metaPixelIdNormalized = normalizeMetaPixelId(metaPixelId);
  const trackingMode = gtmIdNormalized ? "gtm" : gaMeasurementIdNormalized ? "ga" : metaPixelIdNormalized ? "pixel" : "none";
  const [suppressJsonLd, setSuppressJsonLd] = useState(
    () => hasTrustedEdgeJsonLd(canonicalUrl)
  );
  useEffect(() => {
    setSuppressJsonLd(hasTrustedEdgeJsonLd(canonicalUrl));
  }, [canonicalUrl]);
  const suppressEdgeManagedMeta = suppressJsonLd;
  return /* @__PURE__ */ jsxs(Helmet, { children: [
    title2 ? /* @__PURE__ */ jsx("title", { children: title2 }) : null,
    !suppressEdgeManagedMeta && description ? /* @__PURE__ */ jsx("meta", { name: "description", content: description }) : null,
    !suppressEdgeManagedMeta && canonicalUrl ? /* @__PURE__ */ jsx("link", { rel: "canonical", href: canonicalUrl }) : null,
    robotsNormalized ? /* @__PURE__ */ jsx("meta", { name: "robots", content: robotsNormalized }) : null,
    googleSiteVerificationNormalized ? /* @__PURE__ */ jsx(
      "meta",
      {
        name: "google-site-verification",
        content: googleSiteVerificationNormalized
      }
    ) : null,
    facebookDomainVerificationNormalized ? /* @__PURE__ */ jsx(
      "meta",
      {
        name: "facebook-domain-verification",
        content: facebookDomainVerificationNormalized
      }
    ) : null,
    /* @__PURE__ */ jsx("meta", { property: "og:locale", content: "he_IL" }),
    !suppressSiteName ? /* @__PURE__ */ jsx("meta", { property: "og:site_name", content: "Cardigo" }) : null,
    /* @__PURE__ */ jsx("meta", { property: "og:type", content: ogType }),
    !suppressEdgeManagedMeta && title2 ? /* @__PURE__ */ jsx("meta", { property: "og:title", content: title2 }) : null,
    !suppressEdgeManagedMeta && description ? /* @__PURE__ */ jsx("meta", { property: "og:description", content: description }) : null,
    !suppressEdgeManagedMeta && image2 ? /* @__PURE__ */ jsx("meta", { property: "og:image", content: image2 }) : null,
    !suppressEdgeManagedMeta && image2 && imageAlt ? /* @__PURE__ */ jsx("meta", { property: "og:image:alt", content: imageAlt }) : null,
    !suppressEdgeManagedMeta && url ? /* @__PURE__ */ jsx("meta", { property: "og:url", content: url }) : null,
    articlePublishedTime ? /* @__PURE__ */ jsx(
      "meta",
      {
        property: "article:published_time",
        content: articlePublishedTime
      }
    ) : null,
    articleModifiedTime ? /* @__PURE__ */ jsx(
      "meta",
      {
        property: "article:modified_time",
        content: articleModifiedTime
      }
    ) : null,
    articleAuthor ? /* @__PURE__ */ jsx("meta", { property: "article:author", content: articleAuthor }) : null,
    /* @__PURE__ */ jsx(
      "meta",
      {
        name: "twitter:card",
        content: image2 ? "summary_large_image" : "summary"
      }
    ),
    !suppressEdgeManagedMeta && title2 ? /* @__PURE__ */ jsx("meta", { name: "twitter:title", content: title2 }) : null,
    !suppressEdgeManagedMeta && description ? /* @__PURE__ */ jsx("meta", { name: "twitter:description", content: description }) : null,
    !suppressEdgeManagedMeta && image2 ? /* @__PURE__ */ jsx("meta", { name: "twitter:image", content: image2 }) : null,
    image2 && imageAlt ? /* @__PURE__ */ jsx("meta", { name: "twitter:image:alt", content: imageAlt }) : null,
    trackingMode === "gtm" ? /* @__PURE__ */ jsx("script", { children: buildGtmSnippet(gtmIdNormalized) }, "gtm-inline") : null,
    trackingMode === "ga" ? /* @__PURE__ */ jsx(
      "script",
      {
        async: true,
        src: `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementIdNormalized}`
      },
      "gtag-src"
    ) : null,
    trackingMode === "ga" ? /* @__PURE__ */ jsx("script", { children: buildGtagInitSnippet(gaMeasurementIdNormalized) }, "gtag-inline") : null,
    trackingMode === "pixel" ? /* @__PURE__ */ jsx("script", { children: buildMetaPixelSnippet(metaPixelIdNormalized) }, "pixel-inline") : null,
    !suppressJsonLd && scripts.map((obj, index) => /* @__PURE__ */ jsx(
      "script",
      {
        type: "application/ld+json",
        children: JSON.stringify(obj).replace(
          /<\/script>/gi,
          "<\\/script>"
        )
      },
      `jsonld-${index}`
    ))
  ] });
}
const publicPage = "_publicPage_1whb0_1";
const publicContainer = "_publicContainer_1whb0_17";
const styles = {
  publicPage,
  publicContainer
};
function toPlainText(value) {
  if (value === null || value === void 0) return "";
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function cleanPlatformBrand(s) {
  if (!s) return "";
  let v = String(s).replace(/\s+/g, " ").trim();
  v = v.replace(/\s+[-–]\s*(?:Cardigo|כרדיגו)\s*$/i, "").trim();
  v = v.replace(/\s*\|\s*(?:Cardigo|כרדיגו)\s*$/i, "").trim();
  v = v.replace(/^(?:Cardigo|כרדיגו)\s*[-–]\s*/i, "").trim();
  return v;
}
function buildFaqJsonLd(card2, canonicalUrl) {
  const faq = card2?.faq && typeof card2.faq === "object" ? card2.faq : null;
  const rawItems = Array.isArray(faq?.items) ? faq.items : [];
  const items = rawItems.map((item2) => {
    if (!item2 || typeof item2 !== "object") return null;
    const q = toPlainText(item2.q);
    const a = toPlainText(item2.a);
    if (!q || !a) return null;
    return { q, a };
  }).filter(Boolean);
  if (!items.length) return null;
  const canonicalResolved = typeof canonicalUrl === "string" ? canonicalUrl.trim() : "";
  const faqId = canonicalResolved ? `${canonicalResolved}#faq` : void 0;
  const isPartOf = canonicalResolved ? { "@id": canonicalResolved } : void 0;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...faqId ? { "@id": faqId } : {},
    ...canonicalResolved ? { url: canonicalResolved } : {},
    // TODO: bind to card.locale/lang when contract is introduced.
    inLanguage: "he",
    ...isPartOf ? { isPartOf } : {},
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.a
      }
    }))
  };
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
function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}
function normalizeAbsoluteUrl(origin, value) {
  const rawValue = typeof value === "string" ? value.trim() : "";
  if (!rawValue) return "";
  if (isAbsoluteUrl(rawValue)) return rawValue;
  const safeOrigin = typeof origin === "string" ? origin.trim() : "";
  const originTrimmed = safeOrigin.replace(/\/$/, "");
  if (!originTrimmed) return rawValue;
  if (rawValue.startsWith("/")) return `${originTrimmed}${rawValue}`;
  return `${originTrimmed}/${rawValue}`;
}
const SLUG_MOVED_PERSONAL_PATH_RE = /^\/card\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MOVED_ORG_PATH_RE = /^\/c\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
function isSafeSlugMovedRedirectPath(value) {
  if (typeof value !== "string") return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
    return false;
  }
  return SLUG_MOVED_PERSONAL_PATH_RE.test(value) || SLUG_MOVED_ORG_PATH_RE.test(value);
}
function sanitizeLocationFieldsForNonPremiumJsonLd(rawJsonLd) {
  if (!rawJsonLd) return rawJsonLd;
  let parsed;
  try {
    parsed = JSON.parse(rawJsonLd);
  } catch {
    return rawJsonLd;
  }
  function sanitizeItem(item2) {
    if (!item2 || typeof item2 !== "object" || Array.isArray(item2)) {
      return item2;
    }
    const t = item2["@type"];
    const isLocalBusiness = t === "LocalBusiness" || Array.isArray(t) && t.includes("LocalBusiness");
    if (!isLocalBusiness) return item2;
    const {
      geo: _geo,
      latitude: _lat,
      longitude: _lng,
      address: rawAddress,
      ...rest
    } = item2;
    const result = { ...rest };
    if (rawAddress && typeof rawAddress === "object" && !Array.isArray(rawAddress)) {
      const { streetAddress: _sa, ...addressRest } = rawAddress;
      if (Object.keys(addressRest).length > 0) {
        result.address = addressRest;
      }
    }
    return result;
  }
  try {
    const sanitized = Array.isArray(parsed) ? parsed.map(sanitizeItem) : sanitizeItem(parsed);
    return JSON.stringify(sanitized);
  } catch {
    return rawJsonLd;
  }
}
function PublicCard() {
  const { slug, orgSlug } = useParams();
  const routeKey = orgSlug ? `c/${orgSlug}/${slug}` : `card/${slug}`;
  const initialCardData = useInitialDetailData(routeKey);
  const [card2, setCard] = useState(() => initialCardData ?? null);
  const [loading2, setLoading] = useState(!initialCardData);
  const [loadedRouteKey, setLoadedRouteKey] = useState(
    () => initialCardData ? routeKey : null
  );
  const [error2, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const trackedRef = useRef(false);
  const navigate = useNavigate();
  const slugMovedNavigatedRef = useRef(false);
  const [cardConsentAllowed, setCardConsentAllowed] = useState(
    () => getCardConsentState()?.ownerTrackingAllowed ?? false
  );
  const [hasEdgeFallback, setHasEdgeFallback] = useState(false);
  useEffect(() => {
    setHasEdgeFallback(
      Boolean(document.getElementById("cardigo-body-fallback"))
    );
  }, []);
  useEffect(() => {
    if (initialCardData) {
      setCard(initialCardData);
      setLoadedRouteKey(routeKey);
      setLoading(false);
      setError(null);
      setErrorStatus(null);
      return;
    }
    let cancelled = false;
    async function loadCard() {
      setLoadedRouteKey(null);
      setCard(null);
      setLoading(true);
      setError(null);
      setErrorStatus(null);
      try {
        const data = orgSlug ? await getCompanyCardBySlug(orgSlug, slug) : await getCardBySlug(slug);
        if (cancelled) return;
        slugMovedNavigatedRef.current = false;
        setCard(data);
        setLoadedRouteKey(routeKey);
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        const data = err?.response?.data;
        if (status === 404 && data?.code === "SLUG_MOVED") {
          const redirectTo = data?.redirectTo;
          const currentPath = orgSlug ? `/c/${orgSlug}/${slug}` : `/card/${slug}`;
          if (isSafeSlugMovedRedirectPath(redirectTo) && redirectTo !== currentPath && !slugMovedNavigatedRef.current) {
            slugMovedNavigatedRef.current = true;
            navigate(redirectTo, { replace: true });
            return;
          }
        }
        if (status === 410) setError("הניסיון הסתיים");
        else setError("כרטיס לא נמצא");
        setErrorStatus(typeof status === "number" ? status : null);
        setLoadedRouteKey(routeKey);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCard();
    return () => {
      cancelled = true;
    };
  }, [slug, orgSlug, navigate, initialCardData]);
  useEffect(() => {
    if (!card2?.slug || trackedRef.current) return;
    trackedRef.current = true;
    trackView(card2.slug, void 0, void 0, orgSlug);
  }, [card2?.slug, orgSlug]);
  useEffect(() => {
    if (!card2) return;
    const fallback = document.getElementById("cardigo-body-fallback");
    if (fallback) fallback.remove();
  }, [card2]);
  const hasCurrentRouteCard = Boolean(card2 && loadedRouteKey === routeKey);
  if (loading2 || card2 && !hasCurrentRouteCard || error2 && loadedRouteKey !== routeKey) {
    return hasEdgeFallback ? null : /* @__PURE__ */ jsx("p", { children: "טוען כרטיס..." });
  }
  if (error2) {
    const errorTitle = errorStatus === 410 ? "הכרטיס אינו זמין | Cardigo" : errorStatus !== null ? "הכרטיס לא נמצא | Cardigo" : "שגיאה בטעינת הכרטיס | Cardigo";
    const errorDescription = errorStatus === 410 ? "כרטיס הביקור הדיגיטלי אינו זמין כרגע." : errorStatus !== null ? "כרטיס הביקור הדיגיטלי לא נמצא או שאינו פעיל." : "לא ניתן לטעון את כרטיס הביקור הדיגיטלי כרגע. אנא נסה שוב מאוחר יותר.";
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
        SeoHelmet,
        {
          title: errorTitle,
          description: errorDescription,
          robots: "noindex, nofollow"
        }
      ),
      /* @__PURE__ */ jsx("p", { children: error2 })
    ] });
  }
  if (!card2) return null;
  function handleUpgrade() {
    window.location.href = "/pricing";
  }
  const fallbackTitle = card2.business?.name ? `${card2.business.name} – כרטיס ביקור דיגיטלי` : "כרטיס ביקור דיגיטלי";
  const fallbackDescription = card2.content?.description?.slice(0, 160) || card2.content?.aboutText?.slice(0, 160) || "כרטיס ביקור דיגיטלי לעסקים – Cardigo";
  const title2 = card2.seoResolved?.title || fallbackTitle;
  const description = card2.seoResolved?.description || fallbackDescription;
  const image2 = card2.seoResolved?.ogImage || card2.design?.coverImage || card2.design?.logo || getPublicOrigin() + DEFAULT_OG_IMAGE_PATH;
  const cleanedTitle = cleanPlatformBrand(title2);
  const isGenericAlt = !cleanedTitle || cleanedTitle === "כרטיס ביקור דיגיטלי" || /\s[-–]\s*כרטיס ביקור דיגיטלי$/.test(cleanedTitle);
  const imageAlt = card2.seoResolved?.ogImageAlt || (!isGenericAlt ? cleanedTitle : cleanPlatformBrand(
    String(card2.business?.name || "").replace(/\s+/g, " ").trim()
  ) || "כרטיס ביקור דיגיטלי");
  const publicOrigin = getPublicOrigin();
  const selfPath = card2.publicPath || (orgSlug && card2.slug ? `/c/${orgSlug}/${card2.slug}` : card2.slug ? `/card/${card2.slug}` : "");
  const canonicalResolved = normalizeAbsoluteUrl(publicOrigin, selfPath);
  const canonicalUrl = card2.seoResolved?.canonicalUrl || canonicalResolved;
  const url = canonicalUrl;
  const faqJsonLd = buildFaqJsonLd(card2, canonicalResolved);
  const gtmIdNormalized = normalizeGtmId(card2.seo?.gtmId);
  const gaMeasurementIdNormalized = normalizeGaMeasurementId(
    card2.seo?.gaMeasurementId
  );
  const metaPixelIdNormalized = normalizeMetaPixelId(card2.seo?.metaPixelId);
  const hasOwnerThirdPartyTracker = Boolean(
    gtmIdNormalized || gaMeasurementIdNormalized || metaPixelIdNormalized
  );
  const trackingMode = cardConsentAllowed ? gtmIdNormalized ? "gtm" : gaMeasurementIdNormalized ? "ga" : metaPixelIdNormalized ? "pixel" : "none" : "none";
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    hasOwnerThirdPartyTracker ? /* @__PURE__ */ jsx(
      CardOwnerConsentBanner,
      {
        onConsentChange: setCardConsentAllowed
      }
    ) : null,
    /* @__PURE__ */ jsxs("div", { className: styles.publicPage, children: [
      /* @__PURE__ */ jsx(
        SeoHelmet,
        {
          title: title2,
          description,
          suppressSiteName: true,
          robots: card2.seoResolved?.robots || card2.seo?.robots,
          googleSiteVerification: card2.seo?.googleSiteVerification,
          facebookDomainVerification: card2.seo?.facebookDomainVerification,
          canonicalUrl,
          url,
          image: image2,
          imageAlt,
          jsonLd: card2?.entitlements?.canUseServices === true ? card2.seo?.jsonLd : sanitizeLocationFieldsForNonPremiumJsonLd(
            card2.seo?.jsonLd
          ),
          jsonLdItems: faqJsonLd ? [faqJsonLd] : [],
          gtmId: cardConsentAllowed ? card2.seo?.gtmId : void 0,
          gaMeasurementId: cardConsentAllowed ? card2.seo?.gaMeasurementId : void 0,
          metaPixelId: cardConsentAllowed ? card2.seo?.metaPixelId : void 0
        }
      ),
      trackingMode === "gtm" ? /* @__PURE__ */ jsx("noscript", { children: /* @__PURE__ */ jsx(
        "iframe",
        {
          title: "GTM",
          src: `https://www.googletagmanager.com/ns.html?id=${gtmIdNormalized}`,
          height: "0",
          width: "0",
          frameBorder: "0",
          hidden: true,
          "aria-hidden": "true"
        }
      ) }) : null,
      trackingMode === "pixel" ? /* @__PURE__ */ jsx("noscript", { children: /* @__PURE__ */ jsx(
        "img",
        {
          alt: "",
          height: "1",
          width: "1",
          src: `https://www.facebook.com/tr?id=${metaPixelIdNormalized}&ev=PageView&noscript=1`
        }
      ) }) : null,
      /* @__PURE__ */ jsx("div", { className: styles.publicContainer, children: /* @__PURE__ */ jsx(
        CardRenderer,
        {
          card: card2,
          onUpgrade: handleUpgrade,
          mode: "public"
        }
      ) })
    ] })
  ] });
}
const cardRoutes = [
  { path: "/card/:slug", element: /* @__PURE__ */ jsx(PublicCard, {}) },
  { path: "/c/:orgSlug/:slug", element: /* @__PURE__ */ jsx(PublicCard, {}) }
];
async function renderCardRoute(url, options = {}) {
  if (typeof url !== "string" || !url.startsWith("/")) {
    throw new TypeError(
      `renderCardRoute: url must be a string starting with "/", got: ${JSON.stringify(url)}`
    );
  }
  const handler = createStaticHandler(cardRoutes);
  const request = new Request("https://cardigo.co.il" + url);
  const context = await handler.query(request);
  if (context instanceof Response) {
    throw context;
  }
  const router = createStaticRouter(cardRoutes, context);
  const helmetContext = {};
  const initialDetailData = options && typeof options === "object" && options.initialDetailData ? options.initialDetailData : {};
  const html = renderToString(
    /* @__PURE__ */ jsx(HelmetProvider, { context: helmetContext, children: /* @__PURE__ */ jsx(InitialDetailDataProvider, { value: initialDetailData, children: /* @__PURE__ */ jsx(StaticRouterProvider, { router, context }) }) })
  );
  return { html, helmetContext };
}
export {
  renderCardRoute
};
