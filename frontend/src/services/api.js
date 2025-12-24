import axios from "axios";

function normalizeApiBaseUrl(raw) {
    const v = String(raw || "").trim();
    if (!v) return "/api";

    // Remove trailing slashes
    const noTrailing = v.replace(/\/+$/, "");

    // Allow env to be either "https://host" or "https://host/api"
    if (noTrailing.endsWith("/api")) return noTrailing;
    return `${noTrailing}/api`;
}

const api = axios.create({
    baseURL: normalizeApiBaseUrl(
        import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
    ),
});

api.defaults.headers.common.Accept = "application/json";

const ANON_STORAGE_KEY = "digitalyty_anon_id";

function safeGetLocalStorage() {
    try {
        // SSR-safe: window may be undefined
        if (typeof window === "undefined") return null;
        return window.localStorage || null;
    } catch {
        // Privacy mode / blocked storage
        return null;
    }
}

function uuidV4() {
    // Prefer native crypto.randomUUID when available
    try {
        const c = typeof crypto !== "undefined" ? crypto : null;
        if (c && typeof c.randomUUID === "function") return c.randomUUID();
    } catch {
        // fall through to manual generator
    }

    // Small UUID v4 generator (RFC4122-ish): xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    let bytes;
    try {
        const c = typeof crypto !== "undefined" ? crypto : null;
        if (c && typeof c.getRandomValues === "function") {
            bytes = new Uint8Array(16);
            c.getRandomValues(bytes);
        }
    } catch {
        // ignore
    }

    if (!bytes) {
        bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i += 1)
            bytes[i] = Math.floor(Math.random() * 256);
    }

    // Per RFC 4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
        ""
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
        12,
        16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getAnonymousId() {
    const ls = safeGetLocalStorage();
    if (!ls) return null;

    try {
        const v = ls.getItem(ANON_STORAGE_KEY);
        return v && String(v).trim() ? String(v) : null;
    } catch {
        return null;
    }
}

export function ensureAnonymousId() {
    const ls = safeGetLocalStorage();
    if (!ls) return null;

    const existing = getAnonymousId();
    if (existing) return existing;

    const id = uuidV4();
    try {
        ls.setItem(ANON_STORAGE_KEY, id);
        return id;
    } catch {
        return null;
    }
}

export function clearAnonymousId() {
    const ls = safeGetLocalStorage();
    if (!ls) return;

    try {
        ls.removeItem(ANON_STORAGE_KEY);
    } catch {
        // ignore
    }
}

api.interceptors.request.use((config) => {
    // Let axios/browser set the correct boundary for multipart uploads.
    if (config?.data instanceof FormData) {
        config.headers = config.headers || {};
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
    }

    // Add anonymous session header. If anonymousId exists, send it even when authenticated
    // (needed for /cards/claim). Only auto-generate a new id when not authenticated.
    const headers = (config.headers = config.headers || {});
    const authHeader =
        headers.Authorization ||
        headers.authorization ||
        api.defaults.headers.common.Authorization ||
        api.defaults.headers.common.authorization;

    const existingAnon = getAnonymousId();
    const anonId = existingAnon || (!authHeader ? ensureAnonymousId() : null);
    if (anonId) headers["x-anonymous-id"] = anonId;

    return config;
});

export default api;
