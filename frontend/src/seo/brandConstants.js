// Cardigo — Brand entity constants and schema builders (Organization SSoT)
// Pure ESM: no React, no JSX, no CSS, no browser-only APIs, no side effects.
// Safe for frontend (Vite) imports. import.meta.env is resolved at build time.
// Do NOT import from this file inside Netlify Edge Functions — use
// marketingMeta.config.js for edge-compatible brand data.

const _ORIGIN = (
    import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il"
).replace(/\/$/, "");

export const CARDIGO_SITE_ORIGIN = _ORIGIN;

export const CARDIGO_ORGANIZATION_ID = `${_ORIGIN}/#organization`;

export const CARDIGO_BRAND_NAME = "Cardigo";

export const CARDIGO_BRAND_ALTERNATE_NAME = "כרדיגו";

export const CARDIGO_BRAND_DESCRIPTION =
    "Cardigo היא פלטפורמה ליצירת כרטיסי ביקור דיגיטליים ודפים עסקיים לעסקים, עצמאים ונותני שירות.";

export const CARDIGO_BRAND_EMAIL = "support@cardigo.co.il";

export const CARDIGO_BRAND_TELEPHONE = "+972545811900";

export const CARDIGO_INSTAGRAM_URL = "https://www.instagram.com/cardigo.app/";

export const CARDIGO_FACEBOOK_URL = "https://www.facebook.com/cardigo.cards";

export const CARDIGO_SAME_AS = Object.freeze([
    CARDIGO_INSTAGRAM_URL,
    CARDIGO_FACEBOOK_URL,
]);

export const CARDIGO_LOGO_URL = `${_ORIGIN}/images/brand-logo/cardigo-logo.png`;

// Verified dimensions: 854×323 px
// Source: frontend/public/images/brand-logo/cardigo-logo.png
export const CARDIGO_LOGO_IMAGE_OBJECT = Object.freeze({
    "@type": "ImageObject",
    url: CARDIGO_LOGO_URL,
    width: 854,
    height: 323,
});

/**
 * Builds the full Cardigo Organization JSON-LD block.
 * Used as a top-level JSON-LD script on the homepage.
 * Returns a plain object safe for JSON.stringify / SeoHelmet jsonLdItems.
 */
export function buildCardigoOrganizationJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": CARDIGO_ORGANIZATION_ID,
        name: CARDIGO_BRAND_NAME,
        alternateName: CARDIGO_BRAND_ALTERNATE_NAME,
        url: `${_ORIGIN}/`,
        description: CARDIGO_BRAND_DESCRIPTION,
        logo: { ...CARDIGO_LOGO_IMAGE_OBJECT },
        sameAs: [...CARDIGO_SAME_AS],
        email: CARDIGO_BRAND_EMAIL,
        telephone: CARDIGO_BRAND_TELEPHONE,
        contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            telephone: CARDIGO_BRAND_TELEPHONE,
            email: CARDIGO_BRAND_EMAIL,
        },
    };
}

/**
 * Builds a compact Cardigo Organization reference for use as the
 * `publisher` field inside BlogPosting / Article JSON-LD.
 * Does NOT include @context — nested objects must not repeat context.
 * Links to the homepage Organization block via @id.
 */
export function buildCardigoPublisherJsonLd() {
    return {
        "@type": "Organization",
        "@id": CARDIGO_ORGANIZATION_ID,
        name: CARDIGO_BRAND_NAME,
        url: `${_ORIGIN}/`,
        logo: { ...CARDIGO_LOGO_IMAGE_OBJECT },
    };
}
