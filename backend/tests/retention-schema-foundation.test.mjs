import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Card from "../src/models/Card.model.js";
import {
    MAX_PENDING_STORAGE_CLEANUPS_PER_CARD,
    MAX_COMPLETED_RETENTION_SUMMARIES_PER_CARD,
} from "../src/config/retention.js";

function ordinaryCard() {
    return new Card({
        anonymousId: "anon-fixture-1",
        slug: "retention-schema-foundation-fixture",
        billing: { status: "free", plan: "free", paidUntil: null },
    });
}

test("1. ordinary new Card has retentionCoordinationEpoch === undefined", () => {
    const card = ordinaryCard();
    assert.equal(card.retentionCoordinationEpoch, undefined);
});

test("2. ordinary new Card has retentionLifecycle === undefined", () => {
    const card = ordinaryCard();
    assert.equal(card.retentionLifecycle, undefined);
});

test("3. ordinary new Card has pendingStorageCleanups === undefined", () => {
    const card = ordinaryCard();
    assert.equal(card.pendingStorageCleanups, undefined);
});

test("4. toObject() for an untouched ordinary Card omits the three retention paths", () => {
    const card = ordinaryCard();
    const obj = card.toObject();
    assert.equal(Object.prototype.hasOwnProperty.call(obj, "retentionCoordinationEpoch"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(obj, "retentionLifecycle"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(obj, "pendingStorageCleanups"), false);
});

test("5. materializing retentionLifecycle with only currentFreeCycleId does not implicitly create an empty completedRetentionPurgeSummaries array", () => {
    const card = ordinaryCard();
    card.retentionLifecycle = {
        currentFreeCycleId: new mongoose.Types.ObjectId(),
    };
    assert.equal(card.retentionLifecycle.completedRetentionPurgeSummaries, undefined);
});

test("6. an explicit pendingStorageCleanups work entry with explicit paths is accepted structurally", () => {
    const card = ordinaryCard();
    const workId = new mongoose.Types.ObjectId();
    card.pendingStorageCleanups = [
        {
            workId,
            workType: "gallery_delete",
            createdAt: new Date(),
            paths: ["cards/user/x/y/gallery/z.jpg"],
            pathCount: 1,
        },
    ];
    const err = card.validateSync();
    assert.equal(err, undefined);
    assert.equal(card.pendingStorageCleanups[0].paths.length, 1);
});

test("7. paths omitted from a cleanup entry must not silently become [] because the sub-schema uses default: undefined", () => {
    const card = ordinaryCard();
    card.pendingStorageCleanups = [
        {
            workId: new mongoose.Types.ObjectId(),
            workType: "upload_compensation",
            createdAt: new Date(),
            pathCount: 0,
        },
    ];
    assert.equal(card.pendingStorageCleanups[0].paths, undefined);
});

test("8. no automatic Mongoose subdocument _id is added to pendingStorageCleanups or completedRetentionPurgeSummaries entries", () => {
    const card = ordinaryCard();
    card.pendingStorageCleanups = [
        {
            workId: new mongoose.Types.ObjectId(),
            workType: "design_asset_delete",
            createdAt: new Date(),
            pathCount: 0,
        },
    ];
    card.retentionLifecycle = {
        completedRetentionPurgeSummaries: [
            {
                workId: new mongoose.Types.ObjectId(),
                freeCycleId: new mongoose.Types.ObjectId(),
                retentionGenerationId: new mongoose.Types.ObjectId(),
                logicalPurgedAt: new Date(),
                cleanupCompletedAt: new Date(),
                objectCount: 0,
            },
        ],
    };
    assert.equal(
        Object.prototype.hasOwnProperty.call(card.pendingStorageCleanups[0].toObject(), "_id"),
        false,
    );
    assert.equal(
        Object.prototype.hasOwnProperty.call(
            card.retentionLifecycle.completedRetentionPurgeSummaries[0].toObject(),
            "_id",
        ),
        false,
    );
});

test("9. pendingStorageCleanups length <= 5 accepted, > 5 rejected by validation", () => {
    const cardOk = ordinaryCard();
    cardOk.pendingStorageCleanups = Array.from(
        { length: MAX_PENDING_STORAGE_CLEANUPS_PER_CARD },
        () => ({
            workId: new mongoose.Types.ObjectId(),
            workType: "gallery_delete",
            createdAt: new Date(),
            pathCount: 0,
        }),
    );
    assert.equal(cardOk.validateSync(), undefined);

    const cardTooMany = ordinaryCard();
    cardTooMany.pendingStorageCleanups = Array.from(
        { length: MAX_PENDING_STORAGE_CLEANUPS_PER_CARD + 1 },
        () => ({
            workId: new mongoose.Types.ObjectId(),
            workType: "gallery_delete",
            createdAt: new Date(),
            pathCount: 0,
        }),
    );
    const err = cardTooMany.validateSync();
    assert.ok(err, "expected a validation error for an oversized pendingStorageCleanups queue");
});

test("10. completedRetentionPurgeSummaries length <= 20 accepted, > 20 rejected by validation", () => {
    function summary() {
        return {
            workId: new mongoose.Types.ObjectId(),
            freeCycleId: new mongoose.Types.ObjectId(),
            retentionGenerationId: new mongoose.Types.ObjectId(),
            logicalPurgedAt: new Date(),
            cleanupCompletedAt: new Date(),
            objectCount: 0,
        };
    }

    const cardOk = ordinaryCard();
    cardOk.retentionLifecycle = {
        completedRetentionPurgeSummaries: Array.from(
            { length: MAX_COMPLETED_RETENTION_SUMMARIES_PER_CARD },
            summary,
        ),
    };
    assert.equal(cardOk.validateSync(), undefined);

    const cardTooMany = ordinaryCard();
    cardTooMany.retentionLifecycle = {
        completedRetentionPurgeSummaries: Array.from(
            { length: MAX_COMPLETED_RETENTION_SUMMARIES_PER_CARD + 1 },
            summary,
        ),
    };
    const err = cardTooMany.validateSync();
    assert.ok(err, "expected a validation error for an oversized completed-summary history");
});

test("11. workType enum rejects an unsupported value", () => {
    const card = ordinaryCard();
    card.pendingStorageCleanups = [
        {
            workId: new mongoose.Types.ObjectId(),
            workType: "not_a_real_work_type",
            createdAt: new Date(),
            pathCount: 0,
        },
    ];
    const err = card.validateSync();
    assert.ok(err, "expected a validation error for an unsupported workType");
});

test("12. cleanupStatus enum rejects 'completed'", () => {
    const card = ordinaryCard();
    card.pendingStorageCleanups = [
        {
            workId: new mongoose.Types.ObjectId(),
            workType: "gallery_delete",
            createdAt: new Date(),
            pathCount: 0,
            cleanupStatus: "completed",
        },
    ];
    const err = card.validateSync();
    assert.ok(err, "expected 'completed' to be rejected by the cleanupStatus enum");
});

test("13. negative retentionCoordinationEpoch fails schema validation", () => {
    const card = ordinaryCard();
    card.retentionCoordinationEpoch = -1;
    const err = card.validateSync();
    assert.ok(err, "expected a negative retentionCoordinationEpoch to fail validation");
});
