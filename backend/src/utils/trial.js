import { HttpError } from "./httpError.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function isAnonymousOwned(card) {
    return !card?.user && Boolean(card?.anonymousId);
}

function resolveAdminOverride(card, now = new Date()) {
    const o =
        card?.adminOverride && typeof card.adminOverride === "object"
            ? card.adminOverride
            : null;
    if (!o?.until) return null;

    const untilMs = new Date(o.until).getTime();
    const nowMs = new Date(now).getTime();
    if (!Number.isFinite(untilMs) || untilMs <= nowMs) return null;

    const plan = o.plan || "monthly";
    return { plan, until: new Date(o.until) };
}

export function computeTrialDates(now = new Date()) {
    const startedAt = new Date(now);
    const endsAt = new Date(startedAt.getTime() + 7 * DAY_MS);
    const deleteAt = new Date(endsAt.getTime() + 7 * DAY_MS);

    return {
        trialStartedAt: startedAt,
        trialEndsAt: endsAt,
        trialDeleteAt: deleteAt,
    };
}

function normalizePlan(value) {
    if (value === "monthly" || value === "yearly" || value === "free") {
        return value;
    }
    return "free";
}

function getBillingObject(card) {
    return card?.billing && typeof card.billing === "object"
        ? card.billing
        : null;
}

export function isPaid(card, now = new Date()) {
    const billing = getBillingObject(card);
    const status = billing?.status;

    // Safe rule: paidUntil is REQUIRED.
    if (!(status === "active" || status === "paid")) return false;
    if (!billing?.paidUntil) return false;

    const untilMs = new Date(billing.paidUntil).getTime();
    const nowMs = new Date(now).getTime();
    if (!Number.isFinite(untilMs) || !Number.isFinite(nowMs)) return false;

    return untilMs > nowMs;
}

export function isEntitled(card, now = new Date()) {
    const nowMs = new Date(now).getTime();

    const admin = resolveAdminOverride(card, now);
    if (admin) return true;

    if (isPaid(card, now)) return true;

    // Policy: user-owned free cards must never be trial-locked/deleted.
    if (card?.user) return true;

    // Policy B: anonymous cards are a draft sandbox; never trial-locked/deleted.
    if (isAnonymousOwned(card)) return true;

    // Trial grants access while active.
    const endsAtMs = card?.trialEndsAt
        ? new Date(card.trialEndsAt).getTime()
        : null;
    if (endsAtMs && Number.isFinite(endsAtMs) && endsAtMs > nowMs) return true;

    // If trial not started yet (no dates), allow editing; trial will be started on first write.
    const billing = getBillingObject(card);
    const status = billing?.status;
    const canStartTrial = !status || status === "free" || status === "trial";
    if (!card?.trialEndsAt && !card?.trialDeleteAt && canStartTrial)
        return true;

    // Optional legacy compatibility: if old docs have only plan field.
    const legacyPlan = normalizePlan(card?.plan);
    if (legacyPlan === "monthly" || legacyPlan === "yearly") return true;

    return false;
}

export function resolveBilling(card, now = new Date()) {
    const nowMs = new Date(now).getTime();

    // 1) adminOverride
    const admin = resolveAdminOverride(card, now);
    if (admin) {
        return {
            source: "adminOverride",
            plan: normalizePlan(admin.plan),
            until: admin.until ? new Date(admin.until).toISOString() : null,
            isEntitled: true,
            isPaid: false,
        };
    }

    // 2) billing (real payment)
    const billing = getBillingObject(card);
    const billingStatus = billing?.status;
    const paidUntilIso = billing?.paidUntil
        ? new Date(billing.paidUntil).toISOString()
        : null;
    const paidUntilMs = paidUntilIso ? new Date(paidUntilIso).getTime() : null;
    const paid =
        (billing?.status === "active" || billing?.status === "paid") &&
        Boolean(paidUntilMs) &&
        paidUntilMs > nowMs;

    const billingPlan = normalizePlan(billing?.plan || card?.plan || "free");
    if (paid) {
        return {
            source: "billing",
            plan: billingPlan,
            until: paidUntilIso,
            isEntitled: true,
            isPaid: true,
        };
    }

    // Policy B: anonymous cards are a draft sandbox; no trial countdown/lock.
    // IMPORTANT: keep this BEFORE any trial auto-start logic.
    if (isAnonymousOwned(card)) {
        return {
            source: "free",
            plan: billingPlan,
            until: null,
            isEntitled: true,
            isPaid: false,
        };
    }

    // Policy: user-owned cards are free-to-edit when not paid/adminOverride.
    if (card?.user) {
        return {
            source: "free",
            plan: billingPlan,
            until: null,
            isEntitled: true,
            isPaid: false,
        };
    }

    // 3) trial
    const trialEndsAtIso = card?.trialEndsAt
        ? new Date(card.trialEndsAt).toISOString()
        : null;
    const trialEndsAtMs = trialEndsAtIso
        ? new Date(trialEndsAtIso).getTime()
        : null;
    const trialActive = Boolean(trialEndsAtMs) && trialEndsAtMs > nowMs;

    const canStartTrial =
        !billingStatus || billingStatus === "free" || billingStatus === "trial";

    if (
        trialActive ||
        (!card?.trialEndsAt && !card?.trialDeleteAt && canStartTrial)
    ) {
        return {
            source: "trial",
            plan: billingPlan,
            until: trialEndsAtIso,
            isEntitled: true,
            isPaid: false,
        };
    }

    // 4) legacy (migration fallback)
    const legacyPlan = normalizePlan(card?.plan);
    if (legacyPlan === "monthly" || legacyPlan === "yearly") {
        return {
            source: "legacy",
            plan: legacyPlan,
            until: null,
            isEntitled: true,
            isPaid: false,
        };
    }

    // 5) none
    return {
        source: "none",
        plan: "free",
        until: null,
        isEntitled: false,
        isPaid: false,
    };
}

export function ensureTrialStarted(card, now = new Date()) {
    if (!card) return false;

    // Policy: never start trial for user-owned cards.
    if (card?.user) return false;

    // Policy B: never start trial for anonymous-owned cards.
    if (isAnonymousOwned(card)) return false;

    // If already paid/adminOverride, don't start trial.
    const resolved = resolveBilling(card, now);
    if (
        resolved?.source === "adminOverride" ||
        resolved?.source === "billing"
    ) {
        return false;
    }

    if (card.trialStartedAt && card.trialEndsAt && card.trialDeleteAt) {
        // Ensure billing status is at least trial/free.
        if (card.billing && card.billing.status === "free") {
            card.billing.status = "trial";
        }
        return false;
    }

    const { trialStartedAt, trialEndsAt, trialDeleteAt } =
        computeTrialDates(now);

    if (!card.trialStartedAt) card.trialStartedAt = trialStartedAt;
    if (!card.trialEndsAt) card.trialEndsAt = trialEndsAt;
    if (!card.trialDeleteAt) card.trialDeleteAt = trialDeleteAt;

    card.billing = card.billing || {
        status: "free",
        plan: "free",
        paidUntil: null,
    };
    if (card.billing.status === "free") card.billing.status = "trial";
    if (!card.billing.plan) card.billing.plan = card.plan || "free";

    return true;
}

export function assertNotLocked(card, now = new Date()) {
    if (!card) throw new HttpError(404, "Card not found", "NOT_FOUND");
    if (isEntitled(card, now)) return;

    const endsAt = card.trialEndsAt
        ? new Date(card.trialEndsAt).getTime()
        : null;
    if (endsAt && new Date(now).getTime() >= endsAt) {
        throw new HttpError(403, "Trial expired", "TRIAL_EXPIRED");
    }
}

export function isTrialDeleteDue(card, now = new Date()) {
    if (!card) return false;

    const deleteAt = card.trialDeleteAt
        ? new Date(card.trialDeleteAt).getTime()
        : null;
    if (!deleteAt) return false;

    return new Date(now).getTime() >= deleteAt;
}

export function isTrialExpired(card, now = new Date()) {
    if (!card) return false;

    const endsAt = card.trialEndsAt
        ? new Date(card.trialEndsAt).getTime()
        : null;
    if (!endsAt) return false;

    return new Date(now).getTime() >= endsAt;
}
