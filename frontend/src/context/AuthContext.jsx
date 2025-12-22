import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import {
    login as loginRequest,
    register as registerRequest,
} from "../services/auth.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // при старте приложения
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            setToken(storedToken);
            api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
        }
        setLoading(false);
    }, []);

    async function login(email, password) {
        const res = await loginRequest(email, password);
        const token = res.data.token;

        localStorage.setItem("token", token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        setToken(token);
    }

    async function register(email, password) {
        const res = await registerRequest(email, password);
        const token = res.data.token;

        localStorage.setItem("token", token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        setToken(token);
    }

    function logout() {
        localStorage.removeItem("token");
        delete api.defaults.headers.common.Authorization;
        setToken(null);
    }

    return (
        <AuthContext.Provider value={{ token, login, register, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
