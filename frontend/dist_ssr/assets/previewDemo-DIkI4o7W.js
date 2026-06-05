import { n as normalizeTemplateId, b as getTemplateById } from "./CardRenderer-C_oRPl94.js";
const DEMO_COVER_URL = "/templates/previews/demo-cover.webp";
const DEMO_AVATAR_URL = "/templates/previews/demo-avatar.webp";
const DEMO_GALLERY_URLS = [
  "/templates/previews/gallery/demo-1.webp",
  "/templates/previews/gallery/demo-2.webp",
  "/templates/previews/gallery/demo-3.webp",
  "/templates/previews/gallery/demo-4.webp",
  "/templates/previews/gallery/demo-5.webp",
  "/templates/previews/gallery/demo-6.webp"
];
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function isEmptyValue(value) {
  if (value === null || value === void 0) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}
function mergeWithDemo(realValue, demoValue) {
  if (demoValue === void 0) return realValue;
  if (isEmptyValue(realValue)) return demoValue;
  if (Array.isArray(realValue) && Array.isArray(demoValue)) {
    return realValue.length ? realValue : demoValue;
  }
  const realIsObj = realValue && typeof realValue === "object" && !Array.isArray(realValue);
  const demoIsObj = demoValue && typeof demoValue === "object" && !Array.isArray(demoValue);
  if (realIsObj && demoIsObj) {
    const keys = /* @__PURE__ */ new Set([
      ...Object.keys(demoValue),
      ...Object.keys(realValue)
    ]);
    const out = {};
    for (const key of keys) {
      out[key] = mergeWithDemo(realValue[key], demoValue[key]);
    }
    return out;
  }
  return realValue;
}
function hasAnyNonEmptyString(obj, keys) {
  if (!obj || typeof obj !== "object") return false;
  for (const k of keys) {
    if (isNonEmptyString(obj[k])) return true;
  }
  return false;
}
function hasAnyFiniteNumber(obj, keys) {
  if (!obj || typeof obj !== "object") return false;
  for (const k of keys) {
    if (typeof obj[k] === "number" && Number.isFinite(obj[k])) return true;
  }
  return false;
}
function hasAnyReviewValue(reviews) {
  if (!Array.isArray(reviews)) return false;
  for (const r of reviews) {
    if (typeof r === "string" && isNonEmptyString(r)) return true;
    if (r && typeof r === "object" && isNonEmptyString(r.text)) return true;
  }
  return false;
}
function hasAnyFaqValue(faq) {
  if (!faq || typeof faq !== "object") return false;
  if (isNonEmptyString(faq.title) || isNonEmptyString(faq.lead)) return true;
  const items = Array.isArray(faq.items) ? faq.items : [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    if (isNonEmptyString(it.q) || isNonEmptyString(it.a)) return true;
  }
  return false;
}
function hasUserBusiness(card) {
  const business = card?.business || {};
  return hasAnyNonEmptyString(business, [
    "name",
    "businessName",
    "ownerName",
    "category",
    "occupation",
    "slogan",
    "city",
    "address"
  ]) || hasAnyFiniteNumber(business, ["lat", "lng"]);
}
function hasUserContact(card) {
  const contact = card?.contact || {};
  return hasAnyNonEmptyString(contact, [
    "phone",
    "mobilePhone",
    "mobile",
    "officePhone",
    "whatsapp",
    "whatsappPhone",
    "email",
    "website"
  ]);
}
function hasUserMedia(card) {
  const design = card?.design || {};
  const hasDesignMedia = hasAnyNonEmptyString(design, [
    "backgroundImage",
    "coverImage",
    "avatarImage",
    "logo"
  ]);
  const hasGallery = Array.isArray(card?.gallery) && card.gallery.length > 0;
  return hasDesignMedia || hasGallery;
}
function hasUserSections(card) {
  const content = card?.content || {};
  const hasAbout = hasAnyNonEmptyString(content, ["aboutTitle", "aboutText"]);
  const hasReviews = hasAnyReviewValue(card?.reviews);
  const hasFaq = hasAnyFaqValue(card?.faq);
  return hasAbout || hasReviews || hasFaq;
}
function normalizeReviewsForPreview(reviews) {
  if (!Array.isArray(reviews)) return [];
  return reviews.map((r) => {
    if (typeof r === "string") {
      const text = r.trim();
      return text ? { text } : null;
    }
    if (r && typeof r === "object") {
      const text = typeof r.text === "string" ? r.text.trim() : "";
      if (!text) return null;
      return {
        text,
        name: typeof r.name === "string" ? r.name : void 0
      };
    }
    return null;
  }).filter(Boolean);
}
function buildDemoCard(templateId) {
  const normalizedTemplateId = normalizeTemplateId(templateId) || "roismanA11yLight";
  const template = getTemplateById(normalizedTemplateId);
  const placeholder = template?.previewImage;
  const coverPlaceholder = isNonEmptyString(DEMO_COVER_URL) ? DEMO_COVER_URL : placeholder;
  const avatarPlaceholder = isNonEmptyString(DEMO_AVATAR_URL) ? DEMO_AVATAR_URL : placeholder;
  const gallery = DEMO_GALLERY_URLS.map((url) => ({ url }));
  return {
    status: "draft",
    slug: "",
    business: {
      name: "דוגמא – שם העסק",
      category: " דוגמא – קטגורית העסק",
      slogan: "דוגמא – הסלוגן של העסק",
      city: "תל אביב"
    },
    contact: {
      phone: "+972-50-123-4567",
      whatsapp: "972501234567",
      email: "hello@example.com",
      website: "https://example.com"
    },
    content: {
      aboutTitle: "אודות דוגמא",
      aboutText: "טקסט דוגמא קצר כדי להראות איך הכרטיס נראה כשהוא מלא. הוסיפו את הפרטים שלכם כדי להתאים אותו לעסק."
    },
    gallery,
    reviews: [
      { text: "שירות מעולה ומקצועי. מומלץ!", name: "דוגמא" },
      { text: "חוויה מצוינת, מענה מהיר ותוצאה מדהימה.", name: "דוגמא" }
    ],
    faq: {
      title: "שאלות  – דוגמא",
      // lead: "טקסט דוגמא קצר שמסביר למה החלק הזה חשוב.",
      items: [
        {
          q: "שאלה לדוגמא 1?",
          a: "תשובה לדוגמא 1 – כאן אפשר להסביר בקצרה ובבהירות."
        },
        {
          q: "שאלה לדוגמא 2?",
          a: "תשובה לדוגמא 2 – טקסט דוגמא כדי לראות איך זה נראה בכרטיס."
        }
      ]
    },
    design: {
      templateId: normalizedTemplateId,
      backgroundImage: coverPlaceholder || null,
      avatarImage: avatarPlaceholder || null
    }
  };
}
function withDemoPreviewCard(card) {
  if (!card || typeof card !== "object") return card;
  const templateId = card?.design?.templateId;
  const mediaTouched = card?.flags?.previewLocks?.mediaTouched === true;
  const demo = buildDemoCard(templateId);
  const demoPatch = {
    // Always keep a safe fallback templateId for renderer normalization.
    design: { templateId: demo?.design?.templateId }
  };
  if (!hasUserBusiness(card)) {
    demoPatch.business = demo.business;
  }
  if (!hasUserContact(card)) {
    demoPatch.contact = demo.contact;
  }
  if (!mediaTouched && !hasUserMedia(card)) {
    demoPatch.gallery = demo.gallery;
    demoPatch.design = {
      ...demoPatch.design || {},
      backgroundImage: demo?.design?.backgroundImage,
      avatarImage: demo?.design?.avatarImage
    };
  }
  if (!hasUserSections(card)) {
    demoPatch.content = demo.content;
    demoPatch.reviews = demo.reviews;
    demoPatch.faq = demo.faq;
  }
  const merged = mergeWithDemo(card, demoPatch);
  return { ...merged, reviews: normalizeReviewsForPreview(merged.reviews) };
}
export {
  withDemoPreviewCard as w
};
