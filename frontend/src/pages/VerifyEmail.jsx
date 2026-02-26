import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/ui/Button";
import { verifyEmail, resendVerification } from "../services/auth.service";
import styles from "./VerifyEmail.module.css";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();

    const token = useMemo(() => {
        const t = searchParams.get("token");
        return typeof t === "string" ? t.trim() : "";
    }, [searchParams]);

    const [status, setStatus] = useState("idle"); // idle | loading | success | error
    const [resending, setResending] = useState(false);
    const [resendDone, setResendDone] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (!token) return;

        let cancelled = false;
        setStatus("loading");

        verifyEmail(token)
            .then(() => {
                if (!cancelled) setStatus("success");
            })
            .catch(() => {
                if (!cancelled) {
                    setStatus("error");
                    setErrorMsg("הקישור לא תקין או שפג תוקפו.");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [token]);

    async function handleResend() {
        setResending(true);
        try {
            await resendVerification();
            setResendDone(true);
        } catch {
            // Best-effort; server always returns success for anti-enumeration.
        } finally {
            setResending(false);
        }
    }

    // No token in URL
    if (!token) {
        return (
            <AuthLayout
                title="אימות אימייל"
                subtitle="הקישור לאימות חסר או לא תקין."
                footer={
                    <>
                        <Link to="/login">התחברות</Link>
                    </>
                }
            >
                <div className={styles.wrapper}>
                    <p className={styles.error}>
                        לא נמצא טוקן לאימות. נסו את הקישור שוב או בקשו חדש.
                    </p>
                    <Button onClick={handleResend} loading={resending}>
                        שלח שוב אימייל אימות
                    </Button>
                    {resendDone ? (
                        <p className={styles.hint}>
                            אם החשבון קיים — נשלח אימייל חדש.
                        </p>
                    ) : null}
                </div>
            </AuthLayout>
        );
    }

    // Loading
    if (status === "loading") {
        return (
            <AuthLayout title="אימות אימייל" subtitle="מאמת...">
                <div className={styles.wrapper}>
                    <p className={styles.message}>נא להמתין...</p>
                </div>
            </AuthLayout>
        );
    }

    // Success
    if (status === "success") {
        return (
            <AuthLayout
                title="אימות הצליח!"
                subtitle="כתובת האימייל אומתה בהצלחה."
                footer={
                    <>
                        <Link to="/login">התחברות</Link>
                    </>
                }
            >
                <div className={styles.wrapper}>
                    <p className={styles.success}>
                        האימייל אומת. אפשר להתחבר ולהתחיל להשתמש בשירות.
                    </p>
                    <Link to="/login">
                        <Button>המשך להתחברות</Button>
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    // Error
    return (
        <AuthLayout
            title="אימות אימייל"
            subtitle="אירעה שגיאה באימות."
            footer={
                <>
                    <Link to="/login">התחברות</Link>
                </>
            }
        >
            <div className={styles.wrapper}>
                <p className={styles.error}>{errorMsg}</p>
                <Button onClick={handleResend} loading={resending}>
                    שלח שוב אימייל אימות
                </Button>
                {resendDone ? (
                    <p className={styles.hint}>
                        אם החשבון קיים — נשלח אימייל חדש.
                    </p>
                ) : null}
            </div>
        </AuthLayout>
    );
}
