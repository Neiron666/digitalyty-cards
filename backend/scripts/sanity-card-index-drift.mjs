import "dotenv/config";
import mongoose from "mongoose";

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

function pickIndexShape(indexSpec) {
    return {
        name: indexSpec?.name ?? null,
        key: stableSortObject(indexSpec?.key ?? null),
        unique: Boolean(indexSpec?.unique),
        sparse: Boolean(indexSpec?.sparse),
        partialFilterExpression: stableSortObject(
            indexSpec?.partialFilterExpression ?? null,
        ),
    };
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

    const expected = [
        {
            name: "user_1",
            key: { user: 1 },
            unique: false,
            sparse: true,
            partialFilterExpression: null,
        },
        {
            name: "orgId_1_user_1",
            key: { orgId: 1, user: 1 },
            unique: true,
            sparse: false,
            partialFilterExpression: {
                orgId: { $type: "objectId" },
                user: { $type: "objectId" },
            },
        },
        {
            name: "orgId_1_slug_1",
            key: { orgId: 1, slug: 1 },
            unique: true,
            sparse: false,
            partialFilterExpression: {
                orgId: { $type: "objectId" },
                slug: { $type: "string" },
            },
        },
        {
            name: "tenantKey_1_slug_1",
            key: { tenantKey: 1, slug: 1 },
            unique: true,
            sparse: false,
            partialFilterExpression: {
                orgId: null,
                tenantKey: { $type: "string" },
                slug: { $type: "string" },
            },
        },
    ].map((idx) => pickIndexShape(idx));

    const expectedByName = new Map(expected.map((idx) => [idx.name, idx]));

    const missing = [];
    const mismatches = [];

    for (const exp of expected) {
        const act = actualByName.get(exp.name);
        if (!act) {
            missing.push(exp);
            continue;
        }
        if (!deepEqual(exp, act)) {
            mismatches.push({ name: exp.name, expected: exp, actual: act });
        }
    }

    const unexpected = [];
    for (const [name, act] of actualByName.entries()) {
        if (name === "_id_") continue;
        if (!expectedByName.has(name)) unexpected.push(act);
    }

    const criticalNames = new Set([
        "user_1",
        "orgId_1_user_1",
        "orgId_1_slug_1",
    ]);
    const criticalMissing = missing.filter((m) => criticalNames.has(m.name));
    const criticalMismatch = mismatches.filter((m) =>
        criticalNames.has(m.name),
    );

    const ok = criticalMissing.length === 0 && criticalMismatch.length === 0;

    const report = {
        ok,
        missing,
        mismatches,
        unexpected,
        actualSample: {
            names: Array.from(actualByName.keys()).sort(),
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
