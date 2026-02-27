import api from "./api";

export function getAdminStats() {
    return api.get("/admin/stats");
}

export function listAdminUsers(params = {}) {
    return api.get("/admin/users", { params });
}

export function listAdminCards(params = {}) {
    return api.get("/admin/cards", { params });
}

export function getAdminUserById(id) {
    return api.get(`/admin/users/${id}`);
}

export function getAdminCardById(id) {
    return api.get(`/admin/cards/${id}`);
}

export function listAdminAudit(params = {}) {
    return api.get("/admin/audit", { params });
}

export function adminDeactivateCard(id, reason) {
    return api.post(`/admin/cards/${id}/deactivate`, { reason });
}

export function adminReactivateCard(id, reason) {
    return api.post(`/admin/cards/${id}/reactivate`, { reason });
}

export function adminDeleteCard(id, reason) {
    return api.post(`/admin/cards/${id}/delete`, { reason });
}

export function adminExtendTrial(id, { days, untilLocal, reason }) {
    return api.post(`/admin/cards/${id}/trial/extend`, {
        days,
        untilLocal,
        reason,
    });
}

export function adminOverridePlan(id, { plan, until, reason }) {
    return api.post(`/admin/cards/${id}/plan/override`, {
        plan,
        until,
        reason,
    });
}

// Enterprise billing CRUD (admin)
export function adminSetUserSubscription(
    userId,
    { plan, expiresAt, status, reason } = {},
) {
    return api.post(`/admin/billing/users/${userId}/subscription/set`, {
        plan,
        expiresAt,
        provider: "admin",
        status,
        reason,
    });
}

export function adminRevokeUserSubscription(userId, { reason } = {}) {
    return api.post(`/admin/billing/users/${userId}/subscription/revoke`, {
        reason,
    });
}

export function adminSetCardBilling(
    cardId,
    { plan, paidUntil, status, reason, payerType, payerNote } = {},
) {
    const body = { plan, paidUntil, status, reason };
    if (payerType !== undefined && payerType !== "") body.payerType = payerType;
    if (payerNote !== undefined) body.payerNote = payerNote;
    return api.post(`/admin/billing/cards/${cardId}/billing/set`, body);
}

export function adminRevokeCardBilling(cardId, { reason } = {}) {
    return api.post(`/admin/billing/cards/${cardId}/billing/revoke`, {
        reason,
    });
}

export function adminSyncCardBillingFromUser(cardId, { reason, force } = {}) {
    const body = {};
    if (reason !== undefined) body.reason = reason;
    if (force !== undefined) body.force = force;

    return api.post(
        `/admin/billing/cards/${cardId}/billing/sync-from-user`,
        body,
    );
}

export function adminClearCardAdminOverride(cardId, { reason } = {}) {
    return api.post(`/admin/cards/${cardId}/admin-override/clear`, {
        reason,
    });
}

export function adminSetAnalyticsPremium(cardId, { enabled, reason }) {
    return api.post(`/admin/cards/${cardId}/analytics-premium`, {
        enabled,
        reason,
    });
}

export function adminSetCardTier(id, { tier, until, reason }) {
    return api.post(`/admin/cards/${id}/tier`, {
        tier,
        until,
        reason,
    });
}

export function adminSetUserTier(id, { tier, until, reason }) {
    return api.post(`/admin/users/${id}/tier`, {
        tier,
        until,
        reason,
    });
}

export function adminDeleteUserPermanently(userId, { reason } = {}) {
    return api.post(`/admin/users/${userId}/delete`, {
        reason,
        confirm: "DELETE",
    });
}

export function getAdminAnalyticsSummary(params = {}) {
    return api.get("/admin/analytics/summary", { params });
}

export function getAdminAnalyticsSources(params = {}) {
    return api.get("/admin/analytics/sources", { params });
}

// Site analytics (public marketing pages; excludes /card/* and internal routes server-side)
export function getAdminSiteAnalyticsSummary(params = {}) {
    return api.get("/admin/site-analytics/summary", { params });
}

export function getAdminSiteAnalyticsSources(params = {}) {
    return api.get("/admin/site-analytics/sources", { params });
}

// Organizations (admin)
export function listAdminOrganizations(params = {}) {
    return api.get("/admin/orgs", { params });
}

export function createAdminOrganization({ name, slug, note, seatLimit } = {}) {
    return api.post("/admin/orgs", { name, slug, note, seatLimit });
}

export function getAdminOrganizationById(id) {
    return api.get(`/admin/orgs/${id}`);
}

export function patchAdminOrganization(id, patch = {}) {
    return api.patch(`/admin/orgs/${id}`, patch);
}

// Organization members (admin)
export function listAdminOrgMembers(orgId, params = {}) {
    return api.get(`/admin/orgs/${orgId}/members`, { params });
}

export function patchAdminOrgMember(orgId, memberId, patch = {}) {
    return api.patch(`/admin/orgs/${orgId}/members/${memberId}`, patch);
}

export function deleteAdminOrgMember(orgId, memberId) {
    return api.delete(`/admin/orgs/${orgId}/members/${memberId}`);
}

// Organization invites (admin)
export function createAdminOrgInvite(orgId, { email, role } = {}) {
    return api.post(`/admin/orgs/${orgId}/invites`, { email, role });
}

export function listAdminOrgInvites(orgId) {
    return api.get(`/admin/orgs/${orgId}/invites`);
}

export function revokeAdminOrgInvite(orgId, inviteId) {
    return api.post(`/admin/orgs/${orgId}/invites/${inviteId}/revoke`);
}

// Allowed hosts allowlist (admin)
export function listAdminAllowedHosts(params = {}) {
    return api.get("/admin/allowed-hosts", { params });
}

export function adminAddAllowedHost({ host, note } = {}) {
    return api.post("/admin/allowed-hosts", { host, note });
}

export function adminUpdateAllowedHost(id, patch = {}) {
    return api.patch(`/admin/allowed-hosts/${id}`, patch);
}

export function adminDeactivateAllowedHost(id) {
    return api.delete(`/admin/allowed-hosts/${id}`);
}

// Blog admin CRUD
export function listAdminBlogPosts(params = {}) {
    return api.get("/admin/blog/posts", { params });
}

export function createAdminBlogPost(body) {
    return api.post("/admin/blog/posts", body);
}

export function updateAdminBlogPost(id, body) {
    return api.patch(`/admin/blog/posts/${id}`, body);
}

export function publishAdminBlogPost(id) {
    return api.post(`/admin/blog/posts/${id}/publish`);
}

export function unpublishAdminBlogPost(id) {
    return api.post(`/admin/blog/posts/${id}/unpublish`);
}

export function deleteAdminBlogPost(id) {
    return api.post(`/admin/blog/posts/${id}/delete`);
}

export function uploadAdminBlogHeroImage(id, file, alt) {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("alt", alt);
    return api.post(`/admin/blog/posts/${id}/upload-hero`, fd);
}
