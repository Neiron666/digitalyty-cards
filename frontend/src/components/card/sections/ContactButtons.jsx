import styles from "../layout/ContactButtons.module.css";
import { trackClick } from "../../../services/analytics.client";

const cx = (...classes) => classes.filter(Boolean).join(" ");

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
                    className={styles.item}
                    aria-label={`Call ${phone}`}
                    onClick={() => trackClick(card?.slug, "call")}
                >
                    <span
                        className={cx(styles.icon, styles.iconPhone)}
                        aria-hidden="true"
                    />
                </a>
            )}

            {whatsapp && (
                <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label={`Open WhatsApp chat ${whatsapp}`}
                    onClick={() => trackClick(card?.slug, "whatsapp")}
                >
                    <span
                        className={cx(styles.icon, styles.iconWhatsapp)}
                        aria-hidden="true"
                    />
                </a>
            )}

            {wazeUrl && (
                <a
                    href={wazeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Navigate with Waze"
                    onClick={() => trackClick(card?.slug, "navigate")}
                >
                    <span
                        className={cx(styles.icon, styles.iconWaze)}
                        aria-hidden="true"
                    />
                </a>
            )}

            {contact?.email && (
                <a
                    href={`mailto:${contact.email}`}
                    className={styles.item}
                    aria-label={`Email ${contact.email}`}
                    onClick={() => trackClick(card?.slug, "email")}
                >
                    <span
                        className={cx(styles.icon, styles.iconEmail)}
                        aria-hidden="true"
                    />
                </a>
            )}

            {contact?.website && (
                <a
                    href={contact.website}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Open website"
                    onClick={() => trackClick(card?.slug, "website")}
                >
                    <span
                        className={cx(styles.icon, styles.iconWebsite)}
                        aria-hidden="true"
                    />
                </a>
            )}
        </div>
    );
}

export default ContactButtons;
