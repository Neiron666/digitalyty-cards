import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
    createLead,
    getMyLeads,
    getUnreadCount,
    markLeadRead,
    updateLeadFlags,
    hardDeleteLead,
} from "../controllers/lead.controller.js";

const router = Router();

// ── Rate-limit infrastructure (self-contained, project convention) ──

const LEAD_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 min
const LEAD_RATE_LIMIT_IP = 15; // per IP (public POST)
const LEAD_RATE_LIMIT_CARD = 5; // per IP:cardId composite (public POST)
const AUTH_RATE_LIMIT = 60; // per IP:userId (authenticated reads)

const inMemoryLeadIpRate = new Map();
const inMemoryLeadCardRate = new Map();
const inMemoryAuthRate = new Map();
let rateSweepTick = 0;
const RATE_SWEEP_EVERY = 500;

function getClientIp(req) {
    const xf = req.headers["x-forwarded-for"];
    if (typeof xf === "string" && xf.trim()) {
        return xf.split(",")[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || "";
}

function sweepRateMap(map, now) {
    if (!map || map.size <= 10_000) {
        for (const [k, v] of map.entries()) {
            if (!v || v.resetAt <= now) map.delete(k);
        }
        return;
    }
    let removed = 0;
    for (const key of map.keys()) {
        map.delete(key);
        removed += 1;
        if (removed >= 2000) break;
    }
}

function rateLimitByKey(key, map, limit, windowMs) {
    if (!key) return true;
    const now = Date.now();

    rateSweepTick += 1;
    if (rateSweepTick % RATE_SWEEP_EVERY === 0) {
        sweepRateMap(map, now);
    }

    const entry = map.get(key);
    if (!entry || entry.resetAt <= now) {
        map.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }
    entry.count += 1;
    return entry.count <= limit;
}

// ── Authenticated rate-limit middleware ─────────────────────────────
// Key: ip:userId. Fallback to ip:anon if userId is missing.

function authRateLimit(req, res, next) {
    const ip = getClientIp(req);
    const key = req.userId ? `${ip}:${req.userId}` : `${ip}:anon`;

    if (
        !rateLimitByKey(
            key,
            inMemoryAuthRate,
            AUTH_RATE_LIMIT,
            LEAD_RATE_WINDOW_MS,
        )
    ) {
        return res.status(429).json({ message: "Too many requests" });
    }
    next();
}

// ── Authenticated routes (owner inbox read path) ───────────────────

router.get("/mine", requireAuth, authRateLimit, getMyLeads);
router.get("/unread-count", requireAuth, authRateLimit, getUnreadCount);
router.patch("/:id/read", requireAuth, authRateLimit, markLeadRead);
router.patch("/:id/flags", requireAuth, authRateLimit, updateLeadFlags);
router.delete("/:id", requireAuth, authRateLimit, hardDeleteLead);

// ── Public route - lead submission from card page ──

router.post(
    "/",
    (req, res, next) => {
        const ip = getClientIp(req);

        // IP-level limit
        if (
            !rateLimitByKey(
                ip,
                inMemoryLeadIpRate,
                LEAD_RATE_LIMIT_IP,
                LEAD_RATE_WINDOW_MS,
            )
        ) {
            return res.status(429).json({ message: "Too many requests" });
        }

        // Per-card composite limit (IP:cardId)
        const cardId = String(req.body?.cardId || "").slice(0, 24);
        if (cardId && ip) {
            const compositeKey = `${ip}:${cardId}`;
            if (
                !rateLimitByKey(
                    compositeKey,
                    inMemoryLeadCardRate,
                    LEAD_RATE_LIMIT_CARD,
                    LEAD_RATE_WINDOW_MS,
                )
            ) {
                return res.status(429).json({ message: "Too many requests" });
            }
        }

        next();
    },
    createLead,
);

export default router;
