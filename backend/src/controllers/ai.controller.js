import mongoose from "mongoose";
import Card from "../models/Card.model.js";
import User from "../models/User.model.js";
import AiUsageMonthly from "../models/AiUsageMonthly.model.js";
import {
    generateAboutSuggestion,
    generateSeoSuggestion,
    generateFaqSuggestion,
} from "../services/gemini.service.js";
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

function isAiSeoEnabled() {
    const raw = String(process.env.AI_SEO_ENABLED ?? "").trim();
    if (!raw) return false;
    const v = raw.toLowerCase();
    if (["1", "true", "on", "yes"].includes(v)) return true;
    return false;
}

function isAiFaqEnabled() {
    const raw = String(process.env.AI_FAQ_ENABLED ?? "").trim();
    if (!raw) return false;
    const v = raw.toLowerCase();
    if (["1", "true", "on", "yes"].includes(v)) return true;
    return false;
}

// --- Rate limiting (in-memory, keyed by userId) -----------------------------

const RATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_FREE = 15;
const RATE_LIMIT_PREMIUM = 75;
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
    if (!userId) return { plan: "free", billingSource: "unknown" };
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
    return {
        plan: planFromTier(effectiveTier?.tier || "free"),
        billingSource: effectiveBilling?.source || "unknown",
    };
}

// --- Monthly quota (persistent, success-only) ------------------------------

const FEATURE_AI_ABOUT = "ai_about_generation";
const FEATURE_AI_SEO = "ai_seo_generation";
const FEATURE_AI_FAQ = "ai_faq_generation";

// Shared editor AI generation budget (all features combined)
const AI_GENERATION_FEATURES = [
    FEATURE_AI_ABOUT,
    FEATURE_AI_SEO,
    FEATURE_AI_FAQ,
];
const QUOTA_SCOPE_SHARED = "shared_generation";
const SHARED_MONTHLY_QUOTA_FREE = 10;
const SHARED_MONTHLY_QUOTA_PREMIUM = 30;

function currentPeriodKey() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function readMonthlyUsage(userId, feature, periodKey) {
    const doc = await AiUsageMonthly.findOne({
        userId,
        feature,
        periodKey,
    }).lean();
    return doc?.count ?? 0;
}

function buildQuotaDTO(feature, periodKey, used, limit) {
    return {
        feature,
        periodKey,
        used,
        limit,
        remaining: Math.max(0, limit - used),
        quotaScope: QUOTA_SCOPE_SHARED,
    };
}

async function readTotalMonthlyUsage(userId, periodKey) {
    const result = await AiUsageMonthly.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                periodKey,
                feature: { $in: AI_GENERATION_FEATURES },
            },
        },
        { $group: { _id: null, total: { $sum: "$count" } } },
    ]);
    return result[0]?.total ?? 0;
}

async function incrementMonthlyUsage(userId, feature, periodKey) {
    const doc = await AiUsageMonthly.findOneAndUpdate(
        { userId, feature, periodKey },
        { $inc: { count: 1 } },
        { upsert: true, new: true },
    );
    return doc?.count ?? 1;
}

// --- Request validation -----------------------------------------------------

const ALLOWED_MODES = new Set(["create", "improve"]);
const ALLOWED_LANGUAGES = new Set(["he", "en"]);
const ALLOWED_TARGETS = new Set(["full", "title", "paragraph"]);

function parseRequestBody(body) {
    const raw = body && typeof body === "object" ? body : {};
    const mode = ALLOWED_MODES.has(raw.mode) ? raw.mode : "create";
    const language = ALLOWED_LANGUAGES.has(raw.language) ? raw.language : "he";

    // target: absent → "full" (backward compat); present but invalid → null (triggers error)
    const rawTarget = typeof raw.target === "string" ? raw.target.trim() : "";
    const target = !rawTarget
        ? "full"
        : ALLOWED_TARGETS.has(rawTarget)
          ? rawTarget
          : null;

    const paragraphIndex = raw.paragraphIndex;

    return { mode, language, target, paragraphIndex };
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
                    return res.status(404).json({
                        ok: false,
                        code: "NOT_FOUND",
                        message: "Not found",
                    });
                }
                throw err;
            }
        }
    }

    // 6. Parse + validate request (before rate-limit so invalid requests don't consume daily slots)
    const {
        mode,
        language,
        target,
        paragraphIndex: rawParagraphIndex,
    } = parseRequestBody(req.body);

    // 6b. Validate target
    if (target === null) {
        return res.status(400).json({
            ok: false,
            code: "INVALID_TARGET",
            message: 'target must be "full", "title", or "paragraph"',
        });
    }

    // 6c. Validate paragraphIndex when target === "paragraph"
    let paragraphIndex = null;
    if (target === "paragraph") {
        const pi = Number(rawParagraphIndex);
        if (!Number.isInteger(pi) || pi < 0 || pi > 2) {
            return res.status(400).json({
                ok: false,
                code: "INVALID_PARAGRAPH_INDEX",
                message:
                    'paragraphIndex must be 0, 1, or 2 when target is "paragraph"',
            });
        }
        paragraphIndex = pi;
    }

    // 7. Rate limit (tier-aware)
    const now = new Date();
    const { plan: featurePlan, billingSource } = await resolveFeaturePlan(
        card,
        userId,
        now,
    );

    // Batch 7A: hard deny AI for free users (trial stays allowed with lower profile).
    if (billingSource === "free") {
        return res.status(403).json({
            ok: false,
            code: "PREMIUM_REQUIRED",
            message: "AI generation requires a premium plan",
        });
    }

    // Trial-premium users keep full free AI profile (monthly + daily).
    const isPremium =
        billingSource !== "trial-premium" && hasAccess(featurePlan, "seo");
    const rateLimit = isPremium ? RATE_LIMIT_PREMIUM : RATE_LIMIT_FREE;

    if (!checkRateLimit(userId, rateLimit)) {
        return res.status(429).json({
            ok: false,
            code: "RATE_LIMITED",
            message: "Too many requests — please try again later",
        });
    }

    // 7b. Monthly quota check (shared budget across all AI features)
    const periodKey = currentPeriodKey();
    const monthlyLimit = isPremium
        ? SHARED_MONTHLY_QUOTA_PREMIUM
        : SHARED_MONTHLY_QUOTA_FREE;
    const monthlyUsed = await readTotalMonthlyUsage(userId, periodKey);
    if (monthlyUsed >= monthlyLimit) {
        return res.status(429).json({
            ok: false,
            code: "AI_MONTHLY_LIMIT_REACHED",
            message: "Monthly AI suggestion limit reached",
            quota: buildQuotaDTO(
                FEATURE_AI_ABOUT,
                periodKey,
                monthlyUsed,
                monthlyLimit,
            ),
        });
    }

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

    // 8b. Business-context readiness gate (server-side enforcement)
    if (!businessName || !category) {
        return res.status(400).json({
            ok: false,
            code: "AI_INSUFFICIENT_BUSINESS_CONTEXT",
            message:
                "Business name and category are required before AI generation",
        });
    }

    // 8c. Derive existing about with outbound caps (prompt-only, not DB)
    const OUTBOUND_TITLE_CAP = 500;
    const OUTBOUND_PARAGRAPH_CAP = 2000;

    let existingTitle =
        typeof card.content?.aboutTitle === "string"
            ? card.content.aboutTitle.trim()
            : "";
    if (existingTitle.length > OUTBOUND_TITLE_CAP) {
        existingTitle = existingTitle.slice(0, OUTBOUND_TITLE_CAP);
    }

    const existingParagraphs = Array.isArray(card.content?.aboutParagraphs)
        ? card.content.aboutParagraphs
              .map((p) => (typeof p === "string" ? p.trim() : ""))
              .filter(Boolean)
              .map((p) =>
                  p.length > OUTBOUND_PARAGRAPH_CAP
                      ? p.slice(0, OUTBOUND_PARAGRAPH_CAP)
                      : p,
              )
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
            target,
            paragraphIndex,
        });
    } catch (err) {
        const code = err?.code || "AI_UNAVAILABLE";
        const status =
            code === "INVALID_SUGGESTION"
                ? 502
                : code === "AI_PROVIDER_QUOTA"
                  ? 429
                  : 503;

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
                    : code === "AI_PROVIDER_QUOTA"
                      ? "AI provider quota temporarily exhausted"
                      : "AI service is temporarily unavailable",
        });
    }

    // 10. Increment monthly usage (success only, atomic — per-feature telemetry)
    try {
        await incrementMonthlyUsage(userId, FEATURE_AI_ABOUT, periodKey);
    } catch (incErr) {
        // Accounting failure must not block user from receiving the suggestion.
        console.error("[ai:suggestAbout] quota increment failed", {
            userId: String(userId),
            periodKey,
            error: incErr?.message,
        });
    }

    // 10b. Re-read confirmed total (no arithmetic shortcuts)
    const confirmedTotal = await readTotalMonthlyUsage(userId, periodKey);

    // 11. Metadata-only log (never prompt body or AI response body)
    console.log("[ai:suggestAbout] OK", {
        cardId: String(card._id),
        userId: String(userId),
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
        mode,
        language,
        target,
        latencyMs: Date.now() - startMs,
    });

    // 12. Return suggestion + fresh quota (shape per target)
    const responseSuggestion =
        target === "paragraph" ? { ...suggestion, paragraphIndex } : suggestion;

    return res.status(200).json({
        ok: true,
        suggestion: responseSuggestion,
        quota: buildQuotaDTO(
            FEATURE_AI_ABOUT,
            periodKey,
            confirmedTotal,
            monthlyLimit,
        ),
    });
}

// --- GET quota handler ------------------------------------------------------

const ALLOWED_QUOTA_FEATURES = new Set([
    FEATURE_AI_ABOUT,
    FEATURE_AI_SEO,
    FEATURE_AI_FAQ,
]);

export async function getAiQuota(req, res) {
    const userId = req.userId || req.user?.id || null;

    // 1. Auth
    if (!userId) {
        return res.status(401).json({
            ok: false,
            code: "UNAUTHORIZED",
            message: "Authentication required",
        });
    }

    // 2. Feature param (default to ai_about_generation)
    const featureRaw =
        typeof req.query?.feature === "string"
            ? req.query.feature.trim()
            : FEATURE_AI_ABOUT;
    const feature = ALLOWED_QUOTA_FEATURES.has(featureRaw) ? featureRaw : null;

    if (!feature) {
        return res.status(400).json({
            ok: false,
            code: "INVALID_FEATURE",
            message: "Unsupported feature",
        });
    }

    // 3. Card lookup + ownership (same posture as suggest)
    const card = await Card.findById(req.params.id);
    if (!card) {
        return res.status(404).json({
            ok: false,
            code: "NOT_FOUND",
            message: "Not found",
        });
    }

    const ownsCard = String(card.user || "") === String(userId);
    if (!ownsCard) {
        return res.status(404).json({
            ok: false,
            code: "NOT_FOUND",
            message: "Not found",
        });
    }

    // 4. Org membership gate (same posture as suggest)
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
                    return res.status(404).json({
                        ok: false,
                        code: "NOT_FOUND",
                        message: "Not found",
                    });
                }
                throw err;
            }
        }
    }

    // 5. Resolve tier → monthly limit (shared budget)
    const now = new Date();
    const { plan: featurePlan, billingSource } = await resolveFeaturePlan(
        card,
        userId,
        now,
    );
    // Trial-premium users keep full free AI profile.
    const isPremium =
        billingSource !== "trial-premium" && hasAccess(featurePlan, "seo");
    const monthlyLimit = isPremium
        ? SHARED_MONTHLY_QUOTA_PREMIUM
        : SHARED_MONTHLY_QUOTA_FREE;

    // 6. Read usage (shared total across all AI features)
    const periodKey = currentPeriodKey();
    const used = await readTotalMonthlyUsage(userId, periodKey);

    // 7. Feature-enabled flag (server-authoritative)
    const featureEnabled =
        feature === FEATURE_AI_SEO
            ? isAiSeoEnabled()
            : feature === FEATURE_AI_ABOUT
              ? isAiAboutEnabled()
              : feature === FEATURE_AI_FAQ
                ? isAiFaqEnabled()
                : false;

    // Batch 7A: expose plan-based AI access signal for frontend.
    const allowed = billingSource !== "free";

    return res.status(200).json({
        ok: true,
        quota: {
            ...buildQuotaDTO(feature, periodKey, used, monthlyLimit),
            featureEnabled,
            allowed,
        },
    });
}

// --- POST seo-suggestion handler -------------------------------------------

const ALLOWED_SEO_MODES = new Set(["create", "improve"]);
const ALLOWED_SEO_LANGUAGES = new Set(["he", "en"]);
const SEO_OUTBOUND_TITLE_CAP = 200;
const SEO_OUTBOUND_DESC_CAP = 500;
const SEO_OUTBOUND_ABOUT_TITLE_CAP = 300;

export async function suggestSeo(req, res) {
    const startMs = Date.now();
    const userId = req.userId || req.user?.id || null;

    // 1. Feature flag
    if (!isAiSeoEnabled()) {
        return res.status(503).json({
            ok: false,
            code: "AI_DISABLED",
            message: "AI SEO generation is not currently enabled",
        });
    }

    // 2. Auth
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

    // 4. Ownership check (anti-enumeration: 404)
    const ownsCard = String(card.user || "") === String(userId);
    if (!ownsCard) {
        return res.status(404).json({
            ok: false,
            code: "NOT_FOUND",
            message: "Not found",
        });
    }

    // 5. Org membership gate (anti-enumeration: 404)
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
                    return res.status(404).json({
                        ok: false,
                        code: "NOT_FOUND",
                        message: "Not found",
                    });
                }
                throw err;
            }
        }
    }

    // 6. Parse + validate request
    const rawBody = req.body && typeof req.body === "object" ? req.body : {};
    const mode = ALLOWED_SEO_MODES.has(rawBody.mode) ? rawBody.mode : "create";
    const language = ALLOWED_SEO_LANGUAGES.has(rawBody.language)
        ? rawBody.language
        : "he";

    // 7. Rate limit (tier-aware, shared rate bucket with about)
    const now = new Date();
    const { plan: featurePlan, billingSource } = await resolveFeaturePlan(
        card,
        userId,
        now,
    );

    // Batch 7A: hard deny AI for free users (trial stays allowed with lower profile).
    if (billingSource === "free") {
        return res.status(403).json({
            ok: false,
            code: "PREMIUM_REQUIRED",
            message: "AI generation requires a premium plan",
        });
    }

    // Trial-premium users keep full free AI profile (monthly + daily).
    const isPremium =
        billingSource !== "trial-premium" && hasAccess(featurePlan, "seo");
    const rateLimit = isPremium ? RATE_LIMIT_PREMIUM : RATE_LIMIT_FREE;

    if (!checkRateLimit(userId, rateLimit)) {
        return res.status(429).json({
            ok: false,
            code: "RATE_LIMITED",
            message: "Too many requests — please try again later",
        });
    }

    // 7b. Monthly quota check (shared budget across all AI features)
    const periodKey = currentPeriodKey();
    const monthlyLimit = isPremium
        ? SHARED_MONTHLY_QUOTA_PREMIUM
        : SHARED_MONTHLY_QUOTA_FREE;
    const monthlyUsed = await readTotalMonthlyUsage(userId, periodKey);
    if (monthlyUsed >= monthlyLimit) {
        return res.status(429).json({
            ok: false,
            code: "AI_MONTHLY_LIMIT_REACHED",
            message: "Monthly AI suggestion limit reached",
            quota: buildQuotaDTO(
                FEATURE_AI_SEO,
                periodKey,
                monthlyUsed,
                monthlyLimit,
            ),
        });
    }

    // 8. Derive trusted card context (server-side only)
    const businessName =
        typeof card.business?.name === "string"
            ? card.business.name.trim()
            : "";
    const category =
        typeof card.business?.category === "string"
            ? card.business.category.trim()
            : "";

    // 8b. Readiness gate
    if (!businessName || !category) {
        return res.status(400).json({
            ok: false,
            code: "AI_INSUFFICIENT_BUSINESS_CONTEXT",
            message:
                "Business name and category are required before AI generation",
        });
    }

    // 8c. Optional short context (token-efficient)
    const slogan =
        typeof card.business?.slogan === "string"
            ? card.business.slogan.trim()
            : "";
    const city =
        typeof card.business?.city === "string"
            ? card.business.city.trim()
            : "";

    let aboutTitle =
        typeof card.content?.aboutTitle === "string"
            ? card.content.aboutTitle.trim()
            : "";
    if (aboutTitle.length > SEO_OUTBOUND_ABOUT_TITLE_CAP) {
        aboutTitle = aboutTitle.slice(0, SEO_OUTBOUND_ABOUT_TITLE_CAP);
    }

    // 8d. Existing SEO for improve mode (outbound-capped)
    let existingSeoTitle =
        typeof card.seo?.title === "string" ? card.seo.title.trim() : "";
    if (existingSeoTitle.length > SEO_OUTBOUND_TITLE_CAP) {
        existingSeoTitle = existingSeoTitle.slice(0, SEO_OUTBOUND_TITLE_CAP);
    }

    let existingSeoDescription =
        typeof card.seo?.description === "string"
            ? card.seo.description.trim()
            : "";
    if (existingSeoDescription.length > SEO_OUTBOUND_DESC_CAP) {
        existingSeoDescription = existingSeoDescription.slice(
            0,
            SEO_OUTBOUND_DESC_CAP,
        );
    }

    // 9. Call Gemini
    let suggestion;
    try {
        suggestion = await generateSeoSuggestion({
            businessName,
            category,
            slogan,
            city,
            aboutTitle,
            language,
            mode,
            existingSeoTitle,
            existingSeoDescription,
        });
    } catch (err) {
        const code = err?.code || "AI_UNAVAILABLE";
        const status =
            code === "INVALID_SUGGESTION"
                ? 502
                : code === "AI_PROVIDER_QUOTA"
                  ? 429
                  : 503;

        console.error("[ai:suggestSeo] Gemini error", {
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
                    : code === "AI_PROVIDER_QUOTA"
                      ? "AI provider quota temporarily exhausted"
                      : "AI service is temporarily unavailable",
        });
    }

    // 10. Increment monthly usage (success only, atomic — per-feature telemetry)
    try {
        await incrementMonthlyUsage(userId, FEATURE_AI_SEO, periodKey);
    } catch (incErr) {
        console.error("[ai:suggestSeo] quota increment failed", {
            userId: String(userId),
            periodKey,
            error: incErr?.message,
        });
    }

    // 10b. Re-read confirmed total (no arithmetic shortcuts)
    const confirmedTotal = await readTotalMonthlyUsage(userId, periodKey);

    // 11. Metadata-only log
    console.log("[ai:suggestSeo] OK", {
        cardId: String(card._id),
        userId: String(userId),
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
        mode,
        language,
        latencyMs: Date.now() - startMs,
    });

    // 12. Return suggestion + fresh quota
    return res.status(200).json({
        ok: true,
        suggestion,
        quota: buildQuotaDTO(
            FEATURE_AI_SEO,
            periodKey,
            confirmedTotal,
            monthlyLimit,
        ),
    });
}

// --- POST faq-suggestion handler -------------------------------------------

const ALLOWED_FAQ_LANGUAGES = new Set(["he", "en"]);

// Outbound caps for optional enrichment context
const FAQ_OUTBOUND_SLOGAN_CAP = 300;
const FAQ_OUTBOUND_ABOUT_TITLE_CAP = 200;
const FAQ_OUTBOUND_ABOUT_SNIPPET_CAP = 500;

export async function suggestFaq(req, res) {
    const startMs = Date.now();
    const userId = req.userId || req.user?.id || null;

    // 1. Feature flag
    if (!isAiFaqEnabled()) {
        return res.status(503).json({
            ok: false,
            code: "AI_DISABLED",
            message: "AI FAQ generation is not currently enabled",
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

    // 4. Ownership check (anti-enumeration: 404)
    const ownsCard = String(card.user || "") === String(userId);
    if (!ownsCard) {
        return res.status(404).json({
            ok: false,
            code: "NOT_FOUND",
            message: "Not found",
        });
    }

    // 5. Org membership gate (anti-enumeration: 404)
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
                    return res.status(404).json({
                        ok: false,
                        code: "NOT_FOUND",
                        message: "Not found",
                    });
                }
                throw err;
            }
        }
    }

    // 6. Parse + validate request (before rate-limit)
    // V1: target is always "full", language is optional.
    const rawBody = req.body && typeof req.body === "object" ? req.body : {};
    const language = ALLOWED_FAQ_LANGUAGES.has(rawBody.language)
        ? rawBody.language
        : "he";

    // V1: only target="full" is accepted; reject anything else explicitly sent.
    const rawTarget =
        typeof rawBody.target === "string" ? rawBody.target.trim() : "";
    if (rawTarget && rawTarget !== "full") {
        return res.status(400).json({
            ok: false,
            code: "INVALID_TARGET",
            message: 'Only target "full" is supported for FAQ AI in V1',
        });
    }

    // 6b. V1 empty-only guard: full FAQ generation is only available when
    //     the card has no valid FAQ items. Determine from server-side card
    //     data using the same semantics as the FAQ normalizer (both q and a
    //     must be non-empty after trim for an item to count as valid).
    const existingFaqItems = Array.isArray(card.faq?.items)
        ? card.faq.items
        : [];
    const hasValidFaqItems = existingFaqItems.some((it) => {
        if (!it || typeof it !== "object") return false;
        const q = typeof it.q === "string" ? it.q.trim() : "";
        const a = typeof it.a === "string" ? it.a.trim() : "";
        return Boolean(q) && Boolean(a);
    });
    if (hasValidFaqItems) {
        return res.status(409).json({
            ok: false,
            code: "AI_FAQ_NOT_EMPTY",
            message:
                "FAQ AI generation is available only when FAQ items are empty. Remove existing items first or use manual editing.",
        });
    }

    // 7. Rate limit (tier-aware, shared rate bucket)
    const now = new Date();
    const { plan: featurePlan, billingSource } = await resolveFeaturePlan(
        card,
        userId,
        now,
    );

    // Batch 7A: hard deny AI for free users (trial stays allowed with lower profile).
    if (billingSource === "free") {
        return res.status(403).json({
            ok: false,
            code: "PREMIUM_REQUIRED",
            message: "AI generation requires a premium plan",
        });
    }

    // Trial-premium users keep full free AI profile (monthly + daily).
    const isPremium =
        billingSource !== "trial-premium" && hasAccess(featurePlan, "seo");
    const rateLimit = isPremium ? RATE_LIMIT_PREMIUM : RATE_LIMIT_FREE;

    if (!checkRateLimit(userId, rateLimit)) {
        return res.status(429).json({
            ok: false,
            code: "RATE_LIMITED",
            message: "Too many requests — please try again later",
        });
    }

    // 7b. Monthly quota check (shared budget across all AI features)
    const periodKey = currentPeriodKey();
    const monthlyLimit = isPremium
        ? SHARED_MONTHLY_QUOTA_PREMIUM
        : SHARED_MONTHLY_QUOTA_FREE;
    const monthlyUsed = await readTotalMonthlyUsage(userId, periodKey);
    if (monthlyUsed >= monthlyLimit) {
        return res.status(429).json({
            ok: false,
            code: "AI_MONTHLY_LIMIT_REACHED",
            message: "Monthly AI suggestion limit reached",
            quota: buildQuotaDTO(
                FEATURE_AI_FAQ,
                periodKey,
                monthlyUsed,
                monthlyLimit,
            ),
        });
    }

    // 8. Derive trusted card context (server-side only — never trust client)
    const businessName =
        typeof card.business?.name === "string"
            ? card.business.name.trim()
            : "";
    const category =
        typeof card.business?.category === "string"
            ? card.business.category.trim()
            : "";

    // 8b. Readiness gate
    if (!businessName || !category) {
        return res.status(400).json({
            ok: false,
            code: "AI_INSUFFICIENT_BUSINESS_CONTEXT",
            message:
                "Business name and category are required before AI generation",
        });
    }

    // 8c. Optional bounded enrichment context (safe short fields from card)
    let slogan =
        typeof card.business?.slogan === "string"
            ? card.business.slogan.trim()
            : "";
    if (slogan.length > FAQ_OUTBOUND_SLOGAN_CAP) {
        slogan = slogan.slice(0, FAQ_OUTBOUND_SLOGAN_CAP);
    }

    let aboutTitle =
        typeof card.content?.aboutTitle === "string"
            ? card.content.aboutTitle.trim()
            : "";
    if (aboutTitle.length > FAQ_OUTBOUND_ABOUT_TITLE_CAP) {
        aboutTitle = aboutTitle.slice(0, FAQ_OUTBOUND_ABOUT_TITLE_CAP);
    }

    let aboutSnippet = "";
    const aboutParagraphs = Array.isArray(card.content?.aboutParagraphs)
        ? card.content.aboutParagraphs
        : [];
    const firstParagraph =
        typeof aboutParagraphs[0] === "string" ? aboutParagraphs[0].trim() : "";
    if (firstParagraph) {
        aboutSnippet =
            firstParagraph.length > FAQ_OUTBOUND_ABOUT_SNIPPET_CAP
                ? firstParagraph.slice(0, FAQ_OUTBOUND_ABOUT_SNIPPET_CAP)
                : firstParagraph;
    }

    // 9. Call Gemini
    let suggestion;
    try {
        suggestion = await generateFaqSuggestion({
            businessName,
            category,
            slogan,
            aboutTitle,
            aboutSnippet,
            language,
        });
    } catch (err) {
        const code = err?.code || "AI_UNAVAILABLE";
        const status =
            code === "INVALID_SUGGESTION"
                ? 502
                : code === "AI_PROVIDER_QUOTA"
                  ? 429
                  : 503;

        console.error("[ai:suggestFaq] Gemini error", {
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
                    : code === "AI_PROVIDER_QUOTA"
                      ? "AI provider quota temporarily exhausted"
                      : "AI service is temporarily unavailable",
        });
    }

    // 10. Increment monthly usage (success only, atomic — per-feature telemetry)
    try {
        await incrementMonthlyUsage(userId, FEATURE_AI_FAQ, periodKey);
    } catch (incErr) {
        console.error("[ai:suggestFaq] quota increment failed", {
            userId: String(userId),
            periodKey,
            error: incErr?.message,
        });
    }

    // 10b. Re-read confirmed total (no arithmetic shortcuts)
    const confirmedTotal = await readTotalMonthlyUsage(userId, periodKey);

    // 11. Metadata-only log (never prompt body or AI response body)
    console.log("[ai:suggestFaq] OK", {
        cardId: String(card._id),
        userId: String(userId),
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
        language,
        itemCount: suggestion?.items?.length ?? 0,
        latencyMs: Date.now() - startMs,
    });

    // 12. Return suggestion + fresh quota
    return res.status(200).json({
        ok: true,
        suggestion,
        quota: buildQuotaDTO(
            FEATURE_AI_FAQ,
            periodKey,
            confirmedTotal,
            monthlyLimit,
        ),
    });
}
