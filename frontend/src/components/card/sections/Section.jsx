import styles from "./Section.module.css";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function Section({ title, children, className, titleClassName, contentClassName }) {
    return (
        <section className={cx(styles.section, className)}>
            {title && (
                <h2 className={cx(styles.title, titleClassName)}>{title}</h2>
            )}
            <div className={cx(styles.content, contentClassName)}>
                {children}
            </div>
        </section>
    );
}

export default Section;
