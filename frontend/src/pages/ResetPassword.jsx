import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { resetPassword } from "../services/auth.service";
import {
    validatePasswordPolicy,
    getPasswordPolicyMessage,
    getPasswordPolicyChecklist,
    PASSWORD_POLICY_HELPER_TEXT_HE,
    PASSWORD_POLICY,
} from "../utils/passwordPolicy.js";
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
    const [fieldErrors, setFieldErrors] = useState({
        password: "",
        confirmPassword: "",
    });
    const [passwordTouched, setPasswordTouched] = useState(false);

    function update(field, value) {
        setForm((p) => ({ ...p, [field]: value }));
        if (field === "password" || field === "confirmPassword") {
            setFieldErrors((prev) => ({ ...prev, [field]: "" }));
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setPasswordTouched(true);
        setFieldErrors({ password: "", confirmPassword: "" });
        setError("");

        if (!token) {
            setError("קישור האיפוס לא תקין.");
            return;
        }

        const pwResult = validatePasswordPolicy(form.password);
        if (!pwResult.ok) {
            setFieldErrors((prev) => ({
                ...prev,
                password: getPasswordPolicyMessage(pwResult.code),
            }));
            return;
        }

        if (!form.confirmPassword) {
            setFieldErrors((prev) => ({
                ...prev,
                confirmPassword: "שדה אימות הסיסמה הוא חובה",
            }));
            return;
        }

        if (form.password !== form.confirmPassword) {
            setFieldErrors((prev) => ({
                ...prev,
                confirmPassword: "הסיסמאות לא תואמות.",
            }));
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token, form.password);
            navigate("/login?reset=1", { replace: true });
        } catch (err) {
            const code = err?.response?.data?.code;
            if (typeof code === "string" && code.startsWith("PASSWORD_")) {
                setFieldErrors((prev) => ({
                    ...prev,
                    password: getPasswordPolicyMessage(code),
                }));
                setPasswordTouched(true);
            } else if (code === "RATE_LIMITED") {
                setError("נסו שוב בעוד כמה דקות.");
            } else {
                setError("לא ניתן לאפס סיסמה. בקשו קישור חדש.");
            }
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
                    onBlur={() => setPasswordTouched(true)}
                    required
                    minLength={PASSWORD_POLICY.minLength}
                    maxLength={PASSWORD_POLICY.maxLength}
                    meta={PASSWORD_POLICY_HELPER_TEXT_HE}
                    error={fieldErrors.password}
                />

                {(passwordTouched ||
                    fieldErrors.password ||
                    form.password.length > 0) && (
                    <ul
                        className={styles.pwChecklist}
                        aria-label="דרישות הסיסמה"
                    >
                        {getPasswordPolicyChecklist(form.password).map(
                            (item) => (
                                <li
                                    key={item.id}
                                    className={`${styles.pwChecklistItem}${item.met ? ` ${styles.pwChecklistItemMet}` : ""}`}
                                >
                                    {item.label}
                                </li>
                            ),
                        )}
                    </ul>
                )}

                <Input
                    label="אימות סיסמה"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    required
                    maxLength={PASSWORD_POLICY.maxLength}
                    error={fieldErrors.confirmPassword}
                />

                {error ? <p className={styles.error}>{error}</p> : null}

                <Button type="submit" fullWidth loading={loading}>
                    שמור סיסמה
                </Button>
            </form>
        </AuthLayout>
    );
}
