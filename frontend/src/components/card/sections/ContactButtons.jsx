import styles from "../layout/ContactButtons.module.css";
import { trackClick } from "../../../services/analytics.client";
import ensureHttpUrl from "../../../utils/ensureHttpUrl";
import {
    normalizeForTel,
    normalizeForWaMe,
} from "../../../utils/phoneNormalize";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const WA_PREFILL_TEXT = "היי, הגעתי אליך דרך הכרטיס הדיגיטלי שלך ב-Cardigo 👋";

const CUSTOM_ACTION_TYPES_ALLOWED = new Set([
    "phone",
    "whatsapp",
    "address",
    "email",
    "facebook",
    "website",
    "url",
]);

// Maps actionType to CSS Module class name string.
// Resolved at render via styles[name]; falls back to styles.iconLink.
const CUSTOM_ACTION_ICON_NAMES = {
    phone: "iconPhone",
    whatsapp: "iconWhatsapp",
    address: "iconAddress",
    email: "iconEmail",
    facebook: "iconFacebook",
    website: "iconWebsite",
    url: "iconLink",
};

function buildCustomActionHref(actionType, target) {
    if (!target) return "";
    switch (actionType) {
        case "phone": {
            const normalized = normalizeForTel(target);
            return normalized ? `tel:${normalized}` : "";
        }
        case "whatsapp": {
            const normalized = normalizeForWaMe(target);
            return normalized
                ? `https://wa.me/${normalized}?text=${encodeURIComponent(WA_PREFILL_TEXT)}`
                : "";
        }
        case "email":
            if (!/^[^\s@<>?&][^@<>?&]*@[^@<>?&]+\.[^@<>?&\s]+$/.test(target))
                return "";
            return `mailto:${target}`;
        case "address":
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
        case "facebook":
        case "website":
        case "url": {
            const href = ensureHttpUrl(target);
            return href || "";
        }
        default:
            return "";
    }
}

function ContactButtons({ card }) {
    const { contact } = card;
    const locationAddress = String(card?.business?.address || "").trim();
    const locationCity = String(card?.business?.city || "").trim();

    // Defense-in-depth: premium extras only render when entitlements allow.
    // Free baseline: phone, whatsapp, email, website, instagram.
    const isPremium =
        card?.entitlements?.canUseServices !== undefined
            ? card.entitlements.canUseServices
            : true;

    const phone =
        contact?.phone ||
        contact?.mobilePhone ||
        contact?.mobile ||
        contact?.officePhone ||
        "";

    const whatsapp = contact?.whatsapp || contact?.whatsappPhone || "";

    const telHref = normalizeForTel(phone);
    const waHref = normalizeForWaMe(whatsapp);

    const facebookHref = isPremium ? ensureHttpUrl(contact?.facebook) : "";
    const instagramHref = ensureHttpUrl(contact?.instagram);
    const twitterHref = isPremium ? ensureHttpUrl(contact?.twitter) : "";
    const tiktokHref = isPremium ? ensureHttpUrl(contact?.tiktok) : "";
    const websiteHref = ensureHttpUrl(contact?.website);

    const locationQuery = `${locationAddress}, ${locationCity}, ישראל`;
    const locationWazeHref =
        isPremium && locationAddress && locationCity
            ? `https://waze.com/ul?q=${encodeURIComponent(locationQuery)}&navigate=yes`
            : "";

    const rawCustomActions = Array.isArray(contact?.customActions)
        ? contact.customActions
        : [];
    const customActionButtons = rawCustomActions
        .filter((item) => {
            if (!item || typeof item !== "object") return false;
            const label =
                typeof item.label === "string" ? item.label.trim() : "";
            const actionType =
                typeof item.actionType === "string" ? item.actionType : "";
            const target =
                typeof item.target === "string" ? item.target.trim() : "";
            if (
                !label ||
                !CUSTOM_ACTION_TYPES_ALLOWED.has(actionType) ||
                !target
            )
                return false;
            return !!buildCustomActionHref(actionType, target);
        })
        .map((item) => ({
            label: item.label.trim(),
            actionType: item.actionType,
            href: buildCustomActionHref(item.actionType, item.target.trim()),
        }));

    if (
        !telHref &&
        !waHref &&
        !facebookHref &&
        !instagramHref &&
        !twitterHref &&
        !tiktokHref &&
        !contact?.email &&
        !websiteHref &&
        !locationWazeHref &&
        customActionButtons.length === 0
    ) {
        return null;
    }

    return (
        <div className={styles.buttons}>
            {telHref && (
                <a
                    href={`tel:${telHref}`}
                    className={styles.item}
                    aria-label={`Call ${phone || telHref}`}
                    onClick={() => trackClick(card?.slug, "call")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconPhone)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>טלפון</span>
                </a>
            )}

            {waHref && (
                <a
                    href={`https://wa.me/${waHref}?text=${encodeURIComponent(WA_PREFILL_TEXT)}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label={`Open WhatsApp chat ${whatsapp || waHref}`}
                    onClick={() => trackClick(card?.slug, "whatsapp")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconWhatsapp)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>וואטסאפ</span>
                </a>
            )}

            {facebookHref && (
                <a
                    href={facebookHref}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Open Facebook"
                    onClick={() => trackClick(card?.slug, "facebook")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconFacebook)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>פייסבוק</span>
                </a>
            )}

            {instagramHref && (
                <a
                    href={instagramHref}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Open Instagram"
                    onClick={() => trackClick(card?.slug, "instagram")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconInstagram)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>אינסטגרם</span>
                </a>
            )}

            {twitterHref && (
                <a
                    href={twitterHref}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Open X/Twitter"
                    onClick={() => trackClick(card?.slug, "twitter")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconTwitter)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>טוויטר</span>
                </a>
            )}

            {tiktokHref && (
                <a
                    href={tiktokHref}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Open TikTok"
                    onClick={() => trackClick(card?.slug, "tiktok")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconTiktok)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>טיקטוק</span>
                </a>
            )}

            {contact?.email && (
                <a
                    href={`mailto:${contact.email}`}
                    className={styles.item}
                    aria-label={`Email ${contact.email}`}
                    onClick={() => trackClick(card?.slug, "email")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconEmail)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>אימייל</span>
                </a>
            )}

            {websiteHref && (
                <a
                    href={websiteHref}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label="Open website"
                    onClick={() => trackClick(card?.slug, "website")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconWebsite)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>אתר</span>
                </a>
            )}

            {locationWazeHref && (
                <a
                    href={locationWazeHref}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.item}
                    aria-label={`נווט עם Waze: ${locationAddress}, ${locationCity}`}
                    onClick={() => trackClick(card?.slug, "waze")}
                >
                    <span className={styles.bubble} aria-hidden="true">
                        <span
                            className={cx(styles.icon, styles.iconWaze)}
                            aria-hidden="true"
                        />
                    </span>
                    <span className={styles.label}>ווייז</span>
                </a>
            )}

            {customActionButtons.map((btn, i) => {
                const isExternal =
                    !btn.href.startsWith("tel:") &&
                    !btn.href.startsWith("mailto:");
                return (
                    <a
                        key={i}
                        href={btn.href}
                        {...(isExternal
                            ? { target: "_blank", rel: "noreferrer" }
                            : {})}
                        className={styles.item}
                        aria-label={`${btn.label} (${btn.actionType})`}
                        onClick={() => trackClick(card?.slug, "custom_action")}
                    >
                        <span className={styles.bubble} aria-hidden="true">
                            <span
                                className={cx(
                                    styles.icon,
                                    styles[
                                        CUSTOM_ACTION_ICON_NAMES[btn.actionType]
                                    ] || styles.iconLink,
                                )}
                                aria-hidden="true"
                            />
                        </span>
                        <span className={styles.label}>{btn.label}</span>
                    </a>
                );
            })}
        </div>
    );
}

export default ContactButtons;
