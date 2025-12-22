import { getTemplateById, normalizeTemplateId } from "./templates.config";
import ClassicTemplate from "./classic/ClassicTemplate";
import MinimalTemplate from "./minimal/MinimalTemplate";

export default function TemplateRenderer({ card, onUpgrade, mode }) {
    const templateId = normalizeTemplateId(card?.design?.templateId);

    switch (templateId) {
        case "minimal":
            return (
                <MinimalTemplate card={card} onUpgrade={onUpgrade} mode={mode} />
            );
        case "classic":
        default:
            return (
                <ClassicTemplate card={card} onUpgrade={onUpgrade} mode={mode} />
            );
    }
}

export function getTemplateSupports(card) {
    return getTemplateById(card?.design?.templateId)?.supports;
}
