import { HttpError } from "./httpError.js";

const DAY_MS = 24 * 60 * 60 * 1000;

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

export function resolveBilling(card) {
    const admin = resolveAdminOverride(card);
    if (admin) {
        return {
            status: "active",
            plan: admin.plan,
            paidUntil: admin.until,
        };
    }

    const billing =
        card?.billing && typeof card.billing === "object" ? card.billing : null;
    if (billing) return billing;

    // Backward compatibility: older docs used `plan` field only.
    const plan = card?.plan || "free";
    return {
        status: plan === "monthly" || plan === "yearly" ? "active" : "free",
        plan,
        paidUntil: null,
    };
}

export function isPaid(card, now = new Date()) {
    const billing = resolveBilling(card);
    if (billing?.status !== "active") return false;

    // If paidUntil exists, require it to be in the future.
    if (billing?.paidUntil) {
        return new Date(billing.paidUntil).getTime() > new Date(now).getTime();
    }

    // Backward compat: active without paidUntil treated as paid.
    return true;
}

export function ensureTrialStarted(card, now = new Date()) {
    if (!card) return false;
    if (isPaid(card, now)) return false;

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
    if (isPaid(card, now)) return;

    const endsAt = card.trialEndsAt
        ? new Date(card.trialEndsAt).getTime()
        : null;
    if (endsAt && new Date(now).getTime() > endsAt) {
        throw new HttpError(403, "Trial expired", "TRIAL_EXPIRED");
    }
}

export function isTrialDeleteDue(card, now = new Date()) {
    if (!card) return false;
    if (isPaid(card, now)) return false;

    const deleteAt = card.trialDeleteAt
        ? new Date(card.trialDeleteAt).getTime()
        : null;
    if (!deleteAt) return false;

    return new Date(now).getTime() >= deleteAt;
}

export function isTrialExpired(card, now = new Date()) {
    if (!card) return false;
    if (isPaid(card, now)) return false;

    const endsAt = card.trialEndsAt
        ? new Date(card.trialEndsAt).getTime()
        : null;
    if (!endsAt) return false;

    return new Date(now).getTime() >= endsAt;
}
