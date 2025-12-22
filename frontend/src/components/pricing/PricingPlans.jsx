import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import BillingToggle from "./BillingToggle";
import styles from "./PricingPlans.module.css";

export default function PricingPlans() {
    const [billing, setBilling] = useState("yearly");

    const price = billing === "monthly" ? "₪29.99" : "₪299";
    const note = billing === "monthly" ? "לחודש" : "לשנה";
    const saving = billing === "yearly" ? "חוסך ₪60 לעומת חודשי" : null;

    return (
        <section className={styles.wrapper}>
            <div className={styles.top}>
                <BillingToggle value={billing} onChange={setBilling} />
                {saving && <div className={styles.saving}>{saving}</div>}
            </div>

            <div className={styles.grid}>
                {/* TRIAL */}
                <div className={styles.plan}>
                    <div className={styles.header}>
                        <h3>ניסיון חינמי</h3>
                        <div className={styles.price}>₪0</div>
                        <div className={styles.note}>ל־7 ימים</div>
                    </div>

                    <ul className={styles.features}>
                        <li>גישה מלאה לכל התכונות</li>
                        <li>כרטיס אחד</li>
                        <li>גלריה, וידאו וטופס לידים</li>
                    </ul>

                    <div className={styles.warning}>לאחר 7 ימים נדרש שדרוג</div>

                    <Button
                        as={Link}
                        to="/register"
                        variant="secondary"
                        fullWidth
                    >
                        התחלת ניסיון
                    </Button>
                </div>

                {/* PREMIUM */}
                <div className={`${styles.plan} ${styles.highlight}`}>
                    <div className={styles.badge}>מומלץ</div>

                    <div className={styles.header}>
                        <h3>פרימיום</h3>
                        <div className={styles.price}>{price}</div>
                        <div className={styles.note}>{note}</div>
                    </div>

                    <ul className={styles.features}>
                        <li>כל התכונות פתוחות</li>
                        <li>כרטיס ללא הגבלת זמן</li>
                        <li>עדכונים חופשיים</li>
                        <li>תמיכה בסיסית</li>
                    </ul>

                    <Button
                        as={Link}
                        to="/register"
                        variant="primary"
                        fullWidth
                    >
                        שדרג עכשיו
                    </Button>
                </div>
            </div>
        </section>
    );
}
