/**
 * CONTOUR: BILLING_RETENTION_PURGE_PHASE_A1_1_CREATE_CARD_RETENTION_METADATA_WRITE_CONTAINMENT
 *
 * Tests the createCard server-only-field stripping seam.
 * No DB connection. No Express server. Pure function behavior.
 *
 * Security contract: external POST /api/cards payloads must never author
 * retentionCoordinationEpoch, retentionLifecycle, or pendingStorageCleanups.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { stripServerOnlyCreateFields } from "../src/controllers/card.controller.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function payload(extra = {}) {
    return {
        business: { name: "Acme" },
        contact: { email: "test@example.com" },
        ...extra,
    };
}

// ---------------------------------------------------------------------------
// 1. top-level retentionCoordinationEpoch is removed
// ---------------------------------------------------------------------------
describe("retentionCoordinationEpoch", () => {
    it("is stripped from the create payload", () => {
        const data = payload({ retentionCoordinationEpoch: 7 });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(
                data,
                "retentionCoordinationEpoch",
            ),
            false,
        );
    });
});

// ---------------------------------------------------------------------------
// 2. nested retentionLifecycle object is removed entirely
// ---------------------------------------------------------------------------
describe("retentionLifecycle (nested object)", () => {
    it("is stripped as an entire parent object", () => {
        const data = payload({
            retentionLifecycle: {
                currentFreeCycleId: "aaaaaaaaaaaaaaaaaaaaaaaa",
                currentRetentionGenerationId: "bbbbbbbbbbbbbbbbbbbbbbbb",
                lastLogicalPurgeGenerationId: "cccccccccccccccccccccccc",
                lastLogicalPurgeAt: new Date(),
                completedRetentionPurgeSummaries: [],
            },
        });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(data, "retentionLifecycle"),
            false,
        );
    });
});

// ---------------------------------------------------------------------------
// 3. top-level pendingStorageCleanups is removed
// ---------------------------------------------------------------------------
describe("pendingStorageCleanups (top-level)", () => {
    it("is stripped from the create payload", () => {
        const data = payload({ pendingStorageCleanups: [] });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(data, "pendingStorageCleanups"),
            false,
        );
    });
});

// ---------------------------------------------------------------------------
// 4. valid-looking malicious pendingStorageCleanups entry cannot survive
// ---------------------------------------------------------------------------
describe("pendingStorageCleanups (schema-valid entry)", () => {
    it("is stripped even when the payload satisfies the Mongoose schema shape", () => {
        const now = new Date();
        const data = payload({
            pendingStorageCleanups: [
                {
                    workId: "aaaaaaaaaaaaaaaaaaaaaaaa",
                    workType: "retention_purge",
                    createdAt: now,
                    paths: ["cards/user/aaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbb/gallery/file.jpg"],
                    pathCount: 1,
                    cleanupStatus: "pending",
                    attemptCount: 0,
                },
            ],
        });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(data, "pendingStorageCleanups"),
            false,
        );
    });
});

// ---------------------------------------------------------------------------
// 5. literal dot-key "retentionLifecycle.currentFreeCycleId" cannot survive
// ---------------------------------------------------------------------------
describe("dot-path retention fields", () => {
    it('strips "retentionLifecycle.currentFreeCycleId" literal dot-key', () => {
        const data = payload({
            "retentionLifecycle.currentFreeCycleId": "aaaaaaaaaaaaaaaaaaaaaaaa",
        });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(
                data,
                "retentionLifecycle.currentFreeCycleId",
            ),
            false,
        );
    });

    it('strips "retentionLifecycle.currentRetentionGenerationId" literal dot-key', () => {
        const data = payload({
            "retentionLifecycle.currentRetentionGenerationId":
                "aaaaaaaaaaaaaaaaaaaaaaaa",
        });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(
                data,
                "retentionLifecycle.currentRetentionGenerationId",
            ),
            false,
        );
    });

    it('strips "retentionLifecycle.lastLogicalPurgeGenerationId" literal dot-key', () => {
        const data = payload({
            "retentionLifecycle.lastLogicalPurgeGenerationId":
                "aaaaaaaaaaaaaaaaaaaaaaaa",
        });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(
                data,
                "retentionLifecycle.lastLogicalPurgeGenerationId",
            ),
            false,
        );
    });

    it('strips "retentionLifecycle.lastLogicalPurgeAt" literal dot-key', () => {
        const data = payload({
            "retentionLifecycle.lastLogicalPurgeAt": new Date().toISOString(),
        });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(
                data,
                "retentionLifecycle.lastLogicalPurgeAt",
            ),
            false,
        );
    });

    it('strips "retentionLifecycle.completedRetentionPurgeSummaries" literal dot-key', () => {
        const data = payload({
            "retentionLifecycle.completedRetentionPurgeSummaries": [],
        });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(
                data,
                "retentionLifecycle.completedRetentionPurgeSummaries",
            ),
            false,
        );
    });

    it('strips "pendingStorageCleanups.0.workId" literal dot-key', () => {
        const data = payload({
            "pendingStorageCleanups.0.workId": "aaaaaaaaaaaaaaaaaaaaaaaa",
        });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(
                data,
                "pendingStorageCleanups.0.workId",
            ),
            false,
        );
    });
});

// ---------------------------------------------------------------------------
// 6. unrelated legitimate field survives untouched
// ---------------------------------------------------------------------------
describe("legitimate createCard fields", () => {
    it("business, contact, content, design, gallery, reviews, faq survive", () => {
        const data = payload({
            content: { aboutText: "Hello" },
            design: { skinKey: "default" },
            gallery: [],
            reviews: [],
            faq: null,
        });
        stripServerOnlyCreateFields(data);
        assert.deepEqual(data.business, { name: "Acme" });
        assert.deepEqual(data.contact, { email: "test@example.com" });
        assert.deepEqual(data.content, { aboutText: "Hello" });
        assert.deepEqual(data.design, { skinKey: "default" });
        assert.deepEqual(data.gallery, []);
        assert.deepEqual(data.reviews, []);
        assert.equal(data.faq, null);
    });
});

// ---------------------------------------------------------------------------
// 7. pre-existing billing/admin denylist is not regressed
// ---------------------------------------------------------------------------
describe("pre-existing protected fields", () => {
    it("billing is stripped", () => {
        const data = payload({ billing: { status: "active", plan: "monthly" } });
        stripServerOnlyCreateFields(data);
        assert.equal(Object.prototype.hasOwnProperty.call(data, "billing"), false);
    });

    it("plan is stripped", () => {
        const data = payload({ plan: "yearly" });
        stripServerOnlyCreateFields(data);
        assert.equal(Object.prototype.hasOwnProperty.call(data, "plan"), false);
    });

    it("adminOverride is stripped", () => {
        const data = payload({ adminOverride: { plan: "yearly", until: new Date() } });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(data, "adminOverride"),
            false,
        );
    });

    it("adminTier is stripped", () => {
        const data = payload({ adminTier: "pro" });
        stripServerOnlyCreateFields(data);
        assert.equal(Object.prototype.hasOwnProperty.call(data, "adminTier"), false);
    });

    it('"billing.paidUntil" dot-key is stripped', () => {
        const data = payload({ "billing.paidUntil": new Date().toISOString() });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(data, "billing.paidUntil"),
            false,
        );
    });

    it('"adminTierUntil" is stripped', () => {
        const data = payload({ adminTierUntil: new Date().toISOString() });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(data, "adminTierUntil"),
            false,
        );
    });

    it("trialStartedAt is stripped", () => {
        const data = payload({ trialStartedAt: new Date().toISOString() });
        stripServerOnlyCreateFields(data);
        assert.equal(
            Object.prototype.hasOwnProperty.call(data, "trialStartedAt"),
            false,
        );
    });

    it("uploads is stripped", () => {
        const data = payload({ uploads: [{ kind: "gallery", path: "x" }] });
        stripServerOnlyCreateFields(data);
        assert.equal(Object.prototype.hasOwnProperty.call(data, "uploads"), false);
    });

    it("slug is stripped", () => {
        const data = payload({ slug: "my-slug" });
        stripServerOnlyCreateFields(data);
        assert.equal(Object.prototype.hasOwnProperty.call(data, "slug"), false);
    });
});

// ---------------------------------------------------------------------------
// 8. both create branches are protected by the unconditional pre-branch call
// ---------------------------------------------------------------------------
// Logical proof (no DB required): stripServerOnlyCreateFields(data) is called
// at card.controller.js line 1113, BEFORE the `if (owner.type === "user")`
// branch at line 1121. Both the authenticated-user Card.create() and the
// anonymous Card.create() therefore consume the same already-stripped data
// object. Verifying that stripServerOnlyCreateFields removes the retention
// fields (tests 1-4 above) is sufficient to prove both branches are protected.
describe("pre-branch unconditional protection", () => {
    it("stripping runs on the shared data object visible to both create branches", () => {
        const data = payload({
            retentionCoordinationEpoch: 1,
            retentionLifecycle: { currentFreeCycleId: "aaaaaaaaaaaaaaaaaaaaaaaa" },
            pendingStorageCleanups: [{ workId: "x" }],
            business: { name: "SharedBranchCheck" },
        });
        stripServerOnlyCreateFields(data);

        // All three retention fields gone.
        assert.equal(
            Object.prototype.hasOwnProperty.call(data, "retentionCoordinationEpoch"),
            false,
        );
        assert.equal(
            Object.prototype.hasOwnProperty.call(data, "retentionLifecycle"),
            false,
        );
        assert.equal(
            Object.prototype.hasOwnProperty.call(data, "pendingStorageCleanups"),
            false,
        );
        // Legitimate field preserved — the data object is still usable by both branches.
        assert.deepEqual(data.business, { name: "SharedBranchCheck" });
    });

    it("null/non-object data is a no-op (guard fires)", () => {
        assert.doesNotThrow(() => stripServerOnlyCreateFields(null));
        assert.doesNotThrow(() => stripServerOnlyCreateFields(undefined));
        assert.doesNotThrow(() => stripServerOnlyCreateFields("string"));
        assert.doesNotThrow(() => stripServerOnlyCreateFields(42));
    });
});
