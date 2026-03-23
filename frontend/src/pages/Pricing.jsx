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

            {/* ── Future: Pricing plans (full) ──────────────── */}
            <section id="plans" className={pub.sectionLight}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>המסלולים שלנו</h2>
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
