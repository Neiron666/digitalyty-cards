import { useEffect, useId, useRef } from "react";
import styles from "./GuideVideoModal.module.css";
import useFocusTrap from "../../hooks/useFocusTrap";
import {
    validateYouTubeEmbedUrl,
    getYouTubeWatchUrlFromEmbedUrl,
} from "../../utils/guideVideoUrls";

/**
 * GuideVideoModal
 *
 * Fixed overlay that embeds a validated YouTube URL in an iframe.
 * Props:
 *   open    {boolean}  whether the modal is visible
 *   url     {string}   the URL to embed (re-validated before use)
 *   title   {string}   modal heading visible to users and screen readers
 *   onClose {function} called when the user dismisses the modal
 */
export default function GuideVideoModal({ open, url, title, onClose }) {
    const titleId = useId();
    const dialogRef = useRef(null);
    const closeBtnRef = useRef(null);

    // Re-validate the URL here even though the caller already validated it.
    // Defense-in-depth: the modal never renders a raw, unvalidated src.
    const validatedUrl = validateYouTubeEmbedUrl(url);
    const watchUrl = getYouTubeWatchUrlFromEmbedUrl(validatedUrl);

    useFocusTrap(dialogRef, open);

    // Focus the close button immediately when the modal opens.
    useEffect(() => {
        if (!open) return;
        const t = window.setTimeout(() => {
            closeBtnRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(t);
    }, [open]);

    // Escape key closes the modal.
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose?.();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            ref={dialogRef}
            className={styles.backdrop}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div className={styles.modal} dir="rtl">
                <div className={styles.header}>
                    <h2 id={titleId} className={styles.title}>
                        {title}
                    </h2>
                    {watchUrl ? (
                        <a
                            href={watchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.openLink}
                            aria-label="פתח ביוטיוב בכרטיסייה חדשה"
                        >
                            פתח ביוטיוב
                        </a>
                    ) : null}
                    <button
                        ref={closeBtnRef}
                        type="button"
                        className={styles.closeBtn}
                        aria-label="סגור"
                        onClick={() => onClose?.()}
                    >
                        ✕
                    </button>
                </div>

                <div className={styles.videoWrap}>
                    {validatedUrl ? (
                        <iframe
                            className={styles.iframe}
                            src={validatedUrl}
                            title="מדריך וידאו"
                            sandbox="allow-scripts allow-same-origin allow-presentation allow-fullscreen"
                            allow="fullscreen; picture-in-picture; accelerometer; gyroscope"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    ) : (
                        <div className={styles.urlError}>
                            לא ניתן לטעון את הסרטון. כתובת לא תקינה.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
