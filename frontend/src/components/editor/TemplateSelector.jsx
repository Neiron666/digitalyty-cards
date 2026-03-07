import { useState } from "react";
import { TEMPLATES } from "../../templates/templates.config";
import Button from "../ui/Button";
import styles from "./TemplateSelector.module.css";

export default function TemplateSelector({ value, onSelect }) {
    const [activeGroup, setActiveGroup] = useState("light");

    const visibleTemplates = TEMPLATES.filter(
        (tpl) => !tpl?.selfThemeV1 && tpl.group === activeGroup,
    );
    return (
        <div className={styles.root}>
            <div className={styles.head}>
                <h2 className={styles.title}>בחר תבנית</h2>
                <p className={styles.subtitle}>
                    בחר עיצוב כדי להתחיל לערוך את הכרטיס.
                </p>
            </div>

            <div className={styles.groupToggle}>
                <button
                    type="button"
                    className={`${styles.groupBtn} ${activeGroup === "light" ? styles.groupBtnActive : ""}`}
                    onClick={() => setActiveGroup("light")}
                >
                    תבניות רקע לבן
                </button>
                <button
                    type="button"
                    className={`${styles.groupBtn} ${activeGroup === "dark" ? styles.groupBtnActive : ""}`}
                    onClick={() => setActiveGroup("dark")}
                >
                    תבניות רקע שחור
                </button>
            </div>

            <div className={styles.grid}>
                {visibleTemplates.map((tpl) => {
                    const selected = value === tpl.id;
                    const previewSrc = tpl.previewImage || tpl.preview;
                    const description = tpl.description || "";
                    return (
                        <div
                            key={tpl.id}
                            className={`${styles.card} ${
                                selected ? styles.selected : ""
                            }`}
                        >
                            <div className={styles.preview}>
                                <img
                                    src={previewSrc}
                                    alt=""
                                    aria-hidden="true"
                                    loading="lazy"
                                />
                            </div>

                            <div className={styles.meta}>
                                <div className={styles.name}>{tpl.name}</div>
                                <div className={styles.desc}>{description}</div>
                            </div>

                            <Button
                                variant={selected ? "primary" : "secondary"}
                                size="small"
                                aria-label={`בחר תבנית: ${tpl.name}`}
                                onClick={() => onSelect(tpl.id)}
                            >
                                {selected ? "נבחר" : "בחר תבנית"}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
