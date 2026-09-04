import test from "node:test";
import assert from "node:assert/strict";
import { resolveLifecycleDowngradeDecision } from "../src/services/lifecycleDowngradeDecision.service.js";
import { resolveBilling } from "../src/utils/trial.js";
import { classifyBillingScope } from "../src/utils/personalOrg.util.js";
import { BILLING_SCOPE } from "../src/utils/billingScope.constants.js";

const NOW = new Date("2026-08-17T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const REASONS = Object.freeze([
    "REAL_ORG_NO_PERSONAL_MUTATION",
    "UNKNOWN_NO_PERSONAL_MUTATION",
    "ADMIN_OVERRIDE_NO_DOWNGRADE",
    "TRIAL_ACCESS_NO_DOWNGRADE",
    "LEGACY_ACCESS_NO_DOWNGRADE",
    "PERSONAL_GRACE_ACTIVE",
    "STILL_ECONOMICALLY_PAID",
    "ALREADY_NON_PAID_NO_TRANSITION",
    "UNSUPPORTED_SOURCE_FAIL_CLOSED",
    "INCONSISTENT_FREE_STATE_FAIL_CLOSED",
    "INVALID_PAID_UNTIL_FAIL_CLOSED",
    "PERSONAL_PAID_STATE_DOWNGRADE_ALLOWED",
]);

function makeCountingResolveBilling(realResolveBilling) {
    const calls = [];
    const fn = (card, now, options) => {
        calls.push({ card, now, options });
        return realResolveBilling(card, now, options);
    };
    return { fn, calls };
}

test("1. same Card and now references reach resolveBilling", () => {
    const card = { user: "u1", billing: { status: "free" } };
    let receivedCard = null;
    let receivedNow = null;
    const deps = Object.freeze({
        resolveBilling: (c, n) => {
            receivedCard = c;
            receivedNow = n;
            return { source: "free", isPaid: false, isInPaidGrace: false };
        },
    });
    resolveLifecycleDowngradeDecision(
        { card, billingScope: BILLING_SCOPE.PERSONAL, personalPaidGrace48hEnabled: false, now: NOW },
        deps,
    );
    assert.equal(receivedCard, card);
    assert.equal(receivedNow, NOW);
});

test("2. exact PERSONAL calls resolveBilling exactly once", () => {
    const { fn, calls } = makeCountingResolveBilling(resolveBilling);
    const card = { user: "u1", billing: { status: "free" } };
    resolveLifecycleDowngradeDecision(
        { card, billingScope: BILLING_SCOPE.PERSONAL, personalPaidGrace48hEnabled: false, now: NOW },
        Object.freeze({ resolveBilling: fn }),
    );
    assert.equal(calls.length, 1);
});

test("3. REAL_ORG calls resolver zero times", () => {
    const { fn, calls } = makeCountingResolveBilling(resolveBilling);
    const card = { user: "u1", orgId: "org1", billing: { status: "active" } };
    const result = resolveLifecycleDowngradeDecision(
        { card, billingScope: BILLING_SCOPE.REAL_ORG, personalPaidGrace48hEnabled: false, now: NOW },
        Object.freeze({ resolveBilling: fn }),
    );
    assert.equal(calls.length, 0);
    assert.deepEqual(result, {
        allowPersonalDowngrade: false,
        reason: "REAL_ORG_NO_PERSONAL_MUTATION",
        effectiveBilling: null,
    });
});

test("4. UNKNOWN calls resolver zero times", () => {
    const { fn, calls } = makeCountingResolveBilling(resolveBilling);
    const card = { user: "u1", orgId: "org1", billing: { status: "active" } };
    const result = resolveLifecycleDowngradeDecision(
        { card, billingScope: BILLING_SCOPE.UNKNOWN, personalPaidGrace48hEnabled: false, now: NOW },
        Object.freeze({ resolveBilling: fn }),
    );
    assert.equal(calls.length, 0);
    assert.deepEqual(result, {
        allowPersonalDowngrade: false,
        reason: "UNKNOWN_NO_PERSONAL_MUTATION",
        effectiveBilling: null,
    });
});

test("5. null scope fails closed with zero resolver calls", () => {
    const { fn, calls } = makeCountingResolveBilling(resolveBilling);
    const card = { user: "u1", billing: { status: "active" } };
    const result = resolveLifecycleDowngradeDecision(
        { card, billingScope: null, personalPaidGrace48hEnabled: false, now: NOW },
        Object.freeze({ resolveBilling: fn }),
    );
    assert.equal(calls.length, 0);
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "UNKNOWN_NO_PERSONAL_MUTATION");
    assert.equal(result.effectiveBilling, null);
});

test("6. undefined scope fails closed with zero resolver calls", () => {
    const { fn, calls } = makeCountingResolveBilling(resolveBilling);
    const card = { user: "u1", billing: { status: "active" } };
    const result = resolveLifecycleDowngradeDecision(
        { card, billingScope: undefined, personalPaidGrace48hEnabled: false, now: NOW },
        Object.freeze({ resolveBilling: fn }),
    );
    assert.equal(calls.length, 0);
    assert.equal(result.reason, "UNKNOWN_NO_PERSONAL_MUTATION");
});

test("7. malformed scope fails closed with zero resolver calls", () => {
    const { fn, calls } = makeCountingResolveBilling(resolveBilling);
    const card = { user: "u1", billing: { status: "active" } };
    const result = resolveLifecycleDowngradeDecision(
        { card, billingScope: "personal", personalPaidGrace48hEnabled: false, now: NOW },
        Object.freeze({ resolveBilling: fn }),
    );
    assert.equal(calls.length, 0);
    assert.equal(result.reason, "UNKNOWN_NO_PERSONAL_MUTATION");
});

test("8. economic paid returns STILL_ECONOMICALLY_PAID", () => {
    const card = {
        user: "u1",
        billing: { status: "active", plan: "monthly", paidUntil: new Date(NOW.getTime() + 30 * DAY_MS) },
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "STILL_ECONOMICALLY_PAID");
});

test("9. PERSONAL grace returns PERSONAL_GRACE_ACTIVE", () => {
    const card = {
        user: "u1",
        billing: { status: "active", plan: "monthly", paidUntil: new Date(NOW.getTime() - 1 * HOUR_MS) },
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: true,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "PERSONAL_GRACE_ACTIVE");
});

test("10. exact +48h returns PERSONAL_PAID_STATE_DOWNGRADE_ALLOWED", () => {
    const card = {
        user: "u1",
        billing: { status: "active", plan: "monthly", paidUntil: new Date(NOW.getTime() - 48 * HOUR_MS) },
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: true,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, true);
    assert.equal(result.reason, "PERSONAL_PAID_STATE_DOWNGRADE_ALLOWED");
});

test("11. flag-OFF expired PERSONAL returns PERSONAL_PAID_STATE_DOWNGRADE_ALLOWED", () => {
    const card = {
        user: "u1",
        billing: { status: "active", plan: "monthly", paidUntil: new Date(NOW.getTime() - 1 * HOUR_MS) },
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, true);
    assert.equal(result.reason, "PERSONAL_PAID_STATE_DOWNGRADE_ALLOWED");
});

test("12. admin override returns ADMIN_OVERRIDE_NO_DOWNGRADE", () => {
    const card = {
        user: "u1",
        adminOverride: { until: new Date(NOW.getTime() + 30 * DAY_MS), plan: "monthly" },
        billing: { status: "free" },
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "ADMIN_OVERRIDE_NO_DOWNGRADE");
});

test("13. trial-premium returns TRIAL_ACCESS_NO_DOWNGRADE", () => {
    const card = {
        user: "u1",
        billing: { status: "trial" },
        trialEndsAt: new Date(NOW.getTime() + 5 * DAY_MS),
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "TRIAL_ACCESS_NO_DOWNGRADE");
});

test("14. plain trial returns TRIAL_ACCESS_NO_DOWNGRADE", () => {
    const card = {
        user: null,
        anonymousId: null,
        billing: { status: "trial" },
        trialEndsAt: new Date(NOW.getTime() + 5 * DAY_MS),
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "TRIAL_ACCESS_NO_DOWNGRADE");
});

test("15. legacy with raw active status returns LEGACY_ACCESS_NO_DOWNGRADE", () => {
    const card = {
        user: null,
        anonymousId: null,
        billing: { status: "active", plan: "monthly", paidUntil: new Date(NOW.getTime() - 1 * HOUR_MS) },
        trialEndsAt: new Date(NOW.getTime() - 5 * DAY_MS),
        trialDeleteAt: new Date(NOW.getTime() - 1 * HOUR_MS),
        plan: "yearly",
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "LEGACY_ACCESS_NO_DOWNGRADE");
});

test("16. legacy with raw non-paid status returns LEGACY_ACCESS_NO_DOWNGRADE", () => {
    const card = {
        user: null,
        anonymousId: null,
        billing: { status: "canceled" },
        trialEndsAt: new Date(NOW.getTime() - 5 * DAY_MS),
        trialDeleteAt: new Date(NOW.getTime() - 1 * HOUR_MS),
        plan: "monthly",
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "LEGACY_ACCESS_NO_DOWNGRADE");
});

test("17. source none with raw active status returns UNSUPPORTED_SOURCE_FAIL_CLOSED", () => {
    const card = {
        user: null,
        anonymousId: null,
        billing: { status: "active", plan: "monthly", paidUntil: new Date(NOW.getTime() - 1 * HOUR_MS) },
        trialEndsAt: new Date(NOW.getTime() - 5 * DAY_MS),
        trialDeleteAt: new Date(NOW.getTime() - 1 * HOUR_MS),
        plan: "free",
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "UNSUPPORTED_SOURCE_FAIL_CLOSED");
});

test("18. source none with raw non-paid status returns ALREADY_NON_PAID_NO_TRANSITION", () => {
    const card = {
        user: null,
        anonymousId: null,
        billing: { status: "canceled" },
        trialEndsAt: new Date(NOW.getTime() - 5 * DAY_MS),
        trialDeleteAt: new Date(NOW.getTime() - 1 * HOUR_MS),
        plan: "free",
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "ALREADY_NON_PAID_NO_TRANSITION");
});

test("19. user-owned free with raw free status returns ALREADY_NON_PAID_NO_TRANSITION", () => {
    const card = { user: "u1", billing: { status: "free" } };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "ALREADY_NON_PAID_NO_TRANSITION");
});

test("20. missing paidUntil with raw active status fails closed with INVALID_PAID_UNTIL_FAIL_CLOSED", () => {
    const card = { user: "u1", billing: { status: "active", plan: "monthly" } };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: true,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "INVALID_PAID_UNTIL_FAIL_CLOSED");
});

test("21. malformed paidUntil with raw active status fails closed with INVALID_PAID_UNTIL_FAIL_CLOSED", () => {
    const card = { user: "u1", billing: { status: "active", plan: "monthly", paidUntil: "not-a-date" } };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: true,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "INVALID_PAID_UNTIL_FAIL_CLOSED");
});

test("22. free with raw free status and stale future paidUntil returns ALREADY_NON_PAID_NO_TRANSITION", () => {
    const card = {
        user: "u1",
        billing: { status: "free", plan: "monthly", paidUntil: new Date(NOW.getTime() + 30 * DAY_MS) },
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "ALREADY_NON_PAID_NO_TRANSITION");
});

test("23. self-cancel-equivalent unchanged paidUntil returns PERSONAL_GRACE_ACTIVE", () => {
    const card = {
        user: "u1",
        billing: { status: "active", plan: "monthly", paidUntil: new Date(NOW.getTime() - 1 * HOUR_MS) },
    };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: true,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "PERSONAL_GRACE_ACTIVE");
});

test("24. real classifyBillingScope PERSONAL / REAL_ORG / UNKNOWN matrix", () => {
    const personalOrgId = "sentinel123";
    assert.equal(classifyBillingScope({ orgId: null }, personalOrgId), BILLING_SCOPE.PERSONAL);
    assert.equal(classifyBillingScope({ orgId: "differentOrg" }, personalOrgId), BILLING_SCOPE.REAL_ORG);
    assert.equal(classifyBillingScope({ orgId: "someOrg" }, null), BILLING_SCOPE.UNKNOWN);
});

test("25. resolveBilling synchronous throw propagates by strict identity", () => {
    const expectedError = new Error("resolveBilling failure");
    const deps = Object.freeze({
        resolveBilling: () => {
            throw expectedError;
        },
    });
    const card = { user: "u1", billing: { status: "active" } };
    assert.throws(
        () =>
            resolveLifecycleDowngradeDecision(
                { card, billingScope: BILLING_SCOPE.PERSONAL, personalPaidGrace48hEnabled: false, now: NOW },
                deps,
            ),
        (err) => err === expectedError,
    );
});

test("26. injected source free, isPaid true, isInPaidGrace false fails closed", () => {
    const card = { user: "u1", billing: { status: "active" } };
    const deps = Object.freeze({
        resolveBilling: () => ({ source: "free", isPaid: true, isInPaidGrace: false }),
    });
    const result = resolveLifecycleDowngradeDecision(
        { card, billingScope: BILLING_SCOPE.PERSONAL, personalPaidGrace48hEnabled: false, now: NOW },
        deps,
    );
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "INCONSISTENT_FREE_STATE_FAIL_CLOSED");
});

test("27. injected source free, isPaid false, isInPaidGrace true fails closed", () => {
    const card = { user: "u1", billing: { status: "active" } };
    const deps = Object.freeze({
        resolveBilling: () => ({ source: "free", isPaid: false, isInPaidGrace: true }),
    });
    const result = resolveLifecycleDowngradeDecision(
        { card, billingScope: BILLING_SCOPE.PERSONAL, personalPaidGrace48hEnabled: false, now: NOW },
        deps,
    );
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "INCONSISTENT_FREE_STATE_FAIL_CLOSED");
});

test("28. injected source free with missing/undefined paid/grace fields fails closed", () => {
    const card = { user: "u1", billing: { status: "active" } };
    const deps = Object.freeze({
        resolveBilling: () => ({ source: "free" }),
    });
    const result = resolveLifecycleDowngradeDecision(
        { card, billingScope: BILLING_SCOPE.PERSONAL, personalPaidGrace48hEnabled: false, now: NOW },
        deps,
    );
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "INCONSISTENT_FREE_STATE_FAIL_CLOSED");
});

test("29. exact wrapper keys, exact reason membership, effectiveBilling identity, literal null, no mutation", () => {
    const cardPersonal = Object.freeze({
        user: "u1",
        billing: Object.freeze({ status: "active", plan: "monthly", paidUntil: new Date(NOW.getTime() - 1 * HOUR_MS) }),
    });
    const nowSnapshot = new Date(NOW.getTime());
    const depsPersonal = Object.freeze({ resolveBilling });

    const personalResult = resolveLifecycleDowngradeDecision(
        {
            card: cardPersonal,
            billingScope: BILLING_SCOPE.PERSONAL,
            personalPaidGrace48hEnabled: false,
            now: NOW,
        },
        depsPersonal,
    );
    assert.deepEqual(Object.keys(personalResult).sort(), [
        "allowPersonalDowngrade",
        "effectiveBilling",
        "reason",
    ]);
    assert.ok(REASONS.includes(personalResult.reason));
    assert.notEqual(personalResult.effectiveBilling, null);

    const cardNonPersonal = Object.freeze({ user: "u1", orgId: "org1", billing: Object.freeze({ status: "active" }) });
    const nonPersonalResult = resolveLifecycleDowngradeDecision(
        {
            card: cardNonPersonal,
            billingScope: BILLING_SCOPE.REAL_ORG,
            personalPaidGrace48hEnabled: false,
            now: NOW,
        },
        depsPersonal,
    );
    assert.deepEqual(Object.keys(nonPersonalResult).sort(), [
        "allowPersonalDowngrade",
        "effectiveBilling",
        "reason",
    ]);
    assert.ok(REASONS.includes(nonPersonalResult.reason));
    assert.equal(nonPersonalResult.effectiveBilling, null);

    // No input/dependency mutation.
    assert.deepEqual(cardPersonal, {
        user: "u1",
        billing: { status: "active", plan: "monthly", paidUntil: new Date(NOW.getTime() - 1 * HOUR_MS) },
    });
    assert.equal(NOW.getTime(), nowSnapshot.getTime());
});

test("30. null paidUntil with raw active status fails closed with INVALID_PAID_UNTIL_FAIL_CLOSED", () => {
    const card = { user: "u1", billing: { status: "active", plan: "monthly", paidUntil: null } };
    const result = resolveLifecycleDowngradeDecision({
        card,
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: true,
        now: NOW,
    });
    assert.equal(result.allowPersonalDowngrade, false);
    assert.equal(result.reason, "INVALID_PAID_UNTIL_FAIL_CLOSED");
});
