import { Router } from "express";
import crypto from "crypto";
import User from "../models/User.model.js";
import EmailUnsubscribeToken from "../models/EmailUnsubscribeToken.model.js";
import { createMarketingOptOut } from "../utils/marketingOptOut.util.js";
import { CURRENT_MARKETING_CONSENT_VERSION } from "../utils/consentVersions.js";
import { UNSUBSCRIBE_TOKEN_TTL_MS } from "../utils/unsubscribeTokenTtl.util.js";

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, IP-keyed; mirrors auth.routes pattern).
// ---------------------------------------------------------------------------
const CONSUME_RATE_LIMIT = 20;
const CONSUME_RATE_WINDOW_MS = 15 * 60 * 1000;
const inMemoryConsumeRate = new Map();
let consumeRateSweepTick = 0;
const CONSUME_SWEEP_EVERY = 200;

function getClientIp(req) {
    const xf = req.headers["x-forwarded-for"];
    if (typeof xf === "string" && xf.trim()) {
        return xf.split(",")[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || "";
}

function sweepConsumeRate(now) {
    for (const [k, v] of inMemoryConsumeRate.entries()) {
        if (!v || v.resetAt <= now) inMemoryConsumeRate.delete(k);
    }
}

function rateLimitConsume(req) {
    const ip = getClientIp(req);
    if (!ip) return true;

    const now = Date.now();
    consumeRateSweepTick += 1;
    if (consumeRateSweepTick % CONSUME_SWEEP_EVERY === 0) {
        sweepConsumeRate(now);
    }

    const entry = inMemoryConsumeRate.get(ip);
    if (!entry || entry.resetAt <= now) {
        inMemoryConsumeRate.set(ip, {
            count: 1,
            resetAt: now + CONSUME_RATE_WINDOW_MS,
        });
        return true;
    }
    entry.count += 1;
    return entry.count <= CONSUME_RATE_LIMIT;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sha256Hex(value) {
    return crypto
        .createHash("sha256")
        .update(String(value || ""))
        .digest("hex");
}

// Safe failure: same shape and same message for all invalid/expired/used token
// states — no existence leakage.
function fail(res) {
    return res.status(400).json({
        ok: false,
        message: "Invalid or expired unsubscribe link",
    });
}

// ---------------------------------------------------------------------------
// POST /api/unsubscribe/consume
//
// Public — no auth cookie required. CSRF guard applies (browser fetch from
// the /unsubscribe frontend page will set X-Requested-With: XMLHttpRequest).
//
// Accepts: { token: string }
// Consumes a single-use unsubscribe token, creates a suppression record, and
// updates the user's consent state if they still exist.
// ---------------------------------------------------------------------------
router.post("/consume", async (req, res) => {
    try {
        if (!rateLimitConsume(req)) {
            return fail(res);
        }

        const rawToken = String(req.body?.token || "").trim();
        if (!rawToken) {
            return fail(res);
        }

        const tokenHash = sha256Hex(rawToken);
        const now = new Date();

        // Atomically mark token used — prevents replay.
        const consumed = await EmailUnsubscribeToken.findOneAndUpdate(
            { tokenHash, usedAt: null, expiresAt: { $gt: now } },
            { $set: { usedAt: now } },
            { new: false },
        );

        if (!consumed) {
            return fail(res);
        }

        const emailNormalized = (consumed.emailNormalized || "")
            .trim()
            .toLowerCase();
        if (!emailNormalized) {
            return fail(res);
        }

        // Write suppression tombstone (idempotent — 11000/11001 swallowed).
        await createMarketingOptOut({ normalizedEmail: emailNormalized });

        // Update consent state on User if they still exist.
        // No-op if account was deleted — suppression tombstone above is the
        // durable truth.
        await User.updateOne(
            { email: emailNormalized },
            {
                $set: {
                    emailMarketingConsent: false,
                    emailMarketingConsentAt: now,
                    emailMarketingConsentVersion:
                        CURRENT_MARKETING_CONSENT_VERSION,
                    emailMarketingConsentSource: "unsubscribe_link",
                },
            },
        );

        return res.json({ ok: true });
    } catch (err) {
        console.error(
            "[unsubscribe] POST /consume failed",
            err?.message || err,
        );
        return fail(res);
    }
});

export default router;
