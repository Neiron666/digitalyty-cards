/**
 * sanity-payment-event-inbox-index-drift.mjs
 *
 * Drift sanity check for PaymentEventInbox collection indexes (Phase 2A).
 *
 * Verifies:
 *   1. { eventKey: 1 }  unique  name: payment_event_inbox_eventKey_unique
 *   2. { legacyProviderTxnIdHash: 1 } unique partial(string)
 *      name: payment_event_inbox_legacyProviderTxnIdHash_unique
 *
 * Non-destructive. Does NOT create or modify indexes. Sanitized output only.
 *
 * Usage:
 *   node scripts/sanity-payment-event-inbox-index-drift.mjs
 *
 * Exit codes:
 *   0 - all indexes present and correctly configured (PASS)
 *   1 - one or more indexes missing or misconfigured (FAIL)
 */

import "dotenv/config";
import mongoose from "mongoose";

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

const EXPECTED = [
    {
        name: "payment_event_inbox_eventKey_unique",
        key: { eventKey: 1 },
        unique: true,
        partial: false,
        description: "Unique idempotency index on eventKey",
    },
    {
        name: "payment_event_inbox_legacyProviderTxnIdHash_unique",
        key: { legacyProviderTxnIdHash: 1 },
        unique: true,
        partial: true,
        description:
            "Unique partial index enforcing atomic cross-terminal identity collision detection",
    },
];

// Obsolete Phase 2A (pre-2A.1) non-unique index. Non-authoritative and
// harmless. Reported as informational LEGACY_EXTRA_INDEX_PRESENT — it does NOT
// fail drift (removal is a separate future governed migration).
const OBSOLETE_LEGACY_INDEX_NAME = "payment_event_inbox_legacyProviderTxnId";

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

    const collection = mongoose.connection.db.collection("paymenteventinboxes");

    let actual = [];
    try {
        actual = await collection.indexes();
    } catch {
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
                    partial: exp.partial,
                },
            });
            continue;
        }

        const errors = [];

        if (!checkKey(act, exp.key)) {
            errors.push({
                field: "key",
                expected: keySig(exp.key),
                actual: keySig(act.key),
            });
        }

        const actUnique = Boolean(act.unique);
        if (actUnique !== exp.unique) {
            errors.push({
                field: "unique",
                expected: exp.unique,
                actual: actUnique,
            });
        }

        const actPartial = Boolean(act.partialFilterExpression);
        if (actPartial !== exp.partial) {
            errors.push({
                field: "partial",
                expected: exp.partial,
                actual: actPartial,
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
    const overall = failed.length === 0 ? "PASS" : "FAIL";

    // Informational only — obsolete non-authoritative index. Never fails drift.
    const obsolete = findActual(actual, OBSOLETE_LEGACY_INDEX_NAME);
    if (obsolete) {
        findings.push({
            index: OBSOLETE_LEGACY_INDEX_NAME,
            status: "LEGACY_EXTRA_INDEX_PRESENT",
            description:
                "Obsolete Phase 2A non-unique legacyProviderTxnId index — " +
                "non-authoritative and harmless; removal is a separate future " +
                "governed migration (not a drift failure)",
        });
    }

    logJson({
        collection: "paymenteventinboxes",
        overall,
        summary: {
            total: findings.length,
            ok: findings.length - failed.length,
            failed: failed.length,
            legacyExtraIndexPresent: Boolean(obsolete),
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
