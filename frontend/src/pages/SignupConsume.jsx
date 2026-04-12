import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { consumeSignupToken } from "../services/auth.service";
import { trackRegistrationComplete } from "../services/siteAnalytics.client";
import styles from "./SignupConsume.module.css";

export default function SignupConsume() {
    const [searchParams] = useSearchParams();

    const token = useMemo(() => {
        const t = searchParams.get("token");
        return typeof t === "string" ? t.trim() : "";
    }, [searchParams]);

    const [form, setForm] = useState({
        password: "",
        confirmPassword: "",
        consent: false,
        marketingConsent: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("הקישור לא תקין או חסר.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("הסיסמאות לא תואמות.");
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
        } catch {
            setError("לא ניתן להשלים הרשמה. בקשו קישור חדש.");
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
                    label="סיסמה"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    required
                />

                <Input
                    label="אימות סיסמה"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    required
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
