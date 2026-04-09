import { useState } from "react";
import {
    hasAcceptedCardConsent,
    saveCardConsent,
} from "../../../utils/cookieConsent";
import styles from "./CardOwnerConsentBanner.module.css";
import { Link } from "react-router-dom";
export default function CardOwnerConsentBanner({ onConsentChange }) {
    const [visible, setVisible] = useState(() => !hasAcceptedCardConsent());

    if (!visible) return null;

    function handleAccept() {
        saveCardConsent(true);
        setVisible(false);
        if (onConsentChange) onConsentChange(true);
    }

    function handleDecline() {
        saveCardConsent(false);
        setVisible(false);
        if (onConsentChange) onConsentChange(false);
    }

    return (
        <aside
            className={styles.overlay}
            role="region"
            aria-label="הודעת פרטיות – כלי מדידה של בעל הכרטיס"
        >
            <div className={styles.banner}>
                <p className={styles.text}>
                    האתר עשוי להשתמש בכלי מדידה ושיווק של צדדים שלישיים בהתאם
                    להעדפות שתבחרו. מידע נוסף{" "}
                    <Link to="/privacy" className={styles.link}>
                        במדיניות הפרטיות
                    </Link>{" "}
                    ו
                    <Link to="/terms" className={styles.link}>
                        בתנאי השימוש
                    </Link>
                    .
                </p>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.accept}
                        onClick={handleAccept}
                    >
                        אישור
                    </button>
                    <button
                        type="button"
                        className={styles.decline}
                        onClick={handleDecline}
                    >
                        דחייה
                    </button>
                </div>
            </div>
        </aside>
    );
}
