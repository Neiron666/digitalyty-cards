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
        id: "businessClassic",
        name: "Business Classic",
        backgroundMode: "photo",
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
            colors: {
                background: "#0B1220",
                surface: "#111B2E",
                text: "#EAF0FF",
                muted: "#A8B3CF",
                primary: "#4F7CFF",
                accent: "#22C55E",
            },
            fonts: { heading: "Heebo", body: "Assistant" },
            overlay: { enabled: true, color: "#000000", opacity: 0.35 },
        },
        seededFields: [
            "name",
            "headline",
            "company",
            "about",
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
        id: "mobileCta",
        name: "Mobile CTA",
        backgroundMode: "photo",
        previewImage: PREVIEW_PLACEHOLDER_PNG,
        supports: {
            backgroundImage: true,
            avatar: true,
            header: true,
            cta: true,
            socials: true,
            contact: true,
        },
        designDefaults: {
            backgroundMode: "photo",
            alignment: "center",
            socialStyle: "pillsWide",
            colors: {
                background: "#0A0F1F",
                surface: "#0F1A3A",
                text: "#FFFFFF",
                muted: "#B6C2E2",
                primary: "#FF3D8D",
                accent: "#38BDF8",
            },
            fonts: { heading: "Rubik", body: "Assistant" },
            overlay: { enabled: true, color: "#000000", opacity: 0.42 },
        },
        seededFields: [
            "name",
            "headline",
            "cta.label",
            "cta.value",
            "contact.phone",
            "contact.email",
            "socials",
        ],
        sampleData: {
            name: "נועה לוי",
            headline: "שיווק דיגיטלי • קמפיינים שמביאים לקוחות",
            cta: { label: "דברו איתי עכשיו", value: "tel:+972501234567" },
            contact: { phone: "+972-50-123-4567", email: "noa@example.com" },
            socials: [
                {
                    platform: "tiktok",
                    url: "https://www.tiktok.com/@example",
                },
                {
                    platform: "instagram",
                    url: "https://www.instagram.com/example",
                },
            ],
        },
    },

    {
        id: "premiumDark",
        name: "Premium Dark",
        backgroundMode: "pattern",
        previewImage: PREVIEW_PLACEHOLDER_PNG,
        supports: {
            backgroundImage: true,
            avatar: true,
            header: true,
            about: true,
            services: true,
            gallery: true,
            socials: true,
            contact: true,
        },
        designDefaults: {
            backgroundMode: "pattern",
            alignment: "left",
            socialStyle: "iconsDense",
            colors: {
                background: "#0B0B0F",
                surface: "#12121A",
                text: "#E5E7EB",
                muted: "#9CA3AF",
                primary: "#D4AF37",
                accent: "#A78BFA",
            },
            fonts: { heading: "Heebo", body: "Heebo" },
            overlay: { enabled: false, color: "#000000", opacity: 0 },
            // optional pattern hints (renderer can use or ignore safely)
            pattern: { size: 32, opacity: 0.14 },
        },
        seededFields: [
            "name",
            "headline",
            "company",
            "about",
            "services",
            "contact.phone",
            "contact.email",
            "contact.website",
            "socials",
        ],
        sampleData: {
            name: "איתי רוזן",
            headline: "סטודיו בוטיק למיתוג • פרימיום",
            company: "Rosen Studio",
            about: "מיתוג, ארט-דירקשן ועיצוב שמספר סיפור. תהליך מדויק, תוצרים נקיים, ותשומת לב לכל פרט.",
            services: ["מיתוג", "עיצוב לוגו", "שפה גרפית", "דפי נחיתה"],
            contact: {
                phone: "+972-54-987-6543",
                email: "itay@example.com",
                website: "https://example.com",
            },
            socials: [
                {
                    platform: "behance",
                    url: "https://www.behance.net/example",
                },
                {
                    platform: "linkedin",
                    url: "https://www.linkedin.com/in/example",
                },
            ],
        },
    },

    {
        id: "creativePortfolio",
        name: "Creative Portfolio",
        backgroundMode: "photo",
        previewImage: PREVIEW_PLACEHOLDER_PNG,
        supports: {
            backgroundImage: true,
            avatar: true,
            header: true,
            about: true,
            gallery: true,
            socials: true,
            contact: true,
        },
        designDefaults: {
            backgroundMode: "photo",
            alignment: "center",
            socialStyle: "icons",
            colors: {
                background: "#111827",
                surface: "#0B1220",
                text: "#F9FAFB",
                muted: "#CBD5E1",
                primary: "#60A5FA",
                accent: "#34D399",
            },
            fonts: { heading: "Rubik", body: "Assistant" },
            overlay: { enabled: true, color: "#000000", opacity: 0.28 },
        },
        seededFields: [
            "name",
            "headline",
            "about",
            "gallery",
            "contact.email",
            "contact.website",
            "socials",
        ],
        sampleData: {
            name: "מאיה בן־דוד",
            headline: "צלמת ומעצבת • פורטפוליו",
            about: "צילום, קומפוזיציה ועריכה — עם קו נקי וצבע מדויק. זמינה לשיתופי פעולה ופרויקטים.",
            gallery: [
                {
                    title: "פרויקט אורבני",
                    url: PREVIEW_PLACEHOLDER_PNG,
                },
                {
                    title: "סטודיו",
                    url: PREVIEW_PLACEHOLDER_PNG,
                },
            ],
            contact: {
                email: "maya@example.com",
                website: "https://example.com",
            },
            socials: [
                {
                    platform: "instagram",
                    url: "https://www.instagram.com/example",
                },
                {
                    platform: "youtube",
                    url: "https://www.youtube.com/@example",
                },
            ],
        },
    },

    {
        id: "minimalClean",
        name: "Minimal Clean",
        backgroundMode: "pattern",
        previewImage: PREVIEW_PLACEHOLDER_PNG,
        supports: {
            backgroundImage: true,
            avatar: true,
            header: true,
            about: true,
            cta: true,
            socials: true,
            contact: true,
        },
        designDefaults: {
            backgroundMode: "pattern",
            alignment: "left",
            socialStyle: "pills",
            colors: {
                background: "#F8FAFC",
                surface: "#FFFFFF",
                text: "#0F172A",
                muted: "#475569",
                primary: "#0EA5E9",
                accent: "#22C55E",
            },
            fonts: { heading: "Assistant", body: "Assistant" },
            overlay: { enabled: false, color: "#000000", opacity: 0 },
            pattern: { size: 24, opacity: 0.08 },
        },
        seededFields: [
            "name",
            "headline",
            "about",
            "cta.label",
            "cta.value",
            "contact.phone",
            "contact.email",
            "socials",
        ],
        sampleData: {
            name: "יעל שרון",
            headline: "מאמנת אישית • תוצאות ברוגע",
            about: "תוכנית קצרה ומעשית שמחברת בין מטרות, משמעת עצמית והרגלים. בלי רעש — עם התקדמות.",
            cta: { label: "קובעים פגישה", value: "mailto:yael@example.com" },
            contact: { phone: "+972-52-555-1212", email: "yael@example.com" },
            socials: [
                {
                    platform: "facebook",
                    url: "https://www.facebook.com/example",
                },
            ],
        },
    },

    {
        id: "customV1",
        name: "Custom (Palette)",
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
        seededFields: [
            "name",
            "headline",
            "about",
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
        name: "Beauty",
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
            "cta.label",
            "cta.value",
            "contact.phone",
            "contact.email",
            "contact.website",
            "socials",
        ],
    },
];

// Keep existing exports, but ensure these work with TEMPLATES above.
export function normalizeTemplateId(raw) {
    const s = String(raw || "").trim();
    return s.length ? s : "businessClassic";
}

export function getTemplateById(id) {
    const normalized = normalizeTemplateId(id);
    return TEMPLATES.find((t) => t.id === normalized) || TEMPLATES[0];
}
