import "dotenv/config";

import mongoose from "mongoose";

import Card from "../src/models/Card.model.js";
import { connectDB } from "../src/config/db.js";
import { DEFAULT_TENANT_KEY } from "../src/utils/tenant.util.js";

function parseArgs(argv) {
    const args = {
        dryRun: true,
        createIndex: false,
        recreateIndex: false,
        dropOldSlugUnique: false,
        tenantKey: DEFAULT_TENANT_KEY,
        verbose: false,
    };

    for (const token of argv.slice(2)) {
        if (token === "--apply") args.dryRun = false;
        else if (token === "--dry-run") args.dryRun = true;
        else if (token === "--create-index") args.createIndex = true;
        else if (token === "--recreate-index") args.recreateIndex = true;
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

function hasOrgIdMissingClause(partialFilterExpression) {
    if (!partialFilterExpression || typeof partialFilterExpression !== "object")
        return false;

    // `orgId: null` matches BOTH null and missing fields in Mongo queries.
    // We prefer this form because `$exists: false` can be rejected in partial indexes
    // depending on MongoDB server version/config.
    return partialFilterExpression.orgId === null;
}

function isTenantKeySlugIndexDesired(index) {
    if (!index || typeof index !== "object") return false;

    const pfe = index.partialFilterExpression;
    if (!pfe || typeof pfe !== "object") return false;

    const hasTenantKey = pfe.tenantKey?.$type === "string";
    const hasSlug = pfe.slug?.$type === "string";
    const hasOrgIdMissing = hasOrgIdMissingClause(pfe);

    return Boolean(hasTenantKey && hasSlug && hasOrgIdMissing);
}

async function ensureIndexes({
    dryRun,
    recreateIndex,
    dropOldSlugUnique,
    verbose,
}) {
    const idx = await Card.collection.indexes();

    const byName = new Map(idx.map((i) => [i.name, i]));

    const wantCompoundName = "tenantKey_1_slug_1";
    const wantSlugName = "slug_1";
    const wantOrgSlugName = "orgId_1_slug_1";

    // Ensure org-scoped uniqueness exists (path-tenancy: /c/:orgSlug/:slug and /card/:slug).
    if (!byName.has(wantOrgSlugName)) {
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
                    name: wantOrgSlugName,
                    partialFilterExpression: {
                        orgId: { $type: "objectId" },
                        slug: { $type: "string" },
                    },
                },
            );
        }
    }

    const desiredTenantKeySlugOptions = {
        unique: true,
        name: wantCompoundName,
        partialFilterExpression: {
            // Legacy-only: keep uniqueness in the pre-orgId namespace.
            orgId: null,
            tenantKey: { $type: "string" },
            slug: { $type: "string" },
        },
    };

    const existingCompound = byName.get(wantCompoundName);
    const compoundExists = Boolean(existingCompound);
    const compoundIsDesired = isTenantKeySlugIndexDesired(existingCompound);

    if (compoundExists && !compoundIsDesired && recreateIndex) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] would drop+recreate unique index tenantKey_1_slug_1 (legacy-only PFE)"
                    : "dropping+recreating unique index tenantKey_1_slug_1 (legacy-only PFE)",
            );
        }

        if (!dryRun) {
            await Card.collection.dropIndex(wantCompoundName);
            await Card.collection.createIndex(
                { tenantKey: 1, slug: 1 },
                desiredTenantKeySlugOptions,
            );
        }
    } else if (!compoundExists) {
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
                desiredTenantKeySlugOptions,
            );
        }
    } else if (!compoundIsDesired && (dryRun || verbose)) {
        console.log(
            "note: tenantKey_1_slug_1 exists but is not legacy-only; rerun with --recreate-index to fix",
        );
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
            // Keep our index snapshot consistent so we can recreate slug_1 below.
            byName.delete(wantSlugName);
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
            recreateIndex: args.recreateIndex,
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
        recreateIndex: args.recreateIndex,
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
