import "dotenv/config";
import { pathToFileURL } from "url";

import mongoose from "mongoose";

import Card from "../src/models/Card.model.js";
import User from "../src/models/User.model.js";
import Lead from "../src/models/Lead.model.js";
import CardAnalyticsDaily from "../src/models/CardAnalyticsDaily.model.js";
import { connectDB } from "../src/config/db.js";

function parseArgs(argv) {
    const args = {
        dryRun: true,
        limit: 0,
        createIndex: false,
        fixNullUsers: true,
        verbose: false,
    };

    for (const token of argv.slice(2)) {
        if (token === "--apply") args.dryRun = false;
        else if (token === "--dry-run") args.dryRun = true;
        else if (token === "--create-index") args.createIndex = true;
        else if (token === "--no-fix-null-users") args.fixNullUsers = false;
        else if (token === "--verbose") args.verbose = true;
        else if (token.startsWith("--limit=")) {
            const n = Number(token.split("=")[1]);
            args.limit = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
        }
    }

    return args;
}

function asObjectId(value) {
    try {
        if (!value) return null;
        return new mongoose.Types.ObjectId(String(value));
    } catch {
        return null;
    }
}

function createdAtMs(doc) {
    try {
        return doc?.createdAt ? new Date(doc.createdAt).getTime() : 0;
    } catch {
        return 0;
    }
}

function chooseCanonical({ cards, preferredId }) {
    if (!Array.isArray(cards) || cards.length === 0) return null;

    if (preferredId) {
        const preferred = cards.find(
            (c) => String(c._id) === String(preferredId),
        );
        if (preferred) return preferred;
    }

    const active = cards.filter((c) => c?.isActive !== false);

    const published = active.filter((c) => c?.status === "published");
    if (published.length) {
        return [...published].sort(
            (a, b) => createdAtMs(b) - createdAtMs(a),
        )[0];
    }

    if (active.length) {
        return [...active].sort((a, b) => createdAtMs(b) - createdAtMs(a))[0];
    }

    return [...cards].sort((a, b) => createdAtMs(b) - createdAtMs(a))[0];
}

async function mergeOrMoveAnalytics({
    fromCardIds,
    toCardId,
    dryRun,
    verbose,
}) {
    if (!fromCardIds.length) return { moved: 0, merged: 0, deleted: 0 };

    const docs = await CardAnalyticsDaily.find({
        cardId: { $in: fromCardIds },
    }).lean();

    let moved = 0;
    let merged = 0;
    let deleted = 0;

    for (const doc of docs) {
        const day = doc?.day;
        if (!day) continue;

        const existing = await CardAnalyticsDaily.findOne({
            cardId: toCardId,
            day,
        })
            .select("_id")
            .lean();

        if (!existing) {
            moved += 1;
            if (!dryRun) {
                await CardAnalyticsDaily.updateOne(
                    { _id: doc._id },
                    { $set: { cardId: toCardId } },
                );
            }
            continue;
        }

        // Conflict (unique on {cardId, day}). Best-effort merge only core counters,
        // then delete the duplicate day doc to preserve uniqueness.
        merged += 1;
        if (!dryRun) {
            const inc = {
                views: Number(doc?.views || 0),
                clicksTotal: Number(doc?.clicksTotal || 0),
                uniqueVisitors: Number(doc?.uniqueVisitors || 0),
            };

            await CardAnalyticsDaily.updateOne(
                { _id: existing._id },
                { $inc: inc },
            );

            await CardAnalyticsDaily.deleteOne({ _id: doc._id });
        } else if (verbose) {
            console.log("[dry-run] merge analytics", {
                day,
                from: String(doc.cardId),
                to: String(toCardId),
                inc: {
                    views: Number(doc?.views || 0),
                    clicksTotal: Number(doc?.clicksTotal || 0),
                    uniqueVisitors: Number(doc?.uniqueVisitors || 0),
                },
            });
        }
        deleted += 1;
    }

    return { moved, merged, deleted };
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

    const startedAt = Date.now();

    const summary = {
        usersProcessed: 0,
        usersWithDuplicates: 0,
        cardsDeactivated: 0,
        cardsUserUnset: 0,
        leadsRepointed: 0,
        analyticsMoved: 0,
        analyticsMerged: 0,
        analyticsDeleted: 0,
        userCardIdUpdated: 0,
        nullUserUnset: 0,
    };

    if (args.fixNullUsers) {
        const nullRes = args.dryRun
            ? await Card.countDocuments({ user: null })
            : await Card.updateMany({ user: null }, { $unset: { user: 1 } });

        if (args.dryRun) {
            summary.nullUserUnset = Number(nullRes || 0);
        } else {
            summary.nullUserUnset = Number(nullRes?.modifiedCount || 0);
        }

        if (summary.nullUserUnset && (args.dryRun || args.verbose)) {
            console.log(
                args.dryRun
                    ? "[dry-run] would unset {user:null} on cards"
                    : "unset {user:null} on cards",
                { count: summary.nullUserUnset },
            );
        }
    }

    const dupGroups = await Card.aggregate([
        { $match: { user: { $type: "objectId" } } },
        {
            $group: {
                _id: "$user",
                count: { $sum: 1 },
            },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
    ]);

    summary.usersWithDuplicates = dupGroups.length;

    const limit = Number(args.limit || 0);
    const groups = limit ? dupGroups.slice(0, limit) : dupGroups;

    for (const g of groups) {
        const userId = g?._id;
        if (!userId) continue;

        const user = await User.findById(userId).select("cardId").lean();

        const cards = await Card.find({ user: userId })
            .select("_id createdAt status isActive")
            .sort({ createdAt: -1 })
            .lean();

        const canonical = chooseCanonical({
            cards,
            preferredId: user?.cardId ? String(user.cardId) : null,
        });

        if (!canonical) continue;

        const canonicalId = asObjectId(canonical._id);
        if (!canonicalId) continue;

        const duplicateIds = cards
            .filter((c) => String(c._id) !== String(canonicalId))
            .map((c) => asObjectId(c._id))
            .filter(Boolean);

        if (!duplicateIds.length) continue;

        summary.usersProcessed += 1;

        if (args.dryRun) {
            console.log("[dry-run] dedupe user", {
                userId: String(userId),
                totalCards: cards.length,
                canonicalId: String(canonicalId),
                duplicates: duplicateIds.map(String),
            });
        }

        // Repoint leads (Lead.card) to the canonical card.
        if (!args.dryRun) {
            const leadRes = await Lead.updateMany(
                { card: { $in: duplicateIds } },
                { $set: { card: canonicalId } },
            );
            summary.leadsRepointed += Number(leadRes?.modifiedCount || 0);
        } else {
            const leadCount = await Lead.countDocuments({
                card: { $in: duplicateIds },
            });
            summary.leadsRepointed += Number(leadCount || 0);
        }

        // Best-effort analytics: move day docs where possible; merge core counters on conflicts.
        const analyticsRes = await mergeOrMoveAnalytics({
            fromCardIds: duplicateIds,
            toCardId: canonicalId,
            dryRun: args.dryRun,
            verbose: args.verbose,
        });
        summary.analyticsMoved += analyticsRes.moved;
        summary.analyticsMerged += analyticsRes.merged;
        summary.analyticsDeleted += analyticsRes.deleted;

        // Deactivate duplicates and remove user pointer so unique index can be enforced safely.
        if (!args.dryRun) {
            const deactivateRes = await Card.updateMany(
                { _id: { $in: duplicateIds } },
                {
                    $set: { isActive: false },
                    $unset: { user: 1 },
                },
            );
            summary.cardsDeactivated += Number(
                deactivateRes?.modifiedCount || 0,
            );

            // This is approximate (modifiedCount counts both operations together).
            summary.cardsUserUnset += Number(deactivateRes?.modifiedCount || 0);

            const userRes = await User.updateOne(
                { _id: userId },
                { $set: { cardId: canonicalId } },
            );
            summary.userCardIdUpdated += Number(userRes?.modifiedCount || 0);
        } else {
            summary.cardsDeactivated += duplicateIds.length;
            summary.cardsUserUnset += duplicateIds.length;
            summary.userCardIdUpdated += user?.cardId
                ? String(user.cardId) === String(canonicalId)
                    ? 0
                    : 1
                : 1;
        }
    }

    if (args.createIndex) {
        if (args.dryRun) {
            console.log(
                "[dry-run] would create unique sparse index on Card.user",
            );
        } else {
            await Card.collection.createIndex(
                { user: 1 },
                { unique: true, sparse: true, name: "user_1_unique_sparse" },
            );
            console.log("created index user_1_unique_sparse on cards.user");
        }
    }

    const elapsedMs = Date.now() - startedAt;

    console.log("DONE", {
        dryRun: args.dryRun,
        limit: args.limit || 0,
        createIndex: args.createIndex,
        summary,
        elapsedMs,
    });
}

const argv1 = process?.argv?.[1];
if (
    typeof argv1 === "string" &&
    import.meta.url === pathToFileURL(argv1).href
) {
    main().catch((err) => {
        console.error("FAILED", err?.message || err);
        process.exitCode = 1;
    });
}
