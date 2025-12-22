export const PLANS = {
    free: {
        templates: [1], // только базовый шаблон
        galleryLimit: 5,
        leadForm: false,
        video: false,
        reviews: false,
    },

    monthly: {
        templates: "all",
        galleryLimit: 10,
        leadForm: true,
        video: true,
        reviews: true,
    },

    yearly: {
        templates: "all",
        galleryLimit: 10,
        leadForm: true,
        video: true,
        reviews: true,
    },

    org: {
        templates: "all",
        galleryLimit: 50,
        leadForm: true,
        video: true,
        reviews: true,
    },
};
