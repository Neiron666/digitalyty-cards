import mongoose from "mongoose";
import User from "../models/User.model.js";
import Card from "../models/Card.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import OrgInvite from "../models/OrgInvite.model.js";
import { logAdminAction } from "../services/adminAudit.service.js";
import {
    removeObjects,
    getAnonPrivateBucketName,
    getPublicBucketName,
} from "../services/supabaseStorage.js";
import { toCardDTO } from "../utils/cardDTO.js";
import {
    collectSupabasePathsFromCard,
    normalizeSupabasePaths,
} from "../utils/supabasePaths.js";
import { deleteCardCascade } from "../utils/cardDeleteCascade.js";
import { isValidTier } from "../utils/tier.js";
import {
    addIsraelDaysFromNow,
    endOfIsraelDayUtc,
    nowUtc,
    parseIsraelLocalToUtc,
} from "../utils/time.util.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function clampInt(value, { min, max, fallback }) {
    const n = Number.parseInt(String(value), 10);
    if (!Number.isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePagination(req) {
    const page = clampInt(req.query.page, { min: 1, max: 10_000, fallback: 1 });
    const limit = clampInt(req.query.limit, { min: 1, max: 100, fallback: 25 });
    return { page, limit, skip: (page - 1) * limit };
}

function parseSearch(req, { maxLen = 64 } = {}) {
    const raw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!raw) return null;
    const q = raw.slice(0, maxLen);
    return new RegExp(escapeRegExp(q), "i");
}

function requireReason(req, res) {
    const reason =
        typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) {
        res.status(400).json({
            code: "REASON_REQUIRED",
            message: "Reason is required",
        });
        return null;
    }
    if (reason.length > 500) {
        res.status(400).json({
            code: "REASON_TOO_LONG",
            message: "Reason too long",
        });
        return null;
    }
    return reason;
}

function parseTierOverride(req, res) {
    const raw = req.body?.tier;
    if (raw === null || raw === undefined || raw === "") {
        return { tier: null };
    }

    const tier = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (!isValidTier(tier)) {
        res.status(400).json({
            code: "INVALID_TIER",
            message: "tier must be one of: free | basic | premium",
        });
        return null;
    }

    return { tier };
}

function parseUntilEndOfDayUtc(req, res, now = new Date()) {
    const untilRaw = typeof req.body?.until === "string" ? req.body.until : "";
    if (!untilRaw) return null;

    const parsed = new Date(untilRaw);
    if (!Number.isFinite(parsed.getTime())) {
        res.status(400).json({
            code: "INVALID_UNTIL",
            message: "Invalid until",
        });
        return undefined;
    }

    const y = parsed.getUTCFullYear();
    const m = parsed.getUTCMonth();
    const d = parsed.getUTCDate();
    const until = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

    if (until.getTime() <= now.getTime()) {
        res.status(400).json({
            code: "INVALID_UNTIL",
            message: "until must be in the future",
        });
        return undefined;
    }

    const maxUntil = new Date(now.getTime() + 365 * DAY_MS);
    if (until.getTime() > maxUntil.getTime()) {
        res.status(400).json({
            code: "INVALID_UNTIL",
            message: "until too far in the future",
        });
        return undefined;
    }

    return until;
}

async function loadUserTierById(userId) {
    if (!userId) return null;
    return User.findById(String(userId))
        .select("adminTier adminTierUntil")
        .lean();
}

export async function getAdminStats(_req, res) {
    const [
        users,
        cardsTotal,
        cardsUserOwned,
        cardsAnonymous,
        publishedCards,
        activeCards,
    ] = await Promise.all([
        User.countDocuments({}),
        Card.countDocuments({}),
        Card.countDocuments({ user: { $exists: true, $ne: null } }),
        Card.countDocuments({ anonymousId: { $exists: true, $ne: null } }),
        Card.countDocuments({ status: "published" }),
        Card.countDocuments({ isActive: true }),
    ]);

    res.json({
        users,
        cardsTotal,
        cardsUserOwned,
        cardsAnonymous,
        publishedCards,
        activeCards,
    });
}

export async function listUsers(req, res) {
    const { skip, limit, page } = parsePagination(req);
    const q = parseSearch(req);

    const filter = q ? { email: q } : {};

    const [items, total] = await Promise.all([
        User.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("email role cardId adminTier adminTierUntil createdAt"),
        User.countDocuments(filter),
    ]);

    const cardIds = Array.from(
        new Set(
            items
                .map((u) => u?.cardId)
                .filter(Boolean)
                .map((id) => String(id)),
        ),
    );

    const cardsById = new Map();
    if (cardIds.length) {
        const cards = await Card.find({ _id: { $in: cardIds } })
            .select("slug status isActive user")
            .lean();
        for (const c of cards) {
            cardsById.set(String(c._id), c);
        }
    }

    const enrichedItems = items.map((u) => {
        const obj = typeof u.toObject === "function" ? u.toObject() : u;
        const cardId = obj?.cardId ? String(obj.cardId) : "";

        let cardSummary = null;
        if (cardId) {
            const c = cardsById.get(cardId);
            if (c) {
                const hasUserOwner = Boolean(c.user);
                const cardUserMatches =
                    hasUserOwner && String(c.user) === String(obj?._id || "");

                const ownershipMismatch = !hasUserOwner || !cardUserMatches;
                const ownershipMismatchReason = !hasUserOwner
                    ? "missing_card_user"
                    : !cardUserMatches
                      ? "card_user_mismatch"
                      : null;

                cardSummary = {
                    cardId,
                    slug: c.slug || "",
                    status: c.status || "",
                    isActive: Boolean(c.isActive),
                    ownershipMismatch,
                    ownershipMismatchReason,
                };
            } else {
                cardSummary = { cardId, missing: true };
            }
        }

        return {
            ...obj,
            cardSummary,
        };
    });

    res.json({
        page,
        limit,
        total,
        items: enrichedItems,
    });
}

export async function listCards(req, res) {
    const { skip, limit, page } = parsePagination(req);
    const q = parseSearch(req);

    const owner = typeof req.query.owner === "string" ? req.query.owner : "";
    const status = typeof req.query.status === "string" ? req.query.status : "";

    const userIdRaw =
        typeof req.query.userId === "string" ? req.query.userId.trim() : "";

    const filter = {};

    if (owner === "user") filter.user = { $exists: true, $ne: null };
    if (owner === "anonymous")
        filter.anonymousId = { $exists: true, $ne: null };

    if (status === "draft" || status === "published") filter.status = status;
    if (q) filter.slug = q;

    if (userIdRaw) {
        const looksLikeObjectId = /^[0-9a-f]{24}$/i.test(userIdRaw);
        if (!looksLikeObjectId || !mongoose.Types.ObjectId.isValid(userIdRaw)) {
            return res.status(400).json({ ok: false, code: "INVALID_USER_ID" });
        }
        filter.user = userIdRaw;
    }

    const [items, total] = await Promise.all([
        Card.find(filter)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .select(
                "slug status isActive plan user orgId anonymousId trialEndsAt trialStartedAt billing adminOverride adminTier adminTierUntil adminTierByAdmin adminTierReason adminTierCreatedAt createdAt updatedAt",
            ),
        Card.countDocuments(filter),
    ]);

    const userIds = Array.from(
        new Set(
            items
                .map((c) => c?.user)
                .filter(Boolean)
                .map((id) => String(id)),
        ),
    );

    const userById = new Map();
    if (userIds.length) {
        const users = await User.find({ _id: { $in: userIds } })
            .select("email adminTier adminTierUntil")
            .lean();
        for (const u of users) {
            userById.set(String(u._id), u);
        }
    }

    const now = new Date();
    const dtoItems = items.map((c) => {
        const userId = c?.user ? String(c.user) : "";
        const userTier = userId ? userById.get(userId) || null : null;
        const dto = toCardDTO(c, now, { minimal: true, user: userTier });

        let ownerSummary = { type: "none" };
        if (userId) {
            ownerSummary = {
                type: "user",
                userId,
                email: userById.get(userId)?.email || null,
            };
        } else if (c?.anonymousId) {
            ownerSummary = { type: "anonymous" };
        }

        return {
            ...dto,
            orgId: c?.orgId ? String(c.orgId) : null,
            scope: c?.orgId ? "org" : "personal",
            ownerSummary,
        };
    });

    res.json({ page, limit, total, items: dtoItems });
}

export async function getUserById(req, res) {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "Not found" });
    return res.json(user);
}

export async function getCardById(req, res) {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: "Not found" });
    const now = new Date();
    const userTier = card?.user ? await loadUserTierById(card.user) : null;
    return res.json(
        toCardDTO(card, now, { includePrivate: true, user: userTier }),
    );
}

async function deleteCardPermanentlyCore({ card }) {
    const rawPaths = collectSupabasePathsFromCard(card);
    const paths = normalizeSupabasePaths(rawPaths);

    try {
        console.debug("[supabase] admin delete", {
            cardId: String(card._id),
            pathCount: paths.length,
        });

        // CRITICAL: delete Supabase objects first. If this fails, keep Mongo doc
        // so we don't lose references and can retry cleanup later.
        if (paths.length) {
            const isAnonymousOwned = !card?.user && Boolean(card?.anonymousId);
            const buckets = isAnonymousOwned
                ? Array.from(
                      new Set(
                          [
                              getAnonPrivateBucketName({
                                  allowFallback: true,
                              }),
                              getPublicBucketName(),
                          ].filter(Boolean),
                      ),
                  )
                : [getPublicBucketName()];

            await removeObjects({ paths, buckets });
        }
    } catch (err) {
        console.error("[supabase] admin delete failed", {
            cardId: String(card._id),
            error: err?.message || err,
        });
        const e = new Error("Failed to delete media");
        e.status = 502;
        e.code = "SUPABASE_DELETE_FAILED";
        throw e;
    }

    let cascade;
    try {
        cascade = await deleteCardCascade({ cardId: card._id });
    } catch (err) {
        console.error("[cards] admin cascade delete failed", {
            cardId: String(card._id),
            error: err?.message || err,
        });
        const e = new Error("Failed to delete related data");
        e.status = 500;
        e.code = "CASCADE_DELETE_FAILED";
        throw e;
    }

    await Card.deleteOne({ _id: card._id });

    if (card?.user) {
        // Best-effort unlink from user (keeps owner-delete behavior consistent)
        try {
            await User.updateOne(
                { _id: card.user, cardId: card._id },
                { $unset: { cardId: 1 } },
            );
        } catch (err) {
            console.warn("[users] unlink cardId failed", {
                userId: String(card.user),
                cardId: String(card._id),
                error: err?.message || err,
            });
        }
    }

    return {
        ok: true,
        media: { pathCount: paths.length },
        cascade,
    };
}

export async function deleteCardPermanently(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const id = String(req.params.id || "");
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
            .status(400)
            .json({ code: "INVALID_ID", message: "Invalid id" });
    }

    const card = await Card.findById(id);
    if (!card) return res.status(404).json({ message: "Not found" });

    let core;
    try {
        core = await deleteCardPermanentlyCore({ card });
    } catch (err) {
        if (err?.status === 502) {
            return res.status(502).json({ message: "Failed to delete media" });
        }
        if (err?.status === 500) {
            return res
                .status(500)
                .json({ message: "Failed to delete related data" });
        }
        throw err;
    }

    await logAdminAction({
        adminUserId: req.userId,
        action: "CARD_DELETE_PERMANENT",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: {
            slug: card.slug || "",
            owner: card?.user
                ? { type: "user", userId: String(card.user) }
                : card?.anonymousId
                  ? { type: "anonymous", anonymousId: String(card.anonymousId) }
                  : { type: "none" },
            media: core.media,
            cascade: core.cascade,
        },
    });

    return res.json({ ok: true });
}

export async function deleteUserPermanently(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const confirm =
        typeof req.body?.confirm === "string" ? req.body.confirm.trim() : "";
    if (confirm !== "DELETE") {
        return res.status(400).json({
            code: "CONFIRM_REQUIRED",
            message: 'confirm must be exactly "DELETE"',
        });
    }

    const targetUserId = String(req.params.id || "");
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res
            .status(400)
            .json({ code: "INVALID_ID", message: "Invalid id" });
    }

    if (String(req.userId || "") === targetUserId) {
        return res.status(409).json({
            code: "SELF_DELETE_FORBIDDEN",
            message: "Admin cannot delete self",
        });
    }

    const user = await User.findById(targetUserId).select("role").lean();
    if (user?.role === "admin") {
        return res.status(409).json({
            code: "TARGET_IS_ADMIN",
            message: "Permanent delete for admin users is not allowed (MVP)",
        });
    }

    const cards = await Card.find({ user: targetUserId });

    let deletedCardsCount = 0;
    for (const card of cards) {
        try {
            await deleteCardPermanentlyCore({ card });
            deletedCardsCount += 1;
        } catch (err) {
            const status = Number(err?.status || 500);
            const code =
                typeof err?.code === "string" && err.code
                    ? err.code
                    : status === 502
                      ? "SUPABASE_DELETE_FAILED"
                      : "DELETE_FAILED";
            const message = err?.message || "Delete failed";
            return res.status(status).json({ code, message });
        }
    }

    const [membershipsRes, invitesRes] = await Promise.all([
        OrganizationMember.deleteMany({ userId: targetUserId }),
        // Operational garbage only: delete still-pending invites created by this user.
        OrgInvite.deleteMany({
            createdByUserId: targetUserId,
            revokedAt: null,
            usedAt: null,
        }),
    ]);

    const deletedMembershipsCount = Number(membershipsRes?.deletedCount || 0);
    const deletedInvitesCount = Number(invitesRes?.deletedCount || 0);

    const userDeleteRes = await User.deleteOne({ _id: targetUserId });
    const deletedUserCount = Number(userDeleteRes?.deletedCount || 0);

    const didWork =
        deletedCardsCount > 0 ||
        deletedMembershipsCount > 0 ||
        deletedInvitesCount > 0 ||
        deletedUserCount > 0;

    if (didWork) {
        await logAdminAction({
            adminUserId: req.userId,
            action: "USER_DELETE_PERMANENT",
            targetType: "user",
            targetId: new mongoose.Types.ObjectId(targetUserId),
            reason,
            meta: {
                targetUserId,
                deletedCardsCount,
                deletedInvitesCount,
                deletedMembershipsCount,
            },
        });
    }

    return res.json({ ok: true });
}

export async function deactivateCard(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const existing = await Card.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const before = { isActive: existing.isActive };

    const card = await Card.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive: false } },
        { new: true, runValidators: true },
    );
    if (!card) return res.status(404).json({ message: "Not found" });

    await logAdminAction({
        adminUserId: req.userId,
        action: "CARD_DEACTIVATE",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: { before, after: { isActive: card.isActive } },
    });

    const now = new Date();
    const userTier = card?.user ? await loadUserTierById(card.user) : null;
    return res.json(
        toCardDTO(card, now, { includePrivate: true, user: userTier }),
    );
}

export async function reactivateCard(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const existing = await Card.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const before = { isActive: existing.isActive };

    const card = await Card.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive: true } },
        { new: true, runValidators: true },
    );
    if (!card) return res.status(404).json({ message: "Not found" });

    await logAdminAction({
        adminUserId: req.userId,
        action: "CARD_REACTIVATE",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: { before, after: { isActive: card.isActive } },
    });

    const now = new Date();
    const userTier = card?.user ? await loadUserTierById(card.user) : null;
    return res.json(
        toCardDTO(card, now, { includePrivate: true, user: userTier }),
    );
}

export async function extendTrial(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const now = nowUtc();

    const untilLocal =
        req.body?.untilLocal && typeof req.body.untilLocal === "object"
            ? req.body.untilLocal
            : null;

    const hasDays = req.body?.days !== undefined;
    const hasUntilLocal = Boolean(untilLocal);
    if (hasDays && hasUntilLocal) {
        return res.status(400).json({
            code: "INVALID_TRIAL_PAYLOAD",
            message: "Provide either days or untilLocal, not both",
        });
    }

    let trialEndsAt;
    let mode;
    let days = null;
    if (hasUntilLocal) {
        try {
            trialEndsAt = parseIsraelLocalToUtc(untilLocal);
            mode = "untilLocal";
        } catch (err) {
            return res.status(400).json({
                code: "INVALID_UNTIL_LOCAL",
                message: err?.message || "Invalid untilLocal",
            });
        }
    } else {
        const rawDays = req.body?.days;
        const daysNum = Number(rawDays);
        days = Number.isInteger(daysNum) ? daysNum : NaN;
        if (!Number.isFinite(days) || days < 0 || days > 14) {
            return res.status(400).json({
                code: "INVALID_DAYS",
                message: "days must be 0..14",
            });
        }

        mode = "days";

        if (days === 0) {
            trialEndsAt = now;
        } else {
            const dateKey = addIsraelDaysFromNow(now, days);
            trialEndsAt = endOfIsraelDayUtc(dateKey);
        }
    }

    const existing = await Card.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    // Semantics: SET trial to exact untilLocal OR calendar-days-from-now (Israel).
    // days=0 means expire now.
    const trialDeleteAt = new Date(trialEndsAt.getTime() + 7 * DAY_MS);

    const before = {
        trialStartedAt: existing.trialStartedAt,
        trialEndsAt: existing.trialEndsAt,
        trialDeleteAt: existing.trialDeleteAt,
        billingStatus: existing.billing?.status,
    };

    const billingIsObject =
        Boolean(existing.billing) &&
        typeof existing.billing === "object" &&
        !Array.isArray(existing.billing);

    let nextBillingStatus = existing.billing?.status || "free";
    if (nextBillingStatus === "free") nextBillingStatus = "trial";

    const nextBillingPlan = existing.billing?.plan || existing.plan || "free";
    const nextBillingPaidUntil = existing.billing?.paidUntil || null;

    const preservedFeatures =
        existing.billing?.features &&
        typeof existing.billing.features === "object" &&
        !Array.isArray(existing.billing.features)
            ? existing.billing.features
            : { analyticsPremium: false };

    const preservedPayer =
        existing.billing?.payer &&
        typeof existing.billing.payer === "object" &&
        !Array.isArray(existing.billing.payer)
            ? existing.billing.payer
            : {
                  type: "none",
                  userId: null,
                  orgId: null,
                  note: null,
                  source: null,
                  updatedAt: null,
              };

    const setUpdate = billingIsObject
        ? {
              trialStartedAt: existing.trialStartedAt || now,
              trialEndsAt,
              trialDeleteAt,
              "billing.status": nextBillingStatus,
              "billing.plan": nextBillingPlan,
              "billing.paidUntil": nextBillingPaidUntil,
          }
        : {
              trialStartedAt: existing.trialStartedAt || now,
              trialEndsAt,
              trialDeleteAt,
              billing: {
                  status: nextBillingStatus,
                  plan: nextBillingPlan,
                  paidUntil: nextBillingPaidUntil,
                  features: preservedFeatures,
                  payer: preservedPayer,
              },
          };

    const card = await Card.findByIdAndUpdate(
        req.params.id,
        { $set: setUpdate },
        { new: true, runValidators: true },
    );
    if (!card) return res.status(404).json({ message: "Not found" });

    await logAdminAction({
        adminUserId: req.userId,
        action: "TRIAL_EXTEND",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: {
            days,
            untilLocal: untilLocal || null,
            mode,
            before,
            after: {
                trialStartedAt: card.trialStartedAt,
                trialEndsAt: card.trialEndsAt,
                trialDeleteAt: card.trialDeleteAt,
                billingStatus: card.billing?.status,
            },
        },
    });

    const dtoNow = now;
    const userTier = card?.user ? await loadUserTierById(card.user) : null;
    return res.json(
        toCardDTO(card, dtoNow, { includePrivate: true, user: userTier }),
    );
}

export async function overridePlan(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const plan = typeof req.body?.plan === "string" ? req.body.plan : "";
    if (!["free", "monthly", "yearly"].includes(plan)) {
        return res
            .status(400)
            .json({ code: "INVALID_PLAN", message: "Invalid plan" });
    }

    const untilRaw = typeof req.body?.until === "string" ? req.body.until : "";
    const until = new Date(untilRaw);
    if (!untilRaw || !Number.isFinite(until.getTime())) {
        return res
            .status(400)
            .json({ code: "INVALID_UNTIL", message: "Invalid until" });
    }

    const now = new Date();
    if (until.getTime() <= now.getTime()) {
        return res.status(400).json({
            code: "INVALID_UNTIL",
            message: "until must be in the future",
        });
    }

    const maxUntil = new Date(now.getTime() + 365 * DAY_MS);
    if (until.getTime() > maxUntil.getTime()) {
        return res.status(400).json({
            code: "INVALID_UNTIL",
            message: "until too far in the future",
        });
    }

    const existing = await Card.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const before = existing.adminOverride || null;

    const nextOverride = {
        plan,
        until,
        byAdmin: req.userId,
        reason,
        createdAt: now,
    };

    const card = await Card.findByIdAndUpdate(
        req.params.id,
        { $set: { adminOverride: nextOverride } },
        { new: true, runValidators: true },
    );
    if (!card) return res.status(404).json({ message: "Not found" });

    await logAdminAction({
        adminUserId: req.userId,
        action: "PLAN_OVERRIDE",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: {
            before,
            after: card.adminOverride,
        },
    });

    const dtoNow = new Date();
    const userTier = card?.user ? await loadUserTierById(card.user) : null;
    return res.json(
        toCardDTO(card, dtoNow, { includePrivate: true, user: userTier }),
    );
}

export async function setAnalyticsPremium(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const enabled = Boolean(req.body?.enabled);

    const existing = await Card.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const before = Boolean(existing?.billing?.features?.analyticsPremium);

    const card = await Card.findByIdAndUpdate(
        req.params.id,
        {
            $set: {
                "billing.features.analyticsPremium": enabled,
            },
        },
        { new: true, runValidators: true },
    );
    if (!card) return res.status(404).json({ message: "Not found" });

    await logAdminAction({
        adminUserId: req.userId,
        action: "ANALYTICS_PREMIUM_TOGGLE",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: {
            before,
            after: Boolean(card?.billing?.features?.analyticsPremium),
        },
    });

    const dtoNow = new Date();
    const userTier = card?.user ? await loadUserTierById(card.user) : null;
    return res.json(
        toCardDTO(card, dtoNow, { includePrivate: true, user: userTier }),
    );
}

export async function setCardTier(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const parsed = parseTierOverride(req, res);
    if (!parsed) return;

    const existing = await Card.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const now = new Date();

    const until = parsed.tier ? parseUntilEndOfDayUtc(req, res, now) : null;
    if (until === undefined) return;

    const before = {
        adminTier: existing.adminTier || null,
        adminTierUntil: existing.adminTierUntil || null,
        adminTierByAdmin: existing.adminTierByAdmin || null,
        adminTierReason: existing.adminTierReason || null,
        adminTierCreatedAt: existing.adminTierCreatedAt || null,
    };

    const update = parsed.tier
        ? {
              adminTier: parsed.tier,
              adminTierUntil: until,
              adminTierByAdmin: req.userId,
              adminTierReason: reason,
              adminTierCreatedAt: now,
          }
        : {
              adminTier: null,
              adminTierUntil: null,
              adminTierByAdmin: null,
              adminTierReason: null,
              adminTierCreatedAt: null,
          };

    const card = await Card.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true },
    );
    if (!card) return res.status(404).json({ message: "Not found" });

    await logAdminAction({
        adminUserId: req.userId,
        action: "CARD_TIER_OVERRIDE",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: {
            before,
            after: {
                adminTier: card.adminTier || null,
                adminTierUntil: card.adminTierUntil || null,
                adminTierByAdmin: card.adminTierByAdmin || null,
                adminTierReason: card.adminTierReason || null,
                adminTierCreatedAt: card.adminTierCreatedAt || null,
            },
        },
    });

    const userTier = card?.user ? await loadUserTierById(card.user) : null;
    const dtoNow = new Date();
    return res.json(
        toCardDTO(card, dtoNow, { includePrivate: true, user: userTier }),
    );
}

export async function setUserTier(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const parsed = parseTierOverride(req, res);
    if (!parsed) return;

    const existing = await User.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const now = new Date();
    const until = parsed.tier ? parseUntilEndOfDayUtc(req, res, now) : null;
    if (until === undefined) return;

    const before = {
        adminTier: existing.adminTier || null,
        adminTierUntil: existing.adminTierUntil || null,
        adminTierByAdmin: existing.adminTierByAdmin || null,
        adminTierReason: existing.adminTierReason || null,
        adminTierCreatedAt: existing.adminTierCreatedAt || null,
    };

    const update = parsed.tier
        ? {
              adminTier: parsed.tier,
              adminTierUntil: until,
              adminTierByAdmin: req.userId,
              adminTierReason: reason,
              adminTierCreatedAt: now,
          }
        : {
              adminTier: null,
              adminTierUntil: null,
              adminTierByAdmin: null,
              adminTierReason: null,
              adminTierCreatedAt: null,
          };

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true },
    ).select(
        "email role cardId adminTier adminTierUntil adminTierByAdmin adminTierReason adminTierCreatedAt createdAt",
    );
    if (!user) return res.status(404).json({ message: "Not found" });

    await logAdminAction({
        adminUserId: req.userId,
        action: "USER_TIER_OVERRIDE",
        targetType: "user",
        targetId: user._id,
        reason,
        meta: {
            before,
            after: {
                adminTier: user.adminTier || null,
                adminTierUntil: user.adminTierUntil || null,
                adminTierByAdmin: user.adminTierByAdmin || null,
                adminTierReason: user.adminTierReason || null,
                adminTierCreatedAt: user.adminTierCreatedAt || null,
            },
        },
    });

    return res.json({
        ok: true,
        user,
    });
}

function parsePlanInput(req, res, { field = "plan" } = {}) {
    const plan =
        typeof req.body?.[field] === "string" ? req.body[field].trim() : "";
    if (!plan || !["free", "monthly", "yearly"].includes(plan)) {
        res.status(400).json({ code: "INVALID_PLAN", message: "Invalid plan" });
        return null;
    }
    return plan;
}

function parseIsoDateOrNull(req, res, { field, code } = {}) {
    const raw = req.body?.[field];
    if (raw === null) return null;
    if (raw === undefined) return undefined;
    if (typeof raw !== "string") {
        res.status(400).json({
            code: code || "INVALID_DATE",
            message: `Invalid ${field}`,
        });
        return undefined;
    }

    const trimmed = raw.trim();
    if (!trimmed) return null;

    const d = new Date(trimmed);
    if (!Number.isFinite(d.getTime())) {
        res.status(400).json({
            code: code || "INVALID_DATE",
            message: `Invalid ${field}`,
        });
        return undefined;
    }
    return d;
}

function mapUserSubscriptionStatusToEnum(raw) {
    const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (v === "active") return "active";
    if (v === "expired") return "expired";
    if (v === "inactive") return "inactive";

    // Backward/operational compatibility: accept requested admin-tool labels.
    if (v === "canceled" || v === "free") return "inactive";
    if (v === "past_due") return "active";
    return null;
}

export async function adminSetUserSubscription(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const userId = String(req.params.userId || "");
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res
            .status(400)
            .json({ code: "INVALID_ID", message: "Invalid userId" });
    }

    const plan = parsePlanInput(req, res);
    if (!plan) return;

    const expiresAt = parseIsoDateOrNull(req, res, {
        field: "expiresAt",
        code: "INVALID_EXPIRES_AT",
    });
    if (expiresAt === undefined) return;

    const rawStatus = req.body?.status;
    const mappedStatus =
        rawStatus !== undefined
            ? mapUserSubscriptionStatusToEnum(rawStatus)
            : null;
    if (rawStatus !== undefined && !mappedStatus) {
        return res.status(400).json({
            code: "INVALID_STATUS",
            message: "Invalid status",
        });
    }

    const now = new Date();

    if (plan === "free") {
        if (expiresAt !== null) {
            return res.status(400).json({
                code: "INVALID_EXPIRES_AT",
                message: "expiresAt must be null for free plan",
            });
        }
    } else {
        if (!expiresAt) {
            return res.status(400).json({
                code: "INVALID_EXPIRES_AT",
                message: "expiresAt is required for paid plan",
            });
        }
        if (expiresAt.getTime() <= now.getTime()) {
            return res.status(400).json({
                code: "INVALID_EXPIRES_AT",
                message: "expiresAt must be in the future",
            });
        }
    }

    const existing = await User.findById(userId).select(
        "plan subscription cardId",
    );
    if (!existing) return res.status(404).json({ message: "Not found" });

    const before = {
        plan: existing.plan,
        subscription: {
            status: existing.subscription?.status || "inactive",
            expiresAt: existing.subscription?.expiresAt || null,
            provider: existing.subscription?.provider || null,
        },
    };

    const next = {
        plan,
        subscription: {
            status: mappedStatus || (plan === "free" ? "inactive" : "active"),
            expiresAt: plan === "free" ? null : expiresAt,
            provider: "admin",
        },
    };

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: next },
        { new: true, runValidators: true },
    ).select("plan subscription cardId");
    if (!user) return res.status(404).json({ message: "Not found" });

    const after = {
        plan: user.plan,
        subscription: {
            status: user.subscription?.status || "inactive",
            expiresAt: user.subscription?.expiresAt || null,
            provider: user.subscription?.provider || null,
        },
    };

    await logAdminAction({
        adminUserId: req.userId,
        action: "USER_SUBSCRIPTION_SET",
        targetType: "user",
        targetId: user._id,
        reason,
        meta: {
            before,
            after,
        },
    });

    const cardIds = user?.cardId ? [String(user.cardId)] : [];
    return res.json({
        ok: true,
        userId: String(user._id),
        plan: user.plan,
        subscription: {
            status: user.subscription?.status || "inactive",
            expiresAt: user.subscription?.expiresAt
                ? new Date(user.subscription.expiresAt).toISOString()
                : null,
            provider: user.subscription?.provider || null,
        },
        cardIds,
    });
}

export async function adminRevokeUserSubscription(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const userId = String(req.params.userId || "");
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res
            .status(400)
            .json({ code: "INVALID_ID", message: "Invalid userId" });
    }

    const existing = await User.findById(userId).select(
        "plan subscription cardId",
    );
    if (!existing) return res.status(404).json({ message: "Not found" });

    const before = {
        plan: existing.plan,
        subscription: {
            status: existing.subscription?.status || "inactive",
            expiresAt: existing.subscription?.expiresAt || null,
            provider: existing.subscription?.provider || null,
        },
    };

    const update = {
        plan: "free",
        subscription: {
            status: "inactive",
            expiresAt: null,
            provider: "admin",
        },
    };

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: update },
        { new: true, runValidators: true },
    ).select("plan subscription cardId");
    if (!user) return res.status(404).json({ message: "Not found" });

    const after = {
        plan: user.plan,
        subscription: {
            status: user.subscription?.status || "inactive",
            expiresAt: user.subscription?.expiresAt || null,
            provider: user.subscription?.provider || null,
        },
    };

    await logAdminAction({
        adminUserId: req.userId,
        action: "USER_SUBSCRIPTION_REVOKE",
        targetType: "user",
        targetId: user._id,
        reason,
        meta: {
            before,
            after,
        },
    });

    const cardIds = user?.cardId ? [String(user.cardId)] : [];
    return res.json({
        ok: true,
        userId: String(user._id),
        plan: user.plan,
        subscription: {
            status: user.subscription?.status || "inactive",
            expiresAt: null,
            provider: user.subscription?.provider || null,
        },
        cardIds,
    });
}

function parseCardBillingStatus(req, res) {
    const status =
        typeof req.body?.status === "string" ? req.body.status.trim() : "";
    if (
        !status ||
        !["active", "free", "past_due", "canceled"].includes(status)
    ) {
        res.status(400).json({
            code: "INVALID_STATUS",
            message: "Invalid status",
        });
        return null;
    }
    return status;
}

async function loadCardWithTier(cardId) {
    const card = await Card.findById(cardId);
    if (!card) return { card: null, userTier: null };
    const userTier = card?.user ? await loadUserTierById(card.user) : null;
    return { card, userTier };
}

export async function adminSetCardBilling(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const cardId = String(req.params.cardId || "");
    if (!mongoose.Types.ObjectId.isValid(cardId)) {
        return res
            .status(400)
            .json({ code: "INVALID_ID", message: "Invalid cardId" });
    }

    const plan = parsePlanInput(req, res);
    if (!plan) return;

    const status = parseCardBillingStatus(req, res);
    if (!status) return;

    const paidUntil = parseIsoDateOrNull(req, res, {
        field: "paidUntil",
        code: "INVALID_PAID_UNTIL",
    });
    if (paidUntil === undefined) return;

    const now = new Date();

    if (plan === "free") {
        if (status !== "free") {
            return res.status(400).json({
                code: "INVALID_STATUS",
                message: 'status must be "free" for free plan',
            });
        }
        if (paidUntil !== null) {
            return res.status(400).json({
                code: "INVALID_PAID_UNTIL",
                message: "paidUntil must be null for free plan",
            });
        }
    } else {
        if (status !== "active") {
            return res.status(400).json({
                code: "INVALID_STATUS",
                message: 'status must be "active" for paid plan',
            });
        }
        if (!paidUntil) {
            return res.status(400).json({
                code: "INVALID_PAID_UNTIL",
                message: "paidUntil is required for paid plan",
            });
        }
        if (paidUntil.getTime() <= now.getTime()) {
            return res.status(400).json({
                code: "INVALID_PAID_UNTIL",
                message: "paidUntil must be in the future",
            });
        }
    }

    const existing = await Card.findById(cardId);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const payerTypeRaw = req.body?.payerType;
    const payerTypeProvided = payerTypeRaw !== undefined;
    const payerType =
        typeof payerTypeRaw === "string"
            ? payerTypeRaw.trim().toLowerCase()
            : "";

    let payerNote =
        typeof req.body?.payerNote === "string"
            ? req.body.payerNote.trim()
            : "";
    if (payerNote && payerNote.length > 80) {
        return res.status(400).json({
            code: "PAYER_NOTE_TOO_LONG",
            message: "payerNote too long (max 80)",
        });
    }
    if (!payerNote) payerNote = null;

    let payerPatch = null;
    if (payerTypeProvided) {
        if (!payerType || !["none", "user", "org"].includes(payerType)) {
            return res.status(400).json({
                code: "INVALID_PAYER_TYPE",
                message: "payerType must be one of: none | user | org",
            });
        }

        const payerOrgIdRaw = req.body?.payerOrgId;
        const payerOrgId =
            payerOrgIdRaw !== undefined && payerOrgIdRaw !== null
                ? String(payerOrgIdRaw)
                : null;

        const nowPayer = new Date();

        if (payerType === "org") {
            if (!existing.orgId) {
                return res.status(400).json({
                    code: "CARD_NOT_ORG",
                    message: "Card has no orgId",
                });
            }
            if (payerOrgId && String(existing.orgId) !== payerOrgId) {
                return res.status(400).json({
                    code: "PAYER_ORG_MISMATCH",
                    message: "payerOrgId must match card.orgId",
                });
            }

            payerPatch = {
                type: "org",
                orgId: existing.orgId,
                userId: null,
                note: payerNote,
                source: "admin",
                updatedAt: nowPayer,
            };
        } else if (payerType === "user") {
            if (!existing.user) {
                return res.status(400).json({
                    code: "CARD_HAS_NO_OWNER",
                    message: "Card has no owner user",
                });
            }
            payerPatch = {
                type: "user",
                userId: existing.user,
                orgId: null,
                note: payerNote,
                source: "admin",
                updatedAt: nowPayer,
            };
        } else {
            payerPatch = {
                type: "none",
                userId: null,
                orgId: null,
                note: null,
                source: "admin",
                updatedAt: nowPayer,
            };
        }
    }

    const before = {
        plan: existing.plan,
        billing: {
            status: existing.billing?.status || "free",
            plan: existing.billing?.plan || "free",
            paidUntil: existing.billing?.paidUntil || null,
        },
        adminOverride: existing.adminOverride || null,
    };

    const features =
        existing.billing?.features &&
        typeof existing.billing.features === "object"
            ? existing.billing.features
            : { analyticsPremium: false };

    const billingIsObject =
        Boolean(existing.billing) &&
        typeof existing.billing === "object" &&
        !Array.isArray(existing.billing);

    const setUpdate = {};
    if (billingIsObject) {
        setUpdate.plan = plan;
        setUpdate["billing.status"] = status;
        setUpdate["billing.plan"] = plan;
        setUpdate["billing.paidUntil"] = plan === "free" ? null : paidUntil;

        if (payerPatch) {
            setUpdate["billing.payer.type"] = payerPatch.type;
            setUpdate["billing.payer.userId"] = payerPatch.userId;
            setUpdate["billing.payer.orgId"] = payerPatch.orgId;
            setUpdate["billing.payer.note"] = payerPatch.note;
            setUpdate["billing.payer.source"] = payerPatch.source;
            setUpdate["billing.payer.updatedAt"] = payerPatch.updatedAt;
        }
    } else {
        const preservedPayer =
            existing.billing?.payer &&
            typeof existing.billing.payer === "object" &&
            !Array.isArray(existing.billing.payer)
                ? existing.billing.payer
                : {
                      type: "none",
                      userId: null,
                      orgId: null,
                      note: null,
                      source: null,
                      updatedAt: null,
                  };

        setUpdate.plan = plan;
        setUpdate.billing = {
            status,
            plan,
            paidUntil: plan === "free" ? null : paidUntil,
            features,
            payer: payerPatch || preservedPayer,
        };
    }

    const card = await Card.findByIdAndUpdate(
        cardId,
        { $set: setUpdate },
        { new: true, runValidators: true },
    );
    if (!card) return res.status(404).json({ message: "Not found" });

    const after = {
        plan: card.plan,
        billing: {
            status: card.billing?.status || "free",
            plan: card.billing?.plan || "free",
            paidUntil: card.billing?.paidUntil || null,
        },
        adminOverride: card.adminOverride || null,
    };

    await logAdminAction({
        adminUserId: req.userId,
        action: "CARD_BILLING_SET",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: {
            before,
            after,
        },
    });

    const dtoNow = new Date();
    const userTier = card?.user ? await loadUserTierById(card.user) : null;
    return res.json(
        toCardDTO(card, dtoNow, { includePrivate: true, user: userTier }),
    );
}

export async function adminRevokeCardBilling(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    req.body = {
        ...(req.body && typeof req.body === "object" ? req.body : {}),
        plan: "free",
        status: "free",
        paidUntil: null,
        reason,
    };

    return adminSetCardBilling(req, res);
}

export async function adminSyncCardBillingFromUser(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const cardId = String(req.params.cardId || "");
    if (!mongoose.Types.ObjectId.isValid(cardId)) {
        return res
            .status(400)
            .json({ code: "INVALID_ID", message: "Invalid cardId" });
    }

    const existing = await Card.findById(cardId);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const forceRaw = req.body?.force;
    const force =
        forceRaw === true ||
        forceRaw === 1 ||
        forceRaw === "1" ||
        String(forceRaw || "")
            .trim()
            .toLowerCase() === "true";

    if (existing.billing?.payer?.type === "org" && force !== true) {
        return res.status(409).json({
            ok: false,
            code: "ORG_PAYER_LOCKED",
            message:
                "Org payer lock. Use force to sync billing without changing payer.",
        });
    }

    if (!existing.user) {
        return res.status(400).json({
            code: "CARD_HAS_NO_OWNER",
            message: "Card has no owner user",
        });
    }

    const owner = await User.findById(existing.user).select(
        "plan subscription",
    );
    if (!owner) {
        return res.status(400).json({
            code: "OWNER_NOT_FOUND",
            message: "Owner user not found",
        });
    }

    const before = {
        plan: existing.plan,
        billing: {
            status: existing.billing?.status || "free",
            plan: existing.billing?.plan || "free",
            paidUntil: existing.billing?.paidUntil || null,
        },
        adminOverride: existing.adminOverride || null,
        owner: {
            plan: owner.plan,
            subscription: {
                status: owner.subscription?.status || "inactive",
                expiresAt: owner.subscription?.expiresAt || null,
                provider: owner.subscription?.provider || null,
            },
        },
    };

    const now = new Date();
    const ownerPlan = owner.plan;
    const ownerExpiresAt = owner.subscription?.expiresAt
        ? new Date(owner.subscription.expiresAt)
        : null;

    const shouldRevoke =
        ownerPlan === "free" ||
        !ownerExpiresAt ||
        !Number.isFinite(ownerExpiresAt.getTime()) ||
        ownerExpiresAt.getTime() <= now.getTime();

    const features =
        existing.billing?.features &&
        typeof existing.billing.features === "object" &&
        !Array.isArray(existing.billing.features)
            ? existing.billing.features
            : { analyticsPremium: false };

    const nextPlan = shouldRevoke ? "free" : ownerPlan;

    const preservedPayer =
        existing.billing?.payer &&
        typeof existing.billing.payer === "object" &&
        !Array.isArray(existing.billing.payer)
            ? existing.billing.payer
            : {
                  type: "none",
                  userId: null,
                  orgId: null,
                  note: null,
                  source: null,
                  updatedAt: null,
              };

    const nextBillingStatus = shouldRevoke ? "free" : "active";
    const nextBillingPlan = shouldRevoke ? "free" : ownerPlan;
    const nextBillingPaidUntil = shouldRevoke ? null : ownerExpiresAt;

    const billingIsObject =
        Boolean(existing.billing) &&
        typeof existing.billing === "object" &&
        !Array.isArray(existing.billing);

    const setUpdate = billingIsObject
        ? {
              plan: nextPlan,
              "billing.status": nextBillingStatus,
              "billing.plan": nextBillingPlan,
              "billing.paidUntil": nextBillingPaidUntil,
          }
        : {
              plan: nextPlan,
              billing: {
                  status: nextBillingStatus,
                  plan: nextBillingPlan,
                  paidUntil: nextBillingPaidUntil,
                  features,
                  payer: preservedPayer,
              },
          };

    const card = await Card.findByIdAndUpdate(
        cardId,
        { $set: setUpdate },
        { new: true, runValidators: true },
    );
    if (!card) return res.status(404).json({ message: "Not found" });

    const after = {
        plan: card.plan,
        billing: {
            status: card.billing?.status || "free",
            plan: card.billing?.plan || "free",
            paidUntil: card.billing?.paidUntil || null,
        },
        adminOverride: card.adminOverride || null,
    };

    await logAdminAction({
        adminUserId: req.userId,
        action: "CARD_BILLING_SYNC_FROM_USER",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: {
            mode: shouldRevoke ? "revoke" : "paid",
            before,
            after,
        },
    });

    const dtoNow = new Date();
    const userTier = card?.user ? await loadUserTierById(card.user) : null;
    return res.json(
        toCardDTO(card, dtoNow, { includePrivate: true, user: userTier }),
    );
}

export async function adminClearCardAdminOverride(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const cardId = String(req.params.cardId || "");
    if (!mongoose.Types.ObjectId.isValid(cardId)) {
        return res
            .status(400)
            .json({ code: "INVALID_ID", message: "Invalid cardId" });
    }

    const existing = await Card.findById(cardId);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const before = {
        adminOverride: existing.adminOverride || null,
        plan: existing.plan,
        billing: {
            status: existing.billing?.status || "free",
            plan: existing.billing?.plan || "free",
            paidUntil: existing.billing?.paidUntil || null,
        },
    };

    const card = await Card.findByIdAndUpdate(
        cardId,
        { $set: { adminOverride: null } },
        { new: true, runValidators: true },
    );
    if (!card) return res.status(404).json({ message: "Not found" });

    const after = {
        adminOverride: card.adminOverride || null,
        plan: card.plan,
        billing: {
            status: card.billing?.status || "free",
            plan: card.billing?.plan || "free",
            paidUntil: card.billing?.paidUntil || null,
        },
    };

    await logAdminAction({
        adminUserId: req.userId,
        action: "CARD_ADMIN_OVERRIDE_CLEAR",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: {
            before,
            after,
        },
    });

    const dtoNow = new Date();
    const userTier = card?.user ? await loadUserTierById(card.user) : null;
    return res.json(
        toCardDTO(card, dtoNow, { includePrivate: true, user: userTier }),
    );
}
