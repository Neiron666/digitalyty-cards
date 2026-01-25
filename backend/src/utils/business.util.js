export const BUSINESS_NAME_MAX = 60;
export const BUSINESS_SUBTITLE_MAX = 80;
export const BUSINESS_SLOGAN_MAX = 120;

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

    if (Object.prototype.hasOwnProperty.call(next, "slogan")) {
        const v = normalizeBoundedString(next.slogan, BUSINESS_SLOGAN_MAX);
        if (v !== undefined) next.slogan = v;
    }

    return next;
}
