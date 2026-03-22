import { useEffect } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import SeoHelmet from "../components/seo/SeoHelmet";
import { trackSitePageView } from "../services/siteAnalytics.client";
import pub from "../styles/public-sections.module.css";
import styles from "./Cards.module.css";

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";

const SAMPLE_IMG = "/images/sample-card-page";
const SECTION6_IMG = "/images/home-page/main-sections/Section-6";
const FEATURES_IMG = "/images/sample-card-page/cards-features";

const CARD_FEATURES = [
    {
        src: `${FEATURES_IMG}/contact-actions.webp`,
        alt: "לחצני יצירת קשר בכרטיס ביקור דיגיטלי — Cardigo",
        title: "לחצני יצירת קשר",
        text: "חיוג, וואטסאפ, ניווט ורשתות חברתיות — הלקוח בוחר איך לפנות.",
    },
    {
        src: `${FEATURES_IMG}/lead-form-preview.webp`,
        alt: "טופס לידים בכרטיס ביקור דיגיטלי — Cardigo",
        title: "טופס לידים",
        text: "לקוחות משאירים פרטים — ואתם חוזרים בזמן שנוח לכם.",
    },
    {
        src: `${FEATURES_IMG}/gallery-preview.webp`,
        alt: "גלריית תמונות בכרטיס ביקור דיגיטלי — Cardigo",
        title: "גלריית תמונות",
        text: "הציגו עבודות, פרויקטים ותמונות מקצועיות בצורה ויזואלית.",
    },
    {
        src: `${FEATURES_IMG}/faq-preview.webp`,
        alt: "שאלות ותשובות בכרטיס ביקור דיגיטלי — Cardigo",
        title: "שאלות ותשובות",
        text: "מענה מיידי ללקוחות בלי טלפון — חוסך זמן לשני הצדדים.",
    },
    {
        src: `${FEATURES_IMG}/reviews-preview.webp`,
        alt: "המלצות לקוחות בכרטיס ביקור דיגיטלי — Cardigo",
        title: "המלצות לקוחות",
        text: "חוות דעת אמיתיות שמחזקות אמון ומעודדות פנייה.",
    },
    {
        src: `${FEATURES_IMG}/analytics-preview.webp`,
        alt: "אנליטיקה ונתונים בכרטיס ביקור דיגיטלי — Cardigo",
        title: "אנליטיקה ונתונים",
        text: "צפיות, לחיצות ומקורות תנועה — כדי שתדעו מה באמת עובד.",
    },
];

const FEATURED = {
    desktop: {
        src: `${SAMPLE_IMG}/Cardigo-bussines-digital-card-desktop-view.webp`,
        alt: "כרטיס ביקור דיגיטלי בתצוגת מחשב — Cardigo",
    },
    phone: {
        src: `${SAMPLE_IMG}/Cardigo-bussines-digital-card-mobile-view.webp`,
        alt: "כרטיס ביקור דיגיטלי בתצוגת נייד — Cardigo",
    },
};

const SHOWCASE_CARDS = [
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי ליועץ הון פרטי  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי — ייעוץ פיננסי",
        niche: "פיננסים",
        desc: "נוכחות עסקית מקצועית עם קישורים, פרטי קשר ויצירת אמון — בקליק אחד.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי — אדריכלות",
        niche: "אדריכלות",
        desc: "הצגת פרויקטים, גלריה ודרכי יצירת קשר בצורה ויזואלית ומרשימה.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי — רפואת שיניים",
        niche: "רפואה",
        desc: "כרטיס שמחבר בין מטופלים לקליניקה — ניווט, שעות פעילות ותיאום תור.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי ליועצת חדשנות דיגיטלית ו-AI  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי — חדשנות ו-AI",
        niche: "טכנולוגיה",
        desc: "כרטיס שמציג מומחיות, קישור לפודקאסט, אתר ורשתות חברתיות.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי למפיקת אירועי בוטיק  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי — הפקת אירועים",
        niche: "אירועים",
        desc: "גלריית אירועים, סרטונים, המלצות ולחצן וואטסאפ ישיר ללקוחות.",
    },
    {
        src: `${SECTION6_IMG}/כרטיס ביקור דיגיטלי קליניקה לאסטטיקה  כרדיגו.webp`,
        alt: "דוגמה לכרטיס ביקור דיגיטלי — קליניקה אסתטית",
        niche: "בריאות ויופי",
        desc: "כרטיס שמקרין מקצועיות ואמינות — עם טופס לידים, גלריה ופרטי קשר.",
    },
];

const HERO_PREVIEWS = [
    {
        src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי ליועץ הון פרטי  כרדיגו.webp",
        alt: "דוגמה לכרטיס ביקור דיגיטלי — ייעוץ פיננסי",
        niche: "פיננסים",
    },
    {
        src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף  כרדיגו.webp",
        alt: "דוגמה לכרטיס ביקור דיגיטלי — אדריכלות",
        niche: "אדריכלות",
    },
    {
        src: "/images/home-page/main-sections/Section-6/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית  כרדיגו.webp",
        alt: "דוגמה לכרטיס ביקור דיגיטלי — רפואת שיניים",
        niche: "רפואה",
    },
];

export default function Cards() {
    useEffect(() => {
        trackSitePageView();
    }, []);

    return (
        <main data-page="site">
            <SeoHelmet
                title="דוגמאות לכרטיסי ביקור דיגיטליים | Cardigo"
                description="דוגמאות ויזואליות לכרטיסי ביקור דיגיטליים בסגנונות שונים — ראו איך Cardigo מציג עסקים, קישורים ודרכי יצירת קשר לפני שיוצרים כרטיס משלכם."
                canonicalUrl={`${ORIGIN}/cards`}
                url={`${ORIGIN}/cards`}
                image={`${ORIGIN}/images/og/cardigo-home-og-1200x630.jpg`}
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
                            >
                                צרו כרטיס ביקור דיגיטלי
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

                    <p className={styles.heroNote}>
                        הדוגמאות בעמוד זה מיועדות להמחשה בלבד.
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
                        כל עסק, כל מקצוע — כרטיס שנראה מקצועי ומותאם בדיוק לתחום
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
                                נראה מדהים בכל מסך — פלאפון, מחשב או טאבלט
                            </h3>
                            <ul className={styles.featuredBullets}>
                                <li>הצגת העסק בעיצוב מקצועי עם מידע עדכני</li>
                                <li>
                                    קישורים, לחצני יצירת קשר ורשתות חברתיות
                                    במקום אחד
                                </li>
                                <li>
                                    שיתוף בוואטסאפ, QR, SMS או אימייל — בקליק
                                    אחד
                                </li>
                            </ul>
                            <Button
                                as={Link}
                                to="/edit/card/templates"
                                variant="secondary"
                                className={styles.featuredCta}
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
                        כל כרטיס ביקור דיגיטלי של Cardigo מגיע עם כלים מעשיים
                        להצגת העסק, יצירת קשר עם לקוחות, איסוף לידים, בניית אמון
                        ומעקב אחרי ביצועים.
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
                            הפכו את העסק שלכם למכונת לידים <br />{" "}
                            <span className={pub.h2Gold}>
                                עם כרטיס ביקור דיגיטלי חכם!{" "}
                            </span>
                        </h2>{" "}
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
                                >
                                    צרו כרטיס ביקור דיגיטלי
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
                                alt="כרטיס ביקור דיגיטלי לעסקים — Cardigo"
                                className={styles.ctaImage}
                                width={800}
                                height={450}
                                loading="lazy"
                                decoding="async"
                            />
                        </div>
                    </div>

                    {/* ── SEO appendix (temporary, preserved from MVP) ── */}
                    <div className={styles.seoAppendix}>
                        <h3 className={styles.seoHeading}>
                            כרטיס ביקור דיגיטלי – למה זה עובד?
                        </h3>
                        <p className={styles.seoText}>
                            כרטיס ביקור דיגיטלי מאפשר להציג את העסק בצורה
                            מקצועית, מעודכנת ונגישה. במקום כרטיס נייר שנעלם או
                            מתיישן, כרטיס דיגיטלי תמיד זמין בקישור אחד, ניתן
                            לשיתוף בוואטסאפ, SMS, QR או אימייל, ומתאים במיוחד
                            למובייל.
                        </p>
                        <p className={styles.seoText}>
                            Cardigo מאפשרת ליצור כרטיס ביקור דיגיטלי לעסקים תוך
                            דקות, עם עיצוב מודרני, כפתורי יצירת קשר, גלריית
                            תמונות, וידאו, המלצות וטופס לידים.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
