/**
 * sanity-paymentintent-index-drift.mjs
 *
 * Drift sanity check for PaymentIntent collection indexes.
 *
 * Verifies:
 *   1. { purgeAt: 1 }  TTL index  expireAfterSeconds: 0  name: paymentintents_purgeAt_ttl
 *   2. { userId: 1, createdAt: -1 }               name: paymentintents_userId_createdAt
 *
 * Non-destructive. Does NOT create or modify indexes.
 * Reports PASS / FAIL with per-index detail.
 *
 * Usage:
 *   node scripts/sanity-paymentintent-index-drift.mjs
 *
 * Exit codes:
 *   0 - all indexes present and correctly configured (PASS)
 *   1 - one or more indexes missing or misconfigured (FAIL)
 */

import "dotenv/config";
import mongoose from "mongoose";
import PaymentIntent from "../src/models/PaymentIntent.model.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const EXPECTED = [
    {
        name: "paymentintents_purgeAt_ttl",
        key: { purgeAt: 1 },
        unique: false,
        ttlSeconds: 0,
        description: "TTL purge index (expireAfterSeconds: 0)",
    },
    {
        name: "paymentintents_userId_createdAt",
        key: { userId: 1, createdAt: -1 },
        unique: false,
        ttlSeconds: null,
        description: "Lookup compound index for notify reconciliation",
    },
    {
        name: "paymentintents_userId_plan_mode_status_checkoutExpiresAt",
        key: { userId: 1, plan: 1, mode: 1, status: 1, checkoutExpiresAt: 1 },
        unique: false,
        ttlSeconds: null,
        description: "Pending checkout reuse lookup index",
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

    const collection = mongoose.connection.db.collection("paymentintents");

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
        collection: "paymentintents",
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
