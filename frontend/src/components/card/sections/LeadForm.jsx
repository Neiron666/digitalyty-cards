import { useState } from "react";
import { createLead } from "../../../services/leads.service";
import Paywall from "../../common/Paywall";
import formStyles from "../../ui/Form.module.css";
import { trackClick } from "../../../services/analytics.client";

export default function LeadForm({ cardId, slug, entitlements, onUpgrade }) {
    if (!entitlements?.canUseLeads) {
        return (
            <Paywall
                text="טופס יצירת קשר זמין למנויים בלבד"
                onUpgrade={onUpgrade}
            />
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
        return <p>תודה! פנייתך נשלחה בהצלחה</p>;
    }

    return (
        <form className="lead-form" onSubmit={handleSubmit}>
            <h3>צרו קשר</h3>

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

            {status === "error" && <p className="error">שגיאה בשליחת הטופס</p>}
        </form>
    );
}
