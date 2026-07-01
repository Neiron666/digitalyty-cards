import { useId } from "react";
import { useLocation } from "react-router-dom";
import { buildSupportWhatsAppHref } from "../../utils/supportContact";
import { trackSiteClick } from "../../services/siteAnalytics.client";
import { SITE_ACTIONS } from "../../services/siteAnalytics.actions";
import whatsappStyles from "./WhatsAppCtaSkin.module.css";
import ArticleLeadForm from "./ArticleLeadForm";
import styles from "./ArticleConversionBlock.module.css";

/** Static message — not user-controlled. Encoded by buildSupportWhatsAppHref. */
const ARTICLE_CTA_MESSAGE =
    "שלום, קראתי תוכן באתר Cardigo ואני רוצה לקבל עזרה ביצירת כרטיס ביקור דיגיטלי לעסק שלי.";

/** Computed once at module init — safe static constant. */
const ARTICLE_CTA_HREF = buildSupportWhatsAppHref(ARTICLE_CTA_MESSAGE);

/**
 * Conversion block rendered between the author card and related-content section
 * on /blog/:slug and /guides/:slug detail pages.
 * Contains the contact form (ArticleLeadForm) and an always-visible WhatsApp CTA.
 *
 * Props:
 *   sourceTitle {string} - post.title, passed to ArticleLeadForm for backend logging context.
 *                          Must not be derived from document.title (use post.title directly).
 */
export default function ArticleConversionBlock({ sourceTitle }) {
    const headingId = useId();
    const location = useLocation();
    const sourcePath = location.pathname;

    return (
        <aside className={styles.wrap} aria-labelledby={headingId}>
            <h2 id={headingId} className={styles.heading}>
                קבלו הצעת מחיר
            </h2>
            <p className={styles.body}>
                השאירו פרטים ונחזור אליכם לגבי כרטיס ביקור דיגיטלי לעסק שלכם.
            </p>

            <ArticleLeadForm
                sourcePath={sourcePath}
                sourceTitle={sourceTitle}
                whatsappHref={ARTICLE_CTA_HREF}
            />

            <div className={styles.divider} aria-hidden="true" />
            <p className={styles.orText}>או דברו איתנו ישירות:</p>
            <a
                href={ARTICLE_CTA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.whatsappLink} ${whatsappStyles.skin}`}
                onClick={() =>
                    trackSiteClick({
                        action: SITE_ACTIONS.article_detail_whatsapp_cta,
                    })
                }
            >
                <span className={whatsappStyles.icon} aria-hidden="true" />
                <span>דברו איתנו בוואטסאפ</span>
            </a>
        </aside>
    );
}
