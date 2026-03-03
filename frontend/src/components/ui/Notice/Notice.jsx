import styles from "./Notice.module.css";

const VARIANTS = {
    success: { cls: styles.success, icon: "✓", role: "status", live: "polite" },
    error: { cls: styles.error, icon: "✗", role: "alert", live: "assertive" },
    info: { cls: styles.info, icon: "ℹ", role: "status", live: "polite" },
};

export default function Notice({ variant = "info", children }) {
    const v = VARIANTS[variant] ?? VARIANTS.info;
    return (
        <div
            className={`${styles.notice} ${v.cls}`}
            role={v.role}
            aria-live={v.live}
        >
            <span className={styles.icon} aria-hidden="true">
                {v.icon}
            </span>
            {children}
        </div>
    );
}
