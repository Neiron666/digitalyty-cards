import { useState, useCallback, useEffect, useRef, useId } from "react";
import Panel from "./Panel";
import Button from "../../ui/Button";
import formStyles from "../../ui/Form.module.css";
import styles from "./FaqPanel.module.css";
import { suggestFaq, fetchAiQuota } from "../../../services/ai.service";
import AiQuotaHint from "./AiQuotaHint";
import useFocusTrap from "../../../hooks/useFocusTrap";

const MAX_ITEMS = 5;

// --- localStorage consent key ------------------------------------------------
const AI_FAQ_CONSENT_KEY = "cardigo_ai_faq_consent";

function hasAiFaqConsent() {
    try {
        return localStorage.getItem(AI_FAQ_CONSENT_KEY) === "1";
    } catch {
        return false;
    }
}

function saveAiFaqConsent() {
    try {
        localStorage.setItem(AI_FAQ_CONSENT_KEY, "1");
    } catch {
        /* blocked storage */
    }
}

// --- Error mapping -----------------------------------------------------------
function mapFaqAiError(err) {
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
    if (code === "INVALID_SUGGESTION")
        return "ה-AI החזיר תוכן לא שמיש. נסה שוב.";
    if (code === "INVALID_TARGET") return "בקשה שגויה. נסה שוב.";
    if (code === "AI_INSUFFICIENT_BUSINESS_CONTEXT")
        return "יש למלא שם עסק ותחום עיסוק לפני יצירת תוכן עם AI.";
    if (code === "AI_FAQ_NOT_EMPTY")
        return "ניתן להשתמש ב-AI רק כשרשימת השאלות ריקה.";
    return "משהו השתבש. נסה שוב מאוחר יותר.";
}

// --- Consent Modal -----------------------------------------------------------
function AiFaqConsentModal({ open, onConfirm, onCancel }) {
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
                    הצעת שאלות ותשובות באמצעות AI
                </h2>
                <p id={bodyId} className={styles.consentBody}>
                    ההצעה נוצרת באמצעות שירות בינה מלאכותית חיצוני. המידע העסקי
                    מהכרטיס שלך ישמש ליצירת השאלות והתשובות. התוכן המוצע הוא
                    המלצה בלבד — תוכל לערוך או לדחות אותו לפני שמירה.
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

function normalizeItems(items) {
    return Array.isArray(items)
        ? items
              .filter((x) => x && typeof x === "object")
              .map((x) => ({
                  q: typeof x.q === "string" ? x.q : "",
                  a: typeof x.a === "string" ? x.a : "",
              }))
        : [];
}

export default function FaqPanel({
    faq,
    disabled,
    onChange,
    cardId,
    business = {},
    onNavigateTab,
}) {
    const value = faq && typeof faq === "object" ? faq : {};

    const title = typeof value.title === "string" ? value.title : "";
    const lead = typeof value.lead === "string" ? value.lead : "";

    const items = normalizeItems(value.items);

    // Truthful emptiness: no items with both q AND a non-empty
    const hasValidItems = items.some((it) => it.q.trim() && it.a.trim());

    const incompleteCount = items.filter((it) => {
        const q = typeof it?.q === "string" ? it.q.trim() : "";
        const a = typeof it?.a === "string" ? it.a.trim() : "";
        return (q && !a) || (!q && a);
    }).length;

    // --- AI state machine ----------------------------------------------------
    const [aiState, setAiState] = useState("idle");
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [aiError, setAiError] = useState("");
    const [aiQuota, setAiQuota] = useState(null);
    const [showConsent, setShowConsent] = useState(false);

    // (B) Inflight race guard: sequence counter
    const reqSeqRef = useRef(0);

    const aiReady =
        Boolean(business?.name?.trim()) && Boolean(business?.category?.trim());
    const quotaExhausted = aiQuota && aiQuota.remaining <= 0;
    const aiEligible = !hasValidItems;

    // (A) Card-context switch: reset all AI state when cardId changes
    const prevCardIdRef = useRef(cardId);
    useEffect(() => {
        if (prevCardIdRef.current === cardId) return;
        prevCardIdRef.current = cardId;
        reqSeqRef.current += 1; // invalidate any inflight request
        setAiState("idle");
        setAiSuggestion(null);
        setAiError("");
        setAiQuota(null);
        setShowConsent(false);
    }, [cardId]);

    // (D) Fetch FAQ AI quota — re-runs when cardId changes
    useEffect(() => {
        if (!cardId) return;
        let cancelled = false;
        fetchAiQuota(cardId, "ai_faq_generation")
            .then((q) => {
                if (!cancelled) setAiQuota(q);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [cardId]);

    // (C) Auto-dismiss preview/error if FAQ becomes non-empty while AI state is active
    useEffect(() => {
        if (!hasValidItems) return;
        if (aiState === "idle") return;
        // FAQ now has valid items — clear any stale AI state
        reqSeqRef.current += 1;
        setAiSuggestion(null);
        setAiState("idle");
        setAiError("");
    }, [hasValidItems, aiState]);

    const requestSuggestion = useCallback(async () => {
        if (!cardId) return;
        // (B) Capture sequence for race detection
        const seq = ++reqSeqRef.current;
        setAiState("loading");
        setAiError("");
        setAiSuggestion(null);

        try {
            const { suggestion, quota } = await suggestFaq(cardId, {
                target: "full",
            });
            if (reqSeqRef.current !== seq) return; // stale — discard
            setAiSuggestion(suggestion);
            setAiState("preview");
            if (quota) setAiQuota(quota);
        } catch (err) {
            if (reqSeqRef.current !== seq) return; // stale — discard
            setAiError(mapFaqAiError(err));
            setAiState("error");
            const errQuota = err?.response?.data?.quota;
            if (errQuota) setAiQuota(errQuota);
        }
    }, [cardId]);

    const handleAiClick = useCallback(() => {
        if (hasAiFaqConsent()) {
            requestSuggestion();
        } else {
            setShowConsent(true);
        }
    }, [requestSuggestion]);

    const handleConsentConfirm = useCallback(() => {
        saveAiFaqConsent();
        setShowConsent(false);
        requestSuggestion();
    }, [requestSuggestion]);

    const handleConsentCancel = useCallback(() => {
        setShowConsent(false);
    }, []);

    const handleApply = useCallback(() => {
        if (!aiSuggestion?.items) return;
        // Commit ONLY faq.items from suggestion; preserve title and lead
        onChange?.({
            ...(value || {}),
            title,
            lead,
            items: aiSuggestion.items.slice(0, MAX_ITEMS).map((it) => ({
                q: typeof it.q === "string" ? it.q : "",
                a: typeof it.a === "string" ? it.a : "",
            })),
        });
        setAiSuggestion(null);
        setAiState("idle");
        setAiError("");
    }, [aiSuggestion, value, title, lead, onChange]);

    const handleDismiss = useCallback(() => {
        setAiSuggestion(null);
        setAiState("idle");
        setAiError("");
    }, []);

    function commit(next) {
        onChange?.(next);
    }

    function updateField(key, nextValue) {
        commit({
            ...(value || {}),
            [key]: nextValue,
            items,
        });
    }

    function updateItem(index, patch) {
        const nextItems = items.map((it, i) =>
            i === index ? { ...it, ...patch } : it,
        );
        commit({
            ...(value || {}),
            title,
            lead,
            items: nextItems,
        });
    }

    function addItem() {
        if (items.length >= MAX_ITEMS) return;
        const nextItems = [...items, { q: "", a: "" }];
        commit({ ...(value || {}), title, lead, items: nextItems });
    }

    function removeItem(index) {
        const nextItems = items.filter((_, i) => i !== index);
        commit({ ...(value || {}), title, lead, items: nextItems });
    }

    return (
        <Panel title="שאלות ותשובות">
            <div className={styles.fieldGroup}>
                <label className={styles.label}>
                    כותרת
                    <input
                        className={formStyles.input}
                        type="text"
                        value={title}
                        onChange={(e) => updateField("title", e.target.value)}
                        disabled={disabled}
                        placeholder="שאלות ותשובות נפוצות"
                    />
                </label>

                <label className={styles.label}>
                    תיאור קצר (אופציונלי)
                    <textarea
                        className={formStyles.textarea}
                        rows={2}
                        value={lead}
                        onChange={(e) => updateField("lead", e.target.value)}
                        disabled={disabled}
                    />
                </label>
            </div>

            {/* --- FAQ AI: readiness hint ----------------------------------- */}
            {cardId && !aiReady && (
                <span className={styles.aiReadinessHint}>
                    כדי לקבל הצעת שאלות מדויקת,{" "}
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

            {/* --- FAQ AI: empty-state CTA + loading/error/preview ---------- */}
            {cardId && (aiEligible || aiState !== "idle") && (
                <div className={styles.aiBlock}>
                    {/* Idle CTA — only when FAQ is effectively empty */}
                    {aiEligible && aiState === "idle" && (
                        <>
                            <div className={styles.aiDisclosure}>
                                ✦ ניתן לייצר שאלות ותשובות באמצעות AI
                            </div>
                            <div className={styles.aiRow}>
                                <Button
                                    variant="secondary"
                                    disabled={
                                        !aiReady || quotaExhausted || disabled
                                    }
                                    onClick={handleAiClick}
                                >
                                    הצע 3 שאלות ותשובות עם AI
                                </Button>
                                <AiQuotaHint quota={aiQuota} />
                            </div>
                        </>
                    )}

                    {/* Loading */}
                    {aiState === "loading" && (
                        <div className={styles.aiStatusRow}>
                            <Button variant="secondary" loading disabled>
                                יוצר שאלות ותשובות…
                            </Button>
                        </div>
                    )}

                    {/* Error */}
                    {aiState === "error" && (
                        <div className={styles.aiError}>
                            {aiError}
                            <Button variant="secondary" onClick={handleAiClick}>
                                נסה שוב
                            </Button>
                        </div>
                    )}

                    {/* Preview */}
                    {aiState === "preview" && aiSuggestion?.items && (
                        <div className={styles.aiPreview}>
                            <div className={styles.aiPreviewTitle}>
                                הצעת AI — שאלות ותשובות
                            </div>
                            {aiSuggestion.items.map((it, i) => (
                                <div key={i} className={styles.aiPreviewItem}>
                                    <div className={styles.aiPreviewQ}>
                                        {it.q}
                                    </div>
                                    <div className={styles.aiPreviewA}>
                                        {it.a}
                                    </div>
                                </div>
                            ))}
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

            <AiFaqConsentModal
                open={showConsent}
                onConfirm={handleConsentConfirm}
                onCancel={handleConsentCancel}
            />

            <div className={styles.items}>
                {items.map((item, index) => (
                    <div key={index} className={styles.item}>
                        <div className={styles.itemHeader}>
                            <div className={styles.itemTitle}>
                                שאלה #{index + 1}
                            </div>
                        </div>

                        <label className={styles.label}>
                            שאלה
                            <textarea
                                className={formStyles.textarea}
                                rows={2}
                                value={item.q}
                                onChange={(e) =>
                                    updateItem(index, { q: e.target.value })
                                }
                                disabled={disabled}
                            />
                        </label>

                        <label className={styles.label}>
                            תשובה
                            <textarea
                                className={formStyles.textarea}
                                rows={3}
                                value={item.a}
                                onChange={(e) =>
                                    updateItem(index, { a: e.target.value })
                                }
                                disabled={disabled}
                            />
                        </label>
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => removeItem(index)}
                            disabled={disabled}
                        >
                            מחק
                        </Button>
                    </div>
                ))}

                <div className={styles.actions}>
                    {incompleteCount ? (
                        <div className={styles.incompleteHint}>
                            יש למלא גם שאלה וגם תשובה כדי לשמור פריט FAQ.
                        </div>
                    ) : null}
                    <Button
                        size="small"
                        onClick={addItem}
                        disabled={disabled || items.length >= MAX_ITEMS}
                    >
                        הוסף שאלה
                    </Button>
                    {items.length >= MAX_ITEMS ? (
                        <div className={styles.hint}>
                            הגעת למקסימום של {MAX_ITEMS} שאלות
                        </div>
                    ) : null}
                    <div className={styles.hint}>מקסימום {MAX_ITEMS}</div>
                </div>
            </div>
        </Panel>
    );
}
