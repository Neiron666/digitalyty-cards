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
import ActivePasswordReset from "../models/ActivePasswordReset.model.js";
import MailJob from "../models/MailJob.model.js";
import EmailVerificationToken from "../models/EmailVerificationToken.model.js";
import EmailSignupToken from "../models/EmailSignupToken.model.js";
import Receipt from "../models/Receipt.model.js";
import { isValidObjectId } from "../utils/orgMembership.util.js";

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

const RECEIPTS_LIST_WINDOW_MS = 10 * 60 * 1000;
const RECEIPTS_LIST_LIMIT = 30;
const receiptsListRateMap = new Map();

const RECEIPTS_DL_WINDOW_MS = 10 * 60 * 1000;
const RECEIPTS_DL_LIMIT = 20;
const receiptsDownloadRateMap = new Map();

const RECEIPT_PROFILE_WINDOW_MS = 10 * 60 * 1000;
const RECEIPT_PROFILE_LIMIT = 10;
const receiptProfileRateMap = new Map();

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
        // [5.10a.3.1] Renewal failure signal. ISO timestamp or null. Never boolean.
        renewalFailedAt: user?.renewalFailedAt ?? null,
    };
}

/**
 * Build a masked receipt profile DTO for the owning user.
 * Returns null if user.receiptProfile does not exist or no meaningful fields are set.
 * NEVER returns raw numberId.
 */
function buildReceiptProfileDto(user) {
    const rp = user?.receiptProfile ?? null;
    if (!rp) return null;

    const MEANINGFUL = [
        "recipientType",
        "name",
        "nameInvoice",
        "fullName",
        "numberId",
        "email",
        "address",
        "city",
        "zipCode",
        "countryCode",
    ];
    const hasAny = MEANINGFUL.some(
        (f) => rp[f] !== null && rp[f] !== undefined && rp[f] !== "",
    );
    if (!hasAny) return null;

    // Mask rule: no value → null; length ≤ 4 → "***"; length > 4 → "***" + last 4
    const rawId = rp.numberId ?? null;
    let numberIdMasked = null;
    if (rawId !== null && rawId !== "") {
        numberIdMasked = rawId.length <= 4 ? "***" : "***" + rawId.slice(-4);
    }

    return {
        recipientType: rp.recipientType ?? null,
        name: rp.name ?? null,
        nameInvoice: rp.nameInvoice ?? null,
        fullName: rp.fullName ?? null,
        numberIdMasked,
        email: rp.email ?? null,
        address: rp.address ?? null,
        city: rp.city ?? null,
        zipCode: rp.zipCode ?? null,
        countryCode: rp.countryCode ?? null,
        updatedAt: rp.updatedAt ?? null,
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
        sweepRateMap(receiptsListRateMap, now);
        sweepRateMap(receiptsDownloadRateMap, now);
        sweepRateMap(receiptProfileRateMap, now);
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
                "firstName email role plan subscription createdAt emailMarketingConsent emailMarketingConsentAt emailMarketingConsentVersion emailMarketingConsentSource tranzilaSto.status tranzilaSto.stoId tranzilaSto.cancelledAt renewalFailedAt receiptProfile",
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
            receiptProfile: buildReceiptProfileDto(user),
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
 * PATCH /api/account/receipt-profile
 * Partial update of the authenticated user's receipt billing profile.
 * Only submitted ALLOWED fields are written. Absent fields are untouched.
 * Sending field: null explicitly clears that field.
 * Empty string is normalized to null.
 * Raw numberId is never returned. Masked form (numberIdMasked) only.
 * 200 { receiptProfile } on success.
 * 400 on validation failure or no valid fields provided.
 * 429 on rate limit.
 */
router.patch("/receipt-profile", requireAuth, async (req, res) => {
    try {
        if (
            !rateLimitByIpForMap(
                req,
                receiptProfileRateMap,
                RECEIPT_PROFILE_LIMIT,
                RECEIPT_PROFILE_WINDOW_MS,
            )
        ) {
            return res
                .status(429)
                .json({ code: "RATE_LIMITED", message: "Too many requests" });
        }

        const body = req.body;

        // Reject non-plain-object bodies
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
            return res.status(400).json({ message: "Invalid request body" });
        }

        // Security: reject any body key containing "." or "$" (MongoDB injection guard)
        for (const key of Object.keys(body)) {
            if (key.includes(".") || key.includes("$")) {
                return res.status(400).json({ message: "Invalid field name" });
            }
        }

        const ALLOWED = [
            "recipientType",
            "name",
            "nameInvoice",
            "fullName",
            "numberId",
            "email",
            "address",
            "city",
            "zipCode",
            "countryCode",
        ];

        const updates = {};

        for (const field of ALLOWED) {
            if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
            const raw = body[field];

            // null = explicit clear
            if (raw === null) {
                updates[`receiptProfile.${field}`] = null;
                continue;
            }

            if (field === "recipientType") {
                const trimmed =
                    typeof raw === "string" ? raw.trim() : undefined;
                if (trimmed === undefined) {
                    return res.status(400).json({
                        message: "recipientType must be a string or null",
                    });
                }
                if (trimmed === "") {
                    updates["receiptProfile.recipientType"] = null;
                    continue;
                }
                if (trimmed !== "private" && trimmed !== "business") {
                    return res
                        .status(400)
                        .json({ message: "Invalid recipientType" });
                }
                updates["receiptProfile.recipientType"] = trimmed;
                continue;
            }

            // All remaining fields must be strings
            if (typeof raw !== "string") {
                return res
                    .status(400)
                    .json({ message: `${field} must be a string or null` });
            }

            const trimmed = raw.trim();

            // Empty string normalizes to null
            if (trimmed === "") {
                updates[`receiptProfile.${field}`] = null;
                continue;
            }

            if (
                field === "name" ||
                field === "nameInvoice" ||
                field === "fullName"
            ) {
                if (trimmed.length > 200) {
                    return res
                        .status(400)
                        .json({ message: `${field} too long` });
                }
                updates[`receiptProfile.${field}`] = trimmed;
            } else if (field === "numberId") {
                if (trimmed.length > 32) {
                    return res
                        .status(400)
                        .json({ message: "numberId too long" });
                }
                if (!/^[a-zA-Z0-9-]*$/.test(trimmed)) {
                    return res
                        .status(400)
                        .json({ message: "Invalid numberId format" });
                }
                updates["receiptProfile.numberId"] = trimmed;
            } else if (field === "email") {
                if (trimmed.length > 200) {
                    return res.status(400).json({ message: "email too long" });
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                    return res
                        .status(400)
                        .json({ message: "Invalid email format" });
                }
                updates["receiptProfile.email"] = trimmed.toLowerCase();
            } else if (field === "address") {
                if (trimmed.length > 300) {
                    return res
                        .status(400)
                        .json({ message: "address too long" });
                }
                updates["receiptProfile.address"] = trimmed;
            } else if (field === "city") {
                if (trimmed.length > 100) {
                    return res.status(400).json({ message: "city too long" });
                }
                updates["receiptProfile.city"] = trimmed;
            } else if (field === "zipCode") {
                if (trimmed.length > 20) {
                    return res
                        .status(400)
                        .json({ message: "zipCode too long" });
                }
                updates["receiptProfile.zipCode"] = trimmed;
            } else if (field === "countryCode") {
                if (trimmed.length > 5) {
                    return res
                        .status(400)
                        .json({ message: "countryCode too long" });
                }
                updates["receiptProfile.countryCode"] = trimmed.toUpperCase();
            }
        }

        // Guard: at least one ALLOWED field must be present
        if (Object.keys(updates).length === 0) {
            return res
                .status(400)
                .json({ message: "No updatable fields provided" });
        }

        // Stamp updatedAt only when actual field updates are present
        updates["receiptProfile.updatedAt"] = new Date();

        const updated = await User.findByIdAndUpdate(
            req.userId,
            { $set: updates },
            { new: true, select: "receiptProfile" },
        );

        if (!updated) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json({
            receiptProfile: buildReceiptProfileDto(updated),
        });
    } catch (err) {
        console.error(
            "[account] PATCH /receipt-profile failed",
            err?.message || err,
        );
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

        // ── STO cancellation: after tombstone, before card cascade ───────────
        // NOTE: skipped:true is safe — must check both ok and skipped.
        const userForSto = await User.findById(req.userId).select(
            "tranzilaSto",
        );
        if (userForSto) {
            const stoResult = await cancelTranzilaStoForUser(userForSto, {
                source: "self_delete",
                reason: "account_deleted",
            });
            if (!stoResult.ok && !stoResult.skipped) {
                return res
                    .status(400)
                    .json({ message: "Unable to delete account" });
            }
        }

        // ── Auth/job cleanup: before card cascade and User.deleteOne ─────────────
        // Hard-block — stale tokens/jobs for a deleted user are unacceptable.
        // Order: MailJob → auth tokens → User.deleteOne.
        try {
            await MailJob.deleteMany({ userId: req.userId });
            await EmailVerificationToken.deleteMany({ userId: req.userId });
            if (normalizedEmail) {
                await EmailSignupToken.deleteMany({
                    emailNormalized: normalizedEmail,
                });
            }
            await PasswordReset.deleteMany({ userId: req.userId });
            await ActivePasswordReset.deleteMany({ userId: req.userId });
        } catch (err) {
            console.error(
                "[account] auth/job cleanup failed",
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

/**
 * GET /api/account/receipts
 * Self-service cabinet: returns a paginated list of issued receipts for the authenticated user.
 * Reads Receipt model only — does not expose PaymentTransaction fields.
 * Only receipts with status="created" are returned (failed/skipped are not user-facing in MVP).
 */
router.get("/receipts", requireAuth, async (req, res) => {
    try {
        if (
            !rateLimitByIpForMap(
                req,
                receiptsListRateMap,
                RECEIPTS_LIST_LIMIT,
                RECEIPTS_LIST_WINDOW_MS,
            )
        ) {
            return res
                .status(429)
                .json({ code: "RATE_LIMITED", message: "Too many requests" });
        }

        const rawLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
        const clampedLimit = Number.isFinite(rawLimit)
            ? Math.min(Math.max(rawLimit, 1), 20)
            : 10;

        const filter = { userId: req.userId, status: "created" };

        const [rawDocs, total] = await Promise.all([
            Receipt.find(filter)
                .select(
                    "_id plan amountAgorot issuedAt createdAt pdfUrl shareStatus sharedAt",
                )
                .sort({ createdAt: -1 })
                .limit(clampedLimit + 1)
                .lean(),
            Receipt.countDocuments(filter),
        ]);

        const hasMore = rawDocs.length > clampedLimit;
        const docs = rawDocs.slice(0, clampedLimit);

        const receipts = docs.map((doc) => ({
            id: String(doc._id),
            createdAt: doc.createdAt ?? null,
            issuedAt: doc.issuedAt ?? null,
            amountAgorot: doc.amountAgorot ?? null,
            plan: doc.plan ?? null,
            status: "created",
            shareStatus: doc.shareStatus ?? null,
            hasPdf: Boolean(doc.pdfUrl),
        }));

        return res.json({ receipts, hasMore, total });
    } catch (err) {
        console.error("[account] GET /receipts failed", err?.message || err);
        return res.status(500).json({ message: "Internal error" });
    }
});

/**
 * GET /api/account/receipts/:id/download
 * Backend-proxy receipt download. Fetches the PDF from the provider server-side;
 * never exposes provider URL, query-string tokens, or internal fields to the client.
 * Ownership-by-query: Receipt.findOne({ _id, userId, status }) ensures anti-enumeration.
 */
router.get("/receipts/:id/download", requireAuth, async (req, res) => {
    try {
        // 1. IP rate-limit
        if (
            !rateLimitByIpForMap(
                req,
                receiptsDownloadRateMap,
                RECEIPTS_DL_LIMIT,
                RECEIPTS_DL_WINDOW_MS,
            )
        ) {
            return res
                .status(429)
                .json({ code: "RATE_LIMITED", message: "Too many requests" });
        }

        // 2. ObjectId validation — invalid id → 404, not 500/CastError
        const receiptId = req.params.id;
        if (!isValidObjectId(receiptId)) {
            return res.status(404).json({ message: "Not found" });
        }

        // 3. Ownership-by-query: single query with userId + status in filter
        //    Minimal select — no pdfUrl in any outbound JSON
        const receipt = await Receipt.findOne({
            _id: receiptId,
            userId: req.userId,
            status: "created",
        })
            .select("_id pdfUrl")
            .lean();

        // 4. Missing / wrong-owner / wrong-status → 404 (anti-enumeration)
        if (!receipt) {
            return res.status(404).json({ message: "Not found" });
        }

        // 5. No PDF issued yet → 404
        if (!receipt.pdfUrl) {
            return res.status(404).json({ message: "Not found" });
        }

        // 6–8. Backend proxy: fetch provider PDF server-side.
        //      All provider retrieval failures → 502.
        //      pdfUrl is never forwarded to the client.
        let upstream;
        let buf;
        try {
            upstream = await fetch(receipt.pdfUrl, {
                signal: AbortSignal.timeout(10_000),
            });

            if (!upstream.ok) {
                console.error(
                    "[account] GET /receipts/:id/download upstream not ok",
                    {
                        userId: String(req.userId),
                        receiptId,
                        upstreamStatus: upstream.status,
                    },
                );
                return res
                    .status(502)
                    .json({ message: "Document unavailable" });
            }

            buf = Buffer.from(await upstream.arrayBuffer());
        } catch (fetchErr) {
            console.error(
                "[account] GET /receipts/:id/download upstream fetch failed",
                {
                    userId: String(req.userId),
                    receiptId,
                    failReason: String(fetchErr?.name ?? "unknown").slice(
                        0,
                        80,
                    ),
                },
            );
            return res.status(502).json({ message: "Document unavailable" });
        }

        // 9. Stream PDF bytes to client with safe headers
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="receipt.pdf"',
        );
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.send(buf);
    } catch (err) {
        console.error(
            "[account] GET /receipts/:id/download failed",
            err?.message || err,
        );
        return res.status(500).json({ message: "Internal error" });
    }
});

export default router;
