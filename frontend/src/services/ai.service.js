import api from "./api";

/**
 * Request an AI-generated About section suggestion for a card.
 *
 * @param {string} cardId  Mongo _id of the card
 * @param {{ mode: "create"|"improve", language: "he"|"en" }} payload
 * @returns {Promise<{ aboutTitle: string, aboutParagraphs: string[] }>}
 */
export async function suggestAbout(cardId, payload) {
    const res = await api.post(`/cards/${cardId}/ai/about-suggestion`, payload);
    return res.data?.suggestion;
}
