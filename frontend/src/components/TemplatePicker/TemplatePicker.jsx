import { TEMPLATES } from "../../templates/templates.config";

function PhoneMiniPreview({ src, alt }) {
    return (
        <div
            style={{
                width: 92,
                aspectRatio: "9 / 16",
                borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.12)",
                overflow: "hidden",
                background: "#0b0b0f",
                boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
            }}
        >
            <img
                src={src}
                alt={alt}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                loading="lazy"
            />
        </div>
    );
}

export default function TemplatePicker({ value, onChange }) {
    return (
        <div /* ...existing code... */>
            {TEMPLATES.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange?.(t.id)}
                    // ...existing code...
                >
                    <PhoneMiniPreview src={t.previewImage} alt={t.name} />
                    <div /* ...existing code... */>{t.name}</div>
                </button>
            ))}
        </div>
    );
}