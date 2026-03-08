const TIERS = new Set(["free", "basic", "premium"]);

function normalizeTier(value) {
    const t = typeof value === "string" ? value.trim().toLowerCase() : "";
    return TIERS.has(t) ? t : null;
}

function isUntilActive(until, now = new Date()) {
    if (!until) return true;
    const untilMs = new Date(until).getTime();
    const nowMs = new Date(now).getTime();
    if (!Number.isFinite(untilMs) || !Number.isFinite(nowMs)) return false;
    return untilMs > nowMs;
}

// Product decision: "basic" tier is frozen. Any resolved "basic" normalizes to "premium".
function freezeBasicTier(tier) {
    return tier === "basic" ? "premium" : tier;
}

function derivedTierFromEffectiveBilling(effectiveBilling) {
    // Defense-in-depth: only paid/adminOverride billing yields a non-free tier.
    if (effectiveBilling?.isPaid !== true) return "free";
    const plan = effectiveBilling?.plan || "free";
    if (plan === "yearly") return "premium";
    if (plan === "monthly") return "premium";
    return "free";
}

/**
 * Resolve the feature tier (NOT billing) with precedence:
 * card.adminTier > user.adminTier > derived from effectiveBilling.plan > default.
 *
 * Returns: { tier, source, until }
 * - tier: "free"|"premium" ("basic" is frozen → normalized to "premium")
 * - source: "cardAdminTier"|"userAdminTier"|"billingDerived"|"default"
 * - until: Date|null (only for admin overrides)
 */
export function resolveEffectiveTier({
    card,
    user,
    effectiveBilling,
    now = new Date(),
} = {}) {
    const cardTier = normalizeTier(card?.adminTier);
    if (cardTier && isUntilActive(card?.adminTierUntil, now)) {
        return {
            tier: freezeBasicTier(cardTier),
            source: "cardAdminTier",
            until: card?.adminTierUntil ? new Date(card.adminTierUntil) : null,
        };
    }

    const userTier = normalizeTier(user?.adminTier);
    if (userTier && isUntilActive(user?.adminTierUntil, now)) {
        return {
            tier: freezeBasicTier(userTier),
            source: "userAdminTier",
            until: user?.adminTierUntil ? new Date(user.adminTierUntil) : null,
        };
    }

    const derived = derivedTierFromEffectiveBilling(effectiveBilling);
    if (derived) {
        return { tier: derived, source: "billingDerived", until: null };
    }

    return { tier: "free", source: "default", until: null };
}

export function isValidTier(value) {
    return Boolean(normalizeTier(value));
}
