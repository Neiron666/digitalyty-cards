import "dotenv/config";

import mongoose from "mongoose";

import Card from "../src/models/Card.model.js";
import { connectDB } from "../src/config/db.js";
import { DEFAULT_TENANT_KEY } from "../src/utils/tenant.util.js";

function parseArgs(argv) {
    const args = {
        dryRun: true,
        createIndex: false,
        dropOldSlugUnique: false,
        tenantKey: DEFAULT_TENANT_KEY,
        verbose: false,
    };

    for (const token of argv.slice(2)) {
        if (token === "--apply") args.dryRun = false;
        else if (token === "--dry-run") args.dryRun = true;
        else if (token === "--create-index") args.createIndex = true;
        else if (token === "--drop-old-slug-unique")
            args.dropOldSlugUnique = true;
        else if (token === "--verbose") args.verbose = true;
        else if (token.startsWith("--tenantKey=")) {
            args.tenantKey = String(token.split("=")[1] || "")
                .trim()
                .toLowerCase();
        }
    }

    if (!args.tenantKey) {
        throw new Error("tenantKey must be a non-empty string");
    }

    return args;
}

async function ensureIndexes({ dryRun, dropOldSlugUnique, verbose }) {
    const idx = await Card.collection.indexes();

    const byName = new Map(idx.map((i) => [i.name, i]));

    const wantCompoundName = "tenantKey_1_slug_1";
    const wantSlugName = "slug_1";

    if (!byName.has(wantCompoundName)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] would create unique index tenantKey_1_slug_1"
                    : "creating unique index tenantKey_1_slug_1",
            );
        }

        if (!dryRun) {
            await Card.collection.createIndex(
                { tenantKey: 1, slug: 1 },
                {
                    unique: true,
                    name: wantCompoundName,
                    partialFilterExpression: {
                        tenantKey: { $type: "string" },
                        slug: { $type: "string" },
                    },
                },
            );
        }
    }

    const slugIdx = byName.get(wantSlugName);
    if (slugIdx?.unique && dropOldSlugUnique) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] would drop unique index slug_1"
                    : "dropping unique index slug_1",
            );
        }

        if (!dryRun) {
            await Card.collection.dropIndex(wantSlugName);
        }
    }

    // Keep slug index for lookup performance; if slug_1 doesn't exist at all,
    // create a non-unique one.
    if (!byName.has(wantSlugName)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] would create index slug_1"
                    : "creating index slug_1",
            );
        }

        if (!dryRun) {
            await Card.collection.createIndex(
                { slug: 1 },
                { name: wantSlugName },
            );
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

    const startedAt = Date.now();

    const missingQuery = {
        $or: [{ tenantKey: { $exists: false } }, { tenantKey: null }],
    };

    const missingCount = await Card.countDocuments(missingQuery);

    if (args.dryRun) {
        console.log("[dry-run] tenantKey backfill", {
            tenantKey: args.tenantKey,
            missingCount,
        });
    }

    let modifiedCount = 0;
    if (!args.dryRun && missingCount) {
        const res = await Card.updateMany(missingQuery, {
            $set: { tenantKey: args.tenantKey },
        });
        modifiedCount = Number(res?.modifiedCount || 0);

        console.log("tenantKey backfill applied", {
            tenantKey: args.tenantKey,
            modifiedCount,
        });
    }

    if (args.createIndex) {
        await ensureIndexes({
            dryRun: args.dryRun,
            dropOldSlugUnique: args.dropOldSlugUnique,
            verbose: args.verbose,
        });
    }

    const elapsedMs = Date.now() - startedAt;
    console.log("done", {
        dryRun: args.dryRun,
        tenantKey: args.tenantKey,
        missingCount,
        modifiedCount,
        createIndex: args.createIndex,
        dropOldSlugUnique: args.dropOldSlugUnique,
        elapsedMs,
    });

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error(err);
    try {
        await mongoose.disconnect();
    } catch {}
    process.exitCode = 1;
});
