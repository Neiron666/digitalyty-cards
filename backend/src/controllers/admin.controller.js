import User from "../models/User.model.js";
import Card from "../models/Card.model.js";
import { logAdminAction } from "../services/adminAudit.service.js";

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
            .select("email role cardId createdAt"),
        User.countDocuments(filter),
    ]);

    res.json({
        page,
        limit,
        total,
        items,
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
                "slug status isActive plan user anonymousId trialEndsAt createdAt updatedAt"
            ),
        Card.countDocuments(filter),
    ]);

    res.json({ page, limit, total, items });
}

export async function getUserById(req, res) {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "Not found" });
    return res.json(user);
}

export async function getCardById(req, res) {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: "Not found" });
    return res.json(card);
}

export async function deactivateCard(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: "Not found" });

    const before = { isActive: card.isActive };
    card.isActive = false;
    await card.save();

    await logAdminAction({
        adminUserId: req.userId,
        action: "CARD_DEACTIVATE",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: { before, after: { isActive: card.isActive } },
    });

    return res.json(card);
}

export async function reactivateCard(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: "Not found" });

    const before = { isActive: card.isActive };
    card.isActive = true;
    await card.save();

    await logAdminAction({
        adminUserId: req.userId,
        action: "CARD_REACTIVATE",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: { before, after: { isActive: card.isActive } },
    });

    return res.json(card);
}

export async function extendTrial(req, res) {
    const reason = requireReason(req, res);
    if (!reason) return;

    const days = clampInt(req.body?.days, { min: 1, max: 14, fallback: NaN });
    if (!Number.isFinite(days)) {
        return res
            .status(400)
            .json({ code: "INVALID_DAYS", message: "days must be 1..14" });
    }

    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: "Not found" });

    const now = new Date();
    const baseMs = Math.max(
        now.getTime(),
        card.trialEndsAt ? new Date(card.trialEndsAt).getTime() : 0
    );

    const newEndsAt = new Date(baseMs + days * DAY_MS);
    const newDeleteAt = new Date(newEndsAt.getTime() + 7 * DAY_MS);

    const before = {
        trialStartedAt: card.trialStartedAt,
        trialEndsAt: card.trialEndsAt,
        trialDeleteAt: card.trialDeleteAt,
        billingStatus: card.billing?.status,
    };

    if (!card.trialStartedAt) card.trialStartedAt = now;
    card.trialEndsAt = newEndsAt;
    card.trialDeleteAt = newDeleteAt;

    card.billing = card.billing || {
        status: "free",
        plan: card.plan || "free",
        paidUntil: null,
    };
    if (card.billing.status === "free") card.billing.status = "trial";

    await card.save();

    await logAdminAction({
        adminUserId: req.userId,
        action: "TRIAL_EXTEND",
        targetType: "card",
        targetId: card._id,
        reason,
        meta: {
            days,
            before,
            after: {
                trialStartedAt: card.trialStartedAt,
                trialEndsAt: card.trialEndsAt,
                trialDeleteAt: card.trialDeleteAt,
                billingStatus: card.billing?.status,
            },
        },
    });

    return res.json(card);
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
        return res
            .status(400)
            .json({
                code: "INVALID_UNTIL",
                message: "until must be in the future",
            });
    }

    const maxUntil = new Date(now.getTime() + 365 * DAY_MS);
    if (until.getTime() > maxUntil.getTime()) {
        return res
            .status(400)
            .json({
                code: "INVALID_UNTIL",
                message: "until too far in the future",
            });
    }

    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: "Not found" });

    const before = card.adminOverride || null;

    card.adminOverride = {
        plan,
        until,
        byAdmin: req.userId,
        reason,
        createdAt: now,
    };

    await card.save();

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

    return res.json(card);
}
