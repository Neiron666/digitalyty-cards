import "dotenv/config";

import mongoose from "mongoose";

import { connectDB } from "../../src/config/db.js";
import Card from "../../src/models/Card.model.js";
import User from "../../src/models/User.model.js";
import { getPersonalOrgId } from "../../src/utils/personalOrg.util.js";

function hasFlag(name) {
    return process.argv.slice(2).includes(name);
}

function readArgValue(name) {
    const prefix = `${name}=`;
    const token = process.argv.slice(2).find((t) => t.startsWith(prefix));
    if (!token) return "";
    return token.slice(prefix.length);
}

function parseIntArg(name, defaultValue) {
    const raw = readArgValue(name);
    if (!raw) return defaultValue;
    const n = Number(raw);
    if (!Number.isFinite(n)) return defaultValue;
    return Math.max(0, Math.floor(n));
}

function asObjectId(value) {
    try {
        if (!value) return null;
        if (!mongoose.Types.ObjectId.isValid(String(value))) return null;
        return new mongoose.Types.ObjectId(String(value));
    } catch {
        return null;
    }
}

function isObjectIdEqual(a, b) {
    const sa = a ? String(a) : "";
    const sb = b ? String(b) : "";
    return sa && sb && sa === sb;
}

function dateMs(value) {
    try {
        if (!value) return 0;
        const t = new Date(value).getTime();
        return Number.isFinite(t) ? t : 0;
    } catch {
        return 0;
    }
}

function statusRank(status) {
    // prefer published
    return status === "published" ? 2 : 1;
}

function isActiveRank(isActive) {
    // prefer isActive != false (treat missing as active)
    return isActive === false ? 0 : 1;
}

function orgRank({ cardOrgId, personalOrgObjectId }) {
    // prefer normalized orgId == personalOrgId over legacy null/missing
    return isObjectIdEqual(cardOrgId, personalOrgObjectId) ? 2 : 1;
}

function compareCardsForCanonical(a, b, { personalOrgObjectId }) {
    // Higher is better.
    const aOrg = orgRank({ cardOrgId: a?.orgId, personalOrgObjectId });
    const bOrg = orgRank({ cardOrgId: b?.orgId, personalOrgObjectId });
    if (aOrg !== bOrg) return bOrg - aOrg;

    const aStatus = statusRank(a?.status);
    const bStatus = statusRank(b?.status);
    if (aStatus !== bStatus) return bStatus - aStatus;

    const aActive = isActiveRank(a?.isActive);
    const bActive = isActiveRank(b?.isActive);
    if (aActive !== bActive) return bActive - aActive;

    const aUpdated = dateMs(a?.updatedAt);
    const bUpdated = dateMs(b?.updatedAt);
    if (aUpdated !== bUpdated) return bUpdated - aUpdated;

    const aCreated = dateMs(a?.createdAt);
    const bCreated = dateMs(b?.createdAt);
    if (aCreated !== bCreated) return bCreated - aCreated;

    // Stable tie-breaker by string id.
    const aId = String(a?._id || "");
    const bId = String(b?._id || "");
    if (aId === bId) return 0;
    return aId < bId ? -1 : 1;
}

function chooseCanonical({ cards, personalOrgObjectId, userCardIdHint }) {
    const list = Array.isArray(cards) ? [...cards] : [];
    if (!list.length) return null;

    list.sort((a, b) =>
        compareCardsForCanonical(a, b, { personalOrgObjectId }),
    );

    // user.cardId is a hint only: use it ONLY if it is tied with the best candidate.
    const best = list[0];
    const bestScoreList = list.filter(
        (c) =>
            compareCardsForCanonical(best, c, { personalOrgObjectId }) === 0 &&
            compareCardsForCanonical(c, best, { personalOrgObjectId }) === 0,
    );

    if (userCardIdHint) {
        const hinted = bestScoreList.find(
            (c) => String(c?._id || "") === String(userCardIdHint),
        );
        if (hinted) return hinted;
    }

    return best;
}

function safeLog(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

async function main() {
    const apply = hasFlag("--apply");
    const userIdRaw = readArgValue("--userId");
    const limit = parseIntArg("--limit", 50);

    // Enforce: never auto-build indexes in this script.
    const prevAutoIndex = process.env.MONGOOSE_AUTO_INDEX;
    const prevAutoCreate = process.env.MONGOOSE_AUTO_CREATE;
    process.env.MONGOOSE_AUTO_INDEX = "0";
    process.env.MONGOOSE_AUTO_CREATE = "0";

    const startedAt = Date.now();

    let personalOrgId = null;
    let personalOrgObjectId = null;

    const summary = {
        mode: apply ? "apply" : "dry-run",
        limit,
        scannedGroups: 0,
        processedGroups: 0,
        usersRepointed: 0,
        cardsDetached: 0,
        canonicalNormalized: 0,
    };

    try {
        await connectDB(process.env.MONGO_URI);

        personalOrgId = await getPersonalOrgId();
        personalOrgObjectId = asObjectId(personalOrgId);
        if (!personalOrgObjectId) {
            throw new Error("personalOrgId is not a valid ObjectId");
        }

        const userId = userIdRaw ? asObjectId(userIdRaw) : null;
        if (userIdRaw && !userId) {
            throw new Error("--userId must be a valid ObjectId");
        }

        // Exact E-filter from sanity:
        // user != null AND (orgId == personalOrgId OR orgId missing OR orgId null)
        const match = {
            user: { $exists: true, $ne: null },
            $or: [
                { orgId: personalOrgObjectId },
                { orgId: { $exists: false } },
                { orgId: null },
            ],
        };
        if (userId) match.user = userId;

        const groups = await Card.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$user",
                    count: { $sum: 1 },
                    cardIds: { $push: "$_id" },
                },
            },
            { $match: { count: { $gt: 1 } } },
            { $sort: { count: -1 } },
            ...(limit ? [{ $limit: limit }] : []),
        ]).allowDiskUse(true);

        summary.scannedGroups = groups.length;

        for (const g of groups) {
            const uid = g?._id ? String(g._id) : "";
            const cardIds = Array.isArray(g?.cardIds)
                ? g.cardIds.map(String)
                : [];

            if (!uid || cardIds.length < 2) continue;

            const userDoc = await User.findById(uid).select("cardId").lean();
            const userCardIdHint = userDoc?.cardId
                ? String(userDoc.cardId)
                : "";

            const cards = await Card.find({ _id: { $in: cardIds } })
                .select("_id user orgId status isActive createdAt updatedAt")
                .lean();

            const canonical = chooseCanonical({
                cards,
                personalOrgObjectId,
                userCardIdHint,
            });

            const canonicalId = canonical?._id ? String(canonical._id) : "";
            if (!canonicalId) continue;

            const nonCanonicalIds = cards
                .filter((c) => String(c?._id || "") !== canonicalId)
                .map((c) => String(c?._id || ""))
                .filter(Boolean);

            const needsRepoint =
                Boolean(userCardIdHint) && userCardIdHint !== canonicalId;
            const needsNormalizeCanonical =
                !canonical?.orgId ||
                String(canonical.orgId) !== String(personalOrgObjectId);

            safeLog({
                event: apply ? "apply-group" : "dry-run-group",
                userId: uid,
                cardIds,
                canonicalCardId: canonicalId,
                plan: {
                    repointUserCardId: needsRepoint,
                    detachCount: nonCanonicalIds.length,
                    normalizeCanonicalOrgId: needsNormalizeCanonical,
                },
            });

            summary.processedGroups += 1;

            if (!apply) continue;

            // Apply steps are ordered for safety:
            // 1) repoint User.cardId
            // 2) detach non-canonical cards (set user:null + deactivate + force draft)
            // 3) normalize canonical orgId to personalOrgId

            if (needsRepoint) {
                const res = await User.updateOne(
                    { _id: uid },
                    {
                        $set: {
                            cardId: new mongoose.Types.ObjectId(canonicalId),
                        },
                    },
                );
                if (Number(res?.modifiedCount || 0) > 0)
                    summary.usersRepointed += 1;
            }

            if (nonCanonicalIds.length) {
                const detachRes = await Card.updateMany(
                    {
                        _id: {
                            $in: nonCanonicalIds
                                .map(asObjectId)
                                .filter(Boolean),
                        },
                    },
                    {
                        $set: {
                            user: null,
                            isActive: false,
                            status: "draft",
                        },
                    },
                );
                summary.cardsDetached += Number(detachRes?.modifiedCount || 0);
            }

            if (needsNormalizeCanonical) {
                const normRes = await Card.updateOne(
                    { _id: canonicalId },
                    { $set: { orgId: personalOrgObjectId } },
                );
                if (Number(normRes?.modifiedCount || 0) > 0)
                    summary.canonicalNormalized += 1;
            }
        }

        summary.durationMs = Date.now() - startedAt;
        safeLog({
            event: "summary",
            personalOrgId: String(personalOrgId || ""),
            ...summary,
        });

        process.exitCode = 0;
    } catch (err) {
        const msg = String(err?.message || err || "Unknown error");
        safeLog({
            event: "failed",
            message: msg,
            mode: apply ? "apply" : "dry-run",
        });
        process.exitCode = 1;
    } finally {
        // Restore env
        if (prevAutoIndex === undefined) delete process.env.MONGOOSE_AUTO_INDEX;
        else process.env.MONGOOSE_AUTO_INDEX = prevAutoIndex;

        if (prevAutoCreate === undefined)
            delete process.env.MONGOOSE_AUTO_CREATE;
        else process.env.MONGOOSE_AUTO_CREATE = prevAutoCreate;

        try {
            await mongoose.disconnect();
        } catch {
            // ignore
        }
    }
}

main();
