export function normalizeOrgSlug(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
}

const RESERVED_ORG_SLUGS = new Set([
    "admin",
    "api",
    "auth",
    "card",
    "cards",
    "c",
    "og",
    "sitemap",
    "robots",
]);

export function isReservedOrgSlug(value) {
    const s = normalizeOrgSlug(value);
    return RESERVED_ORG_SLUGS.has(s);
}

export function isValidOrgSlug(value) {
    const s = normalizeOrgSlug(value);
    if (!s) return false;
    if (s.length < 2 || s.length > 60) return false;
    if (isReservedOrgSlug(s)) return false;
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}
