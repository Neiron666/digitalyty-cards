import { test } from "node:test";
import assert from "node:assert/strict";
import {
    resolveEffectiveBilling,
    toCardDTO,
} from "../src/utils/cardDTO.js";

const NOW = new Date("2026-08-06T12:00:00.000Z");
const H = 60 * 60 * 1000;

function personalCard({ status, plan, paidUntil, orgId } = {}) {
    return {
        _id: "card1",
        user: "user1",
        orgId: orgId ?? null,
        plan: "free",
        status: "published",
        billing: {
            status: status ?? "free",
            plan: plan ?? "free",
            paidUntil: paidUntil ?? null,
        },
    };
}

function snapshot(value) {
    return JSON.stringify(value);
}

// --- 1. omitted options preserve economic-only behavior ---
test("resolveEffectiveBilling: omitted options equals explicit empty options", () => {
    const card = personalCard({ status: "free" });
    const a = resolveEffectiveBilling(card, NOW, null);
    const b = resolveEffectiveBilling(card, NOW, null, {});
    assert.deepEqual(a, b);
    assert.equal(a.isPaid, false);
    assert.equal(a.isInPaidGrace, false);
});

// --- 2. explicit {} preserves economic-only behavior ---
test("resolveEffectiveBilling: explicit {} options preserves economic-only behavior", () => {
    const card = personalCard({
        status: "active",
        plan: "monthly",
        paidUntil: new Date(NOW.getTime() - 1 * H).toISOString(),
    });
    const r = resolveEffectiveBilling(card, NOW, null, {});
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

// --- 3. null options fail closed without throwing ---
test("resolveEffectiveBilling: null options fail closed without throwing", () => {
    const card = personalCard({
        status: "active",
        plan: "monthly",
        paidUntil: new Date(NOW.getTime() - 1 * H).toISOString(),
    });
    let r;
    assert.doesNotThrow(() => {
        r = resolveEffectiveBilling(card, NOW, null, null);
    });
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
});

// --- 4. primitive/Array options fail closed ---
test("resolveEffectiveBilling: primitive and Array options fail closed", () => {
    const card = personalCard({
        status: "active",
        plan: "monthly",
        paidUntil: new Date(NOW.getTime() - 1 * H).toISOString(),
    });
    const primitives = ["x", 42, true, undefined, Symbol("s")];
    for (const prim of primitives) {
        let r;
        assert.doesNotThrow(() => {
            r = resolveEffectiveBilling(card, NOW, null, prim);
        });
        assert.equal(r.isPaid, false, `primitive ${String(prim)} must deny`);
        assert.equal(r.isInPaidGrace, false);
    }

    let arrResult;
    assert.doesNotThrow(() => {
        arrResult = resolveEffectiveBilling(card, NOW, null, [
            "PERSONAL",
            true,
        ]);
    });
    assert.equal(arrResult.isPaid, false);
    assert.equal(arrResult.isInPaidGrace, false);
});

// --- 5. throwing getter / Proxy options fail closed ---
test("resolveEffectiveBilling: throwing getter and Proxy options fail closed", () => {
    const card = personalCard({
        status: "active",
        plan: "monthly",
        paidUntil: new Date(NOW.getTime() - 1 * H).toISOString(),
    });

    const throwingGetterOptions = {
        get billingScope() {
            throw new Error("boom");
        },
        get personalPaidGrace48hEnabled() {
            throw new Error("boom");
        },
    };
    let r1;
    assert.doesNotThrow(() => {
        r1 = resolveEffectiveBilling(card, NOW, null, throwingGetterOptions);
    });
    assert.equal(r1.isPaid, false);
    assert.equal(r1.isInPaidGrace, false);

    const proxyOptions = new Proxy(
        {},
        {
            get() {
                throw new Error("proxy trap");
            },
        },
    );
    let r2;
    assert.doesNotThrow(() => {
        r2 = resolveEffectiveBilling(card, NOW, null, proxyOptions);
    });
    assert.equal(r2.isPaid, false);
    assert.equal(r2.isInPaidGrace, false);

    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    let r3;
    assert.doesNotThrow(() => {
        r3 = resolveEffectiveBilling(card, NOW, null, revocable.proxy);
    });
    assert.equal(r3.isPaid, false);
    assert.equal(r3.isInPaidGrace, false);
});

// --- 5b. selective-throw: billingScope getter throws, flag is plain true ---
test("resolveEffectiveBilling: billingScope getter throws while flag is plain true", () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({ status: "active", plan: "monthly", paidUntil });

    const options = {
        get billingScope() {
            throw new Error("billingScope getter throws");
        },
        personalPaidGrace48hEnabled: true,
    };

    let r;
    assert.doesNotThrow(() => {
        r = resolveEffectiveBilling(card, NOW, null, options);
    });
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

// --- 5c. selective-throw: billingScope is plain PERSONAL, flag getter throws ---
test("resolveEffectiveBilling: billingScope is plain PERSONAL while flag getter throws", () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({ status: "active", plan: "monthly", paidUntil });

    const options = {
        billingScope: "PERSONAL",
        get personalPaidGrace48hEnabled() {
            throw new Error("flag getter throws");
        },
    };

    let r;
    assert.doesNotThrow(() => {
        r = resolveEffectiveBilling(card, NOW, null, options);
    });
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

// --- 5d. selective-throw: Proxy throws only on billingScope, flag would be true ---
test("resolveEffectiveBilling: Proxy throws only when billingScope is read, flag would otherwise be true", () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({ status: "active", plan: "monthly", paidUntil });

    const target = { personalPaidGrace48hEnabled: true };
    const options = new Proxy(target, {
        get(obj, prop) {
            if (prop === "billingScope") {
                throw new Error("proxy throws on billingScope only");
            }
            return obj[prop];
        },
    });

    let r;
    assert.doesNotThrow(() => {
        r = resolveEffectiveBilling(card, NOW, null, options);
    });
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

// --- 5e. selective-throw: Proxy returns PERSONAL, throws only on flag read ---
test("resolveEffectiveBilling: Proxy returns PERSONAL for billingScope but throws only when flag is read", () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({ status: "active", plan: "monthly", paidUntil });

    const target = { billingScope: "PERSONAL" };
    const options = new Proxy(target, {
        get(obj, prop) {
            if (prop === "personalPaidGrace48hEnabled") {
                throw new Error("proxy throws on flag only");
            }
            return obj[prop];
        },
    });

    let r;
    assert.doesNotThrow(() => {
        r = resolveEffectiveBilling(card, NOW, null, options);
    });
    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

// --- 6. explicit PERSONAL + flag true grants grace ---
test("resolveEffectiveBilling: explicit PERSONAL scope + flag true grants grace inside 48h", () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({ status: "active", plan: "monthly", paidUntil });
    const before = snapshot(card);

    const r = resolveEffectiveBilling(card, NOW, null, {
        billingScope: "PERSONAL",
        personalPaidGrace48hEnabled: true,
    });

    assert.equal(r.isPaid, true);
    assert.equal(r.isInPaidGrace, true);
    assert.equal(
        r.effectiveAccessUntil,
        new Date(new Date(paidUntil).getTime() + 48 * H).toISOString(),
    );
    assert.equal(snapshot(card), before, "input Card must not be mutated");
});

// --- 7. REAL_ORG scope receives no personal grace ---
test("resolveEffectiveBilling: REAL_ORG scope receives no personal grace", () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({
        status: "active",
        plan: "monthly",
        paidUntil,
        orgId: "org1",
    });

    const r = resolveEffectiveBilling(card, NOW, null, {
        billingScope: "REAL_ORG",
        personalPaidGrace48hEnabled: true,
    });

    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

// --- 8. UNKNOWN scope receives no personal grace ---
test("resolveEffectiveBilling: UNKNOWN scope receives no personal grace", () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({ status: "active", plan: "monthly", paidUntil });

    const r = resolveEffectiveBilling(card, NOW, null, {
        billingScope: "UNKNOWN",
        personalPaidGrace48hEnabled: true,
    });

    assert.equal(r.isPaid, false);
    assert.equal(r.isInPaidGrace, false);
    assert.equal(r.effectiveAccessUntil, null);
});

// --- 9. active Organization entitlement still wins over PERSONAL options ---
test("resolveEffectiveBilling: active Organization entitlement wins over PERSONAL grace options", () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({
        status: "free",
        plan: "free",
        paidUntil,
        orgId: "org1",
    });
    const org = {
        _id: "org1",
        isActive: true,
        orgEntitlement: {
            status: "active",
            expiresAt: new Date(NOW.getTime() + 30 * 24 * H).toISOString(),
        },
    };

    const r = resolveEffectiveBilling(card, NOW, org, {
        billingScope: "PERSONAL",
        personalPaidGrace48hEnabled: true,
    });

    assert.equal(r.source, "organization");
    assert.notEqual(r.source, "billing");
});

// --- 10. toCardDTO omitted billingContext equals explicit null billingContext ---
test("toCardDTO: omitted billingContext equals explicit null billingContext", () => {
    const card = personalCard({ status: "free" });
    const a = toCardDTO(card, NOW, { includePrivate: true });
    const b = toCardDTO(card, NOW, { includePrivate: true, billingContext: null });
    assert.deepEqual(a, b);
});

// --- 11. malformed billingContext fails closed without throwing ---
test("toCardDTO: malformed billingContext fails closed without throwing", () => {
    const card = personalCard({
        status: "active",
        plan: "monthly",
        paidUntil: new Date(NOW.getTime() - 1 * H).toISOString(),
    });

    const malformedValues = [
        "not-an-object",
        42,
        ["PERSONAL", true],
        new Proxy(
            {},
            {
                get() {
                    throw new Error("boom");
                },
            },
        ),
    ];

    for (const malformed of malformedValues) {
        let dto;
        assert.doesNotThrow(() => {
            dto = toCardDTO(card, NOW, {
                includePrivate: true,
                billingContext: malformed,
            });
        });
        assert.equal(dto.effectiveBilling.isPaid, false);
        assert.equal(dto.effectiveBilling.isInPaidGrace, false);
    }
});

// --- 12. public stripped DTO leaks none of the sensitive fields ---
test("toCardDTO: public stripped DTO leaks no grace/scope/flag fields even with grace active", () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({ status: "active", plan: "monthly", paidUntil });

    const dto = toCardDTO(card, NOW, {
        includePrivate: false,
        stripBillingDetails: true,
        publicEntitlementsOnly: true,
        billingContext: {
            billingScope: "PERSONAL",
            personalPaidGrace48hEnabled: true,
        },
    });

    assert.equal(Object.prototype.hasOwnProperty.call(dto, "effectiveBilling"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(dto, "effectiveAccessUntil"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(dto, "economicPaidUntil"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(dto, "isInPaidGrace"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(dto, "billingScope"), false);
    assert.equal(
        Object.prototype.hasOwnProperty.call(
            dto,
            "personalPaidGrace48hEnabled",
        ),
        false,
    );
    assert.equal(Object.prototype.hasOwnProperty.call(dto, "billingContext"), false);

    const serialized = JSON.stringify(dto);
    assert.equal(serialized.includes("effectiveAccessUntil"), false);
    assert.equal(serialized.includes("economicPaidUntil"), false);
    assert.equal(serialized.includes("isInPaidGrace"), false);
    assert.equal(serialized.includes("billingScope"), false);
    assert.equal(serialized.includes("personalPaidGrace48hEnabled"), false);
    assert.equal(serialized.includes("billingContext"), false);
});

// --- 13. input Card, org, options and billingContext remain unchanged ---
test("resolveEffectiveBilling and toCardDTO never mutate card, org, options or billingContext", () => {
    const paidUntil = new Date(NOW.getTime() - 1 * H).toISOString();
    const card = personalCard({
        status: "active",
        plan: "monthly",
        paidUntil,
        orgId: "org1",
    });
    const org = {
        _id: "org1",
        isActive: true,
        orgEntitlement: { active: false },
    };
    const options = { billingScope: "REAL_ORG", personalPaidGrace48hEnabled: true };
    const billingContext = {
        billingScope: "PERSONAL",
        personalPaidGrace48hEnabled: true,
    };

    const cardBefore = snapshot(card);
    const orgBefore = snapshot(org);
    const optionsBefore = snapshot(options);
    const billingContextBefore = snapshot(billingContext);

    resolveEffectiveBilling(card, NOW, org, options);
    toCardDTO(card, NOW, { includePrivate: true, org, billingContext });

    assert.equal(snapshot(card), cardBefore);
    assert.equal(snapshot(org), orgBefore);
    assert.equal(snapshot(options), optionsBefore);
    assert.equal(snapshot(billingContext), billingContextBefore);
});
