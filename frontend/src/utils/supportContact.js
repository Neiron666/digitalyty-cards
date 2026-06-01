export const SUPPORT_EMAIL = "support@cardigo.co.il";
export const SUPPORT_WHATSAPP_URL = "https://wa.me/972545811900";

export const SUPPORT_WHATSAPP_MESSAGE =
    "שלום, ראיתי את Cardigo ואני רוצה להבין איך אפשר ליצור כרטיס ביקור דיגיטלי לעסק שלי. אשמח לעזרה 👋";

export function buildSupportWhatsAppHref(message = SUPPORT_WHATSAPP_MESSAGE) {
    return `${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}
