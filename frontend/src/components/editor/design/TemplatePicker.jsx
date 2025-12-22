import { TEMPLATES } from "../../../templates/templates.config";

function TemplatePicker({ value, onChange, plan }) {
    return (
        <section>
            <h3>בחירת תבנית</h3>

            <div style={{ display: "flex", gap: 8 }}>
                {TEMPLATES.map((tpl) => {
                    const disabled = false;
                    return (
                        <button
                            key={tpl.id}
                            disabled={disabled}
                            onClick={() => !disabled && onChange(tpl.id)}
                            style={{
                                border:
                                    value === tpl.id
                                        ? "2px solid var(--gold)"
                                        : "1px solid var(--border)",
                                opacity: disabled ? 0.5 : 1,
                                cursor: disabled ? "not-allowed" : "pointer",
                                background: "var(--bg-card)",
                                color: "var(--text-main)",
                                borderRadius: "999px",
                                padding: "10px 14px",
                                fontWeight: 800,
                            }}
                            title={disabled ? "זמין רק למנויים" : ""}
                        >
                            {tpl.name}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

export default TemplatePicker;
