import mongoose from "mongoose";

import OrgInvite from "../models/OrgInvite.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";

export function normalizeSeatLimit(value) {
    if (value === null || value === undefined) return null;

    const n = Number.parseInt(String(value), 10);
    if (!Number.isFinite(n)) return null;
    if (n <= 0) return null;
    return n;
}

export async function getOrgSeatUsageByOrgIds({ orgIds, now = new Date() }) {
    const ids = Array.from(new Set((orgIds || []).map((id) => String(id))))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const out = new Map();
    if (!ids.length) return out;

    const [membersAgg, invitesAgg] = await Promise.all([
        OrganizationMember.aggregate([
            { $match: { orgId: { $in: ids }, status: "active" } },
            { $group: { _id: "$orgId", count: { $sum: 1 } } },
        ]),
        OrgInvite.aggregate([
            {
                $match: {
                    orgId: { $in: ids },
                    revokedAt: null,
                    usedAt: null,
                    expiresAt: { $gt: now },
                },
            },
            { $group: { _id: "$orgId", count: { $sum: 1 } } },
        ]),
    ]);

    const activeByOrg = new Map(
        (membersAgg || []).map((r) => [String(r._id), Number(r.count || 0)]),
    );
    const pendingByOrg = new Map(
        (invitesAgg || []).map((r) => [String(r._id), Number(r.count || 0)]),
    );

    for (const oid of ids) {
        const key = String(oid);
        const activeMemberships = activeByOrg.get(key) || 0;
        const pendingInvites = pendingByOrg.get(key) || 0;
        out.set(key, {
            activeMemberships,
            pendingInvites,
            usedSeats: activeMemberships + pendingInvites,
        });
    }

    return out;
}

export async function getOrgSeatUsage({ orgId, now = new Date() }) {
    const map = await getOrgSeatUsageByOrgIds({ orgIds: [orgId], now });
    return (
        map.get(String(orgId)) || {
            activeMemberships: 0,
            pendingInvites: 0,
            usedSeats: 0,
        }
    );
}
