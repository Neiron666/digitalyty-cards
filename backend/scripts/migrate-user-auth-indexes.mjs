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

// ── Duplicate prechecks ──────────────────────────────────────────

async function checkEmailDuplicates(col, verbose) {
    const pipeline = [
        { $match: { email: { $type: "string", $ne: "" } } },
        {
            $project: {
                email: 1,
                canonical: {
                    $toLower: { $trim: { input: "$email" } },
                },
            },
        },
        {
            $group: {
                _id: "$canonical",
                count: { $sum: 1 },
                docs: {
                    $push: {
                        id: { $toString: "$_id" },
                        rawEmail: "$email",
                    },
                },
            },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 20 },
    ];

    let dupes;
    try {
        dupes = await col.aggregate(pipeline).toArray();
    } catch (err) {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") {
            if (verbose) console.log("  users collection not found — skip");
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            "CANONICALIZED EMAIL DUPLICATES FOUND — unique index BLOCKED:",
        );
        for (const d of dupes) {
            console.log(
                `  canonical="${d._id}"  count=${d.count}  docs=${JSON.stringify(d.docs)}`,
            );
        }
        return true;
    }

    if (verbose) console.log("  no canonical email duplicates found");
    return false;
}

async function checkNonCanonicalEmails(col, verbose) {
    const pipeline = [
        { $match: { email: { $type: "string", $ne: "" } } },
        {
            $project: {
                email: 1,
                canonical: {
                    $toLower: { $trim: { input: "$email" } },
                },
            },
        },
        {
            $match: {
                $expr: { $ne: ["$email", "$canonical"] },
            },
        },
        { $sort: { _id: 1 } },
        { $limit: 20 },
    ];

    let rows;
    try {
        rows = await col.aggregate(pipeline).toArray();
    } catch (err) {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") {
            if (verbose) console.log("  users collection not found — skip");
            return false;
        }
        throw err;
    }

    if (rows.length > 0) {
        console.log(
            "NON-CANONICAL PERSISTED EMAILS FOUND — unique index BLOCKED:",
        );
        for (const r of rows) {
            console.log(
                `  id=${r._id}  raw="${r.email}"  canonical="${r.canonical}"`,
            );
        }
        return true;
    }

    if (verbose) console.log("  no non-canonical persisted emails found");
    return false;
}

async function checkCardIdDuplicates(col, verbose) {
    const pipeline = [
        { $match: { cardId: { $exists: true, $ne: null } } },
        {
            $group: {
                _id: "$cardId",
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
                console.log("  users collection not found — skip cardId check");
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            "DUPLICATE cardId VALUES FOUND — unique sparse index BLOCKED:",
        );
        for (const d of dupes) {
            console.log(
                `  cardId="${d._id}"  count=${d.count}  docs=${JSON.stringify(d.docs)}`,
            );
        }
        return true;
    }

    if (verbose) console.log("  no duplicate cardId values found");
    return false;
}

async function checkTokenHashDuplicates(col, colName, verbose) {
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
                console.log(`  ${colName} collection not found — skip`);
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            `DUPLICATE tokenHash in ${colName} — unique index BLOCKED:`,
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

// ── Index creation helpers ───────────────────────────────────────

async function ensureIndex(col, byName, key, opts, { dryRun, verbose }) {
    const name = opts.name;
    if (byName.has(name)) {
        if (verbose) console.log(`  ${name} already exists — skip`);
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

// ── Per-collection ensure functions ──────────────────────────────

async function ensureUsersIndexes({ dryRun, verbose }) {
    const db = mongoose.connection.db;
    const col = db.collection("users");

    console.log("\n--- users ---");

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose)
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );

    // Precheck A: canonical email duplicates.
    const emailDupes = await checkEmailDuplicates(col, verbose);

    // Precheck B: non-canonical persisted emails.
    const nonCanonical = await checkNonCanonicalEmails(col, verbose);

    // Precheck C: cardId duplicates.
    const cardIdDupes = await checkCardIdDuplicates(col, verbose);

    // Safe-abort: if ANY users-collection precheck fails, skip all users indexes.
    if (emailDupes || nonCanonical || cardIdDupes) {
        const reasons = [
            emailDupes && "canonical email duplicates",
            nonCanonical && "non-canonical persisted emails",
            cardIdDupes && "duplicate cardId values",
        ].filter(Boolean);

        if (dryRun) {
            console.log(
                `[dry-run] users index creation would be BLOCKED — reasons: ${reasons.join(", ")}`,
            );
        } else {
            console.error(
                `BLOCKED: users index creation skipped — reasons: ${reasons.join(", ")}`,
            );
            process.exitCode = 2;
        }
        return;
    }

    // P0: email unique.
    await ensureIndex(
        col,
        byName,
        { email: 1 },
        { name: "email_1", unique: true },
        { dryRun, verbose },
    );

    // P1: cardId unique sparse.
    await ensureIndex(
        col,
        byName,
        { cardId: 1 },
        { name: "cardId_1", unique: true, sparse: true },
        { dryRun, verbose },
    );

    // P2: role.
    await ensureIndex(
        col,
        byName,
        { role: 1 },
        { name: "role_1" },
        { dryRun, verbose },
    );

    // P2: adminTier.
    await ensureIndex(
        col,
        byName,
        { adminTier: 1 },
        { name: "adminTier_1" },
        { dryRun, verbose },
    );
}

async function ensureTokenCollectionIndexes(
    colName,
    { dryRun, verbose, hasUserId = true, hasEmailNormalized = false },
) {
    const db = mongoose.connection.db;
    const col = db.collection(colName);

    console.log(`\n--- ${colName} ---`);

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose)
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );

    // Precheck: tokenHash duplicates.
    const tokenDupes = await checkTokenHashDuplicates(col, colName, verbose);
    if (tokenDupes) {
        if (dryRun) {
            console.log(
                `[dry-run] duplicates detected — apply would be BLOCKED for tokenHash_1 unique in ${colName}`,
            );
        } else {
            console.error(
                `BLOCKED: cannot create unique tokenHash_1 in ${colName} — resolve duplicates first`,
            );
            process.exitCode = 2;
        }
        return;
    }

    // tokenHash unique.
    await ensureIndex(
        col,
        byName,
        { tokenHash: 1 },
        { name: "tokenHash_1", unique: true },
        { dryRun, verbose },
    );

    // userId (if applicable).
    if (hasUserId) {
        await ensureIndex(
            col,
            byName,
            { userId: 1 },
            { name: "userId_1" },
            { dryRun, verbose },
        );
    }

    // emailNormalized (if applicable).
    if (hasEmailNormalized) {
        await ensureIndex(
            col,
            byName,
            { emailNormalized: 1 },
            { name: "emailNormalized_1" },
            { dryRun, verbose },
        );
    }

    // expiresAt.
    await ensureIndex(
        col,
        byName,
        { expiresAt: 1 },
        { name: "expiresAt_1" },
        { dryRun, verbose },
    );

    // usedAt.
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
    const collections = [
        "users",
        "emailverificationtokens",
        "emailsignuptokens",
        "passwordresets",
    ];

    console.log("\n=== POST-CHECK ===");

    let allOk = true;

    for (const colName of collections) {
        const idx = await safeIndexes(db.collection(colName));
        const names = idx.map((i) => i.name);
        console.log(`${colName}: ${JSON.stringify(names)}`);

        if (verbose) {
            for (const i of idx) {
                console.log(
                    `  ${JSON.stringify({ name: i.name, key: i.key, unique: Boolean(i.unique), sparse: Boolean(i.sparse) })}`,
                );
            }
        }

        // Verify critical unique indexes exist.
        const byName = indexMap(idx);

        if (colName === "users") {
            const emailIdx = byName.get("email_1");
            if (!emailIdx || !emailIdx.unique) {
                console.error(
                    `  WARNING: email_1 unique missing or not unique on ${colName}`,
                );
                allOk = false;
            }
        }

        if (
            colName !== "users" &&
            (!byName.has("tokenHash_1") || !byName.get("tokenHash_1")?.unique)
        ) {
            console.error(
                `  WARNING: tokenHash_1 unique missing on ${colName}`,
            );
            allOk = false;
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

    // ── Users ──
    await ensureUsersIndexes(args);

    // Bail early if users blocked (exitCode already set).
    if (process.exitCode === 2) {
        console.log("\ndone (BLOCKED)", { dryRun: args.dryRun });
        return;
    }

    // ── emailverificationtokens ──
    await ensureTokenCollectionIndexes("emailverificationtokens", {
        ...args,
        hasUserId: true,
        hasEmailNormalized: false,
    });

    // ── emailsignuptokens ──
    await ensureTokenCollectionIndexes("emailsignuptokens", {
        ...args,
        hasUserId: false,
        hasEmailNormalized: true,
    });

    // ── passwordresets ──
    await ensureTokenCollectionIndexes("passwordresets", {
        ...args,
        hasUserId: true,
        hasEmailNormalized: false,
    });

    // Bail if any token collection was blocked.
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
