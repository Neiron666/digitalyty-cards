/**
 * Booking horizon — backend SSoT.
 *
 * Centralises allowed values / default / max and resolution logic so
 * Card.model.js, card.controller.js, and booking.controller.js never drift.
 *
 * No imports — zero dependency, safe to import from any layer.
 */

export const BOOKING_HORIZON_ALLOWED = [7, 14, 30, 60];
export const BOOKING_HORIZON_DEFAULT = 14;
export const BOOKING_HORIZON_MAX = 60;

/**
 * Normalise an owner-supplied horizonDays value from an update request.
 *
 * Returns:
 *   { skipped: true }           — value was undefined (not provided); leave existing field unchanged
 *   { ok: true, value: null }   — explicit null; stored as null → fallback to default at read-time
 *   { ok: true, value: number } — valid canonical value (7 | 14 | 30 | 60), stored as Number
 *   { ok: false }               — invalid explicit value; caller must reject with 400
 */
export function normalizeBookingHorizonInput(value) {
    if (value === undefined) return { skipped: true };
    if (value === null) return { ok: true, value: null };

    // Accept Number or exact numeric string matching an allowed value.
    const n =
        typeof value === "number"
            ? value
            : typeof value === "string" && /^\d+$/.test(value)
              ? Number(value)
              : NaN;

    if (BOOKING_HORIZON_ALLOWED.includes(n)) return { ok: true, value: n };

    return { ok: false };
}

/**
 * Resolve the effective booking horizon for a card at request time.
 * Falls back to BOOKING_HORIZON_DEFAULT (14) when the field is absent or invalid.
 * Never returns more than BOOKING_HORIZON_MAX.
 */
export function resolveEffectiveBookingHorizon(card) {
    const hd = card?.bookingSettings?.horizonDays;
    if (BOOKING_HORIZON_ALLOWED.includes(hd)) {
        return Math.min(hd, BOOKING_HORIZON_MAX);
    }
    return BOOKING_HORIZON_DEFAULT;
}
