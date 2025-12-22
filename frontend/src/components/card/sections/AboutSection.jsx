import Section from "./Section";

function AboutSection({ card }) {
    const { content } = card;

    if (!content?.aboutText) return null;

    return (
        <Section title={content.aboutTitle}>
            <p>{content.aboutText}</p>
        </Section>
    );
}

export default AboutSection;
