import Section from "./Section";
import styles from "./AboutSection.module.css";

function normalizeAboutParagraphs(content) {
    const raw =
        content && Array.isArray(content.aboutParagraphs)
            ? content.aboutParagraphs
            : typeof content?.aboutText === "string"
              ? content.aboutText.split(/\n\s*\n/)
              : [];

    return raw
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean)
        .slice(0, 3);
}

function AboutSection({ card }) {
    const content = card?.content;
    const paragraphs = normalizeAboutParagraphs(content);

    if (!paragraphs.length) return null;

    return (
        <Section title={content.aboutTitle}>
            <div className={styles.paragraphs}>
                {paragraphs.map((text, idx) => (
                    <p key={idx} className={styles.paragraph}>
                        {text}
                    </p>
                ))}
            </div>
        </Section>
    );
}

export default AboutSection;
