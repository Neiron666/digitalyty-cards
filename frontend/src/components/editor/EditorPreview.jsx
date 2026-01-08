import styles from "./EditorPreview.module.css";
import CardRenderer from "../card/CardRenderer";

function PhoneFrame({ children }) {
    return (
        <div className={styles.phoneFrame}>
            <div className={styles.phoneInner}>
                <div className={styles.phoneScroll}>{children}</div>
            </div>
        </div>
    );
}

export default function EditorPreview({ card, header, footer }) {
    return (
        <PhoneFrame>
            <div className={styles.preview}>
                {header ? <div className={styles.header}>{header}</div> : null}
                <CardRenderer card={card} />
                {footer ? <div className={styles.footer}>{footer}</div> : null}
            </div>
        </PhoneFrame>
    );
}
