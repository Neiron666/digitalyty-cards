import { useEffect, useId, useRef } from "react";
import styles from "./CancelRenewalModal.module.css";
import useFocusTrap from "../../hooks/useFocusTrap";

/**
 * CancelRenewalModal
 *
 * Presentational only — no API calls inside.
 * Caller is responsible for the async handleCancelRenewal handler.
 *
 * Props:
 *   open      {boolean}   whether to render
 *   busy      {boolean}   POST in-flight; disables buttons
 *   onConfirm {Function}  called when user confirms cancellation
 *   onClose   {Function}  called on back / Escape / backdrop
 */
export default function CancelRenewalModal({ open, busy, onConfirm, onClose }) {
    const titleId = useId();
    const bodyId = useId();

    const dialogRef = useRef(null);
    const confirmButtonRef = useRef(null);

    useFocusTrap(dialogRef, open);

    // Auto-focus primary action on open
    useEffect(() => {
        if (!open) return;
        const t = window.setTimeout(() => {
            confirmButtonRef.current?.focus?.();
        }, 0);
        return () => window.clearTimeout(t);
    }, [open]);

    // Escape closes (only when not busy)
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape" && !busy) {
                e.preventDefault();
                onClose?.();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, busy, onClose]);

    if (!open) return null;

    return (
        <div
            ref={dialogRef}
            className={styles.backdrop}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            onMouseDown={(e) => {
                if (!busy && e.target === e.currentTarget) onClose?.();
            }}
        >
            <div className={styles.modal} dir="rtl">
                <div className={styles.header}>
                    <h2 id={titleId} className={styles.title}>
                        ביטול חידוש אוטומטי
                    </h2>
                </div>

                <div id={bodyId} className={styles.body}>
                    <p className={styles.bodyLine}>
                        הכרטיס יישאר Premium עד סוף התקופה ששולמה.
                    </p>
                    <p className={styles.bodyLine}>
                        לא יתבצע חיוב נוסף לאחר מכן.
                    </p>
                    <p className={styles.bodyLine}>
                        ניתן להפעיל מחדש מנוי בעתיד דרך עמוד התמחור.
                    </p>
                </div>

                <div className={styles.actions}>
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        className={`${styles.button} ${styles.primary}`}
                        onClick={() => !busy && onConfirm?.()}
                        disabled={Boolean(busy)}
                    >
                        {busy ? (
                            <span className={styles.busyRow}>
                                <span
                                    className={styles.spinner}
                                    aria-hidden="true"
                                />
                                מבטל...
                            </span>
                        ) : (
                            "בטל את החידוש"
                        )}
                    </button>

                    <button
                        type="button"
                        className={`${styles.button} ${styles.secondary}`}
                        onClick={() => !busy && onClose?.()}
                        disabled={Boolean(busy)}
                    >
                        חזרה
                    </button>
                </div>
            </div>
        </div>
    );
}
