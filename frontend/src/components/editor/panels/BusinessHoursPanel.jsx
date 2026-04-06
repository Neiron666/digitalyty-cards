import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./BusinessHoursPanel.module.css";
import Panel from "./Panel";

const WEEKDAYS = [
    { key: "sun", label: "ראשון" },
    { key: "mon", label: "שני" },
    { key: "tue", label: "שלישי" },
    { key: "wed", label: "רביעי" },
    { key: "thu", label: "חמישי" },
    { key: "fri", label: "שישי" },
    { key: "sat", label: "שבת" },
];

function buildTimeOptions30m() {
    const out = [];
    for (let hh = 0; hh < 24; hh += 1) {
        for (const mm of ["00", "30"]) {
            const label = `${String(hh).padStart(2, "0")}:${mm}`;
            out.push(label);
        }
    }
    return out;
}

function defaultDay() {
    return { open: false, intervals: [] };
}

function defaultWeek() {
    return {
        sun: defaultDay(),
        mon: defaultDay(),
        tue: defaultDay(),
        wed: defaultDay(),
        thu: defaultDay(),
        fri: defaultDay(),
        sat: defaultDay(),
    };
}

function coerceInterval(raw) {
    const start = typeof raw?.start === "string" ? raw.start : "";
    const end = typeof raw?.end === "string" ? raw.end : "";
    return { start, end };
}

function coerceDay(raw) {
    const open = raw?.open === true;
    const intervalsRaw = Array.isArray(raw?.intervals) ? raw.intervals : [];
    const intervals = intervalsRaw.map(coerceInterval).slice(0, 4);
    return { open, intervals };
}

function coerceBusinessHours(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return { v: 1, enabled: false, week: defaultWeek() };
    }

    const enabled = raw.enabled === true;

    const weekRaw = raw.week && typeof raw.week === "object" ? raw.week : null;

    const week = {
        sun: coerceDay(weekRaw?.sun),
        mon: coerceDay(weekRaw?.mon),
        tue: coerceDay(weekRaw?.tue),
        wed: coerceDay(weekRaw?.wed),
        thu: coerceDay(weekRaw?.thu),
        fri: coerceDay(weekRaw?.fri),
        sat: coerceDay(weekRaw?.sat),
    };

    return {
        v: 1,
        enabled,
        week,
    };
}

function toMinutes(hhmm) {
    if (typeof hhmm !== "string") return null;
    const m = /^([01]\d|2[0-3]):(00|30)$/.exec(hhmm);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
}

function isValidInterval(interval) {
    const startM = toMinutes(interval?.start);
    const endM = toMinutes(interval?.end);
    if (startM === null || endM === null) return false;
    return startM < endM;
}

function useOnClickOutside(ref, handler, when = true) {
    useEffect(() => {
        if (!when) return;

        function onPointerDown(e) {
            const el = ref?.current;
            if (!el) return;
            if (el.contains(e.target)) return;
            handler?.(e);
        }

        document.addEventListener("pointerdown", onPointerDown, true);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown, true);
        };
    }, [ref, handler, when]);
}

function TimeListbox({ label, value, options, onChange, disabled, invalid }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const buttonRef = useRef(null);

    useOnClickOutside(
        rootRef,
        () => {
            setOpen(false);
        },
        open,
    );

    useEffect(() => {
        if (!open) return;

        function onKeyDown(e) {
            if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
                buttonRef.current?.focus?.();
            }
        }

        document.addEventListener("keydown", onKeyDown, true);
        return () => document.removeEventListener("keydown", onKeyDown, true);
    }, [open]);

    const selectedLabel =
        typeof value === "string" && value.length ? value : "בחר";

    return (
        <div className={styles.selectWrap} ref={rootRef}>
            <div className={styles.selectLabel}>{label}</div>

            <button
                ref={buttonRef}
                type="button"
                className={styles.pickerBtn}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                data-invalid={invalid ? "1" : "0"}
                onClick={() => setOpen((v) => !v)}
            >
                <span className={styles.pickerValue}>{selectedLabel}</span>
                <span className={styles.pickerChevron} aria-hidden="true" />
            </button>

            {open ? (
                <div className={styles.pickerPopover} role="listbox">
                    <div className={styles.pickerList}>
                        {options.map((t) => {
                            const selected = t === value;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    className={styles.pickerOption}
                                    data-selected={selected ? "1" : "0"}
                                    onClick={() => {
                                        onChange?.(t);
                                        setOpen(false);
                                        buttonRef.current?.focus?.();
                                    }}
                                >
                                    {t}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default function BusinessHoursPanel({
    value,
    disabled,
    onChange,
    bookingSettings,
    canUseBooking,
    onBookingChange,
    entitlements,
}) {
    const bh = useMemo(() => coerceBusinessHours(value), [value]);
    const timeOptions = useMemo(() => buildTimeOptions30m(), []);

    // Defense-in-depth: if entitlements say locked, show premium CTA.
    if (entitlements && !entitlements.canUseBusinessHours) {
        return (
            <Panel title="שעות פעילות">
                <div className={styles.lockedBlock}>
                    <div className={styles.lockedTitle}>שעות פעילות</div>
                    <div className={styles.lockedText}>
                        כדי להשתמש בשעות פעילות צריך מנוי פרימיום.
                    </div>
                    <a href="/pricing" className={styles.lockedCta}>
                        שדרג לפרימיום
                    </a>
                </div>
            </Panel>
        );
    }

    const bookingEnabled =
        bookingSettings != null &&
        typeof bookingSettings === "object" &&
        bookingSettings.enabled === true;

    function commit(next) {
        onChange?.(next);
    }

    function setEnabled(nextEnabled) {
        commit({ ...bh, enabled: nextEnabled === true });
    }

    function setDayOpen(dayKey, nextOpen) {
        const nextWeek = {
            ...bh.week,
            [dayKey]: { ...bh.week[dayKey], open: nextOpen === true },
        };
        // If closing a day, keep intervals as-is (owner might re-open later).
        commit({ ...bh, week: nextWeek });
    }

    function setIntervalField(dayKey, index, field, nextValue) {
        const day = bh.week[dayKey] || defaultDay();
        const nextIntervals = (
            Array.isArray(day.intervals) ? day.intervals : []
        ).slice();
        const prev = nextIntervals[index] || { start: "", end: "" };
        nextIntervals[index] = { ...prev, [field]: String(nextValue || "") };

        const nextDay = { ...day, intervals: nextIntervals.slice(0, 4) };
        const nextWeek = { ...bh.week, [dayKey]: nextDay };
        commit({ ...bh, week: nextWeek });
    }

    function addInterval(dayKey) {
        const day = bh.week[dayKey] || defaultDay();
        const intervals = Array.isArray(day.intervals) ? day.intervals : [];
        if (intervals.length >= 4) return;

        const nextIntervals = intervals
            .concat([{ start: "09:00", end: "17:00" }])
            .slice(0, 4);
        const nextDay = { ...day, intervals: nextIntervals };
        const nextWeek = { ...bh.week, [dayKey]: nextDay };
        commit({ ...bh, week: nextWeek });
    }

    function removeInterval(dayKey, index) {
        const day = bh.week[dayKey] || defaultDay();
        const intervals = Array.isArray(day.intervals) ? day.intervals : [];
        const nextIntervals = intervals.filter((_, i) => i !== index);
        const nextDay = { ...day, intervals: nextIntervals };
        const nextWeek = { ...bh.week, [dayKey]: nextDay };
        commit({ ...bh, week: nextWeek });
    }

    return (
        <Panel title="שעות פעילות וזימון תורים">
            <div className={styles.root} dir="rtl">
                {/* ── Booking section (elevated, first) ── */}
                {canUseBooking ? (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>הזמנת תורים</h3>
                        <div className={styles.headerRow}>
                            <label className={styles.switch}>
                                <input
                                    type="checkbox"
                                    checked={bookingEnabled}
                                    onChange={(e) =>
                                        onBookingChange?.({
                                            enabled: e.target.checked,
                                        })
                                    }
                                    disabled={disabled}
                                />
                                <span className={styles.switchLabel}>
                                    אפשר הזמנת תורים
                                </span>
                            </label>
                        </div>
                        <div className={styles.hint}>
                            כאשר מופעל, לקוחות יוכלו לשלוח בקשות לתורים דרך
                            הכרטיס.
                        </div>
                    </div>
                ) : (
                    <div className={styles.lockedBlock}>
                        <div className={styles.lockedTitle}>הזמנת תורים</div>
                        <div className={styles.lockedText}>
                            הזמנת תורים זמינה במסלול בתשלום בלבד.
                        </div>
                    </div>
                )}

                {/* ── Business hours section ── */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>שעות פעילות</h3>

                    <div className={styles.headerRow}>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={bh.enabled === true}
                                onChange={(e) => setEnabled(e.target.checked)}
                                disabled={disabled}
                            />
                            <span className={styles.switchLabel}>
                                הצג בכרטיס
                            </span>
                        </label>
                    </div>

                    <div className={styles.hint}>
                        השעות יוצגו בכרטיס רק אם הסעיף פעיל ומוגדרות שעות
                        פעילות.
                    </div>

                    {WEEKDAYS.map((d) => {
                        const day = bh.week?.[d.key] || defaultDay();
                        const isOpen = day.open === true;
                        const intervals = Array.isArray(day.intervals)
                            ? day.intervals
                            : [];

                        return (
                            <div key={d.key} className={styles.dayCard}>
                                <div className={styles.dayRow}>
                                    <div className={styles.dayLabel}>
                                        {d.label}
                                    </div>
                                    <label className={styles.openToggle}>
                                        <input
                                            type="checkbox"
                                            checked={isOpen}
                                            onChange={(e) =>
                                                setDayOpen(
                                                    d.key,
                                                    e.target.checked,
                                                )
                                            }
                                            disabled={
                                                disabled || bh.enabled !== true
                                            }
                                        />
                                        <span
                                            className={styles.openToggleLabel}
                                        >
                                            {isOpen ? "פתוח" : "סגור"}
                                        </span>
                                    </label>

                                    <button
                                        type="button"
                                        className={styles.addBtn}
                                        onClick={() => addInterval(d.key)}
                                        disabled={
                                            disabled ||
                                            bh.enabled !== true ||
                                            !isOpen ||
                                            intervals.length >= 4
                                        }
                                    >
                                        הוסף טווח
                                    </button>
                                </div>

                                {bh.enabled === true &&
                                isOpen &&
                                intervals.length ? (
                                    <div className={styles.intervals}>
                                        {intervals.map((it, idx) => {
                                            const ok = isValidInterval(it);
                                            return (
                                                <div
                                                    key={`${d.key}-${idx}`}
                                                    className={
                                                        styles.intervalRow
                                                    }
                                                    data-invalid={
                                                        ok ? "0" : "1"
                                                    }
                                                >
                                                    <TimeListbox
                                                        label="התחלה"
                                                        value={
                                                            typeof it.start ===
                                                            "string"
                                                                ? it.start
                                                                : ""
                                                        }
                                                        options={timeOptions}
                                                        disabled={
                                                            disabled ||
                                                            bh.enabled !==
                                                                true ||
                                                            !isOpen
                                                        }
                                                        invalid={!ok}
                                                        onChange={(next) =>
                                                            setIntervalField(
                                                                d.key,
                                                                idx,
                                                                "start",
                                                                next,
                                                            )
                                                        }
                                                    />

                                                    <TimeListbox
                                                        label="סיום"
                                                        value={
                                                            typeof it.end ===
                                                            "string"
                                                                ? it.end
                                                                : ""
                                                        }
                                                        options={timeOptions}
                                                        disabled={
                                                            disabled ||
                                                            bh.enabled !==
                                                                true ||
                                                            !isOpen
                                                        }
                                                        invalid={!ok}
                                                        onChange={(next) =>
                                                            setIntervalField(
                                                                d.key,
                                                                idx,
                                                                "end",
                                                                next,
                                                            )
                                                        }
                                                    />

                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.removeBtn
                                                        }
                                                        onClick={() =>
                                                            removeInterval(
                                                                d.key,
                                                                idx,
                                                            )
                                                        }
                                                        disabled={disabled}
                                                    >
                                                        הסר
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : bh.enabled === true && isOpen ? (
                                    <div className={styles.emptyDayHint}>
                                        אין טווחים. הוסיפו טווח כדי להציג
                                        בכרטיס.
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Panel>
    );
}
