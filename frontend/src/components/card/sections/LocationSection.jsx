import Section from "./Section";
import styles from "./LocationSection.module.css";
import { trackClick } from "../../../services/analytics.client";

function LocationSection({ card }) {
    const isPremium = card?.entitlements?.canUseServices === true;
    const address = String(card?.business?.address || "").trim();
    const city = String(card?.business?.city || "").trim();

    if (!isPremium || !address || !city) return null;

    const query = `${address}, ${city}, ישראל`;
    const googleHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    const wazeHref = `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;

    const mapsApiKey = String(
        import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY || "",
    ).trim();
    const embedUrl = mapsApiKey
        ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapsApiKey)}&q=${encodeURIComponent(query)}`
        : null;

    return (
        <Section title="מיקום">
            <p className={styles.address}>
                {address}, {city}
            </p>
            {embedUrl && (
                <div className={styles.mapBox}>
                    <iframe
                        className={styles.mapIframe}
                        title={`מפה: ${address}, ${city}`}
                        src={embedUrl}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </div>
            )}
            <div className={styles.navBubbles}>
                <a
                    href={googleHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.navItem}
                    aria-label={`נווט עם Google Maps: ${address}, ${city}`}
                    onClick={() => trackClick(card?.slug, "maps")}
                >
                    <span className={styles.navBubble} aria-hidden="true">
                        <span
                            className={`${styles.navIcon} ${styles.navIconMaps}`}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.navLabel}>נווט עם גוגל </span>
                </a>
                <a
                    href={wazeHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.navItem}
                    aria-label={`נווט עם Waze: ${address}, ${city}`}
                    onClick={() => trackClick(card?.slug, "waze")}
                >
                    <span className={styles.navBubble} aria-hidden="true">
                        <span
                            className={`${styles.navIcon} ${styles.navIconWaze}`}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.navLabel}>נווט עם Waze</span>
                </a>
            </div>
        </Section>
    );
}

export default LocationSection;
