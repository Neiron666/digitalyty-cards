import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { requestSignupLink } from "../services/auth.service";
import styles from "./SignupLinkRequest.module.css";

export default function SignupLinkRequest() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await requestSignupLink(email);
            setDone(true);
        } catch {
            setError("לא ניתן לשלוח קישור כרגע. נסו שוב.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="הרשמה באמצעות קישור"
            subtitle="הזן/י אימייל ונשלח קישור להשלמת ההרשמה."
            footer={
                <>
                    <Link to="/login">התחברות</Link>
                    <span className={styles.sep} aria-hidden="true">
                        ·
                    </span>
                    <Link to="/forgot-password">שכחת סיסמה?</Link>
                </>
            }
        >
            <form className={styles.form} onSubmit={handleSubmit}>
                <Input
                    label="אימייל"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                {error ? <p className={styles.error}>{error}</p> : null}

                {done ? (
                    <div className={styles.messageBox}>
                        <p className={styles.message}>
                            אם האימייל מתאים — נשלח קישור להשלמת ההרשמה.
                        </p>
                        <p className={styles.hint}>
                            אם כבר יש חשבון — השתמשו ב-Login / Forgot password.
                        </p>
                    </div>
                ) : null}

                <Button type="submit" fullWidth loading={loading}>
                    שלח קישור
                </Button>
            </form>
        </AuthLayout>
    );
}
