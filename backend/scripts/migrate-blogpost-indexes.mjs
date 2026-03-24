import "dotenv/config";

import BlogPost from "../src/models/BlogPost.model.js";
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
        idx = await BlogPost.collection.indexes();
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

    if (verbose) {
        console.log("current indexes:");
        for (const [name, spec] of byName) {
            console.log(`  ${name}  key=${JSON.stringify(spec.key)}`);
        }
    }

    const wantName = "previousSlugs_1";

    if (byName.has(wantName)) {
        console.log(`${wantName} already exists — no-op`);
        return;
    }

    if (dryRun || verbose) {
        console.log(
            dryRun
                ? `[dry-run] would create index ${wantName} on { previousSlugs: 1 }`
                : `creating index ${wantName}`,
        );
    }

    if (!dryRun) {
        await BlogPost.collection.createIndex(
            { previousSlugs: 1 },
            { name: wantName },
        );
        console.log(`created index ${wantName}`);

        const after = await BlogPost.collection.indexes();
        console.log("resulting indexes:");
        for (const i of after) {
            console.log(`  ${i.name}  key=${JSON.stringify(i.key)}`);
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

    console.log("done", { dryRun: args.dryRun });
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
