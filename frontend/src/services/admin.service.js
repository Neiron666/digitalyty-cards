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
