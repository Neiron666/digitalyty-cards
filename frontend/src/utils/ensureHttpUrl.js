/**
 * Normalizes a user-entered external URL for safe use in <a href>.
 *
 * - Trims outer whitespace; rejects values with inner whitespace.
 * - Blocks unsafe schemes (javascript:, data:, vbscript:).
 * - Normalizes protocol-relative "//host/..." to "https://host/...".
 * - Passes through http:// and https:// URLs with a valid host.
 * - Optionally passes through extra allowed schemes (e.g. waze://).
 * - Prepends https:// to protocol-less strings.
 * - Validates that the final candidate has a real hostname.
 * - Returns "" for empty / blocked / malformed values (caller should not render the link).
 *
 * @param {string} value        Raw user-entered URL string.
 * @param {Object} [opts]
 * @param {string[]} [opts.extraSchemes]  Additional safe schemes to allow (lowercase, without "://").
 * @returns {string}  Normalized URL or "" if invalid/blocked.
 */
export default function ensureHttpUrl(value, opts) {
    if (!value) return "";
    const s = String(value).trim();
    if (!s) return "";

    // Reject values that contain whitespace (obvious garbage like "not a url").
    if (/\s/.test(s)) return "";

    // Block known-dangerous schemes (case-insensitive).
    const lower = s.toLowerCase();
    if (
        lower.startsWith("javascript:") ||
        lower.startsWith("data:") ||
        lower.startsWith("vbscript:")
    ) {
        return "";
    }

    // Protocol-relative "//host/path" → normalize to https.
    if (s.startsWith("//")) {
        return validateHttpUrl(`https:${s}`);
    }

    // Already has http(s) → validate host before passing through.
    if (lower.startsWith("http://") || lower.startsWith("https://")) {
        return validateHttpUrl(s);
    }

    // Check caller-specified extra safe schemes (e.g. "waze").
    if (opts?.extraSchemes) {
        for (const scheme of opts.extraSchemes) {
            if (lower.startsWith(`${scheme}://`)) return s;
        }
    }

    // If the string contains some other scheme (e.g. "ftp://", "file://")
    // we do NOT allow it — return empty.
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
        return "";
    }

    // Protocol-less → prepend https:// and validate.
    return validateHttpUrl(`https://${s}`);
}

/** Returns the URL string if it has a real hostname, otherwise "". */
function validateHttpUrl(candidate) {
    try {
        const u = new URL(candidate);
        if (
            (u.protocol === "http:" || u.protocol === "https:") &&
            u.hostname &&
            u.hostname.includes(".")
        ) {
            return candidate;
        }
    } catch { /* malformed → fall through */ }
    return "";
}
