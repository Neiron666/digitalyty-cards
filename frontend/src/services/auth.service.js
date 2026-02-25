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

export const forgotPassword = (email) => api.post("/auth/forgot", { email });

export const resetPassword = (token, password) =>
    api.post("/auth/reset", { token, password });

export const requestSignupLink = (email) =>
    api.post("/auth/signup-link", { email });

export const consumeSignupToken = (token, password) =>
    api.post("/auth/signup-consume", { token, password });
