import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";

import OrgInvite from "../models/OrgInvite.model.js";
import OrgInviteAudit from "../models/OrgInviteAudit.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import Organization from "../models/Organization.model.js";
import User from "../models/User.model.js";
import { signToken } from "../utils/jwt.js";
import { getOrgSeatUsage } from "../utils/orgSeats.util.js";

const router = Router();

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

router.post("/accept", async (req, res) => {
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
        .select("_id seatLimit")
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

    // Enterprise hardening: if this invite would create a new user,
    // require a password BEFORE consuming the invite.
    if (!user && (typeof password !== "string" || !password)) {
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
        const passwordHash = await bcrypt.hash(password, 10);

        try {
            user = await User.create({ email, passwordHash });
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

    return res.json({ token: signToken(user._id) });
});

export default router;
