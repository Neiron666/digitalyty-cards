// Server-only unsubscribe-token issuer.
//
// Mints a one-time unsubscribe token, persists only its sha256 hash, and
// returns a ready-to-embed unsubscribe URL. The raw token is never returned,
// never logged. Throws on any failure so callers fail closed (no send without
// a working unsubscribe link).
//
// Mirrors the mint-before-send pattern in trialReminderJob.js without
// refactoring that job.

import crypto from "crypto";
import EmailUnsubscribeToken from "../models/EmailUnsubscribeToken.model.js";
import { getSiteUrl } from "./siteUrl.util.js";
import { UNSUBSCRIBE_TOKEN_TTL_MS } from "./unsubscribeTokenTtl.util.js";

/**
 * Issue a one-time unsubscribe token for the given normalized email.
 *
 * @param {{ emailNormalized: string }} args
 * @returns {Promise<{ unsubscribeUrl: string, expiresAt: Date }>}
 * @throws {Error} if input is invalid or persistence fails (caller fails closed)
 */
export async function issueEmailUnsubscribeToken({ emailNormalized } = {}) {
    if (typeof emailNormalized !== "string") {
        throw new Error("issueEmailUnsubscribeToken: emailNormalized required");
    }
    const normalized = emailNormalized.trim().toLowerCase();
    if (!normalized) {
        throw new Error("issueEmailUnsubscribeToken: emailNormalized required");
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
    const expiresAt = new Date(Date.now() + UNSUBSCRIBE_TOKEN_TTL_MS);

    await EmailUnsubscribeToken.create({
        emailNormalized: normalized,
        tokenHash,
        expiresAt,
        usedAt: null,
    });

    const unsubscribeUrl = `${getSiteUrl()}/unsubscribe?token=${rawToken}`;

    return { unsubscribeUrl, expiresAt };
}
