import styles from "./SaveContactButton.module.css";

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

function normalizeAbsoluteUrl(origin, value) {
    const rawValue = typeof value === "string" ? value.trim() : "";
    if (!rawValue) return "";
    if (/^https?:\/\//i.test(rawValue)) return rawValue;

    const safeOrigin = typeof origin === "string" ? origin.trim() : "";
    const originTrimmed = safeOrigin.replace(/\/$/, "");
    if (!originTrimmed) return rawValue;

    if (rawValue.startsWith("/")) return `${originTrimmed}${rawValue}`;
    return `${originTrimmed}/${rawValue}`;
}

function deriveOgPathFromPublicPath(publicPath) {
    const p = typeof publicPath === "string" ? publicPath.trim() : "";
    if (!p) return "";
    if (p.startsWith("/c/")) return `/og${p}`;
    if (p.startsWith("/card/")) return `/og${p}`;
    return "";
}

function SaveContactButton({ card }) {
    const { business, contact } = card;

    const businessName =
        business?.name || business?.businessName || business?.ownerName || "";
    const orgName = business?.name || business?.businessName || "";

    const phone =
        contact?.phone ||
        contact?.mobilePhone ||
        contact?.mobile ||
        contact?.officePhone ||
        "";

    const email = contact?.email || "";
    const website = contact?.website || "";

    // SSoT-only: share URL must come from ogPath/publicPath. No guessing fallbacks.
    const shareOrigin = getPublicOrigin();
    const ogPath = typeof card?.ogPath === "string" ? card.ogPath.trim() : "";
    const publicPathRaw =
        typeof card?.publicPath === "string" ? card.publicPath.trim() : "";
    const derivedOgPath = deriveOgPathFromPublicPath(publicPathRaw);
    const shareUrl = ogPath
        ? normalizeAbsoluteUrl(shareOrigin, ogPath)
        : derivedOgPath
          ? normalizeAbsoluteUrl(shareOrigin, derivedOgPath)
          : "";
    const published = card?.status === "published";
    const canShare = published && Boolean(shareUrl);

    function escapeVCardText(value = "") {
        return String(value)
            .replace(/\\/g, "\\\\")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "")
            .replace(/;/g, "\\;")
            .replace(/,/g, "\\,");
    }

    async function handleShare() {
        if (!canShare) return;
        const shareTitle = card?.seo?.title || businessName || "";

        try {
            if (navigator.share) {
                await navigator.share({
                    title: shareTitle,
                    url: shareUrl,
                });
                return;
            }

            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                alert("הקישור הועתק");
                return;
            }

            alert(shareUrl);
        } catch {
            // user cancelled / blocked
        }
    }

    function downloadVCard() {
        const lines = [
            "BEGIN:VCARD",
            "VERSION:3.0",
            businessName ? `FN:${escapeVCardText(businessName)}` : "",
            orgName ? `ORG:${escapeVCardText(orgName)}` : "",
            phone ? `TEL:${escapeVCardText(phone)}` : "",
            email ? `EMAIL:${escapeVCardText(email)}` : "",
            website ? `URL:${escapeVCardText(website)}` : "",
            "END:VCARD",
        ].filter(Boolean);

        const vcard = lines.join("\r\n");

        const blob = new Blob([vcard], { type: "text/vcard" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        const safeName = (businessName || card.slug || "contact")
            .toLowerCase()
            .replace(/[^a-z0-9\-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 60);
        a.download = `${safeName || "contact"}.vcf`;
        a.click();

        URL.revokeObjectURL(url);
    }

    return (
        <div className={`${styles.actions}`}>
            <button
                type="button"
                onClick={handleShare}
                disabled={!canShare}
                className={`${styles.button} ${styles.actionShare}`}
                title={
                    !canShare
                        ? !published
                            ? "אפשר לשתף רק אחרי פרסום הכרטיס"
                            : "קישור לשיתוף לא זמין כרגע"
                        : undefined
                }
            >
                <span
                    className={`${styles.icon} ${styles.iconShare}`}
                    aria-hidden="true"
                />
                שתף
            </button>
            {!canShare && (
                <div className={styles.shareHint}>
                    {!published
                        ? "אפשר לשתף רק אחרי פרסום הכרטיס."
                        : "קישור לשיתוף לא זמין כרגע."}
                </div>
            )}

            <button
                type="button"
                onClick={downloadVCard}
                className={styles.button}
            >
                <span
                    className={`${styles.icon} ${styles.iconSave}`}
                    aria-hidden="true"
                />
                שמור אותי באנשי קשר
            </button>
        </div>
    );
}

export default SaveContactButton;
