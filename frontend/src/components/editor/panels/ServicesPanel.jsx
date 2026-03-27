import { useEffect, useRef, useState } from "react";
import Panel from "./Panel";
import Input from "../../ui/Input";
import styles from "./ServicesPanel.module.css";

const SERVICES_MAX = 10;

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
    return arr
        .map((v) => (typeof v === "string" ? v : ""))
        .map((v) => v.replace(/\s+/g, " "))
        .map((v) => v.trim());
}

function buildCommittedServices(title, items) {
    const nextTitle = typeof title === "string" ? title : "";
    const normalizedTitle = nextTitle.trim();
    const cleanedItems = cleanItems(items).filter(Boolean);

    if (!normalizedTitle && cleanedItems.length === 0) {
        return null;
    }

    return {
        title: normalizedTitle || null,
        items: cleanedItems,
    };
}

function serializeCommittedServices(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return "null";
    }

    return JSON.stringify(buildCommittedServices(value.title, value.items));
}

export default function ServicesPanel({ services, disabled, onChange }) {
    const normalized = normalizeServices(services);
    const [draftTitle, setDraftTitle] = useState(() => normalized.title);
    const [draftItems, setDraftItems] = useState(() => normalized.items);
    const lastCommittedSignatureRef = useRef(
        serializeCommittedServices(services),
    );

    useEffect(() => {
        const nextSignature = serializeCommittedServices(services);
        if (nextSignature === lastCommittedSignatureRef.current) return;

        lastCommittedSignatureRef.current = nextSignature;
        const nextNormalized = normalizeServices(services);
        setDraftTitle(nextNormalized.title);
        setDraftItems(nextNormalized.items);
    }, [services]);

    function commit(nextTitle, nextItems) {
        const committed = buildCommittedServices(nextTitle, nextItems);
        const nextSignature = JSON.stringify(committed);

        if (nextSignature === serializeCommittedServices(services)) {
            return;
        }

        lastCommittedSignatureRef.current = nextSignature;
        onChange?.({ services: committed });
    }

    function setTitle(nextTitle) {
        setDraftTitle(nextTitle);
        commit(nextTitle, draftItems);
    }

    function setItem(index, value) {
        const next = draftItems.slice();
        next[index] = value;
        setDraftItems(next);
        commit(draftTitle, next);
    }

    function addItem() {
        if (draftItems.length >= SERVICES_MAX) return;
        setDraftItems((prev) => [...prev, ""]);
    }

    function removeItem(index) {
        const next = draftItems.filter((_, i) => i !== index);
        const safeNext = next.length ? next : [""];
        setDraftItems(safeNext);
        commit(draftTitle, safeNext);
    }

    const rowCount = draftItems.length;
    const remainingSlots = Math.max(0, SERVICES_MAX - rowCount);
    const isOverLimit = rowCount > SERVICES_MAX;
    const overflowCount = Math.max(0, rowCount - SERVICES_MAX);

    return (
        <Panel title="שירותים">
            <div className={styles.root} dir="rtl">
                <div className={styles.block}>
                    <Input
                        label="כותרת (אופציונלי)"
                        value={draftTitle}
                        disabled={disabled}
                        placeholder="לדוגמה: שירותים"
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className={styles.block}>
                    <div className={styles.list}>
                        {draftItems.map((value, index) => {
                            const key = `service-${index}`;
                            const canRemove = draftItems.length > 1;
                            return (
                                <div key={key} className={styles.itemBlock}>
                                    <Input
                                        value={value}
                                        disabled={disabled}
                                        placeholder="הקלד/י שירות"
                                        onChange={(e) =>
                                            setItem(index, e.target.value)
                                        }
                                    />
                                    {canRemove && (
                                        <div className={styles.itemActionRow}>
                                            <button
                                                type="button"
                                                className={styles.removeButton}
                                                disabled={disabled}
                                                onClick={() =>
                                                    removeItem(index)
                                                }
                                            >
                                                הסר
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {isOverLimit && (
                        <div className={styles.overLimitWarning}>
                            המגבלה עודכנה ל-{SERVICES_MAX} שירותים. יש להסיר{" "}
                            {overflowCount}{" "}
                            {overflowCount === 1 ? "שירות" : "שירותים"} לפני
                            שמירה.
                        </div>
                    )}

                    <div className={styles.addRow}>
                        <button
                            type="button"
                            className={styles.addButton}
                            disabled={disabled || rowCount >= SERVICES_MAX}
                            onClick={addItem}
                        >
                            + הוסף שירות
                        </button>
                        <span className={styles.counter}>
                            נותרו {remainingSlots}/{SERVICES_MAX}
                        </span>
                    </div>

                    <div className={styles.hint}>
                        כדי להסתיר את הסקשן בכרטיס הציבורי, מחק/י את כל הפריטים.
                        רק שירותים מלאים נשמרים.
                    </div>
                </div>
            </div>
        </Panel>
    );
}
