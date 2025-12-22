import styles from "./SectionTitle.module.css";

export default function SectionTitle({ children, level = 2, ...props }) {
    const Tag = `h${level}`;
    return (
        <Tag className={styles.title} {...props}>
            {children}
        </Tag>
    );
}
