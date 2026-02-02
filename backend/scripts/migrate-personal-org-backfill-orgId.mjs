import "dotenv/config";

import mongoose from "mongoose";

import Card from "../src/models/Card.model.js";
import Organization from "../src/models/Organization.model.js";
import { connectDB } from "../src/config/db.js";
import {
    PERSONAL_ORG_NAME,
    PERSONAL_ORG_SLUG,
} from "../src/utils/personalOrg.util.js";

function parseArgs(argv) {
    const args = {
        dryRun: true,
        createIndex: false,
        verbose: false,
    };

    for (const token of argv.slice(2)) {
        if (token === "--apply") args.dryRun = false;
        else if (token === "--dry-run") args.dryRun = true;
        else if (token === "--create-index") args.createIndex = true;
        else if (token === "--verbose") args.verbose = true;
    }

    return args;
}

function normalizeSlug(v) {
    return String(v || "")
        .trim()
        .toLowerCase();
}

function withSuffix(baseSlug, suffix) {
    // keep within a conservative limit (matches org slug util: 60)
    const maxLen = 60;
    const safeBase = normalizeSlug(baseSlug);
    const safeSuffix = normalizeSlug(suffix).replace(/[^a-z0-9-]/g, "");

    const join = "-";
    const room = maxLen - (join.length + safeSuffix.length);
    const trimmedBase =
        safeBase.length > room ? safeBase.slice(0, room) : safeBase;

    return `${trimmedBase}${join}${safeSuffix}`;
}

async function ensurePersonalOrg({ dryRun, verbose }) {
    const existing = await Organization.findOne({
        slug: PERSONAL_ORG_SLUG,
    }).lean();

    if (existing) {
        if (existing.isActive === false && !dryRun) {
            await Organization.updateOne(
                { _id: existing._id },
                {
                    $set: {
                        isActive: true,
                        name: existing.name || PERSONAL_ORG_NAME,
                    },
                },
            );
        }

        return existing;
    }

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? "[dry-run] would create PERSONAL_ORG"
                : "creating PERSONAL_ORG",
            { slug: PERSONAL_ORG_SLUG, name: PERSONAL_ORG_NAME },
        );
    }

    if (dryRun) {
        return { _id: null, slug: PERSONAL_ORG_SLUG, name: PERSONAL_ORG_NAME };
    }

    try {
        const created = await Organization.create({
            slug: PERSONAL_ORG_SLUG,
            name: PERSONAL_ORG_NAME,
            isActive: true,
        });
        return created.toObject();
    } catch (err) {
        if (err?.code === 11000) {
            return Organization.findOne({ slug: PERSONAL_ORG_SLUG }).lean();
        }
        throw err;
    }
}

async function ensureIndexes({ dryRun, verbose }) {
    const idx = await Card.collection.indexes();
    const byName = new Map(idx.map((i) => [i.name, i]));

    const want = "orgId_1_slug_1";
    if (!byName.has(want)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] would create unique index orgId_1_slug_1"
                    : "creating unique index orgId_1_slug_1",
            );
        }

        if (!dryRun) {
            await Card.collection.createIndex(
                { orgId: 1, slug: 1 },
                {
                    unique: true,
                    name: want,
                    partialFilterExpression: {
                        orgId: { $type: "objectId" },
                        slug: { $type: "string" },
                    },
                },
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

    const personalOrg = await ensurePersonalOrg({
        dryRun: args.dryRun,
        verbose: args.verbose,
    });

    if (!personalOrg?._id && !args.dryRun) {
        throw new Error("failed to resolve PERSONAL_ORG _id");
    }

    const missingQuery = {
        $or: [{ orgId: { $exists: false } }, { orgId: null }],
    };

    const missingCount = await Card.countDocuments(missingQuery);

    // Detect slug collisions that would become conflicts inside PERSONAL_ORG.
    // This is critical because old multi-tenant slugs may collide once consolidated.
    const duplicateAgg = await Card.aggregate([
        { $match: missingQuery },
        {
            $group: {
                _id: "$slug",
                count: { $sum: 1 },
                ids: { $push: "$_id" },
                statuses: { $push: "$status" },
                createdAts: { $push: "$createdAt" },
            },
        },
        { $match: { count: { $gt: 1 } } },
        {
            $project: {
                slug: "$_id",
                count: 1,
                ids: 1,
                statuses: 1,
                createdAts: 1,
            },
        },
        { $sort: { count: -1 } },
    ]);

    const duplicatesCount = duplicateAgg.length;
    const duplicateDocsTotal = duplicateAgg.reduce(
        (acc, g) => acc + (g.count || 0),
        0,
    );

    if (args.dryRun) {
        console.log("[dry-run] orgId backfill", {
            personalOrgSlug: PERSONAL_ORG_SLUG,
            missingCount,
            duplicatesCount,
            duplicateDocsTotal,
        });
    }

    let renamedCount = 0;
    let modifiedCount = 0;

    if (!args.dryRun && missingCount) {
        // Handle duplicates first (rename all but the chosen winner in each group).
        // Winner selection (deterministic): prefer published, then oldest createdAt.
        for (const g of duplicateAgg) {
            const slug = normalizeSlug(g.slug);
            const rows = g.ids.map((id, idx) => ({
                id,
                status: g.statuses?.[idx] || "draft",
                createdAt: g.createdAts?.[idx]
                    ? new Date(g.createdAts[idx])
                    : null,
            }));

            rows.sort((a, b) => {
                const aPub = a.status === "published" ? 1 : 0;
                const bPub = b.status === "published" ? 1 : 0;
                if (aPub !== bPub) return bPub - aPub;

                const at = a.createdAt ? a.createdAt.getTime() : Infinity;
                const bt = b.createdAt ? b.createdAt.getTime() : Infinity;
                if (at !== bt) return at - bt;

                return String(a.id).localeCompare(String(b.id));
            });

            // Keep the first one as-is.
            const losers = rows.slice(1);

            for (const row of losers) {
                const suffix = String(row.id).slice(-6);
                const nextSlug = withSuffix(slug, suffix);

                const res = await Card.updateOne(
                    { _id: row.id, slug },
                    { $set: { slug: nextSlug } },
                );

                if (Number(res?.modifiedCount || 0) > 0) renamedCount += 1;
            }
        }

        const res = await Card.updateMany(missingQuery, {
            $set: { orgId: personalOrg._id },
        });

        modifiedCount = Number(res?.modifiedCount || 0);

        console.log("orgId backfill applied", {
            personalOrgSlug: PERSONAL_ORG_SLUG,
            renamedCount,
            modifiedCount,
        });
    }

    if (args.createIndex) {
        await ensureIndexes({ dryRun: args.dryRun, verbose: args.verbose });
    }

    const elapsedMs = Date.now() - startedAt;
    console.log("done", {
        dryRun: args.dryRun,
        personalOrgSlug: PERSONAL_ORG_SLUG,
        missingCount,
        duplicatesCount,
        duplicateDocsTotal,
        renamedCount,
        modifiedCount,
        createIndex: args.createIndex,
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
