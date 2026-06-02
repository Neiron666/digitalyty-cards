import { useEffect, useId, useRef } from "react";
import styles from "./MarketingTestSendConfirm.module.css";
import useFocusTrap from "../../../hooks/useFocusTrap";

// Controlled confirmation dialog for the admin marketing test-send.
//
// SECURITY: makes no network calls and holds no form/recipient data. It only
// invokes the parent onConfirm/onCancel callbacks. The parent owns the
// pendingForm and performs the single test-send request.
export default function MarketingTestSendConfirm({
    open,
    isSending = false,
    onConfirm,
    onCancel,
} = {}) {
    const titleId = useId();
    const bodyId = useId();

    const dialogRef = useRef(null);
    const confirmButtonRef = useRef(null);

    useFocusTrap(dialogRef, open);

    useEffect(() => {
        if (!open) return;

        // Focus the primary confirm action on open (keyboard + SR friendly).
        const t = window.setTimeout(() => {
            confirmButtonRef.current?.focus?.();
        }, 0);

        return () => window.clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e) => {
            // Block Esc dismissal while a send is in flight (no ambiguous state).
            if (e.key === "Escape" && !isSending) {
                e.preventDefault();
                onCancel?.();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, isSending, onCancel]);

    if (!open) return null;

    return (
        <div
            ref={dialogRef}
            className={styles.backdrop}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            onMouseDown={(e) => {
                // Backdrop dismissal only when not sending and the click is on
                // the backdrop itself (never on the modal body, never confirm).
                if (e.target === e.currentTarget && !isSending) onCancel?.();
            }}
        >
            <div className={styles.modal} dir="rtl">
                <div className={styles.header}>
                    <h2 id={titleId} className={styles.title}>
                        לאשר שליחת מבחן?
                    </h2>
                </div>

                <div className={styles.body}>
                    <p id={bodyId} className={styles.text}>
                        המייל יישלח פעם אחת בלבד לכתובת האימייל של מנהל המערכת
                        המחובר. הוא לא יישלח לרשימת הנמענים.
                    </p>
                </div>

                <div className={styles.actions}>
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        className={`${styles.button} ${styles.primary}`}
                        onClick={() => onConfirm?.()}
                        disabled={isSending}
                    >
                        {isSending ? "שולח מבחן…" : "שלחו מבחן"}
                    </button>

                    <button
                        type="button"
                        className={`${styles.button} ${styles.secondary}`}
                        onClick={() => onCancel?.()}
                        disabled={isSending}
                    >
                        ביטול
                    </button>
                </div>
            </div>
        </div>
    );
}
