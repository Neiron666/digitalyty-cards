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

// ── Slug prechecks ───────────────────────────────────────────────

/**
 * 1) Raw duplicate slug detection.
 * Detects exact duplicate slug values in organizations.
 */
async function checkRawDuplicateSlugs(col, verbose) {
    const pipeline = [
        { $match: { slug: { $type: "string", $ne: "" } } },
        {
            $group: {
                _id: "$slug",
                count: { $sum: 1 },
                docs: {
                    $push: {
                        id: { $toString: "$_id" },
                        name: "$name",
                    },
                },
            },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ];

    let dupes;
    try {
        dupes = await col.aggregate(pipeline).toArray();
    } catch (err) {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") {
            if (verbose)
                console.log("  organizations collection not found - skip");
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            "RAW DUPLICATE slug values in organizations - unique index BLOCKED:",
        );
        for (const d of dupes) {
            console.log(
                `  slug="${d._id}"  count=${d.count}  docs=${JSON.stringify(d.docs)}`,
            );
        }
        return true;
    }

    if (verbose) console.log("  no raw duplicate slugs in organizations");
    return false;
}

/**
 * 2) Canonical duplicate slug detection.
 * Canonical slug = trim + lowercase.
 * Detects groups that are distinct raw values but collapse to the same canonical slug.
 */
async function checkCanonicalDuplicateSlugs(col, verbose) {
    const pipeline = [
        { $match: { slug: { $type: "string", $ne: "" } } },
        {
            $project: {
                slug: 1,
                name: 1,
                canonical: {
                    $toLower: { $trim: { input: "$slug" } },
                },
            },
        },
        {
            $group: {
                _id: "$canonical",
                count: { $sum: 1 },
                docs: {
                    $push: {
                        id: { $toString: "$_id" },
                        rawSlug: "$slug",
                        name: "$name",
                    },
                },
            },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 10 },
    ];

    let dupes;
    try {
        dupes = await col.aggregate(pipeline).toArray();
    } catch (err) {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") {
            if (verbose)
                console.log("  organizations collection not found - skip");
            return false;
        }
        throw err;
    }

    if (dupes.length > 0) {
        console.log(
            "CANONICAL DUPLICATE slugs in organizations - unique index BLOCKED:",
        );
        for (const d of dupes) {
            console.log(
                `  canonical="${d._id}"  count=${d.count}  docs=${JSON.stringify(d.docs)}`,
            );
        }
        return true;
    }

    if (verbose) console.log("  no canonical duplicate slugs in organizations");
    return false;
}

/**
 * 3) Non-canonical persisted slug detection.
 * A slug is non-canonical if the stored raw value != trim + lowercase of itself.
 */
async function checkNonCanonicalSlugs(col, verbose) {
    const pipeline = [
        { $match: { slug: { $type: "string", $ne: "" } } },
        {
            $project: {
                slug: 1,
                canonical: {
                    $toLower: { $trim: { input: "$slug" } },
                },
            },
        },
        {
            $match: {
                $expr: { $ne: ["$slug", "$canonical"] },
            },
        },
        { $sort: { _id: 1 } },
        { $limit: 20 },
    ];

    let rows;
    try {
        rows = await col.aggregate(pipeline).toArray();
    } catch (err) {
        const code = err?.code;
        const codeName = err?.codeName;
        if (code === 26 || codeName === "NamespaceNotFound") {
            if (verbose)
                console.log("  organizations collection not found - skip");
            return false;
        }
        throw err;
    }

    if (rows.length > 0) {
        console.log(
            "NON-CANONICAL persisted slugs in organizations - unique index BLOCKED:",
        );
        for (const r of rows) {
            console.log(
                `  id=${r._id}  raw="${r.slug}"  canonical="${r.canonical}"`,
            );
        }
        return true;
    }

    if (verbose)
        console.log("  no non-canonical persisted slugs in organizations");
    return false;
}

// ── Index creation helper ────────────────────────────────────────

async function ensureIndex(col, byName, key, opts, { dryRun, verbose }) {
    const name = opts.name;
    if (byName.has(name)) {
        if (verbose) console.log(`  ${name} already exists - skip`);
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

// ── organizations index governance ───────────────────────────────

async function ensureOrganizationIndexes({ dryRun, verbose }) {
    const db = mongoose.connection.db;
    const col = db.collection("organizations");

    console.log("\n--- organizations ---");

    const idx = await safeIndexes(col);
    const byName = indexMap(idx);

    if (verbose)
        console.log(
            "  current:",
            idx.map((i) => i.name),
        );

    // ── Precheck 1: raw duplicate slugs ──
    const rawDupes = await checkRawDuplicateSlugs(col, verbose);
    if (rawDupes) {
        if (dryRun) {
            console.log(
                "  [dry-run] raw duplicates detected - apply would be BLOCKED for slug_1 unique",
            );
        } else {
            console.error(
                "  BLOCKED: cannot create unique slug_1 in organizations - resolve raw duplicates first",
            );
            process.exitCode = 2;
        }
        return;
    }

    // ── Precheck 2: canonical duplicate slugs ──
    const canonicalDupes = await checkCanonicalDuplicateSlugs(col, verbose);
    if (canonicalDupes) {
        if (dryRun) {
            console.log(
                "  [dry-run] canonical duplicates detected - apply would be BLOCKED for slug_1 unique",
            );
        } else {
            console.error(
                "  BLOCKED: cannot create unique slug_1 in organizations - resolve canonical duplicates first",
            );
            process.exitCode = 2;
        }
        return;
    }

    // ── Precheck 3: non-canonical persisted slugs ──
    const nonCanonical = await checkNonCanonicalSlugs(col, verbose);
    if (nonCanonical) {
        if (dryRun) {
            console.log(
                "  [dry-run] non-canonical persisted slugs detected - apply would be BLOCKED for slug_1 unique",
            );
        } else {
            console.error(
                "  BLOCKED: cannot create unique slug_1 in organizations - normalize non-canonical slugs first",
            );
            process.exitCode = 2;
        }
        return;
    }

    // 1) slug_1 - unique: org public identity truth + public routing determinism
    //    + personalOrg bootstrap race protection.
    await ensureIndex(
        col,
        byName,
        { slug: 1 },
        { name: "slug_1", unique: true },
        { dryRun, verbose },
    );
}

// ── Post-check ───────────────────────────────────────────────────

async function postCheck(verbose) {
    const db = mongoose.connection.db;
    const col = db.collection("organizations");

    console.log("\n=== POST-CHECK ===");

    const idx = await safeIndexes(col);
    const names = idx.map((i) => i.name);
    console.log(`organizations: ${JSON.stringify(names)}`);

    if (verbose) {
        for (const i of idx) {
            console.log(
                `  ${JSON.stringify({ name: i.name, key: i.key, unique: Boolean(i.unique) })}`,
            );
        }
    }

    let allOk = true;
    const byName = indexMap(idx);

    // Critical: slug_1 must be unique.
    const slugIdx = byName.get("slug_1");
    if (!slugIdx || !slugIdx.unique) {
        console.error("  WARNING: slug_1 unique missing on organizations");
        allOk = false;
    }

    if (allOk) {
        console.log("\nPOST-CHECK: organizations slug_1 unique verified");
    } else {
        console.error("\nPOST-CHECK: CRITICAL INDEX MISSING");
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

    await ensureOrganizationIndexes(args);

    // Bail if blocked (exitCode already set).
    if (process.exitCode === 2) {
        console.log("\ndone (BLOCKED)", { dryRun: args.dryRun });
        return;
    }

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
