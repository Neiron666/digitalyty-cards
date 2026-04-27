/**
 * migrate-deletedemailblock-indexes.mjs
 *
 * Manual index migration/restoration for the deletedemailblocks collection.
 *
 * Collection governed:
 *   - deletedemailblocks  (DeletedEmailBlock model)
 *
 * Purpose:
 *   deletedemailblocks is an account-deletion tombstone collection — separate
 *   lifecycle and semantics from marketingoptouts. Do NOT merge with
 *   migrate-email-marketing-indexes.mjs.
 *
 * Usage:
 *   node scripts/migrate-deletedemailblock-indexes.mjs              (dry-run — default, safe)
 *   node scripts/migrate-deletedemailblock-indexes.mjs --apply      (apply index to DB)
 *   node scripts/migrate-deletedemailblock-indexes.mjs --apply --verbose
 *
 * Governance rules:
 *   - Never invoked automatically at runtime (MONGOOSE_AUTO_INDEX=false in prod).
 *   - Run apply mode only when explicitly authorized (--apply flag required).
 *   - Idempotent: re-running --apply is safe when index already exists.
 *   - emailKey_1 is unique — duplicate precheck is mandatory before creation.
 *   - No TTL: tombstones are permanent by design.
 */

import "dotenv/config";

import mongoose from "mongoose";

import DeletedEmailBlock from "../src/models/DeletedEmailBlock.model.js";
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
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") return [];
        throw err;
    });
}

function indexMap(indexes) {
    return new Map(indexes.map((i) => [i.name, i]));
}

// ── Duplicate precheck ───────────────────────────────────────────

/**
 * Check for duplicate emailKey values before applying the unique index.
 * Duplicates would cause createIndex to fail with a DuplicateKey error.
 * Returns true if duplicates were found (apply must be blocked).
 */
async function checkEmailKeyDuplicates(col, verbose) {
    const colName = col.collectionName;
    const pipeline = [
        { $match: { emailKey: { $type: "string", $ne: "" } } },
        {
            $group: {
                _id: "$emailKey",
                count: { $sum: 1 },
                docs: { $push: { id: { $toString: "$_id" } } },
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
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") {
            if (verbose)
                console.log(`  ${colName} collection not found - skip`);
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(`DUPLICATE emailKey IN ${colName} - unique index BLOCKED:`);
        for (const d of dupes) {
            console.log(
                `  emailKey="${String(d._id).slice(0, 12)}…"  count=${d.count}  docs=${JSON.stringify(d.docs)}`,
            );
        }
        return true;
    }

    if (verbose) console.log(`  no duplicate emailKey in ${colName}`);
    return false;
}

// ── deletedemailblocks index governance ───────────────────────────

async function ensureDeletedEmailBlockIndexes({ dryRun, verbose }) {
    const col = DeletedEmailBlock.collection;
    const colName = col.collectionName;

    console.log(`\n--- ${colName} ---`);

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose) {
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );
    }

    // Duplicate precheck — must run before attempting unique index creation.
    const emailKeyDupes = await checkEmailKeyDuplicates(col, verbose);
    if (emailKeyDupes) {
        if (dryRun) {
            console.log(
                `[dry-run] duplicates detected - apply would be BLOCKED for emailKey_1 unique in ${colName}`,
            );
        } else {
            console.error(
                `BLOCKED: cannot create unique emailKey_1 in ${colName} - resolve duplicates first`,
            );
            process.exitCode = 2;
        }
        return;
    }

    // emailKey_1 unique — the sole index required for this collection.
    // Backs: isEmailBlocked() (.exists({ emailKey })) and
    //        createEmailBlock() DuplicateKey idempotency (code 11000/11001).
    const wantName = "emailKey_1";
    if (byName.has(wantName)) {
        if (verbose) console.log(`  ${wantName} already exists - skip`);
    } else {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? `  [dry-run] would create unique index ${wantName}`
                    : `  creating unique index ${wantName}`,
            );
        }
        if (!dryRun) {
            await col.createIndex(
                { emailKey: 1 },
                { unique: true, name: wantName },
            );
        }
    }
}

// ── Post-check ───────────────────────────────────────────────────

async function postCheck(verbose) {
    const col = DeletedEmailBlock.collection;
    const colName = col.collectionName;

    console.log("\n=== POST-CHECK ===");

    const idx = await safeIndexes(col);
    const names = idx.map((i) => i.name);
    console.log(`${colName}: ${JSON.stringify(names)}`);

    const byName = indexMap(idx);
    const ki = byName.get("emailKey_1");

    if (!ki || !ki.unique) {
        console.error(`  WARNING: emailKey_1 unique missing on ${colName}`);
        process.exitCode = 2;
    } else {
        if (verbose) {
            console.log(
                `  ${JSON.stringify({ name: ki.name, key: ki.key, unique: Boolean(ki.unique) })}`,
            );
        }
        console.log("\nPOST-CHECK: emailKey_1 unique verified");
    }
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv);

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error(
            "MONGO_URI is not set (check backend/.env or env vars)",
        );
    }

    console.log(`mode: ${args.dryRun ? "DRY-RUN" : "APPLY"}`);

    await connectDB(mongoUri);

    await ensureDeletedEmailBlockIndexes(args);

    if (process.exitCode === 2) {
        console.log("\ndone (BLOCKED)", { dryRun: args.dryRun });
        return;
    }

    // Post-check (apply mode only).
    if (!args.dryRun) {
        await postCheck(args.verbose);
    }

    console.log("\ndone", { dryRun: args.dryRun });
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await mongoose.disconnect();
        } catch {
            // ignore
        }
    });
