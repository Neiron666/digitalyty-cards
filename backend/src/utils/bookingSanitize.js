import { stripTags } from "./leadSanitize.js";
import { isValidObjectId } from "./orgMembership.util.js";
import { parseIsraelLocalToUtc, APP_TZ, toIsrael } from "./time.util.js";
import {
    CURRENT_PRIVACY_VERSION,
    CURRENT_TERMS_VERSION,
} from "./consentVersions.js";
import { normalizeIlPhone, hashPersonKey } from "./bookingPhone.util.js";

const SLOT_DURATION_MIN = 30;

function assertMinuteGrid(minute) {
    // Booking slots are 30-min grid.
    return minute === 0 || minute === 30;
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

export function buildSlotKey({ startAtUtc } = {}) {
    const d = startAtUtc instanceof Date ? startAtUtc : new Date(startAtUtc);
    if (!Number.isFinite(d.getTime())) throw new Error("Invalid startAtUtc");
    // UTC ISO minutes precision is enough for uniqueness.
    return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

export function sanitizePublicBookingInput(body) {
    const raw = body && typeof body === "object" ? body : {};

    // ── cardId ──
    const cardIdRaw = String(raw.cardId ?? "").trim();
    if (!cardIdRaw || !isValidObjectId(cardIdRaw)) {
        return { error: "INVALID_CARD_ID" };
    }

    // ── honeypot ──
    const hp = raw._xf92 != null ? String(raw._xf92) : "";

    // ── name (required) ──
    const customerName = stripTags(raw.name, { maxLen: 100 });
    if (!customerName) return { error: "NAME_REQUIRED" };

    // ── phone (required) ──
    const customerPhoneRaw = stripTags(raw.phone, { maxLen: 30 });
    const norm = normalizeIlPhone(customerPhoneRaw);
    if (!norm.ok) return { error: norm.error };

    // ── consent (required boolean) ──
    const consentAccepted = raw.consent === true;
    if (!consentAccepted) return { error: "CONSENT_REQUIRED" };

    // ── slot (Israel-local input, converted to UTC) ──
    const date = String(raw.date ?? "").trim();
    const hour = Number(raw.hour);
    const minute = Number(raw.minute);

    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
        return { error: "INVALID_TIME" };
    }
    if (!Number.isInteger(minute) || !assertMinuteGrid(minute)) {
        return { error: "INVALID_TIME" };
    }

    let startAt;
    try {
        startAt = parseIsraelLocalToUtc({ date, hour, minute });
    } catch {
        return { error: "INVALID_TIME" };
    }

    const startIl = toIsrael(startAt);
    const dateKeyIl = startIl.toFormat("yyyy-LL-dd");
    const localStartHHmm = `${pad2(startIl.hour)}:${pad2(startIl.minute)}`;

    // endAt = start + 30m
    const endAt = startIl
        .plus({ minutes: SLOT_DURATION_MIN })
        .toUTC()
        .toJSDate();

    const slotKey = buildSlotKey({ startAtUtc: startAt });

    return {
        cardId: cardIdRaw,
        hp,
        customerName,
        customerPhoneRaw,
        customerPhoneNormalized: norm.normalized,
        dateKeyIl,
        localStartHHmm,
        tz: APP_TZ,
        startAt,
        endAt,
        slotKey,
        consentAccepted,
        consentTermsVersion: CURRENT_TERMS_VERSION,
        consentPrivacyVersion: CURRENT_PRIVACY_VERSION,
    };
}

export function computeBookingTimers({ nowUtc, endAtUtc } = {}) {
    const now = nowUtc instanceof Date ? nowUtc : new Date(nowUtc);
    const endAt = endAtUtc instanceof Date ? endAtUtc : new Date(endAtUtc);

    if (!Number.isFinite(now.getTime())) throw new Error("Invalid nowUtc");
    if (!Number.isFinite(endAt.getTime())) throw new Error("Invalid endAtUtc");

    // Pending expiry: 30 minutes from submission.
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    // Purge: one week after appointment end.
    const purgeAt = new Date(endAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    return { expiresAt, purgeAt };
}

export function buildPersonKey({ cardId, customerPhoneNormalized } = {}) {
    return hashPersonKey({ cardId, phoneNormalized: customerPhoneNormalized });
}
