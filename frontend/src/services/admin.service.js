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

export function addAdminOrgMember(orgId, { userId, email, role } = {}) {
    return api.post(`/admin/orgs/${orgId}/members`, { userId, email, role });
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
