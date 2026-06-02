import crypto from "crypto";
import MarketingOptOut from "../models/MarketingOptOut.model.js";

// Domain separator for HMAC key derivation.
// Different from "cardigo-email-block-v1:" used by DeletedEmailBlock — no
// cross-purpose usage possible even though the same EMAIL_BLOCK_SECRET is used.
const DOMAIN_PREFIX = "cardigo-email-opt-out-v1:";

/**
 * Compute a deterministic, privacy-preserving key for a normalized email.
 * Uses HMAC-SHA256 with EMAIL_BLOCK_SECRET and a domain-separated prefix.
 *
 * @param {string} normalizedEmail - caller must pass already-normalized email
 * @returns {string} hex-encoded HMAC-SHA256
 */
export function computeMarketingOptOutKey(normalizedEmail) {
    const secret = process.env.EMAIL_BLOCK_SECRET;
    if (!secret) {
        throw new Error("EMAIL_BLOCK_SECRET is not configured");
    }
    return crypto
        .createHmac("sha256", secret)
        .update(DOMAIN_PREFIX + normalizedEmail)
        .digest("hex");
}

/**
 * Check whether a normalized email is in the marketing opt-out suppression list.
 *
 * @param {string} normalizedEmail
 * @returns {Promise<boolean>}
 */
export async function isMarketingOptOut(normalizedEmail) {
    const emailKey = computeMarketingOptOutKey(normalizedEmail);
    const exists = await MarketingOptOut.exists({ emailKey });
    return Boolean(exists);
}

/**
 * Record a marketing opt-out tombstone.
 * Duplicate-key errors (11000/11001) are treated as idempotent success.
 * Any other failure is re-thrown.
 *
 * @param {{ normalizedEmail: string, userId?: string | null }} opts
 * @returns {Promise<void>}
 */
export async function createMarketingOptOut({ normalizedEmail, userId }) {
    const emailKey = computeMarketingOptOutKey(normalizedEmail);
    try {
        await MarketingOptOut.create({
            emailKey,
            userId: userId || null,
        });
    } catch (err) {
        if (err && (err.code === 11000 || err.code === 11001)) {
            // Already present — idempotent success.
            return;
        }
        throw err;
    }
}

/**
 * Remove a marketing opt-out tombstone (on explicit re-opt-in).
 * No-op if the record does not exist.
 *
 * @param {{ normalizedEmail: string }} opts
 * @returns {Promise<void>}
 */
export async function removeMarketingOptOut({ normalizedEmail }) {
    const emailKey = computeMarketingOptOutKey(normalizedEmail);
    await MarketingOptOut.deleteOne({ emailKey });
}

/**
 * Batch suppression lookup for marketing-recipient filtering.
 *
 * Given a list of already-normalized emails, returns the SET of those emails
 * that are present in the marketing opt-out suppression list. Performs exactly
 * one bounded `$in` query (no N+1).
 *
 * Security: the derived emailKey/HMAC and EMAIL_BLOCK_SECRET never leave the
 * backend. The returned structure contains only normalized emails the caller
 * already provided — never the emailKey/HMAC.
 *
 * @param {string[]} normalizedEmails - already-normalized (lowercase/trim) emails
 * @returns {Promise<Set<string>>} set of normalized emails that are suppressed
 */
export async function findSuppressedEmails(normalizedEmails) {
    const unique = [
        ...new Set(
            (Array.isArray(normalizedEmails) ? normalizedEmails : [])
                .map((e) =>
                    String(e || "")
                        .trim()
                        .toLowerCase(),
                )
                .filter(Boolean),
        ),
    ];

    if (unique.length === 0) return new Set();

    // Map derived emailKey -> normalized email so we can translate the
    // suppression hits back to caller-known emails without exposing keys.
    const keyToEmail = new Map();
    const keys = [];
    for (const email of unique) {
        const key = computeMarketingOptOutKey(email);
        keyToEmail.set(key, email);
        keys.push(key);
    }

    const docs = await MarketingOptOut.find({ emailKey: { $in: keys } })
        .select("emailKey")
        .lean();

    const suppressed = new Set();
    for (const doc of docs) {
        const email = keyToEmail.get(doc.emailKey);
        if (email) suppressed.add(email);
    }
    return suppressed;
}
