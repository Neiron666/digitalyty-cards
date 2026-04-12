import styles from "./FieldValidationMessage.module.css";

/**
 * Shared field-level validation message primitive.
 * Presentation-only: no validation logic, no live-region policy.
 * Caller provides `id` so that inputs can point aria-describedby to it.
 * Usable inside Input.jsx and alongside non-Input controls (e.g. raw checkboxes).
 */
export default function FieldValidationMessage({ id, children }) {
    if (!children) return null;
    return (
        <span id={id} className={styles.message}>
            {children}
        </span>
    );
}
