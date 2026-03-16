import { useEffect } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import SeoHelmet from "../components/seo/SeoHelmet";
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

const SECTION_4_IMG = "/images/home-page/main-sections/Section-4";

const SHARE_CHANNELS = [
    {
        Icon: LinkIcon,
        title: "קישור ישיר",
        text: "הכרטיס שלכם מוכן לשיתוף בכל מקום — מאימייל וחתימה דיגיטלית ועד ביו ברשתות וקישורים באתר.",
        src: `${SECTION_4_IMG}/digital_business_card-direct-link-online-sharing.webp`,
        alt: "שיתוף כרטיס ביקור דיגיטלי בקישור ישיר",
    },
    {
        Icon: QrCodeIcon,
        title: "QR Code",
        text: "הפכו כל שילוט, אריזה, פלייר או דלפק לנקודת מעבר ישירה אל הכרטיס הדיגיטלי שלכם.",
        src: `${SECTION_4_IMG}/digital_business_card-qr-code-scan-from-coffee-cup.webp`,
        alt: "סריקת QR לכרטיס ביקור דיגיטלי",
    },
    {
        Icon: ChatIcon,
        title: "WhatsApp",
        text: "שלחו את הכרטיס בוואטסאפ כלינק מסודר עם תצוגה מקדימה, כך שקל לשתף אותו גם בשיחה אישית וגם כהמלצה הלאה.",
        src: `${SECTION_4_IMG}/digital_business_card-whatsapp-business-card-sharing.webp`,
        alt: "שיתוף כרטיס ביקור דיגיטלי בוואטסאפ",
    },
    {
        Icon: SeoIcon,
        title: "קישורי קמפיין",
        text: "צרו קישורים ייעודיים לכל קמפיין, מודעה או פלטפורמה — כדי להפיץ נכון יותר ולזהות אילו ערוצים מביאים תנועה טובה יותר.",
        src: `${SECTION_4_IMG}/digital_business_card-marketing-campaign-tracking-links.webp`,
        alt: "קישורי קמפיין לכרטיס ביקור דיגיטלי",
    },
];

const PRESENCE_FEATURES = [
    { Icon: GalleryIcon, label: "גלריית עבודות" },
    { Icon: VideoIcon, label: "סרטון YouTube" },
    { Icon: StarIcon, label: "המלצות לקוחות" },
    { Icon: QuestionIcon, label: "שאלות נפוצות" },
    { Icon: ContentIcon, label: "טופס פניות" },
    { Icon: AnalyticsIcon, label: "אנליטיקה" },
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

const SECTION_5_IMG = "/images/home-page/main-sections/Section-5";

const CONTROL_FEATURES = [
    {
        Icon: SelfDesignIcon,
        title: "החלפת עיצוב מיידית",
        text: "בחרו מ-25 תבניות מקצועיות והחליפו בלחיצה - התוכן נשמר.",
        src: `${SECTION_5_IMG}/cardigo-digital-business-card-design-templates.webp`,
        alt: "החלפת עיצוב כרטיס ביקור דיגיטלי",
    },
    {
        Icon: PencilIcon,
        title: "עריכת תוכן חופשית",
        text: "טקסטים, תמונות, קישורים, שאלות נפוצות - הכל מתעדכן מיד.",
        src: `${SECTION_5_IMG}/cardigo-digital-business-card-content-editor.webp`,
        alt: "עריכת תוכן בכרטיס ביקור דיגיטלי",
    },
    {
        Icon: MobileIcon,
        title: "מכל מכשיר",
        text: "ניתן לערוך גם מהנייד. עדכון מהיר מכל מכשיר.",
        src: `${SECTION_5_IMG}/cardigo-edit-digital-business-card-from-any-device.webp`,
        alt: "עריכת כרטיס ביקור דיגיטלי מכל מכשיר",
    },
    {
        Icon: LockIcon,
        title: "פרסום בשליטתכם",
        text: "פרסמו והסתירו את הכרטיס בכל רגע - אתם מחליטים מתי.",
        src: `${SECTION_5_IMG}/cardigo-publish-digital-business-card-control.webp`,
        alt: "שליטה בפרסום כרטיס ביקור דיגיטלי",
    },
];

const TEMPLATE_COVERS = "/templates/previews/preview-covers";
const TEMPLATE_SKINS = [
    { name: "Lakmi", src: `${TEMPLATE_COVERS}/lakmi.webp` },
    { name: "Tehom Turkiz", src: `${TEMPLATE_COVERS}/tehom-turkiz.webp` },
    { name: "Laguna Afarsek", src: `${TEMPLATE_COVERS}/laguna-afarsek.webp` },
    { name: "Iris Layla", src: `${TEMPLATE_COVERS}/iris-layla.webp` },
    { name: "Bronze Sachlav", src: `${TEMPLATE_COVERS}/bronze-sachlav.webp` },
    { name: "Zahav Laguna", src: `${TEMPLATE_COVERS}/zahav-laguna.webp` },
];

const STEPS_IMG = "/images/home-page/main-sections/Section-6";
const STEPS = [
    {
        num: "1",
        title: "בחרו עיצוב",
        text: "נרשמים בחינם ובוחרים תבנית שמתאימה לעסק.",
        src: `${STEPS_IMG}/cardigo-digital-business-card-template-selection.png.webp`,
        alt: "בחירת תבנית לכרטיס ביקור דיגיטלי",
    },
    {
        num: "2",
        title: "תוסיפו תוכן",
        text: "ממלאים פרטי קשר, תמונות, טקסט וקישורים.",
        src: `${STEPS_IMG}/cardigo-digital-business-card-content-editing.webp`,
        alt: "עריכת תוכן בכרטיס ביקור דיגיטלי",
    },
    {
        num: "3",
        title: "משתפים ומודדים",
        text: "מפיצים בקישור, QR או וואטסאפ \u2013 ועוקבים אחרי התוצאות.",
        src: `${STEPS_IMG}/cardigo-digital-business-card-sharing-and-analytics.png.webp`,
        alt: "שיתוף כרטיס ביקור דיגיטלי ומעקב אנליטיקס",
    },
];

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";

const HOME_FAQ = [
    {
        q: "כמה זמן לוקח ליצור כרטיס ביקור דיגיטלי?",
        a: "בדרך כלל כמה דקות. בוחרים תבנית, מוסיפים פרטים ומתחילים לשתף את כרטיס הביקור הדיגיטלי שלכם.",
    },
    {
        q: "צריך ידע טכני כדי לנהל את כרטיס הביקור הדיגיטלי?",
        a: "לא. העורך של Cardigo בנוי כך שתוכלו לעדכן טקסטים, תמונות, קישורים ופרטי קשר בעצמכם \u2014 בלי מפתח ובלי ידע טכני.",
    },
    {
        q: "אפשר לעדכן פרטים אחרי שפרסמתי?",
        a: "כן. אתם יכולים לשנות כל פרט בכרטיס הביקור הדיגיטלי בכל רגע \u2014 טלפון, תמונות, עיצוב וטקסטים \u2014 והעדכון מופיע בקישור הקיים.",
    },
    {
        q: "יש תכנית חינמית?",
        a: "כן. אפשר ליצור כרטיס ביקור דיגיטלי בחינם ולהתחיל להשתמש בו מיד. כשתצטרכו יכולות מתקדמות יותר, אפשר לשדרג למסלול פרימיום.",
    },
    {
        q: "אפשר להחליף תבנית בלי לאבד תוכן?",
        a: "כן. כל התוכן שלכם נשמר, ורק העיצוב משתנה. כך אפשר לנסות כמה סגנונות עד שמוצאים את התבנית שמתאימה לעסק.",
    },
    {
        q: "איך רואים מאיפה מגיעות הצפיות והפניות?",
        a: "במסלול הפרימיום תוכלו לראות מאילו מקורות מגיעה התנועה, על מה לוחצים, ואילו קישורים או פלטפורמות מביאים יותר תגובות. במסלול החינמי מוצגת תצוגה לדוגמה.",
    },
    {
        q: "האם כרטיס הביקור הדיגיטלי יכול להופיע בגוגל?",
        a: "כן, הכרטיס הוא עמוד אינטרנט עם כתובת ייחודית, כך שהוא יכול להופיע בתוצאות חיפוש. אנחנו דואגים למבנה נכון שעוזר לגוגל להבין את העמוד, אבל כמו בכל אתר \u2014 ההופעה בתוצאות תלויה גם בגוגל עצמו.",
    },
    {
        q: "איך משתפים את כרטיס הביקור הדיגיטלי?",
        a: "אפשר לשתף את הכרטיס בקישור ישיר, ב-QR, בוואטסאפ, ובקישורים ייעודיים לקמפיינים \u2014 כך שקל להפיץ אותו בכל מקום שבו הלקוחות כבר פוגשים אתכם.",
    },
    {
        q: "מה ההבדל בין כרטיס ביקור דיגיטלי לאתר אינטרנט?",
        a: "כרטיס ביקור דיגיטלי של Cardigo הוא עמוד עסקי ממוקד שמוכן תוך דקות, קל לעדכון, ונוח מאוד לשיתוף. הוא לא מחליף אתר מלא, אבל כן נותן לעסק נוכחות מקצועית ומהירה באינטרנט.",
    },
    {
        q: "אפשר להוסיף תמונות, סרטון והמלצות לכרטיס?",
        a: "כן. בכרטיס הביקור הדיגיטלי של Cardigo אפשר להציג תמונות, סרטון, המלצות ותוכן נוסף שיעזור לעסק להיראות מקצועי ואמין יותר.",
    },
    {
        q: "אפשר לקבל פניות ישירות מתוך הכרטיס?",
        a: "כן. אפשר להוסיף לכרטיס הדיגיטלי דרכי יצירת קשר כמו טלפון, וואטסאפ, קישורים וטופס פנייה \u2014 כדי שללקוחות יהיה קל לפנות אליכם.",
    },
    {
        q: "יש לכל כרטיס קישור אישי משלו?",
        a: "כן. לכל כרטיס ביקור דיגיטלי יש קישור ייחודי שאפשר לשלוח, לשתף, להוסיף לביו, לחתימה במייל או לכל מקום אחר שבו העסק שלכם מופיע.",
    },
    {
        q: "אפשר להשתמש ב-QR כדי להפנות לכרטיס?",
        a: "כן. אפשר להוריד קוד QR ולהשתמש בו על כרטיסים מודפסים, שלטים, אריזות, דלפקים ואירועים \u2014 כדי להעביר אנשים ישר לכרטיס הדיגיטלי.",
    },
    {
        q: "אפשר לנהל את הכרטיס גם מהטלפון?",
        a: "כן. אפשר לערוך ולעדכן את כרטיס הביקור הדיגיטלי גם מהטלפון, כך שקל לבצע שינויים מהירים גם כשאתם לא מול מחשב.",
    },
    {
        q: "כרטיס ביקור דיגיטלי מתאים גם לעסק קטן או לעצמאי?",
        a: "בהחלט. Cardigo מתאים לעצמאים, לעסקים קטנים ולנותני שירות שרוצים עמוד עסקי מקצועי, נוח לשיתוף וקל לניהול \u2014 בלי להסתבך עם אתר מלא.",
    },
];

function buildHomeFaqJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${ORIGIN}/#faq`,
        url: `${ORIGIN}/`,
        inLanguage: "he",
        mainEntity: HOME_FAQ.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
            },
        })),
    };
}

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
    const editorZoom = useScrollProgress();
    const insightScroll = useScrollProgress();
    const controlScroll = useScrollProgress();
    const shareScroll = useScrollProgress();
    const stepsScroll = useScrollProgress();

    const homeFaqJsonLd = buildHomeFaqJsonLd();

    return (
        <main className={styles.page} data-page="site">
            <SeoHelmet
                title="כרטיס ביקור דיגיטלי לעסקים | Cardigo"
                description="כרטיס ביקור דיגיטלי של Cardigo מאפשר ליצור עמוד עסקי מקצועי, לשתף ב-QR, בוואטסאפ ובקישורים ייעודיים, ולעדכן הכול בקלות — עם תבניות, אנליטיקה וכלי שיתוף לעסק שלכם."
                canonicalUrl={`${ORIGIN}/`}
                url={`${ORIGIN}/`}
                jsonLdItems={[homeFaqJsonLd]}
            />
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
                            <span
                                className={`${styles.h1Accent} ${styles.goldUnderline}`}
                            >
                                הדור החדש
                            </span>
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
                        <span className={styles.presenceLeadBrand}>
                            {" "}
                            כרדיגו
                        </span>{" "}
                        - זה נוכחות עסקית מלאה שעובדת 24/7
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
                        <span
                            className={`${styles.goldHilight} ${styles.goldUnderline}`}
                        >
                            בקליק אחד
                        </span>
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
                        זאת{" "}
                        <em className={styles.analyticsLeadPunch}>
                            פלטפורמה חכמה עם אנליטיקה{" "}
                        </em>
                        ומעקב.
                    </p>
                    {/* Analytics dashboard image */}
                    <img
                        className={`${styles.analyticsDashImg} ${scroll.scrollZoomSoft} ${styles.dashboardZoom}`}
                        ref={dashZoom.ref}
                        src={`${SECTION_3_IMG}/digital_business_card-analytics-dashboard-cardigo-platform.jpg`}
                        alt="דשבורד אנליטיקה לכרטיס ביקור דיגיטלי - Cardigo"
                        width={800}
                        height={600}
                        loading="lazy"
                    />
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

                    <p className={styles.highlight}>
                        כל צפייה, כל לחיצה, כל מקור הגעה — הופך את הנתונים
                        לתובנות שנותנות לכם{" "}
                        <em className={styles.analyticsLeadPunch}>
                            שליטה אמיתית על התוצאות.
                        </em>
                    </p>
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
                        {" "}
                        שתפו בכל מקום{" "}
                        <span
                            className={`${styles.h2Gold} ${styles.goldUnderline} ${styles.strongerUnderline}`}
                        >
                            בקלות
                        </span>
                    </h2>
                    <ul className={styles.shareChecklist}>
                        <li className={styles.shareCheckItem}>
                            <div className={styles.shareCheckText}>
                                <span className={styles.shareCheckBold}>
                                    משתלב בכל ערוץ
                                </span>
                                <span className={styles.shareCheckDesc}>
                                    אימייל, וואטסאפ, QR וקישורי קמפיין
                                </span>
                            </div>
                        </li>
                        <li className={styles.shareCheckItem}>
                            <div className={styles.shareCheckText}>
                                <span className={styles.shareCheckBold}>
                                    לא נשאר רק בקישור
                                </span>
                                <span className={styles.shareCheckDesc}>
                                    הכרטיס חי בכל מקום שבו העסק שלכם כבר נמצא
                                </span>
                            </div>
                        </li>
                        <li className={styles.shareCheckItem}>
                            <div className={styles.shareCheckText}>
                                <span className={styles.shareCheckBold}>
                                    הפצה חכמה יותר
                                </span>
                                <span className={styles.shareCheckDesc}>
                                    כל שיתוף הוא הזדמנות להגיע ללקוחות חדשים
                                </span>
                            </div>
                        </li>
                    </ul>

                    <div className={styles.shareRow} ref={shareScroll.ref}>
                        {SHARE_CHANNELS.map((ch, i) => (
                            <div key={i} className={styles.shareCard}>
                                <div className={styles.shareMedia}>
                                    <img
                                        className={styles.shareImg}
                                        src={ch.src}
                                        alt={ch.alt}
                                        width={400}
                                        height={400}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                                <div className={styles.shareBody}>
                                    <ch.Icon className={styles.shareIcon} />
                                    <h3 className={styles.shareTitle}>
                                        {ch.title}
                                    </h3>
                                    <p className={styles.shareText}>
                                        {ch.text}
                                    </p>
                                </div>
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
                    <h2 className={styles.h2Gold}>תעדכנו בעצמכם - 24/7</h2>

                    <ul className={styles.editChecklist}>
                        <li className={styles.editCheckItem}>
                            <div className={styles.editCheckText}>
                                <span className={styles.editCheckBold}>
                                    עדכון תוכן מיידי
                                </span>
                                <span className={styles.editCheckDesc}>
                                    שנו טלפון, תמונות, טקסטים וקישורים — הכל
                                    מתעדכן ברגע
                                </span>
                            </div>
                        </li>
                        <li className={styles.editCheckItem}>
                            <div className={styles.editCheckText}>
                                <span className={styles.editCheckBold}>
                                    החלפת עיצוב בלחיצה
                                </span>
                                <span className={styles.editCheckDesc}>
                                    בחרו תבנית חדשה בכל רגע — התוכן נשמר
                                </span>
                            </div>
                        </li>
                        <li className={styles.editCheckItem}>
                            <div className={styles.editCheckText}>
                                <span className={styles.editCheckBold}>
                                    מכל מכשיר, בלי לחכות
                                </span>
                                <span className={styles.editCheckDesc}>
                                    האזור האישי עובד גם מהנייד — בלי צורך במפתח
                                </span>
                            </div>
                        </li>
                    </ul>
                    <br />
                    {/* Editor dashboard image */}
                    <img
                        className={`${styles.editorDashImg} ${scroll.scrollZoomSoft} ${styles.dashboardZoom}`}
                        ref={editorZoom.ref}
                        src="/images/home-page/main-sections/Section-5/cardigo-digital-business-card-editor-dashboard.jpg"
                        alt="עורך כרטיס ביקור דיגיטלי - Cardigo"
                        width={800}
                        height={600}
                        loading="lazy"
                        decoding="async"
                    />

                    {/* image-top control cards */}
                    <div
                        className={styles.controlItems}
                        ref={controlScroll.ref}
                    >
                        {CONTROL_FEATURES.map((item, i) => (
                            <div key={i} className={styles.controlItem}>
                                <div className={styles.controlMedia}>
                                    <img
                                        className={styles.controlImg}
                                        src={item.src}
                                        alt={item.alt}
                                        width={400}
                                        height={400}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                                <div className={styles.controlBody}>
                                    <item.Icon
                                        className={styles.controlItemIcon}
                                    />
                                    <div className={styles.controlItemTitle}>
                                        {item.title}
                                    </div>
                                    <div className={styles.controlItemDesc}>
                                        {item.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className={styles.highlight}>
                        שנו מספר טלפון, החליפו עיצוב, עדכנו תמונות - הכל דרך
                        האזור האישי , מכל מכשיר, בלי לחכות לאף אחד.
                    </p>
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
                        בחרו עיצוב שמתאים{" "}
                        <span
                            className={`${styles.h2Gold} ${styles.goldUnderline}`}
                        >
                            לעסק שלכם
                        </span>
                    </h2>
                    <p className={styles.sectionLeadLight}>
                        יש לכם מבחר תבניות מוכנות, שנראות טוב מההתחלה ועובדות
                        מצוין גם בטלפון. פשוט בוחרים סגנון שמרגיש נכון לעסק
                        שלכם.
                    </p>

                    <div className={styles.templatesShowcase}>
                        {TEMPLATE_SKINS.map((skin, i) => (
                            <div key={i} className={styles.templateCard}>
                                <img
                                    className={styles.templateCardImg}
                                    src={skin.src}
                                    alt={`תבנית ${skin.name}`}
                                    loading="lazy"
                                    width="300"
                                    height="520"
                                />
                                <div className={styles.templateCardName}>
                                    {skin.name}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.center}>
                        <Button
                            as={Link}
                            to="edit/card/templates"
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

                    <div className={styles.steps} ref={stepsScroll.ref}>
                        {STEPS.map((s) => (
                            <div
                                key={s.num}
                                className={`${styles.step} ${s.num === "3" ? styles.stepWide : ""}`}
                            >
                                <div className={styles.stepMedia}>
                                    <img
                                        className={styles.stepImg}
                                        src={s.src}
                                        alt={s.alt}
                                        loading="lazy"
                                        width="600"
                                        height="400"
                                    />
                                </div>
                                <div className={styles.stepBody}>
                                    <div className={styles.stepNum}>
                                        {s.num}
                                    </div>
                                    <div className={styles.stepTitle}>
                                        {s.title}
                                    </div>
                                    <div className={styles.stepText}>
                                        {s.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 8. FINAL CTA ───────────────────────────────── */}
            <section
                className={`${styles.ctaSection} ${motion.fadeUp}  ${motion.slow} ${r9.isRevealed ? motion.isVisible : ""}`}
                ref={r9.ref}
            >
                <div className={styles.sectionWrap}>
                    <div className={styles.ctaInner}>
                        <h2 className={styles.ctaTitle}>
                            {" "}
                            צור כרטיס ביקור דיגיטלי{" "}
                            <span
                                className={`${styles.goldHilight} ${styles.goldUnderline}`}
                            >
                                שמביא יותר לקוחות!{" "}
                            </span>
                        </h2>
                        <p className={styles.ctaText}>
                            יוצרים, משתפים ומעדכנים בקלות — עם{" "}
                            <span
                                className={`${styles.goldHilight} ${styles.goldUnderline} ${styles.boldTxt}`}
                            >
                                Cardigo
                            </span>
                            .
                        </p>
                        <img
                            className={styles.ctaImg}
                            src="/images/home-page/main-sections/Section-8/cardigo-digital-business-card-israel-brand-illustration.webp"
                            alt="כרטיס ביקור דיגיטלי לעסקים - Cardigo"
                            width={800}
                            height={450}
                            loading="lazy"
                            decoding="async"
                        />
                        <Button
                            as={Link}
                            to="/edit/card/templates"
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

            {/* ── 9. FAQ (expanded) ──────────────────────────── */}
            <section className={styles.sectionDark} id="faq">
                <div className={styles.sectionWrap}>
                    <h2 className={styles.h2Gold}>שאלות נפוצות</h2>

                    <div className={styles.faq}>
                        {HOME_FAQ.map((item, i) => (
                            <details key={i} className={styles.qa}>
                                <summary>{item.q}</summary>
                                <div className={styles.answer}>{item.a}</div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
