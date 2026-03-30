import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    getPublicAvailability,
    createPublicBooking,
} from "../../../services/bookings.service";
import { trackClick } from "../../../services/analytics.client";
import Section from "./Section";
import Notice from "../../ui/Notice/Notice";
import styles from "./BookingSection.module.css";

const WEEKDAY_HEADERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

const WEEKDAY_LABELS = {
    sun: "ראשון",
    mon: "שני",
    tue: "שלישי",
    wed: "רביעי",
    thu: "חמישי",
    fri: "שישי",
    sat: "שבת",
};

const MONTH_LABELS = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
];

function formatDateShort(dateKeyIl) {
    const [, m, d] = (dateKeyIl || "").split("-");
    if (!m || !d) return "";
    return `${d}/${m}`;
}

function parseSlotTime(timeStr) {
    const m = /^(\d{2}):(\d{2})$/.exec(timeStr || "");
    if (!m) return null;
    return { hour: Number(m[1]), minute: Number(m[2]) };
}

/**
 * Derive the distinct months (in order) present in the backend days array.
 * Returns an array of { key: "YYYY-MM", year, month } objects.
 */
function deriveMonths(days) {
    if (!days || days.length === 0) return [];
    const seen = new Set();
    const months = [];
    for (const d of days) {
        const key = d.dateKeyIl.slice(0, 7); // "YYYY-MM"
        if (!seen.has(key)) {
            seen.add(key);
            const [y, m] = d.dateKeyIl.split("-");
            months.push({ key, year: Number(y), month: Number(m) });
        }
    }
    return months;
}

/**
 * Build a strict single-month grid for the given year+month.
 * Only days present in the backend days array influence cell state.
 * Days in the month not present in the backend array render as "outside".
 * No overflow into adjacent months — one month at a time only.
 */
function buildStrictMonthGrid(days, year, month) {
    if (!days || !year || !month) return null;

    const dayMap = new Map();
    for (const d of days) dayMap.set(d.dateKeyIl, d);

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const title = `${MONTH_LABELS[month - 1]} ${year}`;

    const rows = [];
    let currentRow = [];

    // Leading blanks
    for (let b = 0; b < firstWeekday; b++) {
        currentRow.push({ type: "empty" });
    }

    // All days in this month — no overflow into adjacent months
    for (let day = 1; day <= daysInMonth; day++) {
        const mm = String(month).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        const dateKey = `${year}-${mm}-${dd}`;
        const backend = dayMap.get(dateKey);

        let cellType;
        if (backend?.isBookable) cellType = "available";
        else if (backend) cellType = "inWindowUnavailable";
        else cellType = "outside";

        currentRow.push({ type: cellType, day, dateKey });
        if (currentRow.length === 7) {
            rows.push(currentRow);
            currentRow = [];
        }
    }

    // Trailing blanks to complete last row
    if (currentRow.length > 0) {
        while (currentRow.length < 7) {
            currentRow.push({ type: "empty" });
        }
        rows.push(currentRow);
    }

    return { title, rows };
}

export default function BookingSection({ card }) {
    // ── Trio gate ──
    const canUseBooking =
        card?.entitlements?.canUseBooking === true &&
        card?.bookingSettings?.enabled === true &&
        card?.businessHours?.enabled === true;

    if (!canUseBooking) return null;

    const cardId = card?._id;
    const slug = card?.slug;

    // ── State ──
    const [days, setDays] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [selectedDateKey, setSelectedDateKey] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [activeMonthKey, setActiveMonthKey] = useState(null);

    const [form, setForm] = useState({
        name: "",
        phone: "",
        _xf92: "",
        consent: false,
    });
    const [submitStatus, setSubmitStatus] = useState("idle");
    const [submitError, setSubmitError] = useState("");

    const autoResetRef = useRef(null);

    // ── Fetch availability ──
    const fetchAvailability = useCallback(async () => {
        if (!cardId) return;
        setDays(null);
        setLoadError("");
        setSelectedDateKey(null);
        setSelectedSlot(null);
        setSubmitStatus("idle");
        setSubmitError("");
        try {
            const data = await getPublicAvailability(cardId, { days: 14 });
            setDays(Array.isArray(data?.days) ? data.days : []);
        } catch (err) {
            const code = err.response?.data?.code;
            if (code === "BOOKING_NOT_AVAILABLE") {
                setLoadError("הזמנת תורים לא פעילה כרגע.");
            } else if (code === "FEATURE_NOT_AVAILABLE") {
                setLoadError("");
                setDays([]);
            } else if (err.response?.status === 429) {
                setLoadError("יותר מדי ניסיונות, נסו שוב מאוחר יותר.");
            } else {
                setLoadError("לא ניתן לטעון זמינות כרגע.");
            }
        }
    }, [cardId]);

    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

    // ── Auto-reset success ──
    useEffect(() => {
        if (submitStatus !== "success") return;
        autoResetRef.current = setTimeout(() => {
            setSubmitStatus("idle");
            setSelectedSlot(null);
            setSelectedDateKey(null);
        }, 12_000);
        return () => clearTimeout(autoResetRef.current);
    }, [submitStatus]);

    // ── Slot selection helpers ──
    const selectedDay =
        days && selectedDateKey
            ? days.find((d) => d.dateKeyIl === selectedDateKey) || null
            : null;
    const availableSlots = selectedDay?.slots?.filter((s) => s.available) || [];

    // ── Derived months present in the 14-day window ──
    const monthList = useMemo(() => deriveMonths(days), [days]);

    // ── Sync active month when fetch completes or resets ──
    useEffect(() => {
        setActiveMonthKey(monthList.length > 0 ? monthList[0].key : null);
    }, [monthList]);

    // ── Active month data + calendar grid (strict single-month) ──
    const activeMonthData = useMemo(
        () =>
            activeMonthKey
                ? (monthList.find((m) => m.key === activeMonthKey) ?? null)
                : null,
        [activeMonthKey, monthList],
    );

    const calendarGrid = useMemo(
        () =>
            activeMonthData
                ? buildStrictMonthGrid(
                      days,
                      activeMonthData.year,
                      activeMonthData.month,
                  )
                : null,
        [days, activeMonthData],
    );

    // ── Month navigation (local, between months present in the window) ──
    const activeMonthIndex = activeMonthKey
        ? monthList.findIndex((m) => m.key === activeMonthKey)
        : -1;

    function handlePrevMonth() {
        if (activeMonthIndex <= 0) return;
        const prev = monthList[activeMonthIndex - 1];
        setActiveMonthKey(prev.key);
        if (selectedDateKey && selectedDateKey.slice(0, 7) !== prev.key) {
            setSelectedDateKey(null);
            setSelectedSlot(null);
        }
    }

    function handleNextMonth() {
        if (activeMonthIndex >= monthList.length - 1) return;
        const next = monthList[activeMonthIndex + 1];
        setActiveMonthKey(next.key);
        if (selectedDateKey && selectedDateKey.slice(0, 7) !== next.key) {
            setSelectedDateKey(null);
            setSelectedSlot(null);
        }
    }

    function handleDaySelect(dateKey) {
        const day = days?.find((d) => d.dateKeyIl === dateKey);
        if (!day || !day.isBookable) return;
        setSelectedDateKey(dateKey);
        setSelectedSlot(null);
        setSubmitStatus("idle");
        setSubmitError("");
    }

    function handleSlotSelect(timeStr) {
        setSelectedSlot(timeStr);
        setSubmitStatus("idle");
        setSubmitError("");
    }

    function updateField(field, value) {
        if (submitStatus === "error") {
            setSubmitStatus("idle");
            setSubmitError("");
        }
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    // ── Submit ──
    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.consent) {
            setSubmitError("חובה להסכים למדיניות הפרטיות ולתנאי השימוש");
            setSubmitStatus("error");
            return;
        }

        if (!selectedDay || !selectedSlot) return;

        const parsed = parseSlotTime(selectedSlot);
        if (!parsed) return;

        setSubmitStatus("submitting");

        trackClick(slug, "booking");

        try {
            await createPublicBooking({
                cardId,
                name: form.name,
                phone: form.phone,
                consent: form.consent,
                date: selectedDay.dateKeyIl,
                hour: parsed.hour,
                minute: parsed.minute,
                _xf92: form._xf92,
            });
            setSubmitStatus("success");
            setForm({ name: "", phone: "", _xf92: "", consent: false });
        } catch (err) {
            const httpStatus = err.response?.status;
            const code = err.response?.data?.code;
            let msg;

            if (code === "SLOT_TAKEN") {
                msg = "המועד כבר לא פנוי. טוענים מחדש…";
                setSubmitStatus("error");
                setSubmitError(msg);
                // Reload availability from backend truth
                setTimeout(() => fetchAvailability(), 1200);
                return;
            }
            if (code === "PERSON_REPEAT_BLOCKED") {
                msg =
                    "כבר קיימת בקשת תיאום פעילה עבור כרטיס זה. בעל העסק ייצור קשר.";
            } else if (httpStatus === 429) {
                msg = "יותר מדי ניסיונות, נסו שוב מאוחר יותר.";
            } else if (httpStatus === 403) {
                msg = "שירות לא זמין כרגע.";
            } else if (httpStatus === 404) {
                msg = "הכרטיס לא נמצא או לא פעיל.";
            } else if (httpStatus === 400) {
                msg = "אנא בדקו את הפרטים ונסו שנית.";
            } else {
                msg = "שגיאה בשליחת הבקשה, נסו שוב מאוחר יותר.";
            }

            setSubmitError(msg);
            setSubmitStatus("error");
        }
    }

    // ── Loading state ──
    if (days === null && !loadError) {
        return (
            <Section title="קביעת תור" contentClassName={styles.content}>
                <div className={styles.loading}>טוען זמינות…</div>
            </Section>
        );
    }

    // ── Load error ──
    if (loadError) {
        return (
            <Section title="קביעת תור" contentClassName={styles.content}>
                <Notice variant="error">{loadError}</Notice>
            </Section>
        );
    }

    // ── No bookable days at all ──
    if (!days || days.length === 0) return null;

    // ── Success state ──
    if (submitStatus === "success") {
        return (
            <Section title="קביעת תור" contentClassName={styles.content}>
                <Notice variant="success">
                    בקשת התיאום התקבלה! בעל העסק ייצור איתך קשר לאישור המועד.
                </Notice>
            </Section>
        );
    }

    return (
        <Section title="קביעת תור" contentClassName={styles.content}>
            <p className={styles.intro}>
                בחרו יום ושעה מתאימים, ובעל העסק ייצור איתכם קשר לאישור.
            </p>

            {/* ── Month-view calendar (strict single-month, local navigation) ── */}
            {calendarGrid && (
                <div className={styles.calBlock}>
                    {/* Month navigation row — prev/next only between months in the window */}
                    <div className={styles.calNav}>
                        {/* In RTL: ‹ is first DOM child → visual RIGHT → previous month */}
                        <button
                            type="button"
                            className={styles.calNavBtn}
                            aria-label="חודש קודם"
                            onClick={handlePrevMonth}
                            disabled={activeMonthIndex <= 0}
                        >
                            ‹
                        </button>
                        <span className={styles.calNavTitle}>
                            {calendarGrid.title}
                        </span>
                        {/* In RTL: › is last DOM child → visual LEFT → next month */}
                        <button
                            type="button"
                            className={styles.calNavBtn}
                            aria-label="חודש הבא"
                            onClick={handleNextMonth}
                            disabled={activeMonthIndex >= monthList.length - 1}
                        >
                            ›
                        </button>
                    </div>

                    {/* Weekday headers */}
                    <div className={styles.calRow}>
                        {WEEKDAY_HEADERS.map((h) => (
                            <span key={h} className={styles.calHeaderCell}>
                                {h}
                            </span>
                        ))}
                    </div>

                    {/* Day rows */}
                    {calendarGrid.rows.map((row, ri) => (
                        <div key={ri} className={styles.calRow}>
                            {row.map((cell, ci) => {
                                if (cell.type === "empty") {
                                    return (
                                        <span
                                            key={`e${ci}`}
                                            className={styles.calCell}
                                        />
                                    );
                                }

                                const isSelected =
                                    selectedDateKey === cell.dateKey;
                                const isAvailable = cell.type === "available";

                                const cls = [
                                    styles.calCell,
                                    cell.type === "outside"
                                        ? styles.calCellOutside
                                        : "",
                                    cell.type === "inWindowUnavailable"
                                        ? styles.calCellInWindowUnavail
                                        : "",
                                    isAvailable ? styles.calCellAvailable : "",
                                    isSelected ? styles.calCellSelected : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ");

                                if (isAvailable) {
                                    return (
                                        <button
                                            key={cell.dateKey}
                                            type="button"
                                            className={cls}
                                            aria-label={`${cell.day}`}
                                            aria-pressed={isSelected}
                                            onClick={() =>
                                                handleDaySelect(cell.dateKey)
                                            }
                                        >
                                            {cell.day}
                                        </button>
                                    );
                                }

                                return (
                                    <span
                                        key={cell.dateKey}
                                        className={cls}
                                        aria-hidden="true"
                                    >
                                        {cell.day}
                                    </span>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Slot picker (hidden once a slot is chosen → form replaces it) ── */}
            {selectedDay && !selectedSlot && (
                <div className={styles.slotArea}>
                    <button
                        type="button"
                        className={styles.dismissBtn}
                        aria-label="ביטול בחירת יום"
                        onClick={() => setSelectedDateKey(null)}
                    >
                        ×
                    </button>
                    <div className={styles.slotHeader}>
                        {WEEKDAY_LABELS[selectedDay.weekdayKey] ||
                            selectedDay.weekdayKey}{" "}
                        {formatDateShort(selectedDay.dateKeyIl)} — בחרו שעה
                    </div>
                    {availableSlots.length > 0 ? (
                        <div
                            className={styles.slotList}
                            role="listbox"
                            aria-label="בחירת שעה"
                        >
                            {availableSlots.map((slot) => {
                                const isSelected = selectedSlot === slot.time;
                                const cls = [
                                    styles.slotBtn,
                                    isSelected ? styles.slotBtnSelected : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ");
                                return (
                                    <button
                                        key={slot.time}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        className={cls}
                                        onClick={() =>
                                            handleSlotSelect(slot.time)
                                        }
                                    >
                                        {slot.time}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.noSlots}>
                            אין מועדים פנויים ביום זה.
                        </div>
                    )}
                </div>
            )}

            {/* ── Form (visible only after slot selection) ── */}
            {selectedSlot && selectedDay && (
                <>
                    <div className={styles.selectedSummary}>
                        <button
                            type="button"
                            className={styles.dismissBtn}
                            aria-label="חזרה לבחירת שעה"
                            onClick={() => setSelectedSlot(null)}
                        >
                            ×
                        </button>
                        {WEEKDAY_LABELS[selectedDay.weekdayKey] ||
                            selectedDay.weekdayKey}{" "}
                        {formatDateShort(selectedDay.dateKeyIl)} בשעה{" "}
                        {selectedSlot}
                    </div>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="שם מלא"
                            value={form.name}
                            required
                            maxLength={100}
                            onChange={(e) =>
                                updateField("name", e.target.value)
                            }
                        />

                        <input
                            type="tel"
                            placeholder="טלפון"
                            value={form.phone}
                            required
                            maxLength={20}
                            onChange={(e) =>
                                updateField("phone", e.target.value)
                            }
                        />

                        {/* Honeypot */}
                        <input
                            name="_xf92"
                            value={form._xf92}
                            onChange={(e) =>
                                updateField("_xf92", e.target.value)
                            }
                            className={styles.hp}
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                        />

                        <label className={styles.consentRow}>
                            <input
                                type="checkbox"
                                checked={form.consent}
                                onChange={(e) =>
                                    updateField("consent", e.target.checked)
                                }
                                required
                            />
                            <span className={styles.consentText}>
                                אני מסכים/ה ל
                                <a
                                    href="/privacy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    מדיניות הפרטיות
                                </a>{" "}
                                ול
                                <a
                                    href="/terms"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    תנאי השימוש
                                </a>
                            </span>
                        </label>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={submitStatus === "submitting"}
                        >
                            {submitStatus === "submitting"
                                ? "שולח…"
                                : "שליחת בקשה"}
                        </button>

                        {submitStatus === "error" && submitError && (
                            <Notice variant="error">{submitError}</Notice>
                        )}
                    </form>
                </>
            )}
        </Section>
    );
}
