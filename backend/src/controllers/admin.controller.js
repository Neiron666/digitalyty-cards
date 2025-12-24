import User from "../models/User.model.js";
import Card from "../models/Card.model.js";
import { logAdminAction } from "../services/adminAudit.service.js";
import { toCardDTO } from "../utils/cardDTO.js";
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
                .map((id) => String(id))
        )
    );

    const cardsById = new Map();
    if (cardIds.length) {
        const cards = await Card.find({ _id: { $in: cardIds } })
            .select("slug status isActive")
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
            cardSummary = c
                ? {
                      cardId,
                      slug: c.slug || "",
                      status: c.status || "",
                      isActive: Boolean(c.isActive),
                  }
                : { cardId, missing: true };
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

    const filter = {};

    if (owner === "user") filter.user = { $exists: true, $ne: null };
    if (owner === "anonymous")
        filter.anonymousId = { $exists: true, $ne: null };

    if (status === "draft" || status === "published") filter.status = status;
    if (q) filter.slug = q;

    const [items, total] = await Promise.all([
        Card.find(filter)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .select(
                "slug status isActive plan user anonymousId trialEndsAt trialStartedAt billing adminOverride adminTier adminTierUntil adminTierByAdmin adminTierReason adminTierCreatedAt createdAt updatedAt"
            ),
        Card.countDocuments(filter),
    ]);

    const userIds = Array.from(
        new Set(
            items
                .map((c) => c?.user)
                .filter(Boolean)
                .map((id) => String(id))
        )
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
        toCardDTO(card, now, { includePrivate: true, user: userTier })
    );
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
        { new: true, runValidators: true }
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
        toCardDTO(card, now, { includePrivate: true, user: userTier })
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
        { new: true, runValidators: true }
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
        toCardDTO(card, now, { includePrivate: true, user: userTier })
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

    const nextBilling = {
        status: existing.billing?.status || "free",
        plan: existing.billing?.plan || existing.plan || "free",
        paidUntil: existing.billing?.paidUntil || null,
    };
    if (nextBilling.status === "free") nextBilling.status = "trial";

    const update = {
        trialStartedAt: existing.trialStartedAt || now,
        trialEndsAt,
        trialDeleteAt,
        billing: nextBilling,
    };

    const card = await Card.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true }
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
        toCardDTO(card, dtoNow, { includePrivate: true, user: userTier })
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
        { new: true, runValidators: true }
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
        toCardDTO(card, dtoNow, { includePrivate: true, user: userTier })
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
        { new: true, runValidators: true }
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
        toCardDTO(card, dtoNow, { includePrivate: true, user: userTier })
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
        { new: true, runValidators: true }
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
        toCardDTO(card, dtoNow, { includePrivate: true, user: userTier })
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
        { new: true, runValidators: true }
    ).select(
        "email role cardId adminTier adminTierUntil adminTierByAdmin adminTierReason adminTierCreatedAt createdAt"
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
