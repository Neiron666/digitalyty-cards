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
    const [loginRequired, setLoginRequired] = useState(false);

    const returnTo = useMemo(() => {
        const raw = String(location?.search || "");
        return `/invite${raw}`;
    }, [location?.search]);

    const loginHref = useMemo(() => {
        return `/login?returnTo=${encodeURIComponent(returnTo)}`;
    }, [returnTo]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoginRequired(false);

        if (!token) {
            setError("Ссылка недействительна или истекла");
            return;
        }

        const existingJwt = String(localStorage.getItem("token") || "").trim();
        const isLoggedIn = Boolean(existingJwt);

        if (
            isLoggedIn &&
            (!api.defaults.headers.common.Authorization ||
                String(api.defaults.headers.common.Authorization).trim() === "")
        ) {
            api.defaults.headers.common.Authorization = `Bearer ${existingJwt}`;
        }

        // New-user flow requires a password. Existing-user flow requires login.
        if (!isLoggedIn && !password) {
            setError(
                "Введите пароль для нового аккаунта или войдите, если аккаунт уже существует",
            );
            return;
        }

        setLoading(true);
        try {
            const payload = { token, ...(password ? { password } : null) };
            const res = await api.post("/invites/accept", payload);
            const jwt = res?.data?.token;
            const orgSlug = String(res?.data?.orgSlug || "").trim();

            if (!jwt) {
                setError("Ошибка сервера, попробуйте позже");
                return;
            }

            localStorage.setItem("token", jwt);
            api.defaults.headers.common.Authorization = `Bearer ${jwt}`;

            // AuthContext loads token from localStorage on mount.
            // Full replace avoids StrictMode double-mount edge cases.
            if (orgSlug) {
                window.location.replace(
                    `/edit?org=${encodeURIComponent(orgSlug)}`,
                );
                return;
            }

            // Safety fallback: keep prior behavior if backend didn't return orgSlug.
            window.location.replace("/edit");
        } catch (err) {
            const status = err?.response?.status;
            const code = err?.response?.data?.code;

            if (status === 409 && code === "INVITE_LOGIN_REQUIRED") {
                setLoginRequired(true);
                setError(
                    "У вас уже есть аккаунт. Войдите, чтобы принять приглашение.",
                );
            } else if (status === 404) {
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
            subtitle="Если у вас уже есть аккаунт — войдите. Если нет — задайте пароль для создания аккаунта."
        >
            <form onSubmit={handleSubmit}>
                <Input
                    label="Пароль (только для нового аккаунта)"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && <p className={styles.error}>{error}</p>}

                {loginRequired ? (
                    <p className={styles.error}>
                        <a href={loginHref}>Войти</a>
                    </p>
                ) : null}

                <Button type="submit" fullWidth loading={loading}>
                    Принять приглашение
                </Button>
            </form>
        </AuthLayout>
    );
}

export default InviteAccept;
