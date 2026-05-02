import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Panel from "./Panel";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import { useAuth } from "../../../context/AuthContext";
import {
    getAccountSummary,
    changePassword,
    deleteAccount,
    updateEmailPreferences,
    updateAccountName,
    cancelRenewal,
    resumeAutoRenewal,
    getReceipts,
    updateReceiptProfile,
} from "../../../services/account.service";
import CancelRenewalModal from "../CancelRenewalModal";
import styles from "./SettingsPanel.module.css";
import {
    validatePasswordPolicy,
    getPasswordPolicyMessage,
    getPasswordPolicyChecklist,
    PASSWORD_POLICY_HELPER_TEXT_HE,
    PASSWORD_POLICY,
} from "../../../utils/passwordPolicy.js";

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
    editingDisabled,
    isDeleting,
    onPublish,
    onUnpublish,
    onUpdateSlug,
}) {
    const { isAuthenticated, logout } = useAuth();
    const slug = card?.slug;
    const navigate = useNavigate();

    const [account, setAccount] = useState(null);
    const [accountLoading, setAccountLoading] = useState(false);
    const [accountError, setAccountError] = useState("");
    const accountFetched = useRef(false);

    const [receipts, setReceipts] = useState([]);
    const [receiptsLoading, setReceiptsLoading] = useState(false);
    const [receiptsError, setReceiptsError] = useState("");

    const [pwCurrent, setPwCurrent] = useState("");
    const [pwNew, setPwNew] = useState("");
    const [pwConfirm, setPwConfirm] = useState("");
    const [pwSubmitting, setPwSubmitting] = useState(false);
    const [pwError, setPwError] = useState("");
    const [pwSuccess, setPwSuccess] = useState("");
    const [pwConfirmError, setPwConfirmError] = useState("");
    const [pwNewError, setPwNewError] = useState("");
    const [pwNewTouched, setPwNewTouched] = useState(false);

    const [billingBusy, setBillingBusy] = useState(false);
    const [billingMsg, setBillingMsg] = useState("");
    const [yearlyOptIn, setYearlyOptIn] = useState(false);

    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelBusy, setCancelBusy] = useState(false);
    const [cancelError, setCancelError] = useState("");

    const [resumeBusy, setResumeBusy] = useState(false);
    const [resumeError, setResumeError] = useState("");

    const [mktBusy, setMktBusy] = useState(false);
    const [mktError, setMktError] = useState("");

    const [nameDraft, setNameDraft] = useState("");
    const [nameBusy, setNameBusy] = useState(false);
    const [nameError, setNameError] = useState("");
    const [nameOk, setNameOk] = useState("");

    const [receiptProfileDraft, setReceiptProfileDraft] = useState({
        recipientType: "",
        name: "",
        nameInvoice: "",
        email: "",
        numberId: "",
        address: "",
        city: "",
        zipCode: "",
    });
    const [receiptProfileClearNumberId, setReceiptProfileClearNumberId] =
        useState(false);
    const [receiptProfileBusy, setReceiptProfileBusy] = useState(false);
    const [receiptProfileError, setReceiptProfileError] = useState("");
    const [receiptProfileOk, setReceiptProfileOk] = useState("");

    const [delCardConfirm, setDelCardConfirm] = useState("");

    const [delConfirm, setDelConfirm] = useState("");
    const [delPassword, setDelPassword] = useState("");
    const [delSubmitting, setDelSubmitting] = useState(false);
    const [delError, setDelError] = useState("");
    const [delBlockOrgs, setDelBlockOrgs] = useState(null);
    const [delDone, setDelDone] = useState(false);

    async function handleDeleteAccount(e) {
        e.preventDefault();
        setDelError("");
        setDelBlockOrgs(null);

        if (delConfirm.trim() !== "מחיקה" || !delPassword.trim()) {
            setDelError("יש למלא את כל השדות בצורה תקינה.");
            return;
        }

        setDelSubmitting(true);
        try {
            const result = await deleteAccount({
                confirm: delConfirm.trim(),
                password: delPassword,
            });

            if (result?.ok) {
                // Show finality message, then logout + redirect.
                setDelDone(true);
                setTimeout(() => {
                    logout();
                    window.location.href = "/";
                }, 3000);
                return;
            }

            if (result?.code === "SOLE_ORG_ADMIN" && result?.orgs) {
                setDelBlockOrgs(result.orgs);
                return;
            }

            setDelError("לא ניתן למחוק חשבון.");
        } catch (err) {
            const status = err?.response?.status;
            if (status === 429) {
                setDelError("יותר מדי ניסיונות, נסה שוב מאוחר יותר.");
            } else {
                setDelError("לא ניתן למחוק חשבון.");
            }
        } finally {
            setDelSubmitting(false);
        }
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        setPwError("");
        setPwSuccess("");
        setPwConfirmError("");
        setPwNewError("");
        setPwNewTouched(true);

        // 1. currentPassword presence → form-level generic
        if (!pwCurrent.trim()) {
            setPwError("יש למלא את כל השדות.");
            return;
        }

        // 2. newPassword policy → field-level precise
        const pwResult = validatePasswordPolicy(pwNew);
        if (!pwResult.ok) {
            setPwNewError(getPasswordPolicyMessage(pwResult.code));
            return;
        }

        // 3. confirm presence → field-level
        if (!pwConfirm) {
            setPwConfirmError("שדה אימות הסיסמה הוא חובה");
            return;
        }

        // 4. confirm mismatch → field-level
        if (pwNew !== pwConfirm) {
            setPwConfirmError("הסיסמאות לא תואמות.");
            return;
        }

        setPwSubmitting(true);
        try {
            await changePassword({
                currentPassword: pwCurrent,
                newPassword: pwNew,
            });
            setPwSuccess("הסיסמה שונתה בהצלחה.");
            setPwCurrent("");
            setPwNew("");
            setPwConfirm("");
            setPwConfirmError("");
            setPwNewError("");
            setPwNewTouched(false);
        } catch (err) {
            const code = err?.response?.data?.code;
            const status = err?.response?.status;
            if (typeof code === "string" && code.startsWith("PASSWORD_")) {
                setPwNewError(getPasswordPolicyMessage(code));
                setPwNewTouched(true);
            } else if (status === 429 || code === "RATE_LIMITED") {
                setPwError("יותר מדי ניסיונות. נסה שוב מאוחר יותר.");
            } else {
                setPwError("לא הצלחנו לשנות את הסיסמה.");
            }
        } finally {
            setPwSubmitting(false);
        }
    }

    async function handleCancelRenewal() {
        setCancelError("");
        setCancelBusy(true);
        try {
            const res = await cancelRenewal();
            setAccount((prev) => ({
                ...prev,
                autoRenewal: res?.autoRenewal ?? prev?.autoRenewal,
            }));
            setCancelModalOpen(false);
        } catch (err) {
            const status = err?.response?.status;
            if (status === 429) {
                setCancelError("בוצעו יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
            } else {
                setCancelError(
                    "לא ניתן לבטל את החידוש כרגע. נסו שוב מאוחר יותר.",
                );
            }
            setCancelModalOpen(false);
        } finally {
            setCancelBusy(false);
        }
    }

    async function handleResumeRenewal() {
        setResumeError("");
        setResumeBusy(true);
        try {
            const res = await resumeAutoRenewal();
            setAccount((prev) =>
                prev
                    ? {
                          ...prev,
                          autoRenewal: res?.autoRenewal ?? prev?.autoRenewal,
                      }
                    : prev,
            );
        } catch (err) {
            const status = err?.response?.status;
            const messageKey = err?.response?.data?.messageKey;
            if (status === 429) {
                setResumeError("בוצעו יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
            } else if (messageKey === "resume_unavailable") {
                setResumeError("האפשרות אינה זמינה כרגע. נסו שוב מאוחר יותר.");
            } else if (
                messageKey === "subscription_not_active" ||
                messageKey === "subscription_expired"
            ) {
                setResumeError(
                    "המנוי אינו פעיל כרגע. ניתן להסדיר חידוש לאחר סיום התקופה.",
                );
            } else if (messageKey === "wrong_provider") {
                setResumeError(
                    "לא ניתן להפעיל חידוש אוטומטי עבור סוג המנוי הנוכחי.",
                );
            } else if (messageKey === "unsupported_plan") {
                setResumeError("סוג המנוי אינו נתמך לחידוש אוטומטי.");
            } else if (messageKey === "already_active") {
                setResumeError("החידוש האוטומטי כבר פעיל.");
            } else if (messageKey === "renewal_in_progress") {
                setResumeError("חידוש אוטומטי כבר נמצא בתהליך.");
            } else if (messageKey === "renewal_not_cancelled") {
                setResumeError("אין חידוש אוטומטי מבוטל להפעלה מחדש.");
            } else if (
                messageKey === "token_missing" ||
                messageKey === "token_expired"
            ) {
                setResumeError(
                    "לא ניתן להפעיל מחדש את החידוש האוטומטי עם פרטי התשלום הקיימים. ניתן לפנות לתמיכה.",
                );
            } else {
                setResumeError(
                    "לא הצלחנו להפעיל מחדש את החידוש האוטומטי. נסו שוב מאוחר יותר.",
                );
            }
        } finally {
            setResumeBusy(false);
        }
    }

    useEffect(() => {
        if (!isAuthenticated || accountFetched.current) return;
        accountFetched.current = true;

        // Account summary — primary truth; failure is fatal for the billing section.
        setAccountLoading(true);
        setAccountError("");
        getAccountSummary()
            .then((data) => setAccount(data))
            .catch(() => setAccountError("לא הצלחנו לטעון את פרטי החשבון."))
            .finally(() => setAccountLoading(false));

        // Receipts — non-blocking secondary load; failure is isolated to receipts block only.
        setReceiptsLoading(true);
        setReceiptsError("");
        getReceipts(12)
            .then((data) =>
                setReceipts(Array.isArray(data?.receipts) ? data.receipts : []),
            )
            .catch(() => setReceiptsError("לא ניתן לטעון קבלות."))
            .finally(() => setReceiptsLoading(false));
    }, [isAuthenticated]);

    const origin =
        typeof window !== "undefined" && window.location?.origin
            ? window.location.origin
            : "";

    // SSoT: publicPath comes ONLY from backend DTO - no fallback guessing.
    const publicPath = card?.publicPath || null;
    const publicUrl = publicPath ? `${origin}${publicPath}` : "";
    const isPublished = card?.status === "published";
    const isPublicLink = isAuthenticated && isPublished;

    const [slugDraft, setSlugDraft] = useState(() => String(slug || ""));
    const [slugBusy, setSlugBusy] = useState(false);
    const [slugError, setSlugError] = useState("");
    const [slugOk, setSlugOk] = useState("");

    const slugLimit = 2;
    const slugRemainingRaw = card?.slugPolicy?.remaining;
    const slugRemaining = Number.isFinite(Number(slugRemainingRaw))
        ? Math.max(0, Math.min(slugLimit, Number(slugRemainingRaw)))
        : null;

    useEffect(() => {
        setSlugDraft(String(slug || ""));
        setSlugError("");
        setSlugOk("");
    }, [slug]);

    useEffect(() => {
        setNameDraft(String(account?.firstName || ""));
        setNameError("");
        setNameOk("");
    }, [account?.firstName]);

    useEffect(() => {
        const rp = account?.receiptProfile ?? null;
        setReceiptProfileDraft({
            recipientType: rp?.recipientType ?? "",
            name: rp?.name ?? "",
            nameInvoice: rp?.nameInvoice ?? "",
            email: rp?.email ?? "",
            numberId: "",
            address: rp?.address ?? "",
            city: rp?.city ?? "",
            zipCode: rp?.zipCode ?? "",
        });
        setReceiptProfileClearNumberId(false);
        setReceiptProfileError("");
        setReceiptProfileOk("");
    }, [account?.receiptProfile]);

    const isReceiptProfileDirty = useMemo(() => {
        const rp = account?.receiptProfile ?? null;
        if (receiptProfileClearNumberId) return true;
        if (receiptProfileDraft.numberId.trim() !== "") return true;
        const textFields = [
            "name",
            "nameInvoice",
            "email",
            "address",
            "city",
            "zipCode",
        ];
        for (const field of textFields) {
            const draftValue = receiptProfileDraft[field].trim();
            const serverValue = (rp?.[field] ?? "").trim();
            if (draftValue !== serverValue) return true;
        }
        const draftType = receiptProfileDraft.recipientType || null;
        const serverType = rp?.recipientType ?? null;
        return draftType !== serverType;
    }, [
        receiptProfileDraft,
        receiptProfileClearNumberId,
        account?.receiptProfile,
    ]);

    const canEditSlug = useMemo(() => {
        return (
            isAuthenticated &&
            card?.status === "draft" &&
            !editingDisabled &&
            typeof onUpdateSlug === "function"
        );
    }, [isAuthenticated, card?.status, editingDisabled, onUpdateSlug]);

    const publicPathPrefix = useMemo(() => {
        if (!publicPath) return null;
        const parts = String(publicPath).split("/").filter(Boolean);
        if (parts.length < 2) return null;
        return `/${parts.slice(0, -1).join("/")}`;
    }, [publicPath]);

    const previewUrl = useMemo(() => {
        if (!publicPathPrefix) return "";
        const s = String(slugDraft || "").trim();
        return s ? `${origin}${publicPathPrefix}/${s}` : "";
    }, [slugDraft, origin, publicPathPrefix]);

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

    function validateReceiptProfileDraft(draft) {
        if (draft.name.trim().length > 200) {
            return "שם לקבלה ארוך מדי (מקסימום 200 תווים).";
        }
        if (draft.nameInvoice.trim().length > 200) {
            return "שם עסק / שם לחשבונית ארוך מדי (מקסימום 200 תווים).";
        }
        const emailTrim = draft.email.trim();
        if (emailTrim !== "") {
            if (emailTrim.length > 200) {
                return "דוא\u05f4ל ארוך מדי (מקסימום 200 תווים).";
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
                return "כתובת דוא\u05f4ל לא תקינה.";
            }
        }
        const idTrim = draft.numberId.trim();
        if (idTrim !== "") {
            if (idTrim.length > 32) {
                return "מספר מזהה ארוך מדי (מקסימום 32 תווים).";
            }
            if (!/^[a-zA-Z0-9-]*$/.test(idTrim)) {
                return "מספר מזהה מכיל תווים לא חוקיים. מותרים: ספרות, אותיות, מקף.";
            }
        }
        if (draft.address.trim().length > 300) {
            return "כתובת ארוכה מדי (מקסימום 300 תווים).";
        }
        if (draft.city.trim().length > 100) {
            return "עיר ארוכה מדי (מקסימום 100 תווים).";
        }
        if (draft.zipCode.trim().length > 20) {
            return "מיקוד ארוך מדי (מקסימום 20 תווים).";
        }
        return null;
    }

    function buildReceiptProfilePayload(draft, clearNumberId, serverProfile) {
        const rp = serverProfile ?? null;
        const payload = {};
        const draftType = draft.recipientType || null;
        const serverType = rp?.recipientType ?? null;
        if (draftType !== serverType) {
            payload.recipientType = draftType;
        }
        const textFields = [
            "name",
            "nameInvoice",
            "email",
            "address",
            "city",
            "zipCode",
        ];
        for (const field of textFields) {
            const draftValue = draft[field].trim();
            const serverValue = (rp?.[field] ?? "").trim();
            if (draftValue !== serverValue) {
                payload[field] = draftValue === "" ? null : draftValue;
            }
        }
        if (clearNumberId) {
            payload.numberId = null;
        } else if (draft.numberId.trim() !== "") {
            payload.numberId = draft.numberId.trim();
        }
        return payload;
    }

    async function handleReceiptProfileSave() {
        setReceiptProfileError("");
        setReceiptProfileOk("");
        const validationError =
            validateReceiptProfileDraft(receiptProfileDraft);
        if (validationError) {
            setReceiptProfileError(validationError);
            return;
        }
        const payload = buildReceiptProfilePayload(
            receiptProfileDraft,
            receiptProfileClearNumberId,
            account?.receiptProfile ?? null,
        );
        if (Object.keys(payload).length === 0) {
            setReceiptProfileOk("לא בוצעו שינויים.");
            return;
        }
        setReceiptProfileBusy(true);
        try {
            const data = await updateReceiptProfile(payload);
            setAccount((prev) =>
                prev
                    ? { ...prev, receiptProfile: data.receiptProfile ?? null }
                    : prev,
            );
            setReceiptProfileClearNumberId(false);
            setReceiptProfileOk("פרטי הקבלה נשמרו.");
        } catch (err) {
            const status = err?.response?.status;
            if (status === 429) {
                setReceiptProfileError(
                    "יותר מדי ניסיונות. נסו שוב מאוחר יותר.",
                );
            } else if (status === 400) {
                const message = err?.response?.data?.message;
                setReceiptProfileError(
                    typeof message === "string" && message.length < 200
                        ? message
                        : "נתונים לא תקינים. בדקו את הפרטים ונסו שנית.",
                );
            } else {
                setReceiptProfileError("לא הצלחנו לשמור את פרטי הקבלה.");
            }
        } finally {
            setReceiptProfileBusy(false);
        }
    }

    async function handleNameSave() {
        const next = nameDraft.trim();
        if (!next) {
            setNameError("שדה השם הפרטי הוא חובה");
            return;
        }
        if (next.length > 100) {
            setNameError("השם הפרטי ארוך מדי (מקסימום 100 תווים)");
            return;
        }
        setNameBusy(true);
        setNameError("");
        setNameOk("");
        try {
            const data = await updateAccountName({ firstName: next });
            setAccount((prev) => ({
                ...prev,
                firstName: data?.firstName ?? next,
            }));
            setNameOk("השם עודכן.");
        } catch (err) {
            const status = err?.response?.status;
            if (status === 429) {
                setNameError("יותר מדי ניסיונות, נסה שוב מאוחר יותר.");
            } else {
                setNameError("לא הצלחנו לעדכן את השם.");
            }
        } finally {
            setNameBusy(false);
        }
    }

    async function handleMarketingToggle(nextValue) {
        if (mktBusy || !account) return;
        const currentChecked = account.emailMarketingConsent === true;
        if (nextValue === currentChecked) return;

        const prevConsent = account.emailMarketingConsent;
        setMktError("");
        setMktBusy(true);
        // Optimistic update
        setAccount((prev) => ({
            ...prev,
            emailMarketingConsent: nextValue,
        }));
        try {
            const data = await updateEmailPreferences({
                emailMarketingConsent: nextValue,
            });
            // Sync with server-returned truth for all four consent fields
            setAccount((prev) => ({
                ...prev,
                emailMarketingConsent: data?.emailMarketingConsent ?? nextValue,
                emailMarketingConsentAt: data?.emailMarketingConsentAt ?? null,
                emailMarketingConsentVersion:
                    data?.emailMarketingConsentVersion ?? null,
                emailMarketingConsentSource:
                    data?.emailMarketingConsentSource ?? null,
            }));
        } catch {
            // Revert to pre-toggle truth
            setAccount((prev) => ({
                ...prev,
                emailMarketingConsent: prevConsent,
            }));
            setMktError("לא הצלחנו לשמור את ההעדפה. נסו שוב.");
        } finally {
            setMktBusy(false);
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

    const entCanPublish = card?.entitlements?.canPublish === true;
    const entCanChangeSlug = card?.entitlements?.canChangeSlug === true;
    const canPublish =
        isAuthenticated &&
        Boolean(card?._id) &&
        !editingDisabled &&
        entCanPublish;

    const deleteCardBlock = (
        <details
            className={`${styles.collapsible} ${styles.collapsibleDanger}`}
        >
            <summary className={styles.collapsibleTrigger}>מחיקת כרטיס</summary>
            <div className={styles.collapsibleContent}>
                <div className={styles.dangerText}>
                    מחיקת הכרטיס תמחק לצמיתות את הכרטיס, הקישור הציבורי, תמונות,
                    לידים ונתוני אנליטיקה.
                </div>
                <div className={styles.dangerText}>
                    הקישור הציבורי של הכרטיס יפסיק לעבוד מיד.
                </div>
                <div className={styles.dangerText}>לא ניתן לשחזר.</div>

                <Input
                    label='הקלד "מחיקה" לאישור'
                    value={delCardConfirm}
                    onChange={(e) => setDelCardConfirm(e.target.value)}
                    placeholder="מחיקה"
                    autoComplete="off"
                    disabled={Boolean(isDeleting)}
                />

                <div className={styles.dangerActions}>
                    <Button
                        variant="ghost"
                        onClick={onDelete}
                        disabled={
                            !card?._id ||
                            Boolean(isDeleting) ||
                            delCardConfirm.trim() !== "מחיקה"
                        }
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
                            "מחק כרטיס"
                        )}
                    </Button>
                </div>
            </div>
        </details>
    );

    return (
        <Panel title="הגדרות">
            <div className={styles.grid}>
                {/* ── Section 1: כרטיס ── */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>כרטיס</div>

                    <div className={styles.strong}>
                        סטטוס:{" "}
                        {isPublicLink
                            ? "פורסם (הקישור הציבורי פעיל)"
                            : "עדיין לא פורסם (הקישור הציבורי עדיין לא פעיל) "}
                    </div>

                    {accessLine && (
                        <div className={styles.accessLine}>{accessLine}</div>
                    )}

                    {!entCanPublish ? (
                        <div className={styles.lockedBlock}>
                            <div className={styles.lockedTitle}>
                                פרסום זמין רק בפרימיום
                            </div>
                            <div className={styles.lockedText}>
                                כדי לפרסם את הכרטיס - צריך מסלול פרימיום.
                            </div>
                            <a href="/pricing" className={styles.lockedCta}>
                                שדרג לפרימיום
                            </a>
                        </div>
                    ) : (
                        <>
                            {isAuthenticated &&
                                card?.status !== "published" && (
                                    <Button
                                        variant="primary"
                                        disabled={!canPublish}
                                        onClick={() => onPublish?.()}
                                    >
                                        פרסום
                                    </Button>
                                )}

                            {isAuthenticated &&
                                card?.status === "published" && (
                                    <Button
                                        variant="secondary"
                                        disabled={
                                            !Boolean(card?._id) ||
                                            editingDisabled
                                        }
                                        onClick={() => onUnpublish?.()}
                                    >
                                        החזרה לטיוטה
                                    </Button>
                                )}
                        </>
                    )}

                    {publicUrl && isPublicLink && (
                        <div className={styles.urlBlock}>
                            <div className={styles.urlTitle}>קישור ציבורי</div>
                            <a
                                href={publicUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {publicUrl}
                            </a>
                        </div>
                    )}

                    {publicUrl && !isPublicLink && (
                        <div className={styles.urlBlock}>
                            <div className={styles.urlTitle}>קישור עתידי</div>
                            <div>{publicUrl}</div>
                            <div className={styles.urlNote}>
                                {isAuthenticated
                                    ? "הקישור יהפוך לציבורי לאחר פרסום הכרטיס."
                                    : "הקישור יהפוך לציבורי אחרי הרשמה ופרסום הכרטיס."}
                            </div>
                        </div>
                    )}

                    {!publicUrl && (
                        <div className={styles.urlBlock}>
                            <div className={styles.urlTitle}>קישור ציבורי</div>
                            <div className={styles.urlNote}>
                                הקישור יופיע אחרי פרסום הכרטיס.
                            </div>
                        </div>
                    )}

                    {isAuthenticated && (
                        <div className={styles.slugBlock}>
                            <div className={styles.urlTitle}>
                                סלאג (כתובת קצרה)
                            </div>

                            {!entCanChangeSlug ? (
                                <div className={styles.lockedBlock}>
                                    <div className={styles.lockedTitle}>
                                        שינוי כתובת קצרה זמין רק בפרימיום
                                    </div>
                                    <div className={styles.lockedText}>
                                        כדי לשנות את הכתובת הקצרה של הכרטיס -
                                        צריך מסלול פרימיום.
                                    </div>
                                    <a
                                        href="/pricing"
                                        className={styles.lockedCta}
                                    >
                                        שדרג לפרימיום
                                    </a>
                                </div>
                            ) : (
                                <>
                                    <Input
                                        label={
                                            publicPathPrefix
                                                ? `לאחר ‎${publicPathPrefix}/‎`
                                                : "סלאג"
                                        }
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
                                        אפשר לשנות סלאג רק בטיוטה ועד פעמיים
                                        בחודש.
                                    </div>

                                    <div className={styles.slugRemaining}>
                                        נותרו{" "}
                                        <span
                                            className={
                                                styles.slugRemainingValue
                                            }
                                        >
                                            {slugRemaining === null
                                                ? `-/${slugLimit}`
                                                : `${slugRemaining}/${slugLimit}`}
                                        </span>{" "}
                                        שינויים החודש.
                                    </div>

                                    {previewUrl ? (
                                        <div
                                            className={styles.slugPreview}
                                            dir="ltr"
                                        >
                                            {previewUrl}
                                        </div>
                                    ) : null}

                                    {slugOk ? (
                                        <div className={styles.slugOk}>
                                            {slugOk}
                                        </div>
                                    ) : null}

                                    <div className={styles.slugActions}>
                                        <Button
                                            variant="secondary"
                                            disabled={
                                                !canEditSlug ||
                                                slugBusy ||
                                                String(
                                                    slugDraft || "",
                                                ).trim() ===
                                                    String(slug || "").trim()
                                            }
                                            onClick={handleSlugSave}
                                        >
                                            {slugBusy
                                                ? "מעדכן..."
                                                : "עדכון סלאג"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {!isAuthenticated && (
                    <div className={styles.section}>{deleteCardBlock}</div>
                )}

                {isAuthenticated && (
                    <>
                        {/* ── Section 2: חשבון ── */}
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>חשבון</div>

                            {accountLoading && (
                                <div className={styles.accountNote}>
                                    טוען...
                                </div>
                            )}

                            {accountError && (
                                <div className={styles.accountError}>
                                    {accountError}
                                </div>
                            )}

                            {account && !accountLoading && (
                                <div className={styles.accountFields}>
                                    <Input
                                        label="שם פרטי"
                                        type="text"
                                        autoComplete="given-name"
                                        value={nameDraft}
                                        onChange={(e) => {
                                            setNameDraft(e.target.value);
                                            setNameError("");
                                            setNameOk("");
                                        }}
                                        error={nameError}
                                        disabled={nameBusy}
                                    />
                                    {nameOk && (
                                        <div className={styles.slugOk}>
                                            {nameOk}
                                        </div>
                                    )}
                                    <div className={styles.slugActions}>
                                        <Button
                                            variant="secondary"
                                            loading={nameBusy}
                                            disabled={
                                                nameBusy ||
                                                !nameDraft.trim() ||
                                                nameDraft.trim() ===
                                                    String(
                                                        account?.firstName ||
                                                            "",
                                                    )
                                            }
                                            onClick={handleNameSave}
                                        >
                                            שמירה
                                        </Button>
                                    </div>

                                    <div className={styles.accountRow}>
                                        <span className={styles.accountLabel}>
                                            אימייל:
                                        </span>
                                        <span
                                            className={styles.accountValue}
                                            dir="ltr"
                                        >
                                            {account.email || "-"}
                                        </span>
                                    </div>

                                    {account.orgMemberships?.length > 0 && (
                                        <div className={styles.accountOrgs}>
                                            <span
                                                className={styles.accountLabel}
                                            >
                                                ארגונים:
                                            </span>
                                            <ul className={styles.orgList}>
                                                {account.orgMemberships.map(
                                                    (m) => (
                                                        <li key={m.orgId}>
                                                            {m.orgName ||
                                                                m.orgSlug}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Section 3: תשלומים ── */}
                        {(() => {
                            const sub = account?.subscription || {};
                            const acPlan = account?.plan || "free";
                            const subStatus = sub.status || "inactive";
                            const expiresAt = sub.expiresAt || null;
                            const provider = sub.provider || null;
                            const isExpired =
                                Boolean(expiresAt) &&
                                new Date(expiresAt).getTime() < Date.now();
                            const showCta =
                                acPlan === "free" ||
                                subStatus !== "active" ||
                                isExpired;

                            const providerLabel =
                                provider === "tranzila" ? "Tranzila" : "-";

                            const autoRenewal = account?.autoRenewal ?? {
                                status: "none",
                                canCancel: false,
                            };
                            const renewalStatus = autoRenewal.status ?? "none";
                            const renewalPaidUntil =
                                autoRenewal.subscriptionExpiresAt ?? null;
                            const renewalFailedAt =
                                autoRenewal?.renewalFailedAt ?? null;
                            const showRenewalFailedBanner =
                                renewalFailedAt !== null &&
                                renewalPaidUntil !== null &&
                                new Date(renewalPaidUntil).getTime() >
                                    Date.now() &&
                                renewalStatus === "active";

                            const canResumeAutoRenewal =
                                renewalStatus === "cancelled" &&
                                provider === "tranzila" &&
                                subStatus === "active" &&
                                Boolean(expiresAt) &&
                                !isExpired &&
                                (acPlan === "monthly" || acPlan === "yearly");

                            async function handlePayment(plan) {
                                if (plan === "yearly" && !yearlyOptIn) {
                                    setBillingMsg(
                                        "יש לסמן אישור חידוש שנתי כדי להמשיך",
                                    );
                                    return;
                                }
                                setBillingMsg("");
                                navigate(
                                    `/payment/checkout?plan=${encodeURIComponent(plan)}`,
                                );
                            }

                            return (
                                <div className={styles.section}>
                                    <div className={styles.sectionTitle}>
                                        תשלומים
                                    </div>

                                    {accountLoading && (
                                        <div className={styles.billingNote}>
                                            טוען...
                                        </div>
                                    )}

                                    {!accountLoading && account && (
                                        <>
                                            <div className={styles.billingRow}>
                                                <span
                                                    className={
                                                        styles.billingLabel
                                                    }
                                                >
                                                    תוכנית:
                                                </span>
                                                <span
                                                    className={
                                                        styles.billingValue
                                                    }
                                                >
                                                    {acPlan === "yearly"
                                                        ? "שנתית"
                                                        : acPlan === "monthly"
                                                          ? "חודשית"
                                                          : "חינם"}
                                                </span>
                                            </div>

                                            <div className={styles.billingRow}>
                                                <span
                                                    className={
                                                        styles.billingLabel
                                                    }
                                                >
                                                    סטטוס מנוי:
                                                </span>
                                                <span
                                                    className={
                                                        styles.billingValue
                                                    }
                                                >
                                                    {subStatus === "active" &&
                                                    !isExpired
                                                        ? "פעיל"
                                                        : subStatus ===
                                                                "expired" ||
                                                            isExpired
                                                          ? "פג תוקף"
                                                          : "לא פעיל"}
                                                </span>
                                            </div>

                                            <div className={styles.billingRow}>
                                                <span
                                                    className={
                                                        styles.billingLabel
                                                    }
                                                >
                                                    בתוקף עד:
                                                </span>
                                                <span
                                                    className={
                                                        styles.billingValue
                                                    }
                                                >
                                                    {expiresAt
                                                        ? formatDate(expiresAt)
                                                        : "-"}
                                                </span>
                                            </div>

                                            <div className={styles.billingRow}>
                                                <span
                                                    className={
                                                        styles.billingLabel
                                                    }
                                                >
                                                    ספק תשלום:
                                                </span>
                                                <span
                                                    className={
                                                        styles.billingValue
                                                    }
                                                    dir="ltr"
                                                >
                                                    {providerLabel}
                                                </span>
                                            </div>

                                            {showCta && (
                                                <>
                                                    <div
                                                        className={
                                                            styles.billingDisclosure
                                                        }
                                                    >
                                                        <span>
                                                            מסלול חודשי: חיוב
                                                            אוטומטי עד לביטול.
                                                            ניתן לבטל לפני מועד
                                                            החיוב הבא.
                                                        </span>
                                                        <span>
                                                            מסלול שנתי: תשלום
                                                            ₪399.90 מראש. חידוש
                                                            שנתי אוטומטי רק אם
                                                            תסמן/י את האפשרות
                                                            למטה.
                                                        </span>
                                                        <a
                                                            href="/payment-policy"
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className={
                                                                styles.billingDisclosureLink
                                                            }
                                                        >
                                                            תנאי תשלום, חידוש,
                                                            ביטול והחזרים
                                                        </a>
                                                    </div>
                                                    <div
                                                        className={
                                                            styles.billingActions
                                                        }
                                                    >
                                                        <Button
                                                            variant="secondary"
                                                            loading={
                                                                billingBusy
                                                            }
                                                            disabled={
                                                                billingBusy ||
                                                                Boolean(
                                                                    accountError,
                                                                )
                                                            }
                                                            onClick={() =>
                                                                handlePayment(
                                                                    "monthly",
                                                                )
                                                            }
                                                        >
                                                            חודשי - ₪39.90/חודש
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            loading={
                                                                billingBusy
                                                            }
                                                            disabled={
                                                                billingBusy ||
                                                                Boolean(
                                                                    accountError,
                                                                ) ||
                                                                !yearlyOptIn
                                                            }
                                                            onClick={() =>
                                                                handlePayment(
                                                                    "yearly",
                                                                )
                                                            }
                                                        >
                                                            שנתי - ₪399.90/שנה
                                                            (חוסך ₪78.90)
                                                        </Button>
                                                    </div>
                                                    <label
                                                        className={
                                                            styles.billingOptIn
                                                        }
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                yearlyOptIn
                                                            }
                                                            onChange={(e) =>
                                                                setYearlyOptIn(
                                                                    e.target
                                                                        .checked,
                                                                )
                                                            }
                                                        />
                                                        <span
                                                            className={
                                                                styles.billingOptInLabel
                                                            }
                                                        >
                                                            אני מאשר/ת חידוש
                                                            שנתי אוטומטי של
                                                            ₪399.90 לפני תחילת
                                                            שנה שנייה
                                                        </span>
                                                    </label>
                                                </>
                                            )}

                                            {billingMsg && (
                                                <div
                                                    className={
                                                        styles.billingError
                                                    }
                                                >
                                                    {billingMsg}
                                                </div>
                                            )}

                                            {/* ── Renewal failed warning banner ── */}
                                            {showRenewalFailedBanner && (
                                                <div
                                                    className={
                                                        styles.renewalWarning
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.renewalWarningTitle
                                                        }
                                                    >
                                                        ניסיון חיוב חידוש
                                                        Premium נכשל
                                                    </div>
                                                    <div
                                                        className={
                                                            styles.renewalWarningText
                                                        }
                                                    >
                                                        גישת Premium פעילה עד{" "}
                                                        <span dir="ltr">
                                                            {formatDate(
                                                                renewalPaidUntil,
                                                            )}
                                                        </span>
                                                        . יש לחדש לפני תאריך זה
                                                        כדי להמשיך.
                                                    </div>
                                                    <div
                                                        className={
                                                            styles.renewalWarningActions
                                                        }
                                                    >
                                                        <a
                                                            href="/pricing"
                                                            className={
                                                                styles.renewalWarningCta
                                                            }
                                                        >
                                                            חדש Premium עכשיו
                                                        </a>
                                                        <a
                                                            href="mailto:support@cardigo.co.il"
                                                            className={
                                                                styles.renewalWarningHelp
                                                            }
                                                        >
                                                            לתמיכה
                                                        </a>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Cancel renewal block ── */}
                                            {renewalStatus !== "none" && (
                                                <div
                                                    className={
                                                        styles.cancelRenewalBlock
                                                    }
                                                >
                                                    {renewalStatus ===
                                                        "active" &&
                                                        autoRenewal.canCancel && (
                                                            <>
                                                                <div
                                                                    className={
                                                                        styles.billingRow
                                                                    }
                                                                >
                                                                    <span
                                                                        className={
                                                                            styles.billingLabel
                                                                        }
                                                                    >
                                                                        חידוש
                                                                        אוטומטי:
                                                                    </span>
                                                                    <span
                                                                        className={
                                                                            styles.billingValue
                                                                        }
                                                                    >
                                                                        פעיל
                                                                    </span>
                                                                </div>

                                                                {renewalPaidUntil && (
                                                                    <div
                                                                        className={
                                                                            styles.billingNote
                                                                        }
                                                                    >
                                                                        הכרטיס
                                                                        יישאר
                                                                        Premium
                                                                        עד{" "}
                                                                        {formatDate(
                                                                            renewalPaidUntil,
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <div
                                                                    className={
                                                                        styles.billingActions
                                                                    }
                                                                >
                                                                    <Button
                                                                        variant="secondary"
                                                                        disabled={
                                                                            cancelBusy
                                                                        }
                                                                        onClick={() => {
                                                                            setCancelError(
                                                                                "",
                                                                            );
                                                                            setCancelModalOpen(
                                                                                true,
                                                                            );
                                                                        }}
                                                                    >
                                                                        ביטול
                                                                        חידוש
                                                                        אוטומטי
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        )}

                                                    {renewalStatus ===
                                                        "cancelled" && (
                                                        <>
                                                            <div
                                                                className={
                                                                    styles.pwSuccess
                                                                }
                                                            >
                                                                החידוש האוטומטי
                                                                בוטל.{" "}
                                                                {renewalPaidUntil
                                                                    ? `הגישה Premium פעילה עד ${formatDate(renewalPaidUntil)}.`
                                                                    : ""}
                                                            </div>
                                                            {canResumeAutoRenewal && (
                                                                <>
                                                                    <div
                                                                        className={
                                                                            styles.billingNote
                                                                        }
                                                                    >
                                                                        המנוי
                                                                        שלך
                                                                        עדיין
                                                                        פעיל עד
                                                                        תאריך
                                                                        הסיום.
                                                                        אפשר
                                                                        להפעיל
                                                                        מחדש את
                                                                        החידוש
                                                                        האוטומטי
                                                                        כדי
                                                                        שהחיוב
                                                                        הבא
                                                                        יתבצע רק
                                                                        בסיום
                                                                        התקופה
                                                                        הנוכחית.
                                                                    </div>
                                                                    <div
                                                                        className={
                                                                            styles.billingActions
                                                                        }
                                                                    >
                                                                        <Button
                                                                            variant="secondary"
                                                                            loading={
                                                                                resumeBusy
                                                                            }
                                                                            disabled={
                                                                                resumeBusy
                                                                            }
                                                                            onClick={
                                                                                handleResumeRenewal
                                                                            }
                                                                        >
                                                                            {resumeBusy
                                                                                ? "מחדש..."
                                                                                : "חדש חידוש אוטומטי"}
                                                                        </Button>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {resumeError && (
                                                                <div
                                                                    className={
                                                                        styles.billingError
                                                                    }
                                                                >
                                                                    {
                                                                        resumeError
                                                                    }
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {(renewalStatus ===
                                                        "pending" ||
                                                        renewalStatus ===
                                                            "failed") && (
                                                        <div
                                                            className={
                                                                styles.billingNote
                                                            }
                                                        >
                                                            החידוש האוטומטי
                                                            עדיין לא הופעל.
                                                        </div>
                                                    )}

                                                    {cancelError && (
                                                        <div
                                                            className={
                                                                styles.billingError
                                                            }
                                                        >
                                                            {cancelError}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className={styles.billingNote}>
                                                שינוי אמצעי תשלום? פנה לתמיכה:
                                                support@cardigo.co.il
                                            </div>

                                            {/* ── Receipt profile form ── */}
                                            <div
                                                className={
                                                    styles.receiptProfileBlock
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.sectionTitle
                                                    }
                                                >
                                                    פרטי קבלה
                                                </div>

                                                <div
                                                    className={
                                                        styles.billingDisclosure
                                                    }
                                                >
                                                    <span>
                                                        הפרטים ישמשו להפקת קבלות
                                                        ומסמכי תשלום בלבד.
                                                    </span>
                                                    <span>
                                                        שינויים לא יחולו על
                                                        קבלות שכבר הופקו.
                                                    </span>
                                                    <span>
                                                        המספר המזהה הוא
                                                        אופציונלי ורגיש — מלאו
                                                        אותו רק אם נדרש.
                                                    </span>
                                                    <a
                                                        href="/privacy"
                                                        className={
                                                            styles.billingDisclosureLink
                                                        }
                                                    >
                                                        מדיניות הפרטיות
                                                    </a>
                                                </div>

                                                <div
                                                    className={
                                                        styles.receiptProfileFields
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.receiptProfileSelectRow
                                                        }
                                                    >
                                                        <label
                                                            htmlFor="rp-recipient-type"
                                                            className={
                                                                styles.receiptProfileSelectLabel
                                                            }
                                                        >
                                                            סוג נמען
                                                        </label>
                                                        <select
                                                            id="rp-recipient-type"
                                                            className={
                                                                styles.receiptProfileSelect
                                                            }
                                                            value={
                                                                receiptProfileDraft.recipientType
                                                            }
                                                            disabled={
                                                                receiptProfileBusy
                                                            }
                                                            onChange={(e) => {
                                                                setReceiptProfileDraft(
                                                                    (
                                                                        draft,
                                                                    ) => ({
                                                                        ...draft,
                                                                        recipientType:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    }),
                                                                );
                                                                setReceiptProfileError(
                                                                    "",
                                                                );
                                                                setReceiptProfileOk(
                                                                    "",
                                                                );
                                                            }}
                                                        >
                                                            <option value="">
                                                                לא צוין
                                                            </option>
                                                            <option value="private">
                                                                פרטי
                                                            </option>
                                                            <option value="business">
                                                                עסקי
                                                            </option>
                                                        </select>
                                                    </div>

                                                    <Input
                                                        label="שם לקבלה"
                                                        type="text"
                                                        value={
                                                            receiptProfileDraft.name
                                                        }
                                                        onChange={(e) => {
                                                            setReceiptProfileDraft(
                                                                (draft) => ({
                                                                    ...draft,
                                                                    name: e
                                                                        .target
                                                                        .value,
                                                                }),
                                                            );
                                                            setReceiptProfileError(
                                                                "",
                                                            );
                                                            setReceiptProfileOk(
                                                                "",
                                                            );
                                                        }}
                                                        meta="אם יישאר ריק, נשתמש בשם החשבון או בדוא״ל החשבון."
                                                        autoComplete="name"
                                                        disabled={
                                                            receiptProfileBusy
                                                        }
                                                    />

                                                    <Input
                                                        label="דוא״ל לשליחת קבלה"
                                                        type="email"
                                                        value={
                                                            receiptProfileDraft.email
                                                        }
                                                        onChange={(e) => {
                                                            setReceiptProfileDraft(
                                                                (draft) => ({
                                                                    ...draft,
                                                                    email: e
                                                                        .target
                                                                        .value,
                                                                }),
                                                            );
                                                            setReceiptProfileError(
                                                                "",
                                                            );
                                                            setReceiptProfileOk(
                                                                "",
                                                            );
                                                        }}
                                                        meta="אם יישאר ריק, הקבלה תישלח לדוא״ל החשבון."
                                                        autoComplete="email"
                                                        dir="ltr"
                                                        disabled={
                                                            receiptProfileBusy
                                                        }
                                                    />

                                                    <Input
                                                        label={
                                                            receiptProfileDraft.recipientType ===
                                                            "business"
                                                                ? "ח.פ. / מספר עוסק"
                                                                : receiptProfileDraft.recipientType ===
                                                                    "private"
                                                                  ? "ת.ז."
                                                                  : "ת.ז. / ח.פ. / מספר עוסק"
                                                        }
                                                        type="text"
                                                        value={
                                                            receiptProfileDraft.numberId
                                                        }
                                                        onChange={(e) => {
                                                            setReceiptProfileDraft(
                                                                (draft) => ({
                                                                    ...draft,
                                                                    numberId:
                                                                        e.target
                                                                            .value,
                                                                }),
                                                            );
                                                            setReceiptProfileClearNumberId(
                                                                false,
                                                            );
                                                            setReceiptProfileError(
                                                                "",
                                                            );
                                                            setReceiptProfileOk(
                                                                "",
                                                            );
                                                        }}
                                                        meta={
                                                            account
                                                                ?.receiptProfile
                                                                ?.numberIdMasked
                                                                ? `מספר מזהה שמור: ${account.receiptProfile.numberIdMasked}`
                                                                : undefined
                                                        }
                                                        placeholder="אופציונלי"
                                                        autoComplete="off"
                                                        dir="ltr"
                                                        disabled={
                                                            receiptProfileBusy ||
                                                            receiptProfileClearNumberId
                                                        }
                                                    />

                                                    {account?.receiptProfile
                                                        ?.numberIdMasked && (
                                                        <label
                                                            className={
                                                                styles.billingOptIn
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    receiptProfileClearNumberId
                                                                }
                                                                disabled={
                                                                    receiptProfileBusy
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    setReceiptProfileClearNumberId(
                                                                        e.target
                                                                            .checked,
                                                                    );
                                                                    if (
                                                                        e.target
                                                                            .checked
                                                                    ) {
                                                                        setReceiptProfileDraft(
                                                                            (
                                                                                draft,
                                                                            ) => ({
                                                                                ...draft,
                                                                                numberId:
                                                                                    "",
                                                                            }),
                                                                        );
                                                                    }
                                                                    setReceiptProfileError(
                                                                        "",
                                                                    );
                                                                    setReceiptProfileOk(
                                                                        "",
                                                                    );
                                                                }}
                                                            />
                                                            <span
                                                                className={
                                                                    styles.billingOptInLabel
                                                                }
                                                            >
                                                                מחק מספר מזהה
                                                                שמור
                                                            </span>
                                                        </label>
                                                    )}

                                                    <details
                                                        className={
                                                            styles.collapsible
                                                        }
                                                    >
                                                        <summary
                                                            className={
                                                                styles.collapsibleTrigger
                                                            }
                                                        >
                                                            פרטים נוספים
                                                        </summary>
                                                        <div
                                                            className={
                                                                styles.collapsibleContent
                                                            }
                                                        >
                                                            <Input
                                                                label="שם עסק / שם לחשבונית"
                                                                type="text"
                                                                value={
                                                                    receiptProfileDraft.nameInvoice
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    setReceiptProfileDraft(
                                                                        (
                                                                            draft,
                                                                        ) => ({
                                                                            ...draft,
                                                                            nameInvoice:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                        }),
                                                                    );
                                                                    setReceiptProfileError(
                                                                        "",
                                                                    );
                                                                    setReceiptProfileOk(
                                                                        "",
                                                                    );
                                                                }}
                                                                disabled={
                                                                    receiptProfileBusy
                                                                }
                                                            />

                                                            <Input
                                                                label="כתובת"
                                                                type="text"
                                                                value={
                                                                    receiptProfileDraft.address
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    setReceiptProfileDraft(
                                                                        (
                                                                            draft,
                                                                        ) => ({
                                                                            ...draft,
                                                                            address:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                        }),
                                                                    );
                                                                    setReceiptProfileError(
                                                                        "",
                                                                    );
                                                                    setReceiptProfileOk(
                                                                        "",
                                                                    );
                                                                }}
                                                                autoComplete="street-address"
                                                                disabled={
                                                                    receiptProfileBusy
                                                                }
                                                            />

                                                            <Input
                                                                label="עיר"
                                                                type="text"
                                                                value={
                                                                    receiptProfileDraft.city
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    setReceiptProfileDraft(
                                                                        (
                                                                            draft,
                                                                        ) => ({
                                                                            ...draft,
                                                                            city: e
                                                                                .target
                                                                                .value,
                                                                        }),
                                                                    );
                                                                    setReceiptProfileError(
                                                                        "",
                                                                    );
                                                                    setReceiptProfileOk(
                                                                        "",
                                                                    );
                                                                }}
                                                                autoComplete="address-level2"
                                                                disabled={
                                                                    receiptProfileBusy
                                                                }
                                                            />

                                                            <Input
                                                                label="מיקוד"
                                                                type="text"
                                                                value={
                                                                    receiptProfileDraft.zipCode
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    setReceiptProfileDraft(
                                                                        (
                                                                            draft,
                                                                        ) => ({
                                                                            ...draft,
                                                                            zipCode:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                        }),
                                                                    );
                                                                    setReceiptProfileError(
                                                                        "",
                                                                    );
                                                                    setReceiptProfileOk(
                                                                        "",
                                                                    );
                                                                }}
                                                                autoComplete="postal-code"
                                                                dir="ltr"
                                                                disabled={
                                                                    receiptProfileBusy
                                                                }
                                                            />
                                                        </div>
                                                    </details>

                                                    {receiptProfileError && (
                                                        <div
                                                            className={
                                                                styles.billingError
                                                            }
                                                        >
                                                            {
                                                                receiptProfileError
                                                            }
                                                        </div>
                                                    )}

                                                    {receiptProfileOk && (
                                                        <div
                                                            className={
                                                                styles.pwSuccess
                                                            }
                                                        >
                                                            {receiptProfileOk}
                                                        </div>
                                                    )}

                                                    <div
                                                        className={
                                                            styles.billingActions
                                                        }
                                                    >
                                                        <Button
                                                            variant="secondary"
                                                            loading={
                                                                receiptProfileBusy
                                                            }
                                                            disabled={
                                                                receiptProfileBusy ||
                                                                !isReceiptProfileDirty
                                                            }
                                                            onClick={
                                                                handleReceiptProfileSave
                                                            }
                                                        >
                                                            שמור פרטי קבלה
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Receipt history ── */}
                                            <details
                                                className={styles.collapsible}
                                            >
                                                <summary
                                                    className={
                                                        styles.collapsibleTrigger
                                                    }
                                                >
                                                    קבלות
                                                </summary>
                                                <div
                                                    className={
                                                        styles.collapsibleContent
                                                    }
                                                >
                                                    {(() => {
                                                        const dateFormatter =
                                                            new Intl.DateTimeFormat(
                                                                "he-IL",
                                                                {
                                                                    day: "2-digit",
                                                                    month: "2-digit",
                                                                    year: "numeric",
                                                                },
                                                            );
                                                        const amountFormatter =
                                                            new Intl.NumberFormat(
                                                                "he-IL",
                                                                {
                                                                    style: "currency",
                                                                    currency:
                                                                        "ILS",
                                                                },
                                                            );
                                                        return (
                                                            <div
                                                                className={
                                                                    styles.receiptsBlock
                                                                }
                                                            >
                                                                {receiptsLoading && (
                                                                    <div
                                                                        className={
                                                                            styles.billingNote
                                                                        }
                                                                    >
                                                                        טוען
                                                                        קבלות...
                                                                    </div>
                                                                )}
                                                                {!receiptsLoading &&
                                                                    receiptsError && (
                                                                        <div
                                                                            className={
                                                                                styles.billingError
                                                                            }
                                                                        >
                                                                            {
                                                                                receiptsError
                                                                            }
                                                                        </div>
                                                                    )}
                                                                {!receiptsLoading &&
                                                                    !receiptsError &&
                                                                    receipts.length ===
                                                                        0 && (
                                                                        <div
                                                                            className={
                                                                                styles.billingNote
                                                                            }
                                                                        >
                                                                            אין
                                                                            קבלות
                                                                            עדיין.
                                                                        </div>
                                                                    )}
                                                                {!receiptsLoading &&
                                                                    !receiptsError &&
                                                                    receipts.length >
                                                                        0 && (
                                                                        <ul
                                                                            className={
                                                                                styles.receiptsList
                                                                            }
                                                                        >
                                                                            {receipts.map(
                                                                                (
                                                                                    r,
                                                                                ) => {
                                                                                    const dateVal =
                                                                                        r.issuedAt ||
                                                                                        r.createdAt;
                                                                                    const dateStr =
                                                                                        dateVal
                                                                                            ? dateFormatter.format(
                                                                                                  new Date(
                                                                                                      dateVal,
                                                                                                  ),
                                                                                              )
                                                                                            : "";
                                                                                    const amountStr =
                                                                                        typeof r.amountAgorot ===
                                                                                        "number"
                                                                                            ? amountFormatter.format(
                                                                                                  r.amountAgorot /
                                                                                                      100,
                                                                                              )
                                                                                            : "";
                                                                                    const planLabel =
                                                                                        r.plan ===
                                                                                        "yearly"
                                                                                            ? "שנתי"
                                                                                            : r.plan ===
                                                                                                "monthly"
                                                                                              ? "חודשי"
                                                                                              : "";
                                                                                    return (
                                                                                        <li
                                                                                            key={
                                                                                                r.id
                                                                                            }
                                                                                            className={
                                                                                                styles.receiptRow
                                                                                            }
                                                                                        >
                                                                                            <span
                                                                                                className={
                                                                                                    styles.receiptMain
                                                                                                }
                                                                                            >
                                                                                                <span
                                                                                                    className={
                                                                                                        styles.receiptDate
                                                                                                    }
                                                                                                    dir="ltr"
                                                                                                >
                                                                                                    {
                                                                                                        dateStr
                                                                                                    }
                                                                                                </span>
                                                                                                <span
                                                                                                    className={
                                                                                                        styles.receiptMeta
                                                                                                    }
                                                                                                >
                                                                                                    {[
                                                                                                        amountStr,
                                                                                                        planLabel,
                                                                                                    ]
                                                                                                        .filter(
                                                                                                            Boolean,
                                                                                                        )
                                                                                                        .join(
                                                                                                            " · ",
                                                                                                        )}
                                                                                                </span>
                                                                                            </span>
                                                                                            {r.hasPdf && (
                                                                                                <a
                                                                                                    href={`/api/account/receipts/${r.id}/download`}
                                                                                                    className={
                                                                                                        styles.receiptDownloadLink
                                                                                                    }
                                                                                                >
                                                                                                    הורדת
                                                                                                    קבלה
                                                                                                </a>
                                                                                            )}
                                                                                        </li>
                                                                                    );
                                                                                },
                                                                            )}
                                                                        </ul>
                                                                    )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </details>
                                        </>
                                    )}

                                    {!accountLoading &&
                                        !account &&
                                        accountError && (
                                            <div className={styles.billingNote}>
                                                לא זמין
                                            </div>
                                        )}
                                </div>
                            );
                        })()}

                        {/* ── Section 5: העדפות תקשורת ── */}
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>
                                העדפות תקשורת
                            </div>

                            {accountLoading && (
                                <div className={styles.accountNote}>
                                    טוען...
                                </div>
                            )}

                            {!accountLoading && account && (
                                <label className={styles.commPrefRow}>
                                    <input
                                        type="checkbox"
                                        checked={
                                            account.emailMarketingConsent ===
                                            true
                                        }
                                        disabled={mktBusy}
                                        onChange={(e) =>
                                            handleMarketingToggle(
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    <span className={styles.commPrefInfo}>
                                        <span>
                                            קבלת תזכורות ועדכונים רלוונטיים
                                            מ-Cardigo בדוא"ל
                                        </span>
                                        <span className={styles.commPrefHint}>
                                            ניתן לשנות בכל עת
                                        </span>
                                    </span>
                                </label>
                            )}

                            {mktError && (
                                <div className={styles.accountError}>
                                    {mktError}
                                </div>
                            )}
                        </div>

                        {/* ── Section 4: פעולות ── */}
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>פעולות</div>

                            <details className={styles.collapsible}>
                                <summary className={styles.collapsibleTrigger}>
                                    שינוי סיסמה
                                </summary>
                                <form
                                    className={styles.collapsibleContent}
                                    onSubmit={handleChangePassword}
                                    autoComplete="off"
                                >
                                    <Input
                                        label="סיסמה נוכחית"
                                        type="password"
                                        value={pwCurrent}
                                        onChange={(e) => {
                                            setPwCurrent(e.target.value);
                                            setPwError("");
                                            setPwSuccess("");
                                        }}
                                        autoComplete="current-password"
                                        disabled={pwSubmitting}
                                    />

                                    <Input
                                        label="סיסמה חדשה"
                                        type="password"
                                        value={pwNew}
                                        onChange={(e) => {
                                            setPwNew(e.target.value);
                                            setPwError("");
                                            setPwSuccess("");
                                            setPwConfirmError("");
                                            setPwNewError("");
                                        }}
                                        onBlur={() => setPwNewTouched(true)}
                                        minLength={PASSWORD_POLICY.minLength}
                                        maxLength={PASSWORD_POLICY.maxLength}
                                        meta={PASSWORD_POLICY_HELPER_TEXT_HE}
                                        error={pwNewError}
                                        autoComplete="new-password"
                                        disabled={pwSubmitting}
                                    />

                                    {(pwNewTouched ||
                                        pwNewError ||
                                        pwNew.length > 0) && (
                                        <ul
                                            className={styles.pwChecklist}
                                            aria-label="דרישות הסיסמה"
                                        >
                                            {getPasswordPolicyChecklist(
                                                pwNew,
                                            ).map((item) => (
                                                <li
                                                    key={item.id}
                                                    className={`${styles.pwChecklistItem}${item.met ? ` ${styles.pwChecklistItemMet}` : ""}`}
                                                >
                                                    {item.label}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <Input
                                        label="אימות סיסמה חדשה"
                                        type="password"
                                        value={pwConfirm}
                                        onChange={(e) => {
                                            setPwConfirm(e.target.value);
                                            setPwConfirmError("");
                                            setPwSuccess("");
                                        }}
                                        maxLength={PASSWORD_POLICY.maxLength}
                                        error={pwConfirmError}
                                        autoComplete="new-password"
                                        disabled={pwSubmitting}
                                    />

                                    {pwError && (
                                        <div className={styles.accountError}>
                                            {pwError}
                                        </div>
                                    )}

                                    {pwSuccess && (
                                        <div className={styles.pwSuccess}>
                                            {pwSuccess}
                                        </div>
                                    )}

                                    <div className={styles.pwActions}>
                                        <Button
                                            type="submit"
                                            variant="secondary"
                                            loading={pwSubmitting}
                                            disabled={
                                                pwSubmitting ||
                                                !pwCurrent.trim() ||
                                                !pwNew.trim() ||
                                                !pwConfirm.trim()
                                            }
                                        >
                                            שינוי סיסמה
                                        </Button>
                                    </div>
                                </form>
                            </details>

                            {deleteCardBlock}

                            <details
                                className={`${styles.collapsible} ${styles.collapsibleDanger}`}
                            >
                                <summary className={styles.collapsibleTrigger}>
                                    מחיקת חשבון
                                </summary>
                                <form
                                    className={styles.collapsibleContent}
                                    onSubmit={handleDeleteAccount}
                                    autoComplete="off"
                                >
                                    <div className={styles.dangerText}>
                                        מחיקת החשבון תמחק לצמיתות את הכרטיס
                                        האישי, תמונות, לידים ונתוני אנליטיקה.
                                    </div>
                                    <div className={styles.dangerText}>
                                        לא ניתן לשחזר.
                                    </div>
                                    <div className={styles.dangerText}>
                                        לא ניתן החזר כספי אוטומטי על תשלום קיים.
                                    </div>
                                    <div className={styles.dangerText}>
                                        כתובת האימייל הזו לא תהיה זמינה ליצירת
                                        חשבון חדש ב-Cardigo.
                                    </div>

                                    <Input
                                        label='הקלד "מחיקה" לאישור'
                                        value={delConfirm}
                                        onChange={(e) => {
                                            setDelConfirm(e.target.value);
                                            setDelError("");
                                            setDelBlockOrgs(null);
                                        }}
                                        placeholder="מחיקה"
                                        autoComplete="off"
                                        disabled={delSubmitting}
                                    />

                                    <Input
                                        label="סיסמה נוכחית"
                                        type="password"
                                        value={delPassword}
                                        onChange={(e) => {
                                            setDelPassword(e.target.value);
                                            setDelError("");
                                            setDelBlockOrgs(null);
                                        }}
                                        autoComplete="current-password"
                                        disabled={delSubmitting}
                                    />

                                    {delBlockOrgs && (
                                        <div className={styles.dangerError}>
                                            אתה המנהל היחיד בארגונים:{" "}
                                            {delBlockOrgs
                                                .map(
                                                    (o) =>
                                                        o.orgName || o.orgSlug,
                                                )
                                                .join(", ")}
                                            . העבר ניהול לפני מחיקה.
                                        </div>
                                    )}

                                    {delError && (
                                        <div className={styles.dangerError}>
                                            {delError}
                                        </div>
                                    )}

                                    {delDone && (
                                        <div className={styles.dangerText}>
                                            החשבון נמחק. כתובת האימייל לא תהיה
                                            זמינה ליצירת חשבון חדש.
                                        </div>
                                    )}

                                    <div className={styles.dangerActions}>
                                        <Button
                                            type="submit"
                                            variant="ghost"
                                            loading={delSubmitting}
                                            disabled={
                                                delDone ||
                                                delSubmitting ||
                                                delConfirm.trim() !== "מחיקה" ||
                                                !delPassword.trim()
                                            }
                                        >
                                            מחק חשבון
                                        </Button>
                                    </div>
                                </form>
                            </details>
                        </div>
                    </>
                )}
            </div>
            <CancelRenewalModal
                open={cancelModalOpen}
                busy={cancelBusy}
                onConfirm={handleCancelRenewal}
                onClose={() => setCancelModalOpen(false)}
            />
        </Panel>
    );
}
