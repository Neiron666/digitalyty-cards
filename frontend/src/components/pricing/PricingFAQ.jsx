import { useState } from "react";
import styles from "./PricingFAQ.module.css";

const FAQ = [
    {
        q: "מה קורה אחרי 7 ימי הניסיון?",
        a: "לאחר סיום תקופת הניסיון החינמי (7 ימים), נדרש שדרוג לתכנית פרימיום כדי להמשיך להשתמש בכרטיס הביקור הדיגיטלי.",
    },
    {
        q: "האם ניתן לבטל את המנוי החודשי?",
        a: "כן. ניתן לבטל את התכנית החודשית בכל עת. הביטול ייכנס לתוקף בסוף תקופת החיוב הנוכחית.",
    },
    {
        q: "מה ההבדל בין חודשי לשנתי?",
        a: "התכנית החודשית מציעה גמישות מלאה במחיר חודשי, בעוד שהתכנית השנתית משתלמת יותר וחוסכת כסף לשימוש ארוך טווח.",
    },
    {
        q: "האם יש התחייבות?",
        a: "אין התחייבות ארוכת טווח. ניתן לבחור בתכנית חודשית ללא התחייבות או בתכנית שנתית בתשלום מראש.",
    },
    {
        q: "האם אפשר לשדרג או לשנות תכנית?",
        a: "כן. ניתן לשדרג או לשנות תכנית בכל עת דרך הדשבורד האישי.",
    },
    {
        q: "האם הכרטיס נשאר פעיל אם מפסיקים לשלם?",
        a: "לא. לאחר סיום המנוי ללא חידוש, הכרטיס יפסיק להיות פעיל עד לחידוש התשלום.",
    },
];

export default function PricingFAQ() {
    const [open, setOpen] = useState(null);

    return (
        <section className={styles.faq}>
            <h2 className={styles.title}>שאלות נפוצות על מחירים</h2>

            <div className={styles.list}>
                {FAQ.map((item, i) => (
                    <div
                        key={i}
                        className={`${styles.item} ${
                            open === i ? styles.open : ""
                        }`}
                    >
                        <button
                            className={styles.question}
                            onClick={() => setOpen(open === i ? null : i)}
                            aria-expanded={open === i}
                        >
                            <span>{item.q}</span>
                            <span className={styles.icon}>
                                {open === i ? "−" : "+"}
                            </span>
                        </button>

                        <div className={styles.answer}>
                            <p>{item.a}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
