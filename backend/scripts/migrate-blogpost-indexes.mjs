import "dotenv/config";
import mongoose from "mongoose";

import BlogPost from "../src/models/BlogPost.model.js";
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

async function checkDuplicateSlugs(verbose) {
    const pipeline = [
        { $match: { slug: { $exists: true } } },
        { $group: { _id: "$slug", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 5 },
    ];

    const dupes = await BlogPost.aggregate(pipeline);

    if (dupes.length > 0) {
        console.log(
            "DUPLICATES FOUND - unique slug index cannot be created safely:",
        );
        for (const d of dupes) {
            console.log(`  slug="${d._id}"  count=${d.count}`);
        }
        return true;
    }

    if (verbose) {
        console.log("no duplicate slug values found");
    }

    return false;
}

async function ensureIndexes({ dryRun, verbose }) {
    let idx = [];
    try {
        idx = await BlogPost.collection.indexes();
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

    if (verbose) {
        console.log("current indexes:");
        for (const [name, spec] of byName) {
            console.log(`  ${name}  key=${JSON.stringify(spec.key)}`);
        }
    }

    /* ── slug_1 (unique) ─────────────────────────────────────── */

    const wantSlug = "slug_1";

    if (byName.has(wantSlug)) {
        console.log(`${wantSlug} already exists - no-op`);
    } else {
        const hasDuplicates = await checkDuplicateSlugs(verbose);

        if (hasDuplicates) {
            if (dryRun) {
                console.log(
                    `[dry-run] duplicates detected - apply would be BLOCKED until duplicates are resolved`,
                );
            } else {
                console.error(
                    `BLOCKED: cannot create unique index ${wantSlug} - resolve duplicate slug values first`,
                );
                process.exitCode = 2;
                return;
            }
        } else {
            if (dryRun || verbose) {
                console.log(
                    dryRun
                        ? `[dry-run] would create unique index ${wantSlug} on { slug: 1 }`
                        : `creating unique index ${wantSlug}`,
                );
            }
            if (!dryRun) {
                await BlogPost.collection.createIndex(
                    { slug: 1 },
                    { unique: true, name: wantSlug },
                );
                console.log(`created unique index ${wantSlug}`);
            }
        }
    }

    /* ── status_1_publishedAt_-1 ─────────────────────────────── */

    const wantCompound = "status_1_publishedAt_-1";

    if (byName.has(wantCompound)) {
        console.log(`${wantCompound} already exists - no-op`);
    } else {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? `[dry-run] would create index ${wantCompound} on { status: 1, publishedAt: -1 }`
                    : `creating index ${wantCompound}`,
            );
        }
        if (!dryRun) {
            await BlogPost.collection.createIndex(
                { status: 1, publishedAt: -1 },
                { name: wantCompound },
            );
            console.log(`created index ${wantCompound}`);
        }
    }

    /* ── previousSlugs_1 ─────────────────────────────────────── */

    const wantPrevSlugs = "previousSlugs_1";

    if (byName.has(wantPrevSlugs)) {
        console.log(`${wantPrevSlugs} already exists - no-op`);
    } else {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? `[dry-run] would create index ${wantPrevSlugs} on { previousSlugs: 1 }`
                    : `creating index ${wantPrevSlugs}`,
            );
        }
        if (!dryRun) {
            await BlogPost.collection.createIndex(
                { previousSlugs: 1 },
                { name: wantPrevSlugs },
            );
            console.log(`created index ${wantPrevSlugs}`);
        }
    }

    /* ── final state ─────────────────────────────────────────── */

    if (!dryRun) {
        const after = await BlogPost.collection.indexes();
        console.log("resulting indexes:");
        for (const i of after) {
            console.log(`  ${i.name}  key=${JSON.stringify(i.key)}`);
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

    try {
        await ensureIndexes(args);
        console.log("done", { dryRun: args.dryRun });
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
