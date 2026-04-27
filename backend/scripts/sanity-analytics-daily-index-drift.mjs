/**
 * sanity-analytics-daily-index-drift.mjs
 *
 * Read-only drift sanity check for analytics daily aggregate collection indexes.
 *
 * Verifies:
 *   cardanalyticsdailys:
 *     1. Unique compound { cardId: 1, day: 1 }   name: cardId_1_day_1
 *
 *   siteanalyticsdailys:
 *     2. Unique compound { siteKey: 1, day: 1 }  name: siteKey_1_day_1
 *     3. TTL { createdAt: 1 }                    name: createdAt_1
 *        expireAfterSeconds: parseDailyRetentionDays() * 24 * 60 * 60
 *
 * Non-destructive. Does NOT create, modify, or drop indexes or collections.
 * Reports PASS / FAIL with per-index detail.
 *
 * Usage:
 *   node scripts/sanity-analytics-daily-index-drift.mjs
 *
 * Exit codes:
 *   0 - all required indexes present and correctly configured (PASS)
 *   1 - any required index missing, drifted, or MONGO_URI absent (FAIL)
 */

import "dotenv/config";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Retention resolution — mirrors SiteAnalyticsDaily.model.js and
// migrate-analytics-daily-indexes.mjs exactly (same constants, same formula).
// ---------------------------------------------------------------------------
const MIN_RETENTION_DAYS = 120;
const DEFAULT_RETENTION_DAYS = 365;

function parseDailyRetentionDays() {
    const raw = process.env.SITE_ANALYTICS_RETENTION_DAYS;
    const n = Number.parseInt(String(raw ?? ""), 10);
    const days = Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
    return Math.max(days, MIN_RETENTION_DAYS);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function logJson(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

function keyEntries(keyObj) {
    if (!keyObj || typeof keyObj !== "object") return [];
    return Object.entries(keyObj);
}

function keySig(keyObj) {
    return keyEntries(keyObj)
        .map(([k, v]) => `${k}:${String(v)}`)
        .join("|");
}

function findActual(actual, name) {
    return actual.find((i) => i?.name === name) ?? null;
}

function checkKey(actual, expected) {
    const aEntries = keyEntries(actual?.key);
    const eEntries = keyEntries(expected);
    if (aEntries.length !== eEntries.length) return false;
    for (let i = 0; i < eEntries.length; i += 1) {
        if (aEntries[i]?.[0] !== eEntries[i]?.[0]) return false;
        if (String(aEntries[i]?.[1]) !== String(eEntries[i]?.[1])) return false;
    }
    return true;
}

// ---------------------------------------------------------------------------
// Expected index definitions
// ---------------------------------------------------------------------------

function buildExpected(retentionDays) {
    const ttlSeconds = retentionDays * 24 * 60 * 60;
    return {
        cardanalyticsdailys: [
            {
                name: "cardId_1_day_1",
                key: { cardId: 1, day: 1 },
                unique: true,
                ttlSeconds: null,
                description: "Unique compound — one doc per card per UTC day",
            },
        ],
        siteanalyticsdailys: [
            {
                name: "siteKey_1_day_1",
                key: { siteKey: 1, day: 1 },
                unique: true,
                ttlSeconds: null,
                description: "Unique compound — one doc per site per UTC day",
            },
            {
                name: "createdAt_1",
                key: { createdAt: 1 },
                unique: false,
                ttlSeconds,
                description: `TTL: ${retentionDays} days (env: SITE_ANALYTICS_RETENTION_DAYS, min: ${MIN_RETENTION_DAYS})`,
            },
        ],
    };
}

// ---------------------------------------------------------------------------
// Check one collection
// ---------------------------------------------------------------------------

async function checkCollection(db, collectionName, expectedIndexes) {
    let actual = [];
    try {
        actual = await db.collection(collectionName).indexes();
    } catch {
        // Collection may not exist if migration was never applied.
        actual = [];
    }

    const findings = [];

    for (const exp of expectedIndexes) {
        const act = findActual(actual, exp.name);

        if (!act) {
            findings.push({
                collection: collectionName,
                index: exp.name,
                status: "MISSING",
                description: exp.description,
                expected: {
                    name: exp.name,
                    key: exp.key,
                    unique: exp.unique,
                    expireAfterSeconds: exp.ttlSeconds,
                },
                errors: [],
            });
            continue;
        }

        const errors = [];

        // Key check: field names, order, and direction values.
        if (!checkKey(act, exp.key)) {
            errors.push({
                field: "key",
                expected: keySig(exp.key),
                actual: keySig(act.key),
            });
        }

        // Unique flag check.
        const actUnique = Boolean(act.unique);
        if (actUnique !== exp.unique) {
            errors.push({
                field: "unique",
                expected: exp.unique,
                actual: actUnique,
            });
        }

        // TTL expireAfterSeconds check (only for TTL indexes).
        if (exp.ttlSeconds !== null) {
            const actTtl =
                act.expireAfterSeconds !== undefined
                    ? Number(act.expireAfterSeconds)
                    : null;
            if (actTtl !== exp.ttlSeconds) {
                errors.push({
                    field: "expireAfterSeconds",
                    expected: exp.ttlSeconds,
                    actual: actTtl,
                });
            }
        }

        findings.push({
            collection: collectionName,
            index: exp.name,
            status: errors.length === 0 ? "OK" : "DRIFT",
            description: exp.description,
            ...(errors.length ? { errors } : {}),
        });
    }

    const failed = findings.filter(
        (f) => f.status === "MISSING" || f.status === "DRIFT",
    );

    return {
        collection: collectionName,
        overall: failed.length === 0 ? "PASS" : "FAIL",
        summary: {
            total: findings.length,
            ok: findings.filter((f) => f.status === "OK").length,
            failed: failed.length,
        },
        findings,
    };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    const retentionDays = parseDailyRetentionDays();
    const ttlSeconds = retentionDays * 24 * 60 * 60;
    const expected = buildExpected(retentionDays);

    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    await mongoose.connect(process.env.MONGO_URI, {
        autoIndex: false,
        autoCreate: false,
    });

    const db = mongoose.connection.db;

    const cardResult = await checkCollection(
        db,
        "cardanalyticsdailys",
        expected.cardanalyticsdailys,
    );
    const siteResult = await checkCollection(
        db,
        "siteanalyticsdailys",
        expected.siteanalyticsdailys,
    );

    const overall =
        cardResult.overall === "PASS" && siteResult.overall === "PASS"
            ? "PASS"
            : "FAIL";

    logJson({
        overall,
        retentionDays,
        expectedTtlSeconds: ttlSeconds,
        summary: {
            totalCollections: 2,
            passed: [cardResult, siteResult].filter((r) => r.overall === "PASS")
                .length,
            failed: [cardResult, siteResult].filter((r) => r.overall === "FAIL")
                .length,
        },
        collections: {
            cardanalyticsdailys: cardResult,
            siteanalyticsdailys: siteResult,
        },
    });

    process.exitCode = overall === "PASS" ? 0 : 1;
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(String(err?.message || err));
    process.exitCode = 1;
    process.exit(process.exitCode);
});
