import "dotenv/config";

import AiUsageMonthly from "../src/models/AiUsageMonthly.model.js";
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
        {
            $group: {
                _id: {
                    userId: "$userId",
                    feature: "$feature",
                    periodKey: "$periodKey",
                },
                count: { $sum: 1 },
            },
        },
        { $match: { count: { $gt: 1 } } },
        { $limit: 5 },
    ];

    let dupes;
    try {
        dupes = await AiUsageMonthly.aggregate(pipeline);
    } catch (err) {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") {
            if (verbose) {
                console.log(
                    "collection does not exist yet — no duplicates possible",
                );
            }
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            "DUPLICATES FOUND — unique index cannot be created safely:",
        );
        for (const d of dupes) {
            console.log(
                `  userId=${d._id.userId}  feature="${d._id.feature}"  periodKey="${d._id.periodKey}"  count=${d.count}`,
            );
        }
        return true;
    }

    if (verbose) {
        console.log("no duplicate { userId, feature, periodKey } groups found");
    }

    return false;
}

async function ensureIndexes({ dryRun, verbose }) {
    let idx = [];
    try {
        idx = await AiUsageMonthly.collection.indexes();
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

    if (verbose) {
        console.log(
            "current indexes:",
            idx.map((i) => i.name),
        );
    }

    const byName = new Map(idx.map((i) => [i.name, i]));

    const wantName = "userId_1_feature_1_periodKey_1";

    if (byName.has(wantName)) {
        console.log(`${wantName} already exists — no-op`);
        return;
    }

    // Enterprise safety-belt: check for duplicates before creating unique index.
    const hasDuplicates = await checkDuplicates(verbose);

    if (hasDuplicates) {
        if (dryRun) {
            console.log(
                `[dry-run] duplicates detected — apply would be BLOCKED until duplicates are resolved`,
            );
        } else {
            console.error(
                `BLOCKED: cannot create unique index ${wantName} — resolve duplicate { userId, feature, periodKey } documents first`,
            );
            process.exitCode = 2;
        }
        return;
    }

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? `[dry-run] would create unique index ${wantName} on { userId: 1, feature: 1, periodKey: 1 }`
                : `creating unique index ${wantName}`,
        );
    }

    if (!dryRun) {
        await AiUsageMonthly.collection.createIndex(
            { userId: 1, feature: 1, periodKey: 1 },
            { unique: true, name: wantName },
        );

        // Post-check: confirm index was created.
        const postIdx = await AiUsageMonthly.collection.indexes();
        const postByName = new Map(postIdx.map((i) => [i.name, i]));
        const created = postByName.get(wantName);

        if (created && created.unique) {
            console.log(`created unique index ${wantName} — verified`);
        } else {
            console.error(
                `WARNING: createIndex returned but ${wantName} not found in post-check`,
            );
            process.exitCode = 2;
        }
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

    await ensureIndexes(args);

    console.log("done", { dryRun: args.dryRun });
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
