import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

export default function Footer() {
    return (
        <footer className={styles.footer} id="contact">
            <div className={styles.inner}>
                <div className={styles.col}>
                    <Link
                        to="/"
                        className={styles.brand}
                        aria-label="כרטיס ביקור דיגיטלי - כרדיגו"
                    >
                        <picture>
                            <source
                                type="image/webp"
                                srcSet="/images/brand-logo/cardigo-logo.webp"
                            />
                            <img
                                src="/images/brand-logo/cardigo-logo.png"
                                alt="כרטיס ביקור דיגיטלי - כרדיגו"
                                className={styles.brandLogoImage}
                                loading="lazy"
                                decoding="async"
                            />
                        </picture>
                    </Link>
                    <div className={styles.text}>
                        כרטיסי ביקור דיגיטליים לעסקים — יצירה, התאמה אישית
                        ושיתוף בלחיצה.
                    </div>
                </div>

                <div className={styles.col}>
                    <div className={styles.title}>קישורים</div>
                    <a href="#features" className={styles.link}>
                        תכונות
                    </a>
                    <a href="#templates" className={styles.link}>
                        תבניות
                    </a>
                    <a href="#how" className={styles.link}>
                        איך זה עובד
                    </a>
                    <a href="#faq" className={styles.link}>
                        שאלות נפוצות
                    </a>
                </div>

                <div className={styles.col}>
                    <div className={styles.title}>חשבון</div>
                    <Link to="/login" className={styles.link}>
                        התחברות
                    </Link>
                    <Link to="/register" className={styles.link}>
                        יצירת חשבון
                    </Link>
                    <Link to="/edit" className={styles.link}>
                        עורך כרטיס
                    </Link>
                </div>

                <div className={styles.col}>
                    <div className={styles.title}>מידע</div>
                    <Link to="/privacy" className={styles.link}>
                        מדיניות פרטיות
                    </Link>
                    <Link to="/terms" className={styles.link}>
                        תנאי שימוש
                    </Link>
                    <div className={styles.text}>
                        אימייל: cardigo.app@gmail.com
                    </div>
                </div>
            </div>

            <div className={styles.bottom}>
                © {new Date().getFullYear()} Cardigo. כל הזכויות שמורות.
            </div>
        </footer>
    );
}
