/**
 * cardOgLabels.js — trusted, deterministic public OG section headings + day names.
 *
 * Scope: backend raw /og HTML (crawler/social) visible section headings and
 * business-hours day names. Values are constants only (no owner input), so the
 * OG service stays pure and escape-safe. Language resolution is defensive:
 * only "ru" is honored; anything else resolves to "he".
 *
 * Hebrew values are byte-identical to the previously hardcoded strings.
 */

const OG_LABELS = Object.freeze({
    he: Object.freeze({
        about: "אודות",
        contact: "צור קשר",
        services: "שירותים",
        faq: "שאלות נפוצות",
        businessHours: "שעות פעילות",
        gallery: "גלריה",
        social: "רשתות חברתיות",
        days: Object.freeze({
            sun: "ראשון",
            mon: "שני",
            tue: "שלישי",
            wed: "רביעי",
            thu: "חמישי",
            fri: "שישי",
            sat: "שבת",
        }),
    }),
    ru: Object.freeze({
        about: "О бизнесе",
        contact: "Контакты",
        services: "Услуги",
        faq: "Частые вопросы",
        businessHours: "Часы работы",
        gallery: "Галерея",
        social: "Социальные сети",
        days: Object.freeze({
            sun: "Воскресенье",
            mon: "Понедельник",
            tue: "Вторник",
            wed: "Среда",
            thu: "Четверг",
            fri: "Пятница",
            sat: "Суббота",
        }),
    }),
});

export function getCardOgLabels(language) {
    return OG_LABELS[language === "ru" ? "ru" : "he"];
}
