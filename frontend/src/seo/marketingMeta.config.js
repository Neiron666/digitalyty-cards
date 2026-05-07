// Cardigo — Marketing route metadata registry (SSoT for social OG + SeoHelmet)
// Pure ESM data module: no React, no JSX, no CSS, no Node built-ins,
// no import.meta.env, no process.env, no Netlify.env, no side effects.
// Safe to import from Netlify Edge Functions (esbuild-bundled Deno isolate)
// and from Vite page components.

import { DEFAULT_OG_IMAGE_PATH } from "../utils/seoConstants.js";

export const CARDIGO_SITE_ORIGIN = "https://cardigo.co.il";

export const CARDIGO_OG_IMAGE_URL = `${CARDIGO_SITE_ORIGIN}${DEFAULT_OG_IMAGE_PATH}`;

export const MARKETING_META = Object.freeze({
    cards: Object.freeze({
        path: "/cards",
        title: "דוגמאות לכרטיסי ביקור דיגיטליים | Cardigo",
        description:
            "דוגמאות ויזואליות לכרטיסי ביקור דיגיטליים בסגנונות שונים - ראו איך Cardigo מציג עסקים, קישורים ודרכי יצירת קשר לפני שיוצרים כרטיס משלכם.",
        imageAlt: "Cardigo \u2013 דוגמאות לכרטיסי ביקור דיגיטליים",
    }),
    pricing: Object.freeze({
        path: "/pricing",
        title: "מחירים לכרטיס ביקור דיגיטלי | Cardigo",
        description:
            "המחירים של Cardigo לכרטיס ביקור דיגיטלי מקצועי: מסלול חינמי לתמיד, 10 ימי פרימיום לכל משתמש חדש, מסלול חודשי גמיש ומסלול שנתי משתלם לעסקים שרוצים נוכחות דיגיטלית מקצועית.",
        imageAlt: "Cardigo \u2013 מחירים לכרטיס ביקור דיגיטלי",
    }),
    contact: Object.freeze({
        path: "/contact",
        title: "צור קשר | Cardigo",
        description:
            "צרו קשר עם Cardigo לשאלות על כרטיס ביקור דיגיטלי לעסקים - מחירים, התאמה ודרכי התחלה.",
        imageAlt: "Cardigo \u2013 צור קשר",
    }),
    blog: Object.freeze({
        path: "/blog",
        title: "בלוג | Cardigo",
        description:
            "מאמרים, מדריכים ותובנות בנושא כרטיסי ביקור דיגיטליים, נוכחות עסקית, SEO ותקשורת חכמה עם לקוחות.",
        imageAlt: "Cardigo \u2013 בלוג",
    }),
    guides: Object.freeze({
        path: "/guides",
        title: "מדריכים | Cardigo",
        description:
            "מדריכים מעשיים, צעד אחרי צעד, על כרטיסי ביקור דיגיטליים, עיצוב כרטיס, SEO, נוכחות עסקית ושימוש בכלים הדיגיטליים של Cardigo.",
        imageAlt: "Cardigo \u2013 מדריכים",
    }),
});

export function getMarketingMeta(key) {
    return MARKETING_META[key] || null;
}

export function buildMarketingUrl(path) {
    return `${CARDIGO_SITE_ORIGIN}${path}`;
}
