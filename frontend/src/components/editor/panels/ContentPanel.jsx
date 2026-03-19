import { useState, useCallback, useEffect, useRef, useId } from "react";
import Panel from "./Panel";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import formStyles from "../../ui/Form.module.css";
import styles from "./ContentPanel.module.css";
import { suggestAbout } from "../../../services/ai.service";

// --- localStorage consent key ------------------------------------------------
const AI_ABOUT_CONSENT_KEY = "cardigo_ai_about_consent";

function hasAiAboutConsent() {
    try {
        return localStorage.getItem(AI_ABOUT_CONSENT_KEY) === "1";
    } catch {
        return false;
    }
}

function saveAiAboutConsent() {
    try {
        localStorage.setItem(AI_ABOUT_CONSENT_KEY, "1");
    } catch {
        // blocked storage — proceed anyway after in-session acceptance
    }
}

// --- Error mapping -----------------------------------------------------------
function mapAiError(err) {
    const code = err?.response?.data?.code;
    const status = err?.response?.status;

    if (status === 401) return "יש להתחבר מחדש כדי להשתמש בשירות זה.";
    if (code === "RATE_LIMITED")
        return "הגעת למגבלת ההצעות היומית. נסה שוב מחר.";
    if (code === "AI_DISABLED") return "שירות ה-AI אינו פעיל כרגע.";
    if (code === "AI_UNAVAILABLE")
        return "שירות ה-AI אינו זמין זמנית. נסה שוב.";
    return "משהו השתבש. נסה שוב מאוחר יותר.";
}

// --- Consent Modal -----------------------------------------------------------
function AiConsentModal({ open, onConfirm, onCancel }) {
    const titleId = useId();
    const bodyId = useId();
    const confirmRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => confirmRef.current?.focus?.(), 0);
        return () => clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onCancel?.();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            className={styles.consentOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onCancel?.();
            }}
        >
            <div className={styles.consentDialog} dir="rtl">
                <h2 id={titleId} className={styles.consentTitle}>
                    הצעת תוכן באמצעות AI
                </h2>
                <p id={bodyId} className={styles.consentBody}>
                    ההצעה נוצרת באמצעות שירות בינה מלאכותית חיצוני. המידע העסקי
                    מהכרטיס שלך ישמש ליצירת הטקסט. התוכן המוצע הוא המלצה בלבד —
                    תוכל לערוך או לדחות אותו לפני שמירה.
                </p>
                <div className={styles.consentActions}>
                    <button
                        ref={confirmRef}
                        type="button"
                        className={styles.consentConfirm}
                        onClick={onConfirm}
                    >
                        המשך
                    </button>
                    <button
                        type="button"
                        className={styles.consentCancel}
                        onClick={onCancel}
                    >
                        ביטול
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ContentPanel({ content = {}, cardId, onChange }) {
    const aboutParagraphsRaw =
        Array.isArray(content.aboutParagraphs) && content.aboutParagraphs.length
            ? content.aboutParagraphs
            : typeof content.aboutText === "string" && content.aboutText.trim()
              ? content.aboutText.split(/\n\s*\n/)
              : [""];

    const aboutParagraphs = aboutParagraphsRaw
        .slice(0, 3)
        .map((v) => (typeof v === "string" ? v : ""));

    function commitAboutParagraphs(nextParagraphs) {
        const safe = Array.isArray(nextParagraphs)
            ? nextParagraphs.slice(0, 3)
            : [""];

        onChange({
            aboutParagraphs: safe,
            // Legacy bridge (tolerant writer). Backend will normalize/filter empties.
            aboutText: safe.join("\n\n"),
        });
    }

    // --- AI suggestion state -------------------------------------------------
    // "idle" | "loading" | "preview" | "error"
    const [aiState, setAiState] = useState("idle");
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [aiError, setAiError] = useState("");
    const [showConsent, setShowConsent] = useState(false);

    const hasExistingAbout =
        Boolean(content.aboutTitle?.trim()) ||
        (Array.isArray(content.aboutParagraphs) &&
            content.aboutParagraphs.some(
                (p) => typeof p === "string" && p.trim(),
            ));

    const requestSuggestion = useCallback(async () => {
        if (!cardId) return;
        setAiState("loading");
        setAiError("");
        setAiSuggestion(null);

        try {
            const mode = hasExistingAbout ? "improve" : "create";
            const suggestion = await suggestAbout(cardId, {
                mode,
                language: "he",
            });
            setAiSuggestion(suggestion);
            setAiState("preview");
        } catch (err) {
            setAiError(mapAiError(err));
            setAiState("error");
        }
    }, [cardId, hasExistingAbout]);

    const handleAiClick = useCallback(() => {
        if (hasAiAboutConsent()) {
            requestSuggestion();
        } else {
            setShowConsent(true);
        }
    }, [requestSuggestion]);

    const handleConsentConfirm = useCallback(() => {
        saveAiAboutConsent();
        setShowConsent(false);
        requestSuggestion();
    }, [requestSuggestion]);

    const handleConsentCancel = useCallback(() => {
        setShowConsent(false);
    }, []);

    const handleApply = useCallback(() => {
        if (!aiSuggestion) return;
        const title = aiSuggestion.aboutTitle || "";
        const paras = Array.isArray(aiSuggestion.aboutParagraphs)
            ? aiSuggestion.aboutParagraphs.slice(0, 3)
            : [];

        onChange({ aboutTitle: title });
        commitAboutParagraphs(paras.length ? paras : [""]);

        setAiSuggestion(null);
        setAiState("idle");
    }, [aiSuggestion, onChange]);

    const handleDismiss = useCallback(() => {
        setAiSuggestion(null);
        setAiState("idle");
        setAiError("");
    }, []);

    return (
        <Panel title="תוכן">
            <Input
                label="כותרת אודות"
                value={content.aboutTitle || ""}
                onChange={(e) => onChange({ aboutTitle: e.target.value })}
            />

            <div className={styles.aboutBlock}>
                <div className={styles.aboutLabelTitle}>טקסט אודות</div>

                {aboutParagraphs.map((value, index) => (
                    <label key={index} className={styles.aboutParagraph}>
                        <textarea
                            rows={5}
                            value={value}
                            onChange={(e) => {
                                const next = aboutParagraphs.slice();
                                next[index] = e.target.value;
                                commitAboutParagraphs(next);
                            }}
                            className={formStyles.textarea}
                        />
                    </label>
                ))}

                <button
                    type="button"
                    className={styles.addParagraphButton}
                    onClick={() => {
                        if (aboutParagraphs.length >= 3) return;
                        commitAboutParagraphs([...aboutParagraphs, ""]);
                    }}
                    disabled={aboutParagraphs.length >= 3}
                >
                    + הוסף פסקה חדשה
                </button>
            </div>

            {/* --- AI Suggestion Block ---------------------------------------- */}
            {cardId && (
                <div className={styles.aiBlock}>
                    <div className={styles.aiDisclosure}>
                        ✦ ניתן לקבל הצעת טקסט אודות באמצעות בינה מלאכותית
                    </div>

                    {aiState === "idle" && (
                        <Button variant="secondary" onClick={handleAiClick}>
                            הצע טקסט עם AI
                        </Button>
                    )}

                    {aiState === "loading" && (
                        <Button variant="secondary" loading disabled>
                            יוצר הצעה…
                        </Button>
                    )}

                    {aiState === "error" && (
                        <div className={styles.aiError}>
                            {aiError}
                            <Button variant="secondary" onClick={handleAiClick}>
                                נסה שוב
                            </Button>
                        </div>
                    )}

                    {aiState === "preview" && aiSuggestion && (
                        <div className={styles.aiPreview}>
                            <div className={styles.aiPreviewTitle}>
                                הצעת AI — תצוגה מקדימה
                            </div>
                            <div className={styles.aiPreviewContent}>
                                {aiSuggestion.aboutTitle && (
                                    <strong>{aiSuggestion.aboutTitle}</strong>
                                )}
                                {Array.isArray(aiSuggestion.aboutParagraphs) &&
                                    aiSuggestion.aboutParagraphs.map((p, i) => (
                                        <p key={i}>{p}</p>
                                    ))}
                            </div>
                            <div className={styles.aiActions}>
                                <Button variant="primary" onClick={handleApply}>
                                    החל הצעה
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={handleDismiss}
                                >
                                    דחה
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <AiConsentModal
                open={showConsent}
                onConfirm={handleConsentConfirm}
                onCancel={handleConsentCancel}
            />

            <Input
                label="קישור לסרטון YouTube"
                value={content.videoUrl || ""}
                onChange={(e) => onChange({ videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/..."
            />
            <div className={styles.hint}>Paste a YouTube link</div>
        </Panel>
    );
}
