import CardLayout from "../../components/card/layout/CardLayout";
import CardBody from "../../components/card/layout/CardBody";
import CardFooter from "../../components/card/layout/CardFooter";

import ContactButtons from "../../components/card/sections/ContactButtons";
import SaveContactButton from "../../components/card/sections/SaveContactButton";
import QRCodeBlock from "../../components/card/QRCodeBlock";
import AboutSection from "../../components/card/sections/AboutSection";
import LeadForm from "../../components/card/sections/LeadForm";

import styles from "./MinimalTemplate.module.css";

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

export default function MinimalTemplate({ card, onUpgrade, mode }) {
    const avatar = card?.design?.avatarImage || card?.design?.logo || null;
    const name = getDisplayName(card);
    const subtitle = getSubtitle(card);

    return (
        <CardLayout design={card.design} mode={mode}>
            <header className={styles.header}>
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

                <div className={styles.text}>
                    <h1 className={styles.title}>{name || ""}</h1>
                    {subtitle ? (
                        <p className={styles.subtitle}>{subtitle}</p>
                    ) : null}
                </div>
            </header>

            <CardBody>
                <ContactButtons card={card} />
                <SaveContactButton card={card} />
                {card.status === "published" && (
                    <QRCodeBlock slug={card.slug} />
                )}

                <AboutSection card={card} />

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
