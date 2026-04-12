import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Notice from "../components/ui/Notice/Notice";
import styles from "./Login.module.css";

function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

    const resetDone = searchParams.get("reset") === "1";

    function update(field, value) {
        setForm((p) => ({ ...p, [field]: value }));
        setFieldErrors((p) => ({ ...p, [field]: "" }));
    }

    function validate() {
        const errs = { email: "", password: "" };
        if (!form.email.trim()) {
            errs.email = "שדה האימייל הוא חובה";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            errs.email = "כתובת האימייל אינה תקינה";
        }
        if (!form.password) {
            errs.password = "שדה הסיסמה הוא חובה";
        }
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        if (errs.email || errs.password) {
            setFieldErrors(errs);
            return;
        }
        setError("");
        setLoading(true);
        try {
            await login(form.email, form.password);
            navigate("/edit", { replace: true });
        } catch (err) {
            const code = err?.response?.data?.code;
            const status = err?.response?.status;
            if (code === "EMAIL_NOT_VERIFIED") {
                setError(
                    "יש לאמת את כתובת האימייל לפני התחברות. בדקו את תיבת הדואר שלכם.",
                );
            } else if (status === 401) {
                setError("האימייל או הסיסמה שגויים. נסו שוב.");
            } else {
                setError(err?.response?.data?.message || "שגיאה בהתחברות");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="התחברות"
            footer={
                <>
                    <div>
                        אין לך חשבון? <Link to="/register">צור חשבון</Link>
                    </div>
                    <div>
                        <Link to="/forgot-password">שכחת סיסמה?</Link>
                    </div>
                </>
            }
        >
            {resetDone && (
                <p className={styles.note}>
                    הסיסמה עודכנה בהצלחה. אפשר להתחבר.
                </p>
            )}
            <form onSubmit={handleSubmit} noValidate>
                <Input
                    label="אימייל"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                    error={fieldErrors.email}
                />

                <Input
                    label="סיסמה"
                    type="password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    required
                    error={fieldErrors.password}
                />

                {error && <Notice variant="error">{error}</Notice>}

                <Button
                    type="submit"
                    fullWidth
                    loading={loading}
                    className={styles.authSubmit}
                >
                    התחבר
                </Button>
            </form>
        </AuthLayout>
    );
}

export default Login;
