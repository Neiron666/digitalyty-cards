const DAY_MS = 24 * 60 * 60 * 1000;

export function resolveBillingClient(card, now = new Date()) {
    const nowMs = new Date(now).getTime();

    const admin =
        card?.adminOverride && typeof card.adminOverride === "object"
            ? card.adminOverride
            : null;

    if (admin?.until) {
        const untilMs = new Date(admin.until).getTime();
        if (Number.isFinite(untilMs) && untilMs > nowMs) {
            return {
                status: "active",
                plan: admin.plan || "monthly",
                paidUntil: new Date(admin.until).toISOString(),
                source: "adminOverride",
            };
        }
    }

    const billing =
        card?.billing && typeof card.billing === "object" ? card.billing : null;
    if (billing) {
        return {
            status: billing.status || "free",
            plan: billing.plan || card?.plan || "free",
            paidUntil: billing.paidUntil || null,
            source: "billing",
        };
    }

    const legacyPlan = card?.plan || "free";
    return {
        status:
            legacyPlan === "monthly" || legacyPlan === "yearly"
                ? "active"
                : "free",
        plan: legacyPlan,
        paidUntil: null,
        source: "legacyPlan",
    };
}

export function isPaidClient(card, now = new Date()) {
    const b = resolveBillingClient(card, now);
    if (b.status !== "active") return false;

    if (b.paidUntil) {
        return new Date(b.paidUntil).getTime() > new Date(now).getTime();
    }

    return true;
}

export function getEffectivePlan(card, now = new Date()) {
    return resolveBillingClient(card, now)?.plan || "free";
}

export function getGalleryLimitByPlan(plan) {
    const p = plan || "free";
    if (p === "monthly") return 10;
    if (p === "yearly") return 10;
    return 5;
}

export function getTrialState(card, nowMs = Date.now()) {
    const trialEndsMs = card?.trialEndsAt
        ? new Date(card.trialEndsAt).getTime()
        : null;
    const isTrialExpired = Boolean(trialEndsMs && trialEndsMs < nowMs);

    return {
        isTrialExpired,
        trialEndsMs,
        trialDeleteAt: card?.trialDeleteAt || null,
        trialStartedAt: card?.trialStartedAt || null,
    };
}

export function computeDefaultOverrideUntil(days = 30) {
    const now = Date.now();
    return new Date(now + days * DAY_MS).toISOString();
}
