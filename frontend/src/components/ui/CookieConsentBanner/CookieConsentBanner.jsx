import { useState } from "react";
import { Link } from "react-router-dom";
import {
    hasAcceptedConsent,
    acceptConsent,
    saveConsent,
} from "../../../utils/cookieConsent";
import styles from "./CookieConsentBanner.module.css";

export default function CookieConsentBanner() {
    const [visible, setVisible] = useState(() => !hasAcceptedConsent());
    const [view, setView] = useState("notice");
    const [optionalTracking, setOptionalTracking] = useState(true);

    if (!visible) return null;

    function handleAccept() {
        acceptConsent();
        setVisible(false);
    }

    function handleSavePrefs() {
        saveConsent(optionalTracking);
        setVisible(false);
    }

    return (
        <aside
            className={styles.overlay}
            role="region"
            aria-label="הודעת פרטיות ועוגיות"
        >
            <div className={styles.banner}>
                {view === "notice" ? (
                    <>
                        <p className={styles.text}>
                            האתר עשוי להשתמש בכלי מדידה ושיווק של צדדים שלישיים
                            בהתאם להעדפות שתבחרו. מידע נוסף{" "}
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
                                הבנתי
                            </button>
                            <button
                                type="button"
                                className={styles.prefsToggle}
                                onClick={() => setView("prefs")}
                            >
                                ניהול העדפות
                            </button>
                        </div>
                    </>
                ) : (
                    <div className={styles.prefsView}>
                        <div className={styles.prefRow}>
                            <span className={styles.prefLabel}>
                                עוגיות הכרחיות
                            </span>
                            <span className={styles.prefAlways}>תמיד פעיל</span>
                        </div>
                        <label className={styles.prefRow}>
                            <span className={styles.prefLabel}>
                                כלי מדידה ושיווק של צדדים שלישיים
                            </span>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={optionalTracking}
                                onChange={(e) =>
                                    setOptionalTracking(e.target.checked)
                                }
                            />
                        </label>
                        <div className={styles.prefsActions}>
                            <button
                                type="button"
                                className={styles.save}
                                onClick={handleSavePrefs}
                            >
                                שמירה
                            </button>
                            <button
                                type="button"
                                className={styles.back}
                                onClick={() => setView("notice")}
                            >
                                חזרה
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
