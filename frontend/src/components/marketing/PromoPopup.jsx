import { useCallback, useEffect, useId, useRef, useState } from "react";
import useFocusTrap from "../../hooks/useFocusTrap";
import { buildSupportWhatsAppHref } from "../../utils/supportContact";
import styles from "./PromoPopup.module.css";

// ── Constants ──────────────────────────────────────────────────────────────────
const PROMO_LS_KEY = "cardigo_promo_popup_v1";
const PROMO_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PROMO_DELAY_MS = 10000; // 10 seconds
const PROMO_CLOSE_COUNTDOWN_SECONDS = 3; // close control stays a countdown for this long
const PROMO_MESSAGE =
    "היי, אשמח לקבל חודש פרימיום מתנה ועזרה בהקמת כרטיס דיגיטלי ב-Cardigo";
const PROMO_HREF = buildSupportWhatsAppHref(PROMO_MESSAGE);
const PROMO_IMAGE_SRC = "/images/promo/promo-free-month-16x9.webp";

// Build-time env flag. Read once at module init — never changes at runtime.
// If absent or not exactly "true", popup is disabled globally.
const IS_PROMO_ENABLED = import.meta.env.VITE_PROMO_POPUP_ENABLED === "true";

// ── localStorage helpers ───────────────────────────────────────────────────────
// Pattern mirrors useGuideDropdownAck.js — intentionally inlined here.

function getSafeLocalStorage() {
    try {
        if (typeof window === "undefined") return null;
        return window.localStorage || null;
    } catch {
        return null;
    }
}

function getDismissedRecord() {
    const ls = getSafeLocalStorage();
    if (!ls) return null;
    try {
        const raw = ls.getItem(PROMO_LS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.dismissedAt === "number") return parsed;
        return null;
    } catch {
        return null;
    }
}

function isWithinCooldown() {
    const record = getDismissedRecord();
    if (!record) return false;
    return Date.now() - record.dismissedAt < PROMO_COOLDOWN_MS;
}

function writeDismissed() {
    const ls = getSafeLocalStorage();
    if (!ls) return;
    try {
        ls.setItem(PROMO_LS_KEY, JSON.stringify({ dismissedAt: Date.now() }));
    } catch {
        // localStorage unavailable — fail silently
    }
}

// ── Component ──────────────────────────────────────────────────────────────────
// Initial render is ALWAYS null — this component is client-only and must
// never appear in SSR/SSG output. visible starts false, timer fires only
// in the browser via useEffect, so hydration is safe.

export default function PromoPopup() {
    const [visible, setVisible] = useState(false);
    const [closeSecondsLeft, setCloseSecondsLeft] = useState(
        PROMO_CLOSE_COUNTDOWN_SECONDS,
    );
    const canCloseByButton = closeSecondsLeft <= 0;
    const titleId = useId();
    const bodyId = useId();
    const dialogRef = useRef(null);
    const closeBtnRef = useRef(null);
    const scrollYRef = useRef(0);

    useFocusTrap(dialogRef, visible);

    // Stable close handler — defined before effects that reference it.
    const handleClose = useCallback(() => {
        writeDismissed();
        setVisible(false);
    }, []);

    // Gated close-button click — no-ops while the countdown is still active.
    // Escape (below) and the CTA are never gated by this.
    const handleCloseButtonClick = useCallback(() => {
        if (!canCloseByButton) return;
        handleClose();
    }, [canCloseByButton, handleClose]);

    // Start delay timer — runs once on mount.
    // Fails closed if: env disabled | localStorage unavailable | within cooldown.
    useEffect(() => {
        if (!IS_PROMO_ENABLED) return;
        const ls = getSafeLocalStorage();
        if (!ls) return; // fail closed — no storage, no popup
        if (isWithinCooldown()) return;

        const timerId = setTimeout(() => setVisible(true), PROMO_DELAY_MS);
        return () => clearTimeout(timerId);
    }, []); // intentionally empty — runs once on mount

    // Close countdown — resets to PROMO_CLOSE_COUNTDOWN_SECONDS whenever the
    // popup becomes visible, then ticks down once per second until 0. Only
    // gates the visible close-button click (handleCloseButtonClick above);
    // Escape and the CTA are never affected. Cleared on hide/unmount.
    useEffect(() => {
        if (!visible) return;
        setCloseSecondsLeft(PROMO_CLOSE_COUNTDOWN_SECONDS);
        const intervalId = setInterval(() => {
            setCloseSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalId);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(intervalId);
    }, [visible]);

    // Focus close button when popup opens.
    useEffect(() => {
        if (!visible) return;
        const t = window.setTimeout(() => {
            closeBtnRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(t);
    }, [visible]);

    // Escape key closes popup.
    useEffect(() => {
        if (!visible) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                handleClose();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [visible, handleClose]);

    // Body scroll lock — iOS-safe body-pinning (mirrors Header.jsx pattern).
    // Cleans up on both close and unmount.
    useEffect(() => {
        if (!visible) return;
        if (typeof document === "undefined") return;
        scrollYRef.current = window.scrollY;
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollYRef.current}px`;
        document.body.style.insetInline = "0";
        return () => {
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.insetInline = "";
            window.scrollTo(0, scrollYRef.current);
        };
    }, [visible]);

    // Always null until client-side timer fires — safe for SSR/SSG.
    if (!IS_PROMO_ENABLED) return null;
    if (!visible) return null;

    return (
        <div className={styles.backdrop}>
            <div
                ref={dialogRef}
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={bodyId}
                dir="rtl"
            >
                {/* Image panel — physical LEFT.
                    .modal { direction: ltr } forces this regardless of document dir="rtl".
                    The image is a portrait (9:16) visual block. */}
                <div className={styles.imagePanel}>
                    <img
                        src={PROMO_IMAGE_SRC}
                        alt="כרטיס ביקור דיגיטלי לעסק עם חודש פרימיום מתנה ב-Cardigo"
                        className={styles.image}
                        loading="lazy"
                        decoding="async"
                    />
                </div>

                {/* Content panel — physical RIGHT */}
                <div className={styles.contentPanel}>
                    {/* Close button: physical top-right of modal using physical props
                        (intentional — this is an always-top-right UI affordance). */}
                    <button
                        ref={closeBtnRef}
                        type="button"
                        className={styles.closeBtn}
                        aria-label="סגירת חלון קידום"
                        aria-disabled={canCloseByButton ? undefined : "true"}
                        onClick={handleCloseButtonClick}
                    >
                        {canCloseByButton ? (
                            "×"
                        ) : (
                            <span aria-live="polite">{closeSecondsLeft}</span>
                        )}
                    </button>
                    <h2 id={titleId} className={styles.title}>
                        <span>חודש פרמיום במתנה!</span>
                        <span aria-hidden="true" className={styles.titleEmoji}>
                            {" "}
                            🎁
                        </span>
                    </h2>

                    <p className={styles.premium}>
                        אנחנו נקים לכם את הכרטיס בחינם וניתן{" "}
                        <span className={styles.premiumHighlight}>
                            חודש פרימיום במתנה!
                        </span>
                    </p>

                    <p id={bodyId} className={styles.body}>
                        אין צורך בכרטיס אשראי.😊 <br />
                        רק ללקוחות חדשים.⭐ <br />
                        שלחו וואטסאפ עכשיו!👋
                    </p>
                    <a
                        href={PROMO_HREF}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.cta}
                        aria-label="לקבלת ההטבה בוואטסאפ"
                    >
                        <span className={styles.ctaIcon} aria-hidden="true" />
                        <span>לקבלת ההטבה</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
