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

            <Input
                label="Website"
                value={contact.website || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ website: e.target.value })}
            />

            <Input
                label="Facebook"
                value={contact.facebook || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ facebook: e.target.value })}
            />

            <Input
                label="Instagram"
                value={contact.instagram || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ instagram: e.target.value })}
            />

            <Input
                label="X/Twitter"
                value={contact.twitter || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ twitter: e.target.value })}
            />

            <Input
                label="TikTok"
                value={contact.tiktok || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ tiktok: e.target.value })}
            />

            <Input
                label="Waze (link)"
                value={contact.waze || ""}
                disabled={editingDisabled}
                onChange={(e) => emit({ waze: e.target.value })}
            />
        </Panel>
    );
}
