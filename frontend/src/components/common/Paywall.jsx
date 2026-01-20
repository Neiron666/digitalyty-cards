import styles from "./Paywall.module.css";

export default function Paywall({ text, onUpgrade }) {
    return (
        <div className={styles.paywall}>
            <p>{text}</p>
            <button onClick={onUpgrade}>שדרג עכשיו</button>
        </div>
    );
}
