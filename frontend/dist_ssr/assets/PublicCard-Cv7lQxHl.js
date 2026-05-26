import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { g as getCompanyCardBySlug, a as getCardBySlug } from "./cards.service-CwGKgAdq.js";
import { t as trackView, C as CardRenderer } from "./CardRenderer-DTMXvOnI.js";
import { M as hasAcceptedCardConsent, N as saveCardConsent, O as getCardConsentState, S as SeoHelmet, P as DEFAULT_OG_IMAGE_PATH, Q as normalizeGtmId, U as normalizeGaMeasurementId, V as normalizeMetaPixelId } from "../entry-server.js";
import "./vendor-epyEJgau.js";
import "react-fast-compare";
import "invariant";
import "shallowequal";
import "qrcode.react";
import "./Notice-Rge9ZUBq.js";
import "react-dom/server";
import "axios";
const overlay = "_overlay_1wan2_1";
const banner = "_banner_1wan2_23";
const text = "_text_1wan2_65";
const actions = "_actions_1wan2_81";
const accept = "_accept_1wan2_95";
const decline = "_decline_1wan2_157";
const link = "_link_1wan2_223";
const styles$1 = {
  overlay,
  banner,
  text,
  actions,
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
      className: styles$1.overlay,
      role: "region",
      "aria-label": "הודעת פרטיות – כלי מדידה של בעל הכרטיס",
      children: /* @__PURE__ */ jsxs("div", { className: styles$1.banner, children: [
        /* @__PURE__ */ jsxs("p", { className: styles$1.text, children: [
          "האתר משתמש בקובצי Cookie 🍪 למדידה ושיפור החוויה.",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/privacy", className: styles$1.link, children: "למדיניות הפרטיות" }),
          " ",
          "ו",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/terms", className: styles$1.link, children: "תנאי השימוש" }),
          "."
        ] }),
        /* @__PURE__ */ jsxs("div", { className: styles$1.actions, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$1.accept,
              onClick: handleAccept,
              children: "אישור"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: styles$1.decline,
              onClick: handleDecline,
              children: "דחייה"
            }
          )
        ] })
      ] })
    }
  );
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
function buildFaqJsonLd(card, canonicalUrl) {
  const faq = card?.faq && typeof card.faq === "object" ? card.faq : null;
  const rawItems = Array.isArray(faq?.items) ? faq.items : [];
  const items = rawItems.map((item) => {
    if (!item || typeof item !== "object") return null;
    const q = toPlainText(item.q);
    const a = toPlainText(item.a);
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
function PublicCard() {
  const { slug, orgSlug } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const trackedRef = useRef(false);
  const navigate = useNavigate();
  const slugMovedNavigatedRef = useRef(false);
  const [cardConsentAllowed, setCardConsentAllowed] = useState(
    () => getCardConsentState()?.ownerTrackingAllowed ?? false
  );
  useEffect(() => {
    async function loadCard() {
      setError(null);
      setErrorStatus(null);
      try {
        const data = orgSlug ? await getCompanyCardBySlug(orgSlug, slug) : await getCardBySlug(slug);
        slugMovedNavigatedRef.current = false;
        setCard(data);
      } catch (err) {
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
      } finally {
        setLoading(false);
      }
    }
    loadCard();
  }, [slug, orgSlug, navigate]);
  useEffect(() => {
    if (!card?.slug || trackedRef.current) return;
    trackedRef.current = true;
    trackView(card.slug, void 0, void 0, orgSlug);
  }, [card?.slug, orgSlug]);
  if (loading) return /* @__PURE__ */ jsx("p", { children: "טוען כרטיס..." });
  if (error) {
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
      /* @__PURE__ */ jsx("p", { children: error })
    ] });
  }
  if (!card) return null;
  function handleUpgrade() {
    window.location.href = "/pricing";
  }
  const fallbackTitle = card.business?.name ? `${card.business.name} – כרטיס ביקור דיגיטלי` : "כרטיס ביקור דיגיטלי";
  const fallbackDescription = card.content?.description?.slice(0, 160) || card.content?.aboutText?.slice(0, 160) || "כרטיס ביקור דיגיטלי לעסקים – Cardigo";
  const title = card.seo?.title || fallbackTitle;
  const description = card.seo?.description || fallbackDescription;
  const image = card.design?.coverImage || card.design?.logo || getPublicOrigin() + DEFAULT_OG_IMAGE_PATH;
  const imageAltBusinessName = String(card.business?.name || "").replace(/\s+/g, " ").trim();
  const imageAlt = imageAltBusinessName ? `${imageAltBusinessName} – Cardigo` : "Cardigo – כרטיס ביקור דיגיטלי לעסקים";
  const publicOrigin = getPublicOrigin();
  const selfPath = card.publicPath || (orgSlug && card.slug ? `/c/${orgSlug}/${card.slug}` : card.slug ? `/card/${card.slug}` : "");
  const canonicalResolved = normalizeAbsoluteUrl(publicOrigin, selfPath);
  const canonicalUrl = canonicalResolved;
  const url = canonicalResolved;
  const faqJsonLd = buildFaqJsonLd(card, canonicalResolved);
  const gtmIdNormalized = normalizeGtmId(card.seo?.gtmId);
  const gaMeasurementIdNormalized = normalizeGaMeasurementId(
    card.seo?.gaMeasurementId
  );
  const metaPixelIdNormalized = normalizeMetaPixelId(card.seo?.metaPixelId);
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
          title,
          description,
          robots: card.seo?.robots,
          googleSiteVerification: card.seo?.googleSiteVerification,
          facebookDomainVerification: card.seo?.facebookDomainVerification,
          canonicalUrl,
          url,
          image,
          imageAlt,
          jsonLd: card.seo?.jsonLd,
          jsonLdItems: faqJsonLd ? [faqJsonLd] : [],
          gtmId: cardConsentAllowed ? card.seo?.gtmId : void 0,
          gaMeasurementId: cardConsentAllowed ? card.seo?.gaMeasurementId : void 0,
          metaPixelId: cardConsentAllowed ? card.seo?.metaPixelId : void 0
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
          card,
          onUpgrade: handleUpgrade,
          mode: "public"
        }
      ) })
    ] })
  ] });
}
export {
  PublicCard as default
};
