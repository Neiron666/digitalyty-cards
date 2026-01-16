import { useEffect, useMemo, useState } from "react";
import styles from "./FlashBanner.module.css";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function FlashBanner({
    type = "info",
    message,
    autoHideMs = 4500,
    onDismiss,
}) {
    const [open, setOpen] = useState(Boolean(message));

    useEffect(() => {
        setOpen(Boolean(message));
    }, [message]);

    const role = type === "error" ? "alert" : "status";

    const className = useMemo(() => {
        return cx(
            styles.root,
            type === "success"
                ? styles.success
                : type === "error"
                ? styles.error
                : styles.info
        );
    }, [type]);

    useEffect(() => {
        if (!open) return;
        if (!autoHideMs) return;

        const timer = setTimeout(() => {
            setOpen(false);
            onDismiss?.();
        }, autoHideMs);

        return () => clearTimeout(timer);
    }, [open, autoHideMs, onDismiss]);

    if (!open || !message) return null;

    return (
        <div className={className} role={role} aria-live="polite" dir="rtl">
            <div className={styles.body}>{message}</div>
            <button
                type="button"
                className={styles.close}
                onClick={() => {
                    setOpen(false);
                    onDismiss?.();
                }}
                aria-label="סגירה"
            >
                ×
            </button>
        </div>
    );
}
