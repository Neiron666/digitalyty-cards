import styles from "./Page.module.css";

export default function Page({ title, subtitle, children }) {
    return (
        <main className={styles.page}>
            <header className={styles.hero}>
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
            </header>

            <div className={styles.sectionDivider} />

            <section className={styles.content}>{children}</section>
        </main>
    );
}
