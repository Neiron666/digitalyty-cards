import api from "./api";

export async function createLead(data) {
    const res = await api.post("/leads", data);
    return res.data;
}

export async function getMyLeads({ cursor, limit, unreadOnly, view } = {}) {
    const params = {};
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = limit;
    if (unreadOnly) params.unreadOnly = "1";
    if (view) params.view = view;
    const res = await api.get("/leads/mine", { params });
    return res.data;
}

export async function getUnreadCount() {
    const res = await api.get("/leads/unread-count");
    return res.data.unreadCount;
}

export async function markLeadRead(id) {
    const res = await api.patch(`/leads/${id}/read`);
    return res.data;
}

export async function updateLeadFlags(id, flags) {
    const res = await api.patch(`/leads/${id}/flags`, flags);
    return res.data;
}

export async function hardDeleteLead(id) {
    const res = await api.delete(`/leads/${id}`);
    return res.data;
}
