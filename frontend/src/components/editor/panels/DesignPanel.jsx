import Panel from "./Panel";
import DesignEditor from "../design/DesignEditor";

function DesignPanel({ design, plan, onChange, cardId }) {
    return (
        <Panel title="עיצוב">
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
