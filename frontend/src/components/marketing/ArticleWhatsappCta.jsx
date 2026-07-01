import { useId } from "react";
import { buildSupportWhatsAppHref } from "../../utils/supportContact";
import { trackSiteClick } from "../../services/siteAnalytics.client";
import { SITE_ACTIONS } from "../../services/siteAnalytics.actions";
import whatsappStyles from "./WhatsAppCtaSkin.module.css";
import styles from "./ArticleWhatsappCta.module.css";

/** Static message – not user-controlled. Encoded by buildSupportWhatsAppHref. */
const ARTICLE_CTA_MESSAGE =
    "שלום, קראתי תוכן באתר Cardigo ואני רוצה לקבל עזרה ביצירת כרטיס ביקור דיגיטלי לעסק שלי.";

/** Computed once at module init – safe static constant. */
const ARTICLE_CTA_HREF = buildSupportWhatsAppHref(ARTICLE_CTA_MESSAGE);

/**
 * Shared inline WhatsApp CTA block.
 * Rendered between the author card and the related-content section
 * on /blog/:slug and /guides/:slug detail pages.
 */
export default function ArticleWhatsappCta() {
    const headingId = useId();

    return (
        <aside className={styles.wrap} aria-labelledby={headingId}>
            <h2 id={headingId} className={styles.heading}>
                צריכים כרטיס דיגיטלי לעסק?
            </h2>
            <p className={styles.body}>
                נשמח לעזור לכם להבין מה מתאים לעסק שלכם ואיך להתחיל נכון עם
                Cardigo.
            </p>
            <a
                href={ARTICLE_CTA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.ctaLink} ${whatsappStyles.skin}`}
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
