/**
 * sanity-site-analytics-visit-index-drift.mjs
 *
 * Drift sanity check for SiteAnalyticsVisit collection indexes.
 *
 * Verifies:
 *   - The three required indexes exist with exact key/order/options.
 *   - TTL expireAfterSeconds matches the env-driven resolved retention.
 *   - Reports clear PASS / FAIL output with per-index detail.
 *
 * Usage:
 *   node scripts/sanity-site-analytics-visit-index-drift.mjs
 *
 * Exit codes:
 *   0 - all indexes present and correctly configured (PASS)
 *   1 - one or more indexes missing or misconfigured (FAIL)
 */

import "dotenv/config";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Retention resolution (mirrors SiteAnalyticsVisit.model.js and migration script)
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

/**
 * Find an existing index by its expected name from the list of actual indexes.
 */
function findActual(actual, name) {
    return actual.find((i) => i?.name === name) ?? null;
}

/**
 * Check that actual key matches expected key in field-order and values.
 */
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
    return [
        {
            name: "siteKey_1_visitHash_1",
            key: { siteKey: 1, visitHash: 1 },
            unique: true,
            ttlSeconds: null,
            description: "Unique visit identity constraint",
        },
        {
            name: "siteKey_1_day_1",
            key: { siteKey: 1, day: 1 },
            unique: false,
            ttlSeconds: null,
            description: "Date-range query index",
        },
        {
            name: "startedAt_1_ttl",
            key: { startedAt: 1 },
            unique: false,
            ttlSeconds: retentionDays * 24 * 60 * 60,
            description: `TTL: ${retentionDays} days (env: SITE_ANALYTICS_VISIT_RETENTION_DAYS)`,
        },
    ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    const retentionDays = parseVisitRetentionDays();

    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    await mongoose.connect(process.env.MONGO_URI, {
        autoIndex: false,
        autoCreate: false,
    });

    const db = mongoose.connection.db;
    const collection = db.collection("siteanalyticsvisits");

    let actual = [];
    try {
        actual = await collection.indexes();
    } catch {
        // Collection may not exist if migration was never run.
        actual = [];
    }

    const expected = buildExpected(retentionDays);
    const findings = [];

    for (const exp of expected) {
        const act = findActual(actual, exp.name);

        if (!act) {
            findings.push({
                index: exp.name,
                status: "MISSING",
                description: exp.description,
                expected: {
                    name: exp.name,
                    key: exp.key,
                    unique: exp.unique,
                    expireAfterSeconds: exp.ttlSeconds,
                },
            });
            continue;
        }

        const errors = [];

        // Key check (field names + order + values).
        if (!checkKey(act, exp.key)) {
            errors.push({
                field: "key",
                expected: keySig(exp.key),
                actual: keySig(act.key),
            });
        }

        // Unique flag.
        const actUnique = Boolean(act.unique);
        if (actUnique !== exp.unique) {
            errors.push({
                field: "unique",
                expected: exp.unique,
                actual: actUnique,
            });
        }

        // TTL seconds (only for the TTL index).
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
            index: exp.name,
            status: errors.length === 0 ? "OK" : "DRIFT",
            description: exp.description,
            ...(errors.length ? { errors } : {}),
        });
    }

    const failed = findings.filter(
        (f) => f.status === "MISSING" || f.status === "DRIFT",
    );
    const passed = findings.filter((f) => f.status === "OK");
    const overall = failed.length === 0 ? "PASS" : "FAIL";

    logJson({
        collection: "siteanalyticsvisits",
        overall,
        retentionDays,
        expectedTtlSeconds: retentionDays * 24 * 60 * 60,
        summary: {
            total: findings.length,
            ok: passed.length,
            failed: failed.length,
        },
        findings,
    });

    process.exitCode = overall === "PASS" ? 0 : 1;
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(String(err?.message || err));
    process.exitCode = 1;
    process.exit(process.exitCode);
});
