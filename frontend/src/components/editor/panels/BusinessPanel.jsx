import Panel from "./Panel";
import Input from "../../ui/Input";
import styles from "./BusinessPanel.module.css";

const BUSINESS_NAME_MAX = 60;
const BUSINESS_SUBTITLE_MAX = 80;
const BUSINESS_CITY_MAX = 40;
const BUSINESS_SLOGAN_MAX = 120;
const BUSINESS_ADDRESS_MAX = 150;

function remaining(max, value) {
    const s = typeof value === "string" ? value : String(value || "");
    return Math.max(0, max - s.length);
}

export default function BusinessPanel({
    business = {},
    onFieldChange,
    editingDisabled = false,
    entitlements,
}) {
    const emit = (patch) => {
        if (!patch || typeof patch !== "object") return;
        onFieldChange?.("business", patch);
    };
    const showPremiumFields = entitlements?.canUseServices !== false;

    return (
        <Panel title="פרטי העסק">
            <Input
                label="שם העסק"
                value={business.name || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ name: e.target.value })}
                onBlur={(e) => emit({ name: e.target.value.trim() })}
                maxLength={BUSINESS_NAME_MAX}
                meta={`נשארו ${remaining(BUSINESS_NAME_MAX, business.name || "")} תווים`}
                data-tour-id="editor-tour-field-business-name"
            />

            <Input
                label="תחום עיסוק"
                value={business.category || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ category: e.target.value })}
                onBlur={(e) => emit({ category: e.target.value.trim() })}
                maxLength={BUSINESS_SUBTITLE_MAX}
                meta={`נשארו ${remaining(BUSINESS_SUBTITLE_MAX, business.category || "")} תווים`}
                data-tour-id="editor-tour-field-business-category"
            />

            <Input
                label="עיר הפעילות"
                value={business.city || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ city: e.target.value })}
                onBlur={(e) => emit({ city: e.target.value.trim() })}
                maxLength={BUSINESS_CITY_MAX}
                placeholder="לדוגמה: תל אביב, חיפה, ירושלים"
                meta={`יעזור להציג את העסק בצורה מדויקת יותר בגוגל ובכרטיס. נשארו ${remaining(BUSINESS_CITY_MAX, business.city || "")} תווים`}
            />

            {showPremiumFields ? (
                <Input
                    label="רחוב ומספר בית"
                    value={business.address || ""}
                    disabled={editingDisabled}
                    onChange={(e) => emit({ address: e.target.value })}
                    onBlur={(e) => emit({ address: e.target.value.trim() })}
                    maxLength={BUSINESS_ADDRESS_MAX}
                    placeholder="לדוגמה: הרצל 12"
                    meta={`הכתובת תשמש לניווט בגוגל מפות ובווייז. נשארו ${remaining(BUSINESS_ADDRESS_MAX, business.address || "")} תווים`}
                />
            ) : (
                <div className={styles.lockedBlock}>
                    <div className={styles.lockedTitle}>מיקום וניווט</div>
                    <div className={styles.lockedText}>
                        הוספת כתובת וכפתורי ניווט בגוגל מפות ובווייז זמינה
                        במסלול פרימיום.
                    </div>
                    <a href="/pricing" className={styles.lockedCta}>
                        שדרג לפרימיום
                    </a>
                </div>
            )}

            <Input
                label="סלוגן"
                value={business.slogan || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ slogan: e.target.value })}
                onBlur={(e) => emit({ slogan: e.target.value.trim() })}
                maxLength={BUSINESS_SLOGAN_MAX}
                meta={`נשארו ${remaining(BUSINESS_SLOGAN_MAX, business.slogan || "")} תווים`}
            />
        </Panel>
    );
}
