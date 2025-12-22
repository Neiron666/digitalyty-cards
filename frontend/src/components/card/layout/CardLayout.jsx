import styles from "./CardLayout.module.css";

function CardLayout({ children, design, mode }) {
    const styleVars = {
        "--primary-color": design?.primaryColor || "var(--primary)",
        "--background-color": design?.backgroundColor || "#020617",
        "--button-text-color": design?.buttonTextColor || "#ffffff",
        "--font-family": design?.font || "Heebo, sans-serif",
    };

    const cardStyle =
        mode === "public" ? { ...styleVars, maxWidth: "100%" } : styleVars;

    return (
        <div className={styles.wrapper}>
            <div className={styles.card} style={cardStyle}>
                {children}
            </div>
        </div>
    );
}

export default CardLayout;
