import test from "node:test";
import assert from "node:assert/strict";
import { parseBillingPaidUntilMs, resolveBilling } from "../src/utils/trial.js";
import { BILLING_SCOPE } from "../src/utils/billingScope.constants.js";

const NOW = new Date("2026-08-17T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

test("1. valid future Date returns its exact epoch milliseconds", () => {
    const value = new Date(NOW.getTime() + 30 * DAY_MS);
    assert.equal(parseBillingPaidUntilMs(value), value.getTime());
});

test("2. valid past Date returns its exact epoch milliseconds", () => {
    const value = new Date(NOW.getTime() - 1 * HOUR_MS);
    assert.equal(parseBillingPaidUntilMs(value), value.getTime());
});

test("3. ISO date string preserves current Date-constructor milliseconds", () => {
    const value = new Date(NOW.getTime() + 10 * DAY_MS).toISOString();
    assert.equal(parseBillingPaidUntilMs(value), new Date(value).getTime());
});

test("4. numeric epoch zero returns 0 and is not treated as missing/falsy", () => {
    assert.equal(parseBillingPaidUntilMs(0), 0);
});

test("5. null returns null", () => {
    assert.equal(parseBillingPaidUntilMs(null), null);
});

test("6. undefined returns null", () => {
    assert.equal(parseBillingPaidUntilMs(undefined), null);
});

test("7. malformed date string returns null", () => {
    assert.equal(parseBillingPaidUntilMs("not-a-date"), null);
});

test("8. invalid Date object returns null", () => {
    assert.equal(parseBillingPaidUntilMs(new Date("invalid")), null);
});

test("9. exotic non-Date-coercible input preserves current throw behavior", () => {
    const exoticValue = Symbol("exotic");
    assert.throws(() => new Date(exoticValue).getTime());
    assert.throws(() => parseBillingPaidUntilMs(exoticValue));
});

test("10. resolveBilling with future PERSONAL monthly paidUntil still returns the existing economically-paid result", () => {
    const card = {
        user: "u1",
        billing: {
            status: "active",
            plan: "monthly",
            paidUntil: new Date(NOW.getTime() + 30 * DAY_MS),
        },
    };
    const result = resolveBilling(card, NOW, {
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
    });
    assert.equal(result.source, "billing");
    assert.equal(result.isPaid, true);
    assert.equal(result.isInPaidGrace, false);
});

test("11. resolveBilling with expired PERSONAL paidUntil and grace flag OFF still returns the existing free/non-grace result", () => {
    const card = {
        user: "u1",
        billing: {
            status: "active",
            plan: "monthly",
            paidUntil: new Date(NOW.getTime() - 1 * HOUR_MS),
        },
    };
    const result = resolveBilling(card, NOW, {
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: false,
    });
    assert.equal(result.source, "free");
    assert.equal(result.isPaid, false);
    assert.equal(result.isInPaidGrace, false);
});

test("12. resolveBilling with PERSONAL paidUntil expired by 1 hour and grace flag ON still returns the existing grace-active result", () => {
    const card = {
        user: "u1",
        billing: {
            status: "active",
            plan: "monthly",
            paidUntil: new Date(NOW.getTime() - 1 * HOUR_MS),
        },
    };
    const result = resolveBilling(card, NOW, {
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: true,
    });
    assert.equal(result.source, "billing");
    assert.equal(result.isPaid, true);
    assert.equal(result.isEntitled, true);
    assert.equal(result.isInPaidGrace, true);
});

test("13. resolveBilling exactly at paidUntil +48h with grace flag ON still denies grace per the existing strict boundary", () => {
    const card = {
        user: "u1",
        billing: {
            status: "active",
            plan: "monthly",
            paidUntil: new Date(NOW.getTime() - 48 * HOUR_MS),
        },
    };
    const result = resolveBilling(card, NOW, {
        billingScope: BILLING_SCOPE.PERSONAL,
        personalPaidGrace48hEnabled: true,
    });
    assert.equal(result.source, "free");
    assert.equal(result.isPaid, false);
    assert.equal(result.isInPaidGrace, false);
});
