import { useEffect } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import {
    trackSiteClick,
    trackSitePageView,
} from "../services/siteAnalytics.client";
import styles from "./Home.module.css";

const FEATURES = [
    {
        title: "חיוג ישיר",
        text: "בלחיצה אחת הלקוח מתקשר אליכם — בלי להעתיק מספרים ובלי לחפש.",
        icon: "/icons/phone.svg",
    },
    {
        title: "וואטסאפ בקליק",
        text: "הלקוח פותח שיחה מיידית בוואטסאפ עם הודעה מוכנה מראש.",
        icon: "/icons/whatsapp.svg",
    },
    {
        title: "ניווט לעסק",
        text: "כפתור ניווט שמוביל את הלקוחות אליכם בקלות ובמהירות.",
        icon: "/icons/navigation.svg",
    },
    {
        title: "קישור לאתר",
        text: "קישור ישיר לאתר שלכם או לקטלוג מוצרים — תמיד זמין לשיתוף.",
        icon: "/icons/link.svg",
    },
    {
        title: "אתר One Page",
        text: "עמוד תדמית ממוקד שמוכן לשיתוף ויכול להופיע בתוצאות החיפוש בגוגל.",
        icon: "/icons/onepage.svg",
    },
    {
        title: "רשתות חברתיות",
        text: "הלקוחות נחשפים לכל המדיות החברתיות שלכם בלחיצה אחת.",
        icon: "/icons/social.svg",
    },
    {
        title: "גלריה ותמונות",
        text: "הצגת עבודות, מוצרים או פרויקטים בצורה ויזואלית.",
        icon: "/icons/gallery.svg",
    },
    {
        title: "וידאו והמלצות",
        text: "בניית אמון עם סרטון קצר והמלצות מלקוחות.",
        icon: "/icons/video.svg",
    },
    {
        title: "טופס לידים",
        text: "לקוחות משאירים פרטים – ואתם חוזרים אליהם.",
        icon: "/icons/form.svg",
    },
];

export default function Home() {
    useEffect(() => {
        trackSitePageView();
    }, []);

    return (
        <main className={styles.page}>
            {/* HERO */}
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <div className={styles.heroText}>
                        <div className={styles.kicker}>
                            כרטיס ביקור דיגיטלי מתקדם
                        </div>
                        <h1 className={styles.h1}>
                            כרטיס ביקור דיגיטלי מקצועי שמביא יותר לקוחות
                        </h1>
                        <p className={styles.p}>
                            כרטיס ביקור דיגיטלי חכם, מהיר ומעוצב — עם שיתוף
                            בקליק, התאמה אישית מלאה ונראות מושלמת במובייל. פתרון
                            מודרני לעסקים שרוצים להיראות רציניים.
                        </p>

                        <div className={styles.heroActions}>
                            <Button
                                as={Link}
                                to="/register"
                                variant="primary"
                                onClick={() =>
                                    trackSiteClick({
                                        action: "home_hero_primary_register",
                                        pagePath: "/",
                                    })
                                }
                            >
                                צור כרטיס חינם
                            </Button>
                            <Button
                                as="a"
                                href="#templates"
                                variant="secondary"
                                onClick={() =>
                                    trackSiteClick({
                                        action: "home_hero_secondary_examples",
                                        pagePath: "/",
                                    })
                                }
                            >
                                לצפייה בדוגמאות
                            </Button>
                        </div>

                        <div className={styles.badges}>
                            <span>שיתוף בוואטסאפ, SMS ו-QR</span>
                            <span>כפתורי יצירת קשר בלחיצה</span>
                            <span>טופס לידים שמביא פניות</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.digitalCardLight}>
                <div className={styles.inner}>
                    <div className={styles.centeredTitleandSubtitle}>
                        <h2 className={styles.title}>
                            מה זה כרטיס ביקור דיגיטלי?
                        </h2>
                        <h3 className={styles.subtitle}>
                            פתרון חכם, מודרני ונוח ליצירת קשר עם לקוחות
                        </h3>
                    </div>

                    <div className={styles.content}>
                        <p>
                            כרטיס ביקור דיגיטלי הוא כרטיס חכם שמחליף את כרטיסי
                            הנייר המסורתיים, ומאפשר לכם לשתף את כל פרטי ההתקשרות
                            שלכם בקישור אחד פשוט.
                        </p>

                        <p>
                            במקום להדפיס, לשמור ולחפש כרטיסי נייר — הכרטיס
                            הדיגיטלי זמין תמיד, מתעדכן בזמן אמת ונראה מצוין בכל
                            מכשיר.
                        </p>

                        <p>
                            הכרטיס כולל פרטי קשר, כפתורי יצירת קשר מיידיים,
                            קישורים לרשתות חברתיות, תוכן ויזואלי וטופס פניות —
                            והופך כל מפגש להזדמנות עסקית.
                        </p>
                    </div>

                    <div className={styles.highlight}>
                        כרטיס ביקור דיגיטלי לא הולך לאיבוד, לא נגמר – והוא תמיד
                        איתכם
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className={styles.section} id="features">
                <div className={styles.sectionInner}>
                    <div className={styles.centeredTitleandSubtitle}>
                        <h2 className={styles.h2}>מה מקבלים בכרטיס דיגיטלי?</h2>
                        <p className={styles.pMuted}>
                            כל הכלים במקום אחד – כדי שהלקוח יבין מי אתם ויצור
                            קשר מיד.
                        </p>
                    </div>

                    <div className={styles.featuresGrid}>
                        {FEATURES.map((item, i) => (
                            <div key={i} className={styles.featureCard}>
                                <div className={styles.iconWrap}>
                                    <img src={item.icon} alt="" />
                                </div>

                                <h3 className={styles.featureTitle}>
                                    {item.title}
                                </h3>
                                <p className={styles.featureText}>
                                    {item.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className={styles.section} id="how">
                <div className={styles.sectionInner}>
                    <h2 className={`${styles.h2} ${styles.h2Outlined}`}>
                        איך זה עובד?
                    </h2>

                    <div className={styles.steps}>
                        <div className={styles.step}>
                            <div className={styles.stepNum}>1</div>
                            <div className={styles.stepTitle}>נרשמים</div>
                            <div className={styles.stepText}>
                                יוצרים חשבון ומתחילים בחינם.
                            </div>
                        </div>
                        <div className={styles.step}>
                            <div className={styles.stepNum}>2</div>
                            <div className={styles.stepTitle}>בוחרים תבנית</div>
                            <div className={styles.stepText}>
                                בחרו עיצוב שמתאים לעסק שלכם.
                            </div>
                        </div>
                        <div className={styles.step}>
                            <div className={styles.stepNum}>3</div>
                            <div className={styles.stepTitle}>ממלאים פרטים</div>
                            <div className={styles.stepText}>
                                מוסיפים טקסט, תמונות וקישורים.
                            </div>
                        </div>
                        <div className={styles.step}>
                            <div className={styles.stepNum}>4</div>
                            <div className={styles.stepTitle}>משתפים</div>
                            <div className={styles.stepText}>
                                קישור, QR, וואטסאפ — וזה עובד.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* TEMPLATES PREVIEW */}
            <section className={styles.section} id="templates">
                <div className={styles.sectionInner}>
                    <h2 className={styles.h2}>דוגמאות ותבניות</h2>
                    <p className={styles.pMuted}>
                        כאן נציג גלריית תבניות אמיתית (בשלב הבא).
                    </p>

                    <div className={styles.templatesRow}>
                        <div className={styles.templateCard} />
                        <div className={styles.templateCard} />
                        <div className={styles.templateCard} />
                        <div className={styles.templateCard} />
                    </div>

                    <div className={styles.center}>
                        <Button as={Link} to="/register" variant="secondary">
                            צור כרטיס חינם עכשיו
                        </Button>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className={styles.section} id="faq">
                <div className={styles.sectionInner}>
                    <h2 className={styles.h2}>שאלות נפוצות</h2>

                    <div className={styles.faq}>
                        <details className={styles.qa}>
                            <summary>כמה זמן לוקח ליצור כרטיס?</summary>
                            <div className={styles.answer}>
                                בדרך כלל כמה דקות. בוחרים תבנית, מוסיפים פרטים
                                ומתחילים לשתף.
                            </div>
                        </details>

                        <details className={styles.qa}>
                            <summary>אפשר לעדכן פרטים אחרי שפרסמתי?</summary>
                            <div className={styles.answer}>
                                כן. מעדכנים בעורך והכרטיס מתעדכן מיד בקישור.
                            </div>
                        </details>

                        <details className={styles.qa}>
                            <summary>הכרטיס מתאים למובייל?</summary>
                            <div className={styles.answer}>
                                כן. העיצוב הוא mobile-first ומתאים לעברית (RTL).
                            </div>
                        </details>

                        <details className={styles.qa}>
                            <summary>יש תכנית חינמית?</summary>
                            <div className={styles.answer}>
                                כן. אפשר להתחיל בחינם ולשדרג כשצריך יותר יכולות.
                            </div>
                        </details>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className={styles.cta}>
                <div className={styles.ctaInner}>
                    <div>
                        <div className={styles.ctaTitle}>מוכנים להתחיל?</div>
                        <div className={styles.ctaText}>
                            צרו כרטיס ביקור דיגיטלי מקצועי ותתחילו לשתף עוד
                            היום.
                        </div>
                    </div>
                    <Button as={Link} to="/register" variant="primary">
                        צור כרטיס חינם
                    </Button>
                </div>
            </section>
        </main>
    );
}
