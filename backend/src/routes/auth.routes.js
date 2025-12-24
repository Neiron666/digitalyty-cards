import { Router } from "express";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import { signToken } from "../utils/jwt.js";
import { claimAnonymousCardForUser } from "../services/claimCard.service.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

function noStore(req, res, next) {
    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
    // Critical: this endpoint depends on the token.
    res.set("Vary", "Authorization");
    next();
}

// REGISTER
router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });

    // Best-effort: claim anonymous card right after registration.
    const anonymousId = req?.anonymousId ? String(req.anonymousId) : "";
    try {
        await claimAnonymousCardForUser({
            userId: String(user._id),
            anonymousId,
            strict: false,
        });
    } catch (err) {
        console.error(
            "[auth] claim after register failed",
            err?.message || err
        );
    }

    res.json({ token: signToken(user._id) });
});

// LOGIN
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // Best-effort: claim anonymous card right after login.
    const anonymousId = req?.anonymousId ? String(req.anonymousId) : "";
    try {
        await claimAnonymousCardForUser({
            userId: String(user._id),
            anonymousId,
            strict: false,
        });
    } catch (err) {
        console.error("[auth] claim after login failed", err?.message || err);
    }

    res.json({ token: signToken(user._id) });
});

// ME (JWT-only)
router.get("/me", noStore, requireAuth, async (req, res) => {
    const userId = req.user?.id || req.userId || req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Invalid token" });

    const user = await User.findById(String(userId)).select("email");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ email: user.email });
});

export default router;
