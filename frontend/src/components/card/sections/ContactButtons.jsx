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

    const wazeHref = (contact?.waze && String(contact.waze).trim()) || wazeUrl;

    if (
        !phone &&
        !whatsapp &&
        !contact?.facebook &&
        !contact?.instagram &&
        !contact?.twitter &&
        !contact?.tiktok &&
        !contact?.email &&
        !contact?.website &&
        !wazeHref
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
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconPhone)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>טלפון</span>
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
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconWhatsapp)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>וואטסאפ</span>
                </a>
            )}

            {wazeHref && (
                <a
                    href={wazeHref}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Navigate with Waze"
                    onClick={() => trackClick(card?.slug, "navigate")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconWaze)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>ווייז</span>
                </a>
            )}

            {contact?.facebook && (
                <a
                    href={contact.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Open Facebook"
                    onClick={() => trackClick(card?.slug, "facebook")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconFacebook)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>פייסבוק</span>
                </a>
            )}

            {contact?.instagram && (
                <a
                    href={contact.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Open Instagram"
                    onClick={() => trackClick(card?.slug, "instagram")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconInstagram)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>אינסטגרם</span>
                </a>
            )}

            {contact?.twitter && (
                <a
                    href={contact.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Open X/Twitter"
                    onClick={() => trackClick(card?.slug, "twitter")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconTwitter)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>טוויטר</span>
                </a>
            )}

            {contact?.tiktok && (
                <a
                    href={contact.tiktok}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Open TikTok"
                    onClick={() => trackClick(card?.slug, "tiktok")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconTiktok)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>טיקטוק</span>
                </a>
            )}

            {contact?.email && (
                <a
                    href={`mailto:${contact.email}`}
                    className={styles.item}
                    aria-label={`Email ${contact.email}`}
                    onClick={() => trackClick(card?.slug, "email")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconEmail)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>אימייל</span>
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
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconWebsite)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>אתר</span>
                </a>
            )}
        </div>
    );
}

export default ContactButtons;
