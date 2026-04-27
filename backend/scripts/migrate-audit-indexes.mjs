/**
 * migrate-audit-indexes.mjs
 *
 * Manual index migration/restoration for audit-trail collections.
 *
 * Collections governed:
 *   - adminaudits      (AdminAudit model)
 *   - orginviteaudits  (OrgInviteAudit model)
 *
 * Usage:
 *   node scripts/migrate-audit-indexes.mjs              (dry-run — default, safe)
 *   node scripts/migrate-audit-indexes.mjs --apply      (apply indexes to DB)
 *   node scripts/migrate-audit-indexes.mjs --apply --verbose
 *
 * Governance rules:
 *   - Never invoked automatically at runtime (MONGOOSE_AUTO_INDEX=false in prod).
 *   - Run apply mode only when explicitly authorized (--apply flag required).
 *   - Idempotent: re-running --apply is safe when indexes already exist.
 *   - No unique / TTL / partial indexes in scope — additive only, zero downtime risk.
 *   - If an index with the expected name but a different key is already present,
 *     the script reports the drift and exits non-zero without modifying anything.
 */

import "dotenv/config";

import mongoose from "mongoose";

import AdminAudit from "../src/models/AdminAudit.model.js";
import OrgInviteAudit from "../src/models/OrgInviteAudit.model.js";
import { connectDB } from "../src/config/db.js";

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

function keysEqual(actual, expected) {
    const aKeys = Object.keys(actual);
    const eKeys = Object.keys(expected);
    if (aKeys.length !== eKeys.length) return false;
    return aKeys.every((k, i) => k === eKeys[i] && actual[k] === expected[k]);
}

/**
 * Ensure a single non-unique, non-partial, non-TTL index exists.
 *
 * - If already present with matching key: skip (idempotent).
 * - If already present with wrong key: throw (drift detected — operator must investigate).
 * - If missing in dry-run: log what would be created, do not write.
 * - If missing in apply mode: create index.
 *
 * Throws on drift or createIndex failure so main() exits non-zero.
 */
async function ensureIndex(col, byName, key, opts, { dryRun, verbose }) {
    const name = opts.name;
    const existing = byName.get(name);

    if (existing) {
        if (!keysEqual(existing.key, key)) {
            throw new Error(
                `INDEX DRIFT DETECTED: index "${name}" on collection ` +
                    `"${col.collectionName}" exists with key ` +
                    `${JSON.stringify(existing.key)} but expected ` +
                    `${JSON.stringify(key)}. ` +
                    `Manual investigation required — do not auto-fix.`,
            );
        }
        if (verbose) console.log(`  ${name} already exists - skip`);
        return;
    }

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? `  [dry-run] would create index ${name}`
                : `  creating index ${name}`,
        );
    }

    if (!dryRun) {
        await col.createIndex(key, opts);
    }
}

// ── adminaudits index governance ──────────────────────────────────

async function ensureAdminAuditIndexes({ dryRun, verbose }) {
    const col = AdminAudit.collection;

    console.log("\n--- adminaudits ---");

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose) {
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );
    }

    // 1. adminUserId_1 — audit trail lookup by admin actor.
    await ensureIndex(
        col,
        byName,
        { adminUserId: 1 },
        { name: "adminUserId_1" },
        { dryRun, verbose },
    );

    // 2. action_1 — filter audit trail by action type.
    await ensureIndex(
        col,
        byName,
        { action: 1 },
        { name: "action_1" },
        { dryRun, verbose },
    );

    // 3. targetId_1 — primary filter for the active listAdminAudit read path.
    //    Supports: AdminAudit.find({ targetType, targetId }).sort({ createdAt: -1 })
    //    See: admin.controller.js listAdminAudit
    await ensureIndex(
        col,
        byName,
        { targetId: 1 },
        { name: "targetId_1" },
        { dryRun, verbose },
    );
}

// ── orginviteaudits index governance ──────────────────────────────

async function ensureOrgInviteAuditIndexes({ dryRun, verbose }) {
    const col = OrgInviteAudit.collection;

    console.log("\n--- orginviteaudits ---");

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose) {
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );
    }

    // 1. eventType_1 — filter audit trail by event type (CREATED/REVOKED/ACCEPTED).
    await ensureIndex(
        col,
        byName,
        { eventType: 1 },
        { name: "eventType_1" },
        { dryRun, verbose },
    );

    // 2. orgId_1 — future: all invite events for a given org.
    await ensureIndex(
        col,
        byName,
        { orgId: 1 },
        { name: "orgId_1" },
        { dryRun, verbose },
    );

    // 3. inviteId_1 — future: full lifecycle of a given invite.
    await ensureIndex(
        col,
        byName,
        { inviteId: 1 },
        { name: "inviteId_1" },
        { dryRun, verbose },
    );

    // 4. emailNormalized_1 — future: all invite events for an email address.
    await ensureIndex(
        col,
        byName,
        { emailNormalized: 1 },
        { name: "emailNormalized_1" },
        { dryRun, verbose },
    );

    // 5. actorUserId_1 — future: all invite actions by a given actor.
    await ensureIndex(
        col,
        byName,
        { actorUserId: 1 },
        { name: "actorUserId_1" },
        { dryRun, verbose },
    );
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv);

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error(
            "MONGO_URI is not set (check backend/.env or env vars)",
        );
    }

    console.log(`mode: ${args.dryRun ? "DRY-RUN" : "APPLY"}`);

    await connectDB(mongoUri);

    await ensureAdminAuditIndexes(args);
    await ensureOrgInviteAuditIndexes(args);

    console.log("\ndone", { dryRun: args.dryRun });
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await mongoose.disconnect();
        } catch {
            // ignore
        }
    });
