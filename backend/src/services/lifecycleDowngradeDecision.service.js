import { resolveBilling, parseBillingPaidUntilMs } from "../utils/trial.js";
import { BILLING_SCOPE } from "../utils/billingScope.constants.js";

// Injection seam for bounded node:test only. Not exported.
const defaultLifecycleDowngradeDecisionDeps = Object.freeze({
    resolveBilling,
});

export function resolveLifecycleDowngradeDecision(
    { card, billingScope, personalPaidGrace48hEnabled, now },
    deps = defaultLifecycleDowngradeDecisionDeps,
) {
    if (billingScope === BILLING_SCOPE.REAL_ORG) {
        return {
            allowPersonalDowngrade: false,
            reason: "REAL_ORG_NO_PERSONAL_MUTATION",
            effectiveBilling: null,
        };
    }

    if (billingScope !== BILLING_SCOPE.PERSONAL) {
        return {
            allowPersonalDowngrade: false,
            reason: "UNKNOWN_NO_PERSONAL_MUTATION",
            effectiveBilling: null,
        };
    }

    // Single canonical resolution — never called again in this invocation.
    const effectiveBilling = deps.resolveBilling(card, now, {
        billingScope,
        personalPaidGrace48hEnabled,
    });

    if (effectiveBilling.source === "adminOverride") {
        return {
            allowPersonalDowngrade: false,
            reason: "ADMIN_OVERRIDE_NO_DOWNGRADE",
            effectiveBilling,
        };
    }

    if (
        effectiveBilling.source === "trial" ||
        effectiveBilling.source === "trial-premium"
    ) {
        return {
            allowPersonalDowngrade: false,
            reason: "TRIAL_ACCESS_NO_DOWNGRADE",
            effectiveBilling,
        };
    }

    if (effectiveBilling.source === "legacy") {
        return {
            allowPersonalDowngrade: false,
            reason: "LEGACY_ACCESS_NO_DOWNGRADE",
            effectiveBilling,
        };
    }

    // Grace is checked before the generic paid check: canonical resolveBilling
    // intentionally returns isPaid=true during grace.
    if (
        effectiveBilling.source === "billing" &&
        effectiveBilling.isInPaidGrace === true
    ) {
        return {
            allowPersonalDowngrade: false,
            reason: "PERSONAL_GRACE_ACTIVE",
            effectiveBilling,
        };
    }

    if (
        effectiveBilling.source === "billing" &&
        effectiveBilling.isPaid === true
    ) {
        return {
            allowPersonalDowngrade: false,
            reason: "STILL_ECONOMICALLY_PAID",
            effectiveBilling,
        };
    }

    const rawBillingStatus = card?.billing?.status;
    const wasPaidState =
        rawBillingStatus === "active" || rawBillingStatus === "paid";

    if (wasPaidState === false) {
        return {
            allowPersonalDowngrade: false,
            reason: "ALREADY_NON_PAID_NO_TRANSITION",
            effectiveBilling,
        };
    }

    if (effectiveBilling.source !== "free") {
        return {
            allowPersonalDowngrade: false,
            reason: "UNSUPPORTED_SOURCE_FAIL_CLOSED",
            effectiveBilling,
        };
    }

    // Security hardening: never authorize a destructive transition on
    // source==="free" alone — require the exact canonical free-state tuple.
    if (
        effectiveBilling.isPaid !== false ||
        effectiveBilling.isInPaidGrace !== false
    ) {
        return {
            allowPersonalDowngrade: false,
            reason: "INCONSISTENT_FREE_STATE_FAIL_CLOSED",
            effectiveBilling,
        };
    }

    // Canonical validity gate: destructive downgrade requires a canonically
    // parseable paidUntil. Validity only — expiry/grace stays owned by resolveBilling.
    const paidUntilMs = parseBillingPaidUntilMs(card?.billing?.paidUntil);
    if (paidUntilMs === null) {
        return {
            allowPersonalDowngrade: false,
            reason: "INVALID_PAID_UNTIL_FAIL_CLOSED",
            effectiveBilling,
        };
    }

    return {
        allowPersonalDowngrade: true,
        reason: "PERSONAL_PAID_STATE_DOWNGRADE_ALLOWED",
        effectiveBilling,
    };
}
