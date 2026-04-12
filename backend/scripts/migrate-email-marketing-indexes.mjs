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

function safeIndexes(collection) {
    return collection.indexes().catch((err) => {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") return [];
        throw err;
    });
}

function indexMap(indexes) {
    return new Map(indexes.map((i) => [i.name, i]));
}

async function ensureIndex(col, byName, key, opts, { dryRun, verbose }) {
    const name = opts.name;
    if (byName.has(name)) {
        if (verbose) console.log(`  ${name} already exists - skip`);
        return;
    }

    const label = opts.unique
        ? `unique${opts.sparse ? " sparse" : ""} index ${name}`
        : `index ${name}`;

    if (dryRun || verbose) {
        console.log(
            dryRun ? `[dry-run] would create ${label}` : `creating ${label}`,
        );
    }

    if (!dryRun) {
        await col.createIndex(key, opts);
    }
}

// ── Duplicate prechecks ──────────────────────────────────────────

async function checkEmailKeyDuplicates(col, colName, verbose) {
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

async function checkTokenHashDuplicates(col, colName, verbose) {
    const pipeline = [
        { $match: { tokenHash: { $type: "string", $ne: "" } } },
        {
            $group: {
                _id: "$tokenHash",
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
        console.log(
            `DUPLICATE tokenHash in ${colName} - unique index BLOCKED:`,
        );
        for (const d of dupes) {
            console.log(
                `  tokenHash="${String(d._id).slice(0, 12)}…"  count=${d.count}  docs=${JSON.stringify(d.docs)}`,
            );
        }
        return true;
    }

    if (verbose) console.log(`  no duplicate tokenHash in ${colName}`);
    return false;
}

// ── Per-collection ensure functions ──────────────────────────────

async function ensureMarketingOptOutIndexes({ dryRun, verbose }) {
    const db = mongoose.connection.db;
    const col = db.collection("marketingoptouts");
    const colName = "marketingoptouts";

    console.log(`\n--- ${colName} ---`);

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose)
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );

    const emailKeyDupes = await checkEmailKeyDuplicates(col, colName, verbose);
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

    // emailKey unique (primary lookup key).
    await ensureIndex(
        col,
        byName,
        { emailKey: 1 },
        { name: "emailKey_1", unique: true },
        { dryRun, verbose },
    );
}

async function ensureEmailUnsubscribeTokenIndexes({ dryRun, verbose }) {
    const db = mongoose.connection.db;
    const col = db.collection("emailunsubscribetokens");
    const colName = "emailunsubscribetokens";

    console.log(`\n--- ${colName} ---`);

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose)
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );

    const tokenDupes = await checkTokenHashDuplicates(col, colName, verbose);
    if (tokenDupes) {
        if (dryRun) {
            console.log(
                `[dry-run] duplicates detected - apply would be BLOCKED for tokenHash_1 unique in ${colName}`,
            );
        } else {
            console.error(
                `BLOCKED: cannot create unique tokenHash_1 in ${colName} - resolve duplicates first`,
            );
            process.exitCode = 2;
        }
        return;
    }

    // tokenHash unique (primary consume lookup).
    await ensureIndex(
        col,
        byName,
        { tokenHash: 1 },
        { name: "tokenHash_1", unique: true },
        { dryRun, verbose },
    );

    // emailNormalized (token-by-email cleanup queries).
    await ensureIndex(
        col,
        byName,
        { emailNormalized: 1 },
        { name: "emailNormalized_1" },
        { dryRun, verbose },
    );

    // expiresAt (TTL-style cleanup queries).
    await ensureIndex(
        col,
        byName,
        { expiresAt: 1 },
        { name: "expiresAt_1" },
        { dryRun, verbose },
    );

    // usedAt (consistent with token collection pattern in migrate-user-auth-indexes).
    await ensureIndex(
        col,
        byName,
        { usedAt: 1 },
        { name: "usedAt_1" },
        { dryRun, verbose },
    );
}

// ── Post-check ───────────────────────────────────────────────────

async function postCheck(verbose) {
    const db = mongoose.connection.db;

    console.log("\n=== POST-CHECK ===");

    let allOk = true;

    // marketingoptouts
    {
        const col = db.collection("marketingoptouts");
        const idx = await safeIndexes(col);
        const names = idx.map((i) => i.name);
        console.log(`marketingoptouts: ${JSON.stringify(names)}`);
        const byName = indexMap(idx);
        const ki = byName.get("emailKey_1");
        if (!ki || !ki.unique) {
            console.error(
                "  WARNING: emailKey_1 unique missing on marketingoptouts",
            );
            allOk = false;
        }
        if (verbose) {
            for (const i of idx) {
                console.log(
                    `  ${JSON.stringify({ name: i.name, key: i.key, unique: Boolean(i.unique) })}`,
                );
            }
        }
    }

    // emailunsubscribetokens
    {
        const col = db.collection("emailunsubscribetokens");
        const idx = await safeIndexes(col);
        const names = idx.map((i) => i.name);
        console.log(`emailunsubscribetokens: ${JSON.stringify(names)}`);
        const byName = indexMap(idx);
        const ti = byName.get("tokenHash_1");
        if (!ti || !ti.unique) {
            console.error(
                "  WARNING: tokenHash_1 unique missing on emailunsubscribetokens",
            );
            allOk = false;
        }
        if (verbose) {
            for (const i of idx) {
                console.log(
                    `  ${JSON.stringify({ name: i.name, key: i.key, unique: Boolean(i.unique) })}`,
                );
            }
        }
    }

    if (allOk) {
        console.log("\nPOST-CHECK: all critical indexes verified");
    } else {
        console.error("\nPOST-CHECK: SOME CRITICAL INDEXES MISSING");
        process.exitCode = 2;
    }
}

// ── Main ─────────────────────────────────────────────────────────

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

    // ── marketingoptouts ──
    await ensureMarketingOptOutIndexes(args);

    if (process.exitCode === 2) {
        console.log("\ndone (BLOCKED)", { dryRun: args.dryRun });
        return;
    }

    // ── emailunsubscribetokens ──
    await ensureEmailUnsubscribeTokenIndexes(args);

    if (process.exitCode === 2) {
        console.log("\ndone (BLOCKED)", { dryRun: args.dryRun });
        return;
    }

    // ── Post-check (apply mode only) ──
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
