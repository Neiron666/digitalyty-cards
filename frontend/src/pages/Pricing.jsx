import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Page from "../components/page/Page";
import PricingPlans from "../components/pricing/PricingPlans";
import FlashBanner from "../components/ui/FlashBanner/FlashBanner";
import styles from "./Pricing.module.css";
import motion from "../styles/motion.module.css";
import scroll from "../styles/motion-scroll.module.css";
import PricingFAQ from "../components/pricing/PricingFAQ";
import { trackSitePageView } from "../services/siteAnalytics.client";
import useMotionReveal from "../hooks/useMotionReveal";
import useScrollProgress from "../hooks/useScrollProgress";

const PAYMENT_FLASH = {
    success: {
        type: "success",
        message:
            "התשלום התקבל בהצלחה. החשבון יתעדכן תוך כמה דקות. אם לא השתנה — רעננו את הדף.",
    },
    fail: {
        type: "error",
        message: "התשלום לא הושלם. אפשר לנסות שוב.",
    },
};

export default function Pricing() {
    const [searchParams, setSearchParams] = useSearchParams();
    const payment = searchParams.get("payment");
    const flash = PAYMENT_FLASH[payment] || null;
    const valueReveal = useMotionReveal();
    const seoReveal = useMotionReveal();
    const zoomScroll = useScrollProgress();
    const parallaxScroll = useScrollProgress();
    const driftScroll = useScrollProgress();

    useEffect(() => {
        trackSitePageView();
    }, []);

    function dismissBanner() {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("payment");
                return next;
            },
            { replace: true },
        );
    }

    return (
        <Page
            title="מחירים"
            subtitle="בחרו את התכנית שמתאימה לכם והתחילו ליצור כרטיס ביקור דיגיטלי מקצועי"
        >
            {flash && (
                <div className={styles.paymentBanner}>
                    <FlashBanner
                        type={flash.type}
                        message={flash.message}
                        autoHideMs={0}
                        onDismiss={dismissBanner}
                    />
                </div>
            )}

            <PricingPlans />

            <section
                ref={valueReveal.ref}
                className={`${styles.value} ${motion.fadeUp} ${valueReveal.isRevealed ? motion.isVisible : ""}`}
            >
                <p className={styles.valueTitle}>
                    כל התכניות כוללות כרטיס מקצועי, מותאם למובייל ושיתוף בלחיצה.
                </p>
                <p className={styles.valueText}>
                    התחילו בחינם, ושדרגו כשאתם צריכים פיצ׳רים מתקדמים.
                </p>
            </section>

            <PricingFAQ />
            {/* SEO */}
            <section
                ref={seoReveal.ref}
                className={`${styles.seo} ${motion.fadeUp} ${motion.delay200} ${seoReveal.isRevealed ? motion.isVisible : ""}`}
            >
                <h2>כמה עולה כרטיס ביקור דיגיטלי?</h2>
                <p>
                    כרטיס ביקור דיגיטלי הוא פתרון חכם וחסכוני לעסקים. במקום
                    להדפיס כרטיסים שוב ושוב, משלמים פעם אחת או במנוי ונהנים
                    מכרטיס שמתעדכן בזמן אמת, נראה מקצועי ומתאים למובייל.
                </p>
                <p>
                    ב-Cardigo ניתן להתחיל בחינם ולשדרג לתכנית פרימיום הכוללת
                    אפשרויות מתקדמות כמו גלריה מורחבת, המלצות, וידאו וטופס
                    לידים.
                </p>
                <p>
                    בעמוד זה תוכלו למצוא מחירים, תכניות ותשובות לשאלות נפוצות
                    לגבי כרטיס ביקור דיגיטלי, כולל מידע על ניסיון חינמי, מנוי
                    חודשי ומנוי שנתי.
                </p>
            </section>

            {/* V2 scroll-linked demos */}
            <section className={styles.demoSection}>
                <h3 className={styles.demoTitle}>זום עדין בגלילה</h3>
                <p className={styles.demoText}>
                    אלמנט ויזואלי שגדל בעדינות ככל שגוללים — תחושת עומק פרימיום.
                </p>
                <div
                    ref={zoomScroll.ref}
                    className={`${styles.demoVisual} ${scroll.scrollZoomSoft}`}
                >
                    <span className={styles.demoIcon}>🔍</span>
                </div>
            </section>

            <section className={styles.demoSection}>
                <h3 className={styles.demoTitle}>פרלקס רך</h3>
                <p className={styles.demoText}>
                    תנועה עדינה כלפי מעלה שמייצרת שכבות עומק בין הסקשנים.
                </p>
                <div
                    ref={parallaxScroll.ref}
                    className={`${styles.demoVisual} ${scroll.scrollParallaxSoft}`}
                >
                    <span className={styles.demoIcon}>✨</span>
                </div>
            </section>

            <section className={styles.demoSection}>
                <h3 className={styles.demoTitle}>סחף אופקי</h3>
                <p className={styles.demoText}>
                    שורת פריטים שנעה לאט הצידה עם הגלילה — אשליית תנועה אופקית.
                </p>
                <div className={scroll.scrollDriftInlineWrap}>
                    <div
                        ref={driftScroll.ref}
                        className={`${styles.demoDriftRow} ${scroll.scrollDriftInline}`}
                    >
                        <div className={styles.demoDriftItem}>
                            כרטיס דיגיטלי
                        </div>
                        <div className={styles.demoDriftItem}>שיתוף בלחיצה</div>
                        <div className={styles.demoDriftItem}>עיצוב מותאם</div>
                        <div className={styles.demoDriftItem}>טופס לידים</div>
                        <div className={styles.demoDriftItem}>גלריה מורחבת</div>
                        <div className={styles.demoDriftItem}>וידאו מוטמע</div>
                    </div>
                </div>
            </section>
        </Page>
    );
}
