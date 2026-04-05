import { useState } from "react";
import Panel from "./Panel";
import Input from "../../ui/Input";
import styles from "./ContactPanel.module.css";

export default function ContactPanel({
    contact = {},
    onFieldChange,
    editingDisabled = false,
    entitlements,
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

    return (
        <Panel title="פרטי קשר">
            <Input
                label="טלפון"
                value={phone}
                disabled={editingDisabled}
                onChange={handlePhoneChange}
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
            />

            <Input
                label="כתובת אימייל"
                type="email"
                value={contact.email || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ email: e.target.value })}
            />

            <Input
                label="אתר אינטרנט"
                value={contact.website || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ website: e.target.value })}
            />

            <Input
                label="אינסטגרם"
                value={contact.instagram || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ instagram: e.target.value })}
            />

            {showPremiumFields && (
                <>
                    <Input
                        label="פייסבוק"
                        value={contact.facebook || ""}
                        disabled={editingDisabled}
                        onChange={(e) => emit({ facebook: e.target.value })}
                    />

                    <Input
                        label="X (טוויטר)"
                        value={contact.twitter || ""}
                        disabled={editingDisabled}
                        onChange={(e) => emit({ twitter: e.target.value })}
                    />

                    <Input
                        label="טיקטוק"
                        value={contact.tiktok || ""}
                        disabled={editingDisabled}
                        onChange={(e) => emit({ tiktok: e.target.value })}
                    />

                    <Input
                        label="קישור לניווט בווייז"
                        value={contact.waze || ""}
                        disabled={editingDisabled}
                        onChange={(e) => emit({ waze: e.target.value })}
                    />
                </>
            )}
        </Panel>
    );
}
