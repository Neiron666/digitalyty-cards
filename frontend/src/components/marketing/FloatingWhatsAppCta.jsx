import { buildSupportWhatsAppHref } from "../../utils/supportContact";
import styles from "./FloatingWhatsAppCta.module.css";

const href = buildSupportWhatsAppHref();

export default function FloatingWhatsAppCta() {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="פנייה ב-WhatsApp ל-Cardigo"
            className={styles.cta}
        >
            <span className={styles.icon} aria-hidden="true" />
            <span className={styles.label}>צריכים עזרה?</span>
        </a>
    );
}
