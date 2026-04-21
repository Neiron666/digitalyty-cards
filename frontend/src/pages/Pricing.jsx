import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createPayment } from "../services/payment.service";
import Button from "../components/ui/Button";
import SeoHelmet from "../components/seo/SeoHelmet";
import FlashBanner from "../components/ui/FlashBanner/FlashBanner";
import { trackSitePageView } from "../services/siteAnalytics.client";
import { trackSiteClick } from "../services/siteAnalytics.client";
import { SITE_ACTIONS } from "../services/siteAnalytics.actions";
import pub from "../styles/public-sections.module.css";
import styles from "./Pricing.module.css";
import CrownIcon from "../components/icons/CrownIcon";
const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";

/* ── Pricing FAQ data ────────────────────────────── */

/* Items where `a` is JSX are rendered inside pub.answer (a <div>),
   so both string and element children work identically. */

const PRICING_FAQ = [
    {
        q: "מה כולל המסלול החינמי של Cardigo?",
        a: (
            <>
                המסלול החינמי של{" "}
                <Link to="/" className={styles.faqLink}>
                    Cardigo
                </Link>{" "}
                כולל כרטיס ביקור דיגיטלי מקצועי, שיתוף בוואטסאפ וברשתות, קוד QR
                ושמירת איש קשר - בחינם ולתמיד. בנוסף, כל משתמש חדש מקבל 10 ימי
                פרימיום כדי להכיר את כל היכולות המתקדמות.
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
        a: "מעבר למראה מקצועי, Cardigo נותנת לעסק דרך נוחה לשתף, לעדכן, לאסוף פניות ולעקוב אחרי פעילות - בהתאם למסלול שנבחר. לכן היא לא רק כרטיס, אלא גם כלי עבודה עסקי.",
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
        a: "אם אתם רוצים להתחיל בלי עלות - המסלול החינמי פתוח לתמיד. אם חשוב לכם לעבוד בגמישות - המסלול החודשי יתאים לכם. אם אתם מחפשים רצף וחיסכון - המסלול השנתי הוא הבחירה הנכונה. ואם מדובר בצוות או חברה, כדאי לפנות אלינו לפתרון ארגוני.",
    },
];

/* ── Grouped accordion data per plan ─────────────────── */

const FREE_ACCORDIONS = [
    {
        title: "מה כלול במסלול",
        items: [
            "כרטיס ביקור דיגיטלי מקצועי",
            "עריכה עצמית פשוטה",
            "עיצוב עצמי פשוט",
            "תבניות מעוצבות להתחלה מהירה",
            "שיתוף בוואטסאפ וברשתות (חלקי)",
            "קוד QR מוכן לשיתוף",
            "שמירת איש קשר בלחיצה",
            "סקשן שאלות נפוצות",
            "סקשן אודות העסק (חלקי)",
            "סקשן משובים",
        ],
    },
    {
        title: "מה לא כלול במסלול",
        tone: "negative",
        items: [
            "הופעת כרטיס בתוצאות גוגל",
            "גלריית תמונות מורחבת",
            "סרטון YouTube בכרטיס",
            "טופס לידים ואיסוף פניות",
            "מעקב פעילות ואנליטיקה",
            "SEO ונוכחות דיגיטלית מתקדמת",
            "כתובת אישית ועיצוב מתקדם",
            "הזמנת תורים (booking)",
            "שירותים",
            "שעות פעילות של העסק",
            "יצירת תוכן עם AI",
        ],
    },
    {
        title: "למי זה מתאים",
        items: [
            "לעסק שרוצה נוכחות דיגיטלית בלי עלות",
            "לכל מי שרוצה כרטיס מקצועי לשיתוף מיידי",
            "למי שרוצה להתחיל בקטן ולשדרג כשמתאים",
        ],
    },
];

const MONTHLY_ACCORDIONS = [
    {
        title: "פיצ׳רים בסיסיים",
        items: [
            "כרטיס ביקור דיגיטלי מקצועי",
            "עריכה עצמית פשוטה",
            "עיצוב עצמי פשוט",
            "תבניות מעוצבות להתחלה מהירה",
            "שיתוף בוואטסאפ וברשתות",
            "קוד QR מוכן לשיתוף",
            "שמירת איש קשר בלחיצה",
            "סקשן שאלות נפוצות",
            "סקשן אודות העסק",
            "סקשן משובים",
        ],
    },
    {
        title: "פיצ׳רי פרימיום",
        items: [
            "הופעת כרטיס בתוצאות גוגל",
            "גלריית תמונות מורחבת",
            "סרטון YouTube בכרטיס",
            "טופס לידים ואיסוף פניות",
            "מעקב פעילות ואנליטיקה",
            "SEO ונוכחות דיגיטלית מתקדמת",
            "כתובת אישית ועיצוב מתקדם",
            "הזמנת תורים (booking)",
            "שירותים",
            "שעות פעילות של העסק",
            "יצירת תוכן עם AI",
        ],
    },
    {
        title: "למי זה מתאים",
        items: [
            "לעסק שרוצה גמישות מלאה",
            "מסלול מתחדש אוטומטית - ניתן לבטל לפני החיוב הבא",
            "מתאים לעבודה שוטפת בלי התחייבות לשנה",
        ],
    },
    {
        title: "איך עובד החיוב",
        tone: "highlight",
        body: "חיוב חודשי מתחדש אוטומטית עד לביטול. ניתן לבטל לפני מועד החיוב הבא, והביטול ייכנס לתוקף בסוף התקופה שכבר שולמה.",
    },
];

const ANNUAL_ACCORDIONS = [
    {
        title: "פיצ׳רים בסיסיים",
        items: [
            "כרטיס ביקור דיגיטלי מקצועי",
            "עריכה עצמית פשוטה",
            "עיצוב עצמי פשוט",
            "תבניות מעוצבות להתחלה מהירה",
            "שיתוף בוואטסאפ וברשתות",
            "קוד QR מוכן לשיתוף",
            "שמירת איש קשר בלחיצה",
            "סקשן שאלות נפוצות",
            "סקשן אודות העסק",
            "סקשן משובים",
        ],
    },
    {
        title: "פיצ׳רי פרימיום",
        items: [
            "הופעת כרטיס בתוצאות גוגל",
            "גלריית תמונות מורחבת",
            "סרטון YouTube בכרטיס",
            "טופס לידים ואיסוף פניות",
            "מעקב פעילות ואנליטיקה",
            "SEO ונוכחות דיגיטלית מתקדמת",
            "כתובת אישית ועיצוב מתקדם",
            "הזמנת תורים (booking)",
            "שירותים",
            "שעות פעילות של העסק",
            "יצירת תוכן עם AI",
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
    {
        title: "איך עובד החיוב",
        tone: "highlight",
        body: "תשלום שנתי מראש עבור 12 חודשים. חידוש שנתי אוטומטי יתבצע רק אם תופעל בחירה מפורשת מראש. תישלח תזכורת 14 ימים לפני חידוש שנתי אוטומטי.",
    },
];

function GroupedAccordions({ groups }) {
    return (
        <div className={styles.accordionStack}>
            {groups.map((g) => (
                <details
                    key={g.title}
                    className={
                        g.tone === "highlight"
                            ? `${styles.accordionBlock} ${styles.accordionBlockHighlight}`
                            : styles.accordionBlock
                    }
                >
                    <summary className={styles.accordionTitle}>
                        {g.title}
                    </summary>
                    {g.body && <p className={styles.accordionBody}>{g.body}</p>}
                    {g.items && (
                        <ul className={styles.accordionList}>
                            {g.items.map((item) => (
                                <li
                                    key={item}
                                    className={
                                        g.tone === "negative"
                                            ? `${styles.accordionItem} ${styles.accordionItemNegative}`
                                            : styles.accordionItem
                                    }
                                >
                                    {item}
                                </li>
                            ))}
                        </ul>
                    )}
                </details>
            ))}
        </div>
    );
}

const PAYMENT_FLASH = {
    success: {
        type: "success",
        message:
            "התשלום התקבל בהצלחה. החשבון יתעדכן תוך כמה דקות. אם לא השתנה - רעננו את הדף.",
    },
    fail: {
        type: "error",
        message: "התשלום לא הושלם. אפשר לנסות שוב.",
    },
};

function buildPricingFaqJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${ORIGIN}/pricing#faq`,
        url: `${ORIGIN}/pricing`,
        inLanguage: "he",
        mainEntity: PRICING_FAQ.filter(
            (item) => typeof item.a === "string",
        ).map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
            },
        })),
    };
}

const pricingFaqJsonLd = buildPricingFaqJsonLd();

export default function Pricing() {
    const [searchParams, setSearchParams] = useSearchParams();
    const payment = searchParams.get("payment");
    const flash = PAYMENT_FLASH[payment] || null;

    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [payBusy, setPayBusy] = useState(false);

    useEffect(() => {
        trackSitePageView();
    }, []);

    async function handlePricingCta(plan) {
        if (!isAuthenticated) {
            navigate("/register");
            return;
        }
        if (payBusy) return;
        setPayBusy(true);
        try {
            const res = await createPayment(plan);
            const url = res?.paymentUrl;
            if (url && /^\//.test(url)) {
                navigate(url);
            } else if (url && /^https?:\/\//i.test(url)) {
                window.location.assign(url);
            } else {
                setSearchParams(
                    (prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("payment", "fail");
                        return next;
                    },
                    { replace: true },
                );
            }
        } catch {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("payment", "fail");
                    return next;
                },
                { replace: true },
            );
        } finally {
            setPayBusy(false);
        }
    }

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
                description="המחירים של Cardigo לכרטיס ביקור דיגיטלי מקצועי: מסלול חינמי לתמיד, 10 ימי פרימיום לכל משתמש חדש, מסלול חודשי גמיש ומסלול שנתי משתלם לעסקים שרוצים נוכחות דיגיטלית מקצועית."
                canonicalUrl={`${ORIGIN}/pricing`}
                url={`${ORIGIN}/pricing`}
                image={`${ORIGIN}/images/og/cardigo-home-og-1200x630.jpg`}
                jsonLdItems={[pricingFaqJsonLd]}
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
                            מדויקת ומעוצבת - בכל מכשיר, בכל רגע, עם כל מה שצריך
                            בעמוד אחד.
                        </p>
                        {/* ── Product visual stage ──────────────── */}
                        <div className={styles.heroStage}>
                            <img
                                src="/images/Pricing/Cardigo-bussines-digital-card-bussiness-growth.webp"
                                alt="כרטיס ביקור דיגיטלי לעסקים - Cardigo"
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
                                להתחיל בחינם
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
                    <span className={styles.heroTrialNote}>
                        כולל 10 ימי פרימיום למשתמשים חדשים
                        <CrownIcon className={styles.heroTrialCrown} />
                    </span>
                    <p className={styles.trustLine}>
                        לעסק שרוצה להיראות מקצועי כבר מהיום הראשון.
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
                        מסלול חינמי לתמיד, מסלול חודשי גמיש או מסלול שנתי משתלם
                        - לעסק שרוצה יציבות ונוכחות מקצועית לאורך זמן.
                    </p>
                    <div className={styles.plansRow}>
                        {/* ── Free plan ──────────────────── */}
                        <div className={styles.planCard}>
                            <span className={styles.planTitle}>חינם</span>
                            <span className={styles.planPrice}>₪0</span>
                            <span className={styles.planBadge}>
                                10 ימי פרימיום עלינו למשתמשים חדשים
                            </span>
                            <span className={styles.planCadence}>לתמיד</span>
                            <p className={styles.planNote}>
                                כרטיס ביקור דיגיטלי מקצועי - פעיל, ניתן לשיתוף
                                ובחינם לתמיד.
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
                                כל יכולות הפרימיום בתשלום חודשי גמיש - בלי
                                התחייבות שנתית.
                            </p>
                            <GroupedAccordions groups={MONTHLY_ACCORDIONS} />
                            <Button
                                variant="secondary"
                                className={styles.planCta}
                                disabled={payBusy}
                                onClick={() => {
                                    trackSiteClick({
                                        action: SITE_ACTIONS.pricing_monthly_start,
                                        pagePath: "/pricing",
                                    });
                                    handlePricingCta("monthly");
                                }}
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
                                המסלול המשתלם: פרימיום מלא לשנה שלמה -{" "}
                                <span className={pub.goldHilight}>
                                    חיסכון של כ-80שח.
                                </span>
                            </p>
                            <GroupedAccordions groups={ANNUAL_ACCORDIONS} />
                            <Button
                                variant="primary"
                                className={styles.planCtaFeatured}
                                disabled={payBusy}
                                onClick={() => {
                                    trackSiteClick({
                                        action: SITE_ACTIONS.pricing_annual_start,
                                        pagePath: "/pricing",
                                    });
                                    handlePricingCta("yearly");
                                }}
                            >
                                לבחור במסלול שנתי
                            </Button>
                        </div>
                    </div>

                    {/* ── Legal note below plans ──────── */}
                    <p className={styles.plansLegalNote}>
                        השירותים בתשלום מיועדים לשימוש עסקי או מסחרי בלבד. לא
                        יינתנו החזרים כספיים, למעט אם הדין החל מחייב אחרת.{" "}
                        <Link
                            to="/payment-policy"
                            className={styles.plansLegalNoteLink}
                        >
                            תנאי תשלום, חידוש, ביטול והחזרים
                        </Link>
                    </p>

                    {/* ── B2B: חברות וארגונים ───────────────── */}
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
                                ארגונית תחת המותג שלכם - עם תהליך חיבור מסודר
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
                            לקוחות ומהדרך שבה העסק נראה אונליין - מסלול שנתי
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
                        להתחיל בחינם
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
                        להתחיל בחינם
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
                        אם אתם מתלבטים בין מסלול חינמי, מסלול חודשי, מסלול שנתי
                        או פתרון לחברה - הנה התשובות לשאלות שעולות הכי הרבה לפני
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
