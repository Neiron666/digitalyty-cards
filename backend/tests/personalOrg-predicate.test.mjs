import test from "node:test";
import assert from "node:assert/strict";

import {
    isPersonalBillingCard,
    isRealOrgCard,
    classifyBillingScope,
    BILLING_SCOPE,
} from "../src/utils/personalOrg.util.js";
import { BILLING_SCOPE as CANONICAL_BILLING_SCOPE } from "../src/utils/billingScope.constants.js";

const SENTINEL = "5f000000000000000000abcd"; // canonical personalOrgId sentinel
const REAL_ORG = "5f000000000000000000ffff";

// ── isPersonalBillingCard — Section A required cases ─────────────────────────

test("missing card is not a personal billing card", () => {
    assert.equal(isPersonalBillingCard(null, SENTINEL), false);
    assert.equal(isPersonalBillingCard(undefined, SENTINEL), false);
});

test("card with orgId missing is personal (test 1 eligible)", () => {
    assert.equal(isPersonalBillingCard({}, SENTINEL), true);
});

test("card with orgId null is personal (test 1 eligible)", () => {
    assert.equal(isPersonalBillingCard({ orgId: null }, SENTINEL), true);
});

test("card with orgId equal to personal sentinel is personal (test 2)", () => {
    assert.equal(isPersonalBillingCard({ orgId: SENTINEL }, SENTINEL), true);
});

test("real Organization card is rejected (test 3)", () => {
    assert.equal(isPersonalBillingCard({ orgId: REAL_ORG }, SENTINEL), false);
});

test("malformed non-null orgId is not personal", () => {
    assert.equal(
        isPersonalBillingCard({ orgId: "not-an-object-id" }, SENTINEL),
        false,
    );
});

test("missing sentinel with null card orgId is still personal", () => {
    assert.equal(isPersonalBillingCard({ orgId: null }, null), true);
    assert.equal(isPersonalBillingCard({ orgId: undefined }, undefined), true);
});

test("missing sentinel with non-null card orgId fails closed (not personal)", () => {
    assert.equal(isPersonalBillingCard({ orgId: REAL_ORG }, null), false);
    assert.equal(isPersonalBillingCard({ orgId: REAL_ORG }, undefined), false);
});

// ── isRealOrgCard — complementary fail-closed classifier ─────────────────────

test("real Organization card is a real-org card", () => {
    assert.equal(isRealOrgCard({ orgId: REAL_ORG }, SENTINEL), true);
});

test("personal/sentinel/null-org cards are not real-org cards", () => {
    assert.equal(isRealOrgCard({ orgId: SENTINEL }, SENTINEL), false);
    assert.equal(isRealOrgCard({ orgId: null }, SENTINEL), false);
    assert.equal(isRealOrgCard({}, SENTINEL), false);
    assert.equal(isRealOrgCard(null, SENTINEL), false);
});

test("non-null orgId with unresolved sentinel fails closed to real-org", () => {
    assert.equal(isRealOrgCard({ orgId: REAL_ORG }, null), true);
});

// ── classifyBillingScope — normalized canonical classifier truth table ───────

const oid = (hex) => ({ toHexString: () => hex });

test("BILLING_SCOPE exposes exactly the three normalized values and is frozen", () => {
    assert.deepEqual(Object.keys(BILLING_SCOPE).sort(), [
        "PERSONAL",
        "REAL_ORG",
        "UNKNOWN",
    ]);
    assert.equal(BILLING_SCOPE.PERSONAL, "PERSONAL");
    assert.equal(BILLING_SCOPE.REAL_ORG, "REAL_ORG");
    assert.equal(BILLING_SCOPE.UNKNOWN, "UNKNOWN");
    assert.equal(Object.isFrozen(BILLING_SCOPE), true);
});

test("BILLING_SCOPE re-export is the same object as the canonical module", () => {
    assert.equal(BILLING_SCOPE, CANONICAL_BILLING_SCOPE);
});

test("classifyBillingScope: missing Card is UNKNOWN", () => {
    assert.equal(classifyBillingScope(null, SENTINEL), BILLING_SCOPE.UNKNOWN);
    assert.equal(
        classifyBillingScope(undefined, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
});

test("classifyBillingScope: Card.orgId absent is PERSONAL", () => {
    assert.equal(classifyBillingScope({}, SENTINEL), BILLING_SCOPE.PERSONAL);
    assert.equal(
        classifyBillingScope({ orgId: undefined }, SENTINEL),
        BILLING_SCOPE.PERSONAL,
    );
});

test("classifyBillingScope: Card.orgId null is PERSONAL", () => {
    assert.equal(
        classifyBillingScope({ orgId: null }, SENTINEL),
        BILLING_SCOPE.PERSONAL,
    );
});

test("classifyBillingScope: non-null orgId + missing personalOrgId is UNKNOWN", () => {
    assert.equal(
        classifyBillingScope({ orgId: REAL_ORG }, null),
        BILLING_SCOPE.UNKNOWN,
    );
    assert.equal(
        classifyBillingScope({ orgId: REAL_ORG }, undefined),
        BILLING_SCOPE.UNKNOWN,
    );
    assert.equal(
        classifyBillingScope({ orgId: SENTINEL }, ""),
        BILLING_SCOPE.UNKNOWN,
    );
});

// 1/2 — non-empty string identifiers
test("classifyBillingScope: equal non-empty string ids are PERSONAL", () => {
    assert.equal(
        classifyBillingScope({ orgId: SENTINEL }, SENTINEL),
        BILLING_SCOPE.PERSONAL,
    );
    assert.equal(
        classifyBillingScope({ orgId: `  ${SENTINEL}  ` }, SENTINEL),
        BILLING_SCOPE.PERSONAL,
    );
});

test("classifyBillingScope: different non-empty string ids are REAL_ORG", () => {
    assert.equal(
        classifyBillingScope({ orgId: REAL_ORG }, SENTINEL),
        BILLING_SCOPE.REAL_ORG,
    );
});

// 3/4 — ObjectId-like values
test("classifyBillingScope: ObjectId-like toHexString equal is PERSONAL", () => {
    assert.equal(
        classifyBillingScope({ orgId: oid(SENTINEL) }, SENTINEL),
        BILLING_SCOPE.PERSONAL,
    );
    assert.equal(
        classifyBillingScope({ orgId: oid(SENTINEL) }, oid(SENTINEL)),
        BILLING_SCOPE.PERSONAL,
    );
});

test("classifyBillingScope: ObjectId-like toHexString different is REAL_ORG", () => {
    assert.equal(
        classifyBillingScope({ orgId: oid(REAL_ORG) }, oid(SENTINEL)),
        BILLING_SCOPE.REAL_ORG,
    );
});

// 5-8, 11 — unnormalizable values fail closed to UNKNOWN
test("classifyBillingScope: numeric orgId is UNKNOWN", () => {
    assert.equal(
        classifyBillingScope({ orgId: 12345 }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
    assert.equal(
        classifyBillingScope({ orgId: 10n }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
});

test("classifyBillingScope: Symbol orgId is UNKNOWN", () => {
    assert.equal(
        classifyBillingScope({ orgId: Symbol("x") }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
});

test("classifyBillingScope: plain-object / array / function orgId is UNKNOWN", () => {
    assert.equal(
        classifyBillingScope({ orgId: { a: 1 } }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
    assert.equal(
        classifyBillingScope({ orgId: [SENTINEL] }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
    assert.equal(
        classifyBillingScope({ orgId: () => SENTINEL }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
    assert.equal(
        classifyBillingScope({ orgId: true }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
});

test("classifyBillingScope: empty / whitespace-only string orgId is UNKNOWN", () => {
    assert.equal(
        classifyBillingScope({ orgId: "" }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
    assert.equal(
        classifyBillingScope({ orgId: "   " }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
});

test("classifyBillingScope: non-string or empty toHexString result is UNKNOWN", () => {
    assert.equal(
        classifyBillingScope({ orgId: { toHexString: () => 123 } }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
    assert.equal(
        classifyBillingScope({ orgId: { toHexString: () => "" } }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
    assert.equal(
        classifyBillingScope({ orgId: { toHexString: () => null } }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
});

// 9/10 — throwing normalizers must never propagate
test("classifyBillingScope: throwing toHexString on orgId is UNKNOWN without throwing", () => {
    const throwing = {
        toHexString() {
            throw new Error("boom");
        },
    };
    let result;
    assert.doesNotThrow(() => {
        result = classifyBillingScope({ orgId: throwing }, SENTINEL);
    });
    assert.equal(result, BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: throwing toHexString on personalOrgId is UNKNOWN without throwing", () => {
    const throwing = {
        toHexString() {
            throw new Error("boom");
        },
    };
    let result;
    assert.doesNotThrow(() => {
        result = classifyBillingScope({ orgId: SENTINEL }, throwing);
    });
    assert.equal(result, BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: a throwing toString is never invoked", () => {
    const trap = {
        toString() {
            throw new Error("toString must not be called");
        },
    };
    let result;
    assert.doesNotThrow(() => {
        result = classifyBillingScope({ orgId: trap }, SENTINEL);
    });
    assert.equal(result, BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope does not mutate its inputs", () => {
    const card = { orgId: SENTINEL };
    const before = JSON.stringify(card);
    classifyBillingScope(card, SENTINEL);
    assert.equal(JSON.stringify(card), before);
    assert.deepEqual(Object.keys(card), ["orgId"]);
});

// ── Card container validation — every non-object container fails closed ──────

test("classifyBillingScope: string Card container is UNKNOWN", () => {
    assert.equal(classifyBillingScope("card", SENTINEL), BILLING_SCOPE.UNKNOWN);
    assert.equal(classifyBillingScope("", SENTINEL), BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: numeric Card container is UNKNOWN", () => {
    assert.equal(classifyBillingScope(0, SENTINEL), BILLING_SCOPE.UNKNOWN);
    assert.equal(classifyBillingScope(42, SENTINEL), BILLING_SCOPE.UNKNOWN);
    assert.equal(classifyBillingScope(7n, SENTINEL), BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: boolean Card container is UNKNOWN", () => {
    assert.equal(classifyBillingScope(true, SENTINEL), BILLING_SCOPE.UNKNOWN);
    assert.equal(classifyBillingScope(false, SENTINEL), BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: function Card container is UNKNOWN", () => {
    const fn = () => ({ orgId: SENTINEL });
    fn.orgId = SENTINEL;
    assert.equal(classifyBillingScope(fn, SENTINEL), BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: Symbol Card container is UNKNOWN", () => {
    assert.equal(
        classifyBillingScope(Symbol("card"), SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
});

test("classifyBillingScope: Array Card container is UNKNOWN", () => {
    assert.equal(classifyBillingScope([], SENTINEL), BILLING_SCOPE.UNKNOWN);
    const arr = [];
    arr.orgId = SENTINEL;
    assert.equal(classifyBillingScope(arr, SENTINEL), BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: a valid plain object with absent orgId stays PERSONAL", () => {
    assert.equal(
        classifyBillingScope(Object.create(null), SENTINEL),
        BILLING_SCOPE.PERSONAL,
    );
    assert.equal(
        classifyBillingScope({ slug: "x" }, SENTINEL),
        BILLING_SCOPE.PERSONAL,
    );
});

// ── Hostile property access must never propagate ─────────────────────────────

test("classifyBillingScope: throwing card.orgId getter is UNKNOWN without throwing", () => {
    const card = {
        get orgId() {
            throw new Error("boom");
        },
    };
    let result;
    assert.doesNotThrow(() => {
        result = classifyBillingScope(card, SENTINEL);
    });
    assert.equal(result, BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: Card Proxy get trap that throws is UNKNOWN without throwing", () => {
    const card = new Proxy(
        {},
        {
            get() {
                throw new Error("trap");
            },
        },
    );
    let result;
    assert.doesNotThrow(() => {
        result = classifyBillingScope(card, SENTINEL);
    });
    assert.equal(result, BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: revoked Card Proxy is UNKNOWN without throwing", () => {
    const { proxy, revoke } = Proxy.revocable({ orgId: SENTINEL }, {});
    revoke();
    let result;
    assert.doesNotThrow(() => {
        result = classifyBillingScope(proxy, SENTINEL);
    });
    assert.equal(result, BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: throwing toHexString getter on orgId is UNKNOWN without throwing", () => {
    const orgId = {
        get toHexString() {
            throw new Error("boom");
        },
    };
    let result;
    assert.doesNotThrow(() => {
        result = classifyBillingScope({ orgId }, SENTINEL);
    });
    assert.equal(result, BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: throwing toHexString getter on personalOrgId is UNKNOWN without throwing", () => {
    const sentinel = {
        get toHexString() {
            throw new Error("boom");
        },
    };
    let result;
    assert.doesNotThrow(() => {
        result = classifyBillingScope({ orgId: SENTINEL }, sentinel);
    });
    assert.equal(result, BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: orgId Proxy apply trap that throws is UNKNOWN without throwing", () => {
    const orgId = {
        toHexString: new Proxy(() => SENTINEL, {
            apply() {
                throw new Error("apply trap");
            },
        }),
    };
    let result;
    assert.doesNotThrow(() => {
        result = classifyBillingScope({ orgId }, SENTINEL);
    });
    assert.equal(result, BILLING_SCOPE.UNKNOWN);
});

// ── Array identifiers are rejected by TYPE, not by a missing method ──────────

test("classifyBillingScope: empty Array orgId is UNKNOWN", () => {
    assert.equal(
        classifyBillingScope({ orgId: [] }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
});

test("classifyBillingScope: Array orgId with OWN callable toHexString is UNKNOWN", () => {
    // Would normalize to the sentinel and wrongly yield PERSONAL without the
    // structural Array check.
    const orgId = [];
    orgId.toHexString = () => SENTINEL;
    assert.equal(typeof orgId.toHexString, "function");
    assert.equal(
        classifyBillingScope({ orgId }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
});

test("classifyBillingScope: Array orgId INHERITING callable toHexString is UNKNOWN", () => {
    class HexArray extends Array {
        toHexString() {
            return SENTINEL;
        }
    }
    const orgId = new HexArray();
    assert.equal(Array.isArray(orgId), true);
    assert.equal(typeof orgId.toHexString, "function");
    assert.equal(
        Object.prototype.hasOwnProperty.call(orgId, "toHexString"),
        false,
        "toHexString must be inherited, not own",
    );
    assert.equal(
        classifyBillingScope({ orgId }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
});

test("classifyBillingScope: Proxy wrapping an Array with callable toHexString is UNKNOWN", () => {
    const target = [];
    target.toHexString = () => SENTINEL;
    const orgId = new Proxy(target, {});
    assert.equal(Array.isArray(orgId), true, "Array.isArray sees through Proxy");
    assert.equal(typeof orgId.toHexString, "function");
    assert.equal(
        classifyBillingScope({ orgId }, SENTINEL),
        BILLING_SCOPE.UNKNOWN,
    );
});

test("classifyBillingScope: revoked Array Proxy orgId is UNKNOWN without throwing", () => {
    const target = [];
    target.toHexString = () => SENTINEL;
    const { proxy, revoke } = Proxy.revocable(target, {});
    revoke();
    let result;
    assert.doesNotThrow(() => {
        result = classifyBillingScope({ orgId: proxy }, SENTINEL);
    });
    assert.equal(result, BILLING_SCOPE.UNKNOWN);
});

test("classifyBillingScope: Array personalOrgId with callable toHexString is UNKNOWN", () => {
    const sentinel = [];
    sentinel.toHexString = () => SENTINEL;
    assert.equal(typeof sentinel.toHexString, "function");
    assert.equal(
        classifyBillingScope({ orgId: SENTINEL }, sentinel),
        BILLING_SCOPE.UNKNOWN,
    );
});
