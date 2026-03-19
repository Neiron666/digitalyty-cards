import Card from "../models/Card.model.js";
import User from "../models/User.model.js";
import { generateAboutSuggestion } from "../services/gemini.service.js";
import { hasAccess } from "../utils/planAccess.js";
import { resolveBilling } from "../utils/trial.js";
import { resolveEffectiveTier } from "../utils/tier.js";
import { planFromTier } from "../utils/cardDTO.js";
import { getPersonalOrgId } from "../utils/personalOrg.util.js";
import { assertActiveOrgAndMembershipOrNotFound } from "../utils/orgMembership.util.js";
import { HttpError } from "../utils/httpError.js";

// --- Feature flag -----------------------------------------------------------

function isAiAboutEnabled() {
    const raw = String(process.env.AI_ABOUT_ENABLED ?? "").trim();
    if (!raw) return false;
    const v = raw.toLowerCase();
    if (["1", "true", "on", "yes"].includes(v)) return true;
    return false;
}

// --- Rate limiting (in-memory, keyed by userId) -----------------------------

const RATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_FREE = 3;
const RATE_LIMIT_PREMIUM = 10;
const RATE_SWEEP_EVERY = 200;

const inMemoryRate = new Map();
let rateSweepTick = 0;

function sweepRateMap(now) {
    if (inMemoryRate.size <= 5_000) {
        for (const [k, v] of inMemoryRate.entries()) {
            if (!v || v.resetAt <= now) inMemoryRate.delete(k);
        }
        return;
    }
    let removed = 0;
    for (const key of inMemoryRate.keys()) {
        inMemoryRate.delete(key);
        removed += 1;
        if (removed >= 1000) break;
    }
}

function checkRateLimit(userId, limit) {
    const now = Date.now();

    rateSweepTick += 1;
    if (rateSweepTick % RATE_SWEEP_EVERY === 0) {
        sweepRateMap(now);
    }

    const key = String(userId);
    const entry = inMemoryRate.get(key);
    if (!entry || entry.resetAt <= now) {
        inMemoryRate.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return true;
    }

    entry.count += 1;
    return entry.count <= limit;
}

// --- Tier resolution (reuses project SSoT) ----------------------------------

async function resolveFeaturePlan(card, userId, now) {
    if (!userId) return "free";
    const user = await User.findById(userId)
        .select("adminTier adminTierUntil")
        .lean();
    const effectiveBilling = resolveBilling(card, now);
    const effectiveTier = resolveEffectiveTier({
        card,
        user,
        effectiveBilling,
        now,
    });
    return planFromTier(effectiveTier?.tier || "free");
}

// --- Request validation -----------------------------------------------------

const ALLOWED_MODES = new Set(["create", "improve"]);
const ALLOWED_LANGUAGES = new Set(["he", "en"]);

function parseRequestBody(body) {
    const raw = body && typeof body === "object" ? body : {};
    const mode = ALLOWED_MODES.has(raw.mode) ? raw.mode : "create";
    const language = ALLOWED_LANGUAGES.has(raw.language) ? raw.language : "he";
    return { mode, language };
}

// --- Controller handler -----------------------------------------------------

export async function suggestAbout(req, res) {
    const startMs = Date.now();
    const userId = req.userId || req.user?.id || null;

    // 1. Feature flag
    if (!isAiAboutEnabled()) {
        return res.status(503).json({
            ok: false,
            code: "AI_DISABLED",
            message: "AI generation is not currently enabled",
        });
    }

    // 2. Auth (requireAuth guarantees userId, but defense-in-depth)
    if (!userId) {
        return res.status(401).json({
            ok: false,
            code: "UNAUTHORIZED",
            message: "Authentication required",
        });
    }

    // 3. Find card
    const card = await Card.findById(req.params.id);
    if (!card) {
        return res.status(404).json({
            ok: false,
            code: "NOT_FOUND",
            message: "Not found",
        });
    }

    // 4. Ownership check
    const ownsCard = String(card.user || "") === String(userId);
    if (!ownsCard) {
        return res.status(404).json({
            ok: false,
            code: "NOT_FOUND",
            message: "Not found",
        });
    }

    // 5. Org membership gate (anti-enumeration: 404 for non-members)
    if (card.orgId) {
        const personalOrgId = await getPersonalOrgId();
        const cardOrgId = String(card.orgId);
        const isNonPersonalOrg =
            Boolean(cardOrgId) && cardOrgId !== String(personalOrgId);

        if (isNonPersonalOrg) {
            try {
                await assertActiveOrgAndMembershipOrNotFound({
                    orgId: card.orgId,
                    userId,
                });
            } catch (err) {
                if (err instanceof HttpError || err?.statusCode === 404) {
                    return res
                        .status(404)
                        .json({
                            ok: false,
                            code: "NOT_FOUND",
                            message: "Not found",
                        });
                }
                throw err;
            }
        }
    }

    // 6. Rate limit (tier-aware)
    const now = new Date();
    const featurePlan = await resolveFeaturePlan(card, userId, now);
    const isPremium = hasAccess(featurePlan, "seo"); // premium plans unlock seo → proxy for "premium"
    const rateLimit = isPremium ? RATE_LIMIT_PREMIUM : RATE_LIMIT_FREE;

    if (!checkRateLimit(userId, rateLimit)) {
        return res.status(429).json({
            ok: false,
            code: "RATE_LIMITED",
            message: "Daily AI suggestion limit reached",
        });
    }

    // 7. Parse request
    const { mode, language } = parseRequestBody(req.body);

    // 8. Derive trusted card context (server-side only)
    const businessName =
        typeof card.business?.name === "string"
            ? card.business.name.trim()
            : "";
    const category =
        typeof card.business?.category === "string"
            ? card.business.category.trim()
            : "";
    const slogan =
        typeof card.business?.slogan === "string"
            ? card.business.slogan.trim()
            : "";

    const existingTitle =
        typeof card.content?.aboutTitle === "string"
            ? card.content.aboutTitle.trim()
            : "";
    const existingParagraphs = Array.isArray(card.content?.aboutParagraphs)
        ? card.content.aboutParagraphs
              .map((p) => (typeof p === "string" ? p.trim() : ""))
              .filter(Boolean)
        : [];

    const existingAbout =
        existingTitle || existingParagraphs.length
            ? { title: existingTitle, paragraphs: existingParagraphs }
            : null;

    // 9. Call Gemini
    let suggestion;
    try {
        suggestion = await generateAboutSuggestion({
            businessName,
            category,
            slogan,
            language,
            mode,
            existingAbout,
        });
    } catch (err) {
        const code = err?.code || "AI_UNAVAILABLE";
        const status = code === "INVALID_SUGGESTION" ? 502 : 503;

        console.error("[ai:suggestAbout] Gemini error", {
            cardId: String(card._id),
            userId: String(userId),
            model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
            latencyMs: Date.now() - startMs,
            errorCode: code,
        });

        return res.status(status).json({
            ok: false,
            code,
            message:
                code === "INVALID_SUGGESTION"
                    ? "AI returned an unusable suggestion"
                    : "AI service is temporarily unavailable",
        });
    }

    // 10. Metadata-only log (never prompt body or AI response body)
    console.log("[ai:suggestAbout] OK", {
        cardId: String(card._id),
        userId: String(userId),
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
        mode,
        language,
        latencyMs: Date.now() - startMs,
    });

    // 11. Return suggestion (no DB writes)
    return res.status(200).json({
        ok: true,
        suggestion,
    });
}
