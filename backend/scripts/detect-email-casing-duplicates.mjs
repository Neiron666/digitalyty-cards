import "dotenv/config";

import mongoose from "mongoose";

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function main() {
    // Avoid background autoIndex races/conflicts in scripts.
    // Must be set BEFORE importing app/models.
    mongoose.set("autoIndex", false);
    mongoose.set("autoCreate", false);

    // IMPORTANT: models must be imported only after disabling autoIndex.
    const [{ default: User }] = await Promise.all([
        import("../src/models/User.model.js"),
    ]);

    // Defense-in-depth: ensure Mongoose doesn't try to auto-create indexes.
    User.schema.set("autoIndex", false);

    assert(
        typeof process.env.MONGO_URI === "string" &&
            process.env.MONGO_URI.trim(),
        "Missing MONGO_URI in env",
    );

    await mongoose.connect(process.env.MONGO_URI, {
        autoIndex: false,
        autoCreate: false,
    });

    const groups = await User.aggregate([
        {
            $match: {
                email: { $type: "string", $ne: "" },
            },
        },
        {
            $project: {
                email: 1,
                emailLower: { $toLower: "$email" },
            },
        },
        {
            $group: {
                _id: "$emailLower",
                count: { $sum: 1 },
                users: {
                    $push: {
                        id: { $toString: "$_id" },
                        email: "$email",
                    },
                },
            },
        },
        {
            $match: {
                count: { $gt: 1 },
            },
        },
        {
            $sort: {
                count: -1,
                _id: 1,
            },
        },
    ]);

    const report = {
        ok: groups.length === 0,
        totalGroups: groups.length,
        groups: groups.map((g) => ({
            emailLower: g._id,
            count: g.count,
            users: g.users,
        })),
    };

    console.log(JSON.stringify(report, null, 2));

    // Align with other sanities: 0 = clean, 2 = issues found.
    process.exitCode = report.ok ? 0 : 2;
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
