import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SeoHelmet from "../../components/seo/SeoHelmet";
import styles from "./IframeReturnPage.module.css";

export default function IframeReturnPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const rawStatus = searchParams.get("status");
    const status = rawStatus === "success" ? "success" : "fail";

    /* ── iframe relay path ─────────────────────────────────────────────
     * When rendered inside an iframe (CheckoutPage), relay the payment
     * status to the parent window via postMessage. CheckoutPage listens
     * for CARDIGO_PAYMENT_STATUS and owns the in-iframe success/fail UX.
     */
    useEffect(() => {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                { type: "CARDIGO_PAYMENT_STATUS", status },
                window.location.origin,
            );
        }
    }, [status]);

    /* ── top-level fallback (anti-drift) ───────────────────────────────
     * Tranzila DirectNG may navigate _top to the return URL via an
     * auto-submitted form POST → 303 → this page. In that case
     * window.parent === window and the postMessage branch above never
     * fires, leaving the user stuck indefinitely. This effect handles
     * the top-level case explicitly.
     *
     * Success navigates to card settings — mirrors CheckoutPage success.
     * Fail navigates to /pricing — mirrors the external return flow.
     * replace:true prevents a browser back-button loop.
     * clearTimeout on unmount: React StrictMode double-invoke safety.
     */
    useEffect(() => {
        if (window.parent !== window) return;
        const dest =
            status === "success"
                ? "/edit/card/settings"
                : "/pricing?payment=fail";
        const delay = status === "success" ? 2000 : 0;
        const t = setTimeout(() => navigate(dest, { replace: true }), delay);
        return () => clearTimeout(t);
    }, [status, navigate]);

    return (
        <div className={styles.page}>
            <SeoHelmet robots="noindex, nofollow" />
            <div className={styles.card}>
                <div className={styles.brandBlock} aria-label="Cardigo">
                    <picture>
                        <source
                            type="image/webp"
                            srcSet="/images/brand-logo/cardigo-logo.webp"
                        />
                        <img
                            src="/images/brand-logo/cardigo-logo.png"
                            alt="Cardigo"
                            className={styles.brandImg}
                            loading="lazy"
                            decoding="async"
                        />
                    </picture>
                </div>
                {status === "success" ? (
                    <p className={styles.text}>מעבדים את אישור התשלום...</p>
                ) : (
                    <p className={styles.text}>
                        התשלום לא הושלם. ניתן לחזור ולנסות שוב.
                    </p>
                )}
            </div>
        </div>
    );
}
