import "dotenv/config";

import PasswordReset from "../src/models/PasswordReset.model.js";
import { connectDB } from "../src/config/db.js";

function parseArgs(argv) {
    const args = {
        dryRun: true,
        ttl: false,
        verbose: false,
    };

    for (const token of argv.slice(2)) {
        if (token === "--apply") args.dryRun = false;
        else if (token === "--dry-run") args.dryRun = true;
        else if (token === "--ttl") args.ttl = true;
        else if (token === "--verbose") args.verbose = true;
    }

    return args;
}

async function ensureIndexes({ dryRun, ttl, verbose }) {
    let idx = [];
    try {
        idx = await PasswordReset.collection.indexes();
    } catch (err) {
        // On a fresh DB the collection may not exist yet; treat as no indexes.
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") {
            idx = [];
        } else {
            throw err;
        }
    }
    const byName = new Map(idx.map((i) => [i.name, i]));

    const wantTokenHash = "tokenHash_1";
    const wantExpiresAt = "expiresAt_1";
    const wantUserId = "userId_1";

    if (!byName.has(wantTokenHash)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] would create unique index tokenHash_1"
                    : "creating unique index tokenHash_1",
            );
        }
        if (!dryRun) {
            await PasswordReset.collection.createIndex(
                { tokenHash: 1 },
                { unique: true, name: wantTokenHash },
            );
        }
    }

    const expiresOptions = ttl
        ? { name: wantExpiresAt, expireAfterSeconds: 0 }
        : { name: wantExpiresAt };

    if (!byName.has(wantExpiresAt)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? `[dry-run] would create ${ttl ? "TTL " : ""}index expiresAt_1`
                    : `creating ${ttl ? "TTL " : ""}index expiresAt_1`,
            );
        }
        if (!dryRun) {
            await PasswordReset.collection.createIndex(
                { expiresAt: 1 },
                expiresOptions,
            );
        }
    }

    if (!byName.has(wantUserId)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] would create index userId_1"
                    : "creating index userId_1",
            );
        }
        if (!dryRun) {
            await PasswordReset.collection.createIndex(
                { userId: 1 },
                { name: wantUserId },
            );
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

    await ensureIndexes(args);

    console.log("done", {
        dryRun: args.dryRun,
        ttl: args.ttl,
    });
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
