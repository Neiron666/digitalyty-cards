const AUTH_COOKIE_NAME =
    process.env.NODE_ENV === "production"
        ? "__Host-cardigo_auth"
        : "cardigo_auth";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfGuard(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    const hasCookie = Boolean(req.cookies?.[AUTH_COOKIE_NAME]);
    if (!hasCookie) return next();

    if (req.headers["x-requested-with"] === "XMLHttpRequest") return next();

    return res.status(403).json({ message: "Forbidden" });
}
