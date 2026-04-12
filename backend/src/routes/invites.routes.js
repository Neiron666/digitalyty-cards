import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";

import OrgInvite from "../models/OrgInvite.model.js";
import OrgInviteAudit from "../models/OrgInviteAudit.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import Organization from "../models/Organization.model.js";
import User from "../models/User.model.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { signToken } from "../utils/jwt.js";
import { getOrgSeatUsage } from "../utils/orgSeats.util.js";
import {
    CURRENT_TERMS_VERSION,
    CURRENT_PRIVACY_VERSION,
    CURRENT_MARKETING_CONSENT_VERSION,
} from "../utils/consentVersions.js";
import { isEmailBlocked } from "../utils/emailBlock.util.js";

const router = Router();

const IS_PROD = process.env.NODE_ENV === "production";
const AUTH_COOKIE_NAME = IS_PROD ? "__Host-cardigo_auth" : "cardigo_auth";
const AUTH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms - matches JWT expiresIn:"7d"
};

function normalizeEmail(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
}

function isValidEmail(value) {
    const email = normalizeEmail(value);
    if (!email) return false;
    if (email.length > 254) return false;
    return email.includes("@") && !email.includes(" ");
}

function notFound(res) {
    return res.status(404).json({ message: "Not found" });
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

router.post("/accept", optionalAuth, async (req, res) => {
    const token =
        typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const password = req.body?.password;

    if (!token) return notFound(res);

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date();

    // Preflight: do NOT consume invite until we're sure we can proceed.
    const preflight = await OrgInvite.findOne({
        tokenHash,
        revokedAt: null,
        usedAt: null,
        expiresAt: { $gt: now },
    })
        .select("orgId email role")
        .lean();

    if (!preflight) return notFound(res);

    const email = normalizeEmail(preflight.email);
    if (!isValidEmail(email)) return notFound(res);

    const org = await Organization.findOne({
        _id: preflight.orgId,
        isActive: true,
    })
        .select("_id slug seatLimit")
        .lean();

    if (!org?._id) return notFound(res);

    if (org?.seatLimit) {
        const seatUsage = await getOrgSeatUsage({ orgId: org._id, now });
        // Canonical enterprise rule is: usedSeats >= seatLimit => reject.
        // But for public accept, the current invite is still pending and already
        // counted in usedSeats (pendingInvites), so exclude it.
        const effectiveUsedSeats = Math.max(
            0,
            Number(seatUsage.usedSeats || 0) - 1,
        );

        if (effectiveUsedSeats >= Number(org.seatLimit)) {
            // Anti-enumeration: behave like token invalid/expired.
            return notFound(res);
        }
    }

    let user = await findUserByEmailCaseInsensitive(email);

    // Existing-user enterprise policy:
    // - Do not accept "new password" input for existing accounts.
    // - Require login to accept invite.
    // - If logged-in user does not match invite email => anti-enum 404.
    if (user) {
        const authUserId = req?.userId ? String(req.userId) : "";
        if (!authUserId) {
            return res.status(409).json({
                code: "INVITE_LOGIN_REQUIRED",
                message: "Login required",
            });
        }

        if (String(user._id) !== authUserId) {
            return notFound(res);
        }
    }

    // Enterprise hardening: if this invite would create a new user,
    // require a password + consent BEFORE consuming the invite.
    if (
        !user &&
        (typeof password !== "string" || !password || password.length < 8)
    ) {
        return notFound(res);
    }
    if (!user && req.body.consent !== true) {
        return notFound(res);
    }

    // Claim invite (single-use): only after the preflight checks.
    const invite = await OrgInvite.findOneAndUpdate(
        {
            tokenHash,
            revokedAt: null,
            usedAt: null,
            expiresAt: { $gt: now },
        },
        { $set: { usedAt: now } },
        {
            new: true,
            select: "orgId email role expiresAt revokedAt usedAt",
        },
    ).lean();

    if (!invite) return notFound(res);

    if (!user) {
        // Blocked-email guard: permanently deleted accounts cannot be re-created via invite.
        if (await isEmailBlocked(email)) {
            return notFound(res);
        }

        const passwordHash = await bcrypt.hash(password, 10);

        try {
            const consentNow = new Date();
            const mktConsent = req.body.marketingConsent === true;
            user = await User.create({
                email,
                passwordHash,
                isVerified: true,
                termsAcceptedAt: consentNow,
                privacyAcceptedAt: consentNow,
                termsVersion: CURRENT_TERMS_VERSION,
                privacyVersion: CURRENT_PRIVACY_VERSION,
                ...(mktConsent
                    ? {
                          emailMarketingConsent: true,
                          emailMarketingConsentAt: consentNow,
                          emailMarketingConsentVersion:
                              CURRENT_MARKETING_CONSENT_VERSION,
                          emailMarketingConsentSource: "invite_accept",
                      }
                    : {}),
            });
        } catch (err) {
            if (err && (err.code === 11000 || err.code === 11001)) {
                user = await findUserByEmailCaseInsensitive(email);
            }
            if (!user) throw err;
        }
    }

    const userId = String(user._id);

    const existing = await OrganizationMember.findOne({
        orgId: org._id,
        userId,
    })
        .select("_id status role")
        .lean();

    if (!existing?._id) {
        try {
            await OrganizationMember.create({
                orgId: org._id,
                userId,
                role: invite.role || "member",
                status: "active",
            });
        } catch (err) {
            if (!(err && (err.code === 11000 || err.code === 11001))) throw err;
            // Idempotency: if someone created it concurrently, continue.
        }
    } else {
        const $set = {};
        if (existing.status !== "active") $set.status = "active";
        const nextRole = invite.role || "member";
        if (existing.role !== nextRole) $set.role = nextRole;
        if (Object.keys($set).length) {
            await OrganizationMember.updateOne({ _id: existing._id }, { $set });
        }
    }

    try {
        await OrgInviteAudit.create({
            eventType: "INVITE_ACCEPTED",
            orgId: org._id,
            inviteId: invite._id,
            emailNormalized: email,
            actorUserId: user._id,
        });
    } catch (err) {
        console.error("[audit] invite accept failed", err?.message || err);
    }

    const acceptToken = signToken(user._id);
    res.cookie(AUTH_COOKIE_NAME, acceptToken, AUTH_COOKIE_OPTIONS);
    return res.json({
        ok: true,
        orgId: String(org._id),
        orgSlug: String(org.slug || "")
            .trim()
            .toLowerCase(),
    });
});

export default router;
