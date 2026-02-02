import mongoose from "mongoose";

import Organization from "../models/Organization.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import User from "../models/User.model.js";
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

export async function adminListOrganizations(req, res) {
    const { skip, limit, page } = parsePagination(req);
    const q = parseSearch(req);

    const filter = q ? { $or: [{ slug: q }, { name: q }] } : {};

    const [items, total] = await Promise.all([
        Organization.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("slug name note isActive createdAt updatedAt")
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

    try {
        const created = await Organization.create({ name, slug, note });
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
        .select("slug name note isActive createdAt updatedAt")
        .lean();

    if (!org?._id) {
        return res.status(404).json({
            code: "NOT_FOUND",
            message: "Not found",
        });
    }

    return res.json(pickOrgDTO(org));
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
            .select("slug name note isActive createdAt updatedAt")
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

    const org = await Organization.findById(orgId).select("_id").lean();
    if (!org?._id) {
        res.status(404).json({ code: "NOT_FOUND", message: "Not found" });
        return null;
    }

    return org;
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
