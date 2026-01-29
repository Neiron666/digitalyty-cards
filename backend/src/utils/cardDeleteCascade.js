import Lead from "../models/Lead.model.js";
import CardAnalyticsDaily from "../models/CardAnalyticsDaily.model.js";

export async function deleteCardCascade({ cardId }) {
    if (!cardId) return { leadsDeleted: 0, analyticsDeleted: 0 };

    const [leadsRes, analyticsRes] = await Promise.all([
        // NOTE: Lead model uses `card` (ref), not `cardId`
        Lead.deleteMany({ card: cardId }),
        CardAnalyticsDaily.deleteMany({ cardId }),
    ]);

    return {
        leadsDeleted: Number(leadsRes?.deletedCount || 0),
        analyticsDeleted: Number(analyticsRes?.deletedCount || 0),
    };
}
