import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import SeoHelmet from "../components/seo/SeoHelmet";
import {
    trackSitePageView,
    trackSiteClick,
} from "../services/siteAnalytics.client";
import { SITE_ACTIONS } from "../services/siteAnalytics.actions";
import pub from "../styles/public-sections.module.css";
import styles from "./Contact.module.css";

const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "https://cardigo.co.il";
const EMAIL = "cardigo.app@gmail.com";
const PHONE_DISPLAY = "054-581-1900";
const PHONE_TEL = "tel:+972545811900";
const WHATSAPP_URL = "https://wa.me/972545811900";
const FACEBOOK_URL = "https://www.facebook.com/cardigo.cards";

const SUBJECT_OPTIONS = [
    "שאלה לפני התחלה",
    "מחירים ומסלולים",
    "התאמה לעסק או לצוות",
    "אחר",
];

const INITIAL_FORM = {
    fullName: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
    consent: false,
};

const CONTACT_FAQ = [
    {
        q: "איך אפשר ליצור קשר עם Cardigo?",
        a: "אפשר לפנות אלינו דרך הטופס בדף זה, בטלפון, ב-WhatsApp או במייל. כל הדרכים מפורטות למעלה.",
    },
    {
        q: "האם אפשר לפנות גם לגבי מחירים ומסלולים?",
        a: "בוודאי. אם יש שאלה שלא מופיעה בדף המחירים, נשמח לפרט ולעזור לבחור את המסלול המתאים.",
    },
    {
        q: "למי Cardigo יכול להתאים?",
        a: "Cardigo מתאים לבעלי עסקים, נותני שירות, פרילנסרים וצוותים שרוצים כרטיס ביקור דיגיטלי מקצועי ונגיש.",
    },
    {
        q: "מה צריך להכין לפני שפונים?",
        a: "שום דבר מיוחד. אם יש לכם שאלה ספציפית או פרטים על העסק — מצוין, אבל אפשר גם סתם לשאול.",
    },
];

function buildContactFaqJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${ORIGIN}/contact#faq`,
        url: `${ORIGIN}/contact`,
        inLanguage: "he",
        mainEntity: CONTACT_FAQ.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
            },
        })),
    };
}

export default function Contact() {
    const [form, setForm] = useState(INITIAL_FORM);
    const [sent, setSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const contactFaqJsonLd = buildContactFaqJsonLd();

    useEffect(() => {
        trackSitePageView();
    }, []);

    const updateField = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await fetch("/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    "form-name": "contact",
                    fullName: form.fullName,
                    phone: form.phone,
                    email: form.email,
                    subject: form.subject,
                    message: form.message,
                    consent: form.consent ? "yes" : "no",
                }).toString(),
            });
            setSent(true);
        } catch {
            /* best-effort — Netlify handles the rest */
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main data-page="site">
            <SeoHelmet
                title="צור קשר | Cardigo"
                description="צרו קשר עם Cardigo לשאלות על כרטיס ביקור דיגיטלי לעסקים — מחירים, התאמה ודרכי התחלה."
                canonicalUrl={`${ORIGIN}/contact`}
                url={`${ORIGIN}/contact`}
                image={`${ORIGIN}/images/og/cardigo-home-og-1200x630.jpg`}
                jsonLdItems={[contactFaqJsonLd]}
            />

            {/* ── Hero ──────────────────────────────────────── */}
            <section className={pub.sectionDark}>
                <div className={`${pub.sectionWrap} ${styles.heroWrap}`}>
                    <div className={styles.heroCopy}>
                        <h1 className={styles.h1}>
                            דברו איתנו
                            <span
                                className={`${styles.h1Accent} ${pub.goldUnderline}`}
                            >
                                נשמח לענות על כל שאלה
                            </span>
                        </h1>

                        <img
                            className={styles.heroImg}
                            src="/images/contact/hero/contact-cardigo-digital-bussines-card.webp"
                            alt="צור קשר עם Cardigo — כרטיס ביקור דיגיטלי לעסקים"
                            width="600"
                            height="400"
                            loading="eager"
                            decoding="async"
                        />

                        <p className={pub.sectionLeadLight}>
                            רוצים לדעת מה מתאים לעסק שלכם, לשאול על מחירים או
                            לברר פרטים לפני ההתחלה? כתבו לנו.
                        </p>

                        <div className={styles.heroActions}>
                            <Button
                                as="a"
                                href={`mailto:${EMAIL}`}
                                variant="primary"
                                className={styles.heroCta}
                                onClick={() =>
                                    trackSiteClick({
                                        action: SITE_ACTIONS.contact_email_click,
                                        pagePath: "/contact",
                                    })
                                }
                            >
                                שלחו לנו מייל
                            </Button>

                            <Button
                                as={Link}
                                to="/pricing"
                                variant="secondary"
                                className={styles.heroSecondary}
                            >
                                לראות מסלולים ומחירים
                            </Button>
                        </div>
                    </div>

                    <p className={styles.trustLine}>{EMAIL}</p>
                </div>
            </section>

            {/* ── Value bridge ──────────────────────────────── */}
            <section className={pub.sectionLight}>
                <div className={`${pub.sectionWrap}`}>
                    <h2 className={pub.h2Gold}>אנחנו כאן לכל שאלה</h2>
                    <p className={pub.sectionLead}>
                        לפני שמתחילים, טבעי שיש שאלות. הנה כמה נושאים שבהם נשמח
                        לעזור.
                    </p>

                    <div className={styles.valueBridgeRail}>
                        <div className={styles.valueBridgeCards}>
                            <article className={styles.valueBridgeCard}>
                                <div className={styles.valueBridgeMedia}>
                                    <img
                                        className={styles.valueBridgeImg}
                                        src="/images/contact/value-bridge/כרטיס-ביקור-דיגיטלי-כרדיגו-שאלות-לפני-ההתחלה.webp"
                                        alt="שאלות לפני ההתחלה — כרטיס ביקור דיגיטלי Cardigo"
                                        width="400"
                                        height="267"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                                <div className={styles.valueBridgeBody}>
                                    <h3 className={styles.valueBridgeTitle}>
                                        שאלות לפני ההתחלה
                                    </h3>
                                    <p className={styles.valueBridgeText}>
                                        רוצים להבין איך{" "}
                                        <Link
                                            to="/"
                                            className={styles.brandLink}
                                        >
                                            Cardigo
                                        </Link>{" "}
                                        עובד, מה כלול בכרטיס ומה צריך כדי
                                        להתחיל? כתבו לנו ונסביר.
                                    </p>
                                </div>
                            </article>

                            <article className={styles.valueBridgeCard}>
                                <div className={styles.valueBridgeMedia}>
                                    <img
                                        className={styles.valueBridgeImg}
                                        src="/images/contact/value-bridge/כרטיס-ביקור-דיגיטלי-כרדיגו-מחירים-ומסלולים.webp"
                                        alt="מחירים ומסלולים — כרטיס ביקור דיגיטלי Cardigo"
                                        width="400"
                                        height="267"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                                <div className={styles.valueBridgeBody}>
                                    <h3 className={styles.valueBridgeTitle}>
                                        מחירים ומסלולים
                                    </h3>
                                    <p className={styles.valueBridgeText}>
                                        לא בטוחים איזה מסלול מתאים? נשמח לפרט על
                                        ההבדלים בין המסלולים ולענות על כל שאלה.
                                    </p>
                                </div>
                            </article>

                            <article className={styles.valueBridgeCard}>
                                <div className={styles.valueBridgeMedia}>
                                    <img
                                        className={styles.valueBridgeImg}
                                        src="/images/contact/value-bridge/כרטיס-ביקור-דיגיטלי-כרדיגו-התאמה-לעסק-או-לצוות.webp"
                                        alt="התאמה לעסק או לצוות — כרטיס ביקור דיגיטלי Cardigo"
                                        width="400"
                                        height="267"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                                <div className={styles.valueBridgeBody}>
                                    <h3 className={styles.valueBridgeTitle}>
                                        התאמה לעסק או לצוות
                                    </h3>
                                    <p className={styles.valueBridgeText}>
                                        מחפשים פתרון לכמה אנשי צוות או לארגון?
                                        פנו אלינו ונבדוק ביחד מה מתאים.
                                    </p>
                                </div>
                            </article>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Contact form + info ──────────────────────── */}
            <section className={pub.sectionDark}>
                <div className={`${pub.sectionWrap} ${styles.sectionFormWrap}`}>
                    <h2 className={pub.h2White}>נשמח לשמוע מכם</h2>
                    <p className={pub.sectionLeadLight}>
                        מלאו את הטופס ונחזור אליכם בהקדם, או פנו אלינו ישירות
                        בכל דרך שנוחה לכם.
                    </p>

                    <div className={styles.contactRow}>
                        {/* ── Form column ── */}
                        <div className={styles.contactFormCol}>
                            {sent ? (
                                <div className={styles.successBox}>
                                    <span className={styles.successIcon}>
                                        ✓
                                    </span>
                                    <h3 className={styles.successTitle}>
                                        הפנייה נשלחה בהצלחה
                                    </h3>
                                    <p className={styles.successText}>
                                        קיבלנו את ההודעה שלכם ונחזור אליכם בהקדם
                                        האפשרי.
                                    </p>
                                    <Button
                                        as={Link}
                                        to="/"
                                        variant="secondary"
                                        className={styles.successCta}
                                    >
                                        חזרה לדף הבית
                                    </Button>
                                </div>
                            ) : (
                                <form
                                    name="contact"
                                    method="POST"
                                    data-netlify="true"
                                    netlify-honeypot="bot-field"
                                    onSubmit={handleSubmit}
                                    className={styles.contactForm}
                                >
                                    <input
                                        type="hidden"
                                        name="form-name"
                                        value="contact"
                                    />
                                    {/* honeypot */}
                                    <div
                                        className={styles.honeypot}
                                        aria-hidden="true"
                                    >
                                        <input
                                            name="bot-field"
                                            tabIndex={-1}
                                            autoComplete="off"
                                        />
                                    </div>

                                    <label className={styles.fieldLabel}>
                                        שם מלא *
                                        <input
                                            className={styles.fieldInput}
                                            type="text"
                                            name="fullName"
                                            value={form.fullName}
                                            onChange={updateField}
                                            required
                                            autoComplete="name"
                                        />
                                    </label>

                                    <label className={styles.fieldLabel}>
                                        טלפון *
                                        <input
                                            className={styles.fieldInput}
                                            type="tel"
                                            name="phone"
                                            value={form.phone}
                                            onChange={updateField}
                                            required
                                            placeholder="054-581-1900"
                                            autoComplete="tel"
                                        />
                                    </label>

                                    <label className={styles.fieldLabel}>
                                        אימייל
                                        <input
                                            className={styles.fieldInput}
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={updateField}
                                            autoComplete="email"
                                        />
                                    </label>

                                    <label className={styles.fieldLabel}>
                                        נושא הפנייה
                                        <select
                                            className={styles.fieldInput}
                                            name="subject"
                                            value={form.subject}
                                            onChange={updateField}
                                        >
                                            <option value="">בחרו נושא…</option>
                                            {SUBJECT_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className={styles.fieldLabel}>
                                        הודעה
                                        <textarea
                                            className={`${styles.fieldInput} ${styles.fieldTextarea}`}
                                            name="message"
                                            value={form.message}
                                            onChange={updateField}
                                            rows={4}
                                        />
                                    </label>

                                    <label className={styles.consentLabel}>
                                        <input
                                            type="checkbox"
                                            name="consent"
                                            checked={form.consent}
                                            onChange={updateField}
                                            required
                                            className={styles.consentCheck}
                                        />
                                        <span className={styles.consentText}>
                                            אני מסכים/ה ל
                                            <Link to="/terms">תנאי השימוש</Link>{" "}
                                            ו
                                            <Link to="/privacy">
                                                מדיניות הפרטיות
                                            </Link>
                                        </span>
                                    </label>

                                    <Button
                                        as="button"
                                        type="submit"
                                        variant="primary"
                                        className={styles.submitBtn}
                                        disabled={submitting}
                                        loading={submitting}
                                    >
                                        {submitting ? "שולח…" : "שליחה"}
                                    </Button>
                                </form>
                            )}
                        </div>

                        {/* ── Info column ── */}
                        <div className={styles.contactInfoCol}>
                            <h3 className={styles.infoHeading}>
                                דרכים נוספות ליצירת קשר
                            </h3>

                            <ul className={styles.infoList}>
                                <li className={styles.infoItem}>
                                    <span
                                        className={`${styles.infoIcon} ${styles.infoIconPhone}`}
                                        aria-hidden="true"
                                    />
                                    <a
                                        href={PHONE_TEL}
                                        className={styles.infoLink}
                                    >
                                        {PHONE_DISPLAY}
                                    </a>
                                </li>
                                <li className={styles.infoItem}>
                                    <span
                                        className={`${styles.infoIcon} ${styles.infoIconWhatsapp}`}
                                        aria-hidden="true"
                                    />
                                    <a
                                        href={WHATSAPP_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.infoLink}
                                    >
                                        WhatsApp
                                    </a>
                                </li>
                                <li className={styles.infoItem}>
                                    <span
                                        className={`${styles.infoIcon} ${styles.infoIconMail}`}
                                        aria-hidden="true"
                                    />
                                    <a
                                        href={`mailto:${EMAIL}`}
                                        className={styles.infoLink}
                                        onClick={() =>
                                            trackSiteClick({
                                                action: SITE_ACTIONS.contact_email_click,
                                                pagePath: "/contact",
                                            })
                                        }
                                    >
                                        {EMAIL}
                                    </a>
                                </li>
                                <li className={styles.infoItem}>
                                    <span
                                        className={`${styles.infoIcon} ${styles.infoIconFacebook}`}
                                        aria-hidden="true"
                                    />
                                    <a
                                        href={FACEBOOK_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.infoLink}
                                    >
                                        Facebook
                                    </a>
                                </li>
                            </ul>

                            <div className={styles.infoCtaGroup}>
                                <Button
                                    as="a"
                                    href={PHONE_TEL}
                                    variant="primary"
                                    className={styles.infoCta}
                                >
                                    <span
                                        className={styles.ctaIconPhone}
                                        aria-hidden="true"
                                    />
                                    חייגו אלינו
                                </Button>
                                <Button
                                    as="a"
                                    href={WHATSAPP_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="secondary"
                                    className={styles.infoCta}
                                >
                                    <span
                                        className={styles.ctaIconWhatsapp}
                                        aria-hidden="true"
                                    />
                                    שלחו הודעה ב-WhatsApp
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FAQ ───────────────────────────────────────── */}
            <section className={pub.sectionLight}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2Gold}>שאלות נפוצות</h2>
                    <p className={pub.sectionLead}>
                        לפני שפונים — הנה כמה תשובות לשאלות שעולות הכי הרבה.
                    </p>

                    <div className={pub.faq}>
                        {CONTACT_FAQ.map((item, i) => (
                            <details
                                key={i}
                                className={`${pub.qa} ${styles.qaLight}`}
                            >
                                <summary>{item.q}</summary>
                                <div
                                    className={`${pub.answer} ${styles.answerLight}`}
                                >
                                    {item.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Closing CTA ──────────────────────────────── */}
            <section className={pub.sectionDark}>
                <div className={pub.sectionWrap}>
                    <h2 className={pub.h2White}>אפשר להמשיך מכאן</h2>
                    <p className={pub.sectionLeadLight}>
                        יש שאלה? כתבו לנו. רוצים לראות מה כלול? עברו לדף
                        המסלולים.
                    </p>

                    <div className={styles.closingActions}>
                        <Button
                            as="a"
                            href={`mailto:${EMAIL}`}
                            variant="primary"
                        >
                            שלחו לנו מייל
                        </Button>
                        <Button as={Link} to="/pricing" variant="secondary">
                            מסלולים ומחירים
                        </Button>
                    </div>
                </div>
            </section>
        </main>
    );
}
