import test from "node:test";
import assert from "node:assert/strict";

import {
    isPersonalBillingCard,
    isRealOrgCard,
} from "../src/utils/personalOrg.util.js";

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
