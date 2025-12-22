import styles from "./Input.module.css";

export default function Input({
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    error,
    required = false,
    className = "",
    ...props
}) {
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
            />
            {error && <span className={styles.errorText}>{error}</span>}
        </label>
    );
}
