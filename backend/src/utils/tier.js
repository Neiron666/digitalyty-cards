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

function derivedTierFromEffectiveBilling(effectiveBilling) {
    const plan = effectiveBilling?.plan || "free";
    if (plan === "yearly") return "premium";
    if (plan === "monthly") return "basic";
    return "free";
}

/**
 * Resolve the feature tier (NOT billing) with precedence:
 * card.adminTier > user.adminTier > derived from effectiveBilling.plan > default.
 *
 * Returns: { tier, source, until }
 * - tier: "free"|"basic"|"premium"
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
            tier: cardTier,
            source: "cardAdminTier",
            until: card?.adminTierUntil ? new Date(card.adminTierUntil) : null,
        };
    }

    const userTier = normalizeTier(user?.adminTier);
    if (userTier && isUntilActive(user?.adminTierUntil, now)) {
        return {
            tier: userTier,
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
