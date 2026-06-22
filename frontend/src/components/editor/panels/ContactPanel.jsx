import { useState } from "react";
import Panel from "./Panel";
import Input from "../../ui/Input";
import styles from "./ContactPanel.module.css";

const PHONE_MAX = 30;
const WHATSAPP_MAX = 20;
const EMAIL_MAX = 254;
const URL_MAX = 2048;

const CUSTOM_ACTION_LABEL_MAX = 80;
const CUSTOM_ACTION_TARGET_MAX = 2048;
const CUSTOM_ACTION_ADDRESS_MAX = 200;
const CUSTOM_ACTIONS_MAX = 5;

const ALLOWED_CUSTOM_ACTION_TYPES = new Set([
    "phone",
    "whatsapp",
    "address",
    "email",
    "facebook",
    "website",
    "url",
]);

function getTargetMaxLength(actionType) {
    return actionType === "address"
        ? CUSTOM_ACTION_ADDRESS_MAX
        : CUSTOM_ACTION_TARGET_MAX;
}

function validateCustomActionTarget(actionType, target) {
    if (!target) return null;
    switch (actionType) {
        case "phone":
            return /^\+?[\d\s\-()+.*#,]+(?:\s*(?:x|ext\.?)\s*\d{1,6})?$/i.test(
                target,
            )
                ? null
                : "מספר טלפון לא תקין.";
        case "whatsapp":
            return /^\+?[\d\s\-()+]{4,20}$/.test(target)
                ? null
                : "מספר וואטסאפ לא תקין.";
        case "email":
            return /^[^\s@<>?&][^@<>?&]*@[^@<>?&]+\.[^@<>?&\s]+$/.test(target)
                ? null
                : "כתובת אימייל לא תקינה.";
        case "address":
            if (/[\x00-\x1F\x7F]/.test(target))
                return "כתובת מכילה תווים לא חוקיים.";
            if (target.length > CUSTOM_ACTION_ADDRESS_MAX)
                return `כתובת יכולה להכיל עד ${CUSTOM_ACTION_ADDRESS_MAX} תווים.`;
            return null;
        case "facebook":
        case "website":
        case "url": {
            const candidate = /^https?:\/\//i.test(target)
                ? target
                : `https://${target}`;
            try {
                const u = new URL(candidate);
                return u.protocol === "https:" || u.protocol === "http:"
                    ? null
                    : "קישור לא תקין.";
            } catch {
                return "קישור לא תקין.";
            }
        }
        default:
            return "סוג כפתור לא תקין.";
    }
}

function validateCustomActionRow(item) {
    if (!item || typeof item !== "object") return "כפתור לא תקין.";
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const target = typeof item.target === "string" ? item.target.trim() : "";
    const actionType =
        typeof item.actionType === "string" ? item.actionType : "";
    if (!label || !target) return "כדי לשמור כפתור זה יש למלא גם שם וגם יעד.";
    if (!ALLOWED_CUSTOM_ACTION_TYPES.has(actionType))
        return "סוג כפתור לא תקין.";
    return validateCustomActionTarget(actionType, target);
}

const CUSTOM_ACTION_TYPE_OPTIONS = [
    { value: "phone", label: "טלפון" },
    { value: "whatsapp", label: "וואטסאפ" },
    { value: "address", label: "כתובת" },
    { value: "email", label: "אימייל" },
    { value: "facebook", label: "פייסבוק" },
    { value: "website", label: "אתר אינטרנט" },
    { value: "url", label: "קישור כללי" },
];

const CUSTOM_ACTION_TARGET_PLACEHOLDER = {
    phone: "054-1234567",
    whatsapp: "054-1234567",
    address: "רחוב הרצל 1, תל אביב",
    email: "name@example.com",
    facebook: "https://facebook.com/your-page",
    website: "https://example.co.il",
    url: "https://example.co.il/booking",
};

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

    const canUseCustomActions = entitlements?.canUseCustomActions === true;
    const customActions =
        canUseCustomActions && Array.isArray(contact.customActions)
            ? contact.customActions
            : [];

    const handleAddCustomAction = () => {
        if (customActions.length >= CUSTOM_ACTIONS_MAX || editingDisabled)
            return;
        emit({
            customActions: [
                ...customActions,
                { label: "", actionType: "phone", target: "" },
            ],
        });
    };

    const handleRemoveCustomAction = (index) => {
        if (editingDisabled) return;
        emit({
            customActions: customActions.filter((_, i) => i !== index),
        });
    };

    const handleCustomActionChange = (index, field, value) => {
        if (editingDisabled) return;
        emit({
            customActions: customActions.map((item, i) =>
                i === index ? { ...item, [field]: value } : item,
            ),
        });
    };

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
                </>
            ) : (
                <div className={styles.lockedBlock}>
                    <div className={styles.lockedTitle}>עוד דרכי קשר</div>
                    <div className={styles.lockedText}>
                        פייסבוק, X וטיקטוק זמינים במסלול פרימיום.
                    </div>
                    <a href="/pricing" className={styles.lockedCta}>
                        שדרג לפרימיום
                    </a>
                </div>
            )}

            {canUseCustomActions ? (
                <div className={styles.customActionsSection}>
                    <div className={styles.customActionsTitle}>
                        כפתורים מותאמים אישית
                    </div>
                    <p className={styles.customActionsHelper}>
                        הוסיפו עד 5 כפתורים נוספים לכרטיס, כמו טלפון נוסף,
                        וואטסאפ נוסף, קישור לתשלום, אתר, פייסבוק, אימייל או
                        כתובת.
                    </p>
                    {fieldErrors["contact.customActions"] && (
                        <p className={styles.customActionsSectionError}>
                            {fieldErrors["contact.customActions"]}
                        </p>
                    )}
                    {customActions.map((item, index) => {
                        const rowError = validateCustomActionRow(item);
                        const targetMax = getTargetMaxLength(item.actionType);
                        const selectId = `custom-action-type-${index}`;
                        return (
                            <div key={index} className={styles.customActionRow}>
                                <Input
                                    label="שם הכפתור"
                                    value={item.label || ""}
                                    disabled={editingDisabled}
                                    onChange={(e) =>
                                        handleCustomActionChange(
                                            index,
                                            "label",
                                            e.target.value,
                                        )
                                    }
                                    maxLength={CUSTOM_ACTION_LABEL_MAX}
                                    placeholder="למשל: התקשרו אליי"
                                />
                                <div className={styles.customActionField}>
                                    <label
                                        htmlFor={selectId}
                                        className={
                                            styles.customActionFieldLabel
                                        }
                                    >
                                        סוג הכפתור
                                    </label>
                                    <select
                                        id={selectId}
                                        className={styles.customActionSelect}
                                        value={item.actionType || "phone"}
                                        disabled={editingDisabled}
                                        onChange={(e) =>
                                            handleCustomActionChange(
                                                index,
                                                "actionType",
                                                e.target.value,
                                            )
                                        }
                                    >
                                        {CUSTOM_ACTION_TYPE_OPTIONS.map(
                                            (opt) => (
                                                <option
                                                    key={opt.value}
                                                    value={opt.value}
                                                >
                                                    {opt.label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                                <Input
                                    label="יעד הכפתור"
                                    value={item.target || ""}
                                    disabled={editingDisabled}
                                    onChange={(e) =>
                                        handleCustomActionChange(
                                            index,
                                            "target",
                                            e.target.value,
                                        )
                                    }
                                    maxLength={targetMax}
                                    placeholder={
                                        CUSTOM_ACTION_TARGET_PLACEHOLDER[
                                            item.actionType
                                        ] || ""
                                    }
                                    dir="ltr"
                                    type={
                                        item.actionType === "email"
                                            ? "email"
                                            : undefined
                                    }
                                    inputMode={
                                        item.actionType === "phone" ||
                                        item.actionType === "whatsapp"
                                            ? "tel"
                                            : item.actionType === "url" ||
                                                item.actionType ===
                                                    "facebook" ||
                                                item.actionType === "website"
                                              ? "url"
                                              : undefined
                                    }
                                    meta={
                                        item.actionType === "address"
                                            ? `נשארו ${remaining(targetMax, item.target || "")} תווים`
                                            : undefined
                                    }
                                />
                                {rowError && (
                                    <p className={styles.customActionRowError}>
                                        {rowError}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    className={styles.customActionRemove}
                                    disabled={editingDisabled}
                                    onClick={() =>
                                        handleRemoveCustomAction(index)
                                    }
                                    aria-label={`הסר כפתור ${index + 1}`}
                                >
                                    הסר
                                </button>
                            </div>
                        );
                    })}
                    {customActions.length < CUSTOM_ACTIONS_MAX && (
                        <button
                            type="button"
                            className={styles.customActionAdd}
                            disabled={editingDisabled}
                            onClick={handleAddCustomAction}
                        >
                            + הוסף כפתור
                        </button>
                    )}
                </div>
            ) : (
                <div className={styles.lockedBlock}>
                    <div className={styles.lockedTitle}>
                        כפתורים מותאמים אישית
                    </div>
                    <div className={styles.lockedText}>
                        כפתורים מותאמים אישית זמינים במסלול פרימיום.
                    </div>
                    <a href="/pricing" className={styles.lockedCta}>
                        שדרג לפרימיום
                    </a>
                </div>
            )}
        </Panel>
    );
}
