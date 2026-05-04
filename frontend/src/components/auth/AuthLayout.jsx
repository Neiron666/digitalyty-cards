import SeoHelmet from "../seo/SeoHelmet";
import styles from "./AuthLayout.module.css";

export default function AuthLayout({ title, subtitle, children, footer }) {
    return (
        <>
            {/* SEO invariant: AuthLayout is auth/utility-only. It intentionally injects noindex.
                Do not reuse AuthLayout for public or marketing pages. */}
            <SeoHelmet robots="noindex, nofollow" />
            <div className={styles.wrapper}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h1>{title}</h1>
                        {subtitle && (
                            <p className={styles.subtitle}>{subtitle}</p>
                        )}
                    </div>
                    {children}
                    {footer && <div className={styles.footer}>{footer}</div>}
                </div>
            </div>
        </>
    );
}
