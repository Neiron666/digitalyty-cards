import Panel from "./Panel";
import Button from "../../ui/Button";
import formStyles from "../../ui/Form.module.css";
import styles from "./FaqPanel.module.css";

const MIN_ITEMS = 3;
const MAX_ITEMS = 10;

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

function ensureMin(items) {
    const next = [...items];
    while (next.length < MIN_ITEMS) next.push({ q: "", a: "" });
    return next;
}

export default function FaqPanel({ faq, disabled, onChange }) {
    const value = faq && typeof faq === "object" ? faq : {};

    const title = typeof value.title === "string" ? value.title : "";
    const lead = typeof value.lead === "string" ? value.lead : "";

    const items = ensureMin(normalizeItems(value.items));

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
        const nextItems = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
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
        if (items.length <= MIN_ITEMS) return;
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
                            <div className={styles.itemTitle}>שאלה #{index + 1}</div>
                            <Button
                                variant="secondary"
                                size="small"
                                onClick={() => removeItem(index)}
                                disabled={disabled || items.length <= MIN_ITEMS}
                            >
                                מחק
                            </Button>
                        </div>

                        <label className={styles.label}>
                            שאלה
                            <textarea
                                className={formStyles.textarea}
                                rows={2}
                                value={item.q}
                                onChange={(e) => updateItem(index, { q: e.target.value })}
                                disabled={disabled}
                            />
                        </label>

                        <label className={styles.label}>
                            תשובה
                            <textarea
                                className={formStyles.textarea}
                                rows={3}
                                value={item.a}
                                onChange={(e) => updateItem(index, { a: e.target.value })}
                                disabled={disabled}
                            />
                        </label>
                    </div>
                ))}

                <div className={styles.actions}>
                    <Button
                        size="small"
                        onClick={addItem}
                        disabled={disabled || items.length >= MAX_ITEMS}
                    >
                        הוסף שאלה
                    </Button>
                    <div className={styles.hint}>
                        מינימום {MIN_ITEMS}, מקסימום {MAX_ITEMS}
                    </div>
                </div>
            </div>
        </Panel>
    );
}
