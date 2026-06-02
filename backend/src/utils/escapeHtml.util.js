// Shared backend HTML escaping helpers for marketing email rendering.
//
// Pure functions, no dependencies, no DOM assumptions. Null/undefined → "".
// Intentionally NOT a refactor of the private escape functions in
// cardOgHtml.service.js / og.routes.js / mailjet.service.js — those remain
// untouched (anti-regression). A later consolidation contour may unify them.

/**
 * Escape a value for safe insertion into HTML text content.
 * Escapes &, <, >, ", ' (ampersand first to avoid double-escaping).
 * @param {*} value
 * @returns {string}
 */
export function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Escape a value for safe insertion into a double-quoted HTML attribute.
 * Same character set as escapeHtml; kept as a distinct export so attribute
 * call sites are explicit and future-proof.
 * @param {*} value
 * @returns {string}
 */
export function escapeHtmlAttr(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
