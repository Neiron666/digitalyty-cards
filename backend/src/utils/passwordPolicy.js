/**
 * Password Policy - Single Source of Truth (PASSWORD_POLICY_V1).
 *
 * All user-creation and password-change flows must import and use this module.
 * Nothing else in the codebase should hard-code password length limits or charset rules.
 *
 * Policy: printable ASCII only (charCodes 33–126), no whitespace,
 * minimum complexity: lowercase + uppercase + digit + symbol.
 *
 * IMPORTANT: Login MUST NOT apply this policy. bcrypt.compare works against the
 * stored hash and must never be gated by new registration-time policy.
 */

// ── Policy constants ────────────────────────────────────────────
export const PASSWORD_POLICY = Object.freeze({
    minLength: 8,
    maxLength: 72, // bcrypt silently truncates at ~72 bytes; enforce hard max here.
});

// ── Stable machine-readable error codes ────────────────────────
// Values intentionally equal their key names for safe equality checks without magic strings.
export const PASSWORD_POLICY_ERROR_CODES = Object.freeze({
    PASSWORD_REQUIRED: "PASSWORD_REQUIRED",
    PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
    PASSWORD_TOO_LONG: "PASSWORD_TOO_LONG",
    PASSWORD_CONTAINS_WHITESPACE: "PASSWORD_CONTAINS_WHITESPACE",
    PASSWORD_CONTAINS_NON_ASCII: "PASSWORD_CONTAINS_NON_ASCII",
    PASSWORD_MISSING_LOWERCASE: "PASSWORD_MISSING_LOWERCASE",
    PASSWORD_MISSING_UPPERCASE: "PASSWORD_MISSING_UPPERCASE",
    PASSWORD_MISSING_DIGIT: "PASSWORD_MISSING_DIGIT",
    PASSWORD_MISSING_SYMBOL: "PASSWORD_MISSING_SYMBOL",
});

// ── Validation primitives ───────────────────────────────────────
// Printable ASCII without space: charCodes 33–126 (0x21–0x7E).
// Not using \S or \w — both are Unicode-aware in JS and would silently pass Hebrew/emoji.
const RE_PRINTABLE_ASCII = /^[\x21-\x7E]+$/;

// Lowercase English letter.
const RE_LOWERCASE = /[a-z]/;

// Uppercase English letter.
const RE_UPPERCASE = /[A-Z]/;

// ASCII digit.
const RE_DIGIT = /[0-9]/;

// Printable ASCII symbol: any char in the four non-alphanumeric printable ranges.
//   0x21–0x2F:  ! " # $ % & ' ( ) * + , - . /
//   0x3A–0x40:  : ; < = > ? @
//   0x5B–0x60:  [ \ ] ^ _ `
//   0x7B–0x7E:  { | } ~
const RE_SYMBOL = /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/;

/**
 * Validates a candidate password against PASSWORD_POLICY_V1.
 *
 * Validation is deterministic and early-return: the first failing rule
 * determines the returned code. The password is never normalized, trimmed,
 * mutated, logged, or included in the return value.
 *
 * @param {unknown} password  Candidate password value.
 * @returns {{ ok: boolean, code: string|null }}
 *   { ok: true, code: null } on success.
 *   { ok: false, code: PASSWORD_POLICY_ERROR_CODES.* } on failure.
 */
export function validatePasswordPolicy(password) {
    // 1. Required / type guard.
    if (typeof password !== "string" || password.length === 0) {
        return {
            ok: false,
            code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_REQUIRED,
        };
    }

    // 2. Minimum length.
    if (password.length < PASSWORD_POLICY.minLength) {
        return {
            ok: false,
            code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_TOO_SHORT,
        };
    }

    // 3. Maximum length (bcrypt 72-byte guard).
    if (password.length > PASSWORD_POLICY.maxLength) {
        return {
            ok: false,
            code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_TOO_LONG,
        };
    }

    // 4. Whitespace — checked before full-charset test for a precise error code.
    //    Catches: space (0x20), tab (0x09), newline (0x0A), carriage return (0x0D), etc.
    if (/\s/.test(password)) {
        return {
            ok: false,
            code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_CONTAINS_WHITESPACE,
        };
    }

    // 5. Printable ASCII only — rejects Hebrew, Cyrillic, emoji, control chars,
    //    and anything outside charCodes 33–126.
    if (!RE_PRINTABLE_ASCII.test(password)) {
        return {
            ok: false,
            code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_CONTAINS_NON_ASCII,
        };
    }

    // 6. At least one lowercase English letter.
    if (!RE_LOWERCASE.test(password)) {
        return {
            ok: false,
            code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_MISSING_LOWERCASE,
        };
    }

    // 7. At least one uppercase English letter.
    if (!RE_UPPERCASE.test(password)) {
        return {
            ok: false,
            code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_MISSING_UPPERCASE,
        };
    }

    // 8. At least one ASCII digit.
    if (!RE_DIGIT.test(password)) {
        return {
            ok: false,
            code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_MISSING_DIGIT,
        };
    }

    // 9. At least one special symbol (printable ASCII, non-alphanumeric).
    if (!RE_SYMBOL.test(password)) {
        return {
            ok: false,
            code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_MISSING_SYMBOL,
        };
    }

    return { ok: true, code: null };
}
