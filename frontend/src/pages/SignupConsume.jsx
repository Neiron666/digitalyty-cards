import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import api from "../services/api";
import { consumeSignupToken } from "../services/auth.service";
import styles from "./SignupConsume.module.css";

export default function SignupConsume() {
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
            setError("הקישור לא תקין או חסר.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("הסיסמאות לא תואמות.");
            return;
        }

        setLoading(true);
        try {
            const res = await consumeSignupToken(token, form.password);
            const jwt = res?.data?.token;

            if (!jwt) {
                setError("לא ניתן להשלים הרשמה. נסו שוב.");
                return;
            }

            localStorage.setItem("token", jwt);
            api.defaults.headers.common.Authorization = `Bearer ${jwt}`;

            navigate("/edit", { replace: true });
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

                {error ? <p className={styles.error}>{error}</p> : null}

                <Button type="submit" fullWidth loading={loading}>
                    צור חשבון
                </Button>
            </form>
        </AuthLayout>
    );
}
