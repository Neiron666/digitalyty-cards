import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import api, { clearAnonymousId } from "../services/api";

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

            // Try to claim an anonymous card if exists; never block navigation.
            void (async () => {
                try {
                    await api.post("/cards/claim");
                    clearAnonymousId();
                } catch (err) {
                    const status = err?.response?.status;
                    if (status === 404 || status === 409) return;
                    // ignore any other claim errors as well
                }
            })();

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

                {error && <p style={{ color: "#ef4444" }}>{error}</p>}

                <Button type="submit" fullWidth loading={loading}>
                    התחבר
                </Button>
            </form>
        </AuthLayout>
    );
}

export default Login;
