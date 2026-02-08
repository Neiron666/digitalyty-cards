// frontend/src/services/orgAdminGate.js
// Enterprise UX-gate for org-admin surfaces.
// - SSoT: backend GET /api/orgs/mine (myRole/myStatus).
// - Cache keyed by JWT token to avoid duplicate requests per session.
// - Allow only myRole === "admin" (backend role enum: member|admin).
// - If myStatus exists -> must be "active"; if absent -> allow (back-compat).
// - Transient errors (offline/5xx/429) must NOT stick deny forever.

import api from "./api";

let cachedToken = null; // string | null
let cachedPromise = null; // Promise<boolean> | null
let cachedValue = null; // boolean | null

function normalizeToken(token) {
    if (typeof token !== "string") return null;
    const t = token.trim();
    return t ? t : null;
}

function lowerTrim(v) {
    return String(v ?? "")
        .trim()
        .toLowerCase();
}

function extractOrgs(data) {
    // Tolerant shaping: backend returns array today; allow { orgs: [] } for forward-compat.
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.orgs)) return data.orgs;
    return [];
}

function getHttpStatus(err) {
    return err?.response?.status ?? null;
}

function isCanceled(err) {
    // axios v1: err.code === 'ERR_CANCELED' or name === 'CanceledError'
    // fetch adapters: DOMException name 'AbortError'
    return (
        err?.code === "ERR_CANCELED" ||
        err?.name === "CanceledError" ||
        err?.name === "AbortError" ||
        err?.message === "canceled"
    );
}

function isStableAuthDeny(status) {
    return status === 401 || status === 403;
}

function isTransient(status) {
    // "no status" usually means network error/offline
    if (!status) return true;
    if (status === 429) return true;
    return status >= 500 && status <= 599;
}

function computeHasOrgAdmin(orgs) {
    return (orgs || []).some((o) => {
        const role = lowerTrim(o?.myRole);
        const status = lowerTrim(o?.myStatus);

        const roleOk = role === "admin";
        // If backend doesn't send myStatus yet, do not block (backward compatible).
        const statusOk = !status || status === "active";

        return roleOk && statusOk;
    });
}

export async function getHasOrgAdmin({ token, signal } = {}) {
    const nextToken = normalizeToken(token);

    // No token => reset cache, deny
    if (!nextToken) {
        cachedToken = null;
        cachedPromise = null;
        cachedValue = null;
        return false;
    }

    // Token changed => reset cache
    if (cachedToken !== nextToken) {
        cachedToken = nextToken;
        cachedPromise = null;
        cachedValue = null;
    }

    // Return cached resolved value
    if (typeof cachedValue === "boolean") return cachedValue;

    // Return in-flight promise
    if (cachedPromise) return cachedPromise;

    // IMPORTANT: tie the request to the passed token explicitly
    const headers = { Authorization: `Bearer ${nextToken}` };

    cachedPromise = api
        .get("/orgs/mine", { signal, headers })
        .then((res) => {
            const orgs = extractOrgs(res?.data);
            const allowed = computeHasOrgAdmin(orgs);
            cachedValue = allowed;
            return allowed;
        })
        .catch((err) => {
            const status = getHttpStatus(err);

            // canceled/unmount => don't cache anything
            if (isCanceled(err)) {
                if (cachedToken === nextToken) {
                    cachedValue = null;
                    cachedPromise = null;
                }
                return false;
            }

            // stable deny => cache false until token changes
            if (isStableAuthDeny(status)) {
                cachedValue = false;
                return false;
            }

            // transient => do NOT cache false (avoid sticky denial)
            if (isTransient(status)) {
                cachedValue = null;
                return false;
            }

            // other unexpected 4xx => don't stick forever
            cachedValue = null;
            return false;
        })
        .finally(() => {
            cachedPromise = null;
        });

    return cachedPromise;
}
