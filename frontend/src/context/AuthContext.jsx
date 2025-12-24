import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import {
    login as loginRequest,
    register as registerRequest,
    getMe,
} from "../services/auth.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const isAuthenticated = Boolean(token);

    async function loadMeSafely() {
        try {
            const me = await getMe();
            setUser({ email: me?.email });
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401) {
                localStorage.removeItem("token");
                delete api.defaults.headers.common.Authorization;
                setToken(null);
                setUser(null);
                return;
            }
            // Keep app usable on network/5xx issues
            setUser(null);
        }
    }

    // при старте приложения
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            setToken(storedToken);
            api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
            // Do not block rendering while loading email.
            queueMicrotask(() => {
                loadMeSafely();
            });
        }
        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function login(email, password) {
        const res = await loginRequest(email, password);
        const token = res.data.token;

        localStorage.setItem("token", token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        setToken(token);
        setUser(null);
        await loadMeSafely();
    }

    async function register(email, password) {
        const res = await registerRequest(email, password);
        const token = res.data.token;

        localStorage.setItem("token", token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        setToken(token);
        setUser(null);
        await loadMeSafely();
    }

    function logout() {
        localStorage.removeItem("token");
        delete api.defaults.headers.common.Authorization;
        setToken(null);
        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{ token, user, isAuthenticated, login, register, logout }}
        >
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
