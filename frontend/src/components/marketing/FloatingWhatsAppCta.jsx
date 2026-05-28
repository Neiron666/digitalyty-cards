import { SUPPORT_WHATSAPP_URL } from "../../utils/supportContact";
import styles from "./FloatingWhatsAppCta.module.css";

const WA_MESSAGE =
    "שלום, ראיתי את Cardigo ואני רוצה להבין איך אפשר ליצור כרטיס ביקור דיגיטלי לעסק שלי. אשמח לעזרה 👋";

const href = `${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(WA_MESSAGE)}`;

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
