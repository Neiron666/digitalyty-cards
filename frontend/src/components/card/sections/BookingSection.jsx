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
 * Build a single month-view grid from backend days[].
 * Primary month comes from the first backend day.
 * If the 7-day window overflows into the next month, those cells are
 * appended after the primary month's last day (adjacent-month overflow).
 */
function buildCalendarGrid(days) {
    if (!days || days.length === 0) return null;

    const dayMap = new Map();
    for (const d of days) dayMap.set(d.dateKeyIl, d);

    const [py, pm] = days[0].dateKeyIl.split("-");
    const primaryYear = Number(py);
    const primaryMonth = Number(pm);

    const daysInPrimary = new Date(primaryYear, primaryMonth, 0).getDate();
    const firstWeekday = new Date(primaryYear, primaryMonth - 1, 1).getDay();

    // Detect overflow into next month
    const lastDay = days[days.length - 1];
    const [ly, lm] = lastDay.dateKeyIl.split("-");
    const lastYear = Number(ly);
    const lastMonth = Number(lm);
    const hasOverflow = lastYear !== primaryYear || lastMonth !== primaryMonth;

    let title = `${MONTH_LABELS[primaryMonth - 1]} ${primaryYear}`;
    if (hasOverflow) {
        title += ` – ${MONTH_LABELS[lastMonth - 1]}`;
        if (lastYear !== primaryYear) title += ` ${lastYear}`;
    }

    const rows = [];
    let currentRow = [];

    // Leading blanks
    for (let b = 0; b < firstWeekday; b++) {
        currentRow.push({ type: "empty" });
    }

    // Primary-month cells
    for (let day = 1; day <= daysInPrimary; day++) {
        const mm = String(primaryMonth).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        const dateKey = `${primaryYear}-${mm}-${dd}`;
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

    // Adjacent-month overflow cells
    if (hasOverflow) {
        const overflowDays = days.filter((d) => {
            const [y, m] = d.dateKeyIl.split("-");
            return Number(y) !== primaryYear || Number(m) !== primaryMonth;
        });
        for (const od of overflowDays) {
            const dayNum = Number(od.dateKeyIl.split("-")[2]);
            const cellType = od.isBookable
                ? "available"
                : "inWindowUnavailable";
            currentRow.push({
                type: cellType,
                day: dayNum,
                dateKey: od.dateKeyIl,
            });
            if (currentRow.length === 7) {
                rows.push(currentRow);
                currentRow = [];
            }
        }
    }

    // Trailing blanks
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

    const [form, setForm] = useState({
        name: "",
        phone: "",
        website: "",
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
            const data = await getPublicAvailability(cardId, { days: 7 });
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

    // ── Calendar grid (single block) ──
    const calendarGrid = useMemo(() => buildCalendarGrid(days), [days]);

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
                website: form.website,
            });
            setSubmitStatus("success");
            setForm({ name: "", phone: "", website: "", consent: false });
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
                // Honeypot / bot — silent-ish
                setSubmitStatus("success");
                return;
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

            {/* ── Month-view calendar ── */}
            {calendarGrid && (
                <div className={styles.calBlock}>
                    <div className={styles.calTitle}>{calendarGrid.title}</div>

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
                            name="website"
                            value={form.website}
                            onChange={(e) =>
                                updateField("website", e.target.value)
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
