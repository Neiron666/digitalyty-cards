import Panel from "./Panel";
import formStyles from "../../ui/Form.module.css";
import styles from "./SeoPanel.module.css";

export default function SeoPanel({ seo, disabled, onChange }) {
    const value = seo || {};

    function update(key, nextValue) {
        onChange?.({ [key]: nextValue });
    }

    return (
        <Panel title="SEO וסקריפטים">
            <div className={styles.stack}>
                <div className={styles.row}>
                    <label className={styles.field}>
                        <span className={styles.labelText}>Title</span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.title || ""}
                            onChange={(e) => update("title", e.target.value)}
                            disabled={disabled}
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.labelText}>Description</span>
                        <textarea
                            className={formStyles.textarea}
                            rows={3}
                            value={value.description || ""}
                            onChange={(e) =>
                                update("description", e.target.value)
                            }
                            disabled={disabled}
                        />
                    </label>
                </div>

                <div className={styles.row}>
                    <label className={styles.field}>
                        <span className={styles.labelText}>Canonical URL</span>
                        <input
                            className={formStyles.input}
                            type="url"
                            value={value.canonicalUrl || ""}
                            onChange={(e) =>
                                update("canonicalUrl", e.target.value)
                            }
                            disabled={disabled}
                            placeholder="https://example.com/page"
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.labelText}>Robots</span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.robots || ""}
                            onChange={(e) => update("robots", e.target.value)}
                            disabled={disabled}
                            placeholder="index, follow"
                        />
                    </label>
                </div>

                <div className={styles.row}>
                    <label className={styles.field}>
                        <span className={styles.labelText}>
                            Google Site Verification
                        </span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.googleSiteVerification || ""}
                            onChange={(e) =>
                                update("googleSiteVerification", e.target.value)
                            }
                            disabled={disabled}
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.labelText}>
                            Facebook Domain Verification
                        </span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.facebookDomainVerification || ""}
                            onChange={(e) =>
                                update(
                                    "facebookDomainVerification",
                                    e.target.value,
                                )
                            }
                            disabled={disabled}
                        />
                    </label>
                </div>

                <div className={styles.row}>
                    <label className={styles.field}>
                        <span className={styles.labelText}>GTM ID</span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.gtmId || ""}
                            onChange={(e) => update("gtmId", e.target.value)}
                            disabled={disabled}
                            placeholder="GTM-XXXXXXX"
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.labelText}>
                            GA Measurement ID
                        </span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.gaMeasurementId || ""}
                            onChange={(e) =>
                                update("gaMeasurementId", e.target.value)
                            }
                            disabled={disabled}
                            placeholder="G-XXXXXXX"
                        />
                    </label>

                    <label className={styles.field}>
                        <span className={styles.labelText}>Meta Pixel ID</span>
                        <input
                            className={formStyles.input}
                            type="text"
                            value={value.metaPixelId || ""}
                            onChange={(e) =>
                                update("metaPixelId", e.target.value)
                            }
                            disabled={disabled}
                        />
                    </label>
                </div>

                <div className={styles.row}>
                    <label className={styles.fieldFull}>
                        <span className={styles.labelText}>JSON-LD (JSON)</span>
                        <textarea
                            className={formStyles.textarea}
                            rows={6}
                            value={value.jsonLd || ""}
                            onChange={(e) => update("jsonLd", e.target.value)}
                            disabled={disabled}
                            placeholder='{"@context":"https://schema.org","@type":"LocalBusiness"}'
                        />
                    </label>
                </div>
            </div>
        </Panel>
    );
}
