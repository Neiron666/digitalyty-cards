import { useMemo } from "react";
import styles from "./EditorPreview.module.css";
import CardRenderer from "../card/CardRenderer";
import { withDemoPreviewCard } from "./previewDemo";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function PhoneFrame({ children, className }) {
    return (
        <div
            className={cx(styles.phoneFrame, className)}
            data-preview="phone"
        >
            <div className={styles.phoneInner}>
                <div className={styles.phoneScroll}>{children}</div>
            </div>
        </div>
    );
}

export default function EditorPreview({ className, card, header, footer }) {
    const previewCard = useMemo(() => withDemoPreviewCard(card), [card]);

    return (
        <PhoneFrame className={className}>
            <div className={styles.preview}>
                {header ? <div className={styles.header}>{header}</div> : null}
                <CardRenderer card={previewCard} mode="editor" />
                {footer ? <div className={styles.footer}>{footer}</div> : null}
            </div>
        </PhoneFrame>
    );
}
