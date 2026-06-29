import "dotenv/config";
import mongoose from "mongoose";

// Governed migration for the CardShowcaseExample (cardshowcaseexamples) collection indexes.
// Dry-run by default. Apply requires explicit acknowledgement flags.
// Mirrors backend/scripts/migrate-marketing-campaign-indexes.mjs conventions
// (flags, guards, autoIndex/autoCreate off, JSON-safe output).
//
// This slice CREATES MISSING indexes only. It NEVER drops and NEVER
// recreates drifted indexes — drift remediation is a separate operator step.
//
// Safe on empty or non-existent collection (NamespaceNotFound → treated as no indexes).

// ── Arg parsing ───────────────────────────────────────────────────

function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

function parseBoolEnv(value) {
    if (typeof value !== "string") return false;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ["1", "true", "yes", "y", "on"].includes(normalized);
}

// ── Helpers ───────────────────────────────────────────────────────

function safeIndexes(collection) {
    return collection.indexes().catch((err) => {
        const code = err?.code;
        const codeName = err?.codeName;
        // MongoDB code 26 = NamespaceNotFound: collection does not exist yet.
        if (code === 26 || codeName === "NamespaceNotFound") return [];
        throw err;
    });
}

/**
 * Compare two MongoDB index key specs.
 * Keys must appear in the same order with the same direction values.
 * e.g. { isActive: 1, sortOrder: 1, createdAt: 1 }
 */
function keysEqual(a, b) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (let i = 0; i < ka.length; i++) {
        if (ka[i] !== kb[i]) return false;
        if (a[ka[i]] !== b[kb[i]]) return false;
    }
    return true;
}

/**
 * Material index options that change query semantics or storage behaviour.
 * Non-material metadata (name, key, v, ns, background) is excluded.
 */
const MATERIAL_OPTION_KEYS = [
    "unique",
    "sparse",
    "expireAfterSeconds",
    "partialFilterExpression",
    "collation",
    "hidden",
];

/**
 * Returns a list of material option mismatches between an existing MongoDB
 * index document and a required index spec, or null if all match.
 *
 * Since the required index specifies only { name: "..." }, any material
 * option present in the existing index is treated as a conflict.
 *
 * For partialFilterExpression and collation (object values), a simple ===
 * check is sufficient here because the required value is always undefined.
 */
function materialOptionsConflict(existingIndex, req) {
    const conflicts = [];
    for (const k of MATERIAL_OPTION_KEYS) {
        const existingVal = existingIndex[k];
        const requiredVal = req.options[k]; // undefined when not in required options
        if (existingVal !== requiredVal) {
            conflicts.push({
                option: k,
                existingVal: existingVal ?? null,
                requiredVal: requiredVal ?? null,
            });
        }
    }
    return conflicts.length > 0 ? conflicts : null;
}

// Required indexes for the cardshowcaseexamples collection.
// Mirrors CardShowcaseExample.model.js exactly.
const REQUIRED_INDEXES = [
    {
        name: "isActive_sortOrder_createdAt",
        key: { isActive: 1, sortOrder: 1, createdAt: 1 },
        options: { name: "isActive_sortOrder_createdAt" },
    },
];

// ── Main ─────────────────────────────────────────────────────────

async function main() {
    const apply = hasFlag("--apply");
    const acknowledgeDowntime = hasFlag("--i-understand-index-downtime");
    const force = hasFlag("--force");
    const allowByEnv = parseBoolEnv(process.env.ALLOW_INDEX_MIGRATION);

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    // Never let this script trigger automatic index builds.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    const { default: CardShowcaseExample } =
        await import("../src/models/CardShowcaseExample.model.js");

    let connected = false;
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            autoIndex: false,
            autoCreate: false,
        });
        connected = true;

        const before = await safeIndexes(CardShowcaseExample.collection);
        const beforeNames = before.map((i) => i?.name).filter(Boolean);

        const missing = REQUIRED_INDEXES.filter(
            (req) => !beforeNames.includes(req.name),
        );

        console.log(
            JSON.stringify(
                {
                    mode: apply ? "apply" : "dry-run",
                    collection: "cardshowcaseexamples",
                    currentIndexes: beforeNames,
                    requiredIndexes: REQUIRED_INDEXES.map((r) => r.name),
                    missing: missing.map((r) => r.name),
                },
                null,
                2,
            ),
        );

        // ── Case A: same name, different key ──────────────────────
        // ── Case D: same name, same key, wrong material options ───
        //
        // Case A: index drift — key shape changed. Do NOT silently treat
        //         as present. Fail explicitly; operator must drop and recreate.
        // Case D: options drift — key is correct but a material option
        //         (unique, sparse, TTL, etc.) differs. Same prescription.

        const shapeConflicts = [];
        const optionsConflicts = [];
        for (const req of REQUIRED_INDEXES) {
            const existing = before.find((idx) => idx.name === req.name);
            if (!existing) continue; // name absent → handled by missing[]
            if (!keysEqual(existing.key, req.key)) {
                // Case A
                shapeConflicts.push({
                    name: req.name,
                    existingKey: existing.key,
                    requiredKey: req.key,
                });
            } else {
                // Key matches — check material options (Case D).
                const conflict = materialOptionsConflict(existing, req);
                if (conflict) {
                    optionsConflicts.push({
                        name: req.name,
                        key: req.key,
                        materialConflicts: conflict,
                    });
                }
            }
        }
        if (shapeConflicts.length > 0) {
            console.log(
                JSON.stringify(
                    {
                        ok: false,
                        reason: "INDEX_SHAPE_CONFLICT: index exists with same name but different key — manual drift remediation required before applying",
                        shapeConflicts,
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 1;
            return;
        }
        if (optionsConflicts.length > 0) {
            console.log(
                JSON.stringify(
                    {
                        ok: false,
                        reason: "INDEX_OPTIONS_CONFLICT: index exists with same name and key but wrong material options — manual drift remediation required before applying",
                        optionsConflicts,
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 1;
            return;
        }

        // ── Case B: same key, different name ──────────────────────
        // An existing index has the identical key spec but a different name.
        // MongoDB will reject createIndex with an error (duplicate key spec).
        // Detect early and fail with a clear message; operator must decide
        // whether to drop the old index or keep it and skip creation.

        const keyConflicts = [];
        for (const req of missing) {
            const duplicate = before.find(
                (idx) => idx.name !== req.name && keysEqual(idx.key, req.key),
            );
            if (duplicate) {
                keyConflicts.push({
                    required: { name: req.name, key: req.key },
                    existing: { name: duplicate.name, key: duplicate.key },
                });
            }
        }
        if (keyConflicts.length > 0) {
            console.log(
                JSON.stringify(
                    {
                        ok: false,
                        reason: "INDEX_KEY_CONFLICT: index with same key already exists under a different name — manual cleanup required before creating",
                        keyConflicts,
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 1;
            return;
        }

        // ── DRY-RUN path ─────────────────────────────────────────

        if (!apply) {
            if (missing.length === 0) {
                console.log(
                    JSON.stringify(
                        {
                            ok: true,
                            reason: "all required indexes present (dry-run)",
                        },
                        null,
                        2,
                    ),
                );
                process.exitCode = 0;
                return;
            }

            console.log(
                JSON.stringify(
                    {
                        ok: false,
                        reason: "required indexes missing (dry-run) — PENDING_INDEX_APPLY",
                        wouldCreate: missing.map((r) => ({
                            key: r.key,
                            options: r.options,
                        })),
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 1;
            return;
        }

        // ── APPLY safety gates ────────────────────────────────────

        const hasAcknowledgement = acknowledgeDowntime || allowByEnv;
        if (!hasAcknowledgement) {
            console.log(
                JSON.stringify(
                    {
                        ok: false,
                        reason: "apply refused: missing --i-understand-index-downtime or ALLOW_INDEX_MIGRATION=1",
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 1;
            return;
        }

        if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
            if (!force) {
                console.log(
                    JSON.stringify(
                        {
                            ok: false,
                            reason: "apply refused in NODE_ENV=production without --force",
                        },
                        null,
                        2,
                    ),
                );
                process.exitCode = 1;
                return;
            }
        }

        // ── APPLY path ────────────────────────────────────────────
        // Create missing indexes only. Never drop, never recreate drift.

        if (missing.length === 0) {
            console.log(
                JSON.stringify(
                    {
                        ok: true,
                        reason: "no-op: all required indexes already present",
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 0;
            return;
        }

        for (const req of missing) {
            await CardShowcaseExample.collection.createIndex(
                req.key,
                req.options,
            );
        }

        // ── Post-check verification ───────────────────────────────

        const after = await safeIndexes(CardShowcaseExample.collection);
        const afterNames = after.map((i) => i?.name).filter(Boolean);
        const stillMissing = REQUIRED_INDEXES.filter(
            (req) => !afterNames.includes(req.name),
        ).map((r) => r.name);

        const ok = stillMissing.length === 0;

        console.log(
            JSON.stringify(
                {
                    ok,
                    created: missing.map((r) => r.name),
                    currentIndexes: afterNames,
                    ...(ok ? {} : { stillMissing }),
                },
                null,
                2,
            ),
        );

        process.exitCode = ok ? 0 : 1;
    } finally {
        if (connected) await mongoose.disconnect();
    }
}

main()
    .catch((err) => {
        console.error(
            JSON.stringify(
                {
                    ok: false,
                    error: {
                        message: err?.message ?? String(err),
                        name: err?.name ?? null,
                    },
                },
                null,
                2,
            ),
        );
        process.exitCode = 1;
    })
    .finally(() => {
        console.log(`EXIT:${process.exitCode ?? 0}`);
    });
