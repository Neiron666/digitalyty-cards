import { getUtm } from "./utm.util";

const STORAGE_KEY_DEVICE = "digitalyty_deviceId";

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
        "website",
        "instagram",
        "facebook",
        "tiktok",
        "linkedin",
        "lead",
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
