import { useId, useState } from "react";
import styles from "./PasswordInput.module.css";
import FieldValidationMessage from "./FieldValidationMessage";

function EyeIcon({ visible }) {
    if (visible) {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
            >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
        );
    }
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

export default function PasswordInput({
    label,
    value,
    onChange,
    autoComplete,
    required = false,
    error,
    meta,
    minLength,
    maxLength,
    onBlur,
    className = "",
    // Discard any caller-provided type — type is controlled internally
    // by the show/hide toggle and must never be overridden externally.
    type: _ignoredType,
    ...props
}) {
    const uid = useId();
    const inputId = `${uid}-input`;
    const errorId = error ? `${uid}-err` : undefined;
    const metaId = meta ? `${uid}-meta` : undefined;

    const [showPassword, setShowPassword] = useState(false);

    const describedBy =
        [metaId, errorId].filter(Boolean).join(" ") || undefined;

    const inputClass = [styles.input, error ? styles.inputError : "", className]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={styles.field}>
            {label && (
                <label htmlFor={inputId} className={styles.label}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
            )}
            <div className={styles.inputWrap}>
                <input
                    {...props}
                    id={inputId}
                    className={inputClass}
                    type={showPassword ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                    required={required}
                    minLength={minLength}
                    maxLength={maxLength}
                    onBlur={onBlur}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                />
                <button
                    type="button"
                    className={styles.toggle}
                    aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                >
                    <EyeIcon visible={showPassword} />
                </button>
            </div>
            {meta && (
                <span id={metaId} className={styles.meta}>
                    {meta}
                </span>
            )}
            {error && (
                <FieldValidationMessage id={errorId}>
                    {error}
                </FieldValidationMessage>
            )}
        </div>
    );
}
