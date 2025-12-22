import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getCardBySlug } from "../services/cards.service";
import CardRenderer from "../components/card/CardRenderer";
import styles from "./PublicCardPage.module.css";

function PublicCard() {
    const { slug } = useParams();
    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadCard() {
            try {
                const data = await getCardBySlug(slug);
                setCard(data);
            } catch (err) {
                const status = err?.response?.status;
                if (status === 410) setError("הניסיון הסתיים");
                else setError("כרטיס לא נמצא");
            } finally {
                setLoading(false);
            }
        }

        loadCard();
    }, [slug]);

    if (loading) return <p>טוען כרטיס...</p>;
    if (error) return <p>{error}</p>;
    if (!card) return null;

    function handleUpgrade() {
        window.location.href = "/pricing";
    }

    const fallbackTitle = card.business?.name
        ? `${card.business.name} – כרטיס ביקור דיגיטלי`
        : "כרטיס ביקור דיגיטלי";

    const fallbackDescription =
        card.content?.description?.slice(0, 160) ||
        card.content?.aboutText?.slice(0, 160) ||
        "כרטיס ביקור דיגיטלי לעסקים – Digitalyty";

    const title = card.seo?.title || fallbackTitle;
    const description = card.seo?.description || fallbackDescription;

    const image =
        card.design?.coverImage ||
        card.design?.logo ||
        "https://digitalyty.co.il/og-default.jpg";

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/card/${card.slug}`;

    return (
        <div className={styles.publicPage}>
            <Helmet>
                <title>{title}</title>
                <meta name="description" content={description} />

                <link rel="canonical" href={url} />

                {/* OpenGraph */}
                <meta property="og:type" content="website" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:image" content={image} />
                <meta property="og:url" content={url} />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content={image} />
            </Helmet>

            <div className={styles.publicContainer}>
                <CardRenderer
                    card={card}
                    onUpgrade={handleUpgrade}
                    mode="public"
                />
            </div>
        </div>
    );
}

export default PublicCard;
