import styles from "./Section.module.css";

function Section({ title, children }) {
    return (
        <section className={styles.section}>
            {title && <h2 className={styles.title}>{title}</h2>}
            <div className={styles.content}>{children}</div>
        </section>
    );
}

export default Section;
