import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { releaseExpiredSlugRedirects } from "../src/utils/releaseExpiredSlugRedirects.js";

function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

function safeDbName() {
    const mongoUri = process.env.MONGO_URI || "";
    try {
        const url = new URL(mongoUri);
        const rawDb = url.pathname.slice(1).split("?")[0].trim();
        return rawDb || "(empty-db-name)";
    } catch {
        return "(unparseable)";
    }
}

if (!process.env.MONGO_URI) {
    console.log(
        JSON.stringify({ ok: false, error: "MONGO_URI is required" }, null, 2),
    );
    process.exitCode = 1;
    process.exit(1);
}

const APPLY = hasFlag("--apply");
const DRY_RUN = !APPLY;

mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

async function main() {
    await connectDB(process.env.MONGO_URI);

    const now = new Date();
    const result = await releaseExpiredSlugRedirects({ now, dryRun: DRY_RUN });

    const output = {
        ok: result.ok,
        mode: DRY_RUN ? "dry-run" : "apply",
        dbName: safeDbName(),
        checkedAt: result.checkedAt,
        candidateCount: result.candidateCount,
        durationMs: result.durationMs,
    };

    if (!DRY_RUN) {
        output.modifiedCount = result.modifiedCount;
    }

    console.log(JSON.stringify(output, null, 2));
    process.exitCode = 0;
}

try {
    await main();
} catch (err) {
    console.log(
        JSON.stringify(
            {
                ok: false,
                mode: DRY_RUN ? "dry-run" : "apply",
                error: err?.message || String(err),
            },
            null,
            2,
        ),
    );
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
