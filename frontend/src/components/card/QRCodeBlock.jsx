import { useMemo, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Section from "./sections/Section";
import styles from "./QRCodeBlock.module.css";

function isAbsoluteUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
}

export default function QRCodeBlock({ slug, publicPath }) {
    const wrapRef = useRef(null);

    const url = useMemo(() => {
        if (typeof window === "undefined") return "";
        const origin = window.location.origin;

        const raw = typeof publicPath === "string" ? publicPath.trim() : "";
        if (raw) {
            if (isAbsoluteUrl(raw)) {
                if (raw.startsWith(origin)) return raw;
                // Unsafe: absolute URL to a different origin is ignored.
                // Fall through to slug-based URL.
            } else {
                const normalized = raw.startsWith("/") ? raw : `/${raw}`;
                return `${origin}${normalized}`;
            }
        }

        if (!slug) return "";
        return `${origin}/card/${slug}`;
    }, [slug, publicPath]);

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
