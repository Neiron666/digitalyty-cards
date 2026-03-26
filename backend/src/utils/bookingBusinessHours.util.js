import { HttpError } from "./httpError.js";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toMinutes(hhmm) {
    if (typeof hhmm !== "string") return null;
    const m = /^([01]\d|2[0-3]):(00|30)$/.exec(hhmm);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
}

function minutesFromLocalHHmm(localHHmm) {
    const m = /^([01]\d|2[0-3]):(00|30)$/.exec(String(localHHmm || ""));
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
}

function assertBookableBusinessHoursShapeOrThrow(bh) {
    if (!bh || typeof bh !== "object" || Array.isArray(bh)) {
        throw new HttpError(400, "Invalid request", "BOOKING_NOT_AVAILABLE");
    }
    if (bh.enabled !== true) {
        throw new HttpError(400, "Invalid request", "BOOKING_NOT_AVAILABLE");
    }

    const week = bh.week && typeof bh.week === "object" ? bh.week : null;
    if (!week) {
        throw new HttpError(400, "Invalid request", "BOOKING_NOT_AVAILABLE");
    }

    // Require at least one meaningful open interval in the week.
    let meaningful = false;
    for (const key of WEEKDAY_KEYS) {
        const day =
            week[key] && typeof week[key] === "object" ? week[key] : null;
        if (!day) continue;
        if (day.open !== true) continue;
        const intervals = Array.isArray(day.intervals) ? day.intervals : [];
        for (const it of intervals) {
            const startM = toMinutes(it?.start);
            const endM = toMinutes(it?.end);
            if (startM === null || endM === null) continue;
            if (startM >= endM) continue;
            meaningful = true;
            break;
        }
        if (meaningful) break;
    }

    if (!meaningful) {
        throw new HttpError(400, "Invalid request", "BOOKING_NOT_AVAILABLE");
    }

    return week;
}

export function assertSlotLegalAgainstBusinessHoursOrThrow({
    businessHours,
    weekdayKey,
    localStartHHmm,
    localEndHHmm,
} = {}) {
    const week = assertBookableBusinessHoursShapeOrThrow(businessHours);

    const dayKey = String(weekdayKey || "");
    if (!WEEKDAY_KEYS.includes(dayKey)) {
        throw new HttpError(400, "Invalid request", "INVALID_SLOT");
    }

    const day =
        week[dayKey] && typeof week[dayKey] === "object" ? week[dayKey] : null;
    if (!day || day.open !== true) {
        throw new HttpError(400, "Invalid request", "INVALID_SLOT");
    }

    const startM = minutesFromLocalHHmm(localStartHHmm);
    const endM = minutesFromLocalHHmm(localEndHHmm);
    if (startM === null || endM === null || startM >= endM) {
        throw new HttpError(400, "Invalid request", "INVALID_SLOT");
    }

    const intervals = Array.isArray(day.intervals) ? day.intervals : [];
    const ok = intervals.some((it) => {
        const s = toMinutes(it?.start);
        const e = toMinutes(it?.end);
        if (s === null || e === null) return false;
        if (s >= e) return false;
        // Require the full slot to be within an interval.
        return startM >= s && endM <= e;
    });

    if (!ok) {
        throw new HttpError(400, "Invalid request", "INVALID_SLOT");
    }
}
