import { HttpError } from "./httpError.js";
import { TRIAL_DURATION_DAYS } from "../config/trial.js";
import { BILLING_SCOPE } from "./billingScope.constants.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Canonical operational grace applied on top of the economic paid period.
// Never persisted, never a renewal base.
const PAID_GRACE_MS = 48 * 60 * 60 * 1000;

// Largest absolute epoch representable by a JavaScript Date. Beyond this a
// derived boundary is an Invalid Date and toISOString() would throw.
const MAX_DATE_MS = 8.64e15;

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

/**
 * Compute trial dates for the user-premium-trial lifecycle.
 * Separate from anonymous computeTrialDates() - different duration, no deleteAt.
 * Returns { trialStartedAt, trialEndsAt } only.
 */
export function computeUserPremiumTrialDates(now = new Date()) {
    const startedAt = new Date(now);
    const endsAt = new Date(startedAt.getTime() + TRIAL_DURATION_DAYS * DAY_MS);
    return { trialStartedAt: startedAt, trialEndsAt: endsAt };
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

// Canonical pure paidUntil parser shared by resolveBilling and the lifecycle
// downgrade decision service. Fail-closed: missing/null/malformed values
// resolve to null (never coerced to epoch-0 or any other default).
export function parseBillingPaidUntilMs(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
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

export function resolveBilling(card, now = new Date(), options = {}) {
    const nowMs = new Date(now).getTime();
    const { billingScope = null, personalPaidGrace48hEnabled = false } =
        options ?? {};

    // Additive fields for every branch that can never carry personal paid grace.
    const NO_GRACE = {
        economicPaidUntil: null,
        effectiveAccessUntil: null,
        isInPaidGrace: false,
    };

    // 1) adminOverride
    const admin = resolveAdminOverride(card, now);
    if (admin) {
        return {
            source: "adminOverride",
            plan: normalizePlan(admin.plan),
            until: admin.until ? new Date(admin.until).toISOString() : null,
            isEntitled: true,
            isPaid: true,
            ...NO_GRACE,
        };
    }

    // 2) billing (real payment)
    const billing = getBillingObject(card);
    const billingStatus = billing?.status;
    const billingStatusPaid =
        billingStatus === "active" || billingStatus === "paid";

    // Fail-closed parse: missing/null/malformed paidUntil yields null (never throws).
    const paidUntilMs = parseBillingPaidUntilMs(billing?.paidUntil);
    const paidUntilIso =
        paidUntilMs === null ? null : new Date(paidUntilMs).toISOString();

    const paid =
        billingStatusPaid && paidUntilMs !== null && paidUntilMs > nowMs;

    // Grace plan evidence: the raw Card billing.plan only. Never card.plan
    // (legacy top-level field), never a fallback/default, never coerced —
    // exact lowercase "monthly"/"yearly" or grace is denied.
    const recognizedPaidBillingPlan =
        billing?.plan === "monthly" || billing?.plan === "yearly";

    // Grace is derived only from the stored economic paidUntil. No STO field is
    // read. Requires the flag, PERSONAL scope, a paid status, a recognized paid
    // plan and a valid date.
    const graceEligible =
        personalPaidGrace48hEnabled === true &&
        billingScope === BILLING_SCOPE.PERSONAL &&
        billingStatusPaid &&
        recognizedPaidBillingPlan &&
        paidUntilMs !== null;
    // A derived boundary outside the representable Date range yields no grace
    // instead of an Invalid Date (toISOString would throw).
    const derivedGraceMs = graceEligible ? paidUntilMs + PAID_GRACE_MS : null;
    const effectiveAccessUntilMs =
        derivedGraceMs !== null &&
        Number.isFinite(derivedGraceMs) &&
        Math.abs(derivedGraceMs) <= MAX_DATE_MS
            ? derivedGraceMs
            : null;
    const effectiveAccessUntil =
        effectiveAccessUntilMs === null
            ? null
            : new Date(effectiveAccessUntilMs).toISOString();
    // Strict boundary: access is denied at exactly paidUntil + 48h.
    const inPaidGrace =
        effectiveAccessUntilMs !== null &&
        !paid &&
        nowMs < effectiveAccessUntilMs;

    const billingPlan = normalizePlan(billing?.plan || card?.plan || "free");
    if (paid || inPaidGrace) {
        return {
            source: "billing",
            plan: billingPlan,
            until: paidUntilIso,
            isEntitled: true,
            isPaid: true,
            economicPaidUntil: paidUntilIso,
            effectiveAccessUntil,
            isInPaidGrace: inPaidGrace,
        };
    }

    // Policy B: anonymous cards are a draft sandbox; no trial countdown/lock.
    // IMPORTANT: keep this BEFORE any trial auto-start logic.
    if (isAnonymousOwned(card)) {
        return {
            source: "free",
            plan: "free",
            until: null,
            isEntitled: true,
            isPaid: false,
            ...NO_GRACE,
        };
    }

    // 2b) user-owned card with active premium trial.
    // Condition: card is user-owned, billing.status is "trial", and trialEndsAt is in the future.
    // Belt-and-suspenders: require billing.status === "trial" to prevent dirty-data false positives.
    if (card?.user && card?.trialEndsAt && billingStatus === "trial") {
        const trialEndsAtIso = new Date(card.trialEndsAt).toISOString();
        const trialEndsAtMs = new Date(trialEndsAtIso).getTime();
        if (Number.isFinite(trialEndsAtMs) && trialEndsAtMs > nowMs) {
            return {
                source: "trial-premium",
                plan:
                    normalizePlan(billing?.plan) !== "free"
                        ? normalizePlan(billing?.plan)
                        : "monthly",
                until: trialEndsAtIso,
                isEntitled: true,
                isPaid: true,
                ...NO_GRACE,
            };
        }
        // Trial expired - fall through to user-owned free block below.
    }

    // Policy: user-owned cards are free-to-edit when not paid/adminOverride.
    if (card?.user) {
        return {
            source: "free",
            plan: "free",
            until: null,
            isEntitled: true,
            isPaid: false,
            ...NO_GRACE,
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
            plan: "free",
            until: trialEndsAtIso,
            isEntitled: true,
            isPaid: false,
            ...NO_GRACE,
        };
    }

    // 4) legacy (migration fallback)
    const legacyPlan = normalizePlan(card?.plan);
    if (legacyPlan === "monthly" || legacyPlan === "yearly") {
        return {
            source: "legacy",
            plan: "free",
            until: null,
            isEntitled: true,
            isPaid: false,
            ...NO_GRACE,
        };
    }

    // 5) none
    return {
        source: "none",
        plan: "free",
        until: null,
        isEntitled: false,
        isPaid: false,
        ...NO_GRACE,
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
