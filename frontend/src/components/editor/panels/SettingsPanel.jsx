import Panel from "./Panel";
import Button from "../../ui/Button";
import { useAuth } from "../../../context/AuthContext";

export default function SettingsPanel({
    card,
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
    const isPublicLink = Boolean(token) && isPublished && Boolean(card?.user);

    const canPublish = Boolean(token) && Boolean(card?._id) && !editingDisabled;

    return (
        <Panel title="הגדרות">
            <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>
                    סטטוס: {isPublicLink ? "Public" : "Not public yet"}
                </div>

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
                    <div style={{ wordBreak: "break-word" }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                            קישור ציבורי
                        </div>
                        <a href={publicUrl} target="_blank" rel="noreferrer">
                            {publicUrl}
                        </a>
                    </div>
                )}

                {publicUrl && !isPublicLink && (
                    <div style={{ wordBreak: "break-word" }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                            קישור עתידי
                        </div>
                        <div>{publicUrl}</div>
                        <div style={{ opacity: 0.8, marginTop: 6 }}>
                            יהפוך לציבורי אחרי הרשמה + פרסום.
                        </div>
                    </div>
                )}

                {card?.plan === "free" && (
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
