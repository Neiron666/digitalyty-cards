import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    getAccountSummary,
    updateReceiptProfile,
} from "../../services/account.service";
import { createPayment } from "../../services/payment.service";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Notice from "../../components/ui/Notice/Notice";
import SeoHelmet from "../../components/seo/SeoHelmet";
import styles from "./CheckoutPage.module.css";

const VALID_PLANS = ["monthly", "yearly"];

const PLAN_LABELS = {
    monthly: "₪39.90 לחודש",
    yearly: "₪399.90 לשנה",
};

/* ── Validation ─────────────────────────────────────── */

/**
 * Validate the receipt draft before advancing to summary.
 *
 * Required fields (before payment):
 *   - A display name: draft.name OR draft.nameInvoice.
 *     Draft is pre-filled from serverProfile on load, so an explicit clear
 *     by the user is respected and must block progression.
 *   - A receipt email: draft.email OR accountEmail (authenticated user's email).
 *     serverProfile.email is NOT used as a fallback — clearing the email
 *     field must be respected unless the account itself has an email.
 *
 * Optional: numberId, address, city, zipCode, recipientType.
 *
 * @param {object} draft         - current form draft
 * @param {string|null} accountEmail - authenticated user's account email
 */
function validateReceiptDraft(draft, accountEmail) {
    // ── Format / length checks (always apply) ──────────────
    if (draft.name.trim().length > 200)
        return "שם מלא ארוך מדי (מקסימום 200 תווים).";
    if (draft.nameInvoice.trim().length > 200)
        return "שם לחשבונית ארוך מדי (מקסימום 200 תווים).";
    if (draft.email.trim() !== "") {
        if (draft.email.trim().length > 200) return 'כתובת דוא"ל ארוכה מדי.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
            return 'כתובת דוא"ל אינה תקינה.';
    }
    if (draft.numberId.trim() !== "") {
        if (draft.numberId.trim().length > 32)
            return "מספר ת.ז / ח.פ ארוך מדי (מקסימום 32 תווים).";
        if (!/^[a-zA-Z0-9-]*$/.test(draft.numberId.trim()))
            return "מספר ת.ז / ח.פ מכיל תווים לא חוקיים.";
    }
    if (draft.address.trim().length > 300)
        return "כתובת ארוכה מדי (מקסימום 300 תווים).";
    if (draft.city.trim().length > 100)
        return "עיר ארוכה מדי (מקסימום 100 תווים).";
    if (draft.zipCode.trim().length > 20)
        return "מיקוד ארוך מדי (מקסימום 20 תווים).";

    // ── Required: receipt display name (draft only) ─────────
    // Draft is pre-filled from server on load. An explicit clear must block.
    if (!draft.name.trim() && !draft.nameInvoice.trim()) {
        return "נדרש שם לקבלה או שם עסק / שם לחשבונית לפני מעבר לתשלום.";
    }

    // ── Required: receipt email (draft or account fallback) ──
    // serverProfile.email is NOT consulted — draft reflects current intent.
    if (!draft.email.trim() && !(accountEmail ?? "").trim()) {
        return "נדרש דוא״ל לקבלה לפני מעבר לתשלום.";
    }

    return null;
}

function buildReceiptPayload(draft, clearNumberId, serverProfile) {
    const rp = serverProfile ?? null;
    const payload = {};
    const draftType = draft.recipientType || null;
    const serverType = rp?.recipientType ?? null;
    if (draftType !== serverType) payload.recipientType = draftType;
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

/* ── Brand mark ──────────────────────────────────────── */

function CheckoutBrandMark() {
    return (
        <div className={styles.brandBlock} aria-label="Cardigo">
            <picture>
                <source
                    type="image/webp"
                    srcSet="/images/brand-logo/cardigo-logo.webp"
                />
                <img
                    src="/images/brand-logo/cardigo-logo.png"
                    alt="Cardigo"
                    className={styles.brandImg}
                    loading="lazy"
                    decoding="async"
                />
            </picture>
        </div>
    );
}

/* ── Component ──────────────────────────────────────── */

export default function CheckoutPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const plan = searchParams.get("plan");

    /* Account */
    const [accountLoading, setAccountLoading] = useState(true);
    const [accountError, setAccountError] =
        useState(""); /* "" | "auth" | "error" */
    const [account, setAccount] = useState(null);

    /* Step machine */
    const [step, setStep] =
        useState("receipt"); /* receipt | summary | payment */

    /* Receipt profile draft */
    const [draft, setDraft] = useState({
        recipientType: "",
        name: "",
        nameInvoice: "",
        email: "",
        numberId: "",
        address: "",
        city: "",
        zipCode: "",
    });
    const [clearNumberId, setClearNumberId] = useState(false);
    const [receiptBusy, setReceiptBusy] = useState(false);
    const [receiptError, setReceiptError] = useState("");
    const [receiptOk, setReceiptOk] = useState("");

    /* Summary + payment */
    const [yearlyAck, setYearlyAck] = useState(false);
    const [paymentBusy, setPaymentBusy] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [paymentUrl, setPaymentUrl] = useState(null);
    const [iframeMisconfigured, setIframeMisconfigured] = useState(false);
    const [paymentResult, setPaymentResult] =
        useState(null); /* null | "success" | "fail" */

    /* ── Load account on mount ─────────────────────── */
    useEffect(() => {
        async function load() {
            try {
                const data = await getAccountSummary();
                setAccount(data);
                const rp = data?.receiptProfile ?? null;
                setDraft({
                    recipientType: rp?.recipientType ?? "",
                    name: rp?.name ?? "",
                    nameInvoice: rp?.nameInvoice ?? "",
                    email: rp?.email ?? "",
                    numberId: "",
                    address: rp?.address ?? "",
                    city: rp?.city ?? "",
                    zipCode: rp?.zipCode ?? "",
                });
            } catch (err) {
                if (err?.response?.status === 401) {
                    setAccountError("auth");
                } else {
                    setAccountError("error");
                }
            } finally {
                setAccountLoading(false);
            }
        }
        load();
    }, []);

    /* ── postMessage listener (active only in payment step) ── */
    useEffect(() => {
        if (step !== "payment") return;
        function handleMessage(event) {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type !== "CARDIGO_PAYMENT_STATUS") return;
            const s = event.data?.status;
            if (s !== "success" && s !== "fail") return;
            setPaymentResult(s);
        }
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [step]);

    /* ── Receipt profile save ──────────────────────── */
    async function handleReceiptSave() {
        setReceiptError("");
        setReceiptOk("");
        const validErr = validateReceiptDraft(draft, account?.email ?? null);
        if (validErr) {
            setReceiptError(validErr);
            return;
        }
        const payload = buildReceiptPayload(
            draft,
            clearNumberId,
            account?.receiptProfile,
        );
        if (Object.keys(payload).length === 0) {
            setReceiptOk("לא בוצעו שינויים.");
            return;
        }
        setReceiptBusy(true);
        try {
            const updated = await updateReceiptProfile(payload);
            setAccount((prev) => ({
                ...prev,
                receiptProfile: updated?.receiptProfile ?? prev?.receiptProfile,
            }));
            setReceiptOk("פרטי החשבונית עודכנו.");
            setClearNumberId(false);
        } catch (err) {
            if (err?.response?.status === 429) {
                setReceiptError("יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
            } else {
                const msg = err?.response?.data?.message;
                if (typeof msg === "string" && msg.length < 200) {
                    setReceiptError(msg);
                } else {
                    setReceiptError("שמירת הפרטים נכשלה. נסו שנית.");
                }
            }
        } finally {
            setReceiptBusy(false);
        }
    }

    /* ── Create payment (iframe mode) ─────────────── */
    async function handleCreatePayment() {
        setPaymentBusy(true);
        setPaymentError("");
        setIframeMisconfigured(false);
        try {
            const data = await createPayment(plan, { mode: "iframe" });
            if (!data?.paymentUrl || !/^https:\/\//.test(data.paymentUrl)) {
                setPaymentError("לא ניתן להתחיל תשלום. נסו שנית.");
                return;
            }
            setPaymentUrl(data.paymentUrl);
            setStep("payment");
        } catch (err) {
            if (err?.response?.status === 429) {
                setPaymentError("יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
            } else if (err?.response?.status === 400) {
                const msg = err?.response?.data?.message;
                if (
                    typeof msg === "string" &&
                    msg.length < 200 &&
                    msg === "Iframe checkout is not configured"
                ) {
                    setIframeMisconfigured(true);
                    setPaymentError(
                        "שירות התשלום אינו מוגדר כעת. ניתן לנסות פתיחה בחלון מלא.",
                    );
                } else if (typeof msg === "string" && msg.length < 200) {
                    setPaymentError(msg);
                } else {
                    setPaymentError("לא ניתן להתחיל תשלום. נסו שנית.");
                }
            } else {
                setPaymentError("לא ניתן להתחיל תשלום. נסו שנית.");
            }
        } finally {
            setPaymentBusy(false);
        }
    }

    /* ── External fallback ─────────────────────────── */
    async function handleExternalFallback() {
        if (paymentUrl) {
            window.location.assign(paymentUrl);
            return;
        }
        setPaymentBusy(true);
        setPaymentError("");
        try {
            const data = await createPayment(plan, { mode: "external" });
            if (data?.paymentUrl && /^https:\/\//.test(data.paymentUrl)) {
                window.location.assign(data.paymentUrl);
            } else {
                setPaymentError("לא ניתן לפתוח תשלום. נסו שנית.");
            }
        } catch {
            setPaymentError("לא ניתן לפתוח תשלום. נסו שנית.");
        } finally {
            setPaymentBusy(false);
        }
    }

    /* ── Field helpers ─────────────────────────────── */
    function setField(field, value) {
        setDraft((prev) => ({ ...prev, [field]: value }));
        setReceiptError("");
        setReceiptOk("");
    }

    /* ── Continue to summary (validate → save if dirty → advance) ── */
    async function handleContinueToSummary() {
        // Always validate required fields first — no empty-draft bypass.
        const validErr = validateReceiptDraft(draft, account?.email ?? null);
        if (validErr) {
            setReceiptError(validErr);
            return;
        }

        // Build diff payload: only fields that changed vs server state.
        const payload = buildReceiptPayload(
            draft,
            clearNumberId,
            account?.receiptProfile,
        );

        // If nothing changed, server profile already satisfies requirements — advance.
        if (Object.keys(payload).length === 0) {
            setReceiptOk("");
            setStep("summary");
            return;
        }

        // Draft is dirty: persist before advancing.
        setReceiptBusy(true);
        setReceiptError("");
        setReceiptOk("");
        try {
            const updated = await updateReceiptProfile(payload);
            setAccount((prev) => ({
                ...prev,
                receiptProfile: updated?.receiptProfile ?? prev?.receiptProfile,
            }));
            setClearNumberId(false);
            setStep("summary");
        } catch (err) {
            if (err?.response?.status === 429) {
                setReceiptError("יותר מדי ניסיונות. נסו שוב מאוחר יותר.");
            } else {
                const msg = err?.response?.data?.message;
                if (typeof msg === "string" && msg.length < 200) {
                    setReceiptError(msg);
                } else {
                    setReceiptError("שמירת הפרטים נכשלה. נסו שנית.");
                }
            }
            // Stay on receipt step — do not advance.
        } finally {
            setReceiptBusy(false);
        }
    }

    /* ── Invalid plan ──────────────────────────────── */
    if (!VALID_PLANS.includes(plan)) {
        return (
            <div className={styles.page}>
                <SeoHelmet robots="noindex, nofollow" />
                <div className={styles.card}>
                    <CheckoutBrandMark />
                    <p className={styles.errorText}>
                        תוכנית לא תקינה. אנא בחרו תוכנית מעמוד המחירים.
                    </p>
                    <div className={styles.actions}>
                        <Link to="/pricing" className={styles.link}>
                            חזרה לעמוד המחירים
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Account loading ───────────────────────────── */
    if (accountLoading) {
        return (
            <div className={styles.page}>
                <SeoHelmet robots="noindex, nofollow" />
                <div className={styles.card}>
                    <CheckoutBrandMark />
                    <p className={styles.mutedText}>טוען פרטי חשבון...</p>
                </div>
            </div>
        );
    }

    /* ── Auth gate ─────────────────────────────────── */
    if (accountError === "auth") {
        return (
            <div className={styles.page}>
                <SeoHelmet robots="noindex, nofollow" />
                <div className={styles.card}>
                    <CheckoutBrandMark />
                    <Notice variant="info">יש להתחבר כדי להמשיך לתשלום.</Notice>
                    <div className={styles.actions}>
                        <Link to="/login" className={styles.link}>
                            כניסה
                        </Link>
                        <Link to="/register" className={styles.link}>
                            הרשמה
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Generic error ─────────────────────────────── */
    if (accountError === "error") {
        return (
            <div className={styles.page}>
                <SeoHelmet robots="noindex, nofollow" />
                <div className={styles.card}>
                    <CheckoutBrandMark />
                    <Notice variant="error">
                        אירעה שגיאה בטעינת הפרטים. נסו לרענן את הדף.
                    </Notice>
                </div>
            </div>
        );
    }

    /* ── Active subscription guard ─────────────────── */
    const subExpiresAt = account?.subscription?.expiresAt
        ? new Date(account.subscription.expiresAt)
        : null;
    const isActiveSub =
        account?.subscription?.status === "active" &&
        subExpiresAt !== null &&
        subExpiresAt > new Date();

    if (isActiveSub) {
        return (
            <div className={styles.page}>
                <SeoHelmet robots="noindex, nofollow" />
                <div className={styles.card}>
                    <CheckoutBrandMark />
                    <Notice variant="info">
                        יש לך כבר מנוי פעיל. המנוי בתוקף עד{" "}
                        {subExpiresAt.toLocaleDateString("he-IL")}.
                    </Notice>
                    <div className={styles.actions}>
                        <Button
                            variant="primary"
                            onClick={() => navigate("/edit/card/settings")}
                        >
                            להגדרות הכרטיס
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Receipt step ──────────────────────────────── */
    if (step === "receipt") {
        const serverProfile = account?.receiptProfile ?? null;
        const showMasked = Boolean(serverProfile?.numberIdMasked);
        return (
            <div className={styles.page}>
                <SeoHelmet robots="noindex, nofollow" />
                <div className={styles.card}>
                    <CheckoutBrandMark />
                    <div className={styles.header}>
                        <h1 className={styles.title}>פרטי חשבונית</h1>
                        <p className={styles.subtitle}>
                            יש לאשר פרטי קבלה לפני מעבר לתשלום. השינויים לא
                            יחולו על קבלות שכבר הופקו.
                        </p>
                    </div>

                    <div className={styles.stepRow}>
                        <span className={styles.stepActive}>
                            1. פרטי חשבונית
                        </span>
                        <span className={styles.stepSep}>›</span>
                        <span className={styles.stepInactive}>2. סיכום</span>
                        <span className={styles.stepSep}>›</span>
                        <span className={styles.stepInactive}>3. תשלום</span>
                    </div>

                    <div className={styles.form}>
                        <Input
                            label="שם מלא"
                            type="text"
                            value={draft.name}
                            onChange={(e) => setField("name", e.target.value)}
                            placeholder="שם מלא"
                        />
                        <Input
                            label="שם לחשבונית"
                            type="text"
                            value={draft.nameInvoice}
                            onChange={(e) =>
                                setField("nameInvoice", e.target.value)
                            }
                            placeholder="שם כפי שיופיע בחשבונית"
                        />
                        <Input
                            label='דוא"ל לחשבונית'
                            type="email"
                            value={draft.email}
                            onChange={(e) => setField("email", e.target.value)}
                            placeholder='כתובת דוא"ל'
                        />
                        <Input
                            label="ת.ז / ח.פ"
                            type="text"
                            value={draft.numberId}
                            onChange={(e) =>
                                setField("numberId", e.target.value)
                            }
                            placeholder="מספר זיהוי (אופציונלי)"
                            meta={
                                showMasked
                                    ? `מספר שמור: ${serverProfile.numberIdMasked}`
                                    : undefined
                            }
                        />
                        {showMasked && (
                            <label className={styles.checkLabel}>
                                <input
                                    type="checkbox"
                                    checked={clearNumberId}
                                    onChange={(e) =>
                                        setClearNumberId(e.target.checked)
                                    }
                                />
                                <span>מחיקת מספר הזיהוי השמור</span>
                            </label>
                        )}
                        <Input
                            label="כתובת"
                            type="text"
                            value={draft.address}
                            onChange={(e) =>
                                setField("address", e.target.value)
                            }
                            placeholder="כתובת (אופציונלי)"
                        />
                        <Input
                            label="עיר"
                            type="text"
                            value={draft.city}
                            onChange={(e) => setField("city", e.target.value)}
                            placeholder="עיר (אופציונלי)"
                        />
                        <Input
                            label="מיקוד"
                            type="text"
                            value={draft.zipCode}
                            onChange={(e) =>
                                setField("zipCode", e.target.value)
                            }
                            placeholder="מיקוד (אופציונלי)"
                        />
                    </div>

                    {receiptError && (
                        <Notice variant="error">{receiptError}</Notice>
                    )}
                    {receiptOk && (
                        <Notice variant="success">{receiptOk}</Notice>
                    )}

                    <div className={styles.actions}>
                        <Button
                            variant="secondary"
                            onClick={handleReceiptSave}
                            loading={receiptBusy}
                            disabled={receiptBusy}
                        >
                            שמירת פרטים
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleContinueToSummary}
                            loading={receiptBusy}
                            disabled={receiptBusy}
                        >
                            המשך לסיכום
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Summary step ──────────────────────────────── */
    if (step === "summary") {
        const summaryReady = plan === "yearly" ? yearlyAck : true;
        return (
            <div className={styles.page}>
                <SeoHelmet robots="noindex, nofollow" />
                <div className={styles.card}>
                    <CheckoutBrandMark />
                    <div className={styles.header}>
                        <h1 className={styles.title}>סיכום הזמנה</h1>
                    </div>

                    <div className={styles.stepRow}>
                        <span className={styles.stepDone}>1. פרטי חשבונית</span>
                        <span className={styles.stepSep}>›</span>
                        <span className={styles.stepActive}>2. סיכום</span>
                        <span className={styles.stepSep}>›</span>
                        <span className={styles.stepInactive}>3. תשלום</span>
                    </div>

                    <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>תוכנית:</span>
                        <span className={styles.summaryValue}>
                            {plan === "monthly" ? "חודשי" : "שנתי"}
                        </span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>מחיר:</span>
                        <span className={styles.summaryValue}>
                            {PLAN_LABELS[plan]}
                        </span>
                    </div>

                    {plan === "yearly" && (
                        <label className={styles.checkLabel}>
                            <input
                                type="checkbox"
                                checked={yearlyAck}
                                onChange={(e) => setYearlyAck(e.target.checked)}
                            />
                            <span>
                                אני מבין/ה שזה חיוב שנתי מתחדש בהתאם ל
                                <Link
                                    to="/payment-policy"
                                    className={styles.inlineLink}
                                >
                                    מדיניות התשלומים
                                </Link>
                                .
                            </span>
                        </label>
                    )}

                    {paymentError && (
                        <Notice variant="error">{paymentError}</Notice>
                    )}

                    {iframeMisconfigured && (
                        <div className={styles.fallbackBlock}>
                            <p className={styles.mutedText}>
                                עמוד התשלום המוטמע אינו זמין כעת.
                            </p>
                            <Button
                                variant="primary"
                                onClick={handleExternalFallback}
                                loading={paymentBusy}
                                disabled={paymentBusy}
                                fullWidth
                            >
                                פתיחה בחלון מלא
                            </Button>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <Button
                            variant="secondary"
                            onClick={() => setStep("receipt")}
                            disabled={paymentBusy}
                        >
                            חזרה
                        </Button>
                        {!iframeMisconfigured && (
                            <Button
                                variant="primary"
                                onClick={handleCreatePayment}
                                loading={paymentBusy}
                                disabled={
                                    paymentBusy ||
                                    !summaryReady ||
                                    Boolean(paymentUrl)
                                }
                            >
                                המשך לתשלום
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    /* ── Payment step ──────────────────────────────── */
    if (paymentResult === "success") {
        return (
            <div className={styles.page}>
                <SeoHelmet robots="noindex, nofollow" />
                <div className={styles.card}>
                    <CheckoutBrandMark />
                    <Notice variant="success">
                        התשלום נשלח לאישור. נעדכן את החשבון לאחר קבלת אישור
                        התשלום.
                    </Notice>
                    <div className={styles.actions}>
                        <Button
                            variant="primary"
                            onClick={() => navigate("/edit/card/settings")}
                        >
                            להגדרות הכרטיס
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (paymentResult === "fail") {
        return (
            <div className={styles.page}>
                <SeoHelmet robots="noindex, nofollow" />
                <div className={styles.card}>
                    <CheckoutBrandMark />
                    <Notice variant="error">
                        התשלום לא הושלם. ניתן לנסות שנית.
                    </Notice>
                    <div className={styles.actions}>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setPaymentError("");
                                setPaymentResult(null);
                                setStep("summary");
                            }}
                        >
                            חזרה לסיכום
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleExternalFallback}
                            loading={paymentBusy}
                            disabled={paymentBusy}
                        >
                            פתיחה בחלון מלא
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <SeoHelmet robots="noindex, nofollow" />
            <div className={styles.card}>
                <CheckoutBrandMark />
                <div className={styles.header}>
                    <h1 className={styles.title}>תשלום מאובטח</h1>
                </div>

                <div className={styles.stepRow}>
                    <span className={styles.stepDone}>1. פרטי חשבונית</span>
                    <span className={styles.stepSep}>›</span>
                    <span className={styles.stepDone}>2. סיכום</span>
                    <span className={styles.stepSep}>›</span>
                    <span className={styles.stepActive}>3. תשלום</span>
                </div>

                {paymentError && (
                    <Notice variant="error">{paymentError}</Notice>
                )}

                <div className={styles.frameWrapper}>
                    <iframe
                        src={paymentUrl}
                        title="תשלום מאובטח"
                        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
                        className={styles.frame}
                    />
                </div>

                {!paymentResult && (
                    <div className={styles.fallbackBlock}>
                        <p className={styles.mutedText}>
                            אם עמוד התשלום אינו נטען, ניתן לפתוח אותו בחלון
                            נפרד:
                        </p>
                        <Button
                            variant="secondary"
                            onClick={handleExternalFallback}
                            loading={paymentBusy}
                            disabled={paymentBusy}
                        >
                            פתיחה בחלון מלא
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
