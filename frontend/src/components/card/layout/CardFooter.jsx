import styles from "./CardFooter.module.css";
import { trackClick } from "../../../services/analytics.client";

function CardFooter({ card }) {
    const { contact } = card;

    return (
        <footer className={styles.footer}>
            <div className={styles.platform}>
                נבנה ע״י{" "}
                <a
                    href="https://cardigo.co.il"
                    target="_blank"
                    rel="noreferrer"
                >
                    Cardigo
                </a>
            </div>

            {(contact?.facebook ||
                contact?.instagram ||
                contact?.linkedin ||
                contact?.email) && (
                <div className={styles.socials}>
                    {contact?.facebook && (
                        <a
                            href={contact.facebook}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => trackClick(card?.slug, "facebook")}
                        >
                            Facebook
                        </a>
                    )}
                    {contact?.instagram && (
                        <a
                            href={contact.instagram}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => trackClick(card?.slug, "instagram")}
                        >
                            Instagram
                        </a>
                    )}
                    {contact?.linkedin && (
                        <a
                            href={contact.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => trackClick(card?.slug, "linkedin")}
                        >
                            LinkedIn
                        </a>
                    )}
                    {contact?.email && (
                        <a
                            href={`mailto:${contact.email}`}
                            onClick={() => trackClick(card?.slug, "email")}
                        >
                            Email
                        </a>
                    )}
                </div>
            )}
        </footer>
    );
}

export default CardFooter;
