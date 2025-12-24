import CardLayout from "../../components/card/layout/CardLayout";
import CardBody from "../../components/card/layout/CardBody";
import CardFooter from "../../components/card/layout/CardFooter";

import ContactButtons from "../../components/card/sections/ContactButtons";
import SaveContactButton from "../../components/card/sections/SaveContactButton";
import QRCodeBlock from "../../components/card/QRCodeBlock";
import AboutSection from "../../components/card/sections/AboutSection";
import GallerySection from "../../components/card/sections/GallerySection";
import VideoSection from "../../components/card/sections/VideoSection";
import ReviewsSection from "../../components/card/sections/ReviewsSection";
import LeadForm from "../../components/card/sections/LeadForm";

import { getTemplateById, normalizeTemplateId } from "../templates.config";

import styles from "./ClassicTemplate.module.css";

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

export default function ClassicTemplate({ card, onUpgrade, mode }) {
    const templateId = normalizeTemplateId(card?.design?.templateId);
    const supports = getTemplateById(templateId)?.supports || {};

    const cover =
        card?.design?.backgroundImage || card?.design?.coverImage || null;
    const avatar = card?.design?.avatarImage || card?.design?.logo || null;
    const overlay = Number(card?.design?.backgroundOverlay ?? 40);

    const name = getDisplayName(card);
    const subtitle = getSubtitle(card);

    return (
        <CardLayout design={card.design} mode={mode}>
            <header
                className={styles.hero}
                style={{
                    backgroundImage: cover ? `url(${cover})` : undefined,
                }}
            >
                <div
                    className={styles.overlay}
                    style={{
                        opacity: Math.min(0.7, Math.max(0, overlay / 100)),
                    }}
                />

                <div className={styles.heroInner}>
                    {avatar && (
                        <div className={styles.avatar}>
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
            </header>

            <CardBody>
                <div className={styles.identity}>
                    <h1 className={styles.name}>{name || ""}</h1>
                    {subtitle ? (
                        <p className={styles.role}>{subtitle}</p>
                    ) : null}
                </div>

                <ContactButtons card={card} />
                <SaveContactButton card={card} />
                {card.status === "published" && (
                    <QRCodeBlock slug={card.slug} />
                )}

                <AboutSection card={card} />
                {supports.gallery !== false && <GallerySection card={card} />}
                {supports.video !== false && <VideoSection card={card} />}
                {supports.reviews !== false && <ReviewsSection card={card} />}

                <LeadForm
                    cardId={card._id}
                    slug={card.slug}
                    entitlements={card?.entitlements}
                    onUpgrade={onUpgrade}
                />
            </CardBody>

            <CardFooter card={card} />
        </CardLayout>
    );
}
