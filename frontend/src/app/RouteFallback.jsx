import styles from "./RouteFallback.module.css";

export default function RouteFallback({ label = "טוען…" } = {}) {
    return (
        <div className={styles.root} dir="rtl" role="status" aria-live="polite">
            <div className={styles.spinner} aria-hidden="true" />
            <div className={styles.label}>{label}</div>
        </div>
    );
}
