import styles from "./AiQuotaHint.module.css";

export default function AiQuotaHint({ quota }) {
    if (!quota) return null;
    return (
        <span className={styles.quotaHint}>
            נותרו {quota.remaining}/{quota.limit} הצעות AI החודש
        </span>
    );
}
