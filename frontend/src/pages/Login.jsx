import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import api, { clearAnonymousId, getAnonymousId } from "../services/api";
import styles from "./Login.module.css";

function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function update(field, value) {
        setForm((p) => ({ ...p, [field]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(form.email, form.password);

            // Serialize: ensure claim completes before editor init can create a new user-card.
            const anonId = getAnonymousId();
            if (anonId) {
                try {
                    await api.post("/cards/claim");
                    clearAnonymousId();
                    navigate("/edit", { replace: true });
                    return;
                } catch (err) {
                    const status = err?.response?.status;
                    const code = err?.response?.data?.code;

                    // Allow editor access when claim is a benign no-op/conflict.
                    if (status === 409 && code === "USER_ALREADY_HAS_CARD") {
                        navigate("/edit", { replace: true });
                        return;
                    }

                    // If there's no anon card to claim, allow editor access.
                    // NOTE: we keep anonymousId by default to avoid losing context.
                    if (status === 404 && code === "NO_ANON_CARD") {
                        console.warn("[auth] claim: no anon card", {
                            status,
                            code,
                        });
                        navigate("/edit", { replace: true });
                        return;
                    }

                    // If anonId is missing/invalid, do not block the user.
                    if (status === 400) {
                        console.warn("[auth] claim: bad request", {
                            status,
                            code,
                        });
                        navigate("/edit", { replace: true });
                        return;
                    }

                    // Hard failures: do NOT auto-navigate to /edit.
                    if (status === 502 || status === 500) {
                        setError(
                            "We couldn't migrate your card right now. Please try again.",
                        );
                        return;
                    }

                    console.error("[auth] claim failed", {
                        status,
                        code,
                        message: err?.message,
                    });
                    setError(
                        "We couldn't finish migrating your card. Please try again.",
                    );
                    return;
                }
            }

            // No anonymous context -> safe to continue.
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
                    אין לך חשבון? <Link to="/register">צור חשבון</Link>
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
