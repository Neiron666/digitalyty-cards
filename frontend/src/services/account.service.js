import api from "./api";

/**
 * GET /api/account/me - self-service read-only account summary.
 * Requires active session (httpOnly auth cookie).
 */
export async function getAccountSummary() {
    const res = await api.get("/account/me");
    return res.data;
}

/**
 * POST /api/account/change-password - self-service password change.
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
 * POST /api/account/delete-account - self-service permanent account deletion.
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

/**
 * PATCH /api/account/email-preferences - update marketing email consent.
 * Returns the updated consent fields from the backend.
 */
export async function updateEmailPreferences({
    emailMarketingConsent,
    source = "settings_panel",
}) {
    const res = await api.patch("/account/email-preferences", {
        emailMarketingConsent,
        source,
    });
    return res.data;
}

export async function updateAccountName({ firstName }) {
    const res = await api.patch("/account/name", { firstName });
    return res.data;
}

/**
 * POST /api/account/cancel-renewal — self-service cancellation of automatic STO renewal.
 * No request body — backend derives user from req.userId (httpOnly cookie auth).
 * Returns safe autoRenewal DTO: { ok, renewalStatus, autoRenewal, messageKey }
 */
export async function cancelRenewal() {
    const res = await api.post("/account/cancel-renewal");
    return res.data;
}

/**
 * POST /api/account/resume-auto-renewal — self-service resume of cancelled Tranzila STO.
 * No request body — backend derives user from req.userId (httpOnly cookie auth).
 * Returns safe autoRenewal DTO: { ok, resumed, autoRenewal }
 */
export async function resumeAutoRenewal() {
    const res = await api.post("/account/resume-auto-renewal");
    return res.data;
}

/**
 * POST /api/account/delete-payment-method — self-service local payment token clear.
 * No request body — backend derives user from req.userId (httpOnly cookie auth).
 * Returns { ok, messageKey, paymentMethod, autoRenewal }.
 * Fails if STO status is not in the server-side allowlist.
 */
export async function deletePaymentMethod() {
    const res = await api.post("/account/delete-payment-method");
    return res.data;
}

/**
 * GET /api/account/receipts — paginated list of issued receipts for the authenticated user.
 * Returns { receipts, hasMore, total }. Only status="created" receipts are returned.
 */
export async function getReceipts(limit = 10) {
    const res = await api.get("/account/receipts", { params: { limit } });
    return res.data;
}

/**
 * PATCH /api/account/receipt-profile — partial update of the authenticated user's receipt/billing profile.
 * Absent fields are untouched. Send field: null to explicitly clear.
 * Returns { receiptProfile } masked DTO on success.
 */
export async function updateReceiptProfile(fields) {
    const res = await api.patch("/account/receipt-profile", fields);
    return res.data;
}
