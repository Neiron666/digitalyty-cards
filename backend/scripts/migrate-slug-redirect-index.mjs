/**
 * migrate-slug-redirect-index.mjs
 *
 * Manual index migration for the slugredirects collection.
 *
 * Usage:
 *   node scripts/migrate-slug-redirect-index.mjs              (dry-run - default, safe)
 *   node scripts/migrate-slug-redirect-index.mjs --apply      (apply indexes to DB)
 *   node scripts/migrate-slug-redirect-index.mjs --apply --verbose
 *
 * Governance rules:
 *   - Never invoked automatically at runtime (autoIndex disabled in production).
 *   - Run apply mode only when explicitly authorized (--apply flag required).
 *   - Idempotent: re-running --apply is safe if indexes already exist.
 *   - Does NOT drop indexes. Does NOT modify documents.
 *   - MUST be applied before Phase 2B (slug write-path quarantine) goes live.
 *
 * Required indexes (6 total):
 *   A. routeType_1_orgId_1_slug_1_status_redirect_quarantine
 *      { routeType:1, orgId:1, slug:1 } unique partial(status="redirect_quarantine")
 *   B. routeType_1_orgId_1_slug_1_status_1_expiresAt_1
 *      { routeType:1, orgId:1, slug:1, status:1, expiresAt:1 }
 *   C. status_1_expiresAt_1
 *      { status:1, expiresAt:1 }
 *   D. targetCardId_1_status_1
 *      { targetCardId:1, status:1 } sparse
 *   E. sourceCardId_1_createdAt_-1
 *      { sourceCardId:1, createdAt:-1 } sparse
 *   F. orgId_1_createdAt_-1
 *      { orgId:1, createdAt:-1 }
 */

import "dotenv/config";

import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";

// ---------------------------------------------------------------------------
// Arg parsing (project convention)
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const args = {
        dryRun: true,
        verbose: false,
    };

    for (const token of argv.slice(2)) {
        if (token === "--apply") args.dryRun = false;
        else if (token === "--dry-run") args.dryRun = true;
        else if (token === "--verbose") args.verbose = true;
    }

    return args;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeIndexes(col) {
    return col.indexes().catch((err) => {
        if (err?.code === 26 || err?.codeName === "NamespaceNotFound")
            return [];
        throw err;
    });
}

function indexMap(indexes) {
    return new Map(indexes.map((i) => [i.name, i]));
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

function normalizedPartial(pfe) {
    return stableSort(pfe ?? null);
}

// ---------------------------------------------------------------------------
// Expected index definitions (mirrors SlugRedirect.model.js exactly)
// ---------------------------------------------------------------------------

const COLLECTION_NAME = "slugredirects";

const EXPECTED_INDEXES = [
    {
        label: "A",
        name: "routeType_1_orgId_1_slug_1_status_redirect_quarantine",
        key: { routeType: 1, orgId: 1, slug: 1 },
        options: {
            unique: true,
            partialFilterExpression: { status: "redirect_quarantine" },
        },
        description:
            "Active quarantine uniqueness: max 1 active quarantine per (routeType, orgId, slug)",
    },
    {
        label: "B",
        name: "routeType_1_orgId_1_slug_1_status_1_expiresAt_1",
        key: { routeType: 1, orgId: 1, slug: 1, status: 1, expiresAt: 1 },
        options: {},
        description:
            "Redirect lookup: read-path query by routeType+orgId+slug+status+expiresAt",
    },
    {
        label: "C",
        name: "status_1_expiresAt_1",
        key: { status: 1, expiresAt: 1 },
        options: {},
        description: "Release scan: batch expiry sweep by status+expiresAt",
    },
    {
        label: "D",
        name: "targetCardId_1_status_1",
        key: { targetCardId: 1, status: 1 },
        options: { sparse: true },
        description:
            "Target card audit (sparse): reverse lookup from targetCardId for cascade operations",
    },
    {
        label: "E",
        name: "sourceCardId_1_createdAt_-1",
        key: { sourceCardId: 1, createdAt: -1 },
        options: { sparse: true },
        description:
            "Source card audit (sparse): slug change history per card, descending",
    },
    {
        label: "F",
        name: "orgId_1_createdAt_-1",
        key: { orgId: 1, createdAt: -1 },
        options: {},
        description: "Org audit: all slug events per org, descending",
    },
];

// ---------------------------------------------------------------------------
// Duplicate pre-check for Index A (unique partial on status=redirect_quarantine)
// ---------------------------------------------------------------------------

async function checkDuplicatesForIndexA(col, verbose) {
    const pipeline = [
        { $match: { status: "redirect_quarantine" } },
        {
            $group: {
                _id: {
                    routeType: "$routeType",
                    orgId: "$orgId",
                    slug: "$slug",
                },
                count: { $sum: 1 },
                docs: { $push: { $toString: "$_id" } },
            },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ];

    let dupes;
    try {
        dupes = await col.aggregate(pipeline).toArray();
    } catch (err) {
        if (err?.code === 26 || err?.codeName === "NamespaceNotFound") {
            if (verbose)
                console.log(
                    "  slugredirects collection not found - no duplicates possible",
                );
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            "DUPLICATE (routeType, orgId, slug) among status=redirect_quarantine - unique index BLOCKED:",
        );
        for (const d of dupes) {
            console.log(
                `  routeType=${d._id.routeType} orgId=${d._id.orgId} slug=${d._id.slug}  count=${d.count}  docs=${JSON.stringify(d.docs)}`,
            );
        }
        return true;
    }

    if (verbose)
        console.log(
            "  no duplicate (routeType, orgId, slug) among status=redirect_quarantine",
        );
    return false;
}

// ---------------------------------------------------------------------------
// Check if an existing index matches the expected spec
// ---------------------------------------------------------------------------

function checkIndexMismatch(existing, exp) {
    const errors = [];

    // Key field order and direction.
    const eEntries = keyEntries(exp.key);
    const aEntries = keyEntries(existing.key);
    if (eEntries.length !== aEntries.length) {
        errors.push({
            field: "key",
            expected: keySig(exp.key),
            actual: keySig(existing.key),
        });
    } else {
        for (let i = 0; i < eEntries.length; i += 1) {
            if (
                eEntries[i][0] !== aEntries[i][0] ||
                String(eEntries[i][1]) !== String(aEntries[i][1])
            ) {
                errors.push({
                    field: "key",
                    expected: keySig(exp.key),
                    actual: keySig(existing.key),
                });
                break;
            }
        }
    }

    // Unique flag.
    const wantUnique = Boolean(exp.options.unique);
    const gotUnique = Boolean(existing.unique);
    if (wantUnique !== gotUnique) {
        errors.push({
            field: "unique",
            expected: wantUnique,
            actual: gotUnique,
        });
    }

    // Sparse flag.
    const wantSparse = Boolean(exp.options.sparse);
    const gotSparse = Boolean(existing.sparse);
    if (wantSparse !== gotSparse) {
        errors.push({
            field: "sparse",
            expected: wantSparse,
            actual: gotSparse,
        });
    }

    // Partial filter expression.
    const wantPartial = JSON.stringify(
        normalizedPartial(exp.options.partialFilterExpression ?? null),
    );
    const gotPartial = JSON.stringify(
        normalizedPartial(existing.partialFilterExpression ?? null),
    );
    if (wantPartial !== gotPartial) {
        errors.push({
            field: "partialFilterExpression",
            expected: exp.options.partialFilterExpression ?? null,
            actual: existing.partialFilterExpression ?? null,
        });
    }

    return errors;
}

// ---------------------------------------------------------------------------
// Ensure a single index exists — dry-run or apply
// ---------------------------------------------------------------------------

async function ensureIndex(col, byName, exp, { dryRun, verbose }) {
    const { name, key, options, description, label } = exp;

    if (byName.has(name)) {
        const existing = byName.get(name);
        const errors = checkIndexMismatch(existing, exp);

        if (errors.length === 0) {
            console.log(`  [${label}] ${name} already exists - no-op`);
        } else {
            console.error(
                `  [${label}] WARNING: ${name} exists but has governance mismatches - manual intervention required`,
            );
            console.error(`    mismatches: ${JSON.stringify(errors)}`);
            process.exitCode = 2;
        }
        return { status: "existing", name };
    }

    // Index missing — would create or will create.
    if (dryRun || verbose) {
        console.log(
            dryRun
                ? `  [${label}] [dry-run] would create: ${name}  (${description})`
                : `  [${label}] creating: ${name}  (${description})`,
        );
    }

    if (dryRun) {
        return { status: "missing", name };
    }

    // Apply mode — create the index.
    const createOptions = { ...options, name };
    let rawResult;
    try {
        rawResult = await col.createIndex(key, createOptions);
        console.log(
            `  [${label}] createIndex raw result: ${JSON.stringify(rawResult)}`,
        );
    } catch (err) {
        console.error(
            `  [${label}] ERROR creating ${name}: ${err?.message ?? String(err)}`,
        );
        process.exitCode = 1;
        return { status: "create_failed", name };
    }

    // Post-check.
    const postIdx = await safeIndexes(col);
    const postByName = indexMap(postIdx);
    const created = postByName.get(name);

    if (created) {
        const postErrors = checkIndexMismatch(created, exp);
        if (postErrors.length === 0) {
            console.log(`  [${label}] ${name} - POST-CHECK PASS`);
        } else {
            console.error(
                `  [${label}] ${name} created but POST-CHECK found mismatches: ${JSON.stringify(postErrors)}`,
            );
            process.exitCode = 2;
        }
    } else {
        console.error(
            `  [${label}] ${name} not found after createIndex - POST-CHECK FAIL`,
        );
        process.exitCode = 2;
    }

    return { status: "created", name };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const args = parseArgs(process.argv);

    if (!process.env.MONGO_URI) {
        throw new Error(
            "MONGO_URI is not set (check backend/.env or env vars)",
        );
    }

    console.log(`mode: ${args.dryRun ? "DRY_RUN" : "APPLY"}`);
    console.log(`target collection: ${COLLECTION_NAME}`);

    // Never let this script trigger automatic index builds.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    await connectDB(process.env.MONGO_URI);

    try {
        const db = mongoose.connection.db;
        const col = db.collection(COLLECTION_NAME);

        // Read existing indexes — returns [] if collection does not exist.
        const existingRaw = await safeIndexes(col);
        const byName = indexMap(existingRaw);

        const existingNames = Array.from(byName.keys()).sort();
        const expectedNames = EXPECTED_INDEXES.map((e) => e.name).sort();

        if (args.verbose) {
            console.log(`\nexisting indexes: ${JSON.stringify(existingNames)}`);
        }

        console.log(`\nexpected indexes (${EXPECTED_INDEXES.length}):`);
        for (const e of EXPECTED_INDEXES) {
            console.log(
                `  [${e.label}] ${e.name}  key=${keySig(e.key)}  unique=${Boolean(e.options.unique)}  sparse=${Boolean(e.options.sparse)}  partialFilter=${JSON.stringify(e.options.partialFilterExpression ?? null)}`,
            );
        }

        console.log(
            `\nexisting indexes on ${COLLECTION_NAME} (${existingNames.length}): ${JSON.stringify(existingNames)}`,
        );

        // --- Index A: unique partial — duplicate pre-check before apply ---
        const indexA = EXPECTED_INDEXES[0]; // label "A"
        let indexADuplicatesBlocked = false;
        if (!byName.has(indexA.name)) {
            indexADuplicatesBlocked = await checkDuplicatesForIndexA(
                col,
                args.verbose,
            );
            if (indexADuplicatesBlocked && !args.dryRun) {
                console.error(
                    `\nBLOCKED: cannot create unique partial index ${indexA.name} - resolve duplicates first`,
                );
                process.exitCode = 2;
                return;
            }
        }

        // --- Process all 6 indexes ---
        console.log("\n--- slugredirects index governance ---");

        const results = [];
        for (const exp of EXPECTED_INDEXES) {
            // Skip Index A in apply if duplicates were detected (already reported above).
            if (exp.label === "A" && indexADuplicatesBlocked && !args.dryRun) {
                continue;
            }
            const result = await ensureIndex(col, byName, exp, args);
            results.push(result);
        }

        // --- Summary ---
        const missing = results
            .filter((r) => r.status === "missing")
            .map((r) => r.name);
        const created = results
            .filter((r) => r.status === "created")
            .map((r) => r.name);
        const existing = results
            .filter((r) => r.status === "existing")
            .map((r) => r.name);
        const failed = results
            .filter((r) => r.status === "create_failed")
            .map((r) => r.name);

        // Detect unexpected indexes (present in DB but not in expected list, excluding _id_).
        const unexpectedNames = existingNames.filter(
            (n) => n !== "_id_" && !expectedNames.includes(n),
        );

        const applyRequired =
            missing.length > 0 || results.some((r) => r.status === "missing");

        const summary = {
            mode: args.dryRun ? "DRY_RUN" : "APPLY",
            collection: COLLECTION_NAME,
            expectedCount: EXPECTED_INDEXES.length,
            existing,
            missing,
            created,
            failed,
            unexpected: unexpectedNames,
            applyRequired,
        };

        console.log("\n--- summary ---");
        console.log(JSON.stringify(summary, null, 2));

        if (failed.length > 0) {
            process.exitCode = 1;
        }

        console.log(
            `\ndone  mode=${args.dryRun ? "DRY_RUN" : "APPLY"}  applyRequired=${applyRequired}`,
        );
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
