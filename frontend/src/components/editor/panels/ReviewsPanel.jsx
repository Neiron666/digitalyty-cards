import Panel from "./Panel";
import Button from "../../ui/Button";
import formStyles from "../../ui/Form.module.css";

export default function ReviewsPanel({ reviews = [], onChange }) {
    function addReview() {
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
                <div
                    key={index}
                    className="review-item"
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
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

            <Button size="small" onClick={addReview}>
                הוסף המלצה
            </Button>
        </Panel>
    );
}
