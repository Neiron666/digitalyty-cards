import { useMemo, useState } from "react";
import Section from "./Section";
import styles from "./FaqSection.module.css";

function safeIdPart(value) {
    const raw = String(value || "").trim();
    if (!raw) return "card";
    return raw.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64) || "card";
}

function toPlainText(value) {
    if (value === null || value === undefined) return "";
    const s = String(value);
    // Basic tag strip + whitespace normalization.
    return s
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeFaq(card) {
    const faq = card?.faq && typeof card.faq === "object" ? card.faq : null;
    if (!faq) return null;

    const title = typeof faq.title === "string" ? faq.title.trim() : "";
    const lead = typeof faq.lead === "string" ? faq.lead.trim() : "";

    const rawItems = Array.isArray(faq.items) ? faq.items : [];
    const items = rawItems
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const q = toPlainText(item.q);
            const a = toPlainText(item.a);
            return { q, a };
        })
        .filter((item) => item && item.q && item.a);

    if (!items.length) return null;

    return {
        title: title || "שאלות ותשובות נפוצות",
        lead,
        items,
    };
}

export default function FaqSection({ card }) {
    const faq = useMemo(() => normalizeFaq(card), [card]);
    const [openIndex, setOpenIndex] = useState(0);

    if (!faq) return null;

    const prefix = `faq-${safeIdPart(card?.slug || card?._id)}`;

    function toggle(index) {
        setOpenIndex((prev) => (prev === index ? -1 : index));
    }

    return (
        <Section
            // Project assumption: a card renders FAQ at most once.
            // Keep the anchor stable (no random/dynamic ids) for deep links + JSON-LD @id.
            id="faq"
            title={faq.title}
            className={styles.section}
            contentClassName={styles.content}
            titleClassName={styles.title}
        >
            {faq.lead ? <p className={styles.lead}>{faq.lead}</p> : null}

            <ul className={styles.list} role="list">
                {faq.items.map((item, index) => {
                    const qId = `${prefix}-q${index}`;
                    const aId = `${prefix}-a${index}`;
                    const isOpen = openIndex === index;

                    return (
                        <li
                            key={qId}
                            className={styles.item}
                            data-open={isOpen ? "true" : "false"}
                        >
                            <button
                                type="button"
                                className={styles.question}
                                id={qId}
                                aria-expanded={isOpen}
                                aria-controls={aId}
                                onClick={() => toggle(index)}
                            >
                                <span className={styles.questionText}>
                                    {item.q}
                                </span>
                                <span
                                    className={styles.icon}
                                    aria-hidden="true"
                                />
                            </button>

                            <div
                                className={styles.answerWrap}
                                id={aId}
                                role="region"
                                aria-labelledby={qId}
                            >
                                <div className={styles.answer}>{item.a}</div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </Section>
    );
}
