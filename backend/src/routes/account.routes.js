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
import { createEmailBlock } from "../utils/emailBlock.util.js";
import {
    createMarketingOptOut,
    removeMarketingOptOut,
} from "../utils/marketingOptOut.util.js";
import { CURRENT_MARKETING_CONSENT_VERSION } from "../utils/consentVersions.js";
import { cancelTranzilaStoForUser } from "../services/payment/tranzila.provider.js";

const router = Router();

/* ── Rate-limit helpers (self-contained, mirrors auth.routes pattern) ── */

const CHANGE_PW_WINDOW_MS = 10 * 60 * 1000;
const CHANGE_PW_LIMIT = 20;
const changePwRateMap = new Map();

const DELETE_ACCT_WINDOW_MS = 10 * 60 * 1000;
const DELETE_ACCT_LIMIT = 5;
const deleteAcctRateMap = new Map();

const EMAIL_PREF_WINDOW_MS = 10 * 60 * 1000;
const EMAIL_PREF_LIMIT = 20;
const emailPrefRateMap = new Map();

const NAME_UPDATE_WINDOW_MS = 10 * 60 * 1000;
const NAME_UPDATE_LIMIT = 10;
const nameUpdateRateMap = new Map();

const CANCEL_RENEWAL_WINDOW_MS = 10 * 60 * 1000;
const CANCEL_RENEWAL_LIMIT = 3;
const cancelRenewalRateMap = new Map();

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

/**
 * Derive a safe, sanitized autoRenewal DTO from a user document.
 * Never exposes stoId, token fields, or raw provider data.
 * Accepts both lean and non-lean user documents (accesses plain JS properties).
 */
function buildAutoRenewalDto(user) {
    const sto = user?.tranzilaSto ?? null;
    const stoStatus = sto?.status ?? null;
    const hasId = Boolean(sto?.stoId);

    let status = "none";
    if (stoStatus === "cancelled") status = "cancelled";
    else if (stoStatus === "created" && hasId) status = "active";
    else if (stoStatus === "pending") status = "pending";
    else if (stoStatus === "failed") status = "failed";

    return {
        status,
        canCancel: status === "active",
        cancelledAtPresent: Boolean(sto?.cancelledAt),
        subscriptionExpiresAt: user?.subscription?.expiresAt ?? null,
    };
}

function rateLimitByIpForMap(req, map, limit, windowMs) {
    const ip = getClientIp(req);
    if (!ip) return true;

    const now = Date.now();
    accountSweepTick += 1;
    if (accountSweepTick % SWEEP_EVERY === 0) {
        sweepRateMap(changePwRateMap, now);
        sweepRateMap(deleteAcctRateMap, now);
        sweepRateMap(emailPrefRateMap, now);
        sweepRateMap(nameUpdateRateMap, now);
        sweepRateMap(cancelRenewalRateMap, now);
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
 * Returns shaped DTO - never exposes passwordHash, admin internals, or raw billing.
 */
router.get("/me", requireAuth, async (req, res) => {
    try {
        const userId = req.userId;

        const user = await User.findById(userId)
            .select(
                "firstName email role plan subscription createdAt emailMarketingConsent emailMarketingConsentAt emailMarketingConsentVersion emailMarketingConsentSource tranzilaSto.status tranzilaSto.stoId tranzilaSto.cancelledAt",
            )
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
            firstName: user.firstName ?? null,
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
            emailMarketingConsent: user.emailMarketingConsent ?? null,
            emailMarketingConsentAt: user.emailMarketingConsentAt || null,
            emailMarketingConsentVersion:
                user.emailMarketingConsentVersion || null,
            emailMarketingConsentSource:
                user.emailMarketingConsentSource || null,
            autoRenewal: buildAutoRenewalDto(user),
        });
    } catch (err) {
        console.error("[account] GET /me failed", err?.message || err);
        return res.status(500).json({ message: "Internal error" });
    }
});

/**
 * PATCH /api/account/email-preferences
 * Update the authenticated user's marketing email consent.
 * 200 { emailMarketingConsent, emailMarketingConsentAt, emailMarketingConsentVersion, emailMarketingConsentSource }
 * 400 on invalid payload.
 * 429 on rate limit.
 *
 * Allowed sources: "settings_panel" (default when absent), "editor_sidebar".
 * Opt-out (false) → creates suppression tombstone.
 * Opt-in (true)   → removes suppression tombstone.
 */
router.patch("/email-preferences", requireAuth, async (req, res) => {
    try {
        if (
            !rateLimitByIpForMap(
                req,
                emailPrefRateMap,
                EMAIL_PREF_LIMIT,
                EMAIL_PREF_WINDOW_MS,
            )
        ) {
            return res
                .status(429)
                .json({ code: "RATE_LIMITED", message: "Too many requests" });
        }

        const { emailMarketingConsent, source } = req.body || {};

        if (typeof emailMarketingConsent !== "boolean") {
            return res
                .status(400)
                .json({ message: "emailMarketingConsent must be a boolean" });
        }

        const ALLOWED_SOURCES = new Set(["settings_panel", "editor_sidebar"]);

        let resolvedSource;
        if (source === undefined || source === null) {
            resolvedSource = "settings_panel";
        } else if (typeof source === "string" && ALLOWED_SOURCES.has(source)) {
            resolvedSource = source;
        } else {
            return res.status(400).json({ message: "Invalid source value" });
        }

        const now = new Date();

        const updated = await User.findByIdAndUpdate(
            req.userId,
            {
                $set: {
                    emailMarketingConsent,
                    emailMarketingConsentAt: now,
                    emailMarketingConsentVersion:
                        CURRENT_MARKETING_CONSENT_VERSION,
                    emailMarketingConsentSource: resolvedSource,
                },
            },
            {
                new: true,
                select: "email emailMarketingConsent emailMarketingConsentAt emailMarketingConsentVersion emailMarketingConsentSource",
            },
        );

        if (!updated) {
            return res.status(404).json({ message: "User not found" });
        }

        const normalizedEmail = (updated.email || "").trim().toLowerCase();

        if (emailMarketingConsent === false) {
            try {
                await createMarketingOptOut({
                    normalizedEmail,
                    userId: req.userId,
                });
            } catch (err) {
                console.error(
                    "[account] PATCH /email-preferences: suppression write failed",
                    err?.message || err,
                );
                // Non-fatal: preference is saved; log and continue.
            }
        } else {
            try {
                await removeMarketingOptOut({ normalizedEmail });
            } catch (err) {
                console.error(
                    "[account] PATCH /email-preferences: suppression remove failed",
                    err?.message || err,
                );
                // Non-fatal: preference is saved; log and continue.
            }
        }

        return res.json({
            emailMarketingConsent: updated.emailMarketingConsent,
            emailMarketingConsentAt: updated.emailMarketingConsentAt,
            emailMarketingConsentVersion: updated.emailMarketingConsentVersion,
            emailMarketingConsentSource: updated.emailMarketingConsentSource,
        });
    } catch (err) {
        console.error(
            "[account] PATCH /email-preferences failed",
            err?.message || err,
        );
        return res.status(500).json({ message: "Internal error" });
    }
});

/**
 * PATCH /api/account/name
 * Update the authenticated user's first name.
 * 200 { firstName } on success.
 * 400 on validation failure.
 * 429 on rate limit.
 */
router.patch("/name", requireAuth, async (req, res) => {
    try {
        if (
            !rateLimitByIpForMap(
                req,
                nameUpdateRateMap,
                NAME_UPDATE_LIMIT,
                NAME_UPDATE_WINDOW_MS,
            )
        ) {
            return res
                .status(429)
                .json({ code: "RATE_LIMITED", message: "Too many requests" });
        }

        const rawFirstName = req.body?.firstName;
        if (typeof rawFirstName !== "string") {
            return res.status(400).json({ message: "Invalid first name" });
        }
        const firstName = rawFirstName.trim();
        if (!firstName) {
            return res.status(400).json({ message: "First name is required" });
        }
        if (firstName.length > 100) {
            return res.status(400).json({ message: "First name too long" });
        }

        const updated = await User.findByIdAndUpdate(
            req.userId,
            { $set: { firstName } },
            { new: true, select: "firstName" },
        );

        if (!updated) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json({ firstName: updated.firstName });
    } catch (err) {
        console.error("[account] PATCH /name failed", err?.message || err);
        return res.status(500).json({ message: "Internal error" });
    }
});

/**
 * POST /api/account/change-password
 * Self-service password change. Requires valid JWT.
 * 204 on success - no body.
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
        if (newPassword.length < 8) {
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
            { $set: { passwordHash: newHash, passwordChangedAt: new Date() } },
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
            // Ignore - must not break the 204.
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

        // Load user - minimal fields + email for tombstone.
        const user = await User.findById(req.userId)
            .select("email role passwordHash")
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

        // ── Tombstone-first: permanent email re-registration block ──
        // Must succeed BEFORE any destructive side effects.
        const normalizedEmail = (user.email || "").trim().toLowerCase();
        if (!normalizedEmail) {
            return res
                .status(400)
                .json({ message: "Unable to delete account" });
        }
        try {
            await createEmailBlock({
                normalizedEmail,
                formerUserId: req.userId,
            });
        } catch (err) {
            console.error(
                "[account] tombstone write failed",
                err?.message || err,
            );
            return res
                .status(400)
                .json({ message: "Unable to delete account" });
        }

        // ── Delete all user's cards (Supabase-first) ──
        const cards = await Card.find({ user: req.userId });

        for (const card of cards) {
            // Supabase media first - abort entirely on failure.
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
                    // Supabase failed - abort. Keep user + cards for retry.
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

/**
 * POST /api/account/cancel-renewal
 * Self-service cancellation of automatic premium renewal (Tranzila STO).
 *
 * Business behavior:
 *   - Cancels future recurring STO charges only.
 *   - Does NOT downgrade immediately.
 *   - Does NOT change subscription.expiresAt or Card.billing.paidUntil.
 *   - Does NOT create a PaymentTransaction.
 *   - Does NOT refund.
 *   - Idempotent: already-cancelled returns 200, not an error.
 *
 * Security:
 *   - requireAuth mandatory; user derived from req.userId only.
 *   - No userId/email/stoId accepted from request body.
 *   - Response never contains stoId, token, providerTxnId, or raw provider data.
 *
 * Rate limit: 3 requests per 10 minutes per user (prevents STO provider abuse).
 */
router.post("/cancel-renewal", requireAuth, async (req, res) => {
    try {
        // ── Rate limit by userId (authenticated, not IP) ──────────────────────
        const userId = String(req.userId);
        const now = Date.now();

        const rlEntry = cancelRenewalRateMap.get(userId);
        if (!rlEntry || rlEntry.resetAt <= now) {
            cancelRenewalRateMap.set(userId, {
                count: 1,
                resetAt: now + CANCEL_RENEWAL_WINDOW_MS,
            });
        } else {
            rlEntry.count += 1;
            if (rlEntry.count > CANCEL_RENEWAL_LIMIT) {
                return res.status(429).json({
                    ok: false,
                    messageKey: "renewal_cancel_rate_limited",
                });
            }
        }

        // ── Load full Mongoose document (non-lean — cancelTranzilaStoForUser calls user.save()) ──
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                ok: false,
                renewalStatus: "user_not_found",
                messageKey: "account_not_found",
            });
        }

        // ── Derive current renewal state ──────────────────────────────────────
        const autoRenewal = buildAutoRenewalDto(user);

        // ── State machine ─────────────────────────────────────────────────────

        if (autoRenewal.status === "cancelled") {
            return res.status(200).json({
                ok: true,
                renewalStatus: "already_cancelled",
                autoRenewal,
                messageKey: "renewal_already_cancelled",
            });
        }

        if (autoRenewal.status === "none") {
            return res.status(200).json({
                ok: true,
                renewalStatus: "no_active_renewal",
                autoRenewal,
                messageKey: "no_active_renewal",
            });
        }

        if (
            autoRenewal.status === "pending" ||
            autoRenewal.status === "failed"
        ) {
            return res.status(409).json({
                ok: false,
                renewalStatus: "cancel_unavailable",
                autoRenewal,
                messageKey: "renewal_cancel_unavailable",
            });
        }

        // ── Active STO — call provider cancellation ───────────────────────────
        // cancelTranzilaStoForUser mutates user.tranzilaSto in-place and calls user.save()
        // only after provider confirms cancellation. subscription.expiresAt and Card.billing
        // are intentionally NOT touched.
        const result = await cancelTranzilaStoForUser(user, {
            source: "self_service",
            reason: "user_cancel_renewal",
        });

        if (result.ok === true) {
            return res.status(200).json({
                ok: true,
                renewalStatus: result.skipped
                    ? "already_cancelled"
                    : "cancelled",
                autoRenewal: buildAutoRenewalDto(user),
                messageKey: result.skipped
                    ? "renewal_already_cancelled"
                    : "renewal_cancelled",
            });
        }

        // Provider returned ok:false (network/parse/HTTP error)
        return res.status(502).json({
            ok: false,
            renewalStatus: "cancel_failed",
            autoRenewal,
            messageKey: "renewal_cancel_failed",
        });
    } catch (err) {
        console.error(
            "[account] POST /cancel-renewal failed",
            err?.message || err,
        );
        return res.status(500).json({
            ok: false,
            renewalStatus: "cancel_failed",
            messageKey: "renewal_cancel_failed",
        });
    }
});

export default router;
