import styles from "./Button.module.css";

export default function Button({
    as: Component = "button",
    children,
    variant = "primary",
    size = "medium",
    fullWidth = false,
    loading = false,
    className = "",
    type = "button",
    disabled = false,
    ...props
}) {
    const isNativeButton = Component === "button";

    const classes = [
        styles.btn || styles.button,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    const isDisabled = disabled || loading;

    const content = (
        <span className={styles.label}>{loading ? "טוען..." : children}</span>
    );

    if (isNativeButton) {
        return (
            <button
                className={classes}
                type={type}
                disabled={isDisabled}
                {...props}
            >
                {content}
            </button>
        );
    }

    return (
        <Component className={classes} aria-disabled={isDisabled} {...props}>
            {content}
        </Component>
    );
}
