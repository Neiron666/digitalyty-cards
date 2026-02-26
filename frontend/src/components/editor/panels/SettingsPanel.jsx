import { useEffect, useMemo, useState, useRef } from "react";
import Panel from "./Panel";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import { useAuth } from "../../../context/AuthContext";
import {
    getAccountSummary,
    changePassword,
    deleteAccount,
} from "../../../services/account.service";
import { createPayment } from "../../../services/payment.service";
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
    const { token, isAuthenticated, logout } = useAuth();
    const slug = card?.slug;

    const [account, setAccount] = useState(null);
    const [accountLoading, setAccountLoading] = useState(false);
    const [accountError, setAccountError] = useState("");
    const accountFetched = useRef(false);

    const [pwCurrent, setPwCurrent] = useState("");
    const [pwNew, setPwNew] = useState("");
    const [pwConfirm, setPwConfirm] = useState("");
    const [pwSubmitting, setPwSubmitting] = useState(false);
    const [pwError, setPwError] = useState("");
    const [pwSuccess, setPwSuccess] = useState("");
    const [pwConfirmError, setPwConfirmError] = useState("");

    const [billingBusy, setBillingBusy] = useState(false);
    const [billingMsg, setBillingMsg] = useState("");

    const [delConfirm, setDelConfirm] = useState("");
    const [delPassword, setDelPassword] = useState("");
    const [delSubmitting, setDelSubmitting] = useState(false);
    const [delError, setDelError] = useState("");
    const [delBlockOrgs, setDelBlockOrgs] = useState(null);

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
                // Success — logout + hard redirect.
                logout();
                window.location.href = "/";
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

    function resetPwForm() {
        setPwCurrent("");
        setPwNew("");
        setPwConfirm("");
        setPwError("");
        setPwSuccess("");
        setPwConfirmError("");
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        setPwError("");
        setPwSuccess("");
        setPwConfirmError("");

        if (!pwCurrent.trim() || !pwNew.trim() || !pwConfirm.trim()) {
            setPwError("יש למלא את כל השדות.");
            return;
        }
        if (pwNew !== pwConfirm) {
            setPwConfirmError("הסיסמאות אינן תואמות.");
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
        } catch (err) {
            const status = err?.response?.status;
            if (status === 429) {
                setPwError("יותר מדי ניסיונות. נסה שוב מאוחר יותר.");
            } else {
                setPwError("לא הצלחנו לשנות את הסיסמה.");
            }
        } finally {
            setPwSubmitting(false);
        }
    }

    useEffect(() => {
        if (!isAuthenticated || accountFetched.current) return;
        accountFetched.current = true;
        setAccountLoading(true);
        setAccountError("");
        getAccountSummary()
            .then((data) => setAccount(data))
            .catch(() => setAccountError("לא הצלחנו לטעון את פרטי החשבון."))
            .finally(() => setAccountLoading(false));
    }, [isAuthenticated]);

    const origin =
        typeof window !== "undefined" && window.location?.origin
            ? window.location.origin
            : "";

    const fallbackPublicPath = slug ? `/card/${slug}` : "";
    const publicPath = card?.publicPath || fallbackPublicPath;
    const publicUrl = publicPath ? `${origin}${publicPath}` : "";
    const isPublished = card?.status === "published";
    const isPublicLink = Boolean(token) && isPublished;

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

    const canEditSlug = useMemo(() => {
        return (
            Boolean(token) &&
            card?.status === "draft" &&
            !editingDisabled &&
            typeof onUpdateSlug === "function"
        );
    }, [token, card?.status, editingDisabled, onUpdateSlug]);

    const publicPathPrefix = useMemo(() => {
        if (!publicPath) return "/card";
        const parts = String(publicPath).split("/").filter(Boolean);
        if (parts.length < 2) return "/card";
        return `/${parts.slice(0, -1).join("/")}`;
    }, [publicPath]);

    const previewUrl = useMemo(() => {
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
                            label={`לאחר ‎${publicPathPrefix}/‎`}
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

                        <div className={styles.slugRemaining}>
                            נותרו{" "}
                            <span className={styles.slugRemainingValue}>
                                {slugRemaining === null
                                    ? `—/${slugLimit}`
                                    : `${slugRemaining}/${slugLimit}`}
                            </span>{" "}
                            שינויים החודש.
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

                {isAuthenticated && (
                    <div className={styles.accountBlock}>
                        <div className={styles.accountTitle}>חשבון</div>

                        {accountLoading && (
                            <div className={styles.accountNote}>טוען...</div>
                        )}

                        {accountError && (
                            <div className={styles.accountError}>
                                {accountError}
                            </div>
                        )}

                        {account && !accountLoading && (
                            <div className={styles.accountFields}>
                                <div className={styles.accountRow}>
                                    <span className={styles.accountLabel}>
                                        אימייל
                                    </span>
                                    <span
                                        className={styles.accountValue}
                                        dir="ltr"
                                    >
                                        {account.email || "—"}
                                    </span>
                                </div>

                                <div className={styles.accountRow}>
                                    <span className={styles.accountLabel}>
                                        תוכנית
                                    </span>
                                    <span className={styles.accountValue}>
                                        {account.plan === "yearly"
                                            ? "שנתית"
                                            : account.plan === "monthly"
                                              ? "חודשית"
                                              : "חינם"}
                                    </span>
                                </div>

                                <div className={styles.accountRow}>
                                    <span className={styles.accountLabel}>
                                        מנוי
                                    </span>
                                    <span className={styles.accountValue}>
                                        {account.subscription?.status ===
                                        "active"
                                            ? "פעיל"
                                            : account.subscription?.status ===
                                                "expired"
                                              ? "פג תוקף"
                                              : "לא פעיל"}
                                    </span>
                                </div>

                                {account.subscription?.expiresAt && (
                                    <div className={styles.accountRow}>
                                        <span className={styles.accountLabel}>
                                            בתוקף עד
                                        </span>
                                        <span className={styles.accountValue}>
                                            {formatDate(
                                                account.subscription.expiresAt,
                                            )}
                                        </span>
                                    </div>
                                )}

                                {account.orgMemberships?.length > 0 && (
                                    <div className={styles.accountOrgs}>
                                        <span className={styles.accountLabel}>
                                            ארגונים
                                        </span>
                                        <ul className={styles.orgList}>
                                            {account.orgMemberships.map((m) => (
                                                <li key={m.orgId}>
                                                    {m.orgName || m.orgSlug}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Billing / Payments block ── */}
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

                            let ctaLabel = "";
                            if (showCta) {
                                if (acPlan === "free") {
                                    ctaLabel = "שדרג עכשיו";
                                } else if (
                                    isExpired ||
                                    subStatus === "expired"
                                ) {
                                    ctaLabel = "חדש מנוי";
                                } else {
                                    ctaLabel = "הפעל מנוי";
                                }
                            }

                            const providerLabel =
                                provider === "tranzila" ? "Tranzila" : "—";

                            async function handlePayment() {
                                setBillingBusy(true);
                                setBillingMsg("");
                                try {
                                    const res = await createPayment("monthly");
                                    if (
                                        res?.paymentUrl &&
                                        /^https?:\/\//i.test(res.paymentUrl)
                                    ) {
                                        window.location.href = res.paymentUrl;
                                        return;
                                    }
                                    setBillingMsg("תשלום לא זמין בסביבת פיתוח");
                                } catch {
                                    setBillingMsg("לא ניתן להתחיל תשלום כרגע");
                                } finally {
                                    setBillingBusy(false);
                                }
                            }

                            return (
                                <div className={styles.billingBlock}>
                                    <div className={styles.billingTitle}>
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
                                                    תוכנית
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
                                                    סטטוס מנוי
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
                                                    בתוקף עד
                                                </span>
                                                <span
                                                    className={
                                                        styles.billingValue
                                                    }
                                                >
                                                    {expiresAt
                                                        ? formatDate(expiresAt)
                                                        : "—"}
                                                </span>
                                            </div>

                                            <div className={styles.billingRow}>
                                                <span
                                                    className={
                                                        styles.billingLabel
                                                    }
                                                >
                                                    ספק תשלום
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
                                                <div
                                                    className={
                                                        styles.billingActions
                                                    }
                                                >
                                                    <Button
                                                        variant="secondary"
                                                        loading={billingBusy}
                                                        disabled={
                                                            billingBusy ||
                                                            Boolean(
                                                                accountError,
                                                            )
                                                        }
                                                        onClick={handlePayment}
                                                    >
                                                        {ctaLabel}
                                                    </Button>
                                                </div>
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

                                            <div className={styles.billingNote}>
                                                ביטול או שינוי אמצעי תשלום? פנה
                                                לתמיכה: support@cardigo.co.il
                                            </div>
                                            <div className={styles.billingNote}>
                                                היסטוריית תשלומים אינה זמינה
                                                כעת.
                                            </div>
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

                        <form
                            className={styles.pwBlock}
                            onSubmit={handleChangePassword}
                            autoComplete="off"
                        >
                            <div className={styles.pwTitle}>שינוי סיסמה</div>

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
                                }}
                                autoComplete="new-password"
                                disabled={pwSubmitting}
                            />

                            <Input
                                label="אימות סיסמה חדשה"
                                type="password"
                                value={pwConfirm}
                                onChange={(e) => {
                                    setPwConfirm(e.target.value);
                                    setPwConfirmError("");
                                    setPwSuccess("");
                                }}
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

                        <form
                            className={styles.dangerBlock}
                            onSubmit={handleDeleteAccount}
                            autoComplete="off"
                        >
                            <div className={styles.dangerTitle}>
                                מחיקת חשבון
                            </div>

                            <div className={styles.dangerText}>
                                מחיקת החשבון תמחק לצמיתות את הכרטיס האישי,
                                תמונות, לידים ונתוני אנליטיקה.
                            </div>
                            <div className={styles.dangerText}>
                                לא ניתן לשחזר.
                            </div>
                            <div className={styles.dangerText}>
                                לא ניתן החזר כספי אוטומטי על תשלום קיים.
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
                                        .map((o) => o.orgName || o.orgSlug)
                                        .join(", ")}
                                    . העבר ניהול לפני מחיקה.
                                </div>
                            )}

                            {delError && (
                                <div className={styles.dangerError}>
                                    {delError}
                                </div>
                            )}

                            <div className={styles.dangerActions}>
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    loading={delSubmitting}
                                    disabled={
                                        delSubmitting ||
                                        delConfirm.trim() !== "מחיקה" ||
                                        !delPassword.trim()
                                    }
                                >
                                    מחק חשבון
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </Panel>
    );
}
