import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.model.js";

function denyAdminNotFound(res) {
    // Anti-enumeration: make /api/admin/* indistinguishable from non-existent routes.
    // Align body with the global /api fallback response in backend/src/app.js.
    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Vary", "Authorization");
    return res.status(404).json({ message: "API route not found" });
}

export async function requireAdmin(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return denyAdminNotFound(res);

    const token = header.split(" ")[1];
    if (!token) return denyAdminNotFound(res);

    try {
        const payload = verifyToken(token);
        const userId = payload?.userId;
        if (!userId) return denyAdminNotFound(res);

        const user = await User.findById(userId).select("role");
        if (!user || user.role !== "admin") {
            return denyAdminNotFound(res);
        }

        req.userId = userId;
        req.user = { id: userId, userId };
        return next();
    } catch {
        return denyAdminNotFound(res);
    }
}
