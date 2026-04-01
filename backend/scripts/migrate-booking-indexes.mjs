import "dotenv/config";
import mongoose from "mongoose";
import Booking from "../src/models/Booking.model.js";
import { connectDB } from "../src/config/db.js";

function hasFlag(name) {
    return process.argv.includes(name);
}

function normalizedPartial(partialFilterExpression) {
    if (!partialFilterExpression) return null;
    const stable = (v) => {
        if (Array.isArray(v)) return v.map(stable);
        if (v && typeof v === "object") {
            const out = {};
            for (const k of Object.keys(v).sort()) out[k] = stable(v[k]);
            return out;
        }
        return v;
    };
    return stable(partialFilterExpression);
}

function pick(idx) {
    return {
        name: idx?.name ?? null,
        key: idx?.key ?? null,
        unique: Boolean(idx?.unique),
        partialFilterExpression: normalizedPartial(
            idx?.partialFilterExpression ?? null,
        ),
        expireAfterSeconds:
            typeof idx?.expireAfterSeconds === "number"
                ? idx.expireAfterSeconds
                : null,
    };
}

async function main() {
    const apply = hasFlag("--apply");
    const iUnderstand = hasFlag("--i-understand-index-downtime");

    if (apply && !iUnderstand) {
        console.log(
            "Refusing to apply without --i-understand-index-downtime (enterprise governance).",
        );
        process.exitCode = 1;
        return;
    }

    await connectDB(process.env.MONGO_URI);

    const expected = Booking.schema.indexes().map(([key, options]) => {
        return {
            name: options?.name ?? null,
            key,
            unique: Boolean(options?.unique),
            partialFilterExpression: normalizedPartial(
                options?.partialFilterExpression ?? null,
            ),
            expireAfterSeconds:
                typeof options?.expireAfterSeconds === "number"
                    ? options.expireAfterSeconds
                    : null,
        };
    });

    let rawIndexes;
    try {
        rawIndexes = await Booking.collection.indexes();
    } catch (err) {
        if (err?.code === 26 || err?.codeName === "NamespaceNotFound") {
            rawIndexes = [];
        } else {
            throw err;
        }
    }
    const actual = rawIndexes.map(pick);

    const byName = new Map(
        actual.filter((i) => i?.name).map((i) => [i.name, i]),
    );

    const plan = [];
    for (const exp of expected) {
        if (!exp?.name) continue;
        const act = byName.get(exp.name);

        const expShape = {
            name: exp.name,
            key: exp.key,
            unique: exp.unique,
            partialFilterExpression: exp.partialFilterExpression,
            expireAfterSeconds: exp.expireAfterSeconds,
        };

        if (!act) {
            plan.push({ action: "create", index: expShape });
            continue;
        }

        const actShape = {
            name: act.name,
            key: act.key,
            unique: act.unique,
            partialFilterExpression: act.partialFilterExpression,
            expireAfterSeconds: act.expireAfterSeconds,
        };

        const same = JSON.stringify(expShape) === JSON.stringify(actShape);
        if (!same) {
            plan.push({
                action: "mismatch",
                expected: expShape,
                actual: actShape,
            });
        }
    }

    console.log(
        JSON.stringify({ expectedCount: expected.length, plan }, null, 2),
    );

    const hasMismatch = plan.some((p) => p.action === "mismatch");
    const hasCreates = plan.some((p) => p.action === "create");

    if (!apply) {
        // Dry-run: fail if drift exists.
        process.exitCode = hasMismatch || hasCreates ? 1 : 0;
        return;
    }

    if (hasMismatch) {
        console.log(
            "Refusing to apply due to mismatches. Manual intervention required.",
        );
        process.exitCode = 1;
        return;
    }

    for (const item of plan) {
        if (item.action !== "create") continue;
        const idx = item.index;
        const opts = { name: idx.name };
        if (idx.unique) opts.unique = true;
        if (idx.partialFilterExpression)
            opts.partialFilterExpression = idx.partialFilterExpression;
        if (typeof idx.expireAfterSeconds === "number")
            opts.expireAfterSeconds = idx.expireAfterSeconds;
        await Booking.collection.createIndex(idx.key, opts);
    }
}

main()
    .catch((err) => {
        console.error("[migrate-booking-indexes] error:", err?.message || err);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await mongoose.disconnect();
        } catch {
            // ignore
        }
    });
