import AdminAudit from "../models/AdminAudit.model.js";

export async function logAdminAction({
    adminUserId,
    action,
    targetType,
    targetId,
    reason,
    meta,
}) {
    if (!adminUserId || !action || !targetType || !targetId || !reason) {
        throw new Error("Missing required admin audit fields");
    }

    return AdminAudit.create({
        adminUserId,
        action,
        targetType,
        targetId,
        reason,
        meta: meta ?? null,
    });
}
