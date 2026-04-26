import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SeoHelmet from "../../components/seo/SeoHelmet";
import styles from "./IframeReturnPage.module.css";

export default function IframeReturnPage() {
    const [searchParams] = useSearchParams();
    const rawStatus = searchParams.get("status");
    const status = rawStatus === "success" ? "success" : "fail";

    useEffect(() => {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                { type: "CARDIGO_PAYMENT_STATUS", status },
                window.location.origin,
            );
        }
    }, [status]);

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
