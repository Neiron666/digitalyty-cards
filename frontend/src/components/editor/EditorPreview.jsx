import { useMemo } from "react";
import styles from "./EditorPreview.module.css";
import CardRenderer from "../card/CardRenderer";
import { withDemoPreviewCard } from "./previewDemo";

function PhoneFrame({ children }) {
    return (
        <div className={styles.phoneFrame} data-preview="phone">
            <div className={styles.phoneInner}>
                <div className={styles.phoneScroll}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function EditorPreview({ card, header, footer }) {
    const previewCard = useMemo(() => withDemoPreviewCard(card), [card]);

    return (
        <PhoneFrame>
            <div className={styles.preview}>
                {header ? <div className={styles.header}>{header}</div> : null}
                <CardRenderer card={previewCard} />
                {footer ? <div className={styles.footer}>{footer}</div> : null}
            </div>
        </PhoneFrame>
    );
}
