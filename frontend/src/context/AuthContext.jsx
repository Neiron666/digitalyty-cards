import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
    login as loginRequest,
    register as registerRequest,
    getMe,
} from "../services/auth.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // ✅ sync hydration: token is available on first render
    const [token, setToken] = useState(() => localStorage.getItem("token"));
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

    // ✅ keep axios defaults in sync with token state (single source of truth)
    useEffect(() => {
        if (token) {
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
            // non-blocking: do not block UI rendering on /me
            queueMicrotask(() => {
                loadMeSafely();
            });
        } else {
            delete api.defaults.headers.common.Authorization;
            setUser(null);
        }

        // children may render after first sync
        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    async function login(email, password) {
        const res = await loginRequest(email, password);
        const nextToken = res.data.token;

        localStorage.setItem("token", nextToken);
        setToken(nextToken); // effect will sync axios + loadMe
        setUser(null);
    }

    async function register(email, password) {
        const res = await registerRequest(email, password);
        const nextToken = res.data.token;

        localStorage.setItem("token", nextToken);
        setToken(nextToken); // effect will sync axios + loadMe
        setUser(null);
    }

    function logout() {
        localStorage.removeItem("token");
        setToken(null); // effect will clear axios defaults
        setUser(null);
    }

    const value = useMemo(
        () => ({ token, user, isAuthenticated, login, register, logout }),
        [token, user, isAuthenticated],
    );

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
