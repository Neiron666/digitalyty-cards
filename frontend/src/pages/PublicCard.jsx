import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getCardBySlug } from "../services/cards.service";
import { trackView } from "../services/analytics.client";
import CardRenderer from "../components/card/CardRenderer";
import SeoHelmet from "../components/seo/SeoHelmet";
import styles from "./PublicCardPage.module.css";

function toPlainText(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function buildFaqJsonLd(card, canonicalUrl) {
    const faq = card?.faq && typeof card.faq === "object" ? card.faq : null;
    const rawItems = Array.isArray(faq?.items) ? faq.items : [];

    const items = rawItems
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const q = toPlainText(item.q);
            const a = toPlainText(item.a);
            if (!q || !a) return null;
            return { q, a };
        })
        .filter(Boolean);

    if (!items.length) return null;

    const idBase = typeof canonicalUrl === "string" ? canonicalUrl.trim() : "";
    const faqId = idBase ? `${idBase}#faq` : undefined;

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        ...(faqId ? { "@id": faqId } : {}),
        mainEntity: items.map((it) => ({
            "@type": "Question",
            name: it.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: it.a,
            },
        })),
    };
}

function getPublicOrigin() {
    const raw = import.meta?.env?.VITE_PUBLIC_ORIGIN;
    if (typeof raw !== "string") return "";
    return raw.trim().replace(/\/$/, "");
}

function PublicCard() {
    const { slug } = useParams();
    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const trackedRef = useRef(false);

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

    useEffect(() => {
        if (!card?.slug || trackedRef.current) return;
        trackedRef.current = true;
        trackView(card.slug);
    }, [card?.slug]);

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

    const publicOrigin = getPublicOrigin();
    const urlPath = `/card/${card.slug}`;
    const url = publicOrigin ? `${publicOrigin}${urlPath}` : urlPath;

    const canonicalUrl = card.seo?.canonicalUrl || url;
    const faqJsonLd = buildFaqJsonLd(card, canonicalUrl);

    return (
        <div className={styles.publicPage}>
            <SeoHelmet
                title={title}
                description={description}
                canonicalUrl={canonicalUrl}
                url={url}
                image={image}
                jsonLd={card.seo?.jsonLd}
                jsonLdItems={faqJsonLd ? [faqJsonLd] : []}
            />

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
