/**
 * migrate-card-anonymousid-index.mjs
 *
 * Manual index migration for the cards collection: anonymousId unique+sparse.
 *
 * Usage:
 *   node scripts/migrate-card-anonymousid-index.mjs              (dry-run - default, safe)
 *   node scripts/migrate-card-anonymousid-index.mjs --apply      (apply index to DB)
 *   node scripts/migrate-card-anonymousid-index.mjs --apply --verbose
 *
 * Governance rules:
 *   - Never invoked automatically at runtime (autoIndex disabled in prod).
 *   - Run apply mode only when explicitly authorized (--apply flag required).
 *   - Idempotent: re-running --apply is safe if index already exists.
 *   - MUST be applied before accepting any anonymous card traffic on a fresh cluster.
 *
 * Required index:
 *   1. Unique + sparse: { anonymousId: 1 } - enforces one card per anonymousId.
 *      Sparse: documents without anonymousId are excluded from the index,
 *      allowing many user-owned cards (anonymousId absent/null) without conflict.
 *      Without this index, a second anonymous card creation from the same browser
 *      silently succeeds instead of triggering the claim/upsert path.
 */

import "dotenv/config";

import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";

// ── Arg parsing (project convention) ──────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────

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

// ── Duplicate precheck ───────────────────────────────────────────

/**
 * Detect duplicate anonymousId values before the unique index is applied.
 * On a fresh cluster this will always return false (empty collection).
 * On an existing cluster it is a safety belt before promoting the index.
 *
 * Note: sparse unique means only non-null/non-missing anonymousId values
 * must be unique. We only check documents where anonymousId exists and
 * is non-null.
 */
async function checkDuplicateAnonymousIds(col, verbose) {
    const pipeline = [
        {
            $match: {
                anonymousId: { $exists: true, $ne: null },
            },
        },
        {
            $group: {
                _id: "$anonymousId",
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
                    "  cards collection not found - no duplicates possible",
                );
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            "DUPLICATE anonymousId values in cards - unique index BLOCKED:",
        );
        for (const d of dupes) {
            console.log(
                `  anonymousId=${d._id}  count=${d.count}  docs=${JSON.stringify(d.docs)}`,
            );
        }
        return true;
    }

    if (verbose) console.log("  no duplicate anonymousId values in cards");
    return false;
}

// ── cards.anonymousId index governance ────────────────────────────

async function ensureAnonymousIdIndex({ dryRun, verbose }) {
    const db = mongoose.connection.db;
    const col = db.collection("cards");

    console.log("\n--- cards.anonymousId ---");

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose)
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );

    // The schema-declared path-level index gets an auto-generated name
    // of "anonymousId_1" from Mongoose.
    const wantName = "anonymousId_1";

    if (byName.has(wantName)) {
        const existing = byName.get(wantName);
        const isUnique = Boolean(existing.unique);
        const isSparse = Boolean(existing.sparse);

        if (isUnique && isSparse) {
            console.log(`  ${wantName} already exists (unique+sparse) - no-op`);
            return;
        }

        // Index exists but with wrong options - governance mismatch.
        console.error(
            `  WARNING: ${wantName} exists but unique=${isUnique} sparse=${isSparse} - governance mismatch, manual intervention required`,
        );
        console.error(
            "  Expected: unique=true sparse=true. Drop and recreate manually if needed.",
        );
        process.exitCode = 2;
        return;
    }

    // Also check by key signature in case the index has a different name.
    const existingByKey = idx.find(
        (i) =>
            i?.key &&
            Object.keys(i.key).length === 1 &&
            i.key.anonymousId === 1,
    );

    if (existingByKey) {
        const isUnique = Boolean(existingByKey.unique);
        const isSparse = Boolean(existingByKey.sparse);

        if (isUnique && isSparse) {
            console.log(
                `  index on { anonymousId: 1 } already exists as "${existingByKey.name}" (unique+sparse) - no-op`,
            );
            return;
        }

        console.error(
            `  WARNING: index on { anonymousId: 1 } exists as "${existingByKey.name}" but unique=${isUnique} sparse=${isSparse} - governance mismatch`,
        );
        process.exitCode = 2;
        return;
    }

    // Safety belt: detect duplicates before applying unique constraint.
    const hasDuplicates = await checkDuplicateAnonymousIds(col, verbose);

    if (hasDuplicates) {
        if (dryRun) {
            console.log(
                "  [dry-run] duplicates detected - apply would be BLOCKED until duplicates are resolved",
            );
        } else {
            console.error(
                "  BLOCKED: cannot create unique+sparse anonymousId_1 - resolve duplicate anonymousId values first",
            );
            process.exitCode = 2;
        }
        return;
    }

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? "  [dry-run] would create unique+sparse index anonymousId_1 on { anonymousId: 1 }"
                : "  creating unique+sparse index anonymousId_1",
        );
    }

    if (!dryRun) {
        await col.createIndex(
            { anonymousId: 1 },
            { unique: true, sparse: true, name: wantName },
        );

        // Post-check: confirm the index is present with correct options.
        const postIdx = await safeIndexes(col);
        const postByName = indexMap(postIdx);
        const created = postByName.get(wantName);

        if (created && created.unique && created.sparse) {
            console.log(
                `  created unique+sparse index ${wantName} - POST-CHECK PASS`,
            );
        } else {
            console.error(
                `  WARNING: ${wantName} not found or incorrect after createIndex - POST-CHECK FAIL`,
            );
            process.exitCode = 2;
        }
    }
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv);

    if (!process.env.MONGO_URI) {
        throw new Error(
            "MONGO_URI is not set (check backend/.env or env vars)",
        );
    }

    console.log(`mode: ${args.dryRun ? "DRY-RUN" : "APPLY"}`);

    await connectDB(process.env.MONGO_URI);

    try {
        await ensureAnonymousIdIndex(args);
        console.log("\ndone", { dryRun: args.dryRun });
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
