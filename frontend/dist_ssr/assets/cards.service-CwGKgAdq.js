import { a as api } from "../entry-server.js";
function getCardBySlug(slug) {
  return api.get(`/cards/${slug}`).then((r) => r.data);
}
function getCompanyCardBySlug(orgSlug, slug) {
  return api.get(`/c/${orgSlug}/${slug}`).then((r) => r.data);
}
function deleteCard(id) {
  return api.delete(`/cards/${id}`);
}
function updateCardSlug(slug) {
  return api.patch("/cards/slug", { slug }).then((r) => r.data);
}
export {
  getCardBySlug as a,
  deleteCard as d,
  getCompanyCardBySlug as g,
  updateCardSlug as u
};
