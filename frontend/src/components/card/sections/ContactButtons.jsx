import styles from "./ContactButtons.module.css";
import { trackClick } from "../../../services/analytics.client";

function ContactButtons({ card }) {
    const { contact, business } = card;

    const phone =
        contact?.phone ||
        contact?.mobilePhone ||
        contact?.mobile ||
        contact?.officePhone ||
        "";

    const whatsapp = contact?.whatsapp || contact?.whatsappPhone || "";

    const hasCoords =
        typeof business?.lat === "number" && typeof business?.lng === "number";

    const addressQuery = [business?.address, business?.city]
        .filter(Boolean)
        .join(", ");

    const wazeUrl = hasCoords
        ? `https://waze.com/ul?ll=${business.lat},${business.lng}&navigate=yes`
        : addressQuery
        ? `https://waze.com/ul?q=${encodeURIComponent(addressQuery)}`
        : "";

    if (
        !phone &&
        !whatsapp &&
        !contact?.email &&
        !contact?.website &&
        !wazeUrl
    ) {
        return null;
    }

    return (
        <div className={styles.buttons}>
            {phone && (
                <a
                    href={`tel:${phone}`}
                    className={styles.link}
                    aria-label={`Call ${phone}`}
                    onClick={() => trackClick(card?.slug, "call")}
                >
                    📞 התקשרו עכשיו
                </a>
            )}

            {whatsapp && (
                <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                    aria-label={`Open WhatsApp chat ${whatsapp}`}
                    onClick={() => trackClick(card?.slug, "whatsapp")}
                >
                    💬 WhatsApp
                </a>
            )}

            {wazeUrl && (
                <a
                    href={wazeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                    aria-label="Navigate with Waze"
                    onClick={() => trackClick(card?.slug, "navigate")}
                >
                    📍 ניווט לעסק
                </a>
            )}

            {contact?.email && (
                <a
                    href={`mailto:${contact.email}`}
                    className={styles.link}
                    aria-label={`Email ${contact.email}`}
                    onClick={() => trackClick(card?.slug, "email")}
                >
                    ✉️ Email
                </a>
            )}

            {contact?.website && (
                <a
                    href={contact.website}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                    aria-label="Open website"
                    onClick={() => trackClick(card?.slug, "website")}
                >
                    🌐 אתר
                </a>
            )}
        </div>
    );
}

export default ContactButtons;
