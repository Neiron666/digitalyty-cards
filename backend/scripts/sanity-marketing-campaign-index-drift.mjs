/**
 * sanity-marketing-campaign-index-drift.mjs
 *
 * Read-only drift sanity check for the MarketingCampaign collection indexes.
 *
 * Verifies:
 *   marketingcampaigns collection has all 3 required indexes with exact
 *   key order, direction, and unique/sparse flags as declared in
 *   MarketingCampaign.model.js.
 *
 * Non-destructive. Does NOT create, modify, or drop indexes or documents.
 *
 * Usage:
 *   node scripts/sanity-marketing-campaign-index-drift.mjs
 *
 * Expected results:
 *   Before migrate:marketing-campaign-indexes:apply — EXIT 1, indexes MISSING.
 *     This is expected and classifies as PENDING_INDEX_APPLY, not a bug.
 *   After migrate:marketing-campaign-indexes:apply — EXIT 0, all indexes OK.
 *
 * Exit codes:
 *   0 — all 3 required indexes present and correctly configured (PASS)
 *   1 — one or more indexes missing or drifted (FAIL / PENDING_INDEX_APPLY)
 */

import "dotenv/config";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function logJson(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

function keyEntries(keyObj) {
    if (!keyObj || typeof keyObj !== "object") return [];
    return Object.entries(keyObj);
}

function keySig(keyObj) {
    return keyEntries(keyObj)
        .map(([k, v]) => `${k}:${String(v)}`)
        .join("|");
}

function findActual(actual, name) {
    return actual.find((i) => i?.name === name) ?? null;
}

/**
 * Check that actual key matches expected key in field-order and direction values.
 */
function checkKey(actual, expected) {
    const aEntries = keyEntries(actual?.key);
    const eEntries = keyEntries(expected);
    if (aEntries.length !== eEntries.length) return false;
    for (let i = 0; i < eEntries.length; i += 1) {
        if (aEntries[i]?.[0] !== eEntries[i]?.[0]) return false;
        if (String(aEntries[i]?.[1]) !== String(eEntries[i]?.[1])) return false;
    }
    return true;
}

// ---------------------------------------------------------------------------
// Expected index definitions
// Mirrors MarketingCampaign.model.js exactly.
// ---------------------------------------------------------------------------

const EXPECTED_INDEXES = [
    {
        label: "A",
        name: "marketing_campaign_admin_created_v1",
        key: { createdByAdminId: 1, createdAt: -1 },
        unique: false,
        sparse: false,
        description: "Admin list: campaigns by admin, newest first",
    },
    {
        label: "B",
        name: "marketing_campaign_status_created_v1",
        key: { status: 1, createdAt: -1 },
        unique: false,
        sparse: false,
        description:
            "Status filter: campaigns by lifecycle status, newest first",
    },
    {
        label: "C",
        name: "marketing_campaign_request_id_v1",
        key: { requestId: 1 },
        unique: true,
        sparse: true,
        description: "Idempotency: unique sparse guard on client requestId",
    },
    {
        label: "D",
        name: "marketing_campaign_start_request_id_v1",
        key: { startRequestId: 1 },
        unique: true,
        sparse: true,
        description:
            "Send-start idempotency: unique sparse guard on client startRequestId",
    },
];

// ---------------------------------------------------------------------------
// Check the marketingcampaigns collection
// ---------------------------------------------------------------------------

async function checkMarketingCampaigns(db) {
    const COLLECTION_NAME = "marketingcampaigns";

    let actual = [];
    let collectionMissing = false;

    try {
        actual = await db.collection(COLLECTION_NAME).indexes();
    } catch (err) {
        // Collection does not exist yet (migration not yet applied — expected before apply).
        if (err?.code === 26 || err?.codeName === "NamespaceNotFound") {
            collectionMissing = true;
            actual = [];
        } else {
            throw err;
        }
    }

    const actualNames = actual.map((i) => i?.name).filter(Boolean);
    const expectedNames = EXPECTED_INDEXES.map((e) => e.name);

    const findings = [];

    for (const exp of EXPECTED_INDEXES) {
        const act = findActual(actual, exp.name);

        if (!act) {
            findings.push({
                label: exp.label,
                index: exp.name,
                status: "MISSING",
                description: exp.description,
                expected: {
                    name: exp.name,
                    key: exp.key,
                    unique: exp.unique,
                    sparse: exp.sparse,
                },
            });
            continue;
        }

        const errors = [];

        // Key field order and direction.
        if (!checkKey(act, exp.key)) {
            errors.push({
                field: "key",
                expected: keySig(exp.key),
                actual: keySig(act.key),
            });
        }

        // Unique flag.
        const actUnique = Boolean(act.unique);
        if (actUnique !== exp.unique) {
            errors.push({
                field: "unique",
                expected: exp.unique,
                actual: actUnique,
            });
        }

        // Sparse flag.
        const actSparse = Boolean(act.sparse);
        if (actSparse !== exp.sparse) {
            errors.push({
                field: "sparse",
                expected: exp.sparse,
                actual: actSparse,
            });
        }

        findings.push({
            label: exp.label,
            index: exp.name,
            status: errors.length === 0 ? "OK" : "DRIFT",
            description: exp.description,
            ...(errors.length ? { errors } : {}),
        });
    }

    // Unexpected indexes: present in DB but not in expected list (excluding _id_).
    const unexpected = actualNames.filter(
        (n) => n !== "_id_" && !expectedNames.includes(n),
    );

    const missing = findings.filter((f) => f.status === "MISSING");
    const mismatches = findings.filter((f) => f.status === "DRIFT");
    const failed = missing.length + mismatches.length;

    const overall = failed === 0 ? "PASS" : "FAIL";

    return {
        ok: overall === "PASS",
        collection: COLLECTION_NAME,
        collectionMissing,
        overall,
        summary: {
            expected: EXPECTED_INDEXES.length,
            ok: findings.filter((f) => f.status === "OK").length,
            missing: missing.length,
            mismatches: mismatches.length,
            unexpected: unexpected.length,
        },
        missing: missing.map((f) => f.index),
        mismatches: mismatches.map((f) => ({
            index: f.index,
            errors: f.errors,
        })),
        findings,
        unexpected,
        ...(collectionMissing || missing.length
            ? {
                  note: "Required indexes not yet present. This is expected before migrate:marketing-campaign-indexes:apply. Classify as PENDING_INDEX_APPLY, not a bug.",
              }
            : {}),
    };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    // Read-only governance: never auto-build indexes.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    await mongoose.connect(process.env.MONGO_URI, {
        autoIndex: false,
        autoCreate: false,
    });

    const db = mongoose.connection.db;
    const result = await checkMarketingCampaigns(db);

    logJson({
        ok: result.ok,
        overall: result.overall,
        summary: result.summary,
        result,
    });

    process.exitCode = result.overall === "PASS" ? 0 : 1;
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(String(err?.message || err));
    process.exitCode = 1;
    process.exit(process.exitCode);
});
