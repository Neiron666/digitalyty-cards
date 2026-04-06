import {
    useMemo,
    useState,
    useCallback,
    useEffect,
    useRef,
    useId,
} from "react";
import Panel from "./Panel";
import formStyles from "../../ui/Form.module.css";
import styles from "./SeoPanel.module.css";
import { suggestSeo, fetchAiQuota } from "../../../services/ai.service";
import AiQuotaHint from "./AiQuotaHint";
import useFocusTrap from "../../../hooks/useFocusTrap";

// --- localStorage consent (shared with About AI) ----------------------------
const AI_CONSENT_KEY = "cardigo_ai_about_consent";

function hasAiConsent() {
    try {
        return localStorage.getItem(AI_CONSENT_KEY) === "1";
    } catch {
        return false;
    }
}

function saveAiConsent() {
    try {
        localStorage.setItem(AI_CONSENT_KEY, "1");
    } catch {
        // blocked storage - proceed anyway after in-session acceptance
    }
}

// --- Error mapping (same Hebrew messages as About AI) -----------------------
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
    if (code === "INVALID_SUGGESTION")
        return "ה-AI החזיר תוכן לא שמיש. נסה שוב.";
    if (code === "AI_INSUFFICIENT_BUSINESS_CONTEXT")
        return "יש למלא שם עסק ותחום עיסוק לפני יצירת תוכן עם AI.";
    return "משהו השתבש. נסה שוב מאוחר יותר.";
}

// --- Consent Modal (same pattern as ContentPanel) ---------------------------
function SeoAiConsentModal({ open, onConfirm, onCancel }) {
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
                    הצעת SEO באמצעות AI
                </h2>
                <p id={bodyId} className={styles.consentBody}>
                    ההצעה נוצרת באמצעות שירות בינה מלאכותית חיצוני. המידע העסקי
                    מהכרטיס שלך ישמש ליצירת כותרת ותיאור לגוגל. התוכן המוצע הוא
                    המלצה בלבד - תוכל לערוך או לדחות אותו לפני שמירה.
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

// --- JSON-LD overwrite confirm modal (reuses consent pattern + CSS) ----------
function JsonLdOverwriteConfirmModal({ open, onConfirm, onCancel }) {
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
                    להחליף את המידע המובנה?
                </h2>
                <p id={bodyId} className={styles.consentBody}>
                    כבר קיים כאן מידע מובנה. יצירת תבנית חדשה תחליף את התוכן
                    הקיים.
                </p>
                <div className={styles.consentActions}>
                    <button
                        ref={confirmRef}
                        type="button"
                        className={styles.consentConfirm}
                        onClick={onConfirm}
                    >
                        החלף
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

function isValidAbsoluteHttpUrl(value) {
    const v = typeof value === "string" ? value.trim() : "";
    if (!v) return false;
    try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

function getUrlHost(value) {
    const v = typeof value === "string" ? value.trim() : "";
    if (!v) return "";
    try {
        const u = new URL(v);
        return String(u.host || "");
    } catch {
        return "";
    }
}

function getPublicOrigin() {
    const envOrigin = String(import.meta.env.VITE_PUBLIC_ORIGIN || "").trim();
    if (envOrigin) return envOrigin.replace(/\/$/, "");
    try {
        if (typeof window !== "undefined" && window.location?.origin) {
            return String(window.location.origin).trim().replace(/\/$/, "");
        }
    } catch {
        // ignore
    }
    return "";
}

function normalizePathLeadingSlash(value) {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!raw) return "";
    if (raw.startsWith("/")) return raw;
    return `/${raw}`;
}

// --- JSON-LD template helpers ------------------------------------------------
function trimStr(value) {
    return typeof value === "string" ? value.trim() : "";
}

function collectSameAs(contact) {
    if (!contact || typeof contact !== "object") return [];
    const keys = ["facebook", "instagram", "twitter", "tiktok", "linkedin"];
    const seen = new Set();
    const result = [];
    for (const key of keys) {
        const raw = trimStr(contact[key]);
        if (!raw) continue;
        if (!isValidAbsoluteHttpUrl(raw)) continue;
        if (seen.has(raw)) continue;
        seen.add(raw);
        result.push(raw);
    }
    return result;
}

function buildJsonLdTemplate(
    type,
    { name, baseUrl, business, contact, design },
) {
    const obj = {
        "@context": "https://schema.org",
        "@type": type,
    };

    if (name) obj.name = name;
    if (baseUrl) {
        obj.url = baseUrl;
        obj["@id"] = baseUrl;
    }

    const slogan = trimStr(business?.slogan);
    if (slogan) obj.description = slogan;

    const logoUrl = trimStr(design?.logo);

    if (type === "Person") {
        const category = trimStr(business?.category);
        if (category) obj.jobTitle = category;
        if (logoUrl && isValidAbsoluteHttpUrl(logoUrl)) obj.image = logoUrl;
        const phone = trimStr(contact?.phone);
        if (phone) obj.telephone = phone;
        const email = trimStr(contact?.email);
        if (email) obj.email = email;
    }

    if (type === "Organization") {
        if (logoUrl && isValidAbsoluteHttpUrl(logoUrl)) obj.logo = logoUrl;
    }

    if (type === "LocalBusiness") {
        if (logoUrl && isValidAbsoluteHttpUrl(logoUrl)) obj.image = logoUrl;
        const phone = trimStr(contact?.phone);
        if (phone) obj.telephone = phone;
        const email = trimStr(contact?.email);
        if (email) obj.email = email;

        const city = trimStr(business?.city);
        const address = { "@type": "PostalAddress", addressCountry: "IL" };
        if (city) address.addressLocality = city;
        obj.address = address;
    }

    const sameAs = collectSameAs(contact);
    if (sameAs.length) obj.sameAs = sameAs;

    return obj;
}

export default function SeoPanel({
    seo,
    publicPath,
    slug,
    displayName,
    disabled,
    onChange,
    canEditSeo,
    cardId,
    business,
    contact,
    design,
}) {
    if (canEditSeo === false) {
        return (
            <Panel title="SEO וסקריפטים">
                <div className={styles.lockedBlock}>
                    <div className={styles.lockedTitle}>SEO וסקריפטים</div>
                    <div className={styles.lockedText}>
                        כדי להשתמש ב-SEO וסקריפטים צריך מנוי פרימיום.
                    </div>
                    <a href="/pricing" className={styles.lockedCta}>
                        שדרג לפרימיום
                    </a>
                </div>
            </Panel>
        );
    }

    const value = seo || {};
    const [jsonLdTemplateType, setJsonLdTemplateType] =
        useState("LocalBusiness");
    const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

    // --- Track whether JSON-LD existed when card was loaded (not generated
    //     in this session), so we only auto-open advanced for pre-existing content.
    const [hadJsonLdOnEntry, setHadJsonLdOnEntry] = useState(() =>
        Boolean(typeof seo?.jsonLd === "string" && seo.jsonLd.trim()),
    );
    const jsonLdEntryCardIdRef = useRef(cardId);

    useEffect(() => {
        if (cardId !== jsonLdEntryCardIdRef.current) {
            jsonLdEntryCardIdRef.current = cardId;
            setHadJsonLdOnEntry(
                Boolean(
                    typeof value.jsonLd === "string" && value.jsonLd.trim(),
                ),
            );
        }
    }, [cardId, value.jsonLd]);

    // --- Robots curated 3-state: local UI flag for explicit manual mode ------
    const storedRobots = (value.robots || "").trim();
    const [robotsManual, setRobotsManual] = useState(
        () => Boolean(storedRobots) && !/noindex/i.test(storedRobots),
    );

    // Ref-gated sync: track the last value.robots written by the local onChange
    // so the effect below can distinguish local writes from external prop changes.
    // Also tracks cardId so a card/context switch forces a full re-derive.
    const robotsLocalRef = useRef(value.robots);
    const robotsCardIdRef = useRef(cardId);

    useEffect(() => {
        const cardChanged = cardId !== robotsCardIdRef.current;
        if (cardChanged) {
            robotsCardIdRef.current = cardId;
            robotsLocalRef.current = value.robots;
            const raw = (value.robots || "").trim();
            setRobotsManual(Boolean(raw) && !/noindex/i.test(raw));
            return;
        }
        if (value.robots === robotsLocalRef.current) return; // local write - skip
        robotsLocalRef.current = value.robots; // accept external value as new baseline
        const raw = (value.robots || "").trim();
        setRobotsManual(Boolean(raw) && !/noindex/i.test(raw));
    }, [value.robots, cardId]);

    // --- AI state machine ----------------------------------------------------
    const [aiState, setAiState] = useState("idle"); // idle | loading | preview | error
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [aiError, setAiError] = useState("");
    const [showConsent, setShowConsent] = useState(false);
    const [aiQuota, setAiQuota] = useState(null);

    const aiReady =
        Boolean(business?.name?.trim()) && Boolean(business?.category?.trim());

    const hasExistingSeo =
        Boolean(value.title?.trim()) || Boolean(value.description?.trim());

    const quotaExhausted = aiQuota && aiQuota.remaining <= 0;
    const aiFeatureEnabled = aiQuota?.featureEnabled !== false;

    useEffect(() => {
        if (!cardId) return;
        let cancelled = false;
        fetchAiQuota(cardId, "ai_seo_generation")
            .then((q) => {
                if (!cancelled) setAiQuota(q);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [cardId]);

    const requestSeoSuggestion = useCallback(async () => {
        if (!cardId) return;
        setAiState("loading");
        setAiError("");
        setAiSuggestion(null);

        try {
            const mode = hasExistingSeo ? "improve" : "create";
            const { suggestion, quota } = await suggestSeo(cardId, {
                mode,
                language: "he",
            });
            setAiSuggestion(suggestion);
            setAiState("preview");
            if (quota) setAiQuota(quota);
        } catch (err) {
            setAiError(mapAiError(err));
            setAiState("error");
            const errQuota = err?.response?.data?.quota;
            if (errQuota) setAiQuota(errQuota);
        }
    }, [cardId, hasExistingSeo]);

    const handleAiClick = useCallback(() => {
        if (hasAiConsent()) {
            requestSeoSuggestion();
        } else {
            setShowConsent(true);
        }
    }, [requestSeoSuggestion]);

    const handleConsentConfirm = useCallback(() => {
        saveAiConsent();
        setShowConsent(false);
        requestSeoSuggestion();
    }, [requestSeoSuggestion]);

    const handleConsentCancel = useCallback(() => {
        setShowConsent(false);
    }, []);

    const handleAiApply = useCallback(() => {
        if (!aiSuggestion) return;
        onChange?.({
            title: aiSuggestion.seoTitle || "",
            description: aiSuggestion.seoDescription || "",
        });
        setAiSuggestion(null);
        setAiState("idle");
    }, [aiSuggestion, onChange]);

    const handleAiDismiss = useCallback(() => {
        setAiSuggestion(null);
        setAiState("idle");
        setAiError("");
    }, []);

    const computedPublicUrl = useMemo(() => {
        const origin = getPublicOrigin();
        const path =
            (typeof publicPath === "string" && publicPath.trim()
                ? normalizePathLeadingSlash(publicPath)
                : slug
                  ? `/card/${String(slug).trim()}`
                  : "") || "";

        if (!origin || !path) return "";
        return `${origin}${path}`;
    }, [publicPath, slug]);

    const canonicalTrimmed =
        typeof value.canonicalUrl === "string" ? value.canonicalUrl.trim() : "";
    const computedHost = getUrlHost(computedPublicUrl);
    const canonicalHost = getUrlHost(canonicalTrimmed);
    const canonicalExampleCom = /example\.com/i.test(canonicalTrimmed);
    const canonicalHostMismatch =
        Boolean(canonicalHost) &&
        Boolean(computedHost) &&
        canonicalHost !== computedHost;

    const jsonLdStatus = useMemo(() => {
        const raw = typeof value.jsonLd === "string" ? value.jsonLd.trim() : "";
        if (!raw) {
            return { hasValue: false, valid: true, root: null };
        }
        try {
            const parsed = JSON.parse(raw);
            const valid =
                parsed !== null &&
                (typeof parsed === "object" || Array.isArray(parsed));
            const root =
                parsed && typeof parsed === "object" && !Array.isArray(parsed)
                    ? parsed
                    : null;
            return { hasValue: true, valid, root };
        } catch {
            return { hasValue: true, valid: false, root: null };
        }
    }, [value.jsonLd]);

    const hasUrlsContent = Boolean(
        canonicalTrimmed ||
        (typeof value.robots === "string" && value.robots.trim()),
    );
    const hasVerificationContent = Boolean(
        (typeof value.googleSiteVerification === "string" &&
            value.googleSiteVerification.trim()) ||
        (typeof value.facebookDomainVerification === "string" &&
            value.facebookDomainVerification.trim()),
    );
    const hasTrackingContent = Boolean(
        (typeof value.gtmId === "string" && value.gtmId.trim()) ||
        (typeof value.gaMeasurementId === "string" &&
            value.gaMeasurementId.trim()) ||
        (typeof value.metaPixelId === "string" && value.metaPixelId.trim()),
    );
    const hasJsonLdContent = Boolean(
        typeof value.jsonLd === "string" && value.jsonLd.trim(),
    );

    function update(key, nextValue) {
        onChange?.({ [key]: nextValue });
    }

    function handleUseAsCanonical() {
        if (!computedPublicUrl) return;
        update("canonicalUrl", computedPublicUrl);
    }

    function resolveJsonLdBaseUrl() {
        if (isValidAbsoluteHttpUrl(canonicalTrimmed)) return canonicalTrimmed;
        return computedPublicUrl;
    }

    function resolveJsonLdName() {
        if (typeof displayName === "string" && displayName.trim()) {
            return displayName.trim();
        }
        if (typeof value.title === "string" && value.title.trim()) {
            return value.title.trim();
        }
        return "";
    }

    function executeJsonLdInsert() {
        const baseUrl = resolveJsonLdBaseUrl();
        const name = resolveJsonLdName();

        const obj = buildJsonLdTemplate(jsonLdTemplateType, {
            name,
            baseUrl,
            business,
            contact,
            design,
        });

        update("jsonLd", JSON.stringify(obj, null, 2));
    }

    function handleInsertJsonLdTemplate() {
        if (hasJsonLdContent) {
            setShowOverwriteConfirm(true);
            return;
        }
        executeJsonLdInsert();
    }

    function handleOverwriteConfirm() {
        setShowOverwriteConfirm(false);
        executeJsonLdInsert();
    }

    function handleOverwriteCancel() {
        setShowOverwriteConfirm(false);
    }

    function handleSyncJsonLdFromCanonical() {
        if (!jsonLdStatus?.valid || !jsonLdStatus?.root) return;

        const baseUrl = resolveJsonLdBaseUrl();
        if (!baseUrl) return;

        const next = { ...jsonLdStatus.root };
        next.url = baseUrl;
        next["@id"] = baseUrl;
        update("jsonLd", JSON.stringify(next, null, 2));
    }

    return (
        <Panel title="SEO וסקריפטים">
            <div className={styles.stack}>
                {/* ── Section 1: Basic - always open ── */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        נתונים בסיסיים לגוגל
                    </div>
                    <div className={styles.sectionHint}>
                        אם תשאירו שדות אלה ריקים, המערכת תיצור כותרת ותיאור
                        אוטומטית מפרטי העסק שלכם.
                    </div>

                    {/* ── AI suggestion block ── */}
                    {cardId && aiFeatureEnabled && (
                        <div className={styles.aiBlock}>
                            <div className={styles.aiRow}>
                                <button
                                    type="button"
                                    className={styles.aiButton}
                                    disabled={
                                        disabled ||
                                        !aiReady ||
                                        aiState === "loading" ||
                                        quotaExhausted
                                    }
                                    onClick={handleAiClick}
                                >
                                    {aiState === "loading"
                                        ? "יוצר הצעה…"
                                        : hasExistingSeo
                                          ? "שפר כותרת ותיאור עם AI ✨"
                                          : "צור כותרת ותיאור עם AI ✨"}
                                </button>
                                <AiQuotaHint quota={aiQuota} />
                            </div>

                            {!aiReady && (
                                <div className={styles.aiReadinessHint}>
                                    יש למלא שם עסק ותחום עיסוק לפני יצירת תוכן
                                    עם AI.
                                </div>
                            )}

                            {aiState === "error" && (
                                <div className={styles.aiError}>
                                    <span>{aiError}</span>
                                    <button
                                        type="button"
                                        className={styles.aiDismissLink}
                                        onClick={handleAiDismiss}
                                    >
                                        סגור
                                    </button>
                                </div>
                            )}

                            {aiState === "preview" && aiSuggestion && (
                                <div className={styles.aiPreview}>
                                    <div className={styles.aiPreviewLabel}>
                                        הצעת AI:
                                    </div>
                                    <div className={styles.aiPreviewField}>
                                        <span className={styles.aiPreviewKey}>
                                            כותרת:
                                        </span>{" "}
                                        {aiSuggestion.seoTitle || "-"}
                                    </div>
                                    <div className={styles.aiPreviewField}>
                                        <span className={styles.aiPreviewKey}>
                                            תיאור:
                                        </span>{" "}
                                        {aiSuggestion.seoDescription || "-"}
                                    </div>
                                    <div className={styles.aiActions}>
                                        <button
                                            type="button"
                                            className={styles.aiApplyBtn}
                                            onClick={handleAiApply}
                                        >
                                            החל
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.aiDismissBtn}
                                            onClick={handleAiDismiss}
                                        >
                                            בטל
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className={styles.sectionContent}>
                        <div className={styles.row}>
                            <label className={styles.field}>
                                <span className={styles.labelText}>
                                    כותרת העמוד בגוגל
                                </span>
                                <input
                                    className={formStyles.input}
                                    type="text"
                                    value={value.title || ""}
                                    onChange={(e) =>
                                        update("title", e.target.value)
                                    }
                                    disabled={disabled}
                                />
                            </label>

                            <label className={styles.field}>
                                <span className={styles.labelText}>
                                    תיאור העמוד בגוגל
                                </span>
                                <textarea
                                    className={formStyles.textarea}
                                    rows={3}
                                    value={value.description || ""}
                                    onChange={(e) =>
                                        update("description", e.target.value)
                                    }
                                    disabled={disabled}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* ── Section 2: URLs & Indexing - collapsible ── */}
                <details
                    className={styles.collapsible}
                    open={hasUrlsContent || undefined}
                >
                    <summary className={styles.collapsibleTrigger}>
                        כתובות ואינדוקס
                    </summary>
                    <div className={styles.collapsibleContent}>
                        <div className={styles.row}>
                            <div className={styles.fieldFull}>
                                <div className={styles.helperBlock}>
                                    <div className={styles.helperHeader}>
                                        <div className={styles.helperTitle}>
                                            כתובת URL הציבורית של הכרטיס
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.helperButton}
                                            onClick={handleUseAsCanonical}
                                            disabled={
                                                disabled || !computedPublicUrl
                                            }
                                        >
                                            העתק ככתובת URL מועדפת
                                        </button>
                                    </div>
                                    <div className={styles.helperValue}>
                                        {computedPublicUrl || ""}
                                    </div>
                                    <div className={styles.hintText}>
                                        בעת שיתוף הכרטיס, רשתות חברתיות רואות
                                        תצוגה מקדימה ומפנות אוטומטית לכתובת URL
                                        זו.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.row}>
                            <label className={styles.field}>
                                <span className={styles.labelText}>
                                    כתובת URL מועדפת למנועי חיפוש
                                </span>
                                <input
                                    className={formStyles.input}
                                    type="url"
                                    value={value.canonicalUrl || ""}
                                    onChange={(e) =>
                                        update("canonicalUrl", e.target.value)
                                    }
                                    disabled={disabled}
                                    placeholder={
                                        computedPublicUrl
                                            ? `לדוגמה: ${computedPublicUrl}`
                                            : "לדוגמה: https://…"
                                    }
                                />
                                <div className={styles.hintText}>
                                    רוב המשתמשים לא צריכים למלא שדה זה. כברירת
                                    מחדל, המערכת משתמשת בכתובת URL הציבורית.
                                </div>
                                {canonicalExampleCom ? (
                                    <div className={styles.warningText}>
                                        נראה שזו כתובת דוגמה (example.com) -
                                        כדאי להחליף לכתובת האמיתית.
                                    </div>
                                ) : null}
                                {canonicalHostMismatch ? (
                                    <div className={styles.warningText}>
                                        הכתובת המועדפת מצביעה על דומיין שונה
                                        מהכתובת הציבורית.
                                    </div>
                                ) : null}
                            </label>

                            <div className={styles.field}>
                                <span className={styles.labelText}>
                                    הוראות אינדוקס למנועי חיפוש
                                </span>
                                <div className={styles.selectWrap}>
                                    <select
                                        className={styles.robotsSelect}
                                        value={
                                            robotsManual
                                                ? "advanced"
                                                : !(value.robots || "").trim()
                                                  ? "default"
                                                  : /noindex/i.test(
                                                          value.robots,
                                                      )
                                                    ? "hide"
                                                    : "advanced"
                                        }
                                        disabled={disabled}
                                        onChange={(e) => {
                                            const mode = e.target.value;
                                            if (mode === "default") {
                                                setRobotsManual(false);
                                                robotsLocalRef.current = "";
                                                update("robots", "");
                                            } else if (mode === "hide") {
                                                setRobotsManual(false);
                                                robotsLocalRef.current =
                                                    "noindex, nofollow";
                                                update(
                                                    "robots",
                                                    "noindex, nofollow",
                                                );
                                            } else {
                                                setRobotsManual(true);
                                            }
                                        }}
                                    >
                                        <option value="default">
                                            ברירת מחדל - הצג בגוגל (מומלץ)
                                        </option>
                                        <option value="hide">
                                            לא להציג בגוגל
                                        </option>
                                        <option value="advanced">
                                            הגדרה ידנית (מתקדם)
                                        </option>
                                    </select>
                                </div>

                                {!(value.robots || "").trim() ? (
                                    <div className={styles.hintText}>
                                        כברירת מחדל, הכרטיס שלכם מופיע בגוגל
                                        ובמנועי חיפוש אחרים. אין צורך לשנות
                                        הגדרה זו.
                                    </div>
                                ) : /noindex/i.test(value.robots || "") ? (
                                    <div className={styles.warningText}>
                                        שימו לב: הגדרה זו עלולה למנוע מגוגל
                                        להציג את הכרטיס בתוצאות החיפוש.
                                    </div>
                                ) : null}

                                {/* Advanced: raw text input */}
                                {(robotsManual ||
                                    (Boolean((value.robots || "").trim()) &&
                                        !/noindex/i.test(
                                            value.robots || "",
                                        ))) && (
                                    <input
                                        className={formStyles.input}
                                        type="text"
                                        value={value.robots || ""}
                                        onChange={(e) => {
                                            robotsLocalRef.current =
                                                e.target.value;
                                            update("robots", e.target.value);
                                        }}
                                        disabled={disabled}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </details>

                {/* ── Section 3: Verification - collapsible ── */}
                <details
                    className={styles.collapsible}
                    open={hasVerificationContent || undefined}
                >
                    <summary className={styles.collapsibleTrigger}>
                        אימות בעלות (גוגל, פייסבוק)
                    </summary>
                    <div className={styles.collapsibleContent}>
                        <div className={styles.sectionHint}>
                            שדות אלה רלוונטיים רק אם קיבלתם קוד אימות מגוגל או
                            מפייסבוק.
                        </div>
                        <div className={styles.row}>
                            <label className={styles.field}>
                                <span className={styles.labelText}>
                                    אימות אתר בגוגל
                                </span>
                                <input
                                    className={formStyles.input}
                                    type="text"
                                    value={value.googleSiteVerification || ""}
                                    onChange={(e) =>
                                        update(
                                            "googleSiteVerification",
                                            e.target.value,
                                        )
                                    }
                                    disabled={disabled}
                                />
                            </label>

                            <label className={styles.field}>
                                <span className={styles.labelText}>
                                    אימות דומיין בפייסבוק
                                </span>
                                <input
                                    className={formStyles.input}
                                    type="text"
                                    value={
                                        value.facebookDomainVerification || ""
                                    }
                                    onChange={(e) =>
                                        update(
                                            "facebookDomainVerification",
                                            e.target.value,
                                        )
                                    }
                                    disabled={disabled}
                                />
                            </label>
                        </div>
                    </div>
                </details>

                {/* ── Section 4: Tracking & Analytics - collapsible ── */}
                <details
                    className={styles.collapsible}
                    open={hasTrackingContent || undefined}
                >
                    <summary className={styles.collapsibleTrigger}>
                        מדידה ומעקב (גוגל, פייסבוק)
                    </summary>
                    <div className={styles.collapsibleContent}>
                        <div className={styles.sectionHint}>
                            שדות אלה רלוונטיים רק אם יש לכם מזהים מ-Google או
                            Meta.
                        </div>
                        <div className={styles.row}>
                            <label className={styles.field}>
                                <span className={styles.labelText}>
                                    מזהה Google Tag Manager
                                </span>
                                <input
                                    className={formStyles.input}
                                    type="text"
                                    value={value.gtmId || ""}
                                    onChange={(e) =>
                                        update("gtmId", e.target.value)
                                    }
                                    disabled={disabled}
                                    placeholder="GTM-XXXXXXX"
                                />
                            </label>

                            <label className={styles.field}>
                                <span className={styles.labelText}>
                                    מזהה Google Analytics
                                </span>
                                <input
                                    className={formStyles.input}
                                    type="text"
                                    value={value.gaMeasurementId || ""}
                                    onChange={(e) =>
                                        update(
                                            "gaMeasurementId",
                                            e.target.value,
                                        )
                                    }
                                    disabled={disabled}
                                    placeholder="G-XXXXXXX"
                                />
                            </label>

                            <label className={styles.field}>
                                <span className={styles.labelText}>
                                    מזהה Meta Pixel
                                </span>
                                <input
                                    className={formStyles.input}
                                    type="text"
                                    value={value.metaPixelId || ""}
                                    onChange={(e) =>
                                        update("metaPixelId", e.target.value)
                                    }
                                    disabled={disabled}
                                />
                            </label>
                        </div>
                    </div>
                </details>

                {/* ── Section 5: Structured Data - collapsible ── */}
                <details
                    className={styles.collapsible}
                    open={hasJsonLdContent || undefined}
                >
                    <summary className={styles.collapsibleTrigger}>
                        מידע מובנה לגוגל
                    </summary>
                    <div className={styles.collapsibleContent}>
                        <div className={styles.sectionHint}>
                            המערכת יכולה ליצור מידע מובנה בסיסי שיעזור לגוגל
                            להבין ולהציג את העסק בצורה מדויקת יותר. בחרו את סוג
                            העסק ולחצו כדי ליצור תבנית התחלתית.
                        </div>
                        <div className={styles.row}>
                            <div className={styles.fieldFull}>
                                <div className={styles.jsonLdHelperRow}>
                                    <div className={styles.selectWrap}>
                                        <select
                                            className={`${formStyles.input} ${styles.jsonLdSelect}`}
                                            value={jsonLdTemplateType}
                                            onChange={(e) =>
                                                setJsonLdTemplateType(
                                                    e.target.value,
                                                )
                                            }
                                            disabled={disabled}
                                            aria-label="סוג העסק"
                                        >
                                            <option value="Person">
                                                אדם (Person)
                                            </option>
                                            <option value="LocalBusiness">
                                                עסק מקומי (LocalBusiness)
                                            </option>
                                            <option value="Organization">
                                                ארגון (Organization)
                                            </option>
                                        </select>
                                    </div>

                                    <div className={styles.jsonLdActions}>
                                        <button
                                            type="button"
                                            className={styles.helperButton}
                                            onClick={handleInsertJsonLdTemplate}
                                            disabled={disabled}
                                        >
                                            צור מידע מובנה
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Advanced: manual JSON-LD editing ── */}
                        <details
                            className={styles.collapsible}
                            open={hadJsonLdOnEntry || undefined}
                        >
                            <summary className={styles.collapsibleTrigger}>
                                מתקדם - עריכה ידנית
                            </summary>
                            <div className={styles.collapsibleContent}>
                                <div className={styles.row}>
                                    <label className={styles.fieldFull}>
                                        <button
                                            type="button"
                                            className={styles.helperButton}
                                            onClick={
                                                handleSyncJsonLdFromCanonical
                                            }
                                            disabled={
                                                disabled ||
                                                !jsonLdStatus?.valid ||
                                                !jsonLdStatus?.root ||
                                                !resolveJsonLdBaseUrl()
                                            }
                                        >
                                            עדכן כתובות מהכתובת הראשית
                                        </button>

                                        {jsonLdStatus?.hasValue ? (
                                            <div
                                                className={
                                                    jsonLdStatus.valid
                                                        ? styles.jsonOkText
                                                        : styles.jsonBadText
                                                }
                                            >
                                                {jsonLdStatus.valid
                                                    ? "הקוד תקין"
                                                    : "יש שגיאה בקוד"}
                                            </div>
                                        ) : null}

                                        <textarea
                                            className={formStyles.textarea}
                                            rows={6}
                                            value={value.jsonLd || ""}
                                            onChange={(e) =>
                                                update("jsonLd", e.target.value)
                                            }
                                            disabled={disabled}
                                            placeholder='{"@context":"https://schema.org","@type":"LocalBusiness","name":"שם העסק"}'
                                        />
                                    </label>
                                </div>
                            </div>
                        </details>
                    </div>
                </details>
            </div>

            <SeoAiConsentModal
                open={showConsent}
                onConfirm={handleConsentConfirm}
                onCancel={handleConsentCancel}
            />
            <JsonLdOverwriteConfirmModal
                open={showOverwriteConfirm}
                onConfirm={handleOverwriteConfirm}
                onCancel={handleOverwriteCancel}
            />
        </Panel>
    );
}
