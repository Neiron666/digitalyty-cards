/**
 * Resolves org-level entitlement billing for org-owned cards.
 *
 * Pure function — no DB access, no model imports, no side effects.
 * Safe for lean Mongoose documents where orgEntitlement may be absent
 * (old org documents in MongoDB will not have the field; lean() does not
 * apply schema defaults).
 *
 * @param {object|null} org  - Organization lean/plain object, or null.
 * @param {Date}        now  - Reference time (defaults to current time).
 * @returns {object|null}    - Effective billing object, or null if not active.
 */
export function resolveOrgEntitlementBilling(org, now = new Date()) {
    // Guard: org must be a truthy, active object.
    if (!org || org.isActive !== true) return null;

    // Guard: lean documents from old orgs may not have this field at all.
    // Must be checked before any sub-field access.
    if (!org.orgEntitlement) return null;

    const oe = org.orgEntitlement;

    // Status must be explicitly "active".
    if (oe.status !== "active") return null;

    // expiresAt must exist and be a valid future date.
    if (!oe.expiresAt) return null;
    const expiresMs = new Date(oe.expiresAt).getTime();
    if (!Number.isFinite(expiresMs)) return null;
    const nowMs = new Date(now).getTime();
    if (expiresMs <= nowMs) return null;

    // startsAt: if present, must be a valid date that is <= now.
    // An invalid startsAt (non-parseable) is treated as a hard null-guard.
    if (oe.startsAt != null) {
        const startsMs = new Date(oe.startsAt).getTime();
        if (!Number.isFinite(startsMs)) return null; // invalid date → null
        if (startsMs > nowMs) return null; // not yet started → null
    }

    // All conditions passed — return computed effective billing.
    // IMPORTANT: internal audit fields (paymentReference, adminNote,
    // grantedByUserId, grantedAt, lastModifiedByUserId, lastModifiedAt)
    // are intentionally excluded from this response object.
    return {
        source: "organization",
        status: "active",
        plan: "org",
        paidUntil: new Date(expiresMs).toISOString(),
        until: new Date(expiresMs).toISOString(),
        isEntitled: true,
        isPaid: true,
    };
}
