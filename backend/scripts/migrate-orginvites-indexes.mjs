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

// ── Duplicate precheck ───────────────────────────────────────────

async function checkTokenHashDuplicates(col, verbose) {
    const pipeline = [
        { $match: { tokenHash: { $type: "string", $ne: "" } } },
        {
            $group: {
                _id: "$tokenHash",
                count: { $sum: 1 },
                docs: {
                    $push: { id: { $toString: "$_id" } },
                },
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
                console.log("  orginvites collection not found - skip");
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            "DUPLICATE tokenHash in orginvites - unique index BLOCKED:",
        );
        for (const d of dupes) {
            console.log(
                `  tokenHash="${String(d._id).slice(0, 12)}…"  count=${d.count}  docs=${JSON.stringify(d.docs)}`,
            );
        }
        return true;
    }

    if (verbose) console.log("  no duplicate tokenHash in orginvites");
    return false;
}

// ── Index creation helper ────────────────────────────────────────

async function ensureIndex(col, byName, key, opts, { dryRun, verbose }) {
    const name = opts.name;
    if (byName.has(name)) {
        if (verbose) console.log(`  ${name} already exists - skip`);
        return;
    }

    const label = opts.unique ? `unique index ${name}` : `index ${name}`;

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? `  [dry-run] would create ${label}`
                : `  creating ${label}`,
        );
    }

    if (!dryRun) {
        await col.createIndex(key, opts);
    }
}

// ── orginvites index governance ──────────────────────────────────

async function ensureOrgInvitesIndexes({ dryRun, verbose }) {
    const db = mongoose.connection.db;
    const col = db.collection("orginvites");

    console.log("\n--- orginvites ---");

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose)
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );

    // ── Precheck: tokenHash duplicates ──
    const tokenDupes = await checkTokenHashDuplicates(col, verbose);
    if (tokenDupes) {
        if (dryRun) {
            console.log(
                "  [dry-run] duplicates detected - apply would be BLOCKED for tokenHash_1 unique",
            );
        } else {
            console.error(
                "  BLOCKED: cannot create unique tokenHash_1 in orginvites - resolve duplicates first",
            );
            process.exitCode = 2;
        }
        return;
    }

    // 1) tokenHash_1 - unique: secure token identity + consume lookup truth.
    await ensureIndex(
        col,
        byName,
        { tokenHash: 1 },
        { name: "tokenHash_1", unique: true },
        { dryRun, verbose },
    );

    // 2) orgId_1_createdAt_-1 - supports: find({orgId}).sort({createdAt:-1}).
    await ensureIndex(
        col,
        byName,
        { orgId: 1, createdAt: -1 },
        { name: "orgId_1_createdAt_-1" },
        { dryRun, verbose },
    );

    // 3) orgId_1_revokedAt_1_usedAt_1_expiresAt_1 - pending-by-org & seat aggregation.
    await ensureIndex(
        col,
        byName,
        { orgId: 1, revokedAt: 1, usedAt: 1, expiresAt: 1 },
        { name: "orgId_1_revokedAt_1_usedAt_1_expiresAt_1" },
        { dryRun, verbose },
    );

    // 4) orgId_1_email_1_revokedAt_1_usedAt_1_expiresAt_1 - pending invite preflight.
    await ensureIndex(
        col,
        byName,
        { orgId: 1, email: 1, revokedAt: 1, usedAt: 1, expiresAt: 1 },
        { name: "orgId_1_email_1_revokedAt_1_usedAt_1_expiresAt_1" },
        { dryRun, verbose },
    );

    // 5) createdByUserId_1_revokedAt_1_usedAt_1 - cleanup on account/admin delete.
    await ensureIndex(
        col,
        byName,
        { createdByUserId: 1, revokedAt: 1, usedAt: 1 },
        { name: "createdByUserId_1_revokedAt_1_usedAt_1" },
        { dryRun, verbose },
    );
}

// ── Post-check ───────────────────────────────────────────────────

async function postCheck(verbose) {
    const db = mongoose.connection.db;
    const col = db.collection("orginvites");

    console.log("\n=== POST-CHECK ===");

    const idx = await safeIndexes(col);
    const names = idx.map((i) => i.name);
    console.log(`orginvites: ${JSON.stringify(names)}`);

    if (verbose) {
        for (const i of idx) {
            console.log(
                `  ${JSON.stringify({ name: i.name, key: i.key, unique: Boolean(i.unique) })}`,
            );
        }
    }

    let allOk = true;
    const byName = indexMap(idx);

    // Critical: tokenHash_1 must be unique.
    const tokenIdx = byName.get("tokenHash_1");
    if (!tokenIdx || !tokenIdx.unique) {
        console.error("  WARNING: tokenHash_1 unique missing on orginvites");
        allOk = false;
    }

    // Required compound indexes.
    const required = [
        "orgId_1_createdAt_-1",
        "orgId_1_revokedAt_1_usedAt_1_expiresAt_1",
        "orgId_1_email_1_revokedAt_1_usedAt_1_expiresAt_1",
        "createdByUserId_1_revokedAt_1_usedAt_1",
    ];

    for (const name of required) {
        if (!byName.has(name)) {
            console.error(`  WARNING: ${name} missing on orginvites`);
            allOk = false;
        }
    }

    if (allOk) {
        console.log("\nPOST-CHECK: all orginvites indexes verified");
    } else {
        console.error("\nPOST-CHECK: SOME INDEXES MISSING");
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

    await ensureOrgInvitesIndexes(args);

    // Bail if blocked (exitCode already set).
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
