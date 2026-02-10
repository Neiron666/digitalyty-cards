import "dotenv/config";

import mongoose from "mongoose";

import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.model.js";
import Card from "../src/models/Card.model.js";
import { getPersonalOrgId } from "../src/utils/personalOrg.util.js";

const SAMPLE_LIMIT = 10;
const DUP_CARD_IDS_LIMIT = 5;
const VERBOSE =
    process.argv.includes("--verbose") || process.env.SANITY_VERBOSE === "1";

function safeString(value) {
    if (value === null || value === undefined) return null;
    return String(value);
}

function summarizeCounts(counts) {
    const totalIssues = Object.values(counts).reduce(
        (acc, v) => acc + (Number(v) || 0),
        0,
    );
    return { totalIssues };
}

async function runAggregates({ usersColl, cardsColl }) {
    const personalOrgId = await getPersonalOrgId();
    const personalOrgObjectId = mongoose.Types.ObjectId.isValid(
        String(personalOrgId || ""),
    )
        ? new mongoose.Types.ObjectId(String(personalOrgId))
        : null;

    // A) users.cardId -> missing card doc
    const A_pipeline = [
        { $match: { cardId: { $exists: true, $ne: null } } },
        {
            $lookup: {
                from: cardsColl,
                localField: "cardId",
                foreignField: "_id",
                as: "card",
            },
        },
        { $match: { $expr: { $eq: [{ $size: "$card" }, 0] } } },
        {
            $project: {
                _id: 0,
                userId: "$_id",
                cardId: 1,
            },
        },
    ];

    // B) users.cardId -> card exists but card.user missing OR != user._id
    const B_pipeline = [
        { $match: { cardId: { $exists: true, $ne: null } } },
        {
            $lookup: {
                from: cardsColl,
                localField: "cardId",
                foreignField: "_id",
                as: "card",
            },
        },
        { $unwind: "$card" },
        {
            $match: {
                $or: [
                    { "card.user": { $exists: false } },
                    { "card.user": null },
                    { $expr: { $ne: ["$card.user", "$_id"] } },
                ],
            },
        },
        {
            $project: {
                _id: 0,
                userId: "$_id",
                cardId: 1,
                cardUser: "$card.user",
                hasAnonymousId: {
                    $ne: [{ $ifNull: ["$card.anonymousId", null] }, null],
                },
                cardSlug: "$card.slug",
                cardStatus: "$card.status",
            },
        },
    ];

    // C) cards.user set -> missing user doc
    const C_pipeline = [
        { $match: { user: { $exists: true, $ne: null } } },
        {
            $lookup: {
                from: usersColl,
                localField: "user",
                foreignField: "_id",
                as: "u",
            },
        },
        { $match: { $expr: { $eq: [{ $size: "$u" }, 0] } } },
        {
            $project: {
                _id: 0,
                cardId: "$_id",
                cardUser: "$user",
                slug: "$slug",
                status: "$status",
            },
        },
    ];

    // E) duplicate PERSONAL cards per user (count > 1)
    // Allowed: multiple org-scoped cards per user.
    const E_pipeline = [
        {
            $match: {
                user: { $exists: true, $ne: null },
                $or: [
                    ...(personalOrgObjectId
                        ? [{ orgId: personalOrgObjectId }]
                        : []),
                    { orgId: { $exists: false } },
                    { orgId: null },
                ],
            },
        },
        {
            $group: {
                _id: "$user",
                count: { $sum: 1 },
                cardIds: { $push: "$_id" },
            },
        },
        { $match: { count: { $gt: 1 } } },
        {
            $project: {
                _id: 0,
                userId: "$_id",
                count: 1,
                cardIds: { $slice: ["$cardIds", DUP_CARD_IDS_LIMIT] },
            },
        },
        { $sort: { count: -1 } },
    ];

    // F) duplicate org cards per (orgId, user) (count > 1)
    // This should be prevented by the (orgId,user) unique index, but we guard anyway.
    const F_pipeline = [
        {
            $match: {
                user: { $exists: true, $ne: null },
                orgId: { $type: "objectId" },
            },
        },
        {
            $group: {
                _id: { orgId: "$orgId", userId: "$user" },
                count: { $sum: 1 },
                cardIds: { $push: "$_id" },
            },
        },
        { $match: { count: { $gt: 1 } } },
        {
            $project: {
                _id: 0,
                orgId: "$_id.orgId",
                userId: "$_id.userId",
                count: 1,
                cardIds: { $slice: ["$cardIds", DUP_CARD_IDS_LIMIT] },
            },
        },
        { $sort: { count: -1 } },
    ];

    const [A_count, B_count, C_count, E_count, F_count] = await Promise.all([
        User.aggregate([...A_pipeline, { $count: "count" }])
            .allowDiskUse(true)
            .then((r) => (r && r[0] ? r[0].count : 0)),
        User.aggregate([...B_pipeline, { $count: "count" }])
            .allowDiskUse(true)
            .then((r) => (r && r[0] ? r[0].count : 0)),
        Card.aggregate([...C_pipeline, { $count: "count" }])
            .allowDiskUse(true)
            .then((r) => (r && r[0] ? r[0].count : 0)),
        Card.aggregate([...E_pipeline, { $count: "count" }])
            .allowDiskUse(true)
            .then((r) => (r && r[0] ? r[0].count : 0)),
        Card.aggregate([...F_pipeline, { $count: "count" }])
            .allowDiskUse(true)
            .then((r) => (r && r[0] ? r[0].count : 0)),
    ]);

    // D) cards where both user != null AND anonymousId != null
    const D_count = await Card.countDocuments({
        user: { $exists: true, $ne: null },
        anonymousId: { $exists: true, $ne: null },
    });

    const counts = {
        A_users_cardId_missing_card: A_count,
        B_users_cardId_ownership_mismatch: B_count,
        C_cards_user_missing_user_doc: C_count,
        D_cards_both_user_and_anonymousId: D_count,
        E_duplicate_cards_per_user: E_count,
        F_duplicate_cards_per_org_user: F_count,
    };

    const { totalIssues } = summarizeCounts(counts);
    const ok = totalIssues === 0;
    const includeSamples = VERBOSE || !ok;

    if (!includeSamples) {
        return {
            ok,
            counts,
            samples: {
                A: [],
                B: [],
                C: [],
                D: [],
                E: [],
                F: [],
            },
        };
    }

    const [A_samples, B_samples, C_samples, E_samples, F_samples] =
        await Promise.all([
            User.aggregate(A_pipeline).allowDiskUse(true).limit(SAMPLE_LIMIT),
            User.aggregate(B_pipeline).allowDiskUse(true).limit(SAMPLE_LIMIT),
            Card.aggregate(C_pipeline).allowDiskUse(true).limit(SAMPLE_LIMIT),
            Card.aggregate(E_pipeline).allowDiskUse(true).limit(SAMPLE_LIMIT),
            Card.aggregate(F_pipeline).allowDiskUse(true).limit(SAMPLE_LIMIT),
        ]);

    const D_samples_raw = await Card.find(
        {
            user: { $exists: true, $ne: null },
            anonymousId: { $exists: true, $ne: null },
        },
        { slug: 1, status: 1, user: 1 },
    )
        .limit(SAMPLE_LIMIT)
        .lean();

    const D_samples = D_samples_raw.map((c) => ({
        cardId: c?._id,
        cardUser: c?.user,
        hasAnonymousId: true,
        slug: c?.slug || "",
        status: c?.status || "",
    }));

    return {
        ok,
        counts,
        samples: {
            A: A_samples,
            B: B_samples,
            C: C_samples,
            D: D_samples,
            E: E_samples,
            F: F_samples,
        },
    };
}

async function main() {
    await connectDB(process.env.MONGO_URI);

    const usersColl = User.collection.name;
    const cardsColl = Card.collection.name;

    const { ok, counts, samples } = await runAggregates({
        usersColl,
        cardsColl,
    });

    console.log(
        JSON.stringify(
            {
                ok,
                collections: { users: usersColl, cards: cardsColl },
                counts,
                samples,
            },
            null,
            2,
        ),
    );

    process.exitCode = ok ? 0 : 2;
}

main()
    .catch((err) => {
        const msg = safeString(err?.message || err) || "Unknown error";
        console.error("FAILED", msg);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await mongoose.disconnect();
        } catch {
            // ignore
        }
    });
