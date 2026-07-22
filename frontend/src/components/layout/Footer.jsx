import { Link } from "react-router-dom";
import styles from "./Footer.module.css";
import InstallCta from "./InstallCta";

export default function Footer({ onOpenPrivacyPrefs }) {
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
                        כרטיסי ביקור דיגיטליים לעסקים - יצירה, התאמה אישית
                        ושיתוף בלחיצה.
                    </div>
                </div>

                <div className={styles.col}>
                    <div className={styles.title}>קישורים</div>
                    <Link to="/#features" className={styles.link}>
                        תכונות
                    </Link>
                    <Link to="/cards/" className={styles.link}>
                        דוגמאות
                    </Link>
                    <Link to="/#how" className={styles.link}>
                        איך זה עובד
                    </Link>
                    <Link to="/#faq" className={styles.link}>
                        שאלות נפוצות
                    </Link>
                    <Link to="/pricing/" className={styles.link}>
                        מחירים
                    </Link>
                    <Link to="/guides/" className={styles.link}>
                        מדריכים
                    </Link>
                    <Link to="/blog/" className={styles.link}>
                        בלוג
                    </Link>
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
                    <div className={styles.title}>מאמרים</div>
                    <Link
                        to="/blog/digital-business-card-google-visibility/"
                        className={styles.link}
                    >
                        כרטיס ביקור בגוגל
                    </Link>
                    <Link
                        to="/blog/ai-website-builder-for-small-business/"
                        className={styles.link}
                    >
                        בניית אתר עם AI
                    </Link>
                    <Link
                        to="/blog/free-website-for-small-business/"
                        className={styles.link}
                    >
                        אתר בחינם לעסק קטן
                    </Link>
                    <Link
                        to="/blog/business-image-website-alternative/"
                        className={styles.link}
                    >
                        אתר תדמית לעסק
                    </Link>
                    <Link
                        to="/blog/business-website-price/"
                        className={styles.link}
                    >
                        מחיר אתר לעסק
                    </Link>
                    <Link
                        to="/blog/website-for-small-business-vs-digital-card/"
                        className={styles.link}
                    >
                        אתר לעסק קטן
                    </Link>
                    <Link
                        to="/blog/digital-presence-small-business/"
                        className={styles.link}
                    >
                        נוכחות דיגיטלית לעסק קטן
                    </Link>
                    <Link
                        to="/blog/digital-presence-small-business/"
                        className={styles.link}
                    >
                        נוכחות דיגיטלית לעסק קטן
                    </Link>
                    <Link
                        to="/blog/landing-page-for-small-business/"
                        className={styles.link}
                    >
                        דף נחיתה לעסק
                    </Link>
                    <Link
                        to="/blog/qr-code-for-business-card/"
                        className={styles.link}
                    >
                        קוד QR לעסק
                    </Link>
                    <Link
                        to="/blog/qr-code-for-business-card/"
                        className={styles.link}
                    >
                        קוד QR לעסק
                    </Link>
                    <Link
                        to="/blog/blog-mini-site-for-small-business/"
                        className={styles.link}
                    >
                        מיני אתר לעסק קטן
                    </Link>
                    <Link
                        to="/blog/blog-mini-site-for-small-business/"
                        className={styles.link}
                    >
                        מיני אתר לעסק קטן
                    </Link>
                    <Link
                        to="/blog/how-to-create-digital-business-card/"
                        className={styles.link}
                    >
                        איך ליצור כרטיס ביקור דיגיטלי
                    </Link>
                    <Link
                        to="/blog/how-to-create-digital-business-card/"
                        className={styles.link}
                    >
                        איך ליצור כרטיס ביקור דיגיטלי
                    </Link>
                    <Link
                        to="/blog/digital-business-card-price/"
                        className={styles.link}
                    >
                        מחיר לכרטיס ביקור דיגיטלי
                    </Link>
                    <Link
                        to="/blog/digital-business-card-price/"
                        className={styles.link}
                    >
                        מחיר לכרטיס ביקור דיגיטלי
                    </Link>
                </div>

                <div className={styles.col}>
                    <div className={styles.title}>כרטיס ביקור לפי עסק</div>
                    <Link
                        to="/blog/digital-business-card-architect/"
                        className={styles.link}
                    >
                        כרטיס ביקור לאדריכל
                    </Link>
                    <Link
                        to="/blog/digital-business-card-cosmetician/"
                        className={styles.link}
                    >
                        כרטיס ביקור לקוסמטיקאית
                    </Link>
                    <Link
                        to="/blog/digital-business-card-electrician/"
                        className={styles.link}
                    >
                        כרטיס ביקור לחשמלאי
                    </Link>
                    <Link
                        to="/blog/digital-business-card-plumber/"
                        className={styles.link}
                    >
                        כרטיס ביקור לאינסטלטור
                    </Link>
                    <Link
                        to="/blog/digital-business-card-locksmith/"
                        className={styles.link}
                    >
                        כרטיס ביקור למנעולן
                    </Link>
                    <Link
                        to="/blog/digital-business-card-lawyer/"
                        className={styles.link}
                    >
                        כרטיס ביקור לעורך דין
                    </Link>
                    <Link
                        to="/blog/digital-business-card-accountant/"
                        className={styles.link}
                    >
                        כרטיס ביקור לרואה חשבון
                    </Link>
                    <Link
                        to="/blog/digital-business-card-hair-stylist/"
                        className={styles.link}
                    >
                        כרטיס ביקור למעצב שיער
                    </Link>
                    <Link
                        to="/blog/digital-business-card-air-conditioner-technician/"
                        className={styles.link}
                    >
                        כרטיס ביקור לטכנאי מזגנים
                    </Link>
                    <Link
                        to="/blog/digital-business-card-fitness-trainer/"
                        className={styles.link}
                    >
                        כרטיס ביקור למאמן כושר
                    </Link>
                    <Link
                        to="/blog/digital-business-card-dentist/"
                        className={styles.link}
                    >
                        כרטיס ביקור לרופא שיניים
                    </Link>
                    <Link
                        to="/blog/digital-business-card-real-estate-agent/"
                        className={styles.link}
                    >
                        כרטיס ביקור למתווך נדל״ן
                    </Link>
                    <Link
                        to="/blog/digital-business-card-taxi-driver/"
                        className={styles.link}
                    >
                        כרטיס ביקור לנהג מונית
                    </Link>
                    <Link
                        to="/blog/digital-business-card-renovation-contractor/"
                        className={styles.link}
                    >
                        כרטיס ביקור לקבלן שיפוצים
                    </Link>
                    <Link
                        to="/blog/blog-digital-business-card-insurance-agent/"
                        className={styles.link}
                    >
                        כרטיס ביקור לסוכן ביטוח
                    </Link>
                    <Link
                        to="/blog/digital-business-card-mortgage-advisor/"
                        className={styles.link}
                    >
                        כרטיס ביקור ליועץ משכנתאות
                    </Link>
                    <Link
                        to="/blog/digital-business-card-interior-designer/"
                        className={styles.link}
                    >
                        כרטיס ביקור למעצבת פנים
                    </Link>
                    <Link
                        to="/blog/digital-business-card-photographer/"
                        className={styles.link}
                    >
                        כרטיס ביקור לצלם
                    </Link>
                    <Link
                        to="/blog/digital-business-card-therapist/"
                        className={styles.link}
                    >
                        כרטיס ביקור למטפל רגשי
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
                    <Link to="/accessibility-statement" className={styles.link}>
                        הצהרת נגישות
                    </Link>
                    <Link to="/payment-policy" className={styles.link}>
                        תנאי תשלום, חידוש, ביטול והחזרים
                    </Link>
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={onOpenPrivacyPrefs}
                    >
                        העדפות פרטיות
                    </button>
                    <div className={styles.text}>
                        אימייל: support@cardigo.co.il
                    </div>
                </div>
            </div>

            <InstallCta />

            <div className={styles.bottom}>
                © {new Date().getFullYear()} Cardigo. כל הזכויות שמורות.
            </div>
        </footer>
    );
}
