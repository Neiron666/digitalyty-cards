import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { resetPassword } from "../services/auth.service";
import styles from "./ResetPassword.module.css";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = useMemo(() => {
        const t = searchParams.get("token");
        return typeof t === "string" ? t.trim() : "";
    }, [searchParams]);

    const [form, setForm] = useState({ password: "", confirmPassword: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function update(field, value) {
        setForm((p) => ({ ...p, [field]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("קישור האיפוס לא תקין.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("הסיסמאות לא תואמות.");
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token, form.password);
            navigate("/login?reset=1", { replace: true });
        } catch (err) {
            setError("לא ניתן לאפס סיסמה. בקשו קישור חדש.");
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
        return (
            <AuthLayout
                title="איפוס סיסמה"
                subtitle="הקישור לאיפוס סיסמה חסר או לא תקין."
                footer={
                    <>
                        <Link to="/forgot-password">שליחת קישור חדש</Link>
                    </>
                }
            >
                <p className={styles.message}>
                    אפשר לבקש קישור איפוס חדש ולנסות שוב.
                </p>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="קבע/י סיסמה חדשה"
            subtitle="הזן/י סיסמה חדשה כדי לסיים את האיפוס."
            footer={
                <>
                    <Link to="/login">חזרה להתחברות</Link>
                </>
            }
        >
            <form className={styles.form} onSubmit={handleSubmit}>
                <Input
                    label="סיסמה חדשה"
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

                {error ? <p className={styles.error}>{error}</p> : null}

                <Button type="submit" fullWidth loading={loading}>
                    שמור סיסמה
                </Button>
            </form>
        </AuthLayout>
    );
}
