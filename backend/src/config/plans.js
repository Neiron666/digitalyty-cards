export const PLANS = {
    free: {
        templates: [1], // только базовый шаблон
        galleryLimit: 5,
        leadForm: false,
        video: false,
        reviews: false,
        publish: false,
        seo: false,
        analytics: false,
        slugChange: false,
    },

    monthly: {
        templates: "all",
        galleryLimit: 10,
        leadForm: true,
        video: true,
        reviews: true,
        publish: true,
        seo: true,
        analytics: true,
        slugChange: true,
    },

    yearly: {
        templates: "all",
        galleryLimit: 10,
        leadForm: true,
        video: true,
        reviews: true,
        publish: true,
        seo: true,
        analytics: true,
        slugChange: true,
    },

    org: {
        templates: "all",
        galleryLimit: 50,
        leadForm: true,
        video: true,
        reviews: true,
        publish: true,
        seo: true,
        analytics: true,
        slugChange: true,
    },
};

export const PRICES_AGOROT = {
    monthly: 3990,
    yearly: 39990,
};
