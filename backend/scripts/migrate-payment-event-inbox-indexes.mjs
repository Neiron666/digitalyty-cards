/**
 * migrate-payment-event-inbox-indexes.mjs
 *
 * Governed manual migration for PaymentEventInbox indexes (Phase 2A).
 *
 * autoIndex is OFF globally (db.js); indexes are NEVER created at runtime.
 *
 * Indexes managed here:
 *   1. { eventKey: 1 }  unique   name: payment_event_inbox_eventKey_unique
 *   2. { legacyProviderTxnIdHash: 1 } unique partial(string)
 *        name: payment_event_inbox_legacyProviderTxnIdHash_unique
 *
 * Behavior:
 *   - dry-run by default; --apply to create.
 *   - inspects current index shape.
 *   - inspects duplicate eventKey / legacyProviderTxnIdHash counts WITHOUT
 *     printing any key value.
 *   - refuses to create a unique index when duplicate keys exist.
 *   - refuses a conflicting existing index shape (drift) instead of overwriting.
 *   - idempotent re-run (existing correct index → no-op).
 *   - sanitized output only.
 *
 * Usage:
 *   node scripts/migrate-payment-event-inbox-indexes.mjs                 (dry-run)
 *   node scripts/migrate-payment-event-inbox-indexes.mjs --apply --i-understand-index-downtime
 *
 * Exit codes:
 *   0 - success / no-op
 *   1 - unexpected error
 *   2 - blocked (duplicates or conflicting index shape)
 */

import "dotenv/config";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import PaymentEventInbox from "../src/models/PaymentEventInbox.model.js";
import { connectDB } from "../src/config/db.js";

const UNIQUE_NAME = "payment_event_inbox_eventKey_unique";
const LEGACY_HASH_NAME =
    "payment_event_inbox_legacyProviderTxnIdHash_unique";
// Obsolete Phase 2A (pre-2A.1) non-unique index. Non-authoritative and
// harmless — the authoritative identity index is LEGACY_HASH_NAME. Reported,
// never silently dropped.
const OBSOLETE_LEGACY_INDEX_NAME = "payment_event_inbox_legacyProviderTxnId";

function parseArgs(argv) {
    const args = { dryRun: true, confirmed: false, verbose: false };
    for (const token of argv.slice(2)) {
        if (token === "--apply") args.dryRun = false;
        else if (token === "--dry-run") args.dryRun = true;
        else if (token === "--i-understand-index-downtime")
            args.confirmed = true;
        else if (token === "--verbose") args.verbose = true;
    }
    return args;
}

function keySig(keyObj) {
    if (!keyObj || typeof keyObj !== "object") return "";
    return Object.entries(keyObj)
        .map(([k, v]) => `${k}:${String(v)}`)
        .join("|");
}

async function listIndexes() {
    try {
        return await PaymentEventInbox.collection.indexes();
    } catch (err) {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") return [];
        throw err;
    }
}

async function countDuplicateEventKeys() {
    const pipeline = [
        { $match: { eventKey: { $exists: true } } },
        { $group: { _id: "$eventKey", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: "groups" },
    ];
    const res = await PaymentEventInbox.aggregate(pipeline);
    return res.length > 0 ? res[0].groups : 0;
}

async function countDuplicateLegacyProviderTxnIdHash() {
    const pipeline = [
        { $match: { legacyProviderTxnIdHash: { $type: "string" } } },
        { $group: { _id: "$legacyProviderTxnIdHash", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: "groups" },
    ];
    const res = await PaymentEventInbox.aggregate(pipeline);
    return res.length > 0 ? res[0].groups : 0;
}

async function ensureUniqueEventKeyIndex({ dryRun, confirmed }, byName) {
    const existing = byName.get(UNIQUE_NAME);
    const wantSig = keySig({ eventKey: 1 });

    if (existing) {
        const sigOk = keySig(existing.key) === wantSig;
        const uniqueOk = Boolean(existing.unique) === true;
        if (sigOk && uniqueOk) {
            console.log(`${UNIQUE_NAME} already exists and matches - no-op`);
            return { ok: true };
        }
        console.error(
            `BLOCKED: ${UNIQUE_NAME} exists with a conflicting shape ` +
                `(unique=${Boolean(existing.unique)}, key=${keySig(existing.key)}); refusing to overwrite`,
        );
        return { ok: false, blocked: true };
    }

    const dupGroups = await countDuplicateEventKeys();
    if (dupGroups > 0) {
        console.error(
            `BLOCKED: ${dupGroups} duplicate eventKey group(s) found - ` +
                `resolve before creating unique index (values not printed)`,
        );
        if (dryRun) {
            console.log(
                "[dry-run] apply would remain BLOCKED until duplicates are resolved",
            );
        }
        return { ok: false, blocked: true };
    }

    if (dryRun) {
        console.log(
            `[dry-run] would create UNIQUE index ${UNIQUE_NAME} on { eventKey: 1 }`,
        );
        return { ok: true };
    }
    if (!confirmed) {
        console.error(
            "BLOCKED: --apply requires --i-understand-index-downtime",
        );
        return { ok: false, blocked: true };
    }
    await PaymentEventInbox.collection.createIndex(
        { eventKey: 1 },
        { unique: true, name: UNIQUE_NAME },
    );
    console.log(`created unique index ${UNIQUE_NAME}`);
    return { ok: true };
}

async function ensureLegacyHashUniqueIndex({ dryRun, confirmed }, byName) {
    const existing = byName.get(LEGACY_HASH_NAME);
    const wantSig = keySig({ legacyProviderTxnIdHash: 1 });

    if (existing) {
        const sigOk = keySig(existing.key) === wantSig;
        const uniqueOk = Boolean(existing.unique) === true;
        const partialOk = Boolean(existing.partialFilterExpression);
        if (sigOk && uniqueOk && partialOk) {
            console.log(
                `${LEGACY_HASH_NAME} already exists and matches - no-op`,
            );
            return { ok: true };
        }
        console.error(
            `BLOCKED: ${LEGACY_HASH_NAME} exists with a conflicting shape ` +
                `(unique=${Boolean(existing.unique)}, partial=${partialOk}, key=${keySig(existing.key)}); refusing to overwrite`,
        );
        return { ok: false, blocked: true };
    }

    const dupGroups = await countDuplicateLegacyProviderTxnIdHash();
    if (dupGroups > 0) {
        console.error(
            `BLOCKED: ${dupGroups} duplicate legacyProviderTxnIdHash group(s) found - ` +
                `resolve before creating unique index (values not printed)`,
        );
        if (dryRun) {
            console.log(
                "[dry-run] apply would remain BLOCKED until duplicates are resolved",
            );
        }
        return { ok: false, blocked: true };
    }

    if (dryRun) {
        console.log(
            `[dry-run] would create UNIQUE partial index ${LEGACY_HASH_NAME} on { legacyProviderTxnIdHash: 1 } (partial: string)`,
        );
        return { ok: true };
    }
    if (!confirmed) {
        console.error(
            "BLOCKED: --apply requires --i-understand-index-downtime",
        );
        return { ok: false, blocked: true };
    }
    await PaymentEventInbox.collection.createIndex(
        { legacyProviderTxnIdHash: 1 },
        {
            name: LEGACY_HASH_NAME,
            unique: true,
            partialFilterExpression: {
                legacyProviderTxnIdHash: { $type: "string" },
            },
        },
    );
    console.log(`created unique partial index ${LEGACY_HASH_NAME}`);
    return { ok: true };
}

/**
 * Report (never drop) the obsolete Phase 2A non-unique legacyProviderTxnId
 * index if present. It is non-authoritative and harmless; the authoritative
 * identity index is the unique partial legacyProviderTxnIdHash index. Removal,
 * if ever desired, is a separate governed migration. Idempotent, sanitized.
 */
function reportObsoleteLegacyIndex(byName) {
    const existing = byName.get(OBSOLETE_LEGACY_INDEX_NAME);
    if (!existing) return { present: false };
    console.log(
        `LEGACY_EXTRA_INDEX_PRESENT: ${OBSOLETE_LEGACY_INDEX_NAME} ` +
            `(key=${keySig(existing.key)}, unique=${Boolean(existing.unique)})`,
    );
    console.log(
        "  - non-authoritative and harmless; authoritative identity index is " +
            LEGACY_HASH_NAME,
    );
    console.log(
        "  - NOT dropped by this migration; removal is a separate future " +
            "governed migration (do not drop silently)",
    );
    return { present: true };
}

async function main() {
    const args = parseArgs(process.argv);

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error("MONGO_URI is not set (check backend/.env or env vars)");
    }

    await connectDB(mongoUri);
    try {
        const idx = await listIndexes();
        const byName = new Map(idx.map((i) => [i.name, i]));
        if (args.verbose) {
            console.log(
                "current indexes:",
                idx.map((i) => ({
                    name: i.name,
                    key: keySig(i.key),
                    unique: Boolean(i.unique),
                })),
            );
        }

        reportObsoleteLegacyIndex(byName);

        const r1 = await ensureUniqueEventKeyIndex(args, byName);
        const r2 = await ensureLegacyHashUniqueIndex(args, byName);

        if ((r1 && r1.blocked) || (r2 && r2.blocked)) {
            process.exitCode = 2;
        }

        console.log("done", {
            dryRun: args.dryRun,
            applied: !args.dryRun && args.confirmed,
        });
    } finally {
        await mongoose.disconnect();
    }
}

const isDirectRun =
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
    main().catch((err) => {
        console.error(String(err?.message || err));
        process.exitCode = 1;
    });
}

export { reportObsoleteLegacyIndex, OBSOLETE_LEGACY_INDEX_NAME };
