import { Router } from "express";
import crypto from "crypto";

import { requireAuth } from "../middlewares/auth.middleware.js";
import OrgInvite from "../models/OrgInvite.model.js";
import OrgInviteAudit from "../models/OrgInviteAudit.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import Organization from "../models/Organization.model.js";
import { sendOrgInviteEmailMailjetBestEffort } from "../services/mailjet.service.js";
import {
    assertActiveOrgAndMembershipOrNotFound,
    isValidObjectId,
} from "../utils/orgMembership.util.js";
import { HttpError } from "../utils/httpError.js";
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

function requireFrontendPublicBaseUrl() {
    const raw =
        typeof process.env.FRONTEND_PUBLIC_BASE_URL === "string"
            ? process.env.FRONTEND_PUBLIC_BASE_URL.trim()
            : "";

    if (!raw) {
        // Do not guess the origin.
        throw new HttpError(500, "Server error");
    }

    return raw.replace(/\/+$/g, "");
}

async function assertOrgAdminOrNotFound({ orgId, userId }) {
    const { org, member } = await assertActiveOrgAndMembershipOrNotFound({
        orgId,
        userId,
    });

    // Enforce admin-only for self-serve invite management.
    if (String(member?.role || "") !== "admin") {
        throw new HttpError(404, "Not found", "NOT_FOUND");
    }

    return { org };
}

function notFound() {
    throw new HttpError(404, "Not found", "NOT_FOUND");
}

function parseInviteRole(raw) {
    if (raw === undefined) return "member";
    const role = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (!role) return "member";

    // Enterprise-safe default: org-admin can invite members only.
    if (role === "member") return "member";

    throw new HttpError(400, "role must be one of: member", "INVALID_ROLE");
}

router.get("/:orgId/invites", requireAuth, async (req, res, next) => {
    try {
        const orgId = String(req.params.orgId || "");
        const userId = req.user?.id || req.userId;

        if (!isValidObjectId(orgId) || !isValidObjectId(userId)) notFound();

        const { org } = await assertOrgAdminOrNotFound({ orgId, userId });

        const invites = await OrgInvite.find({ orgId: org._id })
            .sort({ createdAt: -1 })
            .select("orgId email role expiresAt revokedAt usedAt createdAt")
            .lean();

        const items = (invites || []).map((i) => ({
            id: String(i._id),
            orgId: String(i.orgId),
            email: String(i.email || ""),
            role: String(i.role || "member"),
            expiresAt: i.expiresAt,
            revokedAt: i.revokedAt || null,
            usedAt: i.usedAt || null,
            createdAt: i.createdAt,
        }));

        return res.json({ total: items.length, items });
    } catch (err) {
        return next(err);
    }
});

router.post("/:orgId/invites", requireAuth, async (req, res, next) => {
    try {
        const orgId = String(req.params.orgId || "");
        const userId = req.user?.id || req.userId;

        if (!isValidObjectId(orgId) || !isValidObjectId(userId)) notFound();

        const { org } = await assertOrgAdminOrNotFound({ orgId, userId });

        const email = normalizeEmail(req.body?.email);
        if (!isValidEmail(email)) {
            throw new HttpError(400, "Invalid email", "INVALID_EMAIL");
        }

        const role = parseInviteRole(req.body?.role);

        const now = new Date();

        const existingPending = await OrgInvite.findOne({
            orgId: org._id,
            email,
            revokedAt: null,
            usedAt: null,
            expiresAt: { $gt: now },
        })
            .select("_id")
            .lean();

        if (existingPending?._id) {
            return res.status(409).json({
                code: "INVITE_ALREADY_PENDING",
                message: "Invite already pending",
            });
        }

        // IMPORTANT: org from membership util is projected and may not include seatLimit.
        // Fetch seatLimit explicitly and avoid truthy checks (seatLimit=0 must still enforce).
        const orgMeta = await Organization.findById(org._id)
            .select("_id seatLimit")
            .lean();
        if (!orgMeta?._id) notFound();

        const seatLimitRaw = orgMeta.seatLimit;
        const hasSeatLimit =
            seatLimitRaw !== null &&
            seatLimitRaw !== undefined &&
            Number.isFinite(Number(seatLimitRaw));

        if (hasSeatLimit) {
            const seatLimit = Number(seatLimitRaw);
            const seatUsage = await getOrgSeatUsage({ orgId: org._id, now });
            if (Number(seatUsage.usedSeats || 0) >= seatLimit) {
                return res.status(409).json({
                    code: "SEAT_LIMIT_REACHED",
                    message: "הגעת למגבלת המושבים / Seat limit reached",
                });
            }
        }

        const baseUrl = requireFrontendPublicBaseUrl();

        const ttlRaw = Number.parseInt(
            String(process.env.ORG_INVITE_TTL_SECONDS || "604800"),
            10,
        );
        const ttlSeconds =
            Number.isFinite(ttlRaw) && ttlRaw > 0 ? ttlRaw : 604800;
        const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        const inviteLink = `${baseUrl}/invite?token=${rawToken}`;

        const created = await OrgInvite.create({
            orgId: org._id,
            email,
            role,
            tokenHash,
            expiresAt,
            createdByUserId: userId,
            revokedAt: null,
            usedAt: null,
        });

        try {
            await OrgInviteAudit.create({
                eventType: "INVITE_CREATED",
                orgId: org._id,
                inviteId: created._id,
                emailNormalized: email,
                actorUserId: userId,
            });
        } catch (err) {
            console.error("[audit] invite create failed", err?.message || err);
        }

        // Best-effort: email sending must not affect invite creation or response.
        // Never log the raw token / inviteLink.
        sendOrgInviteEmailMailjetBestEffort({
            toEmail: email,
            inviteLink,
            orgId: org._id,
            inviteId: created._id,
        }).catch((err) => {
            console.error("[mailjet] best-effort send failed", {
                orgId: String(org._id),
                inviteId: String(created._id),
                toEmail: email,
                error: err?.message || err,
            });
        });

        return res.status(201).json({
            inviteId: String(created._id),
            inviteLink,
            expiresAt: created.expiresAt,
        });
    } catch (err) {
        return next(err);
    }
});

router.post(
    "/:orgId/invites/:inviteId/revoke",
    requireAuth,
    async (req, res, next) => {
        try {
            const orgId = String(req.params.orgId || "");
            const inviteId = String(req.params.inviteId || "");
            const userId = req.user?.id || req.userId;

            if (
                !isValidObjectId(orgId) ||
                !isValidObjectId(inviteId) ||
                !isValidObjectId(userId)
            ) {
                notFound();
            }

            const { org } = await assertOrgAdminOrNotFound({ orgId, userId });

            const invite = await OrgInvite.findOne({
                _id: inviteId,
                orgId: org._id,
            })
                .select("_id revokedAt email")
                .lean();

            if (!invite?._id) notFound();

            if (!invite.revokedAt) {
                await OrgInvite.updateOne(
                    { _id: invite._id },
                    { $set: { revokedAt: new Date() } },
                );

                try {
                    await OrgInviteAudit.create({
                        eventType: "INVITE_REVOKED",
                        orgId: org._id,
                        inviteId: invite._id,
                        emailNormalized: normalizeEmail(invite.email),
                        actorUserId: userId,
                    });
                } catch (err) {
                    console.error(
                        "[audit] invite revoke failed",
                        err?.message || err,
                    );
                }
            }

            return res.json({ ok: true });
        } catch (err) {
            return next(err);
        }
    },
);

export default router;
