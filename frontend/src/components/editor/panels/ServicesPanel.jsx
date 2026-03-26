import Panel from "./Panel";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import formStyles from "../../ui/Form.module.css";
import styles from "./ServicesPanel.module.css";

function normalizeServices(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { title: "", items: [""] };
    }

    const title = typeof value.title === "string" ? value.title : "";
    const rawItems = Array.isArray(value.items) ? value.items : [];
    const items = rawItems
        .map((v) => (typeof v === "string" ? v : ""))
        .filter((v) => v !== null && v !== undefined);

    return {
        title,
        items: items.length ? items : [""],
    };
}

function cleanItems(items) {
    const arr = Array.isArray(items) ? items : [];
    const cleaned = arr
        .map((v) => (typeof v === "string" ? v : ""))
        .map((v) => v.replace(/\s+/g, " "))
        .map((v) => v.trim());

    // Keep at least one row for editing.
    return cleaned.length ? cleaned : [""];
}

export default function ServicesPanel({ services, disabled, onChange }) {
    const normalized = normalizeServices(services);
    const title = normalized.title;
    const items = normalized.items;

    function commit(next) {
        const nextTitle = typeof next?.title === "string" ? next.title : "";
        const nextItems = cleanItems(next?.items);

        const hasTitle = Boolean(nextTitle.trim());
        const hasItems = nextItems.some(
            (v) => typeof v === "string" && v.trim(),
        );

        if (!hasTitle && !hasItems) {
            onChange?.({ services: null });
            return;
        }

        onChange?.({
            services: {
                title: nextTitle.trim() || null,
                items: nextItems.filter((v) => v && v.trim()),
            },
        });
    }

    function setTitle(nextTitle) {
        commit({ title: nextTitle, items });
    }

    function setItem(index, value) {
        const next = items.slice();
        next[index] = value;
        commit({ title, items: next });
    }

    function addItem() {
        commit({ title, items: [...items, ""] });
    }

    function removeItem(index) {
        const next = items.filter((_, i) => i !== index);
        commit({ title, items: next.length ? next : [""] });
    }

    return (
        <Panel title="שירותים">
            <div className={styles.root} dir="rtl">
                <div className={styles.block}>
                    <div className={styles.labelRow}>
                        <div className={styles.label}>כותרת (אופציונלי)</div>
                    </div>
                    <Input
                        value={title}
                        disabled={disabled}
                        placeholder="לדוגמה: שירותים"
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className={styles.block}>
                    <div className={styles.labelRow}>
                        <div className={styles.label}>רשימת שירותים</div>
                    </div>

                    <div className={styles.list}>
                        {items.map((value, index) => {
                            const key = `service-${index}`;
                            const canRemove = items.length > 1;
                            return (
                                <div key={key} className={styles.row}>
                                    <Input
                                        value={value}
                                        disabled={disabled}
                                        placeholder="הקלד/י שירות"
                                        onChange={(e) =>
                                            setItem(index, e.target.value)
                                        }
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className={formStyles.inlineButton}
                                        disabled={disabled || !canRemove}
                                        onClick={() => removeItem(index)}
                                    >
                                        הסר
                                    </Button>
                                </div>
                            );
                        })}
                    </div>

                    <div className={styles.actions}>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={disabled}
                            onClick={addItem}
                        >
                            הוסף שירות
                        </Button>
                    </div>

                    <div className={styles.hint}>
                        כדי להסתיר את הסקשן בכרטיס הציבורי, מחק/י את כל הפריטים.
                    </div>
                </div>
            </div>
        </Panel>
    );
}
