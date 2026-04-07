import { useMemo, useState } from "react";
import styles from "./CardFooter.module.css";
import { trackClick } from "../../../services/analytics.client";
import useInstallPrompt from "../../../hooks/useInstallPrompt";

// SSoT: same field priority as getDisplayName in CardLayout.jsx
function getBrandName(card) {
    return (
        card?.business?.name ||
        card?.business?.businessName ||
        card?.business?.ownerName ||
        ""
    );
}

// SSoT: same derivation pattern as QRCodeBlock.jsx
function isAbsoluteUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
}

function buildShareUrl(publicPath) {
    if (typeof window === "undefined") return "";
    const raw = typeof publicPath === "string" ? publicPath.trim() : "";
    if (!raw) return "";
    const origin = window.location.origin;
    if (isAbsoluteUrl(raw)) {
        return raw.startsWith(origin) ? raw : "";
    }
    const normalized = raw.startsWith("/") ? raw : `/${raw}`;
    return `${origin}${normalized}`;
}

// Best-effort clipboard copy - does not block primary link navigation
function tryCopyToClipboard(url) {
    if (!url) return;
    try {
        if (
            typeof navigator !== "undefined" &&
            typeof navigator.clipboard?.writeText === "function"
        ) {
            navigator.clipboard.writeText(url).catch(() => {});
        }
    } catch {
        // best effort - ignore
    }
}

function CardFooter({ card }) {
    const brandName = getBrandName(card);

    const {
        canPrompt,
        triggerPrompt,
        isInstalled,
        isIOS,
        isSafari,
        isInAppBrowser,
        showIOSGuide,
    } = useInstallPrompt();

    const [installHelpHl, setInstallHelpHl] = useState(false);

    const shareUrl = useMemo(
        () => buildShareUrl(card?.publicPath),
        [card?.publicPath],
    );

    const facebookShareHref = shareUrl
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        : null;

    const emailShareHref = shareUrl
        ? `mailto:?body=${encodeURIComponent(shareUrl)}`
        : null;

    const waShareHref = shareUrl
        ? `https://wa.me/?text=${encodeURIComponent(shareUrl)}`
        : null;

    return (
        <footer className={styles.footer}>
            {shareUrl && (
                <div className={styles.shareBlock}>
                    <p className={styles.shareTitle}>
                        {brandName ? `שתפו את ${brandName}` : "שתפו"}
                    </p>

                    <div
                        className={styles.shareRow}
                        role="group"
                        aria-label="שיתוף הכרטיס"
                    >
                        <a
                            href={facebookShareHref}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={styles.shareIcon}
                            aria-label="שתף בפייסבוק"
                            onClick={() => {
                                tryCopyToClipboard(shareUrl);
                                trackClick(card?.slug, "facebook");
                            }}
                        >
                            <span
                                className={styles.iconFacebook}
                                aria-hidden="true"
                            />
                        </a>

                        <a
                            href={emailShareHref}
                            className={styles.shareIcon}
                            aria-label="שתף במייל"
                            onClick={() => {
                                tryCopyToClipboard(shareUrl);
                                trackClick(card?.slug, "email");
                            }}
                        >
                            <span
                                className={styles.iconEmail}
                                aria-hidden="true"
                            />
                        </a>

                        <a
                            href={waShareHref}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={styles.shareIcon}
                            aria-label="שתף בוואטסאפ"
                            onClick={() => {
                                tryCopyToClipboard(shareUrl);
                                trackClick(card?.slug, "whatsapp");
                            }}
                        >
                            <span
                                className={styles.iconWhatsapp}
                                aria-hidden="true"
                            />
                        </a>
                    </div>
                </div>
            )}

            <a
                href="https://cardigo.co.il"
                target="_blank"
                rel="noreferrer"
                className={styles.logoWrap}
            >
                <picture>
                    <source
                        srcSet="/images/brand-logo/cardigo-logo.webp"
                        type="image/webp"
                    />
                    <img
                        src="/images/brand-logo/cardigo-logo-512.png"
                        alt="Cardigo"
                        className={styles.logoImg}
                        width="80"
                        height="28"
                        loading="lazy"
                        decoding="async"
                    />
                </picture>
            </a>

            <p className={styles.promo}>
                נבנה ב־
                <a
                    href="https://cardigo.co.il"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.promoLink}
                >
                    Cardigo
                </a>
                {" - הדרך החכמה לכרטיס ביקור דיגיטלי מקצועי"}
            </p>

            <InstallRow
                canPrompt={canPrompt}
                triggerPrompt={triggerPrompt}
                isInstalled={isInstalled}
                isIOS={isIOS}
                isSafari={isSafari}
                isInAppBrowser={isInAppBrowser}
                showIOSGuide={showIOSGuide}
                highlighted={installHelpHl}
                onToggleHighlight={() => setInstallHelpHl((v) => !v)}
            />
        </footer>
    );
}

function InstallRow({
    canPrompt,
    triggerPrompt,
    isInstalled,
    isIOS,
    isSafari,
    isInAppBrowser,
    showIOSGuide,
    highlighted,
    onToggleHighlight,
}) {
    let helpText;
    if (isInstalled) {
        helpText = "✓ Cardigo מותקן במכשיר שלכם";
    } else if (canPrompt) {
        helpText = null;
    } else if (showIOSGuide) {
        helpText = "להתקנה: לחצו על שיתוף ▸ הוסף למסך הבית";
    } else if (isInAppBrowser || (isIOS && !isSafari)) {
        helpText = "פתחו ב־Safari להתקנה כאפליקציה";
    } else {
        helpText = "אם חלון ההתקנה לא נפתח, אפשר להתקין דרך תפריט הדפדפן";
    }

    function handleClick() {
        if (canPrompt) {
            triggerPrompt();
            return;
        }
        onToggleHighlight();
    }

    const helpClass =
        highlighted && helpText
            ? `${styles.installHelp} ${styles.installHelpHl}`
            : styles.installHelp;

    return (
        <div className={styles.installRow}>
            <button
                type="button"
                className={styles.installBtn}
                onClick={handleClick}
            >
                התקינו את Cardigo
            </button>
            {helpText && <p className={helpClass}>{helpText}</p>}
        </div>
    );
}

export default CardFooter;
