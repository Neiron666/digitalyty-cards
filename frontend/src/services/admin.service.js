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

export function adminExtendTrial(id, { days, reason }) {
    return api.post(`/admin/cards/${id}/trial/extend`, { days, reason });
}

export function adminOverridePlan(id, { plan, until, reason }) {
    return api.post(`/admin/cards/${id}/plan/override`, { plan, until, reason });
}
