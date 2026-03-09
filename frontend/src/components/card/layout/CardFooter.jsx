import styles from "./CardFooter.module.css";
import { trackClick } from "../../../services/analytics.client";
import ensureHttpUrl from "../../../utils/ensureHttpUrl";

function CardFooter({ card }) {
    const { contact } = card;

    const facebookHref = ensureHttpUrl(contact?.facebook);
    const instagramHref = ensureHttpUrl(contact?.instagram);
    const linkedinHref = ensureHttpUrl(contact?.linkedin);

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

            {(facebookHref ||
                instagramHref ||
                linkedinHref ||
                contact?.email) && (
                <div className={styles.socials}>
                    {facebookHref && (
                        <a
                            href={facebookHref}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => trackClick(card?.slug, "facebook")}
                        >
                            Facebook
                        </a>
                    )}
                    {instagramHref && (
                        <a
                            href={instagramHref}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => trackClick(card?.slug, "instagram")}
                        >
                            Instagram
                        </a>
                    )}
                    {linkedinHref && (
                        <a
                            href={linkedinHref}
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
