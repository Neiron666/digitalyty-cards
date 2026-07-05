import CardFooter from "../../components/card/layout/CardFooter";
import ContactButtons from "../../components/card/sections/ContactButtons";
import SaveContactButton from "../../components/card/sections/SaveContactButton";
import QRCodeBlock from "../../components/card/QRCodeBlock";
import AboutSection from "../../components/card/sections/AboutSection";
import ServicesSection from "../../components/card/sections/ServicesSection";
import BusinessHoursSection from "../../components/card/sections/BusinessHoursSection";
import GallerySection from "../../components/card/sections/GallerySection";
import VideoSection from "../../components/card/sections/VideoSection";
import ReviewsSection from "../../components/card/sections/ReviewsSection";
import FaqSection from "../../components/card/sections/FaqSection";
import BookingSection from "../../components/card/sections/BookingSection";
import LocationSection from "../../components/card/sections/LocationSection";
import LeadForm from "../../components/card/sections/LeadForm";
import { toAbsoluteUrl } from "../../services/upload.service";
import useReveal from "../../hooks/useReveal";
import styles from "./CardLayout.module.css";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function getDisplayName(card) {
    return (
        card?.business?.name ||
        card?.business?.businessName ||
        card?.business?.ownerName ||
        ""
    );
}

function getSubtitle(card) {
    return card?.business?.category || "";
}

// Composite-H1 guardrail (Option B). Pure, no DTO dependency.
// Decides whether the business category may be folded into the single <h1>
// next to the business name, or must stay a standalone subtitle paragraph.
const HEADING_COMBINED_MAX = 90;
const HEADING_MIN_TOKEN_LENGTH = 3;
const HEADING_SHARED_TOKEN_LIMIT = 2;
const HEADING_COMPOUND_SEPARATORS = [" - ", "|", ":", " / "];

function normalizeHeadingPart(value) {
    return (typeof value === "string" ? value : "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function tokenizeHeadingPart(normalized) {
    return normalized
        .split(/[^\p{L}\p{N}]+/u)
        .filter((token) => token.length >= HEADING_MIN_TOKEN_LENGTH);
}

function shouldFoldCategoryIntoHeading(name, category) {
    const rawName = typeof name === "string" ? name.trim() : "";
    const rawCategory = typeof category === "string" ? category.trim() : "";
    if (!rawName || !rawCategory) return false;

    const nameNorm = normalizeHeadingPart(rawName);
    const categoryNorm = normalizeHeadingPart(rawCategory);
    if (!nameNorm || !categoryNorm) return false;
    if (nameNorm === categoryNorm) return false;
    if (nameNorm.includes(categoryNorm) || categoryNorm.includes(nameNorm)) {
        return false;
    }

    for (const separator of HEADING_COMPOUND_SEPARATORS) {
        if (rawName.includes(separator)) return false;
    }

    const nameTokens = new Set(tokenizeHeadingPart(nameNorm));
    let sharedTokens = 0;
    for (const token of tokenizeHeadingPart(categoryNorm)) {
        if (nameTokens.has(token)) {
            sharedTokens += 1;
            if (sharedTokens >= HEADING_SHARED_TOKEN_LIMIT) return false;
        }
    }

    if (rawName.length + 1 + rawCategory.length > HEADING_COMBINED_MAX) {
        return false;
    }

    return true;
}

export default function CardLayout({
    card,
    supports,
    skin,
    extraThemeClass,
    mode,
    onUpgrade,
    templateId,
    selfThemeActive,
}) {
    const design = card?.design || {};
    const coverRaw = design?.backgroundImage || design?.coverImage || null;
    const coverUrl = toAbsoluteUrl(coverRaw);
    const avatar = toAbsoluteUrl(design?.avatarImage || design?.logo || null);
    const overlayValue = Number(design?.backgroundOverlay ?? 40);

    const name = getDisplayName(card);
    const subtitle = getSubtitle(card);
    const slogan =
        typeof card?.business?.slogan === "string"
            ? card.business.slogan.trim()
            : "";
    const foldCategory = shouldFoldCategoryIntoHeading(name, subtitle);

    const hasCover = Boolean(coverUrl);
    const avatarRevealRef = useReveal({
        revealClass: styles.isRevealed,
        skip: mode !== "public",
    });
    const overlayOpacity = Math.min(0.7, Math.max(0, overlayValue / 100));
    const overlayStep = Math.min(
        70,
        Math.max(0, Math.round((overlayOpacity * 100) / 5) * 5),
    );

    const rootClass = cx(styles.root, skin?.theme, extraThemeClass);

    return (
        <div
            className={rootClass}
            data-mode={mode}
            data-cardigo-scope="card"
            data-template-id={String(templateId || "")}
            data-self-theme={selfThemeActive ? "1" : undefined}
        >
            <div className={cx(styles.card, skin?.card)}>
                <header className={cx(styles.hero, skin?.hero)}>
                    {hasCover ? (
                        <img
                            className={styles.cover}
                            src={coverUrl}
                            alt={
                                name && subtitle
                                    ? `תמונת כותרת של ${name} - ${subtitle}`
                                    : name
                                      ? `תמונת כותרת של ${name}`
                                      : "תמונת כותרת של העסק"
                            }
                            decoding="async"
                            loading="eager"
                            fetchpriority="high"
                            referrerPolicy="no-referrer"
                        />
                    ) : null}

                    <div
                        className={cx(
                            styles.overlay,
                            styles[`overlay${overlayStep}`],
                            skin?.overlay,
                        )}
                    />

                    <div className={cx(styles.heroInner, skin?.heroInner)}>
                        {avatar && (
                            <div
                                ref={avatarRevealRef}
                                className={cx(styles.avatarWrap, skin?.avatar)}
                            >
                                <img
                                    src={avatar}
                                    alt={
                                        name && subtitle
                                            ? `תמונת פרופיל של ${name} - ${subtitle}`
                                            : name
                                              ? `תמונת פרופיל של ${name}`
                                              : "תמונת פרופיל של העסק"
                                    }
                                    width={480}
                                    height={480}
                                    decoding="async"
                                />
                            </div>
                        )}
                    </div>

                    {/* Curved divider (fill + 2px stroke) */}
                    <svg
                        className={styles.heroDivider}
                        viewBox="0 0 100 20"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path
                            d="M0 0 Q50 20 100 0 V20 H0 Z"
                            className={styles.heroDividerFill}
                        />
                        <path
                            d="M0 0 Q50 20 100 0"
                            className={styles.heroDividerStroke}
                        />
                    </svg>
                </header>

                <main className={cx(styles.body, skin?.body)}>
                    <section
                        className={cx(
                            styles.headerCluster,
                            skin?.headerCluster,
                        )}
                    >
                        <div className={cx(styles.identity, skin?.identity)}>
                            <h1 className={cx(styles.name, skin?.name)}>
                                <span className={styles.nameHeadingText}>
                                    {name || ""}
                                </span>
                                {foldCategory ? (
                                    <span
                                        className={cx(
                                            styles.subtitle,
                                            styles.headingCategory,
                                            skin?.subtitle,
                                        )}
                                    >
                                        {subtitle}
                                    </span>
                                ) : null}
                            </h1>
                            {!foldCategory && subtitle ? (
                                <p
                                    className={cx(
                                        styles.subtitle,
                                        skin?.subtitle,
                                    )}
                                >
                                    {subtitle}
                                </p>
                            ) : null}
                            {slogan ? (
                                <p className={styles.slogan}>"{slogan}"</p>
                            ) : null}
                        </div>

                        <div className={cx(styles.socialRow, skin?.socialRow)}>
                            <ContactButtons card={card} />
                        </div>

                        <div className={cx(styles.ctaRow, skin?.ctaRow)}>
                            <SaveContactButton card={card} />
                        </div>
                    </section>

                    <section
                        className={cx(styles.sectionWrap, skin?.sectionWrap)}
                    >
                        <AboutSection card={card} />
                        <ServicesSection card={card} mode={mode} />
                        <BusinessHoursSection card={card} mode={mode} />
                        {supports?.gallery !== false && (
                            <GallerySection card={card} mode={mode} />
                        )}
                        {supports?.video !== false && (
                            <VideoSection card={card} />
                        )}
                        {supports?.reviews !== false && (
                            <ReviewsSection card={card} />
                        )}
                        <FaqSection card={card} mode={mode} />
                        {card?.status === "published" && (
                            <QRCodeBlock
                                slug={card.slug}
                                publicPath={card?.publicPath}
                            />
                        )}
                        <LocationSection card={card} />
                        <BookingSection card={card} />
                        <div className={cx(styles.formWrap, skin?.formWrap)}>
                            <LeadForm
                                cardId={card?._id}
                                slug={card?.slug}
                                entitlements={card?.entitlements}
                                onUpgrade={onUpgrade}
                                mode={mode}
                            />
                        </div>
                    </section>
                </main>

                <footer className={cx(styles.footerWrap, skin?.footerWrap)}>
                    <CardFooter card={card} />
                </footer>
            </div>
        </div>
    );
}
