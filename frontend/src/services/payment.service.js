import api from "./api";

export async function createPayment(plan) {
    const res = await api.post("/payments/create", { plan });
    return res.data;
}
