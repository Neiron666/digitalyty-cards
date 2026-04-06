import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import CookieConsentBanner from "../ui/CookieConsentBanner/CookieConsentBanner";
import styles from "./Layout.module.css";

export default function Layout() {
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
            <Footer />
            <CookieConsentBanner />
        </>
    );
}
