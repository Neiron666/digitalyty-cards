import "dotenv/config";

import mongoose from "mongoose";
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

function safeIndexes(collection) {
    return collection.indexes().catch((err) => {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") return [];
        throw err;
    });
}

function indexMap(indexes) {
    return new Map(indexes.map((i) => [i.name, i]));
}

async function ensureIndex(col, byName, key, opts, { dryRun, verbose }) {
    const name = opts.name;
    if (byName.has(name)) {
        if (verbose) console.log(`  ${name} already exists — skip`);
        return;
    }

    const label = opts.unique ? `unique index ${name}` : `index ${name}`;

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? `  [dry-run] would create ${label}`
                : `  creating ${label}`,
        );
    }

    if (!dryRun) {
        await col.createIndex(key, opts);
    }
}

// ── leads index governance ───────────────────────────────────────

async function ensureLeadIndexes({ dryRun, verbose }) {
    const db = mongoose.connection.db;
    const col = db.collection("leads");

    console.log("\n--- leads ---");

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose) {
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );
    }

    // No prechecks — no unique indexes in scope.

    // 1) idx_leads_mailbox
    //    key: { card: 1, deletedAt: 1, archivedAt: 1, createdAt: -1 }
    //    Supports: mailbox list views with cursor pagination.
    await ensureIndex(
        col,
        byName,
        { card: 1, deletedAt: 1, archivedAt: 1, createdAt: -1 },
        { name: "idx_leads_mailbox" },
        { dryRun, verbose },
    );

    // 2) idx_leads_deletedAt_ttl
    //    key: { deletedAt: 1 }   TTL: 7 776 000 s (90 days)
    //    Auto-purges soft-deleted leads. TTL skips null/missing — safe for active leads.
    await ensureIndex(
        col,
        byName,
        { deletedAt: 1 },
        { name: "idx_leads_deletedAt_ttl", expireAfterSeconds: 7_776_000 },
        { dryRun, verbose },
    );

    // 3) idx_leads_unread_count
    //    key: { card: 1, deletedAt: 1, archivedAt: 1, readAt: 1 }
    //    Supports: countDocuments({ card:{$in:…}, readAt:null, archivedAt:null, deletedAt:null })
    await ensureIndex(
        col,
        byName,
        { card: 1, deletedAt: 1, archivedAt: 1, readAt: 1 },
        { name: "idx_leads_unread_count" },
        { dryRun, verbose },
    );
}

// ── Post-check ───────────────────────────────────────────────────

function keysEqual(actual, expected) {
    const aKeys = Object.keys(actual);
    const eKeys = Object.keys(expected);
    if (aKeys.length !== eKeys.length) return false;
    return aKeys.every((k, i) => k === eKeys[i] && actual[k] === expected[k]);
}

async function postCheck(verbose) {
    const db = mongoose.connection.db;
    const col = db.collection("leads");

    console.log("\n=== POST-CHECK ===");

    const idx = await safeIndexes(col);
    const names = idx.map((i) => i.name);
    console.log(`leads: ${JSON.stringify(names)}`);

    if (verbose) {
        for (const i of idx) {
            console.log(
                `  ${JSON.stringify({
                    name: i.name,
                    key: i.key,
                    unique: Boolean(i.unique),
                    expireAfterSeconds: i.expireAfterSeconds ?? null,
                })}`,
            );
        }
    }

    const byName = indexMap(idx);
    let allOk = true;

    // 1) idx_leads_mailbox — pre-existing, verify key shape.
    const mailbox = byName.get("idx_leads_mailbox");
    if (!mailbox) {
        console.error("  WARN: idx_leads_mailbox missing");
        allOk = false;
    } else if (
        !keysEqual(mailbox.key, {
            card: 1,
            deletedAt: 1,
            archivedAt: 1,
            createdAt: -1,
        })
    ) {
        console.error("  WARN: idx_leads_mailbox key mismatch");
        allOk = false;
    } else if (verbose) {
        console.log("  idx_leads_mailbox verified");
    }

    // 2) idx_leads_deletedAt_ttl — pre-existing, verify key + TTL.
    const ttl = byName.get("idx_leads_deletedAt_ttl");
    if (!ttl) {
        console.error("  WARN: idx_leads_deletedAt_ttl missing");
        allOk = false;
    } else if (!keysEqual(ttl.key, { deletedAt: 1 })) {
        console.error("  WARN: idx_leads_deletedAt_ttl key mismatch");
        allOk = false;
    } else if (ttl.expireAfterSeconds !== 7776000) {
        console.error(
            `  WARN: idx_leads_deletedAt_ttl TTL mismatch (got ${ttl.expireAfterSeconds}, expected 7776000)`,
        );
        allOk = false;
    } else if (verbose) {
        console.log("  idx_leads_deletedAt_ttl verified (TTL 7776000)");
    }

    // 3) idx_leads_unread_count — newly created, verify key shape.
    const unread = byName.get("idx_leads_unread_count");
    if (!unread) {
        console.error("  WARN: idx_leads_unread_count missing");
        allOk = false;
    } else if (
        !keysEqual(unread.key, {
            card: 1,
            deletedAt: 1,
            archivedAt: 1,
            readAt: 1,
        })
    ) {
        console.error("  WARN: idx_leads_unread_count key mismatch");
        allOk = false;
    } else if (verbose) {
        console.log("  idx_leads_unread_count verified");
    }

    if (allOk) {
        console.log("\nPOST-CHECK: all 3 governed leads indexes verified");
    } else {
        console.error("\nPOST-CHECK: GOVERNED INDEX ISSUE DETECTED");
        process.exitCode = 2;
    }
}

// ── Main ─────────────────────────────────────────────────────────

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

    await ensureLeadIndexes(args);

    // Post-check (apply mode only).
    if (!args.dryRun) {
        await postCheck(args.verbose);
    }

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
