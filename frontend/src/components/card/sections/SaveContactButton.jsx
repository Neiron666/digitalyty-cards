import styles from "./SaveContactButton.module.css";

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

    function escapeVCardText(value = "") {
        return String(value)
            .replace(/\\/g, "\\\\")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "")
            .replace(/;/g, "\\;")
            .replace(/,/g, "\\,");
    }

    async function handleShare() {
        if (card?.status !== "published") return;
        const shareTitle = card?.seo?.title || businessName || "";
        const shareUrl = card?.slug
            ? `${window.location.origin}/og/card/${card.slug}`
            : window.location.href;

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
        <div className={styles.actions}>
            {card?.status === "published" && (
                <button
                    type="button"
                    onClick={handleShare}
                    className={styles.button}
                >
                    <span
                        className={`${styles.icon} ${styles.iconShare}`}
                        aria-hidden="true"
                    />
                    שתף
                </button>
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
