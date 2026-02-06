import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import api from "../services/api";
import styles from "./InviteAccept.module.css";

function InviteAccept() {
    const location = useLocation();

    const token = useMemo(() => {
        const raw = String(location?.search || "");
        const params = new URLSearchParams(raw);
        return String(params.get("token") || "").trim();
    }, [location?.search]);

    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Ссылка недействительна или истекла");
            return;
        }

        if (!password) {
            setError("Введите пароль");
            return;
        }

        setLoading(true);
        try {
            const res = await api.post("/invites/accept", { token, password });
            const jwt = res?.data?.token;

            if (!jwt) {
                setError("Ошибка сервера, попробуйте позже");
                return;
            }

            localStorage.setItem("token", jwt);
            api.defaults.headers.common.Authorization = `Bearer ${jwt}`;

            // AuthContext loads token from localStorage on mount.
            // Full replace avoids StrictMode double-mount edge cases.
            window.location.replace("/edit");
        } catch (err) {
            const status = err?.response?.status;

            if (status === 404) {
                setError("Ссылка недействительна или истекла");
            } else if (status === 400) {
                setError("Нужно задать пароль, чтобы принять приглашение");
            } else {
                setError("Ошибка сервера, попробуйте позже");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="Принять приглашение"
            subtitle="Задайте пароль, чтобы завершить вступление в организацию"
        >
            <form onSubmit={handleSubmit}>
                <Input
                    label="Пароль"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {error && <p className={styles.error}>{error}</p>}

                <Button type="submit" fullWidth loading={loading}>
                    Принять приглашение
                </Button>
            </form>
        </AuthLayout>
    );
}

export default InviteAccept;
