import { verifyToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: "No token" });

    const token = header.split(" ")[1];

    try {
        const payload = verifyToken(token);
        req.userId = payload.userId;
        req.user = { id: payload.userId, userId: payload.userId };
        next();
    } catch {
        res.status(401).json({ message: "Invalid token" });
    }
}

export function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return next();

    const token = header.split(" ")[1];
    if (!token) return next();

    try {
        const payload = verifyToken(token);
        req.userId = payload.userId;
        req.user = { id: payload.userId, userId: payload.userId };
        return next();
    } catch {
        return next();
    }
}
