import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { forgotPassword } from "../services/auth.service";
import styles from "./ForgotPassword.module.css";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await forgotPassword(email);
            setDone(true);
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
                    <p className={styles.message}>
                        אם קיים חשבון עם האימייל הזה, נשלח קישור לאיפוס סיסמה.
                    </p>
                ) : null}

                <Button type="submit" fullWidth loading={loading}>
                    שלח קישור
                </Button>
            </form>
        </AuthLayout>
    );
}
