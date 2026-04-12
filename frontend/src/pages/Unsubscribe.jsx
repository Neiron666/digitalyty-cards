import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import api from "../services/api";
import styles from "./Unsubscribe.module.css";

export default function Unsubscribe() {
    const [searchParams] = useSearchParams();

    const token = useMemo(() => {
        const t = searchParams.get("token");
        return typeof t === "string" ? t.trim() : "";
    }, [searchParams]);

    const [status, setStatus] = useState("loading"); // loading | success | error

    // Strip the token query param from the URL so third-party pixels / GTM
    // variables observing window.location do not record the raw token value.
    // history.replaceState is used (not navigate) to avoid updating React Router
    // location state, which would clear the in-memory token value.
    useEffect(() => {
        if (token) {
            window.history.replaceState(null, "", window.location.pathname);
        }
    }, []);

    // Guard: prevent StrictMode double-mount from firing a second destructive POST.
    const attempted = useRef(false);

    useEffect(() => {
        if (!token || attempted.current) return;
        attempted.current = true;

        api.post("/unsubscribe/consume", { token })
            .then(() => {
                setStatus("success");
            })
            .catch(() => {
                setStatus("error");
            });
    }, [token]);

    // No token in URL — render missing state immediately (all hooks already declared above).
    if (!token) {
        return (
            <AuthLayout
                title="ביטול הרשמה"
                subtitle="הקישור לביטול ההרשמה חסר או לא תקין."
                footer={<Link to="/">חזרה לדף הבית</Link>}
            >
                <div className={styles.container}>
                    <p className={styles.message}>
                        לא נמצא קישור תקין לביטול ההרשמה. נסו שוב דרך הקישור
                        שנשלח לאימייל.
                    </p>
                </div>
            </AuthLayout>
        );
    }

    if (status === "loading") {
        return (
            <AuthLayout title="ביטול הרשמה" subtitle="מבצע ביטול הרשמה...">
                <div className={styles.container}>
                    <p className={styles.message}>נא להמתין...</p>
                </div>
            </AuthLayout>
        );
    }

    if (status === "success") {
        return (
            <AuthLayout
                title="ביטול ההרשמה בוצע"
                subtitle="הוסרתם בהצלחה מרשימת התפוצה של Cardigo."
                footer={<Link to="/">חזרה לדף הבית</Link>}
            >
                <div className={styles.container}>
                    <p className={styles.message}>
                        לא תקבלו יותר עדכונים שיווקיים מאיתנו.
                    </p>
                    <Link to="/" className={styles.homeLink}>
                        חזרה לדף הבית
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    // error
    return (
        <AuthLayout
            title="הקישור אינו תקין"
            subtitle="הקישור לביטול ההרשמה אינו תקין או שפג תוקפו."
            footer={<Link to="/">חזרה לדף הבית</Link>}
        >
            <div className={styles.container}>
                <p className={styles.message}>
                    הקישור לא תקין, פג תוקפו, או שכבר נעשה בו שימוש.
                </p>
                <Link to="/" className={styles.homeLink}>
                    חזרה לדף הבית
                </Link>
            </div>
        </AuthLayout>
    );
}
