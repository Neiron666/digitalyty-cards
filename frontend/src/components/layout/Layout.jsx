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
            <CookieConsentBanner reopenPrefs={reopenPrefs} />
        </>
    );
}
