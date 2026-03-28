import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.model.js";
import { isTokenFresh } from "../utils/isTokenFresh.js";

export async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: "No token" });

    const token = header.split(" ")[1];

    try {
        const payload = verifyToken(token);
        const user = await User.findById(payload.userId)
            .select("passwordChangedAt")
            .lean();
        if (!user) return res.status(401).json({ message: "Invalid token" });
        if (!isTokenFresh(payload, user.passwordChangedAt)) {
            console.warn("[auth] stale token rejected", {
                surface: "requireAuth",
                userId: payload.userId,
            });
            return res.status(401).json({ message: "Invalid token" });
        }
        req.userId = payload.userId;
        req.user = { id: payload.userId, userId: payload.userId };
        next();
    } catch {
        res.status(401).json({ message: "Invalid token" });
    }
}

export async function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return next();

    const token = header.split(" ")[1];
    if (!token) return next();

    try {
        const payload = verifyToken(token);
        const user = await User.findById(payload.userId)
            .select("passwordChangedAt")
            .lean();
        if (user && isTokenFresh(payload, user.passwordChangedAt)) {
            req.userId = payload.userId;
            req.user = { id: payload.userId, userId: payload.userId };
        }
        // Stale or missing user: silently drop credentials, proceed as unauthenticated.
    } catch {
        // Invalid token: silently proceed as unauthenticated.
    }
    return next();
}
