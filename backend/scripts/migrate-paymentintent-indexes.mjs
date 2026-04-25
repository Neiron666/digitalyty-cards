/**
 * migrate-paymentintent-indexes.mjs
 *
 * Migration script for PaymentIntent collection indexes.
 *
 * Indexes managed:
 *   1. { purgeAt: 1 }  TTL  expireAfterSeconds: 0  name: paymentintents_purgeAt_ttl
 *   2. { userId: 1, createdAt: -1 }               name: paymentintents_userId_createdAt
 *
 * Usage:
 *   Dry-run (default):
 *     node scripts/migrate-paymentintent-indexes.mjs
 *
 *   Apply:
 *     node scripts/migrate-paymentintent-indexes.mjs --apply --i-understand-index-downtime
 *
 * The script is idempotent — if an index already exists with the correct
 * options it is reported as OK and no write is performed.
 *
 * Exit codes:
 *   0 - all indexes already correct, or successfully applied
 *   1 - dry-run found drift, or apply was refused (missing acknowledgement / prod guard)
 *   2 - apply failed unexpectedly
 */

import "dotenv/config";
import mongoose from "mongoose";

// ── Arg helpers ──────────────────────────────────────────────────────────────

function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

function parseBoolEnv(value) {
    if (typeof value !== "string") return false;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ["1", "true", "yes", "y", "on"].includes(normalized);
}

// ── Collection helpers ───────────────────────────────────────────────────────

async function safeIndexes(collection) {
    return collection.indexes().catch((err) => {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") return [];
        throw err;
    });
}

function logJson(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

// ── Expected index definitions ───────────────────────────────────────────────

const EXPECTED_INDEXES = [
    {
        name: "paymentintents_purgeAt_ttl",
        key: { purgeAt: 1 },
        ttl: true,
        expireAfterSeconds: 0,
        unique: false,
        description: "TTL purge index on purgeAt (expireAfterSeconds: 0)",
    },
    {
        name: "paymentintents_userId_createdAt",
        key: { userId: 1, createdAt: -1 },
        ttl: false,
        unique: false,
        description: "Lookup compound index for notify reconciliation",
    },
    {
        name: "paymentintents_userId_plan_mode_status_checkoutExpiresAt",
        key: { userId: 1, plan: 1, mode: 1, status: 1, checkoutExpiresAt: 1 },
        ttl: false,
        unique: false,
        description: "Pending checkout reuse lookup index",
    },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const apply = hasFlag("--apply");
    const acknowledgeDowntime = hasFlag("--i-understand-index-downtime");
    const force = hasFlag("--force");
    const allowByEnv = parseBoolEnv(process.env.ALLOW_INDEX_MIGRATION);

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    // Prevent accidental runtime index creation.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    const { default: PaymentIntent } =
        await import("../src/models/PaymentIntent.model.js");

    let connected = false;
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            autoIndex: false,
            autoCreate: false,
        });
        connected = true;

        const collection = PaymentIntent.collection;
        const actual = await safeIndexes(collection);
        const byName = new Map(actual.map((i) => [i.name, i]));

        // ── Compute drift ────────────────────────────────────────────────────

        const report = [];
        for (const exp of EXPECTED_INDEXES) {
            const act = byName.get(exp.name) ?? null;

            if (!act) {
                report.push({
                    name: exp.name,
                    status: "MISSING",
                    description: exp.description,
                });
                continue;
            }

            const errors = [];

            // TTL check.
            if (exp.ttl) {
                const actTtl =
                    act.expireAfterSeconds !== undefined
                        ? Number(act.expireAfterSeconds)
                        : null;
                if (actTtl !== exp.expireAfterSeconds) {
                    errors.push({
                        field: "expireAfterSeconds",
                        expected: exp.expireAfterSeconds,
                        actual: actTtl,
                    });
                }
            }

            // Unique flag.
            if (Boolean(act.unique) !== exp.unique) {
                errors.push({
                    field: "unique",
                    expected: exp.unique,
                    actual: Boolean(act.unique),
                });
            }

            report.push({
                name: exp.name,
                status: errors.length === 0 ? "OK" : "DRIFT",
                description: exp.description,
                ...(errors.length ? { errors } : {}),
            });
        }

        const needsWork = report.filter(
            (r) => r.status === "MISSING" || r.status === "DRIFT",
        );

        logJson({
            collection: "paymentintents",
            mode: apply ? "apply" : "dry-run",
            summary: {
                total: EXPECTED_INDEXES.length,
                ok: report.filter((r) => r.status === "OK").length,
                needsWork: needsWork.length,
            },
            indexes: report,
        });

        // ── Dry-run path ─────────────────────────────────────────────────────

        if (!apply) {
            if (needsWork.length === 0) {
                logJson({
                    ok: true,
                    reason: "all indexes already correct (dry-run)",
                });
                process.exitCode = 0;
            } else {
                logJson({
                    ok: false,
                    reason: "drift detected (dry-run) — re-run with --apply --i-understand-index-downtime to apply",
                    actions: needsWork.map((r) => ({
                        name: r.name,
                        action:
                            r.status === "MISSING"
                                ? "createIndex"
                                : "dropAndRecreate",
                    })),
                });
                process.exitCode = 1;
            }
            return;
        }

        // ── Apply safety gates ───────────────────────────────────────────────

        const hasAcknowledgement = acknowledgeDowntime || allowByEnv;
        if (!hasAcknowledgement) {
            logJson({
                ok: false,
                reason: "apply refused: missing --i-understand-index-downtime or ALLOW_INDEX_MIGRATION=1",
            });
            process.exitCode = 1;
            return;
        }

        if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
            if (!force) {
                logJson({
                    ok: false,
                    reason: "apply refused in NODE_ENV=production without --force",
                });
                process.exitCode = 1;
                return;
            }
        }

        if (needsWork.length === 0) {
            logJson({
                ok: true,
                reason: "all indexes already correct — no-op",
            });
            process.exitCode = 0;
            return;
        }

        // ── Apply path ───────────────────────────────────────────────────────

        for (const exp of EXPECTED_INDEXES) {
            const act = byName.get(exp.name) ?? null;

            if (
                act &&
                report.find((r) => r.name === exp.name)?.status === "OK"
            ) {
                logJson({
                    name: exp.name,
                    action: "skip",
                    reason: "already correct",
                });
                continue;
            }

            if (act) {
                // Drop before recreate (options drift).
                console.log(`dropping drifted index ${exp.name} ...`);
                await collection.dropIndex(exp.name);
            }

            const createOptions = { name: exp.name };
            if (exp.ttl)
                createOptions.expireAfterSeconds = exp.expireAfterSeconds;
            if (exp.unique) createOptions.unique = true;

            console.log(`creating index ${exp.name} ...`);
            await collection.createIndex(exp.key, createOptions);
            logJson({ name: exp.name, action: "created", ok: true });
        }

        // Verify after apply.
        const afterActual = await safeIndexes(collection);
        const afterByName = new Map(afterActual.map((i) => [i.name, i]));
        const missingAfter = EXPECTED_INDEXES.filter(
            (exp) => !afterByName.has(exp.name),
        );

        if (missingAfter.length > 0) {
            logJson({
                ok: false,
                reason: "post-apply verification failed: some indexes still missing",
                missing: missingAfter.map((e) => e.name),
            });
            process.exitCode = 2;
        } else {
            logJson({ ok: true, reason: "all indexes applied and verified" });
            process.exitCode = 0;
        }
    } finally {
        if (connected) {
            await mongoose.disconnect();
        }
    }
}

main().catch((err) => {
    console.error(String(err?.message || err));
    process.exitCode = 2;
});
