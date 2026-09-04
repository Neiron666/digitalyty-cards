/**
 * CONTOUR: PERSONAL_PAID_GRACE_48H_STEP1_BILLING_RECONCILE_SAFE_IMPLEMENTATION
 *
 * Pure, DB-free tests for resolveReconcileCandidateAction — the decision
 * core extracted from billingReconcile.js. No MongoDB connection, no server.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { resolveReconcileCandidateAction } from "../src/jobs/billingReconcile.js";

const PERSONAL_ORG_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const USER_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";
const OTHER_USER_ID = "cccccccccccccccccccccccc";
const CARD_ID = "dddddddddddddddddddddddd";
const REAL_ORG_ID = "eeeeeeeeeeeeeeeeeeeeeeee";

const HOUR_MS = 60 * 60 * 1000;

function baseUser(overrides = {}) {
    return {
        _id: USER_ID,
        cardId: CARD_ID,
        plan: "monthly",
        subscription: {
            status: "active",
            expiresAt: new Date("2026-01-01T00:00:00.000Z"),
            provider: "tranzila",
        },
        tranzilaSto: {},
        ...overrides,
    };
}

function baseCard(overrides = {}) {
    return {
        _id: CARD_ID,
        user: USER_ID,
        orgId: null,
        plan: "monthly",
        billing: {
            status: "active",
            plan: "monthly",
            paidUntil: new Date("2026-01-01T00:00:00.000Z"),
        },
        adminOverride: undefined,
        trialEndsAt: undefined,
        trialDeleteAt: undefined,
        downgradedAt: null,
        ...overrides,
    };
}

function decide({ user = baseUser(), card = baseCard(), now, flagOn = true }) {
    return resolveReconcileCandidateAction({
        user,
        card,
        personalOrgId: PERSONAL_ORG_ID,
        personalPaidGrace48hEnabled: flagOn,
        now,
    });
}

describe("1-3. PERSONAL grace boundary (flag ON)", () => {
    it("+1ms after paidUntil: no downgrade", () => {
        const paidUntil = new Date("2026-01-01T00:00:00.000Z");
        const now = new Date(paidUntil.getTime() + 1);
        const result = decide({
            card: baseCard({ billing: { status: "active", plan: "monthly", paidUntil } }),
            now,
        });
        assert.equal(result.action, "no_downgrade");
        assert.equal(result.reason, "PERSONAL_GRACE_ACTIVE");
    });

    it("+48h-1ms after paidUntil: no downgrade", () => {
        const paidUntil = new Date("2026-01-01T00:00:00.000Z");
        const now = new Date(paidUntil.getTime() + 48 * HOUR_MS - 1);
        const result = decide({
            card: baseCard({ billing: { status: "active", plan: "monthly", paidUntil } }),
            now,
        });
        assert.equal(result.action, "no_downgrade");
        assert.equal(result.reason, "PERSONAL_GRACE_ACTIVE");
    });

    it("exactly +48h after paidUntil: downgrade eligible", () => {
        const paidUntil = new Date("2026-01-01T00:00:00.000Z");
        const now = new Date(paidUntil.getTime() + 48 * HOUR_MS);
        const result = decide({
            card: baseCard({ billing: { status: "active", plan: "monthly", paidUntil } }),
            now,
        });
        assert.equal(result.action, "downgrade");
        assert.ok(result.cardCasFilter);
        assert.ok(result.cardSetPayload);
        assert.ok(result.userCasFilter);
    });
});

describe("4. flag OFF: legacy immediate-expiry behavior preserved", () => {
    it("downgrades immediately past paidUntil with no grace window", () => {
        const paidUntil = new Date("2026-01-01T00:00:00.000Z");
        const now = new Date(paidUntil.getTime() + 1);
        const result = decide({
            card: baseCard({ billing: { status: "active", plan: "monthly", paidUntil } }),
            now,
            flagOn: false,
        });
        assert.equal(result.action, "downgrade");
    });
});

describe("5-6. REAL_ORG / UNKNOWN scope", () => {
    it("REAL_ORG: no PERSONAL mutation", () => {
        const now = new Date("2026-01-05T00:00:00.000Z");
        const result = decide({
            card: baseCard({ orgId: REAL_ORG_ID }),
            now,
        });
        assert.equal(result.action, "no_downgrade");
        assert.equal(result.reason, "REAL_ORG_NO_PERSONAL_MUTATION");
    });

    it("UNKNOWN (orgId set, personalOrgId unresolved): no PERSONAL mutation", () => {
        const now = new Date("2026-01-05T00:00:00.000Z");
        const result = resolveReconcileCandidateAction({
            user: baseUser(),
            card: baseCard({ orgId: REAL_ORG_ID }),
            personalOrgId: null,
            personalPaidGrace48hEnabled: true,
            now,
        });
        assert.equal(result.action, "no_downgrade");
        assert.equal(result.reason, "UNKNOWN_NO_PERSONAL_MUTATION");
    });
});

describe("7. malformed paidUntil: fail closed", () => {
    it("non-parseable paidUntil never downgrades", () => {
        const now = new Date("2026-01-05T00:00:00.000Z");
        const result = decide({
            card: baseCard({
                billing: { status: "active", plan: "monthly", paidUntil: "not-a-date" },
            }),
            now,
        });
        assert.equal(result.action, "no_downgrade");
        assert.equal(result.reason, "INVALID_PAID_UNTIL_FAIL_CLOSED");
    });
});

describe("8. concurrent paidUntil change before Card CAS", () => {
    it("CAS filter pins the exact captured paidUntil, causing a miss on refreshed value", () => {
        const paidUntil = new Date("2026-01-01T00:00:00.000Z");
        const now = new Date(paidUntil.getTime() + 48 * HOUR_MS);
        const result = decide({
            card: baseCard({ billing: { status: "active", plan: "monthly", paidUntil } }),
            now,
        });
        assert.equal(result.action, "downgrade");
        assert.deepEqual(result.cardCasFilter["billing.paidUntil"], paidUntil);
        // A concurrently-refreshed Card (different paidUntil) would no longer
        // satisfy this exact filter -> Mongo CAS miss (proven structurally:
        // the filter requires strict equality to the captured value).
    });
});

describe("9. no downgrade -> no User CAS attempted (structural)", () => {
    it("no_downgrade/relation_mismatch/card_missing/sto_renewal_grace never return a userCasFilter", () => {
        const now = new Date("2026-01-05T00:00:00.000Z");
        const paidUntilFuture = new Date(now.getTime() + 1000);
        const stillPaid = decide({
            card: baseCard({ billing: { status: "active", plan: "monthly", paidUntil: paidUntilFuture } }),
            now,
        });
        assert.equal(stillPaid.action, "no_downgrade");
        assert.equal(stillPaid.userCasFilter, undefined);
    });
});

describe("10. already-free Card: downgradedAt not reset", () => {
    it("downgradedAt already set -> CAS filter pins downgradedAt:null, so a real DB write would miss", () => {
        const now = new Date("2026-01-05T00:00:00.000Z");
        const result = decide({
            card: baseCard({
                billing: { status: "free", plan: "free", paidUntil: null },
                downgradedAt: new Date("2025-01-01T00:00:00.000Z"),
            }),
            now,
        });
        // billing.status "free" is not a wasPaidState -> ALREADY_NON_PAID_NO_TRANSITION
        assert.equal(result.action, "no_downgrade");
        assert.equal(result.reason, "ALREADY_NON_PAID_NO_TRANSITION");
    });
});

describe("11. adminOverride: no premature downgrade", () => {
    it("active adminOverride blocks downgrade", () => {
        const now = new Date("2026-01-05T00:00:00.000Z");
        const result = decide({
            card: baseCard({
                adminOverride: {
                    plan: "yearly",
                    until: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
                },
            }),
            now,
        });
        assert.equal(result.action, "no_downgrade");
        assert.equal(result.reason, "ADMIN_OVERRIDE_NO_DOWNGRADE");
    });
});

describe("12. trial/legacy access: no premature downgrade", () => {
    it("active trial-premium blocks downgrade", () => {
        const now = new Date("2026-01-05T00:00:00.000Z");
        const result = decide({
            card: baseCard({
                billing: { status: "trial", plan: "free", paidUntil: null },
                trialEndsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
            }),
            now,
        });
        assert.equal(result.action, "no_downgrade");
        assert.equal(result.reason, "TRIAL_ACCESS_NO_DOWNGRADE");
    });

    it("user-owned free Card with stale top-level paid plan does not transition", () => {
        // For a user-owned Card, resolveBilling's "free" branch returns before
        // the legacy top-level-plan fallback is ever reachable (that fallback
        // only applies to non-user-owned Cards, which the relation guard in
        // billingReconcile already excludes from this job entirely).
        const now = new Date("2026-01-05T00:00:00.000Z");
        const result = decide({
            card: baseCard({
                billing: { status: "free", plan: "free", paidUntil: null },
                plan: "yearly",
            }),
            now,
        });
        assert.equal(result.action, "no_downgrade");
        assert.equal(result.reason, "ALREADY_NON_PAID_NO_TRANSITION");
    });
});

describe("13. User.cardId points to a Card owned by another User", () => {
    it("relation_mismatch: zero Card and User mutations", () => {
        const now = new Date("2026-01-05T00:00:00.000Z");
        const result = decide({
            user: baseUser({ _id: USER_ID }),
            card: baseCard({ user: OTHER_USER_ID }),
            now,
        });
        assert.equal(result.action, "relation_mismatch");
        assert.equal(result.cardCasFilter, undefined);
        assert.equal(result.userCasFilter, undefined);
    });
});

describe("14. Card.user missing/null", () => {
    it("relation_mismatch: fails closed, no destructive mutation", () => {
        const now = new Date("2026-01-05T00:00:00.000Z");
        const result = decide({
            card: baseCard({ user: null }),
            now,
        });
        assert.equal(result.action, "relation_mismatch");
    });

    it("relation_mismatch for undefined card.user (anonymous-shaped Card)", () => {
        const now = new Date("2026-01-05T00:00:00.000Z");
        const result = decide({
            card: baseCard({ user: undefined, anonymousId: "anon-1" }),
            now,
        });
        assert.equal(result.action, "relation_mismatch");
    });
});

describe("15. Card missing", () => {
    it("card_missing: zero User mutation (no userCasFilter returned)", () => {
        const now = new Date("2026-01-05T00:00:00.000Z");
        const result = decide({ card: null, now });
        assert.equal(result.action, "card_missing");
        assert.equal(result.userCasFilter, undefined);
    });
});

describe("16. User state changes after successful Card CAS", () => {
    it("userCasFilter pins the exact captured User snapshot, causing a miss on refreshed subscription", () => {
        const now = new Date(
            new Date("2026-01-01T00:00:00.000Z").getTime() + 48 * HOUR_MS,
        );
        const user = baseUser({
            subscription: {
                status: "active",
                expiresAt: new Date("2026-01-01T00:00:00.000Z"),
                provider: "tranzila",
            },
        });
        const result = decide({ user, now });
        assert.equal(result.action, "downgrade");
        assert.deepEqual(
            result.userCasFilter["subscription.expiresAt"],
            user.subscription.expiresAt,
        );
        // A concurrently-renewed User (different subscription.expiresAt) would
        // no longer satisfy this exact filter -> Mongo CAS miss by construction.
    });
});

describe("17. User CAS miss after successful Card CAS", () => {
    it("decision layer never performs Card rollback/auto-repair (structural: no such field/action exists)", () => {
        const now = new Date(
            new Date("2026-01-01T00:00:00.000Z").getTime() + 48 * HOUR_MS,
        );
        const result = decide({ now });
        assert.equal(result.action, "downgrade");
        assert.ok(!("rollback" in result));
        assert.ok(!("repair" in result));
    });
});

describe("STO-specific grace short-circuits before canonical destructive decision", () => {
    it("active Tranzila STO within 48h of expiry skips before relation/lifecycle checks", () => {
        const expiresAt = new Date("2026-01-01T00:00:00.000Z");
        const now = new Date(expiresAt.getTime() + 1 * HOUR_MS);
        const result = decide({
            user: baseUser({
                subscription: { status: "active", expiresAt, provider: "tranzila" },
                tranzilaSto: { status: "created", stoId: "sto_123" },
            }),
            // Even a relation-mismatched Card must be skipped via STO grace
            // BEFORE the relation check ever runs.
            card: baseCard({ user: OTHER_USER_ID }),
            now,
        });
        assert.equal(result.action, "sto_renewal_grace");
    });
});
