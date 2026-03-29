import "dotenv/config";

import ActivePasswordReset from "../src/models/ActivePasswordReset.model.js";
import MailJob from "../src/models/MailJob.model.js";
import { connectDB } from "../src/config/db.js";

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

// ---------------------------------------------------------------------------
// Helper: fetch existing index names for a collection, guarding against the
// collection not yet existing (NamespaceNotFound = code 26).
// ---------------------------------------------------------------------------
async function getIndexNames(collection) {
    try {
        const idx = await collection.indexes();
        return new Map(idx.map((i) => [i.name, i]));
    } catch (err) {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") {
            return new Map();
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// ActivePasswordReset indexes
//
// Critical indexes:
//   - userId_1 unique     → structural one-active-per-user guarantee
//   - tokenHash_1 unique partial (only when tokenHash exists)
//                          → avoids DuplicateKey on absent/undefined tokenHash;
//                             prevents hash collisions once worker sets the field
//   - expiresAt_1          → worker filter + cleanup sweeps
//   - status_1             → worker polling by status
//   - usedAt_1             → cleanup sweep / audit
// ---------------------------------------------------------------------------
async function ensureActivePasswordResetIndexes({ dryRun, verbose }) {
    const col = ActivePasswordReset.collection;
    const byName = await getIndexNames(col);

    // 1. Unique userId index — the one-active guarantee.
    const wantUserId = "userId_1_unique";
    if (!byName.has(wantUserId)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] activepasswordresets: would create unique index userId_1_unique"
                    : "activepasswordresets: creating unique index userId_1_unique",
            );
        }
        if (!dryRun) {
            await col.createIndex(
                { userId: 1 },
                { unique: true, name: wantUserId },
            );
        }
    }

    // 2. Unique PARTIAL tokenHash index — only covers documents where tokenHash
    //    is a non-null string (i.e. worker has set it). Documents in
    //    pending-delivery state (tokenHash absent/undefined) are excluded from
    //    this index, so no DuplicateKey error occurs for the absent state.
    const wantTokenHash = "tokenHash_1_partial_unique";
    if (!byName.has(wantTokenHash)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] activepasswordresets: would create unique partial index tokenHash_1_partial_unique"
                    : "activepasswordresets: creating unique partial index tokenHash_1_partial_unique",
            );
        }
        if (!dryRun) {
            await col.createIndex(
                { tokenHash: 1 },
                {
                    unique: true,
                    name: wantTokenHash,
                    partialFilterExpression: {
                        tokenHash: { $type: "string" },
                    },
                },
            );
        }
    }

    // 3. expiresAt index — worker filter + future TTL cleanup sweep.
    const wantExpiresAt = "expiresAt_1";
    if (!byName.has(wantExpiresAt)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] activepasswordresets: would create index expiresAt_1"
                    : "activepasswordresets: creating index expiresAt_1",
            );
        }
        if (!dryRun) {
            await col.createIndex({ expiresAt: 1 }, { name: wantExpiresAt });
        }
    }

    // 4. status index — worker polling and admin queries.
    const wantStatus = "status_1";
    if (!byName.has(wantStatus)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] activepasswordresets: would create index status_1"
                    : "activepasswordresets: creating index status_1",
            );
        }
        if (!dryRun) {
            await col.createIndex({ status: 1 }, { name: wantStatus });
        }
    }

    // 5. usedAt index — cleanup sweep / audit queries.
    const wantUsedAt = "usedAt_1";
    if (!byName.has(wantUsedAt)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] activepasswordresets: would create index usedAt_1"
                    : "activepasswordresets: creating index usedAt_1",
            );
        }
        if (!dryRun) {
            await col.createIndex({ usedAt: 1 }, { name: wantUsedAt });
        }
    }
}

// ---------------------------------------------------------------------------
// MailJob indexes
//
// Critical indexes:
//   - userId_1              → worker/admin lookup by user
//   - status_1_expiresAt_1  → primary worker poll query: {status:'pending', expiresAt:{$gt:now}}
//   - expiresAt_1           → standalone cleanup sweep
// ---------------------------------------------------------------------------
async function ensureMailJobIndexes({ dryRun, verbose }) {
    const col = MailJob.collection;
    const byName = await getIndexNames(col);

    // 1. userId index — per-user admin/worker lookup.
    const wantUserId = "userId_1";
    if (!byName.has(wantUserId)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] mailjobs: would create index userId_1"
                    : "mailjobs: creating index userId_1",
            );
        }
        if (!dryRun) {
            await col.createIndex({ userId: 1 }, { name: wantUserId });
        }
    }

    // 2. Compound status+expiresAt index — covers the primary worker poll:
    //    MailJob.findOneAndUpdate({status:'pending', expiresAt:{$gt:now}}, ...)
    const wantStatusExpires = "status_1_expiresAt_1";
    if (!byName.has(wantStatusExpires)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] mailjobs: would create compound index status_1_expiresAt_1"
                    : "mailjobs: creating compound index status_1_expiresAt_1",
            );
        }
        if (!dryRun) {
            await col.createIndex(
                { status: 1, expiresAt: 1 },
                { name: wantStatusExpires },
            );
        }
    }

    // 3. Standalone expiresAt index — cleanup sweep (expired jobs independent of status).
    const wantExpiresAt = "expiresAt_1";
    if (!byName.has(wantExpiresAt)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] mailjobs: would create index expiresAt_1"
                    : "mailjobs: creating index expiresAt_1",
            );
        }
        if (!dryRun) {
            await col.createIndex({ expiresAt: 1 }, { name: wantExpiresAt });
        }
    }
}

async function main() {
    const args = parseArgs(process.argv);

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error(
            "MONGO_URI is not set (check backend/.env or env vars)",
        );
    }

    await connectDB(mongoUri);

    await ensureActivePasswordResetIndexes(args);
    await ensureMailJobIndexes(args);

    console.log("done", { dryRun: args.dryRun });
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
