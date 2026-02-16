export const SOCIAL_STYLES = Object.freeze([
    "pills",
    "pillsWide",
    "icons",
    "iconsDense",
]);

// Rollback: use inline PNG placeholder instead of public/ paths
const PREVIEW_PLACEHOLDER_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Z2qAAAAAASUVORK5CYII=";

export const TEMPLATES = [
    {
        id: "roismanA11yLight",
        label: "Roisman A11y Light",
        name: "מפרץ",
        skinKey: "roismanA11y",
        previewImage: PREVIEW_PLACEHOLDER_PNG,
        supports: {
            backgroundImage: true,
            avatar: true,
            header: true,
            about: true,
            services: true,
            cta: true,
            socials: true,
            contact: true,
        },
        designDefaults: {
            backgroundMode: "photo",
            alignment: "left",
            socialStyle: "pills",
            fonts: { heading: "Heebo", body: "Assistant" },
            overlay: { enabled: true, color: "#000000", opacity: 0.35 },
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
            "socials",
        ],
        sampleData: {
            name: "דניאל כהן",
            headline: "יועץ עסקי • אסטרטגיה וצמיחה",
            company: "כהן קונסלטינג",
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל — בפשטות ובדיוק.",
            faq: {
                title: "שאלות ותשובות נפוצות",
                lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
                items: [
                    {
                        q: "איך מתחילים?",
                        a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות.",
                    },
                    {
                        q: "למי זה מתאים?",
                        a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת.",
                    },
                    {
                        q: "כמה זמן לוקח לראות תוצאות?",
                        a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה.",
                    },
                ],
            },
            cta: {
                label: "שיחה מהירה בוואטסאפ",
                value: "https://wa.me/972501234567",
            },
            contact: {
                phone: "+972-50-123-4567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                {
                    platform: "linkedin",
                    url: "https://www.linkedin.com/in/example",
                },
                {
                    platform: "instagram",
                    url: "https://www.instagram.com/example",
                },
            ],
        },
    },
    {
        id: "lakmi",
        label: "Lakmi",
        name: "ורד-זהב",
        skinKey: "lakmi",
        previewImage: PREVIEW_PLACEHOLDER_PNG,
        supports: {
            backgroundImage: true,
            avatar: true,
            header: true,
            about: true,
            services: true,
            cta: true,
            socials: true,
            contact: true,
        },
        designDefaults: {
            backgroundMode: "photo",
            alignment: "left",
            socialStyle: "pills",
            fonts: { heading: "Heebo", body: "Assistant" },
            overlay: { enabled: true, color: "#000000", opacity: 0.35 },
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
            "socials",
        ],
        sampleData: {
            name: "דניאל כהן",
            headline: "יועץ עסקי • אסטרטגיה וצמיחה",
            company: "כהן קונסלטינג",
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל — בפשטות ובדיוק.",
            faq: {
                title: "שאלות ותשובות נפוצות",
                lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
                items: [
                    {
                        q: "איך מתחילים?",
                        a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות.",
                    },
                    {
                        q: "למי זה מתאים?",
                        a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת.",
                    },
                    {
                        q: "כמה זמן לוקח לראות תוצאות?",
                        a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה.",
                    },
                ],
            },
            cta: {
                label: "שיחה מהירה בוואטסאפ",
                value: "https://wa.me/972501234567",
            },
            contact: {
                phone: "+972-50-123-4567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                {
                    platform: "linkedin",
                    url: "https://www.linkedin.com/in/example",
                },
                {
                    platform: "instagram",
                    url: "https://www.instagram.com/example",
                },
            ],
        },
    },
    {
        id: "galit",
        label: "Galit",
        name: "אבן-שמיים",
        skinKey: "galit",
        previewImage: PREVIEW_PLACEHOLDER_PNG,
        supports: {
            backgroundImage: true,
            avatar: true,
            header: true,
            about: true,
            services: true,
            cta: true,
            socials: true,
            contact: true,
        },
        designDefaults: {
            backgroundMode: "photo",
            alignment: "left",
            socialStyle: "pills",
            fonts: { heading: "Heebo", body: "Assistant" },
            overlay: { enabled: true, color: "#000000", opacity: 0.35 },
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
            "socials",
        ],
        sampleData: {
            name: "דניאל כהן",
            headline: "יועץ עסקי • אסטרטגיה וצמיחה",
            company: "כהן קונסלטינג",
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל — בפשטות ובדיוק.",
            faq: {
                title: "שאלות ותשובות נפוצות",
                lead: "כמה תשובות קצרות שיעזרו להבין איך מתחילים ומה קורה בתהליך.",
                items: [
                    {
                        q: "איך מתחילים?",
                        a: "מתחילים בשיחה קצרה כדי להבין את הצורך, ואז קובעים פגישה ראשונה ומגדירים מטרות ברורות.",
                    },
                    {
                        q: "למי זה מתאים?",
                        a: "למי שרוצה סדר ובהירות בתהליך, לשפר תוצאות ולקבל החלטות בצורה מדויקת ומבוססת.",
                    },
                    {
                        q: "כמה זמן לוקח לראות תוצאות?",
                        a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחושת שליטה.",
                    },
                ],
            },
            cta: {
                label: "שיחה מהירה בוואטסאפ",
                value: "https://wa.me/972501234567",
            },
            contact: {
                phone: "+972-50-123-4567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                {
                    platform: "linkedin",
                    url: "https://www.linkedin.com/in/example",
                },
                {
                    platform: "instagram",
                    url: "https://www.instagram.com/example",
                },
            ],
        },
    },

    {
        id: "customV1",
        skinKey: "custom",
        name: "עיצוב עצמי",
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
            contact: true,
        },
        // Palette-only customization (renderer applies palette classes, no inline styles)
        designDefaults: {
            templateId: "customV1",
            customPaletteKey: "gold",
            backgroundOverlay: 40,
        },
        // Source of truth: palette keys (lowercase)
        customPalettes: ["gold", "ocean", "forest"],
        defaultPaletteKey: "gold",
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
            "socials",
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
                        a: "כן. אפשר לעדכן את השאלות והתשובות בכל זמן דרך העורך.",
                    },
                    {
                        q: "זה מתאים גם ל-RTL?",
                        a: "כן. הסקשן בנוי RTL-first ומשתמש ב-flex ובערכי טוקנים.",
                    },
                    {
                        q: "האם זה משפיע על SEO?",
                        a: "כן. נוצרת גם סכמת JSON-LD מסוג FAQPage בצורה מסונכרנת מהנתונים.",
                    },
                ],
            },
            cta: { label: "Contact", value: "https://wa.me/972501112233" },
            contact: {
                phone: "+972-50-111-2233",
                email: "hello@example.com",
                website: "https://example.com",
            },
            socials: [
                {
                    platform: "instagram",
                    url: "https://www.instagram.com/example",
                },
            ],
        },
    },

    // Variant A: token-only skin; shared CardLayout skeleton.
    {
        id: "beauty",
        skinKey: "beauty",
        name: "שקד",
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
            contact: true,
        },
        designDefaults: {
            backgroundMode: "photo",
            alignment: "center",
            socialStyle: "icons",
            backgroundOverlay: 40,
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
            "socials",
        ],
        sampleData: {
            faq: {
                title: "שאלות ותשובות נפוצות",
                lead: "תשובות קצרות וברורות שיעזרו לכם להחליט במהירות.",
                items: [
                    {
                        q: "מה כלול בשירות?",
                        a: "שיחת היכרות, התאמת פתרון לצורך, וליווי קצר כדי לוודא שהכול עובד כמו שצריך.",
                    },
                    {
                        q: "אפשר לקבל הצעת מחיר?",
                        a: "כן. כתבו לי בהודעה קצרה, ואחזור אליכם עם הצעה שמתאימה בדיוק למה שאתם צריכים.",
                    },
                    {
                        q: "כמה מהר אפשר להתחיל?",
                        a: "בדרך כלל אפשר להתחיל כבר בימים הקרובים, בהתאם לזמינות ולדחיפות.",
                    },
                ],
            },
        },
    },
];

// Keep existing exports, but ensure these work with TEMPLATES above.
export function normalizeTemplateId(raw) {
    const s = String(raw || "").trim();
    return s.length ? s : "roismanA11yLight";
}

export function getTemplateById(id) {
    const normalized = normalizeTemplateId(id);
    return TEMPLATES.find((t) => t.id === normalized) || TEMPLATES[0];
}
