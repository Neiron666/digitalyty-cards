import styles from "./CardLayout.module.css";

function CardLayout({ children, design, mode }) {
    const font = String(design?.font || "").trim();
    const fontClass =
        font === "Rubik, sans-serif"
            ? styles.fontRubik
            : font === "Arial, sans-serif"
            ? styles.fontArial
            : styles.fontHeebo;

    return (
        <div className={styles.wrapper}>
            <div
                className={`${styles.card} ${
                    mode === "public" ? styles.cardPublic : ""
                } ${fontClass}`}
            >
                {children}
            </div>
        </div>
    );
}

export default CardLayout;
