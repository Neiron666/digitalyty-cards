import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (pathname.startsWith("/edit")) return;
        if (hash) {
            const el = document.getElementById(hash.slice(1));
            if (el) {
                el.scrollIntoView({ behavior: "auto" });
                return;
            }
        }
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, [pathname, hash]);

    return null;
}
