import styles from "./CardHeader.module.css";

function CardHeader({ card }) {
    const cover = card.design?.coverImage;
    const logo = card.design?.logo;

    return (
        <header className={styles.header}>
            {cover ? (
                <img
                    className={styles.coverImage}
                    src={cover}
                    alt=""
                    aria-hidden="true"
                />
            ) : null}
            <div className={styles.overlay} />

            <div className={styles.content}>
                {logo && (
                    <div className={styles.avatar}>
                        <img src={logo} alt="logo" />
                    </div>
                )}

                <h1 className={styles.title}>{card.business?.businessName}</h1>
                {card.business?.occupation && (
                    <p className={styles.subtitle}>
                        {card.business.occupation}
                    </p>
                )}
            </div>
        </header>
    );
}

export default CardHeader;
