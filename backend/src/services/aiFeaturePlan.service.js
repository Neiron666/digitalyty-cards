import User from "../models/User.model.js";
import { resolveHttpEffectiveBilling } from "./billingAccessContext.service.js";
import { resolveEffectiveTier } from "../utils/tier.js";
import { planFromTier } from "../utils/cardDTO.js";

async function findUserAdminTierForBilling(userId) {
    return User.findById(userId)
        .select("adminTier adminTierUntil")
        .lean();
}

// Injection seam for bounded node:test only. Not exported.
const defaultAiFeaturePlanDeps = Object.freeze({
    resolveHttpEffectiveBilling,
    findUserAdminTierForBilling,
    resolveEffectiveTier,
    planFromTier,
});

export async function resolveAiFeaturePlan(
    card,
    userId,
    now,
    deps = defaultAiFeaturePlanDeps,
) {
    if (!userId) {
        return { plan: "free", billingSource: "unknown" };
    }

    const effectiveBilling = await deps.resolveHttpEffectiveBilling(
        card,
        now,
    );
    const user = await deps.findUserAdminTierForBilling(userId);
    // Always computed, even for the Organization branch below, to match the
    // pre-extraction controller's execution order exactly.
    const effectiveTier = deps.resolveEffectiveTier({
        card,
        user,
        effectiveBilling,
        now,
    });

    if (effectiveBilling?.source === "organization") {
        return { plan: "org", billingSource: "organization" };
    }

    return {
        plan: deps.planFromTier(effectiveTier?.tier || "free"),
        billingSource: effectiveBilling?.source || "unknown",
    };
}
