const AUTH_COOKIE_NAME =
    process.env.NODE_ENV === "production"
        ? "__Host-cardigo_auth"
        : "cardigo_auth";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Public analytics write endpoints: anonymous, always-204, rate-limited.
// sendBeacon cannot set X-Requested-With; these endpoints carry no
// auth-gated state change, so CSRF protection adds zero security value.
const CSRF_EXEMPT_PATHS = new Set([
    "/api/analytics/track",
    "/api/site-analytics/track",
]);

export function csrfGuard(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    if (req.method === "POST" && CSRF_EXEMPT_PATHS.has(req.path)) return next();

    const hasCookie = Boolean(req.cookies?.[AUTH_COOKIE_NAME]);
    if (!hasCookie) return next();

    if (req.headers["x-requested-with"] === "XMLHttpRequest") return next();

    console.warn("[csrf] rejected", {
        method: req.method,
        url: req.originalUrl || req.url,
        origin: req.headers.origin || null,
        hasCookie: true,
        hasRequestedWith: Boolean(req.headers["x-requested-with"]),
    });
    return res.status(403).json({ message: "Forbidden" });
}
