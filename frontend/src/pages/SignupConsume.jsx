import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { consumeSignupToken } from "../services/auth.service";
import { trackRegistrationComplete } from "../services/siteAnalytics.client";
import {
    validatePasswordPolicy,
    getPasswordPolicyMessage,
    getPasswordPolicyChecklist,
    PASSWORD_POLICY_HELPER_TEXT_HE,
    PASSWORD_POLICY,
} from "../utils/passwordPolicy.js";
import styles from "./SignupConsume.module.css";

export default function SignupConsume() {
    const [searchParams] = useSearchParams();

    const token = useMemo(() => {
        const t = searchParams.get("token");
        return typeof t === "string" ? t.trim() : "";
    }, [searchParams]);

    const [form, setForm] = useState({
        firstName: "",
        password: "",
        confirmPassword: "",
        consent: false,
        marketingConsent: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({
        password: "",
        confirmPassword: "",
    });
    const [passwordTouched, setPasswordTouched] = useState(false);

    // Strip the token query param from the URL so that third-party pixels / GTM
    // variables observing window.location do not record the raw token value.
    // history.replaceState is used (not navigate) to avoid updating React Router
    // location state, which would clear the in-memory token value.
    useEffect(() => {
        if (token) {
            window.history.replaceState(null, "", window.location.pathname);
        }
    }, []);

    function update(field, value) {
        setForm((p) => ({ ...p, [field]: value }));
        if (field === "password" || field === "confirmPassword") {
            setFieldErrors((prev) => ({ ...prev, [field]: "" }));
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setPasswordTouched(true);
        setFieldErrors({ password: "", confirmPassword: "" });
        setError("");

        if (!token) {
            setError("הקישור לא תקין או חסר.");
            return;
        }

        if (!form.firstName.trim()) {
            setError("שדה השם הפרטי הוא חובה");
            return;
        }

        if (form.firstName.trim().length > 100) {
            setError("השם הפרטי ארוך מדי (מקסימום 100 תווים)");
            return;
        }

        const pwResult = validatePasswordPolicy(form.password);
        if (!pwResult.ok) {
            setFieldErrors((prev) => ({
                ...prev,
                password: getPasswordPolicyMessage(pwResult.code),
            }));
            return;
        }

        if (!form.confirmPassword) {
            setFieldErrors((prev) => ({
                ...prev,
                confirmPassword: "שדה אימות הסיסמה הוא חובה",
            }));
            return;
        }

        if (form.password !== form.confirmPassword) {
            setFieldErrors((prev) => ({
                ...prev,
                confirmPassword: "הסיסמאות לא תואמות.",
            }));
            return;
        }

        if (!form.consent) {
            setError("חובה להסכים למדיניות הפרטיות ולתנאי השימוש");
            return;
        }

        setLoading(true);
        try {
            const res = await consumeSignupToken(
                token,
                form.firstName,
                form.password,
                form.consent,
                form.marketingConsent,
            );
            if (!res?.data?.ok) {
                setError("לא ניתן להשלים הרשמה. נסו שוב.");
                return;
            }

            trackRegistrationComplete();
            window.location.replace("/edit");
        } catch (err) {
            const code = err?.response?.data?.code;
            if (typeof code === "string" && code.startsWith("PASSWORD_")) {
                setFieldErrors((prev) => ({
                    ...prev,
                    password: getPasswordPolicyMessage(code),
                }));
                setPasswordTouched(true);
            } else {
                setError("לא ניתן להשלים הרשמה. בקשו קישור חדש.");
            }
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
        return (
            <AuthLayout
                title="השלמת הרשמה"
                subtitle="הקישור להשלמת הרשמה חסר או לא תקין."
                footer={
                    <>
                        <Link to="/signup-link">שליחת קישור חדש</Link>
                    </>
                }
            >
                <p className={styles.message}>
                    אפשר לבקש קישור חדש ולנסות שוב.
                </p>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="השלמת הרשמה"
            subtitle="קבע/י סיסמה כדי ליצור חשבון ולהיכנס."
            footer={
                <>
                    <Link to="/login">כבר יש חשבון? התחברות</Link>
                </>
            }
        >
            <form className={styles.form} onSubmit={handleSubmit}>
                <Input
                    label="שם פרטי"
                    type="text"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    required
                />

                <Input
                    label="סיסמה"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    required
                    minLength={PASSWORD_POLICY.minLength}
                    maxLength={PASSWORD_POLICY.maxLength}
                    meta={PASSWORD_POLICY_HELPER_TEXT_HE}
                    error={fieldErrors.password}
                />

                {(passwordTouched ||
                    fieldErrors.password ||
                    form.password.length > 0) && (
                    <ul
                        className={styles.pwChecklist}
                        aria-label="דרישות הסיסמה"
                    >
                        {getPasswordPolicyChecklist(form.password).map(
                            (item) => (
                                <li
                                    key={item.id}
                                    className={`${styles.pwChecklistItem}${item.met ? ` ${styles.pwChecklistItemMet}` : ""}`}
                                >
                                    {item.label}
                                </li>
                            ),
                        )}
                    </ul>
                )}

                <Input
                    label="אימות סיסמה"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    required
                    maxLength={PASSWORD_POLICY.maxLength}
                    error={fieldErrors.confirmPassword}
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
                            className={styles.consentLink}
                        >
                            מדיניות הפרטיות
                        </a>{" "}
                        וגם ל
                        <a
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.consentLink}
                        >
                            תנאי השימוש באתר
                        </a>
                    </span>
                </label>

                <label className={styles.marketingRow}>
                    <input
                        type="checkbox"
                        checked={form.marketingConsent}
                        onChange={(e) =>
                            update("marketingConsent", e.target.checked)
                        }
                    />
                    <span className={styles.consentText}>
                        אני רוצה לקבל עדכונים מ-Cardigo על trial, פרימיום
                        ועדכונים חשובים
                        <span className={styles.marketingHint}>
                            ניתן לבטל בכל עת
                        </span>
                    </span>
                </label>

                {error ? <p className={styles.error}>{error}</p> : null}

                <Button type="submit" fullWidth loading={loading}>
                    צור חשבון
                </Button>
            </form>
        </AuthLayout>
    );
}
