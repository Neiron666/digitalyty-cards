import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as registerUser } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import api, { clearAnonymousId, getAnonymousId } from "../services/api";
import styles from "./Register.module.css";

function Register() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [form, setForm] = useState({
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function update(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            await registerUser(form.email, form.password);
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

                    if (status === 409 && code === "USER_ALREADY_HAS_CARD") {
                        navigate("/edit", { replace: true });
                        return;
                    }

                    if (status === 404 && code === "NO_ANON_CARD") {
                        console.warn("[auth] claim: no anon card", {
                            status,
                            code,
                        });
                        navigate("/edit", { replace: true });
                        return;
                    }

                    if (status === 400) {
                        console.warn("[auth] claim: bad request", {
                            status,
                            code,
                        });
                        navigate("/edit", { replace: true });
                        return;
                    }

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

            navigate("/edit", { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
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
                    צור כרטיס ראשון
                </Button>
            </form>
        </AuthLayout>
    );
}

export default Register;
