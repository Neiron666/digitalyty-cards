import Organization from "../models/Organization.model.js";
import { BILLING_SCOPE } from "./billingScope.constants.js";

// Re-exported so callers of the classifier can consume the vocabulary from a
// single import. Same frozen object identity as billingScope.constants.js.
export { BILLING_SCOPE };

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

/**
 * Safe identifier normalization for scope classification only. Private.
 *
 * Accepts exactly two forms and returns null for everything else:
 *   - a non-empty (post-trim) string;
 *   - an ObjectId-like object whose `toHexString` property reads as a function
 *     and returns a non-empty string when invoked.
 *
 * Arrays are rejected structurally, before any property read, so an Array that
 * carries or inherits a callable toHexString is still not an identifier.
 *
 * There is deliberately NO String(value), template interpolation or implicit
 * coercion: those would silently normalize numbers, Symbols and plain objects
 * into comparable strings and would propagate a caller-supplied toString.
 *
 * Never throws. The Array check, the property READ and the INVOCATION are each
 * guarded, so a revoked Proxy, a throwing getter, a throwing method, a Proxy
 * get trap and a Proxy apply trap all resolve to null.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeScopeId(value) {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
    }
    // Rejects null, undefined, number, bigint, boolean, Symbol and function.
    if (value === null || typeof value !== "object") return null;

    // Structural rejection: an Array is never a valid identifier, even when it
    // carries or inherits a callable toHexString. Array.isArray sees through a
    // Proxy and throws on a revoked one, so it is itself guarded.
    try {
        if (Array.isArray(value)) return null;
    } catch {
        return null; // revoked Proxy
    }

    let toHex;
    try {
        toHex = value.toHexString;
    } catch {
        return null; // throwing getter / Proxy get trap
    }
    if (typeof toHex !== "function") return null;

    let hex;
    try {
        hex = toHex.call(value);
    } catch {
        return null; // throwing method / Proxy apply trap
    }
    if (typeof hex !== "string") return null;
    const trimmed = hex.trim();
    return trimmed === "" ? null : trimmed;
}

/**
 * Canonical normalized billing-scope classifier. Pure — no DB access, no
 * Organization create/update, no fallback Card lookup, no mutation, and no
 * exception under any input.
 *
 * Card container: must be a non-null, non-Array object. A lean object or a
 * plain projected Card is accepted; a Mongoose document instance is NOT
 * required. Every other container (undefined, null, string, number, bigint,
 * boolean, Symbol, function, Array) fails closed to UNKNOWN.
 *
 * Truth table for a valid container:
 *   - Card.orgId absent or null                     → PERSONAL (no sentinel needed)
 *   - reading Card.orgId throws                     → UNKNOWN (fail closed)
 *   - non-null Card.orgId, personalOrgId missing    → UNKNOWN (fail closed)
 *   - Card.orgId not normalizable                   → UNKNOWN (fail closed)
 *   - personalOrgId not normalizable                → UNKNOWN (fail closed)
 *   - normalized ids equal                          → PERSONAL
 *   - normalized ids differ                         → REAL_ORG
 *
 * The outer boundary catches any residual exception (for example a revoked
 * Proxy, on which Array.isArray itself throws) and fails closed to UNKNOWN. It
 * can never mask a DB error because this function performs no DB operation.
 *
 * personalOrgId MUST be resolved read-only by the caller
 * (getPersonalOrgIdReadOnly) and passed here as an immutable value.
 *
 * @param {{orgId?: unknown} | null | undefined} card
 * @param {string | null | undefined} personalOrgId
 * @returns {"PERSONAL"|"REAL_ORG"|"UNKNOWN"}
 */
export function classifyBillingScope(card, personalOrgId) {
    try {
        if (card === null || typeof card !== "object") {
            return BILLING_SCOPE.UNKNOWN;
        }
        if (Array.isArray(card)) return BILLING_SCOPE.UNKNOWN;

        let orgId;
        try {
            orgId = card.orgId;
        } catch {
            return BILLING_SCOPE.UNKNOWN; // throwing getter / Proxy get trap
        }

        if (orgId === null || orgId === undefined) {
            return BILLING_SCOPE.PERSONAL;
        }
        if (personalOrgId === null || personalOrgId === undefined) {
            return BILLING_SCOPE.UNKNOWN;
        }

        const normalizedOrgId = normalizeScopeId(orgId);
        if (normalizedOrgId === null) return BILLING_SCOPE.UNKNOWN;
        const normalizedSentinel = normalizeScopeId(personalOrgId);
        if (normalizedSentinel === null) return BILLING_SCOPE.UNKNOWN;

        return normalizedOrgId === normalizedSentinel
            ? BILLING_SCOPE.PERSONAL
            : BILLING_SCOPE.REAL_ORG;
    } catch {
        return BILLING_SCOPE.UNKNOWN;
    }
}
