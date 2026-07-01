import { isValidObjectId } from "./orgMembership.util.js";

// ── Tiny strip / sanitize helpers (zero dependencies) ──────────────

/**
 * Remove HTML tags, control chars, collapse whitespace, trim, enforce maxLen.
 * @param {*} value
 * @param {object} opts
 * @param {number}  opts.maxLen   - max output length (default 200)
 * @param {boolean} opts.allowNewlines - keep \n (useful for message body)
 */
export function stripTags(value, { maxLen = 200, allowNewlines = false } = {}) {
    let s = String(value ?? "");

    // Remove HTML / XML tags.
    s = s.replace(/<[^>]*>/g, "");

    // Remove control chars (0x00–0x1F) except \n when allowed.
    if (allowNewlines) {
        s = s.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, "");
    } else {
        s = s.replace(/[\x00-\x1F]/g, " ");
    }

    // Collapse consecutive whitespace (spaces/tabs) to single space.
    s = s.replace(/[^\S\n]+/g, " ");

    // Collapse consecutive blank lines to one \n.
    if (allowNewlines) {
        s = s.replace(/\n{3,}/g, "\n\n");
    }

    return s.trim().slice(0, maxLen);
}

// Basic RFC-ish email check (no heavy lib).
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/**
 * Sanitize raw req.body for lead creation.
 * Returns a normalized object or an object with `.error` describing the issue.
 */
export function sanitizeLeadInput(body) {
    const raw = body && typeof body === "object" ? body : {};

    // ── cardId ──
    const cardIdRaw = String(raw.cardId ?? "").trim();
    if (!cardIdRaw || !isValidObjectId(cardIdRaw)) {
        return { error: "INVALID_CARD_ID" };
    }

    // ── honeypot ──
    const hp = raw.website != null ? String(raw.website) : "";

    // ── name (required) ──
    const name = stripTags(raw.name, { maxLen: 100 });
    if (!name) {
        return { error: "NAME_REQUIRED" };
    }

    // ── email (optional; validate format if present) ──
    const emailRaw = stripTags(raw.email, { maxLen: 254 }).toLowerCase();
    let email = null;
    if (emailRaw) {
        if (!EMAIL_RE.test(emailRaw)) {
            return { error: "INVALID_EMAIL" };
        }
        email = emailRaw;
    }

    // ── phone (optional) ──
    const phone = stripTags(raw.phone, { maxLen: 20 }) || null;

    // ── message (optional, allow newlines) ──
    const message =
        stripTags(raw.message, { maxLen: 1000, allowNewlines: true }) || null;

    // ── consent (required boolean) ──
    const consent = raw.consent === true;

    return { cardId: cardIdRaw, name, email, phone, message, hp, consent };
}

// ---------------------------------------------------------------------------
// Strict source path regex for article inquiry form.
// Allows /blog/{slug} or /guides/{slug} with optional trailing slash.
// Rejects: absolute URLs, protocol-relative, query strings, hashes,
// double slashes, dot traversal, percent-encoding, other path prefixes.
// ---------------------------------------------------------------------------
const ARTICLE_SOURCE_PATH_RE = /^\/(?:blog|guides)\/[a-zA-Z0-9_-]{1,120}\/?$/;

/**
 * Sanitize raw req.body for the article inquiry form.
 * Returns { ok: true, value: {...} } or { ok: false, code: "..." }.
 * Does not throw for normal validation errors.
 */
export function sanitizeArticleInquiryInput(body) {
    const raw = body && typeof body === "object" ? body : {};

    // ── honeypot (hp field) ──
    const hp = stripTags(String(raw.hp ?? ""), { maxLen: 120 });

    // ── name (required) ──
    const name = stripTags(raw.name, { maxLen: 100 });
    if (!name) {
        return { ok: false, code: "NAME_REQUIRED" };
    }

    // ── phone (required) ──
    const phone = stripTags(raw.phone, { maxLen: 20 });
    if (!phone) {
        return { ok: false, code: "PHONE_REQUIRED" };
    }

    // ── email (optional; validate format if present) ──
    const emailRaw = stripTags(raw.email, { maxLen: 254 }).toLowerCase();
    let email = null;
    if (emailRaw) {
        if (!EMAIL_RE.test(emailRaw)) {
            return { ok: false, code: "INVALID_EMAIL" };
        }
        email = emailRaw;
    }

    // ── sourcePath (required, strict allowlist) ──
    const sourcePathRaw =
        typeof raw.sourcePath === "string" ? raw.sourcePath.trim() : "";
    if (!ARTICLE_SOURCE_PATH_RE.test(sourcePathRaw)) {
        return { ok: false, code: "INVALID_SOURCE_PATH" };
    }
    const sourcePath = sourcePathRaw;

    // ── sourceTitle (optional, display-only) ──
    const sourceTitle = stripTags(raw.sourceTitle, { maxLen: 120 }) || null;

    // ── consent (required boolean) ──
    // Controller handles CONSENT_REQUIRED after honeypot check.
    const consent = raw.consent === true;

    return {
        ok: true,
        value: { name, phone, email, sourcePath, sourceTitle, consent, hp },
    };
}
