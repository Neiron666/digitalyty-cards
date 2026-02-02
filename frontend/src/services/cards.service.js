import api from "./api";

export function createCard(data) {
    return api.post("/cards", data);
}

export function updateCard(id, data) {
    return api.put(`/cards/${id}`, data);
}

export function getCardBySlug(slug) {
    return api.get(`/cards/${slug}`).then((r) => r.data);
}

export function getCompanyCardBySlug(orgSlug, slug) {
    return api.get(`/c/${orgSlug}/${slug}`).then((r) => r.data);
}

export function deleteCard(id) {
    return api.delete(`/cards/${id}`);
}

export function updateCardSlug(slug) {
    return api.patch("/cards/slug", { slug }).then((r) => r.data);
}
