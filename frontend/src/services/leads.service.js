import api from "./api";

export async function createLead(data) {
    const res = await api.post("/leads", data);
    return res.data;
}
