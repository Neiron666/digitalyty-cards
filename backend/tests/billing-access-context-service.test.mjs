import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveHttpEffectiveBilling } from "../src/services/billingAccessContext.service.js";
import { resolveEffectiveBilling as realResolveEffectiveBilling } from "../src/utils/cardDTO.js";

const NOW = new Date("2026-08-06T12:00:00.000Z");
const H = 60 * 60 * 1000;
const PERSONAL_SENTINEL_ID = "sentinel-org-1";
const REAL_ORG_ID = "org-real-1";

function personalCard({ orgId, status, plan, paidUntil } = {}) {
    return {
        _id: "card1",
        user: "user1",
        orgId: orgId ?? null,
        billing: {
            status: status ?? "free",
            plan: plan ?? "free",
            paidUntil: paidUntil ?? null,
        },
    };
}

function counter() {
    const fn = (...args) => {
        fn.calls.push(args);
        return fn.impl(...args);
    };
    fn.calls = [];
    fn.impl = () => undefined;
    return fn;
}

function snapshot(value) {
    return JSON.stringify(value);
}

function makeDeps(overrides = {}) {
    const getPersonalOrgIdReadOnly = counter();
    getPersonalOrgIdReadOnly.impl = async () => PERSONAL_SENTINEL_ID;

    const classifyBillingScope = counter();
    classifyBillingScope.impl = () => "PERSONAL";

    const isPersonalPaidGrace48hEnabled = counter();
    isPersonalPaidGrace48hEnabled.impl = () => false;

    const findOrganizationByIdForBilling = counter();
    findOrganizationByIdForBilling.impl = async () => null;

    const resolveEffectiveBilling = counter();
    resolveEffectiveBilling.impl = () => ({ source: "free", isPaid: false });

    const deps = {
        getPersonalOrgIdReadOnly,
        classifyBillingScope,
        isPersonalPaidGrace48hEnabled,
        findOrganizationByIdForBilling,
        resolveEffectiveBilling,
    };

    for (const [key, impl] of Object.entries(overrides)) {
        deps[key].impl = impl;
    }

    return deps;
}

// --- 1. null/absent card.orgId ---
test("null/absent card.orgId: PERSONAL, zero Organization lookups, single resolver call", async () => {
    const card = personalCard({ orgId: null });
    const deps = makeDeps({
        classifyBillingScope: () => "PERSONAL",
    });

    await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(deps.getPersonalOrgIdReadOnly.calls.length, 1);
    assert.equal(deps.classifyBillingScope.calls.length, 1);
    assert.equal(deps.isPersonalPaidGrace48hEnabled.calls.length, 1);
    assert.equal(deps.findOrganizationByIdForBilling.calls.length, 0);
    assert.equal(deps.resolveEffectiveBilling.calls.length, 1);
    const [, , orgArg] = deps.resolveEffectiveBilling.calls[0];
    assert.equal(orgArg, null);
});

// --- 2. card.orgId equals personal sentinel ---
test("card.orgId equals personal sentinel: PERSONAL, zero Organization lookups, org null", async () => {
    const card = personalCard({ orgId: PERSONAL_SENTINEL_ID });
    const deps = makeDeps({
        classifyBillingScope: () => "PERSONAL",
    });

    await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(deps.findOrganizationByIdForBilling.calls.length, 0);
    const [, , orgArg] = deps.resolveEffectiveBilling.calls[0];
    assert.equal(orgArg, null);
});

// --- 3. REAL_ORG ---
test("REAL_ORG: exactly one Organization lookup, exact orgId, org supplied, scope supplied", async () => {
    const card = personalCard({ orgId: REAL_ORG_ID });
    const fakeOrg = { _id: REAL_ORG_ID, isActive: true, orgEntitlement: null };
    const deps = makeDeps({
        classifyBillingScope: () => "REAL_ORG",
        findOrganizationByIdForBilling: async (orgId) => {
            assert.equal(orgId, REAL_ORG_ID);
            return fakeOrg;
        },
    });

    await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(deps.findOrganizationByIdForBilling.calls.length, 1);
    assert.equal(deps.findOrganizationByIdForBilling.calls[0][0], REAL_ORG_ID);
    const [, , orgArg, contextArg] = deps.resolveEffectiveBilling.calls[0];
    assert.equal(orgArg, fakeOrg);
    assert.equal(contextArg.billingScope, "REAL_ORG");
});

// --- 4. sentinel missing plus non-null card.orgId ---
test("sentinel missing + non-null card.orgId: UNKNOWN, one Organization lookup, no personal grace manufactured", async () => {
    const card = personalCard({ orgId: REAL_ORG_ID });
    const deps = makeDeps({
        getPersonalOrgIdReadOnly: async () => null,
        classifyBillingScope: (c, personalOrgId) => {
            assert.equal(personalOrgId, null);
            return "UNKNOWN";
        },
    });

    await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(deps.findOrganizationByIdForBilling.calls.length, 1);
    const [, , , contextArg] = deps.resolveEffectiveBilling.calls[0];
    assert.equal(contextArg.billingScope, "UNKNOWN");
    assert.notEqual(contextArg.billingScope, "PERSONAL");
});

// --- 5. sentinel missing plus absent card.orgId ---
test("sentinel missing + absent card.orgId: PERSONAL, zero Organization lookups", async () => {
    const card = personalCard({ orgId: null });
    const deps = makeDeps({
        getPersonalOrgIdReadOnly: async () => null,
        classifyBillingScope: () => "PERSONAL",
    });

    await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(deps.findOrganizationByIdForBilling.calls.length, 0);
});

// --- 6. sentinel lookup rejects ---
test("sentinel lookup rejects: service rejects with same error; nothing downstream called", async () => {
    const card = personalCard({ orgId: null });
    const boom = new Error("sentinel infra failure");
    const deps = makeDeps({
        getPersonalOrgIdReadOnly: async () => {
            throw boom;
        },
    });

    await assert.rejects(
        () => resolveHttpEffectiveBilling(card, NOW, deps),
        (err) => err === boom,
    );

    assert.equal(deps.isPersonalPaidGrace48hEnabled.calls.length, 0);
    assert.equal(deps.findOrganizationByIdForBilling.calls.length, 0);
    assert.equal(deps.resolveEffectiveBilling.calls.length, 0);
});

// --- 7. Organization lookup rejects ---
test("Organization lookup rejects: service rejects with same error; resolver not called", async () => {
    const card = personalCard({ orgId: REAL_ORG_ID });
    const boom = new Error("organization infra failure");
    const deps = makeDeps({
        classifyBillingScope: () => "REAL_ORG",
        findOrganizationByIdForBilling: async () => {
            throw boom;
        },
    });

    await assert.rejects(
        () => resolveHttpEffectiveBilling(card, NOW, deps),
        (err) => err === boom,
    );

    assert.equal(deps.resolveEffectiveBilling.calls.length, 0);
});

// --- 8. flag false and flag true ---
test("flag false and flag true: exact boolean forwarded, exactly one evaluation per call", async () => {
    const card = personalCard({ orgId: null });

    const depsFalse = makeDeps({
        classifyBillingScope: () => "PERSONAL",
        isPersonalPaidGrace48hEnabled: () => false,
    });
    await resolveHttpEffectiveBilling(card, NOW, depsFalse);
    assert.equal(depsFalse.isPersonalPaidGrace48hEnabled.calls.length, 1);
    assert.equal(
        depsFalse.resolveEffectiveBilling.calls[0][3].personalPaidGrace48hEnabled,
        false,
    );

    const depsTrue = makeDeps({
        classifyBillingScope: () => "PERSONAL",
        isPersonalPaidGrace48hEnabled: () => true,
    });
    await resolveHttpEffectiveBilling(card, NOW, depsTrue);
    assert.equal(depsTrue.isPersonalPaidGrace48hEnabled.calls.length, 1);
    assert.equal(
        depsTrue.resolveEffectiveBilling.calls[0][3].personalPaidGrace48hEnabled,
        true,
    );
});

// --- Real-resolver cases (9-15) ---

function realDeps(overrides = {}) {
    const deps = makeDeps(overrides);
    deps.resolveEffectiveBilling.impl = realResolveEffectiveBilling;
    return deps;
}

// --- 9. PERSONAL expired one hour, flag ON ---
test("real resolver: PERSONAL expired 1h + flag ON grants personal grace", async () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({ status: "active", plan: "monthly", paidUntil });
    const deps = realDeps({
        classifyBillingScope: () => "PERSONAL",
        isPersonalPaidGrace48hEnabled: () => true,
    });

    const result = await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(result.isPaid, true);
    assert.equal(result.isInPaidGrace, true);
});

// --- 10. PERSONAL expired one hour, flag OFF ---
test("real resolver: PERSONAL expired 1h + flag OFF denies grace", async () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({ status: "active", plan: "monthly", paidUntil });
    const deps = realDeps({
        classifyBillingScope: () => "PERSONAL",
        isPersonalPaidGrace48hEnabled: () => false,
    });

    const result = await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(result.isPaid, false);
    assert.equal(result.isInPaidGrace, false);
});

// --- 11. REAL_ORG expired one hour, flag ON, no active org entitlement ---
test("real resolver: REAL_ORG expired 1h + flag ON denies personal grace", async () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({
        orgId: REAL_ORG_ID,
        status: "active",
        plan: "monthly",
        paidUntil,
    });
    const deps = realDeps({
        classifyBillingScope: () => "REAL_ORG",
        isPersonalPaidGrace48hEnabled: () => true,
        findOrganizationByIdForBilling: async () => null,
    });

    const result = await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(result.isPaid, false);
    assert.equal(result.isInPaidGrace, false);
});

// --- 12. UNKNOWN expired one hour, flag ON ---
test("real resolver: UNKNOWN expired 1h + flag ON denies personal grace", async () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({
        orgId: REAL_ORG_ID,
        status: "active",
        plan: "monthly",
        paidUntil,
    });
    const deps = realDeps({
        classifyBillingScope: () => "UNKNOWN",
        isPersonalPaidGrace48hEnabled: () => true,
        findOrganizationByIdForBilling: async () => null,
    });

    const result = await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(result.isPaid, false);
    assert.equal(result.isInPaidGrace, false);
});

// --- 13. REAL_ORG future paidUntil, no active org entitlement ---
test("real resolver: REAL_ORG future paidUntil keeps existing economic access", async () => {
    const paidUntil = new Date(NOW.getTime() + 1 * H).toISOString();
    const card = personalCard({
        orgId: REAL_ORG_ID,
        status: "active",
        plan: "monthly",
        paidUntil,
    });
    const deps = realDeps({
        classifyBillingScope: () => "REAL_ORG",
        findOrganizationByIdForBilling: async () => null,
    });

    const result = await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(result.source, "billing");
    assert.equal(result.isPaid, true);
});

// --- 14. UNKNOWN future paidUntil ---
test("real resolver: UNKNOWN future paidUntil keeps existing economic access", async () => {
    const paidUntil = new Date(NOW.getTime() + 1 * H).toISOString();
    const card = personalCard({
        orgId: REAL_ORG_ID,
        status: "active",
        plan: "monthly",
        paidUntil,
    });
    const deps = realDeps({
        classifyBillingScope: () => "UNKNOWN",
        findOrganizationByIdForBilling: async () => null,
    });

    const result = await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(result.source, "billing");
    assert.equal(result.isPaid, true);
});

// --- 15. active matching Organization entitlement wins ---
test("real resolver: active Organization entitlement wins before billing fallback", async () => {
    const paidUntil = new Date(NOW.getTime() + 1 * H).toISOString();
    const card = personalCard({
        orgId: REAL_ORG_ID,
        status: "active",
        plan: "monthly",
        paidUntil,
    });
    const activeOrg = {
        _id: REAL_ORG_ID,
        isActive: true,
        orgEntitlement: {
            status: "active",
            expiresAt: new Date(NOW.getTime() + 30 * 24 * H).toISOString(),
        },
    };
    const deps = realDeps({
        classifyBillingScope: () => "REAL_ORG",
        findOrganizationByIdForBilling: async () => activeOrg,
    });

    const result = await resolveHttpEffectiveBilling(card, NOW, deps);

    assert.equal(result.source, "organization");
});

// --- 16. no mutation of inputs ---
test("does not mutate card, now, injected dependencies or returned Organization", async () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({
        orgId: REAL_ORG_ID,
        status: "active",
        plan: "monthly",
        paidUntil,
    });
    const nowCopy = new Date(NOW.getTime());
    const activeOrg = {
        _id: REAL_ORG_ID,
        isActive: true,
        orgEntitlement: {
            status: "active",
            expiresAt: new Date(NOW.getTime() + 30 * 24 * H).toISOString(),
        },
    };
    const deps = realDeps({
        classifyBillingScope: () => "REAL_ORG",
        findOrganizationByIdForBilling: async () => activeOrg,
    });

    const cardBefore = snapshot(card);
    const nowBefore = nowCopy.getTime();
    const orgBefore = snapshot(activeOrg);

    await resolveHttpEffectiveBilling(card, nowCopy, deps);

    assert.equal(snapshot(card), cardBefore);
    assert.equal(nowCopy.getTime(), nowBefore);
    assert.equal(snapshot(activeOrg), orgBefore);
});

// --- 17. no scope/flag/wrapper leakage in the returned value ---
test("returned value contains no billingContext/billingScope/flag/personalOrgId/org wrapper keys", async () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({ status: "active", plan: "monthly", paidUntil });
    const deps = realDeps({
        classifyBillingScope: () => "PERSONAL",
        isPersonalPaidGrace48hEnabled: () => true,
    });

    const result = await resolveHttpEffectiveBilling(card, NOW, deps);

    for (const key of [
        "billingContext",
        "billingScope",
        "personalPaidGrace48hEnabled",
        "personalOrgId",
        "org",
    ]) {
        assert.equal(Object.prototype.hasOwnProperty.call(result, key), false);
    }
});
