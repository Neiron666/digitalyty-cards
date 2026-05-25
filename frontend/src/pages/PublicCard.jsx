import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getCardBySlug, getCompanyCardBySlug } from "../services/cards.service";
import { trackView } from "../services/analytics.client";
import { getCardConsentState } from "../utils/cookieConsent";
import { DEFAULT_OG_IMAGE_PATH } from "../utils/seoConstants.js";
import CardOwnerConsentBanner from "../components/ui/CardOwnerConsentBanner/CardOwnerConsentBanner";
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
    const envOrigin = String(import.meta.env.VITE_PUBLIC_ORIGIN || "").trim();
    if (envOrigin) return envOrigin.replace(/\/$/, "");
    try {
        if (typeof window !== "undefined" && window.location?.origin) {
            return String(window.location.origin).trim().replace(/\/$/, "");
        }
    } catch {
        // ignore
    }
    return "";
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
    const [errorStatus, setErrorStatus] = useState(null);
    const trackedRef = useRef(false);
    const [cardConsentAllowed, setCardConsentAllowed] = useState(
        () => getCardConsentState()?.ownerTrackingAllowed ?? false,
    );

    useEffect(() => {
        async function loadCard() {
            setError(null);
            setErrorStatus(null);
            try {
                const data = orgSlug
                    ? await getCompanyCardBySlug(orgSlug, slug)
                    : await getCardBySlug(slug);
                setCard(data);
            } catch (err) {
                const status = err?.response?.status;
                if (status === 410) setError("הניסיון הסתיים");
                else setError("כרטיס לא נמצא");
                setErrorStatus(typeof status === "number" ? status : null);
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
    if (error) {
        const errorTitle =
            errorStatus === 410
                ? "הכרטיס אינו זמין | Cardigo"
                : errorStatus !== null
                  ? "הכרטיס לא נמצא | Cardigo"
                  : "שגיאה בטעינת הכרטיס | Cardigo";
        const errorDescription =
            errorStatus === 410
                ? "כרטיס הביקור הדיגיטלי אינו זמין כרגע."
                : errorStatus !== null
                  ? "כרטיס הביקור הדיגיטלי לא נמצא או שאינו פעיל."
                  : "לא ניתן לטעון את כרטיס הביקור הדיגיטלי כרגע. אנא נסה שוב מאוחר יותר.";
        return (
            <>
                <SeoHelmet
                    title={errorTitle}
                    description={errorDescription}
                    robots="noindex, nofollow"
                />
                <p>{error}</p>
            </>
        );
    }
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
        getPublicOrigin() + DEFAULT_OG_IMAGE_PATH;

    const imageAltBusinessName = String(card.business?.name || "")
        .replace(/\s+/g, " ")
        .trim();
    const imageAlt = imageAltBusinessName
        ? `${imageAltBusinessName} – Cardigo`
        : "Cardigo – כרטיס ביקור דיגיטלי לעסקים";

    const publicOrigin = getPublicOrigin();

    // Card-route canonical is always self public URL.
    // seo.canonicalUrl is ignored: cross-card and external canonicals are forbidden.
    // Use card.publicPath from DTO (SSoT for both /card/:slug and /c/:orgSlug/:slug).
    // Fallback is route-aware: org cards fall back to /c/:orgSlug/:slug, not /card/:slug.
    const selfPath =
        card.publicPath ||
        (orgSlug && card.slug
            ? `/c/${orgSlug}/${card.slug}`
            : card.slug
              ? `/card/${card.slug}`
              : "");
    const canonicalResolved = normalizeAbsoluteUrl(publicOrigin, selfPath);

    const canonicalUrl = canonicalResolved;
    const url = canonicalResolved;

    const faqJsonLd = buildFaqJsonLd(card, canonicalResolved);

    const allowTracking = getAllowTracking();
    const gtmIdNormalized = normalizeGtmId(card.seo?.gtmId);
    const gaMeasurementIdNormalized = normalizeGaMeasurementId(
        card.seo?.gaMeasurementId,
    );
    const metaPixelIdNormalized = normalizeMetaPixelId(card.seo?.metaPixelId);

    const hasOwnerThirdPartyTracker = Boolean(
        gtmIdNormalized || gaMeasurementIdNormalized || metaPixelIdNormalized,
    );

    const trackingMode =
        allowTracking && cardConsentAllowed
            ? gtmIdNormalized
                ? "gtm"
                : gaMeasurementIdNormalized
                  ? "ga"
                  : metaPixelIdNormalized
                    ? "pixel"
                    : "none"
            : "none";

    return (
        <>
            {hasOwnerThirdPartyTracker ? (
                <CardOwnerConsentBanner
                    onConsentChange={setCardConsentAllowed}
                />
            ) : null}
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
                    imageAlt={imageAlt}
                    jsonLd={card.seo?.jsonLd}
                    jsonLdItems={faqJsonLd ? [faqJsonLd] : []}
                    gtmId={cardConsentAllowed ? card.seo?.gtmId : undefined}
                    gaMeasurementId={
                        cardConsentAllowed
                            ? card.seo?.gaMeasurementId
                            : undefined
                    }
                    metaPixelId={
                        cardConsentAllowed ? card.seo?.metaPixelId : undefined
                    }
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
        </>
    );
}

export default PublicCard;
