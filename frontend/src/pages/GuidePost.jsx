import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import SeoHelmet from "../components/seo/SeoHelmet";
import ArticleConversionBlock from "../components/marketing/ArticleConversionBlock";
import { buildCardigoPublisherJsonLd } from "../seo/brandConstants.js";
import { trackSitePageView } from "../services/siteAnalytics.client";
import { useInitialDetailData } from "../seo/initialDetailData";
import styles from "./GuidePost.module.css";
import { CONTENT_DISPLAY_POLICY } from "../utils/contentDisplayPolicy.js";
import {
    renderLinkedText,
    textToParagraphs,
    markdownLinksToPlainText,
} from "../utils/safeLinkedText.jsx";

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";

/** Dedicated guide fallback OG image - reuses blog fallback (temporary). */
const GUIDE_OG_FALLBACK = `${ORIGIN}/images/blog/fallback/blog-cardigo-bussines-img-fallback.webp`;

/** Local fallback for related-guide thumbnails (no ORIGIN prefix - relative). */
const GUIDE_THUMB_FALLBACK =
    "/images/blog/fallback/blog-cardigo-bussines-img-fallback.webp";

/** Default author avatar - served from public/ (Vite static asset). */
const DEFAULT_AUTHOR_AVATAR =
    "/images/blog/author-img/%D7%95%D7%9C%D7%A0%D7%98%D7%99%D7%9F.jpg";

/** SEO-meaningful fallback alt for author avatar. */
const DEFAULT_AUTHOR_IMG_ALT = "תמונת מחבר המדריך - Cardigo";

/** Hardcoded author name - single-author guides. */
const DEFAULT_AUTHOR_NAME = "ולנטין";

/** Hardcoded author bio line (JSX - Link to homepage via brand name). */
const DEFAULT_AUTHOR_BIO = (
    <>
        מייסד <Link to="/">Cardigo</Link> - כרטיסי ביקור דיגיטליים
    </>
);

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

/* ── JSON-LD builders ─────────────────────────────────────────── */

function buildArticleJsonLd(post) {
    const ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${ORIGIN}/guides/${post.slug}/#article`,
        headline: post.title || "",
        description: markdownLinksToPlainText(
            post.seo?.description || post.excerpt || "",
        ),
        url: `${ORIGIN}/guides/${post.slug}/`,
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${ORIGIN}/guides/${post.slug}/`,
        },
        inLanguage: "he",
        datePublished: post.publishedAt || undefined,
        dateModified: post.updatedAt || post.publishedAt || undefined,
        author: {
            "@type": "Person",
            name: post.authorName || DEFAULT_AUTHOR_NAME,
        },
        publisher: buildCardigoPublisherJsonLd(),
    };
    ld.image = post.heroImageUrl || GUIDE_OG_FALLBACK;
    return ld;
}

function buildBreadcrumbJsonLd(post) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "מדריכים",
                item: `${ORIGIN}/guides/`,
            },
            {
                "@type": "ListItem",
                position: 2,
                name: post.title || "",
                item: `${ORIGIN}/guides/${post.slug}/`,
            },
        ],
    };
}

/* ── Component ────────────────────────────────────────────────── */

export default function GuidePost() {
    const { slug } = useParams();
    const initialSeed = useInitialDetailData("guides");
    const hasSeed = !!(initialSeed && initialSeed.slug === slug);
    const [post, setPost] = useState(() => (hasSeed ? initialSeed : null));
    const [loading, setLoading] = useState(() => (hasSeed ? false : true));
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState(null);
    const [related, setRelated] = useState([]);
    const navigate = useNavigate();

    const skipFirstFetchRef = useRef(hasSeed);

    useEffect(() => {
        trackSitePageView();
    }, []);

    useEffect(() => {
        if (!slug) return;
        if (skipFirstFetchRef.current) {
            skipFirstFetchRef.current = false;
            return;
        }
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            setNotFound(false);
            try {
                const res = await fetch(
                    `/api/guides/${encodeURIComponent(slug)}`,
                );
                if (res.status === 404) {
                    if (!cancelled) setNotFound(true);
                    return;
                }
                if (!res.ok) throw new Error("שגיאה בטעינת המדריך");
                const data = await res.json();
                if (!cancelled) setPost(data);
            } catch (err) {
                if (!cancelled) setError(err.message || "שגיאה בטעינת המדריך");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    /* ── Related guides (latest excluding current) ── */
    useEffect(() => {
        if (!slug) return;
        let dead = false;
        fetch("/api/guides?page=1&limit=4")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (dead || !data) return;
                const others = (data.items || [])
                    .filter((p) => p.slug !== slug)
                    .slice(0, 3);
                setRelated(others);
            })
            .catch(() => {});
        return () => {
            dead = true;
        };
    }, [slug]);

    /* ── Alias redirect: normalize URL to canonical slug ── */
    useEffect(() => {
        if (post && post.slug && post.slug !== slug) {
            navigate(`/guides/${post.slug}/`, { replace: true });
        }
    }, [post, slug, navigate]);

    /* ── Loading state ──────────────── */
    if (loading) {
        return (
            <main className={styles.guideWrap} data-page="site">
                <p className={styles.status}>טוען מדריך…</p>
            </main>
        );
    }

    /* ── Not found ──────────────────── */
    if (notFound) {
        return (
            <main className={styles.guideWrap} data-page="site">
                <SeoHelmet
                    robots="noindex, nofollow"
                    title="המדריך לא נמצא | Cardigo"
                />
                <p className={styles.status}>המדריך לא נמצא.</p>
                <div className={styles.backRow}>
                    <Link to="/guides/" className={styles.backLink}>
                        חזרה למדריכים
                    </Link>
                </div>
            </main>
        );
    }

    /* ── Error state ────────────────── */
    if (error || !post) {
        return (
            <main className={styles.guideWrap} data-page="site">
                <SeoHelmet
                    title="שגיאה בטעינת המדריך | Cardigo"
                    description="לא ניתן לטעון את המדריך כרגע. אנא נסה שוב מאוחר יותר."
                    robots="noindex, nofollow"
                />
                <p className={styles.statusError}>{error || "שגיאה בטעינה"}</p>
                <div className={styles.backRow}>
                    <Link to="/guides/" className={styles.backLink}>
                        חזרה למדריכים
                    </Link>
                </div>
            </main>
        );
    }

    /* ── SEO ─────────────────────────── */
    const seoTitle = post.seo?.title || post.title || "מדריכים | Cardigo";
    const seoDescription = markdownLinksToPlainText(
        post.seo?.description || post.excerpt || "",
    );
    const canonicalUrl = `${ORIGIN}/guides/${post.slug}/`;
    const jsonLdItems = [buildArticleJsonLd(post), buildBreadcrumbJsonLd(post)];

    /* ── Render ──────────────────────── */
    return (
        <main className={styles.guideWrap} data-page="site">
            <SeoHelmet
                title={seoTitle}
                description={seoDescription}
                canonicalUrl={canonicalUrl}
                url={canonicalUrl}
                image={post.heroImageUrl || GUIDE_OG_FALLBACK}
                ogType="article"
                jsonLdItems={jsonLdItems}
                articlePublishedTime={post.publishedAt || undefined}
                articleModifiedTime={
                    post.updatedAt || post.publishedAt || undefined
                }
                articleAuthor={post.authorName || DEFAULT_AUTHOR_NAME}
                imageAlt={post.heroImageAlt || post.title || undefined}
            />
            <article className={styles.article}>
                <div className={styles.articleInner}>
                    <header className={styles.articleHeader}>
                        {CONTENT_DISPLAY_POLICY.showPublishedDates &&
                            post.publishedAt && (
                                <time
                                    className={styles.date}
                                    dateTime={post.publishedAt}
                                >
                                    {formatDate(post.publishedAt)}
                                </time>
                            )}

                        <h1 className={styles.articleTitle}>{post.title}</h1>

                        {post.excerpt && (
                            <p className={styles.articleExcerpt}>
                                {renderLinkedText(post.excerpt)}
                            </p>
                        )}

                        <div
                            className={styles.articleDivider}
                            aria-hidden="true"
                        />
                    </header>

                    <img
                        className={styles.heroImage}
                        src={post.heroImageUrl || GUIDE_OG_FALLBACK}
                        alt={post.heroImageAlt || post.title || ""}
                        loading="eager"
                        fetchpriority="high"
                        decoding="async"
                        width={1200}
                        height={675}
                    />

                    {(post.sections || []).map((section, i) => {
                        const sectionImageUrl =
                            typeof section.imageUrl === "string"
                                ? section.imageUrl.trim()
                                : "";
                        return (
                            <section key={i} className={styles.section}>
                                {section.heading && (
                                    <h2 className={styles.sectionHeading}>
                                        {section.heading}
                                    </h2>
                                )}
                                {sectionImageUrl && (
                                    <img
                                        className={styles.sectionImage}
                                        src={sectionImageUrl}
                                        alt={section.imageAlt || ""}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                )}
                                {textToParagraphs(section.body).map(
                                    (para, j) => (
                                        <p
                                            key={j}
                                            className={styles.sectionBody}
                                        >
                                            {renderLinkedText(para)}
                                        </p>
                                    ),
                                )}
                            </section>
                        );
                    })}

                    {post.authorName && (
                        <aside
                            className={styles.authorCard}
                            aria-label="מחבר המדריך"
                        >
                            <img
                                className={styles.authorAvatar}
                                src={
                                    post.authorImageUrl || DEFAULT_AUTHOR_AVATAR
                                }
                                alt={
                                    post.authorImageAlt ||
                                    DEFAULT_AUTHOR_IMG_ALT
                                }
                            />
                            <div className={styles.authorInfo}>
                                <span className={styles.authorName}>
                                    {DEFAULT_AUTHOR_NAME}
                                </span>
                                <span className={styles.authorBio}>
                                    {post.authorBio || DEFAULT_AUTHOR_BIO}
                                </span>
                            </div>
                        </aside>
                    )}

                    <ArticleConversionBlock sourceTitle={post.title} />

                    {related.length > 0 && (
                        <nav
                            className={styles.relatedWrap}
                            aria-label="מדריכים נוספים"
                        >
                            <h2 className={styles.relatedTitle}>עוד מדריכים</h2>
                            <div className={styles.relatedList}>
                                {related.map((r) => (
                                    <Link
                                        key={r.id}
                                        to={`/guides/${r.slug}/`}
                                        className={styles.relatedItem}
                                    >
                                        <img
                                            className={styles.relatedThumb}
                                            src={
                                                r.heroImageUrl ||
                                                GUIDE_THUMB_FALLBACK
                                            }
                                            alt={
                                                r.heroImageAlt || r.title || ""
                                            }
                                            loading="lazy"
                                        />
                                        <span className={styles.relatedName}>
                                            {r.title}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </nav>
                    )}

                    <div className={styles.backRow}>
                        <Link to="/guides/" className={styles.backLink}>
                            חזרה למדריכים
                        </Link>
                    </div>
                </div>
            </article>
        </main>
    );
}
