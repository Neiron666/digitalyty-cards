import { Router } from "express";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import { signToken } from "../utils/jwt.js";
import { claimAnonymousCardForUser } from "../services/claimCard.service.js";

const router = Router();

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

export default router;
