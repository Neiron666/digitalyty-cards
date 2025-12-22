import TemplateRenderer from "../../templates/TemplateRenderer";

function CardRenderer({ card, onUpgrade, mode }) {
    return <TemplateRenderer card={card} onUpgrade={onUpgrade} mode={mode} />;
}

export default CardRenderer;
