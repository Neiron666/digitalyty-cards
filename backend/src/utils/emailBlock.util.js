import crypto from "crypto";
import DeletedEmailBlock from "../models/DeletedEmailBlock.model.js";

/**
 * Compute a deterministic, privacy-preserving key for a normalized email.
 * Uses HMAC-SHA256 with a dedicated server secret and domain-separated prefix
 * to prevent cross-purpose usage and dictionary attacks.
 *
 * @param {string} normalizedEmail - caller must pass already-normalized email
 * @returns {string} hex-encoded HMAC-SHA256
 */
export function computeEmailBlockKey(normalizedEmail) {
    const secret = process.env.EMAIL_BLOCK_SECRET;
    if (!secret) {
        throw new Error("EMAIL_BLOCK_SECRET is not configured");
    }
    return crypto
        .createHmac("sha256", secret)
        .update("cardigo-email-block-v1:" + normalizedEmail)
        .digest("hex");
}

/**
 * Check whether a normalized email is permanently blocked.
 *
 * @param {string} normalizedEmail
 * @returns {Promise<boolean>}
 */
export async function isEmailBlocked(normalizedEmail) {
    const emailKey = computeEmailBlockKey(normalizedEmail);
    const exists = await DeletedEmailBlock.exists({ emailKey });
    return Boolean(exists);
}

/**
 * Create a permanent email-block tombstone.
 * Duplicate-key errors (11000/11001) are treated as idempotent success.
 * Any other failure is re-thrown.
 *
 * @param {{ normalizedEmail: string, formerUserId?: string }} opts
 * @returns {Promise<void>}
 */
export async function createEmailBlock({ normalizedEmail, formerUserId }) {
    const emailKey = computeEmailBlockKey(normalizedEmail);
    try {
        await DeletedEmailBlock.create({
            emailKey,
            formerUserId: formerUserId || null,
        });
    } catch (err) {
        if (err && (err.code === 11000 || err.code === 11001)) {
            // Already blocked - idempotent success.
            return;
        }
        throw err;
    }
}
