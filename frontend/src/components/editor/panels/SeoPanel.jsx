import styles from "./Panel.module.css";

export default function SeoPanel({ seo, disabled, onChange }) {
    const value = seo || {};

    function update(key, nextValue) {
        onChange?.({ [key]: nextValue });
    }

    return (
        <div className={styles.panel}>
            <div className={styles.heading}>SEO וסקריפטים</div>

            <div className={styles.group}>
                <label className={styles.label}>
                    Title
                    <input
                        className={styles.input}
                        type="text"
                        value={value.title || ""}
                        onChange={(e) => update("title", e.target.value)}
                        disabled={disabled}
                    />
                </label>

                <label className={styles.label}>
                    Description
                    <textarea
                        className={styles.textarea}
                        rows={3}
                        value={value.description || ""}
                        onChange={(e) => update("description", e.target.value)}
                        disabled={disabled}
                    />
                </label>

                <label className={styles.label}>
                    Canonical URL
                    <input
                        className={styles.input}
                        type="url"
                        value={value.canonicalUrl || ""}
                        onChange={(e) => update("canonicalUrl", e.target.value)}
                        disabled={disabled}
                        placeholder="https://example.com/page"
                    />
                </label>

                <label className={styles.label}>
                    Robots
                    <input
                        className={styles.input}
                        type="text"
                        value={value.robots || ""}
                        onChange={(e) => update("robots", e.target.value)}
                        disabled={disabled}
                        placeholder="index, follow"
                    />
                </label>
            </div>

            <div className={styles.group}>
                <label className={styles.label}>
                    Google Site Verification
                    <input
                        className={styles.input}
                        type="text"
                        value={value.googleSiteVerification || ""}
                        onChange={(e) =>
                            update("googleSiteVerification", e.target.value)
                        }
                        disabled={disabled}
                    />
                </label>

                <label className={styles.label}>
                    Facebook Domain Verification
                    <input
                        className={styles.input}
                        type="text"
                        value={value.facebookDomainVerification || ""}
                        onChange={(e) =>
                            update("facebookDomainVerification", e.target.value)
                        }
                        disabled={disabled}
                    />
                </label>
            </div>

            <div className={styles.group}>
                <label className={styles.label}>
                    GTM ID
                    <input
                        className={styles.input}
                        type="text"
                        value={value.gtmId || ""}
                        onChange={(e) => update("gtmId", e.target.value)}
                        disabled={disabled}
                        placeholder="GTM-XXXXXXX"
                    />
                </label>

                <label className={styles.label}>
                    GA Measurement ID
                    <input
                        className={styles.input}
                        type="text"
                        value={value.gaMeasurementId || ""}
                        onChange={(e) =>
                            update("gaMeasurementId", e.target.value)
                        }
                        disabled={disabled}
                        placeholder="G-XXXXXXX"
                    />
                </label>

                <label className={styles.label}>
                    Meta Pixel ID
                    <input
                        className={styles.input}
                        type="text"
                        value={value.metaPixelId || ""}
                        onChange={(e) => update("metaPixelId", e.target.value)}
                        disabled={disabled}
                    />
                </label>
            </div>

            <div className={styles.group}>
                <label className={styles.label}>
                    JSON-LD (JSON)
                    <textarea
                        className={styles.textarea}
                        rows={6}
                        value={value.jsonLd || ""}
                        onChange={(e) => update("jsonLd", e.target.value)}
                        disabled={disabled}
                        placeholder='{"@context":"https://schema.org","@type":"LocalBusiness"}'
                    />
                </label>
            </div>
        </div>
    );
}
