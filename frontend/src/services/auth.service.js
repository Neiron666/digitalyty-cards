import api from "./api";

export const register = (email, password) =>
    api.post("/auth/register", { email, password });

export const login = (email, password) =>
    api.post("/auth/login", { email, password });

export async function getMe() {
    const res = await api.get("/auth/me", {
        headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
        },
        params: { _ts: Date.now() },
    });
    return res.data;
}
