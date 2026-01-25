import Panel from "./Panel";
import Button from "../../ui/Button";
import formStyles from "../../ui/Form.module.css";
import styles from "./FaqPanel.module.css";

const MAX_ITEMS = 5;

function normalizeItems(items) {
    return Array.isArray(items)
        ? items
              .filter((x) => x && typeof x === "object")
              .map((x) => ({
                  q: typeof x.q === "string" ? x.q : "",
                  a: typeof x.a === "string" ? x.a : "",
              }))
        : [];
}

export default function FaqPanel({ faq, disabled, onChange }) {
    const value = faq && typeof faq === "object" ? faq : {};

    const title = typeof value.title === "string" ? value.title : "";
    const lead = typeof value.lead === "string" ? value.lead : "";

    const items = normalizeItems(value.items);

    const incompleteCount = items.filter((it) => {
        const q = typeof it?.q === "string" ? it.q.trim() : "";
        const a = typeof it?.a === "string" ? it.a.trim() : "";
        return (q && !a) || (!q && a);
    }).length;

    function commit(next) {
        onChange?.(next);
    }

    function updateField(key, nextValue) {
        commit({
            ...(value || {}),
            [key]: nextValue,
            items,
        });
    }

    function updateItem(index, patch) {
        const nextItems = items.map((it, i) =>
            i === index ? { ...it, ...patch } : it,
        );
        commit({
            ...(value || {}),
            title,
            lead,
            items: nextItems,
        });
    }

    function addItem() {
        if (items.length >= MAX_ITEMS) return;
        const nextItems = [...items, { q: "", a: "" }];
        commit({ ...(value || {}), title, lead, items: nextItems });
    }

    function removeItem(index) {
        const nextItems = items.filter((_, i) => i !== index);
        commit({ ...(value || {}), title, lead, items: nextItems });
    }

    return (
        <Panel title="שאלות ותשובות">
            <div className={styles.fieldGroup}>
                <label className={styles.label}>
                    כותרת
                    <input
                        className={formStyles.input}
                        type="text"
                        value={title}
                        onChange={(e) => updateField("title", e.target.value)}
                        disabled={disabled}
                        placeholder="שאלות ותשובות נפוצות"
                    />
                </label>

                <label className={styles.label}>
                    תיאור קצר (אופציונלי)
                    <textarea
                        className={formStyles.textarea}
                        rows={2}
                        value={lead}
                        onChange={(e) => updateField("lead", e.target.value)}
                        disabled={disabled}
                    />
                </label>
            </div>

            <div className={styles.items}>
                {items.map((item, index) => (
                    <div key={index} className={styles.item}>
                        <div className={styles.itemHeader}>
                            <div className={styles.itemTitle}>
                                שאלה #{index + 1}
                            </div>
                        </div>

                        <label className={styles.label}>
                            שאלה
                            <textarea
                                className={formStyles.textarea}
                                rows={2}
                                value={item.q}
                                onChange={(e) =>
                                    updateItem(index, { q: e.target.value })
                                }
                                disabled={disabled}
                            />
                        </label>

                        <label className={styles.label}>
                            תשובה
                            <textarea
                                className={formStyles.textarea}
                                rows={3}
                                value={item.a}
                                onChange={(e) =>
                                    updateItem(index, { a: e.target.value })
                                }
                                disabled={disabled}
                            />
                        </label>
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => removeItem(index)}
                            disabled={disabled}
                        >
                            מחק
                        </Button>
                    </div>
                ))}

                <div className={styles.actions}>
                    {incompleteCount ? (
                        <div className={styles.incompleteHint}>
                            יש למלא גם שאלה וגם תשובה כדי לשמור פריט FAQ.
                        </div>
                    ) : null}
                    <Button
                        size="small"
                        onClick={addItem}
                        disabled={disabled || items.length >= MAX_ITEMS}
                    >
                        הוסף שאלה
                    </Button>
                    {items.length >= MAX_ITEMS ? (
                        <div className={styles.hint}>
                            הגעת למקסימום של {MAX_ITEMS} שאלות
                        </div>
                    ) : null}
                    <div className={styles.hint}>מקסימום {MAX_ITEMS}</div>
                </div>
            </div>
        </Panel>
    );
}
