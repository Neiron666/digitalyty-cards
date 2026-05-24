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
        group: "light",
        previewImage:
            "/templates/previews/preview-covers/roismana11ylight.webp",
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            contact: true,
        },
        // Palette-only customization (renderer applies palette classes, no inline styles)
        designDefaults: {
            templateId: "customV1",
            backgroundOverlay: 40,
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
    },

    {
        id: "gacheletArgaman",
        label: "Gachelet Argaman",
        name: "גחלת-ארגמן",
        skinKey: "gacheletArgaman",
        group: "dark",
        previewImage:
            "/templates/previews/preview-covers/gachelet-argaman.webp",
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
                        a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה.",
                    },
                ],
            },
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
                        a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה.",
                    },
                ],
            },
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
                        a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה.",
                    },
                ],
            },
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
                        a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה.",
                    },
                ],
            },
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
                        a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה.",
                    },
                ],
            },
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
        },
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
            about: "עוזר לעסקים לבנות תהליך מכירה ברור, לשפר רווחיות ולהוציא רעיונות לפועל - בפשטות ובדיוק.",
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
                        a: "זה משתנה לפי מצב נקודת הפתיחה, אבל בדרך כלל כבר אחרי הצעדים הראשונים רואים שיפור במדדים ובתחוסת שליטה.",
                    },
                ],
            },
            cta: { label: "לפרטים נוספים", value: "https://example.com" },
            contact: {
                phone: "+972501234567",
                email: "daniel@example.com",
                website: "https://example.com",
            },
            socials: [
                { platform: "instagram", url: "https://instagram.com/example" },
                {
                    platform: "linkedin",
                    url: "https://linkedin.com/in/example",
                },
                { platform: "facebook", url: "https://facebook.com/example" },
            ],
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

// ---------------------------------------------------------------------------
// Self-theme effective palette resolution
// ---------------------------------------------------------------------------

const SELF_THEME_FALLBACK_PALETTE = {
    bg: "#ffffff",
    text: "#1a1a1a",
    primary: "#a9863e",
    secondary: "#c18aa8",
    onPrimary: "#ffffff",
    version: 1,
};

// Self-theme seed colors mirror skin CSS variables for the custom-design entry
// flow. Keep in sync with corresponding skin module brand tokens.
const SELF_THEME_SEED_COLORS_BY_SKIN_KEY = {
    roismanA11y: {
        bg: "#ffffff",
        text: "#063037",
        primary: "#094a56",
        secondary: "#0c6a7a",
        onPrimary: "#ffffff",
    },
    lakmi: {
        bg: "#ffffff",
        text: "#1a1a1a",
        primary: "#a9863e",
        secondary: "#c18aa8",
        onPrimary: "#ffffff",
    },
    beauty: {
        bg: "#ffffff",
        text: "#1a1a1a",
        primary: "#d2a679",
        secondary: "#895827",
        onPrimary: "#ffffff",
    },
    galit: {
        bg: "#ffffff",
        text: "#1a1a1a",
        primary: "#b8a796",
        secondary: "#3c5888",
        onPrimary: "#ffffff",
    },
    irisLayla: {
        bg: "#ffffff",
        text: "#1a1a1a",
        primary: "#200772",
        secondary: "#876ed7",
        onPrimary: "#ffffff",
    },
    shkiyaLaguna: {
        bg: "#ffffff",
        text: "#1a1a1a",
        primary: "#ff7400",
        secondary: "#009999",
        onPrimary: "#ffffff",
    },
    zahavLaguna: {
        bg: "#ffffff",
        text: "#1a1a1a",
        primary: "#ffaa00",
        secondary: "#009999",
        onPrimary: "#ffffff",
    },
    rubyEsh: {
        bg: "#ffffff",
        text: "#1a1a1a",
        primary: "#a60000",
        secondary: "#ff0000",
        onPrimary: "#ffffff",
    },
    shachorGraphit: {
        bg: "#ffffff",
        text: "#1a1a1a",
        primary: "#000000",
        secondary: "#5a5a5a",
        onPrimary: "#ffffff",
    },
    pardesChai: {
        bg: "#ffffff",
        text: "#1a1a1a",
        primary: "#00cc00",
        secondary: "#ff7400",
        onPrimary: "#ffffff",
    },
    bronzeSachlav: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#a9863e",
        secondary: "#c18aa8",
        onPrimary: "#ffffff",
    },
    tehomTurkiz: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#094a56",
        secondary: "#0c6a7a",
        onPrimary: "#ffffff",
    },
    inbarAdama: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#d2a679",
        secondary: "#895827",
        onPrimary: "#ffffff",
    },
    lavaLaguna: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#ff7400",
        secondary: "#009999",
        onPrimary: "#ffffff",
    },
    zahavTehom: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#ffaa00",
        secondary: "#009999",
        onPrimary: "#ffffff",
    },
    evenNil: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#b8a796",
        secondary: "#3c5896",
        onPrimary: "#ffffff",
    },
    irisChatzot: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#5537b9",
        secondary: "#7059b9",
        onPrimary: "#ffffff",
    },
    gacheletArgaman: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#a60000",
        secondary: "#ff0000",
        onPrimary: "#ffffff",
    },
    bronzeChol: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#a9863e",
        secondary: "#d4b36f",
        onPrimary: "#ffffff",
    },
    hadarGachelet: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#00cc00",
        secondary: "#ff7400",
        onPrimary: "#ffffff",
    },
    lagunaShkiya: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#33cccc",
        secondary: "#ff9640",
        onPrimary: "#ffffff",
    },
    mentaGachelet: {
        bg: "#0a0a0a",
        text: "#ffffff",
        primary: "#36d792",
        secondary: "#ff7640",
        onPrimary: "#ffffff",
    },
    mentaShachar: {
        bg: "#ffffff",
        text: "#1a1a1a",
        primary: "#36d792",
        secondary: "#ff7640",
        onPrimary: "#ffffff",
    },
    lagunaAfarsek: {
        bg: "#ffffff",
        text: "#1a1a1a",
        primary: "#33cccc",
        secondary: "#ff9640",
        onPrimary: "#ffffff",
    },
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

export function resolveEffectiveSelfThemeV1(card) {
    const templateId = normalizeTemplateId(card?.design?.templateId);
    const template = getTemplateById(templateId);
    const seed =
        template &&
        template.selfThemeV1 !== true &&
        SELF_THEME_SEED_COLORS_BY_SKIN_KEY[template.skinKey];
    const base = seed ? seed : SELF_THEME_FALLBACK_PALETTE;

    const existing =
        card?.design && typeof card.design === "object"
            ? card.design.selfThemeV1
            : null;

    const result = {
        bg: base.bg,
        text: base.text,
        primary: base.primary,
        secondary: base.secondary,
        onPrimary: base.onPrimary,
        version: 1,
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
        if (
            typeof existing.version === "number" &&
            Number.isFinite(existing.version) &&
            existing.version >= 1
        ) {
            result.version = existing.version;
        }
    }

    return result;
}
