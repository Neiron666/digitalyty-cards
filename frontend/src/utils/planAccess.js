export function hasAccess(plan, feature) {
    const rules = {
        free: {
            leadForm: false,
            video: false,
            reviews: false,
            templates: [1],
        },
        monthly: {
            leadForm: true,
            video: true,
            reviews: true,
            templates: "all",
        },
        yearly: {
            leadForm: true,
            video: true,
            reviews: true,
            templates: "all",
        },
    };

    return Boolean(rules[plan]?.[feature]);
}
