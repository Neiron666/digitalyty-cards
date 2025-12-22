import Template1 from "./Template1";
import Template2 from "./Template2";
import Template3 from "./Template3";
import Template4 from "./Template4";
import Template5 from "./Template5";
import Template6 from "./Template6";
import Template7 from "./Template7";
import Template8 from "./Template8";
import Template9 from "./Template9";
import Template10 from "./Template10";

function TemplateResolver({ card }) {
    switch (card.templateId) {
        case 1:
            return <Template1 card={card} />;
        case 2:
            return <Template2 card={card} />;
        case 3:
            return <Template3 card={card} />;
        case 4:
            return <Template4 card={card} />;
        case 5:
            return <Template5 card={card} />;
        case 6:
            return <Template6 card={card} />;
        case 7:
            return <Template7 card={card} />;
        case 8:
            return <Template8 card={card} />;
        case 9:
            return <Template9 card={card} />;
        case 10:
            return <Template10 card={card} />;
        default:
            return <Template1 card={card} />;
    }
}

export default TemplateResolver;
