import { useMemo, useState } from "react";
import Section from "./Section";
import { ServicesIcon } from "../../icons/EditorTabIcons";
import { getPublicCardLabels } from "../../../utils/publicCardLabels";
import styles from "./ServicesSection.module.css";

function normalizeServices(card) {
    const services =
        card?.content?.services && typeof card.content.services === "object"
            ? card.content.services
            : null;
    if (!services) return null;

    const title =
        typeof services.title === "string" ? services.title.trim() : "";
    const rawItems = Array.isArray(services.items) ? services.items : [];

    const items = rawItems
        .map((v) => (typeof v === "string" ? v : ""))
        .map((v) => v.replace(/\s+/g, " ").trim())
        .filter(Boolean);

    if (!items.length) return null;

    return {
        title,
        items,
    };
}

export default function ServicesSection({ card, mode }) {
    const services = useMemo(() => normalizeServices(card), [card]);
    const labels = getPublicCardLabels(card?.language);
    const initialOpen = false;
    const [open, setOpen] = useState(initialOpen);

    // Defense-in-depth: respect entitlement even if data leaked through.
    if (!card?.entitlements?.canUseServices) return null;
    if (!services) return null;

    const displayTitle = services.title || labels.servicesTitle;
    const toggleLabel = open
        ? `${labels.hide} ${displayTitle}`
        : `${labels.show} ${displayTitle}`;

    return (
        <Section
            id="services"
            className={styles.section}
            contentClassName={styles.content}
        >
            <div className={styles.wrap}>
                <h2 className={styles.sectionTitle}>{displayTitle}</h2>
                <button
                    type="button"
                    className={styles.toggle}
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                >
                    <ServicesIcon className={styles.tabIcon} />
                    <span className={styles.toggleText}>{toggleLabel}</span>
                    <span className={styles.icon} aria-hidden="true" />
                </button>

                {open ? (
                    <ul className={styles.list} role="list">
                        {services.items.map((item, idx) => (
                            <li key={`${idx}-${item}`} className={styles.item}>
                                {item}
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>
        </Section>
    );
}
