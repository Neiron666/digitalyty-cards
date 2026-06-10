import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
    getConsentState,
    pushConsentToDataLayer,
} from "../../utils/cookieConsent";
import Header from "./Header";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import CookieConsentBanner from "../ui/CookieConsentBanner/CookieConsentBanner";
import FloatingWhatsAppCta from "../marketing/FloatingWhatsAppCta";
import PromoPopup from "../marketing/PromoPopup";
import styles from "./Layout.module.css";

// Routes approved for site-level ad-measurement consent push.
// Only these pages contribute to Cardigo marketing audiences / retargeting.
// Auth, product, legal, admin, and public-card routes are intentionally excluded.
const AD_MEASUREMENT_PATHS = [
    "/",
    "/cards",
    "/pricing",
    "/contact",
    "/blog",
    "/guides",
];

function isApprovedAdPath(pathname) {
    return AD_MEASUREMENT_PATHS.some(
        (p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")),
    );
}

// WhatsApp CTA route guard – exact allowlist + pagination regex.
// Do NOT use isApprovedAdPath: startsWith would include /blog/:slug and /guides/:slug.
const WHATSAPP_CTA_EXACT = new Set([
    "/",
    "/cards",
    "/pricing",
    "/contact",
    "/blog",
    "/guides",
]);
const WHATSAPP_CTA_PAGINATION = [
    /^\/blog\/page\/\d+$/,
    /^\/guides\/page\/\d+$/,
];

function shouldShowMarketingWhatsAppCta(pathname) {
    const normalized = pathname.replace(/\/+$/, "") || "/";
    if (WHATSAPP_CTA_EXACT.has(normalized)) return true;
    return WHATSAPP_CTA_PAGINATION.some((re) => re.test(normalized));
}

// Promo popup route guard — explicit allowlist.
// Eligible: marketing pages + blog/guide posts and pagination.
// Excluded: all auth, product, editor, admin, legal, card routes.
const PROMO_POPUP_EXACT = new Set([
    "/",
    "/cards",
    "/pricing",
    "/contact",
    "/blog",
    "/guides",
]);
const PROMO_POPUP_PREFIX = ["/blog/", "/guides/"];

function shouldShowPromoPopup(pathname) {
    const normalized = pathname.replace(/\/+$/, "") || "/";
    if (PROMO_POPUP_EXACT.has(normalized)) return true;
    return PROMO_POPUP_PREFIX.some((p) => pathname.startsWith(p));
}

export default function Layout() {
    const [reopenPrefs, setReopenPrefs] = useState(0);
    const handleOpenPrivacyPrefs = useCallback(
        () => setReopenPrefs((n) => n + 1),
        [],
    );
    const location = useLocation();

    useEffect(() => {
        if (!isApprovedAdPath(location.pathname)) return;
        const state = getConsentState();
        if (state) pushConsentToDataLayer(state);
    }, [location.pathname]);

    return (
        <>
            <a href="#main-content" className={styles.skipLink}>
                דלג לתוכן הראשי
            </a>
            <ScrollToTop />
            <Header />
            <div id="main-content" tabIndex={-1}>
                <Outlet />
            </div>
            <Footer onOpenPrivacyPrefs={handleOpenPrivacyPrefs} />
            {shouldShowMarketingWhatsAppCta(location.pathname) && (
                <FloatingWhatsAppCta />
            )}
            <CookieConsentBanner reopenPrefs={reopenPrefs} />
            {shouldShowPromoPopup(location.pathname) && <PromoPopup />}
        </>
    );
}
