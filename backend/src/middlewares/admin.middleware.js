import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.model.js";

export async function requireAdmin(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: "No token" });

    const token = header.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    try {
        const payload = verifyToken(token);
        const userId = payload?.userId;
        if (!userId) return res.status(401).json({ message: "Invalid token" });

        const user = await User.findById(userId).select("role");
        if (!user || user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" });
        }

        req.userId = userId;
        req.user = { id: userId, userId };
        return next();
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
}
