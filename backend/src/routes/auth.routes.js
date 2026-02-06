import { Router } from "express";
import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import { signToken } from "../utils/jwt.js";
import { claimAnonymousCardForUser } from "../services/claimCard.service.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

function normalizeEmail(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
}

function isValidEmail(value) {
    const email = normalizeEmail(value);
    if (!email) return false;
    if (email.length > 254) return false;
    // Minimal sanity check (we rely on User collection as the real validator).
    return email.includes("@") && !email.includes(" ");
}

function noStore(req, res, next) {
    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
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
    const rawEmail = req.body?.email;
    const email = normalizeEmail(rawEmail);
    const password = req.body?.password;

    if (!isValidEmail(rawEmail)) {
        return res.status(400).json({ message: "Invalid email" });
    }
    if (typeof password !== "string" || !password) {
        return res.status(400).json({ message: "Invalid password" });
    }

    // Prevent casing-duplicates until we can enforce a case-insensitive unique index.
    // 2-step lookup to prefer the default index path; fallback catches legacy casing.
    let existing = await User.findOne({ email });
    if (!existing) {
        existing = await User.findOne({ email }).collation({
            locale: "en",
            strength: 2, // case-insensitive
        });
    }
    if (existing) {
        return res.status(409).json({ message: "Unable to register" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    try {
        user = await User.create({ email, passwordHash });
    } catch (err) {
        // Preserve current API shape; avoid leaking DB/index details.
        if (err && (err.code === 11000 || err.code === 11001)) {
            return res.status(409).json({ message: "Unable to register" });
        }
        throw err;
    }

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
            err?.message || err,
        );
    }

    res.json({ token: signToken(user._id) });
});

// LOGIN
router.post("/login", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== "string" || !password) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    // 2-step lookup to prefer the default index path; fallback supports legacy casing.
    let user = await User.findOne({ email });
    if (!user) {
        user = await User.findOne({ email }).collation({
            locale: "en",
            strength: 2, // case-insensitive
        });
    }
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

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
