import "dotenv/config";
import mongoose from "mongoose";

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
        if (code === 26 || codeName === "NamespaceNotFound") return [];
        throw err;
    });
}

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

    const { default: User } = await import("../src/models/User.model.js");

    let connected = false;
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            autoIndex: false,
            autoCreate: false,
        });
        connected = true;

        const INDEX_NAME = "lastLoginAt_1";
        const WANT_KEY = { lastLoginAt: 1 };
        const WANT_SPARSE = true;

        const beforeAll = await safeIndexes(User.collection);
        const existing = beforeAll.find((i) => i?.name === INDEX_NAME);

        const isAlreadyOk =
            Boolean(existing) && Boolean(existing?.sparse) === WANT_SPARSE;
        const needsCreate = !existing;

        console.log(
            JSON.stringify(
                {
                    mode: apply ? "apply" : "dry-run",
                    indexName: INDEX_NAME,
                    found: Boolean(existing),
                    isAlreadyOk,
                },
                null,
                2,
            ),
        );

        // ── DRY-RUN path ─────────────────────────────────────────

        if (!apply) {
            if (isAlreadyOk) {
                console.log(
                    JSON.stringify(
                        {
                            ok: true,
                            reason: `${INDEX_NAME} already exists with correct options (dry-run)`,
                            index: {
                                name: existing.name,
                                key: existing.key,
                                sparse: Boolean(existing.sparse),
                            },
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
                        reason: needsCreate
                            ? `${INDEX_NAME} missing (dry-run)`
                            : `${INDEX_NAME} exists but options differ (dry-run)`,
                        action: {
                            createIndex: {
                                key: WANT_KEY,
                                options: {
                                    name: INDEX_NAME,
                                    sparse: WANT_SPARSE,
                                },
                            },
                        },
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

        if (isAlreadyOk) {
            console.log(
                JSON.stringify(
                    {
                        ok: true,
                        reason: `no-op: ${INDEX_NAME} already correct`,
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 0;
            return;
        }

        if (!needsCreate) {
            // Drop before recreate (options drift).
            await User.collection.dropIndex(INDEX_NAME);
        }

        await User.collection.createIndex(WANT_KEY, {
            name: INDEX_NAME,
            sparse: WANT_SPARSE,
        });

        const afterAll = await safeIndexes(User.collection);
        const afterIdx = afterAll.find((i) => i?.name === INDEX_NAME);
        const ok =
            Boolean(afterIdx) && Boolean(afterIdx?.sparse) === WANT_SPARSE;

        console.log(
            JSON.stringify(
                {
                    ok,
                    after: {
                        name: afterIdx?.name ?? null,
                        key: afterIdx?.key ?? null,
                        sparse: Boolean(afterIdx?.sparse),
                    },
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
