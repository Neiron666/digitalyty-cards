import { useMemo } from "react";
import { useParams } from "react-router-dom";
import styles from "./EditorPreview.module.css";
import CardRenderer from "../card/CardRenderer";
import { withDemoPreviewCard } from "./previewDemo";
import { TEMPLATES } from "../../templates/templates.config";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function PhoneFrame({ children, className }) {
    return (
        <div className={cx(styles.phoneFrame, className)} data-preview="phone">
            <div className={styles.phoneInner}>
                <div className={styles.phoneScroll}>{children}</div>
            </div>
        </div>
    );
}

export default function EditorPreview({ className, card, header, footer }) {
    const { tab } = useParams();

    const isSelfThemeTab = tab === "design";
    const selfThemeAllowed = Boolean(card?.entitlements?.design?.customColors);
    const selfThemeTemplateId =
        TEMPLATES.find((t) => t?.selfThemeV1 === true)?.id || null;

    const previewCard = useMemo(() => withDemoPreviewCard(card), [card]);

    const previewCardForRender = useMemo(() => {
        if (!isSelfThemeTab || !selfThemeAllowed || !selfThemeTemplateId) {
            return previewCard;
        }

        return {
            ...previewCard,
            design: {
                ...(previewCard?.design || {}),
                templateId: selfThemeTemplateId,
            },
        };
    }, [previewCard, isSelfThemeTab, selfThemeAllowed, selfThemeTemplateId]);

    return (
        <PhoneFrame className={className}>
            <div className={styles.preview}>
                {header ? <div className={styles.header}>{header}</div> : null}
                <CardRenderer card={previewCardForRender} mode="editor" />
                {footer ? <div className={styles.footer}>{footer}</div> : null}
            </div>
        </PhoneFrame>
    );
}
