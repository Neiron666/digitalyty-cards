import Section from "./Section";
import styles from "./ReviewsSection.module.css";

function ReviewsSection({ card }) {
    const reviews = card.reviews || [];

    if (!reviews.length) return null;

    return (
        <Section title="המלצות">
            <div className={styles.reviews}>
                {reviews.slice(0, 5).map((r, index) => (
                    <blockquote key={index} className={styles.review}>
                        <p className={styles.text}>{r.text}</p>
                        {r.name && (
                            <footer className={styles.author}>
                                — {r.name}
                            </footer>
                        )}
                    </blockquote>
                ))}
            </div>
        </Section>
    );
}

export default ReviewsSection;
