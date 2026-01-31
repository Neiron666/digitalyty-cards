import crypto from "crypto";

const DEFAULT_TENANT_KEY_RAW =
    process.env.DEFAULT_TENANT_KEY || "digitalyty.co.il";

export const DEFAULT_TENANT_KEY = String(DEFAULT_TENANT_KEY_RAW)
    .trim()
    .toLowerCase();

function normalizeHostHeader(hostHeader) {
    const raw = typeof hostHeader === "string" ? hostHeader.trim() : "";
    if (!raw) return "";

    // Strip port (example.com:5173) and IPv6 brackets ([::1]:3000)
    const noPort = raw.includes(":")
        ? raw.startsWith("[")
            ? raw.split("]")[0].slice(1)
            : raw.split(":")[0]
        : raw;

    return String(noPort).trim().toLowerCase();
}

function parseHostAllowlist() {
    const env = process.env.TENANT_HOST_ALLOWLIST;
    const defaults = [
        "digitalyty.co.il",
        "www.digitalyty.co.il",
        "localhost",
        "127.0.0.1",
    ];

    const items = String(env || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

    const hasWildcard = items.includes("*");
    const filtered = hasWildcard ? items.filter((x) => x !== "*") : items;

    if (hasWildcard) {
        console.warn(
            "TENANT_HOST_ALLOWLIST contains '*', wildcard is forbidden; ignoring.",
        );
    }

    return new Set([...defaults, ...filtered]);
}

const hostAllowlist = parseHostAllowlist();

export function resolveTenantKeyFromRequest(req) {
    const host = normalizeHostHeader(req?.headers?.host);

    // Defense in depth: when host is absent/unknown, fall back to default.
    // NOTE: Host is still user-controlled; the allowlist prevents arbitrary tenant keys.
    if (!host) {
        return { tenantKey: DEFAULT_TENANT_KEY, host: "", ok: true };
    }

    const stripped = host.startsWith("www.") ? host.slice(4) : host;

    const allowed = hostAllowlist.has(host) || hostAllowlist.has(stripped);

    if (!allowed) {
        return { tenantKey: DEFAULT_TENANT_KEY, host, ok: false };
    }

    return { tenantKey: stripped || DEFAULT_TENANT_KEY, host, ok: true };
}

export function resolvePublicOriginFromRequest(req) {
    const { host, tenantKey, ok } = resolveTenantKeyFromRequest(req);

    const useHttps =
        String(process.env.PUBLIC_PROTOCOL || "").toLowerCase() === "https" ||
        (String(process.env.PUBLIC_PROTOCOL || "").toLowerCase() === "" &&
            process.env.NODE_ENV === "production");

    const protocol = useHttps ? "https" : "http";

    const hostname = host || tenantKey;
    const origin = hostname ? `${protocol}://${hostname}` : "";

    // Stable cache key for analytics/SEO use (when you don't want raw host strings)
    const tenantHash = crypto
        .createHash("sha256")
        .update(String(tenantKey || ""))
        .digest("hex")
        .slice(0, 12);

    return { origin, host: hostname, tenantKey, tenantHash, ok };
}
