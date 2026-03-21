import { useEffect } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import SeoHelmet from "../components/seo/SeoHelmet";
import { trackSitePageView } from "../services/siteAnalytics.client";
import pub from "../styles/public-sections.module.css";
import styles from "./Cards.module.css";

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";

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
                        <span className={styles.kicker}>
                            דוגמאות לכרטיסי ביקור דיגיטליים
                        </span>

                        <h1 className={styles.h1}>
                            כך יכול להיראות כרטיס הביקור הדיגיטלי של העסק שלך
                        </h1>

                        <p className={pub.sectionLeadLight}>
                            דוגמאות ויזואליות בסגנונות שונים כדי לראות איך
                            Cardigo מציג את העסק, הקישורים ודרכי יצירת הקשר —
                            לפני שיוצרים כרטיס משלכם.
                        </p>

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

                    <p className={styles.heroNote}>
                        הדוגמאות בעמוד זה מיועדות להמחשה בלבד.
                    </p>
                </div>
            </section>

            {/* ─── SEO text (temporary, preserved from MVP) ─── */}
            <section className={pub.sectionLight}>
                <div className={styles.seoWrap}>
                    <h2 className={styles.seoHeading}>
                        כרטיס ביקור דיגיטלי – למה זה עובד?
                    </h2>
                    <p className={styles.seoText}>
                        כרטיס ביקור דיגיטלי מאפשר להציג את העסק בצורה מקצועית,
                        מעודכנת ונגישה. במקום כרטיס נייר שנעלם או מתיישן, כרטיס
                        דיגיטלי תמיד זמין בקישור אחד, ניתן לשיתוף בוואטסאפ, SMS,
                        QR או אימייל, ומתאים במיוחד למובייל.
                    </p>
                    <p className={styles.seoText}>
                        Cardigo מאפשרת ליצור כרטיס ביקור דיגיטלי לעסקים תוך
                        דקות, עם עיצוב מודרני, כפתורי יצירת קשר, גלריית תמונות,
                        וידאו, המלצות וטופס לידים.
                    </p>
                </div>
            </section>
        </main>
    );
}
