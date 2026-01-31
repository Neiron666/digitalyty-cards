import { useEffect, useMemo, useState } from "react";
import Panel from "./Panel";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
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
    isDeleting,
    onPublish,
    onUnpublish,
    onUpdateSlug,
}) {
    const { token } = useAuth();
    const slug = card?.slug;
    const publicUrl = slug ? `${window.location.origin}/card/${slug}` : "";
    const isPublished = card?.status === "published";
    const isPublicLink = Boolean(token) && isPublished;

    const [slugDraft, setSlugDraft] = useState(() => String(slug || ""));
    const [slugBusy, setSlugBusy] = useState(false);
    const [slugError, setSlugError] = useState("");
    const [slugOk, setSlugOk] = useState("");

    useEffect(() => {
        setSlugDraft(String(slug || ""));
        setSlugError("");
        setSlugOk("");
    }, [slug]);

    const canEditSlug = useMemo(() => {
        return (
            Boolean(token) &&
            card?.status === "draft" &&
            !editingDisabled &&
            typeof onUpdateSlug === "function"
        );
    }, [token, card?.status, editingDisabled, onUpdateSlug]);

    const previewUrl = useMemo(() => {
        const s = String(slugDraft || "").trim();
        return s ? `${window.location.origin}/card/${s}` : "";
    }, [slugDraft]);

    function mapSlugError(err) {
        const code = err?.response?.data?.code;
        if (code === "INVALID_SLUG") return "סלאג לא תקין.";
        if (code === "SLUG_TAKEN") return "הסלאג כבר תפוס.";
        if (code === "SLUG_ONLY_DRAFT") return "אפשר לשנות סלאג רק בטיוטה.";
        if (code === "SLUG_REQUIRES_AUTH")
            return "כדי לבחור סלאג מותאם יש להתחבר.";
        if (code === "SLUG_CHANGE_LIMIT") return "הגעת למגבלת 2 שינויים בחודש.";
        return "לא הצלחנו לעדכן סלאג.";
    }

    async function handleSlugSave() {
        if (!canEditSlug) return;

        const nextSlug = String(slugDraft || "").trim();
        if (!nextSlug) {
            setSlugError("יש להזין סלאג.");
            return;
        }

        setSlugBusy(true);
        setSlugError("");
        setSlugOk("");
        try {
            const updated = await onUpdateSlug(nextSlug);
            const s = String(updated || "").trim();
            if (s) {
                setSlugDraft(s);
                setSlugOk("הסלאג עודכן.");
            } else {
                setSlugOk("הסלאג עודכן.");
            }
        } catch (err) {
            setSlugError(mapSlugError(err));
        } finally {
            setSlugBusy(false);
        }
    }

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

                {Boolean(token) && (
                    <div className={styles.slugBlock}>
                        <div className={styles.urlTitle}>סלאג (כתובת קצרה)</div>

                        <Input
                            label="לאחר ‎/card/‎"
                            value={slugDraft}
                            onChange={(e) => {
                                setSlugDraft(e.target.value);
                                setSlugError("");
                                setSlugOk("");
                            }}
                            placeholder="my-business"
                            dir="ltr"
                            autoComplete="off"
                            spellCheck={false}
                            className={styles.slugInput}
                            error={slugError}
                            disabled={!canEditSlug || slugBusy}
                        />

                        <div className={styles.slugHelp}>
                            אפשר לשנות סלאג רק בטיוטה ועד פעמיים בחודש.
                        </div>

                        {previewUrl ? (
                            <div className={styles.slugPreview} dir="ltr">
                                {previewUrl}
                            </div>
                        ) : null}

                        {slugOk ? (
                            <div className={styles.slugOk}>{slugOk}</div>
                        ) : null}

                        <div className={styles.slugActions}>
                            <Button
                                variant="secondary"
                                disabled={
                                    !canEditSlug ||
                                    slugBusy ||
                                    String(slugDraft || "").trim() ===
                                        String(slug || "").trim()
                                }
                                onClick={handleSlugSave}
                            >
                                {slugBusy ? "מעדכן..." : "עדכון סלאג"}
                            </Button>
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
                    disabled={!card?._id || Boolean(isDeleting)}
                >
                    {isDeleting ? (
                        <span className={styles.deleteInline}>
                            <span
                                className={styles.spinner}
                                aria-hidden="true"
                            />
                            מוחק...
                        </span>
                    ) : (
                        "מחיקת כרטיס"
                    )}
                </Button>
            </div>
        </Panel>
    );
}
