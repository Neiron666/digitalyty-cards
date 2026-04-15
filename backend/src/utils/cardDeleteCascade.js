import Lead from "../models/Lead.model.js";
import CardAnalyticsDaily from "../models/CardAnalyticsDaily.model.js";
import Booking from "../models/Booking.model.js";

export async function deleteCardCascade({ cardId }) {
    if (!cardId)
        return { leadsDeleted: 0, analyticsDeleted: 0, bookingsDeleted: 0 };

    const [leadsRes, analyticsRes, bookingsRes] = await Promise.all([
        // NOTE: Lead model uses `card` (ref), not `cardId`
        Lead.deleteMany({ card: cardId }),
        CardAnalyticsDaily.deleteMany({ cardId }),
        // NOTE: Booking model uses `card` (ref), not `cardId`
        Booking.deleteMany({ card: cardId }),
    ]);

    return {
        leadsDeleted: Number(leadsRes?.deletedCount || 0),
        analyticsDeleted: Number(analyticsRes?.deletedCount || 0),
        bookingsDeleted: Number(bookingsRes?.deletedCount || 0),
    };
}
