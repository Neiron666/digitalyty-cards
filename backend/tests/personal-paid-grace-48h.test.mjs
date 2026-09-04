import test from "node:test";
import assert from "node:assert/strict";

import { resolveBilling } from "../src/utils/trial.js";
import { BILLING_SCOPE } from "../src/utils/personalOrg.util.js";
import { isPersonalPaidGrace48hEnabled } from "../src/config/personalPaidGrace48h.config.js";

const FLAG = "CARDIGO_PERSONAL_PAID_GRACE_48H_ENABLED";
const GRACE_MS = 48 * 60 * 60 * 1000;

// Frozen reference instants — no Date.now() anywhere in this suite.
const PAID_UNTIL_ISO = "2026-08-06T12:00:00.000Z";
const PAID_UNTIL_MS = Date.parse(PAID_UNTIL_ISO);
const GRACE_BOUNDARY_MS = PAID_UNTIL_MS + GRACE_MS;
const GRACE_BOUNDARY_ISO = new Date(GRACE_BOUNDARY_MS).toISOString();

const ON = {
    billingScope: BILLING_SCOPE.PERSONAL,
    personalPaidGrace48hEnabled: true,
};

function paidCard(plan = "monthly", paidUntil = PAID_UNTIL_ISO) {
    return {
        user: "64b000000000000000000001",
        plan,
        billing: { status: "active", plan, paidUntil },
    };
}

// ── 1/2. Flag parser: strict string equality only ────────────────────────────

// Captures whether the property existed and its exact prior value, then
// restores that exact state. Registered via t.after so it runs even when an
// assertion throws. The value itself is never printed.
function withFlagRestored(t) {
    const existed = Object.prototype.hasOwnProperty.call(process.env, FLAG);
    const prior = existed ? process.env[FLAG] : undefined;
    t.after(() => {
        if (existed) {
            process.env[FLAG] = prior;
        } else {
            delete process.env[FLAG];
        }
    });
}

test("flag parser accepts only the exact string \"true\"", (t) => {
    withFlagRestored(t);
    process.env[FLAG] = "true";
    assert.equal(isPersonalPaidGrace48hEnabled(), true);
});

test("flag parser rejects absent/empty/1/TRUE/yes and other values", (t) => {
    withFlagRestored(t);
    delete process.env[FLAG];
    assert.equal(isPersonalPaidGrace48hEnabled(), false);
    for (const v of ["", "1", "TRUE", "True", "yes", "on", "false", " true"]) {
        process.env[FLAG] = v;
        assert.equal(isPersonalPaidGrace48hEnabled(), false, `value: "${v}"`);
    }
});

// ── 3/4. Backward compatibility ──────────────────────────────────────────────

test("options absent reproduces current economic behavior", () => {
    const before = new Date(PAID_UNTIL_MS - 1000);
    const after = new Date(PAID_UNTIL_MS + 1000);

    const paid = resolveBilling(paidCard(), before);
    assert.equal(paid.source, "billing");
    assert.equal(paid.isPaid, true);
    assert.equal(paid.until, PAID_UNTIL_ISO);

    const lapsed = resolveBilling(paidCard(), after);
    assert.equal(lapsed.source, "free");
    assert.equal(lapsed.isPaid, false);
    assert.equal(lapsed.isInPaidGrace, false);
    assert.equal(lapsed.effectiveAccessUntil, null);
});

test("flag false reproduces current behavior even with PERSONAL scope", () => {
    const after = new Date(PAID_UNTIL_MS + 1000);
    const r = resolveBilling(paidCard(), after, {
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
    });
    assert.equal(r.source, "free");
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

// ── 5-10. PERSONAL boundary matrix ───────────────────────────────────────────

test("PERSONAL before paidUntil is paid and not in grace", () => {
    const r = resolveBilling(paidCard(), new Date(PAID_UNTIL_MS - 1), ON);
    assert.equal(r.isPaid, true);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.source, "billing");
    assert.equal(r.effectiveAccessUntil, GRACE_BOUNDARY_ISO);
});

test("PERSONAL exactly at paidUntil enters grace", () => {
    const r = resolveBilling(paidCard(), new Date(PAID_UNTIL_MS), ON);
    assert.equal(r.isPaid, true);
    assert.equal(r.isInPaidGrace, true);
    assert.equal(r.source, "billing");
});

test("PERSONAL one millisecond after paidUntil is in grace", () => {
    const r = resolveBilling(paidCard(), new Date(PAID_UNTIL_MS + 1), ON);
    assert.equal(r.isPaid, true);
    assert.equal(r.isInPaidGrace, true);
});

test("PERSONAL one millisecond before the grace boundary is in grace", () => {
    const r = resolveBilling(paidCard(), new Date(GRACE_BOUNDARY_MS - 1), ON);
    assert.equal(r.isPaid, true);
    assert.equal(r.isInPaidGrace, true);
});

test("PERSONAL exactly at the grace boundary is not paid", () => {
    const r = resolveBilling(paidCard(), new Date(GRACE_BOUNDARY_MS), ON);
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.source, "free");
});

test("PERSONAL after the grace boundary is not paid", () => {
    const r = resolveBilling(
        paidCard(),
        new Date(GRACE_BOUNDARY_MS + 60_000),
        ON,
    );
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
});

// ── 11/12. Non-PERSONAL scopes ───────────────────────────────────────────────

test("REAL_ORG receives no personal grace", () => {
    const r = resolveBilling(paidCard(), new Date(PAID_UNTIL_MS + 1), {
        billingScope: BILLING_SCOPE.REAL_ORG,
        personalPaidGrace48hEnabled: true,
    });
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

test("UNKNOWN receives no personal grace", () => {
    const r = resolveBilling(paidCard(), new Date(PAID_UNTIL_MS + 1), {
        billingScope: BILLING_SCOPE.UNKNOWN,
        personalPaidGrace48hEnabled: true,
    });
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

// ── 13-15. Non-billing sources never receive personal grace ──────────────────

test("free status with a stale paidUntil receives no grace", () => {
    const card = {
        user: "64b000000000000000000001",
        billing: { status: "free", plan: "free", paidUntil: PAID_UNTIL_ISO },
    };
    const r = resolveBilling(card, new Date(PAID_UNTIL_MS + 1), ON);
    assert.equal(r.source, "free");
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

test("trial receives no paid grace", () => {
    const trialEnds = new Date(PAID_UNTIL_MS + 10 * 60_000).toISOString();
    const card = {
        user: "64b000000000000000000001",
        trialEndsAt: trialEnds,
        billing: { status: "trial", plan: "monthly" },
    };
    const r = resolveBilling(card, new Date(PAID_UNTIL_MS), ON);
    assert.equal(r.source, "trial-premium");
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

test("adminOverride receives no personal paid grace", () => {
    const card = {
        user: "64b000000000000000000001",
        adminOverride: {
            plan: "monthly",
            until: new Date(PAID_UNTIL_MS + 10 * 60_000).toISOString(),
        },
        billing: { status: "active", plan: "monthly", paidUntil: PAID_UNTIL_ISO },
    };
    const r = resolveBilling(card, new Date(PAID_UNTIL_MS + 1), ON);
    assert.equal(r.source, "adminOverride");
    assert.equal(r.isPaid, true);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(r.economicPaidUntil, null);
});

// ── 16-18. Date safety, fail closed, never throws ────────────────────────────

test("missing paidUntil fails closed", () => {
    const card = {
        user: "64b000000000000000000001",
        billing: { status: "active", plan: "monthly" },
    };
    const r = resolveBilling(card, new Date(PAID_UNTIL_MS), ON);
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

test("null paidUntil fails closed", () => {
    const card = {
        user: "64b000000000000000000001",
        billing: { status: "active", plan: "monthly", paidUntil: null },
    };
    const r = resolveBilling(card, new Date(PAID_UNTIL_MS), ON);
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

test("malformed paidUntil fails closed without throwing", () => {
    for (const bad of ["not-a-date", "2026-13-45T99:99:99Z", {}, NaN]) {
        const card = {
            user: "64b000000000000000000001",
            billing: { status: "active", plan: "monthly", paidUntil: bad },
        };
        let r;
        assert.doesNotThrow(() => {
            r = resolveBilling(card, new Date(PAID_UNTIL_MS), ON);
        }, `paidUntil: ${String(bad)}`);
        assert.equal(r.isPaid, false);
        assert.equal(r.isInPaidGrace, false);
        assert.equal(r.effectiveAccessUntil, null);
    }
});

// ── 19. Plan-independent fixed window ────────────────────────────────────────

test("monthly and yearly use the same fixed 48-hour grace", () => {
    const inGrace = new Date(PAID_UNTIL_MS + 1);
    const m = resolveBilling(paidCard("monthly"), inGrace, ON);
    const y = resolveBilling(paidCard("yearly"), inGrace, ON);

    assert.equal(m.effectiveAccessUntil, GRACE_BOUNDARY_ISO);
    assert.equal(y.effectiveAccessUntil, GRACE_BOUNDARY_ISO);
    assert.equal(m.isInPaidGrace, true);
    assert.equal(y.isInPaidGrace, true);
    assert.equal(m.plan, "monthly");
    assert.equal(y.plan, "yearly");

    const atBoundary = new Date(GRACE_BOUNDARY_MS);
    assert.equal(resolveBilling(paidCard("monthly"), atBoundary, ON).isPaid, false);
    assert.equal(resolveBilling(paidCard("yearly"), atBoundary, ON).isPaid, false);
});

// ── 20/21. Economic value preserved; derived value never fed back ────────────

test("economic `until` remains the unchanged paidUntil during grace", () => {
    const r = resolveBilling(paidCard(), new Date(PAID_UNTIL_MS + 1), ON);
    assert.equal(r.until, PAID_UNTIL_ISO);
    assert.equal(r.economicPaidUntil, PAID_UNTIL_ISO);
    assert.notEqual(r.until, r.effectiveAccessUntil);
});

test("effectiveAccessUntil is derived and never written back to the card", () => {
    const card = paidCard();
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, new Date(PAID_UNTIL_MS + 1), ON);

    assert.equal(r.effectiveAccessUntil, GRACE_BOUNDARY_ISO);
    assert.equal(JSON.stringify(card), snapshot);
    assert.equal(card.billing.paidUntil, PAID_UNTIL_ISO);
    assert.equal(
        Object.prototype.hasOwnProperty.call(card.billing, "effectiveAccessUntil"),
        false,
    );
});

// ── 22. No accumulation ──────────────────────────────────────────────────────

test("repeated resolution cannot accumulate grace", () => {
    const card = paidCard();
    let last = null;
    for (let i = 0; i < 25; i += 1) {
        const r = resolveBilling(card, new Date(PAID_UNTIL_MS + 1), ON);
        if (last !== null) assert.equal(r.effectiveAccessUntil, last);
        last = r.effectiveAccessUntil;
    }
    assert.equal(last, GRACE_BOUNDARY_ISO);
    assert.equal(card.billing.paidUntil, PAID_UNTIL_ISO);

    // The boundary is still exclusive after repeated resolution.
    assert.equal(
        resolveBilling(card, new Date(GRACE_BOUNDARY_MS), ON).isPaid,
        false,
    );
});

// ── Derived grace boundary outside the representable Date range ────────────

test("paidUntil near max Date: overflowing +48h yields no grace and does not throw", () => {
    // Valid Date, but paidUntil + 48h exceeds the max representable epoch.
    const MAX_DATE_MS = 8.64e15;
    const paidUntil = new Date(MAX_DATE_MS - 1000);
    const card = {
        user: "64b000000000000000000001",
        plan: "monthly",
        billing: { status: "active", plan: "monthly", paidUntil },
    };
    const snapshot = JSON.stringify(card);

    // Still economically active: `now` is far below paidUntil.
    let r;
    assert.doesNotThrow(() => {
        r = resolveBilling(card, new Date(PAID_UNTIL_MS), ON);
    });
    assert.equal(r.source, "billing");
    assert.equal(r.isPaid, true, "economic paid access is unchanged");
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(r.economicPaidUntil, paidUntil.toISOString());

    // After the economic period, the invalid derived boundary grants nothing.
    let expired;
    assert.doesNotThrow(() => {
        expired = resolveBilling(card, new Date(MAX_DATE_MS - 1), ON);
    });
    assert.equal(expired.isPaid, false);
    assert.equal(expired.isInPaidGrace, false);
    assert.equal(expired.effectiveAccessUntil, null);

    assert.equal(JSON.stringify(card), snapshot, "input Card is unchanged");
});

// ── Scope is internal: never exposed on the returned object ──────────────────

test("normalized scope is not exposed in the returned object", () => {
    const r = resolveBilling(paidCard(), new Date(PAID_UNTIL_MS + 1), ON);
    assert.equal(Object.prototype.hasOwnProperty.call(r, "billingScope"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(r, "scope"), false);
    assert.equal(JSON.stringify(r).includes("PERSONAL"), false);
});

// ── Paid-plan grace guard — raw billing.plan is the sole grace evidence ──────

const AFTER_EXPIRY = new Date(PAID_UNTIL_MS + 1);
const FUTURE_PAID_UNTIL_ISO = "2026-09-06T12:00:00.000Z";
const FUTURE_PAID_UNTIL_MS = Date.parse(FUTURE_PAID_UNTIL_ISO);

function billingCard({ status, billingPlan, cardPlan, hasBillingPlanKey = true }) {
    const billing = { status, paidUntil: PAID_UNTIL_ISO };
    if (hasBillingPlanKey) billing.plan = billingPlan;
    const card = { user: "64b000000000000000000001", billing };
    if (cardPlan !== undefined) card.plan = cardPlan;
    return card;
}

// 1
test("plan guard: active + monthly + expired paidUntil grants grace", () => {
    const card = billingCard({ status: "active", billingPlan: "monthly" });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isPaid, true);
    assert.equal(r.isInPaidGrace, true);
    assert.equal(r.effectiveAccessUntil, GRACE_BOUNDARY_ISO);
    assert.equal(JSON.stringify(card), snapshot);
});

// 2
test("plan guard: paid + monthly + expired paidUntil grants grace", () => {
    const card = billingCard({ status: "paid", billingPlan: "monthly" });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isPaid, true);
    assert.equal(r.isInPaidGrace, true);
    assert.equal(JSON.stringify(card), snapshot);
});

// 3
test("plan guard: active + yearly + expired paidUntil grants grace", () => {
    const card = billingCard({ status: "active", billingPlan: "yearly" });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isPaid, true);
    assert.equal(r.isInPaidGrace, true);
    assert.equal(JSON.stringify(card), snapshot);
});

// 4
test("plan guard: paid + yearly + expired paidUntil grants grace", () => {
    const card = billingCard({ status: "paid", billingPlan: "yearly" });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isPaid, true);
    assert.equal(r.isInPaidGrace, true);
    assert.equal(JSON.stringify(card), snapshot);
});

// 5
test("plan guard: active + free + expired paidUntil denies grace", () => {
    const card = billingCard({ status: "active", billingPlan: "free" });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(JSON.stringify(card), snapshot);
});

// 6
test("plan guard: paid + free + expired paidUntil denies grace", () => {
    const card = billingCard({ status: "paid", billingPlan: "free" });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(JSON.stringify(card), snapshot);
});

// 7
test("plan guard: active + billing.plan=null + expired paidUntil denies grace", () => {
    const card = billingCard({ status: "active", billingPlan: null });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(JSON.stringify(card), snapshot);
});

// 8
test("plan guard: paid + billing.plan missing + expired paidUntil denies grace", () => {
    const card = billingCard({
        status: "paid",
        billingPlan: undefined,
        hasBillingPlanKey: false,
    });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(JSON.stringify(card), snapshot);
});

// 9
test('plan guard: active + billing.plan="premium" + expired paidUntil denies grace', () => {
    const card = billingCard({ status: "active", billingPlan: "premium" });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(JSON.stringify(card), snapshot);
});

// 10
test('plan guard: paid + billing.plan="legacy" + expired paidUntil denies grace', () => {
    const card = billingCard({ status: "paid", billingPlan: "legacy" });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(JSON.stringify(card), snapshot);
});

// 11
test("plan guard: top-level card.plan=monthly with missing billing.plan denies grace", () => {
    const card = billingCard({
        status: "active",
        billingPlan: undefined,
        hasBillingPlanKey: false,
        cardPlan: "monthly",
    });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(
        r.isInPaidGrace,
        false,
        "top-level legacy card.plan must not be accepted as grace evidence",
    );
    assert.equal(r.isPaid, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(JSON.stringify(card), snapshot);
});

// 12
test("plan guard: top-level card.plan=yearly with billing.plan=null denies grace", () => {
    const card = billingCard({
        status: "active",
        billingPlan: null,
        cardPlan: "yearly",
    });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.isPaid, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(JSON.stringify(card), snapshot);
});

// 13
test('plan guard: billing.plan=" monthly " (whitespace) denies grace — no trimming', () => {
    const card = billingCard({ status: "active", billingPlan: " monthly " });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.isPaid, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(JSON.stringify(card), snapshot);
});

// 14
test('plan guard: billing.plan="MONTHLY" (case) denies grace — no lowercasing', () => {
    const card = billingCard({ status: "active", billingPlan: "MONTHLY" });
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, AFTER_EXPIRY, ON);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.isPaid, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(JSON.stringify(card), snapshot);
});

// 15
test("plan guard: active + free + future paidUntil preserves existing economic isPaid", () => {
    const card = {
        user: "64b000000000000000000001",
        billing: {
            status: "active",
            plan: "free",
            paidUntil: FUTURE_PAID_UNTIL_ISO,
        },
    };
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, new Date(PAID_UNTIL_MS), ON);
    assert.equal(r.isPaid, true, "pre-existing economic predicate unchanged");
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
    assert.equal(r.until, FUTURE_PAID_UNTIL_ISO);
    assert.equal(JSON.stringify(card), snapshot);
});

// 16
test("plan guard: valid monthly future paidUntil keeps the designed +48h boundary", () => {
    const card = {
        user: "64b000000000000000000001",
        billing: {
            status: "active",
            plan: "monthly",
            paidUntil: FUTURE_PAID_UNTIL_ISO,
        },
    };
    const snapshot = JSON.stringify(card);
    const r = resolveBilling(card, new Date(PAID_UNTIL_MS), ON);
    assert.equal(r.isPaid, true);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(
        r.effectiveAccessUntil,
        new Date(FUTURE_PAID_UNTIL_MS + GRACE_MS).toISOString(),
    );
    assert.equal(JSON.stringify(card), snapshot);
});
