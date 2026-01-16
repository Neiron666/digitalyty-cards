import { TEMPLATES } from "../../templates/templates.config";
import styles from "./TemplatePicker.module.css";

function PhoneMiniPreview({ src, alt }) {
    return (
        <div className={styles.preview}>
            <img
                src={src}
                alt={alt}
                className={styles.previewImg}
                loading="lazy"
            />
        </div>
    );
}

export default function TemplatePicker({ value, onChange }) {
    return (
        <div className={styles.root}>
            {TEMPLATES.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange?.(t.id)}
                    className={`${styles.button} ${
                        value === t.id ? styles.buttonSelected : ""
                    }`}
                >
                    <PhoneMiniPreview src={t.previewImage} alt={t.name} />
                    <div className={styles.name}>{t.name}</div>
                </button>
            ))}
        </div>
    );
}
