import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import styles from "./Login.module.css";

function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const resetDone = searchParams.get("reset") === "1";

    function update(field, value) {
        setForm((p) => ({ ...p, [field]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(form.email, form.password);
            navigate("/edit", { replace: true });
        } catch (err) {
            setError(err?.response?.data?.message || "שגיאה בהתחברות");
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
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    required
                />

                {error && <p className={styles.error}>{error}</p>}

                <Button type="submit" fullWidth loading={loading}>
                    התחבר
                </Button>
            </form>
        </AuthLayout>
    );
}

export default Login;
