import "dotenv/config";

import EmailSignupToken from "../src/models/EmailSignupToken.model.js";
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

async function ensureIndexes({ dryRun, verbose }) {
    let idx = [];
    try {
        idx = await EmailSignupToken.collection.indexes();
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
    const wantEmailNormalized = "emailNormalized_1";

    if (!byName.has(wantTokenHash)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] would create unique index tokenHash_1"
                    : "creating unique index tokenHash_1",
            );
        }
        if (!dryRun) {
            await EmailSignupToken.collection.createIndex(
                { tokenHash: 1 },
                { unique: true, name: wantTokenHash },
            );
        }
    }

    if (!byName.has(wantExpiresAt)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] would create index expiresAt_1"
                    : "creating index expiresAt_1",
            );
        }
        if (!dryRun) {
            await EmailSignupToken.collection.createIndex(
                { expiresAt: 1 },
                { name: wantExpiresAt },
            );
        }
    }

    if (!byName.has(wantEmailNormalized)) {
        if (dryRun || verbose) {
            console.log(
                dryRun
                    ? "[dry-run] would create index emailNormalized_1"
                    : "creating index emailNormalized_1",
            );
        }
        if (!dryRun) {
            await EmailSignupToken.collection.createIndex(
                { emailNormalized: 1 },
                { name: wantEmailNormalized },
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
    });
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
