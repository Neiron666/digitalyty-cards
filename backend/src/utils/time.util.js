import { DateTime } from "luxon";

export const APP_TZ = process.env.APP_TZ || "Asia/Jerusalem";

export function nowUtc() {
    return new Date();
}

export function toIsrael(date) {
    const d = date instanceof Date ? date : new Date(date);
    return DateTime.fromJSDate(d, { zone: "utc" }).setZone(APP_TZ);
}

export function formatIsrael(date) {
    if (!date) return "";

    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return "";

    return toIsrael(d).toFormat("yyyy-LL-dd HH:mm");
}

function assertDateKey(value) {
    const date = typeof value === "string" ? value : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error("date must be YYYY-MM-DD");
    }

    const dt = DateTime.fromISO(date, { zone: APP_TZ });
    if (!dt.isValid) throw new Error("Invalid date");

    // Extra strictness: ensure Luxon round-trips to same key.
    if (dt.toFormat("yyyy-LL-dd") !== date) {
        throw new Error("Invalid date");
    }

    return dt;
}

function assertIntInRange(name, value, { min, max }) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) {
        throw new Error(`${name} must be ${min}..${max}`);
    }
    return n;
}

export function parseIsraelLocalToUtc({ date, hour, minute } = {}) {
    const base = assertDateKey(date);
    const h = assertIntInRange("hour", hour, { min: 0, max: 23 });
    const m = assertIntInRange("minute", minute, { min: 0, max: 55 });

    const allowed = m % 5 === 0;
    if (!allowed) {
        throw new Error("minute must be in 5-minute steps (0..55)");
    }

    const il = base.set({
        hour: h,
        minute: m,
        second: 0,
        millisecond: 0,
    });

    if (!il.isValid) throw new Error("Invalid local datetime");

    return il.toUTC().toJSDate();
}

export function endOfIsraelDayUtc(dateKey) {
    const base = assertDateKey(dateKey);
    const il = base.set({
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999,
    });

    return il.toUTC().toJSDate();
}

export function addIsraelDaysFromNow(nowDateUtc, days) {
    const d = nowDateUtc instanceof Date ? nowDateUtc : new Date(nowDateUtc);
    if (!Number.isFinite(d.getTime())) {
        throw new Error("nowDateUtc must be a valid Date");
    }

    const n = assertIntInRange("days", days, { min: 0, max: 10_000 });

    const il = toIsrael(d).startOf("day").plus({ days: n });
    return il.toFormat("yyyy-LL-dd");
}
