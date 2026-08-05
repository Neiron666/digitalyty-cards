import Organization from "../models/Organization.model.js";

export const PERSONAL_ORG_SLUG = "personal";
export const PERSONAL_ORG_NAME = "Personal";

let cachedPersonalOrgId = null;
let personalOrgLoadPromise = null;

export async function getOrCreatePersonalOrg() {
    // Single-flight to avoid duplicate creates on cold start.
    if (personalOrgLoadPromise) return personalOrgLoadPromise;

    personalOrgLoadPromise = (async () => {
        let org = await Organization.findOne({
            slug: PERSONAL_ORG_SLUG,
        }).lean();

        if (!org) {
            try {
                org = await Organization.create({
                    slug: PERSONAL_ORG_SLUG,
                    name: PERSONAL_ORG_NAME,
                    isActive: true,
                });
                org = org?.toObject ? org.toObject() : org;
            } catch (err) {
                // If two workers race, unique index may throw; re-read.
                if (err?.code === 11000) {
                    org = await Organization.findOne({
                        slug: PERSONAL_ORG_SLUG,
                    }).lean();
                } else {
                    throw err;
                }
            }
        }

        if (org && org.isActive === false) {
            await Organization.updateOne(
                { _id: org._id },
                {
                    $set: {
                        isActive: true,
                        name: org.name || PERSONAL_ORG_NAME,
                    },
                },
            );
        }

        cachedPersonalOrgId = org?._id ? String(org._id) : null;
        return org;
    })().finally(() => {
        personalOrgLoadPromise = null;
    });

    return personalOrgLoadPromise;
}

export async function getPersonalOrgId() {
    if (cachedPersonalOrgId) return cachedPersonalOrgId;
    const org = await getOrCreatePersonalOrg();
    cachedPersonalOrgId = org?._id ? String(org._id) : null;
    return cachedPersonalOrgId;
}

/**
 * Read-only canonical personal-Organization id resolver.
 *
 * Finds the existing canonical personal Organization by its known slug and
 * NEVER creates or mutates it. Returns null when it cannot be resolved. Safe to
 * call from checkout and notify processing, which must not create Organization
 * data. Does not populate the create-path cache.
 *
 * @returns {Promise<string|null>}
 */
export async function getPersonalOrgIdReadOnly() {
    const org = await Organization.findOne({ slug: PERSONAL_ORG_SLUG })
        .select("_id")
        .lean();
    return org?._id ? String(org._id) : null;
}

/**
 * Canonical personal-billing classification. Pure — no DB access.
 *
 * Personal billing (and Tranzila) applies to the exact Card at User.cardId when:
 *   - the Card exists; AND
 *   - Card.orgId is null/absent; OR
 *   - Card.orgId equals the canonical personalOrgId sentinel.
 *
 * personalOrgId MUST be resolved by the caller (getPersonalOrgId) OUTSIDE any
 * Mongo transaction callback and passed here as an immutable value.
 *
 * Fail-closed: a non-null orgId that cannot be matched against a resolved
 * sentinel is NOT treated as personal.
 *
 * @param {{orgId?: unknown} | null | undefined} card
 * @param {string | null | undefined} personalOrgId
 * @returns {boolean}
 */
export function isPersonalBillingCard(card, personalOrgId) {
    if (!card) return false;
    const orgId = card.orgId;
    if (orgId === null || orgId === undefined) return true;
    if (!personalOrgId) return false;
    return String(orgId) === String(personalOrgId);
}

/**
 * Canonical REAL Organization classification. Pure — no DB access.
 *
 * A REAL Organization Card has a non-null orgId that is NOT the personalOrgId
 * sentinel. When the sentinel cannot be resolved, a non-null orgId fails closed
 * to REAL Organization (never silently reclassified as personal).
 *
 * Note: this is NOT the strict boolean complement of isPersonalBillingCard —
 * a missing card and a null orgId both return false here by design.
 *
 * @param {{orgId?: unknown} | null | undefined} card
 * @param {string | null | undefined} personalOrgId
 * @returns {boolean}
 */
export function isRealOrgCard(card, personalOrgId) {
    if (!card) return false;
    const orgId = card.orgId;
    if (orgId === null || orgId === undefined) return false;
    if (!personalOrgId) return true;
    return String(orgId) !== String(personalOrgId);
}
