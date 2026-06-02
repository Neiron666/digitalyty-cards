// Backend URL policy for marketing email content (first slice — conservative).
//
// Backend-pure. Does NOT import frontend safeLinkedText.jsx. The URL API is the
// security source of truth; we use a protocol/host allowlist, never a denylist.
//
// First-slice policy:
//   Body links & CTA URLs: relative "/path" (not "//") OR absolute https://cardigo.co.il
//   Top image URLs:        absolute https from an approved host allowlist only
// Arbitrary external links / arbitrary image hosts are intentionally deferred
// to a later audited contour.

const CANONICAL_HOST = "cardigo.co.il";

// Approved image hosts (https only). Supabase public bucket host is included
// because brand assets are served from it.
const APPROVED_IMAGE_HOSTS = new Set([
    "cardigo.co.il",
    "bhoamjrocjvjzbkqmlwi.supabase.co",
]);

function asTrimmedString(raw) {
    if (typeof raw !== "string") return "";
    return raw.trim();
}

/**
 * Validate a body/CTA link URL.
 * Allowed:
 *   - relative path starting with exactly one "/" (not protocol-relative "//")
 *   - absolute https://cardigo.co.il (optionally with path/query/hash)
 * Rejected:
 *   - empty, protocol-relative, malformed
 *   - javascript:/data:/vbscript:/blob:/file:/http: and any non-https scheme
 *   - any other host (external links deferred this slice)
 * @param {string} rawUrl
 * @returns {{ ok: true, href: string, isInternal: boolean } | { ok: false, reason: string }}
 */
export function validateMarketingLinkUrl(rawUrl) {
    const trimmed = asTrimmedString(rawUrl);
    if (!trimmed) return { ok: false, reason: "EMPTY_URL" };

    // Relative path: must start with exactly one "/".
    if (trimmed[0] === "/") {
        if (trimmed[1] === "/")
            return { ok: false, reason: "PROTOCOL_RELATIVE" };
        return { ok: true, href: trimmed, isInternal: true };
    }

    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        return { ok: false, reason: "MALFORMED_URL" };
    }

    if (parsed.protocol !== "https:") {
        return { ok: false, reason: "SCHEME_NOT_ALLOWED" };
    }
    if (parsed.host !== CANONICAL_HOST) {
        return { ok: false, reason: "HOST_NOT_ALLOWED" };
    }

    return { ok: true, href: parsed.href, isInternal: true };
}

/**
 * Validate a top image URL.
 * Allowed: absolute https from APPROVED_IMAGE_HOSTS only.
 * Rejected: empty (caller decides if required), http, data:, protocol-relative,
 *           malformed, any unapproved host.
 * @param {string} rawUrl
 * @returns {{ ok: true, href: string } | { ok: false, reason: string }}
 */
export function validateMarketingImageUrl(rawUrl) {
    const trimmed = asTrimmedString(rawUrl);
    if (!trimmed) return { ok: false, reason: "EMPTY_URL" };

    // Protocol-relative is never allowed for images.
    if (trimmed.startsWith("//")) {
        return { ok: false, reason: "PROTOCOL_RELATIVE" };
    }

    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        return { ok: false, reason: "MALFORMED_URL" };
    }

    if (parsed.protocol !== "https:") {
        return { ok: false, reason: "SCHEME_NOT_ALLOWED" };
    }
    if (!APPROVED_IMAGE_HOSTS.has(parsed.host)) {
        return { ok: false, reason: "HOST_NOT_ALLOWED" };
    }

    return { ok: true, href: parsed.href };
}

/**
 * Normalize a raw link URL to a safe href, or null if it fails policy.
 * Convenience wrapper over validateMarketingLinkUrl.
 * @param {string} rawUrl
 * @returns {string | null}
 */
export function normalizeMarketingHref(rawUrl) {
    const result = validateMarketingLinkUrl(rawUrl);
    return result.ok ? result.href : null;
}
