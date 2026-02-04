import "dotenv/config";
import mongoose from "mongoose";

function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

function parseBoolEnv(value) {
    if (typeof value !== "string") return false;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ["1", "true", "yes", "y", "on"].includes(normalized);
}

function pickByName(indexes, names) {
    return indexes.filter((idx) => names.includes(idx?.name));
}

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

    const [{ default: Card }] = await Promise.all([
        import("../src/models/Card.model.js"),
    ]);

    let connected = false;
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            autoIndex: false,
            autoCreate: false,
        });
        connected = true;

        const names = ["user_1", "_id_"];

        const beforeAll = await Card.collection.indexes();
        const before = pickByName(beforeAll, names);

        console.log(
            JSON.stringify(
                {
                    mode: apply ? "apply" : "dry-run",
                    before,
                },
                null,
                2,
            ),
        );

        const userIdx = beforeAll.find((i) => i?.name === "user_1");
        const actualSparse = Boolean(userIdx?.sparse);
        const wantSparse = true;

        const isAlreadyOk = Boolean(userIdx) && actualSparse === wantSparse;
        const needsDropRecreate =
            Boolean(userIdx) && actualSparse !== wantSparse;
        const needsCreate = !userIdx;

        if (!apply) {
            if (needsCreate) {
                console.log(
                    JSON.stringify(
                        {
                            ok: false,
                            reason: "user_1 index missing (dry-run)",
                            action: {
                                createIndex: {
                                    key: { user: 1 },
                                    options: { name: "user_1", sparse: true },
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

            if (isAlreadyOk) {
                console.log(
                    JSON.stringify(
                        {
                            ok: true,
                            reason: "user_1 already matches expected options",
                            user_1: {
                                name: userIdx.name,
                                key: userIdx.key,
                                sparse: actualSparse,
                                unique: Boolean(userIdx.unique),
                                partialFilterExpression:
                                    userIdx.partialFilterExpression ?? null,
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
                        reason: "drift detected (dry-run)",
                        expected: {
                            name: "user_1",
                            key: { user: 1 },
                            sparse: true,
                        },
                        actual: {
                            name: userIdx.name,
                            key: userIdx.key,
                            sparse: actualSparse,
                        },
                        action: {
                            dropIndex: "user_1",
                            createIndex: {
                                key: { user: 1 },
                                options: { name: "user_1", sparse: true },
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

        // APPLY safety gates: must be explicit and never automatic.
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

        if (isAlreadyOk) {
            console.log(
                JSON.stringify(
                    {
                        ok: true,
                        reason: "no-op: user_1 already sparse:true",
                    },
                    null,
                    2,
                ),
            );
            process.exitCode = 0;
            return;
        }

        if (needsCreate) {
            await Card.collection.createIndex(
                { user: 1 },
                {
                    name: "user_1",
                    sparse: true,
                },
            );
        } else if (needsDropRecreate) {
            await Card.collection.dropIndex("user_1");
            await Card.collection.createIndex(
                { user: 1 },
                {
                    name: "user_1",
                    sparse: true,
                },
            );
        }

        const afterAll = await Card.collection.indexes();
        const after = pickByName(afterAll, names);

        const afterUserIdx = afterAll.find((i) => i?.name === "user_1");
        const afterSparse = Boolean(afterUserIdx?.sparse);

        const ok = Boolean(afterUserIdx) && afterSparse === true;

        console.log(
            JSON.stringify(
                {
                    ok,
                    after,
                    user_1: {
                        before: {
                            sparse: actualSparse,
                            key: userIdx?.key ?? null,
                        },
                        after: {
                            sparse: afterSparse,
                            key: afterUserIdx?.key ?? null,
                        },
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
