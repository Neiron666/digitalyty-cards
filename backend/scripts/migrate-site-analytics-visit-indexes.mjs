/**
 * migrate-site-analytics-visit-indexes.mjs
 *
 * Manual index migration for the SiteAnalyticsVisit collection.
 *
 * Usage:
 *   node scripts/migrate-site-analytics-visit-indexes.mjs            (dry-run — default, safe)
 *   node scripts/migrate-site-analytics-visit-indexes.mjs --apply    (apply indexes to DB)
 *
 * Governance rules:
 *   - Never invoked automatically at runtime (autoIndex disabled in prod).
 *   - Run apply mode only when explicitly authorized (--apply flag required).
 *   - Idempotent: re-running --apply is safe if indexes already exist.
 *
 * Required indexes:
 *   1. Unique compound: { siteKey: 1, visitHash: 1 }   — one doc per visit per site
 *   2. Query:          { siteKey: 1, day: 1 }          — date-range aggregations
 *   3. TTL:            { startedAt: 1 }                — auto-expire per SITE_ANALYTICS_VISIT_RETENTION_DAYS
 */

import "dotenv/config";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Retention resolution (mirrors SiteAnalyticsVisit.model.js)
// ---------------------------------------------------------------------------
const MIN_RETENTION_DAYS = 30;
const DEFAULT_RETENTION_DAYS = 90;

function parseVisitRetentionDays() {
    const raw = process.env.SITE_ANALYTICS_VISIT_RETENTION_DAYS;
    const n = Number.parseInt(String(raw ?? ""), 10);
    const days = Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
    return Math.max(days, MIN_RETENTION_DAYS);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

function logJson(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

// ---------------------------------------------------------------------------
// Index specifications
// ---------------------------------------------------------------------------
function buildIndexSpecs(retentionDays) {
    return [
        {
            name: "siteKey_1_visitHash_1",
            key: { siteKey: 1, visitHash: 1 },
            options: { unique: true, name: "siteKey_1_visitHash_1" },
            description: "Unique constraint: one document per visit per site",
        },
        {
            name: "siteKey_1_day_1",
            key: { siteKey: 1, day: 1 },
            options: { name: "siteKey_1_day_1" },
            description: "Query index: per-site date-range aggregation",
        },
        {
            name: "startedAt_1_ttl",
            key: { startedAt: 1 },
            options: {
                expireAfterSeconds: retentionDays * 24 * 60 * 60,
                name: "startedAt_1_ttl",
            },
            description: `TTL: expire after ${retentionDays} days (env: SITE_ANALYTICS_VISIT_RETENTION_DAYS)`,
        },
    ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    const apply = hasFlag("--apply");

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    const retentionDays = parseVisitRetentionDays();

    // Disable runtime auto-index — this script is the explicit migration path.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    await mongoose.connect(process.env.MONGO_URI, {
        autoIndex: false,
        autoCreate: false,
    });

    const db = mongoose.connection.db;
    const collection = db.collection("siteanalyticsvisits");

    // Fetch currently existing indexes.
    let existing = [];
    try {
        existing = await collection.indexes();
    } catch {
        // Collection may not exist yet; treat as empty index list.
    }

    const existingNames = new Set(existing.map((i) => i?.name).filter(Boolean));
    const specs = buildIndexSpecs(retentionDays);

    logJson({
        mode: apply ? "apply" : "dry-run",
        collection: "siteanalyticsvisits",
        retentionDays,
        existingIndexNames: [...existingNames],
    });

    const pending = specs.filter((s) => !existingNames.has(s.name));
    const alreadyPresent = specs.filter((s) => existingNames.has(s.name));

    logJson({
        alreadyPresent: alreadyPresent.map((s) => ({
            name: s.name,
            description: s.description,
        })),
        pending: pending.map((s) => ({
            name: s.name,
            description: s.description,
        })),
    });

    if (pending.length === 0) {
        logJson({
            ok: true,
            result: "All required indexes already exist. Nothing to apply.",
        });
        process.exitCode = 0;
        await mongoose.disconnect();
        return;
    }

    if (!apply) {
        logJson({
            ok: false,
            result: "dry-run: indexes are missing. Re-run with --apply to create them.",
            missingIndexes: pending.map((s) => ({
                name: s.name,
                key: s.key,
                options: s.options,
            })),
        });
        process.exitCode = 1;
        await mongoose.disconnect();
        return;
    }

    // Apply mode: create each missing index individually for clearer diagnostics.
    const results = [];
    for (const spec of pending) {
        try {
            await collection.createIndex(spec.key, spec.options);
            results.push({ name: spec.name, status: "created" });
        } catch (err) {
            results.push({
                name: spec.name,
                status: "error",
                message: String(err?.message || err),
            });
        }
    }

    const allOk = results.every((r) => r.status === "created");

    logJson({
        ok: allOk,
        results,
    });

    process.exitCode = allOk ? 0 : 1;
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(String(err?.message || err));
    process.exitCode = 1;
    process.exit(process.exitCode);
});
