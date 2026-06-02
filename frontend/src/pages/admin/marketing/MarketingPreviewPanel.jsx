import styles from "./MarketingPreviewPanel.module.css";

// Safe server-preview panel.
//
// SECURITY: never injects HTML. Renders only the escaped plain-text preview,
// a structured summary from the frozen snapshot captured at preview time, and
// the server warnings as a plain escaped list. No dangerouslySetInnerHTML, no
// iframe, no srcDoc, no html prop, no result.html usage.

const SUMMARY_FIELDS = [
    { key: "subject", label: "נושא", ltr: false },
    { key: "previewText", label: "טקסט תצוגה מקדימה", ltr: false },
    { key: "heading", label: "כותרת", ltr: false },
    { key: "topImageUrl", label: "תמונה עליונה", ltr: true },
    { key: "ctaLabel", label: "טקסט כפתור", ltr: false },
    { key: "ctaUrl", label: "קישור כפתור", ltr: true },
];

export default function MarketingPreviewPanel({
    result,
    error,
    isLoading = false,
    isStale = false,
    submittedAt,
} = {}) {
    const snapshot = result && result.formSnapshot ? result.formSnapshot : null;
    const warnings =
        result && Array.isArray(result.warnings) ? result.warnings : [];
    const previewText =
        result && typeof result.text === "string" ? result.text : "";

    return (
        <section className={styles.root} aria-label="תצוגה מקדימה של המייל">
            <header className={styles.header}>
                <h3 className={styles.title}>תצוגת טקסט בטוחה</h3>
                <p className={styles.boundary}>
                    תצוגת HTML חזותית תיבחן בשלב נפרד.
                </p>
            </header>

            <div className={styles.body} aria-live="polite">
                {isLoading ? (
                    <p className={styles.muted}>טוען תצוגה מקדימה…</p>
                ) : error ? (
                    <p className={styles.error} role="alert">
                        {error}
                    </p>
                ) : !result ? (
                    <p className={styles.muted}>לא נוצרה תצוגה מקדימה עדיין.</p>
                ) : (
                    <>
                        {isStale ? (
                            <p className={styles.stale} role="status">
                                התצוגה המקדימה אינה מעודכנת לשינויים האחרונים.
                            </p>
                        ) : null}

                        {snapshot ? (
                            <div className={styles.summary}>
                                <h4 className={styles.sectionTitle}>סיכום</h4>
                                <dl className={styles.summaryList}>
                                    {SUMMARY_FIELDS.map((f) => (
                                        <div
                                            className={styles.summaryRow}
                                            key={f.key}
                                        >
                                            <dt className={styles.summaryKey}>
                                                {f.label}
                                            </dt>
                                            <dd
                                                className={`${styles.summaryVal} ${
                                                    f.ltr ? styles.ltr : ""
                                                }`}
                                            >
                                                {snapshot[f.key]?.trim()
                                                    ? snapshot[f.key]
                                                    : "—"}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        ) : null}

                        <div className={styles.textBlock}>
                            <h4 className={styles.sectionTitle}>תצוגת טקסט</h4>
                            <pre className={styles.textPreview}>
                                {previewText}
                            </pre>
                        </div>

                        {warnings.length > 0 ? (
                            <div className={styles.warnings}>
                                <h4 className={styles.sectionTitle}>
                                    אזהרות מהשרת
                                </h4>
                                <ul className={styles.warningList}>
                                    {warnings.map((w, i) => (
                                        <li
                                            className={styles.warningItem}
                                            key={i}
                                        >
                                            {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </section>
    );
}
