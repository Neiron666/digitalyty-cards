import React from "react";
import styles from "./PremiumExpiryBanner.module.css";

/**
 * Props:
 * - daysLeft: number
 * - onCta: () => void
 */
export default function PremiumExpiryBanner({ daysLeft, onCta }) {
    if (!Number.isFinite(daysLeft) || daysLeft < 1) return null;

    return (
        <section className={styles.root} dir="rtl" role="status">
            <div className={styles.content}>
                <div className={styles.title}>
                    {`המנוי השנתי מסתיים בעוד ${daysLeft} ימים (Annual)`}
                </div>
                <div className={styles.subtitle}>
                    כדי להמשיך לערוך ללא הפרעה, מומלץ לחדש את המנוי.
                </div>
            </div>

            <div className={styles.actions}>
                <button type="button" className={styles.cta} onClick={onCta}>
                    למחירים ולחידוש
                </button>
            </div>
        </section>
    );
}
