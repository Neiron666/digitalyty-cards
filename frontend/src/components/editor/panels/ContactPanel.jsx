import Panel from "./Panel";
import Input from "../../ui/Input";

export default function ContactPanel({
    contact = {},
    onFieldChange,
    editingDisabled = false,
}) {
    const emit = (patch) => {
        if (!patch || typeof patch !== "object") return;
        onFieldChange?.("contact", patch);
    };

    return (
        <Panel title="פרטי קשר">
            <Input
                label="טלפון"
                value={contact.phone || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ phone: e.target.value })}
            />

            <Input
                label="WhatsApp"
                value={contact.whatsapp || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ whatsapp: e.target.value })}
            />

            <Input
                label="Email"
                type="email"
                value={contact.email || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ email: e.target.value })}
            />
        </Panel>
    );
}
