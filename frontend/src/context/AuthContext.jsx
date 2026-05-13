import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
    login as loginRequest,
    register as registerRequest,
    getMe,
    logout as logoutRequest,
} from "../services/auth.service";

const AuthContext = createContext(null);

// Phase 2A resilience: bounded fail-open ceiling for the initial /auth/me
// bootstrap call. Prevents the global gate ({!loading && children}) from
// keeping the app blank indefinitely if the backend hangs. This value is
// intentionally NOT env-driven in this phase.
const AUTH_BOOTSTRAP_TIMEOUT_MS = 2500;

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
    // Phase 2A resilience: each effect run owns its own AbortController,
    // timer, and active/finished guards. If /auth/me does not settle within
    // AUTH_BOOTSTRAP_TIMEOUT_MS, the request is aborted and the app renders
    // as anonymous instead of staying blank forever. Late responses cannot
    // flip user state after timeout or cleanup.
    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        let finished = false;
        let timer = null;

        timer = setTimeout(() => {
            if (!active || finished) return;
            finished = true;
            controller.abort();
            setUser(null);
            setLoading(false);
        }, AUTH_BOOTSTRAP_TIMEOUT_MS);

        (async function bootstrap() {
            try {
                const me = await getMe({
                    signal: controller.signal,
                    timeout: AUTH_BOOTSTRAP_TIMEOUT_MS,
                });
                if (!active || finished) return;
                finished = true;
                clearTimeout(timer);
                if (me) {
                    setUser({
                        email: me.email,
                        role: me.role,
                        isVerified: Boolean(me.isVerified),
                    });
                } else {
                    // Intentional hardening: a falsy /auth/me response must
                    // not become a truthy user object (Boolean({}) === true).
                    setUser(null);
                }
                setLoading(false);
            } catch {
                if (!active || finished) return;
                finished = true;
                clearTimeout(timer);
                setUser(null);
                setLoading(false);
            }
        })();

        return () => {
            active = false;
            clearTimeout(timer);
            if (!finished) {
                controller.abort();
            }
        };
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
        () => ({ user, isAuthenticated, loading, login, register, logout }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user, isAuthenticated, loading],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
