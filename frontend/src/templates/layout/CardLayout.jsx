import CardFooter from "../../components/card/layout/CardFooter";
import ContactButtons from "../../components/card/sections/ContactButtons";
import SaveContactButton from "../../components/card/sections/SaveContactButton";
import QRCodeBlock from "../../components/card/QRCodeBlock";
import AboutSection from "../../components/card/sections/AboutSection";
import GallerySection from "../../components/card/sections/GallerySection";
import VideoSection from "../../components/card/sections/VideoSection";
import ReviewsSection from "../../components/card/sections/ReviewsSection";
import FaqSection from "../../components/card/sections/FaqSection";
import LeadForm from "../../components/card/sections/LeadForm";
import { toAbsoluteUrl } from "../../services/upload.service";
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
    return card?.business?.category || card?.business?.occupation || "";
}

export default function CardLayout({
    card,
    supports,
    skin,
    extraThemeClass,
    mode,
    onUpgrade,
}) {
    const design = card?.design || {};
    const coverRaw = design?.backgroundImage || design?.coverImage || null;
    const coverUrl = toAbsoluteUrl(coverRaw);
    const avatar = toAbsoluteUrl(design?.avatarImage || design?.logo || null);
    const overlayValue = Number(design?.backgroundOverlay ?? 40);

    const name = getDisplayName(card);
    const subtitle = getSubtitle(card);

    const hasCover = Boolean(coverUrl);
    const overlayOpacity = Math.min(0.7, Math.max(0, overlayValue / 100));
    const overlayStep = Math.min(
        70,
        Math.max(0, Math.round((overlayOpacity * 100) / 5) * 5),
    );

    const rootClass = cx(styles.root, skin?.theme, extraThemeClass);

    return (
        <div className={rootClass} data-mode={mode}>
            <div className={cx(styles.card, skin?.card)}>
                <header className={cx(styles.hero, skin?.hero)}>
                    {hasCover ? (
                        <img
                            className={styles.cover}
                            src={coverUrl}
                            alt=""
                            aria-hidden="true"
                            decoding="async"
                            loading="eager"
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
                                className={cx(styles.avatarWrap, skin?.avatar)}
                            >
                                <img
                                    src={avatar}
                                    alt={
                                        name
                                            ? `${name} – profile photo`
                                            : "Profile photo"
                                    }
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
                                {name || ""}
                            </h1>
                            {subtitle ? (
                                <p
                                    className={cx(
                                        styles.subtitle,
                                        skin?.subtitle,
                                    )}
                                >
                                    {subtitle}
                                </p>
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
                        {supports?.gallery !== false && (
                            <GallerySection card={card} />
                        )}
                        {supports?.video !== false && (
                            <VideoSection card={card} />
                        )}
                        {supports?.reviews !== false && (
                            <ReviewsSection card={card} />
                        )}
                        <FaqSection card={card} mode={mode} />
                        {card?.status === "published" && (
                            <QRCodeBlock slug={card.slug} />
                        )}
                    </section>

                    <div className={cx(styles.formWrap, skin?.formWrap)}>
                        <LeadForm
                            cardId={card?._id}
                            slug={card?.slug}
                            entitlements={card?.entitlements}
                            onUpgrade={onUpgrade}
                        />
                    </div>
                </main>

                <footer className={cx(styles.footerWrap, skin?.footerWrap)}>
                    <CardFooter card={card} />
                </footer>
            </div>
        </div>
    );
}
