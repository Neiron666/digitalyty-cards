import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import styles from "./InviteAccept.module.css";

function InviteAccept() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    const token = useMemo(() => {
        const raw = String(location?.search || "");
        const params = new URLSearchParams(raw);
        return String(params.get("token") || "").trim();
    }, [location?.search]);

    const [firstName, setFirstName] = useState("");
    const [password, setPassword] = useState("");
    const [consent, setConsent] = useState(false);
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [loginRequired, setLoginRequired] = useState(false);

    const returnTo = useMemo(() => {
        const raw = String(location?.search || "");
        return `/invite${raw}`;
    }, [location?.search]);

    const loginHref = useMemo(() => {
        return `/login?returnTo=${encodeURIComponent(returnTo)}`;
    }, [returnTo]);

    // Branch signal: new-user vs existing-user.
    // Drives password-entry, consent visibility, consent validation, and payload shape.
    const isNewUser = !isAuthenticated;

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoginRequired(false);

        if (!token) {
            setError("הקישור אינו תקין או שפג תוקפו");
            return;
        }

        const isLoggedIn = isAuthenticated;

        // New-user flow requires firstName.
        if (!isLoggedIn && !firstName.trim()) {
            setError("שדה השם הפרטי הוא חובה");
            return;
        }

        if (!isLoggedIn && firstName.trim().length > 100) {
            setError("השם הפרטי ארוך מדי (מקסימום 100 תווים)");
            return;
        }

        // New-user flow requires a password. Existing-user flow requires login.
        if (!isLoggedIn && !password) {
            setError("הזינו סיסמא ליצירת חשבון חדש");
            return;
        }

        // New-user flow requires explicit consent.
        if (!isLoggedIn && !consent) {
            setError("חובה להסכים למדיניות הפרטיות ולתנאי השימוש");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                token,
                ...(isNewUser
                    ? {
                          firstName: firstName.trim(),
                          password,
                          consent,
                          marketingConsent,
                      }
                    : null),
            };
            const res = await api.post("/invites/accept", payload);
            const orgSlug = String(res?.data?.orgSlug || "").trim();

            // Cookie is now set by the backend on success.
            // Full replace triggers a fresh AuthProvider mount which bootstraps
            // the session from the httpOnly cookie via /auth/me.
            if (orgSlug) {
                window.location.replace(
                    `/edit?org=${encodeURIComponent(orgSlug)}`,
                );
                return;
            }

            // Safety fallback: keep prior behavior if backend didn't return orgSlug.
            window.location.replace("/edit");
        } catch (err) {
            const status = err?.response?.status;
            const code = err?.response?.data?.code;

            if (status === 409 && code === "INVITE_LOGIN_REQUIRED") {
                setLoginRequired(true);
                setError("כבר יש לך חשבון. התחברו כדי לקבל את ההזמנה.");
            } else if (status === 404) {
                setError("הקישור אינו תקין או שפג תוקפו");
            } else if (status === 400) {
                setError("נדרשת סיסמא לקבלת ההזמנה");
            } else {
                setError("שגיאת שרת, נסו שוב מאוחר יותר");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="קבלת הזמנה"
            subtitle="אם יש לכם כבר חשבון, התחברו. אם לא — הגדירו סיסמא ליצירת חשבון."
        >
            <form onSubmit={handleSubmit}>
                {isNewUser && (
                    <Input
                        label="שם פרטי"
                        type="text"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                    />
                )}

                <Input
                    label="סיסמא (רק לחשבון חדש)"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {isNewUser ? (
                    <>
                        <label className={styles.consentRow}>
                            <input
                                type="checkbox"
                                checked={consent}
                                onChange={(e) => setConsent(e.target.checked)}
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
                                checked={marketingConsent}
                                onChange={(e) =>
                                    setMarketingConsent(e.target.checked)
                                }
                            />
                            <span className={styles.consentText}>
                                אני רוצה לקבל עדכונים מ-Cardigo על trial,
                                פרימיום ועדכונים חשובים
                                <span className={styles.marketingHint}>
                                    ניתן לבטל בכל עת
                                </span>
                            </span>
                        </label>
                    </>
                ) : null}

                {error && <p className={styles.error}>{error}</p>}

                {loginRequired ? (
                    <p className={styles.error}>
                        <a href={loginHref}>התחברו</a>
                    </p>
                ) : null}

                <Button type="submit" fullWidth loading={loading}>
                    קבל הזמנה
                </Button>
            </form>
        </AuthLayout>
    );
}

export default InviteAccept;
