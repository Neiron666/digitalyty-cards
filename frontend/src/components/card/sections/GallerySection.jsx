import Section from "./Section";
import styles from "./GallerySection.module.css";
import { galleryItemToUrl } from "../../../utils/gallery";

function GallerySection({ card }) {
    const images = card.gallery || [];

    if (!images.length) return null;

    return (
        <Section title="גלריה">
            <div className={styles.gallery}>
                {images.map((item, index) => {
                    const url = galleryItemToUrl(item);
                    if (!url) return null;

                    return (
                        <div key={index} className={styles.imageWrapper}>
                            <img
                                src={url}
                                alt={`gallery-${index}`}
                                className={styles.image}
                                loading="lazy"
                            />
                        </div>
                    );
                })}
            </div>
        </Section>
    );
}

export default GallerySection;
