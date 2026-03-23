import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import SeoHelmet from "../components/seo/SeoHelmet";
import FlashBanner from "../components/ui/FlashBanner/FlashBanner";
import { trackSitePageView } from "../services/siteAnalytics.client";
import { trackSiteClick } from "../services/siteAnalytics.client";
import { SITE_ACTIONS } from "../services/siteAnalytics.actions";
import pub from "../styles/public-sections.module.css";
import styles from "./Pricing.module.css";

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";

/* ── Grouped accordion data per plan ─────────────────── */

const FREE_ACCORDIONS = [
    {
        title: "מה כלול במסלול",
        items: [
            "כרטיס ביקור דיגיטלי מקצועי",
            "עריכה עצמית פשוטה",
            "עוזר AI להתחלה מהירה",
            "שיתוף בוואטסאפ וברשתות",
            "קוד QR מוכן לשיתוף",
            "שמירת איש קשר בלחיצה",
            "עיצוב מוכן להתחלה מהירה",
        ],
    },
    {
        title: "למי זה מתאים",
        items: [
            "7 ימי ניסיון מלאים",
            "מתאים לבדיקה ראשונה בלי התחייבות",
            "דרך פשוטה לראות איך Cardigo עובד בפועל",
        ],
    },
];

const MONTHLY_ACCORDIONS = [
    {
        title: "פיצ׳רים בסיסיים",
        items: [
            "כרטיס ביקור דיגיטלי מקצועי",
            "עריכה עצמית פשוטה",
            "עוזר AI להתחלה מהירה",
            "שיתוף בוואטסאפ וברשתות",
            "קוד QR מוכן לשיתוף",
            "שמירת איש קשר בלחיצה",
            "עיצוב מוכן להתחלה מהירה",
        ],
    },
    {
        title: "פיצ׳רי פרימיום",
        items: [
            "גלריית תמונות מורחבת",
            "סרטון YouTube בכרטיס",
            "המלצות לקוחות",
            "טופס לידים ואיסוף פניות",
            "מעקב פעילות ואנליטיקה",
            "SEO ונוכחות דיגיטלית מתקדמת",
            "עיצוב מתקדם וכתובת אישית",
        ],
    },
    {
        title: "למי זה מתאים",
        items: [
            "לעסק שרוצה גמישות מלאה",
            "למי שרוצה להתחיל, להפסיק ולחדש לפי הצורך",
            "מתאים לעבודה שוטפת בלי התחייבות לשנה",
        ],
    },
];

const ANNUAL_ACCORDIONS = [
    {
        title: "פיצ׳רים בסיסיים",
        items: [
            "כרטיס ביקור דיגיטלי מקצועי",
            "עריכה עצמית פשוטה",
            "עוזר AI להתחלה מהירה",
            "שיתוף בוואטסאפ וברשתות",
            "קוד QR מוכן לשיתוף",
            "שמירת איש קשר בלחיצה",
            "עיצוב מוכן להתחלה מהירה",
        ],
    },
    {
        title: "פיצ׳רי פרימיום",
        items: [
            "גלריית תמונות מורחבת",
            "סרטון YouTube בכרטיס",
            "המלצות לקוחות",
            "טופס לידים ואיסוף פניות",
            "מעקב פעילות ואנליטיקה",
            "SEO ונוכחות דיגיטלית מתקדמת",
            "עיצוב מתקדם וכתובת אישית",
        ],
    },
    {
        title: "יתרונות המסלול השנתי",
        items: [
            "חיסכון של ₪78.90 בשנה",
            "יציבות לעסק לאורך שנה",
            "שקט בלי חידוש חודשי מתמשך",
        ],
    },
];

function GroupedAccordions({ groups }) {
    return (
        <div className={styles.accordionStack}>
            {groups.map((g) => (
                <details key={g.title} className={styles.accordionBlock}>
                    <summary className={styles.accordionTitle}>
                        {g.title}
                    </summary>
                    <ul className={styles.accordionList}>
                        {g.items.map((item) => (
                            <li key={item} className={styles.accordionItem}>
                                {item}
                            </li>
                        ))}
                    </ul>
                </details>
            ))}
        </div>
    );
}

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
        <main data-page="site">
            <SeoHelmet
                title="מחירים לכרטיס ביקור דיגיטלי | Cardigo"
                description="המחירים של Cardigo לכרטיס ביקור דיגיטלי מקצועי: ניסיון חינמי ל־7 ימים, מסלול פרימיום חודשי ומסלול שנתי משתלם לעסקים שרוצים נוכחות דיגיטלית ברורה ומקצועית."
                canonicalUrl={`${ORIGIN}/pricing`}
                url={`${ORIGIN}/pricing`}
                image={`${ORIGIN}/images/og/cardigo-home-og-1200x630.jpg`}
            />

            {/* ── Payment flash banner (preserved) ──────────── */}
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

            {/* ── Hero ──────────────────────────────────────── */}
            <section className={pub.sectionDark}>
                <div className={`${pub.sectionWrap} ${styles.heroWrap}`}>
                    <div className={styles.heroCopy}>
                        <h1 className={styles.h1}>
                            בחרו את הדרך הנכונה
                            <span
                                className={`${styles.h1Accent} ${pub.goldUnderline}`}
                            >
                                להתחיל עם Cardigo
                            </span>
                        </h1>

                        <p className={pub.sectionLeadLight}>
                            הכרטיס הדיגיטלי שמציג את העסק שלכם בצורה מקצועית,
                            מדויקת ומעוצבת — בכל מכשיר, בכל רגע, עם כל מה שצריך
                            בעמוד אחד.
                        </p>
                        {/* ── Product visual stage ──────────────── */}
                        <div className={styles.heroStage}>
                            <img
                                src="/images/Pricing/Cardigo-bussines-digital-card-bussiness-growth.webp"
                                alt="כרטיס ביקור דיגיטלי לעסקים — Cardigo"
                                className={styles.stageImg}
                                width={960}
                                height={540}
                                loading="eager"
                                decoding="async"
                            />
                        </div>
                        <div className={styles.heroActions}>
                            <Button
                                as={Link}
                                to="/register"
                                variant="primary"
                                className={styles.heroCta}
                                onClick={() =>
                                    trackSiteClick({
                                        action: SITE_ACTIONS.pricing_trial_start,
                                        pagePath: "/pricing",
                                    })
                                }
                            >
                                להתחיל ניסיון חינמי
                            </Button>

                            <Button
                                as="a"
                                href="#plans"
                                variant="secondary"
                                className={styles.heroSecondary}
                            >
                                לראות את המסלולים
                            </Button>
                        </div>
                    </div>

                    <p className={styles.trustLine}>
                        בלי סיבוך, בלי עומס — לעסק שרוצה להיראות מקצועי כבר
                        מהיום הראשון.
                    </p>
                </div>
            </section>

            {/* ── Pricing plans ────────────────────────────── */}
            <section id="plans" className={pub.sectionLight}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>
                        בחרו את המסלול שמתאים לעסק שלכם
                    </h2>
                    <p className={pub.sectionLead}>
                        אפשר להתחיל בניסיון חינמי, לבחור במסלול חודשי גמיש או
                        ללכת על מסלול שנתי משתלם יותר לעסק שרוצה יציבות ונוכחות
                        מקצועית לאורך זמן.
                    </p>

                    <div className={styles.plansRow}>
                        {/* ── Free trial ─────────────────── */}
                        <div className={styles.planCard}>
                            <span className={styles.planTitle}>
                                ניסיון חינמי
                            </span>
                            <span className={styles.planPrice}>₪0</span>
                            <span className={styles.planCadence}>ל־7 ימים</span>
                            <p className={styles.planNote}>
                                התחלה פשוטה בלי התחייבות — כדי לראות איך הכרטיס
                                עובד בפועל.
                            </p>
                            <GroupedAccordions groups={FREE_ACCORDIONS} />
                            <Button
                                as={Link}
                                to="/register"
                                variant="secondary"
                                className={styles.planCta}
                                onClick={() =>
                                    trackSiteClick({
                                        action: SITE_ACTIONS.pricing_trial_start,
                                        pagePath: "/pricing",
                                    })
                                }
                            >
                                להתחיל עכשיו
                            </Button>
                        </div>

                        {/* ── Monthly ────────────────────── */}
                        <div className={styles.planCard}>
                            <span
                                className={`${styles.planTitle} ${pub.goldHilight}`}
                            >
                                פרימיום חודשי
                            </span>
                            <span className={styles.planPrice}>₪39.90</span>
                            <span className={styles.planCadence}>לחודש</span>
                            <p className={styles.planNote}>
                                גמישות מלאה — אפשר להתחיל, להפסיק ולחדש בכל רגע.
                            </p>
                            <GroupedAccordions groups={MONTHLY_ACCORDIONS} />
                            <Button
                                as={Link}
                                to="/register"
                                variant="secondary"
                                className={styles.planCta}
                                onClick={() =>
                                    trackSiteClick({
                                        action: SITE_ACTIONS.pricing_monthly_start,
                                        pagePath: "/pricing",
                                    })
                                }
                            >
                                לבחור במסלול חודשי
                            </Button>
                        </div>

                        {/* ── Annual (recommended) ───────── */}
                        <div
                            className={`${styles.planCard} ${styles.planCardFeatured}`}
                        >
                            <span
                                className={`${styles.planTitle} ${pub.goldHilight}`}
                            >
                                פרימיום שנתי
                            </span>
                            <span className={styles.planPrice}>₪399.90</span>
                            <span className={styles.planBadge}>
                                המשתלם ביותר
                            </span>
                            <span className={styles.planCadence}>לשנה</span>
                            <p className={styles.planNote}>
                                חיסכון של ₪78.90 לעומת חודשי
                            </p>
                            <GroupedAccordions groups={ANNUAL_ACCORDIONS} />
                            <Button
                                as={Link}
                                to="/register"
                                variant="primary"
                                className={styles.planCtaFeatured}
                                onClick={() =>
                                    trackSiteClick({
                                        action: SITE_ACTIONS.pricing_annual_start,
                                        pagePath: "/pricing",
                                    })
                                }
                            >
                                לבחור במסלול שנתי
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Future: Value / decision logic ────────────── */}
            <section className={pub.sectionDark}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2White}>למה Cardigo?</h2>
                </div>
            </section>

            {/* ── Future: Annual recommendation ─────────────── */}
            <section className={pub.sectionLight}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>מסלול שנתי משתלם יותר</h2>
                </div>
            </section>

            {/* ── Future: FAQ ───────────────────────────────── */}
            <section className={pub.sectionDark}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2White}>שאלות נפוצות</h2>
                </div>
            </section>

            {/* ── Future: Final CTA ─────────────────────────── */}
            <section className={pub.sectionLight}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>מוכנים להתחיל?</h2>
                </div>
            </section>
        </main>
    );
}
