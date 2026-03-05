import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Page from "../components/page/Page";
import PricingPlans from "../components/pricing/PricingPlans";
import FlashBanner from "../components/ui/FlashBanner/FlashBanner";
import styles from "./Pricing.module.css";
import PricingFAQ from "../components/pricing/PricingFAQ";
import { trackSitePageView } from "../services/siteAnalytics.client";

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

            <section className={styles.value}>
                <p className={styles.valueTitle}>
                    כל התכניות כוללות כרטיס מקצועי, מותאם למובייל ושיתוף בלחיצה.
                </p>
                <p className={styles.valueText}>
                    התחילו בחינם, ושדרגו כשאתם צריכים פיצ׳רים מתקדמים.
                </p>
            </section>

            <PricingFAQ />
            {/* SEO */}
            <section className={styles.seo}>
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
        </Page>
    );
}
