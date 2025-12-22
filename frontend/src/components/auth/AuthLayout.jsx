import styles from "./AuthLayout.module.css";

export default function AuthLayout({ title, subtitle, children, footer }) {
    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1>{title}</h1>
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>
                {children}
                {footer && <div className={styles.footer}>{footer}</div>}
            </div>
        </div>
    );
}
