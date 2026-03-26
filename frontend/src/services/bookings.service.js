import api from "./api";

export async function getMyBookings({ cardId, limit } = {}) {
    const id = String(cardId || "").trim();

    const params = {};
    if (id) params.cardId = id;
    if (Number.isFinite(Number(limit))) params.limit = Number(limit);

    const res = await api.get("/bookings/mine", { params });
    return res.data;
}

export async function approveMyBooking(id) {
    const bookingId = String(id || "").trim();
    if (!bookingId) throw new Error("Missing booking id");
    const res = await api.post(`/bookings/${bookingId}/approve`);
    return res.data;
}

export async function cancelMyBooking(id) {
    const bookingId = String(id || "").trim();
    if (!bookingId) throw new Error("Missing booking id");
    const res = await api.post(`/bookings/${bookingId}/cancel`);
    return res.data;
}
