import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import SeoHelmet from "../components/seo/SeoHelmet";
import { trackSitePageView } from "../services/siteAnalytics.client";
import pub from "../styles/public-sections.module.css";
import styles from "./Guides.module.css";

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";
const PAGE_LIMIT = 12;

/** Guide cover fallback - reuses blog fallback asset (temporary). */
const GUIDE_COVER_FALLBACK = `${ORIGIN}/images/guides/fallback/hero-cardigo-bussines-img-fallback.webp`;

/* ── FAQ ──────────────────────────────────────────────────────── */

const GUIDES_FAQ = [
    {
        q: "מה אפשר למצוא במדריכים של Cardigo?",
        a: "במדריכים של Cardigo תמצאו הדרכות מעשיות, צעד אחרי צעד, על כרטיסי ביקור דיגיטליים, עיצוב כרטיס, SEO, נוכחות עסקית, שיתוף עם לקוחות ושימוש מיטבי בכלים הדיגיטליים של Cardigo.",
    },
    {
        q: "למי המדריכים מתאימים?",
        a: "המדריכים מתאימים לבעלי עסקים, עצמאיים, נותני שירות, אנשי מכירות, מנהלים וכל מי שרוצה ללמוד איך להפיק את המקסימום מכרטיס ביקור דיגיטלי ומנוכחות עסקית אונליין.",
    },
    {
        q: "האם המדריכים מתאימים גם למי שרק מתחיל?",
        a: "כן. המדריכים נכתבו בשפה ברורה ומעשית, כך שגם מי שמתחיל מאפס יוכל לעקוב אחרי ההוראות וליישם אותן מיד.",
    },
    {
        q: "מה ההבדל בין המדריכים לבלוג?",
        a: "הבלוג עוסק בתובנות, רעיונות ומגמות. המדריכים מתמקדים בהדרכה מעשית - שלב אחרי שלב - עם דוגמאות ופעולות קונקרטיות שאפשר ליישם מיד.",
    },
    {
        q: "האם צריך ידע טכני כדי לעקוב אחרי המדריכים?",
        a: "לא. כל מדריך נכתב בצורה פשוטה וברורה, ללא צורך ברקע טכני קודם.",
    },
    {
        q: "איך לבחור מאיזה מדריך להתחיל?",
        a: "בחרו את הנושא שהכי קרוב לצורך שלכם כרגע - בניית כרטיס, עיצוב, שיתוף, SEO, או ניהול נוכחות עסקית - ועקבו אחרי ההוראות צעד אחרי צעד.",
    },
];

function buildGuidesFaqJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${ORIGIN}/guides#faq`,
        url: `${ORIGIN}/guides`,
        inLanguage: "he",
        mainEntity: GUIDES_FAQ.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
            },
        })),
    };
}

const guidesFaqJsonLd = buildGuidesFaqJsonLd();

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

export default function Guides() {
    const { pageNum } = useParams();
    const navigate = useNavigate();

    /* ── Derive page from URL ── */
    const parsed = pageNum != null ? Number(pageNum) : 1;
    const page =
        Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 0;

    /* Normalize invalid or page-1 via /guides/page/1 → /guides */
    useEffect(() => {
        if (pageNum != null && page <= 1) {
            navigate("/guides", { replace: true });
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
                    `/api/guides?page=${effectivePage}&limit=${PAGE_LIMIT}`,
                );
                if (!res.ok) throw new Error("שגיאה בטעינת המדריכים");
                const data = await res.json();
                if (!cancelled) {
                    setPosts(data.items || []);
                    setTotal(data.total || 0);
                }
            } catch (err) {
                if (!cancelled)
                    setError(err.message || "שגיאה בטעינת המדריכים");
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
            navigate(
                totalPages <= 1 ? "/guides" : `/guides/page/${totalPages}`,
                { replace: true },
            );
        }
    }, [loading, effectivePage, totalPages, navigate]);

    const canonicalUrl =
        effectivePage <= 1
            ? `${ORIGIN}/guides`
            : `${ORIGIN}/guides/page/${effectivePage}`;

    return (
        <main data-page="site">
            <SeoHelmet
                title="מדריכים | Cardigo"
                description="מדריכים מעשיים, צעד אחרי צעד, על כרטיסי ביקור דיגיטליים, עיצוב כרטיס, SEO, נוכחות עסקית ושימוש בכלים הדיגיטליים של Cardigo."
                canonicalUrl={canonicalUrl}
                url={canonicalUrl}
                image={`${ORIGIN}/images/og/cardigo-home-og-1200x630.jpg`}
                jsonLdItems={[guidesFaqJsonLd]}
            />

            {/* ── Hero ─────────────────────────────────────── */}
            <section className={pub.sectionDark}>
                <div className={`${pub.sectionWrap} ${styles.heroWrap}`}>
                    <div className={styles.heroCopy}>
                        <h1 className={styles.h1}>
                            המדריכים של Cardigo
                            <span
                                className={`${styles.h1Accent} ${pub.goldUnderline}`}
                            >
                                הדרכות מעשיות לכרטיס ביקור דיגיטלי
                            </span>
                        </h1>

                        <img
                            className={styles.heroImg}
                            src="/images/guides/hero/hero-cardigo-digital-bussines-card.webp"
                            alt="מדריכים של Cardigo - הדרכות מעשיות לכרטיס ביקור דיגיטלי"
                            width="600"
                            height="400"
                            loading="eager"
                        />

                        <p className={pub.sectionLeadLight}>
                            מדריכים מעשיים, צעד אחרי צעד, שיעזרו לכם לבנות, לעצב
                            ולשתף כרטיס ביקור דיגיטלי שעובד נכון - החל מהגדרות
                            בסיסיות ועד טיפים מתקדמים.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Listing ──────────────────────────────────── */}
            <section className={pub.sectionLight}>
                <div className={`${pub.sectionWrap} ${styles.listingWrap}`}>
                    <h2 className={pub.h2Gold}>מדריכים אחרונים</h2>
                    <p className={pub.sectionLead}>
                        כאן תמצאו הדרכות מעשיות שיעזרו לכם ליצור כרטיס ביקור
                        דיגיטלי מקצועי, לנהל את הנוכחות העסקית שלכם, ולשפר את
                        הדרך שבה לקוחות מוצאים ומכירים אתכם.
                    </p>

                    {loading && posts.length === 0 && (
                        <p className={styles.status}>טוען…</p>
                    )}
                    {error && <p className={styles.statusError}>{error}</p>}
                    {!loading && !error && posts.length === 0 && (
                        <p className={styles.status}>אין מדריכים עדיין.</p>
                    )}
                    {posts.length > 0 && (
                        <div className={styles.grid}>
                            {posts.map((post) => (
                                <article key={post.id} className={styles.card}>
                                    <img
                                        className={styles.cardImage}
                                        src={
                                            post.heroImageUrl ||
                                            GUIDE_COVER_FALLBACK
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
                                            <Link to={`/guides/${post.slug}`}>
                                                {post.title}
                                            </Link>
                                        </h3>
                                        {post.excerpt && (
                                            <p className={styles.cardExcerpt}>
                                                {post.excerpt}
                                            </p>
                                        )}
                                        <Link
                                            to={`/guides/${post.slug}`}
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
                                            ? "/guides"
                                            : `/guides/page/${effectivePage - 1}`
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
                                    to={`/guides/page/${effectivePage + 1}`}
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
                        שאלות נפוצות על המדריכים של Cardigo
                    </h2>

                    <div className={pub.faq}>
                        {GUIDES_FAQ.map((item, i) => (
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
