import mongoose from "mongoose";
import crypto from "crypto";

import Organization from "../models/Organization.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import OrgInvite from "../models/OrgInvite.model.js";
import OrgInviteAudit from "../models/OrgInviteAudit.model.js";
import User from "../models/User.model.js";
import { sendOrgInviteEmailMailjetBestEffort } from "../services/mailjet.service.js";
import { getOrgSeatUsage, normalizeSeatLimit } from "../utils/orgSeats.util.js";
import {
    isReservedOrgSlug,
    isValidOrgSlug,
    normalizeOrgSlug,
} from "../utils/orgSlug.util.js";

function clampInt(value, { min, max, fallback }) {
    const n = Number.parseInt(String(value), 10);
    if (!Number.isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

function parsePagination(req) {
    const page = clampInt(req.query.page, { min: 1, max: 10_000, fallback: 1 });
    const limit = clampInt(req.query.limit, { min: 1, max: 100, fallback: 25 });
    return { page, limit, skip: (page - 1) * limit };
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSearch(req, { maxLen = 64 } = {}) {
    const raw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!raw) return null;
    const q = raw.slice(0, maxLen);
    return new RegExp(escapeRegExp(q), "i");
}

function isValidObjectId(value) {
    return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function pickOrgDTO(org) {
    if (!org) return null;
    return {
        id: String(org._id),
        name: org.name || "",
        slug: org.slug || "",
        note: org.note || "",
        isActive: Boolean(org.isActive),
        seatLimit: org.seatLimit === null ? null : Number(org.seatLimit),
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
    };
}

function pickMemberDTO({ member, user }) {
    if (!member) return null;
    return {
        id: String(member._id),
        orgId: String(member.orgId),
        userId: String(member.userId),
        email: user?.email || "",
        role: member.role || "member",
        status: member.status || "active",
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
    };
}

function pickInviteDTO(invite) {
    if (!invite) return null;
    return {
        id: String(invite._id),
        orgId: String(invite.orgId),
        email: String(invite.email || ""),
        role: String(invite.role || "member"),
        expiresAt: invite.expiresAt,
        revokedAt: invite.revokedAt || null,
        usedAt: invite.usedAt || null,
        createdAt: invite.createdAt,
    };
}

function normalizeName(value) {
    if (typeof value !== "string") return "";
    return value.trim();
}

function normalizeNote(value) {
    if (value === null || value === undefined) return "";
    if (typeof value !== "string") return "";
    return value.trim();
}

function normalizeEmail(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
}

function isValidEmail(value) {
    const s = normalizeEmail(value);
    if (!s) return false;
    if (s.length > 254) return false;
    // Minimal sanity check (we rely on User collection as the real validator).
    return s.includes("@") && !s.includes(" ");
}

function normalizeMemberRole(value) {
    const s = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (s === "admin") return "admin";
    if (s === "member") return "member";
    return "";
}

function normalizeMemberStatus(value) {
    const s = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (s === "active") return "active";
    if (s === "inactive") return "inactive";
    return "";
}

function isMongoDupKey(err) {
    return Boolean(err && (err.code === 11000 || err.code === 11001));
}

function requireFrontendPublicBaseUrl(req, res) {
    const raw =
        typeof process.env.FRONTEND_PUBLIC_BASE_URL === "string"
            ? process.env.FRONTEND_PUBLIC_BASE_URL.trim()
            : "";

    if (!raw) {
        // Do not guess the origin.
        res.status(500).json({ message: "Server error" });
        return null;
    }

    return raw.replace(/\/+$/g, "");
}

export async function adminListOrganizations(req, res) {
    const { skip, limit, page } = parsePagination(req);
    const q = parseSearch(req);

    const filter = q ? { $or: [{ slug: q }, { name: q }] } : {};

    const [items, total] = await Promise.all([
        Organization.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("slug name note isActive seatLimit createdAt updatedAt")
            .lean(),
        Organization.countDocuments(filter),
    ]);

    res.json({
        page,
        limit,
        total,
        items: items.map((o) => pickOrgDTO(o)),
    });
}

export async function adminCreateOrganization(req, res) {
    const name = normalizeName(req.body?.name);
    const slug = normalizeOrgSlug(req.body?.slug);
    const note = normalizeNote(req.body?.note);

    let seatLimit;
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "seatLimit")) {
        seatLimit = normalizeSeatLimit(req.body?.seatLimit);
        if (seatLimit === null && req.body?.seatLimit !== null) {
            return res.status(400).json({
                code: "INVALID_SEAT_LIMIT",
                message: "seatLimit must be a positive integer or null",
            });
        }
    }

    if (!name || name.length > 120) {
        return res.status(400).json({
            code: "INVALID_NAME",
            message: "Invalid name",
        });
    }

    if (isReservedOrgSlug(slug)) {
        return res.status(400).json({
            code: "RESERVED_SLUG",
            message: "Slug is reserved",
        });
    }

    if (!isValidOrgSlug(slug)) {
        return res.status(400).json({
            code: "INVALID_SLUG",
            message: "Invalid slug",
        });
    }

    if (note.length > 500) {
        return res.status(400).json({
            code: "INVALID_NOTE",
            message: "Invalid note",
        });
    }

    // Enterprise-safe: don't rely solely on DB unique indexes being present.
    // Sanity scripts disable autoIndex/autoCreate by design, and environments can drift.
    const existing = await Organization.findOne({ slug }).select("_id").lean();
    if (existing?._id) {
        return res.status(409).json({
            code: "ORG_SLUG_TAKEN",
            message: "Organization slug is already taken",
        });
    }

    try {
        const payload = { name, slug, note };
        if (seatLimit !== undefined) payload.seatLimit = seatLimit;

        const created = await Organization.create(payload);
        return res.status(201).json(pickOrgDTO(created));
    } catch (err) {
        if (isMongoDupKey(err)) {
            return res.status(409).json({
                code: "ORG_SLUG_TAKEN",
                message: "Organization slug is already taken",
            });
        }
        throw err;
    }
}

export async function adminGetOrganizationById(req, res) {
    const id = String(req.params.id || "");
    if (!isValidObjectId(id)) {
        return res.status(400).json({
            code: "INVALID_ID",
            message: "Invalid id",
        });
    }

    const org = await Organization.findById(id)
        .select("slug name note isActive seatLimit createdAt updatedAt")
        .lean();

    if (!org?._id) {
        return res.status(404).json({
            code: "NOT_FOUND",
            message: "Not found",
        });
    }

    const now = new Date();
    const seatUsage = await getOrgSeatUsage({ orgId: org._id, now });

    return res.json({
        ...pickOrgDTO(org),
        usedSeats: Number(seatUsage?.usedSeats || 0),
        usedSeatsBreakdown: {
            activeMemberships: Number(seatUsage?.activeMemberships || 0),
            pendingInvites: Number(seatUsage?.pendingInvites || 0),
        },
    });
}

export async function adminPatchOrganization(req, res) {
    const id = String(req.params.id || "");
    if (!isValidObjectId(id)) {
        return res.status(400).json({
            code: "INVALID_ID",
            message: "Invalid id",
        });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const hasAnyKeys = Boolean(Object.keys(body).length);

    if (Object.prototype.hasOwnProperty.call(body, "slug")) {
        return res.status(400).json({
            code: "SLUG_IMMUTABLE",
            legacyCode: "INVALID_PATCH",
            message: "slug is immutable",
        });
    }

    const $set = {};

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
        const name = normalizeName(body?.name);
        if (!name || name.length > 120) {
            return res.status(400).json({
                code: "INVALID_NAME",
                message: "Invalid name",
            });
        }
        $set.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(body, "note")) {
        const note = normalizeNote(body?.note);
        if (note.length > 500) {
            return res.status(400).json({
                code: "INVALID_NOTE",
                message: "Invalid note",
            });
        }
        $set.note = note;
    }

    if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
        const v = body?.isActive;
        if (typeof v !== "boolean") {
            return res.status(400).json({
                code: "INVALID_IS_ACTIVE",
                message: "isActive must be boolean",
            });
        }
        $set.isActive = v;
    }

    if (Object.prototype.hasOwnProperty.call(body, "seatLimit")) {
        const seatLimit = normalizeSeatLimit(body?.seatLimit);
        if (seatLimit === null && body?.seatLimit !== null) {
            return res.status(400).json({
                code: "INVALID_SEAT_LIMIT",
                message: "seatLimit must be a positive integer or null",
            });
        }
        $set.seatLimit = seatLimit;
    }

    if (!Object.keys($set).length) {
        if (!hasAnyKeys) {
            return res.status(400).json({
                code: "EMPTY_PATCH",
                legacyCode: "INVALID_PATCH",
                message: "Empty patch",
            });
        }

        return res.status(400).json({
            code: "INVALID_PATCH",
            message: "No allowed fields to update",
        });
    }

    try {
        const updated = await Organization.findByIdAndUpdate(
            id,
            { $set },
            {
                new: true,
                runValidators: true,
            },
        )
            .select("slug name note isActive seatLimit createdAt updatedAt")
            .lean();

        if (!updated?._id) {
            return res.status(404).json({
                code: "NOT_FOUND",
                message: "Not found",
            });
        }

        return res.json(pickOrgDTO(updated));
    } catch (err) {
        if (isMongoDupKey(err)) {
            return res.status(409).json({
                code: "ORG_SLUG_TAKEN",
                message: "Organization slug is already taken",
            });
        }
        throw err;
    }
}

async function requireOrgById(req, res) {
    const orgId = String(req.params.id || "");
    if (!isValidObjectId(orgId)) {
        res.status(400).json({ code: "INVALID_ID", message: "Invalid id" });
        return null;
    }

    const org = await Organization.findById(orgId)
        .select("_id seatLimit")
        .lean();
    if (!org?._id) {
        res.status(404).json({ code: "NOT_FOUND", message: "Not found" });
        return null;
    }

    return org;
}

export async function adminCreateOrgInvite(req, res) {
    const org = await requireOrgById(req, res);
    if (!org) return;

    const rawEmail = req.body?.email;
    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) {
        return res
            .status(400)
            .json({ code: "INVALID_EMAIL", message: "Invalid email" });
    }

    const hasRole = Object.prototype.hasOwnProperty.call(
        req.body || {},
        "role",
    );
    let role = "member";
    if (hasRole) {
        const parsed = normalizeMemberRole(req.body?.role);
        if (!parsed) {
            return res.status(400).json({
                code: "INVALID_ROLE",
                message: "role must be one of: member | admin",
            });
        }
        role = parsed;
    }

    const baseUrl = requireFrontendPublicBaseUrl(req, res);
    if (!baseUrl) return;

    const ttlRaw = Number.parseInt(
        String(process.env.ORG_INVITE_TTL_SECONDS || "604800"),
        10,
    );
    const ttlSeconds = Number.isFinite(ttlRaw) && ttlRaw > 0 ? ttlRaw : 604800;
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

    const seatLimit = org?.seatLimit;
    const hasSeatLimit = typeof seatLimit === "number";
    if (hasSeatLimit) {
        const seatUsage = await getOrgSeatUsage({ orgId: org._id, now });
        if (seatUsage.usedSeats >= seatLimit) {
            return res.status(409).json({
                code: "SEAT_LIMIT_REACHED",
                message: "Seat limit reached",
            });
        }
    }
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    const createdByUserId = req.user?.id || req.userId;
    if (!isValidObjectId(createdByUserId)) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const inviteLink = `${baseUrl}/invite?token=${rawToken}`;

    const created = await OrgInvite.create({
        orgId: org._id,
        email,
        role,
        tokenHash,
        expiresAt,
        createdByUserId,
        revokedAt: null,
        usedAt: null,
    });

    try {
        await OrgInviteAudit.create({
            eventType: "INVITE_CREATED",
            orgId: org._id,
            inviteId: created._id,
            emailNormalized: email,
            actorUserId: createdByUserId,
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
}

export async function adminListOrgInvites(req, res) {
    const org = await requireOrgById(req, res);
    if (!org) return;

    const invites = await OrgInvite.find({ orgId: org._id })
        .sort({ createdAt: -1 })
        .select("orgId email role expiresAt revokedAt usedAt createdAt")
        .lean();

    const items = (invites || []).map((i) => pickInviteDTO(i));
    return res.json({ total: items.length, items });
}

export async function adminRevokeOrgInvite(req, res) {
    const org = await requireOrgById(req, res);
    if (!org) return;

    const inviteId = String(req.params.inviteId || "");
    if (!isValidObjectId(inviteId)) {
        return res
            .status(400)
            .json({ code: "INVALID_INVITE_ID", message: "Invalid inviteId" });
    }

    const invite = await OrgInvite.findOne({ _id: inviteId, orgId: org._id })
        .select("_id revokedAt email")
        .lean();

    if (!invite?._id) {
        return res
            .status(404)
            .json({ code: "NOT_FOUND", message: "Not found" });
    }

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
                actorUserId: req.user?.id || req.userId,
            });
        } catch (err) {
            console.error("[audit] invite revoke failed", err?.message || err);
        }
    }

    return res.json({ ok: true });
}

export async function adminListOrgMembers(req, res) {
    const org = await requireOrgById(req, res);
    if (!org) return;

    const { skip, limit, page } = parsePagination(req);

    const [members, total] = await Promise.all([
        OrganizationMember.find({ orgId: org._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("orgId userId role status createdAt updatedAt")
            .lean(),
        OrganizationMember.countDocuments({ orgId: org._id }),
    ]);

    const userIds = Array.from(
        new Set(members.map((m) => String(m.userId)).filter(Boolean)),
    );

    const users = userIds.length
        ? await User.find({ _id: { $in: userIds } })
              .select("email")
              .lean()
        : [];

    const emailById = new Map(users.map((u) => [String(u._id), u.email || ""]));

    const items = members.map((m) =>
        pickMemberDTO({
            member: m,
            user: { email: emailById.get(String(m.userId)) || "" },
        }),
    );

    res.json({ page, limit, total, items });
}

export async function adminAddOrgMember(req, res) {
    const org = await requireOrgById(req, res);
    if (!org) return;

    const rawUserId = req.body?.userId;
    const rawEmail = req.body?.email;

    let user = null;

    if (rawUserId) {
        const userId = String(rawUserId);
        if (!isValidObjectId(userId)) {
            return res
                .status(400)
                .json({ code: "INVALID_USER_ID", message: "Invalid userId" });
        }
        user = await User.findById(userId).select("email").lean();
    } else if (rawEmail) {
        const email = normalizeEmail(rawEmail);
        if (!isValidEmail(email)) {
            return res
                .status(400)
                .json({ code: "INVALID_EMAIL", message: "Invalid email" });
        }
        user = await User.findOne({ email }).select("email").lean();
    } else {
        return res.status(400).json({
            code: "INVALID_MEMBER_INPUT",
            message: "Provide userId or email",
        });
    }

    if (!user?._id) {
        return res
            .status(404)
            .json({ code: "USER_NOT_FOUND", message: "User not found" });
    }

    const hasRole = Object.prototype.hasOwnProperty.call(
        req.body || {},
        "role",
    );
    let role = "member";
    if (hasRole) {
        const parsed = normalizeMemberRole(req.body?.role);
        if (!parsed) {
            return res.status(400).json({
                code: "INVALID_ROLE",
                message: "role must be one of: member | admin",
            });
        }
        role = parsed;
    }

    const seatLimit = org?.seatLimit;
    const hasSeatLimit = typeof seatLimit === "number";
    if (hasSeatLimit) {
        const now = new Date();
        const seatUsage = await getOrgSeatUsage({ orgId: org._id, now });
        if (seatUsage.usedSeats >= seatLimit) {
            return res.status(409).json({
                code: "SEAT_LIMIT_REACHED",
                message: "Seat limit reached",
            });
        }
    }

    try {
        const created = await OrganizationMember.create({
            orgId: org._id,
            userId: user._id,
            role,
            status: "active",
        });

        return res.status(201).json(pickMemberDTO({ member: created, user }));
    } catch (err) {
        if (isMongoDupKey(err)) {
            return res.status(409).json({
                code: "MEMBER_EXISTS",
                message: "Member already exists",
            });
        }
        throw err;
    }
}

export async function adminPatchOrgMember(req, res) {
    const org = await requireOrgById(req, res);
    if (!org) return;

    const memberId = String(req.params.memberId || "");
    if (!isValidObjectId(memberId)) {
        return res
            .status(400)
            .json({ code: "INVALID_MEMBER_ID", message: "Invalid memberId" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const hasAnyKeys = Boolean(Object.keys(body).length);

    const $set = {};

    if (Object.prototype.hasOwnProperty.call(body, "role")) {
        const role = normalizeMemberRole(body?.role);
        if (!role) {
            return res.status(400).json({
                code: "INVALID_ROLE",
                message: "role must be one of: member | admin",
            });
        }
        $set.role = role;
    }

    if (Object.prototype.hasOwnProperty.call(body, "status")) {
        const status = normalizeMemberStatus(body?.status);
        if (!status) {
            return res.status(400).json({
                code: "INVALID_STATUS",
                message: "status must be one of: active | inactive",
            });
        }
        $set.status = status;
    }

    const seatLimit = org?.seatLimit;
    const hasSeatLimit = typeof seatLimit === "number";
    if ($set.status === "active" && hasSeatLimit) {
        const current = await OrganizationMember.findOne({
            _id: memberId,
            orgId: org._id,
        })
            .select("_id status")
            .lean();

        if (!current?._id) {
            return res
                .status(404)
                .json({ code: "NOT_FOUND", message: "Not found" });
        }

        if (String(current.status || "") !== "active") {
            const now = new Date();
            const seatUsage = await getOrgSeatUsage({ orgId: org._id, now });
            if (seatUsage.usedSeats >= seatLimit) {
                return res.status(409).json({
                    code: "SEAT_LIMIT_REACHED",
                    message: "Seat limit reached",
                });
            }
        }
    }

    if (!Object.keys($set).length) {
        if (!hasAnyKeys) {
            return res.status(400).json({
                code: "EMPTY_PATCH",
                legacyCode: "INVALID_PATCH",
                message: "Empty patch",
            });
        }

        return res.status(400).json({
            code: "INVALID_PATCH",
            message: "No allowed fields to update",
        });
    }

    const updated = await OrganizationMember.findOneAndUpdate(
        { _id: memberId, orgId: org._id },
        { $set },
        { new: true, runValidators: true },
    )
        .select("orgId userId role status createdAt updatedAt")
        .lean();

    if (!updated?._id) {
        return res
            .status(404)
            .json({ code: "NOT_FOUND", message: "Not found" });
    }

    const user = await User.findById(updated.userId).select("email").lean();

    return res.json(pickMemberDTO({ member: updated, user }));
}

export async function adminDeleteOrgMember(req, res) {
    const org = await requireOrgById(req, res);
    if (!org) return;

    const memberId = String(req.params.memberId || "");
    if (!isValidObjectId(memberId)) {
        return res
            .status(400)
            .json({ code: "INVALID_MEMBER_ID", message: "Invalid memberId" });
    }

    const deleted = await OrganizationMember.findOneAndDelete({
        _id: memberId,
        orgId: org._id,
    }).lean();

    if (!deleted?._id) {
        return res
            .status(404)
            .json({ code: "NOT_FOUND", message: "Not found" });
    }

    return res.sendStatus(204);
}
