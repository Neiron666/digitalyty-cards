import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Page from "../components/page/Page";
import SeoHelmet from "../components/seo/SeoHelmet";
import { trackSitePageView } from "../services/siteAnalytics.client";
import styles from "./Blog.module.css";

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";
const PAGE_LIMIT = 12;

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

export default function Blog() {
    const [posts, setPosts] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                    `/api/blog?page=${page}&limit=${PAGE_LIMIT}`,
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
    }, [page]);

    const totalPages = Math.ceil(total / PAGE_LIMIT);

    return (
        <>
            <SeoHelmet
                title="בלוג | Cardigo"
                description="מאמרים, טיפים ועדכונים בנושא כרטיסי ביקור דיגיטליים ונטוורקינג."
                canonicalUrl={`${ORIGIN}/blog`}
                url={`${ORIGIN}/blog`}
            />
            <Page title="בלוג" subtitle="מאמרים, טיפים ועדכונים">
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
                                {post.heroImageUrl && (
                                    <img
                                        className={styles.cardImage}
                                        src={post.heroImageUrl}
                                        alt={
                                            post.heroImageAlt ||
                                            post.title ||
                                            ""
                                        }
                                        loading="lazy"
                                    />
                                )}
                                <div className={styles.cardBody}>
                                    {post.publishedAt && (
                                        <time
                                            className={styles.cardDate}
                                            dateTime={post.publishedAt}
                                        >
                                            {formatDate(post.publishedAt)}
                                        </time>
                                    )}
                                    <h2 className={styles.cardTitle}>
                                        <Link to={`/blog/${post.slug}`}>
                                            {post.title}
                                        </Link>
                                    </h2>
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
                        {page > 1 && (
                            <button
                                className={styles.pageBtn}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                הקודם
                            </button>
                        )}
                        <span className={styles.pageInfo}>
                            {page} / {totalPages}
                        </span>
                        {page < totalPages && (
                            <button
                                className={styles.pageBtn}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                הבא
                            </button>
                        )}
                    </nav>
                )}
            </Page>
        </>
    );
}
