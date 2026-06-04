import AdminAudit from "../models/AdminAudit.model.js";

export async function logAdminAction({
    adminUserId,
    action,
    targetType,
    targetId,
    reason,
    meta,
    session,
}) {
    if (!adminUserId || !action || !targetType || !targetId || !reason) {
        throw new Error("Missing required admin audit fields");
    }

    const doc = {
        adminUserId,
        action,
        targetType,
        targetId,
        reason,
        meta: meta ?? null,
    };

    // Optional transaction support (backwards-compatible). When a session is
    // provided, the audit row is written inside that session/transaction so it
    // commits/rolls back atomically with the caller's other writes. When no
    // session is provided, behavior is exactly as before.
    if (session) {
        const [created] = await AdminAudit.create([doc], { session });
        return created;
    }

    return AdminAudit.create(doc);
}
