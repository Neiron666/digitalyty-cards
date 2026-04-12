import { useId } from "react";
import styles from "./Input.module.css";
import FieldValidationMessage from "./FieldValidationMessage";

export default function Input({
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    meta,
    error,
    required = false,
    className = "",
    ...props
}) {
    const uid = useId();
    const errorId = error ? `${uid}-err` : undefined;

    const inputClass = [styles.input, error ? styles.error : "", className]
        .filter(Boolean)
        .join(" ");

    return (
        <label className={styles.field}>
            {label && (
                <span className={styles.label}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </span>
            )}
            <input
                className={inputClass}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                {...props}
                aria-invalid={error ? true : undefined}
                aria-describedby={errorId}
            />
            {meta ? <span className={styles.meta}>{meta}</span> : null}
            {error && (
                <FieldValidationMessage id={errorId}>
                    {error}
                </FieldValidationMessage>
            )}
        </label>
    );
}
