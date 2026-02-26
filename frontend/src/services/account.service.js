import api from "./api";

/**
 * GET /api/account/me — self-service read-only account summary.
 * Requires valid JWT (Authorization header set via AuthContext).
 */
export async function getAccountSummary() {
    const res = await api.get("/account/me");
    return res.data;
}

/**
 * POST /api/account/change-password — self-service password change.
 * Returns true on 204 success.
 */
export async function changePassword({ currentPassword, newPassword }) {
    await api.post("/account/change-password", {
        currentPassword,
        newPassword,
    });
    return true;
}

/**
 * POST /api/account/delete-account — self-service permanent account deletion.
 * Returns { ok: true } on 204.
 * Throws on 400/429; returns { code, orgs } on 409 (sole-org-admin block).
 */
export async function deleteAccount({ confirm, password }) {
    try {
        await api.post("/account/delete-account", { confirm, password });
        return { ok: true };
    } catch (err) {
        if (err?.response?.status === 409) {
            return err.response.data;
        }
        throw err;
    }
}
