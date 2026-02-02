import { useMemo, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Section from "./sections/Section";
import styles from "./QRCodeBlock.module.css";

function detectOrgSlugFromPathname() {
    try {
        if (typeof window === "undefined") return "";
        const path = String(window.location?.pathname || "");
        const m = path.match(/^\/c\/([^/]+)\//i);
        return m && m[1] ? decodeURIComponent(m[1]).trim().toLowerCase() : "";
    } catch {
        return "";
    }
}

export default function QRCodeBlock({ slug }) {
    const wrapRef = useRef(null);

    const url = useMemo(() => {
        if (!slug) return "";
        if (typeof window === "undefined") return "";
        const orgSlug = detectOrgSlugFromPathname();
        return orgSlug
            ? `${window.location.origin}/c/${orgSlug}/${slug}`
            : `${window.location.origin}/card/${slug}`;
    }, [slug]);

    function handleDownload() {
        const canvas = wrapRef.current?.querySelector("canvas");
        if (!canvas) return;

        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `qr-${slug || "card"}.png`;
        a.click();
    }

    if (!slug) return null;

    return (
        <Section>
            <div className={styles.wrap} ref={wrapRef}>
                <div className={styles.code}>
                    <QRCodeCanvas value={url} size={160} includeMargin />
                </div>

                <button
                    type="button"
                    className={styles.download}
                    onClick={handleDownload}
                >
                    הורד QR
                </button>
            </div>
        </Section>
    );
}
