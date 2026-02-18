import { useMemo } from "react";
import { useParams } from "react-router-dom";
import styles from "./EditorPreview.module.css";
import CardRenderer from "../card/CardRenderer";
import { withDemoPreviewCard } from "./previewDemo";
import { TEMPLATES } from "../../templates/templates.config";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function toPreviewHrefFromPublicPath(publicPath) {
    const raw = typeof publicPath === "string" ? publicPath.trim() : "";
    if (!raw) return null;

    const origin =
        typeof window !== "undefined" && window.location?.origin
            ? window.location.origin
            : "";

    const isAbsoluteUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw);

    let pathname = null;
    try {
        if (isAbsoluteUrl) {
            if (!origin) return null;
            const u = new URL(raw);
            if (u.origin !== origin) return null;
            pathname = u.pathname || null;
        } else {
            if (!origin) return null;
            const u = new URL(raw, origin);
            pathname = u.pathname || null;
        }
    } catch {
        return null;
    }

    if (!pathname) return null;

    const parts = String(pathname).split("/").filter(Boolean);

    if (parts.length === 2 && parts[0] === "card" && parts[1]) {
        return `/preview/card/${parts[1]}`;
    }

    if (parts.length === 3 && parts[0] === "c" && parts[1] && parts[2]) {
        return `/preview/c/${parts[1]}/${parts[2]}`;
    }

    return null;
}

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

    const previewHref = useMemo(() => {
        return toPreviewHrefFromPublicPath(card?.publicPath);
    }, [card?.publicPath]);

    const showDemoNotice = useMemo(() => {
        const businessName = String(previewCard?.business?.name || "");
        const aboutTitle = String(previewCard?.content?.aboutTitle || "");
        const faqTitle = String(previewCard?.faq?.title || "");
        const hasDemoReviews = Array.isArray(previewCard?.reviews)
            ? previewCard.reviews.some((r) =>
                  String(r?.name || "").includes("דוגמא"),
              )
            : false;

        return (
            businessName.includes("דוגמא") ||
            aboutTitle.includes("דוגמא") ||
            faqTitle.includes("דוגמא") ||
            hasDemoReviews
        );
    }, [previewCard]);

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
                {showDemoNotice &&
                previewHref &&
                typeof window !== "undefined" &&
                window.matchMedia("(min-width: 901px)").matches ? (
                    <div className={styles.demoNotice}>
                        תוכן "דוגמא" - לא יוצג ציבורית, רק
                        <a
                            className={styles.demoNoticeLink}
                            href={previewHref}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            במצב תצוגה מקדימה
                        </a>
                    </div>
                ) : null}
                <CardRenderer card={previewCardForRender} mode="editor" />
                {footer ? <div className={styles.footer}>{footer}</div> : null}
            </div>
        </PhoneFrame>
    );
}
