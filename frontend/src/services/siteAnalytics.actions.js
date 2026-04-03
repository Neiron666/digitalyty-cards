export const SITE_ACTIONS = Object.freeze({
    home_hero_primary_register: "home_hero_primary_register",
    home_hero_secondary_examples: "home_hero_secondary_examples",

    home_templates_cta: "home_templates_cta",
    home_templates_see_all: "home_templates_see_all",
    home_bottom_cta: "home_bottom_cta",

    pricing_trial_start: "pricing_trial_start",
    pricing_premium_upgrade: "pricing_premium_upgrade",
    pricing_monthly_start: "pricing_monthly_start",
    pricing_annual_start: "pricing_annual_start",

    cards_hero_cta: "cards_hero_cta",
    cards_templates_cta: "cards_templates_cta",
    cards_bottom_cta: "cards_bottom_cta",
    cards_showcase_card_cta: "cards_showcase_card_cta",
    cards_showcase_view_all_cta: "cards_showcase_view_all_cta",

    contact_email_click: "contact_email_click",
    contact_form_submit: "contact_form_submit",
    contact_whatsapp_click: "contact_whatsapp_click",
});

const VALUES = Object.freeze(Object.values(SITE_ACTIONS));
const SET = new Set(VALUES);

export function isKnownSiteAction(action) {
    return typeof action === "string" && SET.has(action);
}
