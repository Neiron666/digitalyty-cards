import { useState } from "react";
import { Link } from "react-router-dom";
import { register as registerUser } from "../services/auth.service";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import styles from "./Register.module.css";

const PASSWORD_MIN_LENGTH = 8;

function Register() {
    const [form, setForm] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        consent: false,
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [registered, setRegistered] = useState(false);

    function update(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (form.password.length < PASSWORD_MIN_LENGTH) {
            setError(`הסיסמה חייבת לכלול לפחות ${PASSWORD_MIN_LENGTH} תווים`);
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("הסיסמאות לא תואמות");
            return;
        }

        if (!form.consent) {
            setError("חובה להסכים למדיניות הפרטיות ולתנאי השימוש");
            return;
        }

        setLoading(true);
        try {
            await registerUser(form.email, form.password, form.consent);

            // Show "check your email" message.
            setRegistered(true);
        } catch (err) {
            const code = err.response?.data?.code;
            const status = err.response?.status;
            if (code === "CONSENT_REQUIRED") {
                setError("חובה להסכים למדיניות הפרטיות ולתנאי השימוש");
            } else if (status === 409) {
                setError("לא ניתן ליצור חשבון עם כתובת האימייל הזו.");
            } else {
                setError(err.response?.data?.message || "שגיאה בהרשמה");
            }
        } finally {
            setLoading(false);
        }
    }

    // Post-registration: show "check your email" message.
    if (registered) {
        return (
            <AuthLayout
                title="בדקו את האימייל"
                footer={
                    <>
                        <Link to="/login">התחברות</Link>
                    </>
                }
            >
                <div className={styles.form}>
                    <p className={styles.successMessage}>
                        נשלח אימייל אימות לכתובת <strong>{form.email}</strong>.
                    </p>
                    <p className={styles.successHint}>
                        לחצו על הקישור באימייל כדי להשלים את ההרשמה. אם לא
                        קיבלתם - בדקו בתיקיית הספאם.
                    </p>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="יצירת חשבון"
            footer={
                <>
                    כבר יש לך חשבון? <Link to="/login">התחברות</Link>
                </>
            }
        >
            <form onSubmit={handleSubmit}>
                <Input
                    label="אימייל"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                />

                <Input
                    label="סיסמה"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
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

                {error && <p className={styles.error}>{error}</p>}

                <Button
                    type="submit"
                    fullWidth
                    loading={loading}
                    className={styles.authSubmit}
                >
                    צור חשבון
                </Button>
            </form>
        </AuthLayout>
    );
}

export default Register;
