import { useState, useEffect, useRef } from "react";
import { createLead } from "../../../services/leads.service";
import Paywall from "../../common/Paywall";
import Section from "./Section";
import formStyles from "../../ui/Form.module.css";
import { trackClick } from "../../../services/analytics.client";
import Notice from "../../ui/Notice/Notice";
import styles from "./LeadForm.module.css";

const INITIAL_FORM = {
    name: "",
    email: "",
    phone: "",
    message: "",
    website: "",
    consent: false,
};

export default function LeadForm({
    cardId,
    slug,
    entitlements,
    onUpgrade,
    mode,
}) {
    if (!entitlements?.canUseLeads) {
        if (mode === "public") return null;
        return (
            <Section title="צרו קשר" contentClassName={styles.content}>
                <Paywall
                    text="טופס יצירת קשר זמין למנויים בלבד"
                    onUpgrade={onUpgrade}
                />
            </Section>
        );
    }
    const [form, setForm] = useState(INITIAL_FORM);
    const [status, setStatus] = useState("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const autoResetRef = useRef(null);

    /* Auto-reset success after 9 s (cleanup on unmount / status change) */
    useEffect(() => {
        if (status !== "success") return;
        autoResetRef.current = setTimeout(() => setStatus("idle"), 9_000);
        return () => clearTimeout(autoResetRef.current);
    }, [status]);

    function handleReset() {
        setStatus("idle");
        setErrorMsg("");
        setForm(INITIAL_FORM);
    }

    function update(field, value) {
        if (status === "error") {
            setStatus("idle");
            setErrorMsg("");
        }
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.consent) {
            setErrorMsg("חובה להסכים למדיניות הפרטיות ולתנאי השימוש");
            setStatus("error");
            return;
        }

        setStatus("loading");

        trackClick(slug, "lead");

        try {
            await createLead({ cardId, ...form });
            setStatus("success");
            setForm(INITIAL_FORM);
        } catch (err) {
            const httpStatus = err.response?.status;
            const code = err.response?.data?.code;
            let msg;

            if (httpStatus === 429) {
                msg = "יותר מדי ניסיונות, נסה שוב מאוחר יותר.";
            } else if (httpStatus === 400 && code === "INVALID_EMAIL") {
                msg = "כתובת אימייל לא תקינה";
            } else if (httpStatus === 400 && code === "CONSENT_REQUIRED") {
                msg = "חובה להסכים למדיניות הפרטיות ולתנאי השימוש";
            } else if (httpStatus === 400) {
                msg = "אנא בדוק את הפרטים ונסה שנית";
            } else if (httpStatus === 403 && code === "TRIAL_EXPIRED") {
                msg = "תקופת הניסיון הסתיימה";
            } else if (httpStatus === 403 && code === "FEATURE_NOT_AVAILABLE") {
                msg = "טופס יצירת קשר זמין למנויי פרימיום בלבד";
            } else if (httpStatus === 404) {
                msg = "הכרטיס לא זמין כרגע";
            } else {
                msg = "שגיאה בשליחת הטופס";
            }

            setErrorMsg(msg);
            setStatus("error");
        }
    }

    if (status === "success") {
        return (
            <Section title="צרו קשר" contentClassName={styles.content}>
                <Notice variant="success">תודה! פנייתך נשלחה בהצלחה</Notice>
                <button
                    type="button"
                    className={styles.resetBtn}
                    onClick={handleReset}
                >
                    שלח הודעה נוספת
                </button>
            </Section>
        );
    }

    return (
        <Section title="צרו קשר" contentClassName={styles.content}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <input
                    placeholder="שם מלא"
                    value={form.name}
                    required
                    maxLength={100}
                    onChange={(e) => update("name", e.target.value)}
                    className={formStyles.input}
                />

                <input
                    type="email"
                    placeholder="אימייל"
                    value={form.email}
                    maxLength={254}
                    onChange={(e) => update("email", e.target.value)}
                    className={formStyles.input}
                />

                {/* Honeypot - hidden from real users, bots fill it */}
                <input
                    name="website"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                    className={styles.hp}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                />

                <input
                    placeholder="טלפון"
                    value={form.phone}
                    maxLength={20}
                    onChange={(e) => update("phone", e.target.value)}
                    className={formStyles.input}
                />

                <textarea
                    placeholder="הודעה"
                    rows={3}
                    value={form.message}
                    maxLength={1000}
                    onChange={(e) => update("message", e.target.value)}
                    className={formStyles.textarea}
                />

                <label className={styles.consentRow}>
                    <input
                        type="checkbox"
                        checked={form.consent}
                        onChange={(e) => update("consent", e.target.checked)}
                        required
                    />
                    <span className={styles.consentText}>
                        אני מסכים ל
                        <a
                            href="/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            מדיניות הפרטיות
                        </a>{" "}
                        וגם ל
                        <a
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            תנאי השימוש באתר
                        </a>
                    </span>
                </label>

                <button type="submit" disabled={status === "loading"}>
                    שלח
                </button>

                {status === "error" && errorMsg ? (
                    <Notice variant="error">
                        {errorMsg}
                        {onUpgrade &&
                        (errorMsg.includes("פרימיום") ||
                            errorMsg.includes("הניסיון")) ? (
                            <button
                                type="button"
                                className={styles.upgradeLink}
                                onClick={onUpgrade}
                            >
                                שדרוג
                            </button>
                        ) : null}
                    </Notice>
                ) : null}
            </form>
        </Section>
    );
}
