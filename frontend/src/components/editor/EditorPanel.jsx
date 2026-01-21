import BusinessPanel from "./panels/BusinessPanel";
import ContactPanel from "./panels/ContactPanel";
import ContentPanel from "./panels/ContentPanel";
import GalleryPanel from "./panels/GalleryPanel";
import ReviewsPanel from "./panels/ReviewsPanel";
import FaqPanel from "./panels/FaqPanel";
import DesignPanel from "./panels/DesignPanel";
import SettingsPanel from "./panels/SettingsPanel";
import SeoPanel from "./panels/SeoPanel";
import AnalyticsPanel from "./panels/AnalyticsPanel";
import TemplateSelector from "./TemplateSelector";
import { normalizeTemplateId } from "../../templates/templates.config";

export default function EditorPanel({
    tab,
    card,
    onFieldChange,
    editingDisabled,
    onDeleteCard,
    isDeleting,
    onUpgrade,
    onPublish,
    onUnpublish,
}) {
    const effectivePlan = card?.effectiveBilling?.plan || "free";
    const galleryLimit = card?.entitlements?.galleryLimit;

    function applyPatch(sectionName, patch) {
        if (!patch || typeof patch !== "object") return;
        for (const key of Object.keys(patch)) {
            onFieldChange?.(`${sectionName}.${key}`, patch[key]);
        }
    }

    switch (tab) {
        case "templates":
            return (
                <TemplateSelector
                    value={normalizeTemplateId(card?.design?.templateId)}
                    onSelect={(templateId) => {
                        onFieldChange?.("design.templateId", templateId);
                    }}
                />
            );

        case "business":
            return (
                <BusinessPanel
                    business={card.business}
                    editingDisabled={editingDisabled}
                    onFieldChange={(sectionName, patch) => {
                        if (sectionName !== "business") return;
                        onFieldChange?.("business", patch);
                    }}
                />
            );

        case "contact":
            return (
                <ContactPanel
                    contact={card.contact}
                    editingDisabled={editingDisabled}
                    onFieldChange={(sectionName, patch) => {
                        if (sectionName !== "contact") return;
                        onFieldChange?.("contact", patch);
                    }}
                />
            );

        case "content":
            return (
                <ContentPanel
                    content={card.content}
                    disabled={editingDisabled}
                    onChange={(patch) => applyPatch("content", patch)}
                />
            );

        case "design":
            return (
                <DesignPanel
                    design={card.design}
                    plan={effectivePlan}
                    cardId={card._id}
                    onChange={(design) => onFieldChange?.("design", design)}
                />
            );

        case "gallery":
            return (
                <GalleryPanel
                    gallery={card.gallery}
                    cardId={card._id}
                    plan={effectivePlan}
                    galleryLimit={galleryLimit}
                    onChange={(gallery) => onFieldChange?.("gallery", gallery)}
                    onUpgrade={onUpgrade}
                />
            );

        case "reviews":
            return (
                <ReviewsPanel
                    reviews={card.reviews}
                    onChange={(reviews) => onFieldChange?.("reviews", reviews)}
                />
            );

        case "faq":
            return (
                <FaqPanel
                    faq={card.faq}
                    disabled={editingDisabled}
                    onChange={(faq) => onFieldChange?.("faq", faq)}
                />
            );

        case "seo":
            return (
                <SeoPanel
                    seo={card.seo}
                    disabled={editingDisabled}
                    onChange={(patch) => applyPatch("seo", patch)}
                />
            );

        case "settings":
            return (
                <SettingsPanel
                    card={card}
                    plan={effectivePlan}
                    onDelete={onDeleteCard}
                    onUpgrade={onUpgrade}
                    editingDisabled={editingDisabled}
                    isDeleting={isDeleting}
                    onPublish={onPublish}
                    onUnpublish={onUnpublish}
                />
            );

        case "analytics":
            return <AnalyticsPanel card={card} />;

        default:
            return null;
    }
}
