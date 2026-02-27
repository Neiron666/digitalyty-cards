import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Page from "../components/page/Page";
import SeoHelmet from "../components/seo/SeoHelmet";
import { trackSitePageView } from "../services/siteAnalytics.client";
import styles from "./BlogPost.module.css";

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";

/** Default author avatar — served from public/ (Vite static asset). */
const DEFAULT_AUTHOR_AVATAR =
    "/images/blog/author-img/%D7%95%D7%9C%D7%A0%D7%98%D7%99%D7%9F.jpg";

/** SEO-meaningful fallback alt for author avatar. */
const DEFAULT_AUTHOR_IMG_ALT = "תמונת מחבר המאמר — Cardigo Blog";

/** Hardcoded author name — single-author blog. */
const DEFAULT_AUTHOR_NAME = "ולנטין";

/** Hardcoded author bio line. */
const DEFAULT_AUTHOR_BIO = "מייסד Cardigo — כרטיסי ביקור דיגיטליים";

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

/** Split plain text into paragraphs by blank lines or single newlines. */
function textToParagraphs(text) {
    if (!text) return [];
    return text
        .split(/\n\s*\n|\n/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/* ── JSON-LD builders ─────────────────────────────────────────── */

function buildBlogPostingJsonLd(post) {
    const ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title || "",
        description: post.seo?.description || post.excerpt || "",
        url: `${ORIGIN}/blog/${post.slug}`,
        datePublished: post.publishedAt || undefined,
        dateModified: post.updatedAt || post.publishedAt || undefined,
        publisher: {
            "@type": "Organization",
            name: "Cardigo",
            url: ORIGIN,
        },
    };
    if (post.heroImageUrl) {
        ld.image = post.heroImageUrl;
    }
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
                name: "בלוג",
                item: `${ORIGIN}/blog`,
            },
            {
                "@type": "ListItem",
                position: 2,
                name: post.title || "",
                item: `${ORIGIN}/blog/${post.slug}`,
            },
        ],
    };
}

/* ── Component ────────────────────────────────────────────────── */

export default function BlogPost() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        trackSitePageView();
    }, []);

    useEffect(() => {
        if (!slug) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            setNotFound(false);
            try {
                const res = await fetch(
                    `/api/blog/${encodeURIComponent(slug)}`,
                );
                if (res.status === 404) {
                    if (!cancelled) setNotFound(true);
                    return;
                }
                if (!res.ok) throw new Error("שגיאה בטעינת המאמר");
                const data = await res.json();
                if (!cancelled) setPost(data);
            } catch (err) {
                if (!cancelled) setError(err.message || "שגיאה בטעינת המאמר");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    /* ── Loading state ──────────────── */
    if (loading) {
        return (
            <div className={styles.blogWrap}>
                <Page title="טוען…">
                    <p className={styles.status}>טוען מאמר…</p>
                </Page>
            </div>
        );
    }

    /* ── Not found ──────────────────── */
    if (notFound) {
        return (
            <div className={styles.blogWrap}>
                <Page title="לא נמצא">
                    <p className={styles.status}>המאמר לא נמצא.</p>
                    <div className={styles.backRow}>
                        <Link to="/blog" className={styles.backLink}>
                            חזרה לבלוג
                        </Link>
                    </div>
                </Page>
            </div>
        );
    }

    /* ── Error state ────────────────── */
    if (error || !post) {
        return (
            <div className={styles.blogWrap}>
                <Page title="שגיאה">
                    <p className={styles.statusError}>
                        {error || "שגיאה בטעינה"}
                    </p>
                    <div className={styles.backRow}>
                        <Link to="/blog" className={styles.backLink}>
                            חזרה לבלוג
                        </Link>
                    </div>
                </Page>
            </div>
        );
    }

    /* ── SEO ─────────────────────────── */
    const seoTitle = post.seo?.title || post.title || "בלוג | Cardigo";
    const seoDescription = post.seo?.description || post.excerpt || "";
    const canonicalUrl = `${ORIGIN}/blog/${post.slug}`;
    const jsonLdItems = [
        buildBlogPostingJsonLd(post),
        buildBreadcrumbJsonLd(post),
    ];

    /* ── Render ──────────────────────── */
    return (
        <div className={styles.blogWrap}>
            <SeoHelmet
                title={seoTitle}
                description={seoDescription}
                canonicalUrl={canonicalUrl}
                url={canonicalUrl}
                image={post.heroImageUrl || undefined}
                jsonLdItems={jsonLdItems}
            />
            <Page title="בלוג">
                <article className={styles.article}>
                    <div className={styles.articleInner}>
                        <header className={styles.articleHeader}>
                            {post.publishedAt && (
                                <time
                                    className={styles.date}
                                    dateTime={post.publishedAt}
                                >
                                    {formatDate(post.publishedAt)}
                                </time>
                            )}

                            <h2 className={styles.articleTitle}>
                                {post.title}
                            </h2>

                            {post.excerpt && (
                                <p className={styles.articleExcerpt}>
                                    {post.excerpt}
                                </p>
                            )}

                            <div
                                className={styles.articleDivider}
                                aria-hidden="true"
                            />
                        </header>

                        {post.heroImageUrl && (
                            <img
                                className={styles.heroImage}
                                src={post.heroImageUrl}
                                alt={post.heroImageAlt || post.title || ""}
                            />
                        )}

                        {(post.sections || []).map((section, i) => (
                            <section key={i} className={styles.section}>
                                {section.heading && (
                                    <h2 className={styles.sectionHeading}>
                                        {section.heading}
                                    </h2>
                                )}
                                {textToParagraphs(section.body).map(
                                    (para, j) => (
                                        <p
                                            key={j}
                                            className={styles.sectionBody}
                                        >
                                            {para}
                                        </p>
                                    ),
                                )}
                            </section>
                        ))}

                        {post.authorName && (
                            <aside
                                className={styles.authorCard}
                                aria-label="מחבר הפוסט"
                            >
                                <img
                                    className={styles.authorAvatar}
                                    src={
                                        post.authorImageUrl ||
                                        DEFAULT_AUTHOR_AVATAR
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

                        <div className={styles.backRow}>
                            <Link to="/blog" className={styles.backLink}>
                                חזרה לבלוג
                            </Link>
                        </div>
                    </div>
                </article>
            </Page>
        </div>
    );
}
