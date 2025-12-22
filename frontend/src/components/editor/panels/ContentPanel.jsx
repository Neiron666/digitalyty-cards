import Panel from "./Panel";
import Input from "../../ui/Input";
import formStyles from "../../ui/Form.module.css";

export default function ContentPanel({ content = {}, onChange }) {
    return (
        <Panel title="תוכן">
            <Input
                label="כותרת אודות"
                value={content.aboutTitle || ""}
                onChange={(e) => onChange({ aboutTitle: e.target.value })}
            />

            <label>
                <span style={{ fontWeight: 700 }}>טקסט אודות</span>
                <textarea
                    rows={5}
                    value={content.aboutText || ""}
                    onChange={(e) => onChange({ aboutText: e.target.value })}
                    className={formStyles.textarea}
                />
            </label>

            <Input
                label="קישור לסרטון YouTube"
                value={content.videoUrl || ""}
                onChange={(e) => onChange({ videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/..."
            />
            <div style={{ marginTop: -8, color: "var(--text-muted)" }}>
                Paste a YouTube link
            </div>
        </Panel>
    );
}
