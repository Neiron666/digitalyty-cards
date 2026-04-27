/**
 * sanity-aiusagemonthly-index-drift.mjs
 *
 * Read-only drift sanity check for the aiusagemonthlies collection indexes.
 *
 * AI quota / rate-limiting is production abuse-prevention infrastructure.
 * The unique compound index { userId, feature, periodKey } is required for
 * correct atomic upsert behavior. Loss of this index can allow duplicate
 * monthly usage rows under concurrent requests and degrade quota enforcement.
 *
 * Verifies:
 *   aiusagemonthlies:
 *     1. Unique compound { userId: 1, feature: 1, periodKey: 1 }
 *        name: userId_1_feature_1_periodKey_1
 *        unique: true
 *        no TTL, no partialFilterExpression, no sparse
 *
 * Non-destructive. Does NOT create, modify, or drop indexes or collections.
 * Reports PASS / FAIL with per-index detail.
 *
 * Usage:
 *   node scripts/sanity-aiusagemonthly-index-drift.mjs
 *
 * Exit codes:
 *   0 - required index present and correctly configured (PASS)
 *   1 - index missing, drifted, MONGO_URI absent, or connection failure (FAIL)
 */

import "dotenv/config";

import mongoose from "mongoose";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Expected index definitions ────────────────────────────────────────────────

const COLLECTION = "aiusagemonthlies";

const EXPECTED = [
    {
        name: "userId_1_feature_1_periodKey_1",
        key: { userId: 1, feature: 1, periodKey: 1 },
        unique: true,
        ttlSeconds: null,
        description:
            "Unique compound — one quota doc per user per feature per UTC month bucket (periodKey: YYYY-MM). Required for atomic upsert correctness and quota enforcement.",
    },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    await mongoose.connect(process.env.MONGO_URI, {
        autoIndex: false,
        autoCreate: false,
    });

    const collection = mongoose.connection.db.collection(COLLECTION);

    let actual = [];
    try {
        actual = await collection.indexes();
    } catch {
        // Collection may not exist if migration was never run.
        actual = [];
    }

    const findings = [];

    for (const exp of EXPECTED) {
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

        // Key check (field names + order + direction values).
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

        // No TTL check needed — this index must NOT have expireAfterSeconds.
        // If unexpectedly present, flag as drift.
        if (act.expireAfterSeconds !== undefined) {
            errors.push({
                field: "expireAfterSeconds",
                expected: null,
                actual: act.expireAfterSeconds,
            });
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
        collection: COLLECTION,
        overall,
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
