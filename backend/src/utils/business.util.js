export const BUSINESS_NAME_MAX = 60;
export const BUSINESS_SUBTITLE_MAX = 80;
export const BUSINESS_CITY_MAX = 40;
export const BUSINESS_SLOGAN_MAX = 120;
export const BUSINESS_ADDRESS_MAX = 300;
export const BUSINESS_LAT_MIN = -90;
export const BUSINESS_LAT_MAX = 90;
export const BUSINESS_LNG_MIN = -180;
export const BUSINESS_LNG_MAX = 180;

const ALLOWED_BUSINESS_KEYS = [
    // required minimal fields
    "name",
    "category",
    "address",
    "city",
    "lat",
    "lng",

    // legacy fields (kept for backward compatibility)
    "businessName",
    "ownerName",
    "occupation",
    "slogan",
];

function normalizeCoordinate(value, min, max) {
    if (value === undefined) return undefined;
    if (value === null) return null;

    let n;

    if (typeof value === "number") {
        n = value;
    } else if (typeof value === "string") {
        const s = value.trim();
        if (!s) return null;
        n = Number(s);
    } else {
        return null;
    }

    if (!Number.isFinite(n)) return null;
    if (n < min || n > max) return null;

    return n;
}

function isPlainObject(value) {
    if (!value || typeof value !== "object") return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function normalizeBoundedString(value, max) {
    if (value === null || value === undefined) return undefined;

    if (typeof value !== "string") {
        if (typeof value === "number" || typeof value === "boolean") {
            value = String(value);
        } else {
            return "";
        }
    }

    const trimmed = value.trim();
    if (!trimmed) return "";

    return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function normalizeBusinessForWrite(business) {
    const input = isPlainObject(business) ? business : {};

    // Defensive allowlist copy to keep writes bounded and avoid weird keys.
    const next = {};
    for (const key of ALLOWED_BUSINESS_KEYS) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            next[key] = input[key];
        }
    }

    // Enterprise-bounded strings (used by CardLayout + editor)
    if (Object.prototype.hasOwnProperty.call(next, "name")) {
        const v = normalizeBoundedString(next.name, BUSINESS_NAME_MAX);
        if (v !== undefined) next.name = v;
    }

    if (Object.prototype.hasOwnProperty.call(next, "category")) {
        const v = normalizeBoundedString(next.category, BUSINESS_SUBTITLE_MAX);
        if (v !== undefined) next.category = v;
    }

    if (Object.prototype.hasOwnProperty.call(next, "occupation")) {
        const v = normalizeBoundedString(
            next.occupation,
            BUSINESS_SUBTITLE_MAX,
        );
        if (v !== undefined) next.occupation = v;
    }

    if (Object.prototype.hasOwnProperty.call(next, "city")) {
        const v = normalizeBoundedString(next.city, BUSINESS_CITY_MAX);
        if (v !== undefined) next.city = v;
    }

    if (Object.prototype.hasOwnProperty.call(next, "slogan")) {
        const v = normalizeBoundedString(next.slogan, BUSINESS_SLOGAN_MAX);
        if (v !== undefined) next.slogan = v;
    }

    if (Object.prototype.hasOwnProperty.call(next, "address")) {
        const v = normalizeBoundedString(next.address, BUSINESS_ADDRESS_MAX);
        if (v !== undefined) next.address = v;
    }

    if (Object.prototype.hasOwnProperty.call(next, "lat")) {
        const normalizedLat = normalizeCoordinate(
            next.lat,
            BUSINESS_LAT_MIN,
            BUSINESS_LAT_MAX,
        );
        if (normalizedLat !== undefined) next.lat = normalizedLat;
    }

    if (Object.prototype.hasOwnProperty.call(next, "lng")) {
        const normalizedLng = normalizeCoordinate(
            next.lng,
            BUSINESS_LNG_MIN,
            BUSINESS_LNG_MAX,
        );
        if (normalizedLng !== undefined) next.lng = normalizedLng;
    }

    return next;
}
