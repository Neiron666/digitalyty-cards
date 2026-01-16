import { TEMPLATES } from "../../../templates/templates.config";
import styles from "./TemplatePicker.module.css";

function TemplatePicker({ value, onChange, plan }) {
    return (
        <section>
            <h3>בחירת תבנית</h3>

            <div className={styles.row}>
                {TEMPLATES.map((tpl) => {
                    const disabled = false;
                    return (
                        <button
                            key={tpl.id}
                            disabled={disabled}
                            onClick={() => !disabled && onChange(tpl.id)}
                            className={`${styles.templateButton} ${
                                value === tpl.id ? styles.isSelected : ""
                            }`}
                            title={disabled ? "זמין רק למנויים" : ""}
                        >
                            {tpl.name}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

export default TemplatePicker;
