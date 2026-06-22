import { getUtm } from "./utm.util";

const STORAGE_KEY_DEVICE = "digitalyty_deviceId";
export const LEGACY_OWNER_SELF_EXCLUDE_KEY = "cardigo_owner_self_exclude_v1";
export const OWNER_SELF_EXCLUDE_KEY_PREFIX =
    "cardigo_owner_self_exclude_v1:path:";

// Validates and normalises a public card path for use as a scoped storage key.
// Returns the normalised path (/card/<slug> or /c/<orgSlug>/<slug>) or null.
export function normalizeOwnerSelfExcludePath(path) {
    if (typeof path !== "string" || !path) return null;
    let p = path.trim();
    if (!p.startsWith("/")) p = "/" + p;
    // Remove trailing slash (but keep root "/" intact)
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    // Strip query string / hash if present
    const qIdx = p.indexOf("?");
    if (qIdx !== -1) p = p.slice(0, qIdx);
    const hIdx = p.indexOf("#");
    if (hIdx !== -1) p = p.slice(0, hIdx);
    // Accept /card/<slug>
    if (/^\/card\/[^/]+$/.test(p)) return p;
    // Accept /c/<orgSlug>/<slug>
    if (/^\/c\/[^/]+\/[^/]+$/.test(p)) return p;
    return null;
}

// Returns the scoped localStorage key for a given public path, or null if invalid.
export function getOwnerSelfExcludeKey(publicPath) {
    const normalised = normalizeOwnerSelfExcludePath(publicPath);
    if (!normalised) return null;
    return OWNER_SELF_EXCLUDE_KEY_PREFIX + normalised;
}

// Checks whether the owner has enabled self-exclusion for the current public card path.
// Reads window.location.pathname at call time (correct only on public card pages).
// Returns false (track normally) when: key missing, key=="0", storage blocked, or not on a public card route.
function isOwnerSelfExcludedForCurrentPath() {
    try {
        if (typeof window === "undefined") return false;
        const scopedKey = getOwnerSelfExcludeKey(window.location.pathname);
        if (!scopedKey) return false;
        return localStorage.getItem(scopedKey) === "1";
    } catch {
        // Storage blocked — fail open, track normally.
        return false;
    }
}

function uuidFallback() {
    // RFC4122 v4-ish fallback (good enough for local visitor ID)
    const bytes = new Uint8Array(16);
    for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
        12,
        16,
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getOrCreateDeviceId() {
    try {
        const existing = localStorage.getItem(STORAGE_KEY_DEVICE);
        if (existing) return existing;

        const id =
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : uuidFallback();

        localStorage.setItem(STORAGE_KEY_DEVICE, id);
        return id;
    } catch {
        // If storage is blocked, return a best-effort ephemeral id.
        return uuidFallback();
    }
}

function send(payload) {
    try {
        const body = JSON.stringify(payload);
        const url = "/api/analytics/track";

        if (
            typeof navigator !== "undefined" &&
            typeof navigator.sendBeacon === "function"
        ) {
            const blob = new Blob([body], { type: "application/json" });
            const ok = navigator.sendBeacon(url, blob);
            if (ok) return;
        }

        // Fallback
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
        })
            .then((res) => {
                try {
                    if (import.meta?.env?.DEV && res?.status !== 204) {
                        console.warn(
                            "[analytics] track failed",
                            res?.status,
                            url,
                            payload,
                        );
                    }
                } catch {
                    // ignore
                }
            })
            .catch((err) => {
                try {
                    if (import.meta?.env?.DEV) {
                        console.warn(
                            "[analytics] track request error",
                            url,
                            err,
                        );
                    }
                } catch {
                    // ignore
                }
            });
    } catch {
        // ignore
    }
}

function normalizeAction(action) {
    const a = String(action || "")
        .trim()
        .toLowerCase();
    if (!a) return "other";
    const allowed = new Set([
        "call",
        "whatsapp",
        "email",
        "navigate",
        "maps",
        "waze",
        "website",
        "instagram",
        "facebook",
        "tiktok",
        "linkedin",
        "twitter",
        "lead",
        "booking",
        "custom_action",
        "other",
    ]);
    return allowed.has(a) ? a : "other";
}

function detectOrgSlugFromPath() {
    try {
        if (typeof window === "undefined") return "";
        const path = String(window.location?.pathname || "");
        const m = path.match(/^\/c\/([^/]+)\//i);
        return m && m[1] ? decodeURIComponent(m[1]).trim().toLowerCase() : "";
    } catch {
        return "";
    }
}

export function trackView(
    slug,
    utm = getUtm(),
    ref = document.referrer || "",
    orgSlug = "",
) {
    if (!slug) return;
    if (isOwnerSelfExcludedForCurrentPath()) return;
    const resolvedOrgSlug =
        typeof orgSlug === "string" && orgSlug.trim()
            ? orgSlug.trim().toLowerCase()
            : detectOrgSlugFromPath();
    send({
        slug,
        event: "view",
        ...(resolvedOrgSlug ? { orgSlug: resolvedOrgSlug } : {}),
        utm,
        ref,
        deviceId: getOrCreateDeviceId(),
    });
}

export function trackClick(
    slug,
    action,
    utm = getUtm(),
    ref = document.referrer || "",
    orgSlug = "",
) {
    if (!slug) return;
    if (isOwnerSelfExcludedForCurrentPath()) return;
    const resolvedOrgSlug =
        typeof orgSlug === "string" && orgSlug.trim()
            ? orgSlug.trim().toLowerCase()
            : detectOrgSlugFromPath();
    send({
        slug,
        event: "click",
        action: normalizeAction(action),
        ...(resolvedOrgSlug ? { orgSlug: resolvedOrgSlug } : {}),
        utm,
        ref,
        deviceId: getOrCreateDeviceId(),
    });
}
