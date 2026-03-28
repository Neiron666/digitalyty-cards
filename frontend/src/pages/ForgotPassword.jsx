import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { forgotPassword } from "../services/auth.service";
import styles from "./ForgotPassword.module.css";

const RESEND_COOLDOWN_SEC = 180;

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    function startCountdown() {
        setCountdown(RESEND_COOLDOWN_SEC);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (countdown > 0) return;
        setError("");
        setLoading(true);
        try {
            await forgotPassword(email);
            setDone(true);
            startCountdown();
        } catch (err) {
            setError("לא ניתן לשלוח קישור כרגע. נסו שוב.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="איפוס סיסמה"
            subtitle="הזן/י את כתובת האימייל שלך ונשלח קישור לאיפוס סיסמה."
            footer={
                <>
                    <Link to="/login">חזרה להתחברות</Link>
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
                    <div className={styles.doneBlock}>
                        <p className={styles.message}>
                            אם קיים חשבון עם האימייל הזה, נשלח קישור לאיפוס
                            סיסמה.
                        </p>
                        <p className={styles.spamHint}>
                            לא מוצאים את המייל? בדוק/י גם בתיקיית הספאם (Spam /
                            Junk).
                        </p>
                        {countdown > 0 ? (
                            <p className={styles.cooldownHint}>
                                ניתן לשלוח שוב בעוד {countdown} שניות.
                            </p>
                        ) : (
                            <p className={styles.cooldownHint}>
                                לא קיבלת? ניתן לשלוח שוב.
                            </p>
                        )}
                    </div>
                ) : null}

                <Button
                    type="submit"
                    fullWidth
                    loading={loading}
                    disabled={countdown > 0}
                >
                    שלח קישור
                </Button>
            </form>
        </AuthLayout>
    );
}
