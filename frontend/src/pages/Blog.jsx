import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import SeoHelmet from "../components/seo/SeoHelmet";
import { trackSitePageView } from "../services/siteAnalytics.client";
import pub from "../styles/public-sections.module.css";
import styles from "./Blog.module.css";

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";
const PAGE_LIMIT = 12;

/** Blog cover fallback - same asset used for OG in BlogPost. */
const BLOG_COVER_FALLBACK = `${ORIGIN}/images/blog/fallback/blog-cardigo-bussines-img-fallback.webp`;

/* ── FAQ ──────────────────────────────────────────────────────── */

const BLOG_FAQ = [
    {
        q: "מה אפשר למצוא בבלוג של Cardigo?",
        a: "בבלוג של Cardigo תמצאו מאמרים, מדריכים ותובנות מעשיות על כרטיסי ביקור דיגיטליים, נראות עסקית, SEO, יצירת קשר עם לקוחות, לידים, מיתוג דיגיטלי ושימוש נכון בכלים שהעסק צריך כדי להיראות מקצועי יותר אונליין.",
    },
    {
        q: "למי התוכן בבלוג מתאים?",
        a: "התוכן מתאים לבעלי עסקים, עצמאיים, נותני שירות, אנשי מכירות, יועצים, אנשי מקצוע וחברות שרוצים להבין איך לשפר נוכחות דיגיטלית, להציג את העסק בצורה חכמה יותר ולתקשר טוב יותר עם לקוחות.",
    },
    {
        q: "האם הבלוג מתאים גם לעסקים קטנים או בתחילת הדרך?",
        a: "כן. חלק גדול מהתוכן בבלוג נכתב בדיוק עבור עסקים קטנים, עצמאיים ועסקים שנמצאים בתחילת הדרך, ורוצים לקבל החלטות טובות יותר בלי להסתבך עם פתרונות טכניים מיותרים.",
    },
    {
        q: "למה כרטיס ביקור דיגיטלי חשוב גם מבחינת נוכחות בגוגל?",
        a: "כרטיס ביקור דיגיטלי יכול לעזור לעסק להיראות מקצועי יותר, לרכז מידע חשוב במקום אחד, לחזק אמון ולתמוך בנראות הדיגיטלית של העסק. כשעושים זאת נכון, הוא יכול לתרום גם להצגת פרטי העסק, קישורים, תוכן ואלמנטים שמחזקים את הנוכחות אונליין.",
    },
    {
        q: "האם צריך ידע טכני כדי להבין וליישם את מה שמופיע בבלוג?",
        a: "לא. הבלוג נכתב בשפה ברורה ומעשית, כדי שגם מי שאין לו רקע טכני יוכל להבין את הרעיונות, ליישם צעדים חשובים ולקבל החלטות טובות יותר לגבי הנוכחות הדיגיטלית של העסק.",
    },
    {
        q: "איך לבחור מאיזה מאמר להתחיל?",
        a: "הדרך הטובה ביותר היא להתחיל מהנושא שהכי רלוונטי לעסק שלכם כרגע - נראות דיגיטלית, יצירת קשר עם לקוחות, SEO, כרטיס ביקור דיגיטלי או שיפור הצגת השירותים. משם אפשר להמשיך לתכנים משלימים לפי הצורך.",
    },
    {
        q: "האם הבלוג עוסק רק בכרטיסי ביקור דיגיטליים?",
        a: "לא. כרטיס ביקור דיגיטלי הוא מרכז חשוב, אבל הבלוג עוסק גם בתמונה הרחבה יותר: נוכחות עסקית, אמון, חוויית לקוח, קידום אורגני, תקשורת עסקית, תוכן, מיתוג והדרך שבה עסק מציג את עצמו בעולם הדיגיטלי.",
    },
    {
        q: "איפה מתחילים אם עדיין אין לי כרטיס ביקור דיגיטלי?",
        a: "אם עדיין אין לכם כרטיס ביקור דיגיטלי, אפשר להתחיל קודם מלקרוא את המאמרים הרלוונטיים בבלוג, להבין מה חשוב באמת לעסק, ורק אחר כך לבנות כרטיס שמציג אתכם בצורה מקצועית, ברורה ונכונה יותר.",
    },
];

function buildBlogFaqJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${ORIGIN}/blog#faq`,
        url: `${ORIGIN}/blog`,
        inLanguage: "he",
        mainEntity: BLOG_FAQ.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
            },
        })),
    };
}

const blogFaqJsonLd = buildBlogFaqJsonLd();

/* ── Helpers ──────────────────────────────────────────────────── */

function formatDate(iso) {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleDateString("he-IL", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    } catch {
        return "";
    }
}

/* ── Component ────────────────────────────────────────────────── */

export default function Blog() {
    const { pageNum } = useParams();
    const navigate = useNavigate();

    /* ── Derive page from URL ── */
    const parsed = pageNum != null ? Number(pageNum) : 1;
    const page =
        Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 0;

    /* Normalize invalid or page-1 via /blog/page/1 → /blog */
    useEffect(() => {
        if (pageNum != null && page <= 1) {
            navigate("/blog", { replace: true });
        }
    }, [pageNum, page, navigate]);

    const [posts, setPosts] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const effectivePage = page >= 1 ? page : 1;

    useEffect(() => {
        trackSitePageView();
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/blog?page=${effectivePage}&limit=${PAGE_LIMIT}`,
                );
                if (!res.ok) throw new Error("שגיאה בטעינת הבלוג");
                const data = await res.json();
                if (!cancelled) {
                    setPosts(data.items || []);
                    setTotal(data.total || 0);
                }
            } catch (err) {
                if (!cancelled) setError(err.message || "שגיאה בטעינת הבלוג");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [effectivePage]);

    const totalPages = Math.ceil(total / PAGE_LIMIT);

    /* Normalize out-of-range page → last valid archive page */
    useEffect(() => {
        if (loading || totalPages === 0) return;
        if (effectivePage > totalPages) {
            navigate(totalPages <= 1 ? "/blog" : `/blog/page/${totalPages}`, {
                replace: true,
            });
        }
    }, [loading, effectivePage, totalPages, navigate]);

    const canonicalUrl =
        effectivePage <= 1
            ? `${ORIGIN}/blog`
            : `${ORIGIN}/blog/page/${effectivePage}`;

    return (
        <main data-page="site">
            <SeoHelmet
                title="בלוג | Cardigo"
                description="מאמרים, מדריכים ותובנות בנושא כרטיסי ביקור דיגיטליים, נוכחות עסקית, SEO ותקשורת חכמה עם לקוחות."
                canonicalUrl={canonicalUrl}
                url={canonicalUrl}
                image={`${ORIGIN}/images/og/cardigo-home-og-1200x630.jpg`}
                jsonLdItems={[blogFaqJsonLd]}
            />

            {/* ── Hero ─────────────────────────────────────── */}
            <section className={pub.sectionDark}>
                <div className={`${pub.sectionWrap} ${styles.heroWrap}`}>
                    <div className={styles.heroCopy}>
                        <h1 className={styles.h1}>
                            הבלוג של Cardigo
                            <span
                                className={`${styles.h1Accent} ${pub.goldUnderline}`}
                            >
                                כרטיס ביקור דיגיטלי שעובד נכון
                            </span>
                        </h1>

                        <img
                            className={styles.heroImg}
                            src="/images/blog/hero/blog-cardigo-digital-bussines-card.webp"
                            alt="כרטיס ביקור דיגיטלי של Cardigo - דוגמה חיה לכרטיס עסקי מעוצב"
                            width="600"
                            height="400"
                            loading="eager"
                        />

                        <p className={pub.sectionLeadLight}>
                            מאמרים, מדריכים ותובנות פרקטיות על כרטיסי ביקור
                            דיגיטליים, נוכחות עסקית, לידים, SEO ותקשורת עסקית
                            חכמה לעסקים בישראל.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Listing ──────────────────────────────────── */}
            <section className={pub.sectionLight}>
                <div className={`${pub.sectionWrap} ${styles.listingWrap}`}>
                    <h2 className={pub.h2Gold}>מאמרים אחרונים</h2>
                    <p className={pub.sectionLead}>
                        כאן תמצאו תוכן מעשי שיעזור לכם להבין איך להציג את העסק
                        טוב יותר, לחזק נוכחות דיגיטלית, לשפר תקשורת עם לקוחות
                        ולהפיק יותר ערך מכרטיס ביקור דיגיטלי.
                    </p>

                    {loading && posts.length === 0 && (
                        <p className={styles.status}>טוען…</p>
                    )}
                    {error && <p className={styles.statusError}>{error}</p>}
                    {!loading && !error && posts.length === 0 && (
                        <p className={styles.status}>אין מאמרים עדיין.</p>
                    )}
                    {posts.length > 0 && (
                        <div className={styles.grid}>
                            {posts.map((post) => (
                                <article key={post.id} className={styles.card}>
                                    <img
                                        className={styles.cardImage}
                                        src={
                                            post.heroImageUrl ||
                                            BLOG_COVER_FALLBACK
                                        }
                                        alt={
                                            post.heroImageAlt ||
                                            post.title ||
                                            ""
                                        }
                                        loading="lazy"
                                    />
                                    <div className={styles.cardBody}>
                                        {post.publishedAt && (
                                            <time
                                                className={styles.cardDate}
                                                dateTime={post.publishedAt}
                                            >
                                                {formatDate(post.publishedAt)}
                                            </time>
                                        )}
                                        <h3 className={styles.cardTitle}>
                                            <Link to={`/blog/${post.slug}`}>
                                                {post.title}
                                            </Link>
                                        </h3>
                                        {post.excerpt && (
                                            <p className={styles.cardExcerpt}>
                                                {post.excerpt}
                                            </p>
                                        )}
                                        <Link
                                            to={`/blog/${post.slug}`}
                                            className={styles.cardCta}
                                        >
                                            קרא עוד
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                    {totalPages > 1 && (
                        <nav
                            className={styles.pagination}
                            aria-label="ניווט עמודים"
                        >
                            {effectivePage > 1 && (
                                <Link
                                    className={styles.pageBtn}
                                    to={
                                        effectivePage === 2
                                            ? "/blog"
                                            : `/blog/page/${effectivePage - 1}`
                                    }
                                >
                                    הקודם
                                </Link>
                            )}
                            <span className={styles.pageInfo}>
                                {effectivePage} / {totalPages}
                            </span>
                            {effectivePage < totalPages && (
                                <Link
                                    className={styles.pageBtn}
                                    to={`/blog/page/${effectivePage + 1}`}
                                >
                                    הבא
                                </Link>
                            )}
                        </nav>
                    )}
                </div>
            </section>

            {/* ── Bridge → /cards ─────────────────────────── */}
            <p className={styles.seeExamples}>
                <Link to="/cards">ראו דוגמאות לכרטיסי ביקור דיגיטליים</Link>
            </p>

            {/* ── FAQ ──────────────────────────────────────── */}
            <section className={pub.sectionDark} id="faq">
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>
                        שאלות נפוצות על הבלוג של Cardigo
                    </h2>

                    <div className={pub.faq}>
                        {BLOG_FAQ.map((item, i) => (
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
