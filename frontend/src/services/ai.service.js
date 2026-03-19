import api from "./api";

/**
 * Request an AI-generated About section suggestion for a card.
 *
 * @param {string} cardId  Mongo _id of the card
 * @param {{ mode?: "create"|"improve", language?: "he"|"en", target?: "full"|"title"|"paragraph", paragraphIndex?: number }} payload
 * @returns {Promise<{ suggestion: object, quota: object|undefined }>}
 */
export async function suggestAbout(cardId, payload) {
    const res = await api.post(`/cards/${cardId}/ai/about-suggestion`, payload);
    return { suggestion: res.data?.suggestion, quota: res.data?.quota };
}

/**
 * Fetch current AI quota for a card.
 *
 * @param {string} cardId
 * @param {string} [feature="ai_about_generation"]
 * @returns {Promise<object>} quota DTO
 */
export async function fetchAiQuota(cardId, feature = "ai_about_generation") {
    const res = await api.get(`/cards/${cardId}/ai/quota`, {
        params: { feature },
    });
    return res.data?.quota;
}
