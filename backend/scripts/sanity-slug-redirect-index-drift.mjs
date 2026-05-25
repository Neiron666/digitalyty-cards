/**
 * sanity-slug-redirect-index-drift.mjs
 *
 * Read-only drift sanity check for SlugRedirect collection indexes.
 *
 * Verifies:
 *   slugredirects collection has all 6 required indexes with exact
 *   key order, direction, uniqueness, sparse flags, and partial filter
 *   expressions as declared in SlugRedirect.model.js.
 *
 * Non-destructive. Does NOT create, modify, or drop indexes or documents.
 *
 * Usage:
 *   node scripts/sanity-slug-redirect-index-drift.mjs
 *
 * Expected results:
 *   Before migrate:slug-redirect-index:apply — EXIT 1, all indexes MISSING.
 *     This is expected and classifies as PENDING_INDEX_APPLY, not a bug.
 *   After migrate:slug-redirect-index:apply — EXIT 0, all indexes OK.
 *
 * Exit codes:
 *   0 — all 6 required indexes present and correctly configured (PASS)
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

// Normalize a partialFilterExpression for deterministic string comparison.
function stableSort(value) {
    if (Array.isArray(value)) return value.map(stableSort);
    if (value && typeof value === "object") {
        const sorted = {};
        for (const k of Object.keys(value).sort()) {
            sorted[k] = stableSort(value[k]);
        }
        return sorted;
    }
    return value;
}

function normalizedPartialJson(pfe) {
    return JSON.stringify(stableSort(pfe ?? null));
}

// ---------------------------------------------------------------------------
// Expected index definitions
// Mirrors SlugRedirect.model.js exactly.
// ---------------------------------------------------------------------------

const EXPECTED_INDEXES = [
    {
        label: "A",
        name: "routeType_1_orgId_1_slug_1_status_redirect_quarantine",
        key: { routeType: 1, orgId: 1, slug: 1 },
        unique: true,
        sparse: false,
        partialFilterExpression: { status: "redirect_quarantine" },
        description:
            "Active quarantine uniqueness: unique partial on (routeType, orgId, slug) where status=redirect_quarantine",
    },
    {
        label: "B",
        name: "routeType_1_orgId_1_slug_1_status_1_expiresAt_1",
        key: { routeType: 1, orgId: 1, slug: 1, status: 1, expiresAt: 1 },
        unique: false,
        sparse: false,
        partialFilterExpression: null,
        description: "Redirect lookup: read-path query index",
    },
    {
        label: "C",
        name: "status_1_expiresAt_1",
        key: { status: 1, expiresAt: 1 },
        unique: false,
        sparse: false,
        partialFilterExpression: null,
        description: "Release scan: batch expiry sweep",
    },
    {
        label: "D",
        name: "targetCardId_1_status_1",
        key: { targetCardId: 1, status: 1 },
        unique: false,
        sparse: true,
        partialFilterExpression: null,
        description:
            "Target card audit: sparse reverse lookup from targetCardId",
    },
    {
        label: "E",
        name: "sourceCardId_1_createdAt_-1",
        key: { sourceCardId: 1, createdAt: -1 },
        unique: false,
        sparse: true,
        partialFilterExpression: null,
        description: "Source card audit: sparse slug change history per card",
    },
    {
        label: "F",
        name: "orgId_1_createdAt_-1",
        key: { orgId: 1, createdAt: -1 },
        unique: false,
        sparse: false,
        partialFilterExpression: null,
        description: "Org audit: all slug events per org, descending",
    },
];

// ---------------------------------------------------------------------------
// Check the slugredirects collection
// ---------------------------------------------------------------------------

async function checkSlugRedirects(db) {
    const COLLECTION_NAME = "slugredirects";

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
                    partialFilterExpression: exp.partialFilterExpression,
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

        // Partial filter expression.
        const wantPfe = normalizedPartialJson(exp.partialFilterExpression);
        const gotPfe = normalizedPartialJson(
            act.partialFilterExpression ?? null,
        );
        if (wantPfe !== gotPfe) {
            errors.push({
                field: "partialFilterExpression",
                expected: exp.partialFilterExpression,
                actual: act.partialFilterExpression ?? null,
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

    const failed = findings.filter(
        (f) => f.status === "MISSING" || f.status === "DRIFT",
    );

    const overall = failed.length === 0 ? "PASS" : "FAIL";

    return {
        collection: COLLECTION_NAME,
        collectionMissing,
        overall,
        summary: {
            expected: EXPECTED_INDEXES.length,
            ok: findings.filter((f) => f.status === "OK").length,
            missing: findings.filter((f) => f.status === "MISSING").length,
            drift: findings.filter((f) => f.status === "DRIFT").length,
            unexpected: unexpected.length,
        },
        findings,
        unexpected,
        ...(collectionMissing
            ? {
                  note: "Collection does not exist yet. This is expected before migrate:slug-redirect-index:apply. Classify as PENDING_INDEX_APPLY.",
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
    const result = await checkSlugRedirects(db);

    logJson({
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
