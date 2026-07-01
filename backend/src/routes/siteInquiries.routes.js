import { Router } from "express";
import { submitArticleInquiry } from "../controllers/siteInquiries.controller.js";

const router = Router();

// ── Rate-limit infrastructure (self-contained, project convention) ──────────
// Pattern mirrors lead.routes.js. In-memory only — does not survive restarts.
// Acceptable for a low-traffic public form endpoint.

const INQUIRY_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const INQUIRY_RATE_LIMIT_IP = 5; // 5 requests per IP per window

const inMemoryInquiryIpRate = new Map();
let rateSweepTick = 0;
const RATE_SWEEP_EVERY = 200;

function getClientIp(req) {
    const xf = req.headers["x-forwarded-for"];
    if (typeof xf === "string" && xf.trim()) {
        return xf.split(",")[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || "";
}

function sweepRateMap(map, now) {
    if (!map) return;
    for (const [k, v] of map.entries()) {
        if (!v || v.resetAt <= now) map.delete(k);
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

// ── Public POST /article ─────────────────────────────────────────────────────
// No auth required. Rate-limited by IP. Validated + sanitized in controller.

router.post(
    "/article",
    (req, res, next) => {
        const ip = getClientIp(req);
        if (
            !rateLimitByKey(
                ip,
                inMemoryInquiryIpRate,
                INQUIRY_RATE_LIMIT_IP,
                INQUIRY_RATE_WINDOW_MS,
            )
        ) {
            return res.status(429).json({
                ok: false,
                code: "RATE_LIMITED",
                message: "יותר מדי ניסיונות. נסו שוב מאוחר יותר.",
            });
        }
        next();
    },
    submitArticleInquiry,
);

export default router;
