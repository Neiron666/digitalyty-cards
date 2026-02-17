import { useMemo } from "react";
import styles from "./SelfThemePanel.module.css";

function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}

function expandHex3(hex) {
    const h = hex.replace("#", "");
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
}

function normalizeHex(input) {
    if (typeof input !== "string") return null;
    const raw = input.trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();

    if (/^#[0-9a-f]{6}$/.test(lower)) return lower;
    if (/^#[0-9a-f]{3}$/.test(lower)) return expandHex3(lower).toLowerCase();

    return null;
}

function hexToRgb(hex) {
    const n = normalizeHex(hex);
    if (!n) return null;
    const h = n.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b };
}

function relativeLuminance({ r, g, b }) {
    const srgb = [r, g, b].map((v) => v / 255);
    const lin = srgb.map((c) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
    );
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastRatio(hexA, hexB) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    if (!a || !b) return null;

    const l1 = relativeLuminance(a);
    const l2 = relativeLuminance(b);
    const bright = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return (bright + 0.05) / (dark + 0.05);
}

function pickBestOnPrimary(primaryHex) {
    const black = "#000000";
    const white = "#ffffff";

    const cBlack = contrastRatio(primaryHex, black);
    const cWhite = contrastRatio(primaryHex, white);

    if (cBlack === null && cWhite === null) return white;
    if (cBlack === null) return white;
    if (cWhite === null) return black;

    return cBlack >= cWhite ? black : white;
}

function ColorRow({ id, label, hint, value, disabled, onChange, ariaLabel }) {
    const normalized = normalizeHex(value) || "#000000";

    return (
        <div className={styles.row}>
            <div className={styles.meta}>
                <p className={styles.label}>{label}</p>
                <p className={styles.hint}>{hint}</p>
            </div>
            <div className={styles.controls}>
                <input
                    id={id}
                    className={styles.colorInput}
                    type="color"
                    value={normalized}
                    disabled={disabled}
                    aria-label={ariaLabel}
                    onChange={(e) => onChange(e.target.value)}
                />
                <div className={styles.hex}>{normalized.toUpperCase()}</div>
            </div>
        </div>
    );
}

export default function SelfThemePanel({
    card,
    plan,
    selfThemeAllowed,
    disabled,
    onFieldChange,
}) {
    const selfTheme =
        card?.design && typeof card.design === "object"
            ? card.design.selfThemeV1
            : null;

    const bg = normalizeHex(selfTheme?.bg) || "#FFFFFF";
    const text = normalizeHex(selfTheme?.text) || "#1A1A1A";
    const primary = normalizeHex(selfTheme?.primary) || "#A9863E";
    const secondary = normalizeHex(selfTheme?.secondary) || "#C18AA8";
    const onPrimary = normalizeHex(selfTheme?.onPrimary) || "#FFFFFF";

    const isLocked = !Boolean(selfThemeAllowed);
    const controlsDisabled = Boolean(disabled) || isLocked;

    const contrastTextBg = useMemo(() => contrastRatio(text, bg), [text, bg]);
    const contrastOnPrimary = useMemo(
        () => contrastRatio(onPrimary, primary),
        [onPrimary, primary],
    );

    const passTextBg = (contrastTextBg || 0) >= 4.5;
    const passOnPrimary = (contrastOnPrimary || 0) >= 4.5;

    function write(path, value) {
        if (!selfThemeAllowed) return;
        onFieldChange?.(path, value);
    }

    function writeSelfTheme(path, value) {
        if (!selfThemeAllowed) return;
        if (disabled) return;
        write(path, value);
        write("design.selfThemeV1.version", 1);
    }

    return (
        <div className={styles.root} dir="rtl">
            {isLocked ? (
                <div className={styles.notice}>
                    <p className={styles.title}>עיצוב עצמי</p>
                    <p className={styles.text}>זמין במסלול פרימיום.</p>
                </div>
            ) : null}

            <div className={styles.grid}>
                <ColorRow
                    id="selftheme-bg"
                    label="רקע"
                    hint="משפיע על הרקע הראשי של הכרטיס"
                    value={bg}
                    disabled={controlsDisabled}
                    ariaLabel="בחר צבע רקע"
                    onChange={(v) => writeSelfTheme("design.selfThemeV1.bg", v)}
                />
                <ColorRow
                    id="selftheme-text"
                    label="טקסט"
                    hint="משפיע על צבע הטקסט המרכזי"
                    value={text}
                    disabled={controlsDisabled}
                    ariaLabel="בחר צבע טקסט"
                    onChange={(v) =>
                        writeSelfTheme("design.selfThemeV1.text", v)
                    }
                />
                <ColorRow
                    id="selftheme-primary"
                    label="צבע ראשי"
                    hint="משפיע על כפתורים ואלמנטים בולטים"
                    value={primary}
                    disabled={controlsDisabled}
                    ariaLabel="בחר צבע ראשי"
                    onChange={(v) =>
                        writeSelfTheme("design.selfThemeV1.primary", v)
                    }
                />
                <ColorRow
                    id="selftheme-secondary"
                    label="צבע משני"
                    hint="משפיע על דגשים משניים"
                    value={secondary}
                    disabled={controlsDisabled}
                    ariaLabel="בחר צבע משני"
                    onChange={(v) =>
                        writeSelfTheme("design.selfThemeV1.secondary", v)
                    }
                />
                <ColorRow
                    id="selftheme-onprimary"
                    label="טקסט על כפתורים"
                    hint="משפיע על צבע הטקסט על הכפתורים"
                    value={onPrimary}
                    disabled={controlsDisabled}
                    ariaLabel="בחר צבע טקסט על כפתורים"
                    onChange={(v) =>
                        writeSelfTheme("design.selfThemeV1.onPrimary", v)
                    }
                />
            </div>

            <button
                type="button"
                className={styles.fixButton}
                disabled={controlsDisabled}
                onClick={() => {
                    if (!selfThemeAllowed) return;
                    if (disabled) return;
                    onFieldChange?.("design.selfThemeV1", null);
                }}
            >
                איפוס
            </button>

            {/* <div className={styles.status}>
                <div className={styles.statusRow}>
                    <div>ניגודיות טקסט מול רקע</div>
                    <div
                        className={`${styles.badge} ${
                            passTextBg ? "" : styles.badgeFail
                        }`}
                    >
                        {passTextBg ? "עבר" : "נכשל"}
                    </div>
                </div>
                <div className={styles.statusRow}>
                    <div>ניגודיות טקסט על כפתורים</div>
                    <div
                        className={`${styles.badge} ${
                            passOnPrimary ? "" : styles.badgeFail
                        }`}
                    >
                        {passOnPrimary ? "עבר" : "נכשל"}
                    </div>
                </div>

                {!passOnPrimary ? (
                    <button
                        type="button"
                        className={styles.fixButton}
                        disabled={controlsDisabled}
                        onClick={() => {
                            const best = pickBestOnPrimary(primary);
                            writeSelfTheme(
                                "design.selfThemeV1.onPrimary",
                                best,
                            );
                        }}
                    >
                        תקן ניגודיות
                    </button>
                ) : null}
            </div> */}
        </div>
    );
}
