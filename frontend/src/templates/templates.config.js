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
        name: "Roisman A11y Light",
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
        id: "customV1",
        skinKey: "custom",
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
        defaultPaletteKey: "gold",
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
        skinKey: "beauty",
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
    return s.length ? s : "roismanA11yLight";
}

export function getTemplateById(id) {
    const normalized = normalizeTemplateId(id);
    return TEMPLATES.find((t) => t.id === normalized) || TEMPLATES[0];
}
