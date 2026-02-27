import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Page from "../components/page/Page";
import SeoHelmet from "../components/seo/SeoHelmet";
import { trackSitePageView } from "../services/siteAnalytics.client";
import styles from "./BlogPost.module.css";

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";

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
            <Page title="טוען…">
                <p className={styles.status}>טוען מאמר…</p>
            </Page>
        );
    }

    /* ── Not found ──────────────────── */
    if (notFound) {
        return (
            <Page title="לא נמצא">
                <p className={styles.status}>המאמר לא נמצא.</p>
                <div className={styles.backRow}>
                    <Link to="/blog" className={styles.backLink}>
                        חזרה לבלוג
                    </Link>
                </div>
            </Page>
        );
    }

    /* ── Error state ────────────────── */
    if (error || !post) {
        return (
            <Page title="שגיאה">
                <p className={styles.statusError}>{error || "שגיאה בטעינה"}</p>
                <div className={styles.backRow}>
                    <Link to="/blog" className={styles.backLink}>
                        חזרה לבלוג
                    </Link>
                </div>
            </Page>
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
        <>
            <SeoHelmet
                title={seoTitle}
                description={seoDescription}
                canonicalUrl={canonicalUrl}
                url={canonicalUrl}
                image={post.heroImageUrl || undefined}
                jsonLdItems={jsonLdItems}
            />
            <Page title={post.title}>
                <article className={styles.article}>
                    <div className={styles.backRow}>
                        <Link to="/blog" className={styles.backLink}>
                            חזרה לבלוג
                        </Link>
                    </div>

                    {post.publishedAt && (
                        <time
                            className={styles.date}
                            dateTime={post.publishedAt}
                        >
                            {formatDate(post.publishedAt)}
                        </time>
                    )}

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
                            {textToParagraphs(section.body).map((para, j) => (
                                <p key={j} className={styles.sectionBody}>
                                    {para}
                                </p>
                            ))}
                        </section>
                    ))}
                </article>
            </Page>
        </>
    );
}
