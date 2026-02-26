import { Router } from "express";
import bcrypt from "bcrypt";
import { requireAuth } from "../middlewares/auth.middleware.js";
import User from "../models/User.model.js";
import Card from "../models/Card.model.js";
import PasswordReset from "../models/PasswordReset.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import Organization from "../models/Organization.model.js";
import OrgInvite from "../models/OrgInvite.model.js";
import {
    collectSupabasePathsFromCard,
    normalizeSupabasePaths,
} from "../utils/supabasePaths.js";
import {
    removeObjects,
    getPublicBucketName,
    getAnonPrivateBucketName,
} from "../services/supabaseStorage.js";
import { deleteCardCascade } from "../utils/cardDeleteCascade.js";

const router = Router();

/* ── Rate-limit helpers (self-contained, mirrors auth.routes pattern) ── */

const CHANGE_PW_WINDOW_MS = 10 * 60 * 1000;
const CHANGE_PW_LIMIT = 20;
const changePwRateMap = new Map();

const DELETE_ACCT_WINDOW_MS = 10 * 60 * 1000;
const DELETE_ACCT_LIMIT = 5;
const deleteAcctRateMap = new Map();

let accountSweepTick = 0;
const SWEEP_EVERY = 200;

function getClientIp(req) {
    const xf = req.headers["x-forwarded-for"];
    if (typeof xf === "string" && xf.trim()) {
        return xf.split(",")[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || "";
}

function sweepRateMap(map, now) {
    if (map.size <= 10_000) {
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

function rateLimitByIpForMap(req, map, limit, windowMs) {
    const ip = getClientIp(req);
    if (!ip) return true;

    const now = Date.now();
    accountSweepTick += 1;
    if (accountSweepTick % SWEEP_EVERY === 0) {
        sweepRateMap(changePwRateMap, now);
        sweepRateMap(deleteAcctRateMap, now);
    }

    const entry = map.get(ip);
    if (!entry || entry.resetAt <= now) {
        map.set(ip, { count: 1, resetAt: now + windowMs });
        return true;
    }

    entry.count += 1;
    return entry.count <= limit;
}

/**
 * GET /api/account/me
 * Self-service read-only account summary.
 * Returns shaped DTO — never exposes passwordHash, admin internals, or raw billing.
 */
router.get("/me", requireAuth, async (req, res) => {
    try {
        const userId = req.userId;

        const user = await User.findById(userId)
            .select("email role plan subscription createdAt")
            .lean();

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Org memberships: batch load (no N+1).
        const memberships = await OrganizationMember.find({
            userId,
            status: "active",
        })
            .select("orgId role")
            .lean();

        let orgMemberships = [];

        if (memberships.length > 0) {
            const orgIds = memberships.map((m) => m.orgId);
            const orgs = await Organization.find({
                _id: { $in: orgIds },
                isActive: true,
            })
                .select("_id slug name")
                .lean();

            const orgMap = new Map();
            for (const org of orgs) {
                orgMap.set(String(org._id), org);
            }

            orgMemberships = memberships
                .map((m) => {
                    const org = orgMap.get(String(m.orgId));
                    if (!org) return null;
                    return {
                        orgId: String(org._id),
                        orgSlug: org.slug,
                        orgName: org.name,
                        role: m.role,
                    };
                })
                .filter(Boolean);
        }

        const sub = user.subscription || {};

        return res.json({
            email: user.email,
            role: user.role,
            plan: user.plan || "free",
            subscription: {
                status: sub.status || "inactive",
                expiresAt: sub.expiresAt || null,
                provider: sub.provider || null,
            },
            orgMemberships,
            createdAt: user.createdAt || null,
        });
    } catch (err) {
        console.error("[account] GET /me failed", err?.message || err);
        return res.status(500).json({ message: "Internal error" });
    }
});

/**
 * POST /api/account/change-password
 * Self-service password change. Requires valid JWT.
 * 204 on success — no body.
 * 400 generic on any failure (wrong/missing fields, bad current pw, update fail).
 * 429 on rate limit.
 */
router.post("/change-password", requireAuth, async (req, res) => {
    try {
        if (
            !rateLimitByIpForMap(
                req,
                changePwRateMap,
                CHANGE_PW_LIMIT,
                CHANGE_PW_WINDOW_MS,
            )
        ) {
            return res
                .status(429)
                .json({ code: "RATE_LIMITED", message: "Too many requests" });
        }

        const { currentPassword, newPassword } = req.body || {};

        if (
            typeof currentPassword !== "string" ||
            !currentPassword.trim() ||
            typeof newPassword !== "string" ||
            !newPassword.trim()
        ) {
            return res
                .status(400)
                .json({ message: "Unable to change password" });
        }

        const user = await User.findById(req.userId)
            .select("passwordHash")
            .lean();
        if (!user || !user.passwordHash) {
            return res
                .status(400)
                .json({ message: "Unable to change password" });
        }

        const match = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!match) {
            return res
                .status(400)
                .json({ message: "Unable to change password" });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        const result = await User.updateOne(
            { _id: req.userId },
            { $set: { passwordHash: newHash } },
        );

        if (!result || result.modifiedCount < 1) {
            return res
                .status(400)
                .json({ message: "Unable to change password" });
        }

        // Best-effort: invalidate outstanding password-reset tokens.
        try {
            const now = new Date();
            await PasswordReset.updateMany(
                { userId: req.userId, usedAt: null, expiresAt: { $gt: now } },
                { $set: { usedAt: now } },
            );
        } catch (_) {
            // Ignore — must not break the 204.
        }

        return res.status(204).end();
    } catch (err) {
        console.error(
            "[account] POST /change-password failed",
            err?.message || err,
        );
        return res.status(400).json({ message: "Unable to change password" });
    }
});

/**
 * POST /api/account/delete-account
 * Self-service permanent account deletion.
 * 204 on success (no body).
 * 409 { code:"SOLE_ORG_ADMIN", orgs } when user is the sole admin of any org.
 * 400 generic on any other failure.
 * 429 on rate limit.
 */
router.post("/delete-account", requireAuth, async (req, res) => {
    try {
        if (
            !rateLimitByIpForMap(
                req,
                deleteAcctRateMap,
                DELETE_ACCT_LIMIT,
                DELETE_ACCT_WINDOW_MS,
            )
        ) {
            return res
                .status(429)
                .json({ code: "RATE_LIMITED", message: "Too many requests" });
        }

        const { confirm, password } = req.body || {};

        if (
            typeof confirm !== "string" ||
            confirm.trim() !== "מחיקה" ||
            typeof password !== "string" ||
            !password.trim()
        ) {
            return res
                .status(400)
                .json({ message: "Unable to delete account" });
        }

        // Load user — minimal fields.
        const user = await User.findById(req.userId)
            .select("role passwordHash")
            .lean();

        // Idempotent: user already gone → 204.
        if (!user) {
            return res.status(204).end();
        }

        // Admin accounts cannot self-delete.
        if (user.role === "admin") {
            return res
                .status(400)
                .json({ message: "Unable to delete account" });
        }

        // Verify password.
        if (!user.passwordHash) {
            return res
                .status(400)
                .json({ message: "Unable to delete account" });
        }
        const pwMatch = await bcrypt.compare(password, user.passwordHash);
        if (!pwMatch) {
            return res
                .status(400)
                .json({ message: "Unable to delete account" });
        }

        // ── Sole-org-admin guard (P0, batch, no N+1) ──
        const adminMemberships = await OrganizationMember.find({
            userId: req.userId,
            role: "admin",
            status: "active",
        })
            .select("orgId")
            .lean();

        if (adminMemberships.length > 0) {
            const adminOrgIds = adminMemberships.map((m) => m.orgId);

            // Count active admins per org (single aggregate, no N+1).
            const adminCounts = await OrganizationMember.aggregate([
                {
                    $match: {
                        orgId: { $in: adminOrgIds },
                        role: "admin",
                        status: "active",
                    },
                },
                { $group: { _id: "$orgId", n: { $sum: 1 } } },
            ]);

            const soleAdminOrgIds = adminCounts
                .filter((g) => g.n === 1)
                .map((g) => g._id);

            if (soleAdminOrgIds.length > 0) {
                const orgs = await Organization.find({
                    _id: { $in: soleAdminOrgIds },
                })
                    .select("_id slug name")
                    .lean();

                return res.status(409).json({
                    code: "SOLE_ORG_ADMIN",
                    orgs: orgs.map((o) => ({
                        orgId: String(o._id),
                        orgSlug: o.slug,
                        orgName: o.name,
                    })),
                });
            }
        }

        // ── Delete all user's cards (Supabase-first) ──
        const cards = await Card.find({ user: req.userId });

        for (const card of cards) {
            // Supabase media first — abort entirely on failure.
            const rawPaths = collectSupabasePathsFromCard(card);
            const paths = normalizeSupabasePaths(rawPaths);

            if (paths.length) {
                const isAnonymousOwned =
                    !card?.user && Boolean(card?.anonymousId);
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

                try {
                    await removeObjects({ paths, buckets });
                } catch (_) {
                    // Supabase failed — abort. Keep user + cards for retry.
                    return res
                        .status(400)
                        .json({ message: "Unable to delete account" });
                }
            }

            // Cascade: Leads + CardAnalyticsDaily.
            try {
                await deleteCardCascade({ cardId: card._id });
            } catch (_) {
                // Non-fatal for user-delete: media already gone, continue.
            }

            await Card.deleteOne({ _id: card._id });
        }

        // ── Cleanup memberships + pending invites ──
        await Promise.all([
            OrganizationMember.deleteMany({ userId: req.userId }),
            OrgInvite.deleteMany({
                createdByUserId: req.userId,
                revokedAt: null,
                usedAt: null,
            }),
        ]);

        // ── Best-effort token cleanup ──
        try {
            await PasswordReset.deleteMany({ userId: req.userId });
        } catch (_) {
            // Ignore.
        }

        // ── Delete user ──
        await User.deleteOne({ _id: req.userId });

        return res.status(204).end();
    } catch (err) {
        console.error(
            "[account] POST /delete-account failed",
            err?.message || err,
        );
        return res.status(400).json({ message: "Unable to delete account" });
    }
});

export default router;
