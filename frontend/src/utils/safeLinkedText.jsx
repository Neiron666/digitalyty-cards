/**
 * Safe linked-text rendering and meta-stripping helpers.
 *
 * Shared between Blog/Guide listing and article surfaces.
 * - renderLinkedText / textToParagraphs: visible-HTML path. Emits React <a> nodes;
 *   never produces raw HTML; uses URL allowlist (http/https/relative); rejects
 *   javascript:, data:, vbscript:, blob:, file:, protocol-relative, unknown schemes,
 *   and malformed URLs. External links carry target="_blank" rel="noopener noreferrer".
 * - markdownLinksToPlainText: meta/JSON-LD path. Collapses [anchor](url) to anchor
 *   only; never validates URL; never emits HTML or JSX; safe on non-string input.
 */

const ORIGIN =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_PUBLIC_ORIGIN) ||
    "https://cardigo.co.il";

/** Canonical origin for internal-link classification. */
const CANONICAL_ORIGIN = (() => {
    try {
        return new URL(ORIGIN).origin;
    } catch {
        return "https://cardigo.co.il";
    }
})();

/* Regex: token detection only - validation deferred to validateLinkUrl. */
const MD_LINK_RE = /\[([^\[\]]+)\]\(([^()\s]+)\)/g;
const BARE_URL_RE = /https?:\/\/[^\s<>\[\]"']+/g;
const TRAILING_PUNCT_RE = /[.,;:!?]+$/;

/** Split plain text into paragraphs by blank lines or single newlines. */
export function textToParagraphs(text) {
    if (!text) return [];
    return text
        .split(/\n\s*\n|\n/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Validate a candidate URL for safe rendering as <a href>.
 * Returns { href, isInternal } or null if the URL is unsafe / invalid.
 *
 * Allowed:
 *   - relative paths starting with a single "/"
 *   - absolute http:// or https://
 * Rejected:
 *   - javascript: / data: / vbscript: / blob: / file: / any other scheme
 *   - protocol-relative "//..."
 *   - malformed URLs
 */
export function validateLinkUrl(raw) {
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Relative path: must start with exactly one "/"
    if (trimmed[0] === "/") {
        if (trimmed[1] === "/") return null; // protocol-relative → reject
        return { href: trimmed, isInternal: true };
    }

    // Absolute URL - parse with URL API (security source of truth)
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        return null; // malformed
    }

    // Protocol allowlist (not a denylist)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
    }

    // Classify internal vs external
    const currentOrigin =
        typeof window !== "undefined" ? window.location.origin : "";
    const isInternal =
        parsed.origin === CANONICAL_ORIGIN ||
        (currentOrigin && parsed.origin === currentOrigin);

    return { href: trimmed, isInternal };
}

/**
 * Convert a string into an array of React nodes,
 * with safe markdown links and bare-URL auto-links.
 *
 * Pass 1 - find markdown links [text](url)
 * Pass 2 - auto-linkify bare URLs in remaining plain-text segments
 *
 * Anchor text and bare-URL display text are rendered as React children,
 * so they are HTML-escaped by React. No raw HTML is produced.
 */
export function renderLinkedText(text) {
    if (!text) return [text];

    /* ── Pass 1: markdown links ── */
    const parts = [];
    let cursor = 0;
    let keyIdx = 0;
    let match;

    MD_LINK_RE.lastIndex = 0;
    while ((match = MD_LINK_RE.exec(text)) !== null) {
        const [full, anchorText, rawUrl] = match;
        const idx = match.index;

        // Plain text before this match
        if (idx > cursor) {
            parts.push({ type: "text", value: text.slice(cursor, idx) });
        }

        const linkInfo = validateLinkUrl(rawUrl);
        if (linkInfo) {
            parts.push({
                type: "link",
                href: linkInfo.href,
                isInternal: linkInfo.isInternal,
                display: anchorText,
            });
        } else {
            // Invalid URL → degrade entire token to plain text
            parts.push({ type: "text", value: full });
        }
        cursor = idx + full.length;
    }
    // Remaining text after last markdown match
    if (cursor < text.length) {
        parts.push({ type: "text", value: text.slice(cursor) });
    }

    /* ── Pass 2: bare URLs inside plain-text segments ── */
    const final = [];
    for (const part of parts) {
        if (part.type === "link") {
            final.push(part);
            continue;
        }
        // Scan plain-text segment for bare URLs
        const segment = part.value;
        let sCursor = 0;
        BARE_URL_RE.lastIndex = 0;
        let urlMatch;
        while ((urlMatch = BARE_URL_RE.exec(segment)) !== null) {
            const rawBare = urlMatch[0];
            const sIdx = urlMatch.index;

            if (sIdx > sCursor) {
                final.push({
                    type: "text",
                    value: segment.slice(sCursor, sIdx),
                });
            }

            // Conservative trailing punctuation trim
            const urlToValidate =
                rawBare.replace(TRAILING_PUNCT_RE, "") || rawBare;
            const trailingChars = rawBare.slice(urlToValidate.length);

            const linkInfo = validateLinkUrl(urlToValidate);
            if (linkInfo) {
                final.push({
                    type: "link",
                    href: linkInfo.href,
                    isInternal: linkInfo.isInternal,
                    display: urlToValidate,
                });
                // Append trimmed punctuation as plain text
                if (trailingChars) {
                    final.push({ type: "text", value: trailingChars });
                }
            } else {
                final.push({ type: "text", value: rawBare });
            }
            sCursor = sIdx + rawBare.length;
        }
        if (sCursor < segment.length) {
            final.push({ type: "text", value: segment.slice(sCursor) });
        }
    }

    /* ── Render to React nodes ── */
    return final.map((node) => {
        if (node.type === "text") return node.value;

        const key = `lt-${keyIdx++}`;
        if (node.isInternal) {
            return (
                <a key={key} href={node.href}>
                    {node.display}
                </a>
            );
        }
        return (
            <a
                key={key}
                href={node.href}
                target="_blank"
                rel="noopener noreferrer"
            >
                {node.display}
            </a>
        );
    });
}

/* Module-scope regex for meta stripper (independent state from BARE_URL_RE above). */
const META_MD_LINK_RE = /\[([^\[\]]+)\]\(([^()\s]+)\)/g;

/**
 * Strip markdown link tokens [anchor](url) down to anchor text for use in
 * non-clickable meta surfaces (meta description, og:description, JSON-LD).
 *
 * Pinned semantics:
 *   - non-string input → ""
 *   - [anchor](url) → anchor
 *   - bare URLs left intact
 *   - no URL validation (output is non-clickable)
 *   - no HTML, no JSX
 *   - does not throw
 */
export function markdownLinksToPlainText(text) {
    if (typeof text !== "string" || text.length === 0) return "";
    META_MD_LINK_RE.lastIndex = 0;
    return text.replace(META_MD_LINK_RE, (_full, anchor) => anchor);
}
