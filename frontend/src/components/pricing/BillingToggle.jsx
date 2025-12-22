import styles from "./BillingToggle.module.css";

export default function BillingToggle({ value, onChange }) {
    return (
        <div className={styles.toggle}>
            <button
                className={value === "monthly" ? styles.active : ""}
                onClick={() => onChange("monthly")}
            >
                חודשי
            </button>
            <button
                className={value === "yearly" ? styles.active : ""}
                onClick={() => onChange("yearly")}
            >
                שנתי
                <span className={styles.save}>חיסכון</span>
            </button>
        </div>
    );
}
