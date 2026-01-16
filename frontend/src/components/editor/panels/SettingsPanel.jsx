import Panel from "./Panel";
import Button from "../../ui/Button";
import { useAuth } from "../../../context/AuthContext";
import styles from "./SettingsPanel.module.css";

function formatDate(value) {
    if (!value) return "";
    try {
        return new Date(value).toLocaleDateString();
    } catch {
        return "";
    }
}

export default function SettingsPanel({
    card,
    plan,
    onDelete,
    onUpgrade,
    editingDisabled,
    onPublish,
    onUnpublish,
}) {
    const { token } = useAuth();
    const slug = card?.slug;
    const publicUrl = slug ? `${window.location.origin}/card/${slug}` : "";
    const isPublished = card?.status === "published";
    const isPublicLink = Boolean(token) && isPublished;

    const eb = card?.effectiveBilling || null;
    const accessUntil = eb?.until ? formatDate(eb.until) : "";

    let accessLine = "";
    if (eb?.source === "adminOverride") {
        accessLine = accessUntil
            ? `גישה אדמינית עד ${accessUntil}`
            : "גישה אדמינית פעילה";
    } else if (eb?.source === "billing") {
        accessLine = accessUntil ? `בתשלום עד ${accessUntil}` : "בתשלום";
    } else if (eb?.source === "trial") {
        accessLine = accessUntil ? `ניסיון עד ${accessUntil}` : "ניסיון פעיל";
    } else if (eb?.isEntitled === false) {
        accessLine = "אין גישה";
    }

    const canPublish = Boolean(token) && Boolean(card?._id) && !editingDisabled;

    return (
        <Panel title="הגדרות">
            <div className={styles.grid}>
                <div className={styles.strong}>
                    סטטוס: {isPublicLink ? "Public" : "Not public yet"}
                </div>

                {accessLine && (
                    <div className={styles.accessLine}>{accessLine}</div>
                )}

                {Boolean(token) && card?.status !== "published" && (
                    <Button
                        variant="primary"
                        disabled={!canPublish}
                        onClick={() => onPublish?.()}
                    >
                        פרסום
                    </Button>
                )}

                {Boolean(token) && card?.status === "published" && (
                    <Button
                        variant="secondary"
                        disabled={!Boolean(card?._id) || editingDisabled}
                        onClick={() => onUnpublish?.()}
                    >
                        החזרה לטיוטה
                    </Button>
                )}

                {publicUrl && isPublicLink && (
                    <div className={styles.urlBlock}>
                        <div className={styles.urlTitle}>קישור ציבורי</div>
                        <a href={publicUrl} target="_blank" rel="noreferrer">
                            {publicUrl}
                        </a>
                    </div>
                )}

                {publicUrl && !isPublicLink && (
                    <div className={styles.urlBlock}>
                        <div className={styles.urlTitle}>קישור עתידי</div>
                        <div>{publicUrl}</div>
                        <div className={styles.urlNote}>
                            יהפוך לציבורי אחרי הרשמה + פרסום.
                        </div>
                    </div>
                )}

                {plan === "free" && (
                    <Button
                        variant="secondary"
                        onClick={() => onUpgrade?.("monthly")}
                    >
                        שדרוג לחבילה חודשית – 29.90 ₪
                    </Button>
                )}

                <Button
                    variant="ghost"
                    onClick={onDelete}
                    disabled={!card?._id}
                >
                    מחיקת כרטיס
                </Button>
            </div>
        </Panel>
    );
}
