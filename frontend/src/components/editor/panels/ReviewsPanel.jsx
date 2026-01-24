import Panel from "./Panel";
import Button from "../../ui/Button";
import formStyles from "../../ui/Form.module.css";
import styles from "./ReviewsPanel.module.css";

export default function ReviewsPanel({ reviews = [], onChange }) {
    const REVIEWS_MAX = 5;

    function addReview() {
        if (reviews.length >= REVIEWS_MAX) return;
        onChange([...reviews, ""]);
    }

    function updateReview(index, value) {
        const updated = [...reviews];
        updated[index] = value;
        onChange(updated);
    }

    function removeReview(index) {
        const updated = reviews.filter((_, i) => i !== index);
        onChange(updated);
    }

    return (
        <Panel title="המלצות">
            {reviews.map((review, index) => (
                <div key={index} className={styles.reviewItem}>
                    <textarea
                        rows={2}
                        value={review}
                        onChange={(e) => updateReview(index, e.target.value)}
                        className={formStyles.textarea}
                    />

                    <Button
                        variant="secondary"
                        size="small"
                        onClick={() => removeReview(index)}
                    >
                        מחק
                    </Button>
                </div>
            ))}

            <div className={styles.addRow}>
                <Button
                    size="small"
                    onClick={addReview}
                    disabled={reviews.length >= REVIEWS_MAX}
                    className={styles.addButton}
                >
                    הוסף המלצה
                </Button>

                {reviews.length >= REVIEWS_MAX ? (
                    <div className={styles.hint}>הגעת למקסימום של 5 המלצות</div>
                ) : null}
            </div>
        </Panel>
    );
}
