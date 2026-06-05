// Marketing personalization utilities.
//
// SCOPE / SAFETY:
//   - Pure string manipulation only. No DB, no Mailjet, no network, no tokens.
//   - No raw email, no userId, no provider fields ever logged or returned.
//   - firstName is sanitized: CRLF + ASCII control chars stripped, length capped,
//     fallback to a fixed Hebrew string when empty/missing.
//   - Only [user] placeholder is supported. No eval, no nested templates,
//     no body personalization, no arbitrary placeholder expansion.

const PLACEHOLDER_USER = "[user]";
const FALLBACK_NAME = "לקוח יקר";
const FIRST_NAME_MAX_LEN = 60;
const SUBJECT_MAX_LEN = 255;

// ASCII control character pattern — includes CR (\r), LF (\n), NUL, and all
// other control bytes. Used to prevent header-injection via firstName.
const CONTROL_CHAR_RE = /[\r\n\x00-\x1F\x7F]/g;

/**
 * Personalize the marketing email subject template for a single recipient.
 *
 * Replaces all occurrences of [user] (case-sensitive) with the recipient's
 * sanitized firstName. If firstName is absent, empty, or unsafe after
 * sanitization, the Hebrew fallback "לקוח יקר" is used instead.
 *
 * Security guarantees:
 *   - CRLF and all ASCII control chars are stripped from firstName before
 *     insertion (prevents SMTP header injection).
 *   - firstName is capped at 60 chars.
 *   - Email is never used as a fallback (no PII in subject).
 *   - No inputs or outputs are logged.
 *   - No eval, no code execution.
 *
 * @param {*} subjectTemplate  Raw subject string from contentSnapshot.
 * @param {object|null|undefined} user  Mongoose lean doc or plain object with
 *   optional { firstName } field. Only firstName is read.
 * @returns {string}
 */
export function personalizeMarketingSubject(subjectTemplate, user) {
    // 1. Coerce subjectTemplate to string.
    const template =
        typeof subjectTemplate === "string"
            ? subjectTemplate
            : String(subjectTemplate || "");

    // 2. Resolve and sanitize firstName.
    const rawFirstName = user?.firstName;
    let safeName = "";
    if (typeof rawFirstName === "string") {
        // Strip CRLF + all ASCII control characters (header injection prevention).
        safeName = rawFirstName.replace(CONTROL_CHAR_RE, "");
        // Cap length before trimming to avoid a long string surviving by whitespace.
        safeName = safeName.slice(0, FIRST_NAME_MAX_LEN);
        // Trim leading/trailing whitespace.
        safeName = safeName.trim();
    }
    // Fallback when sanitized name is empty (null, missing, blank, or stripped).
    if (!safeName) {
        safeName = FALLBACK_NAME;
    }

    // 3. Replace all occurrences of [user] (case-sensitive, no eval).
    const personalized = template.replaceAll(PLACEHOLDER_USER, safeName);

    // 4. Final safety cap to avoid extreme subject lengths after substitution.
    return personalized.slice(0, SUBJECT_MAX_LEN);
}
