import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import SeoHelmet from "../components/seo/SeoHelmet";
import { trackSitePageView } from "../services/siteAnalytics.client";
import styles from "./BlogPost.module.css";

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";

/** Dedicated blog fallback OG image - served from public/. */
const BLOG_OG_FALLBACK = `${ORIGIN}/images/blog/fallback/blog-cardigo-bussines-img-fallback.webp`;

/** Local fallback for related-post thumbnails (no ORIGIN prefix - relative). */
const BLOG_THUMB_FALLBACK =
    "/images/blog/fallback/blog-cardigo-bussines-img-fallback.webp";

/** Default author avatar - served from public/ (Vite static asset). */
const DEFAULT_AUTHOR_AVATAR =
    "/images/blog/author-img/%D7%95%D7%9C%D7%A0%D7%98%D7%99%D7%9F.jpg";

/** SEO-meaningful fallback alt for author avatar. */
const DEFAULT_AUTHOR_IMG_ALT = "תמונת מחבר המאמר - Cardigo Blog";

/** Hardcoded author name - single-author blog. */
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

/** Split plain text into paragraphs by blank lines or single newlines. */
function textToParagraphs(text) {
    if (!text) return [];
    return text
        .split(/\n\s*\n|\n/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/* ── Link helpers (blog body only) ────────────────────────────── */

/** Canonical origin for internal-link classification. */
const CANONICAL_ORIGIN = (() => {
    try {
        return new URL(ORIGIN).origin;
    } catch {
        return "https://cardigo.co.il";
    }
})();

/**
 * Validate a candidate URL for safe rendering as <a href>.
 * Returns { href, isInternal } or null if the URL is unsafe / invalid.
 *
 * Allowed:
 *   - relative paths starting with a single "/"
 *   - absolute http:// or https://
 * Rejected:
 *   - javascript: / data: / vbscript: / blob: / file: / any other scheme
 *   - protocol-relative "//..."
 *   - malformed URLs
 */
function validateLinkUrl(raw) {
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Relative path: must start with exactly one "/"
    if (trimmed[0] === "/") {
        if (trimmed[1] === "/") return null; // protocol-relative → reject
        return { href: trimmed, isInternal: true };
    }

    // Absolute URL - parse with URL API (security source of truth)
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        return null; // malformed
    }

    // Protocol allowlist (not a denylist)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
    }

    // Classify internal vs external
    const currentOrigin =
        typeof window !== "undefined" ? window.location.origin : "";
    const isInternal =
        parsed.origin === CANONICAL_ORIGIN ||
        (currentOrigin && parsed.origin === currentOrigin);

    return { href: trimmed, isInternal };
}

/* Regex: token detection only - validation deferred to validateLinkUrl. */
const MD_LINK_RE = /\[([^\[\]]+)\]\(([^()\s]+)\)/g;
const BARE_URL_RE = /https?:\/\/[^\s<>\[\]"']+/g;
const TRAILING_PUNCT_RE = /[.,;:!?]+$/;

/**
 * Convert a paragraph string into an array of React nodes,
 * with safe markdown links and bare-URL auto-links.
 *
 * Pass 1 - find markdown links [text](url)
 * Pass 2 - auto-linkify bare URLs in remaining plain-text segments
 */
function renderLinkedText(text) {
    if (!text) return [text];

    /* ── Pass 1: markdown links ── */
    const parts = [];
    let cursor = 0;
    let keyIdx = 0;
    let match;

    MD_LINK_RE.lastIndex = 0;
    while ((match = MD_LINK_RE.exec(text)) !== null) {
        const [full, anchorText, rawUrl] = match;
        const idx = match.index;

        // Plain text before this match
        if (idx > cursor) {
            parts.push({ type: "text", value: text.slice(cursor, idx) });
        }

        const linkInfo = validateLinkUrl(rawUrl);
        if (linkInfo) {
            parts.push({
                type: "link",
                href: linkInfo.href,
                isInternal: linkInfo.isInternal,
                display: anchorText,
            });
        } else {
            // Invalid URL → degrade entire token to plain text
            parts.push({ type: "text", value: full });
        }
        cursor = idx + full.length;
    }
    // Remaining text after last markdown match
    if (cursor < text.length) {
        parts.push({ type: "text", value: text.slice(cursor) });
    }

    /* ── Pass 2: bare URLs inside plain-text segments ── */
    const final = [];
    for (const part of parts) {
        if (part.type === "link") {
            final.push(part);
            continue;
        }
        // Scan plain-text segment for bare URLs
        const segment = part.value;
        let sCursor = 0;
        BARE_URL_RE.lastIndex = 0;
        let urlMatch;
        while ((urlMatch = BARE_URL_RE.exec(segment)) !== null) {
            const rawBare = urlMatch[0];
            const sIdx = urlMatch.index;

            if (sIdx > sCursor) {
                final.push({
                    type: "text",
                    value: segment.slice(sCursor, sIdx),
                });
            }

            // Conservative trailing punctuation trim
            const urlToValidate =
                rawBare.replace(TRAILING_PUNCT_RE, "") || rawBare;
            const trailingChars = rawBare.slice(urlToValidate.length);

            const linkInfo = validateLinkUrl(urlToValidate);
            if (linkInfo) {
                final.push({
                    type: "link",
                    href: linkInfo.href,
                    isInternal: linkInfo.isInternal,
                    display: urlToValidate,
                });
                // Append trimmed punctuation as plain text
                if (trailingChars) {
                    final.push({ type: "text", value: trailingChars });
                }
            } else {
                final.push({ type: "text", value: rawBare });
            }
            sCursor = sIdx + rawBare.length;
        }
        if (sCursor < segment.length) {
            final.push({ type: "text", value: segment.slice(sCursor) });
        }
    }

    /* ── Render to React nodes ── */
    return final.map((node) => {
        if (node.type === "text") return node.value;

        const key = `bl-${keyIdx++}`;
        if (node.isInternal) {
            return (
                <a key={key} href={node.href}>
                    {node.display}
                </a>
            );
        }
        return (
            <a
                key={key}
                href={node.href}
                target="_blank"
                rel="noopener noreferrer"
            >
                {node.display}
            </a>
        );
    });
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
    ld.image = post.heroImageUrl || BLOG_OG_FALLBACK;
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
    const [related, setRelated] = useState([]);
    const navigate = useNavigate();

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

    /* ── Related posts (latest excluding current) ── */
    useEffect(() => {
        if (!slug) return;
        let dead = false;
        fetch("/api/blog?page=1&limit=4")
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
            navigate(`/blog/${post.slug}`, { replace: true });
        }
    }, [post, slug, navigate]);
    /* ── Loading state ──────────────── */
    if (loading) {
        return (
            <main className={styles.blogWrap} data-page="site">
                <p className={styles.status}>טוען מאמר…</p>
            </main>
        );
    }

    /* ── Not found ──────────────────── */
    if (notFound) {
        return (
            <main className={styles.blogWrap} data-page="site">
                <p className={styles.status}>המאמר לא נמצא.</p>
                <div className={styles.backRow}>
                    <Link to="/blog" className={styles.backLink}>
                        חזרה לבלוג
                    </Link>
                </div>
            </main>
        );
    }

    /* ── Error state ────────────────── */
    if (error || !post) {
        return (
            <main className={styles.blogWrap} data-page="site">
                <p className={styles.statusError}>{error || "שגיאה בטעינה"}</p>
                <div className={styles.backRow}>
                    <Link to="/blog" className={styles.backLink}>
                        חזרה לבלוג
                    </Link>
                </div>
            </main>
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
        <main className={styles.blogWrap} data-page="site">
            <SeoHelmet
                title={seoTitle}
                description={seoDescription}
                canonicalUrl={canonicalUrl}
                url={canonicalUrl}
                image={post.heroImageUrl || BLOG_OG_FALLBACK}
                ogType="article"
                jsonLdItems={jsonLdItems}
            />
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

                        <h1 className={styles.articleTitle}>{post.title}</h1>

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

                    <img
                        className={styles.heroImage}
                        src={post.heroImageUrl || BLOG_OG_FALLBACK}
                        alt={post.heroImageAlt || post.title || ""}
                    />

                    {(post.sections || []).map((section, i) => (
                        <section key={i} className={styles.section}>
                            {section.heading && (
                                <h2 className={styles.sectionHeading}>
                                    {section.heading}
                                </h2>
                            )}
                            {section.imageUrl && (
                                <img
                                    className={styles.sectionImage}
                                    src={section.imageUrl}
                                    alt={section.imageAlt || ""}
                                    loading="lazy"
                                />
                            )}
                            {textToParagraphs(section.body).map((para, j) => (
                                <p key={j} className={styles.sectionBody}>
                                    {renderLinkedText(para)}
                                </p>
                            ))}
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

                    {related.length > 0 && (
                        <nav
                            className={styles.relatedWrap}
                            aria-label="מאמרים נוספים"
                        >
                            <h2 className={styles.relatedTitle}>עוד מאמרים</h2>
                            <div className={styles.relatedList}>
                                {related.map((r) => (
                                    <Link
                                        key={r.id}
                                        to={`/blog/${r.slug}`}
                                        className={styles.relatedItem}
                                    >
                                        <img
                                            className={styles.relatedThumb}
                                            src={
                                                r.heroImageUrl ||
                                                BLOG_THUMB_FALLBACK
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
                        <Link to="/blog" className={styles.backLink}>
                            חזרה לבלוג
                        </Link>
                    </div>
                </div>
            </article>
        </main>
    );
}
