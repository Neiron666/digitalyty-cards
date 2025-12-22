import styles from "./CardsGrid.module.css";

export default function CardsGrid({ cards }) {
    return (
        <div className={styles.grid}>
            {cards.map((card) => (
                <div key={card.id} className={styles.card}>
                    {/* позже: превью CardRenderer */}
                    <div className={styles.preview} />
                    <div className={styles.meta}>
                        <div className={styles.name}>{card.name}</div>
                        <div className={styles.category}>{card.category}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
