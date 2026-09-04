import Organization from "../models/Organization.model.js";
import {
    getPersonalOrgIdReadOnly,
    classifyBillingScope,
} from "../utils/personalOrg.util.js";
import { BILLING_SCOPE } from "../utils/billingScope.constants.js";
import { isPersonalPaidGrace48hEnabled } from "../config/personalPaidGrace48h.config.js";
import { resolveEffectiveBilling } from "../utils/cardDTO.js";

// Read-only exact Organization lookup used only for REAL_ORG/UNKNOWN scope.
// Never invoked for PERSONAL — the personal sentinel Organization is never
// loaded or passed.
async function findOrganizationByIdForBilling(orgId) {
    return Organization.findById(orgId)
        .select("_id isActive orgEntitlement")
        .lean();
}

// Injection seam for bounded node:test only. Not exported.
const defaultBillingAccessDeps = Object.freeze({
    getPersonalOrgIdReadOnly,
    classifyBillingScope,
    isPersonalPaidGrace48hEnabled,
    findOrganizationByIdForBilling,
    resolveEffectiveBilling,
});

export async function resolveHttpEffectiveBilling(
    card,
    now,
    deps = defaultBillingAccessDeps,
) {
    // 1-2. Exactly one read-only sentinel lookup. No catch — a rejection
    // propagates to the caller unchanged.
    const personalOrgId = await deps.getPersonalOrgIdReadOnly();

    // 3. Sole normalized classifier, evaluated exactly once.
    const billingScope = deps.classifyBillingScope(card, personalOrgId);

    // 4. Flag read exactly once, only after the sentinel lookup succeeded.
    const personalPaidGrace48hEnabled = deps.isPersonalPaidGrace48hEnabled();

    // 5-8. PERSONAL never triggers an Organization lookup; the personal
    // sentinel Organization is never loaded or passed.
    let org = null;
    const cardOrgId = card?.orgId;
    const hasOrgId = cardOrgId !== null && cardOrgId !== undefined;
    if (
        hasOrgId &&
        (billingScope === BILLING_SCOPE.REAL_ORG ||
            billingScope === BILLING_SCOPE.UNKNOWN)
    ) {
        // 9. No catch — a rejection propagates to the caller unchanged.
        org = await deps.findOrganizationByIdForBilling(cardOrgId);
    }

    // 10. Single canonical calculation; the return value is not wrapped.
    return deps.resolveEffectiveBilling(card, now, org, {
        billingScope,
        personalPaidGrace48hEnabled,
    });
}
