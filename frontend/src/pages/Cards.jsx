import { useEffect } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import SeoHelmet from "../components/seo/SeoHelmet";
import {
    CARDIGO_OG_IMAGE_URL,
    getMarketingMeta,
    buildMarketingUrl,
} from "../seo/marketingMeta.config.js";
import {
    trackSitePageView,
    trackSiteClick,
} from "../services/siteAnalytics.client";
import { SITE_ACTIONS } from "../services/siteAnalytics.actions";
import pub from "../styles/public-sections.module.css";
import styles from "./Cards.module.css";
import whatsappStyles from "../components/marketing/WhatsAppCtaSkin.module.css";
import { buildSupportWhatsAppHref } from "../utils/supportContact";
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
        text: "חיוג, וואטסאפ, ניווט ורשתות חברתיות במקום אחד - כדי שללקוח יהיה קל לפנות בדרך שנוחה לו.",
    },
    {
        src: `${FEATURES_IMG}/lead-form-preview.webp`,
        alt: "טופס פניות ולידים בכרטיס ביקור דיגיטלי - Cardigo",
        title: "טופס פניות",
        text: "לקוחות משאירים פרטים בצורה מסודרת, ואתם יכולים לחזור אליהם בזמן שמתאים לכם.",
    },
    {
        src: `${FEATURES_IMG}/gallery-preview.webp`,
        alt: "גלריית תמונות ועבודות בכרטיס ביקור דיגיטלי - Cardigo",
        title: "גלריית תמונות",
        text: "הציגו עבודות, פרויקטים, מוצרים או טיפולים בצורה ויזואלית שמחזקת רושם מקצועי.",
    },
    {
        src: `${FEATURES_IMG}/booking-preview.webp`,
        alt: "אפשרות לתיאום תורים בכרטיס ביקור דיגיטלי - Cardigo",
        title: "תיאום תורים",
        text: "אפשרו ללקוחות להתקדם לפגישה או לתור ישירות מהכרטיס, בלי שיחות מיותרות ובלי בלבול.",
    },
    {
        src: `${FEATURES_IMG}/reviews-preview.webp`,
        alt: "המלצות לקוחות בכרטיס ביקור דיגיטלי - Cardigo",
        title: "המלצות לקוחות",
        text: "הציגו חוות דעת והמלצות שמחזקות אמון ועוזרות ללקוחות חדשים לקבל החלטה.",
    },
    {
        src: `${FEATURES_IMG}/analytics-preview.webp`,
        alt: "אנליטיקה וצפיות בכרטיס ביקור דיגיטלי - Cardigo",
        title: "אנליטיקה ונתונים",
        text: "עקבו אחרי צפיות, לחיצות ומקורות הגעה כדי להבין אילו ערוצים מביאים יותר עניין ופניות.",
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
        alt: "דוגמה לכרטיס ביקור דיגיטלי ליועץ הון פרטי",
        niche: "ייעוץ פיננסי",
        desc: "נוכחות מקצועית לשירותי ייעוץ, עם פרטי קשר ברורים, קישורים חשובים ובניית אמון מהרגע הראשון.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף",
        niche: "אדריכלות ועיצוב חוץ",
        desc: "הצגת פרויקטים, גלריה ודרכי יצירת קשר בצורה ויזואלית, נקייה ומרשימה.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי לרופאת שיניים אסתטית",
        niche: "רפואת שיניים",
        desc: "עמוד עסקי שמחבר בין מטופלים לקליניקה, עם ניווט, שעות פעילות, יצירת קשר ותיאום תור.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי ליועצת חדשנות דיגיטלית ו-AI  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי ליועצת חדשנות דיגיטלית ו-AI",
        niche: "טכנולוגיה ו-AI",
        desc: "דרך מסודרת להציג מומחיות, שירותים, אתר, פודקאסט ורשתות חברתיות במקום אחד שקל לשתף.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי למפיקת אירועי בוטיק  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי למפיקת אירועי בוטיק",
        niche: "הפקת אירועים",
        desc: "הצגת אירועים, סרטונים, המלצות וגלריה לצד לחצן וואטסאפ ישיר שמקל על לקוחות להתחיל שיחה.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי קליניקה לאסטטיקה  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי לקליניקה לאסתטיקה",
        niche: "אסתטיקה ובריאות",
        desc: "נוכחות מקצועית לקליניקה, עם גלריית טיפולים, טופס פנייה, פרטי קשר ותוכן שמחזק אמינות מול לקוחות חדשים.",
    },
];

const HERO_PREVIEWS = [
    {
        src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי ליועץ הון פרטי  כרדיגו.webp",
        alt: "תצוגה מקדימה של כרטיס ביקור דיגיטלי ליועץ הון פרטי",
        niche: "פיננסים",
    },
    {
        src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף  כרדיגו.webp",
        alt: "דוגמה לכרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף",
        niche: "אדריכלות",
    },
    {
        src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית  כרדיגו.webp",
        alt: "תצוגה מקדימה של כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית",
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

function buildCardsFaqJsonLd(canonicalBase) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${canonicalBase}#faq`,
        url: canonicalBase,
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

const meta = getMarketingMeta("cards");
const canonicalUrl = buildMarketingUrl(meta.path);
const cardsFaqJsonLd = buildCardsFaqJsonLd(canonicalUrl);

export default function Cards() {
    useEffect(() => {
        trackSitePageView();
    }, []);

    return (
        <main data-page="site">
            <SeoHelmet
                title={meta.title}
                description={meta.description}
                canonicalUrl={canonicalUrl}
                url={canonicalUrl}
                image={CARDIGO_OG_IMAGE_URL}
                imageAlt={meta.imageAlt}
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
                        <div className={styles.heroVisual}>
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
                                        alt={p.alt}
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
                                as="a"
                                href={buildSupportWhatsAppHref()}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="secondary"
                                className={`${styles.heroSecondary} ${whatsappStyles.skin}`}
                            >
                                <span
                                    className={whatsappStyles.icon}
                                    aria-hidden="true"
                                />
                                אני רוצה חודש ניסיון במתנה!🎁
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
                {" "}
                <div className={pub.sectionWrap}>
                    {" "}
                    <h2 className={pub.h2Gold}>
                        {" "}
                        דוגמאות לכרטיסי ביקור דיגיטליים למגוון תחומים{" "}
                    </h2>{" "}
                    <p className={pub.sectionLead}>
                        {" "}
                        ראו איך כרטיס ביקור דיגיטלי לעסק יכול להיראות בפועל - עם
                        עיצוב מקצועי, מבנה ברור והתאמה לתחומי פעילות שונים כמו
                        קליניקות, יועצים, נותני שירות, חנויות ועסקים
                        מקומיים.{" "}
                    </p>{" "}
                    {/* ── Featured dual-device spotlight ── */}{" "}
                    <div className={styles.featured}>
                        {" "}
                        <div className={styles.featuredDevices}>
                            {" "}
                            <div className={styles.featuredDesktop}>
                                {" "}
                                <img
                                    src={FEATURED.desktop.src}
                                    alt={FEATURED.desktop.alt}
                                    className={styles.featuredDesktopImg}
                                    width={720}
                                    height={450}
                                    loading="lazy"
                                    decoding="async"
                                />{" "}
                            </div>{" "}
                            <div className={styles.featuredPhone}>
                                {" "}
                                <img
                                    src={FEATURED.phone.src}
                                    alt={FEATURED.phone.alt}
                                    className={styles.featuredPhoneImg}
                                    width={280}
                                    height={560}
                                    loading="lazy"
                                    decoding="async"
                                />{" "}
                            </div>{" "}
                        </div>{" "}
                        <div className={styles.featuredCopy}>
                            {" "}
                            <span className={styles.featuredLabel}>
                                {" "}
                                תצוגה מקצועית בכל מכשיר{" "}
                            </span>{" "}
                            <h3 className={styles.featuredTitle}>
                                {" "}
                                כרטיס דיגיטלי שנראה טוב בנייד, במחשב
                                ובטאבלט{" "}
                            </h3>{" "}
                            <ul className={styles.featuredBullets}>
                                {" "}
                                <li>
                                    הצגת העסק בצורה ברורה, מעוצבת ומעודכנת
                                </li>{" "}
                                <li>
                                    {" "}
                                    פרטי קשר, קישורים, רשתות חברתיות וכפתורי
                                    פעולה במקום אחד{" "}
                                </li>{" "}
                                <li>
                                    {" "}
                                    שיתוף מהיר בוואטסאפ, QR, SMS או אימייל - בלי
                                    להסביר שוב מי אתם ומה אתם מציעים{" "}
                                </li>{" "}
                            </ul>{" "}
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
                                {" "}
                                בחרו תבנית והתחילו ליצור כרטיס{" "}
                            </Button>{" "}
                        </div>{" "}
                    </div>{" "}
                    {/* ── Curated showcase rail ── */}{" "}
                    <div className={styles.showcaseRail}>
                        {" "}
                        <div className={styles.showcaseGrid}>
                            {" "}
                            {SHOWCASE_CARDS.map((card, i) => (
                                <article
                                    key={i}
                                    className={styles.showcaseCard}
                                >
                                    {" "}
                                    <img
                                        src={encodeURI(card.src)}
                                        alt={card.alt}
                                        className={styles.showcaseImg}
                                        width={280}
                                        height={560}
                                        loading="lazy"
                                        decoding="async"
                                    />{" "}
                                    <span className={styles.showcaseNiche}>
                                        {" "}
                                        {card.niche}{" "}
                                    </span>{" "}
                                    <p className={styles.showcaseDesc}>
                                        {" "}
                                        {card.desc}{" "}
                                    </p>{" "}
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
                                        {" "}
                                        התחילו ליצור כרטיס &larr;{" "}
                                    </Link>{" "}
                                </article>
                            ))}{" "}
                        </div>{" "}
                    </div>{" "}
                    {/* ── Section-bottom CTA ── */}{" "}
                    <div className={styles.showcaseBottom}>
                        {" "}
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
                            {" "}
                            ראו את כל התבניות{" "}
                        </Button>{" "}
                    </div>{" "}
                </div>{" "}
            </section>

            {/* ─── Section 3: What the card includes ─── */}
            <section className={pub.sectionDark}>
                {" "}
                <div className={pub.sectionWrap}>
                    {" "}
                    <h2 className={pub.h2White}>
                        {" "}
                        מה כולל כרטיס ביקור דיגיטלי מקצועי?{" "}
                    </h2>{" "}
                    <p className={pub.sectionLeadLight}>
                        {" "}
                        <span
                            className={`${pub.goldHilight} ${pub.goldUnderline}`}
                        >
                            {" "}
                            העיצוב הוא רק ההתחלה{" "}
                        </span>{" "}
                        - מאחורי כל כרטיס דיגיטלי של{" "}
                        <Link
                            to="/"
                            className={`${pub.goldHilight} ${pub.goldUnderline}`}
                        >
                            {" "}
                            Cardigo{" "}
                        </Link>{" "}
                        יש כלים שעוזרים לעסק להציג מידע ברור, לקבל פניות, לשתף
                        קישור מקצועי ולבנות נוכחות דיגיטלית שקל ללקוחות להבין
                        ולגוגל לקרוא.{" "}
                    </p>{" "}
                    <div className={styles.featuresRail}>
                        {" "}
                        <div className={styles.featuresGrid}>
                            {" "}
                            {CARD_FEATURES.map((f, i) => (
                                <article key={i} className={styles.featureCard}>
                                    {" "}
                                    <img
                                        src={f.src}
                                        alt={f.alt}
                                        className={styles.featureImg}
                                        loading="lazy"
                                        decoding="async"
                                    />{" "}
                                    <h3 className={styles.featureTitle}>
                                        {" "}
                                        {f.title}{" "}
                                    </h3>{" "}
                                    <p className={styles.featureText}>
                                        {" "}
                                        {f.text}{" "}
                                    </p>{" "}
                                </article>
                            ))}{" "}
                        </div>{" "}
                    </div>{" "}
                </div>{" "}
            </section>

            {/* ─── Section 4: Final CTA + SEO appendix ─── */}
            <section className={pub.sectionLight}>
                {" "}
                <div className={pub.sectionWrap}>
                    {" "}
                    <div className={styles.ctaLayout}>
                        {" "}
                        <h2 className={`${styles.ctaHeading}`}>
                            {" "}
                            הפכו את כרטיס הביקור שלכם <br />
                            <span className={pub.h2Gold}>
                                {" "}
                                לכרטיס דיגיטלי שמביא פניות{" "}
                            </span>{" "}
                        </h2>{" "}
                        <div className={styles.ctaCopy}>
                            {" "}
                            <p className={styles.ctaText}>
                                {" "}
                                תוך כמה דקות תוכלו לבחור תבנית, להוסיף את פרטי
                                העסק ולשתף כרטיס ביקור דיגיטלי שנראה מקצועי
                                בנייד, במחשב ובכל מסך.{" "}
                            </p>{" "}
                            <div className={styles.ctaActions}>
                                {" "}
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
                                    {" "}
                                    צרו כרטיס דיגיטלי בחינם{" "}
                                </Button>{" "}
                                <Button
                                    as={Link}
                                    to="/pricing/"
                                    variant="secondary"
                                >
                                    {" "}
                                    מסלולים ומחירים{" "}
                                </Button>{" "}
                            </div>{" "}
                        </div>{" "}
                        <div className={styles.ctaVisual}>
                            {" "}
                            <img
                                src="/images/sample-card-page/cards-cta/cards-cta.webp"
                                alt="דוגמה לכרטיס ביקור דיגיטלי לעסק - Cardigo"
                                className={styles.ctaImage}
                                width={800}
                                height={450}
                                loading="lazy"
                                decoding="async"
                            />{" "}
                        </div>{" "}
                    </div>{" "}
                </div>{" "}
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
