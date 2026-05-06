// Cardigo — Phone normalization utility
// Pure functions only. No DOM. No browser APIs. No external dependencies.
// No throws for user input. Empty/invalid returns "".

const BIDI_MARKS_RE = /[\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/g;

function extractCleanParts(raw) {
    const s = String(raw == null ? "" : raw)
        .trim()
        .replace(BIDI_MARKS_RE, "");
    const hadLeadingPlus = s.startsWith("+");
    const digits = s.replace(/\D/g, "");
    return { hadLeadingPlus, digits };
}

function isIlNsn(nsn) {
    // IL NSN after country code: 8 or 9 digits, must not start with "0".
    return (
        typeof nsn === "string" &&
        (nsn.length === 8 || nsn.length === 9) &&
        !nsn.startsWith("0")
    );
}

function isPlausibleE164Digits(digits) {
    // Generic E.164 plausibility: 7–15 digits, must not start with "0".
    return (
        typeof digits === "string" &&
        digits.length >= 7 &&
        digits.length <= 15 &&
        !digits.startsWith("0")
    );
}

export function normalizeForTel(raw) {
    const { hadLeadingPlus, digits } = extractCleanParts(raw);

    if (!digits) return "";

    // Rule A — Already has IL country code "972".
    if (digits.startsWith("972")) {
        const nsn = digits.slice(3);
        if (isIlNsn(nsn)) return "+" + digits;
        // Invalid NSN (e.g. starts with "0", wrong length) — fall through.
    }

    // Rule B — Local Israeli with leading "0".
    if (digits.startsWith("0")) {
        if (digits.length === 9 || digits.length === 10) {
            const nsn = digits.slice(1);
            if (isIlNsn(nsn)) return "+972" + nsn;
        }
        // Cannot normalize — fall through to suffix recovery or fail.
    }

    // Rule C — Bare Israeli mobile NSN (9 digits starting with "5").
    if (
        !digits.startsWith("0") &&
        digits.length === 9 &&
        digits.startsWith("5")
    ) {
        return "+972" + digits;
    }

    // Rule D — Known RTL-corrupted country-code suffix ("...972").
    if (digits.endsWith("972")) {
        const prefix = digits.slice(0, -3);

        // D1: prefix is a valid bare IL NSN.
        if (isIlNsn(prefix)) return "+972" + prefix;

        // D2: prefix starts with "0" (local Israeli format with leading zero).
        if (
            prefix.startsWith("0") &&
            (prefix.length === 9 || prefix.length === 10)
        ) {
            const nsn = prefix.slice(1);
            if (isIlNsn(nsn)) return "+972" + nsn;
        }
    }

    // Rule E — Generic E.164 fallback (original input had leading "+").
    if (hadLeadingPlus && isPlausibleE164Digits(digits)) {
        return "+" + digits;
    }

    // Rule F — Unrecognized format.
    return "";
}

export function normalizeForWaMe(raw) {
    const tel = normalizeForTel(raw);
    if (!tel) return "";
    return tel.startsWith("+") ? tel.slice(1) : tel;
}
