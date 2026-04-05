import { useState, useCallback, useEffect, useRef, useId } from "react";
import Panel from "./Panel";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import formStyles from "../../ui/Form.module.css";
import styles from "./ContentPanel.module.css";
import { suggestAbout, fetchAiQuota } from "../../../services/ai.service";
import AiQuotaHint from "./AiQuotaHint";
import useFocusTrap from "../../../hooks/useFocusTrap";

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
        return "יותר מדי בקשות כרגע. נסה שוב בעוד מספר דקות.";
    if (code === "AI_PROVIDER_QUOTA")
        return "מכסת שירות ה-AI החיצוני מוצתה זמנית. נסה שוב מאוחר יותר.";
    if (code === "AI_MONTHLY_LIMIT_REACHED")
        return "מכסת ה-AI החודשית מוצתה. נסה שוב בחודש הבא.";
    if (code === "AI_DISABLED") return "שירות ה-AI אינו פעיל כרגע.";
    if (code === "AI_UNAVAILABLE")
        return "שירות ה-AI אינו זמין זמנית. נסה שוב.";
    if (code === "PREMIUM_REQUIRED")
        return "יצירת תוכן עם AI זמינה למנויי פרימיום בלבד.";
    if (code === "INVALID_SUGGESTION")
        return "ה-AI החזיר תוכן לא שמיש. נסה שוב.";
    if (code === "INVALID_TARGET" || code === "INVALID_PARAGRAPH_INDEX")
        return "בקשה שגויה. נסה שוב.";
    if (code === "AI_INSUFFICIENT_BUSINESS_CONTEXT")
        return "יש למלא שם עסק ותחום עיסוק לפני יצירת תוכן עם AI.";
    return "משהו השתבש. נסה שוב מאוחר יותר.";
}

// --- Consent Modal -----------------------------------------------------------
function AiConsentModal({ open, onConfirm, onCancel }) {
    const titleId = useId();
    const bodyId = useId();
    const confirmRef = useRef(null);
    const dialogRef = useRef(null);
    useFocusTrap(dialogRef, open);

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
            ref={dialogRef}
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

export default function ContentPanel({
    content = {},
    cardId,
    onChange,
    business = {},
    onNavigateTab,
    entitlements,
    plan,
}) {
    const maxParagraphs = entitlements?.maxContentParagraphs ?? 3;
    const canUseVideo = entitlements?.canUseVideo !== false;
    const aiLocked = plan === "free";
    const aboutParagraphsRaw =
        Array.isArray(content.aboutParagraphs) && content.aboutParagraphs.length
            ? content.aboutParagraphs
            : typeof content.aboutText === "string" && content.aboutText.trim()
              ? content.aboutText.split(/\n\s*\n/)
              : [""];

    const aboutParagraphs = aboutParagraphsRaw
        .slice(0, maxParagraphs)
        .map((v) => (typeof v === "string" ? v : ""));

    function commitAboutParagraphs(nextParagraphs) {
        const safe = Array.isArray(nextParagraphs)
            ? nextParagraphs.slice(0, maxParagraphs)
            : [""];

        onChange({
            aboutParagraphs: safe,
            // Legacy bridge (tolerant writer). Backend will normalize/filter empties.
            aboutText: safe.join("\n\n"),
        });
    }

    // --- Shared AI quota state -----------------------------------------------
    const [aiQuota, setAiQuota] = useState(null);

    useEffect(() => {
        if (!cardId) return;
        let cancelled = false;
        fetchAiQuota(cardId)
            .then((q) => {
                if (!cancelled) setAiQuota(q);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [cardId]);

    // --- Unified AI state machine --------------------------------------------
    // aiState: "idle" | "loading" | "preview" | "error"
    // aiTarget: "full" | "title" | "paragraph" | null
    const [aiState, setAiState] = useState("idle");
    const [aiTarget, setAiTarget] = useState(null);
    const [aiParagraphIndex, setAiParagraphIndex] = useState(null);
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [aiError, setAiError] = useState("");
    const [showConsent, setShowConsent] = useState(false);
    const [pendingTarget, setPendingTarget] = useState(null);
    const [pendingParagraphIndex, setPendingParagraphIndex] = useState(null);

    const hasExistingAbout =
        Boolean(content.aboutTitle?.trim()) ||
        (Array.isArray(content.aboutParagraphs) &&
            content.aboutParagraphs.some(
                (p) => typeof p === "string" && p.trim(),
            ));

    const quotaExhausted = aiQuota && aiQuota.remaining <= 0;

    const aiReady =
        Boolean(business?.name?.trim()) && Boolean(business?.category?.trim());

    // Bulk CTA is only eligible when the About block is completely empty.
    const hasTitleFilled = Boolean(content.aboutTitle?.trim());
    const hasParagraphsFilled =
        Array.isArray(content.aboutParagraphs) &&
        content.aboutParagraphs.some((p) => typeof p === "string" && p.trim());
    const bulkEligible = !hasTitleFilled && !hasParagraphsFilled;

    const requestSuggestion = useCallback(
        async (target, paragraphIndex) => {
            if (!cardId) return;
            setAiState("loading");
            setAiTarget(target);
            setAiParagraphIndex(target === "paragraph" ? paragraphIndex : null);
            setAiError("");
            setAiSuggestion(null);

            try {
                const mode = hasExistingAbout ? "improve" : "create";
                const payload = { mode, language: "he", target };
                if (target === "paragraph") {
                    payload.paragraphIndex = paragraphIndex;
                }
                const { suggestion, quota } = await suggestAbout(
                    cardId,
                    payload,
                );
                setAiSuggestion(suggestion);
                setAiState("preview");
                if (quota) setAiQuota(quota);
            } catch (err) {
                setAiError(mapAiError(err));
                setAiState("error");
                // Update quota from error response if available
                const errQuota = err?.response?.data?.quota;
                if (errQuota) setAiQuota(errQuota);
            }
        },
        [cardId, hasExistingAbout],
    );

    const handleAiClick = useCallback(
        (target, paragraphIndex) => {
            if (hasAiAboutConsent()) {
                requestSuggestion(target, paragraphIndex);
            } else {
                setPendingTarget(target);
                setPendingParagraphIndex(paragraphIndex);
                setShowConsent(true);
            }
        },
        [requestSuggestion],
    );

    const handleConsentConfirm = useCallback(() => {
        saveAiAboutConsent();
        setShowConsent(false);
        requestSuggestion(pendingTarget ?? "full", pendingParagraphIndex);
    }, [requestSuggestion, pendingTarget, pendingParagraphIndex]);

    const handleConsentCancel = useCallback(() => {
        setShowConsent(false);
        setPendingTarget(null);
        setPendingParagraphIndex(null);
    }, []);

    // --- Apply per target ----------------------------------------------------
    const handleApply = useCallback(() => {
        if (!aiSuggestion) return;

        if (aiTarget === "title") {
            onChange({ aboutTitle: aiSuggestion.aboutTitle || "" });
        } else if (aiTarget === "paragraph" && aiParagraphIndex != null) {
            const next = aboutParagraphs.slice();
            next[aiParagraphIndex] = aiSuggestion.aboutParagraph || "";
            commitAboutParagraphs(next);
        } else {
            // full
            const title = aiSuggestion.aboutTitle || "";
            const paras = Array.isArray(aiSuggestion.aboutParagraphs)
                ? aiSuggestion.aboutParagraphs.slice(0, maxParagraphs)
                : [];
            onChange({ aboutTitle: title });
            commitAboutParagraphs(paras.length ? paras : [""]);
        }

        setAiSuggestion(null);
        setAiTarget(null);
        setAiParagraphIndex(null);
        setAiState("idle");
    }, [aiSuggestion, aiTarget, aiParagraphIndex, aboutParagraphs, onChange]);

    const handleDismiss = useCallback(() => {
        setAiSuggestion(null);
        setAiTarget(null);
        setAiParagraphIndex(null);
        setAiState("idle");
        setAiError("");
    }, []);

    // --- Delete paragraph ----------------------------------------------------
    const handleDeleteParagraph = useCallback(
        (index) => {
            const next = aboutParagraphs.filter((_, i) => i !== index);
            commitAboutParagraphs(next.length ? next : [""]);

            // Clear preview if it was for the deleted paragraph
            if (aiTarget === "paragraph" && aiParagraphIndex === index) {
                handleDismiss();
            } else if (
                aiTarget === "paragraph" &&
                aiParagraphIndex != null &&
                aiParagraphIndex > index
            ) {
                // Shift paragraph index down
                setAiParagraphIndex(aiParagraphIndex - 1);
            }
        },
        [aboutParagraphs, aiTarget, aiParagraphIndex, handleDismiss],
    );

    // --- Preview rendering helpers -------------------------------------------
    function renderPreviewContent() {
        if (!aiSuggestion) return null;
        if (aiTarget === "title") {
            return <strong>{aiSuggestion.aboutTitle}</strong>;
        }
        if (aiTarget === "paragraph") {
            return <p>{aiSuggestion.aboutParagraph}</p>;
        }
        // full
        return (
            <>
                {aiSuggestion.aboutTitle && (
                    <strong>{aiSuggestion.aboutTitle}</strong>
                )}
                {Array.isArray(aiSuggestion.aboutParagraphs) &&
                    aiSuggestion.aboutParagraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                    ))}
            </>
        );
    }

    function renderPreviewLabel() {
        if (aiTarget === "title") return "הצעת AI — כותרת";
        if (aiTarget === "paragraph")
            return `הצעת AI — פסקה ${(aiParagraphIndex ?? 0) + 1}`;
        return "הצעת AI — בלוק מלא";
    }

    // --- Shared inline preview block -----------------------------------------
    function renderAiPreview() {
        if (aiState !== "preview" || !aiSuggestion) return null;
        return (
            <div className={styles.aiPreview}>
                <div className={styles.aiPreviewTitle}>
                    {renderPreviewLabel()}
                </div>
                <div className={styles.aiPreviewContent}>
                    {renderPreviewContent()}
                </div>
                <div className={styles.aiActions}>
                    <Button variant="primary" onClick={handleApply}>
                        החל הצעה
                    </Button>
                    <Button variant="secondary" onClick={handleDismiss}>
                        דחה
                    </Button>
                </div>
            </div>
        );
    }

    // --- Loading/error state (shared) ----------------------------------------
    function renderAiStatus() {
        if (aiState === "loading") {
            return (
                <div className={styles.aiStatusRow}>
                    <Button variant="secondary" loading disabled>
                        יוצר הצעה…
                    </Button>
                </div>
            );
        }
        if (aiState === "error") {
            return (
                <div className={styles.aiError}>
                    {aiError}
                    <Button
                        variant="secondary"
                        onClick={() =>
                            handleAiClick(aiTarget ?? "full", aiParagraphIndex)
                        }
                    >
                        נסה שוב
                    </Button>
                </div>
            );
        }
        return null;
    }

    return (
        <Panel title="תוכן">
            {/* --- About Title ----------------------------------------------- */}
            <Input
                label="כותרת אודות"
                value={content.aboutTitle || ""}
                onChange={(e) => onChange({ aboutTitle: e.target.value })}
            />

            {cardId && !aiLocked && !aiReady && (
                <span className={styles.aiReadinessHint}>
                    כדי לקבל הצעת תוכן מדויקת,{" "}
                    {onNavigateTab ? (
                        <button
                            type="button"
                            className={styles.aiReadinessLink}
                            onClick={() => onNavigateTab("business")}
                        >
                            מלאו קודם את שם העסק ותחום העיסוק
                        </button>
                    ) : (
                        <>מלאו קודם את שם העסק ותחום העיסוק</>
                    )}
                </span>
            )}

            {cardId && !aiLocked && (
                <div className={styles.fieldAiRow}>
                    <button
                        type="button"
                        className={styles.fieldAiButton}
                        disabled={
                            !aiReady || quotaExhausted || aiState === "loading"
                        }
                        onClick={() => handleAiClick("title")}
                    >
                        ✦ הצע כותרת עם AI
                    </button>
                    <AiQuotaHint quota={aiQuota} />
                </div>
            )}

            {/* Title preview shown inline */}
            {aiTarget === "title" && renderAiStatus()}
            {aiTarget === "title" && renderAiPreview()}

            {/* --- About Paragraphs ------------------------------------------ */}
            <div className={styles.aboutBlock}>
                <div className={styles.aboutLabelTitle}>טקסט אודות</div>

                {aboutParagraphs.map((value, index) => (
                    <div key={index} className={styles.paragraphBlock}>
                        <label className={styles.aboutParagraph}>
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

                        {cardId && (
                            <div className={styles.paragraphActionRow}>
                                {!aiLocked && (
                                    <button
                                        type="button"
                                        className={styles.fieldAiButton}
                                        disabled={
                                            !aiReady ||
                                            quotaExhausted ||
                                            aiState === "loading"
                                        }
                                        onClick={() =>
                                            handleAiClick("paragraph", index)
                                        }
                                    >
                                        ✦ הצע פסקה עם AI
                                    </button>
                                )}
                                {aboutParagraphs.length > 1 && (
                                    <button
                                        type="button"
                                        className={styles.deleteParagraphButton}
                                        onClick={() =>
                                            handleDeleteParagraph(index)
                                        }
                                    >
                                        מחק פסקה
                                    </button>
                                )}
                                {!aiLocked && <AiQuotaHint quota={aiQuota} />}
                            </div>
                        )}

                        {/* Paragraph-specific preview shown inline */}
                        {aiTarget === "paragraph" &&
                            aiParagraphIndex === index &&
                            renderAiStatus()}
                        {aiTarget === "paragraph" &&
                            aiParagraphIndex === index &&
                            renderAiPreview()}
                    </div>
                ))}

                <button
                    type="button"
                    className={styles.addParagraphButton}
                    onClick={() => {
                        if (aboutParagraphs.length >= maxParagraphs) return;
                        commitAboutParagraphs([...aboutParagraphs, ""]);
                    }}
                    disabled={aboutParagraphs.length >= maxParagraphs}
                >
                    + הוסף פסקה חדשה
                </button>
                {maxParagraphs <= 1 && (
                    <div className={styles.hint}>
                        הוספת פסקאות נוספות זמינה במסלול פרמיום
                    </div>
                )}
            </div>

            {cardId && aiLocked && (
                <div className={styles.aiLockedBlock}>
                    <div className={styles.aiLockedTitle}>
                        ✦ יצירת תוכן עם AI
                    </div>
                    <div className={styles.aiLockedText}>
                        יצירת תוכן באמצעות AI זמינה למנויי פרימיום בלבד.
                    </div>
                    <a href="/pricing" className={styles.aiLockedCta}>
                        שדרג לפרימיום
                    </a>
                </div>
            )}

            {/* --- Full block AI action (create-only, shown when About is empty) */}
            {cardId && !aiLocked && (bulkEligible || aiTarget === "full") && (
                <div className={styles.aiBlock}>
                    {/* Idle CTA — only when both fields are empty */}
                    {bulkEligible && aiTarget !== "full" && (
                        <>
                            <div className={styles.aiDisclosure}>
                                ✦ ניתן לייצר את כל בלוק האודות בבת אחת
                            </div>
                            <div className={styles.fieldAiRow}>
                                <Button
                                    variant="secondary"
                                    disabled={
                                        !aiReady ||
                                        quotaExhausted ||
                                        aiState === "loading"
                                    }
                                    onClick={() => handleAiClick("full")}
                                >
                                    הצע בלוק אודות מלא עם AI
                                </Button>
                                <AiQuotaHint quota={aiQuota} />
                            </div>
                        </>
                    )}

                    {/* Full-block loading/error/preview — stays visible while flow is active */}
                    {aiTarget === "full" && renderAiStatus()}
                    {aiTarget === "full" && renderAiPreview()}
                </div>
            )}

            <AiConsentModal
                open={showConsent}
                onConfirm={handleConsentConfirm}
                onCancel={handleConsentCancel}
            />

            {canUseVideo && (
                <>
                    <Input
                        label="קישור לסרטון YouTube"
                        value={content.videoUrl || ""}
                        onChange={(e) => onChange({ videoUrl: e.target.value })}
                        placeholder="https://www.youtube.com/..."
                    />
                    <div className={styles.hint}>Paste a YouTube link</div>
                </>
            )}
        </Panel>
    );
}
