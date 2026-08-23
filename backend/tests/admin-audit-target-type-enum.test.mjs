import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import AdminAudit from "../src/models/AdminAudit.model.js";

function fixture(targetType) {
    return new AdminAudit({
        adminUserId: new mongoose.Types.ObjectId(),
        action: "test-action",
        targetType,
        targetId: new mongoose.Types.ObjectId(),
        reason: "test reason",
    });
}

const LEGITIMATE_PRODUCTION_TARGET_TYPES = [
    "user",
    "card",
    "blog",
    "org",
    "campaign",
    "guide",
    "cards-showcase",
];

for (const targetType of LEGITIMATE_PRODUCTION_TARGET_TYPES) {
    test(`targetType "${targetType}" is accepted by schema validation`, () => {
        const err = fixture(targetType).validateSync();
        assert.equal(err, undefined);
    });
}

test("targetType rejects an arbitrary invalid value", () => {
    const err = fixture("nonsense-value").validateSync();
    assert.ok(err instanceof mongoose.Error.ValidationError);
    assert.equal(err.errors.targetType.kind, "enum");
});

test("targetType remains required", () => {
    const doc = fixture(undefined);
    doc.targetType = undefined;
    const err = doc.validateSync();
    assert.ok(err instanceof mongoose.Error.ValidationError);
    assert.equal(err.errors.targetType.kind, "required");
});
