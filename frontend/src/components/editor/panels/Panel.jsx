import styles from "./Panel.module.css";

export default function Panel({ title, children }) {
    return (
        <section className={styles.panel}>
            <div className={styles.header}>{title}</div>
            <div className={styles.body}>{children}</div>
        </section>
    );
}
