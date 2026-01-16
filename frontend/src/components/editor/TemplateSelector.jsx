import { TEMPLATES } from "../../templates/templates.config";
import Button from "../ui/Button";
import styles from "./TemplateSelector.module.css";

export default function TemplateSelector({ value, onSelect }) {
    return (
        <div className={styles.root}>
            <div className={styles.head}>
                <h2 className={styles.title}>בחר תבנית</h2>
                <p className={styles.subtitle}>
                    בחר עיצוב כדי להתחיל לערוך את הכרטיס.
                </p>
            </div>

            <div className={styles.grid}>
                {TEMPLATES.map((tpl) => {
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
                                    alt={tpl.name}
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
