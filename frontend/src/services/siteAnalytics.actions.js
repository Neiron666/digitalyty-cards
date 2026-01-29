export const SITE_ACTIONS = Object.freeze({
    home_hero_primary_register: "home_hero_primary_register",
    home_hero_secondary_examples: "home_hero_secondary_examples",

    pricing_trial_start: "pricing_trial_start",
    pricing_premium_upgrade: "pricing_premium_upgrade",

    contact_email_click: "contact_email_click",
});

const VALUES = Object.freeze(Object.values(SITE_ACTIONS));
const SET = new Set(VALUES);

export function isKnownSiteAction(action) {
    return typeof action === "string" && SET.has(action);
}
