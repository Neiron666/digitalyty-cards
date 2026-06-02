import { useState } from "react";
import styles from "./MarketingComposerForm.module.css";

// Local field limits — mirror the backend renderer contract for helper hints
// only. The backend (marketingEmailRenderer.js) remains the authority; this
// shell makes no network calls and persists nothing.
const LIMITS = {
    subject: 200,
    previewText: 200,
    heading: 150,
    bodyText: 5000,
    ctaLabel: 60,
};

const EMPTY_FORM = {
    subject: "",
    previewText: "",
    topImageUrl: "",
    heading: "",
    bodyText: "",
    ctaLabel: "",
    ctaUrl: "",
};

const EMPTY_TOUCHED = {
    subject: false,
    bodyText: false,
};

export default function MarketingComposerForm({
    onPreview,
    isPreviewing = false,
    isPreviewStale = false,
    onComposerChange,
    onComposerReset,
    onTestSend,
    isSending = false,
    sendDisabled = false,
    sendDisabledByFlag = false,
    sendResult,
    sendError,
} = {}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [touched, setTouched] = useState(EMPTY_TOUCHED);

    function setField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
        onComposerChange?.();
    }

    function markTouched(name) {
        setTouched((prev) => ({ ...prev, [name]: true }));
    }

    function onReset() {
        setForm(EMPTY_FORM);
        setTouched(EMPTY_TOUCHED);
        onComposerReset?.();
    }

    const subjectMissing = touched.subject && form.subject.trim() === "";
    const bodyMissing = touched.bodyText && form.bodyText.trim() === "";

    const ctaLabelFilled = form.ctaLabel.trim() !== "";
    const ctaUrlFilled = form.ctaUrl.trim() !== "";
    const ctaLabelWithoutUrl = ctaLabelFilled && !ctaUrlFilled;
    const ctaUrlWithoutLabel = ctaUrlFilled && !ctaLabelFilled;

    const ctaPairingValid = !ctaLabelWithoutUrl && !ctaUrlWithoutLabel;
    const canPreview =
        !isPreviewing &&
        form.subject.trim() !== "" &&
        form.bodyText.trim() !== "" &&
        ctaPairingValid;

    function handlePreviewClick() {
        if (!canPreview) return;
        onPreview?.(form);
    }

    const canTestSend =
        !isPreviewing &&
        !isSending &&
        !sendDisabled &&
        !sendDisabledByFlag &&
        form.subject.trim() !== "" &&
        form.bodyText.trim() !== "" &&
        ctaPairingValid;

    function handleTestSendClick() {
        if (!canTestSend) return;
        onTestSend?.(form);
    }

    return (
        <section className={styles.root} aria-label="עריכת מייל שיווקי">
            <header className={styles.header}>
                <h3 className={styles.title}>עריכת מייל שיווקי</h3>
                <p className={styles.boundary}>
                    זהו שלב הכנת התוכן בלבד. תצוגה מקדימה ושליחת מבחן יופעלו
                    בשלב הבא.
                </p>
                <p className={styles.boundary}>
                    שליחה המונית לרשימת נמענים עדיין אינה פעילה.
                </p>
            </header>

            <div className={styles.fields}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="mkt-subject">
                        נושא
                        <span className={styles.req} aria-hidden="true">
                            {" "}
                            *
                        </span>
                    </label>
                    <input
                        id="mkt-subject"
                        type="text"
                        className={styles.input}
                        value={form.subject}
                        maxLength={LIMITS.subject}
                        required
                        aria-required="true"
                        aria-invalid={subjectMissing ? "true" : undefined}
                        aria-describedby="mkt-subject-counter mkt-subject-err"
                        onChange={(e) => setField("subject", e.target.value)}
                        onBlur={() => markTouched("subject")}
                    />
                    <div className={styles.fieldMeta}>
                        <span
                            id="mkt-subject-err"
                            className={styles.err}
                            role={subjectMissing ? "alert" : undefined}
                        >
                            {subjectMissing ? "נושא הוא שדה חובה" : ""}
                        </span>
                        <span
                            id="mkt-subject-counter"
                            className={styles.counter}
                        >
                            {form.subject.length}/{LIMITS.subject}
                        </span>
                    </div>
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="mkt-preview-text">
                        טקסט תצוגה מקדימה
                    </label>
                    <input
                        id="mkt-preview-text"
                        type="text"
                        className={styles.input}
                        value={form.previewText}
                        maxLength={LIMITS.previewText}
                        aria-describedby="mkt-preview-text-help mkt-preview-text-counter"
                        onChange={(e) =>
                            setField("previewText", e.target.value)
                        }
                    />
                    <div className={styles.fieldMeta}>
                        <span
                            id="mkt-preview-text-help"
                            className={styles.help}
                        >
                            מופיע בתיבת הדואר לפני פתיחת המייל
                        </span>
                        <span
                            id="mkt-preview-text-counter"
                            className={styles.counter}
                        >
                            {form.previewText.length}/{LIMITS.previewText}
                        </span>
                    </div>
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="mkt-top-image">
                        תמונה עליונה (URL)
                    </label>
                    <input
                        id="mkt-top-image"
                        type="url"
                        dir="ltr"
                        className={`${styles.input} ${styles.ltr}`}
                        value={form.topImageUrl}
                        aria-describedby="mkt-top-image-help"
                        onChange={(e) =>
                            setField("topImageUrl", e.target.value)
                        }
                    />
                    <div className={styles.fieldMeta}>
                        <span id="mkt-top-image-help" className={styles.help}>
                            כתובת https מ-cardigo.co.il או מאחסון Supabase
                            המאושר
                        </span>
                    </div>
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="mkt-heading">
                        כותרת
                    </label>
                    <input
                        id="mkt-heading"
                        type="text"
                        className={styles.input}
                        value={form.heading}
                        maxLength={LIMITS.heading}
                        aria-describedby="mkt-heading-counter"
                        onChange={(e) => setField("heading", e.target.value)}
                    />
                    <div className={styles.fieldMeta}>
                        <span className={styles.help} />
                        <span
                            id="mkt-heading-counter"
                            className={styles.counter}
                        >
                            {form.heading.length}/{LIMITS.heading}
                        </span>
                    </div>
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="mkt-body">
                        תוכן המייל
                        <span className={styles.req} aria-hidden="true">
                            {" "}
                            *
                        </span>
                    </label>
                    <textarea
                        id="mkt-body"
                        className={styles.textarea}
                        value={form.bodyText}
                        maxLength={LIMITS.bodyText}
                        rows={8}
                        required
                        aria-required="true"
                        aria-invalid={bodyMissing ? "true" : undefined}
                        aria-describedby="mkt-body-help mkt-body-counter mkt-body-err"
                        onChange={(e) => setField("bodyText", e.target.value)}
                        onBlur={() => markTouched("bodyText")}
                    />
                    <div className={styles.bodyHelp} id="mkt-body-help">
                        <span className={styles.help}>
                            מודגש: **טקסט מודגש**
                        </span>
                        <span className={styles.help}>
                            קישור: [טקסט](/pricing)
                        </span>
                        <span className={styles.help}>
                            HTML גולמי אינו נתמך
                        </span>
                    </div>
                    <div className={styles.fieldMeta}>
                        <span
                            id="mkt-body-err"
                            className={styles.err}
                            role={bodyMissing ? "alert" : undefined}
                        >
                            {bodyMissing ? "תוכן המייל הוא שדה חובה" : ""}
                        </span>
                        <span id="mkt-body-counter" className={styles.counter}>
                            {form.bodyText.length}/{LIMITS.bodyText}
                        </span>
                    </div>
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="mkt-cta-label">
                        טקסט כפתור
                    </label>
                    <input
                        id="mkt-cta-label"
                        type="text"
                        className={styles.input}
                        value={form.ctaLabel}
                        maxLength={LIMITS.ctaLabel}
                        aria-describedby="mkt-cta-label-counter mkt-cta-pairing"
                        onChange={(e) => setField("ctaLabel", e.target.value)}
                    />
                    <div className={styles.fieldMeta}>
                        <span className={styles.help} />
                        <span
                            id="mkt-cta-label-counter"
                            className={styles.counter}
                        >
                            {form.ctaLabel.length}/{LIMITS.ctaLabel}
                        </span>
                    </div>
                </div>

                <div className={styles.field}>
                    <label className={styles.label} htmlFor="mkt-cta-url">
                        קישור כפתור
                    </label>
                    <input
                        id="mkt-cta-url"
                        type="url"
                        dir="ltr"
                        className={`${styles.input} ${styles.ltr}`}
                        value={form.ctaUrl}
                        aria-describedby="mkt-cta-url-help mkt-cta-pairing"
                        onChange={(e) => setField("ctaUrl", e.target.value)}
                    />
                    <div className={styles.fieldMeta}>
                        <span id="mkt-cta-url-help" className={styles.help}>
                            לדוגמה: /pricing או https://cardigo.co.il/pricing
                        </span>
                    </div>
                </div>

                <p
                    id="mkt-cta-pairing"
                    className={styles.err}
                    role={
                        ctaLabelWithoutUrl || ctaUrlWithoutLabel
                            ? "alert"
                            : undefined
                    }
                >
                    {ctaLabelWithoutUrl
                        ? "יש להזין גם קישור כפתור או להשאיר את שני השדות ריקים"
                        : ctaUrlWithoutLabel
                          ? "יש להזין גם טקסט כפתור או להשאיר את שני השדות ריקים"
                          : ""}
                </p>
            </div>

            <div className={styles.actions}>
                <div className={styles.actionButtons}>
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handlePreviewClick}
                        disabled={!canPreview}
                    >
                        {isPreviewing ? "טוען תצוגה מקדימה…" : "תצוגה מקדימה"}
                    </button>
                    <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={handleTestSendClick}
                        disabled={!canTestSend}
                    >
                        {isSending ? "שולח מבחן…" : "שליחת מבחן לכתובת שלי"}
                    </button>
                    <button
                        type="button"
                        className={styles.resetBtn}
                        onClick={onReset}
                    >
                        נקה טופס
                    </button>
                </div>
                <p className={styles.help}>
                    השליחה תתבצע רק לכתובת האימייל של מנהל המערכת המחובר.
                </p>
                {sendDisabledByFlag ? (
                    <p className={styles.lockBanner} role="status">
                        שליחת מבחן אינה פעילה כרגע.
                    </p>
                ) : null}
                {sendError ? (
                    <p className={styles.err} role="alert">
                        {sendError}
                    </p>
                ) : null}
                {sendResult ? (
                    <div className={styles.sendStatus} aria-live="polite">
                        <p
                            className={
                                sendResult.kind === "error"
                                    ? styles.err
                                    : styles.status
                            }
                            role={
                                sendResult.kind === "error"
                                    ? "alert"
                                    : undefined
                            }
                        >
                            {sendResult.message}
                        </p>
                        {sendResult.deliveredToMasked ? (
                            <p className={styles.help}>
                                {`יעד: ${sendResult.deliveredToMasked}`}
                            </p>
                        ) : null}
                        {Array.isArray(sendResult.warnings) &&
                        sendResult.warnings.length > 0 ? (
                            <ul className={styles.warningList}>
                                {sendResult.warnings.map((w, i) => (
                                    <li className={styles.err} key={i}>
                                        {w}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ) : null}
                <p className={styles.status} aria-live="polite">
                    בשלב זה ניתן להפיק תצוגה מקדימה בלבד; שליחת מבחן ושליחה
                    לרשימה יופעלו בשלב הבא.
                </p>
                {isPreviewStale ? (
                    <p className={styles.status} aria-live="polite">
                        התצוגה המקדימה אינה מעודכנת לשינויים האחרונים.
                    </p>
                ) : null}
                <p className={styles.boundary}>
                    שליחה המונית לרשימת נמענים עדיין אינה פעילה.
                </p>
            </div>
        </section>
    );
}
