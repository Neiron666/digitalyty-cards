import "dotenv/config";

import mongoose from "mongoose";

import Receipt from "../src/models/Receipt.model.js";
import { connectDB } from "../src/config/db.js";

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

async function checkDuplicates(verbose) {
    const pipeline = [
        { $match: { paymentTransactionId: { $exists: true } } },
        { $group: { _id: "$paymentTransactionId", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 5 },
    ];

    const dupes = await Receipt.aggregate(pipeline);

    if (dupes.length > 0) {
        console.log(
            "DUPLICATES FOUND - unique index cannot be created safely:",
        );
        for (const d of dupes) {
            console.log(`  paymentTransactionId="${d._id}"  count=${d.count}`);
        }
        return true;
    }

    if (verbose) {
        console.log("no duplicate paymentTransactionId values found");
    }

    return false;
}

async function ensureIndexes({ dryRun, verbose }) {
    let idx = [];
    try {
        idx = await Receipt.collection.indexes();
    } catch (err) {
        // On a fresh DB the collection may not exist yet; treat as no indexes.
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") {
            idx = [];
        } else {
            throw err;
        }
    }

    const byName = new Map(idx.map((i) => [i.name, i]));

    const wantName = "paymentTransactionId_1";

    if (byName.has(wantName)) {
        console.log(`${wantName} already exists - no-op`);
        return;
    }

    // Enterprise safety-belt: check for duplicates before creating unique index.
    const hasDuplicates = await checkDuplicates(verbose);

    if (hasDuplicates) {
        if (dryRun) {
            console.log(
                `[dry-run] duplicates detected - apply would be BLOCKED until duplicates are resolved`,
            );
        } else {
            console.error(
                `BLOCKED: cannot create unique index ${wantName} - resolve duplicate paymentTransactionId values first`,
            );
            process.exitCode = 2;
        }
        return;
    }

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? `[dry-run] would create unique index ${wantName} on { paymentTransactionId: 1 }`
                : `creating unique index ${wantName}`,
        );
    }

    if (!dryRun) {
        await Receipt.collection.createIndex(
            { paymentTransactionId: 1 },
            { unique: true, name: wantName },
        );
        console.log(`created unique index ${wantName}`);
    }
}

async function ensureReadIndexes({ dryRun, verbose }) {
    let idx = [];
    try {
        idx = await Receipt.collection.indexes();
    } catch (err) {
        // On a fresh DB the collection may not exist yet; treat as no indexes.
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") {
            idx = [];
        } else {
            throw err;
        }
    }

    const byName = new Map(idx.map((i) => [i.name, i]));

    // Compound read index for cabinet list route:
    // GET /api/account/receipts  →  filter: { userId, status }, sort: { createdAt: -1 }
    const wantName = "userId_1_status_1_createdAt_-1";

    if (byName.has(wantName)) {
        console.log(`${wantName} already exists - no-op`);
        return;
    }

    // Non-unique index — no duplicate pre-check required.
    if (dryRun || verbose) {
        console.log(
            dryRun
                ? `[dry-run] would create read index ${wantName} on { userId: 1, status: 1, createdAt: -1 }`
                : `creating read index ${wantName}`,
        );
    }

    if (!dryRun) {
        await Receipt.collection.createIndex(
            { userId: 1, status: 1, createdAt: -1 },
            { unique: false, name: wantName },
        );
        console.log(`created read index ${wantName}`);
    }
}

async function main() {
    const args = parseArgs(process.argv);

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error(
            "MONGO_URI is not set (check backend/.env or env vars)",
        );
    }

    await connectDB(mongoUri);

    try {
        await ensureIndexes(args);
        await ensureReadIndexes(args);

        console.log("done", { dryRun: args.dryRun });
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
