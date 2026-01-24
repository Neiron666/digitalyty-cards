import Panel from "./Panel";
import Input from "../../ui/Input";
import formStyles from "../../ui/Form.module.css";
import styles from "./ContentPanel.module.css";

export default function ContentPanel({ content = {}, onChange }) {
    const aboutParagraphsRaw =
        Array.isArray(content.aboutParagraphs) && content.aboutParagraphs.length
            ? content.aboutParagraphs
            : typeof content.aboutText === "string" && content.aboutText.trim()
              ? content.aboutText.split(/\n\s*\n/)
              : [""];

    const aboutParagraphs = aboutParagraphsRaw
        .slice(0, 3)
        .map((v) => (typeof v === "string" ? v : ""));

    function commitAboutParagraphs(nextParagraphs) {
        const safe = Array.isArray(nextParagraphs)
            ? nextParagraphs.slice(0, 3)
            : [""];

        onChange({
            aboutParagraphs: safe,
            // Legacy bridge (tolerant writer). Backend will normalize/filter empties.
            aboutText: safe.join("\n\n"),
        });
    }

    return (
        <Panel title="תוכן">
            <Input
                label="כותרת אודות"
                value={content.aboutTitle || ""}
                onChange={(e) => onChange({ aboutTitle: e.target.value })}
            />

            <div className={styles.aboutBlock}>
                <div className={styles.aboutLabelTitle}>טקסט אודות</div>

                {aboutParagraphs.map((value, index) => (
                    <label key={index} className={styles.aboutParagraph}>
                        <textarea
                            rows={5}
                            value={value}
                            onChange={(e) => {
                                const next = aboutParagraphs.slice();
                                next[index] = e.target.value;
                                commitAboutParagraphs(next);
                            }}
                            className={formStyles.textarea}
                        />
                    </label>
                ))}

                <button
                    type="button"
                    className={styles.addParagraphButton}
                    onClick={() => {
                        if (aboutParagraphs.length >= 3) return;
                        commitAboutParagraphs([...aboutParagraphs, ""]);
                    }}
                    disabled={aboutParagraphs.length >= 3}
                >
                    + הוסף פסקה חדשה
                </button>
            </div>

            <Input
                label="קישור לסרטון YouTube"
                value={content.videoUrl || ""}
                onChange={(e) => onChange({ videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/..."
            />
            <div className={styles.hint}>Paste a YouTube link</div>
        </Panel>
    );
}
