import "dotenv/config";
import mongoose from "mongoose";

const CRITICAL_UNNAMED_KEY_SIGNATURES = new Set(["anonymousId:1"]);

function stableSortObject(value) {
    if (Array.isArray(value)) return value.map(stableSortObject);
    if (value && typeof value === "object") {
        const sorted = {};
        for (const key of Object.keys(value).sort()) {
            sorted[key] = stableSortObject(value[key]);
        }
        return sorted;
    }
    return value;
}

function keyEntries(keyObj) {
    if (!keyObj || typeof keyObj !== "object") return [];
    return Object.entries(keyObj);
}

function keySigFromKey(keyObj) {
    return keyEntries(keyObj)
        .map(([k, v]) => `${k}:${String(v)}`)
        .join("|");
}

function normalizedPartial(partialFilterExpression) {
    return stableSortObject(partialFilterExpression ?? null);
}

function pickIndexShape(indexSpec) {
    return {
        name: indexSpec?.name ?? null,
        key: indexSpec?.key ?? null,
        unique: Boolean(indexSpec?.unique),
        sparse: Boolean(indexSpec?.sparse),
        partialFilterExpression: normalizedPartial(
            indexSpec?.partialFilterExpression ?? null,
        ),
    };
}

function buildExpectedFromSchema(schema) {
    const expected = [];

    // Always include _id_.
    expected.push(
        pickIndexShape({
            name: "_id_",
            key: { _id: 1 },
            unique: false,
            sparse: false,
            partialFilterExpression: null,
        }),
    );

    // Includes both named schema-level indexes and unnamed path-level indexes.
    // For unnamed indexes, we match by key signature + option fields.
    const schemaIndexes = schema.indexes();
    for (const [key, options] of schemaIndexes) {
        expected.push(
            pickIndexShape({
                name: options?.name ?? null,
                key,
                unique: Boolean(options?.unique),
                sparse: Boolean(options?.sparse),
                partialFilterExpression:
                    options?.partialFilterExpression ?? null,
            }),
        );
    }

    return expected;
}

function equalIndexGovernanceFields(a, b) {
    if (!a || !b) return false;
    if (String(a.name || "") !== String(b.name || "")) return false;
    if (a.unique !== b.unique) return false;
    if (a.sparse !== b.sparse) return false;

    const aKey = keyEntries(a.key);
    const bKey = keyEntries(b.key);
    if (aKey.length !== bKey.length) return false;
    for (let i = 0; i < aKey.length; i += 1) {
        if (aKey[i][0] !== bKey[i][0]) return false;
        if (String(aKey[i][1]) !== String(bKey[i][1])) return false;
    }

    const aPartial = JSON.stringify(
        normalizedPartial(a.partialFilterExpression),
    );
    const bPartial = JSON.stringify(
        normalizedPartial(b.partialFilterExpression),
    );
    return aPartial === bPartial;
}

function equalUnnamedIndexFields(exp, act) {
    if (!exp || !act) return false;
    if (exp.unique !== act.unique) return false;
    if (exp.sparse !== act.sparse) return false;

    const expKeySig = keySigFromKey(exp.key);
    const actKeySig = keySigFromKey(act.key);
    if (expKeySig !== actKeySig) return false;

    const expPartial = JSON.stringify(
        normalizedPartial(exp.partialFilterExpression),
    );
    const actPartial = JSON.stringify(
        normalizedPartial(act.partialFilterExpression),
    );
    return expPartial === actPartial;
}

function isCriticalUnnamedExpectedIndex(exp) {
    // Enterprise contract: anonymous cards are keyed by anonymousId.
    // Uniqueness is required for ownership isolation (one card per anonymousId).
    const keySig = keySigFromKey(exp?.key ?? null);
    if (!CRITICAL_UNNAMED_KEY_SIGNATURES.has(keySig)) return false;
    if (exp?.unique !== true) return false;
    if (exp?.sparse !== true) return false;
    const partial = normalizedPartial(exp?.partialFilterExpression);
    return partial === null;
}

function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

async function main() {
    // Read-only governance: never auto-build indexes.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    const [{ default: Card }] = await Promise.all([
        import("../src/models/Card.model.js"),
    ]);

    await mongoose.connect(process.env.MONGO_URI, {
        autoIndex: false,
        autoCreate: false,
    });

    const actualRaw = await Card.collection.indexes();
    const actualByName = new Map(
        actualRaw
            .map(pickIndexShape)
            .filter((idx) => typeof idx.name === "string")
            .map((idx) => [idx.name, idx]),
    );

    const actualByKeySig = new Map();
    for (const idx of actualByName.values()) {
        const sig = keySigFromKey(idx.key);
        const bucket = actualByKeySig.get(sig) || [];
        bucket.push(idx);
        actualByKeySig.set(sig, bucket);
    }

    const expected = buildExpectedFromSchema(Card.schema);

    const expectedByName = new Map(expected.map((idx) => [idx.name, idx]));

    const missing = [];
    const mismatches = [];

    const warnings = {
        nonCriticalUnnamedMissingCount: 0,
        nonCriticalUnnamedMismatchCount: 0,
        nonCriticalUnnamedMissingSample: [],
        nonCriticalUnnamedMismatchSample: [],
    };

    const matchedActualNames = new Set(["_id_"]);

    for (const exp of expected) {
        const isNamed = typeof exp.name === "string" && exp.name;

        if (isNamed) {
            const act = actualByName.get(exp.name);
            if (!act) {
                missing.push(exp);
                continue;
            }
            matchedActualNames.add(act.name);
            if (!equalIndexGovernanceFields(exp, act)) {
                mismatches.push({ name: exp.name, expected: exp, actual: act });
            }
            continue;
        }

        // Unnamed expected index: match by keySig + option fields.
        const sig = keySigFromKey(exp.key);
        const candidates = actualByKeySig.get(sig) || [];

        const exact = candidates.find((c) => equalUnnamedIndexFields(exp, c));
        if (exact) {
            matchedActualNames.add(exact.name);
            continue;
        }

        const critical = isCriticalUnnamedExpectedIndex(exp);
        if (!critical) {
            if (!candidates.length) {
                warnings.nonCriticalUnnamedMissingCount += 1;
                if (warnings.nonCriticalUnnamedMissingSample.length < 10) {
                    warnings.nonCriticalUnnamedMissingSample.push({
                        key: exp.key,
                        unique: exp.unique,
                        sparse: exp.sparse,
                        partialFilterExpression: exp.partialFilterExpression,
                    });
                }
            } else {
                warnings.nonCriticalUnnamedMismatchCount += 1;
                if (warnings.nonCriticalUnnamedMismatchSample.length < 10) {
                    warnings.nonCriticalUnnamedMismatchSample.push({
                        expected: {
                            key: exp.key,
                            unique: exp.unique,
                            sparse: exp.sparse,
                            partialFilterExpression:
                                exp.partialFilterExpression,
                        },
                        actual: candidates[0],
                    });
                }
            }
            continue;
        }

        // Critical unnamed: fail-fast.
        if (!candidates.length) {
            missing.push({
                name: null,
                expected: exp,
                match: { by: "keySig", keySig: sig },
            });
            continue;
        }

        mismatches.push({
            name: null,
            expected: exp,
            actual: candidates[0],
            match: { by: "keySig", keySig: sig },
        });
    }

    const unexpected = [];
    for (const [name, act] of actualByName.entries()) {
        if (name === "_id_") continue;
        if (matchedActualNames.has(name)) continue;
        if (!expectedByName.has(name)) unexpected.push(act);
    }

    const ok = missing.length === 0 && mismatches.length === 0;

    const report = {
        ok,
        missing,
        mismatches,
        unexpected,
        warnings,
        actualSample: {
            names: Array.from(actualByName.keys()).sort(),
        },
        expectedSample: {
            names: Array.from(expectedByName.keys())
                .filter((n) => typeof n === "string" && n)
                .sort(),
            unnamedKeySigs: expected
                .filter((e) => !e?.name)
                .map((e) => keySigFromKey(e.key))
                .filter(Boolean)
                .sort(),
        },
    };

    console.log(JSON.stringify(report, null, 2));

    if (!ok) process.exitCode = 1;

    await mongoose.disconnect();
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
