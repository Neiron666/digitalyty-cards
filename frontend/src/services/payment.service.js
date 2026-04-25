import api from "./api";

export async function createPayment(plan, options = {}) {
    const body = { plan };
    if (options?.mode) body.mode = options.mode;
    const res = await api.post("/payments/create", body);
    return res.data;
}
