import { useState } from "react";
import { createLead } from "../../../services/leads.service";
import Paywall from "../../common/Paywall";
import Section from "./Section";
import formStyles from "../../ui/Form.module.css";
import { trackClick } from "../../../services/analytics.client";
import styles from "./LeadForm.module.css";

export default function LeadForm({ cardId, slug, entitlements, onUpgrade }) {
    if (!entitlements?.canUseLeads) {
        return (
            <Section title="צרו קשר" contentClassName={styles.content}>
                <Paywall
                    text="טופס יצירת קשר זמין למנויים בלבד"
                    onUpgrade={onUpgrade}
                />
            </Section>
        );
    }
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        message: "",
    });

    const [status, setStatus] = useState("idle");

    function update(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus("loading");

        trackClick(slug, "lead");

        try {
            await createLead({ cardId, ...form });
            setStatus("success");
            setForm({ name: "", email: "", phone: "", message: "" });
        } catch (err) {
            setStatus("error");
        }
    }

    if (status === "success") {
        return (
            <Section title="צרו קשר" contentClassName={styles.content}>
                <p className={styles.success}>תודה! פנייתך נשלחה בהצלחה</p>
            </Section>
        );
    }

    return (
        <Section title="צרו קשר" contentClassName={styles.content}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <input
                    placeholder="שם מלא"
                    value={form.name}
                    required
                    onChange={(e) => update("name", e.target.value)}
                    className={formStyles.input}
                />

                <input
                    type="email"
                    placeholder="אימייל"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className={formStyles.input}
                />

                <input
                    placeholder="טלפון"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className={formStyles.input}
                />

                <textarea
                    placeholder="הודעה"
                    rows={3}
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    className={formStyles.textarea}
                />

                <button type="submit" disabled={status === "loading"}>
                    שלח
                </button>

                {status === "error" ? (
                    <p className={styles.error}>שגיאה בשליחת הטופס</p>
                ) : null}
            </form>
        </Section>
    );
}
