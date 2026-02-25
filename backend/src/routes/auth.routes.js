import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import PasswordReset from "../models/PasswordReset.model.js";
import EmailSignupToken from "../models/EmailSignupToken.model.js";
import { signToken } from "../utils/jwt.js";
import { claimAnonymousCardForUser } from "../services/claimCard.service.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getSiteUrl } from "../utils/siteUrl.util.js";
import { sendPasswordResetEmailMailjetBestEffort } from "../services/mailjet.service.js";
import { sendSignupLinkEmailMailjetBestEffort } from "../services/mailjet.service.js";

const router = Router();

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const SIGNUP_TOKEN_TTL_MS = 30 * 60 * 1000;

const AUTH_RATE_WINDOW_MS = 10 * 60 * 1000;
const FORGOT_RATE_LIMIT = 20;
const RESET_RATE_LIMIT = 40;
const SIGNUP_LINK_RATE_LIMIT = 30;
const SIGNUP_CONSUME_RATE_LIMIT = 60;
const SIGNUP_LINK_EMAIL_RATE_LIMIT = 5;

const inMemoryForgotRate = new Map();
const inMemoryResetRate = new Map();
const inMemorySignupLinkRate = new Map();
const inMemorySignupConsumeRate = new Map();
const inMemorySignupLinkEmailRate = new Map();
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
    // Prevent unbounded growth (best-effort).
    if (!map || map.size <= 10_000) {
        for (const [k, v] of map.entries()) {
            if (!v || v.resetAt <= now) map.delete(k);
        }
        return;
    }

    // If map got too big, aggressively remove some entries.
    let removed = 0;
    for (const key of map.keys()) {
        map.delete(key);
        removed += 1;
        if (removed >= 2000) break;
    }
}

function rateLimitByIp(req, map, limit) {
    const ip = getClientIp(req);
    if (!ip) return true;

    const now = Date.now();

    rateSweepTick += 1;
    if (rateSweepTick % RATE_SWEEP_EVERY === 0) {
        sweepRateMap(map, now);
    }

    const entry = map.get(ip);
    if (!entry || entry.resetAt <= now) {
        map.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
        return true;
    }

    entry.count += 1;
    if (entry.count > limit) return false;
    return true;
}

function rateLimitByKey(key, map, limit) {
    if (!key) return true;

    const now = Date.now();

    rateSweepTick += 1;
    if (rateSweepTick % RATE_SWEEP_EVERY === 0) {
        sweepRateMap(map, now);
    }

    const entry = map.get(key);
    if (!entry || entry.resetAt <= now) {
        map.set(key, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
        return true;
    }

    entry.count += 1;
    if (entry.count > limit) return false;
    return true;
}

function normalizeEmail(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
}

function isValidEmail(value) {
    const email = normalizeEmail(value);
    if (!email) return false;
    if (email.length > 254) return false;
    // Minimal sanity check (we rely on User collection as the real validator).
    return email.includes("@") && !email.includes(" ");
}

async function findUserByEmailCaseInsensitive(emailNormalized) {
    let user = await User.findOne({ email: emailNormalized });
    if (!user) {
        user = await User.findOne({ email: emailNormalized }).collation({
            locale: "en",
            strength: 2,
        });
    }
    return user;
}

function sha256Hex(value) {
    return crypto
        .createHash("sha256")
        .update(String(value || ""))
        .digest("hex");
}

function noStore(req, res, next) {
    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
    // Critical: this endpoint depends on the token.
    res.set("Vary", "Authorization");
    next();
}

// REGISTER
router.post("/register", async (req, res) => {
    const rawEmail = req.body?.email;
    const email = normalizeEmail(rawEmail);
    const password = req.body?.password;

    if (!isValidEmail(rawEmail)) {
        return res.status(400).json({ message: "Invalid email" });
    }
    if (typeof password !== "string" || !password) {
        return res.status(400).json({ message: "Invalid password" });
    }

    // Prevent casing-duplicates until we can enforce a case-insensitive unique index.
    // 2-step lookup to prefer the default index path; fallback catches legacy casing.
    let existing = await User.findOne({ email });
    if (!existing) {
        existing = await User.findOne({ email }).collation({
            locale: "en",
            strength: 2, // case-insensitive
        });
    }
    if (existing) {
        return res.status(409).json({ message: "Unable to register" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    try {
        user = await User.create({ email, passwordHash });
    } catch (err) {
        // Preserve current API shape; avoid leaking DB/index details.
        if (err && (err.code === 11000 || err.code === 11001)) {
            return res.status(409).json({ message: "Unable to register" });
        }
        throw err;
    }

    // Best-effort: claim anonymous card right after registration.
    const anonymousId = req?.anonymousId ? String(req.anonymousId) : "";
    try {
        await claimAnonymousCardForUser({
            userId: String(user._id),
            anonymousId,
            strict: false,
        });
    } catch (err) {
        console.error(
            "[auth] claim after register failed",
            err?.message || err,
        );
    }

    res.json({ token: signToken(user._id) });
});

// LOGIN
router.post("/login", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== "string" || !password) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    // 2-step lookup to prefer the default index path; fallback supports legacy casing.
    let user = await User.findOne({ email });
    if (!user) {
        user = await User.findOne({ email }).collation({
            locale: "en",
            strength: 2, // case-insensitive
        });
    }
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    res.json({ token: signToken(user._id) });
});

// FORGOT PASSWORD (anti-enumeration)
router.post("/forgot", async (req, res) => {
    if (!rateLimitByIp(req, inMemoryForgotRate, FORGOT_RATE_LIMIT)) {
        return res.status(429).json({
            code: "RATE_LIMITED",
            message: "Too many requests",
        });
    }

    const rawEmail = req.body?.email;
    const email = normalizeEmail(rawEmail);

    // Anti-enumeration: always 204, even for invalid inputs.
    if (!isValidEmail(rawEmail)) {
        return res.sendStatus(204);
    }

    // 2-step lookup to prefer the default index path; fallback supports legacy casing.
    let user = await User.findOne({ email });
    if (!user) {
        user = await User.findOne({ email }).collation({
            locale: "en",
            strength: 2,
        });
    }

    if (!user) {
        return res.sendStatus(204);
    }

    const siteUrl = getSiteUrl();

    // Extremely low collision risk, but retry once on duplicate key just in case.
    let created = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = sha256Hex(rawToken);
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

        try {
            created = await PasswordReset.create({
                userId: user._id,
                tokenHash,
                expiresAt,
            });

            const resetLink = `${siteUrl}/reset-password?token=${encodeURIComponent(
                rawToken,
            )}`;

            const sendRes = await sendPasswordResetEmailMailjetBestEffort({
                toEmail: user.email,
                resetLink,
                userId: user._id,
                resetId: created._id,
            });

            // Mailer safety: if Mailjet is not configured and the send was skipped,
            // do NOT invalidate existing tokens (avoid locking the user out of the last working link).
            const didAttemptSend = !sendRes?.skipped;
            if (didAttemptSend) {
                const now = new Date();
                try {
                    await PasswordReset.updateMany(
                        {
                            userId: user._id,
                            _id: { $ne: created._id },
                            usedAt: null,
                            expiresAt: { $gt: now },
                        },
                        { $set: { usedAt: now } },
                    );
                } catch (err) {
                    console.error(
                        "[auth] forgot invalidate previous tokens failed",
                        err?.message || err,
                    );
                }
            }

            break;
        } catch (err) {
            // Duplicate tokenHash (unlikely): retry once. Any other error: stop.
            if (err && (err.code === 11000 || err.code === 11001)) {
                continue;
            }
            console.error("[auth] forgot failed", err?.message || err);
            break;
        }
    }

    // Best-effort / anti-enumeration: never reveal status.
    return res.sendStatus(204);
});

// SIGNUP VIA EMAIL TOKEN (magic link)
router.post("/signup-link", async (req, res) => {
    try {
        // Anti-enumeration invariant: always 204.
        if (
            !rateLimitByIp(req, inMemorySignupLinkRate, SIGNUP_LINK_RATE_LIMIT)
        ) {
            return res.sendStatus(204);
        }

        const rawEmail = req.body?.email;
        const emailNormalized = normalizeEmail(rawEmail);

        // Anti-enumeration: always 204, even for invalid inputs.
        if (!isValidEmail(rawEmail)) {
            return res.sendStatus(204);
        }

        // Per-email rate limit: protect against targeted abuse on a single address.
        if (
            !rateLimitByKey(
                emailNormalized,
                inMemorySignupLinkEmailRate,
                SIGNUP_LINK_EMAIL_RATE_LIMIT,
            )
        ) {
            return res.sendStatus(204);
        }

        const existing = await findUserByEmailCaseInsensitive(emailNormalized);
        if (existing) {
            return res.sendStatus(204);
        }

        const siteUrl = getSiteUrl();

        // Retry once on duplicate tokenHash just in case.
        let created = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const rawToken = crypto.randomBytes(32).toString("hex");
            const tokenHash = sha256Hex(rawToken);
            const expiresAt = new Date(Date.now() + SIGNUP_TOKEN_TTL_MS);

            try {
                created = await EmailSignupToken.create({
                    emailNormalized,
                    tokenHash,
                    expiresAt,
                });

                const signupLink = `${siteUrl}/signup?token=${encodeURIComponent(
                    rawToken,
                )}`;

                const sendRes = await sendSignupLinkEmailMailjetBestEffort({
                    toEmail: emailNormalized,
                    signupLink,
                    emailNormalized,
                    tokenId: created._id,
                });

                // Single-active: invalidate other active tokens only if send was attempted.
                const didAttemptSend = !sendRes?.skipped;
                if (didAttemptSend) {
                    const now = new Date();
                    try {
                        await EmailSignupToken.updateMany(
                            {
                                emailNormalized,
                                _id: { $ne: created._id },
                                usedAt: null,
                                expiresAt: { $gt: now },
                            },
                            { $set: { usedAt: now } },
                        );
                    } catch (err) {
                        console.error(
                            "[auth] signup-link invalidate previous tokens failed",
                            err?.message || err,
                        );
                    }
                }

                break;
            } catch (err) {
                if (err && (err.code === 11000 || err.code === 11001)) {
                    continue;
                }
                console.error("[auth] signup-link failed", err?.message || err);
                break;
            }
        }

        return res.sendStatus(204);
    } catch (err) {
        console.error("[auth] signup-link handler failed", err?.message || err);
        return res.sendStatus(204);
    }
});

// No per-email limit on consume: email is unknown until after DB consume; adding a DB read just for rate limiting would increase blast radius.
router.post("/signup-consume", async (req, res) => {
    const fail = () =>
        res.status(400).json({ message: "Unable to complete signup" });

    try {
        // Enterprise contract: neutral 400 on any failure (including rate limit).
        if (
            !rateLimitByIp(
                req,
                inMemorySignupConsumeRate,
                SIGNUP_CONSUME_RATE_LIMIT,
            )
        ) {
            return fail();
        }

        const rawToken = String(req.body?.token || "").trim();
        const password = req.body?.password;

        if (!rawToken || typeof password !== "string" || !password) {
            return fail();
        }

        const tokenHash = sha256Hex(rawToken);
        const now = new Date();

        // Atomically mark token as used to prevent reuse.
        const consumed = await EmailSignupToken.findOneAndUpdate(
            { tokenHash, usedAt: null, expiresAt: { $gt: now } },
            { $set: { usedAt: now } },
            { new: false },
        );

        if (!consumed) {
            return fail();
        }

        const emailNormalized = normalizeEmail(consumed.emailNormalized);
        if (!emailNormalized || !isValidEmail(emailNormalized)) {
            return fail();
        }

        const existing = await findUserByEmailCaseInsensitive(emailNormalized);
        if (existing) {
            return fail();
        }

        const passwordHash = await bcrypt.hash(password, 10);

        let user;
        try {
            user = await User.create({ email: emailNormalized, passwordHash });
        } catch (err) {
            if (err && (err.code === 11000 || err.code === 11001)) {
                return fail();
            }
            throw err;
        }

        return res.json({ token: signToken(user._id) });
    } catch (err) {
        console.error("[auth] signup-consume failed", err?.message || err);
        return fail();
    }
});

// RESET PASSWORD
router.post("/reset", async (req, res) => {
    if (!rateLimitByIp(req, inMemoryResetRate, RESET_RATE_LIMIT)) {
        return res.status(429).json({
            code: "RATE_LIMITED",
            message: "Too many requests",
        });
    }

    const rawToken = String(req.body?.token || "").trim();
    const password = req.body?.password;

    if (!rawToken || typeof password !== "string" || !password) {
        return res.status(400).json({ message: "Unable to reset password" });
    }

    const tokenHash = sha256Hex(rawToken);
    const now = new Date();

    // Atomically mark token as used to prevent reuse.
    const reset = await PasswordReset.findOneAndUpdate(
        { tokenHash, usedAt: null, expiresAt: { $gt: now } },
        { $set: { usedAt: now } },
        { new: false },
    );

    if (!reset) {
        return res.status(400).json({ message: "Unable to reset password" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const upd = await User.updateOne(
        { _id: reset.userId },
        { $set: { passwordHash } },
    );

    if (!upd?.matchedCount) {
        return res.status(400).json({ message: "Unable to reset password" });
    }

    return res.sendStatus(204);
});

// ME (JWT-only)
router.get("/me", noStore, requireAuth, async (req, res) => {
    const userId = req.user?.id || req.userId || req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Invalid token" });

    const user = await User.findById(String(userId)).select("email role");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ email: user.email, role: user.role });
});

export default router;
