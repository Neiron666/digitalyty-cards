import test from "node:test";
import assert from "node:assert/strict";
import { resolveAiFeaturePlan } from "../src/services/aiFeaturePlan.service.js";
import { resolveEffectiveTier } from "../src/utils/tier.js";
import { planFromTier } from "../src/utils/cardDTO.js";

const NOW = new Date("2026-08-06T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

function makeDeps(overrides = {}) {
    const events = [];
    const base = {
        resolveHttpEffectiveBilling: async (card, now) => {
            events.push("effectiveBilling");
            return { source: "free", isPaid: false, plan: "free" };
        },
        findUserAdminTierForBilling: async (userId) => {
            events.push("userLookup");
            return { adminTier: null, adminTierUntil: null };
        },
        resolveEffectiveTier: (args) => {
            events.push("tierResolution");
            return resolveEffectiveTier(args);
        },
        planFromTier,
    };
    return { deps: Object.freeze({ ...base, ...overrides }), events };
}

test("1. missing userId returns exactly free/unknown and calls zero dependencies", async () => {
    const { deps, events } = makeDeps({
        resolveHttpEffectiveBilling: async () => {
            throw new Error("must not be called");
        },
        findUserAdminTierForBilling: async () => {
            throw new Error("must not be called");
        },
        resolveEffectiveTier: () => {
            throw new Error("must not be called");
        },
        planFromTier: () => {
            throw new Error("must not be called");
        },
    });
    const card = { _id: "c1", orgId: null };
    const result = await resolveAiFeaturePlan(card, null, NOW, deps);
    assert.deepEqual(result, { plan: "free", billingSource: "unknown" });
    assert.deepEqual(events, []);
});

test("2. same Card and now references forwarded to resolveHttpEffectiveBilling", async () => {
    let receivedCard = null;
    let receivedNow = null;
    const card = { _id: "c2", orgId: null };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async (cardArg, nowArg) => {
            receivedCard = cardArg;
            receivedNow = nowArg;
            return { source: "free", isPaid: false, plan: "free" };
        },
    });
    await resolveAiFeaturePlan(card, "u2", NOW, deps);
    assert.equal(receivedCard, card);
    assert.equal(receivedNow, NOW);
});

test("3. resolveHttpEffectiveBilling is called exactly once", async () => {
    let callCount = 0;
    const card = { _id: "c3", orgId: null };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => {
            callCount += 1;
            return { source: "free", isPaid: false, plan: "free" };
        },
    });
    await resolveAiFeaturePlan(card, "u3", NOW, deps);
    assert.equal(callCount, 1);
});

test("4. User lookup is called exactly once with the exact userId", async () => {
    let callCount = 0;
    let receivedUserId = null;
    const card = { _id: "c4", orgId: null };
    const { deps } = makeDeps({
        findUserAdminTierForBilling: async (userId) => {
            callCount += 1;
            receivedUserId = userId;
            return { adminTier: null, adminTierUntil: null };
        },
    });
    await resolveAiFeaturePlan(card, "u4", NOW, deps);
    assert.equal(callCount, 1);
    assert.equal(receivedUserId, "u4");
});

test("5. general-result event order is effectiveBilling,userLookup,tierResolution,returnGeneral", async () => {
    const card = { _id: "c5", orgId: null };
    const { deps, events } = makeDeps();
    const result = await resolveAiFeaturePlan(card, "u5", NOW, deps);
    events.push(
        result.billingSource === "organization"
            ? "returnOrganization"
            : "returnGeneral",
    );
    assert.deepEqual(events, [
        "effectiveBilling",
        "userLookup",
        "tierResolution",
        "returnGeneral",
    ]);
});

test("6. Organization-result event order is effectiveBilling,userLookup,tierResolution,returnOrganization", async () => {
    const card = { _id: "c6", orgId: "org1" };
    const { deps, events } = makeDeps({
        resolveHttpEffectiveBilling: async () => {
            events.push("effectiveBilling");
            return { source: "organization", isPaid: true, plan: "org" };
        },
    });
    const result = await resolveAiFeaturePlan(card, "u6", NOW, deps);
    events.push(
        result.billingSource === "organization"
            ? "returnOrganization"
            : "returnGeneral",
    );
    assert.deepEqual(events, [
        "effectiveBilling",
        "userLookup",
        "tierResolution",
        "returnOrganization",
    ]);
});

test("7. Organization result still performs the User lookup", async () => {
    let userLookupCallCount = 0;
    const card = { _id: "c7", orgId: "org1" };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => ({
            source: "organization",
            isPaid: true,
            plan: "org",
        }),
        findUserAdminTierForBilling: async () => {
            userLookupCallCount += 1;
            return { adminTier: null, adminTierUntil: null };
        },
    });
    await resolveAiFeaturePlan(card, "u7", NOW, deps);
    assert.equal(userLookupCallCount, 1);
});

test("8. Organization result still performs resolveEffectiveTier", async () => {
    let tierResolutionCallCount = 0;
    const card = { _id: "c8", orgId: "org1" };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => ({
            source: "organization",
            isPaid: true,
            plan: "org",
        }),
        resolveEffectiveTier: (args) => {
            tierResolutionCallCount += 1;
            return resolveEffectiveTier(args);
        },
    });
    await resolveAiFeaturePlan(card, "u8", NOW, deps);
    assert.equal(tierResolutionCallCount, 1);
});

test("9. Organization final result is exactly plan:org, billingSource:organization", async () => {
    const card = { _id: "c9", orgId: "org1" };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => ({
            source: "organization",
            isPaid: true,
            plan: "org",
        }),
    });
    const result = await resolveAiFeaturePlan(card, "u9", NOW, deps);
    assert.deepEqual(result, { plan: "org", billingSource: "organization" });
});

test("10. PERSONAL grace-shaped effective billing produces the current non-free AI result", async () => {
    const card = { _id: "c10", orgId: null };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => ({
            source: "billing",
            isPaid: true,
            isInPaidGrace: true,
            plan: "monthly",
        }),
    });
    const result = await resolveAiFeaturePlan(card, "u10", NOW, deps);
    assert.notEqual(result.billingSource, "free");
    assert.equal(result.plan, "yearly");
});

test("11. flag-OFF/free-shaped effective billing returns exactly free/free", async () => {
    const card = { _id: "c11", orgId: null };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => ({
            source: "free",
            isPaid: false,
            plan: "free",
        }),
    });
    const result = await resolveAiFeaturePlan(card, "u11", NOW, deps);
    assert.deepEqual(result, { plan: "free", billingSource: "free" });
});

test("12. expired REAL_ORG/no-org-entitlement-shaped result remains free", async () => {
    const card = { _id: "c12", orgId: "org1" };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => ({
            source: "free",
            isPaid: false,
            plan: "free",
        }),
    });
    const result = await resolveAiFeaturePlan(card, "u12", NOW, deps);
    assert.equal(result.plan, "free");
    assert.equal(result.billingSource, "free");
});

test("13. expired UNKNOWN-shaped result remains free", async () => {
    const card = { _id: "c13", orgId: "org1" };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => ({
            source: "free",
            isPaid: false,
            plan: "free",
        }),
    });
    const result = await resolveAiFeaturePlan(card, "u13", NOW, deps);
    assert.equal(result.plan, "free");
    assert.equal(result.billingSource, "free");
});

test("14. future-paid REAL_ORG result remains billing-derived and non-free", async () => {
    const card = { _id: "c14", orgId: "org1" };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => ({
            source: "billing",
            isPaid: true,
            plan: "monthly",
        }),
    });
    const result = await resolveAiFeaturePlan(card, "u14", NOW, deps);
    assert.notEqual(result.billingSource, "free");
    assert.equal(result.plan, "yearly");
});

test("15. future-paid UNKNOWN result remains billing-derived and non-free", async () => {
    const card = { _id: "c15", orgId: "org1" };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => ({
            source: "billing",
            isPaid: true,
            plan: "monthly",
        }),
    });
    const result = await resolveAiFeaturePlan(card, "u15", NOW, deps);
    assert.notEqual(result.billingSource, "free");
    assert.equal(result.plan, "yearly");
});

test("16. active User adminTier with free effective billing returns plan:yearly, billingSource:free", async () => {
    const card = { _id: "c16", orgId: null };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => ({
            source: "free",
            isPaid: false,
            plan: "free",
        }),
        findUserAdminTierForBilling: async () => ({
            adminTier: "premium",
            adminTierUntil: new Date(NOW.getTime() + 24 * HOUR_MS),
        }),
    });
    const result = await resolveAiFeaturePlan(card, "u16", NOW, deps);
    assert.deepEqual(result, { plan: "yearly", billingSource: "free" });
});

test("17. expired User adminTier with free effective billing does not override", async () => {
    const card = { _id: "c17", orgId: null };
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => ({
            source: "free",
            isPaid: false,
            plan: "free",
        }),
        findUserAdminTierForBilling: async () => ({
            adminTier: "premium",
            adminTierUntil: new Date(NOW.getTime() - 24 * HOUR_MS),
        }),
    });
    const result = await resolveAiFeaturePlan(card, "u17", NOW, deps);
    assert.deepEqual(result, { plan: "free", billingSource: "free" });
});

test("18. resolveHttpEffectiveBilling rejection propagates, User lookup and tier resolution not called", async () => {
    const card = { _id: "c18", orgId: null };
    const expectedError = new Error("effective-billing failure c18");
    let userLookupCallCount = 0;
    let tierResolutionCallCount = 0;
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => {
            throw expectedError;
        },
        findUserAdminTierForBilling: async () => {
            userLookupCallCount += 1;
            return { adminTier: null, adminTierUntil: null };
        },
        resolveEffectiveTier: (args) => {
            tierResolutionCallCount += 1;
            return resolveEffectiveTier(args);
        },
    });
    await assert.rejects(
        () => resolveAiFeaturePlan(card, "u18", NOW, deps),
        (err) => err === expectedError,
    );
    assert.equal(userLookupCallCount, 0);
    assert.equal(tierResolutionCallCount, 0);
});

test("19. User-lookup rejection propagates after exactly one effective-billing call, tier resolution not called", async () => {
    const card = { _id: "c19", orgId: null };
    const expectedError = new Error("user lookup failure c19");
    let effectiveBillingCallCount = 0;
    let tierResolutionCallCount = 0;
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => {
            effectiveBillingCallCount += 1;
            return { source: "free", isPaid: false, plan: "free" };
        },
        findUserAdminTierForBilling: async () => {
            throw expectedError;
        },
        resolveEffectiveTier: (args) => {
            tierResolutionCallCount += 1;
            return resolveEffectiveTier(args);
        },
    });
    await assert.rejects(
        () => resolveAiFeaturePlan(card, "u19", NOW, deps),
        (err) => err === expectedError,
    );
    assert.equal(effectiveBillingCallCount, 1);
    assert.equal(tierResolutionCallCount, 0);
});

test("20. returned value leaks no internal fields; Card, now, org-like result and deps are not mutated", async () => {
    const card = Object.freeze({ _id: "c20", orgId: null });
    const orgLikeResult = Object.freeze({
        source: "organization",
        isPaid: true,
        plan: "org",
        _id: "org20",
    });
    const { deps } = makeDeps({
        resolveHttpEffectiveBilling: async () => orgLikeResult,
    });
    const nowSnapshot = new Date(NOW.getTime());
    const result = await resolveAiFeaturePlan(card, "u20", NOW, deps);

    assert.equal(Object.prototype.hasOwnProperty.call(result, "billingScope"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result, "billingContext"), false);
    assert.equal(
        Object.prototype.hasOwnProperty.call(result, "personalPaidGrace48hEnabled"),
        false,
    );
    assert.equal(Object.prototype.hasOwnProperty.call(result, "personalOrgId"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result, "org"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result, "effectiveBilling"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result, "effectiveTier"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result, "user"), false);
    assert.deepEqual(Object.keys(result).sort(), ["billingSource", "plan"]);

    assert.deepEqual(card, { _id: "c20", orgId: null });
    assert.equal(NOW.getTime(), nowSnapshot.getTime());
    assert.deepEqual(orgLikeResult, {
        source: "organization",
        isPaid: true,
        plan: "org",
        _id: "org20",
    });
});

test("21. resolveEffectiveTier synchronous throw propagates; planFromTier not called; no free fallback", async () => {
    const card = { _id: "c21", orgId: null };
    const expectedError = new Error("tier resolution failure c21");
    let planFromTierCallCount = 0;
    const { deps } = makeDeps({
        resolveEffectiveTier: () => {
            throw expectedError;
        },
        planFromTier: (tier) => {
            planFromTierCallCount += 1;
            return planFromTier(tier);
        },
    });
    await assert.rejects(
        () => resolveAiFeaturePlan(card, "u21", NOW, deps),
        (err) => err === expectedError,
    );
    assert.equal(planFromTierCallCount, 0);
});

test("22. planFromTier synchronous throw propagates; no free fallback", async () => {
    const card = { _id: "c22", orgId: null };
    const expectedError = new Error("planFromTier failure c22");
    const { deps } = makeDeps({
        planFromTier: () => {
            throw expectedError;
        },
    });
    await assert.rejects(
        () => resolveAiFeaturePlan(card, "u22", NOW, deps),
        (err) => err === expectedError,
    );
});
