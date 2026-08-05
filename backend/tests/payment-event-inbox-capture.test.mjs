import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import paymentProvider, {
    captureAuthenticatedPaymentEvent,
    resolveFirstPaymentContinuation,
    resolvePersonalBillingContinuation,
    STO_CONTINUATION_CODES,
    classifyCheckoutBillingScope,
    createTranzilaStoForUser,
    computeInboxEvidenceFingerprint,
    deriveInboxEventKey,
    buildInboxSafePayload,
    deriveProviderTxnId,
    deriveStoProviderTxnId,
} from "../src/services/payment/tranzila.provider.js";
import PaymentEventInbox from "../src/models/PaymentEventInbox.model.js";
import PaymentIntent from "../src/models/PaymentIntent.model.js";
import PaymentTransaction from "../src/models/PaymentTransaction.model.js";
import Receipt from "../src/models/Receipt.model.js";
import User from "../src/models/User.model.js";
import Card from "../src/models/Card.model.js";
import Organization from "../src/models/Organization.model.js";
import {
    isPersonalBillingCard,
    isRealOrgCard,
} from "../src/utils/personalOrg.util.js";
import { buildYeshInvoiceDocumentUniqueKey } from "../src/services/yeshinvoice.service.js";
import { TRANZILA_CONFIG } from "../src/config/tranzila.js";
import {
    reportObsoleteLegacyIndex,
    OBSOLETE_LEGACY_INDEX_NAME,
} from "../scripts/migrate-payment-event-inbox-indexes.mjs";

// ── In-memory fake deps (no DB, no provider calls) ──────────────────────────
// The fake findOneAndUpdate simulates BOTH unique indexes:
//   - UNIQUE { eventKey: 1 }               → existing eventKey returns the
//     pre-update duplicate row (new:false semantics).
//   - UNIQUE PARTIAL { legacyProviderTxnIdHash: 1 } → a second non-null hash
//     under a different eventKey throws E11000 { keyPattern:{legacyProviderTxnIdHash:1} }.

function matchRow(row, query) {
    for (const [k, v] of Object.entries(query)) {
        if (v && typeof v === "object" && "$ne" in v) {
            if (row[k] === v.$ne) return false;
        } else if (v && typeof v === "object" && "$nin" in v) {
            // Mongo semantics: a missing field (undefined) is NOT excluded.
            if (v.$nin.includes(row[k])) return false;
        } else if (row[k] !== v) {
            return false;
        }
    }
    return true;
}

function leanBuilder(value) {
    const builder = {
        select() {
            return builder;
        },
        lean() {
            return Promise.resolve(value);
        },
    };
    return builder;
}

const DEFAULT_PERSONAL_ORG_ID = "5f000000000000000000abcd";

function makeFakeDeps({
    seedRows = [],
    user = null,
    card = null,
    personalOrgId = DEFAULT_PERSONAL_ORG_ID,
} = {}) {
    const rows = [...seedRows];
    const metrics = [];
    const inbox = {
        findOne(query) {
            const match = rows.find((r) => matchRow(r, query)) ?? null;
            return leanBuilder(match);
        },
        async findOneAndUpdate(filter, update, opts) {
            const existingByKey = rows.find(
                (r) => r.eventKey === filter.eventKey,
            );
            if (existingByKey) return existingByKey; // duplicate, new:false
            const doc = { ...(update.$setOnInsert || {}) };
            if (doc.legacyProviderTxnIdHash != null) {
                const hashConflict = rows.find(
                    (r) =>
                        r.legacyProviderTxnIdHash ===
                        doc.legacyProviderTxnIdHash,
                );
                if (hashConflict) {
                    const err = new Error(
                        "E11000 duplicate key error collection: index: payment_event_inbox_legacyProviderTxnIdHash_unique",
                    );
                    err.code = 11000;
                    err.keyPattern = { legacyProviderTxnIdHash: 1 };
                    throw err;
                }
            }
            if (opts?.upsert) {
                rows.push(doc);
                return null; // inserted, new:false → null
            }
            return null;
        },
        async updateOne(filter, update) {
            const row = rows.find((r) => matchRow(r, filter));
            if (row) Object.assign(row, update.$set || {});
            return { matchedCount: row ? 1 : 0 };
        },
    };
    return {
        PaymentEventInbox: inbox,
        User: { findById: () => leanBuilder(user) },
        Card: { findById: () => leanBuilder(card) },
        getPersonalOrgIdReadOnly: async () => personalOrgId,
        isPersonalBillingCard,
        isRealOrgCard,
        incrementMetric: (name, tags) => metrics.push({ name, tags }),
        __rows: rows,
        __metrics: metrics,
    };
}

function baseFirstPaymentInput(overrides = {}) {
    return {
        eventType: "first_payment",
        provider: "tranzila",
        canonicalTerminal: "TERM1",
        legacyProviderTxnId: "tranzila:idx-1",
        rawPayloadHash: "hash-A",
        safePayload: { Response: "000", sum: "29.00" },
        providerPaymentStatus: "paid",
        providerResponseCode: "000",
        plan: "monthly",
        amountAgorot: 2900,
        currency: "ILS",
        paymentIntentId: null,
        ...overrides,
    };
}

// ── Insert / duplicate ──────────────────────────────────────────────────────

test("stable first-payment capture inserts one correlation-pending row", async () => {
    const deps = makeFakeDeps();
    const r = await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput(),
        deps,
    );
    assert.equal(deps.__rows.length, 1);
    assert.equal(r.status, "inserted");
    assert.equal(r.captured, true);
    assert.equal(r.duplicate, false);
    assert.equal(r.identityStatus, "stable");
    assert.equal(r.correlationStatus, "correlation_pending");
    assert.equal(deps.__rows[0].correlatedUserId, null);
    assert.equal(deps.__rows[0].correlatedCardId, null);
});

test("duplicate capture creates exactly one inbox row", async () => {
    const deps = makeFakeDeps();
    const input = baseFirstPaymentInput();
    const r1 = await captureAuthenticatedPaymentEvent(input, deps);
    const r2 = await captureAuthenticatedPaymentEvent(input, deps);
    assert.equal(deps.__rows.length, 1);
    assert.equal(r1.captured, true);
    assert.equal(r2.captured, false);
    assert.equal(r2.duplicate, true);
});

test("duplicate delivery does not modify firstObservedAt", async () => {
    const deps = makeFakeDeps();
    const input = baseFirstPaymentInput();
    await captureAuthenticatedPaymentEvent(input, deps);
    const firstObservedAt = deps.__rows[0].firstObservedAt;
    await captureAuthenticatedPaymentEvent(input, deps);
    assert.equal(deps.__rows[0].firstObservedAt, firstObservedAt);
    assert.ok(firstObservedAt instanceof Date);
});

test("differing rawPayloadHash alone is an ordinary duplicate (fingerprint stable)", async () => {
    const deps = makeFakeDeps();
    await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({ rawPayloadHash: "hash-A" }),
        deps,
    );
    const r2 = await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({ rawPayloadHash: "hash-B" }),
        deps,
    );
    assert.equal(r2.duplicate, true);
    assert.notEqual(r2.integrityCollision, true);
    assert.equal(deps.__rows.length, 1);
    // Original forensic hash is never overwritten.
    assert.equal(deps.__rows[0].rawPayloadHash, "hash-A");
});

test("same eventKey with a conflicting financial scalar is an integrity collision", async () => {
    const deps = makeFakeDeps();
    await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({ amountAgorot: 2900 }),
        deps,
    );
    const r2 = await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({ amountAgorot: 9900 }),
        deps,
    );
    assert.equal(r2.integrityCollision, true);
    assert.equal(r2.captured, false);
    assert.equal(deps.__rows.length, 1);
    assert.equal(deps.__rows[0].amountAgorot, 2900);
    assert.ok(
        deps.__metrics.some(
            (m) => m.name === "payment.inbox.integrity_collision",
        ),
    );
});

test("same legacyProviderTxnId under another terminal is an identity collision", async () => {
    const sharedHash = crypto
        .createHash("sha256")
        .update("tranzila:shared")
        .digest("hex");
    const seedRows = [
        {
            eventKey: "seed-key",
            legacyProviderTxnId: "tranzila:shared",
            legacyProviderTxnIdHash: sharedHash,
            providerTerminal: "TERM_A",
            rawPayloadHash: "hash-seed",
            provider: "tranzila",
            eventType: "first_payment",
            providerPaymentStatus: "paid",
        },
    ];
    const deps = makeFakeDeps({ seedRows });
    const r = await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({
            legacyProviderTxnId: "tranzila:shared",
            canonicalTerminal: "TERM_B",
        }),
        deps,
    );
    assert.equal(r.identityCollision, true);
    assert.equal(r.status, "identity_collision");
    assert.equal(r.identityStatus, "integrity_collision");
    assert.equal(r.correlationStatus, "manual_review");
    // No authenticated row is written on an identity collision.
    assert.equal(deps.__rows.length, 1);
    assert.ok(
        deps.__metrics.some(
            (m) => m.name === "payment.inbox.identity_collision",
        ),
    );
});

test("unkeyed authenticated event is retained as manual_review evidence", async () => {
    const deps = makeFakeDeps();
    const r = await captureAuthenticatedPaymentEvent(
        {
            eventType: "sto_recurring",
            provider: "tranzila",
            canonicalTerminal: "STO_TERM",
            legacyProviderTxnId: null,
            rawPayloadHash: "hash-sto",
            safePayload: { Response: "000" },
            providerPaymentStatus: "paid",
            providerResponseCode: "000",
            plan: null,
            amountAgorot: 2900,
            currency: "ILS",
            paymentIntentId: null,
        },
        deps,
    );
    assert.equal(r.captured, true);
    assert.equal(r.identityStatus, "manual_review");
    assert.equal(deps.__rows.length, 1);
    assert.equal(deps.__rows[0].identityStatus, "manual_review");
    assert.equal(deps.__rows[0].correlationStatus, "manual_review");
    assert.equal(deps.__rows[0].legacyProviderTxnId, null);
    assert.equal(deps.__rows[0].legacyProviderTxnIdHash, null);
});

test("canonicalTerminal is stored verbatim (no lossy sanitization)", async () => {
    const deps = makeFakeDeps();
    const weird = "Term/With:Odd_Chars-42";
    await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({ canonicalTerminal: weird }),
        deps,
    );
    assert.equal(deps.__rows[0].providerTerminal, weird);
});

test("unkeyed eventKey uses the fingerprint tuple and is never the literal 'unknown'", async () => {
    const evidenceFingerprint = computeInboxEvidenceFingerprint({
        provider: "tranzila",
        canonicalTerminal: "STO_TERM",
        eventType: "sto_recurring",
        legacyProviderTxnId: null,
        providerPaymentStatus: "paid",
        providerResponseCode: "000",
        amountAgorot: 2900,
        currency: "ILS",
        paymentIntentId: null,
    });
    const { eventKey, identityStatus } = deriveInboxEventKey({
        provider: "tranzila",
        canonicalTerminal: "STO_TERM",
        legacyProviderTxnId: null,
        evidenceFingerprint,
    });
    assert.equal(identityStatus, "manual_review");
    assert.notEqual(eventKey, "unknown");
    assert.match(eventKey, /^[a-f0-9]{64}$/);
});

test("legacyProviderTxnId longer than 128 chars is stored verbatim and hashed", async () => {
    const deps = makeFakeDeps();
    const longId = "tranzila:" + "x".repeat(300);
    await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({ legacyProviderTxnId: longId }),
        deps,
    );
    assert.equal(deps.__rows[0].legacyProviderTxnId, longId);
    assert.match(deps.__rows[0].legacyProviderTxnIdHash, /^[a-f0-9]{64}$/);
});

test("capture performs no User/Card/ledger work", async () => {
    const deps = makeFakeDeps();
    deps.User.findById = () => {
        throw new Error("User lookup must not run during capture");
    };
    deps.Card.findById = () => {
        throw new Error("Card lookup must not run during capture");
    };
    const r = await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput(),
        deps,
    );
    assert.equal(r.captured, true);
    const row = deps.__rows[0];
    assert.equal("entitlementAppliedAt" in row, false);
    assert.equal("appliedPaidUntil" in row, false);
});

// ── Fingerprint invariants ──────────────────────────────────────────────────

test("evidenceFingerprint is independent of key order and optional payload", () => {
    const a = computeInboxEvidenceFingerprint({
        provider: "tranzila",
        canonicalTerminal: "TERM1",
        eventType: "first_payment",
        legacyProviderTxnId: "tranzila:idx-1",
        providerPaymentStatus: "paid",
        providerResponseCode: "000",
        amountAgorot: 2900,
        currency: "ILS",
        paymentIntentId: null,
    });
    const b = computeInboxEvidenceFingerprint({
        currency: "ILS",
        amountAgorot: 2900,
        paymentIntentId: null,
        eventType: "first_payment",
        providerResponseCode: "000",
        provider: "tranzila",
        providerPaymentStatus: "paid",
        legacyProviderTxnId: "tranzila:idx-1",
        canonicalTerminal: "TERM1",
    });
    assert.equal(a, b);
});

test("evidenceFingerprint changes when a financial scalar changes", () => {
    const a = computeInboxEvidenceFingerprint({
        provider: "tranzila",
        canonicalTerminal: "TERM1",
        eventType: "first_payment",
        legacyProviderTxnId: "tranzila:idx-1",
        providerPaymentStatus: "paid",
        providerResponseCode: "000",
        amountAgorot: 2900,
        currency: "ILS",
        paymentIntentId: null,
    });
    const b = computeInboxEvidenceFingerprint({
        provider: "tranzila",
        canonicalTerminal: "TERM1",
        eventType: "first_payment",
        legacyProviderTxnId: "tranzila:idx-1",
        providerPaymentStatus: "paid",
        providerResponseCode: "000",
        amountAgorot: 9900,
        currency: "ILS",
        paymentIntentId: null,
    });
    assert.notEqual(a, b);
});

test("eventKey collision race is classified via re-read", async () => {
    const deps = makeFakeDeps();
    const evidenceFingerprint = computeInboxEvidenceFingerprint({
        provider: "tranzila",
        canonicalTerminal: "TERM1",
        eventType: "first_payment",
        legacyProviderTxnId: "tranzila:idx-1",
        providerPaymentStatus: "paid",
        providerResponseCode: "000",
        amountAgorot: 2900,
        currency: "ILS",
        paymentIntentId: null,
    });
    const existingRow = {
        eventKey: "race-key",
        evidenceFingerprint,
        provider: "tranzila",
        providerTerminal: "TERM1",
        eventType: "first_payment",
        providerPaymentStatus: "paid",
        amountAgorot: 2900,
        currency: "ILS",
        identityStatus: "stable",
        correlationStatus: "correlation_pending",
    };
    deps.PaymentEventInbox.findOne = () => leanBuilder(existingRow);
    deps.PaymentEventInbox.findOneAndUpdate = async () => {
        const err = new Error("E11000 duplicate key error: eventKey");
        err.code = 11000;
        err.keyPattern = { eventKey: 1 };
        throw err;
    };
    const r = await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput(),
        deps,
    );
    assert.equal(r.duplicate, true);
    assert.notEqual(r.integrityCollision, true);
});

// ── Correlation / continuation (Section J) ──────────────────────────────────

test("personal card continuation continues and marks correlated", async () => {
    const deps = makeFakeDeps({
        user: { cardId: "0123456789abcdef01234567" },
        card: { orgId: null },
    });
    deps.__rows.push({ eventKey: "ek1", correlationStatus: "correlation_pending" });
    const c = await resolveFirstPaymentContinuation(
        { eventKey: "ek1", userId: "0123456789abcdef0123aaaa" },
        deps,
    );
    assert.equal(c.continue, true);
    assert.equal(c.correlationStatus, "correlated");
    const row = deps.__rows.find((r) => r.eventKey === "ek1");
    assert.equal(row.correlationStatus, "correlated");
    assert.equal(
        String(row.correlatedCardId),
        "0123456789abcdef01234567",
    );
});

test("real-org card continuation stops with real_org_card", async () => {
    const deps = makeFakeDeps({
        user: { cardId: "0123456789abcdef01234567" },
        card: { orgId: "5f000000000000000000ffff" },
    });
    deps.__rows.push({ eventKey: "ek2", correlationStatus: "correlation_pending" });
    const c = await resolveFirstPaymentContinuation(
        { eventKey: "ek2", userId: "0123456789abcdef0123aaaa" },
        deps,
    );
    assert.equal(c.continue, false);
    assert.equal(c.safeErrorCode, "real_org_card");
    const row = deps.__rows.find((r) => r.eventKey === "ek2");
    assert.equal(row.correlationStatus, "manual_review");
});

test("no-card continuation stops with unknown_scope", async () => {
    const deps = makeFakeDeps({ user: { cardId: null } });
    deps.__rows.push({ eventKey: "ek3", correlationStatus: "correlation_pending" });
    const c = await resolveFirstPaymentContinuation(
        { eventKey: "ek3", userId: "0123456789abcdef0123aaaa" },
        deps,
    );
    assert.equal(c.continue, false);
    assert.equal(c.safeErrorCode, "unknown_scope");
});

test("continuation treats null personalOrgId + null card orgId as personal", async () => {
    const deps = makeFakeDeps({
        user: { cardId: "0123456789abcdef01234567" },
        card: { orgId: null },
        personalOrgId: null,
    });
    deps.__rows.push({ eventKey: "ek4", correlationStatus: "correlation_pending" });
    const c = await resolveFirstPaymentContinuation(
        { eventKey: "ek4", userId: "0123456789abcdef0123aaaa" },
        deps,
    );
    assert.equal(c.continue, true);
});

test("continuation treats sentinel-matching orgId as personal", async () => {
    const deps = makeFakeDeps({
        user: { cardId: "0123456789abcdef01234567" },
        card: { orgId: DEFAULT_PERSONAL_ORG_ID },
        personalOrgId: DEFAULT_PERSONAL_ORG_ID,
    });
    deps.__rows.push({ eventKey: "ek5", correlationStatus: "correlation_pending" });
    const c = await resolveFirstPaymentContinuation(
        { eventKey: "ek5", userId: "0123456789abcdef0123aaaa" },
        deps,
    );
    assert.equal(c.continue, true);
});

test("transient correlation failure throws a retryable error", async () => {
    const deps = makeFakeDeps();
    deps.__rows.push({ eventKey: "ek6", correlationStatus: "correlation_pending" });
    deps.User.findById = () => {
        throw new Error("transient user lookup failure");
    };
    await assert.rejects(
        () =>
            resolveFirstPaymentContinuation(
                { eventKey: "ek6", userId: "0123456789abcdef0123aaaa" },
                deps,
            ),
        (err) => err.retryable === true,
    );
    // Best-effort: durable row is marked correlation_pending, never lost.
    const row = deps.__rows.find((r) => r.eventKey === "ek6");
    assert.equal(row.correlationStatus, "correlation_pending");
});

// ── Checkout scope classification (Section I) ───────────────────────────────

test("classifyCheckoutBillingScope returns personal / real_org / unknown", async () => {
    const personal = await classifyCheckoutBillingScope(
        "0123456789abcdef0123aaaa",
        makeFakeDeps({
            user: { cardId: "0123456789abcdef01234567" },
            card: { orgId: null },
        }),
    );
    assert.equal(personal, "personal");

    const realOrg = await classifyCheckoutBillingScope(
        "0123456789abcdef0123aaaa",
        makeFakeDeps({
            user: { cardId: "0123456789abcdef01234567" },
            card: { orgId: "5f000000000000000000ffff" },
        }),
    );
    assert.equal(realOrg, "real_org");

    const unknown = await classifyCheckoutBillingScope(
        "0123456789abcdef0123aaaa",
        makeFakeDeps({ user: { cardId: null } }),
    );
    assert.equal(unknown, "unknown");
});

test("createPayment rejects a REAL_ORG scope before any provider call", async (t) => {
    t.mock.method(User, "findById", () =>
        leanBuilder({ cardId: "0123456789abcdef01234567" }),
    );
    t.mock.method(Card, "findById", () =>
        leanBuilder({ orgId: "5f000000000000000000ffff" }),
    );
    t.mock.method(Organization, "findOne", () =>
        leanBuilder({ _id: DEFAULT_PERSONAL_ORG_ID }),
    );
    await assert.rejects(
        () =>
            paymentProvider.createPayment({
                userId: "0123456789abcdef0123aaaa",
                plan: "monthly",
            }),
        /personal_billing_required/,
    );
});

// ── Safe payload / unchanged invariants ─────────────────────────────────────

test("safe payload strips token, card, and PII fields", () => {
    const safe = buildInboxSafePayload({
        Response: "000",
        sum: "29.00",
        currency: "1",
        supplier: "TERM1",
        index: "999",
        TranzilaTK: "TOKEN-SECRET",
        ccno: "4111111111111111",
        mycvv: "123",
        myexpdate: "1230",
        myid: "123456789",
        email: "user@example.com",
        contact: "Jane Doe",
        json_purchase_data: "{opaque}",
        thtk: "handshake-token",
    });
    const forbidden = [
        "TranzilaTK",
        "ccno",
        "mycvv",
        "myexpdate",
        "myid",
        "email",
        "contact",
        "json_purchase_data",
        "thtk",
    ];
    for (const key of forbidden) {
        assert.equal(key in safe, false, `${key} must not be present`);
    }
    assert.equal(safe.Response, "000");
    assert.equal(safe.sum, "29.00");
});

test("deriveProviderTxnId derivation is unchanged", () => {
    assert.equal(deriveProviderTxnId({ index: "777" }), "tranzila:777");
    assert.equal(deriveProviderTxnId({ authnr: "abc" }), "tranzila:abc");
    assert.ok(deriveProviderTxnId({}).startsWith("tranzila:hash:"));
    assert.equal(
        deriveStoProviderTxnId({ sto_external_id: "S1", index: "3" }),
        "sto:S1:3",
    );
    assert.equal(deriveStoProviderTxnId({ index: "3" }), null);
});

test("YeshInvoice DocumentUniqueKey derivation is unchanged", () => {
    const providerTxnId = "tranzila:777";
    const expected = crypto
        .createHash("sha256")
        .update(String(providerTxnId))
        .digest("hex")
        .slice(0, 20);
    assert.equal(buildYeshInvoiceDocumentUniqueKey(providerTxnId), expected);
});

// ── handleNotify ordering: capture BEFORE consuming/ledger (Section C) ───────

function paidDirectNgPayload() {
    return {
        Response: "000",
        sum: "29.00", // 2900 agorot == PRICES_AGOROT.monthly
        currency: "1",
        index: "999",
        udf1: "0123456789abcdef01234567", // valid ObjectId → userId
        udf2: "monthly",
        udf3: "0123456789abcdef0123abcd", // valid ObjectId → intent id
    };
}

test("capture failure blocks consuming mutation and ledger insert", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    // §5.3 pre-capture read must succeed so isPaid stays true and capture runs.
    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
    }));

    const infraErr = new Error("inbox write infra failure");
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () => {
        throw infraErr;
    });

    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => null,
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({}));

    await assert.rejects(
        () => paymentProvider.handleNotify(paidDirectNgPayload()),
        /inbox write infra failure/,
    );

    assert.equal(
        consuming.mock.callCount(),
        0,
        "PaymentIntent consuming mutation must not run when capture fails",
    );
    assert.equal(
        ledger.mock.callCount(),
        0,
        "PaymentTransaction.create must not run when capture fails",
    );
});

test("successful personal capture continues to the consuming CAS", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        userId: "0123456789abcdef01234567",
        plan: "monthly",
        amountAgorot: 2900,
    }));
    const inboxWrite = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null, // inserted, stable identity
    );
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 1,
    }));
    // Personal correlation: user has a card, card has no org.
    t.mock.method(User, "findById", () =>
        leanBuilder({ cardId: "0123456789abcdef01234567" }),
    );
    t.mock.method(Card, "findById", () => leanBuilder({ orgId: null }));
    t.mock.method(Organization, "findOne", () =>
        leanBuilder({ _id: DEFAULT_PERSONAL_ORG_ID }),
    );

    const consumingSentinel = new Error("reached consuming");
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw consumingSentinel;
        },
    );
    // §5.5 fails closed and swallows the consuming error, then §6 writes a failed
    // ledger row — mock it so the assertion never touches a real DB.
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(inboxWrite.mock.callCount(), 1, "capture must run once");
    assert.equal(
        consuming.mock.callCount(),
        1,
        "personal continuation must reach the consuming CAS",
    );
});

test("real-org first payment stops before the consuming CAS", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        userId: "0123456789abcdef01234567",
        plan: "monthly",
        amountAgorot: 2900,
    }));
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () => null);
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 1,
    }));
    t.mock.method(User, "findById", () =>
        leanBuilder({ cardId: "0123456789abcdef01234567" }),
    );
    t.mock.method(Card, "findById", () =>
        leanBuilder({ orgId: "5f000000000000000000ffff" }),
    );
    t.mock.method(Organization, "findOne", () =>
        leanBuilder({ _id: DEFAULT_PERSONAL_ORG_ID }),
    );

    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not be reached");
        },
    );

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(
        consuming.mock.callCount(),
        0,
        "real-org scope must stop before the consuming CAS",
    );
});

// ══════════════════════════════════════════════════════════════════════════
// Phase 2A.2 — recurring-STO personal boundary, STO-create defense, durable
// collision review, legacy-hash exact comparison, obsolete-index reporting,
// and terminal-schema decision. Mocks prove control flow only.
// ══════════════════════════════════════════════════════════════════════════

const STO_USER_ID = "0123456789abcdef0123aaaa";
const STO_CARD_ID = "0123456789abcdef01234567";
const REAL_ORG_ID = "5f000000000000000000ffff";

function stoPayload(overrides = {}) {
    return {
        supplier: "STO_TERM",
        currency: "ILS",
        Response: "000",
        sum: "29.00", // 2900 agorot == PRICES_AGOROT.monthly
        sto_external_id: "S1",
        index: "3",
        ...overrides,
    };
}

function seedContinuationRow(deps, eventKey) {
    deps.__rows.push({ eventKey, correlationStatus: "correlation_pending" });
    return eventKey;
}

// ── Recurring STO continuation classification (Section I: 1,2,3,7,9,10,11,12) ─

test("STO continuation: personal orgId=null continues to the ledger", async () => {
    const deps = makeFakeDeps({ card: { orgId: null } });
    const eventKey = seedContinuationRow(deps, "sto-ek-1");
    const c = await resolvePersonalBillingContinuation(
        {
            eventKey,
            user: { _id: STO_USER_ID, cardId: STO_CARD_ID },
            codes: STO_CONTINUATION_CODES,
        },
        deps,
    );
    assert.equal(c.continue, true);
    assert.equal(c.correlationStatus, "correlated");
    const row = deps.__rows.find((r) => r.eventKey === eventKey);
    assert.equal(row.correlationStatus, "correlated");
    assert.equal(String(row.correlatedCardId), STO_CARD_ID);
});

test("STO continuation: sentinel-matching orgId continues", async () => {
    const deps = makeFakeDeps({
        card: { orgId: DEFAULT_PERSONAL_ORG_ID },
        personalOrgId: DEFAULT_PERSONAL_ORG_ID,
    });
    const eventKey = seedContinuationRow(deps, "sto-ek-2");
    const c = await resolvePersonalBillingContinuation(
        {
            eventKey,
            user: { _id: STO_USER_ID, cardId: STO_CARD_ID },
            codes: STO_CONTINUATION_CODES,
        },
        deps,
    );
    assert.equal(c.continue, true);
});

test("STO continuation: real-org card stops with real_org_card", async () => {
    const deps = makeFakeDeps({ card: { orgId: REAL_ORG_ID } });
    const eventKey = seedContinuationRow(deps, "sto-ek-3");
    const c = await resolvePersonalBillingContinuation(
        {
            eventKey,
            user: { _id: STO_USER_ID, cardId: STO_CARD_ID },
            codes: STO_CONTINUATION_CODES,
        },
        deps,
    );
    assert.equal(c.continue, false);
    assert.equal(c.safeErrorCode, "real_org_card");
    const row = deps.__rows.find((r) => r.eventKey === eventKey);
    assert.equal(row.correlationStatus, "manual_review");
});

test("STO continuation: missing User stops with sto_user_not_found", async () => {
    const deps = makeFakeDeps();
    const eventKey = seedContinuationRow(deps, "sto-ek-7");
    const c = await resolvePersonalBillingContinuation(
        { eventKey, user: null, codes: STO_CONTINUATION_CODES },
        deps,
    );
    assert.equal(c.continue, false);
    assert.equal(c.safeErrorCode, "sto_user_not_found");
});

test("STO continuation: missing primary Card stops with primary_card_missing", async () => {
    const deps = makeFakeDeps();
    const eventKey = seedContinuationRow(deps, "sto-ek-9");
    const c = await resolvePersonalBillingContinuation(
        {
            eventKey,
            user: { _id: STO_USER_ID, cardId: null },
            codes: STO_CONTINUATION_CODES,
        },
        deps,
    );
    assert.equal(c.continue, false);
    assert.equal(c.safeErrorCode, "primary_card_missing");
    // Missing primary card must not correlate a card id.
    const row = deps.__rows.find((r) => r.eventKey === eventKey);
    assert.equal(row.correlatedCardId, undefined);
});

test("STO continuation: non-null orgId with unresolved sentinel fails closed", async () => {
    const deps = makeFakeDeps({
        card: { orgId: REAL_ORG_ID },
        personalOrgId: null,
    });
    const eventKey = seedContinuationRow(deps, "sto-ek-10");
    const c = await resolvePersonalBillingContinuation(
        {
            eventKey,
            user: { _id: STO_USER_ID, cardId: STO_CARD_ID },
            codes: STO_CONTINUATION_CODES,
        },
        deps,
    );
    // Fails closed to real-org (never silently reclassified as personal).
    assert.equal(c.continue, false);
    assert.equal(c.safeErrorCode, "real_org_card");
});

test("STO continuation: transient Card lookup failure throws retryable after capture", async () => {
    const deps = makeFakeDeps();
    const eventKey = seedContinuationRow(deps, "sto-ek-11");
    deps.Card.findById = () => {
        throw new Error("transient card lookup failure");
    };
    await assert.rejects(
        () =>
            resolvePersonalBillingContinuation(
                {
                    eventKey,
                    user: { _id: STO_USER_ID, cardId: STO_CARD_ID },
                    codes: STO_CONTINUATION_CODES,
                },
                deps,
            ),
        (err) => err.retryable === true,
    );
    const row = deps.__rows.find((r) => r.eventKey === eventKey);
    assert.equal(row.correlationStatus, "correlation_pending");
});

test("STO continuation: stable duplicate re-runs personal correlation idempotently", async () => {
    const deps = makeFakeDeps({ card: { orgId: null } });
    const eventKey = seedContinuationRow(deps, "sto-ek-12");
    const call = () =>
        resolvePersonalBillingContinuation(
            {
                eventKey,
                user: { _id: STO_USER_ID, cardId: STO_CARD_ID },
                codes: STO_CONTINUATION_CODES,
            },
            deps,
        );
    const c1 = await call();
    const c2 = await call();
    assert.equal(c1.continue, true);
    assert.equal(c2.continue, true);
    const row = deps.__rows.find((r) => r.eventKey === eventKey);
    assert.equal(row.correlationStatus, "correlated");
});

// ── Recurring STO handler boundary placement (Section I: 3,4,5,6,13, personal) ─

function mockStoHandler(t, { user, cardOrgId, capture = "insert" } = {}) {
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () =>
        capture === "duplicate" ? { eventKey: "dup" } : null,
    );
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 1,
    }));
    t.mock.method(User, "findOne", async () => user);
    t.mock.method(Card, "findById", () => leanBuilder({ orgId: cardOrgId }));
    t.mock.method(Organization, "findOne", () =>
        leanBuilder({ _id: DEFAULT_PERSONAL_ORG_ID }),
    );
}

test("STO handler: REAL_ORG stops before PaymentTransaction.create / User.save / Card.updateOne / Receipt.create", async (t) => {
    const originalStoTerminal = TRANZILA_CONFIG.stoTerminal;
    TRANZILA_CONFIG.stoTerminal = "STO_TERM";
    t.after(() => {
        TRANZILA_CONFIG.stoTerminal = originalStoTerminal;
    });

    const saveMock = t.mock.fn(async () => {});
    const userDoc = { _id: STO_USER_ID, cardId: STO_CARD_ID, save: saveMock };
    mockStoHandler(t, { user: userDoc, cardOrgId: REAL_ORG_ID });
    const txnCreate = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));
    const cardUpdate = t.mock.method(Card, "updateOne", async () => ({}));
    const receiptCreate = t.mock.method(Receipt, "create", async () => ({
        _id: "r",
    }));

    const r = await paymentProvider.handleStoNotify(stoPayload());

    assert.equal(r.ok, true);
    assert.equal(r.manualReview, true);
    assert.equal(txnCreate.mock.callCount(), 0);
    assert.equal(saveMock.mock.callCount(), 0);
    assert.equal(cardUpdate.mock.callCount(), 0);
    assert.equal(receiptCreate.mock.callCount(), 0);
});

test("STO handler: REAL_ORG failed charge (Response!=000) also stops before any personal ledger/User mutation", async (t) => {
    const originalStoTerminal = TRANZILA_CONFIG.stoTerminal;
    TRANZILA_CONFIG.stoTerminal = "STO_TERM";
    t.after(() => {
        TRANZILA_CONFIG.stoTerminal = originalStoTerminal;
    });

    const saveMock = t.mock.fn(async () => {});
    const userDoc = { _id: STO_USER_ID, cardId: STO_CARD_ID, save: saveMock };
    mockStoHandler(t, { user: userDoc, cardOrgId: REAL_ORG_ID });
    const txnCreate = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    const r = await paymentProvider.handleStoNotify(
        stoPayload({ Response: "004" }),
    );

    assert.equal(r.manualReview, true);
    assert.equal(
        txnCreate.mock.callCount(),
        0,
        "failed-charge recordFailure must not run for a REAL_ORG scope",
    );
    assert.equal(saveMock.mock.callCount(), 0);
});

test("STO handler: missing User stops before any personal ledger mutation", async (t) => {
    const originalStoTerminal = TRANZILA_CONFIG.stoTerminal;
    TRANZILA_CONFIG.stoTerminal = "STO_TERM";
    t.after(() => {
        TRANZILA_CONFIG.stoTerminal = originalStoTerminal;
    });

    mockStoHandler(t, { user: null, cardOrgId: null });
    const txnCreate = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    const r = await paymentProvider.handleStoNotify(stoPayload());

    assert.equal(r.manualReview, true);
    assert.equal(txnCreate.mock.callCount(), 0);
});

test("STO handler: PERSONAL orgId=null reaches the paid PaymentTransaction.create", async (t) => {
    const originalStoTerminal = TRANZILA_CONFIG.stoTerminal;
    const originalYesh = process.env.YESH_INVOICE_ENABLED;
    TRANZILA_CONFIG.stoTerminal = "STO_TERM";
    process.env.YESH_INVOICE_ENABLED = "false";
    t.after(() => {
        TRANZILA_CONFIG.stoTerminal = originalStoTerminal;
        if (originalYesh === undefined) delete process.env.YESH_INVOICE_ENABLED;
        else process.env.YESH_INVOICE_ENABLED = originalYesh;
    });

    const saveMock = t.mock.fn(async () => {});
    const userDoc = {
        _id: STO_USER_ID,
        cardId: STO_CARD_ID,
        plan: "monthly",
        email: "u@example.com",
        firstName: "U",
        subscription: { status: "active", expiresAt: new Date(Date.now() + 1e9) },
        tranzilaSto: { status: "created", stoId: "S1" },
        renewalFailedAt: null,
        save: saveMock,
    };
    mockStoHandler(t, { user: userDoc, cardOrgId: null });

    const ledgerSentinel = new Error("reached paid ledger create");
    const txnCreate = t.mock.method(PaymentTransaction, "create", async () => {
        throw ledgerSentinel;
    });

    await assert.rejects(
        () => paymentProvider.handleStoNotify(stoPayload()),
        /reached paid ledger create/,
    );
    assert.equal(
        txnCreate.mock.callCount(),
        1,
        "personal scope must reach the paid ledger create",
    );
});

// ── STO creation call-site defense (Section I: 14-18) ───────────────────────

test("createTranzilaStoForUser defense rejects an unverified REAL_ORG scope before provider work", async (t) => {
    t.mock.method(User, "findById", () =>
        leanBuilder({ cardId: STO_CARD_ID }),
    );
    t.mock.method(Card, "findById", () => leanBuilder({ orgId: REAL_ORG_ID }));
    t.mock.method(Organization, "findOne", () =>
        leanBuilder({ _id: DEFAULT_PERSONAL_ORG_ID }),
    );
    const userDoc = { _id: STO_USER_ID, cardId: STO_CARD_ID };

    const result = await createTranzilaStoForUser(userDoc, "monthly");

    assert.equal(result.ok, false);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, "non_personal_scope");
});

test("createTranzilaStoForUser defense rejects an unverified UNKNOWN scope", async (t) => {
    t.mock.method(User, "findById", () => leanBuilder({ cardId: null }));
    const userDoc = { _id: STO_USER_ID, cardId: null };

    const result = await createTranzilaStoForUser(userDoc, "monthly");

    assert.equal(result.ok, false);
    assert.equal(result.reason, "non_personal_scope");
});

test("classifyCheckoutBillingScope gates the resume path: real_org / unknown are non-personal, null-org / sentinel are personal", async () => {
    const real = await classifyCheckoutBillingScope(
        STO_USER_ID,
        makeFakeDeps({ user: { cardId: STO_CARD_ID }, card: { orgId: REAL_ORG_ID } }),
    );
    assert.equal(real, "real_org");

    const unknown = await classifyCheckoutBillingScope(
        STO_USER_ID,
        makeFakeDeps({ user: { cardId: null } }),
    );
    assert.equal(unknown, "unknown");

    const personalNull = await classifyCheckoutBillingScope(
        STO_USER_ID,
        makeFakeDeps({ user: { cardId: STO_CARD_ID }, card: { orgId: null } }),
    );
    assert.equal(personalNull, "personal");

    const personalSentinel = await classifyCheckoutBillingScope(
        STO_USER_ID,
        makeFakeDeps({
            user: { cardId: STO_CARD_ID },
            card: { orgId: DEFAULT_PERSONAL_ORG_ID },
            personalOrgId: DEFAULT_PERSONAL_ORG_ID,
        }),
    );
    assert.equal(personalSentinel, "personal");
});

// ── Durable collision review + exact legacy-hash comparison (Section I: 20-25) ─

test("integrity collision durably marks the existing row manual_review without overwriting evidence", async () => {
    const deps = makeFakeDeps();
    await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({ amountAgorot: 2900 }),
        deps,
    );
    const row = deps.__rows[0];
    const original = {
        evidenceFingerprint: row.evidenceFingerprint,
        provider: row.provider,
        providerTerminal: row.providerTerminal,
        legacyProviderTxnId: row.legacyProviderTxnId,
        legacyProviderTxnIdHash: row.legacyProviderTxnIdHash,
        firstObservedAt: row.firstObservedAt,
        amountAgorot: row.amountAgorot,
    };

    const r = await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({ amountAgorot: 9900 }),
        deps,
    );

    assert.equal(r.integrityCollision, true);
    assert.equal(row.correlationStatus, "manual_review");
    assert.equal(row.identityStatus, "integrity_collision");
    assert.equal(row.safeErrorCode, "provider_event_integrity_collision");
    assert.ok(row.collisionObservedAt instanceof Date);
    // Immutable evidence is untouched (Section I: 25).
    assert.equal(row.evidenceFingerprint, original.evidenceFingerprint);
    assert.equal(row.provider, original.provider);
    assert.equal(row.providerTerminal, original.providerTerminal);
    assert.equal(row.legacyProviderTxnId, original.legacyProviderTxnId);
    assert.equal(row.legacyProviderTxnIdHash, original.legacyProviderTxnIdHash);
    assert.equal(row.firstObservedAt, original.firstObservedAt);
    assert.equal(row.amountAgorot, original.amountAgorot);
});

test("identity collision durably marks the conflicting keyed row manual_review", async () => {
    const sharedHash = crypto
        .createHash("sha256")
        .update("tranzila:shared")
        .digest("hex");
    const seedRows = [
        {
            eventKey: "seed-key",
            legacyProviderTxnId: "tranzila:shared",
            legacyProviderTxnIdHash: sharedHash,
            providerTerminal: "TERM_A",
            provider: "tranzila",
            eventType: "first_payment",
            providerPaymentStatus: "paid",
            correlationStatus: "correlation_pending",
        },
    ];
    const deps = makeFakeDeps({ seedRows });
    const r = await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({
            legacyProviderTxnId: "tranzila:shared",
            canonicalTerminal: "TERM_B",
        }),
        deps,
    );
    assert.equal(r.safeErrorCode, "provider_identity_collision");
    const seed = deps.__rows.find((row) => row.eventKey === "seed-key");
    assert.equal(seed.correlationStatus, "manual_review");
    assert.equal(seed.identityStatus, "integrity_collision");
    assert.equal(seed.safeErrorCode, "provider_identity_collision");
    assert.ok(seed.collisionObservedAt instanceof Date);
});

test("legacy-hash conflict performs the EXACT id comparison (same id → provider_identity_collision)", async () => {
    const sharedHash = crypto
        .createHash("sha256")
        .update("tranzila:idx-1")
        .digest("hex");
    const seedRows = [
        {
            eventKey: "seed-key",
            legacyProviderTxnId: "tranzila:idx-1",
            legacyProviderTxnIdHash: sharedHash,
            providerTerminal: "TERM_A",
            provider: "tranzila",
            eventType: "first_payment",
            providerPaymentStatus: "paid",
        },
    ];
    const deps = makeFakeDeps({ seedRows });
    const r = await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({ canonicalTerminal: "TERM_B" }),
        deps,
    );
    assert.equal(r.safeErrorCode, "provider_identity_collision");
    assert.equal(r.identityCollision, true);
});

test("simulated legacy-hash collision (different exact id) is NOT treated as a provider identity duplicate", async () => {
    const inputHash = crypto
        .createHash("sha256")
        .update("tranzila:idx-1")
        .digest("hex");
    const seedRows = [
        {
            eventKey: "seed-key",
            legacyProviderTxnId: "tranzila:DIFFERENT",
            legacyProviderTxnIdHash: inputHash, // engineered hash collision
            providerTerminal: "TERM_A",
            provider: "tranzila",
            eventType: "first_payment",
            providerPaymentStatus: "paid",
        },
    ];
    const deps = makeFakeDeps({ seedRows });
    const r = await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput(),
        deps,
    );
    assert.equal(r.safeErrorCode, "legacy_identity_hash_collision");
    assert.equal(r.identityCollision, true);
    assert.ok(
        deps.__metrics.some(
            (m) => m.name === "payment.inbox.legacy_hash_collision_critical",
        ),
    );
    const seed = deps.__rows.find((row) => row.eventKey === "seed-key");
    assert.equal(seed.correlationStatus, "manual_review");
});

test("an unrelated E11000 index conflict is rethrown (retryable), never masked as a collision", async () => {
    const deps = makeFakeDeps();
    deps.PaymentEventInbox.findOneAndUpdate = async () => {
        const err = new Error("E11000 duplicate key error: someOtherUniqueField");
        err.code = 11000;
        err.keyPattern = { someOtherUniqueField: 1 };
        throw err;
    };
    await assert.rejects(
        () => captureAuthenticatedPaymentEvent(baseFirstPaymentInput(), deps),
        (err) => err.code === 11000,
    );
});

// ── Obsolete index reporting + terminal schema decision (Section I: 26-28) ──

test("obsolete Phase 2A legacy index is explicitly reported (never silently dropped)", () => {
    const byName = new Map([
        [
            OBSOLETE_LEGACY_INDEX_NAME,
            { key: { legacyProviderTxnId: 1 }, unique: false },
        ],
    ]);
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));
    let result;
    try {
        result = reportObsoleteLegacyIndex(byName);
    } finally {
        console.log = originalLog;
    }
    assert.equal(result.present, true);
    assert.ok(
        logs.some((l) => l.includes("LEGACY_EXTRA_INDEX_PRESENT")),
        "obsolete index presence must be explicitly reported",
    );
    assert.ok(
        logs.some((l) => l.includes("NOT dropped")),
        "reporter must state the index is NOT dropped",
    );
});

test("obsolete-index reporter performs no drop (report-only; absent → present:false)", () => {
    // The reporter accepts ONLY the index map — it has no collection handle and
    // therefore structurally cannot drop an index.
    assert.equal(reportObsoleteLegacyIndex.length, 1);
    assert.deepEqual(reportObsoleteLegacyIndex(new Map()), { present: false });
});

test("providerTerminal longer than 64 chars does not fail inbox schema validation", () => {
    const longTerminal = "T".repeat(100);
    const doc = new PaymentEventInbox({
        eventKey: "k",
        provider: "tranzila",
        providerTerminal: longTerminal,
        eventType: "sto_recurring",
        identityStatus: "stable",
        providerPaymentStatus: "paid",
        evidenceFingerprint: "f",
        firstObservedAt: new Date(),
        correlationStatus: "correlation_pending",
    });
    const err = doc.validateSync();
    assert.ok(
        !err || !err.errors || !err.errors.providerTerminal,
        "providerTerminal must have no length validation error",
    );
});

test("collisionObservedAt is an accepted optional inbox field", () => {
    const doc = new PaymentEventInbox({
        eventKey: "k2",
        provider: "tranzila",
        providerTerminal: "STO_TERM",
        eventType: "sto_recurring",
        identityStatus: "integrity_collision",
        providerPaymentStatus: "paid",
        evidenceFingerprint: "f",
        firstObservedAt: new Date(),
        correlationStatus: "manual_review",
        collisionObservedAt: new Date(),
    });
    const err = doc.validateSync();
    assert.ok(
        !err || !err.errors || !err.errors.collisionObservedAt,
        "collisionObservedAt must be a valid optional field",
    );
});

// ══════════════════════════════════════════════════════════════════════════
// Phase 2A.3 — (1) provider-authenticated but business-mismatched events are
// still durably captured (never lost) and quarantined to manual_review, and
// (2) a collision / manual-review quarantine is STICKY: no later duplicate or
// concurrent correlation update may clear or bypass it. Mocks prove control
// flow only; no DB, no provider calls.
// ══════════════════════════════════════════════════════════════════════════

function paidDirectNgPayloadWithThtk(overrides = {}) {
    return { ...paidDirectNgPayload(), ...overrides };
}

// ── (1) Provider-authenticated business-mismatch → durable manual_review ─────

test("J1: DirectNG authenticated + mismatching intent user → durable manual_review, no consuming CAS, no ledger", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    // Intent exists (provider trust anchor) but its user ≠ the notify udf1.
    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        userId: "0123456789abcdef0123bbbb",
        plan: "monthly",
        amountAgorot: 2900,
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null, // inserted, stable identity
    );
    const updates = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1 };
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run on business mismatch");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(
        capture.mock.callCount(),
        1,
        "authenticated paid event must still be captured (never lost)",
    );
    assert.equal(
        consuming.mock.callCount(),
        0,
        "no consuming CAS when business correlation fails",
    );
    assert.equal(
        ledger.mock.callCount(),
        0,
        "no ledger insert when business correlation fails",
    );
    assert.ok(
        updates.some(
            (u) =>
                u.update?.$set?.safeErrorCode ===
                    "payment_intent_business_mismatch" &&
                u.update?.$set?.correlationStatus === "manual_review",
        ),
        "row must be durably marked manual_review with the business-mismatch code",
    );
});

test("J2: DirectNG authenticated + mismatching intent plan → durable manual_review, no fulfillment", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        userId: "0123456789abcdef01234567",
        plan: "yearly", // notify udf2 is "monthly"
        amountAgorot: 2900,
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const updates = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1 };
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(capture.mock.callCount(), 1);
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
    assert.ok(
        updates.some(
            (u) =>
                u.update?.$set?.safeErrorCode ===
                "payment_intent_business_mismatch",
        ),
    );
});

test("J3: DirectNG authenticated + mismatching intent amount → durable manual_review, no fulfillment", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        userId: "0123456789abcdef01234567",
        plan: "monthly",
        amountAgorot: 9900, // notify sum resolves to 2900
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const updates = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1 };
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(capture.mock.callCount(), 1);
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
    assert.ok(
        updates.some(
            (u) =>
                u.update?.$set?.safeErrorCode ===
                "payment_intent_business_mismatch",
        ),
    );
});

test("J4: DirectNG authenticated + wrong currency → durable manual_review, no fulfillment", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        userId: "0123456789abcdef01234567",
        plan: "monthly",
        amountAgorot: 2900,
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const updates = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1 };
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    // currency "2" ≠ "1" → currencyOk false → businessCorrelationOk false.
    await paymentProvider.handleNotify(
        paidDirectNgPayloadWithThtk({ currency: "2" }),
    );

    assert.equal(
        capture.mock.callCount(),
        1,
        "authenticated event still captured even with a wrong-currency business mismatch",
    );
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
    assert.ok(
        updates.some(
            (u) =>
                u.update?.$set?.safeErrorCode ===
                "payment_intent_business_mismatch",
        ),
    );
});

// ── Provider trust FAILURE → no authenticated capture at all ────────────────

test("J5: missing intent → no authenticated inbox capture and no consuming CAS", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => null);
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(
        capture.mock.callCount(),
        0,
        "provider trust fail (no intent) must not create an authenticated inbox row",
    );
    assert.equal(consuming.mock.callCount(), 0);
});

test("J6: thtk mismatch → no authenticated inbox capture", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "true";
    t.after(() => {
        process.env.TRANZILA_HANDSHAKE_ENABLED = "false";
    });

    const storedHash = crypto
        .createHash("sha256")
        .update("correct-thtk")
        .digest("hex");
    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: storedHash,
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));
    // §6.5 fires a fire-and-forget PaymentIntent.updateOne on the isPaid=false
    // resolve path; mock it so it never buffers against a real Mongoose model.
    t.mock.method(PaymentIntent, "updateOne", async () => ({
        matchedCount: 1,
    }));

    await paymentProvider.handleNotify(
        paidDirectNgPayloadWithThtk({ thtk: "wrong-thtk" }),
    );

    assert.equal(
        capture.mock.callCount(),
        0,
        "thtk mismatch = provider trust fail → no authenticated capture",
    );
    assert.equal(consuming.mock.callCount(), 0);
});

test("J7: valid legacy signature + paid signal + business mismatch → durable manual_review, no fulfillment", async (t) => {
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    // Business mismatch on the legacy path: udf1 is signed but is NOT an
    // ObjectId, so userId resolves to null → businessCorrelationOk is false
    // while the legacy signature still authenticates the provider.
    const legacyBase = {
        Response: "000",
        sum: "29.00",
        currency: "1",
        index: "999",
        udf1: "not-an-objectid",
        udf2: "monthly",
        udf3: "0123456789abcdef0123abcd",
    };
    const signaturePayload = [
        `terminal=${TRANZILA_CONFIG.terminal}`,
        `sum=${legacyBase.sum}`,
        `Response=${legacyBase.Response}`,
        `udf1=${legacyBase.udf1}`,
        `udf2=${legacyBase.udf2}`,
    ].join("&");
    const signature = crypto
        .createHash("sha256")
        .update(signaturePayload + TRANZILA_CONFIG.secret)
        .digest("hex");

    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const updates = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1 };
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    await paymentProvider.handleNotify({ ...legacyBase, signature });

    assert.equal(
        capture.mock.callCount(),
        1,
        "legacy-authenticated paid event must still be durably captured",
    );
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
    assert.ok(
        updates.some(
            (u) =>
                u.update?.$set?.safeErrorCode ===
                "legacy_payment_business_mismatch",
        ),
        "legacy business mismatch must be durably marked manual_review",
    );
});

// ── (2) Sticky quarantine — capture-result signalling ───────────────────────

test("J8: redelivered matching event against a quarantined row → quarantined:true", async () => {
    const deps = makeFakeDeps();
    const input = baseFirstPaymentInput();
    await captureAuthenticatedPaymentEvent(input, deps); // insert stable row
    // Simulate the row being quarantined between deliveries.
    deps.__rows[0].identityStatus = "integrity_collision";
    deps.__rows[0].correlationStatus = "manual_review";
    deps.__rows[0].safeErrorCode = "provider_event_integrity_collision";

    const r = await captureAuthenticatedPaymentEvent(input, deps);
    assert.equal(r.duplicate, true);
    assert.equal(r.quarantined, true);
    assert.equal(r.identityStatus, "integrity_collision");
    assert.equal(r.correlationStatus, "manual_review");
});

test("J9: matching first-payment delivery against a quarantined row → no consuming CAS, no ledger", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
    }));
    // Duplicate delivery lands on an already-quarantined row.
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () => ({
        eventKey: "dup",
        identityStatus: "integrity_collision",
        correlationStatus: "manual_review",
    }));
    const updates = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1 };
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run against a quarantine");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(
        consuming.mock.callCount(),
        0,
        "quarantined row must never reach the consuming CAS",
    );
    assert.equal(
        ledger.mock.callCount(),
        0,
        "quarantined row must never produce a ledger insert",
    );
    assert.ok(
        !updates.some((u) => u.update?.$set?.correlationStatus === "correlated"),
        "quarantine must never be overwritten to correlated",
    );
});

test("J10: matching recurring STO delivery against a quarantined row → no continuation or mutation", async (t) => {
    const originalStoTerminal = TRANZILA_CONFIG.stoTerminal;
    TRANZILA_CONFIG.stoTerminal = "STO_TERM";
    t.after(() => {
        TRANZILA_CONFIG.stoTerminal = originalStoTerminal;
    });

    const saveMock = t.mock.fn(async () => {});
    const userDoc = { _id: STO_USER_ID, cardId: STO_CARD_ID, save: saveMock };
    // capture="duplicate" lands on a quarantined identity-collision row.
    mockStoHandler(t, {
        user: userDoc,
        cardOrgId: null,
        capture: "duplicate",
    });
    const txnCreate = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));
    const cardUpdate = t.mock.method(Card, "updateOne", async () => ({}));
    const receiptCreate = t.mock.method(Receipt, "create", async () => ({
        _id: "r",
    }));

    const r = await paymentProvider.handleStoNotify(stoPayload());

    assert.equal(r.ok, true);
    assert.equal(r.duplicate, true);
    assert.equal(
        txnCreate.mock.callCount(),
        0,
        "quarantined STO redelivery must not create a ledger row",
    );
    assert.equal(saveMock.mock.callCount(), 0);
    assert.equal(cardUpdate.mock.callCount(), 0);
    assert.equal(receiptCreate.mock.callCount(), 0);
});

test("J11: guarded correlation update cannot overwrite a quarantine (matchedCount 0 → stop)", async () => {
    const deps = makeFakeDeps({
        user: { cardId: STO_CARD_ID },
        card: { orgId: null },
    });
    // Row quarantined between capture and correlation.
    deps.__rows.push({
        eventKey: "jq1",
        identityStatus: "integrity_collision",
        correlationStatus: "manual_review",
        safeErrorCode: "provider_event_integrity_collision",
    });

    const c = await resolveFirstPaymentContinuation(
        { eventKey: "jq1", userId: "0123456789abcdef0123aaaa" },
        deps,
    );

    assert.equal(c.continue, false);
    assert.equal(c.quarantined, true);
    assert.equal(c.stopReason, "quarantined");
    const row = deps.__rows.find((r) => r.eventKey === "jq1");
    assert.equal(
        row.correlationStatus,
        "manual_review",
        "quarantine must not be overwritten to correlated",
    );
    assert.equal(
        row.safeErrorCode,
        "provider_event_integrity_collision",
        "quarantine safeErrorCode must be preserved",
    );
});

test("J12: ordinary non-quarantined duplicate is not quarantined and stays correlatable", async () => {
    const deps = makeFakeDeps();
    const input = baseFirstPaymentInput();
    await captureAuthenticatedPaymentEvent(input, deps);
    const r = await captureAuthenticatedPaymentEvent(input, deps);
    assert.equal(r.duplicate, true);
    assert.equal(r.quarantined, false);
});

test("J13: correlation_pending is retryable (not treated as a permanent quarantine)", async () => {
    const deps = makeFakeDeps({
        user: { cardId: STO_CARD_ID },
        card: { orgId: null },
    });
    deps.__rows.push({
        eventKey: "jp1",
        identityStatus: "stable",
        correlationStatus: "correlation_pending",
    });

    const c = await resolveFirstPaymentContinuation(
        { eventKey: "jp1", userId: "0123456789abcdef0123aaaa" },
        deps,
    );

    assert.equal(c.continue, true);
    const row = deps.__rows.find((r) => r.eventKey === "jp1");
    assert.equal(row.correlationStatus, "correlated");
});

test("J14: collision safeErrorCode is preserved across a later matching duplicate", async () => {
    const deps = makeFakeDeps();
    const input = baseFirstPaymentInput({ amountAgorot: 2900 });
    await captureAuthenticatedPaymentEvent(input, deps); // insert
    // Conflicting redelivery quarantines the row.
    await captureAuthenticatedPaymentEvent(
        baseFirstPaymentInput({ amountAgorot: 9900 }),
        deps,
    );
    const row = deps.__rows[0];
    assert.equal(row.safeErrorCode, "provider_event_integrity_collision");

    // The ORIGINAL matching event is redelivered afterwards.
    const r = await captureAuthenticatedPaymentEvent(input, deps);
    assert.equal(r.quarantined, true);
    assert.equal(
        row.safeErrorCode,
        "provider_event_integrity_collision",
        "later matching duplicate must not clear the collision safeErrorCode",
    );
});

// ══════════════════════════════════════════════════════════════════════════
// Phase 2A.3-R2 — DirectNG authentication trust matrix (supplier + index are
// REQUIRED and cannot be replaced by PaymentIntent existence or thtk),
// strict PaymentIntent field correlation, legacy amount/currency correlation,
// and the manual_review-excluding atomic correlation filter. Mocks prove
// control flow only; no DB, no provider calls.
// ══════════════════════════════════════════════════════════════════════════

const HANDSHAKE_HASH = crypto
    .createHash("sha256")
    .update("correct-thtk")
    .digest("hex");

test("H1: handshake off + supplier mismatch → no authenticated capture, no consuming, no fulfillment", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        userId: "0123456789abcdef01234567",
        plan: "monthly",
        amountAgorot: 2900,
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run on auth failure");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));
    // §6.5 fires a fire-and-forget updateOne on the isPaid=false resolve path.
    t.mock.method(PaymentIntent, "updateOne", async () => ({ matchedCount: 1 }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify(
        paidDirectNgPayloadWithThtk({ supplier: "WRONG_TERM" }),
    );

    assert.equal(
        capture.mock.callCount(),
        0,
        "supplier mismatch is an authentication failure → no inbox capture",
    );
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0, "no User fulfillment");
});

test("H2: handshake off + missing index → no authenticated capture, no consuming, no fulfillment", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        userId: "0123456789abcdef01234567",
        plan: "monthly",
        amountAgorot: 2900,
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run on auth failure");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));
    t.mock.method(PaymentIntent, "updateOne", async () => ({ matchedCount: 1 }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify(
        paidDirectNgPayloadWithThtk({ index: "" }),
    );

    assert.equal(
        capture.mock.callCount(),
        0,
        "missing index is an authentication failure → no inbox capture",
    );
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0);
});

test("H3: handshake on + valid thtk + supplier mismatch → thtk cannot replace supplier trust (no capture)", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "true";
    t.after(() => {
        process.env.TRANZILA_HANDSHAKE_ENABLED = "false";
    });

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: HANDSHAKE_HASH,
        userId: "0123456789abcdef01234567",
        plan: "monthly",
        amountAgorot: 2900,
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run on auth failure");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));
    t.mock.method(PaymentIntent, "updateOne", async () => ({ matchedCount: 1 }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify(
        paidDirectNgPayloadWithThtk({
            thtk: "correct-thtk",
            supplier: "WRONG_TERM",
        }),
    );

    assert.equal(
        capture.mock.callCount(),
        0,
        "verified thtk must NOT substitute for the required supplier trust",
    );
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0);
});

test("H4: handshake on + valid thtk + missing index → thtk cannot replace index trust (no capture)", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "true";
    t.after(() => {
        process.env.TRANZILA_HANDSHAKE_ENABLED = "false";
    });

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: HANDSHAKE_HASH,
        userId: "0123456789abcdef01234567",
        plan: "monthly",
        amountAgorot: 2900,
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run on auth failure");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));
    t.mock.method(PaymentIntent, "updateOne", async () => ({ matchedCount: 1 }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify(
        paidDirectNgPayloadWithThtk({ thtk: "correct-thtk", index: "" }),
    );

    assert.equal(
        capture.mock.callCount(),
        0,
        "verified thtk must NOT substitute for the required index trust",
    );
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0);
});

test("H5: handshake on + valid thtk + valid supplier/index + complete intent → authenticated capture reaches consuming CAS", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "true";
    t.after(() => {
        process.env.TRANZILA_HANDSHAKE_ENABLED = "false";
    });

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: HANDSHAKE_HASH,
        userId: "0123456789abcdef01234567",
        plan: "monthly",
        amountAgorot: 2900,
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 1,
    }));
    t.mock.method(User, "findById", () =>
        leanBuilder({ cardId: "0123456789abcdef01234567" }),
    );
    t.mock.method(Card, "findById", () => leanBuilder({ orgId: null }));
    t.mock.method(Organization, "findOne", () =>
        leanBuilder({ _id: DEFAULT_PERSONAL_ORG_ID }),
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("reached consuming");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));

    await paymentProvider.handleNotify(
        paidDirectNgPayloadWithThtk({ thtk: "correct-thtk" }),
    );

    assert.equal(
        capture.mock.callCount(),
        1,
        "complete valid trust matrix must authenticate and capture",
    );
    assert.equal(
        consuming.mock.callCount(),
        1,
        "authenticated + correlated personal event must reach the consuming CAS",
    );
});

test("H6: valid legacy signature + amount mismatch → durable manual_review (legacy code), no fulfillment", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    const legacyBase = {
        Response: "000",
        sum: "99.00", // 9900 agorot ≠ monthly 2900 → sumOk false
        currency: "1",
        index: "999",
        udf1: "0123456789abcdef01234567", // valid → userId resolves
        udf2: "monthly",
        udf3: "0123456789abcdef0123abcd",
    };
    const signaturePayload = [
        `terminal=${TRANZILA_CONFIG.terminal}`,
        `sum=${legacyBase.sum}`,
        `Response=${legacyBase.Response}`,
        `udf1=${legacyBase.udf1}`,
        `udf2=${legacyBase.udf2}`,
    ].join("&");
    const signature = crypto
        .createHash("sha256")
        .update(signaturePayload + TRANZILA_CONFIG.secret)
        .digest("hex");

    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const updates = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1 };
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify({ ...legacyBase, signature });

    assert.equal(
        capture.mock.callCount(),
        1,
        "legacy-authenticated paid event must still be captured",
    );
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0, "wrong amount must not fulfill");
    assert.ok(
        updates.some(
            (u) =>
                u.update?.$set?.safeErrorCode ===
                    "legacy_payment_business_mismatch" &&
                u.update?.$set?.correlationStatus === "manual_review",
        ),
        "legacy amount mismatch must be durably marked manual_review",
    );
});

test("H7: valid legacy signature + wrong currency → durable manual_review (legacy code), no fulfillment", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    const legacyBase = {
        Response: "000",
        sum: "29.00",
        currency: "2", // ≠ "1" → currencyOk false
        index: "999",
        udf1: "0123456789abcdef01234567",
        udf2: "monthly",
        udf3: "0123456789abcdef0123abcd",
    };
    const signaturePayload = [
        `terminal=${TRANZILA_CONFIG.terminal}`,
        `sum=${legacyBase.sum}`,
        `Response=${legacyBase.Response}`,
        `udf1=${legacyBase.udf1}`,
        `udf2=${legacyBase.udf2}`,
    ].join("&");
    const signature = crypto
        .createHash("sha256")
        .update(signaturePayload + TRANZILA_CONFIG.secret)
        .digest("hex");

    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const updates = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1 };
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify({ ...legacyBase, signature });

    assert.equal(capture.mock.callCount(), 1);
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0, "wrong currency must not fulfill");
    assert.ok(
        updates.some(
            (u) =>
                u.update?.$set?.safeErrorCode ===
                "legacy_payment_business_mismatch",
        ),
        "legacy currency mismatch must be durably marked manual_review",
    );
});

test("H8: DirectNG authenticated + intent missing userId → manual_review, no fulfillment (no fail-open)", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        plan: "monthly",
        amountAgorot: 2900,
        // userId intentionally absent
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const updates = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1 };
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(capture.mock.callCount(), 1);
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0);
    assert.ok(
        updates.some(
            (u) =>
                u.update?.$set?.safeErrorCode ===
                "payment_intent_business_mismatch",
        ),
        "missing intent userId must fail closed to manual_review",
    );
});

test("H9: DirectNG authenticated + intent missing plan → manual_review, no fulfillment (no fail-open)", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        userId: "0123456789abcdef01234567",
        amountAgorot: 2900,
        // plan intentionally absent
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const updates = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1 };
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(capture.mock.callCount(), 1);
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0);
    assert.ok(
        updates.some(
            (u) =>
                u.update?.$set?.safeErrorCode ===
                "payment_intent_business_mismatch",
        ),
        "missing intent plan must fail closed to manual_review",
    );
});

test("H10: DirectNG authenticated + intent missing amountAgorot → manual_review, no fulfillment (no fail-open)", async (t) => {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";

    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        userId: "0123456789abcdef01234567",
        plan: "monthly",
        // amountAgorot intentionally absent
    }));
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    const updates = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1 };
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(capture.mock.callCount(), 1);
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0);
    assert.ok(
        updates.some(
            (u) =>
                u.update?.$set?.safeErrorCode ===
                "payment_intent_business_mismatch",
        ),
        "missing intent amountAgorot must fail closed to manual_review",
    );
});

test("H11: atomic correlation filter excludes identityStatus=manual_review (quarantine not overwritten to correlated)", async () => {
    const deps = makeFakeDeps({
        user: { cardId: STO_CARD_ID },
        card: { orgId: null },
    });
    // Row became manual_review (identity) with correlation still pending between
    // capture and correlation — the update filter must refuse to correlate it.
    deps.__rows.push({
        eventKey: "hm1",
        identityStatus: "manual_review",
        correlationStatus: "correlation_pending",
        safeErrorCode: "payment_intent_business_mismatch",
    });

    const c = await resolveFirstPaymentContinuation(
        { eventKey: "hm1", userId: "0123456789abcdef0123aaaa" },
        deps,
    );

    assert.equal(c.continue, false);
    assert.equal(c.quarantined, true);
    assert.equal(c.stopReason, "quarantined");
    const row = deps.__rows.find((r) => r.eventKey === "hm1");
    assert.notEqual(
        row.correlationStatus,
        "correlated",
        "a manual_review identity must never be overwritten to correlated",
    );
    assert.equal(
        row.safeErrorCode,
        "payment_intent_business_mismatch",
        "manual_review safeErrorCode must be preserved",
    );
});

// ══════════════════════════════════════════════════════════════════════════
// Phase 2A.3-R3 — business-mismatch review-write ACK safety. A trusted paid
// event with a business mismatch may only receive a safe provider ACK when the
// manual_review transition was durably applied (matchedCount>0) or a stronger
// quarantine already owns the row. A missing/unmodified row → retryable throw.
// Mocks prove control flow only; no DB, no provider calls.
// ══════════════════════════════════════════════════════════════════════════

// Builds a DirectNG paid notify whose intent user mismatches → businessCorrelationOk
// is false, so the handler reaches the business-mismatch review-write branch.
function mockDirectNgBusinessMismatchIntent(t) {
    process.env.PAYMENT_INTENT_ENABLED = "true";
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";
    t.mock.method(PaymentIntent, "findOne", () => ({
        _id: "0123456789abcdef0123abcd",
        handshakeThtkHash: null,
        userId: "0123456789abcdef0123bbbb", // ≠ notify udf1
        plan: "monthly",
        amountAgorot: 2900,
    }));
}

test("R3-1: DirectNG business mismatch + review matchedCount=1 → safe return, no consuming, no ledger", async (t) => {
    mockDirectNgBusinessMismatchIntent(t);
    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 1,
    }));
    const reread = t.mock.method(PaymentEventInbox, "findOne", () =>
        leanBuilder(null),
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(capture.mock.callCount(), 1);
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0);
    assert.equal(
        reread.mock.callCount(),
        0,
        "matchedCount>0 must not trigger a re-read",
    );
});

test("R3-2: legacy business mismatch + review matchedCount=1 → safe return, no fulfillment", async (t) => {
    process.env.TRANZILA_HANDSHAKE_ENABLED = "false";
    const legacyBase = {
        Response: "000",
        sum: "99.00", // amount mismatch (≠ monthly 2900) → businessCorrelationOk false
        currency: "1",
        index: "999",
        udf1: "0123456789abcdef01234567",
        udf2: "monthly",
        udf3: "0123456789abcdef0123abcd",
    };
    const signaturePayload = [
        `terminal=${TRANZILA_CONFIG.terminal}`,
        `sum=${legacyBase.sum}`,
        `Response=${legacyBase.Response}`,
        `udf1=${legacyBase.udf1}`,
        `udf2=${legacyBase.udf2}`,
    ].join("&");
    const signature = crypto
        .createHash("sha256")
        .update(signaturePayload + TRANZILA_CONFIG.secret)
        .digest("hex");

    const capture = t.mock.method(
        PaymentEventInbox,
        "findOneAndUpdate",
        async () => null,
    );
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 1,
    }));
    const reread = t.mock.method(PaymentEventInbox, "findOne", () =>
        leanBuilder(null),
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify({ ...legacyBase, signature });

    assert.equal(capture.mock.callCount(), 1);
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0);
    assert.equal(reread.mock.callCount(), 0);
});

test("R3-3: review matchedCount=0 + reread identityStatus=integrity_collision → preserve, safe return, no fulfillment", async (t) => {
    mockDirectNgBusinessMismatchIntent(t);
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () => null);
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 0,
    }));
    const reread = t.mock.method(PaymentEventInbox, "findOne", () =>
        leanBuilder({
            identityStatus: "integrity_collision",
            correlationStatus: "manual_review",
            safeErrorCode: "provider_event_integrity_collision",
        }),
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(reread.mock.callCount(), 1, "zero-match must trigger one re-read");
    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0);
});

test("R3-4: review matchedCount=0 + reread identityStatus=manual_review → safe return, no fulfillment", async (t) => {
    mockDirectNgBusinessMismatchIntent(t);
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () => null);
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 0,
    }));
    t.mock.method(PaymentEventInbox, "findOne", () =>
        leanBuilder({
            identityStatus: "manual_review",
            correlationStatus: "correlation_pending",
            safeErrorCode: "payment_intent_business_mismatch",
        }),
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0);
});

test("R3-5: review matchedCount=0 + reread correlationStatus=manual_review → safe return, no fulfillment", async (t) => {
    mockDirectNgBusinessMismatchIntent(t);
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () => null);
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 0,
    }));
    t.mock.method(PaymentEventInbox, "findOne", () =>
        leanBuilder({
            identityStatus: "stable",
            correlationStatus: "manual_review",
            safeErrorCode: "some_prior_review_code",
        }),
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));
    const fulfil = t.mock.method(User, "findById", () => leanBuilder(null));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
    assert.equal(fulfil.mock.callCount(), 0);
});

test("R3-6: review matchedCount=0 + reread null → retryable inbox_business_review_row_missing, no fulfillment", async (t) => {
    mockDirectNgBusinessMismatchIntent(t);
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () => null);
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 0,
    }));
    t.mock.method(PaymentEventInbox, "findOne", () => leanBuilder(null));
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    await assert.rejects(
        () => paymentProvider.handleNotify(paidDirectNgPayload()),
        (err) => {
            assert.equal(err.message, "inbox_business_review_row_missing");
            assert.equal(err.retryable, true);
            return true;
        },
    );

    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
});

test("R3-7: review matchedCount=0 + reread ordinary non-quarantined row → retryable inbox_business_review_not_applied, no fulfillment", async (t) => {
    mockDirectNgBusinessMismatchIntent(t);
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () => null);
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 0,
    }));
    t.mock.method(PaymentEventInbox, "findOne", () =>
        leanBuilder({
            identityStatus: "stable",
            correlationStatus: "correlation_pending",
            safeErrorCode: null,
        }),
    );
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    await assert.rejects(
        () => paymentProvider.handleNotify(paidDirectNgPayload()),
        (err) => {
            assert.equal(err.message, "inbox_business_review_not_applied");
            assert.equal(err.retryable, true);
            return true;
        },
    );

    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
});

test("R3-8: review updateOne throws → propagate, no safe ACK, no fulfillment", async (t) => {
    mockDirectNgBusinessMismatchIntent(t);
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () => null);
    t.mock.method(PaymentEventInbox, "updateOne", async () => {
        throw new Error("review updateOne infra failure");
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    await assert.rejects(
        () => paymentProvider.handleNotify(paidDirectNgPayload()),
        /review updateOne infra failure/,
    );

    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
});

test("R3-9: review reread throws → propagate, no fulfillment", async (t) => {
    mockDirectNgBusinessMismatchIntent(t);
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () => null);
    t.mock.method(PaymentEventInbox, "updateOne", async () => ({
        matchedCount: 0,
    }));
    t.mock.method(PaymentEventInbox, "findOne", () => {
        throw new Error("reread infra failure");
    });
    const consuming = t.mock.method(
        PaymentIntent,
        "findOneAndUpdate",
        async () => {
            throw new Error("consuming must not run");
        },
    );
    const ledger = t.mock.method(PaymentTransaction, "create", async () => ({
        _id: "x",
    }));

    await assert.rejects(
        () => paymentProvider.handleNotify(paidDirectNgPayload()),
        /reread infra failure/,
    );

    assert.equal(consuming.mock.callCount(), 0);
    assert.equal(ledger.mock.callCount(), 0);
});

test("R3-10: business-mismatch review-write uses the guarded filter and cannot overwrite a collision safeErrorCode", async (t) => {
    mockDirectNgBusinessMismatchIntent(t);
    t.mock.method(PaymentEventInbox, "findOneAndUpdate", async () => null);
    const writes = [];
    t.mock.method(PaymentEventInbox, "updateOne", async (filter, update) => {
        writes.push({ filter, update });
        return { matchedCount: 0 }; // filter excluded the already-quarantined row
    });
    t.mock.method(PaymentEventInbox, "findOne", () =>
        leanBuilder({
            identityStatus: "integrity_collision",
            correlationStatus: "manual_review",
            safeErrorCode: "provider_event_integrity_collision",
        }),
    );
    t.mock.method(PaymentIntent, "findOneAndUpdate", async () => {
        throw new Error("consuming must not run");
    });
    t.mock.method(PaymentTransaction, "create", async () => ({ _id: "x" }));

    await paymentProvider.handleNotify(paidDirectNgPayload());

    const reviewWrite = writes.find(
        (w) => w.update?.$set?.correlationStatus === "manual_review",
    );
    assert.ok(reviewWrite, "review write must be attempted");
    assert.deepEqual(reviewWrite.filter.identityStatus, {
        $nin: ["integrity_collision", "manual_review"],
    });
    assert.deepEqual(reviewWrite.filter.correlationStatus, {
        $ne: "manual_review",
    });
    assert.notEqual(
        reviewWrite.update.$set.safeErrorCode,
        "provider_event_integrity_collision",
        "review write must not carry the collision code, and its guarded filter cannot match the collision row",
    );
});
