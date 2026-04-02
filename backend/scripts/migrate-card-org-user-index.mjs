/**
 * migrate-card-org-user-index.mjs
 *
 * Manual index migration for the cards collection: orgId_1_user_1.
 *
 * Usage:
 *   node scripts/migrate-card-org-user-index.mjs                              (dry-run — default, safe)
 *   node scripts/migrate-card-org-user-index.mjs --apply                      (apply index to DB)
 *   node scripts/migrate-card-org-user-index.mjs --apply --verbose
 *
 * Governance rules:
 *   - Never invoked automatically at runtime (autoIndex disabled in prod).
 *   - Run apply mode only when explicitly authorized (--apply flag required).
 *   - Idempotent: re-running --apply is safe if index already exists.
 *   - MUST be applied before accepting any org card traffic on a fresh cluster.
 *
 * Required index:
 *   1. Unique compound: { orgId: 1, user: 1 } — enforces one card per user per org.
 *      partialFilterExpression: { orgId: { $type: "objectId" }, user: { $type: "objectId" } }
 *      Does NOT apply to anonymous cards (user missing) or legacy docs where orgId is null/missing.
 *      Without this index, concurrent org-card creation can produce duplicate cards
 *      for the same user in the same org.
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
 * Detect duplicate { orgId, user } pairs among documents that match the
 * partial filter (both orgId and user are ObjectIds) before the unique
 * index is applied.
 * On a fresh cluster this will always return false (empty collection).
 * On an existing cluster it is a safety belt before promoting the index.
 */
async function checkDuplicateOrgUserCards(col, verbose) {
    const pipeline = [
        {
            $match: {
                orgId: { $type: "objectId" },
                user: { $type: "objectId" },
            },
        },
        {
            $group: {
                _id: { orgId: "$orgId", user: "$user" },
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
                    "  cards collection not found — no duplicates possible",
                );
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            "DUPLICATE { orgId, user } pairs in cards — unique index BLOCKED:",
        );
        for (const d of dupes) {
            console.log(
                `  orgId=${d._id.orgId}  user=${d._id.user}  count=${d.count}  docs=${JSON.stringify(d.docs)}`,
            );
        }
        return true;
    }

    if (verbose) console.log("  no duplicate { orgId, user } pairs in cards");
    return false;
}

// ── cards.orgId_1_user_1 index governance ─────────────────────────

async function ensureOrgUserIndex({ dryRun, verbose }) {
    const db = mongoose.connection.db;
    const col = db.collection("cards");

    console.log("\n--- cards.orgId_1_user_1 ---");

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose)
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );

    const wantName = "orgId_1_user_1";

    if (byName.has(wantName)) {
        const existing = byName.get(wantName);
        const isUnique = Boolean(existing.unique);
        const hasPFE =
            existing.partialFilterExpression &&
            typeof existing.partialFilterExpression === "object";

        if (isUnique && hasPFE) {
            console.log(
                `  ${wantName} already exists (unique + partialFilterExpression) — no-op`,
            );
            return;
        }

        console.error(
            `  WARNING: ${wantName} exists but unique=${isUnique} hasPFE=${hasPFE} — governance mismatch, manual intervention required`,
        );
        console.error(
            "  Expected: unique=true with partialFilterExpression on orgId+user $type objectId. Drop and recreate manually if needed.",
        );
        process.exitCode = 2;
        return;
    }

    // Safety belt: detect duplicates before applying unique constraint.
    const hasDuplicates = await checkDuplicateOrgUserCards(col, verbose);

    if (hasDuplicates) {
        if (dryRun) {
            console.log(
                "  [dry-run] duplicates detected — apply would be BLOCKED until duplicates are resolved",
            );
        } else {
            console.error(
                "  BLOCKED: cannot create unique orgId_1_user_1 — resolve duplicate { orgId, user } pairs first",
            );
            process.exitCode = 2;
        }
        return;
    }

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? "  [dry-run] would create unique index orgId_1_user_1 on { orgId: 1, user: 1 } with partialFilterExpression"
                : "  creating unique index orgId_1_user_1",
        );
    }

    if (!dryRun) {
        await col.createIndex(
            { orgId: 1, user: 1 },
            {
                unique: true,
                name: wantName,
                partialFilterExpression: {
                    orgId: { $type: "objectId" },
                    user: { $type: "objectId" },
                },
            },
        );

        // Post-check: confirm the index is present with correct options.
        const postIdx = await safeIndexes(col);
        const postByName = indexMap(postIdx);
        const created = postByName.get(wantName);

        if (
            created &&
            created.unique &&
            created.partialFilterExpression &&
            typeof created.partialFilterExpression === "object"
        ) {
            console.log(
                `  created unique index ${wantName} with partialFilterExpression — POST-CHECK PASS`,
            );
        } else {
            console.error(
                `  WARNING: ${wantName} not found or incorrect after createIndex — POST-CHECK FAIL`,
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
        await ensureOrgUserIndex(args);
        console.log("\ndone", { dryRun: args.dryRun });
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
