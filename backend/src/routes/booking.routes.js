import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
    approveMyBooking,
    cancelMyBooking,
    createPublicBooking,
    getPublicAvailability,
    getPendingCount,
    listMyBookings,
    reconcileExpiredBookings,
} from "../controllers/booking.controller.js";

const router = Router();

// ── Rate-limit + honeypot reuse (pattern aligned with leads) ─────────

const BOOK_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 min
const BOOK_RATE_LIMIT_IP = 20; // public POST per IP
const BOOK_RATE_LIMIT_CARD = 8; // public POST per IP:cardId
const AUTH_RATE_LIMIT = 120; // owner reads/actions

const inMemoryBookIpRate = new Map();
const inMemoryBookCardRate = new Map();
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

function authRateLimit(req, res, next) {
    const ip = getClientIp(req);
    const key = req.userId ? `${ip}:${req.userId}` : `${ip}:anon`;

    if (
        !rateLimitByKey(
            key,
            inMemoryAuthRate,
            AUTH_RATE_LIMIT,
            BOOK_RATE_WINDOW_MS,
        )
    ) {
        return res.status(429).json({ message: "Too many requests" });
    }

    return next();
}

// ── Public availability read (anonymous) ────────────────────────────

router.get(
    "/availability",
    (req, res, next) => {
        const ip = getClientIp(req);

        if (
            !rateLimitByKey(
                ip,
                inMemoryBookIpRate,
                BOOK_RATE_LIMIT_IP,
                BOOK_RATE_WINDOW_MS,
            )
        ) {
            return res.status(429).json({ message: "Too many requests" });
        }

        return next();
    },
    getPublicAvailability,
);

// ── Public submit (anonymous) ───────────────────────────────────────

router.post(
    "/",
    (req, res, next) => {
        const ip = getClientIp(req);

        if (
            !rateLimitByKey(
                ip,
                inMemoryBookIpRate,
                BOOK_RATE_LIMIT_IP,
                BOOK_RATE_WINDOW_MS,
            )
        ) {
            return res.status(429).json({ message: "Too many requests" });
        }

        const cardId = String(req.body?.cardId || "").slice(0, 24);
        if (cardId && ip) {
            const compositeKey = `${ip}:${cardId}`;
            if (
                !rateLimitByKey(
                    compositeKey,
                    inMemoryBookCardRate,
                    BOOK_RATE_LIMIT_CARD,
                    BOOK_RATE_WINDOW_MS,
                )
            ) {
                return res.status(429).json({ message: "Too many requests" });
            }
        }

        return next();
    },
    createPublicBooking,
);

// ── Owner endpoints (auth required) ─────────────────────────────────

router.get("/mine", requireAuth, authRateLimit, listMyBookings);
router.get("/mine/pending-count", requireAuth, authRateLimit, getPendingCount);
router.post("/:id/approve", requireAuth, authRateLimit, approveMyBooking);
router.post("/:id/cancel", requireAuth, authRateLimit, cancelMyBooking);

// Lightweight reconciler (auth required). Secondary safety valve only.
// Primary anti-drift guarantee is the targeted pre-expire on public create path.
router.post(
    "/reconcile/expired",
    requireAuth,
    authRateLimit,
    reconcileExpiredBookings,
);

export default router;
