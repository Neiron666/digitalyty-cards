import { useEffect } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import SeoHelmet from "../components/seo/SeoHelmet";
import {
    trackSitePageView,
    trackSiteClick,
} from "../services/siteAnalytics.client";
import { SITE_ACTIONS } from "../services/siteAnalytics.actions";
import pub from "../styles/public-sections.module.css";
import styles from "./Cards.module.css";
import CrownIcon from "../components/icons/CrownIcon";
const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";

const SAMPLE_IMG = "/images/sample-card-page";
const SECTION6_IMG = "/images/home-page/main-sections/Section-6";
const FEATURES_IMG = "/images/sample-card-page/cards-features";

const CARD_FEATURES = [
    {
        src: `${FEATURES_IMG}/contact-actions.webp`,
        alt: "לחצני יצירת קשר בכרטיס ביקור דיגיטלי - Cardigo",
        title: "לחצני יצירת קשר",
        text: "חיוג, וואטסאפ, ניווט ורשתות חברתיות - הלקוח בוחר איך לפנות.",
    },
    {
        src: `${FEATURES_IMG}/lead-form-preview.webp`,
        alt: "טופס לידים בכרטיס ביקור דיגיטלי - Cardigo",
        title: "טופס לידים",
        text: "לקוחות משאירים פרטים - ואתם חוזרים בזמן שנוח לכם.",
    },
    {
        src: `${FEATURES_IMG}/gallery-preview.webp`,
        alt: "גלריית תמונות בכרטיס ביקור דיגיטלי - Cardigo",
        title: "גלריית תמונות",
        text: "הציגו עבודות, פרויקטים ותמונות מקצועיות בצורה ויזואלית.",
    },
    {
        src: `${FEATURES_IMG}/booking-preview.webp`,
        alt: "תיאום תורים בכרטיס ביקור דיגיטלי - Cardigo",
        title: "תיאום תורים",
        text: "לקוחות יכולים לקבוע תורים ישירות מהכרטיס - חוסך זמן ומייעל את התהליך.",
    },
    {
        src: `${FEATURES_IMG}/reviews-preview.webp`,
        alt: "המלצות לקוחות בכרטיס ביקור דיגיטלי - Cardigo",
        title: "המלצות לקוחות",
        text: "חוות דעת אמיתיות שמחזקות אמון ומעודדות פנייה.",
    },
    {
        src: `${FEATURES_IMG}/analytics-preview.webp`,
        alt: "אנליטיקה ונתונים בכרטיס ביקור דיגיטלי - Cardigo",
        title: "אנליטיקה ונתונים",
        text: "צפיות, לחיצות ומקורות תנועה - כדי שתדעו מה באמת עובד.",
    },
];

const FEATURED = {
    desktop: {
        src: `${SAMPLE_IMG}/Cardigo-bussines-digital-card-desktop-view.webp`,
        alt: "כרטיס ביקור דיגיטלי בתצוגת מחשב - Cardigo",
    },
    phone: {
        src: `${SAMPLE_IMG}/Cardigo-bussines-digital-card-mobile-view.webp`,
        alt: "כרטיס ביקור דיגיטלי בתצוגת נייד - Cardigo",
    },
};

const SHOWCASE_CARDS = [
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי ליועץ הון פרטי  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי - ייעוץ פיננסי",
        niche: "פיננסים",
        desc: "נוכחות עסקית מקצועית עם קישורים, פרטי קשר ויצירת אמון - בקליק אחד.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי - אדריכלות",
        niche: "אדריכלות",
        desc: "הצגת פרויקטים, גלריה ודרכי יצירת קשר בצורה ויזואלית ומרשימה.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי - רפואת שיניים",
        niche: "רפואה",
        desc: "כרטיס שמחבר בין מטופלים לקליניקה - ניווט, שעות פעילות ותיאום תור.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי ליועצת חדשנות דיגיטלית ו-AI  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי - חדשנות ו-AI",
        niche: "טכנולוגיה",
        desc: "כרטיס שמציג מומחיות, קישור לפודקאסט, אתר ורשתות חברתיות.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי למפיקת אירועי בוטיק  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי - הפקת אירועים",
        niche: "אירועים",
        desc: "גלריית אירועים, סרטונים, המלצות ולחצן וואטסאפ ישיר ללקוחות.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי קליניקה לאסטטיקה  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי - קליניקה אסתטית",
        niche: "בריאות ויופי",
        desc: "כרטיס שמקרין מקצועיות ואמינות - עם טופס לידים, גלריה ופרטי קשר.",
    },
];

const HERO_PREVIEWS = [
    {
        src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי ליועץ הון פרטי  כרדיגו.webp",
        alt: "דוגמה לכרטיס ביקור דיגיטלי - ייעוץ פיננסי",
        niche: "פיננסים",
    },
    {
        src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף  כרדיגו.webp",
        alt: "דוגמה לכרטיס ביקור דיגיטלי - אדריכלות",
        niche: "אדריכלות",
    },
    {
        src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית  כרדיגו.webp",
        alt: "דוגמה לכרטיס ביקור דיגיטלי - רפואת שיניים",
        niche: "רפואה",
    },
];

const CARDS_FAQ = [
    {
        q: "הדוגמאות בעמוד הזה הן של לקוחות אמיתיים?",
        a: "הדוגמאות בעמוד נועדו להמחשה בלבד, כדי להראות איך כרטיס ביקור דיגיטלי יכול להיראות בתחומים שונים.",
    },
    {
        q: "אפשר ליצור כרטיס בסגנון דומה לעסק שלי?",
        a: "כן. אפשר לבחור תבנית, להתאים טקסטים, כפתורים, תמונות ותוכן כך שהכרטיס יתאים לעסק שלכם.",
    },
    {
        q: "הכרטיס נראה טוב גם בנייד וגם על מסכים גדולים?",
        a: "כן. הכרטיסים מותאמים לצפייה נוחה בנייד, ונראים מקצועיים גם כאשר פותחים אותם על מסך גדול יותר.",
    },
    {
        q: "אפשר לבחור תבנית מתוך הדוגמאות שמוצגות כאן?",
        a: "הדוגמאות מציגות סגנונות אפשריים. כשנכנסים לעורך אפשר לבחור תבנית מתוך מגוון עיצובים ולהתאים אותה לצרכים שלכם.",
    },
    {
        q: "האם העיצוב של הכרטיס קבוע או שאפשר לשנות אותו?",
        a: "אפשר לשנות צבעים, גופנים, תמונות ומבנה. התבנית היא נקודת התחלה - התוצאה הסופית תלויה בתוכן ובסגנון שתבחרו.",
    },
    {
        q: "מה קורה אחרי שלוחצים על ׳צרו כרטיס׳?",
        a: "מגיעים לעורך שבו בוחרים תבנית, מוסיפים תוכן ומפרסמים את הכרטיס. אין צורך בידע טכני.",
    },
    {
        q: "הכרטיסים בדוגמאות מתאימים גם לתחום שלי?",
        a: "הדוגמאות מייצגות תחומים שונים, אבל כל כרטיס ניתן להתאמה. גם אם התחום שלכם לא מופיע כאן - אפשר ליצור כרטיס מותאם.",
    },
    {
        q: "אפשר להוסיף לכרטיס תוכן שלא מופיע בדוגמאות?",
        a: "כן. הדוגמאות מציגות חלק מהאפשרויות. בעורך אפשר להוסיף סקציות נוספות כמו גלריה, טופס לידים, המלצות, שאלות ותשובות ועוד.",
    },
    {
        q: "האם אפשר לראות איך הכרטיס ייראה לפני שמפרסמים?",
        a: "כן. בתוך העורך יש תצוגה מקדימה שמראה בזמן אמת איך הכרטיס ייראה למי שיקבל את הקישור.",
    },
    {
        q: "איך הדוגמאות בעמוד הזה שונות מכרטיס אמיתי?",
        a: "מבחינת מבנה ועיצוב - הן זהות. ההבדל היחיד הוא שהתוכן כאן להמחשה, ובכרטיס אמיתי תוסיפו את הפרטים שלכם.",
    },
];

function buildCardsFaqJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${ORIGIN}/cards#faq`,
        url: `${ORIGIN}/cards`,
        inLanguage: "he",
        mainEntity: CARDS_FAQ.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
            },
        })),
    };
}

const cardsFaqJsonLd = buildCardsFaqJsonLd();

export default function Cards() {
    useEffect(() => {
        trackSitePageView();
    }, []);

    return (
        <main data-page="site">
            <SeoHelmet
                title="דוגמאות לכרטיסי ביקור דיגיטליים | Cardigo"
                description="דוגמאות ויזואליות לכרטיסי ביקור דיגיטליים בסגנונות שונים - ראו איך Cardigo מציג עסקים, קישורים ודרכי יצירת קשר לפני שיוצרים כרטיס משלכם."
                canonicalUrl={`${ORIGIN}/cards`}
                url={`${ORIGIN}/cards`}
                image={`${ORIGIN}/images/og/cardigo-home-og-1200x630.jpg`}
                jsonLdItems={[cardsFaqJsonLd]}
            />

            {/* ─── Hero ─── */}
            <section className={pub.sectionDark}>
                <div className={`${pub.sectionWrap} ${styles.heroWrap}`}>
                    <div className={styles.heroCopy}>
                        <h1 className={styles.h1}>
                            {" "}
                            דוגמאות לכרטיסי ביקור דיגיטליים{" "}
                            <span
                                className={`${pub.goldHilight} ${pub.goldUnderline}`}
                            >
                                {" "}
                                לעסקים
                            </span>
                        </h1>
                        <p
                            className={`${pub.goldHilight} ${pub.sectionLeadLight}`}
                        >
                            כך יכול להיראות כרטיס שמייצג את העסק שלך -{" "}
                            <span className={pub.goldUnderline}>
                                ומביא תוצאות
                            </span>
                            .
                        </p>
                        <div className={styles.heroVisual} aria-hidden="true">
                            {HERO_PREVIEWS.map((p, i) => (
                                <figure
                                    key={i}
                                    className={`${styles.previewCard} ${
                                        i === 1
                                            ? styles.previewMain
                                            : styles.previewSide
                                    }`}
                                >
                                    <img
                                        src={encodeURI(p.src)}
                                        alt=""
                                        className={styles.previewImg}
                                        width={280}
                                        height={560}
                                        loading={i === 1 ? "eager" : "lazy"}
                                        decoding="async"
                                    />
                                    <figcaption className={styles.previewNiche}>
                                        {p.niche}
                                    </figcaption>
                                </figure>
                            ))}
                        </div>

                        <div className={styles.heroActions}>
                            <Button
                                as={Link}
                                to="/edit"
                                variant="primary"
                                className={styles.heroCta}
                                onClick={() =>
                                    trackSiteClick({
                                        action: SITE_ACTIONS.cards_hero_cta,
                                        pagePath: "/cards",
                                    })
                                }
                            >
                                צרו כרטיס דיגיטלי בחינם
                            </Button>

                            <Button
                                as={Link}
                                to="/pricing"
                                variant="secondary"
                                className={styles.heroSecondary}
                            >
                                מסלולים ומחירים
                            </Button>
                        </div>
                    </div>
                    <span className={styles.heroTrialNote}>
                        כולל 10 ימי פרימיום למשתמשים חדשים
                        <CrownIcon className={styles.heroTrialCrown} />
                    </span>
                    <p className={styles.heroNote}>
                        הדוגמאות בעמוד זה מיועדות להמחשה
                    </p>
                </div>
            </section>

            {/* ─── Showcase ─── */}
            <section className={pub.sectionLight}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>
                        כרטיסי ביקור דיגיטליים למגוון תחומים
                    </h2>
                    <p className={pub.sectionLead}>
                        כל עסק, כל מקצוע - כרטיס שנראה מקצועי ומותאם בדיוק לתחום
                        שלכם. הנה כמה דוגמאות ויזואליות שממחישות איך זה נראה
                        בפועל.
                    </p>

                    {/* ── Featured dual-device spotlight ── */}
                    <div className={styles.featured}>
                        <div className={styles.featuredDevices}>
                            <div className={styles.featuredDesktop}>
                                <img
                                    src={FEATURED.desktop.src}
                                    alt={FEATURED.desktop.alt}
                                    className={styles.featuredDesktopImg}
                                    width={720}
                                    height={450}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                            <div className={styles.featuredPhone}>
                                <img
                                    src={FEATURED.phone.src}
                                    alt={FEATURED.phone.alt}
                                    className={styles.featuredPhoneImg}
                                    width={280}
                                    height={560}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                        </div>

                        <div className={styles.featuredCopy}>
                            <span className={styles.featuredLabel}>
                                נוכחות דיגיטלית מקצועית
                            </span>
                            <h3 className={styles.featuredTitle}>
                                נראה מדהים בכל מסך - פלאפון, מחשב או טאבלט
                            </h3>
                            <ul className={styles.featuredBullets}>
                                <li>הצגת העסק בעיצוב מקצועי עם מידע עדכני</li>
                                <li>
                                    קישורים, לחצני יצירת קשר ורשתות חברתיות
                                    במקום אחד
                                </li>
                                <li>
                                    שיתוף בוואטסאפ, QR, SMS או אימייל - בקליק
                                    אחד
                                </li>
                            </ul>
                            <Button
                                as={Link}
                                to="/edit/card/templates"
                                variant="secondary"
                                className={styles.featuredCta}
                                onClick={() =>
                                    trackSiteClick({
                                        action: SITE_ACTIONS.cards_templates_cta,
                                        pagePath: "/cards",
                                    })
                                }
                            >
                                בחרו תבנית והתחילו
                            </Button>
                        </div>
                    </div>

                    {/* ── Curated showcase rail ── */}
                    <div className={styles.showcaseRail}>
                        <div className={styles.showcaseGrid}>
                            {SHOWCASE_CARDS.map((card, i) => (
                                <article
                                    key={i}
                                    className={styles.showcaseCard}
                                >
                                    <img
                                        src={encodeURI(card.src)}
                                        alt={card.alt}
                                        className={styles.showcaseImg}
                                        width={280}
                                        height={560}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <span className={styles.showcaseNiche}>
                                        {card.niche}
                                    </span>
                                    <p className={styles.showcaseDesc}>
                                        {card.desc}
                                    </p>
                                    <Link
                                        to="/edit/card/templates"
                                        className={styles.showcaseLink}
                                        onClick={() =>
                                            trackSiteClick({
                                                action: SITE_ACTIONS.cards_showcase_card_cta,
                                                pagePath: "/cards",
                                            })
                                        }
                                    >
                                        התחילו ליצור כרטיס &larr;
                                    </Link>
                                </article>
                            ))}
                        </div>
                    </div>

                    {/* ── Section-bottom CTA ── */}
                    <div className={styles.showcaseBottom}>
                        <Button
                            as={Link}
                            to="/edit/card/templates"
                            variant="secondary"
                            onClick={() =>
                                trackSiteClick({
                                    action: SITE_ACTIONS.cards_showcase_view_all_cta,
                                    pagePath: "/cards",
                                })
                            }
                        >
                            ראו את כל התבניות
                        </Button>
                    </div>
                </div>
            </section>

            {/* ─── Section 3: What the card includes ─── */}
            <section className={pub.sectionDark}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2White}>
                        חלק קטן מהתכונות של הכרטיס הביקור הדיגיטלי{" "}
                    </h2>
                    <p className={pub.sectionLeadLight}>
                        <span
                            className={`${pub.goldHilight} ${pub.goldUnderline}`}
                        >
                            מה שנראה לעין הוא רק חלק מהתמונה
                        </span>{" "}
                        - מאחורי כל כרטיס ביקור דיגיטלי של{" "}
                        <Link
                            to="/"
                            className={`${pub.goldHilight} ${pub.goldUnderline}`}
                        >
                            Cardigo
                        </Link>{" "}
                        פועלת מערכת חכמה שעוזרת לעסק להיראות מקצועי, לאסוף לידים
                        ולהתחזק גם מאחורי הקלעים בגוגל.
                    </p>

                    <div className={styles.featuresRail}>
                        <div className={styles.featuresGrid}>
                            {CARD_FEATURES.map((f, i) => (
                                <article key={i} className={styles.featureCard}>
                                    <img
                                        src={f.src}
                                        alt={f.alt}
                                        className={styles.featureImg}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <h3 className={styles.featureTitle}>
                                        {f.title}
                                    </h3>
                                    <p className={styles.featureText}>
                                        {f.text}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Section 4: Final CTA + SEO appendix ─── */}
            <section className={pub.sectionLight}>
                <div className={pub.sectionWrap}>
                    <div className={styles.ctaLayout}>
                        <h2 className={`${styles.ctaHeading}`}>
                            הפכו את כרטיס הביקור שלכם{" "}
                            <span className={pub.h2Gold}>למכונת לידים! </span>
                        </h2>
                        <div className={styles.ctaCopy}>
                            {" "}
                            <p className={styles.ctaText}>
                                תוך כמה דקות תוכלו לבחור תבנית, להוסיף תוכן
                                ולשתף כרטיס שנראה מקצועי בכל מסך.
                            </p>
                            <div className={styles.ctaActions}>
                                <Button
                                    as={Link}
                                    to="/edit"
                                    variant="primary"
                                    className={styles.ctaPrimary}
                                    onClick={() =>
                                        trackSiteClick({
                                            action: SITE_ACTIONS.cards_bottom_cta,
                                            pagePath: "/cards",
                                        })
                                    }
                                >
                                    צרו כרטיס דיגיטלי בחינם
                                </Button>
                                <Button
                                    as={Link}
                                    to="/pricing"
                                    variant="secondary"
                                >
                                    מסלולים ומחירים
                                </Button>
                            </div>
                        </div>
                        <div className={styles.ctaVisual}>
                            <img
                                src="/images/sample-card-page/cards-cta/cards-cta.webp"
                                alt="כרטיס ביקור דיגיטלי לעסקים - Cardigo"
                                className={styles.ctaImage}
                                width={800}
                                height={450}
                                loading="lazy"
                                decoding="async"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── FAQ ─── */}
            <section className={pub.sectionDark} id="faq">
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>
                        שאלות נפוצות על כרטיסי ביקור דיגיטליים
                    </h2>
                    <p className={pub.sectionLeadLight}>
                        תשובות לשאלות שעולות בדרך כלל הקשורות לכרטיסי ביקור
                        דיגיטליים, תכונות, התאמה אישית ויתרונות.
                    </p>

                    <div className={pub.faq}>
                        {CARDS_FAQ.map((item, i) => (
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
