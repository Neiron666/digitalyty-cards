/**
 * createCardSlugTombstone.js
 *
 * Writes a SlugRedirect tombstone record when a user-owned card is hard-deleted.
 * Ensures the card's former slug stays quarantined for 30 days so it cannot be
 * immediately reclaimed by another card (slug-squatting protection).
 *
 * Tombstone records have targetCardId: null — resolveSlugRedirectDTO already
 * gates on targetCardId and returns null for tombstones, so the public read path
 * continues to return plain 404 with no SLUG_MOVED redirect.
 *
 * Routing metadata only. No PII stored here.
 */

import SlugRedirect from "../models/SlugRedirect.model.js";
import Organization from "../models/Organization.model.js";
import { getPersonalOrgId } from "../utils/personalOrg.util.js";

const ALLOWED_REASONS = new Set([
    "card_deleted",
    "account_deleted",
    "trial_expired",
]);

const SLUG_TOMBSTONE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * @param {object} params
 * @param {object}  params.card        - Mongoose Card document (or lean object) to tombstone.
 * @param {string}  params.reason      - One of "card_deleted" | "account_deleted" | "trial_expired".
 * @param {*}       [params.createdBy] - ObjectId of the actor initiating the delete, or null.
 * @param {Date}    [params.now]       - Reference time for expiry calculation (defaults to now).
 * @returns {Promise<{ok:boolean, skipped:boolean, reason?:string}>}
 */
export async function createCardSlugTombstone({
    card,
    reason,
    createdBy = null,
    now = new Date(),
} = {}) {
    // Guard: required card fields.
    if (!card || !card._id) {
        return { ok: true, skipped: true, reason: "missing_card" };
    }

    // Anonymous cards must not be tombstoned (they are not publicly resolvable by slug).
    if (!card.user) {
        return { ok: true, skipped: true, reason: "anonymous_card" };
    }

    if (!card.slug) {
        return { ok: true, skipped: true, reason: "missing_slug" };
    }

    // Legacy random slugs that do not match the canonical pattern are not quarantine-eligible.
    if (!SLUG_PATTERN.test(card.slug)) {
        return { ok: true, skipped: true, reason: "invalid_slug_pattern" };
    }

    if (!ALLOWED_REASONS.has(reason)) {
        return { ok: true, skipped: true, reason: "invalid_reason" };
    }

    const personalOrgId = await getPersonalOrgId();

    // orgId: use card's stored orgId if present, otherwise fall back to personalOrgId.
    const orgId = card.orgId || personalOrgId;

    // routeType: "card" for personal-org namespace, "orgCard" for all other orgs.
    const routeType =
        String(orgId) === String(personalOrgId) ? "card" : "orgCard";

    // For orgCard tombstones, capture the org slug for audit snapshot.
    // Org slugs are immutable (SLUG_IMMUTABLE policy) so the snapshot is permanently stable.
    // Missing org does not abort tombstone creation.
    let targetOrgSlugSnapshot = null;
    if (routeType === "orgCard") {
        try {
            const org = await Organization.findById(orgId)
                .select("slug")
                .lean();
            if (org?.slug) {
                targetOrgSlugSnapshot = org.slug;
            }
        } catch (_) {
            // Best-effort: org lookup failure does not abort tombstone creation.
        }
    }

    // Release expired non-forever active quarantines for this (routeType, orgId, slug)
    // so Index A uniqueness does not block the new tombstone.
    await SlugRedirect.updateMany(
        {
            routeType,
            orgId,
            slug: card.slug,
            status: "redirect_quarantine",
            permanentQuarantine: { $ne: true },
            manualReleaseRequired: { $ne: true },
            expiresAt: { $lte: now },
        },
        { $set: { status: "released", releasedAt: now } },
    );

    // If an active quarantine already exists for this slug, the slug is already
    // protected. Do not mutate its reason in this phase.
    const existing = await SlugRedirect.findOne(
        { routeType, orgId, slug: card.slug, status: "redirect_quarantine" },
        { _id: 1 },
    ).lean();

    if (existing) {
        return { ok: true, skipped: true, reason: "already_quarantined" };
    }

    // Create the tombstone record.
    try {
        await SlugRedirect.create({
            routeType,
            orgId,
            slug: card.slug,
            sourceCardId: card._id,
            targetCardId: null,
            targetSlugSnapshot: null,
            targetOrgSlugSnapshot,
            status: "redirect_quarantine",
            reason,
            expiresAt: new Date(now.getTime() + SLUG_TOMBSTONE_WINDOW_MS),
            permanentQuarantine: false,
            manualReleaseRequired: false,
            createdBy,
        });
    } catch (err) {
        // Duplicate key: a concurrent write already created a quarantine record.
        // The slug is protected — treat as idempotent success.
        if (err?.code === 11000) {
            return { ok: true, skipped: true, reason: "duplicate_quarantine" };
        }
        // Unexpected DB error: throw to caller for structured warning logging.
        throw err;
    }

    return { ok: true, skipped: false };
}
