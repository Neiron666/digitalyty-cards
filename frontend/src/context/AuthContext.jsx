import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
    login as loginRequest,
    register as registerRequest,
    getMe,
    logout as logoutRequest,
} from "../services/auth.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const isAuthenticated = Boolean(user);

    async function loadMeSafely() {
        try {
            const me = await getMe();
            setUser({
                email: me?.email,
                role: me?.role,
                isVerified: Boolean(me?.isVerified),
            });
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401) {
                setUser(null);
                return;
            }
            // Keep app usable on network/5xx issues
            setUser(null);
        }
    }

    // Bootstrap: verify active session via httpOnly cookie.
    useEffect(() => {
        async function bootstrap() {
            try {
                const me = await getMe();
                setUser({
                    email: me?.email,
                    role: me?.role,
                    isVerified: Boolean(me?.isVerified),
                });
            } catch {
                setUser(null);
            }
            setLoading(false);
        }
        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function login(email, password) {
        await loginRequest(email, password);
        await loadMeSafely();
    }

    async function register(email, password, consent) {
        const res = await registerRequest(email, password, consent);
        return res;
    }

    async function logout() {
        try {
            await logoutRequest();
        } catch {
            // Best effort - clear local session regardless
        }
        setUser(null);
    }

    const value = useMemo(
        () => ({ user, isAuthenticated, login, register, logout }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user, isAuthenticated],
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
