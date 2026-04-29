/**
 * Password Policy - Frontend UX SSoT (PASSWORD_POLICY_V1).
 *
 * Mirrors backend/src/utils/passwordPolicy.js exactly for client-side
 * guidance and Hebrew UX copy. All validation uses identical primitives
 * and the same deterministic 9-step order.
 *
 * IMPORTANT: Login must NOT apply this policy client-side. Only password
 * creation / change surfaces should validate against these rules.
 *
 * This module is dependency-free and has no DOM or React imports.
 * Safe to import from any layer (pages, components, hooks, workers).
 */

// ── Policy constants ────────────────────────────────────────────
export const PASSWORD_POLICY = Object.freeze({
    minLength: 8,
    maxLength: 72, // bcrypt truncates at ~72 bytes; hard max enforced server-side too.
});

// ── Stable machine-readable error codes ────────────────────────
// Values intentionally equal their key names for safe equality checks.
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

// ── Hebrew message map ──────────────────────────────────────────
// Maps every PASSWORD_* code to a clear Hebrew user-facing string.
// GENERIC is used for unknown / unexpected codes.
export const PASSWORD_POLICY_MESSAGES_HE = Object.freeze({
    PASSWORD_REQUIRED: "יש להזין סיסמה",
    PASSWORD_TOO_SHORT: "הסיסמה חייבת להכיל לפחות 8 תווים",
    PASSWORD_TOO_LONG: "הסיסמה יכולה להכיל עד 72 תווים",
    PASSWORD_CONTAINS_WHITESPACE: "אין להשתמש ברווחים בסיסמה",
    PASSWORD_CONTAINS_NON_ASCII: "יש להשתמש בתווים באנגלית בלבד",
    PASSWORD_MISSING_LOWERCASE: "יש להוסיף אות קטנה באנגלית",
    PASSWORD_MISSING_UPPERCASE: "יש להוסיף אות גדולה באנגלית",
    PASSWORD_MISSING_DIGIT: "יש להוסיף ספרה",
    PASSWORD_MISSING_SYMBOL: "יש להוסיף סימן מיוחד",
    GENERIC: "הסיסמה אינה עומדת בדרישות האבטחה",
});

// ── Generic helper text ─────────────────────────────────────────
// Suitable for aria-describedby hint text below a password field.
export const PASSWORD_POLICY_HELPER_TEXT_HE =
    "הסיסמה חייבת להכיל 8–72 תווים באנגלית בלבד, כולל אות גדולה, אות קטנה, ספרה וסימן מיוחד. אין להשתמש ברווחים.";

// ── Requirements checklist metadata ────────────────────────────
// Frozen array of frozen items with stable ids for React key / aria.
export const PASSWORD_POLICY_REQUIREMENTS_HE = Object.freeze([
    Object.freeze({ id: "length", label: "8–72 תווים" }),
    Object.freeze({ id: "englishOnly", label: "תווים באנגלית בלבד" }),
    Object.freeze({ id: "lowercase", label: "אות קטנה באנגלית" }),
    Object.freeze({ id: "uppercase", label: "אות גדולה באנגלית" }),
    Object.freeze({ id: "digit", label: "ספרה" }),
    Object.freeze({ id: "symbol", label: "סימן מיוחד" }),
    Object.freeze({ id: "noWhitespace", label: "ללא רווחים" }),
]);

// ── Validation primitives ───────────────────────────────────────
// Printable ASCII without space: charCodes 33–126 (0x21–0x7E).
// Not using \S or \w — both are Unicode-aware in JS and silently pass Hebrew/emoji.
const RE_PRINTABLE_ASCII = /^[\x21-\x7E]+$/;
const RE_LOWERCASE = /[a-z]/;
const RE_UPPERCASE = /[A-Z]/;
const RE_DIGIT = /[0-9]/;
// Printable ASCII symbol — non-alphanumeric ranges:
//   0x21–0x2F:  ! " # $ % & ' ( ) * + , - . /
//   0x3A–0x40:  : ; < = > ? @
//   0x5B–0x60:  [ \ ] ^ _ `
//   0x7B–0x7E:  { | } ~
const RE_SYMBOL = /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/;

/**
 * Validates a candidate password against PASSWORD_POLICY_V1.
 *
 * Mirrors the backend validatePasswordPolicy exactly.
 * Deterministic early-return: the first failing rule sets the code.
 * The password is never trimmed, normalized, mutated, logged, or returned.
 *
 * @param {unknown} password  Candidate password value.
 * @returns {{ ok: boolean, code: string|null }}
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
    if (/\s/.test(password)) {
        return {
            ok: false,
            code: PASSWORD_POLICY_ERROR_CODES.PASSWORD_CONTAINS_WHITESPACE,
        };
    }

    // 5. Printable ASCII only — rejects Hebrew, Cyrillic, emoji, control chars.
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

/**
 * Returns the Hebrew message for a given PASSWORD_* code.
 * Falls back to the GENERIC message for any unknown or missing code.
 * Never returns undefined.
 *
 * @param {string} code  A PASSWORD_POLICY_ERROR_CODES value or any string.
 * @returns {string}  Hebrew user-facing message.
 */
export function getPasswordPolicyMessage(code) {
    return (
        PASSWORD_POLICY_MESSAGES_HE[code] ?? PASSWORD_POLICY_MESSAGES_HE.GENERIC
    );
}

/**
 * Returns a new checklist array with { id, label, met } for every requirement.
 * Used to render a live/touched hint checklist near the password field.
 *
 * The raw password is evaluated internally only and is never stored,
 * returned, echoed, masked, sliced, or otherwise exposed.
 *
 * For empty / non-string input all items are met:false.
 *
 * @param {unknown} password  Candidate password value.
 * @returns {Array<{ id: string, label: string, met: boolean }>}
 */
export function getPasswordPolicyChecklist(password) {
    const isString = typeof password === "string" && password.length > 0;

    const lengthMet =
        isString &&
        password.length >= PASSWORD_POLICY.minLength &&
        password.length <= PASSWORD_POLICY.maxLength;
    const englishOnlyMet = isString && RE_PRINTABLE_ASCII.test(password);
    const lowercaseMet = isString && RE_LOWERCASE.test(password);
    const uppercaseMet = isString && RE_UPPERCASE.test(password);
    const digitMet = isString && RE_DIGIT.test(password);
    const symbolMet = isString && RE_SYMBOL.test(password);
    const noWhitespaceMet = isString && !/\s/.test(password);

    return [
        {
            id: "length",
            label: PASSWORD_POLICY_REQUIREMENTS_HE[0].label,
            met: lengthMet,
        },
        {
            id: "englishOnly",
            label: PASSWORD_POLICY_REQUIREMENTS_HE[1].label,
            met: englishOnlyMet,
        },
        {
            id: "lowercase",
            label: PASSWORD_POLICY_REQUIREMENTS_HE[2].label,
            met: lowercaseMet,
        },
        {
            id: "uppercase",
            label: PASSWORD_POLICY_REQUIREMENTS_HE[3].label,
            met: uppercaseMet,
        },
        {
            id: "digit",
            label: PASSWORD_POLICY_REQUIREMENTS_HE[4].label,
            met: digitMet,
        },
        {
            id: "symbol",
            label: PASSWORD_POLICY_REQUIREMENTS_HE[5].label,
            met: symbolMet,
        },
        {
            id: "noWhitespace",
            label: PASSWORD_POLICY_REQUIREMENTS_HE[6].label,
            met: noWhitespaceMet,
        },
    ];
}
