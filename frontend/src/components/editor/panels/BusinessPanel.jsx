import Panel from "./Panel";
import Input from "../../ui/Input";

const BUSINESS_NAME_MAX = 60;
const BUSINESS_SUBTITLE_MAX = 80;
const BUSINESS_SLOGAN_MAX = 120;

function remaining(max, value) {
    const s = typeof value === "string" ? value : String(value || "");
    return Math.max(0, max - s.length);
}

export default function BusinessPanel({
    business = {},
    onFieldChange,
    editingDisabled = false,
}) {
    const emit = (patch) => {
        if (!patch || typeof patch !== "object") return;
        onFieldChange?.("business", patch);
    };

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
            />

            <Input
                label="תחום עיסוק"
                value={business.category || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ category: e.target.value })}
                onBlur={(e) => emit({ category: e.target.value.trim() })}
                maxLength={BUSINESS_SUBTITLE_MAX}
                meta={`נשארו ${remaining(BUSINESS_SUBTITLE_MAX, business.category || "")} תווים`}
            />

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
