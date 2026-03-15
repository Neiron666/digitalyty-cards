import { useEffect } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import {
    trackSiteClick,
    trackSitePageView,
} from "../services/siteAnalytics.client";
import { SITE_ACTIONS } from "../services/siteAnalytics.actions";
import motion from "../styles/motion.module.css";
import scroll from "../styles/motion-scroll.module.css";
import useMotionReveal from "../hooks/useMotionReveal";
import useScrollProgress from "../hooks/useScrollProgress";
import styles from "./Home.module.css";
import {
    GalleryIcon,
    ContentIcon,
    SeoIcon,
    AnalyticsIcon,
    SelfDesignIcon,
} from "../components/icons/EditorTabIcons";
import {
    PhoneIcon,
    ChatIcon,
    LocationIcon,
    VideoIcon,
    StarIcon,
    QuestionIcon,
    LinkIcon,
    QrCodeIcon,
    PencilIcon,
    MobileIcon,
    LockIcon,
    ClickIcon,
} from "../components/icons/HomeIcons";

/* ── Data ────────────────────────────────────────────── */

const SECTION_2_IMG = "/images/home-page/main-sections/Section-2";

const CONVERSION_ITEMS = [
    {
        Icon: PhoneIcon,
        title: "חיוג ישיר",
        text: "הלקוח לוחץ ומתחיל שיחה מיידית - בדרך הכי קצרה אליכם",
        src: `${SECTION_2_IMG}/phone-call.webp`,
        alt: "חיוג ישיר מכרטיס ביקור דיגיטלי",
    },
    {
        Icon: ChatIcon,
        title: "וואטסאפ מיידי",
        text: "פתיחת שיחה מיידית בוואטסאפ עם הודעה מוכנה מראש",
        src: `${SECTION_2_IMG}/watsapp.webp`,
        alt: "שליחת וואטסאפ מכרטיס ביקור דיגיטלי",
    },
    {
        Icon: ContentIcon,
        title: "טופס פניות",
        text: "לקוחות משאירים פרטים - ואתם חוזרים בזמן שנוח לכם",
        src: `${SECTION_2_IMG}/lead.webp`,
        alt: "טופס פניות בכרטיס ביקור דיגיטלי",
    },
    {
        Icon: LocationIcon,
        title: "ניווט ישיר ",
        text: "  מסלול לעסק בלחיצה אחת - בלי לשאול איך מגיעים",
        src: `${SECTION_2_IMG}/waze.webp`,
        alt: "ניווט ישיר מכרטיס ביקור דיגיטלי",
    },
];

const ANALYTICS_METRICS = [
    { value: "312", label: "צפיות השבוע" },
    { value: "47", label: "לחיצות פעולה" },
    { value: "15.1%", label: "שיעור המרה" },
];

const SECTION_3_IMG = "/images/home-page/main-sections/Section-3";

const ANALYTICS_INSIGHTS = [
    {
        Icon: SeoIcon,
        title: "מקורות הגעה",
        text: "זהו את הפלטפורמות שמביאות הכי הרבה תנועה לכרטיס.",
        src: `${SECTION_3_IMG}/digital_business_card-marketing-distribution-channels.webp`,
        alt: "מקורות הגעה לכרטיס ביקור דיגיטלי",
    },
    {
        Icon: AnalyticsIcon,
        title: "ביצועי קמפיינים",
        text: "השוו תוצאות בין קמפיינים וגלו איפה כדאי להשקיע.",
        src: `${SECTION_3_IMG}/digital_business_card-marketing-campaign-performance.webp`,
        alt: "ביצועי קמפיינים בכרטיס ביקור דיגיטלי",
    },
    {
        Icon: ClickIcon,
        title: "פעולות גולשים",
        text: "דעו אילו פעולות הלקוחות מבצעים ומאיזה מקור.",
        src: `${SECTION_3_IMG}/digital_business_card-customer-click-behavior.webp`,
        alt: "התנהגות לקוחות בכרטיס ביקור דיגיטלי",
    },
    {
        Icon: LinkIcon,
        title: "ערוצי הפצה",
        text: "מדדו ביצועים לפי ערוץ וקישור — ותכוונו את השיווק.",
        src: `${SECTION_3_IMG}/digital_business_card-campaign-performance-robot.webp`,
        alt: "ערוצי הפצה בכרטיס ביקור דיגיטלי",
    },
];

const ANALYTICS_SOURCES = [
    { name: "Instagram", pct: 42 },
    { name: "WhatsApp", pct: 28 },
    { name: "Google", pct: 18 },
    { name: "ישיר", pct: 12 },
];

const SHARE_CHANNELS = [
    {
        Icon: LinkIcon,
        title: "קישור ישיר",
        text: "שתפו בכל מקום - אימייל, ביו ברשתות, חתימה דיגיטלית.",
    },
    {
        Icon: QrCodeIcon,
        title: "QR Code",
        text: "קוד QR להדפסה, שילוט, אריזות, ואירועים.",
    },
    {
        Icon: ChatIcon,
        title: "WhatsApp",
        text: "שליחה ישירה ללקוחות עם תצוגה מקדימה אוטומטית.",
    },
    {
        Icon: AnalyticsIcon,
        title: "קישור + UTM",
        text: "צרו קישורים ייעודיים לכל קמפיין - ועקבו אחרי התוצאות.",
    },
];

const PRESENCE_FEATURES = [
    { Icon: GalleryIcon, label: "גלריית עבודות" },
    { Icon: VideoIcon, label: "סרטון YouTube" },
    { Icon: StarIcon, label: "המלצות לקוחות" },
    { Icon: QuestionIcon, label: "שאלות נפוצות" },
    { Icon: ContentIcon, label: "טופס פניות" },
    { Icon: SeoIcon, label: "מופיע בגוגל" },
];

const SECTION_1_IMG = "/images/home-page/main-sections/Section-1";

const PRESENCE_PROOF_CARDS = [
    {
        title: "המלצות",
        src: `${SECTION_1_IMG}/review.webp`,
        alt: "המלצות לקוחות בכרטיס ביקור דיגיטלי",
        posClass: "proofTopStart",
    },
    {
        title: "כפתורי פעולה",
        src: `${SECTION_1_IMG}/social-buttons.webp`,
        alt: "כפתורי שיתוף ופעולה בכרטיס ביקור דיגיטלי",
        posClass: "proofBottomStart",
    },
    {
        title: "טופס לידים",
        src: `${SECTION_1_IMG}/lead.webp`,
        alt: "טופס יצירת קשר בכרטיס ביקור דיגיטלי",
        posClass: "proofTopEnd",
    },
    {
        title: "גלרית תמונות",
        src: `${SECTION_1_IMG}/gallery.webp`,
        alt: "גלרית תמונות בכרטיס ביקור דיגיטלי",
        posClass: "proofBottomEnd",
    },
];

/* ── Local helper: single scroll-driven proof card ────── */

function ProofCard({ title, src, alt, posClass }) {
    const { ref } = useScrollProgress();
    return (
        <div className={`${styles.proofCard} ${styles[posClass]}`}>
            <div className={scroll.scrollDriftInline} ref={ref}>
                {/* <span className={styles.proofCardTitle}>{title}</span> */}
                <img
                    className={styles.proofCardImage}
                    src={src}
                    alt={alt}
                    width={200}
                    height={160}
                    loading="lazy"
                    decoding="async"
                />
            </div>
        </div>
    );
}

const CONTROL_FEATURES = [
    {
        Icon: SelfDesignIcon,
        title: "החלפת עיצוב מיידית",
        text: "בחרו מ-25 תבניות מקצועיות והחליפו בלחיצה - התוכן נשמר.",
    },
    {
        Icon: PencilIcon,
        title: "עריכת תוכן חופשית",
        text: "טקסטים, תמונות, קישורים, שאלות נפוצות - הכל מתעדכן מיד.",
    },
    {
        Icon: MobileIcon,
        title: "מכל מכשיר",
        text: "העורך עובד גם מהנייד. עדכון מהיר בדרך לפגישה.",
    },
    {
        Icon: LockIcon,
        title: "פרסום בשליטתכם",
        text: "פרסמו והסתירו את הכרטיס בכל רגע - אתם מחליטים מתי.",
    },
];

const TEMPLATE_SKINS = [
    { name: "Lakmi", color: "#f5ebe0", accent: "#d4af37" },
    { name: "Tehom Turkiz", color: "#0f172a", accent: "#2dd4bf" },
    { name: "Ruby Esh", color: "#1c0a0a", accent: "#ef4444" },
    { name: "Iris Layla", color: "#1a1035", accent: "#a78bfa" },
    { name: "Bronze Sachlav", color: "#1c1410", accent: "#cd7f32" },
    { name: "Pardes Chai", color: "#f0fdf4", accent: "#22c55e" },
];

const HERO_CARDS = [
    {
        src: "/images/home-page/hero/\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D9\u05EA \u05D7\u05D5\u05E5 \u05D5\u05E0\u05D5\u05E3  \u05DB\u05E8\u05D3\u05D9\u05D2\u05D5.webp",
        alt: "\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D9\u05EA",
    },
    {
        src: "/images/home-page/hero/\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05D9\u05D5\u05E2\u05E6\u05EA \u05D7\u05D3\u05E9\u05E0\u05D5\u05EA \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA \u05D5-AI  \u05DB\u05E8\u05D3\u05D9\u05D2\u05D5.webp",
        alt: "\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05D9\u05D5\u05E2\u05E6\u05EA \u05D7\u05D3\u05E9\u05E0\u05D5\u05EA",
    },
    {
        src: "/images/home-page/hero/\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05DE\u05E4\u05D9\u05E7\u05EA \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9 \u05D1\u05D5\u05D8\u05D9\u05E7  \u05DB\u05E8\u05D3\u05D9\u05D2\u05D5.webp",
        alt: "\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05DE\u05E4\u05D9\u05E7\u05EA \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD",
    },
    {
        src: "/images/home-page/hero/\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05D9\u05D5\u05E2\u05E5 \u05D4\u05D5\u05DF \u05E4\u05E8\u05D8\u05D9  \u05DB\u05E8\u05D3\u05D9\u05D2\u05D5.webp",
        alt: "\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05D9\u05D5\u05E2\u05E5 \u05D4\u05D5\u05DF",
    },
    {
        src: "/images/home-page/hero/\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05E8\u05D5\u05E4\u05D0\u05EA \u05E9\u05D9\u05E0\u05D9\u05D9\u05DD \u05D0\u05E1\u05EA\u05D8\u05D9\u05EA  \u05DB\u05E8\u05D3\u05D9\u05D2\u05D5.webp",
        alt: "\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05E8\u05D5\u05E4\u05D0\u05EA \u05E9\u05D9\u05E0\u05D9\u05D9\u05DD",
    },
];

export default function Home() {
    useEffect(() => {
        trackSitePageView();
    }, []);

    const r1 = useMotionReveal();
    const r2 = useMotionReveal();
    const r3 = useMotionReveal();
    const r4 = useMotionReveal();
    const r5 = useMotionReveal();
    const r6 = useMotionReveal();
    const r7 = useMotionReveal();
    const r8 = useMotionReveal();
    const r9 = useMotionReveal();

    const stageZoom = useScrollProgress();
    const dashZoom = useScrollProgress();
    const insightScroll = useScrollProgress();

    return (
        <main className={styles.page} data-page="site">
            {/* HERO - unchanged */}
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <div className={styles.heroText}>
                        <Link
                            to="/"
                            className={styles.heroLogoLink}
                            aria-label="כרטיס ביקור דיגיטלי - כרדיגו"
                        >
                            <picture>
                                <source
                                    type="image/webp"
                                    srcSet="/images/brand-logo/cardigo-logo.webp"
                                />
                                <img
                                    src="/images/brand-logo/cardigo-logo.png"
                                    alt="כרטיס ביקור דיגיטלי - כרדיגו"
                                    className={styles.heroLogoImage}
                                    loading="eager"
                                    decoding="async"
                                />
                            </picture>
                        </Link>

                        <h1 className={styles.h1}>
                            כרטיס ביקור דיגיטלי
                            <span className={styles.h1Accent}>הדור החדש</span>
                        </h1>
                    </div>
                    <div className={styles.heroActions}>
                        <Button
                            as={Link}
                            to="/edit"
                            variant="primary"
                            className={styles.heroCta}
                            onClick={() =>
                                trackSiteClick({
                                    action: SITE_ACTIONS.home_hero_primary_register,
                                    pagePath: "/",
                                })
                            }
                        >
                            צור כרטיס חינם
                        </Button>
                    </div>
                    <div className={styles.heroCards} aria-hidden="true">
                        {HERO_CARDS.map((card, i) => (
                            <img
                                key={i}
                                src={encodeURI(card.src)}
                                alt=""
                                className={styles.heroCardImg}
                                width={280}
                                height={560}
                                loading={i === 2 ? "eager" : "lazy"}
                                decoding="async"
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 1. MINI-SITE / BUSINESS PRESENCE ────────────── */}
            <section
                className={`${styles.sectionLight} ${motion.fadeUp} ${motion.slow}  ${r1.isRevealed ? motion.isVisible : ""}`}
                ref={r1.ref}
            >
                <div className={styles.sectionWrap}>
                    <h2 className={styles.h2Gold}>
                        יותר מכרטיס ביקור
                        <span> העמוד העסקי שלכם שמוכן לשיתוף</span>
                    </h2>
                    <p className={styles.presenceLead}>
                        כרטיס ביקור דיגיטלי של{" "}
                        <strong className={styles.presenceLeadBrand}>
                            Cardigo
                        </strong>{" "}
                        זה לא רק פרטי קשר. זהו עמוד עסקי קומפקטי עם גלריה,
                        וידאו, המלצות, שאלות נפוצות וטופס פנייה -{" "}
                        <em className={styles.presenceLeadPunch}>
                            הכל בקישור אחד שנראה מקצועי ונוח לשיתוף.
                        </em>
                    </p>
                    <div className={styles.presenceMedia}>
                        <div
                            className={`${styles.phoneStage} ${scroll.scrollZoomSoft} ${styles.strongerZoom}`}
                            aria-hidden="true"
                            ref={stageZoom.ref}
                        >
                            <img
                                className={styles.phoneImage}
                                src={encodeURI(
                                    `${SECTION_1_IMG}/יותר-מכרטיס-ביקור-טלפון עצמו.webp`,
                                )}
                                alt="כרטיס ביקור דיגיטלי בנייד"
                                width={340}
                                height={600}
                                loading="lazy"
                                decoding="async"
                            />
                            {PRESENCE_PROOF_CARDS.map((card) => (
                                <ProofCard key={card.posClass} {...card} />
                            ))}
                        </div>
                    </div>

                    <div className={styles.presenceFeatures}>
                        {PRESENCE_FEATURES.map((f, i) => (
                            <div key={i} className={styles.presenceChip}>
                                <f.Icon className={styles.presenceIcon} />
                                <span>{f.label}</span>
                            </div>
                        ))}
                    </div>

                    <p className={styles.presenceMore}>
                        ועוד הרבה פיצ'רים נוספים&hellip;
                    </p>

                    <div className={styles.highlight}>
                        {" "}
                        כרטיס ביקור דיגיטלי של{" "}
                        <span className={styles.goldUnderline}> כרדיגו</span> -
                        זה נוכחות עסקית מלאה שעובדת 24/7
                    </div>
                </div>
            </section>

            {/* ── 2. CONVERSION - FROM VIEW TO CONTACT ────────── */}
            <section
                className={`${styles.sectionDark} ${motion.fadeUp} ${motion.slow}  ${r2.isRevealed ? motion.isVisible : ""}`}
                ref={r2.ref}
                id="features"
            >
                <div className={styles.sectionWrap}>
                    <h2 className={styles.h2White}>
                        מכל צפייה לפנייה -{" "}
                        <span className={styles.goldHilight}>בקליק אחד</span>
                    </h2>
                    <p
                        className={`${styles.sectionLeadLight} ${styles.goldUnderline}`}
                    >
                        כל כפתור בכרטיס מקרב הזדמנות ליצירת קשר
                        <span
                            className={`${styles.sectionLeadLight} ${styles.boldTxt}`}
                        >
                            {" "}
                            אמיתית.
                        </span>{" "}
                    </p>

                    <div className={styles.conversionRow}>
                        {CONVERSION_ITEMS.map((item, i) => (
                            <div key={i} className={styles.conversionCard}>
                                <div className={styles.conversionMedia}>
                                    <img
                                        className={styles.conversionImg}
                                        src={item.src}
                                        alt={item.alt}
                                        width={400}
                                        height={400}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                                <div className={styles.conversionHeader}>
                                    <item.Icon
                                        className={styles.conversionIcon}
                                    />
                                    <h3 className={styles.conversionTitle}>
                                        {item.title}
                                    </h3>

                                    <p className={styles.conversionText}>
                                        {item.text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 3. ANALYTICS / KNOW WHAT WORKS ─────────────── */}
            <section
                className={`${styles.sectionLight} ${styles.analyticsSection} ${motion.fadeUp} ${motion.slow}  ${r3.isRevealed ? motion.isVisible : ""}`}
                ref={r3.ref}
            >
                <div className={styles.sectionWrap}>
                    <h2 className={styles.h2Gold}>תדעו מה באמת מביא תוצאות</h2>

                    <p className={styles.sectionLead}>
                        {" "}
                        <strong className={styles.analyticsLeadBrand}>
                            Cardigo -
                        </strong>{" "}
                        זה לא רק כרטיס ביקור דיגיטלי. <br /> כל צפייה, כל לחיצה,
                        כל מקור הגעה — הופך את הנתונים לתובנות שנותנות לכם{" "}
                        <em className={styles.analyticsLeadPunch}>
                            שליטה אמיתית על התוצאות.
                        </em>
                    </p>

                    {/* DOM-built analytics dashboard mockup */}
                    <div
                        className={`${styles.analyticsMock} ${scroll.scrollZoomSoft} ${styles.dashboardZoom}`}
                        ref={dashZoom.ref}
                    >
                        <div className={styles.analyticsMockHeader}>
                            <span className={styles.analyticsMockDot} />
                            <span className={styles.analyticsMockDot} />
                            <span className={styles.analyticsMockDot} />
                            <span className={`${styles.analyticsMockTitle} `}>
                                סטטיסטיקות הכרטיס שלי
                            </span>
                        </div>

                        <div className={styles.analyticsKpis}>
                            {ANALYTICS_METRICS.map((m, i) => (
                                <div key={i} className={styles.kpiCard}>
                                    <div className={styles.kpiValue}>
                                        {m.value}
                                    </div>
                                    <div className={styles.kpiLabel}>
                                        {m.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.analyticsSources}>
                            <div
                                className={`${styles.sourcesTitle} ${styles.goldUnderline}`}
                            >
                                מקורות הגעה
                            </div>
                            {ANALYTICS_SOURCES.map((s, i) => (
                                <div key={i} className={styles.sourceRow}>
                                    <span className={styles.sourceName}>
                                        {s.name}
                                    </span>
                                    <div className={styles.sourceBar}>
                                        <div
                                            className={styles.sourceBarFill}
                                            data-pct={s.pct}
                                        />
                                    </div>
                                    <span className={styles.sourcePct}>
                                        {s.pct}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        className={styles.analyticsInsights}
                        ref={insightScroll.ref}
                    >
                        {ANALYTICS_INSIGHTS.map((item, i) => (
                            <div key={i} className={styles.insightBullet}>
                                <div className={styles.insightMedia}>
                                    <img
                                        className={styles.insightImg}
                                        src={item.src}
                                        alt={item.alt}
                                        width={400}
                                        height={400}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                                <div className={styles.insightBody}>
                                    <item.Icon className={styles.insightIcon} />
                                    <div className={styles.insightTitle}>
                                        {item.title}
                                    </div>
                                    <div className={styles.insightText}>
                                        {item.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className={styles.analyticsCaveat}>
                        * ניתוח נתונים מלא זמין במסלול פרימיום. במסלול חינמי
                        ניתן לצפות בתצוגה לדוגמה.
                    </p>
                </div>
            </section>

            {/* ── 4. SHARE EVERYWHERE ─────────────────────────── */}
            <section
                className={`${styles.sectionDark} ${motion.fadeUp}  ${motion.slow} ${r4.isRevealed ? motion.isVisible : ""}`}
                ref={r4.ref}
            >
                <div className={styles.sectionWrap}>
                    <h2 className={styles.h2White}>
                        שתפו בכל מקום - ותדעו מאיפה הגיעו
                    </h2>
                    <p className={styles.sectionLeadLight}>
                        כל שיתוף הוא הזדמנות עסקית. כרדיגו עוזר לכם להפיץ את
                        הכרטיס ולעקוב אחרי התוצאות.
                    </p>

                    <div className={styles.shareRow}>
                        {SHARE_CHANNELS.map((ch, i) => (
                            <div key={i} className={styles.shareCard}>
                                <ch.Icon className={styles.shareIcon} />
                                <h3 className={styles.shareTitle}>
                                    {ch.title}
                                </h3>
                                <p className={styles.shareText}>{ch.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 5. EDITABILITY / CONTROL 24/7 ──────────────── */}
            <section
                className={`${styles.sectionLight} ${motion.fadeUp}  ${motion.slow} ${r5.isRevealed ? motion.isVisible : ""}`}
                ref={r5.ref}
            >
                <div className={styles.sectionWrap}>
                    <h2 className={styles.h2Gold}>תעדכנו בעצמכם - בכל רגע</h2>
                    <p className={styles.sectionLead}>
                        שנו טלפון, החליפו עיצוב, עדכנו תמונות - הכל דרך העורך
                        הפשוט שלנו, מכל מכשיר, בלי לחכות לאף אחד.
                    </p>

                    <div className={styles.controlGrid}>
                        {CONTROL_FEATURES.map((item, i) => (
                            <div key={i} className={styles.controlCard}>
                                <item.Icon className={styles.controlCardIcon} />
                                <h3 className={styles.controlCardTitle}>
                                    {item.title}
                                </h3>
                                <p className={styles.controlCardText}>
                                    {item.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 6. TEMPLATES / DESIGN ──────────────────────── */}
            <section
                className={`${styles.sectionDark} ${motion.fadeUp}  ${motion.slow} ${r6.isRevealed ? motion.isVisible : ""}`}
                ref={r6.ref}
                id="templates"
            >
                <div className={styles.sectionWrap}>
                    <h2 className={styles.h2White}>
                        25 תבניות מקצועיות - מוכנות לשימוש
                    </h2>
                    <p className={styles.sectionLeadLight}>
                        כל עיצוב בנוי RTL, מותאם למובייל, ומוכן לעברית. בחרו
                        סגנון שמתאים לעסק שלכם.
                    </p>

                    <div className={styles.templatesShowcase}>
                        {TEMPLATE_SKINS.map((skin, i) => (
                            <div key={i} className={styles.templateMock}>
                                <div
                                    className={styles.templateMockScreen}
                                    data-bg={skin.color}
                                    data-accent={skin.accent}
                                >
                                    <div className={styles.tmHeader} />
                                    <div className={styles.tmLine} />
                                    <div className={styles.tmLine} />
                                    <div className={styles.tmBtnRow}>
                                        <div className={styles.tmBtn} />
                                        <div className={styles.tmBtn} />
                                    </div>
                                    <div className={styles.tmGalleryRow}>
                                        <div className={styles.tmThumb} />
                                        <div className={styles.tmThumb} />
                                        <div className={styles.tmThumb} />
                                    </div>
                                </div>
                                <div className={styles.templateMockLabel}>
                                    {skin.name}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.center}>
                        <Button
                            as={Link}
                            to="/register"
                            variant="secondary"
                            onClick={() =>
                                trackSiteClick({
                                    action: SITE_ACTIONS.home_templates_cta,
                                    pagePath: "/",
                                })
                            }
                        >
                            בחרו תבנית והתחילו חינם
                        </Button>
                    </div>
                </div>
            </section>

            {/* ── 7. HOW IT WORKS (3 steps) ──────────────────── */}
            <section
                className={`${styles.sectionLight} ${motion.fadeUp}  ${motion.slow} ${r7.isRevealed ? motion.isVisible : ""}`}
                ref={r7.ref}
                id="how"
            >
                <div className={styles.sectionWrap}>
                    <h2 className={styles.h2Gold}>שלושה צעדים - וזה עובד</h2>

                    <div className={styles.steps}>
                        <div className={styles.step}>
                            <div className={styles.stepNum}>1</div>
                            <div className={styles.stepTitle}>בחרו עיצוב</div>
                            <div className={styles.stepText}>
                                נרשמים בחינם ובוחרים תבנית שמתאימה לעסק.
                            </div>
                        </div>
                        <div className={styles.step}>
                            <div className={styles.stepNum}>2</div>
                            <div className={styles.stepTitle}>מוסיפים תוכן</div>
                            <div className={styles.stepText}>
                                ממלאים פרטי קשר, תמונות, טקסט וקישורים.
                            </div>
                        </div>
                        <div className={styles.step}>
                            <div className={styles.stepNum}>3</div>
                            <div className={styles.stepTitle}>
                                משתפים ומודדים
                            </div>
                            <div className={styles.stepText}>
                                מפיצים בקישור, QR או וואטסאפ - ועוקבים אחרי
                                התוצאות.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 8. FAQ (expanded) ──────────────────────────── */}
            <section className={styles.sectionDark} id="faq">
                <div className={styles.sectionWrap}>
                    <h2 className={styles.h2White}>שאלות נפוצות</h2>

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
                                כן. אתם יכולים לשנות כל פרט בכרטיס בכל רגע -
                                טלפון, תמונות, עיצוב, טקסטים - והעדכון מופיע מיד
                                בקישור הקיים.
                            </div>
                        </details>

                        <details className={styles.qa}>
                            <summary>הכרטיס מתאים למובייל?</summary>
                            <div className={styles.answer}>
                                כן. כל העיצובים בנויים mobile-first עם תמיכה
                                מלאה בעברית ו-RTL.
                            </div>
                        </details>

                        <details className={styles.qa}>
                            <summary>יש תכנית חינמית?</summary>
                            <div className={styles.answer}>
                                כן. אפשר ליצור כרטיס בחינם ולשדרג למסלול פרימיום
                                כשצריך יכולות נוספות כמו אנליטיקס, טופס לידים,
                                סרטון והמלצות.
                            </div>
                        </details>

                        <details className={styles.qa}>
                            <summary>אפשר להחליף תבנית בלי לאבד תוכן?</summary>
                            <div className={styles.answer}>
                                כן. כל התוכן שלכם נשמר - רק העיצוב משתנה. תוכלו
                                להתנסות בכמה תבניות עד שתמצאו את המתאימה.
                            </div>
                        </details>

                        <details className={styles.qa}>
                            <summary>
                                איך אני יודע מאיפה מגיעים הלקוחות?
                            </summary>
                            <div className={styles.answer}>
                                במסלול הפרימיום תקבלו נתוני אנליטיקס אמיתיים:
                                מקורות הגעה (אינסטגרם, גוגל, וואטסאפ ועוד), כמות
                                צפיות ולחיצות, ושיעורי המרה לפי פלטפורמה
                                וקמפיין. במסלול חינמי תוכלו לצפות בתצוגה לדוגמה.
                            </div>
                        </details>

                        <details className={styles.qa}>
                            <summary>הכרטיס מופיע בתוצאות חיפוש בגוגל?</summary>
                            <div className={styles.answer}>
                                כן. הכרטיס הוא עמוד אינטרנט אמיתי עם כתובת
                                ייחודית, תגיות SEO, ו-JSON-LD - ונכלל באופן
                                אוטומטי ב-sitemap.
                            </div>
                        </details>

                        <details className={styles.qa}>
                            <summary>איך משתפים את הכרטיס?</summary>
                            <div className={styles.answer}>
                                בכמה דרכים: קישור ישיר, קוד QR להורדה, שיתוף
                                בוואטסאפ, וקישורים עם UTM למדידת קמפיינים
                                ספציפיים.
                            </div>
                        </details>

                        <details className={styles.qa}>
                            <summary>
                                מה ההבדל בין כרטיס דיגיטלי לאתר אינטרנט?
                            </summary>
                            <div className={styles.answer}>
                                כרטיס דיגיטלי של כרדיגו הוא למעשה עמוד תדמית
                                ממוקד - מיני סייט - שמוכן תוך דקות, קל לעדכון,
                                ובנוי לשיתוף ולמדידה. הוא לא מחליף אתר מלא אבל
                                נותן נוכחות מקצועית באינטרנט בלי צורך במפתחים.
                            </div>
                        </details>
                    </div>
                </div>
            </section>

            {/* ── 9. FINAL CTA ───────────────────────────────── */}
            <section
                className={`${styles.ctaSection} ${motion.fadeUp}  ${motion.slow} ${r9.isRevealed ? motion.isVisible : ""}`}
                ref={r9.ref}
            >
                <div className={styles.sectionWrap}>
                    <div className={styles.ctaInner}>
                        <h2 className={styles.ctaTitle}>
                            הנוכחות הדיגיטלית שלכם מתחילה כאן
                        </h2>
                        <p className={styles.ctaText}>
                            כרטיס מקצועי, שיתוף חכם, ותובנות עסקיות - בחינם
                            להתחלה.
                        </p>
                        <Button
                            as={Link}
                            to="/register"
                            variant="primary"
                            className={styles.ctaBtn}
                            onClick={() =>
                                trackSiteClick({
                                    action: SITE_ACTIONS.home_bottom_cta,
                                    pagePath: "/",
                                })
                            }
                        >
                            צור כרטיס חינם
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}
