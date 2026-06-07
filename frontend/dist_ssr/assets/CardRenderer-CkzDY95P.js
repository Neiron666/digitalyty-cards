import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { H as Helmet } from "./vendor-epyEJgau.js";
import { a as api, Z as getUtm, _ as useInstallPrompt, k as ServicesIcon, W as WorkHoursIcon, $ as getPublicAvailability, a0 as createPublicBooking, a1 as createLead } from "../entry-server.js";
import { QRCodeCanvas } from "qrcode.react";
import { N as Notice } from "./Notice-Rge9ZUBq.js";
const input = "_input_sriup_1";
const textarea = "_textarea_sriup_3";
const formStyles = {
  input,
  textarea
};
const PROFILES = {
  gallery: { maxLongSide: 2048, targetBytes: 12e5, qualityStart: 0.85 },
  background: {
    maxLongSide: 1200,
    targetBytes: 5e5,
    qualityStart: 0.85
  },
  avatar: { maxLongSide: 480, targetBytes: 2e5, qualityStart: 0.85 },
  gallerythumb: {
    maxLongSide: 480,
    targetBytes: 12e4,
    qualityStart: 0.9
  }
};
const DEFAULT_PROFILE = {
  maxLongSide: 2048,
  targetBytes: 12e5,
  qualityStart: 0.85
};
let _debugChecked = false;
let _debug = false;
function isDebug() {
  if (!_debugChecked) {
    try {
      _debug = new URLSearchParams(window.location.search).get(
        "uploadDebug"
      ) === "1";
    } catch {
      _debug = false;
    }
    _debugChecked = true;
  }
  return _debug;
}
function resolveProfile(kind) {
  const k = typeof kind === "string" ? kind.trim().toLowerCase() : "";
  return PROFILES[k] || DEFAULT_PROFILE;
}
function loadImage(objectUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = objectUrl;
  });
}
function fitInside(w, h, maxSide) {
  const longSide = Math.max(w, h);
  if (longSide <= maxSide) return { width: w, height: h };
  const ratio = maxSide / longSide;
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio)
  };
}
function toBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}
function buildFileName(input2, ext) {
  if (input2 && typeof input2.name === "string" && input2.name) {
    const base = input2.name.replace(/\.[^.]+$/, "") || "upload";
    return `${base}.${ext}`;
  }
  return `upload.${ext}`;
}
async function prepareImageForUpload(input2, kind) {
  const profile = resolveProfile(kind);
  const inBytes = input2?.size ?? 0;
  if (inBytes <= profile.targetBytes) {
    if (isDebug()) {
      console.info("[prepare-image] skip", {
        kind,
        inBytes,
        reason: "within-budget"
      });
    }
    return input2;
  }
  let objectUrl = null;
  try {
    objectUrl = URL.createObjectURL(input2);
    const img = await loadImage(objectUrl);
    const inW = img.naturalWidth || img.width;
    const inH = img.naturalHeight || img.height;
    const { width: outW, height: outH } = fitInside(
      inW,
      inH,
      profile.maxLongSide
    );
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, outW, outH);
    const QUALITY_STEPS = [
      profile.qualityStart,
      profile.qualityStart - 0.1,
      profile.qualityStart - 0.2
    ];
    let bestBlob = null;
    let usedQuality = QUALITY_STEPS[0];
    for (const q of QUALITY_STEPS) {
      const blob = await toBlob(canvas, "image/jpeg", q);
      if (!blob) continue;
      bestBlob = blob;
      usedQuality = q;
      if (blob.size <= profile.targetBytes) break;
    }
    if (!bestBlob) throw new Error("toBlob returned null");
    const outName = buildFileName(input2, "jpg");
    const result = new File([bestBlob], outName, {
      type: "image/jpeg"
    });
    if (isDebug()) {
      console.info("[prepare-image] downscaled", {
        kind,
        inBytes,
        outBytes: result.size,
        inWxH: `${inW}x${inH}`,
        outWxH: `${outW}x${outH}`,
        quality: usedQuality
      });
    }
    return result;
  } catch (err) {
    if (isDebug()) {
      console.warn("[prepare-image] error fallback", {
        kind,
        error: err?.message || String(err)
      });
    }
    return input2;
  } finally {
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
      }
    }
  }
}
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
async function uploadGalleryImage(cardId, file) {
  const prepared = await prepareImageForUpload(file, "gallery");
  const formData = new FormData();
  formData.append("image", prepared, prepared.name ?? void 0);
  formData.append("cardId", cardId);
  const res = await api.post("/uploads/image", formData, {
    timeout: 12e4
  });
  return { ...res.data, url: toAbsoluteUrl(res.data?.url) };
}
async function uploadDesignAsset(cardId, file, kind) {
  const prepared = await prepareImageForUpload(file, kind || "default");
  const formData = new FormData();
  formData.append("image", prepared, prepared.name ?? void 0);
  formData.append("cardId", cardId);
  if (kind) formData.append("kind", kind);
  const res = await api.post("/uploads/asset", formData);
  return { ...res.data, url: toAbsoluteUrl(res.data?.url) };
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
function galleryItemToUrl(item2) {
  return galleryItemToOriginalUrl(item2);
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
const SELF_THEME_FALLBACK_PALETTE = {
  bg: "#ffffff",
  text: "#1a1a1a",
  primary: "#a9863e",
  secondary: "#c18aa8",
  onPrimary: "#ffffff"
};
const SELF_THEME_SEED_COLORS_BY_SKIN_KEY = {
  roismanA11y: {
    bg: "#ffffff",
    text: "#063037",
    primary: "#094a56",
    secondary: "#0c6a7a",
    onPrimary: "#ffffff"
  },
  lakmi: {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#a9863e",
    secondary: "#c18aa8",
    onPrimary: "#ffffff"
  },
  beauty: {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#d2a679",
    secondary: "#895827",
    onPrimary: "#ffffff"
  },
  galit: {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#b8a796",
    secondary: "#3c5888",
    onPrimary: "#ffffff"
  },
  irisLayla: {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#200772",
    secondary: "#876ed7",
    onPrimary: "#ffffff"
  },
  shkiyaLaguna: {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#ff7400",
    secondary: "#009999",
    onPrimary: "#ffffff"
  },
  zahavLaguna: {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#ffaa00",
    secondary: "#009999",
    onPrimary: "#ffffff"
  },
  rubyEsh: {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#a60000",
    secondary: "#ff0000",
    onPrimary: "#ffffff"
  },
  shachorGraphit: {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#000000",
    secondary: "#5a5a5a",
    onPrimary: "#ffffff"
  },
  pardesChai: {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#00cc00",
    secondary: "#ff7400",
    onPrimary: "#ffffff"
  },
  bronzeSachlav: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#a9863e",
    secondary: "#c18aa8",
    onPrimary: "#ffffff"
  },
  tehomTurkiz: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#094a56",
    secondary: "#0c6a7a",
    onPrimary: "#ffffff"
  },
  inbarAdama: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#d2a679",
    secondary: "#895827",
    onPrimary: "#ffffff"
  },
  lavaLaguna: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#ff7400",
    secondary: "#009999",
    onPrimary: "#ffffff"
  },
  zahavTehom: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#ffaa00",
    secondary: "#009999",
    onPrimary: "#ffffff"
  },
  evenNil: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#b8a796",
    secondary: "#3c5896",
    onPrimary: "#ffffff"
  },
  irisChatzot: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#5537b9",
    secondary: "#7059b9",
    onPrimary: "#ffffff"
  },
  gacheletArgaman: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#a60000",
    secondary: "#ff0000",
    onPrimary: "#ffffff"
  },
  bronzeChol: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#a9863e",
    secondary: "#d4b36f",
    onPrimary: "#ffffff"
  },
  hadarGachelet: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#00cc00",
    secondary: "#ff7400",
    onPrimary: "#ffffff"
  },
  lagunaShkiya: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#33cccc",
    secondary: "#ff9640",
    onPrimary: "#ffffff"
  },
  mentaGachelet: {
    bg: "#0a0a0a",
    text: "#ffffff",
    primary: "#36d792",
    secondary: "#ff7640",
    onPrimary: "#ffffff"
  },
  mentaShachar: {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#36d792",
    secondary: "#ff7640",
    onPrimary: "#ffffff"
  },
  lagunaAfarsek: {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#33cccc",
    secondary: "#ff9640",
    onPrimary: "#ffffff"
  }
};
function normalizeSelfThemeHex(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!raw || !raw.startsWith("#")) return null;
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    const h = raw.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return null;
}
function resolveEffectiveSelfThemeV1(card2) {
  const templateId = normalizeTemplateId(card2?.design?.templateId);
  const template = getTemplateById(templateId);
  const seed = template && template.selfThemeV1 !== true && SELF_THEME_SEED_COLORS_BY_SKIN_KEY[template.skinKey];
  const base = seed ? seed : SELF_THEME_FALLBACK_PALETTE;
  const existing = card2?.design && typeof card2.design === "object" ? card2.design.selfThemeV1 : null;
  const result = {
    bg: base.bg,
    text: base.text,
    primary: base.primary,
    secondary: base.secondary,
    onPrimary: base.onPrimary,
    version: 1
  };
  if (existing && typeof existing === "object") {
    const validBg = normalizeSelfThemeHex(existing.bg);
    if (validBg) result.bg = validBg;
    const validText = normalizeSelfThemeHex(existing.text);
    if (validText) result.text = validText;
    const validPrimary = normalizeSelfThemeHex(existing.primary);
    if (validPrimary) result.primary = validPrimary;
    const validSecondary = normalizeSelfThemeHex(existing.secondary);
    if (validSecondary) result.secondary = validSecondary;
    const validOnPrimary = normalizeSelfThemeHex(existing.onPrimary);
    if (validOnPrimary) result.onPrimary = validOnPrimary;
    if (typeof existing.version === "number" && Number.isFinite(existing.version) && existing.version >= 1) {
      result.version = existing.version;
    }
  }
  return result;
}
const STORAGE_KEY_DEVICE = "digitalyty_deviceId";
const LEGACY_OWNER_SELF_EXCLUDE_KEY = "cardigo_owner_self_exclude_v1";
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
    "website",
    "instagram",
    "facebook",
    "tiktok",
    "linkedin",
    "twitter",
    "lead",
    "booking",
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
const styles$f = {
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
function getBrandName(card2) {
  return card2?.business?.name || card2?.business?.businessName || card2?.business?.ownerName || "";
}
function isAbsoluteUrl$1(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}
function buildShareUrl(publicPath) {
  if (typeof window === "undefined") return "";
  const raw = typeof publicPath === "string" ? publicPath.trim() : "";
  if (!raw) return "";
  const origin = window.location.origin;
  if (isAbsoluteUrl$1(raw)) {
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
    triggerPrompt,
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
  return /* @__PURE__ */ jsxs("footer", { className: styles$f.footer, children: [
    shareUrl && /* @__PURE__ */ jsxs("div", { className: styles$f.shareBlock, children: [
      /* @__PURE__ */ jsx("p", { className: styles$f.shareTitle, children: brandName ? `שתפו את ${brandName}` : "שתפו" }),
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: styles$f.shareRow,
          role: "group",
          "aria-label": "שיתוף הכרטיס",
          children: [
            /* @__PURE__ */ jsx(
              "a",
              {
                href: facebookShareHref,
                target: "_blank",
                rel: "noreferrer noopener",
                className: styles$f.shareIcon,
                "aria-label": "שתף בפייסבוק",
                onClick: () => {
                  tryCopyToClipboard(shareUrl);
                  trackClick(card2?.slug, "facebook");
                },
                children: /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$f.iconFacebook,
                    "aria-hidden": "true"
                  }
                )
              }
            ),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: emailShareHref,
                className: styles$f.shareIcon,
                "aria-label": "שתף במייל",
                onClick: () => {
                  tryCopyToClipboard(shareUrl);
                  trackClick(card2?.slug, "email");
                },
                children: /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$f.iconEmail,
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
                className: styles$f.shareIcon,
                "aria-label": "שתף בוואטסאפ",
                onClick: () => {
                  tryCopyToClipboard(shareUrl);
                  trackClick(card2?.slug, "whatsapp");
                },
                children: /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: styles$f.iconWhatsapp,
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
        className: styles$f.logoWrap,
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
              className: styles$f.logoImg,
              width: "80",
              height: "28",
              loading: "lazy",
              decoding: "async"
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ jsxs("p", { className: styles$f.promo, children: [
      "נבנה ב־",
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "https://cardigo.co.il",
          target: "_blank",
          rel: "noreferrer",
          className: styles$f.promoLink,
          children: "Cardigo"
        }
      ),
      " - הדרך החכמה לכרטיס ביקור דיגיטלי מקצועי"
    ] }),
    /* @__PURE__ */ jsx(
      InstallRow,
      {
        canPrompt,
        triggerPrompt,
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
  triggerPrompt,
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
      triggerPrompt();
      return;
    }
    onToggleHighlight();
  }
  const helpClass = highlighted && helpText ? `${styles$f.installHelp} ${styles$f.installHelpHl}` : styles$f.installHelp;
  return /* @__PURE__ */ jsxs("div", { className: styles$f.installRow, children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: styles$f.installBtn,
        onClick: handleClick,
        children: "התקינו את Cardigo לאנדרואיד"
      }
    ),
    helpText && /* @__PURE__ */ jsx("p", { className: helpClass, children: helpText })
  ] });
}
const buttons = "_buttons_odcmc_1";
const item$2 = "_item_odcmc_23";
const bubble = "_bubble_odcmc_63";
const label = "_label_odcmc_149";
const icon$4 = "_icon_odcmc_167";
const iconPhone = "_iconPhone_odcmc_197";
const iconWhatsapp = "_iconWhatsapp_odcmc_205";
const iconWaze = "_iconWaze_odcmc_213";
const iconEmail = "_iconEmail_odcmc_221";
const iconWebsite = "_iconWebsite_odcmc_229";
const iconFacebook = "_iconFacebook_odcmc_239";
const iconInstagram = "_iconInstagram_odcmc_249";
const iconTiktok = "_iconTiktok_odcmc_259";
const iconTwitter = "_iconTwitter_odcmc_269";
const styles$e = {
  buttons,
  item: item$2,
  bubble,
  label,
  icon: icon$4,
  iconPhone,
  iconWhatsapp,
  iconWaze,
  iconEmail,
  iconWebsite,
  iconFacebook,
  iconInstagram,
  iconTiktok,
  iconTwitter
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
  if (opts?.extraSchemes) {
    for (const scheme of opts.extraSchemes) {
      if (lower.startsWith(`${scheme}://`)) return s;
    }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    return "";
  }
  return validateHttpUrl(`https://${s}`);
}
function extractWazeUrl(value) {
  if (!value) return "";
  const s = String(value).trim();
  if (!s) return "";
  if (!/\s/.test(s)) return s;
  const m = s.match(
    /(?:https?:\/\/(?:www\.)?waze\.com\/\S+|(?:www\.)?waze\.com\/\S+|waze:\/\/\S+)/i
  );
  return m ? stripTrailingDelimiters(m[0]) : s;
}
function stripTrailingDelimiters(url) {
  return url.replace(/[\s.,;:!?"')\]\}»״׳]+$/u, "");
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
function ContactButtons({ card: card2 }) {
  const { contact } = card2;
  const isPremium = card2?.entitlements?.canUseServices !== void 0 ? card2.entitlements.canUseServices : true;
  const phone = contact?.phone || contact?.mobilePhone || contact?.mobile || contact?.officePhone || "";
  const whatsapp = contact?.whatsapp || contact?.whatsappPhone || "";
  const telHref = normalizeForTel(phone);
  const waHref = normalizeForWaMe(whatsapp);
  const wazeHref = isPremium ? ensureHttpUrl(extractWazeUrl(contact?.waze), {
    extraSchemes: ["waze"]
  }) : "";
  const facebookHref = isPremium ? ensureHttpUrl(contact?.facebook) : "";
  const instagramHref = ensureHttpUrl(contact?.instagram);
  const twitterHref = isPremium ? ensureHttpUrl(contact?.twitter) : "";
  const tiktokHref = isPremium ? ensureHttpUrl(contact?.tiktok) : "";
  const websiteHref = ensureHttpUrl(contact?.website);
  if (!telHref && !waHref && !facebookHref && !instagramHref && !twitterHref && !tiktokHref && !contact?.email && !websiteHref && !wazeHref) {
    return null;
  }
  return /* @__PURE__ */ jsxs("div", { className: styles$e.buttons, children: [
    telHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: `tel:${telHref}`,
        className: styles$e.item,
        "aria-label": `Call ${phone || telHref}`,
        onClick: () => trackClick(card2?.slug, "call"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$e.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$e.icon, styles$e.iconPhone),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$e.label, children: "טלפון" })
        ]
      }
    ),
    waHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: `https://wa.me/${waHref}`,
        target: "_blank",
        rel: "noreferrer",
        className: styles$e.item,
        "aria-label": `Open WhatsApp chat ${whatsapp || waHref}`,
        onClick: () => trackClick(card2?.slug, "whatsapp"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$e.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$e.icon, styles$e.iconWhatsapp),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$e.label, children: "וואטסאפ" })
        ]
      }
    ),
    wazeHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: wazeHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$e.item,
        "aria-label": "Navigate with Waze",
        onClick: () => trackClick(card2?.slug, "navigate"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$e.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$e.icon, styles$e.iconWaze),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$e.label, children: "ווייז" })
        ]
      }
    ),
    facebookHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: facebookHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$e.item,
        "aria-label": "Open Facebook",
        onClick: () => trackClick(card2?.slug, "facebook"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$e.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$e.icon, styles$e.iconFacebook),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$e.label, children: "פייסבוק" })
        ]
      }
    ),
    instagramHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: instagramHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$e.item,
        "aria-label": "Open Instagram",
        onClick: () => trackClick(card2?.slug, "instagram"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$e.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$e.icon, styles$e.iconInstagram),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$e.label, children: "אינסטגרם" })
        ]
      }
    ),
    twitterHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: twitterHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$e.item,
        "aria-label": "Open X/Twitter",
        onClick: () => trackClick(card2?.slug, "twitter"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$e.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$e.icon, styles$e.iconTwitter),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$e.label, children: "טוויטר" })
        ]
      }
    ),
    tiktokHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: tiktokHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$e.item,
        "aria-label": "Open TikTok",
        onClick: () => trackClick(card2?.slug, "tiktok"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$e.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$e.icon, styles$e.iconTiktok),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$e.label, children: "טיקטוק" })
        ]
      }
    ),
    contact?.email && /* @__PURE__ */ jsxs(
      "a",
      {
        href: `mailto:${contact.email}`,
        className: styles$e.item,
        "aria-label": `Email ${contact.email}`,
        onClick: () => trackClick(card2?.slug, "email"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$e.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$e.icon, styles$e.iconEmail),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$e.label, children: "אימייל" })
        ]
      }
    ),
    websiteHref && /* @__PURE__ */ jsxs(
      "a",
      {
        href: websiteHref,
        target: "_blank",
        rel: "noreferrer",
        className: styles$e.item,
        "aria-label": "Open website",
        onClick: () => trackClick(card2?.slug, "website"),
        children: [
          /* @__PURE__ */ jsx("span", { className: styles$e.bubble, "aria-hidden": "true", children: /* @__PURE__ */ jsx(
            "span",
            {
              className: cx$3(styles$e.icon, styles$e.iconWebsite),
              "aria-hidden": "true"
            }
          ) }),
          /* @__PURE__ */ jsx("span", { className: styles$e.label, children: "אתר" })
        ]
      }
    )
  ] });
}
const actions = "_actions_21oo5_1";
const button = "_button_21oo5_13";
const actionShare = "_actionShare_21oo5_31";
const icon$3 = "_icon_21oo5_55";
const iconShare = "_iconShare_21oo5_91";
const iconSave = "_iconSave_21oo5_101";
const shareHint = "_shareHint_21oo5_131";
const styles$d = {
  actions,
  button,
  actionShare,
  icon: icon$3,
  iconShare,
  iconSave,
  shareHint
};
function getPublicOrigin() {
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
function normalizeAbsoluteUrl(origin, value) {
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
  const shareOrigin = getPublicOrigin();
  const ogPath = typeof card2?.ogPath === "string" ? card2.ogPath.trim() : "";
  const publicPathRaw = typeof card2?.publicPath === "string" ? card2.publicPath.trim() : "";
  const derivedOgPath = deriveOgPathFromPublicPath(publicPathRaw);
  const shareUrl = ogPath ? normalizeAbsoluteUrl(shareOrigin, ogPath) : derivedOgPath ? normalizeAbsoluteUrl(shareOrigin, derivedOgPath) : "";
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
  return /* @__PURE__ */ jsxs("div", { className: `${styles$d.actions}`, children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: handleShare,
        disabled: !canShare,
        className: `${styles$d.button} ${styles$d.actionShare}`,
        title: !canShare ? !published ? "אפשר לשתף רק אחרי פרסום הכרטיס" : "קישור לשיתוף לא זמין כרגע" : void 0,
        children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `${styles$d.icon} ${styles$d.iconShare}`,
              "aria-hidden": "true"
            }
          ),
          "שתף"
        ]
      }
    ),
    !canShare && /* @__PURE__ */ jsx("div", { className: styles$d.shareHint, children: !published ? "אפשר לשתף רק אחרי פרסום הכרטיס." : "קישור לשיתוף לא זמין כרגע." }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: downloadVCard,
        className: styles$d.button,
        children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `${styles$d.icon} ${styles$d.iconSave}`,
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
const styles$c = {
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
  return /* @__PURE__ */ jsxs("section", { id, className: cx$2(styles$c.section, className), children: [
    title2 && /* @__PURE__ */ jsx("h2", { className: cx$2(styles$c.title, titleClassName), children: title2 }),
    /* @__PURE__ */ jsx("div", { className: cx$2(styles$c.content, contentClassName), children })
  ] });
}
const wrap$2 = "_wrap_69vym_1";
const code = "_code_69vym_15";
const download = "_download_69vym_23";
const styles$b = {
  wrap: wrap$2,
  code,
  download
};
function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}
function QRCodeBlock({ slug, publicPath }) {
  const wrapRef = useRef(null);
  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const raw = typeof publicPath === "string" ? publicPath.trim() : "";
    if (!raw) return "";
    if (isAbsoluteUrl(raw)) {
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
  return /* @__PURE__ */ jsx(Section, { children: /* @__PURE__ */ jsxs("div", { className: styles$b.wrap, ref: wrapRef, children: [
    /* @__PURE__ */ jsx("div", { className: styles$b.code, children: /* @__PURE__ */ jsx(QRCodeCanvas, { value: url, size: 160, includeMargin: true }) }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: styles$b.download,
        onClick: handleDownload,
        children: "הורד QR"
      }
    )
  ] }) });
}
const paragraphs = "_paragraphs_mwitv_1";
const paragraph = "_paragraph_mwitv_1";
const styles$a = {
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
  return /* @__PURE__ */ jsx(Section, { title: content2.aboutTitle, children: /* @__PURE__ */ jsx("div", { className: styles$a.paragraphs, children: paragraphs2.map((text2, idx) => /* @__PURE__ */ jsx("p", { className: styles$a.paragraph, children: text2 }, idx)) }) });
}
const section$2 = "_section_12n1w_1";
const sectionTitle$1 = "_sectionTitle_12n1w_17";
const content$4 = "_content_12n1w_37";
const wrap$1 = "_wrap_12n1w_47";
const toggle$1 = "_toggle_12n1w_69";
const tabIcon$1 = "_tabIcon_12n1w_101";
const toggleText$1 = "_toggleText_12n1w_115";
const icon$2 = "_icon_12n1w_125";
const list$1 = "_list_12n1w_153";
const item$1 = "_item_12n1w_171";
const styles$9 = {
  section: section$2,
  sectionTitle: sectionTitle$1,
  content: content$4,
  wrap: wrap$1,
  toggle: toggle$1,
  tabIcon: tabIcon$1,
  toggleText: toggleText$1,
  icon: icon$2,
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
      className: styles$9.section,
      contentClassName: styles$9.content,
      children: /* @__PURE__ */ jsxs("div", { className: styles$9.wrap, children: [
        /* @__PURE__ */ jsx("h2", { className: styles$9.sectionTitle, children: services.title }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: styles$9.toggle,
            "aria-expanded": open,
            onClick: () => setOpen((v) => !v),
            children: [
              /* @__PURE__ */ jsx(ServicesIcon, { className: styles$9.tabIcon }),
              /* @__PURE__ */ jsx("span", { className: styles$9.toggleText, children: toggleLabel }),
              /* @__PURE__ */ jsx("span", { className: styles$9.icon, "aria-hidden": "true" })
            ]
          }
        ),
        open ? /* @__PURE__ */ jsx("ul", { className: styles$9.list, role: "list", children: services.items.map((item2, idx) => /* @__PURE__ */ jsx("li", { className: styles$9.item, children: item2 }, `${idx}-${item2}`)) }) : null
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
const icon$1 = "_icon_1jvq4_115";
const table = "_table_1jvq4_143";
const row = "_row_1jvq4_155";
const day = "_day_1jvq4_173";
const hours = "_hours_1jvq4_185";
const closed = "_closed_1jvq4_199";
const ranges = "_ranges_1jvq4_207";
const styles$8 = {
  section: section$1,
  sectionTitle,
  content: content$3,
  wrap,
  toggle,
  tabIcon,
  toggleText,
  icon: icon$1,
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
      className: styles$8.section,
      contentClassName: styles$8.content,
      children: /* @__PURE__ */ jsxs("div", { className: styles$8.wrap, children: [
        /* @__PURE__ */ jsx("h2", { className: styles$8.sectionTitle, children: data.title }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: styles$8.toggle,
            "aria-expanded": open,
            onClick: () => setOpen((v) => !v),
            children: [
              /* @__PURE__ */ jsx(WorkHoursIcon, { className: styles$8.tabIcon }),
              /* @__PURE__ */ jsx("span", { className: styles$8.toggleText, children: open ? "הסתר שעות פעילות" : "הצג שעות פעילות" }),
              /* @__PURE__ */ jsx("span", { className: styles$8.icon, "aria-hidden": "true" })
            ]
          }
        ),
        open ? /* @__PURE__ */ jsx("div", { className: styles$8.table, children: data.days.map((d) => /* @__PURE__ */ jsxs("div", { className: styles$8.row, children: [
          /* @__PURE__ */ jsx("div", { className: styles$8.day, children: d.label }),
          /* @__PURE__ */ jsx("div", { className: styles$8.hours, children: d.closed ? /* @__PURE__ */ jsx("span", { className: styles$8.closed, children: "סגור" }) : /* @__PURE__ */ jsx("span", { className: styles$8.ranges, children: d.intervals.map(
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
const styles$7 = {
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
const BODY_SCROLL_LOCK_CLASS = "digi-lb-open";
const SWIPE_THRESHOLD_PX$1 = 40;
const cx$1 = (...classes) => classes.filter(Boolean).join(" ");
function mod$1(n, m) {
  return (n % m + m) % m;
}
const STAGGER = [styles$7.delay0, styles$7.delay1, styles$7.delay2, styles$7.delay3];
function GallerySection({ card: card2, mode }) {
  const rawGallery = Array.isArray(card2?.gallery) ? card2.gallery : [];
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
      const alt = item2 && typeof item2 === "object" && typeof item2.alt === "string" && item2.alt.trim() ? item2.alt.trim() : `תמונה ${visibleIndex + 1} בגלריה`;
      out.push({
        id: `${fullUrl}|${createdAtPart}|${pathPart}|${rawIndex}`,
        thumbUrl,
        fullUrl,
        alt,
        rawIndex
      });
    }
    return out;
  }, [rawGallery]);
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
    revealClass: styles$7.isRevealed,
    skip: mode !== "public"
  });
  if (!hasItems) return null;
  return /* @__PURE__ */ jsxs(Section, { title: "גלריה", children: [
    /* @__PURE__ */ jsx("div", { className: styles$7.gallery, children: items.map((it, index) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        ref: revealRef,
        className: cx$1(styles$7.imageWrapper, STAGGER[index % 4]),
        onClick: (e) => openLightbox(index, e.currentTarget),
        "aria-label": `פתח תמונה ${index + 1}`,
        children: /* @__PURE__ */ jsx(
          "img",
          {
            src: it.thumbUrl,
            alt: it.alt,
            className: styles$7.image,
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
        className: styles$7.overlay,
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
        children: /* @__PURE__ */ jsxs("div", { className: styles$7.dialog, children: [
          /* @__PURE__ */ jsxs("div", { className: styles$7.topBar, children: [
            /* @__PURE__ */ jsxs("div", { className: styles$7.counter, children: [
              activeIndex + 1,
              " / ",
              items.length
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                ref: closeButtonRef,
                type: "button",
                className: styles$7.close,
                onClick: closeLightbox,
                "aria-label": "סגור",
                children: "×"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: styles$7.media, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$7.navPrev,
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
                className: styles$7.lightboxImage,
                decoding: "async"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: styles$7.navNext,
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
const styles$6 = {
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
      className: styles$6.video
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
const styles$5 = {
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
        className: styles$5.stars,
        role: "img",
        "aria-label": `דירוג ${r} מתוך 5`,
        children: Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ jsx(
          "span",
          {
            className: i < r ? styles$5.starFilled : styles$5.starEmpty,
            "aria-hidden": "true",
            children: "★"
          },
          i
        ))
      }
    );
  }
  function renderCard(item2) {
    return /* @__PURE__ */ jsx("figure", { className: styles$5.card, children: /* @__PURE__ */ jsxs("div", { className: styles$5.cardInner, children: [
      renderStars(5),
      /* @__PURE__ */ jsx("blockquote", { className: styles$5.quote, children: /* @__PURE__ */ jsxs("p", { className: styles$5.text, children: [
        "“",
        item2.text,
        "”"
      ] }) }),
      item2.name ? /* @__PURE__ */ jsx("div", { className: styles$5.author, children: item2.name }) : null
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
      className: styles$5.slider,
      tabIndex: 0,
      onKeyDown,
      onFocusCapture,
      onBlurCapture,
      "data-dir": isRTL ? "rtl" : "ltr",
      "data-reduce-motion": reduceMotion ? "true" : "false",
      children: /* @__PURE__ */ jsxs("div", { className: styles$5.frame, children: [
        /* @__PURE__ */ jsxs("div", { className: styles$5.navLayer, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: `${styles$5.btn} ${styles$5.btnPrev}`,
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
              className: `${styles$5.btn} ${styles$5.btnNext}`,
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
            className: styles$5.viewport,
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
            role: "group",
            "aria-label": "המלצות",
            children: t ? /* @__PURE__ */ jsxs(
              "div",
              {
                className: `${styles$5.stack} ${styles$5[`action_${t.action}`]} ${t.phase === "animate" ? styles$5.animating : ""}`,
                onTransitionEnd: onSlideTransitionEnd,
                children: [
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: `${styles$5.slide} ${styles$5.outgoing}`,
                      "aria-hidden": "true",
                      tabIndex: -1,
                      children: renderCard(items[t.from])
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: `${styles$5.slide} ${styles$5.incoming}`,
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
                className: styles$5.slideSingle,
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
const icon = "_icon_v68qf_241";
const answerWrap = "_answerWrap_v68qf_315";
const answer = "_answer_v68qf_315";
const styles$4 = {
  section,
  title,
  content: content$2,
  lead,
  list,
  item,
  question,
  questionText,
  icon,
  answerWrap,
  answer
};
function safeIdPart(value) {
  const raw = String(value || "").trim();
  if (!raw) return "card";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64) || "card";
}
function toPlainText(value) {
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
    const q = toPlainText(item2.q);
    const a = toPlainText(item2.a);
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
      className: styles$4.section,
      contentClassName: styles$4.content,
      titleClassName: styles$4.title,
      children: [
        faq.lead ? /* @__PURE__ */ jsx("p", { className: styles$4.lead, children: faq.lead }) : null,
        /* @__PURE__ */ jsx("ul", { className: styles$4.list, role: "list", children: faq.items.map((item2, index) => {
          const qId = `${prefix}-q${index}`;
          const aId = `${prefix}-a${index}`;
          const isOpen = openIndex === index;
          return /* @__PURE__ */ jsxs(
            "li",
            {
              className: styles$4.item,
              "data-open": isOpen ? "true" : "false",
              children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    className: styles$4.question,
                    id: qId,
                    "aria-expanded": isOpen,
                    "aria-controls": aId,
                    onClick: () => toggle2(index),
                    children: [
                      /* @__PURE__ */ jsx("span", { className: styles$4.questionText, children: item2.q }),
                      /* @__PURE__ */ jsx(
                        "span",
                        {
                          className: styles$4.icon,
                          "aria-hidden": "true"
                        }
                      )
                    ]
                  }
                ),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: styles$4.answerWrap,
                    id: aId,
                    role: "region",
                    "aria-labelledby": qId,
                    children: /* @__PURE__ */ jsx("div", { className: styles$4.answer, children: item2.a })
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
const styles$3 = {
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
    return /* @__PURE__ */ jsx(Section, { title: " תיאום תור", contentClassName: styles$3.content, children: /* @__PURE__ */ jsx("div", { className: styles$3.loading, children: "טוען זמינות…" }) });
  }
  if (loadError) {
    return /* @__PURE__ */ jsx(Section, { title: " תיאום תור", contentClassName: styles$3.content, children: /* @__PURE__ */ jsx(Notice, { variant: "error", children: loadError }) });
  }
  if (!days || days.length === 0) return null;
  if (submitStatus === "success") {
    return /* @__PURE__ */ jsx(Section, { title: " תיאום תור", contentClassName: styles$3.content, children: /* @__PURE__ */ jsx(Notice, { variant: "success", children: "בקשת התיאום התקבלה! בעל העסק ייצור איתך קשר לאישור המועד." }) });
  }
  return /* @__PURE__ */ jsxs(Section, { title: " תיאום תור", contentClassName: styles$3.content, children: [
    /* @__PURE__ */ jsx("p", { className: styles$3.intro, children: "בחרו יום ושעה מתאימים, ובעל העסק ייצור איתכם קשר לאישור." }),
    calendarGrid && /* @__PURE__ */ jsxs("div", { className: styles$3.calBlock, children: [
      /* @__PURE__ */ jsxs("div", { className: styles$3.calNav, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$3.calNavBtn,
            "aria-label": "חודש קודם",
            onClick: handlePrevMonth,
            disabled: activeMonthIndex <= 0,
            children: "‹"
          }
        ),
        /* @__PURE__ */ jsx("span", { className: styles$3.calNavTitle, children: calendarGrid.title }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$3.calNavBtn,
            "aria-label": "חודש הבא",
            onClick: handleNextMonth,
            disabled: activeMonthIndex >= monthList.length - 1,
            children: "›"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: styles$3.calRow, children: WEEKDAY_HEADERS.map((h) => /* @__PURE__ */ jsx("span", { className: styles$3.calHeaderCell, children: h }, h)) }),
      calendarGrid.rows.map((row2, ri) => /* @__PURE__ */ jsx("div", { className: styles$3.calRow, children: row2.map((cell, ci) => {
        if (cell.type === "empty") {
          return /* @__PURE__ */ jsx(
            "span",
            {
              className: styles$3.calCell
            },
            `e${ci}`
          );
        }
        const isSelected = selectedDateKey === cell.dateKey;
        const isAvailable = cell.type === "available";
        const cls = [
          styles$3.calCell,
          cell.type === "outside" ? styles$3.calCellOutside : "",
          cell.type === "inWindowUnavailable" ? styles$3.calCellInWindowUnavail : "",
          isAvailable ? styles$3.calCellAvailable : "",
          isSelected ? styles$3.calCellSelected : ""
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
    selectedDay && !selectedSlot && /* @__PURE__ */ jsxs("div", { className: styles$3.slotArea, children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$3.dismissBtn,
          "aria-label": "ביטול בחירת יום",
          onClick: () => setSelectedDateKey(null),
          children: "×"
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: styles$3.slotHeader, children: [
        WEEKDAY_LABELS[selectedDay.weekdayKey] || selectedDay.weekdayKey,
        " ",
        formatDateShort(selectedDay.dateKeyIl),
        " - בחרו שעה"
      ] }),
      availableSlots.length > 0 ? /* @__PURE__ */ jsx(
        "div",
        {
          className: styles$3.slotList,
          role: "listbox",
          "aria-label": "בחירת שעה",
          children: availableSlots.map((slot) => {
            const isSelected = selectedSlot === slot.time;
            const cls = [
              styles$3.slotBtn,
              isSelected ? styles$3.slotBtnSelected : ""
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
      ) : /* @__PURE__ */ jsx("div", { className: styles$3.noSlots, children: "אין מועדים פנויים ביום זה." })
    ] }),
    selectedSlot && selectedDay && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: styles$3.selectedSummary, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: styles$3.dismissBtn,
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
      /* @__PURE__ */ jsxs("form", { className: styles$3.form, onSubmit: handleSubmit, children: [
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
            className: styles$3.hp,
            tabIndex: -1,
            autoComplete: "off",
            "aria-hidden": "true"
          }
        ),
        /* @__PURE__ */ jsxs("label", { className: styles$3.consentRow, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: form2.consent,
              onChange: (e) => updateField("consent", e.target.checked),
              required: true
            }
          ),
          /* @__PURE__ */ jsxs("span", { className: styles$3.consentText, children: [
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
            className: styles$3.submitBtn,
            disabled: submitStatus === "submitting",
            children: submitStatus === "submitting" ? "שולח…" : "שליחת בקשה"
          }
        ),
        submitStatus === "error" && submitError && /* @__PURE__ */ jsx(Notice, { variant: "error", children: submitError })
      ] })
    ] })
  ] });
}
const paywall = "_paywall_1w74s_1";
const styles$2 = {
  paywall
};
function Paywall({ text: text2, onUpgrade }) {
  return /* @__PURE__ */ jsxs("div", { className: styles$2.paywall, children: [
    /* @__PURE__ */ jsx("p", { children: text2 }),
    /* @__PURE__ */ jsx("button", { onClick: onUpgrade, children: "שדרג עכשיו" })
  ] });
}
const content = "_content_1hntt_1";
const form = "_form_1hntt_11";
const upgradeLink = "_upgradeLink_1hntt_71";
const consentRow = "_consentRow_1hntt_97";
const consentText = "_consentText_1hntt_141";
const resetBtn = "_resetBtn_1hntt_223";
const hp = "_hp_1hntt_255";
const styles$1 = {
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
    return /* @__PURE__ */ jsx(Section, { title: "צרו קשר", contentClassName: styles$1.content, children: /* @__PURE__ */ jsx(
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
    return /* @__PURE__ */ jsxs(Section, { title: "צרו קשר", contentClassName: styles$1.content, children: [
      /* @__PURE__ */ jsx(Notice, { variant: "success", children: "תודה! פנייתך נשלחה בהצלחה" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: styles$1.resetBtn,
          onClick: handleReset,
          children: "שלח הודעה נוספת"
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsx(Section, { title: "צרו קשר", contentClassName: styles$1.content, children: /* @__PURE__ */ jsxs("form", { className: styles$1.form, onSubmit: handleSubmit, children: [
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
        className: styles$1.hp,
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
    /* @__PURE__ */ jsxs("label", { className: styles$1.consentRow, children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "checkbox",
          checked: form2.consent,
          onChange: (e) => update("consent", e.target.checked),
          required: true
        }
      ),
      /* @__PURE__ */ jsxs("span", { className: styles$1.consentText, children: [
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
          className: styles$1.upgradeLink,
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
const styles = {
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
    revealClass: styles.isRevealed,
    skip: mode !== "public"
  });
  const overlayOpacity = Math.min(0.7, Math.max(0, overlayValue / 100));
  const overlayStep = Math.min(
    70,
    Math.max(0, Math.round(overlayOpacity * 100 / 5) * 5)
  );
  const rootClass = cx(styles.root, skin?.theme, extraThemeClass);
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: rootClass,
      "data-mode": mode,
      "data-cardigo-scope": "card",
      "data-template-id": String(templateId || ""),
      "data-self-theme": selfThemeActive ? "1" : void 0,
      children: /* @__PURE__ */ jsxs("div", { className: cx(styles.card, skin?.card), children: [
        /* @__PURE__ */ jsxs("header", { className: cx(styles.hero, skin?.hero), children: [
          hasCover ? /* @__PURE__ */ jsx(
            "img",
            {
              className: styles.cover,
              src: coverUrl,
              alt: "",
              "aria-hidden": "true",
              decoding: "async",
              loading: "eager",
              referrerPolicy: "no-referrer"
            }
          ) : null,
          /* @__PURE__ */ jsx(
            "div",
            {
              className: cx(
                styles.overlay,
                styles[`overlay${overlayStep}`],
                skin?.overlay
              )
            }
          ),
          /* @__PURE__ */ jsx("div", { className: cx(styles.heroInner, skin?.heroInner), children: avatar && /* @__PURE__ */ jsx(
            "div",
            {
              ref: avatarRevealRef,
              className: cx(styles.avatarWrap, skin?.avatar),
              children: /* @__PURE__ */ jsx(
                "img",
                {
                  src: avatar,
                  alt: name2 ? `${name2} – profile photo` : "Profile photo"
                }
              )
            }
          ) }),
          /* @__PURE__ */ jsxs(
            "svg",
            {
              className: styles.heroDivider,
              viewBox: "0 0 100 20",
              preserveAspectRatio: "none",
              "aria-hidden": "true",
              focusable: "false",
              children: [
                /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M0 0 Q50 20 100 0 V20 H0 Z",
                    className: styles.heroDividerFill
                  }
                ),
                /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M0 0 Q50 20 100 0",
                    className: styles.heroDividerStroke
                  }
                )
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("main", { className: cx(styles.body, skin?.body), children: [
          /* @__PURE__ */ jsxs(
            "section",
            {
              className: cx(
                styles.headerCluster,
                skin?.headerCluster
              ),
              children: [
                /* @__PURE__ */ jsxs("div", { className: cx(styles.identity, skin?.identity), children: [
                  /* @__PURE__ */ jsxs("h1", { className: cx(styles.name, skin?.name), children: [
                    /* @__PURE__ */ jsx("span", { className: styles.nameHeadingText, children: name2 || "" }),
                    foldCategory ? /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: cx(
                          styles.subtitle,
                          styles.headingCategory,
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
                        styles.subtitle,
                        skin?.subtitle
                      ),
                      children: subtitle2
                    }
                  ) : null,
                  slogan2 ? /* @__PURE__ */ jsxs("p", { className: styles.slogan, children: [
                    '"',
                    slogan2,
                    '"'
                  ] }) : null
                ] }),
                /* @__PURE__ */ jsx("div", { className: cx(styles.socialRow, skin?.socialRow), children: /* @__PURE__ */ jsx(ContactButtons, { card: card2 }) }),
                /* @__PURE__ */ jsx("div", { className: cx(styles.ctaRow, skin?.ctaRow), children: /* @__PURE__ */ jsx(SaveContactButton, { card: card2 }) })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "section",
            {
              className: cx(styles.sectionWrap, skin?.sectionWrap),
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
                /* @__PURE__ */ jsx(BookingSection, { card: card2 }),
                /* @__PURE__ */ jsx("div", { className: cx(styles.formWrap, skin?.formWrap), children: /* @__PURE__ */ jsx(
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
        /* @__PURE__ */ jsx("footer", { className: cx(styles.footerWrap, skin?.footerWrap), children: /* @__PURE__ */ jsx(CardFooter, { card: card2 }) })
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
export {
  CardRenderer as C,
  LEGACY_OWNER_SELF_EXCLUDE_KEY as L,
  TEMPLATES as T,
  uploadDesignAsset as a,
  getTemplateById as b,
  getOwnerSelfExcludeKey as c,
  formStyles as f,
  galleryItemToUrl as g,
  normalizeTemplateId as n,
  resolveEffectiveSelfThemeV1 as r,
  trackView as t,
  uploadGalleryImage as u
};
