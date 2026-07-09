import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCardBySlug, getCompanyCardBySlug } from "../services/cards.service";
import { trackView } from "../services/analytics.client";
import { getCardConsentState } from "../utils/cookieConsent";
import { DEFAULT_OG_IMAGE_PATH } from "../utils/seoConstants.js";
import { useInitialDetailData } from "../seo/initialDetailData";
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

/* Remove Cardigo / כרדיגו platform suffix or prefix from a string intended as imageAlt.
   Only strips exact boundary patterns; internal occurrences are preserved. */
function cleanPlatformBrand(s) {
    if (!s) return "";
    let v = String(s).replace(/\s+/g, " ").trim();
    // Trailing suffix variants: " – Cardigo", " - Cardigo", " | Cardigo" and כרדיגו equivalents
    v = v.replace(/\s+[-–]\s*(?:Cardigo|כרדיגו)\s*$/i, "").trim();
    v = v.replace(/\s*\|\s*(?:Cardigo|כרדיגו)\s*$/i, "").trim();
    // Leading prefix variants: "Cardigo – ", "Cardigo - " and כרדיגו equivalents
    v = v.replace(/^(?:Cardigo|כרדיגו)\s*[-–]\s*/i, "").trim();
    return v;
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
        inLanguage: card?.language === "ru" ? "ru" : "he",
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

const SLUG_MOVED_PERSONAL_PATH_RE = /^\/card\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MOVED_ORG_PATH_RE =
    /^\/c\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isSafeSlugMovedRedirectPath(value) {
    if (typeof value !== "string") return false;
    if (!value.startsWith("/") || value.startsWith("//")) return false;
    if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
        return false;
    }

    return (
        SLUG_MOVED_PERSONAL_PATH_RE.test(value) ||
        SLUG_MOVED_ORG_PATH_RE.test(value)
    );
}

// Non-premium privacy guard: strip location-specific fields from a saved
// LocalBusiness JSON-LD string so free/downgraded cards cannot expose
// address.streetAddress, geo, latitude, or longitude in public HTML.
// Returns the sanitized JSON string on success, or the original value on any
// parse failure. Does not mutate inputs. Non-LocalBusiness items pass through.
function sanitizeLocationFieldsForNonPremiumJsonLd(rawJsonLd) {
    if (!rawJsonLd) return rawJsonLd;
    let parsed;
    try {
        parsed = JSON.parse(rawJsonLd);
    } catch {
        return rawJsonLd;
    }

    function sanitizeItem(item) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            return item;
        }
        const t = item["@type"];
        const isLocalBusiness =
            t === "LocalBusiness" ||
            (Array.isArray(t) && t.includes("LocalBusiness"));
        if (!isLocalBusiness) return item;

        // Shallow clone, then remove location-only fields.
        const {
            geo: _geo,
            latitude: _lat,
            longitude: _lng,
            address: rawAddress,
            ...rest
        } = item;
        const result = { ...rest };

        if (
            rawAddress &&
            typeof rawAddress === "object" &&
            !Array.isArray(rawAddress)
        ) {
            const { streetAddress: _sa, ...addressRest } = rawAddress;
            if (Object.keys(addressRest).length > 0) {
                result.address = addressRest;
            }
        }

        return result;
    }

    try {
        const sanitized = Array.isArray(parsed)
            ? parsed.map(sanitizeItem)
            : sanitizeItem(parsed);
        return JSON.stringify(sanitized);
    } catch {
        return rawJsonLd;
    }
}

function PublicCard() {
    const { slug, orgSlug } = useParams();

    // SSR_P3_PUBLIC_CARD_INITIAL_DATA_CONSUMPTION_MINIMAL:
    // Derive route key and consume SSR-provided initial card data from the data island.
    // Key contract: personal = card/${slug}, org = c/${orgSlug}/${slug}.
    // useInitialDetailData returns null when no data island exists (SPA navigation, local dev).
    const routeKey = orgSlug ? `c/${orgSlug}/${slug}` : `card/${slug}`;
    const initialCardData = useInitialDetailData(routeKey);

    // Seed initial state from SSR data island when present.
    // Lazy initializers run synchronously during both client mount and SSR renderToString,
    // allowing PublicCard to render past the loading guard without a client-side fetch.
    const [card, setCard] = useState(() => initialCardData ?? null);
    const [loading, setLoading] = useState(!initialCardData);
    // Track which routeKey owns the current `card` state — guards against stale renders
    // when slug/orgSlug changes before the data-loading useEffect fires.
    const [loadedRouteKey, setLoadedRouteKey] = useState(() =>
        initialCardData ? routeKey : null,
    );
    const [error, setError] = useState(null);
    const [errorStatus, setErrorStatus] = useState(null);
    const trackedRef = useRef(false);
    const navigate = useNavigate();
    const slugMovedNavigatedRef = useRef(false);
    const [cardConsentAllowed, setCardConsentAllowed] = useState(
        () => getCardConsentState()?.ownerTrackingAllowed ?? false,
    );
    const [hasEdgeFallback, setHasEdgeFallback] = useState(false);

    useEffect(() => {
        setHasEdgeFallback(
            Boolean(document.getElementById("cardigo-body-fallback")),
        );
    }, []);

    useEffect(() => {
        // If initial card data was provided for this route (via SSR data island),
        // seed state from it and skip the API fetch.
        // On SPA navigation: routeKey changes, initialCardData re-evaluates via context.
        // If initialCardData is non-null for the new key, use it; if null, fetch as before.
        if (initialCardData) {
            setCard(initialCardData);
            setLoadedRouteKey(routeKey);
            setLoading(false);
            setError(null);
            setErrorStatus(null);
            return;
        }

        // SSR_P3_RACE_ERROR_FIX: cancellation flag prevents stale async responses
        // from writing state after the effect has been cleaned up (slug/orgSlug changed).
        let cancelled = false;

        async function loadCard() {
            // Disown previous card immediately so render guard shows loading
            // on any commit that occurs before this useEffect fires.
            setLoadedRouteKey(null);
            setCard(null);
            setLoading(true);
            setError(null);
            setErrorStatus(null);
            try {
                const data = orgSlug
                    ? await getCompanyCardBySlug(orgSlug, slug)
                    : await getCardBySlug(slug);
                // Guard: discard response if this effect was already cleaned up.
                if (cancelled) return;
                slugMovedNavigatedRef.current = false;
                setCard(data);
                setLoadedRouteKey(routeKey);
            } catch (err) {
                // Guard: discard error if this effect was already cleaned up.
                if (cancelled) return;
                const status = err?.response?.status;
                const data = err?.response?.data;

                if (status === 404 && data?.code === "SLUG_MOVED") {
                    const redirectTo = data?.redirectTo;
                    const currentPath = orgSlug
                        ? `/c/${orgSlug}/${slug}`
                        : `/card/${slug}`;

                    if (
                        isSafeSlugMovedRedirectPath(redirectTo) &&
                        redirectTo !== currentPath &&
                        !slugMovedNavigatedRef.current
                    ) {
                        slugMovedNavigatedRef.current = true;
                        navigate(redirectTo, { replace: true });
                        return;
                    }
                }

                // Mark error ownership with current routeKey so stale errors
                // from previous routes are not shown under the new route.
                if (status === 410) setError("הניסיון הסתיים");
                else setError("כרטיס לא נמצא");
                setErrorStatus(typeof status === "number" ? status : null);
                setLoadedRouteKey(routeKey);
            } finally {
                // Do not clear the loading state for a stale (cancelled) request.
                if (!cancelled) setLoading(false);
            }
        }

        loadCard();
        return () => {
            cancelled = true;
        };
    }, [slug, orgSlug, navigate, initialCardData]);
    // SSR_P3_PUBLIC_CARD_ID_BACKFILL_MINIMAL:
    // card-ssr.mjs intentionally strips `_id` from the SSR data island (anti-enumeration
    // hardening — see card-ssr.mjs FORBIDDEN_TOP_LEVEL / allowlist). BookingSection and
    // LeadForm both require card._id as their public runtime identifier, so on any
    // SSR-seeded page load it stays permanently undefined without this backfill.
    // This effect never replaces the SSR-rendered card object — it only merges the
    // `_id` field in, once, via the SAME public DTO endpoints already used above for
    // non-seeded routes. It runs only after the current route's card has settled
    // (loadedRouteKey === routeKey), so it never races the primary load effect.
    useEffect(() => {
        if (!card || card._id) return;
        if (!slug) return;
        if (loadedRouteKey !== routeKey) return;

        let cancelled = false;
        const requestedSlug = slug;
        const requestedOrgSlug = orgSlug;
        const expectedPath = requestedOrgSlug
            ? `/c/${requestedOrgSlug}/${requestedSlug}`
            : `/card/${requestedSlug}`;

        async function backfillCardId() {
            try {
                const fetched = requestedOrgSlug
                    ? await getCompanyCardBySlug(
                          requestedOrgSlug,
                          requestedSlug,
                      )
                    : await getCardBySlug(requestedSlug);

                // Guard: discard response if this effect was already cleaned up
                // (route changed / component unmounted while the request was in flight).
                if (cancelled) return;

                const fetchedId =
                    typeof fetched?._id === "string" ? fetched._id.trim() : "";

                if (!/^[0-9a-fA-F]{24}$/.test(fetchedId)) {
                    return;
                }

                const normalizePublicPath = (value) =>
                    typeof value === "string" ? value.replace(/\/+$/, "") : "";

                const fetchedPath = normalizePublicPath(fetched.publicPath);

                // Identity check: the fetched DTO must resolve to the same public
                // route we requested, before its `_id` is trusted for a merge.
                if (fetchedPath && fetchedPath !== expectedPath) {
                    return;
                }

                // Merge-only update: never replace the SSR-rendered card object.
                // Re-checks identity against the LATEST card state (not the closed-over
                // `card` variable) to avoid backfilling a stale `_id` into a different card.
                setCard((prev) => {
                    if (!prev || prev._id) return prev;
                    if (
                        prev.slug &&
                        fetched.slug &&
                        prev.slug !== fetched.slug
                    ) {
                        return prev;
                    }
                    return { ...prev, _id: fetchedId };
                });
            } catch {
                // Fail-open: public rendering must never break because of a missing
                // runtime identifier. Booking/leads simply remain unavailable for
                // this session, same as before this backfill existed.
            }
        }

        backfillCardId();
        return () => {
            cancelled = true;
        };
    }, [card, slug, orgSlug, routeKey, loadedRouteKey]);

    useEffect(() => {
        if (!card?.slug || trackedRef.current) return;
        trackedRef.current = true;
        trackView(card.slug, undefined, undefined, orgSlug);
    }, [card?.slug, orgSlug]);

    useEffect(() => {
        if (!card) return;
        const fallback = document.getElementById("cardigo-body-fallback");
        if (fallback) fallback.remove();
    }, [card]);

    // Synchronous stale-render guard: show loading when card exists but belongs
    // to a previous routeKey. Prevents old card content from rendering between
    // a slug/orgSlug change and the data-loading useEffect commit.
    const hasCurrentRouteCard = Boolean(card && loadedRouteKey === routeKey);
    if (
        loading ||
        (card && !hasCurrentRouteCard) ||
        (error && loadedRouteKey !== routeKey)
    ) {
        return hasEdgeFallback ? null : <p>טוען כרטיס...</p>;
    }
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

    const title = card.seoResolved?.title || fallbackTitle;
    const description = card.seoResolved?.description || fallbackDescription;

    const image =
        card.seoResolved?.ogImage ||
        card.design?.coverImage ||
        card.design?.logo ||
        getPublicOrigin() + DEFAULT_OG_IMAGE_PATH;

    const cleanedTitle = cleanPlatformBrand(title);
    const isGenericAlt =
        !cleanedTitle ||
        cleanedTitle === "כרטיס ביקור דיגיטלי" ||
        /\s[-–]\s*כרטיס ביקור דיגיטלי$/.test(cleanedTitle);
    const imageAlt =
        card.seoResolved?.ogImageAlt ||
        (!isGenericAlt
            ? cleanedTitle
            : cleanPlatformBrand(
                  String(card.business?.name || "")
                      .replace(/\s+/g, " ")
                      .trim(),
              ) || "כרטיס ביקור דיגיטלי");

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

    const canonicalUrl = card.seoResolved?.canonicalUrl || canonicalResolved;
    const url = canonicalUrl;

    const cardOgLocale = card.language === "ru" ? "ru_RU" : "he_IL";

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
                    suppressSiteName={true}
                    ogLocale={cardOgLocale}
                    robots={card.seoResolved?.robots || card.seo?.robots}
                    googleSiteVerification={card.seo?.googleSiteVerification}
                    facebookDomainVerification={
                        card.seo?.facebookDomainVerification
                    }
                    canonicalUrl={canonicalUrl}
                    url={url}
                    image={image}
                    imageAlt={imageAlt}
                    jsonLd={
                        card?.entitlements?.canUseServices === true
                            ? card.seo?.jsonLd
                            : sanitizeLocationFieldsForNonPremiumJsonLd(
                                  card.seo?.jsonLd,
                              )
                    }
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
