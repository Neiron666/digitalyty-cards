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

/* ── Pricing FAQ data ────────────────────────────── */

/* Items where `a` is JSX are rendered inside pub.answer (a <div>),
   so both string and element children work identically. */

const PRICING_FAQ = [
    {
        q: "מה כולל הניסיון החינמי של Cardigo?",
        a: (
            <>
                הניסיון החינמי של{" "}
                <Link to="/" className={styles.faqLink}>
                    Cardigo
                </Link>{" "}
                מאפשר להתחיל בלי התחייבות, להכיר את המערכת ולראות איך כרטיס
                ביקור דיגיטלי נראה ומתפקד עבור העסק שלכם בפועל. זו הדרך הפשוטה
                ביותר לבדוק התאמה לפני בחירת מסלול בתשלום.
            </>
        ),
    },
    {
        q: "מה ההבדל בין המסלול החודשי למסלול השנתי?",
        a: "המסלול החודשי מתאים לעסקים שרוצים גמישות מלאה בלי להתחייב לשנה, בעוד שהמסלול השנתי מתאים לעסקים שמחפשים יציבות, רצף וחיסכון לעומת תשלום חודשי מצטבר.",
    },
    {
        q: "למי מתאים המסלול השנתי של כרטיס ביקור דיגיטלי?",
        a: "המסלול השנתי מתאים לעסק שרואה בכרטיס הדיגיטלי חלק קבוע מהנוכחות שלו מול לקוחות, ורוצה ליהנות גם מחיסכון וגם מראש שקט לאורך זמן.",
    },
    {
        q: "האם אפשר להתחיל ב־Cardigo בלי ידע טכני?",
        a: "כן. Cardigo בנויה כך שגם עסקים בלי רקע טכני יוכלו להקים, לערוך ולשתף כרטיס ביקור דיגיטלי בצורה פשוטה וברורה.",
    },
    {
        q: "איך Cardigo עוזרת לעסק להיראות מקצועי יותר?",
        a: (
            <>
                <Link to="/" className={styles.faqLink}>
                    Cardigo
                </Link>{" "}
                עוזרת לעסק להציג פרטי קשר, תוכן, עיצוב ושיתוף במקום אחד, בצורה
                מסודרת ונוחה לנייד. כך הלקוח רואה עסק ברור, נגיש ומקצועי יותר.
            </>
        ),
    },
    {
        q: "האם Cardigo מתאימה גם לעסקים קטנים ולעצמאים?",
        a: "כן. Cardigo מתאימה לעצמאים, לבעלי מקצוע ולעסקים קטנים שרוצים דרך פשוטה להיראות טוב יותר אונליין, לשתף את העסק בקלות ולרכז את כל המידע החשוב במקום אחד.",
    },
    {
        q: "מה העסק מקבל מעבר לכרטיס ביקור דיגיטלי בסיסי?",
        a: "מעבר למראה מקצועי, Cardigo נותנת לעסק דרך נוחה לשתף, לעדכן, לאסוף פניות ולעקוב אחרי פעילות — בהתאם למסלול שנבחר. לכן היא לא רק כרטיס, אלא גם כלי עבודה עסקי.",
    },
    {
        q: "האם אפשר לשנות מסלול בהמשך?",
        a: "כן. אפשר להתחיל בצורה שמתאימה לעסק עכשיו, ובהמשך לעבור למסלול אחר לפי הצורך, קצב העבודה והשלב שבו העסק נמצא.",
    },
    {
        q: "האם Cardigo מתאימה גם לחברות וארגונים?",
        a: (
            <>
                כן. לחברות וארגונים{" "}
                <Link to="/" className={styles.faqLink}>
                    Cardigo
                </Link>{" "}
                מציעה פתרון מסודר יותר, עם אפשרות לחשוב במונחים של צוות, ניהול
                מרכזי וכתובת ארגונית תחת המותג. אם מדובר בארגון, עדיף לדבר איתנו
                כדי להתאים פתרון נכון.
            </>
        ),
    },
    {
        q: "איך לבחור את המסלול הנכון לעסק שלי?",
        a: "אם אתם רוצים להתחיל בלי סיכון — התחילו בניסיון חינמי. אם חשוב לכם לעבוד בגמישות — המסלול החודשי יתאים לכם. אם אתם מחפשים רצף וחיסכון — המסלול השנתי הוא הבחירה הנכונה. ואם מדובר בצוות או חברה, כדאי לפנות אלינו לפתרון ארגוני.",
    },
];

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

                    {/* ── B2B: חברות וארגונים ─────────── */}
                    <div className={styles.b2bBlock}>
                        <div className={styles.b2bHeader}>
                            <span className={styles.b2bKicker}>
                                לחברות וארגונים
                            </span>
                            <h3 className={styles.b2bHeadline}>
                                פתרון מרוכז לצוותים, חברות וארגונים
                            </h3>
                        </div>
                        <div className={styles.b2bBody}>
                            <p className={styles.b2bLead}>
                                כרטיס דיגיטלי לכל עובד, ניהול גישה לצוות וכתובת
                                ארגונית תחת המותג שלכם — עם תהליך חיבור מסודר
                                שמתאים לארגון.
                            </p>
                            <ul className={styles.b2bList}>
                                <li className={styles.b2bItem}>
                                    כרטיס לכל עובד תחת המותג שלכם
                                </li>
                                <li className={styles.b2bItem}>
                                    הזמנת עובדים וניהול גישה
                                </li>
                                <li className={styles.b2bItem}>
                                    ניהול מרכזי של הצוות
                                </li>
                                <li className={styles.b2bItem}>
                                    כתובת ארגונית לכל כרטיס
                                </li>
                                <li className={styles.b2bItem}>
                                    חיוב מרוכז לארגון
                                </li>
                            </ul>
                        </div>
                        <div className={styles.b2bFooter}>
                            <Button
                                as={Link}
                                to="/contact"
                                variant="secondary"
                                className={styles.b2bCta}
                                onClick={() =>
                                    trackSiteClick({
                                        action: SITE_ACTIONS.contact_email_click,
                                        pagePath: "/pricing",
                                    })
                                }
                            >
                                לקבלת הצעה לארגון
                            </Button>
                            <p className={styles.b2bSupport}>
                                נחזור אליכם עם פתרון שמתאים לגודל הצוות ולצרכים
                                של הארגון.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Annual value: why businesses choose yearly ── */}
            <section className={pub.sectionDark}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2White}>
                        למה עסקים בוחרים במסלול השנתי
                    </h2>

                    <div className={styles.annualStage}>
                        <img
                            src="/images/Pricing/anual-section/כרטיס ביקור דיגיטלי שנתי.webp"
                            alt="כרטיס ביקור דיגיטלי במסלול שנתי לעסקים של Cardigo"
                            className={styles.annualImg}
                            width={960}
                            height={540}
                            loading="lazy"
                            decoding="async"
                        />
                    </div>

                    <div className={styles.annualCopy}>
                        <p className={styles.annualParagraph}>
                            עסקים שבוחרים ב־
                            <Link to="/" className={styles.annualLink}>
                                Cardigo
                            </Link>{" "}
                            לטווח ארוך לא מחפשים רק כרטיס ביקור דיגיטלי יפה, אלא
                            פתרון יציב שממשיך לעבוד בשביל העסק גם לאורך זמן.
                            כאשר הכרטיס הוא חלק מהנוכחות הדיגיטלית, מהשיתוף עם
                            לקוחות ומהדרך שבה העסק נראה אונליין — מסלול שנתי
                            הופך לבחירה חכמה יותר.
                        </p>
                        <p className={styles.annualParagraph}>
                            המסלול השנתי מתאים לעסקים שרוצים פחות התעסקות, יותר
                            רצף וחיסכון אמיתי לעומת תשלום חודשי מצטבר. במקום
                            לחשוב כל חודש מחדש, אפשר לבחור פעם אחת ולהמשיך קדימה
                            עם נוכחות מקצועית, מסודרת ויציבה.
                        </p>
                    </div>

                    <Button
                        as={Link}
                        to="/register"
                        variant="primary"
                        className={styles.annualCta}
                        onClick={() =>
                            trackSiteClick({
                                action: SITE_ACTIONS.pricing_trial_start,
                                pagePath: "/pricing",
                            })
                        }
                    >
                        להתחיל ניסיון חינם
                    </Button>
                </div>
            </section>

            {/* ── Final CTA: what your business gets ────── */}
            <section className={pub.sectionLight}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>מה העסק שלכם מקבל עם Cardigo</h2>

                    <div className={styles.ctaStage}>
                        <img
                            src="/images/Pricing/cta-section/כרטיס ביקור דיגיטלי כרדיגו.webp"
                            alt="כרטיס ביקור דיגיטלי של Cardigo לעסק"
                            className={styles.ctaImg}
                            width={960}
                            height={540}
                            loading="lazy"
                            decoding="async"
                        />
                    </div>

                    <div className={styles.ctaCopy}>
                        <p className={styles.ctaIntro}>
                            עם{" "}
                            <Link to="/" className={styles.ctaLink}>
                                Cardigo
                            </Link>{" "}
                            העסק שלכם מקבל נוכחות דיגיטלית מסודרת, דרך פשוטה
                            לשיתוף עם לקוחות וכלי עבודה שעוזרים להיראות מקצועי
                            כבר מהיום הראשון.
                        </p>

                        <ul className={styles.ctaList}>
                            <li className={styles.ctaItem}>
                                כרטיס ביקור דיגיטלי שנראה מקצועי ועובד היטב
                                בנייד
                            </li>
                            <li className={styles.ctaItem}>
                                שיתוף מהיר עם לקוחות בוואטסאפ, בלינק וב־QR
                            </li>
                            <li className={styles.ctaItem}>
                                שליטה פשוטה בתוכן, בעיצוב ובנראות של העסק
                            </li>
                            <li className={styles.ctaItem}>
                                כלים שעוזרים לבנות אמון, לאסוף פניות ולעקוב אחרי
                                פעילות
                            </li>
                            <li className={styles.ctaItem}>
                                פתרון שיכול להתחיל בקטן ולגדול יחד עם העסק
                            </li>
                        </ul>
                    </div>

                    <Button
                        as={Link}
                        to="/register"
                        variant="primary"
                        className={styles.ctaButton}
                        onClick={() =>
                            trackSiteClick({
                                action: SITE_ACTIONS.pricing_trial_start,
                                pagePath: "/pricing",
                            })
                        }
                    >
                        להתחיל ניסיון חינם
                    </Button>
                </div>
            </section>

            {/* ── FAQ ─────────────────────────────────────── */}
            <section className={pub.sectionDark} id="faq">
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2White}>
                        שאלות נפוצות על מחירים ועל בחירת מסלול ב־Cardigo
                    </h2>
                    <p className={pub.sectionLeadLight}>
                        אם אתם מתלבטים בין ניסיון חינמי, מסלול חודשי, מסלול שנתי
                        או פתרון לחברה — הנה התשובות לשאלות שעולות הכי הרבה לפני
                        שמתחילים.
                    </p>

                    <div className={pub.faq}>
                        {PRICING_FAQ.map((item, i) => (
                            <details key={i} className={pub.qa}>
                                <summary>{item.q}</summary>
                                <div className={pub.answer}>{item.a}</div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
