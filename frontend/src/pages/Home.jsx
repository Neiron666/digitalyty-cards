import { useEffect } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import SeoHelmet from "../components/seo/SeoHelmet";
import { DEFAULT_OG_IMAGE_PATH } from "../utils/seoConstants.js";
import { buildCardigoOrganizationJsonLd } from "../seo/brandConstants.js";
import {
    trackSiteClick,
    trackSitePageView,
} from "../services/siteAnalytics.client";
import { SITE_ACTIONS } from "../services/siteAnalytics.actions";
import scroll from "../styles/motion-scroll.module.css";
import useScrollProgress from "../hooks/useScrollProgress";
import pub from "../styles/public-sections.module.css";
import CrownIcon from "../components/icons/CrownIcon";
import styles from "./Home.module.css";
import whatsappStyles from "../components/marketing/WhatsAppCtaSkin.module.css";
import { buildSupportWhatsAppHref } from "../utils/supportContact";
import {
    GalleryIcon,
    ContentIcon,
    SeoIcon,
    AnalyticsIcon,
    SelfDesignIcon,
    BookingIcon,
    WorkHoursIcon,
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
        title: "מקורות תנועה לכרטיס הדיגיטלי",
        text: "גלו מאיפה מגיעים מבקרים לכרטיס הביקור הדיגיטלי שלכם - גוגל, וואטסאפ, רשתות חברתיות או קמפיינים.",
        src: `${SECTION_3_IMG}/digital_business_card-marketing-distribution-channels.webp`,
        alt: "מקורות תנועה לכרטיס ביקור דיגיטלי לעסק",
    },
    {
        Icon: AnalyticsIcon,
        title: "ביצועי קמפיינים ושיווק",
        text: "השוו בין קמפיינים, קישורים וערוצי פרסום כדי להבין איפה הכרטיס מביא יותר צפיות ופניות.",
        src: `${SECTION_3_IMG}/digital_business_card-marketing-campaign-performance.webp`,
        alt: "מדידת ביצועי קמפיינים בכרטיס ביקור דיגיטלי",
    },
    {
        Icon: ClickIcon,
        title: "לחיצות ופעולות של לקוחות",
        text: "ראו אילו פעולות הלקוחות עושים בכרטיס - לחיצה לוואטסאפ, שיחה, ניווט, קישור או פנייה ישירה.",
        src: `${SECTION_3_IMG}/digital_business_card-customer-click-behavior.webp`,
        alt: "מעקב לחיצות ופעולות לקוחות בכרטיס ביקור דיגיטלי",
    },
    {
        Icon: LinkIcon,
        title: "ערוצי הפצה שעובדים באמת",
        text: "מדדו איזה ערוץ מביא תוצאות טובות יותר - QR, קישור ישיר, וואטסאפ, אימייל או פרסום ממומן.",
        src: `${SECTION_3_IMG}/digital_business_card-campaign-performance-robot.webp`,
        alt: "ערוצי הפצה ושיתוף של כרטיס ביקור דיגיטלי",
    },
];
const SECTION_4_IMG = "/images/home-page/main-sections/Section-4";

const SHARE_CHANNELS = [
    {
        Icon: LinkIcon,
        title: "קישור ישיר",
        text: "הכרטיס שלכם מוכן לשיתוף בכל מקום - מאימייל וחתימה דיגיטלית ועד ביו ברשתות וקישורים באתר.",
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
        text: "צרו קישורים ייעודיים לכל קמפיין, מודעה או פלטפורמה - כדי להפיץ נכון יותר ולזהות אילו ערוצים מביאים תנועה טובה יותר.",
        src: `${SECTION_4_IMG}/digital_business_card-marketing-campaign-tracking-links.webp`,
        alt: "קישורי קמפיין לכרטיס ביקור דיגיטלי",
    },
];

const PRESENCE_FEATURES = [
    { Icon: BookingIcon, label: "קביעת פגישות" },
    { Icon: GalleryIcon, label: "גלריית עבודות" },
    { Icon: WorkHoursIcon, label: "שעות פעילות" },
    { Icon: VideoIcon, label: "סרטון YouTube" },
    { Icon: StarIcon, label: "המלצות לקוחות" },
    { Icon: QuestionIcon, label: "שאלות נפוצות" },
    { Icon: ContentIcon, label: "טופס פניות" },
    { Icon: AnalyticsIcon, label: "אנליטיקה" },
    { Icon: SeoIcon, label: "יכול להופיע בגוגל" },
];

const SECTION_1_IMG = "/images/home-page/main-sections/Section-1";
const phoneSrc = encodeURI(
    `${SECTION_1_IMG}/יותר-מכרטיס-ביקור-טלפון עצמו.webp`,
);
const phoneSmallSrc = encodeURI(
    `${SECTION_1_IMG}/יותר-מכרטיס-ביקור-טלפון עצמו-sm.webp`,
);

const PRESENCE_PROOF_CARDS = [
    {
        title: "המלצות",
        src: `${SECTION_1_IMG}/review-cardigo-digital-bussines-card.webp`,
        alt: "המלצות לקוחות בכרטיס ביקור דיגיטלי",
        posClass: "proofTopStart",
    },
    {
        title: "קביעת פגישות",
        src: `${SECTION_1_IMG}/booking-cardigo-digital-bussines-card.webp`,
        alt: "קביעת פגישות בכרטיס ביקור דיגיטלי",
        posClass: "proofCenter",
    },
    {
        title: "כפתורי פעולה",
        src: `${SECTION_1_IMG}/social-buttons-cardigo-digital-bussines-card.webp`,
        alt: "כפתורי שיתוף ופעולה בכרטיס ביקור דיגיטלי",
        posClass: "proofBottomStart",
    },

    {
        title: "טופס לידים",
        src: `${SECTION_1_IMG}/lead-cardigo-digital-bussines-card.webp`,
        alt: "טופס יצירת קשר בכרטיס ביקור דיגיטלי",
        posClass: "proofTopEnd",
    },
    {
        title: "גלרית תמונות",
        src: `${SECTION_1_IMG}/gallery-cardigo-digital-bussines-card.webp`,
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

const TEMPLATE_COVERS = "/images/home-page/main-sections/Section-6";

const TEMPLATE_SKINS = [
    {
        name: "Lakmi",
        src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף  כרדיגו.webp`,
        alt: "תבנית כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף",
    },
    {
        name: "Laguna Afarsek",
        src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי ליועצת חדשנות דיגיטלית ו-AI  כרדיגו.webp`,
        alt: "עיצוב כרטיס ביקור דיגיטלי ליועצת חדשנות דיגיטלית ו-AI",
    },
    {
        name: "Iris Layla",
        src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי למפיקת אירועי בוטיק  כרדיגו.webp`,
        alt: "דוגמה לתבנית כרטיס ביקור דיגיטלי למפיקת אירועי בוטיק",
    },
    {
        name: "Tehom Turkiz",
        src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי ליועץ הון פרטי  כרדיגו.webp`,
        alt: "תבנית כרטיס ביקור דיגיטלי ליועץ הון פרטי",
    },
    {
        name: "Bronze Sachlav",
        src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית  כרדיגו.webp`,
        alt: "עיצוב כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית",
    },
    {
        name: "Zahav Laguna",
        src: `${TEMPLATE_COVERS}/כרטיס ביקור דיגיטלי קליניקה לאסטטיקה  כרדיגו.webp`,
        alt: "תבנית כרטיס ביקור דיגיטלי לקליניקה לאסתטיקה",
    },
];

const STEPS_IMG = "/images/home-page/main-sections/Section-7";

const STEPS = [
    {
        num: "1",
        title: "בוחרים תבנית לכרטיס ביקור דיגיטלי",
        text: "נרשמים בחינם ובוחרים עיצוב מוכן שמתאים לעסק שלכם ולתחום הפעילות.",
        src: `${STEPS_IMG}/cardigo-digital-business-card-template-selection.png.webp`,
        alt: "בחירת תבנית לכרטיס ביקור דיגיטלי לעסק ב-Cardigo",
    },
    {
        num: "2",
        title: "מוסיפים את פרטי העסק",
        text: "ממלאים טלפון, וואטסאפ, תמונות, טקסטים, שירותים וקישורים במקום אחד.",
        src: `${STEPS_IMG}/cardigo-digital-business-card-content-editing.webp`,
        alt: "עריכת פרטי עסק ותוכן בכרטיס ביקור דיגיטלי",
    },
    {
        num: "3",
        title: "משתפים קישור ועוקבים אחרי התוצאות",
        text: "משתפים את הכרטיס בקישור, QR או וואטסאפ ועוקבים אחרי צפיות ופניות.",
        src: `${STEPS_IMG}/cardigo-digital-business-card-sharing-and-analytics.png.webp`,
        alt: "שיתוף כרטיס ביקור דיגיטלי בקישור QR ווואטסאפ עם מעקב אנליטיקה",
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

function buildHomeWebSiteJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${ORIGIN}/#website`,
        name: "Cardigo",
        url: `${ORIGIN}/`,
        inLanguage: "he",
    };
}

const HERO_CARDS = [
    {
        src: "/images/home-page/hero/\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D9\u05EA \u05D7\u05D5\u05E5 \u05D5\u05E0\u05D5\u05E3  \u05DB\u05E8\u05D3\u05D9\u05D2\u05D5.webp",
        smallSrc:
            "/images/home-page/hero/כרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף כרדיגו-sm.webp",
        alt: "דוגמה לכרטיס ביקור דיגיטלי לאדריכלית חוץ ונוף",
    },
    {
        src: "/images/home-page/hero/\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05D9\u05D5\u05E2\u05E6\u05EA \u05D7\u05D3\u05E9\u05E0\u05D5\u05EA \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA \u05D5-AI  \u05DB\u05E8\u05D3\u05D9\u05D2\u05D5.webp",
        smallSrc:
            "/images/home-page/hero/כרטיס ביקור דיגיטלי ליועצת חדשנות דיגיטלית ו-AI כרדיגו-sm.webp",
        alt: "דוגמה לכרטיס ביקור דיגיטלי ליועצת חדשנות דיגיטלית ו-AI",
    },
    {
        src: "/images/home-page/hero/\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05DE\u05E4\u05D9\u05E7\u05EA \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9 \u05D1\u05D5\u05D8\u05D9\u05E7  \u05DB\u05E8\u05D3\u05D9\u05D2\u05D5.webp",
        smallSrc:
            "/images/home-page/hero/כרטיס ביקור דיגיטלי למפיקת אירועי בוטיק כרדיגו-sm.webp",
        alt: "כרטיס ביקור דיגיטלי לעסק - דוגמה למפיקת אירועי בוטיק",
    },
    {
        src: "/images/home-page/hero/\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05D9\u05D5\u05E2\u05E5 \u05D4\u05D5\u05DF \u05E4\u05E8\u05D8\u05D9  \u05DB\u05E8\u05D3\u05D9\u05D2\u05D5.webp",
        smallSrc:
            "/images/home-page/hero/כרטיס ביקור דיגיטלי ליועץ הון פרטי כרדיגו-sm.webp",
        alt: "דוגמה לכרטיס ביקור דיגיטלי ליועץ הון פרטי",
    },
    {
        src: "/images/home-page/hero/\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05DC\u05E8\u05D5\u05E4\u05D0\u05EA \u05E9\u05D9\u05E0\u05D9\u05D9\u05DD \u05D0\u05E1\u05EA\u05D8\u05D9\u05EA  \u05DB\u05E8\u05D3\u05D9\u05D2\u05D5.webp",
        smallSrc:
            "/images/home-page/hero/כרטיס ביקור דיגיטלי לרופאת שיניים אסתטית כרדיגו-sm.webp",
        alt: "דוגמה לכרטיס ביקור דיגיטלי לרופאת שיניים אסתטית",
    },
];

export default function Home() {
    useEffect(() => {
        trackSitePageView();
    }, []);

    const stageZoom = useScrollProgress();
    const dashZoom = useScrollProgress();
    const editorZoom = useScrollProgress();
    const insightScroll = useScrollProgress();
    const controlScroll = useScrollProgress();
    const conversionScroll = useScrollProgress();
    const shareScroll = useScrollProgress();
    const stepsScroll = useScrollProgress();

    const homeWebSiteJsonLd = buildHomeWebSiteJsonLd();
    const homeOrganizationJsonLd = buildCardigoOrganizationJsonLd();
    const homeFaqJsonLd = buildHomeFaqJsonLd();

    return (
        <main className={styles.page} data-page="site">
            <SeoHelmet
                title="כרטיס ביקור דיגיטלי לעסק | Cardigo"
                description="כרטיס ביקור דיגיטלי לעסק של Cardigo מאפשר ליצור עמוד עסקי מקצועי, לשתף ב-QR, בוואטסאפ ובקישורים ייעודיים, ולעדכן הכול בקלות - עם תבניות, אנליטיקה וכלי שיתוף לעסק שלכם."
                canonicalUrl={`${ORIGIN}/`}
                url={`${ORIGIN}/`}
                image={`${ORIGIN}${DEFAULT_OG_IMAGE_PATH}`}
                imageAlt="Cardigo – כרטיס ביקור דיגיטלי לעסק"
                jsonLdItems={[
                    homeWebSiteJsonLd,
                    homeOrganizationJsonLd,
                    homeFaqJsonLd,
                ]}
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
                                    width={212}
                                    height={80}
                                    loading="eager"
                                    fetchpriority="high"
                                    decoding="sync"
                                />
                            </picture>
                        </Link>

                        <h1 className={styles.h1}>
                            כרטיס ביקור דיגיטלי{" "}
                            <span
                                className={`${styles.h1Accent} ${pub.goldUnderline}`}
                            >
                                שמביא יותר תוצאות
                            </span>
                        </h1>
                    </div>

                    <div className={styles.heroCards}>
                        {HERO_CARDS.map((card, i) => {
                            const src = encodeURI(card.src);
                            const smallSrc = encodeURI(card.smallSrc);
                            return (
                                <img
                                    key={i}
                                    src={src}
                                    srcSet={`${smallSrc} 280w, ${src} 400w`}
                                    sizes="clamp(90px, 15vw, 220px)"
                                    alt={card.alt}
                                    className={styles.heroCardImg}
                                    width={280}
                                    height={545}
                                    loading={i === 2 ? "eager" : "lazy"}
                                    decoding="async"
                                />
                            );
                        })}
                    </div>
                    <div className={styles.heroActions}>
                        <Button
                            as={Link}
                            to="/edit"
                            variant="primary"
                            className={`${styles.heroCta}  `}
                            onClick={() =>
                                trackSiteClick({
                                    action: SITE_ACTIONS.home_hero_primary_register,
                                    pagePath: "/",
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
                            variant="primary"
                            className={`${styles.heroCta} ${whatsappStyles.skin}`}
                        >
                            <span
                                className={whatsappStyles.icon}
                                aria-hidden="true"
                            />
                            אני רוצה חודש ניסיון במתנה!🎁
                        </Button>
                        <span className={styles.heroTrialNote}>
                            כולל 10 ימי פרימיום למשתמשים חדשים
                            <CrownIcon className={styles.heroTrialCrown} />
                        </span>
                        <p className={pub.illustrationOnlyTxt}>
                            {" "}
                            הדוגמאות בעמוד זה מוצגות להמחשה
                        </p>
                    </div>
                </div>
            </section>
            {/* ── 1. MINI-SITE / BUSINESS PRESENCE ────────────── */}
            <section className={pub.sectionLight}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>
                        כרטיס ביקור דיגיטלי
                        <span>הפכו את המתעניינים ללקוחות שלכם!</span>
                    </h2>

                    <p className={styles.presenceLead}>
                        כרטיס ביקור דיגיטלי של{" "}
                        <strong className={styles.presenceLeadBrand}>
                            Cardigo
                        </strong>{" "}
                        מציג את העסק שלכם בצורה מקצועית, ברורה ויוקרתית. במקום
                        לשלוח כמה קישורים, להסביר שוב ושוב מה אתם עושים, שתפו{" "}
                        <span className={`${pub.goldUnderline} ${pub.boldTxt}`}>
                            כרטיס ביקור דיגיטלי אחד
                        </span>{" "}
                        עם כל הפרטים של העסק במקום אחד. הכרטיס משפר את התוצאות
                        שלכם בגוגל, נוח לשיתוף, עם מבנה ברור שעוזר ללקוחות להבין
                        מי אתם, מה אתם מציעים ולמה כדאי לפנות דווקא אליכם.
                    </p>
                    <h3 className={pub.h3Gold}>
                        מה כולל כרטיס ביקור דיגיטלי של Cardigo?
                    </h3>
                    <div className={styles.presenceMedia}>
                        <div
                            className={`${styles.phoneStage} ${scroll.scrollZoomSoft} ${styles.strongerZoom}`}
                            aria-hidden="true"
                            ref={stageZoom.ref}
                        >
                            <img
                                className={styles.phoneImage}
                                src={phoneSrc}
                                srcSet={`${phoneSmallSrc} 480w, ${phoneSrc} 719w`}
                                sizes="(min-width: 80rem) 278px, (min-width: 48rem) 241px, 155px"
                                alt="כרטיס ביקור דיגיטלי לעסק בנייד עם פרטי קשר, וואטסאפ וגלריה"
                                width={340}
                                height={690}
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

                    <div className={pub.highlight}>
                        <h3 className={pub.h3Gold}>
                            למי מתאים כרטיס ביקור דיגיטלי?
                            <span>לעצמאים שרוצים נוכחות דיגיטלית</span>
                        </h3>

                        <p className={styles.presenceLead}>
                            כרטיס ביקור דיגיטלי לעסק מתאים לעצמאים, עסקים קטנים,
                            קליניקות, חנויות מקומיות ונותני שירות
                            <span
                                className={`${pub.goldUnderline} ${pub.boldTxt}`}
                            >
                                {" "}
                                שרוצים להציג את העסק בצורה מסודרת בלי להקים אתר
                                מלא.
                            </span>
                            לכל כרטיס יש קישור אישי, מבנה ברור ותוכן שניתן לעדכן
                            בכל רגע, כך שלקוחות יכולים להבין במהירות מי אתם, מה
                            אתם מציעים ואיך ליצור איתכם קשר.
                        </p>
                    </div>
                </div>
            </section>
            {/* ── 2. CONVERSION - FROM VIEW TO CONTACT ────────── */}{" "}
            <section className={pub.sectionDark} id="features">
                {" "}
                <div className={pub.sectionWrap}>
                    {" "}
                    <h2 className={pub.h2White}>
                        {" "}
                        כרטיס ביקור דיגיטלי לעסק שמוביל מצפייה לפנייה <br />
                        <span
                            className={`${pub.goldHilight} ${pub.goldUnderline}`}
                        >
                            {" "}
                            בקליק אחד{" "}
                        </span>{" "}
                    </h2>{" "}
                    <p
                        className={`${pub.sectionLeadLight} ${pub.goldUnderline}`}
                    >
                        {" "}
                        כל כפתור בכרטיס עוזר ללקוח לפעול מיד - לשלוח וואטסאפ,
                        להתקשר, לנווט, לפתוח קישור או להשאיר פרטים בצורה פשוטה
                        וברורה.{" "}
                        <span className={`${pub.goldHilight} ${pub.boldTxt}`}>
                            {" "}
                            כך הופכים צפייה להזדמנות אמיתית ליצירת קשר.{" "}
                        </span>{" "}
                    </p>{" "}
                    <div
                        className={styles.conversionRow}
                        ref={conversionScroll.ref}
                    >
                        {" "}
                        {CONVERSION_ITEMS.map((item, i) => (
                            <div key={i} className={styles.conversionCard}>
                                {" "}
                                <div className={styles.conversionMedia}>
                                    {" "}
                                    <img
                                        className={styles.conversionImg}
                                        src={item.src}
                                        alt={item.alt}
                                        width={400}
                                        height={400}
                                        loading="lazy"
                                        decoding="async"
                                    />{" "}
                                </div>{" "}
                                <div className={styles.conversionHeader}>
                                    {" "}
                                    <item.Icon
                                        className={styles.conversionIcon}
                                    />{" "}
                                    <h3 className={styles.conversionTitle}>
                                        {" "}
                                        {item.title}{" "}
                                    </h3>{" "}
                                    <p className={styles.conversionText}>
                                        {" "}
                                        {item.text}{" "}
                                    </p>{" "}
                                </div>{" "}
                            </div>
                        ))}{" "}
                    </div>{" "}
                </div>{" "}
            </section>
            {/* ── 3. ANALYTICS / KNOW WHAT WORKS ─────────────── */}
            <section
                className={`${pub.sectionLight} ${styles.analyticsSection}`}
            >
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>תדעו מה באמת מביא תוצאות</h2>
                    <p className={pub.sectionLead}>
                        {" "}
                        <strong className={styles.analyticsLeadBrand}>
                            Cardigo -
                        </strong>{" "}
                        זאת{" "}
                        <em className={styles.analyticsLeadPunch}>
                            פלטפורמה חכמה ליצירת כרטיסי ביקור דיגיטליים עם
                            אנליטיקה{" "}
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
                    <p className={pub.highlight}>
                        כל צפייה בכרטיס הביקור הדיגיטלי, כל לחיצה על וואטסאפ או
                        טלפון וכל מקור הגעה עוזרים לכם להבין מה באמת עובד -
                        ולהפוך נתונים לתובנות שמחזקות את הפניות לעסק.{" "}
                        <em className={styles.analyticsLeadPunch}>
                            שליטה אמיתית על התוצאות.
                        </em>
                    </p>
                    <p className={styles.analyticsCaveat}>
                        * ניתוח נתונים מלא זמין ב
                        <Link to="/pricing/" className={styles.caveatLink}>
                            מסלול פרימיום
                        </Link>
                        . במסלול חינמי ניתן לצפות בתצוגה לדוגמה.
                    </p>
                </div>
            </section>
            {/* ── 4. SHARE EVERYWHERE ─────────────────────────── */}
            <section className={pub.sectionDark}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2White}>
                        {" "}
                        שתפו בכל מקום <br />
                        <span
                            className={`${pub.h2Gold} ${pub.goldUnderline} ${styles.strongerUnderline}`}
                        >
                            את הכרטיס ביקור הדיגיטלי שלכם
                        </span>
                    </h2>
                    <ul className={styles.shareChecklist}>
                        {" "}
                        <li className={styles.shareCheckItem}>
                            {" "}
                            <div className={styles.shareCheckText}>
                                {" "}
                                <span className={styles.shareCheckBold}>
                                    {" "}
                                    משתפים כרטיס ביקור דיגיטלי בכל ערוץ{" "}
                                </span>{" "}
                                <span className={styles.shareCheckDesc}>
                                    {" "}
                                    שלחו את הכרטיס בקישור, וואטסאפ, אימייל, QR
                                    או קמפיין ממומן - בצורה פשוטה ונוחה
                                    ללקוח{" "}
                                </span>{" "}
                            </div>{" "}
                        </li>{" "}
                        <li className={styles.shareCheckItem}>
                            {" "}
                            <div className={styles.shareCheckText}>
                                {" "}
                                <span className={styles.shareCheckBold}>
                                    {" "}
                                    נוכחות דיגיטלית שממשיכה לעבוד{" "}
                                </span>{" "}
                                <span className={styles.shareCheckDesc}>
                                    {" "}
                                    הכרטיס זמין ללקוחות בכל מקום שבו העסק שלכם
                                    מופיע - ברשתות, בפרסום, בהודעות ובשיחות
                                    מכירה{" "}
                                </span>{" "}
                            </div>{" "}
                        </li>{" "}
                        <li className={styles.shareCheckItem}>
                            {" "}
                            <div className={styles.shareCheckText}>
                                {" "}
                                <span className={styles.shareCheckBold}>
                                    {" "}
                                    כל שיתוף יכול להפוך לפנייה{" "}
                                </span>{" "}
                                <span className={styles.shareCheckDesc}>
                                    {" "}
                                    כל פתיחה של הכרטיס מחברת לקוח לפרטי העסק,
                                    לוואטסאפ, לטלפון ולפעולה הבאה{" "}
                                </span>{" "}
                            </div>{" "}
                        </li>{" "}
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
            <section className={pub.sectionLight}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>
                        {" "}
                        עדכון הכרטיס הדיגיטלי שלכם - בכל זמן
                    </h2>

                    <ul className={styles.editChecklist}>
                        <li className={styles.editCheckItem}>
                            <div className={styles.editCheckText}>
                                <span className={styles.editCheckBold}>
                                    עדכון פרטי העסק באופן עצמאי
                                </span>
                                <span className={styles.editCheckDesc}>
                                    שנו מספר טלפון, וואטסאפ, תמונות, טקסטים
                                    וקישורים - והכרטיס הדיגיטלי שלכם מתעדכן מיד
                                </span>
                            </div>
                        </li>
                        <li className={styles.editCheckItem}>
                            <div className={styles.editCheckText}>
                                <span className={styles.editCheckBold}>
                                    החלפת עיצוב ותבנית בלחיצה
                                </span>
                                <span className={styles.editCheckDesc}>
                                    בחרו עיצוב חדש לכרטיס הביקור הדיגיטלי בכל
                                    רגע - בלי לאבד את התוכן שכבר הוספתם
                                </span>
                            </div>
                        </li>
                        <li className={styles.editCheckItem}>
                            <div className={styles.editCheckText}>
                                <span className={styles.editCheckBold}>
                                    ניהול מכל מכשיר, בלי מתכנת
                                </span>
                                <span className={styles.editCheckDesc}>
                                    האזור האישי עובד גם מהנייד, כך שאפשר לעדכן
                                    את הכרטיס שלכם לבד, מהר ובלי לחכות לאף אחד
                                </span>
                            </div>
                        </li>
                        <li className={styles.editCheckItem}>
                            <div className={styles.editCheckText}>
                                <span className={styles.editCheckBold}>
                                    תמיכה אישית כשצריך
                                </span>
                                <span className={styles.editCheckDesc}>
                                    צריכים עזרה עם הכרטיס, העיצוב או עדכון
                                    הפרטים? אנחנו כאן כדי לעזור לכם להציג את
                                    העסק בצורה מקצועית.
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
                        alt="אזור אישי לעריכת כרטיס ביקור דיגיטלי לעסק - Cardigo"
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
                    <p className={pub.highlight}>
                        עם Cardigo אתם יכולים לעדכן את הכרטיס הדיגיטלי שלכם בכל
                        זמן - להחליף מספר טלפון, להוסיף תמונות, לעדכן קישורים,
                        לשנות עיצוב ולשתף קישור מקצועי אחד מכל מכשיר.
                    </p>
                </div>
            </section>
            {/* ── 6. TEMPLATES / DESIGN ──────────────────────── */}
            <section className={pub.sectionDark} id="templates">
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2White}>
                        בחרו תבנית לכרטיס ביקור דיגיטלי <br />
                        <span className={`${pub.h2Gold} ${pub.goldUnderline}`}>
                            שמתאימה לעסק שלכם
                        </span>
                    </h2>
                    <p className={pub.sectionLeadLight}>
                        מחכים לכם עיצובים מוכנים לכרטיס ביקור דיגיטלי, שנראים
                        מקצועיים, ועובדים מצוין גם בטלפון. פשוט בוחרים תבנית,
                        מוסיפים את פרטי העסק ומשתפים קישור אחד ברור עם וואטסאפ,
                        טלפון, ניווט וכל מה שלקוח צריך כדי לפנות אליכם.
                    </p>
                    <p
                        className={`${pub.sectionLeadLight} ${pub.goldHilight} ${pub.boldTxt}`}
                    >
                        הנה כמה מהתבניות לדוגמא&hellip;
                    </p>
                    <div className={styles.templatesShowcase}>
                        {TEMPLATE_SKINS.map((skin, i) => (
                            <div key={i} className={styles.templateCard}>
                                <img
                                    className={styles.templateCardImg}
                                    src={skin.src}
                                    alt={skin.alt}
                                    loading="lazy"
                                    width="300"
                                    height="520"
                                />
                                <div className={styles.templateCardName}>
                                    {/* {skin.name} */}
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
                    <div className={styles.center}>
                        <Link
                            to="/cards/"
                            className={styles.templatesSeeAll}
                            onClick={() =>
                                trackSiteClick({
                                    action: SITE_ACTIONS.home_templates_see_all,
                                    pagePath: "/",
                                })
                            }
                        >
                            גלו עוד דוגמאות ויכולות של הכרטיסים
                        </Link>
                    </div>
                </div>
            </section>
            {/* ── 7. HOW IT WORKS (3 steps) ──────────────────── */}
            <section className={pub.sectionLight} id="how">
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>
                        {" "}
                        כרטיס ביקור דיגיטלי ב-3 צעדים{" "}
                    </h2>

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
            <section className={styles.ctaSection}>
                <div className={pub.sectionWrap}>
                    <div className={styles.ctaInner}>
                        <h2 className={styles.ctaTitle}>
                            {" "}
                            צרו כרטיס ביקור דיגיטלי לעסק בחינם{" "}
                            <span
                                className={`${pub.goldHilight} ${pub.goldUnderline}`}
                            >
                                <br />
                                והתחילו לקבל יותר פניות!{" "}
                            </span>
                        </h2>
                        <p className={styles.ctaText}>
                            עם{" "}
                            <span
                                className={`${pub.goldHilight} ${pub.goldUnderline} ${pub.boldTxt}`}
                            >
                                Cardigo
                            </span>{" "}
                            בונים דף עסקי מקצועי ונוח לשיתוף - עם וואטסאפ,
                            טלפון, ניווט ועדכון פרטים בכל זמן.
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
                            צרו כרטיס דיגיטלי בחינם
                        </Button>
                    </div>
                </div>
            </section>
            {/* ── 9. FAQ (expanded) ──────────────────────────── */}
            <section className={pub.sectionDark} id="faq">
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>שאלות נפוצות</h2>

                    <div className={pub.faq}>
                        {HOME_FAQ.map((item, i) => (
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
