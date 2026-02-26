import { useState } from "react";
import { Link } from "react-router-dom";
import { register as registerUser } from "../services/auth.service";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import api, { clearAnonymousId, getAnonymousId } from "../services/api";
import styles from "./Register.module.css";

const PASSWORD_MIN_LENGTH = 8;

function Register() {
    const [form, setForm] = useState({
        email: "",
        password: "",
        confirmPassword: "",
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

        setLoading(true);
        try {
            const regRes = await registerUser(form.email, form.password);
            const jwt = regRes?.data?.token;

            // Store token so user has a session (even if not verified yet).
            if (jwt) {
                localStorage.setItem("token", jwt);
                api.defaults.headers.common.Authorization = `Bearer ${jwt}`;
            }

            // Best-effort: claim anonymous card in the background.
            const anonymousId = getAnonymousId();
            if (anonymousId) {
                try {
                    await api.post("/cards/claim");
                    clearAnonymousId();
                } catch {
                    // Non-blocking; claim can fail gracefully.
                }
            }

            // Show "check your email" message.
            setRegistered(true);
        } catch (err) {
            setError(err.response?.data?.message || "שגיאה בהרשמה");
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
                        קיבלתם — בדקו בתיקיית הספאם.
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

                {error && <p className={styles.error}>{error}</p>}

                <Button type="submit" fullWidth loading={loading}>
                    צור חשבון
                </Button>
            </form>
        </AuthLayout>
    );
}

export default Register;
