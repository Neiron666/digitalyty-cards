import { useMemo, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Section from "./sections/Section";
import { getPublicCardLabels } from "../../utils/publicCardLabels";
import styles from "./QRCodeBlock.module.css";

function isAbsoluteUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
}

// SSR-safe origin resolution (mirrors SaveContactButton.getPublicOrigin):
// env-first so SSR and client compute the same QR URL and render identically.
// window.location.origin is only a client-side fallback. Never throws.
function getPublicOrigin() {
    const raw = import.meta.env.VITE_PUBLIC_ORIGIN;
    if (typeof raw === "string" && raw.trim())
        return raw.trim().replace(/\/$/, "");
    try {
        if (typeof window !== "undefined" && window.location?.origin)
            return String(window.location.origin).trim().replace(/\/$/, "");
    } catch {
        // ignore
    }
    return "";
}

export default function QRCodeBlock({ slug, publicPath, language }) {
    const wrapRef = useRef(null);
    const labels = getPublicCardLabels(language);

    // SSoT: URL comes ONLY from backend DTO publicPath - no fallback guessing.
    // Origin is resolved env-first (VITE_PUBLIC_ORIGIN) so SSR and client render
    // the identical QR section on first render, preventing hydration mismatch.
    const url = useMemo(() => {
        const origin = getPublicOrigin();
        if (!origin) return "";

        const raw = typeof publicPath === "string" ? publicPath.trim() : "";
        if (!raw) return "";

        if (isAbsoluteUrl(raw)) {
            if (raw.startsWith(origin)) return raw;
            return "";
        }

        const normalized = raw.startsWith("/") ? raw : `/${raw}`;
        return `${origin}${normalized}`;
    }, [publicPath]);

    function handleDownload() {
        const canvas = wrapRef.current?.querySelector("canvas");
        if (!canvas) return;

        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `qr-${slug || "card"}.png`;
        a.click();
    }

    if (!url) return null;

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
                    {labels.downloadQr}
                </button>
            </div>
        </Section>
    );
}
