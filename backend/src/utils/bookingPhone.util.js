import crypto from "crypto";

// Israel-first V1 normalization.
// Goal: stable server-truth canonicalization for anti-repeat.
// Not a full international phone library.

export function normalizeIlPhone(raw) {
    const s = String(raw ?? "").trim();
    if (!s) return { ok: false, error: "PHONE_REQUIRED" };

    // Keep digits and leading + only.
    let cleaned = s.replace(/[\s\-().]/g, "");

    // Remove any non-digit except leading +
    cleaned = cleaned.replace(/(?!^)\+/g, "");
    cleaned = cleaned.replace(/[^+\d]/g, "");

    // Convert 00 prefix to +
    if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);

    // If starts with 0 and looks like IL national, convert to +972
    if (cleaned.startsWith("0") && /^0\d{8,9}$/.test(cleaned)) {
        cleaned = "+972" + cleaned.slice(1);
    }

    // If starts with 972 without +, add +
    if (/^972\d{8,9}$/.test(cleaned)) cleaned = "+" + cleaned;

    // Final validation: +972 + 8..9 digits (IL numbers vary 9/10 total digits; after country code usually 8-9)
    if (!/^\+972\d{8,9}$/.test(cleaned)) {
        return { ok: false, error: "INVALID_PHONE" };
    }

    return { ok: true, normalized: cleaned };
}

export function hashPersonKey({ cardId, phoneNormalized } = {}) {
    const phone = String(phoneNormalized || "").trim();
    const card = String(cardId || "").trim();

    // Scope by card to avoid cross-card correlation and to match uniqueness needs.
    // Deterministic and index-friendly.
    const material = `${card}|${phone}`;

    return crypto.createHash("sha256").update(material).digest("hex");
}
