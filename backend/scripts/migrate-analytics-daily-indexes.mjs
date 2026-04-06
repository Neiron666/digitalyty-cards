/**
 * migrate-analytics-daily-indexes.mjs
 *
 * Manual index migration for analytics daily aggregate collections:
 *   - cardanalyticsdailys
 *   - siteanalyticsdailys
 *
 * Usage:
 *   node scripts/migrate-analytics-daily-indexes.mjs              (dry-run - default, safe)
 *   node scripts/migrate-analytics-daily-indexes.mjs --apply      (apply indexes to DB)
 *   node scripts/migrate-analytics-daily-indexes.mjs --apply --verbose
 *
 * Governance rules:
 *   - Never invoked automatically at runtime (autoIndex disabled in prod).
 *   - Run apply mode only when explicitly authorized (--apply flag required).
 *   - Idempotent: re-running --apply is safe if indexes already exist.
 *   - MUST be applied before accepting any analytics tracking traffic on a fresh cluster.
 *
 * Required indexes:
 *   cardanalyticsdailys:
 *     1. Unique compound: { cardId: 1, day: 1 }  - one doc per card per UTC day
 *
 *   siteanalyticsdailys:
 *     2. Unique compound: { siteKey: 1, day: 1 } - one doc per site per UTC day
 *     3. TTL:             { createdAt: 1 }        - auto-expire per SITE_ANALYTICS_RETENTION_DAYS
 *
 * TTL governance (siteanalyticsdailys):
 *   - Reads SITE_ANALYTICS_RETENTION_DAYS env var (mirrors SiteAnalyticsDaily.model.js exactly).
 *   - Default: 365 days; minimum floor: 120 days.
 *   - If the TTL index already exists with a different expireAfterSeconds, this script logs
 *     a warning and skips - TTL changes require a manual collMod by the operator.
 */

import "dotenv/config";

import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";

// ── Retention resolution (mirrors SiteAnalyticsDaily.model.js) ───

const MIN_RETENTION_DAYS = 120;
const DEFAULT_RETENTION_DAYS = 365;

function parseDailyRetentionDays() {
    const raw = process.env.SITE_ANALYTICS_RETENTION_DAYS;
    const n = Number.parseInt(String(raw ?? ""), 10);
    const days = Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
    return Math.max(days, MIN_RETENTION_DAYS);
}

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

function safeIndexes(col) {
    return col.indexes().catch((err) => {
        if (err?.code === 26 || err?.codeName === "NamespaceNotFound")
            return [];
        throw err;
    });
}

function indexMap(indexes) {
    return new Map(indexes.map((i) => [i.name, i]));
}

async function ensureUniqueIndex(col, byName, key, name, { dryRun, verbose }) {
    if (byName.has(name)) {
        const existing = byName.get(name);
        if (!existing.unique) {
            console.error(
                `  WARNING: ${name} exists but is NOT unique - governance mismatch, manual intervention required`,
            );
            process.exitCode = 2;
        } else {
            if (verbose)
                console.log(`  ${name} already exists and is unique - no-op`);
            else console.log(`  ${name} already exists - no-op`);
        }
        return;
    }

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? `  [dry-run] would create unique index ${name}`
                : `  creating unique index ${name}`,
        );
    }

    if (!dryRun) {
        await col.createIndex(key, { unique: true, name });

        // Post-check
        const postIdx = await safeIndexes(col);
        const postByName = indexMap(postIdx);
        const created = postByName.get(name);

        if (created && created.unique) {
            console.log(`  created unique index ${name} - POST-CHECK PASS`);
        } else {
            console.error(
                `  WARNING: ${name} not found or not unique after createIndex - POST-CHECK FAIL`,
            );
            process.exitCode = 2;
        }
    }
}

// ── Duplicate prechecks ──────────────────────────────────────────

async function checkDuplicateCompound(col, colName, fields, verbose) {
    const groupId = {};
    for (const f of fields) groupId[f] = `$${f}`;

    const pipeline = [
        { $group: { _id: groupId, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 10 },
    ];

    let dupes;
    try {
        dupes = await col.aggregate(pipeline).toArray();
    } catch (err) {
        if (err?.code === 26 || err?.codeName === "NamespaceNotFound") {
            if (verbose)
                console.log(
                    `  ${colName} collection not found - no duplicates possible`,
                );
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            `DUPLICATE { ${fields.join(", ")} } in ${colName} - unique index BLOCKED:`,
        );
        for (const d of dupes) {
            const keyStr = fields.map((f) => `${f}=${d._id[f]}`).join("  ");
            console.log(`  ${keyStr}  count=${d.count}`);
        }
        return true;
    }

    if (verbose)
        console.log(`  no duplicate { ${fields.join(", ")} } in ${colName}`);
    return false;
}

// ── cardanalyticsdailys ───────────────────────────────────────────

async function ensureCardAnalyticsDailyIndexes({ dryRun, verbose }) {
    const db = mongoose.connection.db;
    const col = db.collection("cardanalyticsdailys");

    console.log("\n--- cardanalyticsdailys ---");

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose)
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );

    const wantName = "cardId_1_day_1";

    // Only attempt if index is missing (avoid re-running duplicate check on large existing data).
    if (!byName.has(wantName)) {
        const hasDuplicates = await checkDuplicateCompound(
            col,
            "cardanalyticsdailys",
            ["cardId", "day"],
            verbose,
        );

        if (hasDuplicates) {
            if (dryRun) {
                console.log(
                    "  [dry-run] duplicates detected - apply would be BLOCKED until duplicates are resolved",
                );
            } else {
                console.error(
                    "  BLOCKED: cannot create unique cardId_1_day_1 - resolve duplicate documents first",
                );
                process.exitCode = 2;
            }
            return;
        }
    }

    await ensureUniqueIndex(col, byName, { cardId: 1, day: 1 }, wantName, {
        dryRun,
        verbose,
    });
}

// ── siteanalyticsdailys ───────────────────────────────────────────

async function ensureSiteAnalyticsDailyIndexes({ dryRun, verbose }) {
    const db = mongoose.connection.db;
    const col = db.collection("siteanalyticsdailys");
    const retentionDays = parseDailyRetentionDays();
    const ttlSeconds = retentionDays * 24 * 60 * 60;

    console.log("\n--- siteanalyticsdailys ---");
    console.log(
        `  retention: ${retentionDays} days (SITE_ANALYTICS_RETENTION_DAYS=${process.env.SITE_ANALYTICS_RETENTION_DAYS ?? "unset → default"})`,
    );

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose)
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );

    // 1) siteKey_1_day_1 unique
    const uniqueName = "siteKey_1_day_1";

    if (!byName.has(uniqueName)) {
        const hasDuplicates = await checkDuplicateCompound(
            col,
            "siteanalyticsdailys",
            ["siteKey", "day"],
            verbose,
        );

        if (hasDuplicates) {
            if (dryRun) {
                console.log(
                    "  [dry-run] duplicates detected - apply would be BLOCKED until duplicates are resolved",
                );
            } else {
                console.error(
                    "  BLOCKED: cannot create unique siteKey_1_day_1 - resolve duplicate documents first",
                );
                process.exitCode = 2;
            }
            // Still attempt the TTL index below even if unique is blocked.
        } else {
            await ensureUniqueIndex(
                col,
                byName,
                { siteKey: 1, day: 1 },
                uniqueName,
                { dryRun, verbose },
            );
        }
    } else {
        const existing = byName.get(uniqueName);
        if (!existing.unique) {
            console.error(
                `  WARNING: ${uniqueName} exists but is NOT unique - governance mismatch`,
            );
            process.exitCode = 2;
        } else {
            console.log(`  ${uniqueName} already exists - no-op`);
        }
    }

    // 2) createdAt_1 TTL
    const ttlName = "createdAt_1";

    if (byName.has(ttlName)) {
        const existing = byName.get(ttlName);
        const existingTtl = existing.expireAfterSeconds;

        if (typeof existingTtl === "number") {
            if (existingTtl !== ttlSeconds) {
                // TTL mismatch: log warning, skip. Operator must use collMod to change.
                console.log(
                    `  ${ttlName} already exists with expireAfterSeconds=${existingTtl}, wanted ${ttlSeconds}`,
                );
                console.log(
                    `  TTL mismatch: to update, operator must run: db.siteanalyticsdailys.runCommand({collMod:"siteanalyticsdailys",index:{name:"${ttlName}",expireAfterSeconds:${ttlSeconds}}})`,
                );
            } else {
                console.log(
                    `  ${ttlName} already exists with correct TTL (${retentionDays}d) - no-op`,
                );
            }
        } else {
            console.log(`  ${ttlName} already exists (non-TTL) - no-op`);
        }
        return;
    }

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? `  [dry-run] would create TTL index ${ttlName} expireAfterSeconds=${ttlSeconds} (${retentionDays}d)`
                : `  creating TTL index ${ttlName} expireAfterSeconds=${ttlSeconds} (${retentionDays}d)`,
        );
    }

    if (!dryRun) {
        await col.createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: ttlSeconds, name: ttlName },
        );

        // Post-check
        const postIdx = await safeIndexes(col);
        const postByName = indexMap(postIdx);
        const created = postByName.get(ttlName);

        if (created && created.expireAfterSeconds === ttlSeconds) {
            console.log(
                `  created TTL index ${ttlName} expireAfterSeconds=${ttlSeconds} - POST-CHECK PASS`,
            );
        } else if (created) {
            // MongoDB may normalize large TTL values; warn but don't fail hard.
            console.log(
                `  created TTL index ${ttlName} - expireAfterSeconds in DB: ${created.expireAfterSeconds} (requested ${ttlSeconds})`,
            );
        } else {
            console.error(
                `  WARNING: ${ttlName} not found after createIndex - POST-CHECK FAIL`,
            );
            process.exitCode = 2;
        }
    }
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv);

    if (!process.env.MONGO_URI) {
        throw new Error(
            "MONGO_URI is not set (check backend/.env or env vars)",
        );
    }

    console.log(`mode: ${args.dryRun ? "DRY-RUN" : "APPLY"}`);

    await connectDB(process.env.MONGO_URI);

    try {
        await ensureCardAnalyticsDailyIndexes(args);
        await ensureSiteAnalyticsDailyIndexes(args);
        console.log("\ndone", { dryRun: args.dryRun });
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
