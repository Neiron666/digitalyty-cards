/**
 * Cards Showcase CTA URL policy.
 *
 * Only internal card links are permitted as ctaUrl values.
 * Absolute same-origin URLs (https://cardigo.co.il/...) are normalized
 * to their pathname on validation so the DB always stores relative paths.
 *
 * Allowed after normalization:
 *   /card/{slug}            — personal card page
 *   /c/{orgSlug}/{slug}     — org card page
 *
 * Forbidden:
 *   - empty / whitespace-only
 *   - javascript: / data: / vbscript: / file: / blob: / mailto: / tel: / http:
 *   - protocol-relative //
 *   - any external https:// hostname
 *   - /admin /edit /login /register /dashboard /org /api paths
 *   - paths with query strings or hash fragments
 *   - paths that don't match the two allowed patterns above
 */

const CANONICAL_HOST = "cardigo.co.il";

const FORBIDDEN_PATH_PREFIXES = [
    "/admin",
    "/edit",
    "/login",
    "/register",
    "/dashboard",
    "/org",
    "/api",
    "/account",
    "/invoice",
    "/payment",
    "/settings",
];

// Allowed relative path patterns (applied after normalization).
// % is explicitly excluded to block percent-encoded traversal (e.g. %2F = /).
// /card/{oneSegment} — personal card
const RE_CARD_PATH = /^\/card\/[^/\s?#%]{1,200}$/;
// /c/{oneSegment}/{oneSegment} — org card
const RE_ORG_CARD_PATH = /^\/c\/[^/\s?#%]{1,200}\/[^/\s?#%]{1,200}$/;

const BLOCKED_SCHEMES = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "blob:",
    "mailto:",
    "tel:",
];

/**
 * Validate (and normalize) a showcase item ctaUrl.
 *
 * Absolute same-origin URLs are normalized to pathname only (query/hash dropped).
 * Returns { ok: true, href: string } on success, { ok: false, reason: string } on failure.
 *
 * @param {unknown} rawUrl
 * @returns {{ ok: true; href: string } | { ok: false; reason: string }}
 */
export function validateShowcaseCtaUrl(rawUrl) {
    if (typeof rawUrl !== "string") {
        return { ok: false, reason: "INVALID_TYPE" };
    }
    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return { ok: false, reason: "EMPTY_URL" };
    }

    // Explicit scheme block before any URL parsing.
    const lower = trimmed.toLowerCase();
    for (const scheme of BLOCKED_SCHEMES) {
        if (lower.startsWith(scheme)) {
            return { ok: false, reason: "SCHEME_NOT_ALLOWED" };
        }
    }

    // Protocol-relative.
    if (trimmed.startsWith("//")) {
        return { ok: false, reason: "PROTOCOL_RELATIVE" };
    }

    let candidate = trimmed;

    // Absolute URL: must be https + canonical host → normalize to pathname only.
    if (/^https?:\/\//i.test(candidate)) {
        let parsed;
        try {
            parsed = new URL(candidate);
        } catch {
            return { ok: false, reason: "MALFORMED_URL" };
        }
        if (parsed.protocol !== "https:") {
            return { ok: false, reason: "HTTP_NOT_ALLOWED" };
        }
        if (parsed.host !== CANONICAL_HOST) {
            return { ok: false, reason: "EXTERNAL_HOST_NOT_ALLOWED" };
        }
        // Normalize to pathname only — drop query/hash for stored value safety.
        candidate = parsed.pathname;
    }

    // Relative path must start with /.
    if (!candidate.startsWith("/")) {
        return { ok: false, reason: "RELATIVE_PATH_REQUIRED" };
    }

    // Block query strings and hash fragments in relative paths.
    if (candidate.includes("?") || candidate.includes("#")) {
        return { ok: false, reason: "QUERY_HASH_NOT_ALLOWED" };
    }

    // Forbidden path prefixes.
    const lcCandidate = candidate.toLowerCase();
    for (const prefix of FORBIDDEN_PATH_PREFIXES) {
        if (lcCandidate === prefix || lcCandidate.startsWith(prefix + "/")) {
            return { ok: false, reason: "FORBIDDEN_PATH" };
        }
    }

    // Must match an allowed pattern.
    if (!RE_CARD_PATH.test(candidate) && !RE_ORG_CARD_PATH.test(candidate)) {
        return { ok: false, reason: "PATH_NOT_ALLOWED" };
    }

    return { ok: true, href: candidate };
}
