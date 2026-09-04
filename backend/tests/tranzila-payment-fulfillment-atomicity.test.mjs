/**
 * CONTOUR: PERSONAL_PAID_GRACE_48H_STEP2_ATOMIC_PAYMENT_FULFILLMENT_IMPLEMENTATION
 *
 * Pure, DB-free tests for the Step 2 atomic-payment-fulfillment helpers
 * extracted from tranzila.provider.js. No MongoDB connection, no server,
 * no transaction execution — these tests only exercise the pure decision/
 * filter-building functions exported for this purpose.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    purchasedPeriodMs,
    computeMonotonicExpiry,
    classifyCardBillingShape,
    existingTransactionIdentityMatches,
    classifyExistingTransaction,
    buildCardFulfillmentFilters,
    buildPaymentIntentClaimFilter,
    buildPaymentIntentManualReviewFilter,
    buildPaymentIntentCompletionFilter,
    classifyFulfillmentTransactionError,
    deriveProviderTxnId,
    deriveStoProviderTxnId,
} from "../src/services/payment/tranzila.provider.js";

const USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_USER_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";
const CARD_ID = "cccccccccccccccccccccccc";
const PERSONAL_ORG_ID = "dddddddddddddddddddddddd";
const PAYMENT_INTENT_ID = "eeeeeeeeeeeeeeeeeeeeeeee";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-01-10T00:00:00.000Z");

function baseIncoming(overrides = {}) {
    return {
        userId: USER_ID,
        plan: "monthly",
        amountAgorot: 3900,
        ...overrides,
    };
}

function baseExistingTxn(overrides = {}) {
    return {
        userId: USER_ID,
        plan: "monthly",
        amountAgorot: 3900,
        status: "paid",
        fulfillmentStatus: "fulfilled",
        ...overrides,
    };
}

describe("purchasedPeriodMs", () => {
    it("returns 30 days for monthly", () => {
        assert.equal(purchasedPeriodMs("monthly"), 30 * DAY_MS);
    });

    it("returns 365 days for yearly", () => {
        assert.equal(purchasedPeriodMs("yearly"), 365 * DAY_MS);
    });
});

describe("computeMonotonicExpiry", () => {
    it("floors to fulfillmentNow + period when no valid prior expiry exists", () => {
        const result = computeMonotonicExpiry({
            fulfillmentNow: NOW,
            userExpiresAt: undefined,
            cardPaidUntil: undefined,
            plan: "monthly",
        });
        assert.equal(result.getTime(), NOW.getTime() + 30 * DAY_MS);
    });

    it("floors to fulfillmentNow + period when prior expiries are in the past", () => {
        const past = new Date(NOW.getTime() - DAY_MS);
        const result = computeMonotonicExpiry({
            fulfillmentNow: NOW,
            userExpiresAt: past,
            cardPaidUntil: past,
            plan: "monthly",
        });
        assert.equal(result.getTime(), NOW.getTime() + 30 * DAY_MS);
    });

    it("uses User.subscription.expiresAt when it is later than fulfillmentNow and Card", () => {
        const userLater = new Date(NOW.getTime() + 10 * DAY_MS);
        const result = computeMonotonicExpiry({
            fulfillmentNow: NOW,
            userExpiresAt: userLater,
            cardPaidUntil: undefined,
            plan: "monthly",
        });
        assert.equal(result.getTime(), userLater.getTime() + 30 * DAY_MS);
    });

    it("uses Card.billing.paidUntil when it is later than fulfillmentNow and User", () => {
        const cardLater = new Date(NOW.getTime() + 20 * DAY_MS);
        const result = computeMonotonicExpiry({
            fulfillmentNow: NOW,
            userExpiresAt: undefined,
            cardPaidUntil: cardLater,
            plan: "yearly",
        });
        assert.equal(result.getTime(), cardLater.getTime() + 365 * DAY_MS);
    });

    it("uses the later of User and Card when both are valid and future", () => {
        const userLater = new Date(NOW.getTime() + 5 * DAY_MS);
        const cardLater = new Date(NOW.getTime() + 15 * DAY_MS);
        const result = computeMonotonicExpiry({
            fulfillmentNow: NOW,
            userExpiresAt: userLater,
            cardPaidUntil: cardLater,
            plan: "monthly",
        });
        assert.equal(result.getTime(), cardLater.getTime() + 30 * DAY_MS);
    });

    it("ignores unparsable expiry values and falls back to fulfillmentNow", () => {
        const result = computeMonotonicExpiry({
            fulfillmentNow: NOW,
            userExpiresAt: "not-a-date",
            cardPaidUntil: undefined,
            plan: "monthly",
        });
        assert.equal(result.getTime(), NOW.getTime() + 30 * DAY_MS);
    });
});

describe("classifyCardBillingShape", () => {
    it("classifies a missing/undefined billing field as supported", () => {
        assert.equal(classifyCardBillingShape({ _id: CARD_ID }), "supported");
    });

    it("classifies an explicit null billing field as supported", () => {
        assert.equal(
            classifyCardBillingShape({ _id: CARD_ID, billing: null }),
            "supported",
        );
    });

    it("classifies a plain-object billing field as supported", () => {
        assert.equal(
            classifyCardBillingShape({
                _id: CARD_ID,
                billing: { status: "active" },
            }),
            "supported",
        );
    });

    it("classifies a non-object (e.g. string) billing field as unsupported", () => {
        assert.equal(
            classifyCardBillingShape({ _id: CARD_ID, billing: "corrupt" }),
            "unsupported",
        );
    });

    it("classifies an array billing field as unsupported", () => {
        assert.equal(
            classifyCardBillingShape({ _id: CARD_ID, billing: [] }),
            "unsupported",
        );
    });

    it("handles a missing card gracefully as unsupported", () => {
        assert.equal(classifyCardBillingShape(undefined), "unsupported");
    });
});

describe("existingTransactionIdentityMatches", () => {
    it("matches when userId, plan, and amountAgorot are all identical", () => {
        assert.equal(
            existingTransactionIdentityMatches({
                existingTxn: baseExistingTxn(),
                incoming: baseIncoming(),
            }),
            true,
        );
    });

    it("does not match on userId mismatch", () => {
        assert.equal(
            existingTransactionIdentityMatches({
                existingTxn: baseExistingTxn({ userId: OTHER_USER_ID }),
                incoming: baseIncoming(),
            }),
            false,
        );
    });

    it("does not match on plan mismatch", () => {
        assert.equal(
            existingTransactionIdentityMatches({
                existingTxn: baseExistingTxn({ plan: "yearly" }),
                incoming: baseIncoming(),
            }),
            false,
        );
    });

    it("does not match on amountAgorot mismatch", () => {
        assert.equal(
            existingTransactionIdentityMatches({
                existingTxn: baseExistingTxn({ amountAgorot: 1 }),
                incoming: baseIncoming(),
            }),
            false,
        );
    });

    it("never considers current entitlement state — only compares incoming vs stored identity fields", () => {
        // Even if the existing row somehow carried extra unrelated fields
        // resembling "current entitlement", identity matching must ignore them.
        const existingTxn = {
            ...baseExistingTxn(),
            unrelatedCurrentPlan: "yearly",
            unrelatedCurrentExpiresAt: new Date("2099-01-01"),
        };
        assert.equal(
            existingTransactionIdentityMatches({
                existingTxn,
                incoming: baseIncoming(),
            }),
            true,
        );
    });
});

describe("classifyExistingTransaction", () => {
    it("classifies identity mismatch as integrity_collision", () => {
        const result = classifyExistingTransaction({
            existingTxn: baseExistingTxn({ userId: OTHER_USER_ID }),
            incoming: baseIncoming(),
        });
        assert.deepEqual(result, { action: "integrity_collision" });
    });

    it("classifies paid+fulfilled as idempotent_success", () => {
        const result = classifyExistingTransaction({
            existingTxn: baseExistingTxn({
                status: "paid",
                fulfillmentStatus: "fulfilled",
            }),
            incoming: baseIncoming(),
        });
        assert.deepEqual(result, { action: "idempotent_success" });
    });

    it("classifies paid+manual_review as manual_review", () => {
        const result = classifyExistingTransaction({
            existingTxn: baseExistingTxn({
                status: "paid",
                fulfillmentStatus: "manual_review",
            }),
            incoming: baseIncoming(),
        });
        assert.equal(result.action, "manual_review");
        assert.equal(result.reason, "already_manual_review");
    });

    it("classifies paid+absent fulfillmentStatus (legacy row) as manual_review", () => {
        const result = classifyExistingTransaction({
            existingTxn: baseExistingTxn({
                status: "paid",
                fulfillmentStatus: undefined,
            }),
            incoming: baseIncoming(),
        });
        assert.equal(result.action, "manual_review");
        assert.equal(result.reason, "legacy_marker_absent");
    });

    it("classifies refunded as manual_review (conservative)", () => {
        const result = classifyExistingTransaction({
            existingTxn: baseExistingTxn({
                status: "refunded",
                fulfillmentStatus: undefined,
            }),
            incoming: baseIncoming(),
        });
        assert.equal(result.action, "manual_review");
        assert.equal(result.reason, "existing_status_refunded");
    });

    it("classifies failed as manual_review (conservative)", () => {
        const result = classifyExistingTransaction({
            existingTxn: baseExistingTxn({
                status: "failed",
                fulfillmentStatus: undefined,
            }),
            incoming: baseIncoming(),
        });
        assert.equal(result.action, "manual_review");
        assert.equal(result.reason, "existing_status_failed");
    });

    it("classifies pending as manual_review (conservative)", () => {
        const result = classifyExistingTransaction({
            existingTxn: baseExistingTxn({
                status: "pending",
                fulfillmentStatus: undefined,
            }),
            incoming: baseIncoming(),
        });
        assert.equal(result.action, "manual_review");
        assert.equal(result.reason, "existing_status_pending");
    });

    it("duplicate-identity classification ignores current entitlement state entirely", () => {
        // A row identical in identity but whose surrounding entitlement fields
        // look "expired" or "downgraded" must still classify purely on
        // status/fulfillmentStatus, never on current User/Card state.
        const existingTxn = baseExistingTxn({
            status: "paid",
            fulfillmentStatus: "fulfilled",
            entitlementAppliedUntil: new Date("2020-01-01"),
        });
        const result = classifyExistingTransaction({
            existingTxn,
            incoming: baseIncoming(),
        });
        assert.deepEqual(result, { action: "idempotent_success" });
    });
});

describe("buildCardFulfillmentFilters", () => {
    it("pins _id, user, and PERSONAL-scope $or for both variants", () => {
        const filters = buildCardFulfillmentFilters({
            cardId: CARD_ID,
            userId: USER_ID,
            personalOrgId: PERSONAL_ORG_ID,
        });

        for (const variant of [filters.objectVariant, filters.nullVariant]) {
            assert.equal(variant._id, CARD_ID);
            assert.equal(variant.user, USER_ID);
            const scopeOr = variant.$and[0].$or;
            assert.deepEqual(scopeOr, [
                { orgId: { $exists: false } },
                { orgId: null },
                { orgId: PERSONAL_ORG_ID },
            ]);
        }
    });

    it("objectVariant matches missing/object billing shapes only", () => {
        const filters = buildCardFulfillmentFilters({
            cardId: CARD_ID,
            userId: USER_ID,
            personalOrgId: PERSONAL_ORG_ID,
        });
        assert.deepEqual(filters.objectVariant.$and[1].$or, [
            { billing: { $exists: false } },
            { billing: { $type: "object" } },
        ]);
    });

    it("nullVariant matches explicit billing:null only", () => {
        const filters = buildCardFulfillmentFilters({
            cardId: CARD_ID,
            userId: USER_ID,
            personalOrgId: PERSONAL_ORG_ID,
        });
        assert.deepEqual(filters.nullVariant.$and[1], { billing: null });
    });
});

describe("buildPaymentIntentClaimFilter", () => {
    it("pins _id, userId, plan, amountAgorot, status:pending, and checkoutExpiresAt gate", () => {
        const filter = buildPaymentIntentClaimFilter({
            paymentIntentId: PAYMENT_INTENT_ID,
            userId: USER_ID,
            plan: "monthly",
            amountAgorot: 3900,
            now: NOW,
        });
        assert.deepEqual(filter, {
            _id: PAYMENT_INTENT_ID,
            userId: USER_ID,
            plan: "monthly",
            amountAgorot: 3900,
            status: "pending",
            checkoutExpiresAt: { $gt: NOW },
        });
    });
});

describe("buildPaymentIntentManualReviewFilter", () => {
    it("pins the same identity fields but omits checkoutExpiresAt", () => {
        const filter = buildPaymentIntentManualReviewFilter({
            paymentIntentId: PAYMENT_INTENT_ID,
            userId: USER_ID,
            plan: "monthly",
            amountAgorot: 3900,
        });
        assert.deepEqual(filter, {
            _id: PAYMENT_INTENT_ID,
            userId: USER_ID,
            plan: "monthly",
            amountAgorot: 3900,
            status: "pending",
        });
        assert.equal("checkoutExpiresAt" in filter, false);
    });
});

describe("buildPaymentIntentCompletionFilter", () => {
    it("pins _id and status:consuming only", () => {
        const filter = buildPaymentIntentCompletionFilter({
            paymentIntentId: PAYMENT_INTENT_ID,
        });
        assert.deepEqual(filter, {
            _id: PAYMENT_INTENT_ID,
            status: "consuming",
        });
    });
});

describe("classifyFulfillmentTransactionError", () => {
    it("classifies a duplicate-key error (code 11000) as concurrent_duplicate", () => {
        assert.equal(
            classifyFulfillmentTransactionError({ code: 11000 }),
            "concurrent_duplicate",
        );
    });

    it("classifies any other error as transient", () => {
        assert.equal(
            classifyFulfillmentTransactionError({ code: 112 }),
            "transient",
        );
        assert.equal(
            classifyFulfillmentTransactionError(new Error("network")),
            "transient",
        );
    });
});

describe("deriveProviderTxnId / deriveStoProviderTxnId — unchanged (Step 2 frozen item 12/R)", () => {
    it("deriveProviderTxnId still prefixes first-payment ids with tranzila:", () => {
        const id = deriveProviderTxnId({ index: "12345" });
        assert.match(id, /^tranzila:/);
    });

    it("deriveStoProviderTxnId still prefixes STO ids with sto: and requires sto_external_id", () => {
        const id = deriveStoProviderTxnId({
            sto_external_id: "ext-1",
            index: "999",
        });
        assert.match(id, /^sto:/);
    });

    it("deriveProviderTxnId and deriveStoProviderTxnId namespaces never collide", () => {
        const firstPaymentId = deriveProviderTxnId({ index: "1" });
        const stoId = deriveStoProviderTxnId({
            sto_external_id: "ext-1",
            index: "1",
        });
        assert.notEqual(firstPaymentId, stoId);
        assert.ok(firstPaymentId.startsWith("tranzila:"));
        assert.ok(stoId.startsWith("sto:"));
    });
});
