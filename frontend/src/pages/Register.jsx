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

            async function fetchMineOnce() {
                const res = await api.get("/cards/mine");
                return res?.data || null;
            }

            const anonId = getAnonymousId();

            // 1) If backend already claimed best-effort during /auth/register, do not block.
            try {
                const mine0 = await fetchMineOnce();
                if (mine0 && mine0._id) {
                    if (anonId) clearAnonymousId();
                    navigate("/edit", { replace: true });
                    return;
                }
            } catch (err) {
                console.warn("[auth] mine after login failed", {
                    status: err?.response?.status,
                    message: err?.message,
                });
                // Do not block registration on transient failures here.
                navigate("/edit", { replace: true });
                return;
            }

            // Serialize: ensure claim completes before editor init can create a new user-card.
            if (anonId) {
                let claimErr = null;
                try {
                    await api.post("/cards/claim");
                } catch (err) {
                    claimErr = err;
                }

                // 2) Deterministic verification: mine → optional claim → mine
                let mine1 = null;
                try {
                    mine1 = await fetchMineOnce();
                } catch (err) {
                    console.warn("[auth] mine after claim failed", {
                        status: err?.response?.status,
                        message: err?.message,
                    });
                    // Don't block registration if we cannot verify.
                    navigate("/edit", { replace: true });
                    return;
                }

                if (mine1 && mine1._id) {
                    clearAnonymousId();
                    navigate("/edit", { replace: true });
                    return;
                }

                if (claimErr) {
                    const status = claimErr?.response?.status;
                    const code = claimErr?.response?.data?.code;

                    if (status === 409 && code === "USER_ALREADY_HAS_CARD") {
                        navigate("/edit", { replace: true });
                        return;
                    }

                    if (status === 403 && code === "CLAIM_NOT_ALLOWED") {
                        setError(
                            "Claim is only allowed right after registration.",
                        );
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
                        message: claimErr?.message,
                    });
                    // Only show finish-migrating error when mine is still empty.
                    setError(
                        "We couldn't finish migrating your card. Please try again.",
                    );
                    return;
                }

                // Claim succeeded but mine is still empty.
                setError(
                    "We couldn't finish migrating your card. Please try again.",
                );
                return;
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
