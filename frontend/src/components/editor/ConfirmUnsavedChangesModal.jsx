import { useEffect, useId, useRef } from "react";
import styles from "./ConfirmUnsavedChangesModal.module.css";

export default function ConfirmUnsavedChangesModal({
    open,
    title,
    body,
    primaryLabel,
    secondaryLabel,
    tertiaryLabel,
    onPrimary,
    onSecondary,
    onTertiary,
    busy,
}) {
    const titleId = useId();
    const bodyId = useId();

    const primaryButtonRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        // Focus primary action on open (keyboard + screen reader friendly).
        const t = window.setTimeout(() => {
            primaryButtonRef.current?.focus?.();
        }, 0);

        return () => window.clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onTertiary?.();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onTertiary]);

    if (!open) return null;

    return (
        <div
            className={styles.backdrop}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onTertiary?.();
            }}
        >
            <div className={styles.modal} dir="rtl">
                <div className={styles.header}>
                    <h2 id={titleId} className={styles.title}>
                        {title}
                    </h2>
                </div>

                <div className={styles.body}>
                    <p id={bodyId} className={styles.text}>
                        {body}
                    </p>
                </div>

                <div className={styles.actions}>
                    <button
                        ref={primaryButtonRef}
                        type="button"
                        className={`${styles.button} ${styles.primary}`}
                        onClick={() => onPrimary?.()}
                        disabled={Boolean(busy)}
                    >
                        {primaryLabel}
                    </button>

                    <button
                        type="button"
                        className={`${styles.button} ${styles.secondary}`}
                        onClick={() => onSecondary?.()}
                        disabled={Boolean(busy)}
                    >
                        {secondaryLabel}
                    </button>

                    <button
                        type="button"
                        className={`${styles.button} ${styles.tertiary}`}
                        onClick={() => onTertiary?.()}
                        disabled={Boolean(busy)}
                    >
                        {tertiaryLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
