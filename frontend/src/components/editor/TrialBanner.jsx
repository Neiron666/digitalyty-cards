import React from "react";
import styles from "./TrialBanner.module.css";

/**
 * Props:
 * - trialStartedAt: string | null
 * - trialEndsAt: string | null
 * - isExpired: boolean
 * - onRegister: () => void
 */
export default function TrialBanner({
    trialStartedAt,
    trialEndsAt,
    isExpired,
    onRegister,
}) {
    if (!trialStartedAt || !trialEndsAt) return null;

    const endMs = new Date(trialEndsAt).getTime();
    if (!Number.isFinite(endMs)) return null;

    const nowMs = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    const remainingDays = isExpired
        ? 0
        : Math.max(0, Math.ceil((endMs - nowMs) / msPerDay));

    const title = isExpired
        ? "תקופת הניסיון הסתיימה"
        : `נשארו לך ${remainingDays} ימים להנות מהכרטיס בחינם`;

    const subtitle = isExpired
        ? "כדי להמשיך לערוך ולשמור את הכרטיס, יש לשדרג לתוכנית בתשלום"
        : "שדרג עכשיו כדי להמשיך להשתמש בכרטיס אחרי תקופת הניסיון";

    return (
        <div
            role="status"
            dir="rtl"
            className={`${styles.root} ${
                isExpired ? styles.expired : styles.active
            }`}
        >
            <div className={styles.left}>
                <span aria-hidden="true" className={styles.icon}>
                    ⏰
                </span>

                <div>
                    <p className={styles.title}>{title}</p>
                    <p className={styles.subtitle}>{subtitle}</p>
                </div>
            </div>

            <button
                type="button"
                className={`${styles.button} ${
                    isExpired ? styles.buttonExpired : styles.buttonActive
                }`}
                onClick={onRegister}
            >
                שדרג עכשיו
            </button>
        </div>
    );
}
