import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getCardBySlug, getCompanyCardBySlug } from "../services/cards.service";
import { trackView } from "../services/analytics.client";
import CardRenderer from "../components/card/CardRenderer";
import SeoHelmet, {
    getAllowTracking,
    normalizeGaMeasurementId,
    normalizeGtmId,
    normalizeMetaPixelId,
} from "../components/seo/SeoHelmet";
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

    const canonicalResolved =
        typeof canonicalUrl === "string" ? canonicalUrl.trim() : "";
    const faqId = canonicalResolved ? `${canonicalResolved}#faq` : undefined;
    const isPartOf = canonicalResolved
        ? { "@id": canonicalResolved }
        : undefined;

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        ...(faqId ? { "@id": faqId } : {}),
        ...(canonicalResolved ? { url: canonicalResolved } : {}),
        // TODO: bind to card.locale/lang when contract is introduced.
        inLanguage: "he",
        ...(isPartOf ? { isPartOf } : {}),
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
    const raw = import.meta.env.VITE_PUBLIC_ORIGIN;
    if (typeof raw !== "string") return "";
    return raw.trim().replace(/\/$/, "");
}

function isAbsoluteUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
}

function isValidAbsoluteHttpUrl(value) {
    const v = typeof value === "string" ? value.trim() : "";
    if (!v) return false;
    try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

function normalizeAbsoluteUrl(origin, value) {
    const rawValue = typeof value === "string" ? value.trim() : "";
    if (!rawValue) return "";
    if (isAbsoluteUrl(rawValue)) return rawValue;

    const safeOrigin = typeof origin === "string" ? origin.trim() : "";
    const originTrimmed = safeOrigin.replace(/\/$/, "");
    if (!originTrimmed) return rawValue;

    if (rawValue.startsWith("/")) return `${originTrimmed}${rawValue}`;
    return `${originTrimmed}/${rawValue}`;
}

function PublicCard() {
    const { slug, orgSlug } = useParams();
    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const trackedRef = useRef(false);

    useEffect(() => {
        async function loadCard() {
            try {
                const data = orgSlug
                    ? await getCompanyCardBySlug(orgSlug, slug)
                    : await getCardBySlug(slug);
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
    }, [slug, orgSlug]);

    useEffect(() => {
        if (!card?.slug || trackedRef.current) return;
        trackedRef.current = true;
        trackView(card.slug, undefined, undefined, orgSlug);
    }, [card?.slug, orgSlug]);

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
        "כרטיס ביקור דיגיטלי לעסקים – Cardigo";

    const title = card.seo?.title || fallbackTitle;
    const description = card.seo?.description || fallbackDescription;

    const image =
        card.design?.coverImage ||
        card.design?.logo ||
        "https://cardigo.co.il/og-default.jpg";

    const publicOrigin = getPublicOrigin();
    const seoCanonicalCandidate =
        typeof card.seo?.canonicalUrl === "string"
            ? card.seo.canonicalUrl.trim()
            : "";

    const canonicalResolved = isValidAbsoluteHttpUrl(seoCanonicalCandidate)
        ? seoCanonicalCandidate
        : normalizeAbsoluteUrl(
              publicOrigin,
              card.publicPath || (card.slug ? `/card/${card.slug}` : ""),
          );

    const canonicalUrl = canonicalResolved;
    const url = canonicalResolved;

    const faqJsonLd = buildFaqJsonLd(card, canonicalResolved);

    const allowTracking = getAllowTracking();
    const gtmIdNormalized = normalizeGtmId(card.seo?.gtmId);
    const gaMeasurementIdNormalized = normalizeGaMeasurementId(
        card.seo?.gaMeasurementId,
    );
    const metaPixelIdNormalized = normalizeMetaPixelId(card.seo?.metaPixelId);

    const trackingMode = allowTracking
        ? gtmIdNormalized
            ? "gtm"
            : gaMeasurementIdNormalized
              ? "ga"
              : metaPixelIdNormalized
                ? "pixel"
                : "none"
        : "none";

    return (
        <div className={styles.publicPage}>
            <SeoHelmet
                title={title}
                description={description}
                robots={card.seo?.robots}
                googleSiteVerification={card.seo?.googleSiteVerification}
                facebookDomainVerification={
                    card.seo?.facebookDomainVerification
                }
                canonicalUrl={canonicalUrl}
                url={url}
                image={image}
                jsonLd={card.seo?.jsonLd}
                jsonLdItems={faqJsonLd ? [faqJsonLd] : []}
                gtmId={card.seo?.gtmId}
                gaMeasurementId={card.seo?.gaMeasurementId}
                metaPixelId={card.seo?.metaPixelId}
            />

            {trackingMode === "gtm" ? (
                <noscript>
                    <iframe
                        title="GTM"
                        src={`https://www.googletagmanager.com/ns.html?id=${gtmIdNormalized}`}
                        height="0"
                        width="0"
                        frameBorder="0"
                        hidden
                        aria-hidden="true"
                    />
                </noscript>
            ) : null}

            {trackingMode === "pixel" ? (
                <noscript>
                    <img
                        alt=""
                        height="1"
                        width="1"
                        src={`https://www.facebook.com/tr?id=${metaPixelIdNormalized}&ev=PageView&noscript=1`}
                    />
                </noscript>
            ) : null}

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
