import Panel from "./Panel";
import DesignEditor from "../design/DesignEditor";
import TemplateSelector from "../TemplateSelector";
import {
    normalizeTemplateId,
    getTemplateById,
} from "../../../templates/templates.config";
import { seedTemplateContent } from "../../../templates/seed/seedTemplateContent";
import styles from "./DesignPanel.module.css";

function labelForPaletteKey(key) {
    const raw = String(key || "").trim();
    if (!raw) return "";
    return raw
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" ");
}

function DesignPanel({ card, design, plan, onChange, onFieldChange, cardId }) {
    const selectedTemplateId = normalizeTemplateId(design?.templateId);
    const selectedTemplate = getTemplateById(selectedTemplateId);

    function handleSelectTemplate(templateId) {
        const tpl = getTemplateById(templateId);

        const nextDesign = tpl?.designDefaults
            ? { ...design, ...tpl.designDefaults, templateId }
            : { ...design, templateId };

        onChange?.(nextDesign);

        if (!tpl || !onFieldChange) return;

        // Seed only once: new card creation / first template apply.
        if (card?.flags?.isTemplateSeeded) return;

        const seededCard = seedTemplateContent(
            { ...card, design: nextDesign },
            tpl
        );

        if (seededCard.business !== card.business) {
            onFieldChange("business", seededCard.business);
        }
        if (seededCard.contact !== card.contact) {
            onFieldChange("contact", seededCard.contact);
        }
        if (seededCard.content !== card.content) {
            onFieldChange("content", seededCard.content);
        }
        if (seededCard.gallery !== card.gallery) {
            onFieldChange("gallery", seededCard.gallery);
        }
        if (seededCard.reviews !== card.reviews) {
            onFieldChange("reviews", seededCard.reviews);
        }
        if (seededCard.services !== card.services) {
            onFieldChange("services", seededCard.services);
        }
        if (seededCard.cta !== card.cta) {
            onFieldChange("cta", seededCard.cta);
        }

        onFieldChange("flags", {
            ...(card.flags || {}),
            isTemplateSeeded: true,
            seededMap: {
                ...(card?.flags?.seededMap || {}),
                [templateId]: true,
            },
        });
    }

    return (
        <Panel title="עיצוב">
            {/* Templates sub-section (default) */}
            <TemplateSelector
                value={selectedTemplateId}
                onSelect={handleSelectTemplate}
            />

            {selectedTemplate?.id === "customV1" &&
            Array.isArray(selectedTemplate?.customPalettes) &&
            selectedTemplate.customPalettes.length ? (
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="customPaletteKey">
                        Palette
                    </label>
                    <select
                        id="customPaletteKey"
                        className={styles.select}
                        value={design?.customPaletteKey || "gold"}
                        onChange={(e) => {
                            const customPaletteKey = String(e.target.value)
                                .trim()
                                .toLowerCase();
                            onChange?.({
                                ...(design || {}),
                                customPaletteKey,
                            });
                        }}
                    >
                        {selectedTemplate.customPalettes.map((key) => (
                            <option key={key} value={key}>
                                {labelForPaletteKey(key)}
                            </option>
                        ))}
                    </select>
                </div>
            ) : null}
            {/* Other design controls */}
            <DesignEditor
                design={design}
                plan={plan}
                onChange={onChange}
                cardId={cardId}
            />
        </Panel>
    );
}

export default DesignPanel;
