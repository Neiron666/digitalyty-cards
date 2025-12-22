import Panel from "./Panel";
import Input from "../../ui/Input";

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
            />

            <Input
                label="תחום עיסוק"
                value={business.category || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ category: e.target.value })}
            />

            <Input
                label="סלוגן"
                value={business.slogan || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ slogan: e.target.value })}
            />
        </Panel>
    );
}
