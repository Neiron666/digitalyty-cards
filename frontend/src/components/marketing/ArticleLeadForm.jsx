import { useState, useId } from "react";
import { Link } from "react-router-dom";
import Notice from "../ui/Notice/Notice";
import { submitArticleInquiry } from "../../services/siteInquiries.service";
import { trackSiteClick } from "../../services/siteAnalytics.client";
import { SITE_ACTIONS } from "../../services/siteAnalytics.actions";
import whatsappStyles from "./WhatsAppCtaSkin.module.css";
import styles from "./ArticleLeadForm.module.css";

/** Basic RFC-ish email check (mirrors backend). */
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

const INITIAL_FIELDS = {
    name: "",
    phone: "",
    email: "",
    consent: false,
    hp: "",
};

/**
 * Inline contact form for article detail pages.
 * Submits to POST /api/site-inquiries/article via siteInquiries.service.
 * Never deletes or hides the WhatsApp CTA: renders it inside error and success states.
 *
 * Props:
 *   sourcePath   {string}      - pathname from useLocation in ArticleConversionBlock.
 *   sourceTitle  {string|null} - post.title passed from page; sent for backend logging context.
 *   whatsappHref {string}      - static WhatsApp href for contextual fallback links.
 */
export default function ArticleLeadForm({
    sourcePath,
    sourceTitle,
    whatsappHref,
}) {
    const nameId = useId();
    const phoneId = useId();
    const emailId = useId();
    const consentId = useId();
    const hpId = useId();

    const [fields, setFields] = useState(INITIAL_FIELDS);
    const [fieldErrors, setFieldErrors] = useState({});
    /** "idle" | "submitting" | "success" | "error" */
    const [status, setStatus] = useState("idle");
    const [serverMessage, setServerMessage] = useState("");

    function updateField(e) {
        const { name, value, type, checked } = e.target;
        setFields((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => ({ ...prev, [name]: "" }));
        }
    }

    function validate() {
        const errors = {};
        if (!fields.name.trim()) {
            errors.name = "שם מלא הוא שדה חובה.";
        }
        if (!fields.phone.trim()) {
            errors.phone = "נדרש מספר טלפון.";
        }
        if (fields.email.trim() && !EMAIL_RE.test(fields.email.trim())) {
            errors.email = "כתובת אימייל לא תקינה.";
        }
        if (!fields.consent) {
            errors.consent = "חובה לאשר את מדיניות הפרטיות ותנאי השימוש.";
        }
        return errors;
    }

    async function handleSubmit(e) {
        e.preventDefault();

        // Client-side honeypot guard (server also verifies).
        if (fields.hp) return;

        const errors = validate();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setStatus("submitting");
        setFieldErrors({});

        trackSiteClick({
            action: SITE_ACTIONS.article_detail_lead_form_submit,
        });

        const result = await submitArticleInquiry({
            name: fields.name.trim(),
            phone: fields.phone.trim(),
            email: fields.email.trim(),
            sourcePath,
            sourceTitle: sourceTitle || "",
            consent: fields.consent,
            hp: fields.hp,
        });

        if (result.ok) {
            setStatus("success");
            trackSiteClick({
                action: SITE_ACTIONS.article_detail_lead_form_success,
            });
        } else {
            setStatus("error");
            setServerMessage(
                result.message ||
                    "שגיאה בשליחת הפנייה. אפשר לנסות שוב או לפנות אלינו בוואטסאפ.",
            );
            trackSiteClick({
                action: SITE_ACTIONS.article_detail_lead_form_error,
            });
        }
    }

    function handleReset() {
        setFields(INITIAL_FIELDS);
        setFieldErrors({});
        setStatus("idle");
        setServerMessage("");
    }

    // ── Success state (form replaced) ──────────────────────────
    if (status === "success") {
        return (
            <div className={styles.successWrap}>
                <Notice variant="success">
                    תודה! קיבלנו את הפנייה שלכם ונחזור בהקדם.
                </Notice>
                <button
                    type="button"
                    className={styles.resetBtn}
                    onClick={handleReset}
                >
                    שלח פנייה נוספת
                </button>
                <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.waLink} ${whatsappStyles.skin}`}
                >
                    <span className={whatsappStyles.icon} aria-hidden="true" />
                    <span>דברו איתנו בוואטסאפ</span>
                </a>
            </div>
        );
    }

    // ── Idle / error state (form visible) ──────────────────────
    return (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {/* Honeypot — visually hidden, aria-hidden, not focusable */}
            <div className={styles.hp} aria-hidden="true">
                <label htmlFor={hpId}>אל תמלא שדה זה</label>
                <input
                    id={hpId}
                    name="hp"
                    type="text"
                    value={fields.hp}
                    onChange={updateField}
                    tabIndex={-1}
                    autoComplete="off"
                />
            </div>

            {/* Error notice + WhatsApp fallback — shown when status === "error" */}
            {status === "error" && (
                <>
                    <Notice variant="error">{serverMessage}</Notice>
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.waLink} ${whatsappStyles.skin}`}
                    >
                        <span
                            className={whatsappStyles.icon}
                            aria-hidden="true"
                        />
                        <span>דברו איתנו בוואטסאפ</span>
                    </a>
                </>
            )}

            {/* Name + Phone — flex row on desktop */}
            <div className={styles.fieldsRow}>
                <div className={styles.fieldGroup}>
                    <label htmlFor={nameId} className={styles.label}>
                        שם מלא
                    </label>
                    <input
                        id={nameId}
                        name="name"
                        type="text"
                        className={`${styles.input}${fieldErrors.name ? ` ${styles.inputError}` : ""}`}
                        value={fields.name}
                        onChange={updateField}
                        placeholder="שם מלא"
                        autoComplete="name"
                        required
                        aria-describedby={
                            fieldErrors.name ? `${nameId}-err` : undefined
                        }
                    />
                    {fieldErrors.name && (
                        <span
                            id={`${nameId}-err`}
                            className={styles.fieldError}
                            role="alert"
                        >
                            {fieldErrors.name}
                        </span>
                    )}
                </div>

                <div className={styles.fieldGroup}>
                    <label htmlFor={phoneId} className={styles.label}>
                        טלפון
                    </label>
                    <input
                        id={phoneId}
                        name="phone"
                        type="tel"
                        className={`${styles.input}${fieldErrors.phone ? ` ${styles.inputError}` : ""}`}
                        value={fields.phone}
                        onChange={updateField}
                        placeholder="טלפון"
                        autoComplete="tel"
                        required
                        aria-describedby={
                            fieldErrors.phone ? `${phoneId}-err` : undefined
                        }
                    />
                    {fieldErrors.phone && (
                        <span
                            id={`${phoneId}-err`}
                            className={styles.fieldError}
                            role="alert"
                        >
                            {fieldErrors.phone}
                        </span>
                    )}
                </div>
            </div>

            {/* Email (optional) */}
            <div className={styles.fieldGroup}>
                <label htmlFor={emailId} className={styles.label}>
                    דואר אלקטרוני
                </label>
                <input
                    id={emailId}
                    name="email"
                    type="email"
                    className={`${styles.input}${fieldErrors.email ? ` ${styles.inputError}` : ""}`}
                    value={fields.email}
                    onChange={updateField}
                    placeholder="דואר אלקטרוני (אופציונלי)"
                    autoComplete="email"
                    aria-describedby={
                        fieldErrors.email ? `${emailId}-err` : undefined
                    }
                />
                {fieldErrors.email && (
                    <span
                        id={`${emailId}-err`}
                        className={styles.fieldError}
                        role="alert"
                    >
                        {fieldErrors.email}
                    </span>
                )}
            </div>

            {/* Consent checkbox */}
            <div className={styles.consentRow}>
                <input
                    id={consentId}
                    name="consent"
                    type="checkbox"
                    className={styles.consentCheck}
                    checked={fields.consent}
                    onChange={updateField}
                    aria-describedby={
                        fieldErrors.consent ? `${consentId}-err` : undefined
                    }
                />
                <label htmlFor={consentId} className={styles.consentLabel}>
                    אני מאשר/ת את <Link to="/privacy">מדיניות הפרטיות</Link> ו
                    <Link to="/terms">תנאי השימוש</Link> באתר
                </label>
            </div>
            {fieldErrors.consent && (
                <span
                    id={`${consentId}-err`}
                    className={styles.fieldError}
                    role="alert"
                >
                    {fieldErrors.consent}
                </span>
            )}

            {/* Submit */}
            <button
                type="submit"
                className={styles.submitBtn}
                disabled={status === "submitting"}
            >
                {status === "submitting" ? "שולח..." : "שלחו פרטים"}
            </button>
        </form>
    );
}
