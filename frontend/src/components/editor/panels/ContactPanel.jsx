import { useState } from "react";
import Panel from "./Panel";
import Input from "../../ui/Input";
import styles from "./ContactPanel.module.css";

const PHONE_MAX = 30;
const WHATSAPP_MAX = 20;
const EMAIL_MAX = 254;
const URL_MAX = 2048;

function remaining(max, value) {
    const s = typeof value === "string" ? value : String(value || "");
    return Math.max(0, max - s.length);
}

export default function ContactPanel({
    contact = {},
    onFieldChange,
    editingDisabled = false,
    entitlements,
    fieldErrors = {},
}) {
    const showPremiumFields = entitlements?.canUseServices !== false;
    const phone = contact.phone || "";
    const whatsapp = contact.whatsapp || "";

    const [whatsappLinked, setWhatsappLinked] = useState(
        () => !whatsapp || whatsapp === phone,
    );

    const emit = (patch) => {
        if (!patch || typeof patch !== "object") return;
        onFieldChange?.("contact", patch);
    };

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        if (whatsappLinked) {
            emit({ phone: value, whatsapp: value });
        } else {
            emit({ phone: value });
        }
    };

    const handleLinkToggle = (e) => {
        const checked = e.target.checked;
        setWhatsappLinked(checked);
        if (checked) {
            emit({ whatsapp: phone });
        }
    };

    const activePhoneMax = whatsappLinked ? WHATSAPP_MAX : PHONE_MAX;

    return (
        <Panel title="פרטי קשר">
            <Input
                label="טלפון"
                value={phone}
                disabled={editingDisabled}
                onChange={handlePhoneChange}
                maxLength={activePhoneMax}
                meta={`נשארו ${remaining(activePhoneMax, phone)} תווים`}
                error={fieldErrors["contact.phone"]}
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                data-tour-id="editor-tour-field-contact-phone"
            />

            <label className={styles.syncRow}>
                <input
                    type="checkbox"
                    checked={whatsappLinked}
                    disabled={editingDisabled}
                    onChange={handleLinkToggle}
                />
                <span className={styles.syncLabel}>
                    מספר הוואטסאפ זהה למספר הטלפון
                </span>
            </label>

            <Input
                label="וואטסאפ"
                value={whatsapp}
                disabled={editingDisabled || whatsappLinked}
                onChange={(e) => emit({ whatsapp: e.target.value })}
                maxLength={WHATSAPP_MAX}
                error={fieldErrors["contact.whatsapp"]}
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
            />

            <Input
                label="כתובת אימייל"
                type="email"
                value={contact.email || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ email: e.target.value })}
                maxLength={EMAIL_MAX}
                data-tour-id="editor-tour-field-contact-email"
                meta={`נשארו ${remaining(EMAIL_MAX, contact.email || "")} תווים`}
                error={fieldErrors["contact.email"]}
            />

            <Input
                label="אתר אינטרנט"
                value={contact.website || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ website: e.target.value })}
                maxLength={URL_MAX}
                error={fieldErrors["contact.website"]}
            />

            <Input
                label="אינסטגרם"
                value={contact.instagram || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ instagram: e.target.value })}
                maxLength={URL_MAX}
                error={fieldErrors["contact.instagram"]}
            />

            {showPremiumFields ? (
                <>
                    <Input
                        label="פייסבוק"
                        value={contact.facebook || ""}
                        disabled={editingDisabled}
                        onChange={(e) => emit({ facebook: e.target.value })}
                        maxLength={URL_MAX}
                        error={fieldErrors["contact.facebook"]}
                    />

                    <Input
                        label="X (טוויטר)"
                        value={contact.twitter || ""}
                        disabled={editingDisabled}
                        onChange={(e) => emit({ twitter: e.target.value })}
                        maxLength={URL_MAX}
                        error={fieldErrors["contact.twitter"]}
                    />

                    <Input
                        label="טיקטוק"
                        value={contact.tiktok || ""}
                        disabled={editingDisabled}
                        onChange={(e) => emit({ tiktok: e.target.value })}
                        maxLength={URL_MAX}
                        error={fieldErrors["contact.tiktok"]}
                    />

                    <Input
                        label="קישור לניווט בווייז"
                        value={contact.waze || ""}
                        disabled={editingDisabled}
                        onChange={(e) => emit({ waze: e.target.value })}
                        maxLength={URL_MAX}
                        error={fieldErrors["contact.waze"]}
                    />
                </>
            ) : (
                <div className={styles.lockedBlock}>
                    <div className={styles.lockedTitle}>עוד דרכי קשר</div>
                    <div className={styles.lockedText}>
                        פייסבוק, X, טיקטוק וווייז זמינים במסלול פרימיום.
                    </div>
                    <a href="/pricing" className={styles.lockedCta}>
                        שדרג לפרימיום
                    </a>
                </div>
            )}
        </Panel>
    );
}
