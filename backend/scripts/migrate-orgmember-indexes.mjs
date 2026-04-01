/**
 * migrate-orgmember-indexes.mjs
 *
 * Manual index migration for the organizationmembers collection.
 *
 * Usage:
 *   node scripts/migrate-orgmember-indexes.mjs              (dry-run — default, safe)
 *   node scripts/migrate-orgmember-indexes.mjs --apply      (apply index to DB)
 *   node scripts/migrate-orgmember-indexes.mjs --apply --verbose
 *
 * Governance rules:
 *   - Never invoked automatically at runtime (autoIndex disabled in prod).
 *   - Run apply mode only when explicitly authorized (--apply flag required).
 *   - Idempotent: re-running --apply is safe if index already exists.
 *   - MUST be applied before accepting any org invite/join traffic on a fresh cluster.
 *
 * Required index:
 *   1. Unique compound: { orgId: 1, userId: 1 } — enforces one membership row per user per org.
 *      Without this, concurrent invite-accept can produce duplicate membership rows,
 *      causing role-check ambiguity and privilege escalation.
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
 * Detect duplicate { orgId, userId } pairs before the unique index is applied.
 * On a fresh cluster this will always return false (empty collection).
 * On an existing cluster it is a safety belt before promoting the index.
 */
async function checkDuplicateMembers(col, verbose) {
    const pipeline = [
        {
            $group: {
                _id: { orgId: "$orgId", userId: "$userId" },
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
                    "  organizationmembers collection not found — no duplicates possible",
                );
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            "DUPLICATE { orgId, userId } pairs in organizationmembers — unique index BLOCKED:",
        );
        for (const d of dupes) {
            console.log(
                `  orgId=${d._id.orgId}  userId=${d._id.userId}  count=${d.count}  docs=${JSON.stringify(d.docs)}`,
            );
        }
        return true;
    }

    if (verbose)
        console.log(
            "  no duplicate { orgId, userId } pairs in organizationmembers",
        );
    return false;
}

// ── organizationmembers index governance ─────────────────────────

async function ensureOrgMemberIndexes({ dryRun, verbose }) {
    const db = mongoose.connection.db;
    const col = db.collection("organizationmembers");

    console.log("\n--- organizationmembers ---");

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose)
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );

    const wantName = "orgId_1_userId_1";

    if (byName.has(wantName)) {
        const existing = byName.get(wantName);
        if (!existing.unique) {
            console.error(
                `  WARNING: ${wantName} exists but is NOT unique — governance mismatch, manual intervention required`,
            );
            process.exitCode = 2;
        } else {
            console.log(`  ${wantName} already exists and is unique — no-op`);
        }
        return;
    }

    // Safety belt: detect duplicates before applying unique constraint.
    const hasDuplicates = await checkDuplicateMembers(col, verbose);

    if (hasDuplicates) {
        if (dryRun) {
            console.log(
                "  [dry-run] duplicates detected — apply would be BLOCKED until duplicates are resolved",
            );
        } else {
            console.error(
                "  BLOCKED: cannot create unique orgId_1_userId_1 — resolve duplicate member rows first",
            );
            process.exitCode = 2;
        }
        return;
    }

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? "  [dry-run] would create unique index orgId_1_userId_1 on { orgId: 1, userId: 1 }"
                : "  creating unique index orgId_1_userId_1",
        );
    }

    if (!dryRun) {
        await col.createIndex(
            { orgId: 1, userId: 1 },
            { unique: true, name: wantName },
        );

        // Post-check: confirm the index is present and unique.
        const postIdx = await safeIndexes(col);
        const postByName = indexMap(postIdx);
        const created = postByName.get(wantName);

        if (created && created.unique) {
            console.log(`  created unique index ${wantName} — POST-CHECK PASS`);
        } else {
            console.error(
                `  WARNING: ${wantName} not found or not unique after createIndex — POST-CHECK FAIL`,
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
        await ensureOrgMemberIndexes(args);
        console.log("\ndone", { dryRun: args.dryRun });
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
