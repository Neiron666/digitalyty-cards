import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import PasswordReset from "../models/PasswordReset.model.js";
import ActivePasswordReset from "../models/ActivePasswordReset.model.js";
import MailJob from "../models/MailJob.model.js";
import EmailSignupToken from "../models/EmailSignupToken.model.js";
import EmailVerificationToken from "../models/EmailVerificationToken.model.js";
import { signToken } from "../utils/jwt.js";
import { claimAnonymousCardForUser } from "../services/claimCard.service.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getSiteUrl } from "../utils/siteUrl.util.js";
import { sendSignupLinkEmailMailjetBestEffort } from "../services/mailjet.service.js";
import { sendVerificationEmailMailjetBestEffort } from "../services/mailjet.service.js";
import {
    CURRENT_TERMS_VERSION,
    CURRENT_PRIVACY_VERSION,
} from "../utils/consentVersions.js";

const router = Router();

const IS_PROD = process.env.NODE_ENV === "production";
const AUTH_COOKIE_NAME = IS_PROD ? "__Host-cardigo_auth" : "cardigo_auth";
const AUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms — matches JWT expiresIn:"7d"
};

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const FORGOT_RESEND_COOLDOWN_MS = 180 * 1000; // 3-minute per-user resend cooldown
const FORGOT_RESPONSE_FLOOR_MS = 50; // minimum ms before any 204 — closes user-existence timing oracle
const SIGNUP_TOKEN_TTL_MS = 30 * 60 * 1000;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h for email verification

const AUTH_RATE_WINDOW_MS = 10 * 60 * 1000;
const FORGOT_RATE_LIMIT = 20;
const RESET_RATE_LIMIT = 40;
const REGISTER_RATE_LIMIT = 20;
const LOGIN_RATE_LIMIT = 30;
const SIGNUP_LINK_RATE_LIMIT = 30;
const SIGNUP_CONSUME_RATE_LIMIT = 60;
const SIGNUP_LINK_EMAIL_RATE_LIMIT = 5;
const VERIFY_EMAIL_RATE_LIMIT = 30;
const RESEND_VERIFY_RATE_LIMIT = 5;

const PASSWORD_MIN_LENGTH = 8;

const inMemoryRegisterRate = new Map();
const inMemoryLoginRate = new Map();
const inMemoryForgotRate = new Map();
const inMemoryResetRate = new Map();
const inMemorySignupLinkRate = new Map();
const inMemorySignupConsumeRate = new Map();
const inMemorySignupLinkEmailRate = new Map();
const inMemoryVerifyEmailRate = new Map();
const inMemoryResendVerifyRate = new Map();
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
    if (!rateLimitByIp(req, inMemoryRegisterRate, REGISTER_RATE_LIMIT)) {
        return res.status(429).json({
            code: "RATE_LIMITED",
            message: "Too many requests",
        });
    }

    const rawEmail = req.body?.email;
    const email = normalizeEmail(rawEmail);
    const password = req.body?.password;

    if (!isValidEmail(rawEmail)) {
        return res.status(400).json({ message: "Invalid email" });
    }
    if (typeof password !== "string" || !password) {
        return res.status(400).json({ message: "Invalid password" });
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({
            message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        });
    }

    // ── Consent enforcement (strict boolean) ──
    if (req.body.consent !== true) {
        return res
            .status(400)
            .json({ message: "Invalid request", code: "CONSENT_REQUIRED" });
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
        const now = new Date();
        user = await User.create({
            email,
            passwordHash,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
            termsVersion: CURRENT_TERMS_VERSION,
            privacyVersion: CURRENT_PRIVACY_VERSION,
        });
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

    // Best-effort: send email verification link.
    try {
        const siteUrl = getSiteUrl();
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = sha256Hex(rawToken);
        const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

        const vToken = await EmailVerificationToken.create({
            userId: user._id,
            tokenHash,
            expiresAt,
        });

        const verifyLink = `${siteUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;

        await sendVerificationEmailMailjetBestEffort({
            toEmail: email,
            verifyLink,
            userId: user._id,
            tokenId: vToken._id,
        });
    } catch (err) {
        console.error(
            "[auth] send verification email after register failed",
            err?.message || err,
        );
    }

    const regToken = signToken(user._id);
    res.cookie(AUTH_COOKIE_NAME, regToken, AUTH_COOKIE_OPTIONS);
    res.json({ token: regToken, isVerified: false });
});

// LOGIN
router.post("/login", async (req, res) => {
    if (!rateLimitByIp(req, inMemoryLoginRate, LOGIN_RATE_LIMIT)) {
        return res.status(429).json({
            code: "RATE_LIMITED",
            message: "Too many requests",
        });
    }

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
    if (!user) {
        console.warn("[auth] login failed", { reason: "bad-credentials" });
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        console.warn("[auth] login failed", { reason: "bad-credentials" });
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const loginToken = signToken(user._id);
    res.cookie(AUTH_COOKIE_NAME, loginToken, AUTH_COOKIE_OPTIONS);
    res.json({ token: loginToken });
});

// FORGOT PASSWORD (anti-enumeration)
router.post("/forgot", async (req, res) => {
    // Shared floor: every 204 branch awaits this before responding.
    // Decouples response timing from DB/Mailjet latency — closes user-existence oracle.
    const floorPromise = new Promise((resolve) =>
        setTimeout(resolve, FORGOT_RESPONSE_FLOOR_MS),
    );

    if (!rateLimitByIp(req, inMemoryForgotRate, FORGOT_RATE_LIMIT)) {
        // Anti-enumeration: return 204 even on IP rate-limit (not distinguishable 429).
        await floorPromise;
        return res.sendStatus(204);
    }

    const rawEmail = req.body?.email;
    const email = normalizeEmail(rawEmail);

    // Anti-enumeration: always 204, even for invalid inputs.
    if (!isValidEmail(rawEmail)) {
        await floorPromise;
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
        await floorPromise;
        return res.sendStatus(204);
    }

    // DB-backed per-user cooldown (cross-IP safe). Fail-closed.
    // Two independent status-scoped lookups enforce different suppression semantics:
    //   1. active APR — suppress unconditionally for the full remaining validity window.
    //      Hotfix: removed updatedAt gate from this branch. The prior single-query approach
    //      gated active-APR suppression to the 3-minute cooldown window, allowing a second
    //      /forgot to silently replace (findOneAndReplace) a still-valid APR's tokenHash,
    //      invalidating the previously emailed link within the 30-minute TTL window.
    //   2. pending-delivery APR — suppress within the cooldown window AND only when a live
    //      MailJob is in flight. No live MailJob => self-heal path remains open.
    // Fail-closed: any DB error during either lookup returns 204 without writes.
    try {
        const now = new Date();

        // 1. Active APR: a usable link has already been delivered.
        //    Suppress for the full remaining validity window — no updatedAt gate.
        const activeAPR = await ActivePasswordReset.findOne({
            userId: user._id,
            status: "active",
            usedAt: null,
            expiresAt: { $gt: now },
        })
            .select("_id")
            .lean();

        if (activeAPR) {
            console.info(
                "[auth] forgot suppressed (active APR in validity window)",
                {
                    userId: String(user._id),
                },
            );
            await floorPromise;
            return res.sendStatus(204);
        }

        // 2. Pending-delivery APR: delivery pipeline may still be in flight.
        //    Suppress only within the resend cooldown window AND only if a live MailJob
        //    exists. No live MailJob => partial-write self-heal — fall through and re-issue.
        const cooldownCutoff = new Date(Date.now() - FORGOT_RESEND_COOLDOWN_MS);
        const pendingAPR = await ActivePasswordReset.findOne({
            userId: user._id,
            status: "pending-delivery",
            usedAt: null,
            expiresAt: { $gt: now },
            updatedAt: { $gt: cooldownCutoff },
        })
            .select("_id")
            .lean();

        if (pendingAPR) {
            const liveJob = await MailJob.findOne({
                userId: user._id,
                status: { $in: ["pending", "processing"] },
                expiresAt: { $gt: now },
            })
                .select("_id")
                .lean();

            if (liveJob) {
                console.info(
                    "[auth] forgot suppressed (pending-delivery in-flight)",
                    {
                        userId: String(user._id),
                    },
                );
                await floorPromise;
                return res.sendStatus(204);
            }
            // No live MailJob: partial-write self-heal — fall through and re-issue.
        }
    } catch (err) {
        // Fail-closed: cooldown check error suppresses intent writes and email send.
        // Anti-enumeration preserved — still returns generic 204.
        console.error(
            "[auth] forgot cooldown check failed",
            err?.message || err,
        );
        await floorPromise;
        return res.sendStatus(204);
    }

    // Persist durable reset intent and durable delivery intent before responding.
    // Both writes are inside one try/catch. If either fails: fail-silent, return 204.
    // On partial write (APR ok, MailJob fails): cooldown detects missing MailJob and
    // allows immediate retry on the next /forgot request.
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    try {
        // One-active-per-user: findOneAndReplace atomically supersedes any prior intent.
        // The unique userId index (applied by migration) enforces the one-active guarantee.
        await ActivePasswordReset.findOneAndReplace(
            { userId: user._id },
            {
                userId: user._id,
                status: "pending-delivery",
                expiresAt,
                usedAt: null,
            },
            { upsert: true, new: true },
        );
        // Durable delivery intent: userId only — no token, no email snapshot.
        // Worker resolves User.email at send time via indexed findById.
        await MailJob.create({
            userId: user._id,
            status: "pending",
            attempts: 0,
            lastAttemptAt: null,
            expiresAt,
        });
    } catch (err) {
        console.error("[auth] forgot intent write failed", err?.message || err);
        // Fail-silent: anti-enumeration preserved.
    }

    // Best-effort / anti-enumeration: never reveal status.
    await floorPromise;
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
        if (password.length < PASSWORD_MIN_LENGTH) {
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

        // ── Consent enforcement (strict boolean) ──
        if (req.body.consent !== true) {
            return fail();
        }

        const existing = await findUserByEmailCaseInsensitive(emailNormalized);
        if (existing) {
            return fail();
        }

        const passwordHash = await bcrypt.hash(password, 10);

        let user;
        try {
            const consentNow = new Date();
            user = await User.create({
                email: emailNormalized,
                passwordHash,
                isVerified: true, // Magic link already proves email ownership.
                termsAcceptedAt: consentNow,
                privacyAcceptedAt: consentNow,
                termsVersion: CURRENT_TERMS_VERSION,
                privacyVersion: CURRENT_PRIVACY_VERSION,
            });
        } catch (err) {
            if (err && (err.code === 11000 || err.code === 11001)) {
                return fail();
            }
            throw err;
        }

        const consumeToken = signToken(user._id);
        res.cookie(AUTH_COOKIE_NAME, consumeToken, AUTH_COOKIE_OPTIONS);
        return res.json({ token: consumeToken });
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
    if (password.length < PASSWORD_MIN_LENGTH) {
        return res
            .status(400)
            .json({ code: "WEAK_PASSWORD", message: "Password too short" });
    }

    const tokenHash = sha256Hex(rawToken);
    const now = new Date();

    // Primary path: new flow — worker has set tokenHash + status:'active'.
    let reset = await ActivePasswordReset.findOneAndUpdate(
        { tokenHash, status: "active", usedAt: null, expiresAt: { $gt: now } },
        { $set: { usedAt: now, status: "used" } },
        { new: false },
    );

    // Legacy fallback: PasswordReset tokens issued before Slice 2+3 deployment.
    // All legacy tokens expire within 30 min of the /forgot switch; remove in next cycle.
    if (!reset) {
        reset = await PasswordReset.findOneAndUpdate(
            { tokenHash, usedAt: null, expiresAt: { $gt: now } },
            { $set: { usedAt: now } },
            { new: false },
        );
    }

    if (!reset) {
        return res.status(400).json({ message: "Unable to reset password" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const upd = await User.updateOne(
        { _id: reset.userId },
        { $set: { passwordHash, passwordChangedAt: new Date() } },
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

    const user = await User.findById(String(userId)).select(
        "email role isVerified",
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
        email: user.email,
        role: user.role,
        isVerified: Boolean(user.isVerified),
    });
});

// VERIFY EMAIL (consume verification token)
router.post("/verify-email", async (req, res) => {
    if (!rateLimitByIp(req, inMemoryVerifyEmailRate, VERIFY_EMAIL_RATE_LIMIT)) {
        return res.status(429).json({
            code: "RATE_LIMITED",
            message: "Too many requests",
        });
    }

    const rawToken = String(req.body?.token || "").trim();
    if (!rawToken) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }

    const tokenHash = sha256Hex(rawToken);
    const now = new Date();

    // Atomically mark token as used to prevent reuse.
    const consumed = await EmailVerificationToken.findOneAndUpdate(
        { tokenHash, usedAt: null, expiresAt: { $gt: now } },
        { $set: { usedAt: now } },
        { new: false },
    );

    if (!consumed) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }

    const upd = await User.updateOne(
        { _id: consumed.userId },
        { $set: { isVerified: true } },
    );

    if (!upd?.matchedCount) {
        return res.status(400).json({ message: "Unable to verify email" });
    }

    return res.json({ verified: true });
});

// RESEND VERIFICATION EMAIL (requires auth)
router.post("/resend-verification", requireAuth, async (req, res) => {
    const userId = req.user?.id || req.userId || req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Invalid token" });

    if (
        !rateLimitByIp(req, inMemoryResendVerifyRate, RESEND_VERIFY_RATE_LIMIT)
    ) {
        return res.status(429).json({
            code: "RATE_LIMITED",
            message: "Too many requests",
        });
    }

    const user = await User.findById(String(userId)).select("email isVerified");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified) {
        return res.json({ message: "Already verified" });
    }

    const siteUrl = getSiteUrl();

    // Retry once on duplicate tokenHash.
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = sha256Hex(rawToken);
        const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

        try {
            const created = await EmailVerificationToken.create({
                userId: user._id,
                tokenHash,
                expiresAt,
            });

            const verifyLink = `${siteUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;

            const sendRes = await sendVerificationEmailMailjetBestEffort({
                toEmail: user.email,
                verifyLink,
                userId: user._id,
                tokenId: created._id,
            });

            // Invalidate previous tokens only if send was attempted.
            const didAttemptSend = !sendRes?.skipped;
            if (didAttemptSend) {
                const now = new Date();
                try {
                    await EmailVerificationToken.updateMany(
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
                        "[auth] resend-verification invalidate previous tokens failed",
                        err?.message || err,
                    );
                }
            }

            break;
        } catch (err) {
            if (err && (err.code === 11000 || err.code === 11001)) {
                continue;
            }
            console.error(
                "[auth] resend-verification failed",
                err?.message || err,
            );
            break;
        }
    }

    // Anti-enumeration: always success.
    return res.json({ message: "Verification email sent" });
});

// LOGOUT — clears auth cookie unconditionally; no auth required
router.post("/logout", (req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "lax",
        path: "/",
    });
    return res.sendStatus(204);
});

export default router;
