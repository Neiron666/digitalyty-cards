import { Link } from "react-router-dom";
import Button from "../ui/Button";
import styles from "./CardsEmpty.module.css";

export default function CardsEmpty() {
    return (
        <div className={styles.empty}>
            <div className={styles.box}>
                <h3>עדיין אין כרטיסים ציבוריים</h3>
                <p>
                    כאן יוצגו כרטיסי ביקור דיגיטליים אמיתיים שנוצרו על ידי
                    משתמשים.
                </p>
                <p>הכרטיס הראשון יכול להיות שלך.</p>

                <div className={styles.actions}>
                    <Button as={Link} to="/register" variant="primary">
                        צור כרטיס חינם
                    </Button>
                    <Button as={Link} to="/" variant="secondary">
                        חזרה לדף הבית
                    </Button>
                </div>
            </div>
        </div>
    );
}
