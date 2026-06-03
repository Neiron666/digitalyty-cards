// Marketing recipient eligibility revalidation — read-only SSoT.
//
// Given admin-selected userIds, re-derive backend eligibility WITHOUT trusting
// any frontend email. This is the single source of truth for the eligibility
// predicate; the future campaign send worker must reuse this same function so
// the predicate never drifts.
//
// STRICT: no Mailjet, no unsubscribe token, no AdminAudit, no campaign model,
// no DB write. Only User.find (read) + findSuppressedEmails (read). Never
// returns raw email, masked email, emailKey/HMAC, or User documents.

import mongoose from "mongoose";
import User from "../models/User.model.js";
import { findSuppressedEmails } from "./marketingOptOut.util.js";

// Upper bound on how many userIds a single dry-run may evaluate.
export const MAX_MARKETING_DRY_RUN_USER_IDS = 500;

// Frozen skip-reason enum. Coarse status codes only — never PII.
export const MARKETING_RECIPIENT_SKIP_REASONS = Object.freeze({
    INVALID_ID: "INVALID_ID",
    DUPLICATE: "DUPLICATE",
    USER_NOT_FOUND: "USER_NOT_FOUND",
    EMAIL_MISSING: "EMAIL_MISSING",
    NOT_CONSENTED: "NOT_CONSENTED",
    NOT_VERIFIED: "NOT_VERIFIED",
    OPTED_OUT: "OPTED_OUT",
    UNKNOWN: "UNKNOWN",
});

const R = MARKETING_RECIPIENT_SKIP_REASONS;

function normalizeEmail(email) {
    return String(email || "")
        .trim()
        .toLowerCase();
}

/**
 * Revalidate selected userIds against current backend eligibility.
 *
 * Deterministic processing order (mandatory for the invariant below):
 *   1. String-coerce every original entry: String(entry ?? "")
 *   2. Dedupe on the coerced string, preserving first occurrence
 *   3. Every later duplicate occurrence -> skipped { reason: DUPLICATE }
 *   4. Validate ObjectId only for first occurrences (on the coerced string)
 *   5. Only valid first occurrences enter the User.find $in query
 *
 * Note: mongoose.Types.ObjectId.isValid accepts some 12-char / 24-hex strings
 * that do not resolve to a real user. Such ids pass validation here and then
 * become USER_NOT_FOUND (not INVALID_ID). This is expected behavior.
 *
 * Invariant: eligibleCount + skippedCount === selectedCount.
 *
 * @param {unknown} userIds - admin-supplied array (already structurally checked
 *   by the controller, but treated defensively here).
 * @returns {Promise<{
 *   selectedCount: number,
 *   duplicateCount: number,
 *   uniqueCount: number,
 *   eligibleCount: number,
 *   skippedCount: number,
 *   eligibleUserIds: string[],
 *   skipped: Array<{ userId: string, reason: string }>,
 *   skippedByReason: Record<string, number>
 * }>}
 */
export async function revalidateMarketingRecipientUserIds(userIds) {
    const list = Array.isArray(userIds) ? userIds : [];
    const selectedCount = list.length;

    const skipped = [];
    const skippedByReason = Object.create(null);

    function addSkip(userId, reason) {
        skipped.push({ userId, reason });
        skippedByReason[reason] = (skippedByReason[reason] || 0) + 1;
    }

    // 1-3. Coerce + dedupe on coerced string; later duplicates -> DUPLICATE.
    const seen = new Set();
    const firstOccurrences = []; // coerced strings, first occurrence only
    for (const entry of list) {
        const coerced = String(entry ?? "");
        if (seen.has(coerced)) {
            addSkip(coerced, R.DUPLICATE);
            continue;
        }
        seen.add(coerced);
        firstOccurrences.push(coerced);
    }

    const uniqueCount = firstOccurrences.length;
    const duplicateCount = selectedCount - uniqueCount;

    // 4-5. Validate ObjectId on coerced strings; only valid ids hit the DB.
    const validIds = []; // coerced strings that are valid ObjectIds
    for (const coerced of firstOccurrences) {
        if (mongoose.Types.ObjectId.isValid(coerced)) {
            validIds.push(coerced);
        } else {
            addSkip(coerced, R.INVALID_ID);
        }
    }

    // Single bounded read. Never pass raw original entries into the query.
    let userMap = new Map();
    if (validIds.length > 0) {
        const docs = await User.find({ _id: { $in: validIds } })
            .select({ email: 1, emailMarketingConsent: 1, isVerified: 1 })
            .lean();
        userMap = new Map(docs.map((d) => [String(d._id), d]));
    }

    // Evaluate eligibility in first-occurrence order. Collect candidates that
    // passed all field checks for a single suppression lookup.
    const eligibleUserIds = [];
    const suppressionCandidates = []; // { userId, normEmail }
    for (const id of validIds) {
        const doc = userMap.get(id);
        if (!doc) {
            addSkip(id, R.USER_NOT_FOUND);
            continue;
        }
        const email = doc.email;
        if (typeof email !== "string" || email.trim() === "") {
            addSkip(id, R.EMAIL_MISSING);
            continue;
        }
        if (doc.emailMarketingConsent !== true) {
            addSkip(id, R.NOT_CONSENTED);
            continue;
        }
        if (doc.isVerified !== true) {
            addSkip(id, R.NOT_VERIFIED);
            continue;
        }
        suppressionCandidates.push({ userId: id, normEmail: normalizeEmail(email) });
    }

    // Single suppression lookup (HMAC server-side only; never exposes emailKey).
    if (suppressionCandidates.length > 0) {
        const suppressed = await findSuppressedEmails(
            suppressionCandidates.map((c) => c.normEmail),
        );
        for (const c of suppressionCandidates) {
            if (suppressed.has(c.normEmail)) {
                addSkip(c.userId, R.OPTED_OUT);
            } else {
                eligibleUserIds.push(c.userId);
            }
        }
    }

    const eligibleCount = eligibleUserIds.length;
    const skippedCount = skipped.length;

    return {
        selectedCount,
        duplicateCount,
        uniqueCount,
        eligibleCount,
        skippedCount,
        eligibleUserIds,
        skipped,
        skippedByReason,
    };
}
